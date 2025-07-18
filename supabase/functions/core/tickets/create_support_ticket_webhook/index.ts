import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
// Define CORS headers for preflight and actual requests.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-secret-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
Deno.serve(async (req)=>{
  // Handle CORS preflight request.
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
      status: 200
    });
  }
  // Get Supabase credentials from environment variables.
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  try {
    // Destructure the incoming JSON payload from the request.
    const { reason: description, tenant_id: tenantId, name, phone, user_id: praja_user_id, source: ticketType } = await req.json();
    console.log("Received request for tenantId:", tenantId);
    // Validate that the tenant_id is present.
    if (!tenantId) {
      console.error("Missing tenantId in request");
      return new Response(JSON.stringify({
        error: "tenant_id is required",
        received: {
          tenantId
        }
      }), {
        headers: corsHeaders,
        status: 400
      });
    }
    // 1. Fetch the 'CSE' role ID for the given tenant.
    const { data: roleData, error: roleError } = await supabase.from('roles').select('id').eq('name', 'CSE').eq('tenant_id', tenantId).single();
    if (roleError || !roleData) {
      console.error("Role fetching error or role not found. TenantID:", tenantId, "Error:", roleError || "No role data");
      return new Response(JSON.stringify({
        error: "CSE role not found for the tenant.",
        details: roleError?.message,
        tenantId: tenantId
      }), {
        headers: corsHeaders,
        status: 400
      });
    }
    const cseRoleId = roleData.id;
    console.log("CSE Role ID:", cseRoleId);
    // 2. Fetch CSE Users, including their name.
    // MODIFIED: Added 'name' to the select query to fetch the CSE's name.
    const { data: cseUsersList, error: cseUserError } = await supabase.from('users').select('id: uid, name') // Fetch both the user's UUID (as id) and their name.
    .eq('role_id', cseRoleId);
    if (cseUserError) {
      console.error("CSE User fetching error:", cseUserError);
      return new Response(JSON.stringify({
        error: "Failed to fetch CSE users.",
        details: cseUserError.message
      }), {
        headers: corsHeaders,
        status: 400
      });
    }
    // Filter for users who have a valid string ID (UUID).
    const validCseUsers = (cseUsersList || []).filter((user)=>user && user.id && typeof user.id === 'string');
    if (validCseUsers.length === 0) {
      console.error("No valid CSE users found for role ID:", cseRoleId);
      return new Response(JSON.stringify({
        error: 'No CSE users available for assignment.'
      }), {
        headers: corsHeaders,
        status: 400
      });
    }
    console.log("Valid CSE Users for assignment (count):", validCseUsers.length);
    if (validCseUsers.length > 0) {
      // MODIFIED: Log now shows the user object, which includes the name.
      console.log("Sample Valid CSE User (should include name):", JSON.stringify(validCseUsers[0]));
    }
    const cseUserIdsForQuery = validCseUsers.map((user)=>user.id);
    console.log("CSE User IDs for query (should be UUIDs):", JSON.stringify(cseUserIdsForQuery));
    // 3. Fetch all open tickets assigned to the list of CSEs.
    let { data: pendingTickets, error: pendingTicketsError } = await supabase.from('support_ticket').select('id, assigned_to').eq('resolution_status', 'Open').in('assigned_to', cseUserIdsForQuery);
    if (pendingTicketsError) {
      console.error("Pending tickets fetching error:", pendingTicketsError);
      pendingTickets = []; // Default to an empty array on error to avoid crashing.
    }
    if (!pendingTickets) {
      pendingTickets = []; // Ensure it's an array if null is returned.
    }
    console.log("Fetched Pending Tickets (count):", pendingTickets.length);
    // 4. Create a map to store the count of pending tickets for each CSE user.
    const cseUserPendingTicketsMap = new Map();
    for (const user of validCseUsers){
      const count = pendingTickets.filter((ticket)=>ticket.assigned_to === user.id).length;
      cseUserPendingTicketsMap.set(user.id, count);
    }
    console.log("CSE User Pending Tickets Map:", JSON.stringify(Array.from(cseUserPendingTicketsMap.entries())));
    // 5. Find the user with the minimum number of pending tickets.
    const userWithLeastPendingTickets = validCseUsers.reduce((minUser, currentUser)=>{
      const minUserCount = cseUserPendingTicketsMap.get(minUser.id) ?? Infinity;
      const currentUserCount = cseUserPendingTicketsMap.get(currentUser.id) ?? Infinity;
      return currentUserCount < minUserCount ? currentUser : minUser;
    }, validCseUsers[0]);
    console.log("User with least pending tickets:", JSON.stringify(userWithLeastPendingTickets));
    // 6. Get the ID and name for assignment.
    // MODIFIED: Also get the name of the assigned CSE.
    const assignedTo = userWithLeastPendingTickets ? userWithLeastPendingTickets.id : null;
    const assignedCseName = userWithLeastPendingTickets ? userWithLeastPendingTickets.name : 'Auto-Assigned';
    console.log("Final 'assignedTo' ID for DB insert:", assignedTo);
    console.log("Final 'cse_name' for DB insert:", assignedCseName);
    if (!assignedTo) {
      console.error("CRITICAL: 'assignedTo' resolved to null. Cannot assign ticket.");
      return new Response(JSON.stringify({
        error: 'Could not determine a valid CSE to assign the ticket to.'
      }), {
        headers: corsHeaders,
        status: 500
      });
    }
    // 7. Prepare and insert the new ticket into the database.
    const ticketToInsert = {
      tenant_id: tenantId,
      user_id: praja_user_id,
      name: name,
      phone: phone,
      source: ticketType,
      reason: description,
      assigned_to: assignedTo,
      resolution_status: 'Open',
      call_status: 'Pending',
      call_attempts: 0,
      // MODIFIED: Use the fetched name instead of a static string.
      cse_name: assignedCseName,
      cse_remarks: 'Initial ticket created via API webhook.',
      ticket_date: new Date().toISOString()
    };
    console.log("Attempting to insert ticket:", JSON.stringify(ticketToInsert));
    const { data: insertedTicket, error: ticketError } = await supabase.from('support_ticket').insert([
      ticketToInsert
    ]).select().single();
    if (ticketError) {
      console.error("Ticket insertion error:", ticketError);
      return new Response(JSON.stringify({
        error: 'Failed to create support ticket.',
        details: ticketError.message
      }), {
        headers: corsHeaders,
        status: 400
      });
    }
    console.log("Ticket inserted successfully:", JSON.stringify(insertedTicket));
    // Return a success response with the created ticket data.
    return new Response(JSON.stringify({
      message: 'Support ticket created successfully.',
      ticket: insertedTicket
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 201
    });
  } catch (error) {
    // Catch any unexpected errors during the process.
    console.error("Outer catch block error:", error.message, error.stack);
    return new Response(JSON.stringify({
      error: "An unexpected error occurred: " + error.message,
      details: error.stack
    }), {
      headers: corsHeaders,
      status: 500
    });
  }
});
