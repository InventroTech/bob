import React from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { LeadTableComponent } from '@/components/page-builder';
import { Button } from '@/components/ui/button';

const InventoryRequestsPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h5>My Inventory Requests</h5>
            <p className="text-muted-foreground mt-1">
              Track and manage your own inventory purchase requests.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => navigate('/inventory/requests/new')}>
              New Request
            </Button>
          </div>
        </div>

        <LeadTableComponent
          config={{
            title: 'My Requests',
            entityType: 'inventory_request',
            apiEndpoint:
              '/crm-records/records/?entity_type=inventory_request&requester_id={{current_user}}',
            columns: [
              { key: 'status', label: 'Status', type: 'chip' },
              { key: 'item_name_freeform', label: 'Item', type: 'text' },
              { key: 'quantity_required', label: 'Quantity', type: 'number' },
              { key: 'vendor_name', label: 'Vendor', type: 'text' },
              { key: 'created_at', label: 'Created', type: 'date' },
            ],
            emptyMessage: 'No inventory requests found. Create your first request to get started.',
            showFallbackOnly: false,
          }}
        />
      </div>
    </DashboardLayout>
  );
};

export default InventoryRequestsPage;

