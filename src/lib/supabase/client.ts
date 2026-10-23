import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../types/supabase'
import { usesDjangoAuth } from '../auth/provider'

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
    // In django mode `?code=` on the callback page is our OAuth login code, not a Supabase PKCE code.
    detectSessionInUrl: !usesDjangoAuth,
    flowType: 'pkce',
  },
});