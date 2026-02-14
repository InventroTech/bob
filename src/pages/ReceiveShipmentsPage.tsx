import React from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { InventoryTableComponent } from '@/components/page-builder';

const ReceiveShipmentsPage: React.FC = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h5>Receive Shipments</h5>
          <p className="text-muted-foreground mt-1">
            View requests in shipping. Add received items to inventory or roll back to PM if there is a problem.
          </p>
        </div>

        <InventoryTableComponent
          config={{
            title: 'In shipping',
            entityType: 'inventory_request',
            detailMode: 'receive_shipments',
            apiEndpoint:
              '/crm-records/records/?entity_type=inventory_request&status=IN_SHIPPING',
            columns: [
              { key: 'status', label: 'Status', type: 'chip' },
              { key: 'item_name_freeform', label: 'Item', type: 'text' },
              { key: 'part_number_or_sku', label: 'Part / SKU', type: 'text' },
              { key: 'quantity_required', label: 'Quantity', type: 'number' },
              { key: 'vendor_name', label: 'Vendor', type: 'text' },
              { key: 'tracking_link', label: 'Tracking', type: 'link' },
              { key: 'created_at', label: 'Created', type: 'date' },
            ],
            emptyMessage: 'No requests in shipping.',
            showFallbackOnly: false,
          }}
        />
      </div>
    </DashboardLayout>
  );
};

export default ReceiveShipmentsPage;
