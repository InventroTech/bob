import React from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import LeadTypeAssignmentPage from '@/pages/LeadTypeAssignmentPage';

const LeadTypeAssignmentPageWrapper = () => {
  return (
    <DashboardLayout>
      <LeadTypeAssignmentPage showHeader={true} />
    </DashboardLayout>
  );
};

export default LeadTypeAssignmentPageWrapper;
