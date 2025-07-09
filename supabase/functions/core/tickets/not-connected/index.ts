import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// Get env vars from Supabase Edge runtime
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
console.log("Hello from update-call-status!");
Deno.serve(async (req)=>{
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }
  // Only allow POST requests
  if (req.method !== 'POST') {
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
    // Decode JWT to get user id
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
    // Parse request body
    const body = await req.json();
    const { ticketId, callStatus, resolutionStatus, cseRemarks, resolutionTime, otherReasons, assignedTo } = body;
    if (!ticketId) {
      return new Response(JSON.stringify({
        error: "Ticket ID is required"
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    if (!callStatus) {
      return new Response(JSON.stringify({
        error: "Call status is required"
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    // Check if ticket exists and get current data
    const { data: ticket, error: ticketError } = await supabase.from('support_ticket').select('id, call_attempts, call_status, resolution_status, assigned_to, cse_name').eq('id', ticketId).single();
    if (ticketError || !ticket) {
      return new Response(JSON.stringify({
        error: "Ticket not found"
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    const currentTime = new Date().toISOString();
    // Calculate snooze_until based on call status and attempts
    let snoozeUntil = null;
    const isCallNotConnected = callStatus === "Not Connected";
    if (isCallNotConnected) {
      const currentDate = new Date();
      // First attempt - snooze for 1 hour
      if (ticket.call_attempts === 0) {
        currentDate.setHours(currentDate.getHours() + 1);
        snoozeUntil = currentDate.toISOString();
        console.log("snooze", snoozeUntil);
      } else {
        currentDate.setFullYear(currentDate.getFullYear() + 10);
        snoozeUntil = currentDate.toISOString();
      }
    }
    // Determine assignment based on resolution status
    const shouldAssign = true;
    const finalAssignedTo = shouldAssign ? assignedTo || userId : null;
    const finalCseName = shouldAssign ? userEmail || 'Unknown CSE' : null;
    // Prepare update data
    const updateData = {
      call_status: callStatus,
      call_attempts: ticket.call_attempts + 1,
      completed_at: currentTime,
      snooze_until: snoozeUntil
    };
    // Add optional fields if provided
    if (resolutionStatus) {
      updateData.resolution_status = resolutionStatus;
    }
    if (cseRemarks !== undefined) {
      updateData.cse_remarks = cseRemarks;
    }
    if (resolutionTime !== undefined) {
      updateData.resolution_time = resolutionTime;
    }
    if (otherReasons !== undefined) {
      updateData.other_reasons = otherReasons;
    }
    if (finalAssignedTo !== undefined) {
      updateData.assigned_to = finalAssignedTo;
    }
    if (finalCseName !== undefined) {
      updateData.cse_name = finalCseName;
    }
    // Update the ticket
    const { data: updatedTicket, error: updateError } = await supabase.from('support_ticket').update(updateData).eq('id', ticketId).select().single();
    if (updateError) {
      console.error('Error updating ticket:', updateError);
      return new Response(JSON.stringify({
        error: "Failed to update ticket"
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    return new Response(JSON.stringify({
      success: true,
      message: "Ticket updated successfully",
      ticket: updatedTicket,
      snoozeUntil: snoozeUntil,
      callAttempts: ticket.call_attempts + 1,
      userId: userId,
      userEmail: userEmail
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('Error in update-call-status function:', error);
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
