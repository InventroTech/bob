import React from 'react';
import LeadGroupsPage from '../../pages/LeadGroupsPage';

interface LeadAssignmentComponentProps {
  config?: {
    leadTypesEndpoint?: string;
    leadSourcesEndpoint?: string;
    rmsEndpoint?: string;
    title?: string;
    assignmentsEndpoint?: string;
  };
}

// Component that can be dragged from the sidebar and used in pages
const LeadAssignmentComponent = ({ config }: LeadAssignmentComponentProps) => {
  return <LeadGroupsPage showHeader={false} className="p-6" config={config} />;
};

export default LeadAssignmentComponent;
