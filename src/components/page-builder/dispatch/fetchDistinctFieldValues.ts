import { apiClient } from '@/lib/api/client';

function parseDistinctValues(payload: unknown): string[] {
  if (Array.isArray(payload)) {
    return payload.map((v) => String(v ?? '').trim()).filter(Boolean);
  }
  if (payload && typeof payload === 'object') {
    const p = payload as { values?: unknown; results?: unknown; data?: unknown };
    if (Array.isArray(p.values)) {
      return p.values.map((v) => String(v ?? '').trim()).filter(Boolean);
    }
    if (Array.isArray(p.results)) {
      return p.results.map((v) => String(v ?? '').trim()).filter(Boolean);
    }
    if (Array.isArray(p.data)) {
      return p.data.map((v) => String(v ?? '').trim()).filter(Boolean);
    }
  }
  return [];
}

export async function fetchDistinctFieldValues(
  entityType: string,
  field: string
): Promise<string[]> {
  const params = new URLSearchParams({
    entity_type: entityType,
    field,
  });
  const res = await apiClient.get(`/crm-records/records/distinct-values/?${params.toString()}`);
  const values = parseDistinctValues(res.data);
  return values.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}
