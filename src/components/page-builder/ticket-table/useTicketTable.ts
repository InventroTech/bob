/** State, effects, and handlers for the ticket table. */

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useRecordUpdated } from '@/hooks/useRecordUpdated';
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
const [tableLoading, setTableLoading] = useState(false); // Separate loading state for table only
const [searchLoading, setSearchLoading] = useState(false); // Loading state specifically for search
const [rateLimited, setRateLimited] = useState(false); // Rate limiting indicator
const [selectedTicket, setSelectedTicket] = useState<any>(null);
const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
const [showFilters, setShowFilters] = useState(false);
const [resolutionStatusFilter, setResolutionStatusFilter] = useState<string[]>([]);
const [assignedToFilter, setAssignedToFilter] = useState<string>('all');
const [posterStatusFilter, setPosterStatusFilter] = useState<string[]>([]);
const [stateFilter, setStateFilter] = useState<string[]>([]);
const [callAttemptsFilter, setCallAttemptsFilter] = useState<number[]>([]);
const [reasonFilter, setReasonFilter] = useState<string[]>([]); // Reason filter state
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
const [displaySearchTerm, setDisplaySearchTerm] = useState<string>(''); // Separate state for display
const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
const abortControllerRef = useRef<AbortController | null>(null);
const requestSequenceRef = useRef<number>(0);
/** Base data for client-side search (initial load or filter result). Search runs across all fields on this. */
const baseDataRef = useRef<any[]>([]);
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
const [assignees, setAssignees] = useState<Array<{
  id: number;
  name: string;
  email: string;
  company_name: string | null;
  uid: string | null;
}>>([]);
const [filterOptions, setFilterOptions] = useState<{
  resolution_statuses: (string | null)[];
  poster_statuses: string[];
}>({
  resolution_statuses: [],
  poster_statuses: []
});
const { session, user } = useAuth();

// Memoize table columns to prevent unnecessary re-renders
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

/** Client-side search: match term against ALL ticket fields (table columns + any other field in the row) */
const matchRowBySearchTerm = useCallback((row: any, term: string, _columns: Column[]): boolean => {
  if (!term || !term.trim()) return true;
  const lower = term.trim().toLowerCase();
  // Search every field in the row so "all" fields are included
  for (const key of Object.keys(row)) {
    const val = row[key];
    if (val == null) continue;
    if (typeof val === 'object' && val !== null && !Array.isArray(val)) continue; // skip nested objects
    if (Array.isArray(val)) {
      if (val.some((v: any) => v != null && String(v).toLowerCase().includes(lower))) return true;
      continue;
    }
    if (String(val).toLowerCase().includes(lower)) return true;
  }
  return false;
}, []);

// --- ADDED: Client-Side Filter Fallback for Reasons ---
// Since the backend might ignore the 'reason' API parameter, we filter it here before displaying.
const applyFrontendReasonFilter = useCallback((tickets: any[]) => {
  if (reasonFilter.length === 0) return tickets;
  return tickets.filter(ticket => reasonFilter.includes(ticket.reason));
}, [reasonFilter]);
// ------------------------------------------------------

// Get unique values for filters
const getUniqueResolutionStatuses = () => {
  // Use API data if available, otherwise fallback to local data
  if (filterOptions.resolution_statuses.length > 0) {
    return filterOptions.resolution_statuses;
  }
  
  // Fallback to local data
  const statuses = [...new Set(data.map(ticket => ticket.resolution_status))];
  return statuses.filter(status => status && status !== 'N/A');
};

// Get unique reasons for the new filter
const getUniqueReasons = () => {
  const reasons = [...new Set(data.map(ticket => ticket.reason))];
  return reasons.filter(reason => reason && reason !== 'N/A' && reason !== 'No reason provided');
};

// Fetch filter options from API
const fetchFilterOptions = async () => {
  try {
    const authToken = session?.access_token;
    const baseUrl = TICKET_API_BASE;
    const apiUrl = `${baseUrl}/analytics/support-tickets/filter-options/`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': authToken ? `Bearer ${authToken}` : '',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) throw new Error(`Failed to fetch filter options: ${response.status}`);

    const responseData = await response.json();
    if (responseData.resolution_statuses && responseData.poster_statuses) {
      setFilterOptions({
        resolution_statuses: responseData.resolution_statuses,
        poster_statuses: responseData.poster_statuses
      });
    }
  } catch (error) {
    console.error('Error fetching filter options:', error);
  }
};

// Fetch assignees from API
const fetchAssignees = async () => {
  try {
    const authToken = session?.access_token;
    const baseUrl = TICKET_API_BASE;
    const apiUrl = `${baseUrl}/accounts/users/assignees-by-role/?role=CSE`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': authToken ? `Bearer ${authToken}` : '',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) throw new Error(`Failed to fetch assignees: ${response.status}`);

    const responseData = await response.json();
    if (responseData.results && Array.isArray(responseData.results)) {
      setAssignees(responseData.results);
    }
  } catch (error) {
    console.error('Error fetching assignees:', error);
  }
};

const getUniqueAssignedTo = () => {
  return assignees.map(assignee => ({
    id: assignee.uid || assignee.id.toString(), 
    name: assignee.name
  }));
};

const getUniquePosterStatuses = () => {
  if (filterOptions.poster_statuses.length > 0) {
    return filterOptions.poster_statuses;
  }
  const statuses = [...new Set(data.map(ticket => ticket.poster))];
  return statuses.filter(status => status && status !== 'N/A' && status !== 'No Poster');
};

const stateToParamValue = (state: string | null | undefined): string => {
  if (state == null || String(state).trim() === '') return 'null';
  return String(state);
};

// Apply filters using analytics endpoint
const applyFilters = async (requestSequence?: number) => {
  try {
    setTableLoading(true); 
    
    if (abortControllerRef.current) abortControllerRef.current.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    const currentSequence = requestSequence || ++requestSequenceRef.current;
    const authToken = session?.access_token;
    const baseUrl = TICKET_API_BASE;
    const apiUrl = `${baseUrl}/analytics/support-ticket/`;
    
    const params = new URLSearchParams();
    
    if (resolutionStatusFilter.length > 0) {
      resolutionStatusFilter.forEach(status => {
        const statusToSend = status === 'Open' ? 'null' : status;
        params.append('resolution_status', statusToSend);
      });
    }
    
    if (assignedToFilter !== 'all') {
      if (assignedToFilter === 'myself') params.append('assigned_to', user?.id || '');
      else if (assignedToFilter === 'unassigned') params.append('assigned_to', 'null');
      else params.append('assigned_to', assignedToFilter);
    }
    
    if (posterStatusFilter.length > 0) {
      posterStatusFilter.forEach(status => params.append('poster', status));
    }

    if (stateFilter.length > 0) {
      stateFilter.forEach(state => params.append('state', state));
    }

    if (callAttemptsFilter.length > 0) {
      callAttemptsFilter.forEach(count => params.append('call_attempts', String(count)));
    }

    if (reasonFilter.length > 0) {
      reasonFilter.forEach(reason => params.append('reason', reason));
    }
    
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

    const currentSearchTerm = latestSearchValueRef.current?.trim() ?? '';
    if (currentSearchTerm) {
      params.append('search', currentSearchTerm);
      if (config?.searchFields) params.append('search_fields', config.searchFields);
    }
    
    params.append('page', '1');
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

    if (!response.ok) throw new Error(`Failed to fetch filtered tickets: ${response.status}`);

    const responseData = await response.json();
    
    if (currentSequence !== requestSequenceRef.current) return;
    
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
    }

    const transformedData = tickets.map((ticket: any) => ({
      ...ticket,
      created_at: ticket.created_at ? convertGMTtoIST(ticket.created_at) : 'N/A',
      cse_name: getDisplayName(ticket.cse_name || ticket.assigned_to),
      name: ticket.first_name && ticket.last_name ? `${ticket.first_name} ${ticket.last_name}` : ticket.name || 'N/A',
      reason: ticket.reason || ticket.Description || 'No reason provided',
      resolution_status: ticket.resolution_status || ticket.status || 'Open',
      poster: ticket.poster || 'No Poster',
      praja_dashboard_user_link: ticket.praja_user_id ? `https://app.praja.com/dashboard/user/${ticket.praja_user_id}` : ticket.praja_dashboard_user_link || 'N/A',
      display_pic_url: ticket.display_pic_url || null
    }));

    // ADDED: Apply the client-side reason filter here!
    const toShow = applyFrontendReasonFilter(transformedData);
    
    baseDataRef.current = toShow;
    setFilteredData(toShow);
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
    toast.error('Failed to apply filters');
  } finally {
    setTableLoading(false);
  }
};

// Reset filters
const resetFilters = () => {
  setResolutionStatusFilter([]);
  setAssignedToFilter('all');
  setPosterStatusFilter([]);
  setStateFilter([]);
  setCallAttemptsFilter([]);
  setReasonFilter([]); // Clear reason filter
  setDateRangeFilter({
    startDate: undefined,
    endDate: undefined,
    startTime: '00:00',
    endTime: '23:59'
  });
  setSearchTerm('');
  setDisplaySearchTerm('');
  if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
  baseDataRef.current = data;
  setFilteredData(data);
  setFiltersApplied(false);
};

const latestSearchValueRef = useRef<string>('');

// Search: simplified and optimized
const debouncedSearch = useCallback((value: string) => {
  latestSearchValueRef.current = value;
  setDisplaySearchTerm(value);

  if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
  if (abortControllerRef.current) abortControllerRef.current.abort();

  searchTimeoutRef.current = setTimeout(async () => {
    const term = latestSearchValueRef.current.trim();
    setSearchTerm(term);
    
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    const hasFilters = filtersApplied || 
      resolutionStatusFilter.length > 0 || 
      assignedToFilter !== 'all' || 
      posterStatusFilter.length > 0 ||
      stateFilter.length > 0 ||
      callAttemptsFilter.length > 0 ||
      reasonFilter.length > 0 || 
      dateRangeFilter.startDate ||
      dateRangeFilter.endDate;
    
    if (!term) {
      setSearchLoading(false);
      if (hasFilters) {
        applyFilters();
      } else {
        try {
          setTableLoading(true);
          const authToken = session?.access_token;
          const baseUrl = TICKET_API_BASE;
          const apiUrl = `${baseUrl}/analytics/support-ticket/`;
          
          const params = new URLSearchParams();
          params.append('page', '1');
          params.append('page_size', '50');
          
          const response = await fetch(`${apiUrl}?${params.toString()}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': authToken ? `Bearer ${authToken}` : ''
            },
            signal: abortController.signal
          });

          if (abortController.signal.aborted) return;

          if (response.ok) {
            const responseData = await response.json();
            const ensureArray = (val: any): any[] => Array.isArray(val) ? val : val != null && typeof val === 'object' ? [val] : [];
            let tickets: any[] = [];
            let pageMeta = null;
            if (responseData.results !== undefined) {
              tickets = ensureArray(responseData.results);
              pageMeta = responseData.page_meta;
            } else if (responseData.data !== undefined) {
              tickets = ensureArray(responseData.data);
              pageMeta = responseData.page_meta;
            } else if (Array.isArray(responseData)) {
              tickets = responseData;
            }

            const transformedData = tickets.map((ticket: any) => ({
              ...ticket,
              created_at: ticket.created_at ? convertGMTtoIST(ticket.created_at) : 'N/A',
              cse_name: getDisplayName(ticket.cse_name || ticket.assigned_to),
              name: ticket.first_name && ticket.last_name ? `${ticket.first_name} ${ticket.last_name}` : ticket.name || 'N/A',
              reason: ticket.reason || ticket.Description || 'No reason provided',
              resolution_status: ticket.resolution_status || ticket.status || 'Open',
              poster: ticket.poster || 'No Poster',
              praja_dashboard_user_link: ticket.praja_user_id ? `https://app.praja.com/dashboard/user/${ticket.praja_user_id}` : ticket.praja_dashboard_user_link || 'N/A',
              display_pic_url: ticket.display_pic_url || null
            }));

            setData(transformedData);
            baseDataRef.current = transformedData;
            setFilteredData(transformedData);
            
            if (pageMeta) {
              setPagination({
                totalCount: pageMeta.total_count || 0,
                numberOfPages: pageMeta.number_of_pages || 0,
                currentPage: pageMeta.current_page || 1,
                pageSize: 50,
                nextPageLink: pageMeta.next_page_link || null,
                previousPageLink: pageMeta.previous_page_link || null
              });
            }
          }
        } catch (error: any) {
          if (error.name === 'AbortError') return;
          baseDataRef.current = data;
          setFilteredData(data);
        } finally {
          if (!abortController.signal.aborted) setTableLoading(false);
        }
      }
      return;
    }
    
    if (term && !hasFilters) {
      try {
        setTableLoading(true);
        setSearchLoading(true);
        const authToken = session?.access_token;
        const baseUrl = TICKET_API_BASE;
        const apiUrl = `${baseUrl}/analytics/support-ticket/`;

        const params = new URLSearchParams();
        params.append('search', term);
        if (config?.searchFields) params.append('search_fields', config.searchFields);
        params.append('page', '1');
        params.append('page_size', '50');

        const response = await fetch(`${apiUrl}?${params.toString()}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authToken ? `Bearer ${authToken}` : ''
          },
          signal: abortController.signal
        });

        if (abortController.signal.aborted) return;

        const ensureArray = (val: any): any[] => Array.isArray(val) ? val : val != null && typeof val === 'object' ? [val] : [];
        const transformTicket = (ticket: any) => ({
          ...ticket,
          created_at: ticket.created_at ? convertGMTtoIST(ticket.created_at) : 'N/A',
          cse_name: getDisplayName(ticket.cse_name || ticket.assigned_to),
          name: ticket.first_name && ticket.last_name ? `${ticket.first_name} ${ticket.last_name}` : ticket.name || 'N/A',
          reason: ticket.reason || ticket.Description || 'No reason provided',
          resolution_status: ticket.resolution_status || ticket.status || 'Open',
          poster: ticket.poster || 'No Poster',
          praja_dashboard_user_link: ticket.praja_user_id ? `https://app.praja.com/dashboard/user/${ticket.praja_user_id}` : ticket.praja_dashboard_user_link || 'N/A',
          display_pic_url: ticket.display_pic_url || null
        });

        if (response.ok) {
          const responseData = await response.json();
          let tickets: any[] = [];
          if (responseData.results !== undefined) tickets = ensureArray(responseData.results);
          else if (responseData.data !== undefined) tickets = ensureArray(responseData.data);
          else if (Array.isArray(responseData)) tickets = responseData;

          const transformedData = tickets.map(transformTicket);
          
          // ADDED: Apply client-side reason filter here too (just in case)
          const toShow = applyFrontendReasonFilter(transformedData);

          baseDataRef.current = toShow;
          setFilteredData(toShow);

          const pageMeta = responseData.page_meta;
          if (pageMeta) {
            setPagination({
              totalCount: pageMeta.total_count || 0,
              numberOfPages: pageMeta.number_of_pages || 0,
              currentPage: pageMeta.current_page || 1,
              pageSize: 50,
              nextPageLink: pageMeta.next_page_link || null,
              previousPageLink: pageMeta.previous_page_link || null
            });
          }
        } else {
          throw new Error(`Search failed: ${response.status}`);
        }
      } catch (error: any) {
        if (error.name === 'AbortError') return;
        const base = baseDataRef.current.length > 0 ? baseDataRef.current : data;
        const next = base.filter((row: any) => matchRowBySearchTerm(row, term, tableColumns));
        setFilteredData(next);
      } finally {
        if (!abortController.signal.aborted) {
          setTableLoading(false);
          setSearchLoading(false);
        }
      }
    } else {
      setSearchLoading(true);
      try {
        await applyFilters();
      } finally {
        setSearchLoading(false);
      }
    }
  }, 500); 
}, [data, matchRowBySearchTerm, tableColumns, filtersApplied, resolutionStatusFilter, assignedToFilter, posterStatusFilter, stateFilter, callAttemptsFilter, reasonFilter, dateRangeFilter, session?.access_token, config?.searchFields, applyFrontendReasonFilter]);

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

// Handle pagination navigation
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

      if (!response.ok) throw new Error(`Failed to fetch next page: ${response.status}`);

      const responseData = await response.json();
      let tickets = [];
      let pageMeta = null;
      
      if (responseData.data && Array.isArray(responseData.data)) {
        tickets = responseData.data;
        pageMeta = responseData.page_meta;
      }

      const transformedData = tickets.map((ticket: any) => ({
        ...ticket,
        created_at: ticket.created_at ? convertGMTtoIST(ticket.created_at) : 'N/A',
        cse_name: getDisplayName(ticket.cse_name || ticket.assigned_to),
        name: ticket.first_name && ticket.last_name ? `${ticket.first_name} ${ticket.last_name}` : ticket.name || 'N/A',
        reason: ticket.reason || ticket.Description || 'No reason provided',
        resolution_status: ticket.resolution_status || ticket.status || 'Open',
        poster: ticket.poster || 'No Poster',
        praja_dashboard_user_link: ticket.praja_user_id ? `https://app.praja.com/dashboard/user/${ticket.praja_user_id}` : ticket.praja_dashboard_user_link || 'N/A',
        display_pic_url: ticket.display_pic_url || null
      }));

      setData(transformedData);
      
      // ADDED: Apply client-side reason filter here too
      setFilteredData(applyFrontendReasonFilter(transformedData));
      
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

      if (!response.ok) throw new Error(`Failed to fetch previous page: ${response.status}`);

      const responseData = await response.json();
      let tickets = [];
      let pageMeta = null;
      
      if (responseData.data && Array.isArray(responseData.data)) {
        tickets = responseData.data;
        pageMeta = responseData.page_meta;
      }

      const transformedData = tickets.map((ticket: any) => ({
        ...ticket,
        created_at: ticket.created_at ? convertGMTtoIST(ticket.created_at) : 'N/A',
        cse_name: getDisplayName(ticket.cse_name || ticket.assigned_to),
        name: ticket.first_name && ticket.last_name ? `${ticket.first_name} ${ticket.last_name}` : ticket.name || 'N/A',
        reason: ticket.reason || ticket.Description || 'No reason provided',
        resolution_status: ticket.resolution_status || ticket.status || 'Open',
        poster: ticket.poster || 'No Poster',
        praja_dashboard_user_link: ticket.praja_user_id ? `https://app.praja.com/dashboard/user/${ticket.praja_user_id}` : ticket.praja_dashboard_user_link || 'N/A',
        display_pic_url: ticket.display_pic_url || null
      }));

      setData(transformedData);
      
      // ADDED: Apply client-side reason filter here too
      setFilteredData(applyFrontendReasonFilter(transformedData));
      
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
    } finally {
      setTableLoading(false);
    }
  }
};

const handlePageChange = async (pageNumber: string) => {
  const page = parseInt(pageNumber, 10);
  if (isNaN(page) || page < 1 || page > pagination.numberOfPages) {
    return;
  }

  try {
    setTableLoading(true);
    const authToken = session?.access_token;
    const baseUrl = TICKET_API_BASE;
    const apiUrl = `${baseUrl}/analytics/support-ticket/`;
    
    const params = new URLSearchParams();
    
    if (resolutionStatusFilter.length > 0) {
      resolutionStatusFilter.forEach(status => params.append('resolution_status', status === 'Open' ? 'null' : status));
    }
    
    if (assignedToFilter !== 'all') {
      if (assignedToFilter === 'myself') params.append('assigned_to', user?.id || '');
      else if (assignedToFilter === 'unassigned') params.append('assigned_to', 'null');
      else params.append('assigned_to', assignedToFilter);
    }
    
    if (posterStatusFilter.length > 0) {
      posterStatusFilter.forEach(status => params.append('poster', status));
    }

    if (stateFilter.length > 0) {
      stateFilter.forEach((state) => params.append('state', state));
    }

    if (callAttemptsFilter.length > 0) {
      callAttemptsFilter.forEach((count) => params.append('call_attempts', String(count)));
    }

    if (reasonFilter.length > 0) {
      reasonFilter.forEach((reason) => params.append('reason', reason));
    }
    
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

    const currentSearchTerm = latestSearchValueRef.current?.trim() ?? '';
    if (currentSearchTerm) {
      params.append('search', currentSearchTerm);
      if (config?.searchFields) params.append('search_fields', config.searchFields);
    }

    params.append('page', page.toString());
    params.append('page_size', '50');
    
    const fullUrl = `${apiUrl}?${params.toString()}`;

    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authToken ? `Bearer ${authToken}` : ''
      }
    });

    if (!response.ok) throw new Error(`Failed to fetch page ${page}: ${response.status}`);

    const responseData = await response.json();
    
    const ensureArray = (val: any): any[] => Array.isArray(val) ? val : val != null && typeof val === 'object' ? [val] : [];
    let tickets: any[] = [];
    let pageMeta = null;
    
    if (responseData.data !== undefined) {
      tickets = ensureArray(responseData.data);
      pageMeta = responseData.page_meta;
    } else if (responseData.results !== undefined) {
      tickets = ensureArray(responseData.results);
      pageMeta = responseData.page_meta;
    }

    const transformedData = tickets.map(ticket => ({
      ...ticket,
      created_at: ticket.created_at ? convertGMTtoIST(ticket.created_at) : 'N/A',
      cse_name: getDisplayName(ticket.cse_name || ticket.assigned_to),
      name: ticket.first_name && ticket.last_name ? `${ticket.first_name} ${ticket.last_name}` : ticket.name || 'N/A',
      reason: ticket.reason || ticket.Description || 'No reason provided',
      resolution_status: ticket.resolution_status || ticket.status || 'Open',
      poster: ticket.poster || 'No Poster',
      praja_dashboard_user_link: ticket.praja_user_id ? `https://app.praja.com/dashboard/user/${ticket.praja_user_id}` : ticket.praja_dashboard_user_link || 'N/A',
      display_pic_url: ticket.display_pic_url || null
    }));

    setData(transformedData);
    
    // ADDED: Apply client-side reason filter here too
    setFilteredData(applyFrontendReasonFilter(transformedData));
    
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
  } finally {
    setTableLoading(false);
  }
};

const refreshTicketsFromRealtime = useCallback(() => {
  if (!session?.access_token) return;
  void applyFilters();
}, [session?.access_token, applyFilters]);

useRecordUpdated(refreshTicketsFromRealtime, { entityType: 'support_ticket' });

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

      const responseClone = response.clone();
      const responseData = await responseClone.json();

      let tickets = [];
      let pageMeta = null;
      
      if (responseData.data && Array.isArray(responseData.data)) {
        tickets = responseData.data;
        pageMeta = responseData.page_meta;
      } else if (Array.isArray(responseData)) {
        tickets = responseData;
      } else if (responseData.tickets && Array.isArray(responseData.tickets)) {
        tickets = responseData.tickets;
      }

      const transformedData = tickets.map((ticket: any) => ({
        ...ticket,
        created_at: ticket.created_at ? convertGMTtoIST(ticket.created_at) : 'N/A',
        cse_name: getDisplayName(ticket.cse_name || ticket.assigned_to),
        name: ticket.first_name && ticket.last_name ? `${ticket.first_name} ${ticket.last_name}` : ticket.name || 'N/A',
        reason: ticket.reason || ticket.Description || 'No reason provided',
        resolution_status: ticket.resolution_status || ticket.status || 'Open',
        poster: ticket.poster || 'No Poster',
        praja_dashboard_user_link: ticket.praja_user_id ? `https://app.praja.com/dashboard/user/${ticket.praja_user_id}` : ticket.praja_dashboard_user_link || 'N/A',
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
      
      if (filtersApplied && (
        resolutionStatusFilter.length > 0 || 
        assignedToFilter !== 'all' || 
        posterStatusFilter.length > 0 || 
        stateFilter.length > 0 ||
        callAttemptsFilter.length > 0 ||
        reasonFilter.length > 0 || 
        dateRangeFilter.startDate || 
        dateRangeFilter.endDate || 
        searchTerm.trim() !== ''
      )) {
        setTimeout(() => applyFilters(), 100); 
      }
    } catch (error: any) {
      if (error?.name === 'AbortError' || abortController.signal.aborted || (typeof error?.message === 'string' && error.message.toLowerCase().includes('aborted'))) {
        return;
      }
      setData([]);
      setFilteredData([]);
    } finally {
      if (!abortController.signal.aborted) setLoading(false);
    }
  };

  fetchTickets();
  return () => abortController.abort();
}, [session?.access_token, config?.apiEndpoint, apiPrefix]);

useEffect(() => {
  if (session?.access_token) {
    fetchFilterOptions();
    fetchAssignees();
  }
}, [session?.access_token]);

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
    resolutionStatusFilter,
    setResolutionStatusFilter,
    assignedToFilter,
    setAssignedToFilter,
    posterStatusFilter,
    setPosterStatusFilter,
    stateFilter,
    setStateFilter,
    callAttemptsFilter,
    setCallAttemptsFilter,
    reasonFilter,           
    setReasonFilter,        
    dateRangeFilter,
    setDateRangeFilter,
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
    getUniqueResolutionStatuses,
    getUniqueAssignedTo,
    getUniquePosterStatuses,
    getUniqueReasons,       
    apiPrefix,
    searchTerm,
    stateToParamValue,
  };
}

export type TicketTableModel = ReturnType<typeof useTicketTable>;