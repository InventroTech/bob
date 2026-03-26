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
import { useAuth } from '@/hooks/useAuth';
import { apiClient, membershipService } from '@/lib/api';
import { ALLOWED_STATUSES } from '@/constants/inventory';
import { Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { formatCurrencyDisplay, formatCurrencyInputLive, parseCurrencyInput } from '@/lib/currencyFormat';

const RECORDS_URL = '/crm-records/records/';
const ADD_VENDOR_VALUE = '__add_vendor__';

export type FormModalFieldConfig = {
  key: string;
  label: string;
  enabled: boolean;
  /** When true and field is read-only, render value as a clickable link. */
  link?: boolean;
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
  /** Whether to show the Save button in the footer. If undefined, Save shows only when there are no action buttons. */
  showSaveButton?: boolean;
  /** When set, show one button: conditional if attribute matches, else default (e.g. Inventory Payment modal). */
  paymentButtonConfig?: {
    conditionalButton: { attribute: string; operator: 'gt' | 'lt' | 'gte' | 'lte'; value: string | number; label: string; statusValue: string };
    defaultButton: { label: string; statusValue: string };
  };
  /** Checkboxes shown beside action buttons; each saves data[key] = true/false. */
  modalFlags?: Array<{
    label: string;
    key: string;
    enabled?: boolean;
    conditional?: { attribute: string; operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq'; value: string | number };
  }>;
  /**
   * Show the extra “Final price” block (computed total/unit from one input).
   * When false, that section is hidden and computed price overrides are not applied on save.
   * Default: true (when omitted).
   */
  showFinalPriceSection?: boolean;
}

function looksLikeUrl(value: string): boolean {
  const v = (value || '').trim();
  if (!v) return false;
  return v.startsWith('http://') || v.startsWith('https://') || v.startsWith('mailto:');
}

function formatDisplayValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (Array.isArray(value)) {
    const first = value[0] as any;
    if (first && typeof first === 'object' && 'comment' in first) {
      const last = value[value.length - 1] as any;
      return last?.comment != null ? String(last.comment) : '';
    }
    return value.join(', ');
  }
  return String(value);
}

function formatPriceFieldDisplay(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  const n = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''));
  if (!Number.isFinite(n)) return formatDisplayValue(value);
  return formatCurrencyDisplay(n);
}

/** Keys that we render as textarea (multi-line). */
const TEXTAREA_KEYS = new Set(['comments', 'notes', 'description', 'item_name_freeform', 'project_purpose']);

/** Keys that are typically numbers. */
const NUMBER_KEYS = new Set([
  'quantity', 'quantity_required', 'allocated_quantity', 'available_quantity',
  'estimated_cost', 'total_quantity', 'cart_id', 'total_price', 'unit_price',
]);
const PRICE_KEYS = new Set(['estimated_cost', 'total_price', 'unit_price']);

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
  showSaveButton,
  paymentButtonConfig,
  modalFlags,
  showFinalPriceSection,
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [applyingStatusValue, setApplyingStatusValue] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [vendors, setVendors] = useState<Array<{ id: number; name: string }>>([]);
  const [vendorsLoading, setVendorsLoading] = useState(false);
  const [isAddVendorModalOpen, setIsAddVendorModalOpen] = useState(false);
  const [newVendorName, setNewVendorName] = useState('');
  const [newVendorLink, setNewVendorLink] = useState('');
  const [savingNewVendor, setSavingNewVendor] = useState(false);
  const [finalPriceValue, setFinalPriceValue] = useState<string>('');
  const [finalPriceIsTotal, setFinalPriceIsTotal] = useState<boolean>(false);
  /** Live-formatted strings for price form fields while typing (cleared on blur). */
  const [priceFieldDraft, setPriceFieldDraft] = useState<Record<string, string>>({});
  const [flagValues, setFlagValues] = useState<Record<string, boolean>>({});
  const [myRoleName, setMyRoleName] = useState<string>('');

  const myName =
    user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || '—';

  const statusOptions = entityType ? (ALLOWED_STATUSES[entityType] ?? []) : [];
  const isInventoryRequest = entityType === 'inventory_request';
  const canUpdate = Boolean(onUpdate && record?.id != null);
  const hasPriceFieldInForm = formModalFields.some((f) => PRICE_KEYS.has(f.key));
  const effectiveShowFinalPrice = showFinalPriceSection !== false;

  useEffect(() => {
    if (!open || !user) return;
    let cancelled = false;

    const load = async () => {
      try {
        const membership = await membershipService.getMyMembership();
        if (cancelled) return;
        setMyRoleName(membership?.role_name ?? membership?.role_key ?? '');
      } catch {
        // Non-fatal: still store comment with name only.
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [open, user]);

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
      setIsAddVendorModalOpen(false);
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
      setIsAddVendorModalOpen(false);
      setNewVendorName('');
      setNewVendorLink('');
      setFinalPriceValue('');
      setFinalPriceIsTotal(false);
      setPriceFieldDraft({});
      return;
    }
    const data = record.data && typeof record.data === 'object' ? (record.data as Record<string, unknown>) : {};
    const recordAny = record as Record<string, unknown>;
    setPriceFieldDraft({});
    const initial: Record<string, unknown> = {};
    formModalFields.forEach((f) => {
      const val = data[f.key] ?? recordAny[f.key];
      if (f.key === 'comments') {
        // If backend stores comments as history array, keep input blank for "new stage comment".
        initial[f.key] = Array.isArray(val) ? '' : val !== undefined && val !== null ? val : '';
        return;
      }
      initial[f.key] = val !== undefined && val !== null ? val : '';
    });
    if ((hasPriceFieldInForm || (!paymentButtonConfig && effectiveShowFinalPrice)) && !initial.price_currency) {
      const savedCurrency = String(data.price_currency ?? data.currency ?? '').toUpperCase();
      initial.price_currency = savedCurrency === 'USD' ? 'USD' : 'INR';
    }
    const nextFlags: Record<string, boolean> = {};
    (modalFlags ?? []).forEach((flag) => {
      const key = (flag.key ?? '').trim();
      if (!key) return;
      const existing = data[key];
      nextFlags[key] = typeof existing === 'boolean' ? existing : flag.enabled === true;
    });
    setFlagValues(nextFlags);
    setFormData(initial);
    if (!paymentButtonConfig && effectiveShowFinalPrice) {
      if (data.total_price != null && data.total_price !== '') {
        setFinalPriceValue(formatCurrencyDisplay(Number(data.total_price)));
        setFinalPriceIsTotal(true);
      } else if (data.unit_price != null && data.unit_price !== '') {
        setFinalPriceValue(formatCurrencyDisplay(Number(data.unit_price)));
        setFinalPriceIsTotal(false);
      } else {
        setFinalPriceValue('');
        setFinalPriceIsTotal(false);
      }
    }
  }, [open, record?.id, record?.data, formModalFields, paymentButtonConfig, hasPriceFieldInForm, modalFlags, effectiveShowFinalPrice]);

  /** Get quantity from form or record for price calculation. */
  const getQuantity = useCallback(() => {
    const q = formData.quantity ?? formData.quantity_required ?? (record?.data as any)?.quantity ?? (record?.data as any)?.quantity_required;
    const n = Number(q);
    return Number.isFinite(n) && n > 0 ? n : 1;
  }, [formData.quantity, formData.quantity_required, record?.data]);

  /** Compute total_price and unit_price from final price input and checkbox for inclusion in save payload. */
  const getComputedPriceFields = useCallback((): Record<string, number> => {
    const parsed = parseCurrencyInput(finalPriceValue);
    if (parsed === '' || !Number.isFinite(parsed)) return {};
    const val = parsed;
    const qty = getQuantity();
    if (finalPriceIsTotal) {
      return { total_price: val, unit_price: qty > 0 ? Math.round((val / qty) * 100) / 100 : val };
    }
    return { unit_price: val, total_price: Math.round(val * qty * 100) / 100 };
  }, [finalPriceValue, finalPriceIsTotal, getQuantity]);

  const flagConditionMatches = useCallback(
    (flag: {
      label: string;
      key: string;
      enabled?: boolean;
      conditional?: { attribute: string; operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq'; value: string | number };
    }) => {
      const cond = flag.conditional;
      if (!cond?.attribute || !cond.attribute.trim()) return true;
      const attribute = cond.attribute.trim();
      const raw =
        (formData as any)?.[attribute] !== undefined ? (formData as any)[attribute] : (record?.data as any)?.[attribute];
      const threshold = cond.value;

      const numRaw = Number(raw);
      const numThreshold = Number(threshold);
      if (Number.isFinite(numRaw) && Number.isFinite(numThreshold)) {
        switch (cond.operator) {
          case 'gt':
            return numRaw > numThreshold;
          case 'gte':
            return numRaw >= numThreshold;
          case 'lt':
            return numRaw < numThreshold;
          case 'lte':
            return numRaw <= numThreshold;
          case 'eq':
            return numRaw === numThreshold;
          default:
            return false;
        }
      }

      const strRaw = raw == null ? '' : String(raw);
      const strVal = threshold == null ? '' : String(threshold);
      const cmp = strRaw.localeCompare(strVal, undefined, { numeric: true });
      const rawLower = strRaw.trim().toLowerCase();
      const valLower = strVal.trim().toLowerCase();
      const rawBool =
        rawLower === 'true' ? true : rawLower === 'false' ? false : null;
      const valBool =
        valLower === 'true' ? true : valLower === 'false' ? false : null;

      switch (cond.operator) {
        case 'gt':
          return cmp > 0;
        case 'gte':
          return cmp >= 0;
        case 'lt':
          return cmp < 0;
        case 'lte':
          return cmp <= 0;
        case 'eq':
          if (rawBool !== null && valBool !== null) {
            return rawBool === valBool;
          }
          return rawLower === valLower;
        default:
          return false;
      }
    },
    [formData, record?.data]
  );

  const handleActionClick = useCallback(
    async (btn: { label: string; statusValue: string }) => {
      if (!record?.id || !onUpdate) return;
      try {
        setApplyingStatusValue(btn.statusValue);
        const priceOverrides = paymentButtonConfig || !effectiveShowFinalPrice ? {} : getComputedPriceFields();
        const dataToSend: Record<string, unknown> = { ...formData, ...priceOverrides, status: btn.statusValue };

        // Stage comment history: append `{name, role, comment}` into `data.comments`.
        if (Object.prototype.hasOwnProperty.call(formData, 'comments') || (record?.data && 'comments' in (record.data as any))) {
          const existingRaw = (record?.data as any)?.comments;
          let history: Array<{ name: string; role: string; comment: string }> = [];
          if (Array.isArray(existingRaw)) {
            history = existingRaw as any;
          } else if (typeof existingRaw === 'string' && existingRaw.trim()) {
            history = [{ name: '', role: '', comment: existingRaw.trim() }];
          }

          const commentText = typeof formData.comments === 'string' ? formData.comments.trim() : '';
          if (commentText) {
            history = [
              ...history,
              { name: myName, role: myRoleName ?? '', comment: commentText },
            ];
          }
          dataToSend.comments = history;
        }

        (modalFlags ?? [])
          .filter((f) => flagConditionMatches(f))
          .forEach((flag) => {
          const key = (flag.key ?? '').trim();
          if (!key) return;
          dataToSend[key] = flagValues[key] === true;
          });
        if (entityType === 'inventory_item') {
          const alloc = dataToSend.allocated_quantity ?? (record?.data as any)?.allocated_quantity;
          const avail = dataToSend.available_quantity ?? (record?.data as any)?.available_quantity;
          if (typeof alloc === 'number' && typeof avail === 'number') {
            dataToSend.total_quantity = alloc + avail;
          }
        }
        await onUpdate(record.id, { data: dataToSend });
        toast({ title: 'Saved', description: `Status set to ${btn.statusValue.replace(/_/g, ' ')}.` });
        onRecordUpdated?.(record.id);
        onOpenChange(false);
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
    [record?.id, record?.data, entityType, formData, getComputedPriceFields, paymentButtonConfig, effectiveShowFinalPrice, onUpdate, onRecordUpdated, onOpenChange, toast, modalFlags, flagValues, myName, myRoleName, flagConditionMatches]
  );

  const handleSaveAll = useCallback(async () => {
    if (!record?.id || !onUpdate) return;
    try {
      setSaving(true);
      const priceOverrides = paymentButtonConfig || !effectiveShowFinalPrice ? {} : getComputedPriceFields();
      const dataToSend: Record<string, unknown> = { ...formData, ...priceOverrides };

      if (Object.prototype.hasOwnProperty.call(formData, 'comments') || (record?.data && 'comments' in (record.data as any))) {
        const existingRaw = (record?.data as any)?.comments;
        let history: Array<{ name: string; role: string; comment: string }> = [];
        if (Array.isArray(existingRaw)) {
          history = existingRaw as any;
        } else if (typeof existingRaw === 'string' && existingRaw.trim()) {
          history = [{ name: '', role: '', comment: existingRaw.trim() }];
        }

        const commentText = typeof formData.comments === 'string' ? formData.comments.trim() : '';
        if (commentText) {
          history = [...history, { name: myName, role: myRoleName ?? '', comment: commentText }];
        }
        dataToSend.comments = history;
      }

      (modalFlags ?? [])
        .filter((f) => flagConditionMatches(f))
        .forEach((flag) => {
          const key = (flag.key ?? '').trim();
          if (!key) return;
          dataToSend[key] = flagValues[key] === true;
        });
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
      onOpenChange(false);
    } catch (e: any) {
      toast({
        title: 'Update failed',
        description: e?.message || 'Could not save.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }, [record?.id, record?.data, entityType, formData, getComputedPriceFields, paymentButtonConfig, effectiveShowFinalPrice, onUpdate, onRecordUpdated, onOpenChange, toast, modalFlags, flagValues, myName, myRoleName, flagConditionMatches]);

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
  // Default: if showSaveButton is undefined, show Save only when there are no action buttons.
  const effectiveShowSaveButton =
    showSaveButton !== undefined ? showSaveButton : !hasActionButtons;

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
              const displayStr = PRICE_KEYS.has(field.key) ? formatPriceFieldDisplay(value) : formatDisplayValue(value);
              const isEnabled = field.enabled && canUpdate;
              const isClickableLink = field.link === true && !isEnabled && looksLikeUrl(displayStr);
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
                  {isClickableLink ? (
                    <a
                      href={displayStr}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm underline underline-offset-4 break-all"
                    >
                      {displayStr}
                      <span className="text-xs text-muted-foreground">(open)</span>
                    </a>
                  ) : field.key === 'comments' ? (
                    (() => {
                      const existingRaw = (record?.data && typeof record.data === 'object' ? (record.data as any).comments : undefined) as unknown;
                      const history: Array<{ name: string; role: string; comment: string }> = Array.isArray(existingRaw)
                        ? (existingRaw as any).filter((x: any) => x && typeof x === 'object' && typeof x.comment === 'string')
                        : typeof existingRaw === 'string' && existingRaw.trim()
                          ? [{ name: '', role: '', comment: existingRaw.trim() }]
                          : [];

                      const newCommentValue = typeof formData.comments === 'string' ? formData.comments : '';
                      return (
                        <div className="space-y-2">
                          <div className="space-y-2">
                            {history.length === 0 ? (
                              <p className="text-xs text-muted-foreground">No comments yet.</p>
                            ) : (
                              history.map((c, idx) => (
                                <div key={idx} className="rounded-md border border-border/60 bg-muted/20 p-2 space-y-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    {c.name ? (
                                      <span className="text-[11px] font-medium px-2 py-0.5 rounded border border-border/60 bg-background">
                                        {c.name}
                                      </span>
                                    ) : null}
                                    {c.role ? (
                                      <span className="text-[11px] font-normal px-2 py-0.5 rounded border border-border/60 bg-muted/20 text-muted-foreground">
                                        {c.role}
                                      </span>
                                    ) : null}
                                  </div>
                                  <div className="text-sm whitespace-pre-wrap">{c.comment}</div>
                                </div>
                              ))
                            )}
                          </div>
                          <Textarea
                            className="min-h-[80px] text-sm rounded-md"
                            value={newCommentValue}
                            onChange={(e) => setField('comments', e.target.value)}
                            disabled={!isEnabled}
                            placeholder="Add a new comment..."
                          />
                        </div>
                      );
                    })()
                  ) : isVendor ? (
                    <div className="flex items-center gap-2">
                      <Select
                        value={displayStr || undefined}
                        onValueChange={(v) => {
                          if (v === ADD_VENDOR_VALUE) {
                            setIsAddVendorModalOpen(true);
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
                            </>
                          )}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-9 shrink-0"
                        onClick={() => setIsAddVendorModalOpen(true)}
                        disabled={!isEnabled}
                      >
                        + Add vendor
                      </Button>
                    </div>
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
                    PRICE_KEYS.has(field.key) ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="text"
                          inputMode="decimal"
                          className="h-9 min-w-[7rem] text-sm rounded-md font-mono tabular-nums"
                          value={
                            priceFieldDraft[field.key] ??
                            formatCurrencyDisplay(
                              formData[field.key] as number | '' | string | undefined,
                            )
                          }
                          onChange={(e) => {
                            const { display, value: v } = formatCurrencyInputLive(e.target.value);
                            setPriceFieldDraft((prev) => ({ ...prev, [field.key]: display }));
                            setField(field.key, v);
                          }}
                          onBlur={() => {
                            setPriceFieldDraft((prev) => {
                              const next = { ...prev };
                              delete next[field.key];
                              return next;
                            });
                            const cur = formData[field.key];
                            if (typeof cur === 'number' && Number.isFinite(cur)) {
                              setField(field.key, Math.round(cur * 100) / 100);
                            }
                          }}
                          disabled={!isEnabled}
                        />
                        <Select
                          value={String(formData.price_currency || 'INR')}
                          onValueChange={(v) => setField('price_currency', v === 'USD' ? 'USD' : 'INR')}
                          disabled={!isEnabled}
                        >
                          <SelectTrigger className="h-9 w-20 text-sm rounded-md">
                            <SelectValue placeholder="INR" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="INR">INR</SelectItem>
                            <SelectItem value="USD">USD</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
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
                    )
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
          {!paymentButtonConfig && effectiveShowFinalPrice && (
            <div className="space-y-3 pt-2 border-t border-border/60">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Final price
              </Label>
              <div className="flex flex-wrap items-center gap-4">
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={finalPriceValue}
                  onChange={(e) => {
                    const { display } = formatCurrencyInputLive(e.target.value);
                    setFinalPriceValue(display);
                  }}
                  className="h-9 text-sm rounded-md min-w-[7rem] font-mono tabular-nums"
                  disabled={!canUpdate}
                />
                <Select
                  value={String(formData.price_currency || 'INR')}
                  onValueChange={(v) => setField('price_currency', v === 'USD' ? 'USD' : 'INR')}
                  disabled={!canUpdate}
                >
                  <SelectTrigger className="h-9 w-20 text-sm rounded-md">
                    <SelectValue placeholder="INR" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INR">INR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
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
              {(modalFlags ?? [])
                .filter((f) => (f.key ?? '').trim() && (f.label ?? '').trim())
                .filter((f) => flagConditionMatches(f))
                .map((f) => {
                const key = f.key.trim();
                return (
                  <label key={key} className="inline-flex items-center gap-2 px-2 py-1 rounded-md border bg-background">
                    <Checkbox
                      checked={flagValues[key] === true}
                      onCheckedChange={(checked) => setFlagValues((prev) => ({ ...prev, [key]: checked === true }))}
                      disabled={!!applyingStatusValue}
                    />
                    <span className="text-xs text-muted-foreground">{f.label}</span>
                  </label>
                );
              })}
              {effectiveActionButtons!.map((btn) => (
                <Button
                  key={btn.statusValue}
                  type="button"
                  variant="outline"
                  size="default"
                  className="gap-2 h-9 rounded-md"
                  disabled={!!applyingStatusValue}
                  onClick={() => handleActionClick(btn)}
                >
                  {applyingStatusValue === btn.statusValue ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : null}
                  {applyingStatusValue === btn.statusValue ? 'Updating…' : btn.label}
                </Button>
              ))}
            </div>
          )}
          {canUpdate && hasEditableField && effectiveShowSaveButton && (
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

      <Dialog open={isAddVendorModalOpen} onOpenChange={setIsAddVendorModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add vendor</DialogTitle>
            <DialogDescription>Create a new vendor and select it for this record.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Vendor name *"
              value={newVendorName}
              onChange={(e) => setNewVendorName(e.target.value)}
              className="h-9 text-sm"
            />
            <Input
              placeholder="Vendor site link (optional)"
              type="url"
              value={newVendorLink}
              onChange={(e) => setNewVendorLink(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsAddVendorModalOpen(false);
                setNewVendorName('');
                setNewVendorLink('');
              }}
            >
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
    </Dialog>
  );
};
