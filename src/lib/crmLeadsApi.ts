
import { supabase } from '@/lib/supabase';

import { createApiClient } from '@/lib/api/client';

const BASE_URL = import.meta.env.VITE_RENDER_API_URL?.replace(/\/+$/, '') || '';

// Create API client for this service
const apiClient = createApiClient(BASE_URL);

/**
 * Centralized API service for CRM Leads
 * Handles all lead-related API calls
 */
export const crmLeadsApi = {
  /**
   * Fetch the current assigned lead for the authenticated user
   */
  async getCurrentLead(): Promise<any | null> {
    try {
      const response = await apiClient.get('/crm-records/leads/current/');
      const leadData = response.data;

      // Backend returns empty object {} with 200 status when no lead is found
      if (!leadData || (typeof leadData === 'object' && !Array.isArray(leadData) && Object.keys(leadData).length === 0)) {
        return null;
      }

      // Backend returns empty object {} with 200 status when no lead is found
      if (!leadData || (typeof leadData === 'object' && !Array.isArray(leadData) && Object.keys(leadData).length === 0)) {
        return null;
      }

      // Handle nested data structures
      let processedLead = leadData;
      if (leadData?.data && typeof leadData.data === 'object') {
        processedLead = { ...leadData, ...leadData.data };
        if (leadData.data.name && !processedLead.name) {
          processedLead.name = leadData.data.name;
        }
      }
      if (leadData?.lead && typeof leadData.lead === 'object') {
        processedLead = { ...leadData, ...leadData.lead };
      }

      return processedLead;
    } catch (error: any) {
      // 404 means no lead assigned
      if (error.response?.status === 404) {
        return null;
      }
      console.error('[crmLeadsApi] Error fetching current lead:', error);
      return null;
    }
  },

  /**
   * Fetch the next available lead
   */
  async getNextLead(endpoint?: string): Promise<any | null> {
    try {
      // Use configured endpoint or fallback to default
      const apiEndpoint = endpoint || '/api/leads';
      
      const response = await apiClient.get(apiEndpoint);
      const leadData = response.data;

      // Backend returns empty object {} with 200 status when no lead is found
      if (!leadData || (typeof leadData === 'object' && !Array.isArray(leadData) && Object.keys(leadData).length === 0)) {
        return null;
      }

      // Backend returns empty object {} with 200 status when no lead is found
      if (!leadData || (typeof leadData === 'object' && !Array.isArray(leadData) && Object.keys(leadData).length === 0)) {
        return null;
      }

      // Handle nested data structures (same as getCurrentLead)
      let processedLead = leadData;
      if (leadData?.data && typeof leadData.data === 'object') {
        processedLead = { ...leadData, ...leadData.data };
        if (leadData.data.name && !processedLead.name) {
          processedLead.name = leadData.data.name;
        }
      }
      if (leadData?.lead && typeof leadData.lead === 'object') {
        processedLead = { ...leadData, ...leadData.lead };
      }

      return processedLead;
    } catch (error: any) {
      // 404 means no leads available
      if (error.response?.status === 404) {
        return null;
      }
      console.error('[crmLeadsApi] Error fetching next lead:', error);
      throw error;
    }
  },

  /**
   * Fetch lead statistics
   */
  async getLeadStats(statusEndpoint?: string): Promise<any> {
    try {
      const endpoint = statusEndpoint || '/get-lead-status';
      const response = await apiClient.get(endpoint);
      
      return response.data;
    } catch (error) {
      console.error('[crmLeadsApi] Error fetching lead statistics:', error);
      throw error;
    }
  },

  /**
   * Send a lead event
   */
  async sendLeadEvent(
    eventName: string,
    recordId: number,
    payload: Record<string, any>
  ): Promise<boolean> {
    try {
      const body = {
        event: eventName,
        record_id: recordId,
        payload,
      };

      await apiClient.post('/crm-records/records/events/', body);
      return true;
    } catch (error: any) {
      console.error('[crmLeadsApi] Event request failed', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
      });
      throw error;
    }
  },

  /**
   * Get count of trial activations for a user within a date range
   * Uses dedicated count endpoint for efficient querying
   */
  async getTrialActivationCount(
    userSupabaseUid: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<number> {
    try {
      // Build query parameters for backend filtering
      const params: Record<string, string> = {
        event: 'lead.trial_activated',
        user_supabase_uid: userSupabaseUid,
      };

      if (dateFrom) {
        params.timestamp__gte = dateFrom;
      }
      if (dateTo) {
        params.timestamp__lte = dateTo;
      }

      const response = await apiClient.get('/crm-records/events/count/', {
        params
      });

      return response.data.count || 0;
    } catch (error) {
      console.error('[crmLeadsApi] Error fetching trial activation count:', error);
      throw error;
    }
  },

};

