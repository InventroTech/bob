import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS'
};
Deno.serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
      status: 200
    });
  }
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: req.headers.get('Authorization')
        }
      }
    });
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
    const cseUserId = user.id;
    const now = new Date().toISOString();
    // Fetch pending tickets: 'Pending' status and not currently snoozed
    // Sorted by creation date, oldest first
    const { data: pendingTickets, error: ticketsError } = await supabase.from('support_ticket').select('*').eq('assigned_to', cseUserId).neq('resolution_status', 'Resolved') // Not snoozed or snooze has passed
    .order('created_at', {
      ascending: true
    });
    if (ticketsError) {
      console.error('Error fetching pending tickets:', ticketsError);
      return new Response(JSON.stringify({
        error: 'Failed to fetch pending tickets.',
        details: ticketsError.message
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      });
    }
    return new Response(JSON.stringify(pendingTickets || []), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('Unexpected error in get-pending-tickets:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});
