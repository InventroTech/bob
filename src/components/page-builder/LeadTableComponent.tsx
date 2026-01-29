'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import type { LeadCardCarouselHandle } from './LeadCardCarousel';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Filter, User, MessageCircle, ExternalLink, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';
import LeadCardCarousel from './LeadCardCarousel';
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

// Lightweight mustache-style matcher for replacing tokens like {{current_user}}
const PLACEHOLDER_REGEX = /{{\s*([^}]+)\s*}}/g;

type PlaceholderAdapter = {
  tokens: string[];
  resolve: () => string | undefined;
};

// Safely walk nested objects using dot-delimited paths (e.g. user_metadata.assigned_to)
const getNestedValue = (source: any, path: string): any => {
  if (!source || !path) return undefined;

  return path
    .split('.')
    .map(segment => segment.trim())
    .filter(Boolean)
    .reduce((current: any, key) => {
      if (current === undefined || current === null) {
        return undefined;
      }
      return current[key];
    }, source);
};

// Apply placeholder substitutions and URL-encode each resolved value
const applyPlaceholderTemplate = (
  template: string,
  resolver: (token: string) => string | undefined
): string => {
  return template.replace(PLACEHOLDER_REGEX, (_match, token) => {
    const resolved = resolver(token);
    if (resolved === undefined || resolved === null) {
      return '';
    }
    return encodeURIComponent(String(resolved));
  });
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
    
    // Always include user_profile_link for Praja ID clickability
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
    name: lead.data?.name || 'N/A', // name is now in data column
    praja_id: lead.data?.praja_id || lead.data?.user_id || lead.id || 'N/A',
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
  { header: 'Customer Name', accessor: 'name', type: 'text' },
  { header: 'Praja ID', accessor: 'praja_id', type: 'text' },
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
  const { toast } = useToast();
  const [data, setData] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [actionButtonsVisible, setActionButtonsVisible] = useState(false);
  const [isCallBackModalOpen, setIsCallBackModalOpen] = useState(false);
  const leadCardRef = useRef<LeadCardCarouselHandle>(null);

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
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [displaySearchTerm, setDisplaySearchTerm] = useState<string>('');
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestSequenceRef = useRef<number>(0);
  const lastFetchedTokenRef = useRef<string | null>(null); // Track last fetched session token
  const lastFetchedConfigRef = useRef<string>(''); // Track last fetched config/filter combination
  const { session, user } = useAuth();
  const sessionUser = session?.user ?? null;
  const activeUser = user ?? sessionUser ?? null;
  const activeUserId = activeUser?.id ?? null;
  const activeUserMetadata = activeUser?.user_metadata ?? null;
  const activeAppMetadata = activeUser?.app_metadata ?? null;

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

    return adapters;
  }, [activeUserId]);

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
    return applyPlaceholderTemplate(config.apiEndpoint, resolvePlaceholderValue);
  }, [config?.apiEndpoint, resolvePlaceholderValue]);

  const effectiveApiEndpoint = resolvedApiEndpoint ?? config?.apiEndpoint;

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
        apiEndpoint: effectiveApiEndpoint,
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
  }, [normalizedFilters, effectiveApiEndpoint, config?.entityType, config?.filterOptions?.pageSize, config?.defaultFilters, config?.showFallbackOnly, config?.searchFields]);

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
        return <span className="text-gray-400 text-sm">-</span>;
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
            <span className="text-sm">{truncateText('Profile', columnIndex)}</span>
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
            <span className="text-sm">{truncateText('WhatsApp', columnIndex)}</span>
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
            <span className="text-sm">{truncateText('Link', columnIndex)}</span>
        </a>
      );
    }
    
    // Render chip/badge for chip type columns
    if (column.type === 'chip') {
      return (
        <Badge className={`${getStatusColor(displayValue, config?.statusColors)} text-sm px-2 py-0.5`} title={displayValue}>
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
    return <span className="text-sm block" title={displayValue}>{truncateText(displayValue, columnIndex)}</span>;
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

      if (!effectiveApiEndpoint) {
        console.warn('LeadTableComponent: apiEndpoint is not configured.');
        setTableLoading(false);
        return;
      }

      const currentSequence = requestSequence || ++requestSequenceRef.current;
      const authToken = session?.access_token;
      const baseUrl = import.meta.env.VITE_RENDER_API_URL;
      const endpoint = effectiveApiEndpoint;
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

        // Include search and search_fields even when dynamic filters are not configured
        if (searchTerm && searchTerm.trim() !== '') {
          params.append('search', searchTerm.trim());
          if (config?.searchFields) {
            params.append('search_fields', config.searchFields);
          }
        }
        
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
      toast({ title: 'Error', description: 'Failed to apply filters', variant: 'destructive' });
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

    if (!effectiveApiEndpoint) {
      console.warn('LeadTableComponent: apiEndpoint is not configured.');
      return;
    }

    const endpoint = effectiveApiEndpoint;

    // Update URL to clear filter parameters
    if (hasActiveFilters) {
      const params = filterService.generateQueryParams({});
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
      const authToken = session?.access_token;
      const baseUrl = import.meta.env.VITE_RENDER_API_URL;

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
      toast({ title: 'Error', description: 'Failed to reset filters', variant: 'destructive' });
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
        const endpointForEntityCheck = effectiveApiEndpoint ?? '';
        // Update URL with search parameter if using dynamic filters; otherwise include search directly
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
        
        // Prevent redundant fetches: check if we've already fetched with this token and config
        const currentConfigKey = JSON.stringify({
          apiEndpoint: effectiveApiEndpoint ?? null,
          defaultFilters: config?.defaultFilters,
          normalizedFilters: normalizedFilters.map(f => f.key),
          entityType: config?.entityType,
          hasActiveFilters
        });
        
        // Only skip if token and config haven't changed and we have data
        if (authToken && 
            lastFetchedTokenRef.current === authToken && 
            lastFetchedConfigRef.current === currentConfigKey) {
          console.log('Skipping redundant fetch - same token and config');
          setLoading(false);
          return;
        }
        
        if (!effectiveApiEndpoint) {
          console.warn('LeadTableComponent: apiEndpoint is not configured.');
          setLoading(false);
          return;
        }

        const baseUrl = import.meta.env.VITE_RENDER_API_URL;
        const endpoint = effectiveApiEndpoint;

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
        
        // Update refs to track what we've fetched
        if (authToken) {
          lastFetchedTokenRef.current = authToken;
          lastFetchedConfigRef.current = currentConfigKey;
        }
      } catch (error) {
        console.error('Error fetching leads:', error);
        setData([]);
        setFilteredData([]);
        toast({ title: 'Error', description: 'Failed to fetch leads', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };

    if (session?.access_token) {
      fetchLeads();
    } else {
      // Reset refs when session is lost
      lastFetchedTokenRef.current = null;
      lastFetchedConfigRef.current = '';
    }
  }, [session?.access_token, effectiveApiEndpoint, config?.defaultFilters, normalizedFilters, filterService, updateURL, config?.showFallbackOnly, config?.entityType, hasActiveFilters]);

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
            <h5>
              {config?.title || "Leads"}
            </h5>
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
                      if ((effectiveApiEndpoint ?? '').includes('/crm-records/records') && config?.entityType) {
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
              ) : (<h5>No filters configured</h5>)}
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
                    <th key={idx} className="text-sm">{col.header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableLoading ? (
                  <tr>
                    <td colSpan={tableColumns.length} className="text-center py-8 text-sm text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={tableColumns.length} className="text-center py-8 text-sm text-gray-500">
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
                        <td key={colIdx} className="text-sm">
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

      {/* Lead Modal with LeadCard */}
      <Dialog open={isLeadModalOpen} onOpenChange={(open) => {
        setIsLeadModalOpen(open);
        // Reset selected lead when dialog closes to prevent stale state
        if (!open) {
          setSelectedLead(null);
          setActionButtonsVisible(false);
          // Reset the leadCardRef to ensure clean state on next open
          leadCardRef.current = null;
        }
      }}>
        <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="sr-only">
            <DialogTitle>
              {selectedLead?.name || (selectedLead as any)?.data?.name || 'Lead Details'}
            </DialogTitle>
            <DialogDescription>
              View and manage lead information
            </DialogDescription>
          </DialogHeader>
          {selectedLead && (() => {
            const transformLeadForCard = (lead: any) => {
              const originalLead = data.find(l => 
                l.id === lead.id || 
                l.id === lead.user_id ||
                (lead.praja_id && (l.data?.praja_id === lead.praja_id || l.data?.user_id === lead.praja_id))
              ) || lead;
              const leadData = originalLead.data || {};
              return {
                id: lead.id || originalLead.id,
                created_at: lead.created_at || originalLead.created_at,
                name: lead.name || leadData.name || 'N/A',
                email: lead.email || leadData.email || '',
                phone: lead.phone_number || leadData.phone_number || leadData.phone_no || leadData.phone || '',
                phone_no: lead.phone_number || leadData.phone_number || leadData.phone_no || leadData.phone || '',
                phone_number: lead.phone_number || leadData.phone_number || leadData.phone_no || leadData.phone || '',
                company: lead.company || leadData.company || '',
                position: lead.position || leadData.position || '',
                source: lead.source || leadData.lead_source || leadData.source || '',
                lead_source: leadData.lead_source || lead.source || '',
                status: lead.status || lead.lead_stage || leadData.lead_stage || leadData.lead_status || 'New',
                priority: lead.priority || leadData.priority || 'Medium',
                notes: lead.notes || leadData.notes || leadData.latest_remarks || '',
                budget: lead.budget || leadData.budget || 0,
                location: lead.location || leadData.location || leadData.state || '',
                tags: lead.tags || leadData.tags || [],
                display_pic_url: lead.display_pic_url || leadData.display_pic_url || null,
                linkedin_profile: lead.linkedin_profile || leadData.linkedin_profile || '',
                website: lead.website || leadData.website || '',
                next_follow_up: lead.next_follow_up || leadData.next_follow_up || leadData.next_call_at || '',
                lead_stage: lead.lead_stage || leadData.lead_stage || leadData.lead_status || 'New',
                praja_id: lead.praja_id || leadData.praja_id || leadData.user_id || '',
                affiliated_party: lead.affiliated_party || leadData.affiliated_party || '',
                rm_dashboard: lead.rm_dashboard || leadData.rm_dashboard || '',
                user_profile_link: lead.user_profile_link || leadData.user_profile_link || '',
                whatsapp_link: lead.whatsapp_link || leadData.whatsapp_link || '',
                package_to_pitch: lead.package_to_pitch || leadData.package_to_pitch || '',
                premium_poster_count: lead.premium_poster_count || leadData.premium_poster_count || 0,
                last_active_date: lead.last_active_date || leadData.last_active_date || '',
                last_active_date_time: lead.last_active_date_time || leadData.last_active_date_time || '',
                latest_remarks: lead.latest_remarks || leadData.latest_remarks || '',
                tasks: lead.tasks || leadData.tasks || [],
                data: {
                  ...leadData,
                  name: leadData.name || lead.name || 'N/A',
                  phone_number: leadData.phone_number || lead.phone_number || '',
                  lead_stage: leadData.lead_stage || lead.lead_stage || 'New',
                  praja_id: leadData.praja_id || lead.praja_id || '',
                },
              };
            };

            const transformedLead = transformLeadForCard(selectedLead);

            return (
              <>
                <div className="flex-1 min-h-0 overflow-y-auto">
                  <LeadCardCarousel
                    ref={leadCardRef}
                    config={{
                      ...config,
                      statusDataApiEndpoint: undefined,
                    }}
                    initialLead={transformedLead}
                    isInModal={true}
                    hideActionBar
                    onLeadUpdate={handleModalLeadUpdate}
                    onActionButtonsVisibilityChange={setActionButtonsVisible}
                    onCallBackModalChange={setIsCallBackModalOpen}
                    onActionComplete={(leadId, action) => {
                      // Remove the lead from the table only when it's NOT "Call Back Later" (callback leads stay in list)
                      if (action !== "Call Back Later") {
                        const normalizedId = leadId != null ? Number(leadId) : NaN;
                        if (!Number.isNaN(normalizedId)) {
                          setData(prevData => prevData.filter(lead => Number(lead.id) !== normalizedId));
                          setFilteredData(prevData => prevData.filter(lead => Number(lead.id) !== normalizedId));
                        }
                      }
                      // Always close the modal
                      setIsLeadModalOpen(false);
                      setSelectedLead(null);
                      setActionButtonsVisible(false);
                    }}
                  />
                </div>
                {/* Action bar fixed in dialog footer - only show when actionButtonsVisible is true AND CallBackModal is not open */}
                {actionButtonsVisible && !isCallBackModalOpen && (
                <div className="shrink-0 border-t border-slate-200 bg-white px-6 py-4 flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 min-w-[140px] h-12 rounded-xl gap-2 hover:bg-slate-100 hover:text-slate-900"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('[LeadTable] Trial Activated clicked, ref:', leadCardRef.current);
                      if (leadCardRef.current?.handleTrialActivated) {
                        leadCardRef.current.handleTrialActivated();
                      } else {
                        console.error('[LeadTable] handleTrialActivated not available on ref');
                      }
                    }}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Trial Activated
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 min-w-[140px] h-12 rounded-xl gap-2 hover:bg-slate-100 hover:text-slate-900"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('[LeadTable] Not Interested clicked, ref:', leadCardRef.current);
                      if (leadCardRef.current?.handleNotInterestedClick) {
                        leadCardRef.current.handleNotInterestedClick();
                      } else {
                        console.error('[LeadTable] handleNotInterestedClick not available on ref');
                      }
                    }}
                  >
                    <MessageCircle className="h-4 w-4" />
                    Not Interested
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 min-w-[140px] h-12 rounded-xl gap-2 hover:bg-slate-100 hover:text-slate-900"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('[LeadTable] Call Not Connected clicked, ref:', leadCardRef.current);
                      if (leadCardRef.current?.handleCallNotConnected) {
                        leadCardRef.current.handleCallNotConnected();
                      } else {
                        console.error('[LeadTable] handleCallNotConnected not available on ref');
                      }
                    }}
                  >
                    <AlertCircle className="h-4 w-4" />
                    Not Connected
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 min-w-[140px] h-12 rounded-xl gap-2 hover:bg-slate-100 hover:text-slate-900"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('[LeadTable] Call Back Later clicked, ref:', leadCardRef.current);
                      if (leadCardRef.current?.handleCallBackLaterClick) {
                        leadCardRef.current.handleCallBackLaterClick();
                      } else {
                        console.error('[LeadTable] handleCallBackLaterClick not available on ref');
                      }
                    }}
                  >
                    <Clock className="h-4 w-4" />
                    Call Back Later
                  </Button>
                </div>
                )}
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

    </>
  );
};
