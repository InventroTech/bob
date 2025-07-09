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
    // Get current time for snooze comparison
    const currentTime = new Date().toISOString();
    // Function to try assigning a ticket to the user
    const tryAssignTicket = async (ticketId)=>{
      const { error } = await supabase.from('support_ticket').update({
        assigned_to: userId,
        cse_name: userEmail
      }).eq('id', ticketId);
      console.log(userId, userEmail); // Only assign if not already assigned
      return !error;
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
      // 2. If no snoozed ticket, get oldest unassigned pending ticket
      query = supabase.from('support_ticket').select('*').is('assigned_to', null).or('resolution_status.eq.Pending,resolution_status.is.null').order('created_at', {
        ascending: true
      }).limit(1);
      const result = await query;
      tickets = result.data;
      error = result.error;
      console.log("4", tickets);
      if (error) {
        console.error('Error fetching unassigned tickets:', error);
        return null;
      }
      if (!tickets || tickets.length === 0) {
        console.log("5");
        return null; // No tickets available
      }
      const ticket = tickets[0];
      // 3. Try to assign the ticket to the user
      const assignmentSuccess = await tryAssignTicket(ticket.id);
      if (assignmentSuccess) {
        // Fetch the updated ticket
        console.log("6");
        const { data: updatedTicket } = await supabase.from('support_ticket').select('*').eq('id', ticket.id).single();
        return updatedTicket;
      } else {
        // If assignment failed, try again recursively
        console.log("7");
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
    // Format the ticket for response
    const formattedNextTicket = {
      name: nextTicket.name,
      id: nextTicket.id,
      user_id: nextTicket.user_id,
      phone: nextTicket.phone,
      source: nextTicket.source,
      payment_status: nextTicket.payment_status,
      attempts: nextTicket.attempts,
      primary_reason: nextTicket.primary_reason,
      other_reasons: nextTicket.other_reasons,
      cse_remarks: nextTicket.cse_remarks,
      status: nextTicket.status,
      call_status: nextTicket.call_status
    };
    return new Response(JSON.stringify({
      success: true,
      ticket: formattedNextTicket,
      hasNextTicket: true
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
