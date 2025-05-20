'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import StatusCard from '../ui/StatusCard';
import ShortProfileCard from '../ui/ShortProfileCard';
import { LeadFormComponent } from './LeadsTableForm';
import { Trash2 } from 'lucide-react'; 
import { PrajaTable } from '../ui/prajaTable';
import { useAuth } from '@/hooks/useAuth';
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
    //   const { data, error } = await supabase.from('leads_table').select('*');
    //   if (error) {
    //     console.error('Error fetching leads:', error);
    //   } else {
    //     setData(data || []);
    //     console.log("Table Data", data);
    //   }
      const response = await fetch(`https://hihrftwrriygnbrsvlrr.supabase.co/functions/v1/recommended-lead-of-RM`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
          authToken: authToken
        })
      });   
      const data = await response.json();
      setData(data.leads);
      console.log("Table Data", data);
      setLoading(false);
    };

    fetchLeads();
  }, []);

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
