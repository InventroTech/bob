/**
 * Routing Rules API Service
 * Handles all routing rules-related API calls
 * Uses the central apiClient for automatic auth and tenant handling
 */

import { apiClient } from '../client';
import type { RoutingRule, RoutingRuleUpsertPayload } from '@/types/userSettings';

export interface RoutingRulesResponse {
  results?: RoutingRule[];
  data?: RoutingRule[];
  // Direct array response is also supported
}

/**
 * Routing Rules API Service
 */
export const routingRulesService = {
  /**
   * Get all routing rules for the current tenant
   * @returns Promise with array of routing rules
   */
  async getAll(): Promise<RoutingRule[]> {
    try {
      const response = await apiClient.get<RoutingRulesResponse | RoutingRule[]>('/user-settings/routing-rules/');
      
      const responseData = response.data;
      
      // Handle different response formats
      if (Array.isArray(responseData)) {
        return responseData;
      }
      
      if (responseData && typeof responseData === 'object') {
        // Handle { results: [...] } format
        if ('results' in responseData && Array.isArray(responseData.results)) {
          return responseData.results;
        }
        // Handle { data: [...] } format
        if ('data' in responseData && Array.isArray(responseData.data)) {
          return responseData.data;
        }
      }
      
      return [];
    } catch (error: any) {
      console.error('Error fetching routing rules:', error);
      throw error;
    }
  },

  /**
   * Create or update a routing rule for a user + queue_type
   * @param payload - The routing rule data to upsert
   * @returns Promise with the created/updated routing rule
   */
  async upsert(payload: RoutingRuleUpsertPayload): Promise<RoutingRule> {
    try {
      const response = await apiClient.post<RoutingRule | { data: RoutingRule }>('/user-settings/routing-rules/', payload);
      
      const responseData = response.data;
      
      // Handle different response formats
      if (responseData && typeof responseData === 'object') {
        // Handle { data: {...} } format
        if ('data' in responseData && responseData.data) {
          return responseData.data as RoutingRule;
        }
        // Handle direct rule object (has id field)
        if ('id' in responseData) {
          return responseData as RoutingRule;
        }
      }
      
      throw new Error('Unexpected response format from upsert routing rule endpoint');
    } catch (error: any) {
      console.error('Error upserting routing rule:', error);
      throw error;
    }
  },

  /**
   * Delete a routing rule by id
   * @param id - The ID of the routing rule to delete
   * @returns Promise that resolves when the rule is deleted
   */
  async delete(id: number): Promise<void> {
    try {
      await apiClient.delete(`/user-settings/routing-rules/${id}/`);
    } catch (error: any) {
      console.error('Error deleting routing rule:', error);
      throw error;
    }
  },
};



