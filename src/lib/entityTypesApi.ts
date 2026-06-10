import { createApiClient } from '@/lib/api/client';

const BASE_URL = import.meta.env.VITE_RENDER_API_URL?.replace(/\/+$/, '') || '';

const apiClient = createApiClient(BASE_URL);

export type TenantEntityType = {
  entity_type: string;
  schema_json: {
    fields?: Record<string, { type?: string }>;
    [key: string]: unknown;
  };
  fields_count: number;
};

function coerceListPayload(payload: unknown): TenantEntityType[] {
  if (Array.isArray(payload)) return payload as TenantEntityType[];
  if (payload && typeof payload === 'object') {
    const p = payload as { results?: unknown; data?: unknown };
    if (Array.isArray(p.results)) return p.results as TenantEntityType[];
    if (Array.isArray(p.data)) return p.data as TenantEntityType[];
  }
  return [];
}

export const entityTypesApi = {
  async listEntityTypes(): Promise<TenantEntityType[]> {
    const response = await apiClient.get('/crm-records/entity-types/');
    return coerceListPayload(response.data);
  },
};
