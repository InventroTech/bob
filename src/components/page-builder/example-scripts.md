# Example Scripts for Operations & Programs

## Push Dummy Leads Script

This script pushes random dummy leads to your database using your backend API.

### Setup Instructions:

1. **Script Type**: Select "JavaScript"
2. **Request Method**: POST
3. **API Endpoint**: Leave empty (script handles it internally)
4. **Bearer Token Source**: Select "From Login Session" (or leave as None - script will use session token automatically)
5. **Environment Variables**: Add as JSON:
   ```json
   {
     "BASE_URL": "http://localhost:8000",
     "TOTAL_LEADS": "10",
     "TENANT_ID": "e35e7279-d92d-4cdf-8014-98deaab639c0"
   }
   ```
   
   **Note**: 
   - `ACCESS_TOKEN` and `SUPABASE_ANON_KEY` are automatically provided if you select "From Login Session" as Bearer Token Source
   - `BASE_URL` should point to your backend (localhost:8000 for local development, or your production backend URL)
   
6. **Script**: Copy and paste the contents of `src/components/page-builder/scripts/pushDummyLeads.js` into the Script Code field

### Quick Copy:

The script is available at: `src/components/page-builder/scripts/pushDummyLeads.js`

You can open that file and copy its entire contents to paste into the Script Code field in the Operations & Programs page.
