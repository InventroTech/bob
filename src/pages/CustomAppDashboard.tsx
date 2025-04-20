import React from 'react';
import { useParams } from 'react-router-dom';
import { useTenant } from '@/hooks/useTenant';

const CustomAppDashboard: React.FC = () => {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const { tenantId } = useTenant();
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Welcome to {tenantSlug}</h1>
      <p>Your tenant ID: <code className="font-mono">{tenantId}</code></p>
      <p className="mt-2 text-gray-600">Select a page from the sidebar to view its content.</p>
    </div>
  );
};

export default CustomAppDashboard; 