import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// Define CORS headers to allow requests from any origin
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
// Start serving requests
serve(async (req)=>{
  // Handle preflight requests for CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    // --- New: Parse URL to get query parameters ---
    const url = new URL(req.url);
    const daysParam = url.searchParams.get('days');
    // --- New: Validate the input ---
    if (!daysParam) {
      return new Response(JSON.stringify({
        error: "The 'days' query parameter is required."
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }
    const days = parseInt(daysParam, 10);
    if (isNaN(days) || days <= 0) {
      return new Response(JSON.stringify({
        error: "The 'days' parameter must be a positive number."
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }
    // --- End of new code ---
    // Create a Supabase client
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: {
        headers: {
          Authorization: req.headers.get('Authorization')
        }
      }
    });
    // Call the database function with the user-provided number of days
    const { data, error } = await supabaseClient.rpc('calculate_average_completion_time', {
      days_period: days
    });
    // Handle any errors from the database function call
    if (error) {
      console.error(`Error fetching average for ${days} days:`, error);
      throw error; // Let the generic error handler catch it
    }
    // Structure the data for the JSON response
    const responseData = {
      period_in_days: days,
      average_completion_time: data
    };
    // Return the data as a JSON response
    return new Response(JSON.stringify(responseData), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    // Catch any unexpected errors
    console.error('An unexpected error occurred:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});
