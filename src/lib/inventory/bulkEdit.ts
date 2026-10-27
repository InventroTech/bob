import { getRequestStatusValues, normalizeRequestStatus } from './requestStatus';

/** Per-row "Don't change" value in the Bulk Edit review popup. */
export const BULK_SKIP_VALUE = '__bulk_skip__';

export interface BulkPreviewRow {
  id: string;
  itemName: string;
  currentValue: string;
  currentLabel: string;
  /** Every active status except the row's current one. */
  allowedValues: Set<string>;
  /** The row is already at the toolbar status and the user hasn't overridden it. */
  blocked: boolean;
  /** The row is already at the toolbar status. */
  alreadyAtTarget: boolean;
  nextValue: string;
  skipped: boolean;
  unchanged: boolean;
}

export interface BuildBulkPreviewRowsInput {
  rows: any[];
  targetValue: string;
  attribute?: string;
  /** Row id → chosen value (or BULK_SKIP_VALUE) from the review popup. */
  overrides?: Record<string, string>;
  entityType?: string | null;
  formatValue: (value: unknown) => string;
}

export function buildBulkPreviewRows({
  rows,
  targetValue,
  attribute,
  overrides = {},
  entityType,
  formatValue,
}: BuildBulkPreviewRowsInput): BulkPreviewRow[] {
  const attr = (attribute || 'status').trim() || 'status';
  return (rows ?? []).map((row: any) => {
    const data = (row?.data as Record<string, unknown>) || {};
    const itemName = String(
      data.item_name_freeform ?? row?.item_name_freeform ?? data.item_name ?? row?.item_name ?? ''
    ).trim();
    const id = String(row?.id ?? '');
    const currentValue = normalizeRequestStatus(data[attr] ?? row?.[attr]);
    const allowedValues = new Set(getRequestStatusValues(entityType).filter((v) => v !== currentValue));
    const alreadyAtTarget = !!targetValue && targetValue === currentValue;
    const blocked = alreadyAtTarget;
    const nextValue = overrides[id] ?? (blocked ? BULK_SKIP_VALUE : targetValue);
    const currentLabel = formatValue(currentValue);
    const skipped = nextValue === BULK_SKIP_VALUE;
    return {
      id,
      itemName: itemName || `Request #${row?.id ?? ''}`,
      currentValue,
      currentLabel,
      allowedValues,
      blocked: blocked && !(id in overrides),
      alreadyAtTarget,
      nextValue,
      skipped,
      unchanged: !skipped && currentLabel === formatValue(nextValue),
    };
  });
}

function firstMessage(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const msg = firstMessage(item);
      if (msg) return msg;
    }
    return '';
  }
  if (value && typeof value === 'object') {
    for (const item of Object.values(value as Record<string, unknown>)) {
      const msg = firstMessage(item);
      if (msg) return msg;
    }
  }
  return '';
}

/**
 * Readable reason for a failed row save. Handles both raw axios errors (`response`) and the
 * app's ApiError classes (`status` / `data`).
 */
export function describeBulkSaveError(error: unknown): string {
  const err = error as {
    response?: { status?: number; data?: unknown };
    status?: number;
    data?: unknown;
    message?: string;
  } | null;
  const status = err?.response?.status ?? err?.status;
  const body = err?.response?.data ?? err?.data;
  const detail =
    body && typeof body === 'object' && 'detail' in (body as Record<string, unknown>)
      ? firstMessage((body as Record<string, unknown>).detail)
      : firstMessage(body);
  if (status && detail) return `${status}: ${detail}`;
  if (status) return `Server returned ${status}.`;
  return err?.message || 'Network error.';
}

/** Rows that will actually be saved. */
export function countBulkChanges(rows: BulkPreviewRow[]): number {
  return rows.filter((r) => !r.skipped && !r.unchanged).length;
}

/** Target value → row ids, skipping "Don't change" and unchanged rows. */
export function groupBulkRowIdsByValue(rows: BulkPreviewRow[]): Map<string, string[]> {
  const grouped = new Map<string, string[]>();
  for (const row of rows) {
    if (row.skipped || row.unchanged || !row.nextValue) continue;
    grouped.set(row.nextValue, [...(grouped.get(row.nextValue) ?? []), row.id]);
  }
  return grouped;
}
