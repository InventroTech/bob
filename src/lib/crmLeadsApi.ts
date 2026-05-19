
import { supabase } from '@/lib/supabase';

import { createApiClient } from '@/lib/api/client';
import { formatClientErrorDetail, isExpectedAuthWall } from '@/lib/api/errors';

const BASE_URL = import.meta.env.VITE_RENDER_API_URL?.replace(/\/+$/, '') || '';

// Create API client for this service
const apiClient = createApiClient(BASE_URL);

function coerceRecordsListPayload(payload: unknown): any[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload as any[];
  if (typeof payload === 'object' && payload !== null) {
    const p = payload as Record<string, unknown>;
    const results = Array.isArray(p.results) ? p.results : null;
    if (results?.length) return results as any[];
    const dataArr = Array.isArray(p.data) ? (p.data as unknown[]) : null;
    if (dataArr?.length) return dataArr as any[];
    const nested =
      typeof p.payload === 'object' && p.payload !== null
        ? (p.payload as Record<string, unknown>)
        : null;
    const nestedData = nested && Array.isArray(nested.data) ? nested.data : null;
    if (nestedData?.length) return nestedData as any[];
  }
  return [];
}

export type RecallPreviewLead = {
  id: number;
  name: string;
  /** ISO8601 when recall is scheduled, if present */
  nextCallAtIso: string | null;
};

function extractRecallRow(rec: unknown): RecallPreviewLead | null {
  if (!rec || typeof rec !== 'object') return null;
  const row = rec as Record<string, unknown>;

  let idNum = NaN;
  if (typeof row.id === 'number') idNum = row.id;
  else if (typeof row.lead_id === 'number') idNum = row.lead_id;
  else if (typeof row.id === 'string' && row.id.trim() !== '') {
    const parsed = Number(row.id);
    if (Number.isFinite(parsed)) idNum = parsed;
  }

  const dataLayer =
    typeof row.data === 'object' && row.data !== null
      ? (row.data as Record<string, unknown>)
      : row;

  const rawName =
    typeof dataLayer.name === 'string' && dataLayer.name.trim()
      ? dataLayer.name.trim()
      : typeof row.name === 'string' && (row.name as string).trim()
        ? (row.name as string).trim()
        : '';

  const nextCandidates = [
    dataLayer.next_call_at,
    row.next_call_at,
    row.recall_time,
    dataLayer.recall_time,
  ];
  let nextCallAtIso: string | null = null;
  for (const c of nextCandidates) {
    if (typeof c === 'string' && c.trim()) {
      nextCallAtIso = c.trim();
      break;
    }
  }

  if (!Number.isFinite(idNum)) return null;

  return {
    id: idNum,
    name: rawName || 'Unknown lead',
    nextCallAtIso,
  };
}

function pickEarliestRecall(rows: RecallPreviewLead[]): RecallPreviewLead | null {
  if (!rows.length) return null;
  const withTs = rows.filter((r) => r.nextCallAtIso);
  if (!withTs.length) return rows[0];
  const sorted = [...withTs].sort(
    (a, b) => new Date(a.nextCallAtIso!).getTime() - new Date(b.nextCallAtIso!).getTime()
  );
  return sorted[0];
}

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
    } catch (error: unknown) {
      const err = error as { response?: { status?: number } };
      if (err.response?.status === 404) {
        return null;
      }
      if (isExpectedAuthWall(error)) {
        return null;
      }
      console.error('[crmLeadsApi] Error fetching current lead:', formatClientErrorDetail(error));
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
    } catch (error: unknown) {
      const err = error as { response?: { status?: number } };
      if (err.response?.status === 404) {
        return null;
      }
      if (isExpectedAuthWall(error)) {
        return null;
      }
      console.error('[crmLeadsApi] Error fetching next lead:', formatClientErrorDetail(error));
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
        record_id: Number(recordId),
        payload,
      };

      console.log('[crmLeadsApi] Sending event request:', { url: '/crm-records/records/events/', body });
      const response = await apiClient.post('/crm-records/records/events/', body);
      console.log('[crmLeadsApi] Event request successful:', response.status, response.data);
      return true;
    } catch (error: unknown) {
      if (isExpectedAuthWall(error)) {
        // Stale session / no tenant permission — do not throw or console.error (Sentry noise)
        console.warn(`[crmLeadsApi] Event not sent (session/permission): ${formatClientErrorDetail(error)}`);
        return false;
      }
      console.error(`[crmLeadsApi] Event request failed: ${formatClientErrorDetail(error)}`);
      throw error;
    }
  },

  /**
   * Fetch a specific lead/record by ID
   */
  async getLeadById(recordId: number): Promise<any | null> {
    try {
      const response = await apiClient.get(`/crm-records/records/${recordId}/`);
      const leadData = response.data;

      if (!leadData) {
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

      return processedLead;
    } catch (error: unknown) {
      const err = error as { response?: { status?: number } };
      if (err.response?.status === 404) {
        return null;
      }
      if (isExpectedAuthWall(error)) {
        return null;
      }
      console.error('[crmLeadsApi] Error fetching lead by ID:', formatClientErrorDetail(error));
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
    } catch (error: unknown) {
      if (isExpectedAuthWall(error)) {
        return 0;
      }
      console.error('[crmLeadsApi] Error fetching trial activation count:', formatClientErrorDetail(error));
      throw error;
    }
  },

  /**
   * Count CRM events for a user in a date range (e.g. lead.not_interested, lead.trial_activated).
   */
  async getLeadEventCount(
    userSupabaseUid: string,
    event: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<number> {
    try {
      const params: Record<string, string> = {
        event,
        user_supabase_uid: userSupabaseUid,
      };
      if (dateFrom) params.timestamp__gte = dateFrom;
      if (dateTo) params.timestamp__lte = dateTo;

      const response = await apiClient.get('/crm-records/events/count/', { params });

      return response.data.count ?? 0;
    } catch (error: unknown) {
      if (isExpectedAuthWall(error)) {
        return 0;
      }
      console.error('[crmLeadsApi] Error fetching event count:', formatClientErrorDetail(error));
      throw error;
    }
  },

  /**
   * Earliest-scheduled recall among leads assigned to the user with the given CRM stage (e.g. CALL_NOT_CONNECTED, SNOOZED).
   */
  async getRecallPreviewForAssignee(
    assigneeSupabaseUid: string,
    leadStage: 'CALL_NOT_CONNECTED' | 'SNOOZED',
    opts?: { pageSize?: number }
  ): Promise<RecallPreviewLead | null> {
    try {
      const response = await apiClient.get('/crm-records/records/', {
        params: {
          entity_type: 'lead',
          assigned_to: assigneeSupabaseUid,
          lead_stage: leadStage,
          page: 1,
          page_size: opts?.pageSize ?? 80,
        },
      });

      const flat = coerceRecordsListPayload(response.data);

      const rows: RecallPreviewLead[] = [];
      for (const item of flat) {
        const r = extractRecallRow(item);
        if (r) rows.push(r);
      }

      return pickEarliestRecall(rows);
    } catch (error: unknown) {
      if (isExpectedAuthWall(error)) {
        return null;
      }
      console.error('[crmLeadsApi] Error fetching recall preview:', formatClientErrorDetail(error));
      throw error;
    }
  },

};

