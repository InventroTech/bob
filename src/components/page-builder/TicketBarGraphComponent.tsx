import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { authService } from "@/lib/authService";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Calendar, TrendingUp } from "lucide-react";

interface TicketBarGraphProps {
  config?: {
    apiEndpoint?: string;
    title?: string;
    days?: number;
  };
}

interface DailyTicketData {
  date: string;
  resolved: number;
  unresolved: number;
  total: number;
}

const generateDemoData = (days: number = 7): DailyTicketData[] => {
  const data: DailyTicketData[] = [];
  const today = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    const resolved = Math.floor(Math.random() * 15) + 5;
    const unresolved = Math.floor(Math.random() * 10) + 2;
    
    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      resolved,
      unresolved,
      total: resolved + unresolved
    });
  }
  
  return data;
};

export const TicketBarGraphComponent: React.FC<TicketBarGraphProps> = ({ config }) => {
  const [data, setData] = useState<DailyTicketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { session } = useAuth();

  const days = config?.days || 7;

  useEffect(() => {
    const fetchTicketData = async () => {
      try {
        setLoading(true);
        setError(null);

        const endpoint = config?.apiEndpoint || '/api/ticket-stats-daily';
        const apiUrl = `${import.meta.env.VITE_API_URI}${endpoint}?days=${days}`;
        
        const sessionResponse = await authService.getSession();
        const session = sessionResponse.success ? sessionResponse.data : null;
        const token = session?.access_token;

        if (!token) {
          throw new Error("Authentication required");
        }

        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const responseData = await response.json();
        
        if (responseData.success && responseData.data) {
          setData(responseData.data);
        } else {
          throw new Error("Invalid data format received");
        }

      } catch (error) {
        console.error('Error fetching ticket data:', error);
        setError('Failed to load ticket data. Using demo data.');
        // Use demo data as fallback
        setData(generateDemoData(days));
      } finally {
        setLoading(false);
      }
    };

    fetchTicketData();
  }, [config?.apiEndpoint, days, session]);

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {config?.title || "Ticket Resolution Trends"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Loading ticket data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          {config?.title || "Ticket Resolution Trends"}
        </CardTitle>
        {error && (
          <p className="text-sm text-muted-foreground">{error}</p>
        )}
      </CardHeader>
      <CardContent>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                formatter={(value: any, name: string) => [
                  value, 
                  name === 'resolved' ? 'Resolved' : 'Unresolved'
                ]}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Legend 
                verticalAlign="top" 
                height={36}
                formatter={(value) => value === 'resolved' ? 'Resolved' : 'Unresolved'}
              />
              <Bar 
                dataKey="resolved" 
                fill="#10b981" 
                radius={[4, 4, 0, 0]}
                name="Resolved"
              />
              <Bar 
                dataKey="unresolved" 
                fill="#ef4444" 
                radius={[4, 4, 0, 0]}
                name="Unresolved"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Summary Stats */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {data.reduce((sum, item) => sum + item.resolved, 0)}
            </div>
            <div className="text-sm text-muted-foreground">Total Resolved</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {data.reduce((sum, item) => sum + item.unresolved, 0)}
            </div>
            <div className="text-sm text-muted-foreground">Total Unresolved</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {data.reduce((sum, item) => sum + item.total, 0)}
            </div>
            <div className="text-sm text-muted-foreground">Total Tickets</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 