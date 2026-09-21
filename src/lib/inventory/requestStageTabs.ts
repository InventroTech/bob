/** All Request page stage strip — filters rows by request / shipment stage (not separate pages). */

export type RequestStageTabId =
  | 'all'
  | 'pending_approval'
  | 'in_cart'
  | 'ordered'
  | 'delivered'
  | 'invoiced_closed';

export type RequestStageTabDef = {
  id: RequestStageTabId;
  step: number;
  label: string;
  /** Two-line label shown next to the stage icon (matches design mock). */
  labelLines?: [string, string];
  /** Optional trailing label (e.g. "Complete") instead of a count pill. */
  completeSuffix?: string;
};

export const REQUEST_STAGE_TABS: RequestStageTabDef[] = [
  { id: 'all', step: 1, label: 'All Request', labelLines: ['All', 'Request'] },
  { id: 'pending_approval', step: 2, label: 'Pending Approval', labelLines: ['Pending', 'Approval'] },
  { id: 'in_cart', step: 3, label: 'In Cart items', labelLines: ['In Cart', 'items'] },
  { id: 'ordered', step: 4, label: 'Ordered Items', labelLines: ['Ordered', 'Items'] },
  { id: 'delivered', step: 5, label: 'Delivered Items', labelLines: ['Delivered', 'Items'] },
  {
    id: 'invoiced_closed',
    step: 6,
    label: 'Invoiced & Closed',
    completeSuffix: 'Complete',
  },
];

const PENDING_STATUSES = new Set(['NEW_REQUEST', 'ON_HOLD', 'REQ_TO_VERIFY']);

/** Server query filters for each stage (matches dedicated inventory pages). */
export const REQUEST_STAGE_SERVER_FILTERS: Record<
  RequestStageTabId,
  { status?: string; shipment_status?: string } | null
> = {
  all: null,
  pending_approval: { status: 'NEW_REQUEST,ON_HOLD,REQ_TO_VERIFY' },
  in_cart: { status: 'IN_CART' },
  ordered: { shipment_status: 'ORDERED' },
  delivered: { shipment_status: 'DELIVERED' },
  invoiced_closed: { status: 'REJECTED' },
};

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

/**
 * Assign each row to exactly one stage (priority order) so client filters stay consistent.
 * Rows like VENDOR_IDENTIFIED only appear under "All Request".
 */
export function getRowPrimaryRequestStage(
  row: Record<string, unknown> | null | undefined
): Exclude<RequestStageTabId, 'all'> | null {
  if (!row) return null;

  const status = getRowRequestStatus(row);
  const shipment = getRowShipmentStatus(row);

  // Closed first — matches server filter status=REJECTED (exclusive primary stage).
  if (status === 'REJECTED') {
    return 'invoiced_closed';
  }
  // Shipment-driven stages (Ordered / Delivered) take priority over request status.
  if (shipment === 'DELIVERED') return 'delivered';
  if (shipment === 'ORDERED') return 'ordered';
  if (status === 'IN_CART') return 'in_cart';
  if (PENDING_STATUSES.has(status)) return 'pending_approval';
  return null;
}

export function rowMatchesRequestStage(
  row: Record<string, unknown> | null | undefined,
  stage: RequestStageTabId
): boolean {
  if (!row || stage === 'all') return true;
  return getRowPrimaryRequestStage(row) === stage;
}

export function emptyRequestStageCounts(): Record<RequestStageTabId, number> {
  return {
    all: 0,
    pending_approval: 0,
    in_cart: 0,
    ordered: 0,
    delivered: 0,
    invoiced_closed: 0,
  };
}

export function countRowsByRequestStage(
  rows: Array<Record<string, unknown>>,
  /** When known (API total), prefer this for the "all" tab instead of rows.length. */
  allTotal?: number
): Record<RequestStageTabId, number> {
  const counts = emptyRequestStageCounts();
  counts.all = typeof allTotal === 'number' && allTotal >= 0 ? allTotal : rows.length;

  for (const row of rows) {
    const stage = getRowPrimaryRequestStage(row);
    if (stage) counts[stage] += 1;
  }

  return counts;
}

export function filterRowsByRequestStage<T extends Record<string, unknown>>(
  rows: T[],
  stage: RequestStageTabId
): T[] {
  if (stage === 'all') return rows;
  return rows.filter((row) => rowMatchesRequestStage(row, stage));
}

export function formatStageCount(count: number): string {
  return String(Math.max(0, count)).padStart(2, '0');
}

/**
 * Apply stage filters onto a URLSearchParams.
 * For a concrete stage, overwrites status / shipment_status.
 * For "all", leaves any user/endpoint status filters intact.
 */
export function applyRequestStageFiltersToParams(
  params: URLSearchParams,
  stage: RequestStageTabId
): void {
  const filters = REQUEST_STAGE_SERVER_FILTERS[stage];
  if (!filters) return;
  params.delete('status');
  params.delete('shipment_status');
  if (filters.status) params.set('status', filters.status);
  if (filters.shipment_status) params.set('shipment_status', filters.shipment_status);
}

/**
 * Build a list URL for stage count / filtered fetch.
 * Strips pagination from the endpoint so ours win.
 * For concrete stages, also strips status / shipment_status so stage filters win.
 * For "all", preserves status / shipment_status from the endpoint, forceQueryParams, and extraParams.
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
  // For concrete stages, also drop status / shipment_status so stage filters win.
  // For "all", keep them so count requests match the table's user filters.
  for (const key of ['page', 'page_size', 'include_count']) {
    existing.delete(key);
  }
  const keepUserStatusFilters = options.stage === 'all';
  if (!keepUserStatusFilters) {
    existing.delete('status');
    existing.delete('shipment_status');
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
      if (!keepUserStatusFilters && (k === 'status' || k === 'shipment_status')) continue;
      existing.set(k, String(v));
    }
  }

  if (options.extraParams) {
    options.extraParams.forEach((v, k) => {
      if (k === 'page' || k === 'page_size') return;
      if (!keepUserStatusFilters && (k === 'status' || k === 'shipment_status')) return;
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
