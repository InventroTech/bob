import React, { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { TrendingUp } from "lucide-react";

interface StackedBarChartProps {
  config?: {
    apiEndpoint?: string;
    title?: string;
    refreshInterval?: number;
  };
}
// Register chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export const StackedBarChart: React.FC<StackedBarChartProps> = ({ config }) => {
  // Demo data as default
  const demoData = {
    labels: ["January", "February", "March", "April", "May"],
    datasets: [
      {
        label: "Dataset 1",
        data: [10, 20, 30, 40, 50],
        backgroundColor: "rgba(255, 99, 132, 0.5)",
      },
      {
        label: "Dataset 2",
        data: [20, 30, 40, 50, 60],
        backgroundColor: "rgba(54, 162, 235, 0.5)",
      },
      {
        label: "Dataset 3",
        data: [30, 40, 50, 60, 70],
        backgroundColor: "rgba(75, 192, 192, 0.5)",
      },
    ],
  };

  const [data, setData] = useState(demoData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usingDemoData, setUsingDemoData] = useState(true);
  const { session } = useAuth();

  const fetchData = async () => {
    // If no API endpoint is provided, use demo data
    if (!config?.apiEndpoint) {
      setData(demoData);
      setUsingDemoData(true);
      setError(null);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error("Authentication required");
      }

      const response = await fetch(`${import.meta.env.VITE_API_URI}${config.apiEndpoint}`, {
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
      
      // Handle different response formats
      let chartData;
      if (responseData.success && responseData.data) {
        chartData = responseData.data;
      } else if (responseData.data) {
        chartData = responseData.data;
      } else if (responseData.labels && responseData.datasets) {
        chartData = responseData;
      } else {
        throw new Error("Invalid data format received");
      }

      setData(chartData);
      setUsingDemoData(false);

    } catch (error) {
      console.error('Error fetching stacked bar chart data:', error);
      setError('Failed to load data. Using demo data.');
      setData(demoData);
      setUsingDemoData(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [config?.apiEndpoint]);

  useEffect(() => {
    if (config?.refreshInterval && config.refreshInterval > 0) {
      const interval = setInterval(fetchData, config.refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [config?.refreshInterval, config?.apiEndpoint]);

  // Options for the stacked bar chart
  const options = {
    responsive: true,
    scales: {
      x: {
        stacked: true, // Enable stacking on the x-axis
      },
      y: {
        stacked: true, // Enable stacking on the y-axis
      },
    },
    plugins: {
      legend: {
        position: "top" as const, // Position of the legend
      },
      tooltip: {
        enabled: true, // Enable tooltips
      },
    },
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {config?.title || "Stacked Bar Chart"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Loading data...</div>
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
          {config?.title || "Stacked Bar Chart"}
        </CardTitle>
        {error && (
          <p className="text-sm text-muted-foreground">{error}</p>
        )}
        {usingDemoData && config?.apiEndpoint && (
          <p className="text-sm text-amber-600">Using demo data - check API endpoint configuration</p>
        )}
        {usingDemoData && !config?.apiEndpoint && (
          <p className="text-sm text-blue-600">Using demo data - configure API endpoint to load real data</p>
        )}
      </CardHeader>
      <CardContent>
        <div className="h-80 w-full">
          <Bar data={data} options={options} />
        </div>
      </CardContent>
    </Card>
  );
};

