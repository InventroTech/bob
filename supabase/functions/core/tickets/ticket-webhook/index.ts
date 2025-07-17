// supabase/functions/dump-ticket-webhook/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
// Define the exact list of fields to accept from the payload
const ALLOWED_FIELDS = [
  'tenant_id',
  'ticket_date',
  'user_id',
  'name',
  'phone',
  'reason',
  'rm_name',
  'layout_status',
  'badge',
  'poster',
  'subscription_status',
  'atleast_paid_once',
  'source',
  'praja_dashboard_user_link',
  'display_pic_url'
];
Deno.serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({
      error: 'Method not allowed'
    }), {
      status: 405,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
  try {
    // 1. Validate webhook secret for security
    const webhookSecret = req.headers.get('x-webhook-secret');
    const storedSecret = Deno.env.get('WEBHOOK_SECRET');
    if (!webhookSecret || webhookSecret !== storedSecret) {
      console.warn('Unauthorized webhook attempt.');
      return new Response(JSON.stringify({
        error: 'Unauthorized: Invalid or missing webhook secret'
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // 2. Parse the incoming JSON payload
    const payload = await req.json();
    if (!payload || typeof payload !== 'object') {
      throw new Error("Invalid or empty JSON payload.");
    }
    // 3. Create a clean data object with only the allowed fields
    const cleanedData = {};
    // The tenant_id is absolutely required.
    if (!payload.tenant_id) {
      throw new Error("Missing required field: tenant_id");
    }
    for (const field of ALLOWED_FIELDS){
      // If the field exists in the payload (and is not null/undefined), add it to our clean object.
      if (payload[field] !== null && payload[field] !== undefined) {
        cleanedData[field] = payload[field];
      }
    }
    // Ensure ticket_date is present; default to now if not.
    if (!cleanedData.ticket_date) {
      cleanedData.ticket_date = new Date().toISOString();
    }
    // Set default is_processed status for the cron job
    cleanedData.is_processed = false;
    // 4. Insert the cleaned data into the dump table
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const { data, error } = await supabaseClient.from('support_ticket_dump').insert(cleanedData).select().single();
    if (error) {
      console.error('Supabase insert error:', error);
      throw new Error(`Database error: ${error.message}`);
    }
    // 5. Success response
    return new Response(JSON.stringify({
      message: 'Ticket created successfully in dump table',
      ticket_id: data.id
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Critical error:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
