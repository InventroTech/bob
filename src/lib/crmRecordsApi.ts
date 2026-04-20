import { createApiClient } from '@/lib/api/client';

const BASE_URL = import.meta.env.VITE_RENDER_API_URL?.replace(/\/+$/, '') || '';

// Create API client for this service (matches crmLeadsApi.ts pattern)
const apiClient = createApiClient(BASE_URL);

export type CrmRecord = {
  id?: number | string;
  entity_type?: string;
  created_at?: string;
  updated_at?: string;
  data?: Record<string, unknown>;
  [k: string]: unknown;
};

function coerceListPayload(payload: unknown): any[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object') {
    const p: any = payload;
    if (Array.isArray(p.results)) return p.results;
    if (Array.isArray(p.data)) return p.data;
  }
  return [];
}

export const crmRecordsApi = {
  async listRecords(params: {
    entity_type: string;
    page_size?: number;
    page?: number;
    search?: string;
    [k: string]: string | number | boolean | undefined;
  }): Promise<CrmRecord[]> {
    const response = await apiClient.get('/crm-records/records/', { params });
    return coerceListPayload(response.data) as CrmRecord[];
  },

  async createRecord(body: { entity_type: string; data: Record<string, unknown> }): Promise<CrmRecord> {
    const response = await apiClient.post('/crm-records/records/', body);
    return (response.data?.data ?? response.data) as CrmRecord;
  },
};

