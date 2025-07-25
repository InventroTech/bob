import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// Get env vars from Supabase Edge runtime
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
console.log("Hello from get-next-ticket!");
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
    // Get current time for snooze comparison
    const currentTime = new Date().toISOString();
    // Define priority order for poster
    const priorityOrder = [
      'IN Trail',
      'Paid',
      'Trail Extension',
      'Premium Extension',
      'Trail Expired',
      'Premium Expired',
      'Grace',
      'Autopay Not Setup',
      'Free'
    ];
    // Function to try assigning a ticket to the user
    const tryAssignTicket = async (ticketId)=>{
      const { error } = await supabase.from('support_ticket').update({
        assigned_to: userId,
        cse_name: userEmail
      }).eq('id', ticketId).is('assigned_to', null);
      console.log(userId, userEmail); // Only assign if not already assigned
      return !error;
    };
    // Function to get tickets by priority
    const getTicketsByPriority = async (priorityStatus)=>{
      const query = supabase.from('support_ticket').select('*').is('assigned_to', null).or('resolution_status.eq.Pending,resolution_status.is.null').eq('poster', priorityStatus).order('created_at', {
        ascending: true
      }).limit(1);
      const { data: tickets, error } = await query;
      if (error) {
        console.error(`Error fetching tickets for priority ${priorityStatus}:`, error);
        return null;
      }
      return tickets && tickets.length > 0 ? tickets[0] : null;
    };
    // Function to get and assign a ticket
    const getAndAssignTicket = async ()=>{
      // 1. First, try to get snoozed ticket for the user
      console.log("1");
      let query = supabase.from('support_ticket').select('*').eq('assigned_to', userId).eq('resolution_status', 'Pending').not('snooze_until', 'is', null).lt('snooze_until', currentTime) // snoozed_until is in the past
      .order('snooze_until', {
        ascending: true
      }).limit(1);
      let { data: tickets, error } = await query;
      if (error) {
        console.log("2");
        console.error('Error fetching snoozed tickets:', error);
        return null;
      }
      // If snoozed ticket found, return it
      if (tickets && tickets.length > 0) {
        console.log("3");
        return tickets[0];
      }
      // 2. If no snoozed ticket, get tickets by priority order
      console.log("4 - Checking priority order");
      for (const priorityStatus of priorityOrder){
        console.log(`Checking priority: ${priorityStatus}`);
        const ticket = await getTicketsByPriority(priorityStatus);
        if (ticket) {
          console.log(`Found ticket with priority ${priorityStatus}:`, ticket.id);
          // Try to assign the ticket to the user
          const assignmentSuccess = await tryAssignTicket(ticket.id);
          if (assignmentSuccess) {
            // Fetch the updated ticket
            console.log("6");
            const { data: updatedTicket } = await supabase.from('support_ticket').select('*').eq('id', ticket.id).single();
            return updatedTicket;
          } else {
            // If assignment failed, continue to next priority
            console.log(`Assignment failed for ticket ${ticket.id}, trying next priority`);
            continue;
          }
        }
      }
      // 3. If no tickets found by priority, get oldest unassigned pending ticket (fallback)
      console.log("5 - Fallback to oldest unassigned ticket");
      query = supabase.from('support_ticket').select('*').is('assigned_to', null).or('resolution_status.eq.Pending,resolution_status.is.null').order('created_at', {
        ascending: true
      }).limit(1);
      const result = await query;
      tickets = result.data;
      error = result.error;
      console.log("6", tickets);
      if (error) {
        console.error('Error fetching unassigned tickets:', error);
        return null;
      }
      if (!tickets || tickets.length === 0) {
        console.log("7");
        return null; // No tickets available
      }
      const ticket = tickets[0];
      // 4. Try to assign the ticket to the user
      const assignmentSuccess = await tryAssignTicket(ticket.id);
      if (assignmentSuccess) {
        // Fetch the updated ticket
        console.log("8");
        const { data: updatedTicket } = await supabase.from('support_ticket').select('*').eq('id', ticket.id).single();
        return updatedTicket;
      } else {
        // If assignment failed, try again recursively
        console.log("9");
        return await getAndAssignTicket();
      }
    };
    // Get the ticket
    const nextTicket = await getAndAssignTicket();
    // If no tickets available, return empty object
    if (!nextTicket) {
      return new Response(JSON.stringify({}), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    return new Response(JSON.stringify({
      ticket: nextTicket
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('Error in get-next-ticket function:', error);
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
