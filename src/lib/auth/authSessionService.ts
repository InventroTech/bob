import { supabase } from '@/lib/supabase';
import { clearAccessToken, setAccessToken } from './accessTokenProvider';

export const initializeAccessTokenFromSession = async (): Promise<void> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  setAccessToken(session?.access_token ?? null);
};

export const refreshAccessToken = async (): Promise<string | null> => {
  const {
    data: { session },
    error,
  } = await supabase.auth.refreshSession();

  if (error || !session?.access_token) {
    clearAccessToken();
    return null;
  }

  setAccessToken(session.access_token);
  return session.access_token;
};

export const signOutAndClearSession = async (): Promise<void> => {
  clearAccessToken();
  await supabase.auth.signOut();
};
