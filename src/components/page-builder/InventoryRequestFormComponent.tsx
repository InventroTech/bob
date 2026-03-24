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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { formatCurrencyDisplay, formatCurrencyInputLive } from '@/lib/currencyFormat';

const RECORDS_URL = '/crm-records/records/';

interface InventoryRequestFormConfig {
  /** Entity type to save (e.g. inventory_request). */
  entityType?: string;
  /** Initial status for new records (e.g. DRAFT, PENDING_PM). */
  initialStatus?: string;
  /** @deprecated Use initialStatus */
  defaultStatus?: string;
  /** Options shown in the Priority / Urgency picker. Saved as `urgency_level`. */
  urgencyOptions?: Array<{ value: string; label: string }>;
}

interface VendorOption {
  id: number;
  name: string;
}

type InventoryItemSuggestion = {
  id: number;
  name: string;
  data: Record<string, unknown>;
};

interface FormItem {
  id: string;
  item_name_freeform: string;
  quantity_required: number | '';
  product_link: string;
  additional_link: string;
  vendor: string;
  estimated_cost: string | number | '';
  price_currency: 'INR' | 'USD';
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
  price_currency: 'INR',
  including_gst: false,
  urgency_level: '',
  comments: '',
});

interface InventoryRequestFormProps {
  config?: InventoryRequestFormConfig;
}

const DEFAULT_URGENCY_OPTIONS = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];

/**
 * Inventory request creation form for PageBuilder.
 * Supports multiple items per submission; each item is saved as a separate record via API.
 * team_lead = user_parent_id from TenantMembership (from API), or current user's membership id if null.
 */
export const InventoryRequestFormComponent: React.FC<InventoryRequestFormProps> = ({ config }) => {
  const { user } = useAuth();

  const entityType = config?.entityType ?? 'inventory_request';
  const initialStatus = config?.initialStatus ?? config?.defaultStatus ?? 'DRAFT';
  // If `urgencyOptions` exists in config (even empty), treat it as an override.
  const urgencyOptions =
    config?.urgencyOptions !== undefined ? config.urgencyOptions : DEFAULT_URGENCY_OPTIONS;
  const normalizedUrgencyOptions = urgencyOptions
    .map((o) => ({
      value: String(o.value ?? '').trim(),
      label: String(o.label ?? '').trim() || String(o.value ?? '').trim(),
    }))
    .filter((o) => o.value !== '');

  const [requestDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [department, setDepartment] = useState('');
  const [myRoleName, setMyRoleName] = useState<string>('');
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
  /** Live-formatted price strings while typing (cleared on blur). */
  const [priceDraftByItemId, setPriceDraftByItemId] = useState<Record<string, string>>({});
  const [focusedItemNameId, setFocusedItemNameId] = useState<string | null>(null);
  const [itemNameQuery, setItemNameQuery] = useState<string>('');
  const [itemNameSuggestions, setItemNameSuggestions] = useState<InventoryItemSuggestion[]>([]);
  const [itemNameSuggestionsOpen, setItemNameSuggestionsOpen] = useState(false);
  const [itemNameSuggestionsLoading, setItemNameSuggestionsLoading] = useState(false);
  const [focusedVendorId, setFocusedVendorId] = useState<string | null>(null);
  const [vendorQuery, setVendorQuery] = useState<string>('');
  const [vendorSuggestionsOpen, setVendorSuggestionsOpen] = useState(false);

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

  const fetchItemSuggestions = useCallback(async (query: string) => {
    const q = query.trim();
    if (q.length < 2) {
      setItemNameSuggestions([]);
      setItemNameSuggestionsOpen(false);
      return;
    }
    try {
      setItemNameSuggestionsLoading(true);
      const res = await apiClient.get<any>(
        `${RECORDS_URL}?entity_type=unmannd_request&page_size=8&search=${encodeURIComponent(q)}`
      );
      const raw = res.data?.data ?? (res.data as any)?.results ?? [];
      const list = Array.isArray(raw) ? raw : [];
      const mapped = list
        .map((r: any) => {
          const id = r.id ?? r.data?.id;
          const data = r.data && typeof r.data === 'object' ? (r.data as Record<string, unknown>) : {};
          const name =
            String(
              data.item_name_freeform ?? data.name ?? data.item_name ?? r.item_name_freeform ?? r.name ?? ''
            ).trim();
          return id != null && name ? ({ id: Number(id), name, data } as InventoryItemSuggestion) : null;
        })
        .filter(Boolean) as InventoryItemSuggestion[];
      setItemNameSuggestions(mapped);
      setItemNameSuggestionsOpen(mapped.length > 0);
    } catch {
      setItemNameSuggestions([]);
      setItemNameSuggestionsOpen(false);
    } finally {
      setItemNameSuggestionsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  // Debounced typeahead for item name
  useEffect(() => {
    if (!focusedItemNameId) return;
    const t = window.setTimeout(() => {
      fetchItemSuggestions(itemNameQuery);
    }, 250);
    return () => window.clearTimeout(t);
  }, [focusedItemNameId, itemNameQuery, fetchItemSuggestions]);

  // Pre-fill department and team_lead from current user's membership (API only)
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const loadMembershipAndTeamLead = async () => {
      const membership = await membershipService.getMyMembership();
      if (!membership || cancelled) return;

      setDepartment(membership.department ?? '');
      setMyRoleName(membership.role_name ?? membership.role_key ?? '');

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
        const payloadData: Record<string, unknown> = {
          status: initialStatus,
          request_date: requestDate,
          requester_id: requesterId,
          requester_name: requesterDisplay ?? '',
          department: department || '',
          urgency_level: (item.urgency_level ?? '').trim() || '',
          vendor: (item.vendor ?? '').trim() || '',
          item_name_freeform: (item.item_name_freeform ?? '').trim(),
          quantity_required: typeof item.quantity_required === 'number' ? item.quantity_required : Number(item.quantity_required) || 0,
          product_link: (item.product_link ?? '').trim() || '',
          additional_link: (item.additional_link ?? '').trim() || '',
          price_currency: item.price_currency === 'USD' ? 'USD' : 'INR',
        };
        const commentText = (item.comments ?? '').trim();
        payloadData.comments =
          commentText.length > 0
            ? [{ name: requesterDisplay ?? '', role: myRoleName ?? '', comment: commentText }]
            : [];
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
                    <div className="relative">
                      <Input
                        placeholder="Describe the item"
                        value={item.item_name_freeform}
                        onFocus={() => {
                          setFocusedItemNameId(item.id);
                          setItemNameQuery(item.item_name_freeform || '');
                          if ((item.item_name_freeform || '').trim().length >= 2) {
                            setItemNameSuggestionsOpen(itemNameSuggestions.length > 0);
                          }
                        }}
                        onBlur={() => {
                          window.setTimeout(() => {
                            setFocusedItemNameId((prev) => (prev === item.id ? null : prev));
                            setItemNameSuggestionsOpen(false);
                          }, 150);
                        }}
                        onChange={(e) => {
                          const v = e.target.value;
                          updateItem(item.id, 'item_name_freeform', v);
                          setFocusedItemNameId(item.id);
                          setItemNameQuery(v);
                          if (v.trim().length >= 2) setItemNameSuggestionsOpen(true);
                        }}
                        className="h-9"
                      />

                      {focusedItemNameId === item.id && (itemNameSuggestionsOpen || itemNameSuggestionsLoading) && (
                        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-background shadow-md overflow-hidden">
                          {itemNameSuggestionsLoading ? (
                            <div className="px-3 py-2 text-sm text-muted-foreground">Searching…</div>
                          ) : itemNameSuggestions.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-muted-foreground">No matches</div>
                          ) : (
                            <div className="max-h-56 overflow-auto">
                              {itemNameSuggestions.map((s) => (
                                <button
                                  key={s.id}
                                  type="button"
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center justify-between gap-2"
                                  onMouseDown={(ev) => ev.preventDefault()}
                                  onClick={() => {
                                    updateItem(item.id, 'item_name_freeform', s.name);
                                    const d = s.data || {};

                                    const vendor = String((d.default_vendor ?? d.vendor ?? '') as any).trim();
                                    if (vendor) updateItem(item.id, 'vendor', vendor);

                                    const costRaw = d.default_cost_per_unit ?? d.estimated_cost ?? d.cost_per_unit;
                                    const costNum = costRaw === '' || costRaw == null ? '' : Number(costRaw);
                                    if (costNum !== '' && Number.isFinite(costNum)) updateItem(item.id, 'estimated_cost', costNum);
                                    const suggestedCurrency = String((d.price_currency ?? d.currency ?? 'INR') as any).trim().toUpperCase();
                                    if (suggestedCurrency === 'USD' || suggestedCurrency === 'INR') {
                                      updateItem(item.id, 'price_currency', suggestedCurrency as 'INR' | 'USD');
                                    }

                                    const productLink = String((d.product_link ?? d.link ?? '') as any).trim();
                                    if (productLink) updateItem(item.id, 'product_link', productLink);

                                    const additionalLink = String((d.additional_link ?? d.vendor_site_link ?? '') as any).trim();
                                    if (additionalLink) updateItem(item.id, 'additional_link', additionalLink);

                                    if (typeof d.including_gst === 'boolean') updateItem(item.id, 'including_gst', d.including_gst);

                                    setItemNameSuggestionsOpen(false);
                                    setFocusedItemNameId(null);
                                  }}
                                >
                                  <span className="truncate">{s.name}</span>
                                  <span className="text-xs text-muted-foreground shrink-0">#{s.id}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
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
                      <div className="flex items-center gap-2">
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="0.00"
                          value={
                            priceDraftByItemId[item.id] ??
                            formatCurrencyDisplay(item.estimated_cost)
                          }
                          onChange={(e) => {
                            const { display, value } = formatCurrencyInputLive(e.target.value);
                            setPriceDraftByItemId((prev) => ({ ...prev, [item.id]: display }));
                            updateItem(item.id, 'estimated_cost', value);
                          }}
                          onBlur={() => {
                            setPriceDraftByItemId((prev) => {
                              const next = { ...prev };
                              delete next[item.id];
                              return next;
                            });
                            if (item.estimated_cost !== '' && typeof item.estimated_cost === 'number') {
                              updateItem(item.id, 'estimated_cost', Math.round(item.estimated_cost * 100) / 100);
                            }
                          }}
                          className="h-9 min-w-[7.5rem] font-mono tabular-nums"
                        />
                        <Select
                          value={item.price_currency || 'INR'}
                          onValueChange={(v) => updateItem(item.id, 'price_currency', (v === 'USD' ? 'USD' : 'INR'))}
                        >
                          <SelectTrigger className="h-9 w-20">
                            <SelectValue placeholder="INR" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="INR">INR</SelectItem>
                            <SelectItem value="USD">USD</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
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
                      <div className="flex items-center gap-2">
                        <div className="relative w-full">
                            <Input
                              value={item.vendor}
                              placeholder="Search or add vendor"
                              className="h-9 w-full"
                              onFocus={() => {
                                setFocusedVendorId(item.id);
                                setVendorQuery(item.vendor || '');
                                setVendorSuggestionsOpen(true);
                              }}
                              onBlur={() => {
                                window.setTimeout(() => {
                                  setFocusedVendorId((prev) => (prev === item.id ? null : prev));
                                  setVendorSuggestionsOpen(false);
                                }, 150);
                              }}
                              onChange={(e) => {
                                const v = e.target.value;
                                updateItem(item.id, 'vendor', v);
                                setFocusedVendorId(item.id);
                                setVendorQuery(v);
                                setVendorSuggestionsOpen(true);
                              }}
                            />

                            {focusedVendorId === item.id && vendorSuggestionsOpen && (
                              <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-background shadow-md overflow-hidden">
                                {vendorsLoading ? (
                                  <div className="px-3 py-2 text-sm text-muted-foreground">Loading…</div>
                                ) : (
                                  <div className="max-h-56 overflow-auto">
                                    {(() => {
                                      const q = vendorQuery.trim().toLowerCase();
                                      const filtered = q
                                        ? vendors.filter((v) => v.name.toLowerCase().includes(q)).slice(0, 12)
                                        : vendors.slice(0, 12);
                                      if (filtered.length === 0) {
                                        return (
                                          <div className="px-3 py-2 text-sm text-muted-foreground">
                                            No matches
                                          </div>
                                        );
                                      }
                                      return filtered.map((v) => (
                                        <button
                                          key={v.id}
                                          type="button"
                                          className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center justify-between gap-2"
                                          onMouseDown={(ev) => ev.preventDefault()}
                                          onClick={() => {
                                            updateItem(item.id, 'vendor', v.name);
                                            setVendorSuggestionsOpen(false);
                                            setFocusedVendorId(null);
                                          }}
                                        >
                                          <span className="truncate">{v.name}</span>
                                          <span className="text-xs text-muted-foreground shrink-0">#{v.id}</span>
                                        </button>
                                      ));
                                    })()}
                                  </div>
                                )}
                              </div>
                            )}
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-9 shrink-0"
                          onClick={() => {
                            startAddVendor(item.id);
                            setVendorSuggestionsOpen(false);
                            setFocusedVendorId(null);
                          }}
                        >
                          + Add vendor
                        </Button>
                      </div>
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
                      {normalizedUrgencyOptions.map((o) => (
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
            <div className="pt-1">
              <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-1">
                <Plus className="h-4 w-4" />
                Add item
              </Button>
            </div>
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

      <Dialog open={addVendorForItemId !== null} onOpenChange={(open) => { if (!open) cancelAddVendor(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add vendor</DialogTitle>
            <DialogDescription>Create a vendor and auto-fill it for this item.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
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
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={cancelAddVendor}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={saveNewVendor}
              disabled={savingNewVendor || !newVendorName.trim()}
            >
              {savingNewVendor ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save vendor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
