'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { PrajaTable } from '../ui/prajaTable';
import { toast } from 'sonner';

interface Column {
  header: string;
  accessor: string;
  type: 'text' | 'chip';
}

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
    assigned_to: "CSE",
    status: "Pending",
    Description: "Need help with billing cancellation"
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
    assigned_to: "CSE",
    status: "In Progress",
    Description: "Update poster design"
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
    assigned_to: "CSE",
    status: "Completed",
    Description: "Request for new badge"
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
    assigned_to: "CSE",
    status: "Open",
    Description: "General inquiry about services"
  }
];

const columns: Column[] = [
  { header: 'Ticket ID', accessor: 'id', type: 'text' },
  { header: 'Name', accessor: 'full_name', type: 'text' },
  { header: 'Ticket Type', accessor: 'actual_ticket_type', type: 'chip' },
  { header: 'Status', accessor: 'status', type: 'chip' },
  { header: 'Created At', accessor: 'created_at', type: 'text' }
];

interface TicketTableProps {
  config?: {
    apiEndpoint?: string;
    columns?: Array<{
      key: string;
      label: string;
      type: 'text' | 'chip' | 'date' | 'number';
    }>;
    title?: string;
  };
}

interface PrajaTableProps {
  columns: Column[];
  data: any[];
  title: string;
  showFilters?: boolean;
}

export const TicketTableComponent: React.FC<TicketTableProps> = ({ config }) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { session } = useAuth();

  // Use configured columns or fallback to default
  const tableColumns: Column[] = config?.columns?.map(col => ({
    header: col.label,
    accessor: col.key,
    type: col.type === 'chip' ? 'chip' : 'text'
  })) || columns;

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        setLoading(true);
        const authToken = session?.access_token;

        // Use configured endpoint or fallback to default
        const endpoint = config?.apiEndpoint || 'https://hihrftwrriygnbrsvlrr.supabase.co/functions/v1/tickets';
        
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            authToken: authToken
          })
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch tickets: ${response.status}`);
        }

        const responseData = await response.json();
        const tickets = responseData?.tickets || [];

        if (!Array.isArray(tickets)) {
          throw new Error('Invalid data format received');
        }

        // Transform the data to include full_name and format dates
        const transformedData = tickets.map(ticket => ({
          ...ticket,
          full_name: `${ticket.first_name} ${ticket.last_name}`.trim(),
          created_at: new Date(ticket.created_at).toLocaleString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }),
          actual_ticket_type: Array.isArray(ticket.actual_ticket_type) 
            ? ticket.actual_ticket_type[0] 
            : ticket.actual_ticket_type
        }));

        setData(transformedData);
      } catch (error) {
        console.error('Error fetching tickets:', error);
        toast.error('Failed to fetch tickets data, using demo data');
        
        // Transform demo data similarly
        const transformedDemoData = DEMO_TICKETS.map(ticket => ({
          ...ticket,
          full_name: `${ticket.first_name} ${ticket.last_name}`.trim(),
          created_at: new Date(ticket.created_at).toLocaleString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }),
          actual_ticket_type: Array.isArray(ticket.actual_ticket_type) 
            ? ticket.actual_ticket_type[0] 
            : ticket.actual_ticket_type
        }));
        
        setData(transformedDemoData);
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, [session, config?.apiEndpoint]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-600">Loading tickets data...</div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border-2 border-gray-200 rounded-lg bg-white p-4">
      {data.length === 0 ? (
        <div className="text-center p-4 text-gray-600">
          No tickets available
        </div>
      ) : (
        <PrajaTable 
          columns={tableColumns} 
          data={data} 
          title={config?.title || "Support Tickets"}
        />
      )}
    </div>
  );
}; 