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
  Filler,
} from "chart.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { TrendingUp, Calendar } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface LineChartProps {
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

// Register necessary chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export const LineChart: React.FC<LineChartProps> = ({ config }) => {
  // Transform backend data format to Chart.js format for LineChart
  const transformBackendData = (backendData: any[]) => {
    if (!Array.isArray(backendData) || backendData.length === 0) {
      return createDemoData();
    }

    // Extract labels from x field
    const labels = backendData.map(item => item.x);
    
    // Extract data from y field
    const data = backendData.map(item => item.y || 0);

    // Create single dataset
    const configuredDatasets = config?.datasets || [];
    
    // Use configured dataset if available, otherwise use default
    const datasetConfig = configuredDatasets[0];
    
    let borderColor, backgroundColor, label;
    
    if (datasetConfig) {
      label = datasetConfig.label;
      backgroundColor = datasetConfig.backgroundColor;
      // Convert backgroundColor to borderColor (make it solid)
      if (backgroundColor.includes('rgba')) {
        borderColor = backgroundColor.replace(/,\s*[\d.]+\)/, ', 1)');
      } else {
        borderColor = backgroundColor;
      }
    } else {
      label = "Data";
      borderColor = "rgba(75,192,192,1)";
      backgroundColor = "rgba(75,192,192,0.2)";
    }

    const datasets = [{
      label: label,
      data: data,
      borderColor: borderColor,
      backgroundColor: backgroundColor,
      fill: true,
      tension: 0.4,
    }];

    const result = {
      labels,
      datasets
    };
    
    return result;
  };

  // Create demo data based on configured datasets or use defaults
  const createDemoData = () => {
    const configuredDatasets = config?.datasets || [];
    const defaultDatasets = [
      {
        label: "Visitors",
        backgroundColor: "rgba(75,192,192,0.2)",
      },
      {
        label: "Signups",
        backgroundColor: "rgba(153,102,255,0.2)",
      },
    ];

    // Use configured datasets if available, otherwise use defaults
    const datasetsToUse = configuredDatasets.length > 0 ? configuredDatasets : defaultDatasets;

    return {
      labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
      datasets: datasetsToUse.map((dataset, index) => {
        let borderColor;
        if (dataset.backgroundColor.includes('rgba')) {
          borderColor = dataset.backgroundColor.replace(/,\s*[\d.]+\)/, ', 1)');
        } else {
          borderColor = dataset.backgroundColor;
        }
        
        return {
          label: dataset.label,
          data: [
            50 + (index * 10), 
            60 + (index * 10), 
            55 + (index * 10), 
            70 + (index * 10), 
            60 + (index * 10), 
            80 + (index * 10)
          ],
          borderColor: borderColor,
          backgroundColor: dataset.backgroundColor,
          fill: true,
          tension: 0.4,
        };
      }),
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
    console.log('LineChart - fetchData called with dateFilter:', dateFilter);
    console.log('LineChart - API endpoint:', config?.apiEndpoint);
    
    // If no API endpoint is provided, use demo data
    if (!config?.apiEndpoint) {
      console.log('LineChart - No API endpoint, using demo data');
      const { start, end } = getDateRange(dateFilter);
      console.log('LineChart - Demo data date range:', { start, end });
      
      // Use configured dataset if available
      const configuredDatasets = config?.datasets || [];
      const defaultDataset = { label: "Data", backgroundColor: "rgba(75,192,192,0.2)" };
      const datasetToUse = configuredDatasets.length > 0 ? configuredDatasets[0] : defaultDataset;
      
      const demo = [
        { "x": "2025-07-10", "y": 10 },
        { "x": "2025-07-11", "y": 22 },
        { "x": "2025-07-12", "y": 11 },
        { "x": "2025-07-13", "y": 32},
        { "x": "2025-07-14", "y": 11 },
        { "x": "2025-07-15", "y": 3 },
        { "x": "2025-07-16", "y": 23 },
        { "x": "2025-07-17", "y": 33},
        { "x": "2025-07-18", "y": 5 },
        { "x": "2025-07-19", "y": 10 },
        { "x": "2025-07-20", "y": 15},
        { "x": "2025-07-21", "y": 12.12 },
        { "x": "2025-07-22", "y": 10.62 },
        { "x": "2025-07-23", "y": 2.11 },
        { "x": "2025-07-24", "y": 3.11 },
        { "x": "2025-07-25", "y": 0 }
      ];
      
      // Apply the configured dataset manually to ensure colors/labels work
      const chartData = {
        labels: demo.map(item => item.x),
        datasets: [{
          label: datasetToUse.label,
          data: demo.map(item => item.y),
          borderColor: datasetToUse.backgroundColor.includes('rgba') 
            ? datasetToUse.backgroundColor.replace(/,\s*[\d.]+\)/, ', 1)')
            : datasetToUse.backgroundColor,
          backgroundColor: datasetToUse.backgroundColor,
          fill: true,
          tension: 0.4,
        }]
      };
      
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
      const baseUrl = import.meta.env.VITE_RENDER_API_URL || import.meta.env.VITE_API_URI || 'http://127.0.0.1:8000';
      // Ensure endpoint starts with / and baseUrl doesn't end with /
      const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
      const endpoint = config.apiEndpoint.startsWith('/') ? config.apiEndpoint : `/${config.apiEndpoint}`;
      const url = new URL(`${cleanBaseUrl}${endpoint}`);
      url.searchParams.append('start', start);
      url.searchParams.append('end', end);
      console.log('LineChart - URL:', url.toString());

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error('LineChart - API error:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const responseData = await response.json();
      console.log('LineChart - Response data:', responseData);
      
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
      } else if (responseData.non_snoozed || responseData.snoozed) {
        // Handle SLA time format with non_snoozed/snoozed structure
        // Create separate datasets for both non-snoozed and snoozed data
        const nonSnoozedValue = responseData.non_snoozed?.average_sla_time ?? 0;
        const snoozedValue = responseData.snoozed?.average_sla_time ?? 0;
        
        const { start, end } = getDateRange(dateFilter);
        const dates = [];
        const nonSnoozedData = [];
        const snoozedData = [];
        const startDate = new Date(start);
        const endDate = new Date(end);
        
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];
          dates.push(dateStr);
          nonSnoozedData.push(nonSnoozedValue);
          snoozedData.push(snoozedValue);
        }
        
        // Get configured dataset colors or use defaults
        const configuredDatasets = config?.datasets || [];
        const nonSnoozedColor = configuredDatasets[0]?.backgroundColor || 'rgba(75, 192, 192, 0.2)';
        const snoozedColor = configuredDatasets[1]?.backgroundColor || 'rgba(255, 99, 132, 0.2)';
        const nonSnoozedBorderColor = nonSnoozedColor.includes('rgba') 
          ? nonSnoozedColor.replace(/,\s*[\d.]+\)/, ', 1)')
          : nonSnoozedColor;
        const snoozedBorderColor = snoozedColor.includes('rgba')
          ? snoozedColor.replace(/,\s*[\d.]+\)/, ', 1)')
          : snoozedColor;
        
        chartData = {
          labels: dates,
          datasets: [
            {
              label: configuredDatasets[0]?.label || 'Non-Snoozed',
              data: nonSnoozedData,
              borderColor: nonSnoozedBorderColor,
              backgroundColor: nonSnoozedColor,
              fill: true,
              tension: 0.4,
            },
            {
              label: configuredDatasets[1]?.label || 'Snoozed',
              data: snoozedData,
              borderColor: snoozedBorderColor,
              backgroundColor: snoozedColor,
              fill: true,
              tension: 0.4,
            }
          ]
        };
      } else {
        throw new Error("Invalid data format received");
      }

      setData(chartData);
      setUsingDemoData(false);

    } catch (error: any) {
      console.error('Error fetching line chart data:', error);
      const errorMessage = error?.message || 'Unknown error';
      setError(`Failed to load data: ${errorMessage}. Using demo data.`);
      
      // Fallback to demo data
      const configuredDatasets = config?.datasets || [];
      const defaultDataset = { label: "Data", backgroundColor: "rgba(75,192,192,0.2)" };
      const datasetToUse = configuredDatasets.length > 0 ? configuredDatasets[0] : defaultDataset;
      
      const demo = [
        { "x": "2025-07-10", "y": 10 },
        { "x": "2025-07-11", "y": 22 },
        { "x": "2025-07-12", "y": 11 },
        { "x": "2025-07-13", "y": 32},
        { "x": "2025-07-14", "y": 11 },
        { "x": "2025-07-15", "y": 3 },
        { "x": "2025-07-16", "y": 23 },
        { "x": "2025-07-17", "y": 33},
        { "x": "2025-07-18", "y": 5 },
        { "x": "2025-07-19", "y": 10 },
        { "x": "2025-07-20", "y": 15},
        { "x": "2025-07-21", "y": 12.12 },
        { "x": "2025-07-22", "y": 10.62 },
        { "x": "2025-07-23", "y": 2.11 },
        { "x": "2025-07-24", "y": 3.11 },
        { "x": "2025-07-25", "y": 0 }
      ];
      
      // Apply the configured dataset manually to ensure colors/labels work
      const chartData = {
        labels: demo.map(item => item.x),
        datasets: [{
          label: datasetToUse.label,
          data: demo.map(item => item.y),
          borderColor: datasetToUse.backgroundColor.includes('rgba') 
            ? datasetToUse.backgroundColor.replace(/,\s*[\d.]+\)/, ', 1)')
            : datasetToUse.backgroundColor,
          backgroundColor: datasetToUse.backgroundColor,
          fill: true,
          tension: 0.4,
        }]
      };
      
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
      x: {
        title: {
          display: !!(config?.xAxisUnit),
          text: config?.xAxisUnit || ''
        }
      },
      y: {
        beginAtZero: true,
        title: {
          display: !!(config?.yAxisUnit),
          text: config?.yAxisUnit || ''
        }
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
        
        {/* Date Filter */}
        <div className="flex items-center gap-2 mt-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Select value={dateFilter} onValueChange={(value) => {
            console.log('LineChart - Date filter changed from', dateFilter, 'to', value);
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
          <Line data={data} options={options} />
        </div>
      </CardContent>
    </Card>
  );
};

export default LineChart;
