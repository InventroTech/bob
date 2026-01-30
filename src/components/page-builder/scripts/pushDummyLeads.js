/**
 * JavaScript Script to Push Random Leads to Database
 * 
 * Setup Instructions:
 * 1. Script Type: JavaScript
 * 2. Request Method: POST
 * 3. API Endpoint: Leave empty (script handles it internally)
 * 4. Bearer Token Source: Select "From Login Session" or provide custom token
 * 5. Environment Variables (as JSON):
 *    {
 *      "BASE_URL": "http://localhost:8000",
 *      "TOTAL_LEADS": "10",
 *      "TENANT_ID": "e35e7279-d92d-4cdf-8014-98deaab639c0"
 *    }
 * 
 * Note: ACCESS_TOKEN and SUPABASE_ANON_KEY are automatically provided by the system
 * if you select "From Login Session" as Bearer Token Source.
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const BASE_URL = envVars.BASE_URL || "http://localhost:8000";
const ENDPOINT = "/crm-records/records/";  // Using records endpoint with entity_type query param
const TOTAL_LEADS = parseInt(envVars.TOTAL_LEADS || '10');
const TENANT_ID = envVars.TENANT_ID || "e35e7279-d92d-4cdf-8014-98deaab639c0";

// Get tokens from environment (automatically provided if using "From Login Session")
const ACCESS_TOKEN = envVars.ACCESS_TOKEN || "";
const SUPABASE_ANON_KEY = envVars.SUPABASE_ANON_KEY || "";

// Construct full URL
const FULL_URL = `${BASE_URL.replace(/\/+$/, '')}${ENDPOINT}?entity_type=lead`;

// ============================================================================
// VALIDATION
// ============================================================================

if (!ACCESS_TOKEN || ACCESS_TOKEN.trim() === '') {
  const errorMsg = "❌ ACCESS_TOKEN is missing! Please ensure you're logged in or set Bearer Token Source.";
  console.error(errorMsg);
  toast.error(errorMsg);
  throw new Error("ACCESS_TOKEN is required");
}

if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.trim() === '') {
  const errorMsg = "❌ SUPABASE_ANON_KEY is missing!";
  console.error(errorMsg);
  toast.error(errorMsg);
  throw new Error("SUPABASE_ANON_KEY is required");
}

console.log("=".repeat(80));
console.log("🚀 Lead Pusher Script - Starting");
console.log("=".repeat(80));
console.log(`📍 URL: ${FULL_URL}`);
console.log(`📊 Total Leads: ${TOTAL_LEADS}`);
console.log(`🔑 Token Preview: ${ACCESS_TOKEN.substring(0, 20)}...${ACCESS_TOKEN.substring(ACCESS_TOKEN.length - 4)}`);
console.log(`🏢 Tenant ID: ${TENANT_ID}`);
console.log("=".repeat(80));

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a random lead payload
 */
function generateRandomLead() {
  const randomPrajaId = String(Math.floor(Math.random() * 9000000) + 1000000);
  
  const firstNames = [
    "Rajagopalam", "Anand", "Sanjay", "Meena", "Priya", "Vikram", 
    "Quincy", "Chaitanya", "Udyati", "Vedika", "Jack", "Rahul",
    "Sneha", "Arjun", "Kavya", "Rohan", "Divya", "Aryan"
  ];
  
  const lastNames = [
    "Pinninti", "Reddy", "Sharma", "Kaur", "Jain", "Verma", 
    "Khatri", "Chhabra", "Bedi", "Mitra", "Mahajan", "Patel",
    "Singh", "Kumar", "Gupta", "Shah", "Mehta", "Desai"
  ];
  
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const fullName = `${firstName} ${lastName}`;
  
  // Generate random phone number (Indian format)
  const prefix = [7, 8, 9][Math.floor(Math.random() * 3)];
  const phoneSuffix = Math.floor(Math.random() * 900000000) + 100000000;
  const phoneNumber = `+91${prefix}${phoneSuffix}`;
  const phoneNoClean = phoneNumber.replace('+', '');
  
  // Generate random lead score (30-95)
  const leadScore = parseFloat((Math.random() * 65 + 30).toFixed(2));
  
  // Generate random user slug
  const userSlug = Array.from({length: 7}, () => 
    'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]
  ).join('');
  
  // Random affiliated party
  const parties = ["BJP", "INC", "AAP", "Congress", "Independent", "TMC", "BSP"];
  const affiliatedParty = parties[Math.floor(Math.random() * parties.length)];
  
  return {
    name: fullName,
    data: {
      praja_id: randomPrajaId,
      name: fullName,
      tasks: [
        {"task": "Sending a Demo", "status": "Yes"},
        {"task": "App Installation", "status": "Yes"},
        {"task": "Create/Update Layout", "status": "Null"},
        {"task": "Layout Feedback", "status": "Null"},
        {"task": "Trial Subscription", "status": "Null"},
        {"task": "Premium Poster/ Video Poster Share", "status": "Null"}
      ],
      lead_score: leadScore,
      phone_number: phoneNumber,
      whatsapp_link: `https://wa.me/${phoneNoClean}`,
      affiliated_party: affiliatedParty,
      user_profile_link: `https://www.thecircleapp.in/admin/users/${userSlug}`,
      display_pic_url: "https://a-cdn.thecircleapp.in/capture/01K4QKP9EAD7SBB794NBY1MQ94.png",
    }
  };
}

/**
 * Push a single lead to the database
 */
async function pushLead(index) {
  const payload = generateRandomLead();
  const leadName = payload.name;
  
  // Essential headers for the API request
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${ACCESS_TOKEN}`,
    "apikey": SUPABASE_ANON_KEY,
    "Accept": "application/json",
    "X-Tenant-Slug": TENANT_ID,  // Using X-Tenant-Slug header (as per your CORS config)
  };
  
  console.log(`\n[${index + 1}/${TOTAL_LEADS}] Pushing lead: ${leadName}`);
  console.log(`   Praja ID: ${payload.data.praja_id}`);
  console.log(`   Phone: ${payload.data.phone_number}`);
  console.log(`   Lead Score: ${payload.data.lead_score}`);
  
  try {
    const response = await fetch(FULL_URL, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload),
      mode: 'cors',           // Explicitly set CORS mode
      credentials: 'omit',     // Don't send credentials to avoid CORS issues
      cache: 'no-cache',
    });
    
    const responseText = await response.text();
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = responseText;
    }
    
    if (response.ok) {
      console.log(`   ✅ Success (${response.status}): Lead created`);
      console.log(`   Lead ID: ${responseData.id || 'N/A'}`);
      toast.success(`Lead ${index + 1}: ${leadName}`, { duration: 2000 });
      return { 
        success: true, 
        status: response.status, 
        leadName: leadName,
        data: responseData 
      };
    } else {
      console.error(`   ❌ Failed (${response.status}): ${typeof responseData === 'string' ? responseData : JSON.stringify(responseData)}`);
      toast.error(`Lead ${index + 1} failed: ${response.status}`, { duration: 3000 });
      return { 
        success: false, 
        status: response.status, 
        leadName: leadName,
        error: responseData 
      };
    }
  } catch (error) {
    console.error(`   ❌ Error: ${error.name}: ${error.message}`);
    if (error.message.includes('Failed to fetch') || error.message.includes('CORS')) {
      console.error(`   💡 CORS Error: Check that CORS is properly configured on the server`);
      console.error(`   💡 Make sure BASE_URL is correct: ${BASE_URL}`);
    }
    toast.error(`Error: ${error.message}`, { duration: 4000 });
    return { 
      success: false, 
      leadName: leadName,
      error: error.message 
    };
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

console.log("\n📝 Starting to push leads...\n");

const results = [];
const delayBetweenRequests = 200; // 200ms delay between requests

for (let i = 0; i < TOTAL_LEADS; i++) {
  const result = await pushLead(i);
  results.push(result);
  
  // Small delay between requests to avoid overwhelming the server
  if (i < TOTAL_LEADS - 1) {
    await new Promise(resolve => setTimeout(resolve, delayBetweenRequests));
  }
}

// ============================================================================
// SUMMARY
// ============================================================================

const successCount = results.filter(r => r.success).length;
const failCount = results.filter(r => !r.success).length;
const successLeads = results.filter(r => r.success).map(r => r.leadName);
const failedLeads = results.filter(r => !r.success).map(r => r.leadName);

console.log("\n" + "=".repeat(80));
console.log("📊 SUMMARY");
console.log("=".repeat(80));
console.log(`✅ Successful: ${successCount}/${TOTAL_LEADS}`);
console.log(`❌ Failed: ${failCount}/${TOTAL_LEADS}`);

if (successLeads.length > 0) {
  console.log(`\n✅ Successful Leads:`);
  successLeads.forEach((name, idx) => console.log(`   ${idx + 1}. ${name}`));
}

if (failedLeads.length > 0) {
  console.log(`\n❌ Failed Leads:`);
  failedLeads.forEach((name, idx) => console.log(`   ${idx + 1}. ${name}`));
}

console.log("=".repeat(80));

// Final toast notification
if (successCount === TOTAL_LEADS) {
  toast.success(`🎉 All ${TOTAL_LEADS} leads pushed successfully!`, { duration: 5000 });
} else if (successCount > 0) {
  toast.warning(`⚠️ Completed: ${successCount} successful, ${failCount} failed`, { duration: 5000 });
} else {
  toast.error(`❌ All requests failed. Check console for details.`, { duration: 5000 });
}

// Return results for programmatic access
return {
  total: TOTAL_LEADS,
  successful: successCount,
  failed: failCount,
  results: results
};
