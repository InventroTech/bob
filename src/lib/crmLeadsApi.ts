
import { supabase } from '@/lib/supabase';
import { userSettingsApi } from '@/lib/userSettingsApi';

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

  /**
   * Send lead assignment event to external server via backend proxy
   * This is called when a lead is successfully assigned to a user
   */
  async sendLeadAssignmentEvent(leadData: any, userId?: string, webhookUrlOverride?: string): Promise<void> {
    try {
      // Priority: 1. Config webhook URL (from Lead Management component), 2. User settings, 3. Environment variable
      let webhookUrl: string | null = webhookUrlOverride || null;
      
      // If not provided via config, try user settings
      if (!webhookUrl) {
        try {
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          if (currentUser) {
            try {
              const webhookSetting = await userSettingsApi.get(currentUser.id, 'LEAD_ASSIGNMENT_WEBHOOK_URL');
              if (webhookSetting && webhookSetting.value) {
                webhookUrl = typeof webhookSetting.value === 'string' 
                  ? webhookSetting.value 
                  : String(webhookSetting.value);
              }
            } catch (error: any) {
              // 404 is expected if the setting doesn't exist - silently ignore
              if (!error?.message?.includes('404') && !error?.message?.includes('Not found')) {
                console.warn('[crmLeadsApi] Could not fetch webhook URL from user settings:', error);
              }
            }
          }
        } catch (error) {
          console.warn('[crmLeadsApi] Error getting user for webhook URL:', error);
        }
      }
      
      // Fallback to environment variable if not found in config or user settings
      if (!webhookUrl) {
        webhookUrl = import.meta.env.VITE_LEAD_ASSIGNMENT_WEBHOOK_URL || null;
      }
      
      // If webhook URL is not configured, silently skip
      if (!webhookUrl) {
        console.log('[crmLeadsApi] Webhook URL not configured, skipping webhook notification');
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      const { data: { user } } = await supabase.auth.getUser();

      console.log('[crmLeadsApi] Preparing to send lead assignment webhook', {
        webhook_url: webhookUrl,
        lead_id: leadData?.id,
        user_id: userId || user?.id,
      });

      if (!session?.access_token) {
        console.warn('[crmLeadsApi] No session token available for webhook request');
        return;
      }

      const baseUrl = import.meta.env.VITE_RENDER_API_URL?.replace(/\/+$/, '');
      if (!baseUrl) {
        console.warn('[crmLeadsApi] Backend API URL not configured');
        return;
      }

      // Prepare the payload with clean lead assignment data
      // Extract only essential lead attributes, avoid nested objects
      const payload = {
        event: 'lead_crm_lead_assigned',
        timestamp: new Date().toISOString(),
        lead: {
          id: leadData?.id,
          name: leadData?.name,
          phone: leadData?.phone || leadData?.phone_no || leadData?.phone_number || leadData?.data?.phone_number,
          praja_id: leadData?.praja_id,
          lead_status: leadData?.lead_status || leadData?.status || leadData?.data?.lead_stage,
          lead_score: leadData?.lead_score || leadData?.data?.lead_score,
          lead_type: leadData?.lead_type,
          assigned_to: leadData?.assigned_to || leadData?.data?.assigned_to,
          attempt_count: leadData?.attempt_count || leadData?.data?.call_attempts,
          last_call_outcome: leadData?.last_call_outcome,
          next_call_at: leadData?.next_call_at,
          do_not_call: leadData?.do_not_call,
          resolved_at: leadData?.resolved_at,
          premium_poster_count: leadData?.premium_poster_count,
          package_to_pitch: leadData?.package_to_pitch,
          last_active_date_time: leadData?.last_active_date_time,
          latest_remarks: leadData?.latest_remarks,
          lead_description: leadData?.lead_description,
          affiliated_party: leadData?.affiliated_party || leadData?.data?.affiliated_party,
          rm_dashboard: leadData?.rm_dashboard,
          user_profile_link: leadData?.user_profile_link || leadData?.data?.user_profile_link,
          whatsapp_link: leadData?.whatsapp_link || leadData?.data?.whatsapp_link,
          lead_source: leadData?.lead_source,
          created_at: leadData?.created_at,
          updated_at: leadData?.updated_at,
          display_pic_url: leadData?.display_pic_url || leadData?.data?.display_pic_url,
          lead_stage: leadData?.lead_stage || leadData?.data?.lead_stage,
          tasks: leadData?.tasks || leadData?.data?.tasks,
        },
        user: {
          id: userId || user?.id,
          email: user?.email,
        },
        assignment_time: new Date().toISOString(),
      };

      // Send webhook through backend proxy (handles CORS and forwarding)
      const proxyUrl = `${baseUrl}/crm-records/webhooks/lead-assigned/`;
      
      console.log('[crmLeadsApi] 📤 Sending lead assignment webhook', {
        proxy_url: proxyUrl,
        webhook_url: webhookUrl,
        event: payload.event,
        lead_id: payload.lead?.id,
        user_id: payload.user?.id,
        lead_name: payload.lead?.name,
      });
      
      const proxyResponse = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          webhook_url: webhookUrl,
          payload,
        }),
      });

      if (proxyResponse.ok) {
        const responseData = await proxyResponse.json().catch(() => ({}));
        console.log('[crmLeadsApi] ✅ Webhook sent successfully via backend proxy', {
          webhook_url: webhookUrl,
          event: payload.event,
          lead_id: payload.lead?.id,
          user_id: payload.user?.id,
          backend_response: responseData,
          mixpanel_note: 'Mixpanel event should be sent by backend if configured',
        });
      } else {
        const errorText = await proxyResponse.text().catch(() => 'Unknown error');
        console.warn('[crmLeadsApi] ⚠️ Backend webhook proxy returned error:', {
          webhook_url: webhookUrl,
          status: proxyResponse.status,
          statusText: proxyResponse.statusText,
          error: errorText,
        });
      }
    } catch (error) {
      // Log error but don't throw - webhook failures shouldn't break the lead assignment flow
      console.error('[crmLeadsApi] Error sending lead assignment event:', error);
    }
  },
};

