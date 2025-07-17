import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// Get env vars from Supabase Edge runtime
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
console.log("Hello from save-and-continue!");
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
    const { ticketId, resolutionStatus, callStatus, cseRemarks, resolutionTime, otherReasons, ticketStartTime, isReadOnly = false } = body;
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
    if (isReadOnly) {
      return new Response(JSON.stringify({
        error: "This ticket is read-only"
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    // Check if ticket exists and get current data
    const { data: currentTicket, error: ticketError } = await supabase.from('support_ticket').select('*').eq('id', ticketId).single();
    if (ticketError || !currentTicket) {
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
    // Determine assignment based on resolution status
    const shouldAssign = resolutionStatus === "WIP";
    const assignedTo = shouldAssign ? userId : null;
    // Always save cse_name for all resolution statuses
    const cseName = userEmail;

    // Update the current ticket
    const { data: updatedTicket, error: updateError } = await supabase.from('support_ticket').update({
      resolution_status: resolutionStatus,
      assigned_to: assignedTo,
      cse_remarks: cseRemarks,
      cse_name: cseName,
      call_status: callStatus,
      resolution_time: resolutionTime || null,
      call_attempts: currentTicket.call_attempts + 1,
      completed_at: currentTime,
      other_reasons: otherReasons
    }).eq('id', ticketId).select().single();
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
    // Prepare response
    const response = {
      success: true,
      message: "Ticket updated successfully",
      updatedTicket: updatedTicket,
      userId: userId,
      userEmail: userEmail
    };
    return new Response(JSON.stringify(response), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('Error in save-and-continue function:', error);
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
