'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiClient, membershipService } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Calendar, User, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface InventoryRequestFormConfig {
  /** Status to use for newly created requests (e.g. DRAFT, PENDING_PM) */
  defaultStatus?: string;
}

interface InventoryRequestFormProps {
  config?: InventoryRequestFormConfig;
}

// Options for dropdowns (can be moved to config or API later)
const URGENCY_OPTIONS = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];
/**
 * Inventory request creation form for PageBuilder.
 * Stores data in records table with entity_type=inventory_request.
 * Requester is auto-filled from auth; request_date is auto current.
 */
export const InventoryRequestFormComponent: React.FC<InventoryRequestFormProps> = ({ config }) => {
  const { user } = useAuth();

  const [requestDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [department, setDepartment] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [urgency, setUrgency] = useState('');
  const [comments, setComments] = useState('');
  const [vendor, setVendor] = useState('');
  const [productLink, setProductLink] = useState('');
  const [additionalLink, setAdditionalLink] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const status = config?.defaultStatus || 'DRAFT';

  // Pre-fill department from current user's membership (backend TenantMembership.department)
  useEffect(() => {
    if (!user) return;
    membershipService.getMyMembership().then((membership) => {
      setDepartment(membership?.department ?? '');
    });
  }, [user]);

  const requesterDisplay = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || '—';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('You must be logged in to create a request.');
      return;
    }

    if (!itemDescription || !quantity) {
      toast.error('Item description and quantity are required.');
      return;
    }

    const requesterId = user.id;

    try {
      setSubmitting(true);

      // Build payload with all fields always present so backend stores them (no undefined → no omitted keys in JSON)
      const payloadData: Record<string, string | number> = {
        status,
        request_date: requestDate,
        requester_id: requesterId,
        requester_name: requesterDisplay ?? '',
        department: department || '',
        item_name_freeform: itemDescription,
        quantity_required: typeof quantity === 'number' ? quantity : Number(quantity) || 0,
        urgency_level: urgency || '',
        comments: comments || '',
        vendor: vendor || '',
        product_link: productLink || '',
        additional_link: additionalLink || '',
      };
      await apiClient.post('/crm-records/records/', {
        entity_type: 'inventory_request',
        data: payloadData,
      });

      toast.success('Inventory request created.');
      setItemDescription('');
      setQuantity('');
      setUrgency('');
      setComments('');
      setVendor('');
    setProductLink('');
    setAdditionalLink('');
    } catch (err: any) {
      console.error('Failed to create inventory request', err);
      toast.error(err?.message || 'Failed to create inventory request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClear = () => {
    setItemDescription('');
    setQuantity('');
    setUrgency('');
    setComments('');
    setVendor('');
    setProductLink('');
    setAdditionalLink('');
    toast.success('Form cleared.');
  };

  const isFormEmpty =
    !itemDescription &&
    quantity === '' &&
    !urgency &&
    !comments &&
    !vendor &&
    !productLink &&
    !additionalLink;

  return (
    <Card className="overflow-hidden border border-border/60 shadow-md">
      

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6 pt-6">
          {/* Request info — Date, Req name, Department pre-filled */}
          <section className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider">
                  <Calendar className="h-3.5 w-3.5" />
                  Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={requestDate}
                  readOnly
                  disabled
                  className="h-10 bg-muted/50 font-medium"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider">
                  <User className="h-3.5 w-3.5" />
                  Reqestor name <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={requesterDisplay}
                  readOnly
                  disabled
                  className="h-10 bg-muted/50 font-medium"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="department" className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider">
                Department <span className="text-destructive">*</span>
              </Label>
              <Input
                id="department"
                value={department}
                readOnly
                disabled
                placeholder="—"
                className="h-10 bg-muted/50 font-medium"
              />
            </div>
          </section>

          {/* Item details */}
          <section className="space-y-4 border-t pt-6">
            
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="item-description" className="text-sm font-medium">
                  Item Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="item-description"
                  placeholder="Describe the item(s) you need"
                  value={itemDescription}
                  onChange={(e) => setItemDescription(e.target.value)}
                  required
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity" className="text-sm font-medium">
                  Quantity <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  min={1}
                  step={1}
                  value={quantity}
                  onChange={(e) => {
                    const v = e.target.value;
                    setQuantity(v === '' ? '' : Number(v));
                  }}
                  required
                  placeholder="0"
                  className="h-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendor" className="text-sm font-medium">
                Vendor <span className="text-destructive">*</span>
              </Label>
              <Input
                id="vendor"
                type="text"
                placeholder="Vendor name"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-link" className="text-sm font-medium">
                Product link <span className="text-destructive">*</span>
              </Label>
              <Input
                id="product-link"
                type="url"
                placeholder="https://..."
                value={productLink}
                onChange={(e) => setProductLink(e.target.value)}
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="additional-link" className="text-sm font-medium">
                Additional link <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="additional-link"
                type="url"
                placeholder="https://..."
                value={additionalLink}
                onChange={(e) => setAdditionalLink(e.target.value)}
                className="h-10"
              />
            </div>
          </section>

          {/* Priority & comments */}
          <section className="space-y-4 border-t pt-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Priority / Urgency <span className="text-destructive">*</span></Label>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Priority level">
                {URGENCY_OPTIONS.map((o) => (
                  <Button
                    key={o.value}
                    type="button"
                    variant={urgency === o.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setUrgency(urgency === o.value ? '' : o.value)}
                    className="rounded-full"
                  >
                    {o.label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="comments" className="text-sm font-medium">
                Comments <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Textarea
                id="comments"
                placeholder="Additional comments"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={3}
                className="resize-y min-h-[80px]"
              />
            </div>
          </section>
        </CardContent>

        <CardFooter className="flex flex-wrap items-center gap-3 border-t bg-muted/20 px-6 py-4">
          <Button
            type="submit"
            disabled={submitting || !user}
            className="min-w-[140px] gap-2 shadow-sm"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating…
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Create Request
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleClear}
            disabled={submitting || isFormEmpty}
            className="min-w-[100px]"
          >
            Clear form
          </Button>
          {!user && (
            <span className="text-muted-foreground text-sm">You must be signed in to submit.</span>
          )}
        </CardFooter>
      </form>
    </Card>
  );
};

/**form field optimization:
*/
