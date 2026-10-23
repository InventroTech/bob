import { AuthApiError, type AuthError, type GoTrueClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { getBaseUrl } from '@/lib/api/config';
import { createDjangoAuthClient, type ChangePasswordParams } from './djangoAuthClient';
import { usesDjangoAuth } from './provider';

type AuthMethods =
  | 'getSession'
  | 'getUser'
  | 'refreshSession'
  | 'signInWithPassword'
  | 'signUp'
  | 'signOut'
  | 'onAuthStateChange'
  | 'updateUser'
  | 'signInWithOAuth'
  | 'exchangeCodeForSession';

/** The login methods the app uses, backed by Supabase or pyro-backend depending on `VITE_AUTH_PROVIDER`. */
export type AppAuthClient = Pick<GoTrueClient, AuthMethods> & {
  changePassword(params: ChangePasswordParams): Promise<{ error: AuthError | null }>;
};

const createSupabaseAuthClient = (): AppAuthClient => {
  const auth = supabase.auth;
  return {
    getSession: () => auth.getSession(),
    getUser: (jwt) => auth.getUser(jwt),
    refreshSession: (currentSession) => auth.refreshSession(currentSession),
    signInWithPassword: (credentials) => auth.signInWithPassword(credentials),
    signUp: (credentials) => auth.signUp(credentials),
    signOut: (options) => auth.signOut(options),
    onAuthStateChange: (callback) => auth.onAuthStateChange(callback),
    updateUser: (attributes, options) => auth.updateUser(attributes, options),
    signInWithOAuth: (credentials) => auth.signInWithOAuth(credentials),
    exchangeCodeForSession: (authCode) => auth.exchangeCodeForSession(authCode),
    changePassword: async ({ email, currentPassword, newPassword }) => {
      const { error: verifyError } = await auth.signInWithPassword({ email, password: currentPassword });
      if (verifyError) {
        return { error: new AuthApiError('Current password is incorrect.', 400, 'invalid_credentials') };
      }
      const { error } = await auth.updateUser({ password: newPassword });
      return { error };
    },
  };
};

const createAppAuthClient = (): AppAuthClient => {
  if (!usesDjangoAuth) return createSupabaseAuthClient();
  return createDjangoAuthClient({
    baseUrl: getBaseUrl(),
    getLegacySupabaseToken: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token ?? null;
    },
    clearLegacySupabaseSession: async () => {
      await supabase.auth.signOut({ scope: 'local' });
    },
  });
};

export const authClient: AppAuthClient = createAppAuthClient();
