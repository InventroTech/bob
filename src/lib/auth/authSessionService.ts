import { supabase } from '@/lib/supabase';
import { clearAccessToken, getAccessToken, setAccessToken } from './accessTokenProvider';

/** Why the next SIGNED_OUT happened — used so useAuth does not mislabel intentional logout. */
export type SignedOutReason = 'intentional' | 'expired';

let pendingSignedOutReason: SignedOutReason | null = null;
let refreshInFlight: Promise<string | null> | null = null;
/** When true, refresh must no-op / drop results (set on sign-out, cleared on sign-in). */
let refreshSuppressed = false;

export const markExpectingSignedOut = (reason: SignedOutReason): void => {
  pendingSignedOutReason = reason;
  // Stop refreshes immediately so a concurrent refreshSession cannot restore the session.
  refreshSuppressed = true;
};

/** Read-and-clear. Defaults to `expired` when sign-out was not marked (Supabase auto / unknown). */
export const consumeSignedOutReason = (): SignedOutReason => {
  const reason = pendingSignedOutReason ?? 'expired';
  pendingSignedOutReason = null;
  return reason;
};

/** Allow refreshes again after a successful sign-in. */
export const clearRefreshSuppression = (): void => {
  refreshSuppressed = false;
};

const isRetryableRefreshError = (error: { name?: string; message?: string } | null): boolean => {
  if (!error) return false;
  const message = (error.message || '').toLowerCase();
  return (
    error.name === 'AuthRetryableFetchError' ||
    message.includes('fetch') ||
    message.includes('network') ||
    message.includes('timeout')
  );
};

export const initializeAccessTokenFromSession = async (): Promise<void> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.access_token) {
    refreshSuppressed = false;
  }
  setAccessToken(session?.access_token ?? null);
};

/**
 * Refresh the Supabase access token.
 * Concurrent callers share one in-flight refresh (avoids refresh-token rotation races).
 * Transient network failures keep the existing token and return it when still present.
 * After sign-out, no-ops and drops any in-flight result so a late refresh cannot restore the session.
 */
export const refreshAccessToken = async (): Promise<string | null> => {
  if (refreshSuppressed) {
    return null;
  }

  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    try {
      if (refreshSuppressed) {
        return null;
      }

      const {
        data: { session },
        error,
      } = await supabase.auth.refreshSession();

      // Sign-out won the race — do not restore a token
      if (refreshSuppressed) {
        return null;
      }

      if (error) {
        if (isRetryableRefreshError(error)) {
          console.warn('[authSession] Retryable refresh failure — keeping current token:', error.message);
          return getAccessToken();
        }
        console.warn('[authSession] Fatal refresh failure:', error.message);
        return null;
      }

      if (!session?.access_token) {
        return null;
      }

      setAccessToken(session.access_token);
      return session.access_token;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
};

export const signOutAndClearSession = async (
  opts: { reason?: SignedOutReason } = {}
): Promise<void> => {
  markExpectingSignedOut(opts.reason ?? 'intentional');
  clearAccessToken();
  // Global scope: user-initiated logout must revoke the server session (other tabs included).
  await supabase.auth.signOut();
};
