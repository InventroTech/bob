import React from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout'; // Assuming you have a layout

const Dashboard = () => {
  return (
    <DashboardLayout>
      <div className="p-4">
        <h3>Dashboard</h3>
        <p className="text-gray-700">Welcome to your dashboard!</p>
        {/* Add dashboard content here */}
      </div>
    </DashboardLayout>
  );
};

export default Dashboard; 