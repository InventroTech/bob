import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const NewInventoryRequestPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
          status: 'DRAFT',
          requester_id: user.id,
          item_name_freeform: itemName,
          quantity_required: quantity,
          comments,
        },
      });

      toast.success('Inventory request created.');
      navigate('/inventory/requests');
    } catch (err: any) {
      console.error('Failed to create inventory request', err);
      toast.error(err?.message || 'Failed to create inventory request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-xl space-y-6">
        <div>
          <h5>New Inventory Request</h5>
          <p className="text-muted-foreground mt-1">
            Create a minimal inventory request. You can extend this form later with more fields.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="item_name">Item name</Label>
            <Input
              id="item_name"
              placeholder="e.g. Ergonomic chair"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity required</Label>
            <Input
              id="quantity"
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

          <div className="space-y-2">
            <Label htmlFor="comments">Comments (optional)</Label>
            <Textarea
              id="comments"
              placeholder="Any additional context for this request"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex items-center gap-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Request'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/inventory/requests')}
              disabled={submitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default NewInventoryRequestPage;

