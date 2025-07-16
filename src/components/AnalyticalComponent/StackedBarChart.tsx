import React from "react";
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

interface StackedBarChartProps {
  config?: {
    apiEndpoint?: string;
    title?: string;
  };
}
// Register chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export const StackedBarChart: React.FC<StackedBarChartProps> = ({config}) => {
  // Data for the stacked bar chart
  const data = {
    labels: ["January", "February", "March", "April", "May"], // X-axis labels
    datasets: [
      {
        label: "Dataset 1",
        data: [10, 20, 30, 40, 50], // Data for Dataset 1
        backgroundColor: "rgba(255, 99, 132, 0.5)", // Bar color
      },
      {
        label: "Dataset 2",
        data: [20, 30, 40, 50, 60], // Data for Dataset 2
        backgroundColor: "rgba(54, 162, 235, 0.5)", // Bar color
      },
      {
        label: "Dataset 3",
        data: [30, 40, 50, 60, 70], // Data for Dataset 3
        backgroundColor: "rgba(75, 192, 192, 0.5)", // Bar color
      },
    ],
  };

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

  return (
    <div>
      <h2>Stacked Bar Chart</h2>
      <Bar data={data} options={options} />
    </div>
  );
};

