'use client';

/** State, effects, and handlers for the lead table. */

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import type { LeadCardCarouselHandle } from '../lead-card-carousel';
import { useAuth } from '@/hooks/useAuth';
import { useTenant } from '@/hooks/useTenant';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { User, MessageCircle, ExternalLink } from 'lucide-react';
import ShortProfileCard from '../../ui/ShortProfileCard';
import { Input } from '@/components/ui/input';
import { FilterConfig, FilterOption } from '@/component-config/DynamicFilterConfig';
import { useFilters } from '@/hooks/useFilters';
import { REALTIME_LIST_DEBOUNCE_MS, useRecordUpdated } from '@/hooks/useRecordUpdated';
import type { RecordUpdatedPayload } from '@/lib/realtime/types';
import { FilterService } from '@/services/filterService';
import { apiClient } from '@/lib/api';
import { CustomButton } from '@/components/ui/CustomButton';
import type { CustomTableColumn } from '@/components/ui/CustomTable';
import { buildActionApiRequest } from '@/lib/utils/actionApiUtils';
import { getEffectiveToken, useSpoofUserId } from '@/lib/auth/spoof';
import { formatCurrencyDisplay, PRICE_FIELD_KEYS } from '@/lib/utils/currencyFormat';
import { formatCalendarDate, formatTableDateShort } from '@/lib/utils/timeUtils';
import { urgencyToneButtonClassName } from '@/lib/utils/urgencyButtonStyles';
import { getInventoryStatusToneClass, getShipmentStatusLabel, getShipmentStatusToneClass } from '@/lib/inventory/statusStyles';
import {
  formatInventoryPriorityLabel,
  formatInventoryPriorityShortLabel,
  inventoryPriorityChipClassName,
  normalizeInventoryPriorityLevel,
} from '@/lib/inventory/priority';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import type { Column, LeadTableProps, PlaceholderAdapter } from './types';
import {
  URGENCY_BUTTON_OPTIONS,
  defaultColumns,
  REQUESTER_EDIT_COLUMN_ACCESSOR,
} from './constants';
import {
  getStatusColor,
  toVendorStorageName,
  getNestedValue,
  applyPlaceholderTemplate,
  transformLeadData,
  formatBulkActionLabel,
  resolveEffectiveInventoryTableKind,
} from './utils';
import { useInventoryTablePageName } from './InventoryTablePageContext';
import {
  applyInventoryCartStatusSideEffects,
  canRequesterEditInventoryRequest,
  filterDuplicateInventoryWorkflowButtons,
  getInventoryWorkflowButtons,
  isInventoryOpsEditorRole,
  isInventoryRequestRowRequester,
} from '@/lib/inventory/workflow';
import { advanceShipmentStatusForTracking, excludeInventoryTrackColumn, SHIPMENT_STATUSES } from '@/lib/inventory/shipmentTracking';

/** Uniform rounded-rectangle chips for All Requests priority / status / shipment. */
const INVENTORY_CHIP_SHAPE =
  '!rounded-[8px] inline-flex h-7 shrink-0 items-center justify-center px-3 text-xs font-semibold uppercase tracking-wide overflow-hidden text-ellipsis whitespace-nowrap border';

function bulkActionButtonKey(btn: { statusValue: string; targetAttribute?: string }): string {
  return `${btn.statusValue}::${(btn.targetAttribute || 'status').trim() || 'status'}`;
}

function normalizeBulkRowId(id: unknown): string | null {
  if (id == null || id === '') return null;
  return String(id);
}

function getBulkRowStatus(row: any): string {
  const raw =
    (row?.data && typeof row.data === 'object' ? (row.data as Record<string, unknown>).status : undefined) ??
    row?.status;
  return String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_');
}

const INVENTORY_PRIORITY_CHIP_SIZE = `${INVENTORY_CHIP_SHAPE} w-[5rem] min-w-[4.5rem]`;
const INVENTORY_STATUS_CHIP_SIZE = `${INVENTORY_CHIP_SHAPE} w-[9.5rem] min-w-[6.5rem]`;

const OPS_SHIPMENT_OPTIONS = ['N/A', ...SHIPMENT_STATUSES] as const;
const OPS_EDIT_BTN =
  'h-[23px] w-[55px] min-w-[55px] justify-center rounded-[6px] border-0 bg-[linear-gradient(180deg,#2885FF_0%,#0A5ECD_100%)] px-0 text-xs font-semibold text-white hover:brightness-105 hover:text-white';
const OPS_SAVE_BTN =
  'h-[23px] w-[55px] min-w-[55px] justify-center rounded-[6px] border-0 bg-[linear-gradient(180deg,#11243C_0%,#2E60A2_100%)] px-0 text-xs font-semibold text-white hover:brightness-110 hover:text-white';

/** All Requests: fixed rem widths on data columns; item name absorbs the rest (no gaping chips). */
function procurementColumnLayout(
  accessor: string
): { width?: string; minWidth?: string; maxWidth?: string } | undefined {
  const key = String(accessor || '').trim().toLowerCase();
  const chipCol = { width: '11rem', minWidth: '11rem', maxWidth: '11rem' };
  const priorityCol = { width: '6.5rem', minWidth: '6.5rem', maxWidth: '6.5rem' };
  const dateCol = { width: '5.75rem', minWidth: '5.75rem', maxWidth: '6rem' };
  const costCol = { width: '6.75rem', minWidth: '6.75rem', maxWidth: '7.25rem' };
  const vendorCol = { width: '5rem', minWidth: '5rem', maxWidth: '5.5rem' };
  const requesterCol = { width: '7.5rem', minWidth: '7.5rem', maxWidth: '9rem' };
  const editCol = { width: '4.25rem', minWidth: '4.25rem', maxWidth: '4.25rem' };
  const layouts: Record<string, { width?: string; minWidth?: string; maxWidth?: string }> = {
    item_name_freeform: {},
    item_name: {},
    requester_name: requesterCol,
    estimated_cost: costCol,
    vendor: vendorCol,
    request_date: dateCol,
    eta: dateCol,
    urgency_level: priorityCol,
    priority: priorityCol,
    status: chipCol,
    shipment_status: chipCol,
    [REQUESTER_EDIT_COLUMN_ACCESSOR]: editCol,
    edit: editCol,
  };
  return layouts[key];
}

export function useLeadTable({ config, pageId }: LeadTableProps) {
  const { toast } = useToast();
  /** In Page Builder we disable row-click modal so editing isn't interrupted; modal opens on row click only on the live page. */
  const isInPageBuilder = typeof pageId !== 'undefined';
  const [data, setData] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [isRecordDetailModalOpen, setIsRecordDetailModalOpen] = useState(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [actionButtonsVisible, setActionButtonsVisible] = useState(false);
  const [isCallBackModalOpen, setIsCallBackModalOpen] = useState(false);
  const leadCardRef = useRef<LeadCardCarouselHandle | null>(null);

  // Effective detail mode: explicit config or infer from entityType (inventory_* → record detail, else lead card)
  const effectiveDetailMode = useMemo(() => {
    const mode = config?.detailMode;
    if (mode && mode !== 'auto') return mode;
    const et = config?.entityType;
    if (et === 'inventory_request') return 'inventory_request' as const;
    return 'lead_card';
  }, [config?.detailMode, config?.entityType]);

  /** Use form-style modal when detail mode is record_form_modal, inventory_payment_modal, or form_edit.
   * Always use form modal for inventory requests so Approve/Reject render in the footer. */
  const useFormModal =
    effectiveDetailMode === 'record_form_modal' ||
    effectiveDetailMode === 'inventory_payment_modal' ||
    (effectiveDetailMode !== 'receive_shipments' && config?.recordDetailModalType === 'form_edit') ||
    (effectiveDetailMode !== 'receive_shipments' &&
      (config?.entityType === 'inventory_request' || config?.entityType === 'unmannd_request'));

  // Memoize onLeadUpdate callback for modal to prevent infinite re-render loop
  const handleModalLeadUpdate = useCallback((updatedLead: any) => {
    if (updatedLead) {
      setData(prevData => 
        prevData.map(lead => lead.id === updatedLead.id ? updatedLead : lead)
      );
      setFilteredData(prevData => 
        prevData.map(lead => lead.id === updatedLead.id ? updatedLead : lead)
      );
      setSelectedLead(updatedLead);
    }
  }, []);
  const [showFilters, setShowFilters] = useState(false);

  // Legacy filter state (for backward compatibility)
  const [leadStatusFilter, setLeadStatusFilter] = useState<string[]>(config?.defaultFilters?.lead_status || []);
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<{
    startDate: Date | undefined;
    endDate: Date | undefined;
    startTime: string;
    endTime: string;
  }>({
    startDate: undefined,
    endDate: undefined,
    startTime: '00:00',
    endTime: '23:59'
  });

  const [apiPrefix] = useState<'supabase' | 'renderer'>(config?.apiPrefix || 'renderer');
  const [filtersApplied, setFiltersApplied] = useState(false);
  const [resolvedFilterOptions, setResolvedFilterOptions] = useState<Record<string, FilterOption[]>>({});
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [displaySearchTerm, setDisplaySearchTerm] = useState<string>('');
  const latestSearchValueRef = useRef<string>('');
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const listFetchInFlightRef = useRef(false);
  const createdRefreshTimerRef = useRef<number | null>(null);
  const fetchFilteredDataRef = useRef<
    | ((
        requestSequence?: number,
        queryParams?: URLSearchParams,
        options?: { silent?: boolean; keepPage?: boolean },
      ) => Promise<void>)
    | null
  >(null);
  const requestSequenceRef = useRef<number>(0);
  const lastInitialFetchKeyRef = useRef<string>('');
  const initialFetchInFlightKeyRef = useRef<string | null>(null);
  const filterServiceRef = useRef<FilterService | null>(null);
  const { session, user } = useAuth();
  const spoofUserId = useSpoofUserId();
  const { customRole, membershipLoaded, membershipId } = useTenant();
  const inventoryTablePageName = useInventoryTablePageName();
  const sessionUser = session?.user ?? null;
  const activeUser = user ?? sessionUser ?? null;
  // Spoof JWT `sub` when active; otherwise Supabase user id (aligns with API `{{current_user}}`).
  const activeUserId = spoofUserId ?? activeUser?.id ?? null;
  const activeUserMetadata = activeUser?.user_metadata ?? null;
  const activeAppMetadata = activeUser?.app_metadata ?? null;
  // Check if user is GM (General Manager) - GM should see all leads
  const isGM = customRole === 'GM' || customRole === 'gm' || customRole?.toUpperCase() === 'GM';

  const runtimeContext = useMemo(() => ({
    session,
    user: activeUser,
    current_user: activeUser,
    claims: activeUser,
    user_metadata: activeUserMetadata,
    metadata: activeUserMetadata,
    app_metadata: activeAppMetadata
  }), [session, activeUser, activeUserMetadata, activeAppMetadata]);

  const runtimeTokenAdapters = useMemo<PlaceholderAdapter[]>(() => {
    const adapters: PlaceholderAdapter[] = [];

    if (activeUserId) {
      adapters.push({
        tokens: ['current_user'],
        resolve: () => activeUserId
      });
    }

    if (membershipId) {
      adapters.push({
        tokens: ['pyro_user_id', 'current_membership_id', 'current_membership', 'current_user_membership_id'],
        resolve: () => membershipId,
      });
    }

    return adapters;
  }, [activeUserId, membershipId]);

  // Resolve placeholder tokens to user/session claim values right before fetch time
  const resolvePlaceholderValue = useCallback((rawToken: string) => {
    if (!rawToken) return undefined;
    const token = rawToken.trim();
    if (!token) return undefined;

    const normalizedKey = token.toLowerCase().replace(/[\s-]+/g, '_');
    const adapter = runtimeTokenAdapters.find(entry =>
      entry.tokens.includes(normalizedKey)
    );

    if (adapter) {
      return adapter.resolve();
    }

    const normalizedPath = token.replace(/\s+/g, '');
    const nestedValue = getNestedValue(runtimeContext, normalizedPath);

    if (nestedValue === undefined || nestedValue === null || nestedValue === '') {
      return undefined;
    }

    if (typeof nestedValue === 'object') {
      return undefined;
    }

    return String(nestedValue);
  }, [runtimeTokenAdapters, runtimeContext]);

  // Resolve the template once per config/user combo, but keep raw endpoint as a fallback
  const resolvedApiEndpoint = useMemo(() => {
    if (!config?.apiEndpoint) return undefined;
    let endpoint = applyPlaceholderTemplate(config.apiEndpoint, resolvePlaceholderValue);

    // Allow Page Builder URLs like `/crm-records/records?&entity_type=unmannd_request`
    endpoint = endpoint
      .replace(/\/crm-records\/records\?/, '/crm-records/records/?')
      .replace(/\?&+/g, '?');
    
    // GM users should see all leads - remove assigned_to from URL if present
    if (isGM && endpoint) {
      try {
        const url = new URL(endpoint, window.location.origin);
        if (url.searchParams.has('assigned_to')) {
          url.searchParams.delete('assigned_to');
          endpoint = url.pathname + url.search + url.hash;
          // Remove leading origin if it was added
          if (endpoint.startsWith(window.location.origin)) {
            endpoint = endpoint.substring(window.location.origin.length);
          }
          console.log('[LeadTableComponent] GM user detected, removed assigned_to from endpoint URL');
        }
      } catch (e) {
        // If URL parsing fails (relative URL), try regex replacement
        endpoint = endpoint.replace(/[?&]assigned_to=[^&]*/g, '');
        // Clean up double ? or trailing &
        endpoint = endpoint.replace(/\?&/g, '?').replace(/[?&]$/, '');
        console.log('[LeadTableComponent] GM user detected, removed assigned_to from endpoint URL (regex fallback)');
      }
    }
    
    return endpoint;
  }, [config?.apiEndpoint, resolvePlaceholderValue, isGM]);

  const effectiveApiEndpoint = resolvedApiEndpoint ?? config?.apiEndpoint;

  const isInventoryRequestTable = useMemo(() => {
    const et = String(config?.entityType || '').trim();
    const endpoint = String(config?.apiEndpoint || effectiveApiEndpoint || '');
    return (
      et === 'inventory_request' ||
      et === 'unmannd_request' ||
      /[?&]entity_type=(?:unmannd_request|inventory_request)(?:&|$)/i.test(endpoint)
    );
  }, [config?.entityType, config?.apiEndpoint, effectiveApiEndpoint]);

  // Helper: for GM users, remove assigned_to only when it came from endpoint/default, not when user explicitly set "Assigned to" filter
  const removeAssignedToForGM = useCallback(
    (
      params: URLSearchParams,
      opts?: { effectiveFilters: FilterConfig[]; filterStateValues: Record<string, any> }
    ) => {
      if (!isGM || !params.has('assigned_to')) return params;
      if (opts?.effectiveFilters && opts?.filterStateValues) {
        const hasExplicitAssignedToFilter = opts.effectiveFilters.some((f) => {
          const accessor = f.accessor || f.key;
          if (accessor !== 'assigned_to') return false;
          const v = opts.filterStateValues[f.key];
          if (Array.isArray(v)) return v.length > 0;
          return v != null && v !== '';
        });
        if (hasExplicitAssignedToFilter) return params; // user chose "Assigned to" in filter UI – keep it
      }
      params.delete('assigned_to');
      console.log('[LeadTableComponent] GM user detected, removed assigned_to from query params');
      return params;
    },
    [isGM]
  );

  // Helper function to build URL with query string (handles endpoints that already have query params)
  const buildUrlWithParams = useCallback((endpoint: string, params: URLSearchParams) => {
    const merged = new URLSearchParams(params);
    const forced = config?.forceQueryParams;
    if (forced) {
      Object.entries(forced).forEach(([key, value]) => {
        const v = String(value ?? '').trim();
        if (!key || !v) return;
        merged.set(key, v);
      });
    }
    const queryString = merged.toString();
    if (!queryString) return endpoint;

    // Check if endpoint already has query parameters
    const hasQueryParams = endpoint.includes('?');
    const separator = hasQueryParams ? '&' : '?';
    return `${endpoint}${separator}${queryString}`;
  }, [config?.forceQueryParams]);

  // Normalize filters to ensure non-empty, unique keys
  const normalizedFilters = useMemo(() => {
    if (!config?.filters || config.filters.length === 0) return [] as FilterConfig[];

    const seenKeys = new Set<string>();
    const slugify = (s: string) =>
      s
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');

    return config.filters.map((f, idx) => {
      let key = (f.key || '').trim();
      if (!key) key = (f.accessor || '').trim();
      if (!key && f.label) key = slugify(f.label);
      if (!key) key = `filter_${idx}`;
      
      let uniqueKey = key;
      let n = 1;
      while (seenKeys.has(uniqueKey)) {
        uniqueKey = `${key}_${n++}`;
      }
      seenKeys.add(uniqueKey);
      
      return { ...f, key: uniqueKey };
    });
  }, [config?.filters]);

  // Fetch dropdown options from API for select filters that have optionsApiUrl
  useEffect(() => {
    const apiSelectFilters = normalizedFilters.filter(
      (f): f is FilterConfig & { optionsApiUrl: string; optionsDisplayKey: string; optionsValueKey: string } =>
        f.type === 'select' &&
        !!(f.optionsApiUrl && f.optionsApiUrl.trim()) &&
        !!(f.optionsDisplayKey?.trim() && f.optionsValueKey?.trim())
    );
    if (apiSelectFilters.length === 0) {
      setResolvedFilterOptions({});
      return;
    }
    let cancelled = false;
    const fetchOne = async (filter: (typeof apiSelectFilters)[0]) => {
      try {
        const url = filter.optionsApiUrl.startsWith('http')
          ? filter.optionsApiUrl
          : filter.optionsApiUrl.startsWith('/')
            ? filter.optionsApiUrl
            : `/${filter.optionsApiUrl}`;
        const res = await apiClient.get<unknown>(url);
        const raw = res.data;
        const arr = Array.isArray(raw) ? raw : (raw as any)?.results ?? (raw as any)?.data ?? [];
        const displayKey = filter.optionsDisplayKey.trim();
        const valueKey = filter.optionsValueKey.trim();
        let options: FilterOption[] = (arr as any[])
          .map((item: any) => {
            const displayRaw = displayKey.includes('.')
              ? getNestedValue(item, displayKey)
              : (item?.[displayKey] ?? item?.data?.[displayKey]);
            const valueRaw = valueKey.includes('.')
              ? getNestedValue(item, valueKey)
              : (item?.[valueKey] ?? item?.data?.[valueKey]);
            return {
              label: String(displayRaw ?? ''),
              value: String(valueRaw ?? ''),
            };
          })
          .filter((o) => o.value !== undefined && o.value !== '');
        if (filter.optionsIncludeNull) {
          const nullLabel = (filter.optionsNullLabel ?? 'Unassigned').trim() || 'Unassigned';
          const nullValue = filter.optionsNullValue !== undefined && filter.optionsNullValue !== null ? String(filter.optionsNullValue) : '';
          options = [{ label: nullLabel, value: nullValue }, ...options];
        }
        if (!cancelled) {
          setResolvedFilterOptions((prev) => ({ ...prev, [filter.key]: options }));
        }
      } catch (err) {
        console.warn(`[LeadTableComponent] Failed to fetch filter options for ${filter.key}:`, err);
        if (!cancelled) {
          setResolvedFilterOptions((prev) => ({ ...prev, [filter.key]: [] }));
        }
      }
    };
    void Promise.all(apiSelectFilters.map(fetchOne));
    return () => {
      cancelled = true;
    };
  }, [normalizedFilters]);

  // Merge API-fetched options into filters for DynamicFilterBuilder and FilterService (correct params sent to data API)
  const effectiveFilters = useMemo(() => {
    return normalizedFilters.map((f) => {
      if (f.type === 'select' && f.optionsApiUrl && resolvedFilterOptions[f.key]) {
        return { ...f, options: resolvedFilterOptions[f.key] };
      }
      return f;
    });
  }, [normalizedFilters, resolvedFilterOptions]);

  // URL management hooks (must be declared early for navigation and URL sync)
  const navigate = useNavigate();
  const location = useLocation();

  // New dynamic filter system: instantiate FilterService only when dynamic filters exist and not in fallback mode
  const filterService = useMemo(() => {
    if (effectiveFilters.length > 0 && !config?.showFallbackOnly) {
      const service = new FilterService(effectiveFilters, {
        apiEndpoint: effectiveApiEndpoint,
        entityType: config?.entityType,
        pageSize: config?.filterOptions?.pageSize || 10,
        searchFields: config?.searchFields,
        defaultParams: {
          ...(config?.defaultFilters?.lead_status?.length && { lead_status: config.defaultFilters.lead_status }),
          ...(config?.defaultFilters?.lead_stage?.length && { lead_stage: config.defaultFilters.lead_stage }),
        }
      });

      // Validate filter configuration
      const validation = service.validateFilters();
      if (!validation.isValid) {
        console.error('FilterService validation failed:', validation.errors);
      }
      if (validation.warnings.length > 0) {
        console.warn('FilterService validation warnings:', validation.warnings);
      }

      return service;
    }
    return null;
  }, [effectiveFilters, effectiveApiEndpoint, config?.entityType, config?.filterOptions?.pageSize, config?.defaultFilters, config?.showFallbackOnly, config?.searchFields]);

  filterServiceRef.current = filterService;

  // Initialize filter hooks with proper reset when no filters are configured
  const {
    filterState,
    setFilterValue,
    setFilterValues,
    clearFilters,
    applyFilters: applyFilterState,
    isFilterActive,
    getActiveFiltersCount,
    getQueryParams,
    getFilterDisplayValue,
  } = useFilters();

  // URL synchronization: keep query params in the address bar in sync with UI state
  const updateURL = useCallback((params: URLSearchParams) => {
    const currentPath = location.pathname;
    const newUrl = params.toString() ? `${currentPath}?${params.toString()}` : currentPath;
    navigate(newUrl, { replace: true });
  }, [location.pathname, navigate]);

  // Parse URL parameters and restore filter state for deep links/bookmarks
  const parseURLFilters = useCallback((filters: FilterConfig[]): Record<string, any> => {
    const urlParams = new URLSearchParams(location.search);
    const filterValues: Record<string, any> = {};

    filters.forEach(filter => {
      const accessor = filter.accessor || filter.key;
      const paramValue = urlParams.get(accessor);

      if (paramValue !== null) {
        switch (filter.type) {
          case 'select': {
            // Handle multiple values (separate parameters with same name)
            const allValues = urlParams.getAll(accessor);
            if (allValues.length > 0) {
              filterValues[filter.key] = allValues;
            }
            break;
          }
          case 'date_gte':
          case 'date_lte':
          case 'date_exact':
          case 'text':
          case 'search':
          case 'number_gte':
          case 'number_lte':
            filterValues[filter.key] = paramValue;
            break;
          case 'date_range':
          case 'date_time_range': {
            // Date range / date time range: start and end from __gte and __lte
            const startValue = urlParams.get(`${accessor}__gte`);
            const endValue = urlParams.get(`${accessor}__lte`);
            if (startValue || endValue) {
              filterValues[filter.key] = {
                start: startValue ? new Date(startValue) : undefined,
                end: endValue ? new Date(endValue) : undefined
              };
            }
            break;
          }
        }
      }
    });

    return filterValues;
  }, [location.search]);

  // Initialize filters from URL on component mount and reset when no filters
  useEffect(() => {
    if (normalizedFilters.length > 0 && !config?.showFallbackOnly) {
      const urlFilterValues = parseURLFilters(normalizedFilters);
      setFilterValues(urlFilterValues);
    } else {
      // Clear any existing filter state when no filters are configured or in fallback mode
      clearFilters();
      // Also clear URL parameters to prevent persistent state
      const currentPath = location.pathname;
      navigate(currentPath, { replace: true });
    }
  }, [normalizedFilters, config?.showFallbackOnly, parseURLFilters, setFilterValues, clearFilters, navigate, location.pathname, location.search]);

  // Additional effect to ensure filter state is completely reset when no filters are configured
  useEffect(() => {
    if (normalizedFilters.length === 0 || config?.showFallbackOnly) {
      // Force clear all filter state
      clearFilters();
      // Reset filters applied state
      setFiltersApplied(false);
    }
  }, [normalizedFilters, config?.showFallbackOnly, clearFilters]);
  const [pagination, setPagination] = useState<{
    totalCount: number;
    numberOfPages: number;
    currentPage: number;
    pageSize: number;
    nextPageLink: string | null;
    previousPageLink: string | null;
  }>({
    totalCount: 0,
    numberOfPages: 0,
    currentPage: 1,
    pageSize: 10,
    nextPageLink: null,
    previousPageLink: null
  });
  const paginationRef = useRef(pagination);
  paginationRef.current = pagination;
  const [filterOptions, setFilterOptions] = useState<{
    lead_statuses: string[];
    sources: string[];
  }>({
    lead_statuses: config?.statusOptions || [],
    sources: []
  });
  const [inlineCellDrafts, setInlineCellDrafts] = useState<Record<string, string>>({});
  const [inlineSavingCell, setInlineSavingCell] = useState<string | null>(null);
  /** Ops (PM / TL / Admin): inline Shipment column edit — status stays workflow-only in the modal. */
  const [opsEditingRowId, setOpsEditingRowId] = useState<string | number | null>(null);
  const [opsShipmentDrafts, setOpsShipmentDrafts] = useState<Record<string, string>>({});
  const [opsRowSavingId, setOpsRowSavingId] = useState<string | number | null>(null);

  const canOpsInlineEditShipment = useMemo(
    () =>
      Boolean(
        !isInPageBuilder &&
          isInventoryRequestTable &&
          isInventoryOpsEditorRole(customRole)
      ),
    [isInPageBuilder, isInventoryRequestTable, customRole]
  );

  const canInlineEditRows = useMemo(() => {
    return Boolean(
      !isInPageBuilder &&
      effectiveApiEndpoint &&
      (effectiveApiEndpoint.includes('/crm-records/records') || effectiveApiEndpoint.includes('/records/'))
    );
  }, [isInPageBuilder, effectiveApiEndpoint]);

  const getInlineCellKey = useCallback((rowId: unknown, accessor: string) => `${String(rowId)}:${accessor}`, []);

  const handleInlineCellSave = useCallback(async (row: any, column: Column, rawValue: string) => {
    if (!canInlineEditRows || !row?.id || !effectiveApiEndpoint) return;
    const cellKey = getInlineCellKey(row.id, column.accessor);
    try {
      setInlineSavingCell(cellKey);
      let parsedValue =
        column.type === 'number'
          ? (rawValue.trim() === '' ? '' : Number(rawValue))
          : rawValue;
      if ((column.accessor === 'vendor' || column.accessor === 'vendor_name') && typeof parsedValue === 'string') {
        parsedValue = toVendorStorageName(parsedValue);
      }
      if (column.type === 'number' && parsedValue !== '' && !Number.isFinite(parsedValue as number)) {
        toast({ title: 'Invalid number', description: 'Enter a valid numeric value.', variant: 'destructive' });
        return;
      }
      const base = effectiveApiEndpoint.split('?')[0].replace(/\/$/, '');
      const url = `${base}/${row.id}/`;
      const existingData = (row.data as Record<string, unknown>) || {};
      const nextData: Record<string, unknown> = { ...existingData, [column.accessor]: parsedValue };
      const response = await apiClient.patch(url, { data: nextData });
      const updated = response.data;
      const updateRow = (r: any) =>
        r.id === row.id
          ? {
              ...r,
              ...updated,
              [column.accessor]: nextData[column.accessor],
              data: updated?.data ?? nextData,
            }
          : r;
      setData((prev) => prev.map(updateRow));
      setFilteredData((prev) => prev.map(updateRow));
      setInlineCellDrafts((prev) => {
        const next = { ...prev };
        delete next[cellKey];
        return next;
      });
      toast({ title: 'Saved', description: `${column.header} updated.` });
    } catch (e: any) {
      toast({
        title: 'Update failed',
        description: e?.message || 'Could not update this field.',
        variant: 'destructive',
      });
    } finally {
      setInlineSavingCell((cur) => (cur === cellKey ? null : cur));
    }
  }, [canInlineEditRows, effectiveApiEndpoint, getInlineCellKey, toast]);

  // Action button click: open card and/or call API (defined before renderCell which uses it)
  const handleActionClick = useCallback(async (row: any, col: Column) => {
    const openCard = col.openCard === true || col.openCard === 'true';
    if (openCard) {
      setSelectedLead(row);
      setIsLeadModalOpen(true);
    }
    if (col.actionApiEndpoint?.trim()) {
      try {
        const baseUrl = import.meta.env.VITE_RENDER_API_URL;
        const token = await getEffectiveToken(session?.access_token ?? null);
        const { url, method, headers, body } = buildActionApiRequest(
          {
            endpoint: col.actionApiEndpoint,
            method: col.actionApiMethod,
            headers: col.actionApiHeaders,
            payload: col.actionApiPayload,
          },
          row,
          baseUrl,
          {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '',
          },
          'lead_id'
        );
        const res = await fetch(url, { method, headers, body });
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        toast({ title: 'Success', description: 'Action completed' });
      } catch (err: any) {
        toast({ title: 'Error', description: err?.message || 'Action failed', variant: 'destructive' });
      }
    }
  }, [session?.access_token, toast]);

  // Status action button click: PATCH record with data[targetAttribute]=statusValue (default targetAttribute=status).
  const handleStatusButtonClick = useCallback(async (row: any, button: { label: string; statusValue: string; targetAttribute?: string }) => {
    if (!effectiveApiEndpoint || !row?.id) return;
    const base = effectiveApiEndpoint.split('?')[0].replace(/\/$/, '');
    const url = `${base}/${row.id}/`;
    const existingData = (row.data as Record<string, unknown>) || {};
    const targetAttribute = (button.targetAttribute || 'status').trim() || 'status';
    const newValue = button.statusValue;
    try {
      const response = await apiClient.patch(url, { data: { ...existingData, [targetAttribute]: newValue } });
      const updated = response.data;
      setData((prev) =>
        prev.map((r: any) => (r.id === row.id ? { ...r, ...updated, data: updated?.data ?? { ...existingData, [targetAttribute]: newValue } } : r))
      );
      setFilteredData((prev) =>
        prev.map((r: any) => (r.id === row.id ? { ...r, ...updated, data: updated?.data ?? { ...existingData, [targetAttribute]: newValue } } : r))
      );
      toast({ title: 'Updated', description: `${targetAttribute} set to ${newValue}` });
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Failed to update status', variant: 'destructive' });
    }
  }, [effectiveApiEndpoint, toast]);

  const canRequesterEditRow = useCallback((row: any) => {
    if (!isInventoryRequestTable) return false;
    const requesterId = row?.data?.requester_id ?? row?.requester_id ?? row?.data?.created_by_id;
    if (!isInventoryRequestRowRequester(requesterId, activeUserId, membershipId)) return false;
    const status = row?.data?.status ?? row?.status;
    return canRequesterEditInventoryRequest(status);
  }, [isInventoryRequestTable, activeUserId, membershipId]);

  const startOpsShipmentEdit = useCallback((row: any) => {
    if (row?.id == null) return;
    const rawShipment = String(row?.shipment_status ?? row?.data?.shipment_status ?? '').trim().toUpperCase();
    const shipment_status =
      !rawShipment || rawShipment === 'N/A' || rawShipment === '—' ? 'N/A' : rawShipment;
    setOpsEditingRowId(row.id);
    setOpsShipmentDrafts((prev) => ({ ...prev, [String(row.id)]: shipment_status }));
  }, []);

  const cancelOpsShipmentEdit = useCallback((rowId: string | number) => {
    setOpsEditingRowId((cur) => (cur === rowId ? null : cur));
    setOpsShipmentDrafts((prev) => {
      const next = { ...prev };
      delete next[String(rowId)];
      return next;
    });
  }, []);

  const saveOpsShipmentEdit = useCallback(
    async (row: any) => {
      if (!canOpsInlineEditShipment || !row?.id || !effectiveApiEndpoint) return;
      const draft = opsShipmentDrafts[String(row.id)];
      if (!draft) return;
      try {
        setOpsRowSavingId(row.id);
        const base = effectiveApiEndpoint.split('?')[0].replace(/\/$/, '');
        const url = `${base}/${row.id}/`;
        const existingData = (row.data as Record<string, unknown>) || {};
        const shipmentValue =
          draft === 'N/A' || draft === '' ? '' : draft;
        const prevShipment = String(
          existingData.shipment_status ?? row.shipment_status ?? ''
        ).trim();
        const nextData: Record<string, unknown> = {
          ...existingData,
          shipment_status: shipmentValue,
        };
        if (String(shipmentValue) !== prevShipment) {
          nextData.tracking_updated_at = new Date().toISOString();
        }
        const response = await apiClient.patch(url, { data: nextData });
        const updated = response.data;
        const updateRow = (r: any) =>
          r.id === row.id
            ? {
                ...r,
                ...updated,
                shipment_status: shipmentValue || 'N/A',
                data: updated?.data ?? nextData,
              }
            : r;
        setData((prev) => prev.map(updateRow));
        setFilteredData((prev) => prev.map(updateRow));
        cancelOpsShipmentEdit(row.id);
        toast({ title: 'Saved', description: 'Shipment updated.' });
      } catch (e: any) {
        toast({
          title: 'Update failed',
          description: e?.message || 'Could not save shipment.',
          variant: 'destructive',
        });
      } finally {
        setOpsRowSavingId((cur) => (cur === row.id ? null : cur));
      }
    },
    [
      canOpsInlineEditShipment,
      effectiveApiEndpoint,
      opsShipmentDrafts,
      cancelOpsShipmentEdit,
      toast,
    ]
  );

  // Custom cell renderer - completely generic
  const renderCell = useCallback((row: any, column: Column | CustomTableColumn, columnIndex: number, rowIndex: number = 0) => {
    if (column.accessor === REQUESTER_EDIT_COLUMN_ACCESSOR) {
      if (canOpsInlineEditShipment) {
        const isEditing = opsEditingRowId === row.id;
        const isSaving = opsRowSavingId === row.id;
        return (
          <CustomButton
            variant="default"
            size="sm"
            className={isEditing ? OPS_SAVE_BTN : OPS_EDIT_BTN}
            disabled={isSaving || (opsRowSavingId != null && !isEditing)}
            onClick={(e) => {
              e.stopPropagation();
              if (isEditing) {
                void saveOpsShipmentEdit(row);
              } else {
                startOpsShipmentEdit(row);
              }
            }}
          >
            {isSaving ? 'Saving…' : isEditing ? 'Save' : 'Edit'}
          </CustomButton>
        );
      }
      // Status changes use inventory workflow actions in the detail modal (Approve / Reject / Order, etc.).
      return (
        <CustomButton
          variant="default"
          size="sm"
          className={OPS_EDIT_BTN}
          onClick={(e) => {
            e.stopPropagation();
            if (effectiveDetailMode === 'none') return;
            setSelectedRecord(row);
            setIsRecordDetailModalOpen(true);
          }}
        >
          Edit
        </CustomButton>
      );
    }

    let value = row[column.accessor];
    
    // Handle case where value is an object - extract the actual value
    if (typeof value === 'object' && value !== null) {
      // If it's an object, try to get a string representation
      if (value.toString && typeof value.toString === 'function') {
        value = value.toString();
      } else {
        // Fallback: try to get the first property value
        const keys = Object.keys(value);
        if (keys.length > 0) {
          value = value[keys[0]];
        } else {
          value = 'N/A';
        }
      }
    }
    
    // Ensure value is properly handled - don't convert 0 to N/A
    if (value === null || value === undefined) {
      value = 'N/A';
    } else if (value === 0 || value === '0') {
      value = '0'; // Keep 0 as 0, don't convert to N/A
    }
    
    // Convert to string for display (formatted money for known price fields)
    let displayValue = String(value);
    if (
      value !== null &&
      value !== undefined &&
      value !== 'N/A' &&
      PRICE_FIELD_KEYS.has(column.accessor)
    ) {
      const n = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''));
      if (Number.isFinite(n)) {
        displayValue = formatCurrencyDisplay(n);
      }
    }

    // Keep Requirement Date in the same compact format as Request Date (DD/MM/YYYY).
    const calendarDateAccessors = new Set([
      'request_date',
      'requested_date',
      'required_date',
      'requirement_date',
      'eta',
    ]);
    if (
      calendarDateAccessors.has(String(column.accessor || '')) &&
      displayValue &&
      displayValue !== 'N/A' &&
      /^\d{4}-\d{2}-\d{2}/.test(displayValue.trim())
    ) {
      displayValue = isInventoryRequestTable
        ? formatTableDateShort(displayValue)
        : formatCalendarDate(displayValue);
    }
    
    // Helper function to truncate text based on column width
    const truncateText = (text: string, columnIndex: number) => {
      const totalColumns = config?.columns?.length || 5;
      const columnWidthPercent = 100 / totalColumns;
      
      // If column takes more than 7% of screen, truncate
      if (columnWidthPercent > 7) {
        // Calculate max characters based on column width percentage
        // Assuming average character width is about 8px, and screen width is ~1200px
        const screenWidth = 1200; // Approximate screen width
        const columnWidthPx = (columnWidthPercent / 100) * screenWidth;
        const maxChars = Math.floor(columnWidthPx / 8); // 8px per character
        
        return text.length > maxChars ? text.substring(0, maxChars) + '...' : text;
      }
      
      return text;
    };
    
    const inlineCellKey = getInlineCellKey(row?.id, column.accessor);
    const rowLockedForRequester =
      isInventoryRequestTable &&
      isInventoryRequestRowRequester(
        row?.data?.requester_id ?? row?.requester_id ?? row?.data?.created_by_id,
        activeUserId,
        membershipId
      ) &&
      !canRequesterEditInventoryRequest(row?.data?.status ?? row?.status);
    const isInlineEditable =
      canInlineEditRows &&
      !rowLockedForRequester &&
      column.editableInTable === true &&
      row?.id != null &&
      column.type !== 'action' &&
      column.type !== 'status_buttons' &&
      column.type !== 'chip' &&
      column.type !== 'link';
    const inlineDraft = inlineCellDrafts[inlineCellKey];
    const normalizedInlineBaseValue = value === 'N/A' ? '' : String(value);
    const inlineValue = inlineDraft ?? normalizedInlineBaseValue;
    const inlineChanged = inlineDraft !== undefined && inlineDraft !== normalizedInlineBaseValue;
    const inlineSaving = inlineSavingCell === inlineCellKey;
    if (isInlineEditable) {
      if (column.accessor === 'urgency_level') {
        const selected = String(value ?? '').toUpperCase();
        return (
          <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
            {URGENCY_BUTTON_OPTIONS.map((opt) => {
              const isSel = selected === opt.value;
              return (
                <Button
                  key={opt.value}
                  type="button"
                  size="sm"
                  variant="outline"
                  className={urgencyToneButtonClassName(opt.value, isSel, 'rounded-full h-8')}
                  disabled={inlineSaving}
                  onClick={() => handleInlineCellSave(row, column as Column, opt.value)}
                >
                  {opt.label}
                </Button>
              );
            })}
          </div>
        );
      }
      return (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Input
            className="h-8 min-w-[140px]"
            type={column.type === 'number' ? 'number' : 'text'}
            value={inlineValue}
            onChange={(e) => setInlineCellDrafts((prev) => ({ ...prev, [inlineCellKey]: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && inlineChanged && !inlineSaving) {
                e.preventDefault();
                handleInlineCellSave(row, column as Column, inlineValue);
              }
            }}
            disabled={inlineSaving}
          />
          <Button
            type="button"
            size="sm"
            variant={inlineChanged ? 'default' : 'outline'}
            disabled={!inlineChanged || inlineSaving}
            onClick={() => handleInlineCellSave(row, column as Column, inlineValue)}
            className="h-8 px-2"
          >
            {inlineSaving ? '…' : 'Save'}
          </Button>
        </div>
      );
    }

    // Render link type columns
    if (column.type === 'link') {
      const accessor = String(column.accessor || '');
      const isTrackingCol =
        accessor === 'tracking_link' ||
        accessor === 'tracking_link_url' ||
        String(column.header || '').toLowerCase() === 'track' ||
        String(column.header || '').toLowerCase().includes('tracking');

      const href = displayValue;
      if (
        isTrackingCol &&
        (!href || href === '#' || href === 'N/A') &&
        row.tracking_number &&
        row.tracking_number !== 'N/A'
      ) {
        // No link yet — show tracking number as plain text
        return (
          <span className="text-sm font-mono" title={String(row.tracking_number)}>
            {truncateText(String(row.tracking_number), columnIndex)}
          </span>
        );
      }

      if (!href || href === '#' || href === 'N/A') {
        return <span className="text-gray-400 text-sm">-</span>;
      }

      // Check if it's a profile link
      if (column.accessor === 'user_profile_link' || column.header.toLowerCase().includes('profile')) {
        return (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <User className="h-4 w-4" />
            <span className="text-sm">{truncateText('Profile', columnIndex)}</span>
          </a>
        );
      }
      
      // Check if it's a WhatsApp link
      if (column.accessor === 'whatsapp_link' || column.header.toLowerCase().includes('whatsapp') || column.header.toLowerCase().includes('whats')) {
        return (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-green-600 hover:text-green-700 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <MessageCircle className="h-4 w-4" />
            <span className="text-sm">{truncateText('WhatsApp', columnIndex)}</span>
          </a>
        );
      }

      const linkLabel = isTrackingCol ? 'LINK' : 'Link';
      
      // Default link rendering
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={
            isTrackingCol
              ? 'text-sm font-semibold text-[#1A44A1] underline underline-offset-2 hover:text-[#163a8a] transition-colors'
              : 'inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 transition-colors'
          }
          onClick={(e) => e.stopPropagation()}
        >
          {isTrackingCol ? null : <ExternalLink className="h-4 w-4" />}
          <span className="text-sm">{truncateText(linkLabel, columnIndex)}</span>
        </a>
      );
    }
    
    const headerLower = String(column.header || '').toLowerCase().trim();
    const accessorLowerForName = String(column.accessor || '').toLowerCase();
    const isItemNameColumn =
      accessorLowerForName === 'item_name_freeform' ||
      accessorLowerForName === 'item_name' ||
      headerLower === 'item name' ||
      headerLower === 'item';

    // Item name: always use default placeholder thumbnail (no person avatar)
    if (isItemNameColumn) {
      const itemName =
        displayValue && displayValue !== 'N/A' ? displayValue : String(row.item_name_freeform || '').trim();
      return (
        <ShortProfileCard
          image={row.product_image}
          name={itemName || 'Unnamed item'}
          nameTitle={itemName || undefined}
          compact
          wrapName
          useDefaultItemImage
          className="mx-auto w-full min-w-0 max-w-full"
        />
      );
    }

    // Items table: first column as normal text (no person ShortProfileCard)
    const isItemsTableFirstColumn = config?.tableType === 'itemsTable' && columnIndex === 0;
    if (isItemsTableFirstColumn) {
      return <span className="text-sm block" title={displayValue}>{truncateText(displayValue, columnIndex)}</span>;
    }

    const isRequesterNameColumn =
      accessorLowerForName === 'requester_name' ||
      accessorLowerForName === 'requested_by' ||
      headerLower === 'requested by' ||
      headerLower === 'requester' ||
      headerLower === 'requester name' ||
      headerLower === 'requestor' ||
      headerLower === 'requestor name';
    if (isRequesterNameColumn) {
      const requesterName =
        displayValue && displayValue !== 'N/A'
          ? displayValue
          : String(row.requester_name || row.name || '').trim();
      return (
        <span className="mx-auto block w-full text-center text-sm" title={requesterName || undefined}>
          {requesterName || 'N/A'}
        </span>
      );
    }
    
    // Special handling for name column - show avatar, name, and email
    if (column.accessor === 'name' || headerLower.includes('name')) {
      return (
        <ShortProfileCard
          image={row.display_pic_url || row.image}
          name={row.name || displayValue}
          address={row.email_id || row.email || row.address || ''}
        />
      );
    }
    
    // Priority / urgency: short colored pill (High / Mid / Low) — fixed width.
    const accessorLowerEarly = String(column.accessor || '').toLowerCase();
    const isPriorityColumn =
      accessorLowerEarly === 'urgency_level' || accessorLowerEarly === 'priority';
    if (isPriorityColumn && normalizeInventoryPriorityLevel(displayValue)) {
      const fullLabel = formatInventoryPriorityLabel(displayValue);
      return (
        <Badge
          variant="outline"
          className={`${inventoryPriorityChipClassName(displayValue)} ${INVENTORY_PRIORITY_CHIP_SIZE} hover:opacity-90`}
          title={fullLabel}
        >
          {formatInventoryPriorityShortLabel(displayValue)}
        </Badge>
      );
    }

    // Urgency: show colored pill even when column type is `text` (items tables often use text columns).
    const urgencyUpper = String(displayValue ?? '').trim().toUpperCase();
    if (column.accessor === 'urgency_level' && (urgencyUpper === 'CRITICAL' || urgencyUpper === 'STANDARD')) {
      return (
        <Badge
          className={`${getStatusColor(displayValue, config?.statusColors)} ${INVENTORY_PRIORITY_CHIP_SIZE} border hover:opacity-90`}
          title={displayValue}
        >
          {displayValue}
        </Badge>
      );
    }

    // Render chip/badge for chip type columns
    if (column.type === 'chip') {
      const accessorLower = String(column.accessor || '').toLowerCase();
      const useShipmentTone =
        (config?.entityType === 'inventory_request' ||
          config?.entityType === 'unmannd_request' ||
          config?.tableType === 'itemsTable') &&
        accessorLower === 'shipment_status';
      const useInventoryStatusTone =
        (config?.tableType === 'itemsTable' ||
          config?.entityType === 'inventory_request' ||
          config?.entityType === 'unmannd_request') &&
        accessorLower === 'status';
      const usePriorityTone =
        accessorLower === 'urgency_level' || accessorLower === 'priority';

      // Ops row edit: Shipment becomes a dropdown; Status stays read-only (workflow modal).
      const isOpsEditingShipment =
        canOpsInlineEditShipment && opsEditingRowId === row.id && useShipmentTone;
      if (isOpsEditingShipment) {
        const current =
          opsShipmentDrafts[String(row.id)] ??
          getShipmentStatusLabel(row?.shipment_status ?? row?.data?.shipment_status);
        const options = [...OPS_SHIPMENT_OPTIONS];
        const cur = String(current || '').toUpperCase();
        if (cur && cur !== 'N/A' && !options.includes(cur as typeof options[number])) {
          options.unshift(cur as typeof options[number]);
        }
        return (
          <div className="min-w-[9.5rem]" onClick={(e) => e.stopPropagation()}>
            <Select
              value={String(current || 'N/A')}
              disabled={opsRowSavingId === row.id}
              onValueChange={(v) => {
                setOpsShipmentDrafts((prev) => ({
                  ...prev,
                  [String(row.id)]: v,
                }));
              }}
            >
              <SelectTrigger className="h-8 w-full text-xs font-semibold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options.map((opt) => (
                  <SelectItem key={opt} value={opt} className="text-xs">
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      }

      const chipToneClass = useShipmentTone
        ? getShipmentStatusToneClass(displayValue)
        : useInventoryStatusTone
          ? getInventoryStatusToneClass(displayValue)
          : usePriorityTone
            ? inventoryPriorityChipClassName(displayValue)
            : getStatusColor(displayValue, config?.statusColors);
      const chipLabel = useShipmentTone
        ? getShipmentStatusLabel(displayValue)
        : usePriorityTone
          ? formatInventoryPriorityShortLabel(displayValue)
          : displayValue;
      const chipTitle = usePriorityTone
        ? formatInventoryPriorityLabel(displayValue)
        : String(chipLabel);
      const chipSizeClass = usePriorityTone
        ? INVENTORY_PRIORITY_CHIP_SIZE
        : useShipmentTone || useInventoryStatusTone
          ? INVENTORY_STATUS_CHIP_SIZE
          : 'rounded-[8px] px-3 py-0.5 text-xs font-semibold uppercase tracking-wide border';
      return (
        <div className="flex justify-center">
          <Badge
            variant="outline"
            className={`${chipToneClass} ${chipSizeClass} hover:opacity-90`}
            title={chipTitle}
          >
            {chipLabel}
          </Badge>
        </div>
      );
    }

    // Action button column
    if (column.type === 'action') {
      const isEditAction =
        String(column.header || '').trim().toLowerCase() === 'edit' ||
        String(column.accessor || '').trim().toLowerCase() === 'edit';
      return (
        <CustomButton
          variant={isEditAction && isInventoryRequestTable ? 'default' : 'outline'}
          size="sm"
          className={
            isEditAction && isInventoryRequestTable
              ? 'h-9 rounded-md border-0 bg-[#1A44A1] px-4 text-xs font-semibold text-white hover:bg-[#163a8a] hover:text-white'
              : undefined
          }
          onClick={(e) => {
            e.stopPropagation();
            handleActionClick(row, column as Column);
          }}
        >
          {column.header || 'Action'}
        </CustomButton>
      );
    }

    // Status change buttons column (items table): group of buttons that set record status
    if (column.type === 'status_buttons' && column.statusButtons?.length) {
      return (
        <div className="flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
          {column.statusButtons.map((btn) => {
            const targetAttr = btn.targetAttribute ?? 'status';
            const current = String(row[targetAttr] ?? '').toUpperCase();
            const isActive = current === String(btn.statusValue ?? '').toUpperCase();
            return (
              <CustomButton
                key={btn.statusValue}
                variant="outline"
                size="sm"
                className={urgencyToneButtonClassName(btn.statusValue, isActive, 'text-xs')}
                onClick={() => handleStatusButtonClick(row, btn)}
              >
                {btn.label}
              </CustomButton>
            );
          })}
        </div>
      );
    }
    
    // Special handling: Make phone_number/phone_no clickable if whatsapp_link exists
    const isPhoneColumn = column.accessor === 'phone_number' || 
                          column.accessor === 'phone_no' || 
                          column.accessor === 'phone' ||
                          column.header.toLowerCase().includes('phone');
    
    if (isPhoneColumn) {
      // Check if whatsapp link exists
      if (row.whatsapp_link && row.whatsapp_link !== 'N/A' && row.whatsapp_link !== '' && row.whatsapp_link !== '#') {
        return (
          <a
            href={row.whatsapp_link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-green-600 hover:text-green-700 transition-colors cursor-pointer"
            onClick={(e) => e.stopPropagation()}
            title="Click to open WhatsApp"
          >
            <MessageCircle className="h-3 w-3" />
            <span className="text-sm">{truncateText(displayValue, columnIndex)}</span>
          </a>
        );
      }
      // If no whatsapp link, generate one from phone number
      if (displayValue && displayValue !== 'N/A' && displayValue !== '') {
        const cleanNumber = displayValue.replace(/\D/g, '');
        if (cleanNumber.length >= 10) {
          const whatsappUrl = `https://wa.me/${cleanNumber}`;
          return (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-green-600 hover:text-green-700 transition-colors cursor-pointer"
              onClick={(e) => e.stopPropagation()}
              title="Click to open WhatsApp"
            >
              <MessageCircle className="h-3 w-3" />
              <span className="text-sm">{truncateText(displayValue, columnIndex)}</span>
            </a>
          );
        }
      }
    }
    
    // Special handling for columns with configured linkField
    if (column.linkField && row[column.linkField] && row[column.linkField] !== '#' && row[column.linkField] !== 'N/A') {
      return (
        <a
          href={row[column.linkField]}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
          onClick={(e) => e.stopPropagation()}
        >
          <User className="h-3 w-3" />
          <span className="text-sm">{truncateText(displayValue, columnIndex)}</span>
        </a>
      );
    }
    
    // Fallback: Special handling for Praja ID - make it clickable if profile link exists
    if (column.accessor === 'praja_id' && row.user_profile_link && row.user_profile_link !== '#' && row.user_profile_link !== 'N/A') {
      return (
        <a
          href={row.user_profile_link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
          onClick={(e) => e.stopPropagation()}
        >
          <User className="h-3 w-3" />
          <span className="text-sm">{truncateText(displayValue, columnIndex)}</span>
        </a>
      );
    }
    
    // Default text rendering
    if (PRICE_FIELD_KEYS.has(column.accessor)) {
      return (
        <span className="text-sm block font-mono tabular-nums" title={displayValue}>
          {truncateText(displayValue, columnIndex)}
        </span>
      );
    }
    if (calendarDateAccessors.has(String(column.accessor || ''))) {
      return (
        <span className="inline-block text-sm whitespace-nowrap uppercase text-center" title={displayValue}>
          {displayValue}
        </span>
      );
    }
    return <span className="text-sm block" title={displayValue}>{truncateText(displayValue, columnIndex)}</span>;
  }, [config?.statusColors, config?.tableType, canInlineEditRows, getInlineCellKey, handleActionClick, handleInlineCellSave, handleStatusButtonClick, inlineCellDrafts, inlineSavingCell, canRequesterEditRow, effectiveDetailMode, isInventoryRequestTable, activeUserId, membershipId, canOpsInlineEditShipment, opsEditingRowId, opsShipmentDrafts, opsRowSavingId, saveOpsShipmentEdit, startOpsShipmentEdit]);

  // Status action buttons (for modals and, if added to columns, for table). Not used to auto-append a column.
  const effectiveStatusButtons = useMemo(() => {
    const list = config?.tableType === 'itemsTable' && Array.isArray(config?.statusButtons)
      ? config.statusButtons.filter((b) => (b?.label ?? '').trim() !== '' && (b?.statusValue ?? '').trim() !== '')
      : [];
    return list;
  }, [config?.tableType, config?.statusButtons]);

  const inventoryTableKind = useMemo(
    () =>
      resolveEffectiveInventoryTableKind({
        pageDisplayName:
          inventoryTablePageName ||
          (config as { pageDisplayName?: string } | undefined)?.pageDisplayName,
        pageComponentType: (config as { pageComponentType?: string } | undefined)?.pageComponentType,
        configuredKind: (config as { inventoryTableKind?: string } | undefined)?.inventoryTableKind,
      }),
    [config, inventoryTablePageName]
  );

  const isMyRequestPage = inventoryTableKind === 'my_request';

  const bulkSelectionEnabled =
    !isInPageBuilder &&
    isInventoryRequestTable &&
    config?.tableType === 'itemsTable' &&
    !isMyRequestPage;

  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(() => new Set());
  const [bulkApplying, setBulkApplying] = useState<string | null>(null);

  const getRowWorkflowButtons = useCallback(
    (row: any) => {
      const data =
        row?.data && typeof row.data === 'object' ? (row.data as Record<string, unknown>) : {};
      const requesterId = data.requester_id ?? row?.requester_id ?? data.created_by_id;
      const isRequester = isInventoryRequestRowRequester(requesterId, activeUserId, membershipId);
      return getInventoryWorkflowButtons({
        requestStatus: data.status ?? row?.status,
        roleNameOrKey: customRole,
        membershipId,
        userId: activeUserId,
        teamLeadOnRecord: data.team_lead,
        managerOnRecord: data.manager,
        isRequester,
        workflowMode: config?.inventoryWorkflowMode ?? 'auto',
      });
    },
    [activeUserId, config?.inventoryWorkflowMode, customRole, membershipId]
  );

  const mergeBulkActionButtons = useCallback(
    (
      buttonsList: Array<
        Array<{ label: string; statusValue: string; targetAttribute?: string; statusText?: string }>
      >
    ) => {
      const map = new Map<
        string,
        { label: string; statusValue: string; targetAttribute?: string; statusText?: string }
      >();
      for (const list of buttonsList) {
        for (const btn of list) {
          if (!(btn?.label ?? '').trim() || !(btn?.statusValue ?? '').trim()) continue;
          map.set(bulkActionButtonKey(btn), btn);
        }
      }
      return Array.from(map.values());
    },
    []
  );

  const selectedRowCount = selectedRowIds.size;

  const bulkSelectionStatus = useMemo(() => {
    if (selectedRowIds.size === 0) return null;
    for (const row of filteredData) {
      const rowId = normalizeBulkRowId(row?.id);
      if (rowId != null && selectedRowIds.has(rowId)) {
        return getBulkRowStatus(row) || null;
      }
    }
    return null;
  }, [filteredData, selectedRowIds]);

  const canSelectBulkRow = useCallback(
    (row: any) => {
      if (!bulkSelectionEnabled) return false;
      if (normalizeBulkRowId(row?.id) == null) return false;
      if (bulkSelectionStatus == null) return true;
      return getBulkRowStatus(row) === bulkSelectionStatus;
    },
    [bulkSelectionEnabled, bulkSelectionStatus]
  );

  const toggleBulkRowSelection = useCallback(
    (row: any, selected: boolean) => {
      const rowId = normalizeBulkRowId(row?.id);
      if (rowId == null) return;

      if (!selected) {
        setSelectedRowIds((prev) => {
          const next = new Set(prev);
          next.delete(rowId);
          return next;
        });
        return;
      }

      const rowStatus = getBulkRowStatus(row);
      setSelectedRowIds((prev) => {
        if (prev.size > 0) {
          let anchorStatus: string | null = null;
          for (const existing of filteredData) {
            const existingId = normalizeBulkRowId(existing?.id);
            if (existingId != null && prev.has(existingId)) {
              anchorStatus = getBulkRowStatus(existing);
              break;
            }
          }
          if (anchorStatus != null && rowStatus !== anchorStatus) {
            toast({
              title: 'Different status',
              description: 'Bulk select only works for requests with the same status as the first selected row.',
              variant: 'destructive',
            });
            return prev;
          }
        }
        const next = new Set(prev);
        next.add(rowId);
        return next;
      });
    },
    [filteredData, toast]
  );

  const [bulkStatusPickerOpen, setBulkStatusPickerOpen] = useState(false);
  const [bulkStatusPickerOptions, setBulkStatusPickerOptions] = useState<
    Array<{ status: string; count: number }>
  >([]);

  const getPageStatusCounts = useCallback(() => {
    const counts = new Map<string, number>();
    for (const row of filteredData) {
      if (normalizeBulkRowId(row?.id) == null) continue;
      const status = getBulkRowStatus(row);
      if (!status) continue;
      counts.set(status, (counts.get(status) || 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => a.status.localeCompare(b.status));
  }, [filteredData]);

  const selectBulkRowsByStatus = useCallback(
    (status: string) => {
      const matchingIds = filteredData
        .filter((row) => getBulkRowStatus(row) === status)
        .map((row) => normalizeBulkRowId(row?.id))
        .filter((id): id is string => id != null);
      setSelectedRowIds(new Set(matchingIds));
      setBulkStatusPickerOpen(false);
      setBulkStatusPickerOptions([]);
    },
    [filteredData]
  );

  const toggleBulkSelectAll = useCallback(() => {
    // If a status is already locked by current selection, toggle that group only.
    if (selectedRowIds.size > 0) {
      let anchorStatus: string | null = null;
      for (const row of filteredData) {
        const rowId = normalizeBulkRowId(row?.id);
        if (rowId != null && selectedRowIds.has(rowId)) {
          anchorStatus = getBulkRowStatus(row);
          break;
        }
      }
      if (anchorStatus) {
        const matchingIds = filteredData
          .filter((row) => getBulkRowStatus(row) === anchorStatus)
          .map((row) => normalizeBulkRowId(row?.id))
          .filter((id): id is string => id != null);
        const allMatchingSelected =
          matchingIds.length > 0 && matchingIds.every((id) => selectedRowIds.has(id));
        setSelectedRowIds(allMatchingSelected ? new Set() : new Set(matchingIds));
        return;
      }
    }

    const statusOptions = getPageStatusCounts();
    if (statusOptions.length === 0) return;

    if (statusOptions.length === 1) {
      selectBulkRowsByStatus(statusOptions[0].status);
      return;
    }

    // Mixed statuses on this page — ask which status to select.
    setBulkStatusPickerOptions(statusOptions);
    setBulkStatusPickerOpen(true);
  }, [filteredData, getPageStatusCounts, selectBulkRowsByStatus, selectedRowIds]);

  const clearBulkSelection = useCallback(() => {
    setSelectedRowIds(new Set());
    setBulkStatusPickerOpen(false);
    setBulkStatusPickerOptions([]);
  }, []);

  useEffect(() => {
    setSelectedRowIds(new Set());
    setBulkStatusPickerOpen(false);
    setBulkStatusPickerOptions([]);
  }, [pagination.currentPage, effectiveApiEndpoint]);

  const rowSupportsBulkAction = useCallback(
    (row: any, button: { statusValue: string; targetAttribute?: string }) => {
      const key = bulkActionButtonKey(button);
      const workflowMatch = getRowWorkflowButtons(row).some((btn) => bulkActionButtonKey(btn) === key);
      if (workflowMatch) return true;
      return effectiveStatusButtons.some((btn) => bulkActionButtonKey(btn) === key);
    },
    [effectiveStatusButtons, getRowWorkflowButtons]
  );

  const bulkActionButtons = useMemo(() => {
    if (!bulkSelectionEnabled || selectedRowIds.size === 0) return [];

    const selectedRows = filteredData.filter((row) => {
      const rowId = normalizeBulkRowId(row?.id);
      return rowId != null && selectedRowIds.has(rowId);
    });
    if (selectedRows.length === 0) return [];

    const perRowButtons = selectedRows.map((row) => getRowWorkflowButtons(row));
    const configured = filterDuplicateInventoryWorkflowButtons(effectiveStatusButtons);
    const candidateButtons = mergeBulkActionButtons([...perRowButtons, configured]);

    return candidateButtons.filter((btn) =>
      selectedRows.some((row) => rowSupportsBulkAction(row, btn))
    );
  }, [
    bulkSelectionEnabled,
    effectiveStatusButtons,
    filteredData,
    getRowWorkflowButtons,
    mergeBulkActionButtons,
    rowSupportsBulkAction,
    selectedRowIds,
  ]);

  const patchInventoryRowStatus = useCallback(
    async (
      row: any,
      button: { label: string; statusValue: string; targetAttribute?: string; statusText?: string }
    ) => {
      if (!effectiveApiEndpoint || !row?.id) return null;
      const base = effectiveApiEndpoint.split('?')[0].replace(/\/$/, '');
      const url = `${base}/${row.id}/`;
      const existingData = (row.data as Record<string, unknown>) || {};
      const targetAttribute = (button.targetAttribute || 'status').trim() || 'status';
      const dataToSend: Record<string, unknown> = { ...existingData };
      dataToSend[targetAttribute] = button.statusValue;
      if (targetAttribute === 'status') {
        dataToSend.status_text = (button.statusText ?? button.label ?? button.statusValue).trim();
        applyInventoryCartStatusSideEffects({
          previousStatus: existingData.status,
          nextStatus: button.statusValue,
          data: dataToSend,
        });
        if (String(button.statusValue).toUpperCase().replace(/\s+/g, '_') === 'IN_SHIPPING') {
          dataToSend.shipment_status = advanceShipmentStatusForTracking(
            dataToSend.shipment_status,
            true
          );
        }
      }
      const response = await apiClient.patch(url, { data: dataToSend });
      return response.data;
    },
    [effectiveApiEndpoint]
  );

  const handleBulkStatusAction = useCallback(
    async (button: {
      label: string;
      statusValue: string;
      targetAttribute?: string;
      statusText?: string;
    }) => {
      if (!bulkSelectionEnabled || selectedRowIds.size === 0) return;
      const applyingKey = bulkActionButtonKey(button);
      const selectedRows = filteredData.filter((row) => {
        const rowId = normalizeBulkRowId(row?.id);
        return rowId != null && selectedRowIds.has(rowId);
      });
      const eligibleRows = selectedRows.filter((row) => rowSupportsBulkAction(row, button));
      const skippedCount = selectedRows.length - eligibleRows.length;

      if (eligibleRows.length === 0) {
        toast({
          title: 'No eligible rows',
          description: `None of the selected requests can be updated with "${formatBulkActionLabel(button.label, selectedRows.length)}".`,
          variant: 'destructive',
        });
        return;
      }

      setBulkApplying(applyingKey);
      const results = await Promise.allSettled(
        eligibleRows.map((row) => patchInventoryRowStatus(row, button))
      );

      let successCount = 0;
      let failCount = 0;
      const updatedById = new Map<string, any>();

      results.forEach((result, index) => {
        const row = eligibleRows[index];
        const rowId = normalizeBulkRowId(row?.id);
        if (result.status === 'fulfilled' && result.value && rowId != null) {
          updatedById.set(rowId, result.value);
          successCount += 1;
        } else {
          failCount += 1;
        }
      });

      if (updatedById.size > 0) {
        const applyUpdate = (r: any) => {
          const rowId = normalizeBulkRowId(r?.id);
          if (rowId == null) return r;
          const updated = updatedById.get(rowId);
          if (!updated) return r;
          const targetAttribute = (button.targetAttribute || 'status').trim() || 'status';
          const existingData = (r.data as Record<string, unknown>) || {};
          const nextData: Record<string, unknown> = {
            ...existingData,
            ...(updated?.data && typeof updated.data === 'object'
              ? (updated.data as Record<string, unknown>)
              : { [targetAttribute]: button.statusValue }),
          };
          if (nextData[targetAttribute] == null) {
            nextData[targetAttribute] = button.statusValue;
          }
          if (targetAttribute === 'status') {
            nextData.status_text =
              nextData.status_text ??
              (button.statusText ?? button.label ?? button.statusValue).trim();
          }
          const merged: Record<string, unknown> = {
            ...r,
            ...updated,
            data: nextData,
            [targetAttribute]: nextData[targetAttribute],
          };
          if (targetAttribute === 'status') {
            merged.status = nextData.status;
            merged.status_text = nextData.status_text;
            if (nextData.shipment_status != null) {
              merged.shipment_status = nextData.shipment_status;
            }
          }
          return transformLeadData(merged, config);
        };
        setData((prev) => prev.map(applyUpdate));
        setFilteredData((prev) => prev.map(applyUpdate));
      }

      setBulkApplying(null);
      const actionLabel = formatBulkActionLabel(button.label, selectedRows.length);

      if (successCount > 0 && failCount === 0 && skippedCount === 0) {
        toast({
          title: 'Updated',
          description: `${successCount} request${successCount === 1 ? '' : 's'} updated with "${actionLabel}".`,
        });
        setSelectedRowIds(new Set());
      } else if (successCount > 0) {
        const parts: string[] = [`${successCount} updated with "${actionLabel}"`];
        if (failCount > 0) parts.push(`${failCount} failed`);
        if (skippedCount > 0) parts.push(`${skippedCount} skipped`);
        toast({
          title: failCount > 0 ? 'Partially updated' : 'Updated',
          description: `${parts.join(', ')}.`,
          variant: failCount > 0 ? 'destructive' : undefined,
        });
        if (failCount === 0) setSelectedRowIds(new Set());
      } else {
        toast({
          title: 'Update failed',
          description: 'Could not update the selected requests.',
          variant: 'destructive',
        });
      }

      if (successCount > 0) {
        try {
          await fetchFilteredDataRef.current?.(undefined, undefined, {
            silent: true,
            keepPage: true,
          });
        } catch (e) {
          console.error('Error refreshing table after bulk status update', e);
        }
      }
    },
    [
      bulkSelectionEnabled,
      config,
      filteredData,
      patchInventoryRowStatus,
      rowSupportsBulkAction,
      selectedRowIds,
      toast,
    ]
  );

  // Build table columns from config only. No auto-appended Status column.
  const tableColumns: Column[] = useMemo(() => {
    const leftAlignKeys = new Set([
      'item_name',
      'item_name_freeform',
      'specifications',
      'comments',
      'department',
      'project_purpose',
    ]);
    const isMyRequestTable = isMyRequestPage;
    const configuredColumns = isMyRequestTable
      ? excludeInventoryTrackColumn(config?.columns)
      : config?.columns;
    const mapped = (configuredColumns ?? [])
      .filter((col) => {
        const key = String(col.key || '').trim();
        return key !== 'tracking_details' && key !== 'tracking_number' && key !== 'courier_name';
      })
      .map(col => {
        const key = String(col.key || '').trim();
        const isRequirementDate = key === 'required_date' || key === 'requirement_date';
        const resolvedKey = isRequirementDate ? 'eta' : key;
        return {
      header:
        resolvedKey === 'eta'
          ? 'ETA'
          : col.label,
      accessor: resolvedKey,
      type: (col.type === 'chip'
        ? 'chip'
        : col.type === 'link'
          ? 'link'
          : col.type === 'action'
            ? 'action'
            : 'text') as Column['type'],
      linkField: col.linkField,
      editableInTable: col.editableInTable,
      openCard: col.openCard,
      actionApiEndpoint: col.actionApiEndpoint,
      actionApiMethod: col.actionApiMethod,
      actionApiHeaders: col.actionApiHeaders,
      actionApiPayload: col.actionApiPayload,
      align: (leftAlignKeys.has(String(col.key || '')) ? 'left' : 'center') as Column['align'],
      ...(config?.tableType === 'itemsTable' && isInventoryRequestTable
        ? procurementColumnLayout(resolvedKey)
        : {}),
    };
    });
    const deduped: typeof mapped = [];
    const seenKeys = new Set<string>();
    for (const col of mapped) {
      if (seenKeys.has(col.accessor)) continue;
      seenKeys.add(col.accessor);
      deduped.push(col);
    }
    const base: Column[] = [...(deduped.length > 0 ? deduped : defaultColumns)] as Column[];
    if (!isInPageBuilder && isInventoryRequestTable) {
      const hasEditColumn = base.some((col) => {
        const accessor = String(col.accessor || '').trim().toLowerCase();
        const header = String(col.header || '').trim().toLowerCase();
        return (
          accessor === REQUESTER_EDIT_COLUMN_ACCESSOR ||
          accessor === 'edit' ||
          header === 'edit'
        );
      });
      if (!hasEditColumn) {
        base.push({
          header: 'Edit',
          accessor: REQUESTER_EDIT_COLUMN_ACCESSOR,
          type: 'action',
          align: 'center',
          ...procurementColumnLayout(REQUESTER_EDIT_COLUMN_ACCESSOR),
        });
      }
    }
    return base;
  }, [config?.columns, config?.tableType, effectiveStatusButtons, inventoryTableKind, isInPageBuilder, isInventoryRequestTable, isMyRequestPage]);

  // Get unique values for filters
  const getUniqueLeadStatuses = () => {
    if (filterOptions.lead_statuses.length > 0) {
      return filterOptions.lead_statuses;
    }
    const statuses = [...new Set(data.map(lead => lead.data?.lead_status).filter(Boolean))];
    return statuses;
  };

  // Check if filters are actually configured and active
  const hasActiveFilters = useMemo(() => {
    return normalizedFilters.length > 0 && !config?.showFallbackOnly && filterService;
  }, [normalizedFilters, config?.showFallbackOnly, filterService]);

  const getUniqueSources = () => {
    if (filterOptions.sources.length > 0) {
      return filterOptions.sources;
    }
    const sources = [...new Set(data.map(lead => lead.data?.lead_source || lead.data?.source).filter(Boolean))];
    return sources;
  };

  // Apply filters using the records endpoint
  const fetchFilteredData = async (
    requestSequence?: number,
    queryParams?: URLSearchParams,
    options?: { silent?: boolean; keepPage?: boolean },
  ) => {
    const silent = options?.silent === true;
    if (silent && (listFetchInFlightRef.current || searchTimeoutRef.current)) {
      return;
    }

    const abortController = new AbortController();
    listFetchInFlightRef.current = true;
    try {
      if (!silent) setTableLoading(true);

      if (!silent && abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (!silent) {
        abortControllerRef.current = abortController;
      }

      if (!effectiveApiEndpoint) {
        console.warn('LeadTableComponent: apiEndpoint is not configured.');
        return;
      }

      const currentSequence = requestSequence || ++requestSequenceRef.current;
      const endpoint = effectiveApiEndpoint;

      // Build query parameters
      let params: URLSearchParams;

      // If it's an Unmannd/inventory request table and keepPage is not explicitly provided, 
      // default to keeping the current page so edits don't bounce the user back to Page 1.
      const shouldKeepPage = options?.keepPage || isInventoryRequestTable;

      const page = shouldKeepPage
        ? String(paginationRef.current.currentPage || 1)
        : '1';
      const pageSize = String(paginationRef.current.pageSize || 10);
      const currentSearch = (latestSearchValueRef.current || searchTerm).trim();

      if (queryParams) {
        params = queryParams;
      } else if (hasActiveFilters) {
        const filterValues = { ...filterState.values };
        if (currentSearch) {
          filterValues.search = currentSearch;
        } else {
          delete filterValues.search;
        }
        params = filterService!.generateQueryParams(filterValues);
        // Add pagination parameters for both systems
        params.append('page', page);
        params.append('page_size', pageSize);
      } else {
        // Fallback to legacy filter system
        params = new URLSearchParams();

        // Only add entity_type if using generic records endpoint and entityType is configured
        // (and the endpoint URL does not already include entity_type)
        if (
          endpoint.includes('/crm-records/records') &&
          config?.entityType &&
          !/[?&]entity_type=/.test(endpoint)
        ) {
          params.append('entity_type', config.entityType);
        }

        // Add lead stage filters
        if (leadStatusFilter.length > 0) {
          params.append('lead_stage', leadStatusFilter.join(','));
        }

        // Add source filter
        if (sourceFilter !== 'all') {
          params.append('source', sourceFilter);
        }

        // Add date range filters
        if (dateRangeFilter.startDate) {
          const startDateTime = new Date(dateRangeFilter.startDate);
          const [startHour, startMinute] = dateRangeFilter.startTime.split(':').map(Number);
          startDateTime.setHours(startHour, startMinute, 0, 0);
          // Convert to ISO string for backend
          params.append('created_at__gte', startDateTime.toISOString());
        }
        if (dateRangeFilter.endDate) {
          const endDateTime = new Date(dateRangeFilter.endDate);
          const [endHour, endMinute] = dateRangeFilter.endTime.split(':').map(Number);
          endDateTime.setHours(endHour, endMinute, 59, 999);
          // Convert to ISO string for backend
          params.append('created_at__lte', endDateTime.toISOString());
        }

        // Include search and search_fields even when dynamic filters are not configured
        if (currentSearch) {
          params.append('search', currentSearch);
          if (config?.searchFields) {
            params.append('search_fields', config.searchFields);
          }
        }
        
        // Add pagination parameters for both systems
        params.append('page', page);
        params.append('page_size', pageSize);
      }

      // Remove assigned_to for GM users only when not explicitly set by "Assigned to" filter
      removeAssignedToForGM(params, { effectiveFilters, filterStateValues: filterState.values });

      const url = buildUrlWithParams(endpoint, params);

      const response = await apiClient.get(url, {
        signal: abortController.signal
      });

      const responseData = response.data;

      // Check if this response is still relevant
      if (currentSequence !== requestSequenceRef.current) {
        return;
      }

      // Handle different response formats
      let leads = [];
      let pageMeta = null;

      if (responseData.results && Array.isArray(responseData.results)) {
        leads = responseData.results;
        pageMeta = responseData.page_meta;
      } else if (responseData.data && Array.isArray(responseData.data)) {
        leads = responseData.data;
        pageMeta = responseData.page_meta;
      } else if (Array.isArray(responseData)) {
        leads = responseData;
      }

      // Transform the data
      const transformedData = leads.map((lead: any) => transformLeadData(lead, config));

      // Backend handles search filtering - no client-side filtering needed
      setFilteredData(transformedData);
      setFiltersApplied(true);

      // Update pagination from server response
      if (pageMeta) {
        setPagination({
          totalCount: pageMeta.total_count || 0,
          numberOfPages: pageMeta.number_of_pages || 0,
          currentPage: pageMeta.current_page || 1,
          pageSize: pageMeta.page_size || 10,
          nextPageLink: pageMeta.next_page_link || null,
          previousPageLink: pageMeta.previous_page_link || null
        });
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return;
      }
      console.error('Error applying filters:', error);
      toast({ title: 'Error', description: 'Failed to apply filters', variant: 'destructive' });
    } finally {
      listFetchInFlightRef.current = false;
      if (!silent && abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
      if (!silent) setTableLoading(false);
    }
  };
  fetchFilteredDataRef.current = fetchFilteredData;

  // Reset filters
  const resetFilters = async () => {
    // Clear all filter states
    setLeadStatusFilter(config?.defaultFilters?.lead_status || []);
    setSourceFilter('all');
    setDateRangeFilter({
      startDate: undefined,
      endDate: undefined,
      startTime: '00:00',
      endTime: '23:59'
    });
    setSearchTerm('');
    setDisplaySearchTerm('');
    latestSearchValueRef.current = '';

    // Clear dynamic filter state
    clearFilters();

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }

    if (!effectiveApiEndpoint) {
      console.warn('LeadTableComponent: apiEndpoint is not configured.');
      return;
    }

    const endpoint = effectiveApiEndpoint;

    // Update URL to clear filter parameters
    if (hasActiveFilters) {
      const params = filterService!.generateQueryParams({});
      // Add pagination parameters for complete URL state
      params.append('page', '1');
      params.append('page_size', '10');

      // Only add entity_type if using generic records endpoint and entityType is configured
      if (endpoint.includes('/crm-records/records') && config?.entityType) {
        params.append('entity_type', config.entityType);
      }

      updateURL(params);
    } else {
      // For legacy filters, clear URL manually
      const currentPath = location.pathname;
      navigate(currentPath, { replace: true });
    }

    // Re-fetch initial data to reset everything properly
    try {
      setTableLoading(true);
      const params = new URLSearchParams();

      if (endpoint.includes('/crm-records/records') && config?.entityType) {
        params.append('entity_type', config.entityType);
      }

      // Apply default filters if provided
      // if (config?.defaultFilters?.lead_stage && config.defaultFilters.lead_stage.length > 0) {
      //   params.append('lead_stage', config.defaultFilters.lead_stage.join(','));
      // }

      params.append('page', '1');
      params.append('page_size', '10');

      // Remove assigned_to for GM users only when not explicitly set by "Assigned to" filter
      removeAssignedToForGM(params, { effectiveFilters, filterStateValues: filterState.values });

      const url = buildUrlWithParams(endpoint, params);

      const response = await apiClient.get(url);
      const responseData = response.data;
      const leads = responseData.data || responseData.results || [];
      const pageMeta = responseData.page_meta;

      const transformedData = leads.map((lead: any) => transformLeadData(lead, config));

      setData(transformedData);
      setFilteredData(transformedData);
      setFiltersApplied(false);

      if (pageMeta) {
        setPagination({
          totalCount: pageMeta.total_count || 0,
          numberOfPages: pageMeta.number_of_pages || 0,
          currentPage: pageMeta.current_page || 1,
          pageSize: pageMeta.page_size || 10,
          nextPageLink: pageMeta.next_page_link || null,
          previousPageLink: pageMeta.previous_page_link || null
        });
      }
    } catch (error) {
      console.error('Error resetting filters:', error);
      toast({ title: 'Error', description: 'Failed to reset filters', variant: 'destructive' });
    } finally {
      setTableLoading(false);
    }
  };

  const lastApiCallTimeRef = useRef<number>(0);
  const MIN_TIME_BETWEEN_CALLS = 1000;

  // Debounced search function
  const debouncedSearch = useCallback((value: string) => {
    latestSearchValueRef.current = value;
    setDisplaySearchTerm(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchTimeoutRef.current = null;
      const finalSearchValue = latestSearchValueRef.current;
      const now = Date.now();
      const timeSinceLastCall = now - lastApiCallTimeRef.current;

      if (timeSinceLastCall < MIN_TIME_BETWEEN_CALLS) {
        const remainingWait = MIN_TIME_BETWEEN_CALLS - timeSinceLastCall;
        setTimeout(() => {
          makeApiCall(finalSearchValue);
        }, remainingWait);
      } else {
        makeApiCall(finalSearchValue);
      }

      function makeApiCall(searchValue: string) {
        lastApiCallTimeRef.current = Date.now();
        setSearchTerm(searchValue);

        const apiSequence = ++requestSequenceRef.current;
        let params: URLSearchParams | undefined;
        const endpointForEntityCheck = effectiveApiEndpoint ?? '';
        // Update URL with search parameter if using dynamic filters; otherwise include search directly
        if (hasActiveFilters) {
          const currentFilters = { ...filterState.values };
          if (searchValue.trim()) {
            currentFilters.search = searchValue.trim();
          } else {
            delete currentFilters.search;
          }
          params = filterService!.generateQueryParams(currentFilters);
          // Add pagination parameters for complete URL state
          params.append('page', '1');
          params.append('page_size', '10');

          // Only add entity_type if using generic records endpoint and entityType is configured
          if (endpointForEntityCheck.includes('/crm-records/records') && config?.entityType) {
            params.append('entity_type', config.entityType);
          }

          updateURL(params);
        } else {
          // No dynamic filters configured: still send search and search_fields
          params = new URLSearchParams();
          if (searchValue.trim()) {
            params.append('search', searchValue.trim());
            if (config?.searchFields) {
              params.append('search_fields', config.searchFields);
            }
          }
          // Add pagination parameters for complete URL state
          params.append('page', '1');
          params.append('page_size', '10');

          // Only add entity_type if using generic records endpoint and entityType is configured
          if (endpointForEntityCheck.includes('/crm-records/records') && config?.entityType) {
            params.append('entity_type', config.entityType);
          }

          updateURL(params);
        }

        // Always call fetchFilteredData to refresh data and pagination
        // This ensures pagination works correctly after clearing search
        fetchFilteredData(apiSequence, params);
      }
    }, 1000);
  }, [fetchFilteredData, data, leadStatusFilter, sourceFilter, dateRangeFilter, hasActiveFilters, filterState.values, filterService, effectiveApiEndpoint, config?.entityType, updateURL, displaySearchTerm]);

  useRecordUpdated(
    (payload: RecordUpdatedPayload) => {
      if (!session?.access_token) return;
      if (searchTimeoutRef.current) return;

      const recordId = payload.record_id != null ? String(payload.record_id) : '';
      if (!recordId) return;

      const matches = (row: any) => {
        const id = row?.id != null ? String(row.id) : '';
        const rid = row?.record_id != null ? String(row.record_id) : '';
        return id === recordId || rid === recordId;
      };

      const patchRow = (row: any) => {
        const stage =
          payload.lead_stage != null && String(payload.lead_stage).trim()
            ? String(payload.lead_stage)
            : undefined;
        const nextData =
          payload.data && typeof payload.data === 'object'
            ? { ...(row.data && typeof row.data === 'object' ? row.data : {}), ...payload.data }
            : row.data;
        return {
          ...row,
          ...(stage ? { lead_stage: stage, status: stage } : {}),
          ...(payload.assigned_to !== undefined ? { assigned_to: payload.assigned_to } : {}),
          ...(nextData !== undefined ? { data: nextData } : {}),
        };
      };

      let found = false;
      const patchList = (prev: any[]) => {
        const idx = prev.findIndex(matches);
        if (idx < 0) return prev;
        found = true;
        const next = prev.slice();
        next[idx] = patchRow(prev[idx]);
        return next;
      };
      setFilteredData(patchList);
      setData(patchList);

      if (found || !payload.created) return;
      if (createdRefreshTimerRef.current != null) {
        window.clearTimeout(createdRefreshTimerRef.current);
      }
      createdRefreshTimerRef.current = window.setTimeout(() => {
        createdRefreshTimerRef.current = null;
        void fetchFilteredData(undefined, undefined, { silent: true, keepPage: true });
      }, REALTIME_LIST_DEBOUNCE_MS);
    },
    {
      entityType: 'lead',
      enabled: !config?.entityType || config.entityType === 'lead',
    },
  );

  // Handle search input change
  const handleSearchChange = useCallback((value: string) => {
    debouncedSearch(value);
  }, [debouncedSearch]);


  // Row click: behavior depends on detailMode (lead card vs record detail vs none)
  const handleRowClick = useCallback((row: any) => {
    if (effectiveDetailMode === 'none') return;
    if (effectiveDetailMode === 'lead_card') {
      setSelectedLead(row);
      setIsLeadModalOpen(true);
      return;
    }
    if (effectiveDetailMode === 'lead_assignment_modal') {
      setSelectedRecord(row);
      setIsCustomModalOpen(true);
      return;
    }
    // inventory_request (or any other record type)
    setSelectedRecord(row);
    setIsRecordDetailModalOpen(true);
  }, [effectiveDetailMode]);

  // Handle pagination navigation
  const handleNextPage = async () => {
    if (pagination.nextPageLink) {
      try {
        setTableLoading(true);
        const response = await apiClient.get(pagination.nextPageLink);
        const responseData = response.data;
        const leads = responseData.data || responseData.results || [];
        const pageMeta = responseData.page_meta;

        const transformedData = leads.map((lead: any) => transformLeadData(lead, config));

        setData(transformedData);
        setFilteredData(transformedData);
        
        if (pageMeta) {
          setPagination({
            totalCount: pageMeta.total_count || 0,
            numberOfPages: pageMeta.number_of_pages || 0,
            currentPage: pageMeta.current_page || 1,
            pageSize: pageMeta.page_size || 10,
            nextPageLink: pageMeta.next_page_link || null,
            previousPageLink: pageMeta.previous_page_link || null
          });
        }
      } catch (error) {
        console.error('Error fetching next page:', error);
        toast({ title: 'Error', description: 'Failed to load next page', variant: 'destructive' });
      } finally {
        setTableLoading(false);
      }
    }
  };

  const handlePreviousPage = async () => {
    if (pagination.previousPageLink) {
      try {
        setTableLoading(true);
        const response = await apiClient.get(pagination.previousPageLink);
        const responseData = response.data;
        const leads = responseData.data || responseData.results || [];
        const pageMeta = responseData.page_meta;

        const transformedData = leads.map((lead: any) => transformLeadData(lead, config));

        setData(transformedData);
        setFilteredData(transformedData);
        
        if (pageMeta) {
          setPagination({
            totalCount: pageMeta.total_count || 0,
            numberOfPages: pageMeta.number_of_pages || 0,
            currentPage: pageMeta.current_page || 1,
            pageSize: pageMeta.page_size || 10,
            nextPageLink: pageMeta.next_page_link || null,
            previousPageLink: pageMeta.previous_page_link || null
          });
        }
      } catch (error) {
        console.error('Error fetching previous page:', error);
        toast({ title: 'Error', description: 'Failed to load previous page', variant: 'destructive' });
      } finally {
        setTableLoading(false);
      }
    }
  };

  const handleLeadUpdate = (updatedLead: any) => {
    const updatedData = data.map(lead => 
      lead.id === updatedLead.id ? updatedLead : lead
    );
    setData(updatedData);
    
    if (filtersApplied) {
      fetchFilteredData();
    } else {
      setFilteredData(updatedData);
    }
    
    setIsLeadModalOpen(false);
  };

  const buildInitialRecordsParams = useCallback(() => {
    if (!effectiveApiEndpoint) {
      return null;
    }

    const endpoint = effectiveApiEndpoint;
    const service = filterServiceRef.current;
    const useDynamicFilters =
      normalizedFilters.length > 0 && !config?.showFallbackOnly && service;

    let params: URLSearchParams;
    if (useDynamicFilters) {
      params = service.generateQueryParams(filterState.values);
      if (
        endpoint.includes('/crm-records/records') &&
        config?.entityType &&
        !/[?&]entity_type=/.test(endpoint)
      ) {
        params.append('entity_type', config.entityType);
      }
    } else {
      params = new URLSearchParams();
      if (
        endpoint.includes('/crm-records/records') &&
        config?.entityType &&
        !/[?&]entity_type=/.test(endpoint)
      ) {
        params.append('entity_type', config.entityType);
      }
      if (config?.defaultFilters?.lead_stage && config.defaultFilters.lead_stage.length > 0) {
        params.append('lead_stage', config.defaultFilters.lead_stage.join(','));
      }
    }

    params.append('page', '1');
    params.append('page_size', '10');
    removeAssignedToForGM(params, { effectiveFilters, filterStateValues: filterState.values });
    return { endpoint, params };
  }, [
    effectiveApiEndpoint,
    normalizedFilters.length,
    config?.showFallbackOnly,
    config?.entityType,
    config?.defaultFilters,
    filterState.values,
    effectiveFilters,
    removeAssignedToForGM,
  ]);

  /** Jump to an absolute page number (typed in the pagination input). */
  const handleGoToPage = useCallback(
    async (pageNum: number) => {
      const totalPages = Math.max(
        1,
        pagination.numberOfPages ||
          (pagination.pageSize > 0
            ? Math.ceil((pagination.totalCount || 0) / pagination.pageSize)
            : 1)
      );
      const target = Math.min(Math.max(1, Math.trunc(pageNum)), totalPages);
      if (!Number.isFinite(target) || target === pagination.currentPage) {
        return;
      }

      try {
        setTableLoading(true);

        let url: string | null = null;
        const linkSource = pagination.nextPageLink || pagination.previousPageLink;
        if (linkSource) {
          try {
            const absolute = linkSource.startsWith('http')
              ? linkSource
              : `${window.location.origin}${linkSource.startsWith('/') ? '' : '/'}${linkSource}`;
            const u = new URL(absolute);
            u.searchParams.set('page', String(target));
            url = linkSource.startsWith('http')
              ? u.toString()
              : `${u.pathname}${u.search}`;
          } catch {
            url = null;
          }
        }

        if (!url) {
          const built = buildInitialRecordsParams();
          if (!built) return;
          built.params.set('page', String(target));
          built.params.set('page_size', String(pagination.pageSize || 10));
          if (searchTerm && searchTerm.trim() !== '') {
            built.params.set('search', searchTerm.trim());
            if (config?.searchFields) {
              built.params.set('search_fields', config.searchFields);
            }
          }
          url = buildUrlWithParams(built.endpoint, built.params);
          updateURL(built.params);
        }

        const response = await apiClient.get(url);
        const responseData = response.data;
        const leads = responseData.data || responseData.results || [];
        const pageMeta = responseData.page_meta;
        const transformedData = leads.map((lead: any) => transformLeadData(lead, config));

        setData(transformedData);
        setFilteredData(transformedData);

        if (pageMeta) {
          setPagination({
            totalCount: pageMeta.total_count || 0,
            numberOfPages: pageMeta.number_of_pages || 0,
            currentPage: pageMeta.current_page || target,
            pageSize: pageMeta.page_size || pagination.pageSize || 10,
            nextPageLink: pageMeta.next_page_link || null,
            previousPageLink: pageMeta.previous_page_link || null,
          });
        } else {
          setPagination((prev) => ({ ...prev, currentPage: target }));
        }
      } catch (error) {
        console.error('Error jumping to page:', error);
        toast({ title: 'Error', description: 'Failed to load that page', variant: 'destructive' });
      } finally {
        setTableLoading(false);
      }
    },
    [
      apiClient,
      buildInitialRecordsParams,
      buildUrlWithParams,
      config,
      pagination.currentPage,
      pagination.numberOfPages,
      pagination.nextPageLink,
      pagination.pageSize,
      pagination.previousPageLink,
      pagination.totalCount,
      searchTerm,
      toast,
      updateURL,
    ]
  );

  const initialRecordsFetchKey = useMemo(() => {
    if (!session?.access_token || !membershipLoaded || config?.showFallbackOnly) {
      return null;
    }
    const built = buildInitialRecordsParams();
    if (!built) {
      return null;
    }
    return buildUrlWithParams(built.endpoint, built.params);
  }, [
    session?.access_token,
    membershipLoaded,
    config?.showFallbackOnly,
    buildInitialRecordsParams,
    buildUrlWithParams,
  ]);

  useEffect(() => {
    if (config?.showFallbackOnly) {
      setData([]);
      setFilteredData([]);
      setLoading(false);
      lastInitialFetchKeyRef.current = '';
      return;
    }

    if (!initialRecordsFetchKey) {
      // No fetch key yet: clear loading unless we're still waiting on membership.
      if (!session?.access_token) {
        lastInitialFetchKeyRef.current = '';
        setLoading(false);
        return;
      }
      if (!membershipLoaded) {
        // Still resolving membership / placeholders — keep loading.
        return;
      }
      // Logged in + membership ready, but no apiEndpoint / nothing to fetch (e.g. fresh drag).
      lastInitialFetchKeyRef.current = '';
      setData([]);
      setFilteredData([]);
      setLoading(false);
      return;
    }

    if (lastInitialFetchKeyRef.current === initialRecordsFetchKey) {
      return;
    }
    if (initialFetchInFlightKeyRef.current === initialRecordsFetchKey) {
      return;
    }
    initialFetchInFlightKeyRef.current = initialRecordsFetchKey;

    const built = buildInitialRecordsParams();
    if (!built) {
      initialFetchInFlightKeyRef.current = null;
      setLoading(false);
      return;
    }

    let stale = false;

    const fetchLeads = async () => {
      try {
        setLoading(true);
        updateURL(built.params);
        const response = await apiClient.get(initialRecordsFetchKey);
        if (stale) {
          return;
        }
        const responseData = response.data;
        let leads = [];
        let pageMeta = null;

        if (responseData.data && Array.isArray(responseData.data)) {
          leads = responseData.data;
          pageMeta = responseData.page_meta;
        } else if (responseData.results && Array.isArray(responseData.results)) {
          leads = responseData.results;
          pageMeta = responseData.page_meta;
        } else if (Array.isArray(responseData)) {
          leads = responseData;
        }

        const transformedData = leads.map((lead: any) => transformLeadData(lead, config));
        setData(transformedData);
        setFilteredData(transformedData);

        if (pageMeta) {
          setPagination({
            totalCount: pageMeta.total_count || 0,
            numberOfPages: pageMeta.number_of_pages || 0,
            currentPage: pageMeta.current_page || 1,
            pageSize: pageMeta.page_size || 10,
            nextPageLink: pageMeta.next_page_link || null,
            previousPageLink: pageMeta.previous_page_link || null,
          });
        }

        const uniqueSources = [
          ...new Set(transformedData.map((lead: any) => lead.lead_source || lead.source).filter(Boolean)),
        ];
        setFilterOptions((prev) => ({
          ...prev,
          sources: uniqueSources as string[],
        }));
        lastInitialFetchKeyRef.current = initialRecordsFetchKey;
      } catch (error: any) {
        if (
          stale ||
          error?.name === 'AbortError' ||
          error?.code === 'ERR_CANCELED' ||
          error?.message?.includes('cancelled') ||
          error?.message?.includes('canceled') ||
          error?.message?.includes('aborted')
        ) {
          return;
        }
        console.error('Error fetching leads:', error);
        setData([]);
        setFilteredData([]);
        toast({ title: 'Error', description: 'Failed to fetch leads', variant: 'destructive' });
      } finally {
        if (!stale) {
          setLoading(false);
        }
        if (initialFetchInFlightKeyRef.current === initialRecordsFetchKey) {
          initialFetchInFlightKeyRef.current = null;
        }
      }
    };

    void fetchLeads();
    return () => {
      stale = true;
      if (initialFetchInFlightKeyRef.current === initialRecordsFetchKey) {
        initialFetchInFlightKeyRef.current = null;
      }
    };
  }, [
    initialRecordsFetchKey,
    buildInitialRecordsParams,
    config?.showFallbackOnly,
    session?.access_token,
    membershipLoaded,
    effectiveApiEndpoint,
    updateURL,
    toast,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (createdRefreshTimerRef.current != null) {
        window.clearTimeout(createdRefreshTimerRef.current);
        createdRefreshTimerRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    config,
    loading,
    effectiveApiEndpoint,
    displaySearchTerm,
    handleSearchChange,
    showFilters,
    setShowFilters,
    hasActiveFilters,
    effectiveFilters,
    filterState,
    setFilterValue,
    setFilterValues,
    clearFilters,
    applyFilterState,
    resetFilters,
    isFilterActive,
    getActiveFiltersCount,
    getQueryParams,
    getFilterDisplayValue,
    updateURL,
    requestSequenceRef,
    fetchFilteredData,
    filteredData,
    pagination,
    filtersApplied,
    filterService,
    tableLoading,
    tableColumns,
    isInPageBuilder,
    effectiveDetailMode,
    handleRowClick,
    renderCell,
    handlePreviousPage,
    handleNextPage,
    handleGoToPage,
    isLeadModalOpen,
    setIsLeadModalOpen,
    setSelectedLead,
    setActionButtonsVisible,
    leadCardRef,
    selectedLead,
    data,
    setData,
    setFilteredData,
    handleModalLeadUpdate,
    actionButtonsVisible,
    isCallBackModalOpen,
    setIsCallBackModalOpen,
    isRecordDetailModalOpen,
    setIsRecordDetailModalOpen,
    setSelectedRecord,
    selectedRecord,
    useFormModal,
    isCustomModalOpen,
    setIsCustomModalOpen,
    apiClient,
    bulkSelectionEnabled,
    selectedRowIds,
    selectedRowCount,
    bulkSelectionStatus,
    bulkActionButtons,
    bulkApplying,
    canSelectBulkRow,
    toggleBulkRowSelection,
    toggleBulkSelectAll,
    clearBulkSelection,
    handleBulkStatusAction,
    bulkStatusPickerOpen,
    setBulkStatusPickerOpen,
    bulkStatusPickerOptions,
    selectBulkRowsByStatus,
  };
}

export type LeadTableModel = ReturnType<typeof useLeadTable>;