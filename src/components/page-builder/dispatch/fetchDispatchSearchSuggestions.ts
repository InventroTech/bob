import type { AxiosInstance } from 'axios';
import type { CrmRecord } from '@/lib/crmRecordsApi';
import { getRecordData } from './formatDispatchValue';

export type DispatchSearchSuggestion = {
  id: string;
  value: string;
  field: string;
  fieldLabel: string;
};

const FIELD_LABELS: Record<string, string> = {
  account_name: 'Account',
  dc_number: 'DC No',
  po_number: 'PO No',
  sales_order_number: 'SO No',
  engineer: 'Engineer',
  products: 'Products',
  consignee_city: 'City',
  dc_date: 'DC Date',
  sr_no: 'Sr. No',
};

const SUGGESTION_FIELD_ORDER = [
  'sales_order_number',
  'dc_number',
  'po_number',
  'account_name',
  'engineer',
  'dc_date',
  'sr_no',
  'products',
  'consignee_city',
];

function coerceRecords(payload: unknown): CrmRecord[] {
  if (Array.isArray(payload)) return payload as CrmRecord[];
  if (payload && typeof payload === 'object') {
    const p = payload as { results?: unknown; data?: unknown };
    if (Array.isArray(p.results)) return p.results as CrmRecord[];
    if (Array.isArray(p.data)) return p.data as CrmRecord[];
  }
  return [];
}

function parseSearchFields(searchFields: string): string[] {
  const fromConfig = searchFields
    .split(',')
    .map((f) => f.trim())
    .filter(Boolean);
  const ordered = SUGGESTION_FIELD_ORDER.filter((f) => fromConfig.includes(f));
  const rest = fromConfig.filter((f) => !ordered.includes(f));
  return [...ordered, ...rest];
}

export function buildDispatchSearchSuggestions(
  records: CrmRecord[],
  query: string,
  searchFields: string,
  limit = 12
): DispatchSearchSuggestion[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const fields = parseSearchFields(searchFields);
  const seen = new Set<string>();
  const out: DispatchSearchSuggestion[] = [];

  for (const record of records) {
    const data = getRecordData(record);
    for (const field of fields) {
      const raw = data[field];
      if (raw === null || raw === undefined) continue;
      const text = String(raw).trim();
      if (!text || ['null', 'none'].includes(text.toLowerCase())) continue;
      if (!text.toLowerCase().includes(q)) continue;

      const dedupeKey = `${field}\0${text}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      out.push({
        id: dedupeKey,
        value: text,
        field,
        fieldLabel: FIELD_LABELS[field] ?? field.replace(/_/g, ' '),
      });

      if (out.length >= limit) return out;
    }
  }

  return out;
}

export async function fetchDispatchSearchSuggestions(
  apiClient: AxiosInstance,
  options: {
    apiEndpoint: string;
    entityType: string;
    query: string;
    searchFields: string;
    limit?: number;
  }
): Promise<DispatchSearchSuggestion[]> {
  const trimmed = options.query.trim();
  if (trimmed.length < 2) return [];

  const params = new URLSearchParams();
  params.set('entity_type', options.entityType);
  params.set('page', '1');
  params.set('page_size', String(Math.min(options.limit ?? 12, 25) * 2));
  params.set('search', trimmed);
  params.set('search_fields', options.searchFields);
  params.set('ordering', '-updated_at');

  const base = options.apiEndpoint.split('?')[0];
  const response = await apiClient.get(`${base}?${params.toString()}`);
  const records = coerceRecords(response.data);
  return buildDispatchSearchSuggestions(records, trimmed, options.searchFields, options.limit ?? 12);
}
