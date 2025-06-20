'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PieChart } from 'lucide-react';

// Pending tickets data interface
export interface TicketStats {
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
  notPossible: number;
}

// Simple pie chart component
const PieChartComponent = ({ data }: { data: TicketStats }) => {
  const total = data.total;
  if (total === 0) {
    return (
      <div className="flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="text-2xl font-bold">0</div>
          <div className="text-xs">No tickets</div>
        </div>
      </div>
    );
  }

  const pendingPercent = (data.pending / total) * 100;
  const inProgressPercent = (data.inProgress / total) * 100;
  const resolvedPercent = (data.resolved / total) * 100;
  const notPossiblePercent = (data.notPossible / total) * 100;

  return (
    <div className="flex items-center justify-center">
      <div className="relative w-32 h-32">
        <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
          {/* Pending - Yellow */}
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="#fbbf24"
            strokeWidth="8"
            strokeDasharray={`${(pendingPercent / 100) * 251.2} 251.2`}
            strokeDashoffset="0"
          />
          {/* In Progress - Blue */}
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="#3b82f6"
            strokeWidth="8"
            strokeDasharray={`${(inProgressPercent / 100) * 251.2} 251.2`}
            strokeDashoffset={`-${(pendingPercent / 100) * 251.2}`}
          />
          {/* Resolved - Green */}
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="#10b981"
            strokeWidth="8"
            strokeDasharray={`${(resolvedPercent / 100) * 251.2} 251.2`}
            strokeDashoffset={`-${((pendingPercent + inProgressPercent) / 100) * 251.2}`}
          />
          {/* Not Possible - Red */}
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="#ef4444"
            strokeWidth="8"
            strokeDasharray={`${(notPossiblePercent / 100) * 251.2} 251.2`}
            strokeDashoffset={`-${((pendingPercent + inProgressPercent + resolvedPercent) / 100) * 251.2}`}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-800">{data.total}</div>
            <div className="text-xs text-gray-600">Total</div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface PendingTicketsCardProps {
  onGetFirstTicket: () => void;
  loading: boolean;
  ticketStats: TicketStats;
}

export const PendingTicketsCard: React.FC<PendingTicketsCardProps> = ({ 
  onGetFirstTicket, 
  loading, 
  ticketStats 
}) => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          <div className="text-center mb-6">
            <div className="flex items-center justify-center mb-4">
              <PieChart className="h-8 w-8 text-primary mr-2" />
              <h2 className="text-2xl font-semibold text-gray-800">Pending Tickets</h2>
            </div>
            <p className="text-gray-600 mb-6">Click to start working on tickets</p>
          </div>

          <div className="mb-6">
            <PieChartComponent data={ticketStats} />
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-400 rounded-full mr-2"></div>
                <span className="text-sm text-gray-700">Pending</span>
              </div>
              <span className="text-sm font-medium">{ticketStats.pending}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                <span className="text-sm text-gray-700">Others</span>
              </div>
              <span className="text-sm font-medium">{ticketStats.inProgress}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span className="text-sm text-gray-700">Resolved</span>
              </div>
              <span className="text-sm font-medium">{ticketStats.resolved}</span>
            </div>
          </div>

          <Button 
            onClick={onGetFirstTicket} 
            disabled={loading}
            className="w-full"
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