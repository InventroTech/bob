import { createApiClient } from '@/lib/api/client';
import { 
  UserSettings, 
  UserSettingsCreate, 
  UserSettingsUpdate,
  LeadTypeAssignment,
  LeadTypeAssignmentRequest,
  UserLeadTypes,
  LeadTypeAssignmentResponse,
  RoutingRule,
  RoutingRuleUpsertPayload,
} from '../types/userSettings';

const API_BASE_URL = (import.meta.env.VITE_RENDER_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/+$/, '');

// Create API client for this service
const apiClient = createApiClient(API_BASE_URL);

// User Settings API functions
export const userSettingsApi = {
  // Get all user settings for the current tenant
  async getAll(): Promise<UserSettings[]> {
    const response = await apiClient.get('/user-settings/settings/');
    return response.data;
  },

  // Create or update a user setting
  async createOrUpdate(data: UserSettingsCreate): Promise<UserSettings> {
    try {
      const response = await apiClient.post('/user-settings/settings/', data);
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to create/update user setting: ${error.response?.status} - ${error.response?.data || error.message}`);
    }
  },

  // Get a specific user setting
  async get(userId: string, key: string): Promise<UserSettings> {
    try {
      const response = await apiClient.get(`/user-settings/settings/${userId}/${key}/`);
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to fetch user setting: ${error.response?.status} - ${error.response?.data || error.message}`);
    }
  },

  // Update a specific user setting
  async update(userId: string, key: string, data: UserSettingsUpdate): Promise<UserSettings> {
    try {
      const response = await apiClient.put(`/user-settings/settings/${userId}/${key}/`, data);
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to update user setting: ${error.response?.status} - ${error.response?.data || error.message}`);
    }
  },

  // Delete a specific user setting
  async delete(userId: string, key: string): Promise<void> {
    try {
      await apiClient.delete(`/user-settings/settings/${userId}/${key}/`);
    } catch (error: any) {
      throw new Error(`Failed to delete user setting: ${error.response?.statusText || error.message}`);
    }
  },
};

// Lead Type Assignment API functions
export const leadTypeAssignmentApi = {
  // Get all lead type assignments for the tenant (GM only)
  async getAll(rmsEndpoint?: string): Promise<LeadTypeAssignment[]> {
    let rmUsers: any[] = [];
    
    try {
      // Use the dedicated endpoint for fetching RMs
      const endpoint = rmsEndpoint || '/accounts/users/assignees-by-role/?role=RM';
      console.log('Fetching RMs from API endpoint:', endpoint);

      const response = await apiClient.get(endpoint);
      const responseData = response.data;

      // The endpoint returns { count: number, results: [...] } format
      // Response structure: { count: 3, results: [{ id, name, email, company_name, uid }] }
      rmUsers = responseData.results || [];

      console.log(`Successfully fetched ${rmUsers.length} RM users from API`);
    } catch (error: any) {
      if (error.response?.status === 403) {
        throw new Error('Access denied: GM role required to access lead type assignments');
      }
      // For 404, return empty array instead of throwing (no users found is not an error)
      if (error.response?.status === 404) {
        console.log('No RMs found (404), returning empty array');
        return [];
      }
      console.error('Error fetching RMs:', error);
      throw error;
    }

    // If no RMs found, return empty array
    if (!rmUsers || rmUsers.length === 0) {
      console.log('No RM users found, returning empty array');
      return [];
    }

    // Get existing lead type assignments from backend API
    // Map by user_id (UUID) -> assignment payload (lead_types + daily_target + daily_limit)
    const assignmentsMap = new Map<string, { lead_types: string[]; daily_target?: number; daily_limit?: number }>();
    
    try {
      const assignmentsResponse = await apiClient.get('/user-settings/lead-type-assignments/');
      const assignmentsData = assignmentsResponse.data;
      // The endpoint returns an array of assignments with user_id and lead_types (+ daily_target, daily_limit)
      if (Array.isArray(assignmentsData)) {
        assignmentsData.forEach((assignment: any) => {
          assignmentsMap.set(String(assignment.user_id), {
            lead_types: assignment.lead_types || [],
            daily_target: assignment.daily_target,
            daily_limit: assignment.daily_limit
          });
        });
      }
    } catch (error) {
      console.error('Error fetching lead type assignments:', error);
      // Continue without assignments - they'll be empty
    }

    // Transform to LeadTypeAssignment format
    const assignments: LeadTypeAssignment[] = rmUsers.map((user: any) => {
      const userUid = user.uid ? String(user.uid) : '';
      const assignmentRecord = userUid ? assignmentsMap.get(userUid) : undefined;
      return {
        user_id: user.id, // Keep using the integer ID for the component
        user_name: user.name || 'Unknown',
        user_email: user.email,
        lead_types: assignmentRecord?.lead_types || [],
        daily_target: assignmentRecord?.daily_target,
        daily_limit: assignmentRecord?.daily_limit
      };
    });

    return assignments;
  },

  // Assign lead types to a user (GM only)
  async assign(data: LeadTypeAssignmentRequest, endpoint?: string): Promise<LeadTypeAssignmentResponse> {
    console.log('Saving lead type assignment via API...');
    
    try {
      const assignmentsEndpoint = endpoint || '/user-settings/lead-type-assignments/';

      const response = await apiClient.post(assignmentsEndpoint, {
        user_id: data.user_id,
        lead_types: data.lead_types,
        daily_target: data.daily_target,
        daily_limit: data.daily_limit
      });

      const result = response.data;
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
      const response = await apiClient.get(`/user-settings/users/${userId}/lead-types/`);
      const result = response.data;
      
      return {
        user_id: result.user_id || userId,
        lead_types: result.lead_types || []
      };
    } catch (error: any) {
      // If 404, user has no lead types assigned
      if (error.response?.status === 404) {
        return {
          user_id: userId,
          lead_types: []
        };
      }
      console.error('Error in getUserLeadTypes:', error);
      throw error;
    }
  },

  // Get available lead types from records' affiliated_party field
  async getAvailableLeadTypes(endpoint?: string): Promise<string[]> {
    try {
      // Use the dedicated lead types endpoint if no custom endpoint is provided
      const leadTypesEndpoint = endpoint || '/user-settings/lead-types/';
      
      const response = await apiClient.get(leadTypesEndpoint);
      const responseData = response.data;
      
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

// Routing rules API functions
export const routingRulesApi = {
  // Get all routing rules for the current tenant
  async getAll(): Promise<RoutingRule[]> {
    try {
      const response = await apiClient.get('/user-settings/routing-rules/');
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to fetch routing rules: ${error.response?.status} - ${error.response?.data || error.message}`);
    }
  },

  // Create or update a routing rule for a user + queue_type
  async upsert(payload: RoutingRuleUpsertPayload): Promise<RoutingRule> {
    try {
      const response = await apiClient.post('/user-settings/routing-rules/', payload);
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to save routing rule: ${error.response?.status} - ${error.response?.data || error.message}`);
    }
  },

  // Delete a routing rule by id
  async delete(id: number): Promise<void> {
    try {
      await apiClient.delete(`/user-settings/routing-rules/${id}/`);
    } catch (error: any) {
      throw new Error(`Failed to delete routing rule: ${error.response?.status} - ${error.response?.data || error.message}`);
    }
  },
};

