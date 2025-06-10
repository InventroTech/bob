'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import StatusCard from '../ui/StatusCard';
import ShortProfileCard from '../ui/ShortProfileCard';
import { Badge } from '@/components/ui/badge';
import { Trash2 } from 'lucide-react'; 
import { demoMenuItems } from '../page-builder/LeadCardComponent';

interface Column {
  header: string;
  accessor: string;
  type: 'text' | 'chip';
}

interface PrajaTableProps {
  columns: Column[];
  data: any[];
  title: string;
}

// Status color mapping for tickets
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
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export const PrajaTable: React.FC<PrajaTableProps> = ({columns, data, title}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const entriesPerPage = 15;
  const userType = localStorage.getItem('userType');

  const handleDelete = async (id: number) => {
    const confirm = window.confirm('Are you sure you want to delete this lead?');
    if (!confirm) return;

    const { error } = await supabase.from('leads').delete().eq('id', id);

    if (error) {
      console.error('Error deleting lead:', error.message);
      alert('Failed to delete the lead.');
    } else {
      // Notify parent component about deletion
      console.log('Lead deleted successfully');
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

  const findColor = (status: string) => {
    const statusData = demoMenuItems.find((item) => item.value === status);
    return statusData ? statusData.color : 'bg-gray-500';
  };    

  const renderCell = (col: Column, row: any) => {
    if (col.type === 'chip') {
      if (col.accessor === 'resolution_status') {
        return (
          <Badge 
            variant="outline" 
            className={`${getStatusColor(row[col.accessor])} text-xs font-medium px-2 py-1`}
          >
            {row[col.accessor]}
          </Badge>
        );
      } else if (col.accessor === 'status') {
        return (
          <StatusCard text={row.status} color={findColor(row.status)} type={col.type} />
        );
      } else {
        return (
          <Badge 
            variant="outline" 
            className="bg-gray-100 text-gray-800 border-gray-200 text-xs font-medium px-2 py-1"
          >
            {row[col.accessor]}
          </Badge>
        );
      }
    } else if (col.accessor === 'party') {
      return <StatusCard text={row.party} color={row.partycolor} type={col.type} />;
    } else if (col.accessor === 'name') {
      return (
        <div className="flex items-center">
          <ShortProfileCard
            image={row.image}
            name={row.name}
            address={row.address}
          />
        </div>
      );
    } else {
      return <span className="align-middle">{row[col.accessor]}</span>;
    }
  };

  return (
    <div className="overflow-x-auto border-2 border-gray-200 rounded-lg bg-white p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
        <input
          type="text"
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-64 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="table border-2 border-gray-200 rounded-lg overflow-hidden w-full">
        <table className="min-w-full bg-white">
          <thead>
            <tr className="bg-gray-100 text-gray-500 font-normal border-b border-gray-200 text-sm rounded-lg">
              {columns.map((col) => (
                <th key={col.accessor} className="py-3 px-6 text-left">
                  {col.header}
                </th>
              ))}
              <th className="text-left w-12"></th>
            </tr>
          </thead>
          <tbody className="text-gray-600 text-sm">
            {paginatedData.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-b border-gray-200 hover:bg-gray-50 group">
                {columns.map((col) => (
                  <td key={col.accessor} className="py-3 px-6 text-left">
                    <div className="flex items-center">
                      {renderCell(col, row)}
                    </div>
                  </td>
                ))}
                <td className="py-3 px-6 text-left w-12">
                  {userType === "admin" && (
                    <button
                      onClick={() => handleDelete(row.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-800"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredData.length === 0 && (
        <div className="mt-4 text-gray-600 text-center">
          No results found for "{searchTerm}"
        </div>
      )}

      {filteredData.length > 0 && (
        <div className="flex justify-between items-center mt-4">
          <button
            onClick={handlePrevious}
            disabled={currentPage === 1}
            className={`px-4 py-2 border rounded-md ${
              currentPage === 1
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Previous
          </button>
          <span className="text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={handleNext}
            disabled={currentPage === totalPages}
            className={`px-4 py-2 border rounded-md ${
              currentPage === totalPages
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};
