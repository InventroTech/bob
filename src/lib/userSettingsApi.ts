import { supabase } from '@/lib/supabase';
import { 
  UserSettings, 
  UserSettingsCreate, 
  UserSettingsUpdate,
  LeadTypeAssignment,
  LeadTypeAssignmentRequest,
  UserLeadTypes,
  LeadTypeAssignmentResponse
} from '../types/userSettings';

const API_BASE_URL = (import.meta.env.VITE_RENDER_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/+$/, ''); // Remove trailing slashes

// User Settings API functions
export const userSettingsApi = {
  // Get all user settings for the current tenant
  async getAll(): Promise<UserSettings[]> {
    const response = await fetch(`${API_BASE_URL}/user-settings/settings/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch user settings: ${response.statusText}`);
    }

    return response.json();
  },

  // Create or update a user setting
  async createOrUpdate(data: UserSettingsCreate): Promise<UserSettings> {
    const { data: sessionData } = await supabase.auth.getSession();
    const authToken = sessionData?.session?.access_token;
    
    const response = await fetch(`${API_BASE_URL}/user-settings/settings/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authToken ? `Bearer ${authToken}` : '',
        'X-Tenant-Slug': 'bibhab-thepyro-ai'
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Failed to create/update user setting: ${response.status} - ${errorText}`);
    }

    return response.json();
  },

  // Get a specific user setting
  async get(userId: string, key: string): Promise<UserSettings> {
    const { data: sessionData } = await supabase.auth.getSession();
    const authToken = sessionData?.session?.access_token;
    
    const response = await fetch(`${API_BASE_URL}/user-settings/settings/${userId}/${key}/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authToken ? `Bearer ${authToken}` : '',
        'X-Tenant-Slug': 'bibhab-thepyro-ai'
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Failed to fetch user setting: ${response.status} - ${errorText}`);
    }

    return response.json();
  },

  // Update a specific user setting
  async update(userId: string, key: string, data: UserSettingsUpdate): Promise<UserSettings> {
    const { data: sessionData } = await supabase.auth.getSession();
    const authToken = sessionData?.session?.access_token;
    
    const response = await fetch(`${API_BASE_URL}/user-settings/settings/${userId}/${key}/`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authToken ? `Bearer ${authToken}` : '',
        'X-Tenant-Slug': 'bibhab-thepyro-ai'
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Failed to update user setting: ${response.status} - ${errorText}`);
    }

    return response.json();
  },

  // Delete a specific user setting
  async delete(userId: string, key: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/user-settings/settings/${userId}/${key}/`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to delete user setting: ${response.statusText}`);
    }
  },
};

// Lead Type Assignment API functions
export const leadTypeAssignmentApi = {
  // Get all lead type assignments for the tenant (GM only)
  async getAll(rmsEndpoint?: string): Promise<LeadTypeAssignment[]> {
    let rmUsers: any[] = [];
    
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const authToken = sessionData?.session?.access_token;
      const baseUrl = (import.meta.env.VITE_RENDER_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/+$/, ''); // Remove trailing slashes
      
      // Use the dedicated endpoint for fetching RMs
      const endpoint = rmsEndpoint || '/accounts/users/assignees-by-role/?role=RM';
      const apiUrl = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;

      console.log('Fetching RMs from API endpoint:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authToken ? `Bearer ${authToken}` : '',
          'X-Tenant-Slug': 'bibhab-thepyro-ai'
        }
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Access denied: GM role required to access lead type assignments');
        }
        // For 404, return empty array instead of throwing (no users found is not an error)
        if (response.status === 404) {
          console.warn('No users found (404), returning empty array');
          return [];
        }
        // Only throw for actual errors (5xx server errors)
        if (response.status >= 500) {
          throw new Error(`Failed to fetch users: ${response.statusText}`);
        }
        // For other 4xx errors, return empty array (don't treat as critical error)
        console.warn(`API returned ${response.status}, returning empty array`);
        return [];
      }

      const responseData = await response.json();
      
      // The endpoint returns { count: number, results: [...] }
      let usersData = [];
      if (responseData.results && Array.isArray(responseData.results)) {
        usersData = responseData.results;
      } else if (responseData.data && Array.isArray(responseData.data)) {
        usersData = responseData.data;
      } else if (Array.isArray(responseData)) {
        usersData = responseData;
      }

      // Transform API user format to match expected format
      // The endpoint already filters for RM role, so all returned users are RMs
      rmUsers = usersData.map((user: any) => ({
        id: user.id,
        name: user.name || '',
        email: user.email || '',
        role_id: user.role_id,
        uid: user.uid || user.id // Use uid if available, fallback to id
      }));

      console.log('RM users found from API:', rmUsers.length);

      // Get existing lead type assignments from backend API (regardless of users response)
      const assignmentsMap = new Map();
      try {
        const baseUrlClean = baseUrl.replace(/\/+$/, ''); // Remove trailing slashes
        const assignmentsUrl = `${baseUrlClean}/user-settings/lead-type-assignments/`;
        const assignmentsResponse = await fetch(assignmentsUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authToken ? `Bearer ${authToken}` : '',
            'X-Tenant-Slug': 'bibhab-thepyro-ai'
          }
        });

        if (assignmentsResponse.ok) {
          const assignmentsData = await assignmentsResponse.json();
          // The endpoint returns an array of assignments with user_id and lead_types
          if (Array.isArray(assignmentsData)) {
            assignmentsData.forEach((assignment: any) => {
              assignmentsMap.set(assignment.user_id, assignment.lead_types || []);
            });
          }
        } else {
          console.warn('Failed to fetch lead type assignments from API, continuing without them');
        }
      } catch (error) {
        console.error('Error fetching lead type assignments:', error);
        // Continue without assignments - they'll be empty
      }

      // Transform to LeadTypeAssignment format
      const assignments: LeadTypeAssignment[] = rmUsers.map((user: any) => {
        return {
          user_id: user.id, // Keep using the integer ID for the component
          user_name: user.name || 'Unknown',
          user_email: user.email,
          lead_types: user.uid ? assignmentsMap.get(user.uid) || [] : []
        };
      });

      return assignments;
    } catch (error: any) {
      console.error('Error in getAll:', error);
      throw error;
    }
  },

  // Assign lead types to a user (GM only)
  async assign(data: LeadTypeAssignmentRequest, endpoint?: string): Promise<LeadTypeAssignmentResponse> {
    console.log('Saving lead type assignment via API...');
    
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const authToken = sessionData?.session?.access_token;
      const baseUrl = (import.meta.env.VITE_RENDER_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/+$/, ''); // Remove trailing slashes
      const assignmentsEndpoint = endpoint || '/user-settings/lead-type-assignments/';
      const assignmentsUrl = `${baseUrl}${assignmentsEndpoint}`;

      const response = await fetch(assignmentsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authToken ? `Bearer ${authToken}` : '',
          'X-Tenant-Slug': 'bibhab-thepyro-ai'
        },
        body: JSON.stringify({
          user_id: data.user_id,
          lead_types: data.lead_types,
          assigned_leads_count: data.assigned_leads_count // Include count if provided
        })
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Access denied: GM role required to assign lead types');
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to save lead type assignment: ${errorData.error || response.statusText}`);
      }

      const result = await response.json();
      console.log('Lead type assignment saved successfully:', result);

      return {
        user_id: result.user_id || data.user_id,
        user_name: result.user_name || 'Unknown',
        lead_types: result.lead_types || data.lead_types,
        created: result.created || false
      };
    } catch (error: any) {
      console.error('Error in assign:', error);
      throw error;
    }
  },

  // Get lead types assigned to a specific user
  async getUserLeadTypes(userId: string): Promise<UserLeadTypes> {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const authToken = sessionData?.session?.access_token;
      const baseUrl = (import.meta.env.VITE_RENDER_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/+$/, ''); // Remove trailing slashes
      const userLeadTypesUrl = `${baseUrl}/user-settings/users/${userId}/lead-types/`;

      const response = await fetch(userLeadTypesUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authToken ? `Bearer ${authToken}` : '',
          'X-Tenant-Slug': 'bibhab-thepyro-ai'
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          // User has no lead types assigned - return empty array
          return {
            user_id: userId,
            lead_types: []
          };
        }
        throw new Error(`Failed to fetch lead types: ${response.statusText}`);
      }

      const result = await response.json();
      return {
        user_id: result.user_id || userId,
        lead_types: result.lead_types || []
      };
    } catch (error: any) {
      console.error('Error in getUserLeadTypes:', error);
      throw error;
    }
  },

  // Get available lead types from records' poster field
  async getAvailableLeadTypes(endpoint?: string): Promise<string[]> {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const authToken = sessionData?.session?.access_token;
      const baseUrl = (import.meta.env.VITE_RENDER_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/+$/, ''); // Remove trailing slashes
      
      // Use the dedicated lead types endpoint if no custom endpoint is provided
      const leadTypesEndpoint = endpoint || '/user-settings/lead-types/';
      const apiUrl = `${baseUrl}${leadTypesEndpoint}`;

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authToken ? `Bearer ${authToken}` : '',
          'X-Tenant-Slug': 'bibhab-thepyro-ai'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch lead types: ${response.statusText}`);
      }

      const responseData = await response.json();
      
      // The endpoint returns { "lead_types": [...] }
      if (responseData.lead_types && Array.isArray(responseData.lead_types)) {
        return responseData.lead_types;
      }
      
      // Fallback: return empty array if format is unexpected
      return [];
    } catch (error: any) {
      console.error('Error fetching available lead types:', error);
      // Return empty array on error
      return [];
    }
  },
};
