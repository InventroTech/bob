import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
// Standard CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS'
};
Deno.serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
      status: 200
    });
  }
  try {
    // Initialize Supabase client with user's authorization header
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: req.headers.get('Authorization')
        }
      }
    });
    // Get the authenticated user's data
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('User fetch error:', userError);
      return new Response(JSON.stringify({
        error: 'Authentication failed or user not found.'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 401
      });
    }
    // This is the authenticated user's ID
    const cseUserId = user.id;
    console.log('Querying for user ID:', cseUserId);
    // --- Core Logic Change: Fetching WIP Tickets ---
    // Query for tickets assigned to the user with 'Work in Progress' status.
    // Sorted by creation date, oldest first.
    const { data: wipTickets, error: ticketsError } = await supabase.from('support_ticket').select('*').eq('assigned_to', cseUserId).eq('resolution_status', 'WIP') // Key change: Filtering for WIP status
    .order('created_at', {
      ascending: false
    });
    if (ticketsError) {
      console.error('Error fetching WIP tickets:', ticketsError);
      return new Response(JSON.stringify({
        error: 'Failed to fetch WIP tickets.',
        details: ticketsError.message
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      });
    }
    // Return the list of WIP tickets
    return new Response(JSON.stringify(wipTickets || []), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('Unexpected error in get-wip-tickets:', error);
    return new Response(JSON.stringify({
      error: 'An unexpected error occurred.',
      details: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});
