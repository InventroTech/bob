'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { PrajaTable } from '../ui/prajaTable';
import ShortProfileCard from '../ui/ShortProfileCard';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { TicketCarousel } from './TicketCarousel';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { X, Filter, Calendar, Clock, Search } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { CustomButton } from '@/components/ui/CustomButton';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronDown } from 'lucide-react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { convertGMTtoIST } from '@/lib/timeUtils';
import { buildActionApiRequest } from '@/lib/actionApiUtils';

// Use renderer API for ticket search
const TICKET_API_BASE = import.meta.env.VITE_RENDER_API_URL;

interface Column {
  header: string;
  accessor: string;
  type: 'text' | 'chip' | 'link' | 'action';
  openCard?: boolean | string;
  actionApiEndpoint?: string;
  actionApiMethod?: string;
  actionApiHeaders?: string;
  actionApiPayload?: string;
}

// Status color mapping - matching design colors
const getStatusColor = (status: string) => {
  const statusLower = status.toLowerCase();
  switch (statusLower) {
    case 'paid':
    case 'active':
      return 'bg-green-50 text-green-700 border-green-200';
    case 'auto pay not set':
    case 'autopay_setup_no_layout':
    case 'auto_pay_not_set_up':
      return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'in trial':
    case 'in_trial':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'trial expired':
    case 'trial_expired':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'open':
    case 'pending':
      return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    case 'in progress':
    case 'wip':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'resolved':
    case 'completed':
      return 'bg-green-50 text-green-700 border-green-200';
    case 'closed':
      return 'bg-gray-50 text-gray-700 border-gray-200';
    case 'cancelled':
    case 'failed':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'not paid':
      return 'bg-red-50 text-red-700 border-red-200';
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200';
  }
};

// Function to convert email to display name
const getDisplayName = (email: string | null): string => {
  if (!email) return 'Unassigned';
  
  // If it's already a name (not an email), return as is
  if (!email.includes('@')) return email;
  
  // Extract name from email
  const namePart = email.split('@')[0];
  
  // Convert to title case and replace dots/underscores with spaces
  const displayName = namePart
    .replace(/[._]/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  
  return displayName;
};

// Function to format relative time
// Using formatRelativeTimeIST from timeUtils for consistent GMT to IST conversion

// Function to format poster status with better UI
const formatPosterStatus = (poster: string): { label: string; color: string; bgColor: string } => {
  switch (poster) {
    case 'in_trial':
      return { label: 'In Trial', color: 'text-blue-600', bgColor: 'bg-blue-50' };
    case 'paid':
      return { label: 'Paid', color: 'text-green-600', bgColor: 'bg-green-50' };
    case 'in_trial_extension':
      return { label: 'Trial Extended', color: 'text-purple-600', bgColor: 'bg-purple-50' };
    case 'in_premium_extension':
      return { label: 'Premium Extended', color: 'text-indigo-600', bgColor: 'bg-indigo-50' };
    case 'trial_expired':
      return { label: 'Trial Expired', color: 'text-red-600', bgColor: 'bg-red-50' };
    case 'in_grace_period':
      return { label: 'Grace Period', color: 'text-orange-600', bgColor: 'bg-orange-50' };
    case 'auto_pay_not_set_up':
      return { label: 'Auto-pay Not Set', color: 'text-yellow-600', bgColor: 'bg-yellow-50' };
    case 'autopay_setup_no_layout':
      return { label: 'Auto-pay No Layout', color: 'text-amber-600', bgColor: 'bg-amber-50' };
    case 'free':
      return { label: 'Free', color: 'text-gray-600', bgColor: 'bg-gray-50' };
    default:
      return { label: poster || 'Unknown', color: 'text-gray-600', bgColor: 'bg-gray-50' };
  }
};

// Demo data for fallback
const DEMO_TICKETS = [
  {
    id: "23",
    first_name: "Rahul",
    last_name: "Sharma",
    phone_number: "+91 9876543210",
    email_id: "rahul.sharma@example.com",
    praja_user_id: "PRAJA001",
    ticket_type: "Support",
    actual_ticket_type: ["Billing_cancellation"],
    created_at: "2024-03-15T10:30:00",
    assigned_to: "CSE001",
    resolution_status: "Open",
    reason: "Need help with billing cancellation",
    Description: "Need help with billing cancellation",
    subscription_status: true,
    cse_name: "CSE001"
  },
  {
    id: "24",
    first_name: "Priya",
    last_name: "Patel",
    phone_number: "+91 8765432109",
    email_id: "priya.patel@example.com",
    praja_user_id: "PRAJA002",
    ticket_type: "Support",
    actual_ticket_type: ["poster_update"],
    created_at: "2024-03-15T11:45:00",
    assigned_to: "CSE002",
    resolution_status: "In Progress",
    reason: "Update poster design",
    Description: "Update poster design",
    subscription_status: false,
    cse_name: "CSE002"
  },
  {
    id: "25",
    first_name: "Amit",
    last_name: "Kumar",
    phone_number: "+91 7654321098",
    email_id: "amit.kumar@example.com",
    praja_user_id: "PRAJA003",
    ticket_type: "Support",
    actual_ticket_type: ["badge_requested"],
    created_at: "2024-03-15T09:15:00",
    assigned_to: "CSE003",
    resolution_status: "Resolved",
    reason: "Request for new badge",
    Description: "Request for new badge",
    subscription_status: true,
    cse_name: "CSE003"
  },
  {
    id: "26",
    first_name: "Sneha",
    last_name: "Gupta",
    phone_number: "+91 6543210987",
    email_id: "sneha.gupta@example.com",
    praja_user_id: "PRAJA004",
    ticket_type: "Support",
    actual_ticket_type: ["Others"],
    created_at: "2024-03-15T14:20:00",
    assigned_to: "CSE004",
    resolution_status: "Pending",
    reason: "General inquiry about services",
    Description: "General inquiry about services",
    subscription_status: false,
    cse_name: "CSE004"
  }
];

// Default columns if no configuration is provided
const defaultColumns: Column[] = [
  { header: 'Name', accessor: 'name', type: 'text' },
  { header: 'Praja User Id', accessor: 'user_id', type: 'link' },
  { header: 'Created At', accessor: 'created_at', type: 'text' },
  { header: 'Assigned To', accessor: 'cse_name', type: 'text' },
  { header: 'Reason', accessor: 'reason', type: 'text' },
  { header: 'Poster Status', accessor: 'poster', type: 'chip' },
  { header: 'Resolution Status', accessor: 'resolution_status', type: 'chip' },
  { header: 'Remarks', accessor: 'cse_remarks', type: 'text' }
];

interface TicketTableProps {
  config?: {
    apiEndpoint?: string;
    columns?: Array<{
      key: string;
      label: string;
      type: 'text' | 'chip' | 'date' | 'number' | 'link' | 'action';
      openCard?: boolean | string;
      actionApiEndpoint?: string;
      actionApiMethod?: string;
      actionApiHeaders?: string;
      actionApiPayload?: string;
    }>;
    title?: string;
    apiPrefix?: 'supabase' | 'renderer';
    /** Comma-separated field names to search in (e.g. "name,email,subject"). Sent as search_fields with search param. */
    searchFields?: string;
  };
}

interface PrajaTableProps {
  columns: Column[];
  data: any[];
  title: string;
  showFilters?: boolean;
  onRowClick?: (row: any) => void;
}

export const TicketTableComponent: React.FC<TicketTableProps> = ({ config }) => {
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
  const [apiPrefix, setApiPrefix] = useState<'supabase' | 'renderer'>(config?.apiPrefix || 'supabase');
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

  // Fetch filter options from API
  const fetchFilterOptions = async () => {
    try {
      const authToken = session?.access_token;
      const baseUrl = TICKET_API_BASE;
      const apiUrl = `${baseUrl}/analytics/support-tickets/filter-options/`;
      
      console.log('Fetching filter options from:', apiUrl);
      console.log('Auth token:', authToken ? 'Present' : 'Missing');
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': authToken ? `Bearer ${authToken}` : '',
          'X-Tenant-Slug': 'bibhab-thepyro-ai',
          'Content-Type': 'application/json'
        }
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Failed to fetch filter options: ${response.status} - ${errorText}`);
      }

      const responseData = await response.json();
      console.log('Filter options response:', responseData);
      
      if (responseData.resolution_statuses && responseData.poster_statuses) {
        setFilterOptions({
          resolution_statuses: responseData.resolution_statuses,
          poster_statuses: responseData.poster_statuses
        });
      } else {
        console.error('Invalid filter options data format:', responseData);
        setFilterOptions({
          resolution_statuses: [],
          poster_statuses: []
        });
      }
    } catch (error) {
      console.error('Error fetching filter options:', error);
      setFilterOptions({
        resolution_statuses: [],
        poster_statuses: []
      });
    }
  };

  // Debounced function to fetch filter options with search
  

  // Fetch assignees from API
  const fetchAssignees = async () => {
    try {
      const authToken = session?.access_token;
      const baseUrl = TICKET_API_BASE;
      const apiUrl = `${baseUrl}/accounts/users/assignees-by-role/?role=CSE`;
      
      console.log('Fetching assignees from:', apiUrl);
      console.log('Auth token:', authToken ? 'Present' : 'Missing');
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': authToken ? `Bearer ${authToken}` : '',
          'X-Tenant-Slug': 'bibhab-thepyro-ai',
          'Content-Type': 'application/json'
        }
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Failed to fetch assignees: ${response.status} - ${errorText}`);
      }

      const responseData = await response.json();
      console.log('Assignees response:', responseData);
      
      if (responseData.results && Array.isArray(responseData.results)) {
        setAssignees(responseData.results);
      } else {
        console.error('Invalid assignees data format:', responseData);
        setAssignees([]);
      }
    } catch (error) {
      console.error('Error fetching assignees:', error);
      setAssignees([]);
    }
  };

  const getUniqueAssignedTo = () => {
    // Return the assignees fetched from API
    return assignees.map(assignee => ({
      id: assignee.uid || assignee.id.toString(), // Use uid if available, fallback to id
      name: assignee.name
    }));
  };

  const getUniquePosterStatuses = () => {
    // Use API data if available, otherwise fallback to local data
    if (filterOptions.poster_statuses.length > 0) {
      return filterOptions.poster_statuses;
    }
    
    // Fallback to local data
    const statuses = [...new Set(data.map(ticket => ticket.poster))];
    return statuses.filter(status => status && status !== 'N/A' && status !== 'No Poster');
  };

  // Apply filters using analytics endpoint
  const applyFilters = async (requestSequence?: number) => {
    try {
      setTableLoading(true); // Use table loading instead of full component loading
      
      // Cancel any previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Create new AbortController for this request
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      
      // Use provided sequence or increment for non-search calls
      const currentSequence = requestSequence || ++requestSequenceRef.current;
      
      const authToken = session?.access_token;

      // Always use renderer URL for analytics endpoint
      const baseUrl = TICKET_API_BASE;
      const apiUrl = `${baseUrl}/analytics/support-ticket/`;
      
      // Build query parameters
      const params = new URLSearchParams();
      
      // Add resolution status filters
      if (resolutionStatusFilter.length > 0) {
        resolutionStatusFilter.forEach(status => {
          // Send null for "Open" status, otherwise send the status as-is
          const statusToSend = status === 'Open' ? 'null' : status;
          params.append('resolution_status', statusToSend);
        });
      }
      
      // Add assigned to filter
      if (assignedToFilter !== 'all') {
        if (assignedToFilter === 'myself') {
          params.append('assigned_to', user?.id || '');
        } else if (assignedToFilter === 'unassigned') {
          params.append('assigned_to', 'null');
        } else {
          // For specific assignee, use the ID directly
          params.append('assigned_to', assignedToFilter);
        }
      }
      
      // Add poster status filters
      if (posterStatusFilter.length > 0) {
        posterStatusFilter.forEach(status => {
          params.append('poster', status);
        });
      }
      
      // Add date range filters
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

      // Include search param for backend search (improves time and accuracy)
      const currentSearchTerm = latestSearchValueRef.current?.trim() ?? '';
      const isSearching = currentSearchTerm !== '';
      if (currentSearchTerm) {
        params.append('search', currentSearchTerm);
        if (config?.searchFields) {
          params.append('search_fields', config.searchFields);
        }
      }
      
      // Pagination: always use 50 tickets per page
      params.append('page', '1');
      params.append('page_size', '50');
      
      const fullUrl = `${apiUrl}?${params.toString()}`;
      console.log('Filtered API URL:', fullUrl);
      console.log('Resolution status filter mapping:', resolutionStatusFilter.map(status => ({
        original: status,
        sent: status === 'Open' ? 'null' : status
      })));

      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authToken ? `Bearer ${authToken}` : '',
          'X-Tenant-Slug': 'bibhab-thepyro-ai'
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
      
      // Check if this response is still relevant (not superseded by a newer request)
      if (currentSequence !== requestSequenceRef.current) {
        console.log(`Ignoring stale response for sequence ${currentSequence}, current is ${requestSequenceRef.current}, search term was: "${searchTerm}"`);
        return;
      }
      
      console.log(`Processing response for sequence ${currentSequence}, search term: "${searchTerm}", display term: "${displaySearchTerm}", tickets found: ${responseData.data?.length ?? responseData.results?.length ?? (Array.isArray(responseData) ? responseData.length : '?')}`);
      
      // Handle different response formats (array or single object)
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

      // Transform the data with the new attributes
      const transformedData = tickets.map((ticket: any) => ({
        ...ticket,
        // Format created_at with relative time
        created_at: ticket.created_at ? convertGMTtoIST(ticket.created_at) : 'N/A',
        // Use cse_name for assigned to with display name
        cse_name: getDisplayName(ticket.cse_name || ticket.assigned_to),
        // Combine first_name and last_name for name
        name: ticket.first_name && ticket.last_name 
          ? `${ticket.first_name} ${ticket.last_name}`
          : ticket.name || 'N/A',
        // Use reason field
        reason: ticket.reason || ticket.Description || 'No reason provided',
        // Use resolution_status with proper formatting
        resolution_status: ticket.resolution_status || ticket.status || 'Open',
        // Use poster field directly
        poster: ticket.poster || 'No Poster',
        // Generate Praja dashboard user link
        praja_dashboard_user_link: ticket.praja_user_id 
          ? `https://app.praja.com/dashboard/user/${ticket.praja_user_id}`
          : ticket.praja_dashboard_user_link || 'N/A',
        // Ensure display_pic_url is included
        display_pic_url: ticket.display_pic_url || null
      }));

      baseDataRef.current = transformedData;
      // Backend already applies search when search param is sent - no client-side filter needed
      const toShow = transformedData;
      console.log(`Setting filtered data for sequence ${currentSequence}: ${transformedData.length} from API (search: "${currentSearchTerm}")`);
      setFilteredData(toShow);
      setFiltersApplied(true);
      
      // Update pagination data if available
      if (pageMeta) {
        setPagination({
          totalCount: pageMeta.total_count || 0,
          numberOfPages: pageMeta.number_of_pages || 0,
          currentPage: pageMeta.current_page || 1,
          pageSize: pageMeta.page_size || 50,
          nextPageLink: pageMeta.next_page_link || null,
          previousPageLink: pageMeta.previous_page_link || null
        });
        console.log('Updated pagination from filtered response:', pageMeta);
      }
    } catch (error) {
      // Don't show error for aborted requests
      if (error.name === 'AbortError') {
        console.log('Request was aborted');
        return;
      }
      console.error('Error applying filters:', error);
      
      // Handle different types of errors
      if (error.message.includes('Rate limit exceeded')) {
        toast.error('Too many requests. Please wait a moment before searching again.');
      } else if (error.message.includes('429')) {
        toast.error('Rate limit exceeded. Please wait before making another request.');
      } else {
        toast.error('Failed to apply filters');
      }
    } finally {
      setTableLoading(false); // Use table loading instead of full component loading
    }
  };

  // Reset filters
  const resetFilters = () => {
    setResolutionStatusFilter([]);
    setAssignedToFilter('all');
    setPosterStatusFilter([]);
    setDateRangeFilter({
      startDate: undefined,
      endDate: undefined,
      startTime: '00:00',
      endTime: '23:59'
    });
    setSearchTerm(''); // Clear search term
    setDisplaySearchTerm(''); // Clear display search term
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
    baseDataRef.current = data;
    setFilteredData(data); // Show all tickets again
    setFiltersApplied(false);
  };

  const latestSearchValueRef = useRef<string>('');

  // Search: simplified and optimized
  const debouncedSearch = useCallback((value: string) => {
    latestSearchValueRef.current = value;
    setDisplaySearchTerm(value);

    // Cancel previous search timeout
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    
    // Cancel any ongoing API requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    searchTimeoutRef.current = setTimeout(async () => {
      const term = latestSearchValueRef.current.trim();
      setSearchTerm(term);
      
      // Create new abort controller for this search
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      
      // Check if filters are applied
      const hasFilters = filtersApplied || 
        resolutionStatusFilter.length > 0 || 
        assignedToFilter !== 'all' || 
        posterStatusFilter.length > 0 ||
        dateRangeFilter.startDate ||
        dateRangeFilter.endDate;
      
      // If search was cleared, reset to original data
      if (!term) {
        setSearchLoading(false); // Clear search loading when search is cleared
        if (hasFilters) {
          // If filters are applied, re-apply filters without search
          applyFilters();
        } else {
          // Reset to original first page (50 tickets)
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
                'Authorization': authToken ? `Bearer ${authToken}` : '',
                'X-Tenant-Slug': 'bibhab-thepyro-ai'
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
            console.error('Error resetting search:', error);
            baseDataRef.current = data;
            setFilteredData(data);
          } finally {
            if (!abortController.signal.aborted) {
              setTableLoading(false);
            }
          }
        }
        return;
      }
      
      // If searching and no filters applied: use backend search (single API call)
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
              'Authorization': authToken ? `Bearer ${authToken}` : '',
              'X-Tenant-Slug': 'bibhab-thepyro-ai'
            },
            signal: abortController.signal
          });

          if (abortController.signal.aborted) return;

          const ensureArray = (val: any): any[] => Array.isArray(val) ? val : val != null && typeof val === 'object' ? [val] : [];
          const transformTicket = (ticket: any) => ({
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
          });

          if (response.ok) {
            const responseData = await response.json();
            let tickets: any[] = [];
            if (responseData.results !== undefined) tickets = ensureArray(responseData.results);
            else if (responseData.data !== undefined) tickets = ensureArray(responseData.data);
            else if (Array.isArray(responseData)) tickets = responseData;

            const transformedData = tickets.map(transformTicket);
            baseDataRef.current = transformedData;
            setFilteredData(transformedData);

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
          console.error('Error fetching tickets for search:', error);
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
        // Search with filters applied - use backend (applyFilters includes search param)
        setSearchLoading(true);
        try {
          await applyFilters();
        } finally {
          setSearchLoading(false);
        }
      }
    }, 500); // Increased debounce to 500ms to reduce API calls
  }, [data, matchRowBySearchTerm, tableColumns, filtersApplied, resolutionStatusFilter, assignedToFilter, posterStatusFilter, dateRangeFilter, session?.access_token, config?.searchFields]);

  // Handle search input change from PrajaTable
  const handleSearchChange = useCallback((value: string) => {
    debouncedSearch(value);
  }, [debouncedSearch]);


  // Memoized row click handler
  const handleRowClick = useCallback((row: any) => {
    setSelectedTicket(row);
    setIsTicketModalOpen(true);
  }, []);

  // Action button click: open card and/or call API
  const handleActionClick = useCallback(async (row: any, col: Column) => {
    const openCard = col.openCard === true || col.openCard === 'true';
    if (openCard) {
      setSelectedTicket(row);
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
            'Authorization': session?.access_token ? `Bearer ${session.access_token}` : '',
            'X-Tenant-Slug': 'bibhab-thepyro-ai',
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
            'Authorization': authToken ? `Bearer ${authToken}` : '',
            'X-Tenant-Slug': 'bibhab-thepyro-ai'
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch next page: ${response.status}`);
        }

        const responseData = await response.json();
        
        let tickets = [];
        let pageMeta = null;
        
        if (responseData.data && Array.isArray(responseData.data)) {
          tickets = responseData.data;
          pageMeta = responseData.page_meta;
        } else {
          throw new Error('Invalid data format received');
        }

        // Transform the data
        const transformedData = tickets.map(ticket => ({
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
            'Authorization': authToken ? `Bearer ${authToken}` : '',
            'X-Tenant-Slug': 'bibhab-thepyro-ai'
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch previous page: ${response.status}`);
        }

        const responseData = await response.json();
        
        let tickets = [];
        let pageMeta = null;
        
        if (responseData.data && Array.isArray(responseData.data)) {
          tickets = responseData.data;
          pageMeta = responseData.page_meta;
        } else {
          throw new Error('Invalid data format received');
        }

        // Transform the data
        const transformedData = tickets.map(ticket => ({
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

  // Handle page selection from dropdown
  const handlePageChange = async (pageNumber: string) => {
    const page = parseInt(pageNumber, 10);
    if (isNaN(page) || page < 1 || page > pagination.numberOfPages) {
      return;
    }

    try {
      setTableLoading(true);
      const authToken = session?.access_token;

      // Always use renderer URL for analytics endpoint
      const baseUrl = TICKET_API_BASE;
      const apiUrl = `${baseUrl}/analytics/support-ticket/`;
      
      // Build query parameters with all current filters
      const params = new URLSearchParams();
      
      // Add resolution status filters
      if (resolutionStatusFilter.length > 0) {
        resolutionStatusFilter.forEach(status => {
          const statusToSend = status === 'Open' ? 'null' : status;
          params.append('resolution_status', statusToSend);
        });
      }
      
      // Add assigned to filter
      if (assignedToFilter !== 'all') {
        if (assignedToFilter === 'myself') {
          params.append('assigned_to', user?.id || '');
        } else if (assignedToFilter === 'unassigned') {
          params.append('assigned_to', 'null');
        } else {
          params.append('assigned_to', assignedToFilter);
        }
      }
      
      // Add poster status filters
      if (posterStatusFilter.length > 0) {
        posterStatusFilter.forEach(status => {
          params.append('poster', status);
        });
      }
      
      // Add date range filters
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
      params.append('page_size', '50'); // Always use 50 tickets per page
      
      const fullUrl = `${apiUrl}?${params.toString()}`;

      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authToken ? `Bearer ${authToken}` : '',
          'X-Tenant-Slug': 'bibhab-thepyro-ai'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch page ${page}: ${response.status}`);
      }

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
      } else {
        throw new Error('Invalid data format received');
      }

      // Transform the data
      const transformedData = tickets.map(ticket => ({
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


  const handleTicketUpdate = (updatedTicket: any) => {
    // Update the local data with the updated ticket
    const updatedData = data.map(ticket => 
      ticket.id === updatedTicket.id ? updatedTicket : ticket
    );
    setData(updatedData);
    
    // If filters are applied, refresh filtered data
    if (filtersApplied) {
      applyFilters();
    } else {
      // If no filters applied, update filtered data with all tickets
      setFilteredData(updatedData);
    }
    
    setIsTicketModalOpen(false);
  };

  useEffect(() => {
    // Abort controller for initial fetch
    const abortController = new AbortController();

    const fetchTickets = async () => {
      try {
        setLoading(true);
        const authToken = session?.access_token;

        const endpoint = config?.apiEndpoint || '/api/tickets';
        const baseUrl = apiPrefix === 'renderer' 
          ? TICKET_API_BASE 
          : import.meta.env.VITE_API_URI;
        const apiUrl = `${baseUrl}${endpoint}?page=1&page_size=50`;
        console.log('API URL:', apiUrl);
        
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Authorization': authToken ? `Bearer ${authToken}` : ''
        };

        // Add X-Tenant-Slug header only for renderer API calls
        if (apiPrefix === 'renderer') {
          headers['X-Tenant-Slug'] = 'bibhab-thepyro-ai';
        }

        const response = await fetch(apiUrl, {
          method: 'GET',
          headers,
          signal: abortController.signal
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch tickets: ${response.status}`);
        }

        // Clone the response before reading it
        const responseClone = response.clone();
        const responseData = await responseClone.json();

        // Handle different response formats
        let tickets = [];
        let pageMeta = null;
        
        if (responseData.data && Array.isArray(responseData.data)) {
          tickets = responseData.data;
          pageMeta = responseData.page_meta;
        } else if (Array.isArray(responseData)) {
          tickets = responseData;
        } else if (responseData.tickets && Array.isArray(responseData.tickets)) {
          tickets = responseData.tickets;
        } else {
          throw new Error('Invalid data format received');
        }

        // Transform the data with the new attributes
        const transformedData = tickets.map(ticket => ({
          ...ticket,
          // Format created_at with relative time
          created_at: ticket.created_at ? convertGMTtoIST(ticket.created_at) : 'N/A',
          // Use cse_name for assigned to with display name
          cse_name: getDisplayName(ticket.cse_name || ticket.assigned_to),
          // Combine first_name and last_name for name
          name: ticket.first_name && ticket.last_name 
            ? `${ticket.first_name} ${ticket.last_name}`
            : ticket.name || 'N/A',
          // Use reason field
          reason: ticket.reason || ticket.Description || 'No reason provided',
          // Use resolution_status with proper formatting
          resolution_status: ticket.resolution_status || ticket.status || 'Open',
          // Use poster field directly
          poster: ticket.poster || 'No Poster',
          // Generate Praja dashboard user link
          praja_dashboard_user_link: ticket.praja_user_id 
            ? `https://app.praja.com/dashboard/user/${ticket.praja_user_id}`
            : ticket.praja_dashboard_user_link || 'N/A',
          // Ensure display_pic_url is included
          display_pic_url: ticket.display_pic_url || null
        }));

        // Set the data (empty array if no tickets found)
        setData(transformedData);
        setFilteredData(transformedData);
        baseDataRef.current = transformedData;
        console.log('Data loaded. FiltersApplied:', filtersApplied, 'Data count:', transformedData.length);
        
        // Set pagination data if available
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
        
        // If filters were previously applied, reapply them after data loads
        if (filtersApplied && (
          resolutionStatusFilter.length > 0 || 
          assignedToFilter !== 'all' || 
          posterStatusFilter.length > 0 || 
          dateRangeFilter.startDate || 
          dateRangeFilter.endDate || 
          searchTerm.trim() !== ''
        )) {
          console.log('Reapplying filters after data fetch...');
          setTimeout(() => applyFilters(), 100); // Small delay to ensure state is updated
        }
      } catch (error) {
        console.error('Error fetching tickets:', error);
        // Set empty data on error instead of using demo data
        setData([]);
        setFilteredData([]);
        
        // If filters were previously applied, we still need to maintain that state
        if (filtersApplied) {
          console.log('Filters were applied but data fetch failed');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();

    return () => {
      abortController.abort();
    };
  }, [session?.access_token, config?.apiEndpoint, apiPrefix]);

  // Fetch filter options and assignees when component mounts
  useEffect(() => {
    if (session?.access_token) {
      fetchFilterOptions();
      fetchAssignees();
    }
  }, [session?.access_token]);

  // Apply filters when filter values change
  useEffect(() => {
    // Don't auto-apply filters, wait for user to click "Apply Filters" button
  }, [resolutionStatusFilter, assignedToFilter, posterStatusFilter, data]);

  // Update apiPrefix when config changes
  useEffect(() => {
    if (config?.apiPrefix) {
      setApiPrefix(config.apiPrefix);
    }
  }, [config?.apiPrefix]);

  // Cleanup timeout and abort controller on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-600">Loading tickets data...</div>
      </div>
    );
  }

  return (
    <>
      <div className="font-body overflow-x-auto border-2 border-gray-200 rounded-lg bg-white p-4">
        {/* Filter Section */}
        <div className="mb-4 relative">
          <div className="flex justify-between items-center mb-4 gap-4 flex-wrap">
            <h5>
              {config?.title || "Support Tickets"}
            </h5>
            <div className="flex items-center gap-2 relative">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search..."
                  value={displaySearchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              <CustomButton
                variant="outline"
                size="sm"
                icon={<Filter className="h-4 w-4" />}
                onClick={() => setShowFilters(!showFilters)}
                className="bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Filters
              </CustomButton>
            </div>
          </div>
        </div>

        {/* Filter Section */}
        <div className="mb-4">
          {showFilters && (
            <div className="bg-gray-50 p-4 rounded-lg border">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-gray-700 mb-2">
                    Resolution Status
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-between"
                      >
                        <span className="text-sm">
                          {resolutionStatusFilter.length > 0
                            ? `${resolutionStatusFilter.length} status(es) selected`
                            : "All Resolution Statuses"}
                        </span>
                        <ChevronDown className="h-3 w-3 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-60 p-4" align="start">
                      <div className="space-y-3">
                        <h5>Select Resolution Statuses</h5>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {getUniqueResolutionStatuses().map((status) => (
                            <div key={status} className="flex items-center space-x-2">
                              <Checkbox
                                id={`resolution-${status}`}
                                checked={resolutionStatusFilter.includes(status)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setResolutionStatusFilter(prev => [...prev, status]);
                                  } else {
                                    setResolutionStatusFilter(prev => prev.filter(s => s !== status));
                                  }
                                }}
                              />
                              <label
                                htmlFor={`resolution-${status}`}
                                className="text-body-sm-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                              >
                                {status === null ? 'Open' : status}
                              </label>
                            </div>
                          ))}
                        </div>
                        {resolutionStatusFilter.length > 0 && (
                          <div className="pt-2 border-t">
                            <CustomButton
                              variant="ghost"
                              size="sm"
                              onClick={() => setResolutionStatusFilter([])}
                              className="text-xs"
                            >
                              Clear All
                            </CustomButton>
                          </div>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <label className="block text-gray-700 mb-2">
                    Poster Status
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-between"
                      >
                        <span className="text-sm">
                          {posterStatusFilter.length > 0
                            ? `${posterStatusFilter.length} status(es) selected`
                            : "All Poster Statuses"}
                        </span>
                        <ChevronDown className="h-3 w-3 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-60 p-4" align="start">
                      <div className="space-y-3">
                        <h4>Select Poster Statuses</h4>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {getUniquePosterStatuses().map((status) => (
                            <div key={status} className="flex items-center space-x-2">
                              <Checkbox
                                id={`poster-${status}`}
                                checked={posterStatusFilter.includes(status)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setPosterStatusFilter(prev => [...prev, status]);
                                  } else {
                                    setPosterStatusFilter(prev => prev.filter(s => s !== status));
                                  }
                                }}
                              />
                              <label
                                htmlFor={`poster-${status}`}
                                className="text-body-sm-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                              >
                                {status}
                              </label>
                            </div>
                          ))}
                        </div>
                        {posterStatusFilter.length > 0 && (
                          <div className="pt-2 border-t">
                            <CustomButton
                              variant="ghost"
                              size="sm"
                              onClick={() => setPosterStatusFilter([])}
                              className="text-xs"
                            >
                              Clear All
                            </CustomButton>
                          </div>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <label className="block text-gray-700 mb-2">
                    Assigned To
                  </label>
                  <Select value={assignedToFilter} onValueChange={setAssignedToFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Assignees" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Assignees</SelectItem>
                      <SelectItem value="myself">Assigned to myself</SelectItem>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {getUniqueAssignedTo().map(assignee => (
                        <SelectItem key={assignee.id} value={assignee.id}>
                          {assignee.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Date Range Filters - 2nd Line */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-gray-700 mb-2">
                    Start Date
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRangeFilter.startDate ? (
                          format(dateRangeFilter.startDate, "PPP")
                        ) : (
                          <span className="text-muted-foreground">Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={dateRangeFilter.startDate}
                        onSelect={(date) => setDateRangeFilter(prev => ({
                          ...prev,
                          startDate: date
                        }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <div className="mt-2">
                    <label className="block text-gray-600 mb-1">
                      Start Time
                    </label>
                    <Input
                      type="time"
                      value={dateRangeFilter.startTime}
                      onChange={(e) => setDateRangeFilter(prev => ({
                        ...prev,
                        startTime: e.target.value
                      }))}
                      className="w-full"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 mb-2">
                    End Date
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRangeFilter.endDate ? (
                          format(dateRangeFilter.endDate, "PPP")
                        ) : (
                          <span className="text-muted-foreground">Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={dateRangeFilter.endDate}
                        onSelect={(date) => setDateRangeFilter(prev => ({
                          ...prev,
                          endDate: date
                        }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <div className="mt-2">
                    <label className="block text-gray-600 mb-1">
                      End Time
                    </label>
                    <Input
                      type="time"
                      value={dateRangeFilter.endTime}
                      onChange={(e) => setDateRangeFilter(prev => ({
                        ...prev,
                        endTime: e.target.value
                      }))}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons - 3rd Line */}
              <div className="flex items-center gap-2 mt-4">
                <CustomButton
                  variant="outline"
                  onClick={resetFilters}
                  className="flex-1"
                >
                  Reset Filters
                </CustomButton>
                <CustomButton
                  variant="default"
                  onClick={() => applyFilters()}
                  className="flex-1"
                  disabled={tableLoading}
                  loading={tableLoading}
                >
                  Apply Filters
                </CustomButton>
              </div>

              {/* Filter Summary */}
              <div className="mt-3 text-sm text-gray-600">
                Showing {filteredData.length} of {pagination.totalCount > 0 ? pagination.totalCount : (filtersApplied ? filteredData.length : data.length)} tickets
                {filtersApplied && (resolutionStatusFilter.length > 0 || assignedToFilter !== 'all' || posterStatusFilter.length > 0 || dateRangeFilter.startDate || dateRangeFilter.endDate || searchTerm.trim() !== '') && (
                  <span className="ml-2">
                    (Filtered by: 
                    {resolutionStatusFilter.length > 0 && ` Resolution Status: ${resolutionStatusFilter.map(status => status === null ? 'Open' : status).join(', ')}`}
                    {assignedToFilter !== 'all' && ` ${resolutionStatusFilter.length > 0 ? ', ' : ''}Assignee: ${assignedToFilter === 'myself' ? 'Myself' : assignedToFilter === 'unassigned' ? 'Unassigned' : getUniqueAssignedTo().find(a => a.id === assignedToFilter)?.name || assignedToFilter}`}
                    {posterStatusFilter.length > 0 && ` ${(resolutionStatusFilter.length > 0 || assignedToFilter !== 'all') ? ', ' : ''}Poster Status: ${posterStatusFilter.join(', ')}`}
                    {(dateRangeFilter.startDate || dateRangeFilter.endDate) && ` ${(resolutionStatusFilter.length > 0 || assignedToFilter !== 'all' || posterStatusFilter.length > 0) ? ', ' : ''}Date Range: ${dateRangeFilter.startDate ? format(dateRangeFilter.startDate, 'MMM dd, yyyy') + ' ' + dateRangeFilter.startTime : 'Any'} to ${dateRangeFilter.endDate ? format(dateRangeFilter.endDate, 'MMM dd, yyyy') + ' ' + dateRangeFilter.endTime : 'Any'}`}
                    {searchTerm.trim() !== '' && ` ${(resolutionStatusFilter.length > 0 || assignedToFilter !== 'all' || posterStatusFilter.length > 0 || dateRangeFilter.startDate || dateRangeFilter.endDate) ? ', ' : ''}Search: "${searchTerm}"`}
                    )
                  </span>
                )}
                {!filtersApplied && (resolutionStatusFilter.length > 0 || assignedToFilter !== 'all' || posterStatusFilter.length > 0 || dateRangeFilter.startDate || dateRangeFilter.endDate || searchTerm.trim() !== '') && (
                  <span className="ml-2 text-orange-600">
                    (Filters selected - click "Apply Filters" to see results)
                  </span>
                )}
                {pagination.totalCount > 0 && (
                  <span className="ml-2 text-blue-600">
                    (Page {pagination.currentPage} of {pagination.numberOfPages})
                  </span>
                )}
              </div>
            </div>
          )}
        </div>


        {/* Table Section */}
        <div className="w-full relative">
          {/* Loading Overlay */}
          {(tableLoading || searchLoading) && (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10 rounded-lg">
              <div className="flex flex-col items-center space-y-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="text-gray-600 font-medium">
                  {searchLoading ? 'Searching through all tickets...' : 'Loading...'}
                </span>
              </div>
            </div>
          )}

          <div className="overflow-hidden w-full">
            <table className="min-w-full bg-white">
              <thead>
                <tr className="bg-black border-b border-gray-200">
                  {tableColumns.map((col) => (
                    <th key={col.accessor} className="py-3 px-6 text-left text-sm font-semibold text-white">
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-gray-600 text-sm bg-white">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={tableColumns.length} className="text-center py-8 text-gray-500">
                      No data found
                    </td>
                  </tr>
                ) : (
                  filteredData.map((row: any, rowIndex: number) => (
                    <tr 
                      key={rowIndex} 
                      className={`border-b border-gray-200 hover:bg-gray-50 bg-white ${
                        handleRowClick ? 'cursor-pointer' : ''
                      }`}
                      onClick={() => handleRowClick && handleRowClick(row)}
                    >
                      {tableColumns.map((col) => (
                        <td key={col.accessor} className="py-3 px-6 text-left">
                          <div className="flex items-center">
                            {col.accessor === 'name' ? (
                              <ShortProfileCard
                                image={row.display_pic_url || row.image}
                                name={row.name}
                                address={row.email_id || row.email || ''}
                              />
                            ) : col.type === 'chip' ? (
                              <Badge 
                                variant="outline" 
                                className={`${getStatusColor(row[col.accessor])} text-xs font-medium px-3 py-1 rounded-full border`}
                              >
                                {row[col.accessor]}
                              </Badge>
                            ) : col.type === 'link' ? (
                              row[col.accessor] && row[col.accessor] !== 'N/A' ? (
                                <a
                                  href={row[col.accessor]}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 underline text-sm"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {row[col.accessor]}
                                </a>
                              ) : (
                                <span className="text-sm text-gray-400">N/A</span>
                              )
                            ) : col.type === 'action' ? (
                              <CustomButton
                                variant="outline"
                                size="sm"
                                className="text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleActionClick(row, col);
                                }}
                              >
                                {col.header || 'Action'}
                              </CustomButton>
                            ) : (
                              <span className="text-sm text-gray-600">{row[col.accessor] || 'N/A'}</span>
                            )}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Server-side pagination controls */}
        {pagination.totalCount > 0 && filteredData.length > 0 && (
          <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Page</span>
              <Select
                value={pagination.currentPage.toString()}
                onValueChange={handlePageChange}
                disabled={tableLoading}
              >
                <SelectTrigger className="bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300 rounded-md px-3 py-1.5 h-auto w-[70px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: pagination.numberOfPages }, (_, i) => i + 1).map((pageNum) => (
                    <SelectItem key={pageNum} value={pageNum.toString()} className="hover:bg-gray-100 focus:bg-gray-100">
                      {pageNum}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm text-gray-600">of {pagination.numberOfPages}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <CustomButton
                variant="outline"
                size="sm"
                onClick={handlePreviousPage}
                disabled={!pagination.previousPageLink || tableLoading}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300 rounded-md px-4 py-1.5 h-auto disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </CustomButton>
              
              <CustomButton
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={!pagination.nextPageLink || tableLoading}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300 rounded-md px-4 py-1.5 h-auto disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </CustomButton>
            </div>
          </div>
        )}
      </div>

      {/* Ticket Modal */}
      <Dialog open={isTicketModalOpen} onOpenChange={setIsTicketModalOpen}>
        <DialogContent className="font-body max-w-3xl max-h-[85vh] overflow-y-auto p-6">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-lg font-semibold text-foreground">Ticket Details</DialogTitle>
          </DialogHeader>
          {selectedTicket && (
            <div className="mt-2 -mx-2">
              <TicketCarousel 
                config={{
                  title: `Ticket #${selectedTicket.id}`
                }}
                initialTicket={selectedTicket}
                onUpdate={handleTicketUpdate}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}; 