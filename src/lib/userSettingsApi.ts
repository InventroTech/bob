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
  // Get all lead type assignments for the tenant
  async getAll(rmsEndpoint?: string): Promise<LeadTypeAssignment[]> {
    try {
      // Use the lead-type-assignments endpoint directly (returns TenantMembership-based data)
      const assignmentsResponse = await apiClient.get('/user-settings/lead-type-assignments/');
      const assignmentsData = assignmentsResponse.data;
      
      // The endpoint returns an array of assignments with TenantMembership IDs
      if (Array.isArray(assignmentsData)) {
        return assignmentsData.map((assignment: any) => ({
          user_id: String(assignment.user_id || assignment.tenant_membership_id), // Use TenantMembership ID
          user_name: assignment.user_name || 'Unknown',
          user_email: assignment.user_email || '',
          tenant_membership_id: assignment.tenant_membership_id || assignment.user_id,
          lead_types: assignment.lead_types || [],
          lead_sources: assignment.lead_sources || [],
          lead_statuses: assignment.lead_statuses || [],
          daily_target: assignment.daily_target,
          daily_limit: assignment.daily_limit,
          assigned_leads_count: assignment.assigned_leads_count || 0
        }));
      }
      
      return [];
    } catch (error: any) {
      if (error.response?.status === 403) {
        throw new Error('Access denied');
      }
      // For 404, return empty array instead of throwing (no users found is not an error)
      if (error.response?.status === 404) {
        console.log('No assignments found (404), returning empty array');
        return [];
      }
      console.error('Error fetching lead type assignments:', error);
      throw error;
    }
  },

  // Assign lead types to a user
  async assign(data: LeadTypeAssignmentRequest, endpoint?: string): Promise<LeadTypeAssignmentResponse> {
    console.log('Saving lead type assignment via API...');
    
    try {
      const assignmentsEndpoint = endpoint || '/user-settings/lead-type-assignments/';

      const response = await apiClient.post(assignmentsEndpoint, {
        user_id: data.user_id,
        lead_types: data.lead_types,
        lead_sources: data.lead_sources ?? [],
        lead_statuses: data.lead_statuses ?? [],
        daily_target: data.daily_target,
        daily_limit: data.daily_limit
      });

      const result = response.data;
      console.log('Lead type assignment saved successfully:', result);

      return {
        user_id: result.user_id || data.user_id,
        user_name: result.user_name || 'Unknown',
        user_email: result.user_email || '',
        lead_types: result.lead_types || data.lead_types,
        lead_sources: result.lead_sources ?? data.lead_sources ?? [],
        lead_statuses: result.lead_statuses ?? data.lead_statuses ?? [],
        daily_target: result.daily_target,
        daily_limit: result.daily_limit,
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

  // Get available lead sources from records' lead_source field
  async getAvailableLeadSources(endpoint?: string): Promise<string[]> {
    try {
      const leadSourcesEndpoint = endpoint || '/user-settings/lead-sources/';
      const response = await apiClient.get(leadSourcesEndpoint);
      const responseData = response.data;
      if (responseData.lead_sources && Array.isArray(responseData.lead_sources)) {
        return responseData.lead_sources;
      }
      return [];
    } catch (error: any) {
      console.error('Error fetching available lead sources:', error);
      return [];
    }
  },

  // Get available lead statuses from records' lead_stage field
  async getAvailableLeadStatuses(endpoint?: string): Promise<string[]> {
    try {
      const leadStatusesEndpoint = endpoint || '/user-settings/lead-statuses/';
      const response = await apiClient.get(leadStatusesEndpoint);
      const responseData = response.data;
      if (responseData.lead_statuses && Array.isArray(responseData.lead_statuses)) {
        return responseData.lead_statuses;
      }
      return [];
    } catch (error: any) {
      console.error('Error fetching available lead statuses:', error);
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

