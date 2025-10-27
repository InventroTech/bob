'use client';

import React, { useEffect, useState } from 'react';
import { apiService } from '@/lib/apiService';
import StatusCard from '../ui/StatusCard';
import ShortProfileCard from '../ui/ShortProfileCard';
import { Badge } from '@/components/ui/badge';
import { Trash2 } from 'lucide-react'; 
import { demoMenuItems } from '../page-builder/LeadCardComponent';

interface Column {
  header: string;
  accessor: string;
  type: 'text' | 'chip' | 'link';
}

interface PrajaTableProps {
  columns: Column[];
  data: any[];
  title?: string;
  onRowClick?: (row: any) => void;
  disablePagination?: boolean;
  loading?: boolean;
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
    case 'paid':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'not paid':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
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

const PrajaTableComponent: React.FC<PrajaTableProps> = ({columns, data, title, onRowClick, disablePagination = false, loading = false}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const entriesPerPage = 15;
  const userType = localStorage.getItem('userType');

  const handleDelete = async (id: number) => {
    const confirm = window.confirm('Are you sure you want to delete this lead?');
    if (!confirm) return;

    const response = await apiService.deleteLead(id.toString());
    if (!response.success) {
      console.error('Error deleting lead:', response.error);
      alert('Failed to delete the lead.');
    } else {
      // Notify parent component about deletion
      console.log('Lead deleted successfully');
    }
  };

  // Function to detect if search term contains digits
  const containsDigits = (term: string): boolean => {
    const digitsOnly = term.replace(/[^0-9]/g, '');
    return digitsOnly.length >= 1;
  };

  // Use data directly without any filtering (filtering handled externally)
  const filteredData = data;

  const totalPages = disablePagination ? 1 : Math.ceil(filteredData.length / entriesPerPage);
  const startIndex = disablePagination ? 0 : (currentPage - 1) * entriesPerPage;
  const paginatedData = disablePagination ? filteredData : filteredData.slice(startIndex, startIndex + entriesPerPage);

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
      if (col.accessor === 'resolution_status' || col.accessor === 'subscription_status') {
        return (
          <Badge 
            variant="outline" 
            className={`${getStatusColor(row[col.accessor])} text-xs font-medium px-2 py-1`}
          >
            {row[col.accessor]}
          </Badge>
        );
      } else if (col.accessor === 'poster') {
        const posterInfo = formatPosterStatus(row[col.accessor]);
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${posterInfo.color} ${posterInfo.bgColor} border`}>
            {posterInfo.label}
          </span>
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
    } else if (col.type === 'link') {
      // Special handling for Praja User Id link
      if (col.accessor === 'praja_user_id') {
        const userId = row.praja_user_id;
        const dashboardLink = row.praja_dashboard_user_link;
        if (userId && dashboardLink && dashboardLink !== 'N/A') {
          return (
            <a
              href={dashboardLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline text-sm"
              onClick={(e) => e.stopPropagation()}
            >
              {userId}
            </a>
          );
        } else {
          return <span className="text-gray-400 text-sm">N/A</span>;
        }
      }
      // Default link rendering for other link types
      const linkValue = row[col.accessor];
      if (linkValue && linkValue !== 'N/A') {
        return (
          <a 
            href={linkValue} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline text-sm"
            onClick={(e) => e.stopPropagation()} // Prevent row click when clicking link
          >
            {linkValue}
          </a>
        );
      } else {
        return <span className="text-gray-400 text-sm">N/A</span>;
      }
    } else if (col.accessor === 'party') {
      return <StatusCard text={row.party} color={row.partycolor} type={col.type} />;
    } else if (col.accessor === 'name') {
      return (
        <div className="flex items-center">
          <ShortProfileCard
            image={row.display_pic_url || row.image}
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
    <div className="overflow-x-auto border-2 border-gray-200 rounded-lg bg-white p-4 relative">
      {title && (
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
        </div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10 rounded-lg">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-gray-600">Loading...</span>
          </div>
        </div>
      )}

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
              <tr 
                key={rowIndex} 
                className={`border-b border-gray-200 hover:bg-gray-50 group ${
                  onRowClick ? 'cursor-pointer' : ''
                }`}
                onClick={() => onRowClick && onRowClick(row)}
              >
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
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent row click when clicking delete
                        handleDelete(row.id);
                      }}
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
        <div className="mt-4 text-gray-600 text-center py-8">
          <div>
            <p className="text-lg font-medium">No data available</p>
            <p className="text-sm mt-1 text-gray-500">There is no data to display</p>
          </div>
        </div>
      )}

      {filteredData.length > 0 && !disablePagination && (
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

// Memoize the component to prevent unnecessary re-renders
export const PrajaTable = React.memo(PrajaTableComponent, (prevProps, nextProps) => {
  // Custom comparison to prevent re-renders
  return (
    prevProps.data === nextProps.data &&
    prevProps.columns === nextProps.columns &&
    prevProps.title === nextProps.title &&
    prevProps.disablePagination === nextProps.disablePagination &&
    prevProps.onRowClick === nextProps.onRowClick &&
    prevProps.loading === nextProps.loading
  );
});
