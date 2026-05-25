'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMobileBackStack } from '@/hooks/useMobileBackStack';
import { Search } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/client';
import type { CrmRecord } from '@/lib/crmRecordsApi';
import { DispatchDetailView } from './dispatch/DispatchDetailView';
import { DispatchFilterSheet } from './dispatch/DispatchFilterSheet';
import { DispatchFilterIcon } from './dispatch/DispatchFilterIcon';
import {
  buildDispatchFilterParams,
  cloneDispatchFilterValues,
  countActiveDispatchFilterValues,
  emptyDispatchFilterValues,
  getApiSelectFilters,
  mergeDispatchFilterValues,
  normalizeDispatchFilters,
  type DispatchFilterValues,
} from './dispatch/dispatchMobileFilters';
import { fetchDispatchFilterOptions } from './dispatch/fetchDispatchFilterOptions';
import { DEFAULT_DISPATCH_SEARCH_FIELDS } from './dispatch/dispatchFieldSections';
import {
  DISPATCH_NO_DATA,
  formatDispatchValue,
  getRecordData,
} from './dispatch/formatDispatchValue';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { FilterConfig, FilterOption } from '@/component-config/DynamicFilterConfig';

export type DispatchCardListConfig = {
  title?: string;
  subtitle?: string;
  entityType?: string;
  apiEndpoint?: string;
  searchFields?: string;
  pageSize?: number;
  yearLabel?: string;
  periodLabel?: string;
  hidePageHeader?: boolean;
  listTitleField?: string;
  listPoField?: string;
  listSalesOrderField?: string;
  listIndexField?: string;
  filters?: FilterConfig[];
  showFilters?: boolean;
};

function coerceRecords(payload: unknown): CrmRecord[] {
  if (Array.isArray(payload)) return payload as CrmRecord[];
  if (payload && typeof payload === 'object') {
    const p = payload as { results?: unknown; data?: unknown };
    if (Array.isArray(p.results)) return p.results as CrmRecord[];
    if (Array.isArray(p.data)) return p.data as CrmRecord[];
  }
  return [];
}

function DispatchListCard({
  record,
  index,
  titleField,
  poField,
  salesOrderField,
  indexField,
  onClick,
}: {
  record: CrmRecord;
  index: number;
  titleField: string;
  poField: string;
  salesOrderField: string;
  indexField: string;
  onClick: () => void;
}) {
  const data = getRecordData(record);
  const titleVal = formatDispatchValue(data[titleField]);
  const po = formatDispatchValue(data[poField]);
  const so = formatDispatchValue(data[salesOrderField]);
  const topLeft = formatDispatchValue(data[indexField]);

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-2xl border-2 border-[#7c3aed]/40 bg-white p-4 text-left shadow-[0_2px_12px_rgba(124,58,237,0.15)] transition active:scale-[0.99]"
    >
      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
        <p className="line-clamp-1 text-xs font-medium text-gray-600">{topLeft}</p>
        <p className="text-right text-xs text-gray-600">
          <span className="text-gray-500">Po # :</span>{' '}
          <span className="font-semibold text-gray-800">{po}</span>
        </p>
        <p className="line-clamp-2 text-sm font-bold uppercase leading-snug text-gray-900">{titleVal}</p>
        {so !== DISPATCH_NO_DATA ? (
          <p className="text-right text-xs font-semibold text-gray-800 line-clamp-2">{so}</p>
        ) : (
          <span />
        )}
      </div>
    </button>
  );
}

interface DispatchCardListProps {
  config?: DispatchCardListConfig;
}

export const DispatchCardListComponent: React.FC<DispatchCardListProps> = ({ config }) => {
  const entityType = config?.entityType ?? 'dispatch_request';
  const apiEndpoint = config?.apiEndpoint ?? '/crm-records/records/';
  const searchFields = config?.searchFields ?? DEFAULT_DISPATCH_SEARCH_FIELDS;
  const pageSize = config?.pageSize ?? 50;
  const yearLabel = config?.yearLabel ?? new Date().getFullYear().toString();
  const periodLabel = config?.periodLabel ?? '';
  const showFiltersGlobally = config?.showFilters !== false;

  const mobileFilters = useMemo(
    () => normalizeDispatchFilters(config?.filters, entityType),
    [config?.filters, entityType]
  );

  const listTitleField = config?.listTitleField ?? 'account_name';
  const listPoField = config?.listPoField ?? 'po_number';
  const listSalesOrderField = config?.listSalesOrderField ?? 'sales_order_number';
  const listIndexField = config?.listIndexField ?? 'engineer';

  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [resolvedFilterOptions, setResolvedFilterOptions] = useState<Record<string, FilterOption[]>>({});
  const [filterOptionsLoading, setFilterOptionsLoading] = useState<Record<string, boolean>>({});
  const [filterOptionsError, setFilterOptionsError] = useState<Record<string, string>>({});

  const loadFilterOptions = useCallback(async () => {
    const apiSelectFilters = getApiSelectFilters(mobileFilters);
    if (!apiSelectFilters.length) {
      setResolvedFilterOptions({});
      setFilterOptionsLoading({});
      setFilterOptionsError({});
      return;
    }

    const loading: Record<string, boolean> = {};
    apiSelectFilters.forEach((f) => {
      loading[f.key] = true;
    });
    setFilterOptionsLoading(loading);

    await Promise.all(
      apiSelectFilters.map(async (filter) => {
        try {
          const options = await fetchDispatchFilterOptions(filter, apiClient, entityType);
          setResolvedFilterOptions((p) => ({ ...p, [filter.key]: options }));
          setFilterOptionsError((p) => {
            const next = { ...p };
            delete next[filter.key];
            return next;
          });
        } catch (err) {
          console.warn(`[DispatchCardList] Failed to load filter options for ${filter.key}:`, err);
          setResolvedFilterOptions((p) => ({ ...p, [filter.key]: [] }));
          setFilterOptionsError((p) => ({
            ...p,
            [filter.key]: 'Could not load options',
          }));
        } finally {
          setFilterOptionsLoading((p) => ({ ...p, [filter.key]: false }));
        }
      })
    );
  }, [mobileFilters, entityType]);

  useEffect(() => {
    loadFilterOptions();
  }, [loadFilterOptions]);

  useEffect(() => {
    if (filterSheetOpen) {
      loadFilterOptions();
    }
  }, [filterSheetOpen, loadFilterOptions]);

  const effectiveFilters = useMemo(
    () =>
      mobileFilters.map((f) => {
        if (f.type === 'select' && f.optionsApiUrl && f.key in resolvedFilterOptions) {
          return { ...f, options: resolvedFilterOptions[f.key] };
        }
        return f;
      }),
    [mobileFilters, resolvedFilterOptions]
  );

  const [records, setRecords] = useState<CrmRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selected, setSelected] = useState<CrmRecord | null>(null);

  const [draftFilters, setDraftFilters] = useState<DispatchFilterValues>({});
  const [appliedFilters, setAppliedFilters] = useState<DispatchFilterValues>({});
  const [appliedFilterParams, setAppliedFilterParams] = useState(() => new URLSearchParams());

  // When filter config/options load, add new keys only — never wipe applied filters.
  useEffect(() => {
    setDraftFilters((prev) => mergeDispatchFilterValues(prev, effectiveFilters));
    setAppliedFilters((prev) => mergeDispatchFilterValues(prev, effectiveFilters));
  }, [effectiveFilters]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  const activeFilterCount = countActiveDispatchFilterValues(effectiveFilters, appliedFilters);

  const fetchPage = useCallback(
    async (pageNum: number, append: boolean) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('entity_type', entityType);
        params.set('page', String(pageNum));
        params.set('page_size', String(pageSize));
        params.set('ordering', '-updated_at');

        appliedFilterParams.forEach((_v, key) => {
          appliedFilterParams.getAll(key).forEach((v) => params.append(key, v));
        });

        if (debouncedSearch) {
          params.set('search', debouncedSearch);
          params.set('search_fields', searchFields);
        }

        const base = apiEndpoint.split('?')[0];
        const response = await apiClient.get(`${base}?${params.toString()}`);
        const batch = coerceRecords(response.data);
        const total =
          response.data && typeof response.data === 'object' && 'count' in (response.data as object)
            ? Number((response.data as { count?: number }).count)
            : null;

        setRecords((prev) => (append ? [...prev, ...batch] : batch));
        setHasMore(total != null ? pageNum * pageSize < total : batch.length >= pageSize);
        setPage(pageNum);
      } catch (err) {
        console.error('[DispatchCardList] fetch failed', err);
        toast.error('Failed to load dispatch data');
        if (!append) setRecords([]);
      } finally {
        setLoading(false);
      }
    },
    [apiEndpoint, entityType, pageSize, debouncedSearch, searchFields, appliedFilterParams]
  );

  useEffect(() => {
    fetchPage(1, false);
  }, [fetchPage]);

  const { pushOverlay, closeOverlay, consumeBackNavigation, onPopState } = useMobileBackStack();
  const filterOpenRef = useRef(filterSheetOpen);
  const selectedRef = useRef(selected);
  filterOpenRef.current = filterSheetOpen;
  selectedRef.current = selected;

  useEffect(() => {
    return onPopState(() => {
      const overlay = consumeBackNavigation();
      if (overlay === 'filters' || filterOpenRef.current) {
        setFilterSheetOpen(false);
        return 'filters';
      }
      if (overlay === 'detail' || selectedRef.current) {
        setSelected(null);
        return 'detail';
      }
      return null;
    });
  }, [onPopState, consumeBackNavigation]);

  const closeDetail = useCallback(() => {
    setSelected(null);
    closeOverlay('detail');
  }, [closeOverlay]);

  const openDetail = useCallback(
    (record: CrmRecord) => {
      setSelected(record);
      pushOverlay('detail');
    },
    [pushOverlay]
  );

  useEffect(() => {
    if (!selected) return;
    const main = document.querySelector('main');
    const prevBody = document.body.style.overflow;
    const prevMain = main instanceof HTMLElement ? main.style.overflow : '';
    document.body.style.overflow = 'hidden';
    if (main instanceof HTMLElement) main.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevBody;
      if (main instanceof HTMLElement) main.style.overflow = prevMain;
    };
  }, [selected]);

  const closeFilterSheet = useCallback(() => {
    setFilterSheetOpen(false);
    closeOverlay('filters');
  }, [closeOverlay]);

  const listTitle = (config?.title ?? 'DISPATCH DATA').toUpperCase();

  const handleApplyFilters = () => {
    const nextApplied = cloneDispatchFilterValues(draftFilters);
    setAppliedFilters(nextApplied);
    setAppliedFilterParams(buildDispatchFilterParams(effectiveFilters, nextApplied));
    closeFilterSheet();
  };

  const openFilterSheet = () => {
    setDraftFilters(cloneDispatchFilterValues(appliedFilters));
    if (!filterSheetOpen) {
      setFilterSheetOpen(true);
      pushOverlay('filters');
    }
  };

  const handleClearFilters = () => {
    const empty = emptyDispatchFilterValues(effectiveFilters);
    setDraftFilters(empty);
    setAppliedFilters(empty);
    setAppliedFilterParams(new URLSearchParams());
  };

  return (
    <div className="relative mx-auto flex min-h-[calc(100dvh-56px)] max-w-lg flex-col bg-white md:max-w-2xl">
      {selected ? (
        <div
          className="fixed inset-x-0 bottom-0 z-50 mx-auto flex h-[calc(100dvh-56px)] max-h-[calc(100dvh-56px)] w-full max-w-lg flex-col overflow-hidden bg-[#f3f4f6] md:max-w-2xl"
          style={{ top: 56 }}
        >
          <DispatchDetailView record={selected} onBack={closeDetail} />
        </div>
      ) : null}
      <div className="px-4 pb-2 pt-4">
        <h1 className="text-xl font-bold uppercase tracking-wide text-gray-900">{listTitle}</h1>
        <div className="mt-3 h-px w-full bg-gray-300" />
      </div>

      <div className="flex items-center gap-2 px-4 py-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            className="rounded-full border-gray-300 pl-9"
          />
        </div>
        {showFiltersGlobally ? (
          <button
            type="button"
            onClick={openFilterSheet}
            className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-300 bg-white shadow-sm"
            aria-label="Filters"
          >
            <DispatchFilterIcon />
            {activeFilterCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#7c3aed] px-1 text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            ) : null}
          </button>
        ) : null}
      </div>

      <DispatchFilterSheet
        open={filterSheetOpen}
        onOpenChange={(open) => {
          if (open) {
            setDraftFilters(cloneDispatchFilterValues(appliedFilters));
            if (!filterSheetOpen) {
              setFilterSheetOpen(true);
              pushOverlay('filters');
            }
          } else if (filterSheetOpen) {
            closeFilterSheet();
          }
        }}
        filters={effectiveFilters}
        filterOptionsLoading={filterOptionsLoading}
        filterOptionsError={filterOptionsError}
        draft={draftFilters}
        onDraftChange={setDraftFilters}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
      />

      <div className="px-4 pb-2 pt-1">
        <p className="text-3xl font-bold leading-none text-gray-900">{yearLabel}</p>
        {periodLabel ? (
          <p className="mt-1 text-sm font-medium uppercase tracking-wide text-gray-600">{periodLabel}</p>
        ) : null}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 pb-8">
        {loading && records.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">Loading…</p>
        ) : records.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">No dispatch records found.</p>
        ) : (
          records.map((record, i) => (
            <DispatchListCard
              key={String(record.id ?? i)}
              record={record}
              index={i}
              titleField={listTitleField}
              poField={listPoField}
              salesOrderField={listSalesOrderField}
              indexField={listIndexField}
              onClick={() => openDetail(record)}
            />
          ))
        )}
        {hasMore && !loading ? (
          <Button variant="outline" className="w-full rounded-full" onClick={() => fetchPage(page + 1, true)}>
            Load more
          </Button>
        ) : null}
        {loading && records.length > 0 ? (
          <p className="text-center text-xs text-gray-500">Updating…</p>
        ) : null}
      </div>
    </div>
  );
};
