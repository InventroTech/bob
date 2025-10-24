import React from 'react';
import LeadTypeAssignmentPage from '../../pages/LeadTypeAssignmentPage';

// Component that can be dragged from the sidebar and used in pages
const LeadAssignmentComponent = () => {
  return <LeadTypeAssignmentPage showHeader={false} className="p-6" />;
};

export default LeadAssignmentComponent;
