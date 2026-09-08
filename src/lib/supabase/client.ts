import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../types/supabase'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl) {
  throw new Error("VITE_SUPABASE_URL is not defined in .env file");
}

if (!supabaseAnonKey) {
  throw new Error("VITE_SUPABASE_ANON_KEY is not defined in .env file");
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
});

// Intercept expired or revoked token states globally
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
    if (!window.location.pathname.startsWith('/auth') && !window.location.pathname.includes('/login')) {
      window.location.href = '/auth';
    }
  }
});

/** Used when spoofing to call Supabase REST with the spoof token so RLS sees the spoofed user */
export const getSupabaseRestConfig = () => ({
  url: supabaseUrl,
  anonKey: supabaseAnonKey,
});