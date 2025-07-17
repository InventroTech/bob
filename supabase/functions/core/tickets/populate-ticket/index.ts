// supabase/functions/populate-sample-tickets/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// --- CONFIGURATION: Replace with your actual table and column names ---
// Your custom public table that stores user profiles/details including their role and link to auth.users.id
const PUBLIC_USERS_TABLE = 'users'; // e.g., 'users', 'profiles'
const PUBLIC_USERS_ROLE_FK_COLUMN = 'role_id'; // Column in PUBLIC_USERS_TABLE that is FK to ROLES_TABLE
const PUBLIC_USERS_AUTH_ID_COLUMN = 'uid'; // Column in PUBLIC_USERS_TABLE that stores auth.users.id
const PUBLIC_USERS_TENANT_FK_COLUMN = 'tenant_id'; // Column in PUBLIC_USERS_TABLE for tenant ID
const ROLES_TABLE = 'roles'; // Your table for roles
const ROLES_NAME_COLUMN = 'name'; // Column in ROLES_TABLE for role name (e.g., "CSE")
const ROLES_TENANT_FK_COLUMN = 'tenant_id'; // Column in ROLES_TABLE for tenant ID
const ROLES_PK_COLUMN = 'id'; // Primary key of ROLES_TABLE
const SUPPORT_TICKET_TABLE = 'support_ticket';
// --- END CONFIGURATION ---
// Helper function to get a random CSE user's auth UUID for a given tenant
async function getRandomCseAuthUserId(supabase, tenantId) {
  try {
    // 1. Get the CSE role ID for the tenant
    const { data: roleData, error: roleError } = await supabase.from(ROLES_TABLE).select(ROLES_PK_COLUMN).eq(ROLES_NAME_COLUMN, 'CSE').eq(ROLES_TENANT_FK_COLUMN, tenantId).limit(1).single(); // Expecting one CSE role per tenant
    if (roleError || !roleData) {
      console.warn(`[populate-sample-tickets] Warning: No CSE role found for tenant ${tenantId}. RoleError: ${roleError?.message}`);
      return null;
    }
    const cseRoleId = roleData[ROLES_PK_COLUMN];
    // 2. Get users with that role ID and tenant ID from your public users table
    const { data: usersData, error: usersError } = await supabase.from(PUBLIC_USERS_TABLE).select(PUBLIC_USERS_AUTH_ID_COLUMN) // This is the auth.users.id
    .eq(PUBLIC_USERS_ROLE_FK_COLUMN, cseRoleId).eq(PUBLIC_USERS_TENANT_FK_COLUMN, tenantId);
    if (usersError) {
      console.warn(`[populate-sample-tickets] Warning: Error fetching CSE users for role ${cseRoleId}, tenant ${tenantId}. UsersError: ${usersError.message}`);
      return null;
    }
    if (usersData && usersData.length > 0) {
      const randomIndex = Math.floor(Math.random() * usersData.length);
      const chosenUser = usersData[randomIndex];
      if (chosenUser && chosenUser[PUBLIC_USERS_AUTH_ID_COLUMN]) {
        return chosenUser[PUBLIC_USERS_AUTH_ID_COLUMN]; // This is the auth.users.id
      } else {
        console.warn(`[populate-sample-tickets] Warning: Chosen CSE user for role ${cseRoleId}, tenant ${tenantId} has no valid auth UUID in column '${PUBLIC_USERS_AUTH_ID_COLUMN}'.`);
        return null;
      }
    } else {
      console.warn(`[populate-sample-tickets] Warning: No CSE users found for role ${cseRoleId}, tenant ${tenantId}.`);
      return null;
    }
  } catch (e) {
    console.error(`[populate-sample-tickets] Error in getRandomCseAuthUserId for tenant ${tenantId}:`, e);
    return null;
  }
}
serve(async (req)=>{
  // For simplicity, this webhook runs its logic on any POST request.
  // You might want to add auth (e.g., check a secret header) for production.
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({
      error: 'Method Not Allowed. Use POST.'
    }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
  try {
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    console.log('[populate-sample-tickets] Successfully created Supabase admin client.');
    // Use the same test tenant IDs from your Python script
    // For real testing, ensure these tenants exist and have CSE roles and users configured.
    const test_tenant_id_1 = "214c833f-c981-4b80-9013-30d55603c912";
    const test_tenant_id_2 = "fd5fba0b-593b-477a-b3a2-f90cf960be77";
    const sampleTicketsData = [
      {
        "tenant_id": test_tenant_id_1,
        "first_name": "Rohan",
        "last_name": "Verma",
        "phone_number": "9123456780",
        "email_id": "rohan.verma@example.com",
        "praja_user_id": "PRAJA101",
        "ticket_type": "Billing",
        "status": "Pending",
        "Description": "Inquiry about subscription renewal.",
        "snooze_until": null,
        "retry_count": 0
      },
      {
        "tenant_id": test_tenant_id_1,
        "first_name": "Priya",
        "last_name": "Sharma",
        "phone_number": "9123456781",
        "email_id": "priya.sharma@example.com",
        "praja_user_id": "PRAJA102",
        "ticket_type": "Technical Support",
        "status": "Pending",
        "Description": "Login issue on the mobile app.",
        "snooze_until": null,
        "retry_count": 1
      },
      {
        "tenant_id": test_tenant_id_2,
        "first_name": "Arjun",
        "last_name": "Mehta",
        "phone_number": "9123456782",
        "email_id": "arjun.mehta@example.com",
        "praja_user_id": "PRAJA103",
        "ticket_type": "Badge Request",
        "status": "Resolved",
        "Description": "Badge approved and issued.",
        "snooze_until": null,
        "retry_count": 0
      },
      {
        "tenant_id": test_tenant_id_1,
        "first_name": "Deepika",
        "last_name": "Joshi",
        "phone_number": "9123456783",
        "email_id": "deepika.joshi@example.com",
        "praja_user_id": "PRAJA104",
        "ticket_type": "Poster Photo Update",
        "status": "Pending",
        "Description": "Wants to change poster image, needs dimensions.",
        "snooze_until": null,
        "retry_count": 0
      },
      {
        "tenant_id": test_tenant_id_2,
        "first_name": "Vikram",
        "last_name": "Rao",
        "phone_number": "9123456784",
        "email_id": "vikram.rao@example.com",
        "praja_user_id": "PRAJA105",
        "ticket_type": "Billing",
        "status": "Pending",
        "Description": "Dispute over a charge from last month.",
        "snooze_until": null,
        "retry_count": 2
      },
      {
        "tenant_id": test_tenant_id_1,
        "first_name": "Ananya",
        "last_name": "Gupta",
        "phone_number": "9123456785",
        "email_id": "ananya.gupta@example.com",
        "praja_user_id": "PRAJA106",
        "ticket_type": "General Inquiry",
        "status": "Auto-Closed",
        "Description": "Asked about service hours, no response after multiple attempts.",
        "snooze_until": null,
        "retry_count": 4
      },
      {
        "tenant_id": test_tenant_id_2,
        "first_name": "Karan",
        "last_name": "Malhotra",
        "phone_number": "9123456786",
        "email_id": "karan.malhotra@example.com",
        "praja_user_id": "PRAJA107",
        "ticket_type": "Feature Request",
        "status": "Pending",
        "Description": "Suggests adding a new feature to the platform.",
        "snooze_until": null,
        "retry_count": 0
      },
      {
        "tenant_id": test_tenant_id_1,
        "first_name": "Sameer",
        "last_name": "Khan",
        "phone_number": "9123456787",
        "email_id": "sameer.khan@example.com",
        "praja_user_id": "PRAJA108",
        "ticket_type": "Billing",
        "status": "Resolved",
        "Description": "Refund processed successfully.",
        "snooze_until": null,
        "retry_count": 0
      },
      {
        "tenant_id": test_tenant_id_2,
        "first_name": "Natasha",
        "last_name": "Das",
        "phone_number": "9123456788",
        "email_id": "natasha.das@example.com",
        "praja_user_id": "PRAJA109",
        "ticket_type": "Poster Photo Update",
        "status": "Pending",
        "Description": "Uploaded photo is blurry, requesting re-upload instructions.",
        "snooze_until": null,
        "retry_count": 0
      },
      {
        "tenant_id": test_tenant_id_1,
        "first_name": "Rajesh",
        "last_name": "Nair",
        "phone_number": "9123456789",
        "email_id": "rajesh.nair@example.com",
        "praja_user_id": "PRAJA110",
        "ticket_type": "Badge Request",
        "status": "Pending",
        "Description": "Submitted documents for badge verification.",
        "snooze_until": null,
        "retry_count": 0
      },
      {
        "tenant_id": test_tenant_id_2,
        "first_name": "Sunita",
        "last_name": "Reddy",
        "phone_number": "9123456790",
        "email_id": "sunita.reddy@example.com",
        "praja_user_id": "PRAJA111",
        "ticket_type": "Technical Support",
        "status": "Pending",
        "Description": "Cannot access account after password reset.",
        "snooze_until": null,
        "retry_count": 0
      }
    ];
    const ticketsToInsert = [];
    for (const ticket of sampleTicketsData){
      const ticketCopy = {
        ...ticket
      }; // Use 'any' for temporary flexibility or define a proper type
      if (ticketCopy.tenant_id) {
        const cseAuthUuid = await getRandomCseAuthUserId(supabaseAdmin, ticketCopy.tenant_id);
        if (cseAuthUuid) {
          ticketCopy.assigned_to = cseAuthUuid;
        } else {
          console.warn(`[populate-sample-tickets] Could not auto-assign CSE for ticket for ${ticketCopy.first_name}. 'assigned_to' will be null.`);
          ticketCopy.assigned_to = null;
        }
      } else {
        ticketCopy.assigned_to = null;
      }
      ticketsToInsert.push(ticketCopy);
    }
    if (ticketsToInsert.length === 0) {
      console.log('[populate-sample-tickets] No tickets to insert.');
      return new Response(JSON.stringify({
        message: 'No tickets to insert.'
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    console.log(`[populate-sample-tickets] Attempting to insert ${ticketsToInsert.length} tickets into ${SUPPORT_TICKET_TABLE}...`);
    const { data: insertData, error: insertError } = await supabaseAdmin.from(SUPPORT_TICKET_TABLE).insert(ticketsToInsert).select(); // Add .select() to get the inserted data back if needed
    if (insertError) {
      console.error('[populate-sample-tickets] Error inserting tickets:', JSON.stringify(insertError, null, 2));
      return new Response(JSON.stringify({
        error: 'Error inserting tickets',
        details: insertError.message
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    console.log('[populate-sample-tickets] Successfully inserted tickets.');
    return new Response(JSON.stringify({
      message: `Successfully inserted ${insertData ? insertData.length : 0} tickets.`,
      data: insertData
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (e) {
    console.error('[populate-sample-tickets] Unhandled error in function:', e);
    return new Response(JSON.stringify({
      error: 'An unexpected error occurred',
      details: e.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
});
