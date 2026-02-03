'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PieChart, ChevronDown, ChevronUp } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

// Updated ticket stats interface to match backend response
export interface TicketStats {
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
  notPossible: number;
  // New fields from backend
  resolvedByYouToday?: number;
  totalPendingTickets?: number;
  wipTickets?: number;
  cantResolveToday?: number;
  pendingByPoster?: Array<{
    poster: string;
    count: number;
  }>;
}

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
    case 'premium_expired':
      return { label: 'Premium Expired', color: 'text-red-600', bgColor: 'bg-red-50' };
    default:
      return { label: poster || 'Unknown', color: 'text-gray-600', bgColor: 'bg-gray-50' };
  }
};

// Updated pie chart component to show pendingByPoster data
const PieChartComponent = ({ data }: { data: TicketStats }) => {
  const pendingByPoster = data.pendingByPoster || [];
  const totalPending = data.totalPendingTickets || data.pending || 0;
  
  if (totalPending === 0 || pendingByPoster.length === 0) {
    return (
      <div className="flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="text-2xl font-bold">0</div>
          <div className="text-xs">No pending tickets</div>
        </div>
      </div>
    );
  }

  // Calculate percentages for each poster type
  const posterData = pendingByPoster.map((item, index) => {
    const percentage = (item.count / totalPending) * 100;
    const color = getPosterColor(item.poster);
    return { ...item, percentage, color };
  });

  // Calculate stroke dash offsets
  let currentOffset = 0;
  const posterDataWithOffsets = posterData.map(item => {
    const strokeDasharray = `${(item.percentage / 100) * 251.2} 251.2`;
    const strokeDashoffset = currentOffset;
    currentOffset -= (item.percentage / 100) * 251.2;
    return { ...item, strokeDasharray, strokeDashoffset };
  });

  return (
    <div className="flex items-center justify-center">
      <div className="relative w-32 h-32">
        <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
          {posterDataWithOffsets.map((item, index) => (
            <circle
              key={index}
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke={item.color}
              strokeWidth="8"
              strokeDasharray={item.strokeDasharray}
              strokeDashoffset={item.strokeDashoffset}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-800">{totalPending}</div>
            <div className="text-xs text-gray-600">Pending</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Function to get color for poster types
const getPosterColor = (poster: string): string => {
  switch (poster) {
    case 'paid': return '#10b981'; // green
    case 'in_trial': return '#3b82f6'; // blue
    case 'free': return '#6b7280'; // gray
    case 'trial_expired': return '#ef4444'; // red
    case 'auto_pay_not_set_up': return '#f59e0b'; // amber
    case 'autopay_setup_no_layout': return '#f97316'; // orange
    case 'in_grace_period': return '#8b5cf6'; // purple
    case 'premium_expired': return '#dc2626'; // red
    case 'in_premium_extension': return '#6366f1'; // indigo
    case 'in_trial_extension': return '#ec4899'; // pink
    default: return '#6b7280'; // gray
  }
};

interface PendingTicketsCardProps {
  onGetFirstTicket: () => void;
  loading: boolean;
  ticketStats: TicketStats;
  title?: string;
}

export const PendingTicketsCard: React.FC<PendingTicketsCardProps> = ({ 
  onGetFirstTicket, 
  loading, 
  ticketStats,
  title = "Today's Tickets"
}) => {
  const pendingByPoster = ticketStats.pendingByPoster || [];
  const totalPending = ticketStats.totalPendingTickets || ticketStats.pending || 0;
  const [isPendingOpen, setIsPendingOpen] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          <div className="text-center mb-6">
            <div className="flex items-center justify-center mb-4">
              <PieChart className="h-8 w-8 text-primary mr-2" />
              <h5>{title}</h5>
            </div>
            <p className="text-gray-600 mb-6">Click to start working on tickets</p>
          </div>

          <div className="mb-6">
            <PieChartComponent data={ticketStats} />
          </div>

          <div className="space-y-3 mb-6">
            {/* Stats rows - Resolved Today, WIP Tickets, and Pending */}
            <div className="space-y-2">
              {/* Resolved Today */}
              <div className="flex justify-between items-center p-2 rounded-md bg-green-50 border border-green-200">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-sm text-gray-700">Resolved Today</span>
                </div>
                <span className="text-sm font-medium text-green-700">{ticketStats.resolvedByYouToday || 0}</span>
              </div>

              {/* WIP Tickets */}
              <div className="flex justify-between items-center p-2 rounded-md bg-blue-50 border border-blue-200">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                  <span className="text-sm text-gray-700">Work in Progress</span>
                </div>
                <span className="text-sm font-medium text-blue-700">{ticketStats.wipTickets || 0}</span>
              </div>

          
              <Collapsible open={isPendingOpen} onOpenChange={setIsPendingOpen}>
                <CollapsibleTrigger asChild>
                  <div className="flex justify-between items-center cursor-pointer hover:bg-gray-50 p-2 rounded-md transition-all duration-200 ease-in-out">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-yellow-400 rounded-full mr-2"></div>
                      <span className="text-sm text-gray-700">Pending</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm font-medium mr-1">{totalPending}</span>
                      <ChevronDown className={`h-3 w-3 text-gray-500 transition-transform duration-300 ease-in-out ${isPendingOpen ? 'rotate-180' : ''}`} />
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2">
                  <div className="pl-5 pr-2 pb-2">
                    <div className="space-y-2">
                      {pendingByPoster.length > 0 ? (
                        pendingByPoster.map((item, index) => {
                          const posterInfo = formatPosterStatus(item.poster);
                          return (
                            <div key={index} className="flex items-center justify-between p-2 rounded-md bg-gray-50">
                              <div className="flex items-center">
                                <div 
                                  className="w-3 h-3 rounded-full mr-2" 
                                  style={{ backgroundColor: getPosterColor(item.poster) }}
                                ></div>
                                <span className="text-sm font-medium">{posterInfo.label}</span>
                              </div>
                              <span className="text-sm font-bold text-gray-700">{item.count}</span>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center text-gray-500 py-2">
                          <p className="text-sm">No pending tickets available</p>
                        </div>
                      )}
                    </div>
                    <div className="pt-2 border-t mt-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">Total Pending:</span>
                        <span className="text-sm font-bold text-gray-900">{totalPending}</span>
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

          </div>

          <Button 
            onClick={onGetFirstTicket} 
            disabled={loading}
            className="w-full bg-black text-white hover:bg-gray-800 disabled:bg-gray-300 disabled:text-gray-500 transition-colors"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Loading...
              </>
            ) : (
              'Get Tickets'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}; 