'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import StatusCard from '../ui/StatusCard';
import ShortProfileCard from '../ui/ShortProfileCard';
import { LeadFormComponent } from './LeadsTableForm';
import { Trash2 } from 'lucide-react'; 
import { PrajaTable } from '../ui/prajaTable';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Column {
  header: string;
  accessor: string;
  type: 'text' | 'chip';
}


const columns: Column[] = [
  { header: 'Name', accessor: 'name', type: 'text' },
  { header: 'Party', accessor: 'party', type: 'text' },
  { header: 'Last Connected', accessor: 'lastconnected', type: 'text' },
  { header: 'Information', accessor: 'info', type: 'text' },
  { header: 'Lead Status', accessor: 'status', type: 'chip' },
  { header: 'Phone Number', accessor: 'phone', type: 'text' }
];

// Demo data for fallback
const DEMO_LEADS = [
  {
    id: 1,
    name: "Rahul Verma",
    party: "BJP",
    partycolor: "blue",
    lastconnected: "2024-03-15",
    info: "Interested in party membership",
    status: "Active",
    statuscolor: "green",
    phone: "+91 9876543210",
    image: "https://ui-avatars.com/api/?name=Rahul+Verma",
    address: "Delhi"
  },
  {
    id: 2,
    name: "Priya Singh",
    party: "Congress",
    partycolor: "red",
    lastconnected: "2024-03-14",
    info: "Looking for local party events",
    status: "Pending",
    statuscolor: "yellow",
    phone: "+91 8765432109",
    image: "https://ui-avatars.com/api/?name=Priya+Singh",
    address: "Mumbai"
  },
  {
    id: 3,
    name: "Amit Kumar",
    party: "AAP",
    partycolor: "green",
    lastconnected: "2024-03-13",
    info: "Wants to volunteer",
    status: "Active",
    statuscolor: "green",
    phone: "+91 7654321098",
    image: "https://ui-avatars.com/api/?name=Amit+Kumar",
    address: "Bangalore"
  },
  {
    id: 4,
    name: "Sneha Patel",
    party: "BJP",
    partycolor: "blue",
    lastconnected: "2024-03-12",
    info: "Interested in youth wing",
    status: "Inactive",
    statuscolor: "gray",
    phone: "+91 6543210987",
    image: "https://ui-avatars.com/api/?name=Sneha+Patel",
    address: "Chennai"
  },
  {
    id: 5,
    name: "Rajesh Sharma",
    party: "Congress",
    partycolor: "red",
    lastconnected: "2024-03-11",
    info: "Wants to join party",
    status: "Active",
    statuscolor: "green",
    phone: "+91 5432109876",
    image: "https://ui-avatars.com/api/?name=Rajesh+Sharma",
    address: "Kolkata"
  }
];

interface LeadTableProps {
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

export const LeadTableComponent: React.FC<LeadTableProps> = ({ config }) => {
  const [data, setData] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const entriesPerPage = 15;
  const { session } = useAuth();

  // Use configured columns or fallback to default
  const tableColumns: Column[] = config?.columns?.map(col => ({
    header: col.label,
    accessor: col.key,
    type: col.type === 'chip' ? 'chip' : 'text'
  })) || columns;

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        setLoading(true);
        const authToken = session?.access_token;

        // Use configured endpoint or fallback to default
        const endpoint = config?.apiEndpoint || '/api/leads';
        const apiUrl = `${import.meta.env.API_URI}${endpoint}`;
        
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authToken ? `Bearer ${authToken}` : ''
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch leads: ${response.status}`);
        }

        const responseData = await response.json();
        const leads = responseData?.leads || [];
        
        if (!Array.isArray(leads)) {
          throw new Error('Invalid data format received');
        }

        setData(leads);
      } catch (error) {
        console.error('Error fetching leads:', error);
        toast.error('Failed to fetch leads data, using demo data');
        setData(DEMO_LEADS);
      } finally {
        setLoading(false);
      }
    };

    fetchLeads();
  }, [session, config?.apiEndpoint]);

  const handleDelete = async (id: number) => {
    try {
      const confirm = window.confirm('Are you sure you want to delete this lead?');
      if (!confirm) return;

      const { error } = await supabase.from('leads').delete().eq('id', id);

      if (error) {
        throw error;
      }

      setData(prev => prev.filter(lead => lead.id !== id));
      toast.success('Lead deleted successfully');
    } catch (error) {
      console.error('Error deleting lead:', error);
      toast.error('Failed to delete the lead');
    }
  };

  const filteredData = data.filter((row) =>
    tableColumns.some((col) =>
      String(row[col.accessor] || '')
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    )
  );

  const totalPages = Math.ceil(filteredData.length / entriesPerPage);
  const startIndex = (currentPage - 1) * entriesPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + entriesPerPage);

  const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handlePrevious = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-600">Loading leads data...</div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border-2 border-gray-200 rounded-lg bg-white p-4">
      {data.length === 0 ? (
        <div className="text-center p-4 text-gray-600">
          No leads data available
        </div>
      ) : (
        <PrajaTable 
          columns={tableColumns} 
          data={data} 
          title={config?.title || "All Leads"}
        />
      )}
    </div>
  );
};
