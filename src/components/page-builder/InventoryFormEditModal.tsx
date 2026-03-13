'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api';
import { ALLOWED_STATUSES } from '@/constants/inventory';
import { Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

const RECORDS_URL = '/crm-records/records/';
const ADD_VENDOR_VALUE = '__add_vendor__';

export type FormModalFieldConfig = {
  key: string;
  label: string;
  enabled: boolean;
};

interface InventoryFormEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: any | null;
  entityType?: string;
  /** Field config: key (data key), label (text to show), enabled (editable vs read-only). */
  formModalFields: FormModalFieldConfig[];
  /** Action buttons: label + status value. Click updates record with form data + this status. */
  actionButtons?: Array<{ label: string; statusValue: string }>;
  onUpdate?: (recordId: number, patch: { data?: Record<string, unknown> }) => Promise<void>;
  onRecordUpdated?: (recordId: number) => void;
  cartOptions?: Array<{ id: number; label: string }>;
  /** Modal title (e.g. "Edit record"). */
  formModalTitle?: string;
  /** Modal description text below the title. */
  formModalDescription?: string;
  /** When set, show one button: conditional if attribute matches, else default (e.g. Inventory Payment modal). */
  paymentButtonConfig?: {
    conditionalButton: { attribute: string; operator: 'gt' | 'lt' | 'gte' | 'lte'; value: string | number; label: string; statusValue: string };
    defaultButton: { label: string; statusValue: string };
  };
}

function formatDisplayValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
}

/** Keys that we render as textarea (multi-line). */
const TEXTAREA_KEYS = new Set(['comments', 'notes', 'description', 'item_name_freeform', 'project_purpose']);

/** Keys that are typically numbers. */
const NUMBER_KEYS = new Set([
  'quantity', 'quantity_required', 'allocated_quantity', 'available_quantity',
  'estimated_cost', 'total_quantity', 'cart_id', 'total_price', 'unit_price',
]);

export const InventoryFormEditModal: React.FC<InventoryFormEditModalProps> = ({
  open,
  onOpenChange,
  record,
  entityType,
  formModalFields,
  actionButtons,
  onUpdate,
  onRecordUpdated,
  cartOptions,
  formModalTitle,
  formModalDescription,
  paymentButtonConfig,
}) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [applyingStatusValue, setApplyingStatusValue] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [vendors, setVendors] = useState<Array<{ id: number; name: string }>>([]);
  const [vendorsLoading, setVendorsLoading] = useState(false);
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [newVendorName, setNewVendorName] = useState('');
  const [newVendorLink, setNewVendorLink] = useState('');
  const [savingNewVendor, setSavingNewVendor] = useState(false);
  const [finalPriceValue, setFinalPriceValue] = useState<string>('');
  const [finalPriceIsTotal, setFinalPriceIsTotal] = useState<boolean>(false);

  const statusOptions = entityType ? (ALLOWED_STATUSES[entityType] ?? []) : [];
  const isInventoryRequest = entityType === 'inventory_request';
  const canUpdate = Boolean(onUpdate && record?.id != null);

  const setField = useCallback((key: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const fetchVendors = useCallback(async () => {
    try {
      setVendorsLoading(true);
      const res = await apiClient.get<any>(`${RECORDS_URL}?entity_type=vendor&page_size=500`);
      const raw = res.data?.data ?? (res.data as any)?.results ?? [];
      const list = Array.isArray(raw) ? raw : [];
      const options = list
        .map((r: any) => {
          const id = r.id ?? r.data?.id;
          const name = (r.data?.vendor_name ?? r.vendor_name ?? r.data?.name ?? '').trim();
          return id != null && name ? { id: Number(id), name } : null;
        })
        .filter(Boolean) as Array<{ id: number; name: string }>;
      setVendors(options);
    } catch (err) {
      console.error('Failed to fetch vendors', err);
      setVendors([]);
    } finally {
      setVendorsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && formModalFields.some((f) => f.key === 'vendor')) fetchVendors();
  }, [open, fetchVendors, formModalFields]);

  const saveNewVendor = useCallback(async () => {
    const name = (newVendorName ?? '').trim();
    if (!name) {
      toast({ title: 'Enter vendor name', variant: 'destructive' });
      return;
    }
    try {
      setSavingNewVendor(true);
      await apiClient.post(RECORDS_URL, {
        entity_type: 'vendor',
        data: { vendor_name: name, ...(newVendorLink.trim() ? { vendor_site_link: newVendorLink.trim() } : {}) },
      });
      await fetchVendors();
      setField('vendor', name);
      setShowAddVendor(false);
      setNewVendorName('');
      setNewVendorLink('');
      toast({ title: 'Vendor added' });
    } catch (err: any) {
      toast({
        title: 'Failed to add vendor',
        description: err?.message || 'Could not save vendor.',
        variant: 'destructive',
      });
    } finally {
      setSavingNewVendor(false);
    }
  }, [newVendorName, newVendorLink, fetchVendors, setField, toast]);

  // Sync form data from record when modal opens or record changes; reset add-vendor and final price when closed
  useEffect(() => {
    if (!open || !record) {
      setFormData({});
      setShowAddVendor(false);
      setNewVendorName('');
      setNewVendorLink('');
      setFinalPriceValue('');
      setFinalPriceIsTotal(false);
      return;
    }
    const data = record.data && typeof record.data === 'object' ? (record.data as Record<string, unknown>) : {};
    const recordAny = record as Record<string, unknown>;
    const initial: Record<string, unknown> = {};
    formModalFields.forEach((f) => {
      const val = data[f.key] ?? recordAny[f.key];
      initial[f.key] = val !== undefined && val !== null ? val : '';
    });
    setFormData(initial);
    if (!paymentButtonConfig) {
      if (data.total_price != null && data.total_price !== '') {
        setFinalPriceValue(String(data.total_price));
        setFinalPriceIsTotal(true);
      } else if (data.unit_price != null && data.unit_price !== '') {
        setFinalPriceValue(String(data.unit_price));
        setFinalPriceIsTotal(false);
      } else {
        setFinalPriceValue('');
        setFinalPriceIsTotal(false);
      }
    }
  }, [open, record?.id, record?.data, formModalFields, paymentButtonConfig]);

  /** Get quantity from form or record for price calculation. */
  const getQuantity = useCallback(() => {
    const q = formData.quantity ?? formData.quantity_required ?? (record?.data as any)?.quantity ?? (record?.data as any)?.quantity_required;
    const n = Number(q);
    return Number.isFinite(n) && n > 0 ? n : 1;
  }, [formData.quantity, formData.quantity_required, record?.data]);

  /** Compute total_price and unit_price from final price input and checkbox for inclusion in save payload. */
  const getComputedPriceFields = useCallback((): Record<string, number> => {
    const val = finalPriceValue.trim() === '' ? NaN : Number(finalPriceValue);
    if (!Number.isFinite(val) || val < 0) return {};
    const qty = getQuantity();
    if (finalPriceIsTotal) {
      return { total_price: val, unit_price: qty > 0 ? Math.round((val / qty) * 100) / 100 : val };
    }
    return { unit_price: val, total_price: Math.round(val * qty * 100) / 100 };
  }, [finalPriceValue, finalPriceIsTotal, getQuantity]);

  const handleActionClick = useCallback(
    async (statusValue: string) => {
      if (!record?.id || !onUpdate) return;
      try {
        setApplyingStatusValue(statusValue);
        const priceOverrides = paymentButtonConfig ? {} : getComputedPriceFields();
        const dataToSend = { ...formData, ...priceOverrides };
        if (entityType === 'inventory_item') {
          const alloc = dataToSend.allocated_quantity ?? (record?.data as any)?.allocated_quantity;
          const avail = dataToSend.available_quantity ?? (record?.data as any)?.available_quantity;
          if (typeof alloc === 'number' && typeof avail === 'number') {
            dataToSend.total_quantity = alloc + avail;
          }
        }
        await onUpdate(record.id, { data: { ...dataToSend, status: statusValue } });
        toast({ title: 'Saved', description: `Status set to ${statusValue.replace(/_/g, ' ')}.` });
        onRecordUpdated?.(record.id);
      } catch (e: any) {
        toast({
          title: 'Update failed',
          description: e?.message || 'Could not save.',
          variant: 'destructive',
        });
      } finally {
        setApplyingStatusValue(null);
      }
    },
    [record?.id, record?.data, entityType, formData, getComputedPriceFields, paymentButtonConfig, onUpdate, onRecordUpdated, toast]
  );

  const handleSaveAll = useCallback(async () => {
    if (!record?.id || !onUpdate) return;
    try {
      setSaving(true);
      const priceOverrides = paymentButtonConfig ? {} : getComputedPriceFields();
      const dataToSend = { ...formData, ...priceOverrides };
      if (entityType === 'inventory_item') {
        const alloc = dataToSend.allocated_quantity ?? (record?.data as any)?.allocated_quantity;
        const avail = dataToSend.available_quantity ?? (record?.data as any)?.available_quantity;
        if (typeof alloc === 'number' && typeof avail === 'number') {
          dataToSend.total_quantity = alloc + avail;
        }
      }
      await onUpdate(record.id, { data: dataToSend });
      toast({ title: 'Saved', description: 'All changes saved.' });
      onRecordUpdated?.(record.id);
    } catch (e: any) {
      toast({
        title: 'Update failed',
        description: e?.message || 'Could not save.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }, [record?.id, record?.data, entityType, formData, getComputedPriceFields, paymentButtonConfig, onUpdate, onRecordUpdated, toast]);

  if (!record) return null;

  /** For payment modal: evaluate condition on record.data[attribute] vs value; return true if conditional button should show. */
  const paymentConditionMatches = paymentButtonConfig
    ? (() => {
        const { attribute, operator, value } = paymentButtonConfig.conditionalButton;
        const raw = (record?.data as Record<string, unknown>)?.[attribute];
        const numVal = typeof value === 'number' ? value : Number(value);
        const numRaw = typeof raw === 'number' ? raw : Number(raw);
        if (Number.isFinite(numVal) && Number.isFinite(numRaw)) {
          switch (operator) {
            case 'gt': return numRaw > numVal;
            case 'gte': return numRaw >= numVal;
            case 'lt': return numRaw < numVal;
            case 'lte': return numRaw <= numVal;
            default: return false;
          }
        }
        const strRaw = raw == null ? '' : String(raw);
        const strVal = value == null ? '' : String(value);
        const cmp = strRaw.localeCompare(strVal, undefined, { numeric: true });
        switch (operator) {
          case 'gt': return cmp > 0;
          case 'gte': return cmp >= 0;
          case 'lt': return cmp < 0;
          case 'lte': return cmp <= 0;
          default: return false;
        }
      })()
    : false;

  const usePaymentButtons = paymentButtonConfig?.conditionalButton && paymentButtonConfig?.defaultButton;
  const effectiveActionButtons = usePaymentButtons
    ? [paymentConditionMatches ? paymentButtonConfig.conditionalButton : paymentButtonConfig.defaultButton]
    : actionButtons;
  const hasActionButtons = effectiveActionButtons && effectiveActionButtons.length > 0;
  const hasEditableField = formModalFields.some((f) => f.enabled);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] flex flex-col max-w-lg">
        <DialogHeader>
          <DialogTitle>{formModalTitle ?? 'Edit record'}</DialogTitle>
          <DialogDescription>
            {formModalDescription ?? (hasEditableField
              ? 'Edit fields below. Use an action button to save and set status, or Save to save changes only.'
              : 'View and update using action buttons.')}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto px-1 py-4 space-y-4">
          {formModalFields.length === 0 ? (
            <p className="text-sm text-muted-foreground">No fields configured. Add fields in table config.</p>
          ) : (
            formModalFields.map((field) => {
              const value = formData[field.key];
              const displayStr = formatDisplayValue(value);
              const isEnabled = field.enabled && canUpdate;
              const isStatus = field.key === 'status' && statusOptions.length > 0;
              const isCartId = field.key === 'cart_id' && isInventoryRequest && cartOptions && cartOptions.length > 0;
              const isVendor = field.key === 'vendor';
              const isBoolean = typeof value === 'boolean';
              const isTextarea = TEXTAREA_KEYS.has(field.key);
              const isNumber = NUMBER_KEYS.has(field.key) && field.key !== 'cart_id';

              return (
                <div key={field.key} className="space-y-1.5">
                  <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {field.label || field.key.replace(/_/g, ' ')}
                  </Label>
                  {isVendor ? (
                    showAddVendor ? (
                      <div className="space-y-2 rounded-md border border-border/60 bg-muted/20 p-3">
                        <Input
                          placeholder="Vendor name *"
                          value={newVendorName}
                          onChange={(e) => setNewVendorName(e.target.value)}
                          className="h-9 text-sm"
                          disabled={!isEnabled}
                        />
                        <Input
                          placeholder="Vendor site link (optional)"
                          type="url"
                          value={newVendorLink}
                          onChange={(e) => setNewVendorLink(e.target.value)}
                          className="h-9 text-sm"
                          disabled={!isEnabled}
                        />
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            onClick={saveNewVendor}
                            disabled={!isEnabled || savingNewVendor || !newVendorName.trim()}
                          >
                            {savingNewVendor ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            Save vendor
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setShowAddVendor(false);
                              setNewVendorName('');
                              setNewVendorLink('');
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Select
                        value={displayStr || undefined}
                        onValueChange={(v) => {
                          if (v === ADD_VENDOR_VALUE) {
                            setShowAddVendor(true);
                            return;
                          }
                          setField(field.key, v ?? '');
                        }}
                        disabled={!isEnabled}
                      >
                        <SelectTrigger className="h-9 text-sm rounded-md">
                          <SelectValue placeholder="Select or add vendor" />
                        </SelectTrigger>
                        <SelectContent>
                          {vendorsLoading ? (
                            <SelectItem value="__loading__" disabled>Loading…</SelectItem>
                          ) : (
                            <>
                              {vendors.map((v) => (
                                <SelectItem key={v.id} value={v.name}>
                                  {v.name}
                                </SelectItem>
                              ))}
                              <SelectItem value={ADD_VENDOR_VALUE}>+ Add vendor</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    )
                  ) : isStatus ? (
                    <Select
                      value={displayStr || statusOptions[0]}
                      onValueChange={(v) => setField(field.key, v)}
                      disabled={!isEnabled}
                    >
                      <SelectTrigger className="h-9 text-sm rounded-md">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt.replace(/_/g, ' ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : isCartId ? (
                    <Select
                      value={displayStr === '' || displayStr === '—' ? '_none_' : displayStr}
                      onValueChange={(v) => setField(field.key, v === '_none_' ? '' : v)}
                      disabled={!isEnabled}
                    >
                      <SelectTrigger className="h-9 text-sm rounded-md">
                        <SelectValue placeholder="Select cart" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none_">No cart</SelectItem>
                        {cartOptions.map((opt) => (
                          <SelectItem key={opt.id} value={String(opt.id)}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : isBoolean ? (
                    <Select
                      value={displayStr}
                      onValueChange={(v) => setField(field.key, v === 'true')}
                      disabled={!isEnabled}
                    >
                      <SelectTrigger className="h-9 text-sm rounded-md max-w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : isTextarea ? (
                    <Textarea
                      className="min-h-[80px] text-sm rounded-md"
                      value={displayStr}
                      onChange={(e) => setField(field.key, e.target.value)}
                      disabled={!isEnabled}
                      placeholder={field.label || field.key}
                    />
                  ) : isNumber ? (
                    <Input
                      type="number"
                      className="h-9 text-sm rounded-md"
                      value={displayStr}
                      onChange={(e) => {
                        const v = e.target.value;
                        setField(field.key, v === '' ? '' : Number(v));
                      }}
                      disabled={!isEnabled}
                    />
                  ) : (
                    <Input
                      className="h-9 text-sm rounded-md"
                      value={displayStr}
                      onChange={(e) => setField(field.key, e.target.value)}
                      disabled={!isEnabled}
                      placeholder={field.label || field.key}
                    />
                  )}
                </div>
              );
            })
          )}

          {/* Final price (form-style modal only; not shown for Inventory Payment modal — use modal fields for total_price/unit_price there) */}
          {!paymentButtonConfig && (
            <div className="space-y-3 pt-2 border-t border-border/60">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Final price
              </Label>
              <div className="flex flex-wrap items-center gap-4">
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="0.00"
                  value={finalPriceValue}
                  onChange={(e) => setFinalPriceValue(e.target.value)}
                  className="h-9 text-sm rounded-md w-32"
                  disabled={!canUpdate}
                />
                <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground">
                  <Checkbox
                    checked={finalPriceIsTotal}
                    onCheckedChange={(c) => setFinalPriceIsTotal(c === true)}
                    disabled={!canUpdate}
                  />
                  <span>Total price (uncheck for unit price)</span>
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                On save, total_price and unit_price are calculated from quantity and saved to the record.
              </p>
            </div>
          )}
        </div>
        <DialogFooter className="border-t pt-4 gap-2 flex-wrap">
          {hasActionButtons && (
            <div className="flex flex-wrap gap-2">
              {effectiveActionButtons!.map((btn) => (
                <Button
                  key={btn.statusValue}
                  type="button"
                  variant="outline"
                  size="default"
                  className="gap-2 h-9 rounded-md"
                  disabled={!!applyingStatusValue}
                  onClick={() => handleActionClick(btn.statusValue)}
                >
                  {applyingStatusValue === btn.statusValue ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : null}
                  {applyingStatusValue === btn.statusValue ? 'Updating…' : btn.label}
                </Button>
              ))}
            </div>
          )}
          {canUpdate && hasEditableField && (
            <Button
              type="button"
              variant="default"
              size="default"
              className="gap-2 h-9 rounded-md"
              disabled={saving}
              onClick={handleSaveAll}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              {saving ? 'Saving…' : 'Save'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
