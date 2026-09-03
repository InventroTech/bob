/** State, effects, and handlers for the ticket table with full dynamic filter support. */

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { REALTIME_LIST_DEBOUNCE_MS, useRecordUpdated } from '@/hooks/useRecordUpdated';
import type { RecordUpdatedPayload } from '@/lib/realtime/types';
import { buildActionApiRequest } from '@/lib/utils/actionApiUtils';
import { convertGMTtoIST } from '@/lib/utils/timeUtils';

import type { Column, TicketTableProps } from './types';
import {
  TICKET_API_BASE,
  defaultColumns,
  transformTicketForCarousel,
  getDisplayName,
} from './utils';

export function useTicketTable({ config }: TicketTableProps) {
  const [data, setData] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  const [dynamicFilterValues, setDynamicFilterValues] = useState<Record<string, any>>({});
  
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

  const [apiPrefix, setApiPrefix] = useState<'supabase' | 'renderer'>(
    config?.apiPrefix || 'renderer'
  );
  const [filtersApplied, setFiltersApplied] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [displaySearchTerm, setDisplaySearchTerm] = useState<string>('');
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const listFetchInFlightRef = useRef(false);
  const requestSequenceRef = useRef<number>(0);
  const baseDataRef = useRef<any[]>([]);
  const latestSearchValueRef = useRef<string>('');
  latestSearchValueRef.current = searchTerm;
  
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

  const { session, user } = useAuth();

  const tableColumns: Column[] = useMemo(() => 
    config?.columns?.map(col => ({
      header: col.label,
      accessor: col.key,
      type: col.type === 'chip' ? 'chip' : col.type === 'link' ? 'link' : col.type === 'action' ? 'action' : 'text',
      openCard: col.openCard,
      actionApiEndpoint: col.actionApiEndpoint,
      actionApiMethod: col.actionApiMethod,
      actionApiHeaders: col.actionApiHeaders,
      actionApiPayload: col.actionApiPayload,
    })) || defaultColumns,
    [config?.columns]
  );

  const applyFilters = async (
    requestSequence?: number,
    options?: { silent?: boolean; keepPage?: boolean }
  ) => {
    const silent = options?.silent === true;
    if (silent && listFetchInFlightRef.current) {
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
      
      const currentSequence = requestSequence || ++requestSequenceRef.current;
      const authToken = session?.access_token;
      const baseUrl = TICKET_API_BASE;
      const apiUrl = `${baseUrl}/analytics/support-ticket/`;
      
      const params = new URLSearchParams();
      
      Object.entries(dynamicFilterValues).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          const keysToAppend = key === 'reason' 
            ? ['reason', 'reason__in', 'reason__icontains', 'ticket_reason'] 
            : [key];

          keysToAppend.forEach(pK => {
            if (Array.isArray(val)) {
              if (val.length > 0) {
                params.append(pK, val.join(','));
                val.forEach(item => {
                  params.append(pK, String(item));
                });
              }
            } else {
              params.append(pK, String(val));
            }
          });
        }
      });

      if (dateRangeFilter.startDate) {
        const startDateTime = new Date(dateRangeFilter.startDate);
        startDateTime.setHours(parseInt(dateRangeFilter.startTime.split(':')[0]), parseInt(dateRangeFilter.startTime.split(':')[1]));
        params.append('created_at__gte', startDateTime.toISOString());
      }
      if (dateRangeFilter.endDate) {
        const endDateTime = new Date(dateRangeFilter.endDate);
        endDateTime.setHours(parseInt(dateRangeFilter.endTime.split(':')[0]), parseInt(dateRangeFilter.endTime.split(':')[1]));
        params.append('created_at__lte', endDateTime.toISOString());
      }

      const currentSearchTerm = latestSearchValueRef.current.trim();
      if (currentSearchTerm) {
        params.append('search', currentSearchTerm);
        if (config?.searchFields) {
          params.append('search_fields', config.searchFields);
        }
      }
      
      const page = options?.keepPage 
        ? String(paginationRef.current.currentPage || 1) 
        : '1';
      params.append('page', page);
      params.append('page_size', '50');
      
      const fullUrl = `${apiUrl}?${params.toString()}`;

      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authToken ? `Bearer ${authToken}` : ''
        },
        signal: abortController.signal
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error(`Rate limit exceeded. Please wait a moment before searching again.`);
        }
        throw new Error(`Failed to fetch filtered tickets: ${response.status}`);
      }

      const responseData = await response.json();
      
      if (currentSequence !== requestSequenceRef.current) {
        return;
      }
      
      let tickets: any[] = [];
      let pageMeta = null;
      
      const ensureArray = (val: any): any[] => Array.isArray(val) ? val : val != null && typeof val === 'object' ? [val] : [];
      
      if (responseData.results !== undefined) {
        tickets = ensureArray(responseData.results);
        pageMeta = responseData.page_meta;
      } else if (responseData.data !== undefined) {
        tickets = ensureArray(responseData.data);
        pageMeta = responseData.page_meta;
      } else if (Array.isArray(responseData)) {
        tickets = responseData;
      } else {
        throw new Error('Invalid data format received');
      }

      const transformedData = tickets.map((ticket: any) => ({
        ...ticket,
        created_at: ticket.created_at ? convertGMTtoIST(ticket.created_at) : 'N/A',
        cse_name: getDisplayName(ticket.cse_name || ticket.assigned_to),
        name: ticket.first_name && ticket.last_name 
          ? `${ticket.first_name} ${ticket.last_name}`
          : ticket.name || 'N/A',
        reason: ticket.reason || ticket.Description || 'No reason provided',
        resolution_status: ticket.resolution_status || ticket.status || 'Open',
        poster: ticket.poster || 'No Poster',
        praja_dashboard_user_link: ticket.praja_user_id 
          ? `https://app.praja.com/dashboard/user/${ticket.praja_user_id}`
          : ticket.praja_dashboard_user_link || 'N/A',
        display_pic_url: ticket.display_pic_url || null
      }));

      baseDataRef.current = transformedData;
      setFilteredData(transformedData);
      setFiltersApplied(true);
      
      if (pageMeta) {
        setPagination({
          totalCount: pageMeta.total_count || 0,
          numberOfPages: pageMeta.number_of_pages || 0,
          currentPage: pageMeta.current_page || 1,
          pageSize: pageMeta.page_size || 50,
          nextPageLink: pageMeta.next_page_link || null,
          previousPageLink: pageMeta.previous_page_link || null
        });
      }
    } catch (error: unknown) {
      const err = error as { name?: string; message?: string };
      if (err.name === 'AbortError') return;
      console.error('Error applying filters:', error);
      if (err.message?.includes('Rate limit')) {
        toast.error('Rate limit exceeded. Please wait a moment.');
      } else {
        toast.error('Failed to apply filters');
      }
    } finally {
      listFetchInFlightRef.current = false;
      if (!silent && abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
      if (!silent) setTableLoading(false);
    }
  };

  const resetFilters = () => {
    setDynamicFilterValues({});
    setDateRangeFilter({
      startDate: undefined,
      endDate: undefined,
      startTime: '00:00',
      endTime: '23:59'
    });
    setSearchTerm('');
    setDisplaySearchTerm('');
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
    baseDataRef.current = data;
    setFilteredData(data);
    setFiltersApplied(false);
  };

  const debouncedSearch = useCallback((value: string) => {
    setDisplaySearchTerm(value);

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    searchTimeoutRef.current = setTimeout(async () => {
      const term = value.trim();
      setSearchTerm(term);
      
      if (!term) {
        setSearchLoading(false);
        if (filtersApplied) {
          applyFilters();
        } else {
          setFilteredData(data);
        }
        return;
      }
      
      setSearchLoading(true);
      try {
        await applyFilters();
      } finally {
        setSearchLoading(false);
      }
    }, 500);
  }, [data, filtersApplied, dynamicFilterValues, dateRangeFilter]);

  const handleSearchChange = useCallback((value: string) => {
    debouncedSearch(value);
  }, [debouncedSearch]);

  const handleRowClick = useCallback((row: any) => {
    setSelectedTicket(transformTicketForCarousel(row));
    setIsTicketModalOpen(true);
  }, []);

  const handleActionClick = useCallback(async (row: any, col: Column) => {
    const openCard = col.openCard === true || col.openCard === 'true';
    if (openCard) {
      setSelectedTicket(transformTicketForCarousel(row));
      setIsTicketModalOpen(true);
    }
    if (col.actionApiEndpoint?.trim()) {
      try {
        const baseUrl = TICKET_API_BASE;
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
            'Authorization': session?.access_token ? `Bearer ${session.access_token}` : ''
          },
          'ticket_id'
        );
        const res = await fetch(url, { method, headers, body });
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        toast.success('Action completed');
      } catch (err: any) {
        toast.error(err?.message || 'Action failed');
      }
    }
  }, [session?.access_token]);

  const handleNextPage = async () => {
    if (pagination.nextPageLink) {
      try {
        setTableLoading(true);
        const authToken = session?.access_token;
        const response = await fetch(pagination.nextPageLink, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authToken ? `Bearer ${authToken}` : ''
          }
        });

        if (!response.ok) throw new Error(`Failed to fetch next page`);
        const responseData = await response.json();
        const tickets = responseData.data || [];
        const pageMeta = responseData.page_meta;

        const transformedData = tickets.map((ticket: any) => ({
          ...ticket,
          created_at: ticket.created_at ? convertGMTtoIST(ticket.created_at) : 'N/A',
          cse_name: getDisplayName(ticket.cse_name || ticket.assigned_to),
          name: ticket.first_name && ticket.last_name ? `${ticket.first_name} ${ticket.last_name}` : ticket.name || 'N/A',
          reason: ticket.reason || ticket.Description || 'No reason provided',
          resolution_status: ticket.resolution_status || ticket.status || 'Open',
          poster: ticket.poster || 'No Poster',
          praja_dashboard_user_link: ticket.praja_user_id ? `https://app.praja.com/dashboard/user/${ticket.praja_user_id}` : 'N/A',
          display_pic_url: ticket.display_pic_url || null
        }));

        setData(transformedData);
        setFilteredData(transformedData);
        if (pageMeta) {
          setPagination({
            totalCount: pageMeta.total_count || 0,
            numberOfPages: pageMeta.number_of_pages || 0,
            currentPage: pageMeta.current_page || 1,
            pageSize: pageMeta.page_size || 50,
            nextPageLink: pageMeta.next_page_link || null,
            previousPageLink: pageMeta.previous_page_link || null
          });
        }
      } catch (error) {
        console.error('Error fetching next page:', error);
        toast.error('Failed to load next page');
      } finally {
        setTableLoading(false);
      }
    }
  };

  const handlePreviousPage = async () => {
    if (pagination.previousPageLink) {
      try {
        setTableLoading(true);
        const authToken = session?.access_token;
        const response = await fetch(pagination.previousPageLink, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authToken ? `Bearer ${authToken}` : ''
          }
        });

        if (!response.ok) throw new Error(`Failed to fetch previous page`);
        const responseData = await response.json();
        const tickets = responseData.data || [];
        const pageMeta = responseData.page_meta;

        const transformedData = tickets.map((ticket: any) => ({
          ...ticket,
          created_at: ticket.created_at ? convertGMTtoIST(ticket.created_at) : 'N/A',
          cse_name: getDisplayName(ticket.cse_name || ticket.assigned_to),
          name: ticket.first_name && ticket.last_name ? `${ticket.first_name} ${ticket.last_name}` : ticket.name || 'N/A',
          reason: ticket.reason || ticket.Description || 'No reason provided',
          resolution_status: ticket.resolution_status || ticket.status || 'Open',
          poster: ticket.poster || 'No Poster',
          praja_dashboard_user_link: ticket.praja_user_id ? `https://app.praja.com/dashboard/user/${ticket.praja_user_id}` : 'N/A',
          display_pic_url: ticket.display_pic_url || null
        }));

        setData(transformedData);
        setFilteredData(transformedData);
        if (pageMeta) {
          setPagination({
            totalCount: pageMeta.total_count || 0,
            numberOfPages: pageMeta.number_of_pages || 0,
            currentPage: pageMeta.current_page || 1,
            pageSize: pageMeta.page_size || 50,
            nextPageLink: pageMeta.next_page_link || null,
            previousPageLink: pageMeta.previous_page_link || null
          });
        }
      } catch (error) {
        console.error('Error fetching previous page:', error);
        toast.error('Failed to load previous page');
      } finally {
        setTableLoading(false);
      }
    }
  };

  const handlePageChange = async (pageNumber: string) => {
    const page = parseInt(pageNumber, 10);
    if (isNaN(page) || page < 1 || page > pagination.numberOfPages) return;

    try {
      setTableLoading(true);
      const authToken = session?.access_token;
      const baseUrl = TICKET_API_BASE;
      const apiUrl = `${baseUrl}/analytics/support-ticket/`;
      const params = new URLSearchParams();

      Object.entries(dynamicFilterValues).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          const keysToAppend = key === 'reason' 
            ? ['reason', 'reason__in', 'reason__icontains', 'ticket_reason'] 
            : [key];

          keysToAppend.forEach(pK => {
            if (Array.isArray(val)) {
              if (val.length > 0) {
                params.append(pK, val.join(','));
                val.forEach(item => {
                  params.append(pK, String(item));
                });
              }
            } else {
              params.append(pK, String(val));
            }
          });
        }
      });

      if (dateRangeFilter.startDate) {
        const startDateTime = new Date(dateRangeFilter.startDate);
        startDateTime.setHours(parseInt(dateRangeFilter.startTime.split(':')[0]), parseInt(dateRangeFilter.startTime.split(':')[1]));
        params.append('created_at__gte', startDateTime.toISOString());
      }
      if (dateRangeFilter.endDate) {
        const endDateTime = new Date(dateRangeFilter.endDate);
        endDateTime.setHours(parseInt(dateRangeFilter.endTime.split(':')[0]), parseInt(dateRangeFilter.endTime.split(':')[1]));
        params.append('created_at__lte', endDateTime.toISOString());
      }

      if (searchTerm) {
        params.append('search', searchTerm);
        if (config?.searchFields) params.append('search_fields', config.searchFields);
      }

      params.append('page', page.toString());
      params.append('page_size', '50');

      const response = await fetch(`${apiUrl}?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authToken ? `Bearer ${authToken}` : ''
        }
      });

      if (!response.ok) throw new Error(`Failed to fetch page ${page}`);
      const responseData = await response.json();
      const tickets = responseData.data || responseData.results || [];
      const pageMeta = responseData.page_meta;

      const transformedData = tickets.map((ticket: any) => ({
        ...ticket,
        created_at: ticket.created_at ? convertGMTtoIST(ticket.created_at) : 'N/A',
        cse_name: getDisplayName(ticket.cse_name || ticket.assigned_to),
        name: ticket.first_name && ticket.last_name ? `${ticket.first_name} ${ticket.last_name}` : ticket.name || 'N/A',
        reason: ticket.reason || ticket.Description || 'No reason provided',
        resolution_status: ticket.resolution_status || ticket.status || 'Open',
        poster: ticket.poster || 'No Poster',
        praja_dashboard_user_link: ticket.praja_user_id ? `https://app.praja.com/dashboard/user/${ticket.praja_user_id}` : 'N/A',
        display_pic_url: ticket.display_pic_url || null
      }));

      setData(transformedData);
      setFilteredData(transformedData);
      if (pageMeta) {
        setPagination({
          totalCount: pageMeta.total_count || 0,
          numberOfPages: pageMeta.number_of_pages || 0,
          currentPage: pageMeta.current_page || 1,
          pageSize: pageMeta.page_size || 50,
          nextPageLink: pageMeta.next_page_link || null,
          previousPageLink: pageMeta.previous_page_link || null
        });
      }
    } catch (error) {
      console.error('Error fetching page:', error);
      toast.error(`Failed to load page ${page}`);
    } finally {
      setTableLoading(false);
    }
  };

  useRecordUpdated(useCallback((payload: any) => {
    if (!session?.access_token) return;
    const recordId = payload.record_id != null ? String(payload.record_id) : '';
    if (!recordId) return;

    const matches = (item: any) => String(item?.id ?? item?.ticket_id ?? '') === recordId;
    let found = false;
    const patchList = (prev: any[]) => {
      const idx = prev.findIndex(matches);
      if (idx < 0) return prev;
      found = true;
      const next = prev.slice();
      next[idx] = {
        ...prev[idx],
        ...(payload.assigned_to !== undefined ? { assigned_to: payload.assigned_to } : {}),
      };
      return next;
    };

    setFilteredData(patchList);
    setData(patchList);

    if (found || !payload.created) return;
    void applyFilters(undefined, { silent: true, keepPage: true });
  }, [session?.access_token, applyFilters]), { entityType: 'support_ticket' });

  const handleTicketUpdate = (updatedTicket: any) => {
    const updatedData = data.map(ticket => 
      ticket.id === updatedTicket.id ? updatedTicket : ticket
    );
    setData(updatedData);
    if (filtersApplied) {
      applyFilters();
    } else {
      setFilteredData(updatedData);
    }
    setIsTicketModalOpen(false);
  };

  useEffect(() => {
    const abortController = new AbortController();

    const fetchTickets = async () => {
      try {
        setLoading(true);
        const authToken = session?.access_token;
        const endpoint = config?.apiEndpoint || '/api/tickets';
        const useRenderer = apiPrefix === 'renderer' || endpoint.includes('/support-ticket/');
        const baseUrl = useRenderer ? TICKET_API_BASE : import.meta.env.VITE_API_URI;
        const apiUrl = `${baseUrl}${endpoint}?page=1&page_size=50`;
        
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Authorization': authToken ? `Bearer ${authToken}` : ''
        };

        const response = await fetch(apiUrl, { method: 'GET', headers, signal: abortController.signal });
        if (!response.ok) throw new Error(`Failed to fetch tickets: ${response.status}`);

        const responseData = await response.json();
        const tickets = responseData.data || responseData.tickets || (Array.isArray(responseData) ? responseData : []);
        const pageMeta = responseData.page_meta;

        const transformedData = tickets.map((ticket: any) => ({
          ...ticket,
          created_at: ticket.created_at ? convertGMTtoIST(ticket.created_at) : 'N/A',
          cse_name: getDisplayName(ticket.cse_name || ticket.assigned_to),
          name: ticket.first_name && ticket.last_name ? `${ticket.first_name} ${ticket.last_name}` : ticket.name || 'N/A',
          reason: ticket.reason || ticket.Description || 'No reason provided',
          resolution_status: ticket.resolution_status || ticket.status || 'Open',
          poster: ticket.poster || 'No Poster',
          praja_dashboard_user_link: ticket.praja_user_id ? `https://app.praja.com/dashboard/user/${ticket.praja_user_id}` : 'N/A',
          display_pic_url: ticket.display_pic_url || null
        }));

        setData(transformedData);
        setFilteredData(transformedData);
        baseDataRef.current = transformedData;
        
        if (pageMeta) {
          setPagination({
            totalCount: pageMeta.total_count || 0,
            numberOfPages: pageMeta.number_of_pages || 0,
            currentPage: pageMeta.current_page || 1,
            pageSize: pageMeta.page_size || 50,
            nextPageLink: pageMeta.next_page_link || null,
            previousPageLink: pageMeta.previous_page_link || null
          });
        }
      } catch (error: any) {
        if (error?.name === 'AbortError' || abortController.signal.aborted) return;
        setData([]);
        setFilteredData([]);
      } finally {
        if (!abortController.signal.aborted) setLoading(false);
      }
    };

    fetchTickets();
    return () => { abortController.abort(); };
  }, [session?.access_token, config?.apiEndpoint, apiPrefix]);

  useEffect(() => {
    if (config?.apiPrefix) setApiPrefix(config.apiPrefix);
  }, [config?.apiPrefix]);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  return {
    config,
    loading,
    tableLoading,
    searchLoading,
    displaySearchTerm,
    showFilters,
    setShowFilters,
    dateRangeFilter,
    setDateRangeFilter,
    dynamicFilterValues,
    setDynamicFilterValues,
    filtersApplied,
    filteredData,
    data,
    pagination,
    selectedTicket,
    setSelectedTicket,
    isTicketModalOpen,
    setIsTicketModalOpen,
    tableColumns,
    handleSearchChange,
    handleRowClick,
    handleTicketUpdate,
    handleActionClick,
    handlePageChange,
    handleNextPage,
    handlePreviousPage,
    applyFilters,
    resetFilters,
    apiPrefix,
    searchTerm,
  };
}

export type TicketTableModel = ReturnType<typeof useTicketTable>;