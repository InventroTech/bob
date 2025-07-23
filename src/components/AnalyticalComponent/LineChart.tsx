import React, { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { TrendingUp } from "lucide-react";

interface LineChartProps {
  config?: {
    apiEndpoint?: string;
    title?: string;
    refreshInterval?: number;
    datasets?: Array<{
      label: string;
      backgroundColor: string;
    }>;
  };
}

// Register necessary chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export const LineChart: React.FC<LineChartProps> = ({ config }) => {
  // Create demo data based on configured datasets or use defaults
  const createDemoData = () => {
    const configuredDatasets = config?.datasets || [];
    const defaultDatasets = [
      {
        label: "Visitors",
        borderColor: "rgba(75,192,192,1)",
        backgroundColor: "rgba(75,192,192,0.2)",
      },
      {
        label: "Signups",
        borderColor: "rgba(153,102,255,1)",
        backgroundColor: "rgba(153,102,255,0.2)",
      },
    ];

    // Use configured datasets if available, otherwise use defaults
    const datasetsToUse = configuredDatasets.length > 0 ? configuredDatasets : defaultDatasets;

    return {
      labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
      datasets: datasetsToUse.map((dataset, index) => ({
        label: dataset.label,
        data: [
          50 + (index * 10), 
          60 + (index * 10), 
          55 + (index * 10), 
          70 + (index * 10), 
          60 + (index * 10), 
          80 + (index * 10)
        ],
        borderColor: dataset.backgroundColor.replace('0.5)', '1)'),
        backgroundColor: dataset.backgroundColor,
        fill: true,
        tension: 0.4,
      })),
    };
  };

  const [data, setData] = useState(createDemoData());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usingDemoData, setUsingDemoData] = useState(true);
  const { session } = useAuth();

  // Update demo data when datasets configuration changes
  useEffect(() => {
    if (!config?.apiEndpoint) {
      setData(createDemoData());
    }
  }, [config?.datasets]);

  const fetchData = async () => {
    // If no API endpoint is provided, use demo data
    if (!config?.apiEndpoint) {
      setData(createDemoData());
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

      // If we have configured datasets, apply their labels and colors to the API data
      if (config?.datasets && config.datasets.length > 0 && chartData.datasets) {
        chartData.datasets = chartData.datasets.map((dataset: any, index: number) => {
          const configuredDataset = config.datasets![index];
          if (configuredDataset) {
            return {
              ...dataset,
              label: configuredDataset.label,
              borderColor: configuredDataset.backgroundColor.replace('0.5)', '1)'),
              backgroundColor: configuredDataset.backgroundColor,
              fill: true,
              tension: 0.4,
            };
          }
          return dataset;
        });
      }

      setData(chartData);
      setUsingDemoData(false);

    } catch (error) {
      console.error('Error fetching line chart data:', error);
      setError('Failed to load data. Using demo data.');
      setData(createDemoData());
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

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: "top" as const,
      },
      tooltip: {
        enabled: true,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {config?.title || "Line Chart"}
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
          {config?.title || "Line Chart"}
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
          <Line data={data} options={options} />
        </div>
      </CardContent>
    </Card>
  );
};

export default LineChart;
