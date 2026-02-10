'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface InventoryRequestFormConfig {
  /** Status to use for newly created requests (e.g. DRAFT, PENDING_PM) */
  defaultStatus?: string;
}

interface InventoryRequestFormProps {
  config?: InventoryRequestFormConfig;
}

// Options for dropdowns (can be moved to config or API later)
const DEPARTMENTS = ['Engineering', 'Design', 'Operations', 'Product', 'Marketing', 'HR', 'Finance', 'Other'];
const SUB_DEPARTMENTS: Record<string, string[]> = {
  Engineering: ['Backend', 'Frontend', 'Infra', 'Data', 'Mobile', 'Other'],
  Design: ['UI/UX', 'Research', 'Brand', 'Other'],
  Operations: ['Logistics', 'Support', 'Facilities', 'Other'],
  Product: ['PM', 'Growth', 'Other'],
  Marketing: ['Content', 'Demand', 'Other'],
  HR: ['Recruitment', 'L&D', 'Other'],
  Finance: ['FP&A', 'Accounting', 'Other'],
  Other: ['Other'],
};
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

  const [department, setDepartment] = useState('');
  const [subDepartment, setSubDepartment] = useState('');
  const [projectPurpose, setProjectPurpose] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [partNumberSku, setPartNumberSku] = useState('');
  const [partNumberOptions, setPartNumberOptions] = useState<{ value: string; label: string }[]>([]);
  const [quantity, setQuantity] = useState<number | ''>('');
  const [urgency, setUrgency] = useState('');
  const [justificationNotes, setJustificationNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const status = config?.defaultStatus || 'DRAFT';

  // Load part numbers from inventory_item records for dropdown
  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.get<{ results?: { id: number; data?: { part_number_or_sku?: string; name?: string } }[] }>(
          '/crm-records/records/?entity_type=inventory_item&page_size=100'
        );
        const list = res.data?.results ?? (res.data as any)?.data ?? [];
        const options = list
          .map((r: any) => {
            const sku = r.data?.part_number_or_sku || r.data?.model;
            const name = r.data?.name;
            if (!sku && !name) return null;
            return { value: sku || name || '', label: name ? `${name}${sku ? ` (${sku})` : ''}` : sku };
          })
          .filter(Boolean) as { value: string; label: string }[];
        setPartNumberOptions(options);
      } catch {
        setPartNumberOptions([]);
      }
    })();
  }, []);

  const subDepartmentOptions = department ? (SUB_DEPARTMENTS[department] ?? ['Other']) : [];

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
    const requestDate = new Date().toISOString().split('T')[0];

    try {
      setSubmitting(true);

      await apiClient.post('/crm-records/records/', {
        entity_type: 'inventory_request',
        data: {
          status,
          request_date: requestDate,
          requester_id: requesterId,
          department: department || undefined,
          sub_department: subDepartment || undefined,
          project_purpose: projectPurpose || undefined,
          item_name_freeform: itemDescription,
          part_number_or_sku: partNumberSku || undefined,
          quantity_required: quantity,
          urgency_level: urgency || undefined,
          comments: justificationNotes || undefined,
        },
      });

      toast.success('Inventory request created.');
      setDepartment('');
      setSubDepartment('');
      setProjectPurpose('');
      setItemDescription('');
      setPartNumberSku('');
      setQuantity('');
      setUrgency('');
      setJustificationNotes('');
    } catch (err: any) {
      console.error('Failed to create inventory request', err);
      toast.error(err?.message || 'Failed to create inventory request.');
    } finally {
      setSubmitting(false);
    }
  };

  const requesterDisplay = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || '—';

  return (
    <div className="border rounded-lg bg-white p-4 shadow-sm space-y-4">
      <div>
        <h5 className="text-base font-semibold">New Inventory Request</h5>
        <p className="text-xs text-muted-foreground">
          All fields are stored in the records table as inventory_request.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Date</Label>
            <Input
              value={new Date().toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' })}
              readOnly
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">Auto: current date</p>
          </div>
          <div className="space-y-1">
            <Label>Requester Name</Label>
            <Input value={requesterDisplay} readOnly disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">Auto: Supabase UID from JWT (stored as requester_id)</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="department">Department</Label>
            <Select value={department} onValueChange={(v) => { setDepartment(v); setSubDepartment(''); }}>
              <SelectTrigger id="department">
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {DEPARTMENTS.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="sub-department">Sub-department</Label>
            <Select value={subDepartment} onValueChange={setSubDepartment} disabled={!department}>
              <SelectTrigger id="sub-department">
                <SelectValue placeholder="Select sub-department" />
              </SelectTrigger>
              <SelectContent>
                {subDepartmentOptions.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="project-purpose">Project / Purpose</Label>
          <Input
            id="project-purpose"
            placeholder="e.g. Q1 campaign, New hire setup"
            value={projectPurpose}
            onChange={(e) => setProjectPurpose(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="item-description">Item Description</Label>
          <Input
            id="item-description"
            placeholder="Describe the item(s) you need"
            value={itemDescription}
            onChange={(e) => setItemDescription(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="part-sku">Part Number / SKU (if known)</Label>
            <Select value={partNumberSku || '_none_'} onValueChange={(v) => setPartNumberSku(v === '_none_' ? '' : v)}>
              <SelectTrigger id="part-sku">
                <SelectValue placeholder="Select or leave blank" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none_">— None / New item</SelectItem>
                {partNumberOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="quantity">Quantity Required</Label>
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
        </div>

        <div className="space-y-1">
          <Label htmlFor="urgency">Priority / Urgency</Label>
          <Select value={urgency} onValueChange={setUrgency}>
            <SelectTrigger id="urgency">
              <SelectValue placeholder="Select priority" />
            </SelectTrigger>
            <SelectContent>
              {URGENCY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="justification">Justification / Notes</Label>
          <Textarea
            id="justification"
            placeholder="Business justification or additional notes"
            value={justificationNotes}
            onChange={(e) => setJustificationNotes(e.target.value)}
            rows={3}
          />
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Button type="submit" disabled={submitting || !user}>
            {submitting ? 'Creating...' : 'Create Request'}
          </Button>
        </div>
      </form>
    </div>
  );
};
