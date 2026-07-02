import { Session } from '@supabase/supabase-js';
import type { Provider } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { authService } from '@/lib/api/services/auth';
import { getRoleIdFromJWT } from '@/lib/jwt';

export type AppOAuthProvider = 'google' | 'custom:zoho';

export async function signInWithAppOAuth(
  tenantSlug: string,
  provider: AppOAuthProvider
): Promise<string | null> {
  const redirectTo = `${window.location.origin}/app/${tenantSlug}/auth/callback`;

  const { error } = await supabase.auth.signInWithOAuth({
    // Custom providers (e.g. custom:zoho) work at runtime; auth-js Provider union lags behind.
    provider: provider as Provider,
    options: { redirectTo },
  });

  return error?.message ?? null;
}

/** Decode OAuth error params returned by Supabase after a failed provider redirect. */
export function readOAuthCallbackError(): string | null {
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));

  const description =
    searchParams.get('error_description') || hashParams.get('error_description');
  if (description) {
    return decodeURIComponent(description.replace(/\+/g, ' '));
  }

  const code = searchParams.get('error') || hashParams.get('error');
  if (code && code !== 'server_error') {
    return decodeURIComponent(code.replace(/\+/g, ' '));
  }

  return null;
}

/** Map provider/Supabase errors to a short message for the login form. */
export function formatOAuthLoginError(raw: string): string {
  const msg = raw.trim();
  if (!msg) return 'Sign-in failed. Please try again.';

  if (msg.includes('Unable to exchange external code') || msg.includes(': 1000')) {
    return 'Zoho sign-in failed. In Supabase, set the Zoho issuer to https://accounts.zoho.in and use Client ID/Secret from api-console.zoho.in.';
  }
  if (msg.toLowerCase().includes('redirect_uri')) {
    return 'Sign-in failed because the redirect URL does not match. Check Zoho and Supabase redirect settings.';
  }
  if (msg.toLowerCase().includes('invalid client') || msg.toLowerCase().includes('client_secret')) {
    return 'Sign-in failed because Zoho Client ID or Client Secret is incorrect in Supabase.';
  }

  return msg;
}

/**
 * Link Supabase user to tenant membership after login/signup for custom apps.
 * Returns null on success or a blocking error message string on UID_CONFLICT.
 */
export async function linkCustomAppUserIfNeeded(
  session: Session | null,
  uid: string,
  userEmail: string
): Promise<string | null> {
  localStorage.setItem('user_email', userEmail);

  try {
    const isAlreadyLinked = session?.access_token && getRoleIdFromJWT(session.access_token);

    if (isAlreadyLinked) return null;

    const result = await authService.linkUserUid({ uid, email: userEmail });

    if (result.success === false || result.error) {
      const errorCode = (result as { code?: string }).code;
      const errorMessage = result.error || '';

      if (errorCode === 'UID_CONFLICT') {
        console.error('[CustomAppAuth] UID conflict:', errorMessage);
        return errorMessage;
      }

      const isExpectedError =
        errorCode === 'NO_TENANT_MEMBERSHIP' ||
        errorMessage.includes('No TenantMembership found') ||
        errorMessage.includes('already has a linked UID') ||
        errorMessage.includes('already linked');

      if (!isExpectedError) {
        console.error('[CustomAppAuth] Error linking user UID:', result.error);
        toast.error('Warning: User linking failed, but login will continue');
      }
      return null;
    }

    const { error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) {
      console.warn('[CustomAppAuth] Session refresh failed after linking:', refreshError);
    }
    return null;
  } catch (linkError) {
    console.error('[CustomAppAuth] Error during user linking:', linkError);
    toast.error('Warning: User linking failed, but login will continue');
    return null;
  }
}
