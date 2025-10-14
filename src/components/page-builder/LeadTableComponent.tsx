'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { PrajaTable } from '../ui/prajaTable';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Filter, Calendar } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronDown } from 'lucide-react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';

interface Column {
  header: string;
  accessor: string;
  type: 'text' | 'chip' | 'link';
}

// Status color mapping for leads
const getStatusColor = (status: string) => {
  const statusLower = status.toLowerCase();
  switch (statusLower) {
    // Lead statuses
    case 'in_queue':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'assigned':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'call_later':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'scheduled':
      return 'bg-cyan-100 text-cyan-800 border-cyan-200';
    case 'won':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'lost':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'closed':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    
    // Resolution statuses
    case 'resolved':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'wip':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'open':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
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
const formatRelativeTime = (dateString: string): string => {
  if (!dateString) return 'N/A';
  
  // Parse the UTC timestamp
  let utcDate: Date;
  
  if (dateString.includes('T')) {
    utcDate = new Date(dateString);
  } else if (dateString.includes(' ')) {
    utcDate = new Date(dateString + ' UTC');
  } else {
    utcDate = new Date(dateString);
  }
  
  if (isNaN(utcDate.getTime())) {
    return 'Invalid date';
  }
  
  // Convert UTC to IST (Mumbai) - IST is UTC+5:30
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(utcDate.getTime() + istOffset);
  
  // Get current time in IST
  const nowUtc = new Date();
  const nowIst = new Date(nowUtc.getTime() + istOffset);
  
  // Calculate difference
  const diffInMilliseconds = nowIst.getTime() - istDate.getTime();
  const diffInSeconds = Math.floor(diffInMilliseconds / 1000);
  
  if (diffInSeconds < 0) {
    return 'Just now';
  }
  
  if (diffInSeconds < 60) {
    return `${diffInSeconds} sec ago`;
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} min ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 31536000) {
    const months = Math.floor(diffInSeconds / 2592000);
    return `${months} month${months > 1 ? 's' : ''} ago`;
  } else {
    const years = Math.floor(diffInSeconds / 31536000);
    return `${years} year${years > 1 ? 's' : ''} ago`;
  }
};

// Default columns
const defaultColumns: Column[] = [
  { header: 'Name', accessor: 'name', type: 'text' },
  { header: 'Phone No', accessor: 'phone_no', type: 'text' },
  { header: 'Company', accessor: 'company', type: 'text' },
  { header: 'Lead Score', accessor: 'lead_score', type: 'text' },
  { header: 'Resolution Status', accessor: 'resolution_status', type: 'chip' },
  { header: 'Lead Status', accessor: 'lead_status', type: 'chip' },
  { header: 'Source', accessor: 'source', type: 'text' },
  { header: 'Created At', accessor: 'created_at', type: 'text' },
];

interface LeadTableProps {
  config?: {
    apiEndpoint?: string;
    columns?: Array<{
      key: string;
      label: string;
      type: 'text' | 'chip' | 'date' | 'number' | 'link';
    }>;
    title?: string;
    apiPrefix?: 'supabase' | 'renderer';
    defaultFilters?: {
      lead_status?: string[];
    };
  };
}

export const LeadTableComponent: React.FC<LeadTableProps> = ({ config }) => {
  const [data, setData] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
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
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [displaySearchTerm, setDisplaySearchTerm] = useState<string>('');
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestSequenceRef = useRef<number>(0);
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
  const [filterOptions, setFilterOptions] = useState<{
    lead_statuses: string[];
    sources: string[];
  }>({
    lead_statuses: ['in_queue', 'assigned', 'call_later', 'scheduled', 'won', 'lost', 'closed'],
    sources: []
  });
  const { session, user } = useAuth();

  // Memoize table columns
  const tableColumns: Column[] = useMemo(() => 
    config?.columns?.map(col => ({
    header: col.label,
    accessor: col.key,
      type: col.type === 'chip' ? 'chip' : col.type === 'link' ? 'link' : 'text'
    })) || defaultColumns,
    [config?.columns]
  );

  // Get unique values for filters
  const getUniqueLeadStatuses = () => {
    if (filterOptions.lead_statuses.length > 0) {
      return filterOptions.lead_statuses;
    }
    const statuses = [...new Set(data.map(lead => lead.data?.lead_status).filter(Boolean))];
    return statuses;
  };

  const getUniqueSources = () => {
    if (filterOptions.sources.length > 0) {
      return filterOptions.sources;
    }
    const sources = [...new Set(data.map(lead => lead.data?.source).filter(Boolean))];
    return sources;
  };

  // Apply filters using the records endpoint
  const applyFilters = async (requestSequence?: number) => {
    try {
      setTableLoading(true);
      
      // Cancel any previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      
      const currentSequence = requestSequence || ++requestSequenceRef.current;
      const authToken = session?.access_token;
      const baseUrl = import.meta.env.VITE_RENDER_API_URL;
      const endpoint = config?.apiEndpoint || '/crm-records/records/';
      const apiUrl = `${baseUrl}${endpoint}`;
      
      // Build query parameters
      const params = new URLSearchParams();
      
      // Only add entity_type if using generic records endpoint
      if (endpoint.includes('/crm-records/records')) {
        params.append('entity_type', 'lead');
      }
      
      // Add lead status filters
      if (leadStatusFilter.length > 0) {
        params.append('lead_status', leadStatusFilter.join(','));
      }
      
      // Add source filter
      if (sourceFilter !== 'all') {
        params.append('source', sourceFilter);
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
      
      // Add search filter
      const currentSearchTerm = latestSearchValueRef.current;
      if (currentSearchTerm.trim() !== '') {
        params.append('name', currentSearchTerm.trim());
      }
      
      // Add pagination
      params.append('page', '1');
      params.append('page_size', '10');
      
      const fullUrl = `${apiUrl}?${params.toString()}`;
      console.log('Filtered API URL:', fullUrl);

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
        throw new Error(`Failed to fetch filtered leads: ${response.status}`);
      }

      const responseData = await response.json();
      
      // Check if this response is still relevant
      if (currentSequence !== requestSequenceRef.current) {
        console.log(`Ignoring stale response for sequence ${currentSequence}`);
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
      const transformedData = leads.map((lead: any) => ({
        ...lead,
        // Extract fields from data JSON
        phone_no: lead.data?.phone_no || 'N/A',
        email: lead.data?.email || 'N/A',
        company: lead.data?.company || 'N/A',
        lead_score: lead.data?.lead_score || 'N/A',
        lead_status: lead.data?.lead_status || 'in_queue',
        resolution_status: lead.data?.resolution_status || 'Open',
        source: lead.data?.source || 'N/A',
        badge: lead.data?.badge || 'N/A',
        created_at: lead.created_at ? formatRelativeTime(lead.created_at) : 'N/A',
      }));

      setFilteredData(transformedData);
      setFiltersApplied(true);
      
      // Update pagination
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
        console.log('Request was aborted');
        return;
      }
      console.error('Error applying filters:', error);
      toast.error('Failed to apply filters');
    } finally {
      setTableLoading(false);
    }
  };

  // Reset filters
  const resetFilters = () => {
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
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
    setFilteredData(data);
    setFiltersApplied(false);
  };

  // Store the latest search value
  const latestSearchValueRef = useRef<string>('');
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
        
        if (searchValue.trim() === '') {
          if (leadStatusFilter.length === 0 && 
              sourceFilter === 'all' && 
              !dateRangeFilter.startDate && 
              !dateRangeFilter.endDate) {
            setFilteredData(data);
            setFiltersApplied(false);
          } else {
            applyFilters(apiSequence);
          }
        } else {
          applyFilters(apiSequence);
        }
      }
    }, 1000);
  }, [applyFilters, data, leadStatusFilter, sourceFilter, dateRangeFilter]);

  // Handle search input change
  const handleSearchChange = useCallback((value: string) => {
    debouncedSearch(value);
  }, [debouncedSearch]);

  // Memoized search input component
  const SearchInputComponent = useMemo(() => 
    React.memo(({ searchTerm, onChange }: { searchTerm: string; onChange: (value: string) => void }) => (
      <input
        type="text"
        placeholder="Search leads..."
        value={searchTerm}
        onChange={(e) => onChange(e.target.value)}
        className="w-64 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    ), (prevProps, nextProps) => prevProps.searchTerm === nextProps.searchTerm),
    []
  );

  // Memoized row click handler
  const handleRowClick = useCallback((row: any) => {
    setSelectedLead(row);
    setIsLeadModalOpen(true);
  }, []);

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
        let leads = responseData.data || responseData.results || [];
        let pageMeta = responseData.page_meta;

        const transformedData = leads.map((lead: any) => ({
          ...lead,
          phone_no: lead.data?.phone_no || 'N/A',
          email: lead.data?.email || 'N/A',
          company: lead.data?.company || 'N/A',
          lead_score: lead.data?.lead_score || 'N/A',
          lead_status: lead.data?.lead_status || 'in_queue',
          resolution_status: lead.data?.resolution_status || 'Open',
          source: lead.data?.source || 'N/A',
          badge: lead.data?.badge || 'N/A',
          created_at: lead.created_at ? formatRelativeTime(lead.created_at) : 'N/A',
        }));

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
        let leads = responseData.data || responseData.results || [];
        let pageMeta = responseData.page_meta;

        const transformedData = leads.map((lead: any) => ({
          ...lead,
          phone_no: lead.data?.phone_no || 'N/A',
          email: lead.data?.email || 'N/A',
          company: lead.data?.company || 'N/A',
          lead_score: lead.data?.lead_score || 'N/A',
          lead_status: lead.data?.lead_status || 'in_queue',
          resolution_status: lead.data?.resolution_status || 'Open',
          source: lead.data?.source || 'N/A',
          badge: lead.data?.badge || 'N/A',
          created_at: lead.created_at ? formatRelativeTime(lead.created_at) : 'N/A',
        }));

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
        toast.error('Failed to load previous page');
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
      applyFilters();
    } else {
      setFilteredData(updatedData);
    }
    
    setIsLeadModalOpen(false);
  };

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        setLoading(true);
        const authToken = session?.access_token;
        const baseUrl = import.meta.env.VITE_RENDER_API_URL;
        const endpoint = config?.apiEndpoint || '/crm-records/records/';
        
        // Build initial query parameters
        const params = new URLSearchParams();
        
        // Only add entity_type if using generic records endpoint
        if (endpoint.includes('/crm-records/records')) {
          params.append('entity_type', 'lead');
        }
        
        // Apply default filters if provided
        if (config?.defaultFilters?.lead_status && config.defaultFilters.lead_status.length > 0) {
          params.append('lead_status', config.defaultFilters.lead_status.join(','));
        }
        
        const apiUrl = `${baseUrl}${endpoint}${params.toString() ? '?' + params.toString() : ''}`;
        console.log('Initial API URL:', apiUrl);
        
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authToken ? `Bearer ${authToken}` : '',
            'X-Tenant-Slug': 'bibhab-thepyro-ai'
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch leads: ${response.status}`);
        }

        const responseData = await response.json();
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

        // Transform the data
        const transformedData = leads.map((lead: any) => ({
          ...lead,
          phone_no: lead.data?.phone_no || 'N/A',
          email: lead.data?.email || 'N/A',
          company: lead.data?.company || 'N/A',
          lead_score: lead.data?.lead_score || 'N/A',
          lead_status: lead.data?.lead_status || 'in_queue',
          resolution_status: lead.data?.resolution_status || 'Open',
          source: lead.data?.source || 'N/A',
          badge: lead.data?.badge || 'N/A',
          created_at: lead.created_at ? formatRelativeTime(lead.created_at) : 'N/A',
        }));

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
        
        // Extract unique sources for filter
        const uniqueSources = [...new Set(transformedData.map((lead: any) => lead.source).filter(Boolean))];
        setFilterOptions(prev => ({
          ...prev,
          sources: uniqueSources as string[]
        }));
      } catch (error) {
        console.error('Error fetching leads:', error);
        setData([]);
        setFilteredData([]);
        toast.error('Failed to fetch leads');
      } finally {
        setLoading(false);
      }
    };

    if (session?.access_token) {
    fetchLeads();
    }
  }, [session, config?.apiEndpoint, config?.defaultFilters]);

  // Cleanup on unmount
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
        <div className="text-gray-600">Loading leads data...</div>
      </div>
    );
  }

  return (
    <>
    <div className="overflow-x-auto border-2 border-gray-200 rounded-lg bg-white p-4">
        {/* Filter Section */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">
              {config?.title || "Leads"}
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>
          </div>

          {showFilters && (
            <div className="bg-gray-50 p-4 rounded-lg border">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lead Status
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-between"
                      >
                        <span className="text-sm">
                          {leadStatusFilter.length > 0
                            ? `${leadStatusFilter.length} status(es) selected`
                            : "All Lead Statuses"}
                        </span>
                        <ChevronDown className="h-3 w-3 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-60 p-4" align="start">
                      <div className="space-y-3">
                        <h4 className="font-medium text-sm">Select Lead Statuses</h4>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {getUniqueLeadStatuses().map((status) => (
                            <div key={status} className="flex items-center space-x-2">
                              <Checkbox
                                id={`lead-status-${status}`}
                                checked={leadStatusFilter.includes(status)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setLeadStatusFilter(prev => [...prev, status]);
                                  } else {
                                    setLeadStatusFilter(prev => prev.filter(s => s !== status));
                                  }
                                }}
                              />
                              <label
                                htmlFor={`lead-status-${status}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                              >
                                {status}
                              </label>
                            </div>
                          ))}
                        </div>
                        {leadStatusFilter.length > 0 && (
                          <div className="pt-2 border-t">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setLeadStatusFilter([])}
                              className="text-xs"
                            >
                              Clear All
                            </Button>
                          </div>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Source
                  </label>
                  <Select value={sourceFilter} onValueChange={setSourceFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Sources" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sources</SelectItem>
                      {getUniqueSources().map(source => (
                        <SelectItem key={source} value={source}>
                          {source}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Date Range Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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

              {/* Action Buttons */}
              <div className="flex items-center gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={resetFilters}
                  className="flex-1"
                >
                  Reset Filters
                </Button>
                <Button
                  variant="default"
                  onClick={() => applyFilters()}
                  className="flex-1"
                  disabled={tableLoading}
                >
                  {tableLoading ? 'Applying...' : 'Apply Filters'}
                </Button>
              </div>

              {/* Filter Summary */}
              <div className="mt-3 text-sm text-gray-600">
                Showing {filteredData.length} of {pagination.totalCount > 0 ? pagination.totalCount : (filtersApplied ? filteredData.length : data.length)} leads
                {filtersApplied && (leadStatusFilter.length > 0 || sourceFilter !== 'all' || dateRangeFilter.startDate || dateRangeFilter.endDate || searchTerm.trim() !== '') && (
                  <span className="ml-2">
                    (Filtered by: 
                    {leadStatusFilter.length > 0 && ` Lead Status: ${leadStatusFilter.join(', ')}`}
                    {sourceFilter !== 'all' && ` ${leadStatusFilter.length > 0 ? ', ' : ''}Source: ${sourceFilter}`}
                    {(dateRangeFilter.startDate || dateRangeFilter.endDate) && ` ${(leadStatusFilter.length > 0 || sourceFilter !== 'all') ? ', ' : ''}Date Range`}
                    {searchTerm.trim() !== '' && ` ${(leadStatusFilter.length > 0 || sourceFilter !== 'all' || dateRangeFilter.startDate || dateRangeFilter.endDate) ? ', ' : ''}Search: "${searchTerm}"`}
                    )
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Search Bar Section */}
        <div className="mb-6">
          <div className="flex justify-end items-center">
            <SearchInputComponent 
              searchTerm={displaySearchTerm}
              onChange={handleSearchChange}
            />
          </div>
        </div>

        {/* Table Section */}
        <PrajaTable 
          columns={tableColumns} 
          data={filteredData} 
          onRowClick={handleRowClick}
          disablePagination={true}
          loading={tableLoading}
        />
        
        {/* Server-side pagination controls */}
        {pagination.totalCount > 0 && filteredData.length > 0 && (
          <div className="flex justify-between items-center mt-4 p-4 border-t">
            <div className="text-sm text-gray-600">
              Showing {filteredData.length} of {pagination.totalCount} leads
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousPage}
                disabled={!pagination.previousPageLink || tableLoading}
              >
                Previous
              </Button>
              
              <span className="text-sm text-gray-600 px-3">
                Page {pagination.currentPage} of {pagination.numberOfPages}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={!pagination.nextPageLink || tableLoading}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Lead Modal */}
      <Dialog open={isLeadModalOpen} onOpenChange={setIsLeadModalOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex justify-between items-center">
              <DialogTitle>Lead Details</DialogTitle>
            </div>
          </DialogHeader>
          {selectedLead && (
            <div className="mt-2 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedLead.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedLead.phone_no}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedLead.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Company</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedLead.company}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Lead Score</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedLead.lead_score}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <Badge className={`mt-1 ${getStatusColor(selectedLead.lead_status)}`}>
                    {selectedLead.lead_status}
                  </Badge>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Source</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedLead.source}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Badge</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedLead.badge}</p>
                </div>
              </div>
              {selectedLead.data?.lead_description && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedLead.data.lead_description}</p>
                </div>
      )}
    </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
