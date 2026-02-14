'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api';

interface ReceiveShipmentDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: any | null;
  onSuccess?: () => void;
}

const FIELDS_TO_SHOW = [
  { key: 'status', label: 'Status' },
  { key: 'item_name_freeform', label: 'Item' },
  { key: 'part_number_or_sku', label: 'Part / SKU' },
  { key: 'quantity_required', label: 'Quantity' },
  { key: 'vendor_name', label: 'Vendor' },
  { key: 'tracking_link', label: 'Tracking' },
  { key: 'comments', label: 'Comments' },
];

/**
 * Modal for inventory manager on Receive Shipments page.
 * Quick actions: Add to inventory, Roll back to PM.
 */
export const ReceiveShipmentDetailModal: React.FC<ReceiveShipmentDetailModalProps> = ({
  open,
  onOpenChange,
  record,
  onSuccess,
}) => {
  const { toast } = useToast();
  const [addingToInventory, setAddingToInventory] = useState(false);
  const [rollingBack, setRollingBack] = useState(false);

  const data = record?.data ?? {};
  const recordId = record?.id;

  const handleAddToInventory = async () => {
    if (!recordId) return;
    try {
      setAddingToInventory(true);
      await apiClient.post('/crm-records/records/events/', {
        record_id: recordId,
        event: 'inventory_request.receive_add_to_inventory',
        payload: {},
      });
      toast({
        title: 'Added to inventory',
        description: 'Quantity added to existing or new inventory item; request marked FULFILLED.',
      });
      onSuccess?.();
      onOpenChange(false);
    } catch (e: any) {
      toast({
        title: 'Failed',
        description: e?.message ?? 'Could not add to inventory.',
        variant: 'destructive',
      });
    } finally {
      setAddingToInventory(false);
    }
  };

  const handleRollBackToPm = async () => {
    if (!recordId) return;
    try {
      setRollingBack(true);
      await apiClient.post('/crm-records/records/events/', {
        record_id: recordId,
        event: 'inventory_request.roll_back_to_pm',
        payload: {},
      });
      toast({
        title: 'Rolled back to PM',
        description: 'Request status set to PENDING_PM for PM to handle (e.g. defective or problem).',
      });
      onSuccess?.();
      onOpenChange(false);
    } catch (e: any) {
      toast({
        title: 'Failed',
        description: e?.message ?? 'Could not roll back to PM.',
        variant: 'destructive',
      });
    } finally {
      setRollingBack(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Receive shipment — Request #{record?.id ?? '—'}</DialogTitle>
          <DialogDescription>
            Add received items to inventory or roll this request back to PM if there is a problem.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <dl className="grid gap-2 text-sm">
            {FIELDS_TO_SHOW.map(({ key, label }) => (
              <div key={key} className="flex justify-between gap-2 border-b border-gray-100 pb-1 last:border-0">
                <dt className="text-gray-600">{label}</dt>
                <dd className="text-gray-900 truncate">
                  {key === 'tracking_link' && data[key] ? (
                    <a
                      href={String(data[key])}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline"
                    >
                      Link
                    </a>
                  ) : (
                    (data[key] != null && data[key] !== '' ? String(data[key]) : '—')
                  )}
                </dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              type="button"
              className="bg-primary text-white hover:bg-primary/90"
              disabled={addingToInventory || rollingBack}
              onClick={handleAddToInventory}
            >
              {addingToInventory ? 'Adding…' : 'Add to inventory'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-amber-200 text-amber-700 hover:bg-amber-50"
              disabled={addingToInventory || rollingBack}
              onClick={handleRollBackToPm}
            >
              {rollingBack ? 'Rolling back…' : 'Roll back to PM'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
