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

// In-memory cache to track recently processed tickets (per user)
const processedTicketsCache = new Map<string, Set<number>>();

console.log("Hello from get-next-ticket!")

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

    // Get current ticket ID from request body or query params
    let currentTicketId: number | null = null;
    
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        currentTicketId = body.currentTicketId || body.ticketId || null;
      } catch (e) {
        // If body parsing fails, continue without currentTicketId
      }
    } else {
      // For GET requests, try to get from URL params
      const url = new URL(req.url);
      currentTicketId = url.searchParams.get('exclude') ? parseInt(url.searchParams.get('exclude')!) : null;
    }

    // Function to get next ticket with retry mechanism
    const getNextTicket = async (excludeTicketId: number | null, maxAttempts: number = 3) => {
      let attempts = 0;
      let nextTicket = null;
      
      // Get or create user's processed tickets set
      if (!processedTicketsCache.has(userId)) {
        processedTicketsCache.set(userId, new Set());
      }
      const userProcessedTickets = processedTicketsCache.get(userId)!;
      
      while (attempts < maxAttempts && (!nextTicket || 
             (excludeTicketId && nextTicket.id === excludeTicketId) ||
             userProcessedTickets.has(nextTicket.id))) {
        attempts++;
        console.log(`Attempt ${attempts} to fetch next ticket...`);
        
        // Build query for next available ticket
        // Priority: unassigned tickets first, then by creation date
        // Exclude resolved tickets and ensure no repetition
        let query = supabase
          .from('support_ticket')
          .select('*')
          .or(`assigned_to.is.null,assigned_to.eq.${userId}`)
          .is('snooze_until', null)
          .neq('resolution_status', 'Resolved')
          .order('assigned_to', { ascending: true, nullsFirst: true })
          .order('created_at', { ascending: true })
          .limit(1);

        // Exclude current ticket if provided
        if (excludeTicketId) {
          query = query.neq('id', excludeTicketId);
        }

        // Exclude tickets that have been recently processed by this user
        // Get the last 10 processed tickets to exclude them from the query
        const recentProcessedTickets = Array.from(userProcessedTickets).slice(-10);
        if (recentProcessedTickets.length > 0) {
          query = query.not('id', 'in', `(${recentProcessedTickets.join(',')})`);
        }

        const { data: tickets, error: fetchError } = await query;

        if (fetchError) {
          console.error('Error fetching next ticket:', fetchError);
          break;
        }

        if (tickets && tickets.length > 0) {
          nextTicket = tickets[0];
          
          // Check if this ticket was already processed by this user
          if (userProcessedTickets.has(nextTicket.id)) {
            console.log(`Ticket ${nextTicket.id} already processed by user ${userId}, skipping...`);
            nextTicket = null; // Reset to continue searching
          }
        }
        
        // If we got the same ticket or no valid ticket, wait a bit before retrying
        if ((nextTicket && excludeTicketId && nextTicket.id === excludeTicketId) || 
            (nextTicket && userProcessedTickets.has(nextTicket.id)) ||
            !nextTicket) {
          if (attempts < maxAttempts) {
            console.log('Same ticket returned or no valid ticket, waiting before retry...');
            await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
          }
        }
      }
      
      // If we found a valid ticket, add it to processed tickets
      if (nextTicket && !userProcessedTickets.has(nextTicket.id)) {
        userProcessedTickets.add(nextTicket.id);
        console.log(`Added ticket ${nextTicket.id} to processed tickets for user ${userId}`);
        
        // Clean up cache if it gets too large (keep only last 1000 tickets per user)
        if (userProcessedTickets.size > 1000) {
          const ticketsArray = Array.from(userProcessedTickets);
          const ticketsToKeep = ticketsArray.slice(-1000);
          userProcessedTickets.clear();
          ticketsToKeep.forEach(id => userProcessedTickets.add(id));
          console.log(`Cleaned up processed tickets cache for user ${userId}`);
        }
      }

      // Also add the excluded ticket to processed tickets to prevent it from being returned again
      if (excludeTicketId && !userProcessedTickets.has(excludeTicketId)) {
        userProcessedTickets.add(excludeTicketId);
        console.log(`Added excluded ticket ${excludeTicketId} to processed tickets for user ${userId}`);
      }
      
      return nextTicket;
    };

    // Get next ticket
    const nextTicket = await getNextTicket(currentTicketId);

    if (!nextTicket) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: "No more tickets available",
        hasNextTicket: false
      }), { 
        status: 404,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

    // Format next ticket for frontend consumption
    const formattedNextTicket = {
      ...nextTicket,
      resolution_status: nextTicket.resolution_status || "Pending",
      call_status: nextTicket.call_status || "Connected",
      cse_remarks: nextTicket.cse_remarks || "",
      other_reasons: nextTicket.other_reasons || []
    };

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Next ticket retrieved successfully",
      ticket: formattedNextTicket,
      hasNextTicket: true,
      userId: userId,
      userEmail: userEmail
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });

  } catch (error) {
    console.error('Error in get-next-ticket function:', error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { 
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/get-next-ticket' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/