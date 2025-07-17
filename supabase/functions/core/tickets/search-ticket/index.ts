import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
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
    const url = new URL(req.url);
    const searchTerm = url.searchParams.get('search_term')?.trim(); // Get and trim search term
    let query = supabase.from('support_ticket').select('*').eq('assigned_to', cseUserId);
    if (searchTerm) {
      const searchPattern = `%${searchTerm}%`; // Pattern for ILIKE
      query = query.or(`first_name.ilike.${searchPattern},` + `last_name.ilike.${searchPattern},` + `phone_number.ilike.${searchPattern},` + `praja_user_id.ilike.${searchPattern},` + // Existing search field
      `email_id.ilike.${searchPattern}` // Added email_id search
      );
    }
    // Apply ordering
    // Note: email_id is not added to ordering by default, but can be if needed.
    // The request was to order by [name, phone number and ticket_id (now praja_user_id)]
    query = query.order('first_name', {
      ascending: true,
      nullsFirst: false
    }).order('phone_number', {
      ascending: true,
      nullsFirst: false
    }).order('praja_user_id', {
      ascending: true,
      nullsFirst: false
    });
    const { data: tickets, error: ticketsError } = await query;
    if (ticketsError) {
      console.error('Error searching tickets:', ticketsError);
      return new Response(JSON.stringify({
        error: 'Failed to search tickets.',
        details: ticketsError.message
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      });
    }
    return new Response(JSON.stringify(tickets || []), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('Unexpected error in search-cse-tickets:', error);
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
