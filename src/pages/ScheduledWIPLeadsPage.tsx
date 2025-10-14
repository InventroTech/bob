import React from 'react';
import { LeadTableComponent } from '@/components/page-builder';
import DashboardLayout from '@/components/layout/DashboardLayout';

const ScheduledWIPLeadsPage: React.FC = () => {
  return (
    <DashboardLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Scheduled & WIP Leads</h1>
        <LeadTableComponent
          config={{
            title: "Scheduled & WIP Leads",
            apiEndpoint: "/crm-records/records/",
            apiPrefix: "renderer",
            defaultFilters: {
              lead_status: ['call_later', 'scheduled', 'assigned']
            },
            columns: [
              { key: 'name', label: 'Name', type: 'text' },
              { key: 'phone_no', label: 'Phone Number', type: 'text' },
              { key: 'email', label: 'Email', type: 'text' },
              { key: 'company', label: 'Company', type: 'text' },
              { key: 'lead_score', label: 'Lead Score', type: 'number' },
              { key: 'resolution_status', label: 'Resolution Status', type: 'chip' },
              { key: 'source', label: 'Source', type: 'text' },
              { key: 'created_at', label: 'Created', type: 'text' },
            ]
          }}
        />
      </div>
    </DashboardLayout>
  );
};

export default ScheduledWIPLeadsPage;

