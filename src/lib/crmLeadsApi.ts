import { supabase } from '@/lib/supabase';

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
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        return null;
      }

      const baseUrl = import.meta.env.VITE_RENDER_API_URL?.replace(/\/+$/, '');
      if (!baseUrl) {
        return null;
      }

      const url = `${baseUrl}/crm-records/leads/current/`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          // No lead assigned
          return null;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const leadData = await response.json();

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
    } catch (error) {
      console.error('[crmLeadsApi] Error fetching current lead:', error);
      return null;
    }
  },

  /**
   * Fetch the next available lead
   */
  async getNextLead(endpoint?: string): Promise<any | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error('Authentication required');
      }

      const baseUrl = import.meta.env.VITE_RENDER_API_URL?.replace(/\/+$/, '');
      if (!baseUrl) {
        throw new Error('API base URL not configured');
      }

      // Use configured endpoint or fallback to default
      const apiEndpoint = endpoint || '/api/leads';
      const apiUrl = `${baseUrl}${apiEndpoint}`;

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null; // No leads available
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const leadData = await response.json();

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
    } catch (error) {
      console.error('[crmLeadsApi] Error fetching next lead:', error);
      throw error;
    }
  },

  /**
   * Fetch lead statistics
   */
  async getLeadStats(statusEndpoint?: string): Promise<any> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required');
      }

      const baseUrl = import.meta.env.VITE_RENDER_API_URL?.replace(/\/+$/, '');
      if (!baseUrl) {
        throw new Error('API base URL not configured');
      }

      const endpoint = statusEndpoint || '/get-lead-status';
      const apiUrl = `${baseUrl}${endpoint}`;

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
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
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error('Authentication required');
      }

      const baseUrl = import.meta.env.VITE_RENDER_API_URL?.replace(/\/+$/, '');
      if (!baseUrl) {
        throw new Error('API base URL not configured');
      }

      const url = `${baseUrl}/crm-records/records/events/`;
      const body = {
        event: eventName,
        record_id: recordId,
        payload,
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => null);
        console.error('[crmLeadsApi] Event request failed', {
          status: response.status,
          statusText: response.statusText,
          body: text,
        });
        throw new Error(`HTTP ${response.status}`);
      }

      await response.json().catch(() => null);
      return true;
    } catch (error) {
      console.error('[crmLeadsApi] Error sending event:', error);
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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required');
      }

      const baseUrl = import.meta.env.VITE_RENDER_API_URL?.replace(/\/+$/, '');
      if (!baseUrl) {
        throw new Error('API base URL not configured');
      }

      // Build query parameters for backend filtering
      const params = new URLSearchParams({
        event: 'lead.trial_activated',
        user_supabase_uid: userSupabaseUid,
      });

      if (dateFrom) {
        params.append('timestamp__gte', dateFrom);
      }
      if (dateTo) {
        params.append('timestamp__lte', dateTo);
      }

      // Use dedicated count endpoint
      const url = `${baseUrl}/crm-records/events/count/?${params.toString()}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.count || 0;
    } catch (error) {
      console.error('[crmLeadsApi] Error fetching trial activation count:', error);
      throw error;
    }
  },
};

