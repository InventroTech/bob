'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { INVENTORY_REQUEST_STATUSES } from '@/constants/inventory';

export type RecordDetailEntityType =
  | 'inventory_request'
  | 'inventory_cart'
  | 'inventory_item'
  | 'lead'
  | string;

/** Top-level keys that are part of the API record (tenant_id excluded from view). */
const RECORD_TOP_LEVEL_KEYS = ['id', 'entity_type', 'created_at', 'updated_at', 'pyro_data'];

/** Allowed status options per entity type (for status dropdown). */
const ALLOWED_STATUSES: Record<string, string[]> = {
  inventory_item: ['IN_STOCK', 'OUT_OF_STOCK', 'RESERVED', 'DISCONTINUED', 'ON_ORDER'],
  inventory_request: [...INVENTORY_REQUEST_STATUSES],
  inventory_cart: ['DRAFT', 'SUBMITTED', 'PENDING_APPROVAL', 'APPROVED', 'ORDERED', 'CLOSED'],
};

/** Default editable data fields per entity type. total_quantity is computed (allocated + available) for inventory_item. */
const DEFAULT_EDITABLE_BY_ENTITY: Record<string, string[]> = {
  inventory_item: [
    'status',
    'allocated_quantity',
    'available_quantity',
    'location',
    'default_cost_per_unit',
    'default_vendor',
    'active',
  ],
  inventory_request: [
    'status',
    'quantity',
    'vendor',
    'tracking_number',
    'notes',
    'department',
    'sub_department',
    'project_purpose',
    'item_name_freeform',
    'part_number_or_sku',
    'quantity_required',
    'vendor_name',
    'tracking_link',
    'comments',
    'urgency_level',
    'expected_delivery_date',
    'procurement_type',
    'cart_id',
  ],
  inventory_cart: ['status', 'invoice_number', 'payment_terms', 'comments'],
};

/** inventory_request: data keys hidden from requestor (PM-only). Requestor never sees these in the modal. */
const FIELDS_HIDDEN_FROM_REQUESTER: string[] = ['cart_id', 'assigned_to_id'];

/** inventory_request: data keys the requestor is allowed to edit (subset; status and cart/assignee are PM-only). */
const EDITABLE_FIELDS_FOR_REQUESTER: string[] = [
  'department',
  'sub_department',
  'project_purpose',
  'item_name_freeform',
  'part_number_or_sku',
  'quantity_required',
  'comments',
  'urgency_level',
  'expected_delivery_date',
  'procurement_type',
  'quantity',
  'notes',
];

interface RecordDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: any | null;
  entityLabel?: string;
  entityType?: RecordDetailEntityType;
  /** Keys inside record.data that are editable (overrides default by entityType). */
  editableFields?: string[];
  /** Called to PATCH the record. If not provided, fields are read-only. */
  onUpdate?: (recordId: number, patch: { data?: Record<string, unknown> }) => Promise<void>;
  /** Optional list of carts to pick from when editing cart_id on inventory_request. */
  cartOptions?: Array<{ id: number; label: string }>;
  /** Called after a record is deleted so the parent can refresh/remove it. */
  onDeleted?: (recordId: number) => void;
}

/**
 * Build display rows from API-shaped record only:
 * - Standard top-level: id, entity_type, created_at, updated_at, pyro_data (no tenant_id)
 * - All keys from record.data as flat keys; total_quantity for inventory_item shown as allocated + available.
 * - For inventory_cart, ensure cart-level editable fields (status, invoice_number, payment_terms, comments)
 *   always appear even if missing in data so PM can populate them.
 */
function buildDisplayRows(record: any, entityType?: string): Array<{ key: string; value: unknown; inData: boolean }> {
  if (!record || typeof record !== 'object') return [];

  const rows: Array<{ key: string; value: unknown; inData: boolean }> = [];

  for (const k of RECORD_TOP_LEVEL_KEYS) {
    if (!(k in record)) continue;
    const v = record[k];
    if (k === 'data') continue;
    rows.push({ key: k, value: v, inData: false });
  }

  const data = record.data;
  if (data && typeof data === 'object') {
    const alloc = data.allocated_quantity;
    const avail = data.available_quantity;
    const hasNums = typeof alloc === 'number' && typeof avail === 'number';

    for (const [k, v] of Object.entries(data)) {
      let value = v;
      if (entityType === 'inventory_item' && k === 'total_quantity' && hasNums) {
        value = (alloc as number) + (avail as number);
      }
      rows.push({ key: k, value, inData: true });
    }
  }

  // For inventory_cart, make sure core cart-level fields are present even if missing
  if (entityType === 'inventory_cart') {
    const existingDataKeys = new Set(rows.filter((r) => r.inData).map((r) => r.key));
    for (const key of DEFAULT_EDITABLE_BY_ENTITY.inventory_cart) {
      if (!existingDataKeys.has(key)) {
        const value =
          record.data && typeof record.data === 'object'
            ? (record.data as any)[key] ?? ''
            : '';
        rows.push({ key, value, inData: true });
      }
    }
  }

  return rows.sort((a, b) => a.key.localeCompare(b.key));
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
    try {
      const d = new Date(value);
      if (!isNaN(d.getTime())) return d.toLocaleString();
    } catch {
      // keep as-is
    }
  }
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}

const ENTITY_LABELS: Record<string, string> = {
  inventory_request: 'Request',
  inventory_cart: 'Cart',
  inventory_item: 'Item',
  lead: 'Lead',
};

export const RecordDetailModal: React.FC<RecordDetailModalProps> = ({
  open,
  onOpenChange,
  record,
  entityLabel,
  entityType,
  editableFields: editableFieldsProp,
  onUpdate,
  cartOptions,
  onDeleted,
}) => {
  const { toast } = useToast();
  const [pending, setPending] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [proceeding, setProceeding] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const { user } = useAuth();

  const displayRows = record ? buildDisplayRows(record, entityType) : [];
  const statusOptions = entityType ? ALLOWED_STATUSES[entityType] ?? [] : [];
  const canEdit = Boolean(onUpdate && record?.id != null);
  const isInventoryRequest = entityType === 'inventory_request';
  const isInventoryCart = entityType === 'inventory_cart';
  const cartOwnerId = record?.data?.created_by_id;
  const isCartOwner =
    isInventoryCart && !!user && cartOwnerId != null && String(cartOwnerId) === String(user.id);
  const requesterId = record?.data?.requester_id;
  const isRequester =
    isInventoryRequest &&
    !!user &&
    requesterId != null &&
    String(requesterId) === String(user.id);
  const assignedToId = record?.data?.assigned_to_id;
  const isAssignee =
    isInventoryRequest &&
    !!user &&
    assignedToId != null &&
    String(assignedToId) === String(user.id);

  /** Rows to show: for requestor, hide PM-only fields (cart_id, assigned_to_id). */
  const visibleRows =
    isInventoryRequest && isRequester
      ? displayRows.filter((r) => !FIELDS_HIDDEN_FROM_REQUESTER.includes(r.key))
      : displayRows;

  /** Editable keys: requestor gets only EDITABLE_FIELDS_FOR_REQUESTER; PM gets full list for entity. */
  const editableSet = new Set(
    isInventoryRequest && isRequester
      ? (editableFieldsProp ?? EDITABLE_FIELDS_FOR_REQUESTER)
      : (editableFieldsProp ?? (entityType ? DEFAULT_EDITABLE_BY_ENTITY[entityType] ?? [] : []))
  );

  const canEditInventoryRequest = canEdit && (!isInventoryRequest || isRequester);
  /** Only the assigned PM can update status on an inventory request; requester can edit other fields when draft. */
  const canEditStatusForRequest = isInventoryRequest && canEdit && !!user && isAssignee;

  const [cartRequests, setCartRequests] = useState<any[]>([]);
  const [cartRequestsLoading, setCartRequestsLoading] = useState(false);
  const [cartRequestsError, setCartRequestsError] = useState<string | null>(null);
  const [cartRequestsVersion, setCartRequestsVersion] = useState(0);
  const [applyTargetStatus, setApplyTargetStatus] = useState<string>('PAYMENT_PENDING');
  const [copyInvoiceAndTerms, setCopyInvoiceAndTerms] = useState(true);
  const [applyingToCart, setApplyingToCart] = useState(false);
  const [removingFromRequestId, setRemovingFromRequestId] = useState<number | null>(null);
  const [deletingCart, setDeletingCart] = useState(false);
  /** Selected cart id for "Add to existing cart" (string to match Select value). */
  const [selectedCartIdForAdd, setSelectedCartIdForAdd] = useState<string>('');
  /** Carts loaded by modal when parent does not pass cartOptions (PM add-to-cart dropdown). */
  const [modalCartOptions, setModalCartOptions] = useState<Array<{ id: number; label: string }>>([]);
  const [modalCartOptionsLoading, setModalCartOptionsLoading] = useState(false);

  // When PM view and parent did not pass cartOptions, load carts for "Add to existing cart" dropdown
  useEffect(() => {
    if (!open || !isInventoryRequest || isRequester || cartOptions != null) return;
    let cancelled = false;
    const load = async () => {
      try {
        setModalCartOptionsLoading(true);
        const res = await apiClient.get<any>('/crm-records/records/?entity_type=inventory_cart&page_size=100');
        const list: any[] = res.data?.results ?? (res.data as any)?.data ?? [];
        const options = list
          .map((r: any) => {
            const id = r.id;
            const d = r.data || {};
            const status = d.status || 'DRAFT';
            const invoice = d.invoice_number;
            const labelParts = [`Cart #${id}`, `(${status})`];
            if (invoice) labelParts.push(`Invoice: ${invoice}`);
            return { id, label: labelParts.join(' ') };
          })
          .filter((o: any) => o && o.id != null);
        if (!cancelled) setModalCartOptions(options);
      } catch {
        if (!cancelled) setModalCartOptions([]);
      } finally {
        if (!cancelled) setModalCartOptionsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [open, isInventoryRequest, isRequester, cartOptions]);

  // When viewing an inventory_cart, load all inventory_request records linked via cart_id
  useEffect(() => {
    if (!open || !isInventoryCart || !record?.id) return;

    let cancelled = false;

    const loadCartRequests = async () => {
      try {
        setCartRequestsLoading(true);
        setCartRequestsError(null);
        const url = `/crm-records/records/?entity_type=inventory_request&cart_id=${encodeURIComponent(
          String(record.id),
        )}&page_size=100`;
        const res = await apiClient.get<any>(url);
        const list: any[] = res.data?.results ?? (res.data as any)?.data ?? [];
        if (!cancelled) {
          setCartRequests(list);
        }
      } catch (e: any) {
        if (!cancelled) {
          setCartRequests([]);
          setCartRequestsError(e?.message || 'Failed to load requests in this cart.');
        }
      } finally {
        if (!cancelled) {
          setCartRequestsLoading(false);
        }
      }
    };

    loadCartRequests();

    return () => {
      cancelled = true;
    };
  }, [open, isInventoryCart, record?.id, cartRequestsVersion]);

  const handleApplyToAllRequestsInCart = useCallback(async () => {
    if (!isInventoryCart || !record?.id || !applyTargetStatus) return;
    try {
      setApplyingToCart(true);
      await apiClient.post('/crm-records/records/events/', {
        record_id: Number(record.id),
        event: 'inventory_cart.apply_to_requests',
        payload: {
          target_status: applyTargetStatus,
          copy_invoice_and_terms: copyInvoiceAndTerms,
        },
      });
      toast({
        title: 'Cart applied',
        description: `All requests in this cart updated to ${applyTargetStatus}.`,
      });
      setCartRequestsVersion((v) => v + 1);
    } catch (e: any) {
      toast({
        title: 'Apply failed',
        description: e?.message || 'Could not apply to requests in cart.',
        variant: 'destructive',
      });
    } finally {
      setApplyingToCart(false);
    }
  }, [isInventoryCart, record?.id, applyTargetStatus, copyInvoiceAndTerms, toast]);

  const handleRemoveRequestFromCart = useCallback(
    async (req: { id: number; data?: Record<string, unknown> }) => {
      try {
        setRemovingFromRequestId(req.id);
        const nextData = { ...(req.data || {}), cart_id: '' };
        await apiClient.patch(`/crm-records/records/${req.id}/`, { data: nextData });
        toast({ title: 'Removed from cart', description: `Request #${req.id} is no longer in this cart.` });
        setCartRequestsVersion((v) => v + 1);
      } catch (e: any) {
        toast({
          title: 'Remove failed',
          description: e?.message || 'Could not remove request from cart.',
          variant: 'destructive',
        });
      } finally {
        setRemovingFromRequestId(null);
      }
    },
    [toast]
  );

  const handleDeleteCart = useCallback(async () => {
    if (!isInventoryCart || !record?.id) return;
    if (
      !window.confirm(
        'Delete this cart? Requests in it will be unlinked (removed from the cart) but not deleted. This cannot be undone.'
      )
    ) {
      return;
    }
    try {
      setDeletingCart(true);
      // Clear cart_id on all requests in this cart so they don't point to a deleted cart
      for (const req of cartRequests) {
        const nextData = { ...(req.data || {}), cart_id: '' };
        await apiClient.patch(`/crm-records/records/${req.id}/`, { data: nextData });
      }
      await apiClient.delete(`/crm-records/records/${record.id}/`);
      toast({ title: 'Cart deleted', description: 'The cart has been deleted and requests were unlinked.' });
      if (onDeleted) {
        onDeleted(record.id);
      } else {
        onOpenChange(false);
      }
    } catch (e: any) {
      toast({
        title: 'Delete failed',
        description: e?.message || 'Could not delete cart.',
        variant: 'destructive',
      });
    } finally {
      setDeletingCart(false);
    }
  }, [isInventoryCart, record?.id, cartRequests, onDeleted, onOpenChange, toast]);

  const handleSave = useCallback(async (key: string, value: unknown) => {
    if (!onUpdate || record?.id == null) return;
    setSaving(key);
    try {
      const dataPatch: Record<string, unknown> = { [key]: value };
      if (entityType === 'inventory_item' && (key === 'allocated_quantity' || key === 'available_quantity')) {
        const data = record?.data || {};
        const allocated = key === 'allocated_quantity' ? value : (pending.allocated_quantity ?? data.allocated_quantity);
        const available = key === 'available_quantity' ? value : (pending.available_quantity ?? data.available_quantity);
        if (typeof allocated === 'number' && typeof available === 'number') {
          dataPatch.total_quantity = allocated + available;
        }
      }
      await onUpdate(record.id, { data: dataPatch });
      setPending((p) => {
        const next = { ...p };
        delete next[key];
        return next;
      });
      toast({ title: 'Saved', description: `${key} updated.` });
    } catch (e: any) {
      toast({
        title: 'Update failed',
        description: e?.message || 'Could not save.',
        variant: 'destructive',
      });
    } finally {
      setSaving(null);
    }
  }, [onUpdate, record?.id, record?.data, entityType, toast]);

  const handleEditableChange = useCallback((key: string, currentValue: unknown, newValueStr: string) => {
    const row = displayRows.find((r) => r.key === key);
    if (!row) return;
    let parsed: unknown = newValueStr;
    if (typeof row.value === 'number') {
      const n = Number(newValueStr);
      parsed = Number.isNaN(n) ? row.value : n;
    } else if (typeof row.value === 'boolean') {
      parsed = newValueStr === 'true' || newValueStr === '1' || newValueStr.toLowerCase() === 'yes';
    }
    setPending((p) => ({ ...p, [key]: parsed }));
  }, [displayRows]);

  const handleSaveClick = useCallback((key: string, value: unknown) => {
    if (!editableSet.has(key)) return;
    const toSave = pending[key] !== undefined ? pending[key] : value;
    handleSave(key, toSave);
  }, [editableSet, pending, handleSave]);

  const handleDelete = useCallback(async () => {
    if (!isInventoryRequest || !isRequester || !record?.id) return;
    if (!window.confirm('Are you sure you want to delete this request? This cannot be undone.')) {
      return;
    }
    try {
      setDeleting(true);
      await apiClient.delete(`/crm-records/records/${record.id}/`);
      toast({ title: 'Request deleted', description: 'The inventory request has been deleted.' });
      if (onDeleted) {
        onDeleted(record.id);
      } else {
        onOpenChange(false);
      }
    } catch (e: any) {
      toast({
        title: 'Delete failed',
        description: e?.message || 'Could not delete request.',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  }, [isInventoryRequest, isRequester, record?.id, onOpenChange, onDeleted, toast]);

  const handleProceedToRm = useCallback(async () => {
    if (!isInventoryRequest || !isRequester || !record?.id) return;
    const currentStatus = record?.data?.status;
    if (currentStatus && currentStatus !== 'DRAFT') {
      toast({
        title: 'Cannot proceed',
        description: 'Only draft requests can be submitted to RM.',
        variant: 'destructive',
      });
      return;
    }
    try {
      setProceeding(true);
      await apiClient.post('/crm-records/records/events/', {
        record_id: Number(record.id),
        event: 'inventory_request.mark_pending_pm',
        payload: {},
      });
      toast({
        title: 'Request sent to RM',
        description: 'The request has been submitted to the RM for review.',
      });
      onOpenChange(false);
    } catch (e: any) {
      toast({
        title: 'Submission failed',
        description: e?.message || 'Could not submit request to RM.',
        variant: 'destructive',
      });
    } finally {
      setProceeding(false);
    }
  }, [isInventoryRequest, isRequester, record?.id, record?.data?.status, toast, onOpenChange]);

  /** Create a new cart and add this request to it. */
  const handleAddToNewCart = useCallback(async () => {
    if (!isInventoryRequest || !record?.id || !user) return;
    if (addingToCart) return;

    try {
      setAddingToCart(true);
      const createRes = await apiClient.post<any>('/crm-records/records/', {
        entity_type: 'inventory_cart',
        data: {
          status: 'DRAFT',
          created_by_id: user.id,
        },
      });
      if (!createRes.data?.id) {
        throw new Error('Could not create cart.');
      }
      const cartId = Number(createRes.data.id);
      const cartIdAsString = String(cartId);
      const requestData = {
        ...(record.data || {}),
        cart_id: cartIdAsString,
        assigned_to_id: String(user.id),
      };
      if (onUpdate) {
        await onUpdate(Number(record.id), { data: requestData });
      } else {
        await apiClient.patch(`/crm-records/records/${record.id}/`, { data: requestData });
      }
      toast({
        title: 'Added to new cart',
        description: `Request linked to new cart #${cartId}.`,
      });
    } catch (e: any) {
      toast({
        title: 'Add to cart failed',
        description: e?.message || 'Could not create cart or add request.',
        variant: 'destructive',
      });
    } finally {
      setAddingToCart(false);
    }
  }, [isInventoryRequest, record?.id, record?.data, user, onUpdate, toast, addingToCart]);

  /** Add this request to the currently selected existing cart. */
  const handleAddToSelectedCart = useCallback(async () => {
    if (!isInventoryRequest || !record?.id || !user) return;
    const cartId = selectedCartIdForAdd ? Number(selectedCartIdForAdd) : null;
    if (cartId == null || isNaN(cartId)) {
      toast({
        title: 'Select a cart',
        description: 'Choose a cart from the dropdown first.',
        variant: 'destructive',
      });
      return;
    }
    if (addingToCart) return;

    try {
      setAddingToCart(true);
      const cartIdAsString = String(cartId);
      const requestData = {
        ...(record.data || {}),
        cart_id: cartIdAsString,
        assigned_to_id: String(user.id),
      };
      if (onUpdate) {
        await onUpdate(Number(record.id), { data: requestData });
      } else {
        await apiClient.patch(`/crm-records/records/${record.id}/`, { data: requestData });
      }
      setSelectedCartIdForAdd('');
      toast({
        title: 'Added to cart',
        description: `Request linked to cart #${cartId}.`,
      });
    } catch (e: any) {
      toast({
        title: 'Add to cart failed',
        description: e?.message || 'Could not add request to cart.',
        variant: 'destructive',
      });
    } finally {
      setAddingToCart(false);
    }
  }, [isInventoryRequest, record?.id, record?.data, user, selectedCartIdForAdd, onUpdate, toast, addingToCart]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-2 border-b border-gray-200">
          <DialogTitle>
            {entityLabel ||
              (entityType && ENTITY_LABELS[entityType]) ||
              (entityType && entityType.replace(/_/g, ' ')) ||
              'Record'}{' '}
            #{record?.id ?? '—'}
          </DialogTitle>
          <DialogDescription>
            {canEdit ? 'Fields from API. Some can be edited.' : 'Fields from API.'}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
          {visibleRows.length === 0 ? (
            <p className="text-sm text-gray-500">No data to display.</p>
          ) : (
            <dl className="grid gap-3 sm:grid-cols-1">
              {visibleRows.map(({ key, value, inData }) => {
                const isEditable =
                  key === 'status' && isInventoryRequest
                    ? canEditStatusForRequest && editableSet.has(key)
                    : canEditInventoryRequest && inData && editableSet.has(key);
                const displayValue = pending[key] !== undefined ? pending[key] : value;
                const isSaving = saving === key;

                return (
                  <div
                    key={key}
                    className="flex flex-wrap items-center gap-2 border-b border-gray-100 pb-2 last:border-0"
                  >
                    <dt className="text-sm font-medium text-gray-600 shrink-0 min-w-[140px]">
                      {key}
                    </dt>
                    <dd className="text-sm text-gray-900 flex-1 min-w-0">
                      {isEditable ? (
                        <span className="flex items-center gap-2 flex-wrap">
                          {key === 'status' && statusOptions.length > 0 ? (() => {
                            const currentStatus = String(displayValue ?? '').trim();
                            const options = !currentStatus || statusOptions.includes(currentStatus)
                              ? statusOptions
                              : [currentStatus, ...statusOptions];
                            const selectValue = currentStatus && options.includes(currentStatus) ? currentStatus : options[0];
                            return (
                              <Select
                                value={selectValue}
                                onValueChange={(val) => handleEditableChange(key, value, val)}
                                disabled={isSaving}
                              >
                                <SelectTrigger className="max-w-[280px] h-8 text-sm">
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                  {options.map((opt) => (
                                    <SelectItem key={opt} value={opt}>
                                      {opt.replace(/_/g, ' ')}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            );
                          })() : key === 'cart_id' && entityType === 'inventory_request' && cartOptions && cartOptions.length > 0 ? (() => {
                            const currentCartId = displayValue === '—' || displayValue == null ? '' : String(displayValue);
                            const selectValue = currentCartId || '_none_';
                            return (
                              <Select
                                value={selectValue}
                                onValueChange={(val) => {
                                  const normalized = val === '_none_' ? '' : val;
                                  handleEditableChange(key, value, normalized);
                                }}
                                disabled={isSaving}
                              >
                                <SelectTrigger className="max-w-[280px] h-8 text-sm">
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
                            );
                          })() : typeof displayValue === 'boolean' ? (
                            <select
                              className="border rounded px-2 py-1 text-sm max-w-[200px]"
                              value={displayValue ? 'true' : 'false'}
                              onChange={(e) =>
                                handleEditableChange(key, value, e.target.value)
                              }
                              disabled={isSaving}
                            >
                              <option value="true">Yes</option>
                              <option value="false">No</option>
                            </select>
                          ) : (
                            <Input
                              className="max-w-[280px] h-8 text-sm"
                              value={
                                pending[key] !== undefined
                                  ? String(pending[key])
                                  : formatValue(value)
                              }
                              onChange={(e) =>
                                handleEditableChange(key, value, e.target.value)
                              }
                              disabled={isSaving}
                            />
                          )}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8"
                            disabled={isSaving}
                            onClick={() => handleSaveClick(key, value)}
                          >
                            {isSaving ? 'Saving…' : 'Save'}
                          </Button>
                        </span>
                      ) : (
                        formatValue(displayValue)
                      )}
                    </dd>
                  </div>
                );
              })}
            </dl>
          )}
          {isInventoryCart && (
            <div className="mt-4 border-t border-gray-200 pt-3">
              <h6 className="text-sm font-semibold mb-2">Requests in this cart</h6>
              {cartRequestsLoading ? (
                <p className="text-xs text-gray-500">Loading requests…</p>
              ) : cartRequestsError ? (
                <p className="text-xs text-red-500">{cartRequestsError}</p>
              ) : cartRequests.length === 0 ? (
                <p className="text-xs text-gray-500">
                  No inventory requests are linked to this cart yet.
                </p>
              ) : (
                <>
                  <ul className="space-y-1">
                    {cartRequests.map((req) => (
                      <li
                        key={req.id}
                        className="text-xs text-gray-800 flex items-center justify-between gap-2 border-b border-gray-100 pb-1 last:border-0"
                      >
                        <span className="truncate min-w-0">
                          <span className="font-medium">#{req.id}</span>{' '}
                          {req.data?.item_name_freeform ||
                            req.data?.part_number_or_sku ||
                            'Request'}
                        </span>
                        <span className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] uppercase tracking-wide text-gray-500">
                            {req.data?.status || '—'}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                            disabled={removingFromRequestId === req.id}
                            onClick={() => handleRemoveRequestFromCart(req)}
                          >
                            {removingFromRequestId === req.id ? 'Removing…' : 'Remove from cart'}
                          </Button>
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                    <h6 className="text-sm font-medium text-gray-700">Apply to all requests in cart</h6>
                    <p className="text-xs text-gray-500">
                      Set the same status for all requests above and optionally copy this cart&apos;s invoice number and payment terms.
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Select
                        value={applyTargetStatus}
                        onValueChange={setApplyTargetStatus}
                        disabled={applyingToCart}
                      >
                        <SelectTrigger className="w-[200px] h-8 text-sm">
                          <SelectValue placeholder="Target status" />
                        </SelectTrigger>
                        <SelectContent>
                          {(ALLOWED_STATUSES.inventory_request || []).map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {opt.replace(/_/g, ' ')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={copyInvoiceAndTerms}
                          onChange={(e) => setCopyInvoiceAndTerms(e.target.checked)}
                          disabled={applyingToCart}
                          className="rounded border-gray-300"
                        />
                        Update invoice &amp; payment terms
                      </label>
                      <Button
                        type="button"
                        size="sm"
                        className="bg-primary text-white hover:bg-primary/90"
                        disabled={applyingToCart || cartRequests.length === 0}
                        onClick={handleApplyToAllRequestsInCart}
                      >
                        {applyingToCart ? 'Applying…' : 'Apply to all requests'}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
        {isInventoryRequest && isRequester && (
          <div className="flex items-center justify-between gap-3 px-6 pb-4 pt-2 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              className="border-red-200 text-red-600 hover:bg-red-50"
              disabled={deleting || proceeding}
              onClick={handleDelete}
            >
              {deleting ? 'Deleting…' : 'Delete Request'}
            </Button>
            <Button
              type="button"
              className="bg-primary text-white hover:bg-primary/90"
              disabled={deleting || proceeding}
              onClick={handleProceedToRm}
            >
              {proceeding ? 'Submitting…' : 'Proceed to PM'}
            </Button>
          </div>
        )}
        {isInventoryRequest && !isRequester && (() => {
          const cartList = cartOptions ?? modalCartOptions;
          const hasCarts = Array.isArray(cartList) && cartList.length > 0;
          const showSelect = hasCarts && !modalCartOptionsLoading;
          return (
            <div className="px-6 pb-4 pt-2 border-t border-gray-200 space-y-3">
              <p className="text-sm font-medium text-gray-700">Add request to a cart</p>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  className="bg-primary text-white hover:bg-primary/90"
                  disabled={addingToCart || deleting || proceeding}
                  onClick={handleAddToNewCart}
                >
                  {addingToCart ? 'Adding…' : showSelect ? 'Create new cart and add request' : 'Move to cart'}
                </Button>
                {showSelect && (
                  <>
                    <span className="text-xs text-gray-500 shrink-0">or</span>
                    <Select
                      value={selectedCartIdForAdd || '_none_'}
                      onValueChange={(v) => setSelectedCartIdForAdd(v === '_none_' ? '' : v)}
                      disabled={addingToCart}
                    >
                      <SelectTrigger className="w-[220px] h-9">
                        <SelectValue placeholder="Select a cart" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none_">Select a cart…</SelectItem>
                        {cartList.map((opt) => (
                          <SelectItem key={opt.id} value={String(opt.id)}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-primary text-primary hover:bg-primary/10"
                      disabled={addingToCart || !selectedCartIdForAdd || deleting || proceeding}
                      onClick={handleAddToSelectedCart}
                    >
                      {addingToCart ? 'Adding…' : 'Add to selected cart'}
                    </Button>
                  </>
                )}
              </div>
            </div>
          );
        })()}
        {isInventoryCart && isCartOwner && (
          <div className="flex items-center justify-end gap-3 px-6 pb-4 pt-2 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              className="border-red-200 text-red-600 hover:bg-red-50"
              disabled={deletingCart || applyingToCart}
              onClick={handleDeleteCart}
            >
              {deletingCart ? 'Deleting…' : 'Delete cart'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
