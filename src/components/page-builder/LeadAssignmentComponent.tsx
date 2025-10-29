import React from 'react';
import LeadTypeAssignmentPage from '../../pages/LeadTypeAssignmentPage';

interface LeadAssignmentComponentProps {
  config?: {
    leadTypesEndpoint?: string;
    rmsEndpoint?: string;
    title?: string;
  };
}

// Component that can be dragged from the sidebar and used in pages
const LeadAssignmentComponent = ({ config }: LeadAssignmentComponentProps) => {
  return <LeadTypeAssignmentPage showHeader={false} className="p-6" config={config} />;
};

export default LeadAssignmentComponent;
