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
    console.log("Function invoked. Initializing client.");
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: req.headers.get('Authorization')
        }
      }
    });
    console.log("Authenticating user.");
    // Debug: Check what authorization header we received
    const authHeader = req.headers.get('Authorization');
    console.log('Authorization header present:', !!authHeader);
    console.log('Authorization header preview:', authHeader ? authHeader.substring(0, 20) + '...' : 'MISSING');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error('User authentication error details:', JSON.stringify(userError, null, 2));
      return new Response(JSON.stringify({
        error: 'Authentication failed',
        details: userError.message,
        authHeaderPresent: !!authHeader
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 401
      });
    }
    if (!user) {
      console.error('No user found in token');
      return new Response(JSON.stringify({
        error: 'No user found',
        authHeaderPresent: !!authHeader
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 401
      });
    }
    const cseUserId = user.id;
    console.log(`User ${cseUserId} authenticated.`);
    const today = new Date();
    const startOfTodayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0, 0)).toISOString();
    const endOfTodayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 23, 59, 59, 999)).toISOString();
    // --- Query 1: Completed Tickets ---
    console.log("Executing Query 1: Completed Tickets");
    const { count: convertedCountToday, error: convertedError } = await supabase.from('support_ticket').select('*', {
      count: 'exact',
      head: true
    }).eq('assigned_to', cseUserId).eq('resolution_status', 'Resolved').gte('completed_at', startOfTodayUTC).lte('completed_at', endOfTodayUTC);
    if (convertedError) {
      console.error("ERROR during Query 1 (Completed Tickets):", JSON.stringify(convertedError, null, 2));
      throw new Error("Query 1 failed.");
    }
    console.log("Query 1 successful. Count:", convertedCountToday);
    const actualConvertedCountToday = convertedCountToday ?? 0;
    // --- Query 2: Pending Tickets ---
    console.log("Executing Query 2: Pending Tickets");
    const { count: pendingCount, error: pendingError } = await supabase.from('support_ticket').select('*', {
      count: 'exact',
      head: true
    }).eq('assigned_to', cseUserId).neq('resolution_status', 'Resolved');
    if (pendingError) {
      console.error("ERROR during Query 2 (Pending Tickets):", JSON.stringify(pendingError, null, 2));
      throw new Error("Query 2 failed.");
    }
    console.log("Query 2 successful. Count:", pendingCount);
    const actualPendingCount = pendingCount ?? 0;
    // --- Query 3: Total Assigned Tickets ---
    console.log("Executing Query 3: Total Assigned Tickets");
    const { count: totalAssignedCount, error: totalAssignedError } = await supabase.from('support_ticket').select('*', {
      count: 'exact',
      head: true
    }).eq('assigned_to', cseUserId);
    if (totalAssignedError) {
      console.error("ERROR during Query 3 (Total Assigned):", JSON.stringify(totalAssignedError, null, 2));
      throw new Error("Query 3 failed.");
    }
    console.log("Query 3 successful. Count:", totalAssignedCount);
    const actualTotalAssignedCount = totalAssignedCount ?? 0;
    console.log("All queries successful. Constructing response.");
    // Structure response data in the correct DEMO_DATA format
    const responseData = [
      {
        id: 1,
        title: "Completed Tickets",
        number: actualConvertedCountToday,
        description: "Total Completed Tickets Today",
        pieData: [
          {
            id: 0,
            value: actualConvertedCountToday,
            label: 'Compleated'
          },
          {
            id: 1,
            value: actualTotalAssignedCount,
            label: 'Assigned'
          }
        ]
      },
      {
        id: 2,
        title: "Pending Tickets",
        number: actualPendingCount,
        description: "Total Pending Tickets for Today",
        pieData: [
          {
            id: 0,
            value: actualPendingCount,
            label: 'Pending'
          },
          {
            id: 1,
            value: actualTotalAssignedCount,
            label: 'Assigned'
          }
        ]
      }
    ];
    return new Response(JSON.stringify(responseData), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('Catch block reached. Final error:', error.message);
    return new Response(JSON.stringify({
      error: error.message || 'An unexpected error occurred.'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});
