'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { PrajaTable } from '../ui/prajaTable';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { TicketCarousel } from './TicketCarousel';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { X, Filter, Calendar, Clock } from 'lucide-react';
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

// Status color mapping
const getStatusColor = (status: string) => {
  const statusLower = status.toLowerCase();
  switch (statusLower) {
    case 'open':
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'in progress':
    case 'wip':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'resolved':
    case 'completed':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'closed':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'cancelled':
    case 'failed':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'paid':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'not paid':
      return 'bg-red-100 text-red-800 border-red-200';
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
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return `${diffInSeconds} sec ago`;
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} min ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else {
    // For 1 day or more, show date and time
    return date.toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
};

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
      type: 'text' | 'chip' | 'date' | 'number' | 'link';
    }>;
    title?: string;
    apiPrefix?: 'supabase' | 'renderer';
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

  const tableColumns: Column[] = config?.columns?.map(col => ({
    header: col.label,
    accessor: col.key,
    type: col.type === 'chip' ? 'chip' : col.type === 'link' ? 'link' : 'text'
  })) || defaultColumns;

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
      const baseUrl = import.meta.env.VITE_RENDER_API_URL;
      const apiUrl = `${baseUrl}/analytics/support-tickets/filter-options/`;
      
      console.log('Fetching filter options from:', apiUrl);
      console.log('Auth token:', authToken ? 'Present' : 'Missing');
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': authToken ? `Bearer ${authToken}` : '',
          'X-Tenant-Slug': 'bibhab-thepyro-ai'
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

  // Fetch assignees from API
  const fetchAssignees = async () => {
    try {
      const authToken = session?.access_token;
      const baseUrl = import.meta.env.VITE_RENDER_API_URL;
      const apiUrl = `${baseUrl}/accounts/users/assignees-by-role/?role=CSE`;
      
      console.log('Fetching assignees from:', apiUrl);
      console.log('Auth token:', authToken ? 'Present' : 'Missing');
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': authToken ? `Bearer ${authToken}` : '',
          'X-Tenant-Slug': 'bibhab-thepyro-ai'
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
  const applyFilters = async () => {
    try {
      setLoading(true);
      const authToken = session?.access_token;

      // Always use renderer URL for analytics endpoint
      const baseUrl = import.meta.env.VITE_RENDER_API_URL;
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
      
      // Add pagination
      params.append('page', '1');
      params.append('page_size', '10'); // Get more results
      
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
          'Authorization': authToken ? `Bearer ${authToken}` : ''
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch filtered tickets: ${response.status}`);
      }

      const responseData = await response.json();
      
      // Handle different response formats
      let tickets = [];
      let pageMeta = null;
      
      if (responseData.results && Array.isArray(responseData.results)) {
        tickets = responseData.results;
        pageMeta = responseData.page_meta;
      } else if (responseData.data && Array.isArray(responseData.data)) {
        tickets = responseData.data;
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
        created_at: ticket.created_at ? formatRelativeTime(ticket.created_at) : 'N/A',
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

      setFilteredData(transformedData);
      setFiltersApplied(true);
      
      // Update pagination data if available
      if (pageMeta) {
        setPagination({
          totalCount: pageMeta.total_count || 0,
          numberOfPages: pageMeta.number_of_pages || 0,
          currentPage: pageMeta.current_page || 1,
          pageSize: pageMeta.page_size || 10,
          nextPageLink: pageMeta.next_page_link || null,
          previousPageLink: pageMeta.previous_page_link || null
        });
        console.log('Updated pagination from filtered response:', pageMeta);
      }
    } catch (error) {
      console.error('Error applying filters:', error);
      toast.error('Failed to apply filters');
    } finally {
      setLoading(false);
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
    setFilteredData(data); // Show all tickets again
    setFiltersApplied(false);
  };

  // Handle pagination navigation
  const handleNextPage = async () => {
    if (pagination.nextPageLink) {
      try {
        setLoading(true);
        const authToken = session?.access_token;
        
        const response = await fetch(pagination.nextPageLink, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authToken ? `Bearer ${authToken}` : ''
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
          created_at: ticket.created_at ? formatRelativeTime(ticket.created_at) : 'N/A',
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
            pageSize: pageMeta.page_size || 10,
            nextPageLink: pageMeta.next_page_link || null,
            previousPageLink: pageMeta.previous_page_link || null
          });
        }
      } catch (error) {
        console.error('Error fetching next page:', error);
        toast.error('Failed to load next page');
      } finally {
        setLoading(false);
      }
    }
  };

  const handlePreviousPage = async () => {
    if (pagination.previousPageLink) {
      try {
        setLoading(true);
        const authToken = session?.access_token;
        
        const response = await fetch(pagination.previousPageLink, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authToken ? `Bearer ${authToken}` : ''
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
          created_at: ticket.created_at ? formatRelativeTime(ticket.created_at) : 'N/A',
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
            pageSize: pageMeta.page_size || 10,
            nextPageLink: pageMeta.next_page_link || null,
            previousPageLink: pageMeta.previous_page_link || null
          });
        }
      } catch (error) {
        console.error('Error fetching previous page:', error);
        toast.error('Failed to load previous page');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleRowClick = (row: any) => {
    setSelectedTicket(row);
    setIsTicketModalOpen(true);
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
    const fetchTickets = async () => {
      try {
        setLoading(true);
        const authToken = session?.access_token;

        const endpoint = config?.apiEndpoint || '/api/tickets';
        const baseUrl = apiPrefix === 'renderer' 
          ? import.meta.env.VITE_RENDER_API_URL 
          : import.meta.env.VITE_API_URI;
        const apiUrl = `${baseUrl}${endpoint}`;
        console.log('API URL:', apiUrl);
        
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authToken ? `Bearer ${authToken}` : ''
          }
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
          created_at: ticket.created_at ? formatRelativeTime(ticket.created_at) : 'N/A',
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
        
        // Set pagination data if available
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
        console.error('Error fetching tickets:', error);
        // Set empty data on error instead of using demo data
        setData([]);
        setFilteredData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, [session, config?.apiEndpoint, apiPrefix]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-600">Loading tickets data...</div>
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
              {config?.title || "Support Tickets"}
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                        <h4 className="font-medium text-sm">Select Resolution Statuses</h4>
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
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                              >
                                {status === null ? 'Open' : status}
                              </label>
                            </div>
                          ))}
                        </div>
                        {resolutionStatusFilter.length > 0 && (
                          <div className="pt-2 border-t">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setResolutionStatusFilter([])}
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
                        <h4 className="font-medium text-sm">Select Poster Statuses</h4>
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
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                              >
                                {status}
                              </label>
                            </div>
                          ))}
                        </div>
                        {posterStatusFilter.length > 0 && (
                          <div className="pt-2 border-t">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setPosterStatusFilter([])}
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
                    <label className="block text-xs font-medium text-gray-600 mb-1">
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
                    <label className="block text-xs font-medium text-gray-600 mb-1">
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
                <Button
                  variant="outline"
                  onClick={resetFilters}
                  className="flex-1"
                >
                  Reset Filters
                </Button>
                <Button
                  variant="default"
                  onClick={applyFilters}
                  className="flex-1"
                  disabled={loading}
                >
                  {loading ? 'Applying...' : 'Apply Filters'}
                </Button>
              </div>

              {/* Filter Summary */}
              <div className="mt-3 text-sm text-gray-600">
                Showing {filteredData.length} of {pagination.totalCount > 0 ? pagination.totalCount : (filtersApplied ? filteredData.length : data.length)} tickets
                {filtersApplied && (resolutionStatusFilter.length > 0 || assignedToFilter !== 'all' || posterStatusFilter.length > 0 || dateRangeFilter.startDate || dateRangeFilter.endDate) && (
                  <span className="ml-2">
                    (Filtered by: 
                    {resolutionStatusFilter.length > 0 && ` Resolution Status: ${resolutionStatusFilter.map(status => status === null ? 'Open' : status).join(', ')}`}
                    {assignedToFilter !== 'all' && ` ${resolutionStatusFilter.length > 0 ? ', ' : ''}Assignee: ${assignedToFilter === 'myself' ? 'Myself' : assignedToFilter === 'unassigned' ? 'Unassigned' : getUniqueAssignedTo().find(a => a.id === assignedToFilter)?.name || assignedToFilter}`}
                    {posterStatusFilter.length > 0 && ` ${(resolutionStatusFilter.length > 0 || assignedToFilter !== 'all') ? ', ' : ''}Poster Status: ${posterStatusFilter.join(', ')}`}
                    {(dateRangeFilter.startDate || dateRangeFilter.endDate) && ` ${(resolutionStatusFilter.length > 0 || assignedToFilter !== 'all' || posterStatusFilter.length > 0) ? ', ' : ''}Date Range: ${dateRangeFilter.startDate ? format(dateRangeFilter.startDate, 'MMM dd, yyyy') + ' ' + dateRangeFilter.startTime : 'Any'} to ${dateRangeFilter.endDate ? format(dateRangeFilter.endDate, 'MMM dd, yyyy') + ' ' + dateRangeFilter.endTime : 'Any'}`}
                    )
                  </span>
                )}
                {!filtersApplied && (resolutionStatusFilter.length > 0 || assignedToFilter !== 'all' || posterStatusFilter.length > 0 || dateRangeFilter.startDate || dateRangeFilter.endDate) && (
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

        {filteredData.length === 0 ? (
          <div className="text-center p-8 text-gray-600">
            No data available
          </div>
        ) : (
          <>
                      <PrajaTable 
            columns={tableColumns} 
            data={filteredData} 
            title={config?.title || "Support Tickets"}
            onRowClick={handleRowClick}
            disablePagination={true}
          />
            
            {/* Server-side pagination controls */}
            {pagination.totalCount > 0 && (
              <div className="flex justify-between items-center mt-4 p-4 border-t">
                <div className="text-sm text-gray-600">
                  Showing {filteredData.length} of {pagination.totalCount} tickets
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousPage}
                    disabled={!pagination.previousPageLink || loading}
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
                    disabled={!pagination.nextPageLink || loading}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Ticket Modal */}
      <Dialog open={isTicketModalOpen} onOpenChange={setIsTicketModalOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex justify-between items-center">
              <DialogTitle>Ticket Details</DialogTitle>
            </div>
          </DialogHeader>
          {selectedTicket && (
            <div className="mt-2">
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