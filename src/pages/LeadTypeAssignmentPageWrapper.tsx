import React from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import LeadGroupsPage from '@/pages/LeadGroupsPage';

const LeadTypeAssignmentPageWrapper = () => {
  return (
    <DashboardLayout>
      <LeadGroupsPage showHeader={true} />
    </DashboardLayout>
  );
};

export default LeadTypeAssignmentPageWrapper;
