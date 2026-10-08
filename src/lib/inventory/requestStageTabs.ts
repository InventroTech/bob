/**
 * All Request page stage strip — one tab per configured status page.
 * Pages and the status → page mapping come from the backend status config
 * (see requestStatus.ts); the server filters with `?stage=<page id>`.
 */

import { getRequestStatusConfig, getRequestStatusPage } from '@/lib/inventory/requestStatus';

/** 'all' or a configured page id (pending_approval, in_cart, ordered, delivered, closed, …). */
export type RequestStageTabId = string;

export type RequestStageTabDef = {
  id: RequestStageTabId;
  step: number;
  label: string;
  /** Two-line label shown next to the stage icon (matches design mock). */
  labelLines?: [string, string];
  /** Optional trailing label (e.g. "Complete") instead of a count pill. */
  completeSuffix?: string;
};

function splitLabel(label: string): [string, string] | undefined {
  const words = label.trim().split(/\s+/);
  if (words.length < 2) return undefined;
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
}

/** Tabs for an entity type: "All Request" first, then the configured pages in order. */
export function getRequestStageTabs(entityType?: string | null): RequestStageTabDef[] {
  const pages = getRequestStatusConfig(entityType).pages;
  return [
    { id: 'all', step: 1, label: 'All Request', labelLines: ['All', 'Request'] },
    ...pages.map((page, index) => ({
      id: page.id,
      step: index + 2,
      label: page.label,
      ...(page.id === 'closed'
        ? { completeSuffix: 'Complete' }
        : { labelLines: splitLabel(page.label) }),
    })),
  ];
}

/** Default tabs (built-in pages) — prefer getRequestStageTabs(entityType). */
export const REQUEST_STAGE_TABS: RequestStageTabDef[] = getRequestStageTabs(null);

/** Server query filter for a stage: `stage=<page id>` (none for "all"). */
export function getRequestStageServerFilter(stage: RequestStageTabId): { stage: string } | null {
  return stage === 'all' ? null : { stage };
}

function normalize(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_');
}

export function getRowRequestStatus(row: Record<string, unknown> | null | undefined): string {
  const data =
    row?.data && typeof row.data === 'object' ? (row.data as Record<string, unknown>) : null;
  return normalize(data?.status ?? row?.status);
}

export function getRowShipmentStatus(row: Record<string, unknown> | null | undefined): string {
  const data =
    row?.data && typeof row.data === 'object' ? (row.data as Record<string, unknown>) : null;
  return normalize(data?.shipment_status ?? row?.shipment_status);
}

/** The page a row belongs to (from its status), or null when its status is unmapped. */
export function getRowPrimaryRequestStage(
  row: Record<string, unknown> | null | undefined,
  entityType?: string | null
): RequestStageTabId | null {
  if (!row) return null;
  const rowEntity = typeof row.entity_type === 'string' ? row.entity_type : entityType;
  return getRequestStatusPage(getRowRequestStatus(row), rowEntity);
}

export function rowMatchesRequestStage(
  row: Record<string, unknown> | null | undefined,
  stage: RequestStageTabId,
  entityType?: string | null
): boolean {
  if (!row || stage === 'all') return true;
  return getRowPrimaryRequestStage(row, entityType) === stage;
}

export function emptyRequestStageCounts(
  entityType?: string | null
): Record<RequestStageTabId, number> {
  const counts: Record<RequestStageTabId, number> = {};
  for (const tab of getRequestStageTabs(entityType)) counts[tab.id] = 0;
  return counts;
}

export function countRowsByRequestStage(
  rows: Array<Record<string, unknown>>,
  /** When known (API total), prefer this for the "all" tab instead of rows.length. */
  allTotal?: number,
  entityType?: string | null
): Record<RequestStageTabId, number> {
  const counts = emptyRequestStageCounts(entityType);
  counts.all = typeof allTotal === 'number' && allTotal >= 0 ? allTotal : rows.length;

  for (const row of rows) {
    const stage = getRowPrimaryRequestStage(row, entityType);
    if (stage && stage in counts) counts[stage] += 1;
  }

  return counts;
}

export function filterRowsByRequestStage<T extends Record<string, unknown>>(
  rows: T[],
  stage: RequestStageTabId,
  entityType?: string | null
): T[] {
  if (stage === 'all') return rows;
  return rows.filter((row) => rowMatchesRequestStage(row, stage, entityType));
}

export function formatStageCount(count: number): string {
  return String(Math.max(0, count)).padStart(2, '0');
}

/**
 * Apply stage filters onto a URLSearchParams.
 * For a concrete stage, replaces status / shipment_status with `stage=<id>`.
 * For "all", leaves any user/endpoint status filters intact.
 */
export function applyRequestStageFiltersToParams(
  params: URLSearchParams,
  stage: RequestStageTabId
): void {
  const filter = getRequestStageServerFilter(stage);
  if (!filter) return;
  params.delete('status');
  params.delete('shipment_status');
  params.set('stage', filter.stage);
}

/**
 * Build a list URL for stage count / filtered fetch.
 * Strips pagination from the endpoint so ours win.
 * For concrete stages, also strips status / shipment_status / stage so the stage filter wins.
 * For "all", preserves status / shipment_status / stage from the endpoint, forceQueryParams, and extraParams.
 */
export function buildRequestStageListUrl(
  endpoint: string,
  options: {
    stage: RequestStageTabId;
    entityType?: string | null;
    forceQueryParams?: Record<string, string> | null;
    page?: number;
    pageSize?: number;
    includeCount?: boolean;
    extraParams?: URLSearchParams | null;
  }
): string {
  const base = String(endpoint || '').trim();
  const qIndex = base.indexOf('?');
  const path = qIndex >= 0 ? base.slice(0, qIndex) : base;
  const existing = new URLSearchParams(qIndex >= 0 ? base.slice(qIndex + 1) : '');

  // Drop pagination from the saved endpoint so we control it.
  // For concrete stages, also drop status / shipment_status / stage so the stage filter wins.
  // For "all", keep them so count requests match the table's user filters.
  for (const key of ['page', 'page_size', 'include_count']) {
    existing.delete(key);
  }
  const keepUserStatusFilters = options.stage === 'all';
  if (!keepUserStatusFilters) {
    existing.delete('status');
    existing.delete('shipment_status');
    existing.delete('stage');
  }

  if (
    options.entityType &&
    path.includes('/crm-records/records') &&
    !existing.has('entity_type')
  ) {
    existing.set('entity_type', String(options.entityType));
  }

  if (options.forceQueryParams) {
    for (const [k, v] of Object.entries(options.forceQueryParams)) {
      if (v == null || String(v).trim() === '') continue;
      if (!keepUserStatusFilters && (k === 'status' || k === 'shipment_status' || k === 'stage')) continue;
      existing.set(k, String(v));
    }
  }

  if (options.extraParams) {
    options.extraParams.forEach((v, k) => {
      if (k === 'page' || k === 'page_size') return;
      if (!keepUserStatusFilters && (k === 'status' || k === 'shipment_status' || k === 'stage')) return;
      existing.set(k, v);
    });
  }

  applyRequestStageFiltersToParams(existing, options.stage);
  existing.set('page', String(options.page ?? 1));
  existing.set('page_size', String(options.pageSize ?? 10));
  if (options.includeCount) existing.set('include_count', 'true');

  const qs = existing.toString();
  return qs ? `${path}?${qs}` : path;
}

export function parseListTotalCount(payload: unknown): number {
  if (!payload || typeof payload !== 'object') return 0;
  const p = payload as {
    page_meta?: { total_count?: number | null };
    count?: number | null;
    total_count?: number | null;
    total?: number | null;
  };
  const candidates = [
    p.page_meta?.total_count,
    p.count,
    p.total_count,
    p.total,
  ];
  for (const c of candidates) {
    const n = Number(c);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return 0;
}
