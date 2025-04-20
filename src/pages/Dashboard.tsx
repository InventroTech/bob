import React from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout'; // Assuming you have a layout

const Dashboard = () => {
  return (
    <DashboardLayout>
      <div className="p-4">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to your dashboard!</p>
        {/* Add dashboard content here */}
      </div>
    </DashboardLayout>
  );
};

export default Dashboard; 