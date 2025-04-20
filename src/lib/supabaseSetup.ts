import { supabase } from './supabase';

const PAGES_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS public.pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  name text NOT NULL,
  content jsonb DEFAULT '{}'::jsonb
);
`;

const ENABLE_RLS_SQL = `ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;`;

const CREATE_RLS_POLICIES_SQL = `
-- Users can view their own pages
CREATE POLICY "Allow authenticated users to select own pages" ON public.pages
FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own pages
CREATE POLICY "Allow authenticated users to insert own pages" ON public.pages
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own pages
CREATE POLICY "Allow authenticated users to update own pages" ON public.pages
FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Users can delete their own pages
CREATE POLICY "Allow authenticated users to delete own pages" ON public.pages
FOR DELETE USING (auth.uid() = user_id);
`;

// --- Optional: Function to automatically update updated_at --- 
const UPDATE_TIMESTAMP_FUNCTION = `
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`;

const UPDATE_TIMESTAMP_TRIGGER = `
DROP TRIGGER IF EXISTS on_pages_updated ON public.pages;
CREATE TRIGGER on_pages_updated
BEFORE UPDATE ON public.pages
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
`;
// --- End Optional ---


/**
 * Attempts to execute raw SQL to set up the database schema.
 * WARNING: This is likely to FAIL unless the Supabase client's
 * configured key (typically the anon key) has elevated privileges,
 * which is NOT recommended for client-side code.
 * 
 * The standard/recommended way is to use Supabase Migrations (CLI)
 * or run this SQL directly in the Supabase Dashboard SQL Editor.
 */
export const setupDatabase = async () => {
  console.warn(
    "Attempting database setup from client-side script. " +
    "This requires elevated privileges and is not standard practice. " +
    "Consider using Supabase Migrations or the SQL Editor instead."
  );

  const executeSql = async (sql: string, description: string) => {
    console.log(`Executing: ${description}`);
    // Supabase JS v2 doesn't have a direct `sql()` method accessible to the anon key 
    // for arbitrary DDL by default. We might need to use rpc if permissions allow.
    // This is a placeholder demonstrating the concept, actual execution might need `rpc`.
    try {
      // Attempting via rpc - this requires a specific function setup in Supabase or specific permissions
      // const { error } = await supabase.rpc('execute_sql', { sql_statement: sql }); 
      // Let's just log the SQL for now as direct execution will likely fail.
      console.log(`--- SQL for ${description} ---\n${sql}\n--- End SQL ---`);
      // Simulating potential error
      const error = new Error("Client-side schema modification likely blocked by RLS/permissions.");
      // TEMP: Remove the line above and uncomment rpc call if you have set up an execute_sql function.

      if (error) {
        console.error(`Error executing ${description}:`, error);
        throw error;
      }
      console.log(`Successfully executed: ${description}`);
      return true;
    } catch (err) {
      console.error(`Failed to execute ${description}:`, err);
      return false;
    }
  };

  let success = true;
  success = success && await executeSql(PAGES_TABLE_SQL, "Create Pages Table");
  success = success && await executeSql(ENABLE_RLS_SQL, "Enable RLS on Pages");
  success = success && await executeSql(CREATE_RLS_POLICIES_SQL, "Create RLS Policies for Pages");
  success = success && await executeSql(UPDATE_TIMESTAMP_FUNCTION, "Create updated_at function");
  success = success && await executeSql(UPDATE_TIMESTAMP_TRIGGER, "Create updated_at trigger");

  if (success) {
    console.log("Database setup script attempted successfully (check logs for actual execution results).");
  } else {
    console.error("Database setup script failed. Please run the necessary SQL manually in the Supabase SQL Editor.");
  }

  return success;
}; 