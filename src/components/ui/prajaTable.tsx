'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import StatusCard from '../ui/StatusCard';
import ShortProfileCard from '../ui/ShortProfileCard';

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

// const columns: Column[] = [
//   { header: 'Name', accessor: 'name', type: 'text' },
//   { header: 'Party', accessor: 'party', type: 'text' },
//   { header: 'Last Connected', accessor: 'lastconnected', type: 'text' },
//   { header: 'Information', accessor: 'info', type: 'text' },
//   { header: 'Lead Status', accessor: 'status', type: 'chip' },
//   { header: 'Phone Number', accessor: 'phone', type: 'text' }
// ];

export const PrajaTable: React.FC<PrajaTableProps> = ({columns, data, title}) => {
  //const [data, setData] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const entriesPerPage = 15;
  const userType = localStorage.getItem('userType');
//   useEffect(() => {
//     const fetchLeads = async () => {
//       const { data, error } = await supabase.from('leads_table').select('*');
//       if (error) {
//         console.error('Error fetching leads:', error);
//       } else {
//         setData(data || []);
//         console.log("Table Data", data);
//       }
//       setLoading(false);
//     };

//     fetchLeads();
//   }, []);

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
                      {col.accessor === 'party' ? (
                        <StatusCard text={row.party} color={row.partycolor} type={col.type} />
                      ) : col.accessor === 'status' ? (
                        <StatusCard text={row.status} color={findColor(row.status)} type={col.type} />
                      ) : col.accessor === 'name' ? (
                        <div className="flex items-center">
                          <ShortProfileCard
                            image={row.image}
                            name={row.name}
                            address={row.address}
                          />
                        </div>
                      ) : (
                        <span className="align-middle">{row[col.accessor]}</span>
                      )}
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
