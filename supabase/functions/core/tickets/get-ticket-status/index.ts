import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Get env vars from Supabase Edge runtime
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

console.log("Hello from get-ticket-status!")

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  // Allow GET and POST requests
  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { 
      status: 405,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  }

  try {
    // Get JWT from Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing or invalid auth header" }), { 
        status: 401,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }
    const jwt = authHeader.replace("Bearer ", "");

    // Decode JWT to get user id and email
    let userId: string | undefined;
    let userEmail: string | undefined;
    try {
      const payload = JSON.parse(atob(jwt.split(".")[1]));
      userId = payload.sub;
      userEmail = payload.email;
    } catch (e) {
      return new Response(JSON.stringify({ error: "Invalid JWT" }), { 
        status: 401,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }
    if (!userId) {
      return new Response(JSON.stringify({ error: "No user id in JWT" }), { 
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
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
    const { data: resolvedToday, error: resolvedError } = await supabase
      .from('support_ticket')
      .select('id')
      .eq('assigned_to', userId)
      .eq('resolution_status', 'Resolved')
      .gte('completed_at', startOfDayISO)
      .lte('completed_at', endOfDayISO);

    if (resolvedError) {
      console.error('Error fetching resolved tickets:', resolvedError);
    }

    // Also check for resolved tickets by cse_name in case assigned_to is not set
    const { data: resolvedTodayByName, error: resolvedByNameError } = await supabase
      .from('support_ticket')
      .select('id')
      .eq('cse_name', userEmail)
      .eq('resolution_status', 'Resolved')
      .gte('completed_at', startOfDayISO)
      .lte('completed_at', endOfDayISO);

    if (resolvedByNameError) {
      console.error('Error fetching resolved tickets by name:', resolvedByNameError);
    }

    // 2. Total Pending Tickets (Overall. Not specific to this CSE)
    const { data: totalPending, error: pendingError } = await supabase
      .from('support_ticket')
      .select('id')
      .eq('resolution_status', 'Pending');

    if (pendingError) {
      console.error('Error fetching pending tickets:', pendingError);
    }

    // 3. WIP tickets (For this CSE) - Not filtered by today
    const { data: wipTickets, error: wipError } = await supabase
      .from('support_ticket')
      .select('id')
      .eq('assigned_to', userId)
      .eq('resolution_status', 'WIP');

    if (wipError) {
      console.error('Error fetching WIP tickets:', wipError);
    }

    // 4. Can't Resolve (Today) (For this CSE)
    const { data: cantResolveToday, error: cantResolveError } = await supabase
      .from('support_ticket')
      .select('id')
      .eq('assigned_to', userId)
      .eq('resolution_status', "Can't Resolved")
      .gte('completed_at', startOfDayISO)
      .lte('completed_at', endOfDayISO);

    if (cantResolveError) {
      console.error('Error fetching cant resolve tickets:', cantResolveError);
    }

    // Combine resolved tickets (by assigned_to and cse_name)
    const resolvedTodayIds = new Set();
    resolvedToday?.forEach(ticket => resolvedTodayIds.add(ticket.id));
    resolvedTodayByName?.forEach(ticket => resolvedTodayIds.add(ticket.id));

    // Prepare response
    const ticketStats = {
      resolvedByYouToday: resolvedTodayIds.size,
      totalPendingTickets: totalPending?.length || 0,
      wipTickets: wipTickets?.length || 0,
      cantResolveToday: cantResolveToday?.length || 0
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
        'Access-Control-Allow-Origin': '*',
      }
    });

  } catch (error) {
    console.error('Error in get-ticket-status function:', error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { 
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
})
