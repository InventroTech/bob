import React from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { LeadTableComponent } from '@/components/page-builder';

const PmInventoryQueuePage: React.FC = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h5>PM Inventory Request Queue</h5>
          <p className="text-muted-foreground mt-1">
            View and manage all active inventory requests across the tenant.
          </p>
        </div>

        <LeadTableComponent
          config={{
            title: 'Active Inventory Requests',
            entityType: 'inventory_request',
            apiEndpoint:
              '/crm-records/records/?entity_type=inventory_request&status=PENDING_PM,VENDOR_IDENTIFIED,PAYMENT_PENDING,IN_SHIPPING,RECEIVER_RECEIVED,TO_INVENTORY',
            columns: [
              { key: 'status', label: 'Status', type: 'chip' },
              { key: 'item_name_freeform', label: 'Item', type: 'text' },
              { key: 'quantity_required', label: 'Quantity', type: 'number' },
              { key: 'requester_id', label: 'Requester', type: 'text' },
              { key: 'vendor_name', label: 'Vendor', type: 'text' },
              { key: 'created_at', label: 'Created', type: 'date' },
              {
                key: 'mark_in_shipping',
                label: 'Mark In Shipping',
                type: 'action',
                actionApiEndpoint: '/crm-records/records/events/',
                actionApiMethod: 'POST',
                actionApiPayload: JSON.stringify({
                  record_id: '{id}',
                  event: 'inventory_request.mark_in_shipping',
                  payload: {},
                }),
              },
            ],
            emptyMessage: 'No active inventory requests found.',
            showFallbackOnly: false,
          }}
        />
      </div>
    </DashboardLayout>
  );
};

export default PmInventoryQueuePage;

