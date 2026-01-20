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
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { TrendingUp, Calendar } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface StackedBarChartProps {
  config?: {
    apiEndpoint?: string;
    title?: string;
    refreshInterval?: number;
    xAxisUnit?: string;
    yAxisUnit?: string;
    datasets?: Array<{
      label: string;
      backgroundColor: string;
    }>;
  };
}
// Register chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export const StackedBarChart: React.FC<StackedBarChartProps> = ({ config }) => {
  // Transform backend data format to Chart.js format
  const transformBackendData = (backendData: any[]) => {
    if (!Array.isArray(backendData) || backendData.length === 0) {
      return createDemoData();
    }

    // Extract labels from x field
    const labels = backendData.map(item => item.x);

    // Find all y fields dynamically (y1, y2, y3, etc.)
    const sampleItem = backendData[0];
    const yFields = Object.keys(sampleItem)
      .filter(key => key.startsWith('y') && /^y\d+$/.test(key))
      .sort((a, b) => {
        const numA = parseInt(a.substring(1));
        const numB = parseInt(b.substring(1));
        return numA - numB;
      });

    // Create datasets for each y field
    const datasets = yFields.map((yField, index) => {
      const data = backendData.map(item => item[yField] || 0);
      
      // Use configured dataset info if available
      const configuredDataset = config?.datasets?.[index];
      const defaultColors = [
        "rgba(255, 99, 132, 0.5)",
        "rgba(54, 162, 235, 0.5)", 
        "rgba(75, 192, 192, 0.5)",
        "rgba(255, 206, 86, 0.5)",
        "rgba(153, 102, 255, 0.5)"
      ];

      return {
        label: configuredDataset?.label || `Dataset ${index + 1}`,
        data: data,
        backgroundColor: configuredDataset?.backgroundColor || defaultColors[index % defaultColors.length],
      };
    });

    return {
      labels,
      datasets
    };
  };

  // Create demo data based on configured datasets or use defaults
  const createDemoData = () => {
    const configuredDatasets = config?.datasets || [];
    const defaultDatasets = [
      {
        label: "Dataset 1",
        backgroundColor: "rgba(255, 99, 132, 0.5)",
      },
      {
        label: "Dataset 2", 
        backgroundColor: "rgba(54, 162, 235, 0.5)",
      },
      {
        label: "Dataset 3",
        backgroundColor: "rgba(75, 192, 192, 0.5)",
      },
    ];

    // Use configured datasets if available, otherwise use defaults
    const datasetsToUse = configuredDatasets.length > 0 ? configuredDatasets : defaultDatasets;

    // Generate demo backend data that matches the expected format with y1, y2, y3...
    const demoBackendData = [
      { x: "2025-07-10", ...Object.fromEntries(datasetsToUse.map((_, i) => [`y${i + 1}`, 10 + (i * 10)])) },
      { x: "2025-07-11", ...Object.fromEntries(datasetsToUse.map((_, i) => [`y${i + 1}`, 16 + (i * 10)])) },
      { x: "2025-07-12", ...Object.fromEntries(datasetsToUse.map((_, i) => [`y${i + 1}`, 10 + (i * 10)])) },
      { x: "2025-07-13", ...Object.fromEntries(datasetsToUse.map((_, i) => [`y${i + 1}`, 10 + (i * 10)])) },
      { x: "2025-07-14", ...Object.fromEntries(datasetsToUse.map((_, i) => [`y${i + 1}`, 5 + (i * 10)])) },
      { x: "2025-07-15", ...Object.fromEntries(datasetsToUse.map((_, i) => [`y${i + 1}`, 20 + (i * 10)])) },
      { x: "2025-07-16", ...Object.fromEntries(datasetsToUse.map((_, i) => [`y${i + 1}`, 23 + (i * 10)])) },
      { x: "2025-07-17", ...Object.fromEntries(datasetsToUse.map((_, i) => [`y${i + 1}`, 23 + (i * 10)])) }
    ];

    // Transform the demo data using the same logic as backend data
    return transformBackendDataForDemo(demoBackendData, datasetsToUse);
  };

  // Separate function for transforming demo data to ensure consistent behavior
  const transformBackendDataForDemo = (backendData: any[], datasetsConfig: any[]) => {
    const labels = backendData.map(item => item.x);

    // Create datasets using the configured datasets
    const datasets = datasetsConfig.map((datasetConfig, index) => {
      const yField = `y${index + 1}`;
      const data = backendData.map(item => item[yField] || 0);
      
      return {
        label: datasetConfig.label,
        data: data,
        backgroundColor: datasetConfig.backgroundColor,
      };
    });

    return {
      labels,
      datasets
    };
  };

  const [data, setData] = useState(createDemoData());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usingDemoData, setUsingDemoData] = useState(true);
  const [dateFilter, setDateFilter] = useState<string>('last7days');
  const { session } = useAuth();

  // Calculate date range based on filter
  const getDateRange = (filter: string) => {
    const today = new Date();
    const end = today.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    let start: string;
    switch (filter) {
      case 'last3days':
        const threeDaysAgo = new Date(today);
        threeDaysAgo.setDate(today.getDate() - 2); // Changed from -3 to -2
        start = threeDaysAgo.toISOString().split('T')[0];
        break;
      case 'last7days':
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 6); // Changed from -7 to -6
        start = sevenDaysAgo.toISOString().split('T')[0];
        break;
      case 'last30days':
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 29); // Changed from -30 to -29
        start = thirtyDaysAgo.toISOString().split('T')[0];
        break;
      default:
        const sevenDays = new Date(today);
        sevenDays.setDate(today.getDate() - 6); // Changed from -7 to -6
        start = sevenDays.toISOString().split('T')[0];
    }
    
    return { start, end };
  };

  const fetchData = async () => {
    console.log('StackedBarChart - fetchData called with dateFilter:', dateFilter);
    console.log('StackedBarChart - API endpoint:', config?.apiEndpoint);
    
    // If no API endpoint is provided, use demo data
    if (!config?.apiEndpoint) {
      console.log('StackedBarChart - No API endpoint, using demo data');
      const { start, end } = getDateRange(dateFilter);
      console.log('StackedBarChart - Demo data date range:', { start, end });
      
      // Use the configured datasets to generate appropriate demo data
      const configuredDatasets = config?.datasets || [];
      const defaultDatasets = [
        { label: "Dataset 1", backgroundColor: "rgba(255, 99, 132, 0.5)" },
        { label: "Dataset 2", backgroundColor: "rgba(54, 162, 235, 0.5)" }
      ];
      const datasetsToUse = configuredDatasets.length > 0 ? configuredDatasets : defaultDatasets;
      
      const demo = [
        { x: "2025-07-10", ...Object.fromEntries(datasetsToUse.map((_, i) => [`y${i + 1}`, 10 + (i * 5)])) },
        { x: "2025-07-11", ...Object.fromEntries(datasetsToUse.map((_, i) => [`y${i + 1}`, 16 + (i * 5)])) },
        { x: "2025-07-12", ...Object.fromEntries(datasetsToUse.map((_, i) => [`y${i + 1}`, 10 + (i * 10)])) },
        { x: "2025-07-13", ...Object.fromEntries(datasetsToUse.map((_, i) => [`y${i + 1}`, 10 + (i * 5)])) },
        { x: "2025-07-14", ...Object.fromEntries(datasetsToUse.map((_, i) => [`y${i + 1}`, 5 + (i * 6)])) },
        { x: "2025-07-15", ...Object.fromEntries(datasetsToUse.map((_, i) => [`y${i + 1}`, 20 + (i * 7)])) },
        { x: "2025-07-16", ...Object.fromEntries(datasetsToUse.map((_, i) => [`y${i + 1}`, 23 + (i * 5)])) },
        { x: "2025-07-17", ...Object.fromEntries(datasetsToUse.map((_, i) => [`y${i + 1}`, 23 + (i * 5)])) }
      ];
      const chartData = transformBackendData(demo);
      setData(chartData);
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

      // Add date filter parameters to API endpoint
      const { start, end } = getDateRange(dateFilter);
      const baseUrl = import.meta.env.VITE_RENDER_API_URL;
      console.log(baseUrl)
      const endpoint = config.apiEndpoint.startsWith('/') ? config.apiEndpoint : `/${config.apiEndpoint}`;
      console.log(endpoint)
      const url = new URL(`${baseUrl}${endpoint}`);
      url.searchParams.append('start', start);
      url.searchParams.append('end', end);
      console.log('StackedBarChart - URL:', url.toString());

      const response = await fetch(url.toString(), {
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
        chartData = transformBackendData(responseData.data);
      } else if (responseData.data) {
        chartData = transformBackendData(responseData.data);
      } else if (Array.isArray(responseData)) {
        chartData = transformBackendData(responseData);
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
      
      // Fallback to demo data
      const configuredDatasets = config?.datasets || [];
      const defaultDatasets = [
        { label: "Dataset 1", backgroundColor: "rgba(255, 99, 132, 0.5)" },
        { label: "Dataset 2", backgroundColor: "rgba(54, 162, 235, 0.5)" }
      ];
      const datasetsToUse = configuredDatasets.length > 0 ? configuredDatasets : defaultDatasets;
      
      const demo = [
        { x: "2025-07-10", ...Object.fromEntries(datasetsToUse.map((_, i) => [`y${i + 1}`, 10 + (i * 5)])) },
        { x: "2025-07-11", ...Object.fromEntries(datasetsToUse.map((_, i) => [`y${i + 1}`, 16 + (i * 5)])) },
        { x: "2025-07-12", ...Object.fromEntries(datasetsToUse.map((_, i) => [`y${i + 1}`, 10 + (i * 10)])) },
        { x: "2025-07-13", ...Object.fromEntries(datasetsToUse.map((_, i) => [`y${i + 1}`, 10 + (i * 5)])) },
        { x: "2025-07-14", ...Object.fromEntries(datasetsToUse.map((_, i) => [`y${i + 1}`, 5 + (i * 6)])) },
        { x: "2025-07-15", ...Object.fromEntries(datasetsToUse.map((_, i) => [`y${i + 1}`, 20 + (i * 7)])) },
        { x: "2025-07-16", ...Object.fromEntries(datasetsToUse.map((_, i) => [`y${i + 1}`, 23 + (i * 5)])) },
        { x: "2025-07-17", ...Object.fromEntries(datasetsToUse.map((_, i) => [`y${i + 1}`, 23 + (i * 5)])) }
      ];
      const chartData = transformBackendData(demo);
      setData(chartData);
      setUsingDemoData(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [config?.apiEndpoint, dateFilter]);

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
        title: {
          display: !!(config?.xAxisUnit),
          text: config?.xAxisUnit || ''
        }
      },
      y: {
        stacked: true, // Enable stacking on the y-axis
        title: {
          display: !!(config?.yAxisUnit),
          text: config?.yAxisUnit || ''
        }
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
          <h5 className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {config?.title || "Stacked Bar Chart"}
          </h5>
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
    <Card className="w-full ">
      <CardHeader>
        <h5 className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          {config?.title || "Stacked Bar Chart"}
        </h5>
        
        {/* Date Filter */}
        <div className="flex items-center gap-2 mt-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Select value={dateFilter} onValueChange={(value) => {
            console.log('StackedBarChart - Date filter changed from', dateFilter, 'to', value);
            setDateFilter(value);
          }}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last3days">Last 3 Days</SelectItem>
              <SelectItem value="last7days">Last 7 Days</SelectItem>
              <SelectItem value="last30days">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>

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
        <div className="h-full w-full  flex justify-center items-center">
          <Bar data={data} options={options}/>
        </div>
      </CardContent>
    </Card>
  );
};

