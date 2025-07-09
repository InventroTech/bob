// supabase/functions/process-dumped-tickets/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// CORS headers - Kept for potential manual triggering for debugging
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST'
};
// This function is designed to be run as a scheduled cron job (e.g., every 5 minutes).
// It processes new tickets from a dump table, assigns them to CSEs, and inserts them into the main support ticket table.
Deno.serve(async (req)=>{
  // For cron jobs, we only expect POST requests, which Supabase uses for scheduled function invocations.
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', {
      status: 405
    });
  }
  try {
    // 1. Authentication and Setup
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    console.log('Function invoked by schedule. Starting ticket processing...');
    // 2. Fetch Unprocessed Tickets
    const { data: dumpedTickets, error: fetchError } = await supabaseAdmin.from('support_ticket_dump').select('*').or('is_processed.is.null,is_processed.eq.false') // Fetch tickets that have not been processed yet
    .limit(5000); // Override Supabase's default 1000-row limit
    if (fetchError) throw new Error(`Failed to fetch unprocessed tickets: ${fetchError.message}`);
    if (dumpedTickets == null || !dumpedTickets || dumpedTickets.length === 0) {
      console.log('No new tickets in dump table to process.');
      return new Response(JSON.stringify({
        message: 'No tickets to process'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200
      });
    }
    console.log(`Found ${dumpedTickets.length} unprocessed tickets to process from dump.`);
    // 3. Deduplicate Tickets based on the user_id field of dumpedTickets
    const uniqueTickets = [
      ...new Map(dumpedTickets.map((ticket)=>[
          `${ticket.user_id}`,
          ticket
        ])).values()
    ];
    // remove the key value pairs (dump_id, is_processed) from the uniqueTickets
    uniqueTickets.forEach((ticket)=>{
      delete ticket.dump_id;
      delete ticket.is_processed;
      delete ticket.dumped_at;
      delete ticket.created_at;
    });
    // 4. push the unique tickets to the support_ticket table
    const { data: insertedTickets, error: insertError } = await supabaseAdmin.from('support_ticket').insert(uniqueTickets);
    if (insertError) throw new Error(`Failed to insert tickets: ${insertError.message}`);
    // 5. update the is_processed field of the dumpedTickets to true
    const { data: updatedTickets, error: updateError } = await supabaseAdmin.from('support_ticket_dump').update({
      is_processed: true
    }).in('id', dumpedTickets.map((ticket)=>ticket.id));
    if (updateError) throw new Error(`Failed to update tickets: ${updateError.message}`);
  } catch (error) {
    console.error('Critical error during ticket processing:', error);
    return new Response(JSON.stringify({
      error: error.message,
      stack: error.stack
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});
