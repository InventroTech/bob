'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Filter, User, MessageCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FilterConfig } from '@/component-config/DynamicFilterConfig';
import { useFilters } from '@/hooks/useFilters';
import { FilterService } from '@/services/filterService';
import { DynamicFilterBuilder } from '@/components/DynamicFilterBuilder';

interface Column {
  header: string;
  accessor: string;
  type: 'text' | 'chip' | 'link';
  linkField?: string; // Field to use as link for this column
}

// Status color mapping - configurable; falls back to defaults when no map provided
const getStatusColor = (status: string, statusColors?: Record<string, string>) => {
  if (statusColors && statusColors[status]) {
    return statusColors[status];
  }
  
  // Default fallback colors
  const statusLower = status.toLowerCase();
  switch (statusLower) {
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

// Convert raw email/id into a user-friendly display name
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

// Format UTC date string into relative time (IST timezone)
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

// Transform backend record to table row based on optional column config
const transformLeadData = (lead: any, config?: LeadTableProps['config']) => {
  // If configuration is provided, use it to transform data
  if (config?.columns) {
    const transformedLead: any = { ...lead };
    
    // Apply transformations for configured columns
    config.columns.forEach(col => {
      const value = lead.data?.[col.key] !== undefined ? lead.data?.[col.key] : lead[col.key];
      
      // Use custom transform if provided
      if (col.transform) {
        transformedLead[col.key] = col.transform(value, lead);
      } else {
        // Apply default transformations based on field type
        switch (col.type) {
          case 'date':
            transformedLead[col.key] = value !== null && value !== undefined ? formatRelativeTime(value) : 'N/A';
            break;
          default:
            transformedLead[col.key] = value !== null && value !== undefined ? value : 'N/A';
        }
      }
    });
    
    // Always include user_profile_link for User ID clickability
    transformedLead.user_profile_link = lead.data?.user_profile_link || lead.user_profile_link || '#';
    
    // Always include whatsapp_link for phone number clickability
    transformedLead.whatsapp_link = lead.data?.whatsapp_link || lead.whatsapp_link || '';
    
    // Always include poster field from records JSONB data
    transformedLead.poster = lead.data?.poster || lead.poster || null;
    
    return transformedLead;
  }
  
  // Fallback: minimal transformation for default columns only
  return {
    ...lead,
    lead_stage: lead.data?.lead_stage || lead.data?.lead_status || lead.lead_stage || 'in_queue',
    customer_full_name: lead.data?.customer_full_name || lead.name || lead.data?.name || 'N/A',
    user_id: lead.data?.user_id || lead.id || 'N/A',
    affiliated_party: lead.data?.affiliated_party || 'N/A',
    phone_number: lead.data?.phone_number || lead.data?.phone_no || lead.phone || 'N/A',
    whatsapp_link: lead.data?.whatsapp_link || lead.whatsapp_link || '',
    user_profile_link: lead.data?.user_profile_link || lead.user_profile_link || '#',
    poster: lead.data?.poster || lead.poster || null, // Add poster field from records JSONB data
  };
};

// Default columns used if no custom columns are configured
const defaultColumns: Column[] = [
  { header: 'Stage', accessor: 'lead_stage', type: 'chip' },
  { header: 'Customer Name', accessor: 'customer_full_name', type: 'text' },
  { header: 'User ID', accessor: 'user_id', type: 'text' },
  { header: 'Party', accessor: 'affiliated_party', type: 'text' },
  { header: 'Phone No', accessor: 'phone_number', type: 'text' },
];

interface LeadTableProps {
  config?: {
    apiEndpoint?: string;
    columns?: Array<{
      key: string;
      label: string;
      type: 'text' | 'chip' | 'date' | 'number' | 'link';
      transform?: (value: any, row: any) => any;
      width?: string;
    }>;
    title?: string;
    apiPrefix?: 'supabase' | 'renderer';
    defaultFilters?: {
      lead_status?: string[];
      lead_stage?: string[];
    };
    entityType?: string;
    statusOptions?: string[];
    statusColors?: Record<string, string>;
    tableLayout?: 'auto' | 'fixed';
    emptyMessage?: string;

    // New dynamic filter configuration
    filters?: FilterConfig[];
    filterOptions?: {
      pageSize?: number;
      showSummary?: boolean;
      compact?: boolean;
    };
    searchFields?: string;

    showFallbackOnly?: boolean; // New prop to show only fallback 
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
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [displaySearchTerm, setDisplaySearchTerm] = useState<string>('');
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestSequenceRef = useRef<number>(0);

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

  // URL management hooks (must be declared early for navigation and URL sync)
  const navigate = useNavigate();
  const location = useLocation();

  // New dynamic filter system: instantiate FilterService only when dynamic filters exist and not in fallback mode
  const filterService = useMemo(() => {
    if (normalizedFilters.length > 0 && !config?.showFallbackOnly) {
      const service = new FilterService(normalizedFilters, {
        apiEndpoint: config.apiEndpoint,
        entityType: config.entityType,
        pageSize: config.filterOptions?.pageSize || 10,
        searchFields: config.searchFields,
        defaultParams: {
          ...(config.defaultFilters?.lead_status?.length && { lead_status: config.defaultFilters.lead_status }),
          ...(config.defaultFilters?.lead_stage?.length && { lead_stage: config.defaultFilters.lead_stage }),
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
  }, [normalizedFilters, config?.apiEndpoint, config?.entityType, config?.filterOptions?.pageSize, config?.defaultFilters, config?.showFallbackOnly, config?.searchFields]);

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
          case 'select':
            // Handle multiple values (separate parameters with same name)
            const allValues = urlParams.getAll(accessor);
            if (allValues.length > 0) {
              filterValues[filter.key] = allValues;
            }
            break;
          case 'date_gte':
          case 'date_lte':
          case 'text':
          case 'search':
          case 'number_gte':
          case 'number_lte':
            filterValues[filter.key] = paramValue;
            break;
          case 'date_range':
            // Date range might have both start and end dates
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
  const [filterOptions, setFilterOptions] = useState<{
    lead_statuses: string[];
    sources: string[];
  }>({
    lead_statuses: config?.statusOptions || [],
    sources: []
  });
  const { session, user } = useAuth();

  // Custom cell renderer - completely generic
  const renderCell = useCallback((row: any, column: Column, columnIndex: number) => {
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
    
    // Convert to string for display
    const displayValue = String(value);
    
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
    
    // Render link type columns
    if (column.type === 'link') {
      if (!displayValue || displayValue === '#' || displayValue === 'N/A') {
        return <span className="text-gray-400 text-xs">-</span>;
      }
      
      // Check if it's a profile link
      if (column.accessor === 'user_profile_link' || column.header.toLowerCase().includes('profile')) {
        return (
          <a
            href={displayValue}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <User className="h-4 w-4" />
            <span className="text-xs">{truncateText('Profile', columnIndex)}</span>
          </a>
        );
      }
      
      // Check if it's a WhatsApp link
      if (column.accessor === 'whatsapp_link' || column.header.toLowerCase().includes('whatsapp') || column.header.toLowerCase().includes('whats')) {
        return (
          <a
            href={displayValue}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-green-600 hover:text-green-700 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <MessageCircle className="h-4 w-4" />
            <span className="text-xs">{truncateText('WhatsApp', columnIndex)}</span>
          </a>
        );
      }
      
      // Default link rendering
      return (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="h-4 w-4" />
            <span className="text-xs">{truncateText('Link', columnIndex)}</span>
        </a>
      );
    }
    
    // Render chip/badge for chip type columns
    if (column.type === 'chip') {
      return (
        <Badge className={`${getStatusColor(displayValue, config?.statusColors)} text-xs px-2 py-0.5`} title={displayValue}>
          {truncateText(displayValue, columnIndex)}
        </Badge>
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
            <span className="text-xs">{truncateText(displayValue, columnIndex)}</span>
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
              <span className="text-xs">{truncateText(displayValue, columnIndex)}</span>
            </a>
          );
        }
      }
      // If no valid phone number, fall through to default text rendering below
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
          <span className="text-xs">{truncateText(displayValue, columnIndex)}</span>
        </a>
      );
    }
    
    // Fallback: Special handling for User ID - make it clickable if profile link exists
    if (column.accessor === 'user_id' && row.user_profile_link && row.user_profile_link !== '#' && row.user_profile_link !== 'N/A') {
      return (
        <a
          href={row.user_profile_link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
          onClick={(e) => e.stopPropagation()}
        >
          <User className="h-3 w-3" />
          <span className="text-xs">{truncateText(displayValue, columnIndex)}</span>
        </a>
      );
    }
    
    // Default text rendering
    return <span className="text-xs block" title={displayValue}>{truncateText(displayValue, columnIndex)}</span>;
  }, [config?.statusColors]);

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
  const fetchFilteredData = async (requestSequence?: number, queryParams?: URLSearchParams) => {
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
      let params: URLSearchParams;

      // Use new dynamic filter system if filters are configured
      if (queryParams) {
        params = queryParams;
      } else if (hasActiveFilters) {
        params = filterService.generateQueryParams(filterState.values);
        // Add pagination parameters for both systems
        params.append('page', '1');
        params.append('page_size', '10');
      } else {
        // Fallback to legacy filter system
        params = new URLSearchParams();

        // Only add entity_type if using generic records endpoint and entityType is configured
        if (endpoint.includes('/crm-records/records') && config?.entityType) {
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

        // Note: Search is now handled through the dynamic filter system above
        // No need to add search parameter here for legacy system
        
        // Add pagination parameters for both systems
        params.append('page', '1');
        params.append('page_size', '10');
      }

      const fullUrl = `${apiUrl}${apiUrl.includes('?') ? '&' : '?'}${params.toString()}`;

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
      toast.error('Failed to apply filters');
    } finally {
      setTableLoading(false);
    }
  };

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

    // Update URL to clear filter parameters
    if (hasActiveFilters) {
      const params = filterService.generateQueryParams({});
      // Add pagination parameters for complete URL state
      params.append('page', '1');
      params.append('page_size', '10');

      // Only add entity_type if using generic records endpoint and entityType is configured
      if (config?.apiEndpoint?.includes('/crm-records/records') && config?.entityType) {
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
      const authToken = session?.access_token;
      const baseUrl = import.meta.env.VITE_RENDER_API_URL;
      const endpoint = config?.apiEndpoint || '/api/records/';

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

      const apiUrl = `${baseUrl}${endpoint}${params.toString() ? '?' + params.toString() : ''}`;

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
      let leads = responseData.data || responseData.results || [];
      let pageMeta = responseData.page_meta;

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
      toast.error('Failed to reset filters');
    } finally {
      setTableLoading(false);
    }
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
        let params: URLSearchParams | undefined;
        // Update URL with search parameter if using dynamic filters
        if (hasActiveFilters) {
          const currentFilters = { ...filterState.values };
          if (searchValue.trim()) {
            currentFilters.search = searchValue.trim();
          } else {
            delete currentFilters.search;
          }
          params = filterService.generateQueryParams(currentFilters);
          // Add pagination parameters for complete URL state
          params.append('page', '1');
          params.append('page_size', '10');

          // Only add entity_type if using generic records endpoint and entityType is configured
          if (config?.apiEndpoint?.includes('/crm-records/records') && config?.entityType) {
            params.append('entity_type', config.entityType);
          }

          updateURL(params);
        }

        // Always call fetchFilteredData to refresh data and pagination
        // This ensures pagination works correctly after clearing search
        fetchFilteredData(apiSequence, params);
      }
    }, 1000);
  }, [fetchFilteredData, data, leadStatusFilter, sourceFilter, dateRangeFilter, hasActiveFilters, filterState.values, filterService, config?.apiEndpoint, config?.entityType, updateURL, displaySearchTerm]);

  // Handle search input change
  const handleSearchChange = useCallback((value: string) => {
    debouncedSearch(value);
  }, [debouncedSearch]);

  // Memoized search input component
  const SearchInputComponent = useMemo(() => 
    React.memo(({ searchTerm, onChange }: { searchTerm: string; onChange: (value: string) => void }) => (
      <input
        type="text"
        placeholder="Search by customer name, phone, user ID..."
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
      fetchFilteredData();
    } else {
      setFilteredData(updatedData);
    }
    
    setIsLeadModalOpen(false);
  };

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        setLoading(true);
        
        // If showFallbackOnly is true, skip API call and show empty state
        if (config?.showFallbackOnly) {
          setData([]);
          setFilteredData([]);
          setLoading(false);
          return;
        }
        
        const authToken = session?.access_token;
        const baseUrl = import.meta.env.VITE_RENDER_API_URL;
        const endpoint = config?.apiEndpoint || '/api/records/';

        // Build initial query parameters
        let params: URLSearchParams;

        if (hasActiveFilters) {
          // Use dynamic filter system
          params = filterService.generateQueryParams(filterState.values);

          // Only add entity_type if using generic records endpoint and entityType is configured
          if (endpoint.includes('/crm-records/records') && config?.entityType) {
            params.append('entity_type', config.entityType);
          }
        } else {
          // Fallback to legacy filter system
          params = new URLSearchParams();

          // Only add entity_type if using generic records endpoint and entityType is configured
          if (endpoint.includes('/crm-records/records') && config?.entityType) {
            params.append('entity_type', config.entityType);
          }

          // Apply default filters if provided
          if (config?.defaultFilters?.lead_stage && config.defaultFilters.lead_stage.length > 0) {
            params.append('lead_stage', config.defaultFilters.lead_stage.join(','));
          }
        }

        // Add pagination parameters for both systems
        params.append('page', '1');
        params.append('page_size', '10');

        // Update URL with current parameters (including URL-restored filters)
        updateURL(params);

        const apiUrl = `${baseUrl}${endpoint}${endpoint.includes('?') ? '&' : '?'}${params.toString()}`;

        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authToken ? `Bearer ${authToken}` : '',
            'X-Tenant-Slug': 'bibhab-thepyro-ai'
          }
        });

        if (!response.ok) {
          console.error('API Error:', response.status, response.statusText);
          const errorText = await response.text();
          console.error('Error response:', errorText);
          throw new Error(`Failed to fetch leads: ${response.status} - ${response.statusText}`);
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

        // Extract unique sources for filter
        const uniqueSources = [...new Set(transformedData.map((lead: any) => lead.lead_source || lead.source).filter(Boolean))];
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
  }, [session, config?.apiEndpoint, config?.defaultFilters, normalizedFilters, filterService, updateURL, config?.showFallbackOnly, config?.entityType]);

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
    <div className="w-full border-2 border-gray-200 rounded-lg bg-white p-4">
        {/* Filter Section */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">
              {config?.title || "Leads"}
            </h2>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowFilters(!showFilters);
                }}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </Button>
            </div>
          </div>

          {showFilters && (
            <div className="bg-gray-50 p-4 rounded-lg border">
              {/* Use new dynamic filter system if filters are configured */}
              {hasActiveFilters ? (
                <div className="space-y-4">
                  <DynamicFilterBuilder
                    filters={normalizedFilters}
                    onFiltersChange={(params) => {
                      // Add pagination parameters to URL for complete bookmarkable state
                      params.set('page', '1');
                      params.set('page_size', '10');

                      // Only add entity_type if using generic records endpoint and entityType is configured
                      if (config?.apiEndpoint?.includes('/crm-records/records') && config?.entityType) {
                        params.set('entity_type', config.entityType);
                      }

                      // Update the URL with complete parameters so users can bookmark/share
                      updateURL(params);

                      // Trigger API call with new parameters
                      const currentSequence = ++requestSequenceRef.current;
                      fetchFilteredData(currentSequence, params);
                    }}
                    className=""
                    showSummary={config.filterOptions?.showSummary !== false}
                    compact={config.filterOptions?.compact}
                  />

                  {/* Filter Summary */}
                  <div className="mt-3 text-sm text-gray-600">
                    Showing {filteredData.length} of {pagination.totalCount} leads
                    {filtersApplied && getActiveFiltersCount() > 0 && hasActiveFilters && (
                      <span className="ml-2">
                        (Filtered by: {filterService.getFilterDescription(filterState.values)})
                      </span>
                    )}
                  </div>
                </div>
              ) : (<h1>No filters configured</h1>)}
            </div>
          )}
        </div>


        {/* Search Bar Section */}
        <div className="mb-6">
          <div className="flex justify-end items-center">
            <Input
              type="text"
              placeholder="Search..."
              value={displaySearchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-64 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Table Section */}
        {/* Always use server-side pagination - backend handles search */}
        <div className="w-full">
          <style>{`
            /* Fixed width table - no horizontal scroll */
            .table-container {
              width: 100%;
              border: 1px solid #e5e7eb;
              border-radius: 0.5rem;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
              overflow: hidden;
            }
            
            /* Table styles */
            table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed; /* Fixed layout for consistent column widths */
            }
            
            th, td {
              padding: 8px 12px;
              text-align: left;
              border-bottom: 1px solid #e5e7eb;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
            
            th {
              background-color: #f9fafb;
              font-weight: 600;
              font-size: 0.875rem;
              color: #374151;
            }
            
            td {
              font-size: 0.875rem;
              color: #111827;
            }
            
            tr:hover {
              background-color: #f9fafb;
            }
            
            tbody tr:nth-child(even) {
              background-color: #fafafa;
            }
            
            /* Equal column widths - distribute evenly */
            ${config?.columns?.map((col, idx) => 
              col.width ? 
                `table th:nth-child(${idx + 1}), table td:nth-child(${idx + 1}) { width: ${col.width}; }` : 
                `table th:nth-child(${idx + 1}), table td:nth-child(${idx + 1}) { width: ${100 / (config?.columns?.length || 5)}%; }`
            ).filter(Boolean).join('\n')}
          `}</style>
          <div className="table-container">
            <table className="w-full" style={{ tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  {tableColumns.map((col, idx) => (
                    <th key={idx}>{col.header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableLoading ? (
                  <tr>
                    <td colSpan={tableColumns.length} className="text-center py-8 text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={tableColumns.length} className="text-center py-8 text-gray-500">
                      {config?.emptyMessage || 'No data found'}
                    </td>
                  </tr>
                ) : (
                  filteredData.map((row: any, rowIdx: number) => (
                    <tr 
                      key={rowIdx} 
                      onClick={() => handleRowClick(row)}
                      className="cursor-pointer"
                    >
                      {tableColumns.map((col, colIdx) => (
                        <td key={colIdx}>
                          {renderCell(row, col, colIdx)}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Server-side pagination controls - works for both search and normal view */}
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
              <DialogTitle>{config?.title || 'Record'} Details</DialogTitle>
            </div>
          </DialogHeader>
          {selectedLead && (
            <div className="mt-2 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {config?.columns ? (
                  // Show configured columns
                  config.columns.map((col, idx) => (
                    <div key={idx}>
                      <label className="block text-sm font-medium text-gray-700">{col.label}</label>
                      {col.type === 'link' ? (
                        selectedLead[col.key] !== '#' && selectedLead[col.key] !== 'N/A' ? (
                          <a 
                            href={selectedLead[col.key]} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="mt-1 text-sm text-blue-600 hover:underline"
                          >
                            Open Link
                          </a>
                        ) : (
                          <p className="mt-1 text-sm text-gray-900">N/A</p>
                        )
                      ) : col.type === 'chip' ? (
                        <Badge className={`mt-1 ${getStatusColor(selectedLead[col.key], config?.statusColors)}`}>
                          {selectedLead[col.key]}
                        </Badge>
                      ) : (
                        <p className="mt-1 text-sm text-gray-900">{selectedLead[col.key] || 'N/A'}</p>
                      )}
                    </div>
                  ))
                ) : (
                  // Show fallback columns only
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Stage</label>
                      <Badge className={`mt-1 ${getStatusColor(selectedLead.lead_stage, config?.statusColors)}`}>
                        {selectedLead.lead_stage || 'N/A'}
                      </Badge>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Customer Name</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedLead.customer_full_name || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">User ID</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedLead.user_id || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Party</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedLead.affiliated_party || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedLead.phone_number || 'N/A'}</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </>
  );
};
