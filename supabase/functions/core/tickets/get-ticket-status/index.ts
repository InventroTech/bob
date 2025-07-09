import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Get env vars from Supabase Edge runtime
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

console.log("Hello from get-ticket-status!");
Deno.serve(async (req)=>{
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }

  // Allow GET and POST requests
  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response(JSON.stringify({
      error: "Method not allowed"
    }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  try {
    // Get JWT from Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({
        error: "Missing or invalid auth header"
      }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    const jwt = authHeader.replace("Bearer ", "");

    // Decode JWT to get user id and email
    let userId;
    let userEmail;
    try {
      const payload = JSON.parse(atob(jwt.split(".")[1]));
      userId = payload.sub;
      userEmail = payload.email;
    } catch (e) {
      return new Response(JSON.stringify({
        error: "Invalid JWT"
      }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    if (!userId) {
      return new Response(JSON.stringify({
        error: "No user id in JWT"
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Get today's date range (start and end of day)
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    
    const startOfDayISO = startOfDay.toISOString();
    const endOfDayISO = endOfDay.toISOString();

    // 1. Resolved By You (Today) - For the current CSE
    // Check cse_name field which can contain either name or email or userId
    const { count: resolvedTodayCount, error: resolvedError } = await supabase
      .from('support_ticket')
      .select('*', { count: 'exact', head: true })
      .or(`cse_name.eq.${userEmail},cse_name.eq.${userId}`)
      .eq('resolution_status', 'Resolved')
      .gte('completed_at', startOfDayISO)
      .lte('completed_at', endOfDayISO);

    if (resolvedError) {
      console.error('Error fetching resolved tickets:', resolvedError);
    }

    // 2. Total Pending Tickets (Overall. Not specific to this CSE)
    // Include both 'Pending' status and null resolution_status
    const { count: totalPendingCount, error: pendingError } = await supabase
      .from('support_ticket')
      .select('*', { count: 'exact', head: true })
      .or('resolution_status.eq.Pending,resolution_status.is.null');

    if (pendingError) {
      console.error('Error fetching pending tickets:', pendingError);
    }

    // 3. WIP tickets (For this CSE) - Not filtered by today
    // Use cse_name which can contain either name or email or userId
    const { count: wipTicketsCount, error: wipError } = await supabase
      .from('support_ticket')
      .select('*', { count: 'exact', head: true })
      .or(`cse_name.eq.${userEmail},cse_name.eq.${userId}`)
      .eq('resolution_status', 'WIP');

    if (wipError) {
      console.error('Error fetching WIP tickets:', wipError);
    }

    // 4. Can't Resolve (Today) (For this CSE)
    // Use cse_name which can contain either name or email or userId
    const { count: cantResolveTodayCount, error: cantResolveError } = await supabase
      .from('support_ticket')
      .select('*', { count: 'exact', head: true })
      .or(`cse_name.eq.${userEmail},cse_name.eq.${userId}`)
      .eq('resolution_status', "Can't Resolved")
      .gte('completed_at', startOfDayISO)
      .lte('completed_at', endOfDayISO);

    if (cantResolveError) {
      console.error('Error fetching cant resolve tickets:', cantResolveError);
    }

    // Prepare response
    const ticketStats = {
      resolvedByYouToday: resolvedTodayCount || 0,
      totalPendingTickets: totalPendingCount || 0,
      wipTickets: wipTicketsCount || 0,
      cantResolveToday: cantResolveTodayCount || 0
    };

    return new Response(JSON.stringify({
      success: true,
      message: "Ticket status retrieved successfully",
      ticketStats: ticketStats,
      userId: userId,
      userEmail: userEmail,
      dateRange: {
        startOfDay: startOfDayISO,
        endOfDay: endOfDayISO
      }
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('Error in get-ticket-status function:', error);
    return new Response(JSON.stringify({
      error: "Internal server error"
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request GET 'http://127.0.0.1:54321/functions/v1/get-ticket-status' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

*/
