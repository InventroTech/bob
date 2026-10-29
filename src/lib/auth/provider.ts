export type AuthProvider = 'supabase' | 'django';

/** Which backend handles login. Set `VITE_AUTH_PROVIDER=django` to use the pyro-backend auth API. */
export const AUTH_PROVIDER: AuthProvider =
  import.meta.env.VITE_AUTH_PROVIDER === 'django' ? 'django' : 'supabase';

export const usesDjangoAuth = AUTH_PROVIDER === 'django';
