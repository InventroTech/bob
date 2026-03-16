'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiClient, membershipService } from '@/lib/api';
import type { MembershipUser } from '@/lib/api/services/membership';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar, User, Send, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const RECORDS_URL = '/crm-records/records/';
const ADD_VENDOR_VALUE = '__add_vendor__';

interface InventoryRequestFormConfig {
  /** Entity type to save (e.g. inventory_request). */
  entityType?: string;
  /** Initial status for new records (e.g. DRAFT, PENDING_PM). */
  initialStatus?: string;
  /** @deprecated Use initialStatus */
  defaultStatus?: string;
}

interface VendorOption {
  id: number;
  name: string;
}

interface FormItem {
  id: string;
  item_name_freeform: string;
  quantity_required: number | '';
  product_link: string;
  additional_link: string;
  vendor: string;
  estimated_cost: string | number | '';
  including_gst: boolean;
  urgency_level: string;
  comments: string;
}

const newEmptyItem = (): FormItem => ({
  id: crypto.randomUUID?.() ?? `item-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  item_name_freeform: '',
  quantity_required: '',
  product_link: '',
  additional_link: '',
  vendor: '',
  estimated_cost: '',
  including_gst: false,
  urgency_level: '',
  comments: '',
});

interface InventoryRequestFormProps {
  config?: InventoryRequestFormConfig;
}

const URGENCY_OPTIONS = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];

/** Format a number as currency string with thousands separator and 2 decimal places (e.g. 1,234.00). */
function formatCurrencyDisplay(val: string | number | ''): string {
  if (val === '' || val === undefined || val === null) return '';
  const n = typeof val === 'number' ? val : Number(String(val).replace(/,/g, ''));
  if (!Number.isFinite(n)) return '';
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Parse user input (with optional commas) to number or empty. Only one decimal point allowed. */
function parseCurrencyInput(str: string): number | '' {
  const cleaned = str.replace(/,/g, '').trim();
  if (cleaned === '' || cleaned === '.') return '';
  const parts = cleaned.split('.');
  const normalized = parts.length > 2 ? `${parts[0]}.${parts[1]}` : cleaned;
  const n = Number(normalized);
  return Number.isFinite(n) && n >= 0 ? n : '';
}

/**
 * Inventory request creation form for PageBuilder.
 * Supports multiple items per submission; each item is saved as a separate record via API.
 * team_lead = user_parent_id from TenantMembership (from API), or current user's membership id if null.
 */
export const InventoryRequestFormComponent: React.FC<InventoryRequestFormProps> = ({ config }) => {
  const { user } = useAuth();

  const entityType = config?.entityType ?? 'inventory_request';
  const initialStatus = config?.initialStatus ?? config?.defaultStatus ?? 'DRAFT';

  const [requestDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [department, setDepartment] = useState('');
  // team_lead should store the parent user's user_id (string), not the TenantMembership id
  const [teamLeadUserId, setTeamLeadUserId] = useState<string | null>(null);
  const [items, setItems] = useState<FormItem[]>(() => [newEmptyItem()]);
  const [submitting, setSubmitting] = useState(false);
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [vendorsLoading, setVendorsLoading] = useState(true);
  const [addVendorForItemId, setAddVendorForItemId] = useState<string | null>(null);
  const [newVendorName, setNewVendorName] = useState('');
  const [newVendorLink, setNewVendorLink] = useState('');
  const [savingNewVendor, setSavingNewVendor] = useState(false);
  const [focusedEstimatedCostId, setFocusedEstimatedCostId] = useState<string | null>(null);

  const requesterDisplay = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || '—';

  const fetchVendors = useCallback(async () => {
    try {
      setVendorsLoading(true);
      const res = await apiClient.get<{ data?: { vendor_name?: string; id?: number }[]; results?: { data?: { vendor_name?: string; id?: number } }[] }>(
        `${RECORDS_URL}?entity_type=vendor&page_size=500`
      );
      const raw = res.data?.data ?? (res.data as any)?.results ?? [];
      const list = Array.isArray(raw) ? raw : [];
      const options: VendorOption[] = list
        .map((r: any) => {
          const id = r.id ?? r.data?.id;
          const name = (r.data?.vendor_name ?? r.vendor_name ?? r.data?.name ?? '').trim();
          return id != null && name ? { id: Number(id), name } : null;
        })
        .filter(Boolean) as VendorOption[];
      setVendors(options);
    } catch (err) {
      console.error('Failed to fetch vendors', err);
      setVendors([]);
    } finally {
      setVendorsLoading(false);
    }
  }, []);

  const deleteVendor = useCallback(
    async (vendor: VendorOption) => {
      try {
        await apiClient.delete(`${RECORDS_URL}${vendor.id}/`);
        // Optimistically remove from local list
        setVendors((prev) => prev.filter((v) => v.id !== vendor.id));
        // Clear vendor field on any items using this vendor name
        setItems((prev) =>
          prev.map((item) =>
            item.vendor === vendor.name ? { ...item, vendor: '' } : item
          )
        );
        toast.success('Vendor deleted.');
        // Refresh from server in background
        fetchVendors();
      } catch (err: unknown) {
        const msg =
          err && typeof err === 'object' && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Failed to delete vendor.';
        toast.error(msg);
      }
    },
    [fetchVendors, setItems]
  );

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  // Pre-fill department and team_lead from current user's membership (API only)
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const loadMembershipAndTeamLead = async () => {
      const membership = await membershipService.getMyMembership();
      if (!membership || cancelled) return;

      setDepartment(membership.department ?? '');

      const parentMembershipId = membership.user_parent_id ?? null;

      // If there is a parent membership, resolve its user_id from /membership/users/
      if (parentMembershipId != null) {
        try {
          const resp = await apiClient.get<any>('/membership/users/');
          const respData = resp.data;
          let users: MembershipUser[] = [];

          if (Array.isArray(respData)) {
            users = respData as MembershipUser[];
          } else if (respData && typeof respData === 'object') {
            if (Array.isArray(respData.results)) {
              users = respData.results as MembershipUser[];
            } else if (Array.isArray(respData.data)) {
              users = respData.data as MembershipUser[];
            }
          }

          const parent = users.find(
            (u) => u.id != null && Number(u.id) === Number(parentMembershipId)
          );

          if (!cancelled && parent?.user_id) {
            setTeamLeadUserId(String(parent.user_id));
            return;
          }
        } catch (err) {
          console.warn('Failed to resolve parent user_id for team_lead', err);
        }
      }

      // Fallback: use current user's own id as team_lead
      if (!cancelled && user?.id) {
        setTeamLeadUserId(String(user.id));
      }
    };

    loadMembershipAndTeamLead();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const addItem = useCallback(() => {
    setItems((prev) => [...prev, newEmptyItem()]);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => (prev.length <= 1 ? prev : prev.filter((i) => i.id !== id)));
  }, []);

  const updateItem = useCallback((id: string, field: keyof FormItem, value: string | number | boolean | '') => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, [field]: value } : i))
    );
  }, []);

  const startAddVendor = (itemId: string) => {
    setAddVendorForItemId(itemId);
    setNewVendorName('');
    setNewVendorLink('');
  };

  const cancelAddVendor = () => {
    setAddVendorForItemId(null);
    setNewVendorName('');
    setNewVendorLink('');
  };

  const saveNewVendor = async () => {
    const name = (newVendorName ?? '').trim();
    if (!name) {
      toast.error('Enter vendor name.');
      return;
    }
    const itemId = addVendorForItemId;
    if (!itemId) return;
    try {
      setSavingNewVendor(true);
      await apiClient.post(RECORDS_URL, {
        entity_type: 'vendor',
        data: { vendor_name: name, ...(newVendorLink.trim() ? { vendor_site_link: newVendorLink.trim() } : {}) },
      });
      await fetchVendors();
      updateItem(itemId, 'vendor', name);
      setAddVendorForItemId(null);
      setNewVendorName('');
      setNewVendorLink('');
      toast.success('Vendor added.');
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : 'Failed to add vendor.';
      toast.error(msg);
    } finally {
      setSavingNewVendor(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('You must be logged in to create a request.');
      return;
    }

    const validItems = items.filter(
      (i) => (i.item_name_freeform ?? '').trim() !== '' && i.quantity_required !== '' && Number(i.quantity_required) > 0
    );
    if (validItems.length === 0) {
      toast.error('Add at least one item with name and quantity.');
      return;
    }

    const requesterId = user.id;

    try {
      setSubmitting(true);

      for (const item of validItems) {
        const payloadData: Record<string, string | number | boolean> = {
          status: initialStatus,
          request_date: requestDate,
          requester_id: requesterId,
          requester_name: requesterDisplay ?? '',
          department: department || '',
          urgency_level: (item.urgency_level ?? '').trim() || '',
          comments: (item.comments ?? '').trim() || '',
          vendor: (item.vendor ?? '').trim() || '',
          item_name_freeform: (item.item_name_freeform ?? '').trim(),
          quantity_required: typeof item.quantity_required === 'number' ? item.quantity_required : Number(item.quantity_required) || 0,
          product_link: (item.product_link ?? '').trim() || '',
          additional_link: (item.additional_link ?? '').trim() || '',
        };
        const estCost = item.estimated_cost;
        if (estCost !== '' && estCost !== undefined) {
          payloadData.estimated_cost = typeof estCost === 'number' ? estCost : Number(estCost) || 0;
        }
        payloadData.including_gst = item.including_gst === true;
        if (teamLeadUserId) {
          payloadData.team_lead = teamLeadUserId;
        }
        await apiClient.post(RECORDS_URL, {
          entity_type: entityType,
          data: payloadData,
        });
      }

      const count = validItems.length;
      toast.success(count === 1 ? 'Inventory request created.' : `${count} inventory requests created.`);
      setItems([newEmptyItem()]);
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : 'Failed to create inventory request.';
      console.error('Failed to create inventory request', err);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClear = () => {
    setItems([newEmptyItem()]);
    setAddVendorForItemId(null);
    setNewVendorName('');
    setNewVendorLink('');
    toast.success('Form cleared.');
  };

  const hasAnyItemContent = items.some(
    (i) =>
      (i.item_name_freeform ?? '').trim() !== '' ||
      i.quantity_required !== '' ||
      (i.vendor ?? '').trim() !== '' ||
      (i.estimated_cost ?? '') !== '' ||
      (i.urgency_level ?? '').trim() !== '' ||
      (i.comments ?? '').trim() !== '' ||
      (i.product_link ?? '').trim() !== '' ||
      (i.additional_link ?? '').trim() !== ''
  );
  const isFormEmpty = !hasAnyItemContent;

  return (
    <Card className="overflow-hidden border border-border/60 shadow-md">
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6 pt-6">
          <section className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider">
                  <Calendar className="h-3.5 w-3.5" />
                  Date <span className="text-destructive">*</span>
                </Label>
                <Input value={requestDate} readOnly disabled className="h-10 bg-muted/50 font-medium" />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider">
                  <User className="h-3.5 w-3.5" />
                  Requester name <span className="text-destructive">*</span>
                </Label>
                <Input value={requesterDisplay} readOnly disabled className="h-10 bg-muted/50 font-medium" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="department" className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider">
                Department
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

          <section className="space-y-4 border-t pt-6">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-1">
                <Plus className="h-4 w-4" />
                Add item
              </Button>
            </div>

            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-3"
              >
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(item.id)}
                    disabled={items.length <= 1}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    aria-label="Remove item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-medium">Item name *</Label>
                    <Input
                      placeholder="Describe the item"
                      value={item.item_name_freeform}
                      onChange={(e) => updateItem(item.id, 'item_name_freeform', e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div className="flex flex-wrap items-end gap-4 sm:col-span-2 w-full">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Quantity *</Label>
                      <Input
                        type="number"
                        min={1}
                        step={1}
                        value={item.quantity_required === '' ? '' : item.quantity_required}
                        onChange={(e) => {
                          const v = e.target.value;
                          updateItem(item.id, 'quantity_required', v === '' ? '' : Number(v));
                        }}
                        placeholder="0"
                        className="h-9 w-24"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Estimated cost</Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={
                          focusedEstimatedCostId === item.id
                            ? (item.estimated_cost === '' ? '' : String(item.estimated_cost))
                            : formatCurrencyDisplay(item.estimated_cost)
                        }
                        onFocus={() => setFocusedEstimatedCostId(item.id)}
                        onChange={(e) => {
                          const parsed = parseCurrencyInput(e.target.value);
                          updateItem(item.id, 'estimated_cost', parsed);
                        }}
                        onBlur={() => {
                          setFocusedEstimatedCostId(null);
                          if (item.estimated_cost !== '' && typeof item.estimated_cost === 'number') {
                            updateItem(item.id, 'estimated_cost', Math.round(item.estimated_cost * 100) / 100);
                          }
                        }}
                        className="h-9 w-32 font-mono tabular-nums"
                      />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer pb-2 text-muted-foreground shrink-0">
                      <Checkbox
                        checked={item.including_gst === true}
                        onCheckedChange={(checked) => updateItem(item.id, 'including_gst', checked === true)}
                      />
                      <span className="text-xs font-medium">Including GST</span>
                    </label>
                    <div className="space-y-1.5 flex-1 min-w-[180px]">
                      <Label className="text-xs font-medium">Vendor</Label>
                      {addVendorForItemId === item.id ? (
                        <div className="space-y-2 rounded border border-border/60 bg-background p-3">
                          <Input
                            placeholder="Vendor name *"
                            value={newVendorName}
                            onChange={(e) => setNewVendorName(e.target.value)}
                            className="h-9"
                          />
                          <Input
                            placeholder="Vendor site link (optional)"
                            type="url"
                            value={newVendorLink}
                            onChange={(e) => setNewVendorLink(e.target.value)}
                            className="h-9"
                          />
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              onClick={saveNewVendor}
                              disabled={savingNewVendor || !newVendorName.trim()}
                            >
                              {savingNewVendor ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                              Save vendor
                            </Button>
                            <Button type="button" size="sm" variant="outline" onClick={cancelAddVendor}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Select
                            value={item.vendor || undefined}
                            onValueChange={(value) => {
                              if (value === ADD_VENDOR_VALUE) {
                                startAddVendor(item.id);
                                return;
                              }
                              updateItem(item.id, 'vendor', value ?? '');
                            }}
                          >
                            <SelectTrigger className="h-9 w-full">
                              <SelectValue placeholder="Select or add vendor" />
                            </SelectTrigger>
                            <SelectContent>
                              {vendorsLoading ? (
                                <SelectItem value="__loading__" disabled>Loading…</SelectItem>
                              ) : (
                                <>
                                  {vendors.map((v) => (
                                    <SelectItem key={v.id} value={v.name}>{v.name}</SelectItem>
                                  ))}
                                  <SelectItem value={ADD_VENDOR_VALUE}>+ Add vendor</SelectItem>
                                </>
                              )}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => {
                              const current = vendors.find((v) => v.name === item.vendor);
                              if (current) {
                                deleteVendor(current);
                              }
                            }}
                            disabled={!item.vendor || !vendors.some((v) => v.name === item.vendor)}
                            aria-label="Delete selected vendor"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-medium">Product link</Label>
                    <Input
                      type="url"
                      placeholder="https://..."
                      value={item.product_link}
                      onChange={(e) => updateItem(item.id, 'product_link', e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-medium">Additional link (optional)</Label>
                    <Input
                      type="url"
                      placeholder="https://..."
                      value={item.additional_link}
                      onChange={(e) => updateItem(item.id, 'additional_link', e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-medium">Priority / Urgency</Label>
                    <div className="flex flex-wrap gap-2" role="group" aria-label="Priority level">
                      {URGENCY_OPTIONS.map((o) => (
                        <Button
                          key={o.value}
                          type="button"
                          variant={item.urgency_level === o.value ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => updateItem(item.id, 'urgency_level', item.urgency_level === o.value ? '' : o.value)}
                          className="rounded-full h-8"
                        >
                          {o.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-medium">Comments (optional)</Label>
                    <Textarea
                      placeholder="Additional comments for this item"
                      value={item.comments}
                      onChange={(e) => updateItem(item.id, 'comments', e.target.value)}
                      rows={2}
                      className="resize-y min-h-[60px] h-auto text-sm"
                    />
                  </div>
                </div>
              </div>
            ))}
          </section>
        </CardContent>

        <CardFooter className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/20 px-6 py-4">
          <div>
            {!user && (
              <span className="text-muted-foreground text-sm">You must be signed in to submit.</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={submitting || !user} className="min-w-[140px] gap-2 shadow-sm">
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Create Request{items.filter((i) => (i.item_name_freeform ?? '').trim() && i.quantity_required !== '').length > 1 ? 's' : ''}
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
          </div>
        </CardFooter>
      </form>
    </Card>
  );
};
