import type { FilterConfig } from '@/component-config/DynamicFilterConfig';
import { FilterService } from '@/services/filterService';

/** Same shape as records table filter state (`useFilters`). */
export type DispatchFilterValues = Record<string, unknown>;

/** Default mobile filters — order and layout match Figma. */
export const DEFAULT_DISPATCH_MOBILE_FILTERS: FilterConfig[] = [
  {
    key: 'engineer',
    label: 'Engineer',
    type: 'icontains',
    accessor: 'engineer',
    dispatchWidth: 'full',
  },
  {
    key: 'dc_date',
    label: 'DC Date',
    type: 'date_range',
    accessor: 'dc_date',
    dateRangeStartLabel: 'Start Date',
    dateRangeEndLabel: 'End Date',
    dispatchRow: 'row_start',
    dispatchWidth: 'full',
  },
  {
    key: 'dc_in_office',
    label: 'DC in Office',
    type: 'exact',
    accessor: 'dc_in_office',
    dispatchUi: 'toggle',
    dispatchRow: 'row_start',
  },
  {
    key: 'sis_ctf_mail',
    label: 'SIS CTF Mail',
    type: 'exact',
    accessor: 'sis_ctf_mail',
    dispatchUi: 'toggle',
    dispatchRow: 'row_start',
  },
  {
    key: 'sis_ctf_date',
    label: 'SIS CTF Date',
    type: 'date_gte',
    accessor: 'sis_ctf_date',
    dispatchWidth: 'half',
    dispatchRow: 'row_dates',
  },
  {
    key: 'po_date',
    label: 'PO Date',
    type: 'date_lte',
    accessor: 'po_date',
    dispatchWidth: 'half',
    dispatchRow: 'row_dates',
  },
  {
    key: 'account_name',
    label: 'Client Name',
    type: 'icontains',
    accessor: 'account_name',
    dispatchUi: 'chip',
    dispatchWidth: 'full',
  },
  {
    key: 'amount',
    label: 'Amount',
    type: 'exact',
    accessor: 'amount',
    dispatchWidth: 'full',
  },
  {
    key: 'sis_ctf_done',
    label: 'SIS CTF Done',
    type: 'select',
    accessor: 'sis_ctf_done',
    dispatchUi: 'segment',
    dispatchWidth: 'full',
    options: [
      { label: 'NR', value: '' },
      { label: 'Done', value: 'Done' },
    ],
  },
  {
    key: 'freight_mode',
    label: 'Freight Mode',
    type: 'select',
    accessor: 'freight_mode',
    dispatchUi: 'segment',
    dispatchWidth: 'full',
    options: [
      { label: 'To Pay', value: 'To Pay' },
      { label: 'Paid', value: 'Paid' },
    ],
  },
];

export function normalizeDispatchFilters(filters?: FilterConfig[]): FilterConfig[] {
  if (!filters?.length) return DEFAULT_DISPATCH_MOBILE_FILTERS;

  const seenKeys = new Set<string>();
  const slugify = (s: string) =>
    s.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

  return filters.map((f, idx) => {
    let key = (f.key || '').trim() || (f.accessor || '').trim();
    if (!key && f.label) key = slugify(f.label);
    if (!key) key = `filter_${idx}`;
    let uniqueKey = key;
    let n = 1;
    while (seenKeys.has(uniqueKey)) uniqueKey = `${key}_${n++}`;
    seenKeys.add(uniqueKey);

    return {
      ...f,
      key: uniqueKey,
      accessor: (f.accessor || uniqueKey).trim(),
    };
  });
}

export type DispatchFilterRow = {
  rowId: string;
  fields: FilterConfig[];
};

export function groupDispatchFilterRows(filters: FilterConfig[]): DispatchFilterRow[] {
  const rows: DispatchFilterRow[] = [];
  const rowIndex = new Map<string, number>();

  for (const field of filters) {
    const rowId = field.dispatchRow?.trim() || `_solo_${field.key}`;
    const idx = rowIndex.get(rowId);
    if (idx === undefined) {
      rowIndex.set(rowId, rows.length);
      rows.push({ rowId, fields: [field] });
    } else {
      rows[idx].fields.push(field);
    }
  }
  return rows;
}

export function getEmptyValueForFilter(f: FilterConfig): unknown {
  if (f.dispatchUi === 'toggle' || f.dispatchUi === 'segment') return null;
  switch (f.type) {
    case 'select':
    case 'in':
      return [];
    case 'date_range':
    case 'date_time_range':
      return { start: undefined, end: undefined };
    case 'date_gte':
    case 'date_lte':
      return undefined;
    default:
      return '';
  }
}

export function emptyDispatchFilterValues(filters: FilterConfig[]): DispatchFilterValues {
  const values: DispatchFilterValues = {};
  for (const f of filters) {
    values[f.key] = getEmptyValueForFilter(f);
  }
  return values;
}

/** Mirrors `useFilters` `isFilterActive` for badge count. */
export function isDispatchFilterActive(key: string, values: DispatchFilterValues): boolean {
  const value = values[key];
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object' && value !== null) {
    const range = value as { start?: unknown; end?: unknown };
    return !!(range.start || range.end);
  }
  if (typeof value === 'boolean') return true;
  if (value === null || value === undefined) return false;
  return value !== '';
}

export function countActiveDispatchFilterValues(
  filters: FilterConfig[],
  values: DispatchFilterValues
): number {
  return filters.filter((f) => isDispatchFilterActive(f.key, values)).length;
}

function formatDate(value: unknown): string {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value as string);
  return isNaN(d.getTime()) ? String(value) : d.toLocaleDateString();
}

/** Human-readable label for bottom active-filter chips. */
export function formatDispatchFilterChipLabel(
  filter: FilterConfig,
  value: unknown
): string {
  if (filter.dispatchUi === 'chip') {
    return filter.label;
  }

  if (filter.dispatchUi === 'toggle') {
    return filter.label;
  }

  if (filter.dispatchUi === 'segment' || (filter.type === 'select' && (filter.options?.length ?? 0) === 2)) {
    const opt = filter.options?.find((o) => o.value === value || String(o.value) === String(value));
    return opt?.label ? `${filter.label}: ${opt.label}` : filter.label;
  }

  switch (filter.type) {
    case 'select':
    case 'in': {
      if (Array.isArray(value)) {
        const labels = value.map(
          (v) => filter.options?.find((o) => o.value === v)?.label ?? String(v)
        );
        return `${filter.label}: ${labels.join(', ')}`;
      }
      const opt = filter.options?.find((o) => o.value === value);
      return `${filter.label}: ${opt?.label ?? value}`;
    }
    case 'date_gte':
    case 'date_lte':
      return `${filter.label}: ${formatDate(value)}`;
    case 'date_range':
    case 'date_time_range': {
      const range = value as { start?: unknown; end?: unknown };
      const start = formatDate(range?.start);
      const end = formatDate(range?.end);
      if (start && end) return `${filter.label}: ${start} – ${end}`;
      if (start) return `${filter.label}: from ${start}`;
      if (end) return `${filter.label}: until ${end}`;
      return filter.label;
    }
    default:
      return `${filter.label}: ${String(value)}`;
  }
}

export function getActiveDispatchFilterChips(
  filters: FilterConfig[],
  values: DispatchFilterValues
): { key: string; label: string }[] {
  return filters
    .filter((f) => isDispatchFilterActive(f.key, values))
    .map((f) => ({
      key: f.key,
      label: formatDispatchFilterChipLabel(f, values[f.key]),
    }));
}

export function inferSegmentSide(
  filter: FilterConfig,
  value: unknown
): 'left' | 'right' | null {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return null;
  const opts = filter.options ?? [];
  if (opts.length < 2) return null;
  const leftVal = opts[0].value;
  const rightVal = opts[1].value;
  if (value === leftVal || (leftVal !== '' && String(value) === String(leftVal))) return 'left';
  if (value === rightVal || String(value) === String(rightVal)) return 'right';
  return null;
}

/** Date range / multi-select fields span full row width on mobile. */
export function fieldSpansFullRow(filter: FilterConfig): boolean {
  return (
    filter.type === 'date_range' ||
    filter.type === 'date_time_range' ||
    filter.dispatchWidth === 'full' ||
    filter.dispatchUi === 'segment' ||
    filter.dispatchUi === 'chip'
  );
}

/** Same query param generation as records table (`FilterService`). */
export function buildDispatchFilterParams(
  filters: FilterConfig[],
  values: DispatchFilterValues
): URLSearchParams {
  const service = new FilterService(filters);
  const params = service.generateQueryParams(values as Record<string, unknown>);
  params.delete('entity_type');
  return params;
}
