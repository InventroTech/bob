import type { FilterConfig, FilterOption } from '@/component-config/DynamicFilterConfig';
import { FilterService } from '@/services/filterService';

const getNestedValue = (source: unknown, path: string): unknown => {
  if (!source || !path) return undefined;
  return path
    .split('.')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .reduce((current: unknown, key) => {
      if (current === undefined || current === null) return undefined;
      return (current as Record<string, unknown>)[key];
    }, source);
};

/** Parse API dropdown payloads (same shapes as LeadTableComponent). */
export function parseFilterOptionsFromApiResponse(
  raw: unknown,
  displayKey: string,
  valueKey: string
): FilterOption[] {
  let arr: unknown[] = [];
  if (Array.isArray(raw)) {
    arr = raw;
  } else if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.results)) arr = obj.results;
    else if (Array.isArray(obj.data)) arr = obj.data;
    else if (Array.isArray(obj.values)) {
      arr = (obj.values as unknown[]).map((v) =>
        typeof v === 'string' || typeof v === 'number'
          ? { label: String(v), value: String(v) }
          : v
      );
    }
  }

  return (arr as Record<string, unknown>[])
    .map((item) => {
      const displayRaw = displayKey.includes('.')
        ? getNestedValue(item, displayKey)
        : item?.[displayKey];
      const valueRaw = valueKey.includes('.') ? getNestedValue(item, valueKey) : item?.[valueKey];
      return {
        label: String(displayRaw ?? ''),
        value: String(valueRaw ?? ''),
      };
    })
    .filter((o) => o.value !== '');
}

/** Same shape as records table filter state (`useFilters`). */
export type DispatchFilterValues = Record<string, unknown>;

/** Default mobile filters — order and layout match Figma. */
export const DEFAULT_DISPATCH_MOBILE_FILTERS: FilterConfig[] = [
  {
    key: 'engineer',
    label: 'Engineer',
    type: 'select',
    accessor: 'engineer',
    dispatchWidth: 'full',
    placeholder: 'Select engineer',
    optionsApiUrl:
      '/crm-records/records/distinct-values/?entity_type=dispatch_request&field=engineer',
    optionsDisplayKey: 'label',
    optionsValueKey: 'value',
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
    type: 'date_exact',
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

export function buildDistinctValuesApiUrl(entityType: string, field: string): string {
  const params = new URLSearchParams({
    entity_type: entityType,
    field,
  });
  return `/crm-records/records/distinct-values/?${params.toString()}`;
}

function applyEngineerSelectDefaults(f: FilterConfig, entityType: string): FilterConfig {
  const field = (f.accessor || f.key || '').trim();
  if (field !== 'engineer') return f;

  return {
    ...f,
    type: 'select',
    accessor: field,
    placeholder: f.placeholder || 'Select engineer',
    optionsApiUrl: f.optionsApiUrl?.trim() || buildDistinctValuesApiUrl(entityType, 'engineer'),
    optionsDisplayKey: f.optionsDisplayKey?.trim() || 'label',
    optionsValueKey: f.optionsValueKey?.trim() || 'value',
  };
}

export function normalizeDispatchFilters(
  filters?: FilterConfig[],
  entityType = 'dispatch_request'
): FilterConfig[] {
  const source = filters?.length ? filters : DEFAULT_DISPATCH_MOBILE_FILTERS;

  const seenKeys = new Set<string>();
  const slugify = (s: string) =>
    s.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

  return source.map((f, idx) => {
    let key = (f.key || '').trim() || (f.accessor || '').trim();
    if (!key && f.label) key = slugify(f.label);
    if (!key) key = `filter_${idx}`;
    let uniqueKey = key;
    let n = 1;
    while (seenKeys.has(uniqueKey)) uniqueKey = `${key}_${n++}`;
    seenKeys.add(uniqueKey);

    const normalized: FilterConfig = {
      ...f,
      key: uniqueKey,
      accessor: (f.accessor || uniqueKey).trim(),
    };

    return applyEngineerSelectDefaults(normalized, entityType);
  });
}

export type ApiSelectFilter = FilterConfig & {
  optionsApiUrl: string;
  optionsDisplayKey: string;
  optionsValueKey: string;
};

export function getApiSelectFilters(filters: FilterConfig[]): ApiSelectFilter[] {
  return filters.filter(
    (f): f is ApiSelectFilter =>
      f.type === 'select' &&
      !!(f.optionsApiUrl?.trim() && f.optionsDisplayKey?.trim() && f.optionsValueKey?.trim())
  );
}

/** Rewrite entity_type in distinct-values URLs to match the component config. */
export function resolveFilterOptionsApiUrl(filter: FilterConfig, entityType: string): string {
  const raw = (filter.optionsApiUrl || '').trim();
  if (!raw) return buildDistinctValuesApiUrl(entityType, filter.accessor || filter.key);

  if (raw.includes('distinct-values')) {
    try {
      const path = raw.startsWith('http') ? raw : `https://local${raw.startsWith('/') ? '' : '/'}${raw}`;
      const url = new URL(path);
      if (url.searchParams.has('entity_type')) {
        url.searchParams.set('entity_type', entityType);
      }
      const field = url.searchParams.get('field') || filter.accessor || filter.key;
      if (!url.searchParams.has('field') && field) {
        url.searchParams.set('field', field);
      }
      return `${url.pathname}${url.search}`;
    } catch {
      return buildDistinctValuesApiUrl(entityType, filter.accessor || filter.key);
    }
  }

  return raw.startsWith('/') ? raw : `/${raw}`;
}

export type DispatchFilterRow = {
  rowId: string;
  fields: FilterConfig[];
};

/** @deprecated Use layoutDispatchFilterRows for rendering. */
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

export type DispatchFilterLayout = 'stack' | 'grid-2' | 'row-start';

export type DispatchFilterLayoutGroup = {
  key: string;
  layout: DispatchFilterLayout;
  fields: FilterConfig[];
};

/** Fields that stay full-width unless Width = half is set explicitly. */
export function forcesFullWidthField(filter: FilterConfig): boolean {
  if (filter.dispatchWidth === 'half') return false;
  if (filter.type === 'date_range' || filter.type === 'date_time_range') return true;
  if (filter.dispatchUi === 'segment') return true;
  return false;
}

/**
 * Build render groups respecting Page Builder Width (half / full) and Row group.
 * Half width: pairs with the next half-width filter in list order (50% column each).
 */
export function layoutDispatchFilterRows(filters: FilterConfig[]): DispatchFilterLayoutGroup[] {
  const groups: DispatchFilterLayoutGroup[] = [];
  const seenRowIds = new Set<string>();
  const halfQueue: FilterConfig[] = [];

  const emitHalfQueue = () => {
    if (!halfQueue.length) return;
    groups.push({
      key: `half-${halfQueue.map((f) => f.key).join('_')}`,
      layout: 'grid-2',
      fields: halfQueue.splice(0, halfQueue.length),
    });
  };

  const emitStack = (field: FilterConfig) => {
    groups.push({ key: `stack-${field.key}`, layout: 'stack', fields: [field] });
  };

  for (const field of filters) {
    const rowId = field.dispatchRow?.trim();

    if (rowId) {
      if (seenRowIds.has(rowId)) continue;
      seenRowIds.add(rowId);
      emitHalfQueue();

      const rowFields = filters.filter((f) => f.dispatchRow?.trim() === rowId);

      if (rowId === 'row_start') {
        groups.push({ key: 'row-start', layout: 'row-start', fields: rowFields });
        continue;
      }

      const useGrid =
        rowFields.length >= 1 &&
        rowFields.every(
          (f) =>
            f.dispatchWidth === 'half' ||
            f.type === 'date_gte' ||
            f.type === 'date_lte' ||
            f.type === 'date_exact'
        ) &&
        !rowFields.some((f) => forcesFullWidthField(f) && f.dispatchWidth !== 'half');

      if (useGrid && rowFields.length <= 2) {
        groups.push({ key: `row-${rowId}`, layout: 'grid-2', fields: rowFields });
      } else {
        for (const f of rowFields) {
          if (f.dispatchWidth === 'half' && !forcesFullWidthField(f)) {
            halfQueue.push(f);
            if (halfQueue.length === 2) emitHalfQueue();
          } else {
            emitHalfQueue();
            emitStack(f);
          }
        }
      }
      continue;
    }

    if (field.dispatchWidth === 'half' && !forcesFullWidthField(field)) {
      halfQueue.push(field);
      if (halfQueue.length === 2) emitHalfQueue();
    } else {
      emitHalfQueue();
      emitStack(field);
    }
  }

  emitHalfQueue();
  return groups;
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
    case 'date_exact':
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

/** Keep applied/draft values when filter options load; only add keys for new filters. */
export function mergeDispatchFilterValues(
  existing: DispatchFilterValues,
  filters: FilterConfig[]
): DispatchFilterValues {
  const merged: DispatchFilterValues = {};

  for (const f of filters) {
    if (f.key in existing) {
      merged[f.key] = existing[f.key];
    } else {
      merged[f.key] = getEmptyValueForFilter(f);
    }
  }

  return merged;
}

/** Copy draft so editing in the sheet does not mutate applied state. */
export function cloneDispatchFilterValues(values: DispatchFilterValues): DispatchFilterValues {
  const out: DispatchFilterValues = {};
  for (const [key, value] of Object.entries(values)) {
    if (value instanceof Date) {
      out[key] = new Date(value.getTime());
    } else if (Array.isArray(value)) {
      out[key] = [...value];
    } else if (value && typeof value === 'object') {
      out[key] = { ...(value as Record<string, unknown>) };
    } else {
      out[key] = value;
    }
  }
  return out;
}

/** Mirrors `useFilters` `isFilterActive` for badge count. */
export function isDispatchFilterActive(key: string, values: DispatchFilterValues): boolean {
  const value = values[key];
  if (value instanceof Date) return !isNaN(value.getTime());
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object' && value !== null) {
    const range = value as { start?: unknown; end?: unknown };
    if ('start' in range || 'end' in range) {
      return !!(range.start || range.end);
    }
    return false;
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
    case 'date_exact':
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

/** @deprecated Layout handled by layoutDispatchFilterRows. */
export function fieldSpansFullRow(filter: FilterConfig): boolean {
  return forcesFullWidthField(filter) || filter.dispatchWidth === 'full';
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
