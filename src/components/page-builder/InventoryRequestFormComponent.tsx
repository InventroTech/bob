'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface InventoryRequestFormConfig {
  /** Status to use for newly created requests (e.g. DRAFT, PENDING_PM) */
  defaultStatus?: string;
}

interface InventoryRequestFormProps {
  config?: InventoryRequestFormConfig;
}

/**
 * Minimal inventory request creation form suitable for PageBuilder.
 * Uses the existing /crm-records/records endpoint with entity_type=inventory_request.
 */
export const InventoryRequestFormComponent: React.FC<InventoryRequestFormProps> = ({ config }) => {
  const { user } = useAuth();

  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const status = config?.defaultStatus || 'DRAFT';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('You must be logged in to create a request.');
      return;
    }

    if (!itemName || !quantity) {
      toast.error('Item name and quantity are required.');
      return;
    }

    try {
      setSubmitting(true);

      await apiClient.post('/crm-records/records/', {
        entity_type: 'inventory_request',
        data: {
          status,
          requester_id: user.id,
          item_name_freeform: itemName,
          quantity_required: quantity,
          comments,
        },
      });

      toast.success('Inventory request created.');
      // Keep user on the same page; clear form so table components on the same page
      // can be refreshed or re-fetched separately if needed.
      setItemName('');
      setQuantity('');
      setComments('');
    } catch (err: any) {
      console.error('Failed to create inventory request', err);
      toast.error(err?.message || 'Failed to create inventory request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="border rounded-lg bg-white p-4 shadow-sm space-y-4">
      <div>
        <h5 className="text-base font-semibold">New Inventory Request</h5>
        <p className="text-xs text-muted-foreground">
          Simple form for raising an inventory request. Extend via PageBuilder as needed.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="inventory-item-name">Item name</Label>
          <Input
            id="inventory-item-name"
            placeholder="e.g. Ergonomic chair"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="inventory-quantity">Quantity required</Label>
          <Input
            id="inventory-quantity"
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => {
              const v = e.target.value;
              setQuantity(v === '' ? '' : Number(v));
            }}
            required
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="inventory-comments">Comments (optional)</Label>
          <Textarea
            id="inventory-comments"
            placeholder="Any additional context for this request"
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={3}
          />
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Button type="submit" size="sm" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create Request'}
          </Button>
        </div>
      </form>
    </div>
  );
};

