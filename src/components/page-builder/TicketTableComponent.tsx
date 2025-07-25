'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { PrajaTable } from '../ui/prajaTable';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { TicketCarousel } from './TicketCarousel';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { X, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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

const columns: Column[] = [
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
  const [resolutionStatusFilter, setResolutionStatusFilter] = useState<string>('all');
  const [assignedToFilter, setAssignedToFilter] = useState<string>('all');
  const { session, user } = useAuth();

  const tableColumns: Column[] = config?.columns?.map(col => ({
    header: col.label,
    accessor: col.key,
    type: col.type === 'chip' ? 'chip' : col.type === 'link' ? 'link' : 'text'
  })) || columns;

  // Get unique values for filters
  const getUniqueResolutionStatuses = () => {
    const statuses = [...new Set(data.map(ticket => ticket.resolution_status))];
    return statuses.filter(status => status && status !== 'N/A');
  };

  const getUniqueAssignedTo = () => {
    const assigned = [...new Set(data.map(ticket => ticket.cse_name))];
    return assigned.filter(assignee => assignee && assignee !== 'Unassigned');
  };

  // Apply filters
  const applyFilters = () => {
    let filtered = [...data];

    // Filter by resolution status
    if (resolutionStatusFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.resolution_status === resolutionStatusFilter);
    }

    // Filter by assigned to
    if (assignedToFilter !== 'all') {
      if (assignedToFilter === 'myself') {
        const userDisplayName = getDisplayName(user?.email);
        filtered = filtered.filter(ticket => 
          ticket.cse_name === userDisplayName || ticket.cse_name === user?.email || ticket.cse_name === user?.id
        );
      } else {
        filtered = filtered.filter(ticket => ticket.cse_name === assignedToFilter);
      }
    }

    setFilteredData(filtered);
  };

  // Reset filters
  const resetFilters = () => {
    setResolutionStatusFilter('all');
    setAssignedToFilter('all');
    setFilteredData(data);
  };

  // Check if current user can edit the ticket
  const canEditTicket = (ticket: any) => {
    // Allow all users to edit all tickets
    return true;
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
    setFilteredData(updatedData);
    setIsTicketModalOpen(false);
  };

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        setLoading(true);
        const authToken = session?.access_token;

        const endpoint = config?.apiEndpoint || '/api/tickets';
        const apiUrl = `${import.meta.env.VITE_API_URI}${endpoint}`;
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
        if (Array.isArray(responseData)) {
          tickets = responseData;
        } else if (responseData.tickets && Array.isArray(responseData.tickets)) {
          tickets = responseData.tickets;
        } else if (responseData.data && Array.isArray(responseData.data)) {
          tickets = responseData.data;
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
  }, [session, config?.apiEndpoint]);

  // Apply filters when filter values change
  useEffect(() => {
    applyFilters();
  }, [resolutionStatusFilter, assignedToFilter, data]);

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
                  <Select value={resolutionStatusFilter} onValueChange={setResolutionStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {getUniqueResolutionStatuses().map(status => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                      {getUniqueAssignedTo().map(assignee => (
                        <SelectItem key={assignee} value={assignee}>
                          {assignee}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={resetFilters}
                    className="w-full"
                  >
                    Reset Filters
                  </Button>
                </div>
              </div>

              {/* Filter Summary */}
              <div className="mt-3 text-sm text-gray-600">
                Showing {filteredData.length} of {data.length} tickets
                {(resolutionStatusFilter !== 'all' || assignedToFilter !== 'all') && (
                  <span className="ml-2">
                    (Filtered by: 
                    {resolutionStatusFilter !== 'all' && ` Status: ${resolutionStatusFilter}`}
                    {assignedToFilter !== 'all' && ` ${resolutionStatusFilter !== 'all' ? ', ' : ''}Assignee: ${assignedToFilter === 'myself' ? 'Myself' : assignedToFilter}`}
                    )
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
          <PrajaTable 
            columns={tableColumns} 
            data={filteredData} 
            title={config?.title || "Support Tickets"}
            onRowClick={handleRowClick}
          />
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
                  title: `Ticket #${selectedTicket.id}`,
                  readOnly: !canEditTicket(selectedTicket)
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