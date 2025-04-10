
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://accgettpdwlpnuvteuho.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjY2dldHRwZHdscG51dnRldWhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTgyNDQ2NDYsImV4cCI6MjAzMzgyMDY0Nn0.r_mP2PCkbCQNK0XtDWv4YK9I9l_IwcEdYyHMsplwDME';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
