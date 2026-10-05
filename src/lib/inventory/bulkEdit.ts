import { getAllowedNextRequestStatuses, normalizeRequestStatus } from './requestStatus';

/** Per-row "Don't change" value in the Bulk Edit review popup. */
export const BULK_SKIP_VALUE = '__bulk_skip__';

export interface BulkPreviewRow {
  id: string;
  itemName: string;
  currentValue: string;
  currentLabel: string;
  /** Statuses this row may move to (never its current status). */
  allowedValues: Set<string>;
  /** The toolbar status isn't a valid next step for this row and the user hasn't overridden it. */
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
    const allowedValues = new Set(
      getAllowedNextRequestStatuses(currentValue, entityType).filter((v) => v !== currentValue)
    );
    const blocked = !!targetValue && !allowedValues.has(targetValue);
    const alreadyAtTarget = blocked && targetValue === currentValue;
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
