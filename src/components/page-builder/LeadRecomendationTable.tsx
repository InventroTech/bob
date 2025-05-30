'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import StatusCard from '../ui/StatusCard';
import ShortProfileCard from '../ui/ShortProfileCard';
import { LeadFormComponent } from './LeadsTableForm';
import { Trash2 } from 'lucide-react'; 
import { PrajaTable } from '@/components/ui/prajaTable';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { API_URI } from '@/const';

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

export const LeadRecomendationTable: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const entriesPerPage = 15;
  const { session } = useAuth();
  const authToken = session?.access_token;

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        setLoading(true);
        const endpoint = '/api/recommended-leads';
        const apiUrl = `${API_URI}${endpoint}`;
        
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authToken ? `Bearer ${authToken}` : ''
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch recommended leads');
        }

        const data = await response.json();
        if (data.leads && Array.isArray(data.leads)) {
          setData(data.leads);
        } else {
          throw new Error('Invalid data format received');
        }
      } catch (error) {
        console.error('Error fetching leads:', error);
        toast.error('Failed to fetch recommended leads data');
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLeads();
  }, [authToken]);

  const handleDelete = async (id: number) => {
    const confirm = window.confirm('Are you sure you want to delete this lead?');
    if (!confirm) return;

    const { error } = await supabase.from('leads').delete().eq('id', id);

    if (error) {
      console.error('Error deleting lead:', error.message);
      alert('Failed to delete the lead.');
    } else {
      setData(prev => prev.filter(lead => lead.id !== id));
    }
  };

  const filteredData = data.filter((row) =>
    columns.some((col) =>
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

  if (loading) return <p className="text-gray-600 p-4">Loading...</p>;
  
  return (
    <div className="overflow-x-auto border-2 border-gray-200 rounded-lg bg-white p-4">
      <PrajaTable columns={columns} data={data} title="Recomonded Leads"/>
     
    </div>
  );
};
