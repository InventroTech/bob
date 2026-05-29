'use client';

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useMobileBackStack } from '@/hooks/useMobileBackStack';
import { ArrowLeft, ArrowUpDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/client';
import type { CrmRecord } from '@/lib/crmRecordsApi';
import type { DispatchCardListConfig } from '../DispatchCardListComponent';
import { DispatchDetailView } from './DispatchDetailView';
import { DispatchFilterSheet } from './DispatchFilterSheet';
import { DispatchFilterIcon } from './DispatchFilterIcon';
import { DispatchSortSheet } from './DispatchSortSheet';
import { DispatchListCard } from './DispatchListCard';
import { DEFAULT_DISPATCH_SORT_ID, getDispatchSortOrdering } from './dispatchSort';
import {
  buildDispatchFilterParams,
  cloneDispatchFilterValues,
  countActiveDispatchFilterValues,
  emptyDispatchFilterValues,
  getApiSelectFilters,
  mergeDispatchFilterValues,
  normalizeDispatchFilters,
  type DispatchFilterValues,
} from './dispatchMobileFilters';
import { fetchDispatchFilterOptions } from './fetchDispatchFilterOptions';
import { DEFAULT_DISPATCH_SEARCH_FIELDS } from './dispatchFieldSections';
import { DispatchSearchBox } from './DispatchSearchBox';
import { parseRecordListTotal } from './fetchDispatchDashboardStats';
import { Button } from '@/components/ui/button';
import type { FilterConfig, FilterOption } from '@/component-config/DynamicFilterConfig';

function coerceRecords(payload: unknown): CrmRecord[] {
  if (Array.isArray(payload)) return payload as CrmRecord[];
  if (payload && typeof payload === 'object') {
    const p = payload as { results?: unknown; data?: unknown };
    if (Array.isArray(p.results)) return p.results as CrmRecord[];
    if (Array.isArray(p.data)) return p.data as CrmRecord[];
  }
  return [];
}

export type DispatchRecordsPanelProps = {
  config?: DispatchCardListConfig;
  panelTitle?: string;
  showListHeading?: boolean;
  showYearBlock?: boolean;
  showSearch?: boolean;
  showSort?: boolean;
  showFilters?: boolean;
  lockedQueryParams?: URLSearchParams;
  fixedPageSize?: number;
  disableLoadMore?: boolean;
  initialSortId?: string;
  showBackButton?: boolean;
  onBack?: () => void;
  /** Optional class for the list heading (e.g. purple customer name). */
  titleClassName?: string;
};

export type DispatchRecordsPanelHandle = {
  /** Returns true if popstate was consumed (detail, filters, or sort). */
  handlePopState: () => boolean;
};

export const DispatchRecordsPanel = forwardRef<DispatchRecordsPanelHandle, DispatchRecordsPanelProps>(
  function DispatchRecordsPanel(
    {
      config,
      panelTitle,
      showListHeading = true,
      showYearBlock = true,
      showSearch = true,
      showSort = true,
      showFilters: showFiltersProp,
      lockedQueryParams,
      fixedPageSize,
      disableLoadMore = false,
      initialSortId = DEFAULT_DISPATCH_SORT_ID,
      showBackButton = false,
      onBack,
      titleClassName,
    },
    ref
  ) {
    const entityType = config?.entityType ?? 'dispatch_request';
    const apiEndpoint = config?.apiEndpoint ?? '/crm-records/records/';
    const searchFields = config?.searchFields ?? DEFAULT_DISPATCH_SEARCH_FIELDS;
    const pageSize = fixedPageSize ?? config?.pageSize ?? 50;
    const yearLabel = config?.yearLabel ?? new Date().getFullYear().toString();
    const periodLabel = config?.periodLabel ?? '';
    const showFiltersGlobally = showFiltersProp ?? config?.showFilters !== false;

    const lockedParamsKey = lockedQueryParams?.toString() ?? '';

    const mobileFilters = useMemo(
      () => normalizeDispatchFilters(config?.filters, entityType),
      [config?.filters, entityType]
    );

    const listCardFields = useMemo(
      () => ({
        titleField: config?.listTitleField ?? 'account_name',
        poField: config?.listPoField ?? 'po_number',
        dcNumberField: config?.listDcNumberField ?? 'dc_number',
        salesOrderField: config?.listSalesOrderField ?? 'sales_order_number',
        indexField: config?.listIndexField ?? 'engineer',
        dcDateField: config?.listDcDateField ?? 'dc_date',
      }),
      [config]
    );

    const [filterSheetOpen, setFilterSheetOpen] = useState(false);
    const [sortSheetOpen, setSortSheetOpen] = useState(false);
    const [appliedSortId, setAppliedSortId] = useState(initialSortId);
    const [draftSortId, setDraftSortId] = useState(initialSortId);
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
            console.warn(`[DispatchRecordsPanel] Failed to load filter options for ${filter.key}:`, err);
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
    const [listBusyMessage, setListBusyMessage] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [selected, setSelected] = useState<CrmRecord | null>(null);

    const [draftFilters, setDraftFilters] = useState<DispatchFilterValues>({});
    const [appliedFilters, setAppliedFilters] = useState<DispatchFilterValues>({});
    const [appliedFilterParams, setAppliedFilterParams] = useState(() => new URLSearchParams());

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
          params.set('ordering', getDispatchSortOrdering(appliedSortId));

          if (lockedQueryParams) {
            lockedQueryParams.forEach((_v, key) => {
              lockedQueryParams.getAll(key).forEach((v) => params.append(key, v));
            });
          }

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
          const total = parseRecordListTotal(response.data);

          setRecords((prev) => (append ? [...prev, ...batch] : batch));
          setHasMore(
            disableLoadMore ? false : total != null ? pageNum * pageSize < total : batch.length >= pageSize
          );
          setPage(pageNum);
        } catch (err) {
          console.error('[DispatchRecordsPanel] fetch failed', err);
          toast.error('Failed to load dispatch data');
          if (!append) setRecords([]);
        } finally {
          setLoading(false);
          setListBusyMessage(null);
        }
      },
      [
        apiEndpoint,
        entityType,
        pageSize,
        debouncedSearch,
        searchFields,
        appliedFilterParams,
        appliedSortId,
        lockedParamsKey,
        disableLoadMore,
        lockedQueryParams,
      ]
    );

    useEffect(() => {
      fetchPage(1, false);
    }, [fetchPage]);

    const { pushOverlay, closeOverlay, consumeBackNavigation, onPopState } = useMobileBackStack();
    const filterOpenRef = useRef(filterSheetOpen);
    const sortOpenRef = useRef(sortSheetOpen);
    const selectedRef = useRef(selected);
    filterOpenRef.current = filterSheetOpen;
    sortOpenRef.current = sortSheetOpen;
    selectedRef.current = selected;

    const handlePopStateInternal = useCallback((): boolean => {
      const overlay = consumeBackNavigation();
      if (overlay === 'filters' || filterOpenRef.current) {
        setFilterSheetOpen(false);
        return true;
      }
      if (overlay === 'sort' || sortOpenRef.current) {
        setSortSheetOpen(false);
        return true;
      }
      if (overlay === 'detail' || selectedRef.current) {
        setSelected(null);
        return true;
      }
      return false;
    }, [consumeBackNavigation]);

    useImperativeHandle(ref, () => ({
      handlePopState: handlePopStateInternal,
    }));

    useEffect(() => {
      return onPopState(() => {
        handlePopStateInternal();
        return null;
      });
    }, [onPopState, handlePopStateInternal]);

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

    const closeSortSheet = useCallback(() => {
      setSortSheetOpen(false);
      closeOverlay('sort');
    }, [closeOverlay]);

    const listTitle = (panelTitle ?? config?.title ?? 'DISPATCH DATA').toUpperCase();

    const handleApplyFilters = () => {
      const nextApplied = cloneDispatchFilterValues(draftFilters);
      setListBusyMessage('Applying filters…');
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

    const openSortSheet = () => {
      setDraftSortId(appliedSortId);
      if (!sortSheetOpen) {
        setSortSheetOpen(true);
        pushOverlay('sort');
      }
    };

    const handleApplySort = () => {
      setListBusyMessage('Applying sort…');
      setAppliedSortId(draftSortId);
      closeSortSheet();
    };

    const handleResetSort = () => {
      setListBusyMessage('Applying sort…');
      setAppliedSortId(initialSortId);
      setDraftSortId(initialSortId);
      closeSortSheet();
    };

    const sortIsCustom = appliedSortId !== initialSortId;

    const handleClearFilters = () => {
      const empty = emptyDispatchFilterValues(effectiveFilters);
      setListBusyMessage('Clearing filters…');
      setDraftFilters(empty);
      setAppliedFilters(empty);
      setAppliedFilterParams(new URLSearchParams());
    };

    const handlePanelBack = () => {
      if (selected) {
        closeDetail();
        return;
      }
      onBack?.();
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

        {(showBackButton || showListHeading) && (
          <div className="px-4 pb-2 pt-4">
            {showBackButton ? (
              <button
                type="button"
                onClick={handlePanelBack}
                className="mb-2 flex items-center gap-1 text-sm font-medium text-[#1e3a5f]"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
            ) : null}
            {showListHeading ? (
              <>
                <h1
                  className={`text-xl font-bold uppercase tracking-wide ${titleClassName ?? 'text-gray-900'}`}
                >
                  {listTitle}
                </h1>
                <div className="mt-3 h-px w-full bg-gray-300" />
              </>
            ) : null}
          </div>
        )}

        {(showSearch || showSort || showFiltersGlobally) && (
          <div className="flex items-center gap-2 px-4 py-3">
            {showSearch ? (
              <DispatchSearchBox
                value={search}
                onChange={setSearch}
                onCommit={(v) => {
                  setSearch(v);
                  setDebouncedSearch(v);
                }}
                entityType={entityType}
                apiEndpoint={apiEndpoint}
                searchFields={searchFields}
              />
            ) : (
              <div className="flex-1" />
            )}
            {showSort ? (
              <button
                type="button"
                onClick={openSortSheet}
                className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-300 bg-white shadow-sm"
                aria-label="Sort"
              >
                <ArrowUpDown className="h-4 w-4 text-gray-700" strokeWidth={2.25} />
                {sortIsCustom ? (
                  <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-[#7c3aed] ring-2 ring-white" />
                ) : null}
              </button>
            ) : null}
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
        )}

        <DispatchSortSheet
          open={sortSheetOpen}
          onOpenChange={(open) => {
            if (open) {
              setDraftSortId(appliedSortId);
              if (!sortSheetOpen) {
                setSortSheetOpen(true);
                pushOverlay('sort');
              }
            } else if (sortSheetOpen) {
              closeSortSheet();
            }
          }}
          draftSortId={draftSortId}
          onDraftSortIdChange={setDraftSortId}
          onApply={handleApplySort}
          onReset={handleResetSort}
        />

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

        {showYearBlock ? (
          <div className="px-4 pb-2 pt-1">
            <p className="text-3xl font-bold leading-none text-gray-900">{yearLabel}</p>
            {periodLabel ? (
              <p className="mt-1 text-sm font-medium uppercase tracking-wide text-gray-600">{periodLabel}</p>
            ) : null}
          </div>
        ) : null}

        <div className="relative flex-1 overflow-hidden">
          {loading && listBusyMessage ? (
            <div
              className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/85 px-6 backdrop-blur-[2px]"
              role="status"
              aria-live="polite"
              aria-busy="true"
            >
              <Loader2 className="h-9 w-9 animate-spin text-[#7c3aed]" aria-hidden />
              <p className="mt-3 text-center text-sm font-semibold text-gray-800">{listBusyMessage}</p>
              <p className="mt-1 text-center text-xs text-gray-500">Please wait</p>
            </div>
          ) : null}
          <div className="h-full space-y-3 overflow-y-auto px-4 pb-8">
            {loading && records.length === 0 && !listBusyMessage ? (
              <p className="py-8 text-center text-sm text-gray-500">Loading…</p>
            ) : loading && records.length === 0 && listBusyMessage ? (
              <p className="sr-only">{listBusyMessage}</p>
            ) : records.length === 0 && !loading ? (
              <p className="py-8 text-center text-sm text-gray-500">No dispatch records found.</p>
            ) : (
              records.map((record, i) => (
                <DispatchListCard
                  key={String(record.id ?? i)}
                  record={record}
                  fields={listCardFields}
                  onClick={() => openDetail(record)}
                />
              ))
            )}
            {hasMore && !loading && !disableLoadMore ? (
              <Button
                variant="outline"
                className="w-full rounded-full"
                onClick={() => fetchPage(page + 1, true)}
              >
                Load more
              </Button>
            ) : null}
            {loading && records.length > 0 && !listBusyMessage ? (
              <p className="text-center text-xs text-gray-500">Updating…</p>
            ) : null}
          </div>
        </div>
      </div>
    );
  }
);
