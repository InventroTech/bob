// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Get env vars from Supabase Edge runtime
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

console.log("Hello from Functions!")

Deno.serve(async (req) => {
  // Get JWT from Authorization header
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Missing or invalid auth header" }), { status: 401 });
  }
  const jwt = authHeader.replace("Bearer ", "");

  // Decode JWT to get user id
  let userId: string | undefined;
  try {
    const payload = JSON.parse(atob(jwt.split(".")[1]));
    userId = payload.sub;
  } catch (e) {
    return new Response(JSON.stringify({ error: "Invalid JWT" }), { status: 401 });
  }
  if (!userId) {
    return new Response(JSON.stringify({ error: "No user id in JWT" }), { status: 400 });
  }

  // Sanitize schema name
  const schemaName = `user_${userId.replace(/[^a-zA-Z0-9_]/g, "")}`;

  // Create schema if not exists
  const { error } = await supabase.rpc("execute_sql", {
    sql_statement: `CREATE SCHEMA IF NOT EXISTS \"${schemaName}\";`
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true, schema: schemaName }), {
    headers: { "Content-Type": "application/json" },
  });
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/create_user_schema' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
