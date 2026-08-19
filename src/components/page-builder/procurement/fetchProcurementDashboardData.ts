import { apiClient } from '@/lib/api/client';
import type { CrmRecord } from '@/lib/api/services/crmRecords';
import { parseRecordListTotal } from '@/components/page-builder/dispatch/fetchDispatchDashboardStats';

export type ProcurementRequestRow = {
  id: string;
  itemName: string;
  vendor: string;
  requestDate: Date | null;
  requirementDate: Date | null;
  amount: number;
  status: string;
  category: string;
  department: string;
  raw: CrmRecord;
};

export type KpiMetric = {
  id: string;
  label: string;
  amount: number;
  priorAmount: number;
  tone: 'blue' | 'green' | 'orange' | 'red' | 'amber' | 'cyan' | 'violet';
};

export type CategorySlice = {
  name: string;
  amount: number;
  percent: number;
  color: string;
};

export type AgingBucket = {
  key: string;
  label: string;
  amount: number;
  count: number;
};

export type ProcurementDashboardData = {
  rows: ProcurementRequestRow[];
  kpis: KpiMetric[];
  categories: CategorySlice[];
  aging: AgingBucket[];
  totalSpend: number;
};

const CATEGORY_COLORS = ['#E8B923', '#7DD3FC', '#F472B6', '#2DD4BF', '#4ADE80', '#A78BFA', '#FB923C', '#94A3B8'];

const PENDING_STATUSES = new Set(['NEW_REQUEST', 'ON_HOLD', 'REQ_TO_VERIFY']);
const ORDERED_STATUSES = new Set(['VENDOR_IDENTIFIED', 'IN_CART', 'IN_SHIPPING']);
const REJECTED_STATUSES = new Set(['REJECTED']);

function coerceRecords(payload: unknown): CrmRecord[] {
  if (Array.isArray(payload)) return payload as CrmRecord[];
  if (payload && typeof payload === 'object') {
    const p = payload as { results?: unknown; data?: unknown };
    if (Array.isArray(p.results)) return p.results as CrmRecord[];
    if (Array.isArray(p.data)) return p.data as CrmRecord[];
  }
  return [];
}

function getData(record: CrmRecord): Record<string, unknown> {
  if (record.data && typeof record.data === 'object') {
    return record.data as Record<string, unknown>;
  }
  return record as Record<string, unknown>;
}

export function parseFlexibleDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  const sheet = trimmed.match(/^(\d{2})-([A-Za-z]{3})-(\d{2,4})$/);
  if (sheet) {
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const day = Number(sheet[1]);
    const mon = months.indexOf(sheet[2].toUpperCase());
    let year = Number(sheet[3]);
    if (year < 100) year += 2000;
    if (mon >= 0 && day >= 1) return new Date(year, mon, day);
  }
  const d = new Date(trimmed);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function parseAmount(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value.replace(/[,₹\s]/g, ''));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function normalizeStatus(status: unknown): string {
  return String(status ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_');
}

function recordToRow(record: CrmRecord): ProcurementRequestRow {
  const data = getData(record);
  const id = String(record.id ?? data.id ?? data.request_id ?? '');
  const amount =
    parseAmount(data.line_total) ||
    parseAmount(data.estimated_cost) ||
    parseAmount(data.negotiated_value) ||
    0;
  return {
    id,
    itemName: String(data.item_name_freeform ?? data.item_name ?? '—'),
    vendor: String(data.vendor ?? data.supplier ?? '—'),
    requestDate: parseFlexibleDate(data.request_date) ?? parseFlexibleDate(record.created_at),
    requirementDate:
      parseFlexibleDate(data.requirement_date) ?? parseFlexibleDate(data.required_date),
    amount,
    status: normalizeStatus(data.status ?? record.status),
    category: String(data.category ?? '').trim() || 'Unspecified',
    department: String(data.department ?? '').trim() || '—',
    raw: record,
  };
}

async function fetchAllRecords(entityType: string): Promise<CrmRecord[]> {
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
    if (page === 1) totalCount = parseRecordListTotal(res.data);
    all.push(...batch);
    if (batch.length < pageSize) break;
    if (totalCount != null && all.length >= totalCount) break;
    page += 1;
  }

  return all;
}

function sumAmount(rows: ProcurementRequestRow[]): number {
  return rows.reduce((acc, r) => acc + r.amount, 0);
}

function inYear(d: Date | null, year: number): boolean {
  return !!d && d.getFullYear() === year;
}

function buildKpis(rows: ProcurementRequestRow[], now: Date): KpiMetric[] {
  const y = now.getFullYear();
  const prior = y - 1;

  const ytd = rows.filter((r) => inYear(r.requestDate, y));
  const priorYtd = rows.filter((r) => inYear(r.requestDate, prior));

  const metric = (
    id: string,
    label: string,
    tone: KpiMetric['tone'],
    pred: (r: ProcurementRequestRow) => boolean
  ): KpiMetric => ({
    id,
    label,
    tone,
    amount: sumAmount(ytd.filter(pred)),
    priorAmount: sumAmount(priorYtd.filter(pred)),
  });

  return [
    metric('total', 'Total Spend (YTD)', 'blue', () => true),
    metric('new', 'New Request', 'cyan', (r) => r.status === 'NEW_REQUEST'),
    metric('on_hold', 'On Hold', 'amber', (r) => r.status === 'ON_HOLD'),
    metric('to_verify', 'To Verify', 'violet', (r) => r.status === 'REQ_TO_VERIFY'),
    metric('vendor_identified', 'Vendor Identified', 'green', (r) => r.status === 'VENDOR_IDENTIFIED'),
    metric('in_cart', 'In Cart', 'violet', (r) => r.status === 'IN_CART'),
    metric('in_shipping', 'In Shipping', 'orange', (r) => r.status === 'IN_SHIPPING'),
    metric('rejected', 'Rejected', 'red', (r) => REJECTED_STATUSES.has(r.status)),
  ];
}

function buildCategories(rows: ProcurementRequestRow[]): CategorySlice[] {
  const byCat = new Map<string, number>();
  for (const r of rows) {
    byCat.set(r.category, (byCat.get(r.category) ?? 0) + r.amount);
  }
  const total = [...byCat.values()].reduce((a, b) => a + b, 0);
  if (total <= 0) return [];
  return [...byCat.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, amount], i) => ({
      name,
      amount,
      percent: Math.round((amount / total) * 10000) / 100,
      color: CATEGORY_COLORS[i % CATEGORY_COLORS.length]!,
    }));
}

/** Public helper — aggregate spend by category, item, or vendor. */
export type SpendBreakdownMode = 'category' | 'item' | 'vendor';

export function buildSpendSlices(
  rows: ProcurementRequestRow[],
  mode: SpendBreakdownMode = 'category'
): {
  slices: CategorySlice[];
  total: number;
} {
  const keyFn =
    mode === 'item'
      ? (r: ProcurementRequestRow) => r.itemName || '—'
      : mode === 'vendor'
        ? (r: ProcurementRequestRow) => r.vendor || '—'
        : (r: ProcurementRequestRow) => r.category || 'Unspecified';

  const byKey = new Map<string, number>();
  for (const r of rows) {
    const key = keyFn(r);
    byKey.set(key, (byKey.get(key) ?? 0) + r.amount);
  }
  const total = [...byKey.values()].reduce((a, b) => a + b, 0);
  if (total <= 0) return { slices: [], total: 0 };

  const slices = [...byKey.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, amount], i) => ({
      name,
      amount,
      percent: Math.round((amount / total) * 10000) / 100,
      color: CATEGORY_COLORS[i % CATEGORY_COLORS.length]!,
    }));

  return { slices, total };
}

/** @deprecated Prefer buildSpendSlices — kept for existing YTD dashboard path. */
export function buildCategorySlices(rows: ProcurementRequestRow[]): {
  slices: CategorySlice[];
  total: number;
} {
  return buildSpendSlices(rows, 'category');
}

export function rowInCalendarMonth(row: ProcurementRequestRow, year: number, monthIndex: number): boolean {
  const d = row.requestDate;
  return !!d && d.getFullYear() === year && d.getMonth() === monthIndex;
}

/** Inclusive calendar-day range on requestDate (local dates, YYYY-MM-DD bounds). */
export function rowInDateRange(
  row: ProcurementRequestRow,
  startYmd: string,
  endYmd: string
): boolean {
  const d = row.requestDate;
  if (!d) return false;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const ymd = `${y}-${m}-${day}`;
  if (startYmd && ymd < startYmd) return false;
  if (endYmd && ymd > endYmd) return false;
  return true;
}

export function formatInrPrecise(amount: number): string {
  return amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function ageDays(from: Date, now: Date): number {
  return Math.floor((now.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

function buildAging(rows: ProcurementRequestRow[], now: Date): AgingBucket[] {
  const pendingLike = rows.filter(
    (r) =>
      PENDING_STATUSES.has(r.status) ||
      r.status === 'VENDOR_IDENTIFIED' ||
      r.status === 'IN_CART'
  );
  const buckets: AgingBucket[] = [
    { key: '0_30', label: '0 - 30 Days', amount: 0, count: 0 },
    { key: '31_60', label: '31 - 60 Days', amount: 0, count: 0 },
    { key: '61_90', label: '61 - 90 Days', amount: 0, count: 0 },
    { key: '90_plus', label: 'Above 90 Days', amount: 0, count: 0 },
  ];

  for (const r of pendingLike) {
    const base = r.requirementDate ?? r.requestDate;
    if (!base) continue;
    const days = ageDays(base, now);
    const bucket =
      days <= 30 ? buckets[0]! : days <= 60 ? buckets[1]! : days <= 90 ? buckets[2]! : buckets[3]!;
    bucket.amount += r.amount;
    bucket.count += 1;
  }

  return buckets;
}

export async function fetchProcurementDashboardData(
  entityType: string
): Promise<ProcurementDashboardData> {
  const records = await fetchAllRecords(entityType);
  const rows = records.map(recordToRow);
  const now = new Date();
  const ytdRows = rows.filter((r) => inYear(r.requestDate, now.getFullYear()));
  const { slices: categories, total: totalSpend } = buildCategorySlices(ytdRows);
  return {
    rows,
    kpis: buildKpis(rows, now),
    categories,
    aging: buildAging(rows, now),
    totalSpend,
  };
}

export function formatInr(amount: number): string {
  return `₹ ${Math.round(amount).toLocaleString('en-IN')}`;
}

export function formatTrend(current: number, prior: number): { text: string; up: boolean | null } {
  if (prior <= 0 && current <= 0) return { text: 'No prior year data', up: null };
  if (prior <= 0) return { text: 'New vs last year', up: true };
  const pct = ((current - prior) / prior) * 100;
  const up = pct >= 0;
  return { text: `${up ? '+' : ''}${pct.toFixed(1)}% vs last year`, up };
}

export function formatDisplayDate(d: Date | null): string {
  if (!d) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export { PENDING_STATUSES, ORDERED_STATUSES, REJECTED_STATUSES };
