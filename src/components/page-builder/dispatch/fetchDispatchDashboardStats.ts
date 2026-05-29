import { apiClient } from '@/lib/api/client';
import type { CrmRecord } from '@/lib/crmRecordsApi';
import { getRecordData } from './formatDispatchValue';
import { fetchDistinctFieldValues } from './fetchDistinctFieldValues';

export type DispatchMonthlyBar = {
  label: string;
  monthKey: string;
  count: number;
};

export type DispatchDashboardStats = {
  totalCount: number;
  customerCount: number;
  thisMonthCount: number;
  monthlyBars: DispatchMonthlyBar[];
  customers: string[];
};

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_SHORT = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function coerceRecords(payload: unknown): CrmRecord[] {
  if (Array.isArray(payload)) return payload as CrmRecord[];
  if (payload && typeof payload === 'object') {
    const p = payload as { results?: unknown; data?: unknown };
    if (Array.isArray(p.results)) return p.results as CrmRecord[];
    if (Array.isArray(p.data)) return p.data as CrmRecord[];
  }
  return [];
}

export function parseRecordListTotal(payload: unknown): number | null {
  if (!payload || typeof payload !== 'object') return null;
  const p = payload as { page_meta?: { total_count?: number | null }; count?: number };
  if (p.page_meta?.total_count != null) {
    const n = Number(p.page_meta.total_count);
    return Number.isFinite(n) ? n : null;
  }
  if (p.count != null) {
    const n = Number(p.count);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function parseFlexibleDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  const sheet = trimmed.match(/^(\d{2})-([A-Z]{3})-(\d{2,4})$/i);
  if (sheet) {
    const day = Number(sheet[1]);
    const mon = MONTHS_SHORT.indexOf(sheet[2].toUpperCase());
    let year = Number(sheet[3]);
    if (year < 100) year += 2000;
    if (mon >= 0 && day >= 1) return new Date(year, mon, day);
  }
  const d = new Date(trimmed);
  return Number.isNaN(d.getTime()) ? null : d;
}

function getRecordActivityDate(record: CrmRecord): Date | null {
  const data = getRecordData(record);
  return (
    parseFlexibleDate(record.updated_at) ??
    parseFlexibleDate(record.created_at) ??
    parseFlexibleDate(data.dc_date) ??
    parseFlexibleDate(data.po_date)
  );
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}`;
}

function buildLastSixMonthSlots(now: Date): DispatchMonthlyBar[] {
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return {
      label: MONTH_LABELS[d.getMonth()] ?? '',
      monthKey: monthKey(d),
      count: 0,
    };
  });
}

async function fetchRecordsForStats(entityType: string): Promise<{ records: CrmRecord[]; totalCount: number }> {
  const pageSize = 500;
  const maxPages = 20;
  let page = 1;
  const all: CrmRecord[] = [];
  let totalCount: number | null = null;

  while (page <= maxPages) {
    const params = new URLSearchParams({
      entity_type: entityType,
      page: String(page),
      page_size: String(pageSize),
      ordering: '-updated_at',
    });
    if (page === 1) params.set('include_count', 'true');

    const res = await apiClient.get(`/crm-records/records/?${params.toString()}`);
    const batch = coerceRecords(res.data);
    if (page === 1) {
      totalCount = parseRecordListTotal(res.data);
    }
    all.push(...batch);
    if (batch.length < pageSize) break;
    if (totalCount != null && all.length >= totalCount) break;
    page += 1;
  }

  return {
    records: all,
    totalCount: totalCount ?? all.length,
  };
}

function buildMonthlyBars(records: CrmRecord[], now: Date): DispatchMonthlyBar[] {
  const bars = buildLastSixMonthSlots(now);
  const slotKeys = new Set(bars.map((b) => b.monthKey));

  for (const record of records) {
    const dt = getRecordActivityDate(record);
    if (!dt) continue;
    const key = monthKey(dt);
    if (!slotKeys.has(key)) continue;
    const bar = bars.find((b) => b.monthKey === key);
    if (bar) bar.count += 1;
  }

  return bars;
}

export async function fetchDispatchDashboardStats(
  entityType: string,
  customerField: string
): Promise<DispatchDashboardStats> {
  const now = new Date();
  const thisMonthKey = monthKey(now);

  const [customers, { records, totalCount }] = await Promise.all([
    fetchDistinctFieldValues(entityType, customerField),
    fetchRecordsForStats(entityType),
  ]);

  const monthlyBars = buildMonthlyBars(records, now);
  const thisMonthCount = monthlyBars.find((b) => b.monthKey === thisMonthKey)?.count ?? 0;

  return {
    totalCount,
    customerCount: customers.length,
    thisMonthCount,
    monthlyBars,
    customers,
  };
}
