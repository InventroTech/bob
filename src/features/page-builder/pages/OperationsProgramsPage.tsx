import React from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { OperationsProgramsComponent } from '@/components/page-builder/OperationsProgramsComponent';

const OperationsProgramsPage: React.FC = () => {
  return (
    <DashboardLayout>
      <div className="p-6">
        <OperationsProgramsComponent />
      </div>
    </DashboardLayout>
  );
};

export default OperationsProgramsPage;
