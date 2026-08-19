/** State, effects, and handlers for RecordDetailModal. */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { apiClient, membershipService } from '@/lib/api';
import { crmRecordsApi } from '@/lib/api/services/crmRecords';
import { useAuth } from '@/hooks/useAuth';
import { ALLOWED_STATUSES } from '@/constants/inventory';
import { formatCurrencyInputLive, formatPriceForInput, PRICE_FIELD_KEYS } from '@/lib/utils/currencyFormat';
import { applyInventoryCartStatusSideEffects, canRequesterEditInventoryRequest, getInventoryWorkflowButtons, inventoryRequesterIdFromRecord, isInventoryRequestRowRequester } from '@/lib/inventory/workflow';
import type { StatusActionWithWarningConfig } from '@/components/config_components/StatusActionWarningModal';
import type { RequestHistoryEntry } from '@/components/page-builder/RequestHistoryPanel';
import type { RecordDetailModalProps } from './types';
import {
  DEFAULT_EDITABLE_BY_ENTITY,
  FIELDS_HIDDEN_FOR_ALL,
  FIELDS_HIDDEN_FROM_REQUESTER,
  EDITABLE_FIELDS_FOR_REQUESTER,
  FINAL_PRICE_HIDDEN_ROW_KEYS,
  toVendorStorageName,
  buildDisplayRows,
  isDetailValueEmpty,
} from './utils';

export function useRecordDetailModal({
  open,
  onOpenChange,
  record,
  entityLabel: _entityLabel,
  entityType,
  editableFields: editableFieldsProp,
  onUpdate,
  onDeleted,
  onRecordUpdated,
  actionButtons,
  modalFlags,
  showFinalPriceSection,
  showDeleteRequestButton,
  showHistoryButton,
}: RecordDetailModalProps) {
  const { toast } = useToast();
  const [pending, setPending] = useState<Record<string, unknown>>({});
  /** Live-formatted price strings while typing in editable price fields. */
  const [priceInputDraft, setPriceInputDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { user } = useAuth();
  const myName =
    user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || '—';
  const [myRoleName, setMyRoleName] = useState<string>('');

  const displayRows = record ? buildDisplayRows(record, entityType) : [];
  const statusOptions = entityType ? ALLOWED_STATUSES[entityType] ?? [] : [];
  const canEdit = Boolean(onUpdate && record?.id != null);
  const isInventoryRequest =
    entityType === 'inventory_request' || entityType === 'unmannd_request';
  const requesterId = inventoryRequesterIdFromRecord(record);
  const [myMembershipId, setMyMembershipId] = useState<number | null>(null);
  const isRequester =
    isInventoryRequest &&
    isInventoryRequestRowRequester(requesterId, user?.id ?? null, myMembershipId);
  const assignedToId = record?.data?.assigned_to_id;
  const isAssignee =
    isInventoryRequest &&
    !!user &&
    assignedToId != null &&
    (String(assignedToId) === String(user.id) ||
      (myMembershipId != null && String(assignedToId) === String(myMembershipId)));

  const effectiveShowFinalPrice = showFinalPriceSection !== false;
  const canShowDeleteRequestButton = showDeleteRequestButton === true;
  const canShowHistoryButton = showHistoryButton === true && record?.id != null;

  const requestStatusForWorkflow =
    (pending.status !== undefined ? pending.status : record?.data?.status) ??
    (record?.data && typeof record.data === 'object'
      ? (record.data as Record<string, unknown>).status ??
        (record.data as Record<string, unknown>).status_text
      : undefined);
  const requesterWorkflowButtons =
    isInventoryRequest && isRequester
      ? getInventoryWorkflowButtons({
          requestStatus: requestStatusForWorkflow,
          isRequester: true,
        })
      : [];

  /** Rows to show: hide system fields for all users, and PM-only fields for requestors. */
  const visibleRows = displayRows.filter((r) => {
    // Hide system fields for all users
    if (FIELDS_HIDDEN_FOR_ALL.includes(r.key)) return false;
    // Hide PM-only fields for requestors
    if (isInventoryRequest && isRequester && FIELDS_HIDDEN_FROM_REQUESTER.includes(r.key)) return false;
    if (!effectiveShowFinalPrice && FINAL_PRICE_HIDDEN_ROW_KEYS.has(r.key)) return false;
    return true;
  });

  /** Editable keys: requestor gets only EDITABLE_FIELDS_FOR_REQUESTER; PM gets full list for entity. */
  const editableSet = new Set(
    isInventoryRequest && isRequester
      ? (editableFieldsProp ?? EDITABLE_FIELDS_FOR_REQUESTER)
      : (editableFieldsProp ?? (entityType ? DEFAULT_EDITABLE_BY_ENTITY[entityType] ?? [] : []))
  );

  const canEditInventoryRequest =
    canEdit &&
    (!isInventoryRequest ||
      (isRequester && canRequesterEditInventoryRequest(requestStatusForWorkflow)));
  /** Only the assigned PM can update status on an inventory request; requester can edit other fields when draft. */
  const canEditStatusForRequest = isInventoryRequest && canEdit && !!user && isAssignee;

  /** Omit empty read-only fields; keep editable rows so users can fill them. */
  const rowsForDisplay = useMemo(() => {
    const editableKeys = new Set(
      isInventoryRequest && isRequester
        ? (editableFieldsProp ?? EDITABLE_FIELDS_FOR_REQUESTER)
        : (editableFieldsProp ?? (entityType ? DEFAULT_EDITABLE_BY_ENTITY[entityType] ?? [] : [])),
    );
    return visibleRows.filter((r) => {
      const isEditable =
        r.key === 'status' && isInventoryRequest
          ? canEditStatusForRequest && editableKeys.has(r.key)
          : canEditInventoryRequest && r.inData && editableKeys.has(r.key);
      const displayValue = pending[r.key] !== undefined ? pending[r.key] : r.value;
      if (isEditable) return true;
      return !isDetailValueEmpty(r.key, displayValue);
    });
  }, [
    visibleRows,
    pending,
    isInventoryRequest,
    isRequester,
    editableFieldsProp,
    entityType,
    canEditStatusForRequest,
    canEditInventoryRequest,
  ]);

  /** When set, an action button is applying that status value (loading). */
  const [applyingStatusValue, setApplyingStatusValue] = useState<string | null>(null);
  const [flagValues, setFlagValues] = useState<Record<string, boolean>>({});
  const [vendors, setVendors] = useState<Array<{ id: number; name: string }>>([]);
  const [vendorsLoading, setVendorsLoading] = useState(false);
  const [isAddVendorModalOpen, setIsAddVendorModalOpen] = useState(false);
  const [newVendorName, setNewVendorName] = useState('');
  const [newVendorLink, setNewVendorLink] = useState('');
  const [savingNewVendor, setSavingNewVendor] = useState(false);
  const [pendingWarningAction, setPendingWarningAction] = useState<StatusActionWithWarningConfig | null>(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyEntries, setHistoryEntries] = useState<RequestHistoryEntry[]>([]);

  useEffect(() => {
    setPriceInputDraft({});
  }, [record?.id, open]);

  useEffect(() => {
    if (!open || !user) return;
    let cancelled = false;
    const load = async () => {
      try {
        const membership = await membershipService.getMyMembership();
        if (cancelled) return;
        setMyRoleName(membership?.role_name ?? membership?.role_key ?? '');
        const mid = membership?.tenant_membership_id;
        setMyMembershipId(
          typeof mid === 'number' && Number.isFinite(mid) ? mid : mid != null ? Number(mid) : null
        );
      } catch {
        // Non-fatal
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [open, user]);

  useEffect(() => {
    const hasEditableVendorField =
      open &&
      visibleRows.some(
        (r) => (r.key === 'vendor' || r.key === 'vendor_name') && editableSet.has(r.key),
      );
    if (!hasEditableVendorField) return;
    let cancelled = false;
    const load = async () => {
      try {
        setVendorsLoading(true);
        const list = await crmRecordsApi.listRecords({ entity_type: 'unmannd_vendor', page_size: 500 });
        const options = list
          .map((r: any) => {
            const id = r.id ?? r.data?.id;
            const name = (r.data?.vendor_name ?? r.vendor_name ?? r.data?.name ?? '').trim();
            return id != null && name ? { id: Number(id), name } : null;
          })
          .filter(Boolean) as Array<{ id: number; name: string }>;
        if (!cancelled) setVendors(options);
      } catch {
        if (!cancelled) setVendors([]);
      } finally {
        if (!cancelled) setVendorsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [open, visibleRows, editableSet]);

  const saveNewVendor = useCallback(async () => {
    const name = toVendorStorageName((newVendorName ?? '').trim());
    if (!name) {
      toast({ title: 'Enter vendor name', variant: 'destructive' });
      return;
    }
    try {
      setSavingNewVendor(true);
      await crmRecordsApi.createRecord({
        entity_type: 'unmannd_vendor',
        data: { vendor_name: name, ...(newVendorLink.trim() ? { vendor_site_link: newVendorLink.trim() } : {}) },
      });
      setPending((p) => ({ ...p, vendor: name }));
      setVendors((prev) => [{ id: Date.now(), name }, ...prev.filter((v) => v.name !== name)]);
      setIsAddVendorModalOpen(false);
      setNewVendorName('');
      setNewVendorLink('');
      toast({ title: 'Vendor added' });
    } catch (e: any) {
      toast({
        title: 'Failed to add vendor',
        description: e?.message || 'Could not add vendor.',
        variant: 'destructive',
      });
    } finally {
      setSavingNewVendor(false);
    }
  }, [newVendorName, newVendorLink, toast]);

  useEffect(() => {
    const data = (record?.data && typeof record.data === 'object' ? (record.data as Record<string, unknown>) : {}) ?? {};
    const next: Record<string, boolean> = {};
    (modalFlags ?? []).forEach((flag) => {
      const key = (flag.key ?? '').trim();
      if (!key) return;
      const existing = data[key];
      next[key] = typeof existing === 'boolean' ? existing : flag.enabled === true;
    });
    setFlagValues(next);
  }, [record?.id, record?.data, modalFlags]);

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

      // Prefer the edited/pending value (if any) over record value.
      const raw =
        pending?.[attribute] !== undefined
          ? pending?.[attribute]
          : (record?.data as any)?.[attribute];

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
    [pending, record?.data]
  );

  const actionButtonConditionMatches = useCallback(
    (btn: {
      label: string;
      statusValue: string;
      conditional?: { attribute: string; operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq'; value: string | number };
    }) => {
      const cond = btn.conditional;
      if (!cond?.attribute || !cond.attribute.trim()) return true;
      const attribute = cond.attribute.trim();
      const raw =
        pending?.[attribute] !== undefined
          ? pending?.[attribute]
          : (record?.data as any)?.[attribute];
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
          return rawLower === valLower;
        default:
          return false;
      }
    },
    [pending, record?.data]
  );

  const handleSave = useCallback(async (key: string, value: unknown) => {
    if (!onUpdate || record?.id == null) return;
    setSaving(key);
    try {
      let dataPatch: Record<string, unknown> = { [key]: value };
      if ((key === 'vendor' || key === 'vendor_name') && typeof value === 'string') {
        dataPatch[key] = toVendorStorageName(value);
      }
      if (key === 'comments') {
        const existingRaw = (record?.data as any)?.comments;
        const existingHistory: Array<{ name: string; role: string; comment: string }> = [];
        if (Array.isArray(existingRaw)) {
          existingHistory.push(...(existingRaw as any));
        } else if (typeof existingRaw === 'string' && existingRaw.trim()) {
          existingHistory.push({ name: '', role: '', comment: existingRaw.trim() });
        }

        const commentText = typeof value === 'string' ? value.trim() : '';
        if (commentText) {
          existingHistory.push({ name: myName, role: myRoleName ?? '', comment: commentText });
        }

        dataPatch = { comments: existingHistory };
      }
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
  }, [onUpdate, record?.id, record?.data, entityType, toast, pending, myName, myRoleName]);

  const handleEditableChange = useCallback((key: string, currentValue: unknown, newValueStr: string) => {
    const row = displayRows.find((r) => r.key === key);
    if (!row) return;
    if (PRICE_FIELD_KEYS.has(key)) {
      const { display, value: parsed } = formatCurrencyInputLive(newValueStr);
      setPriceInputDraft((prev) => ({ ...prev, [key]: display }));
      setPending((p) => ({ ...p, [key]: parsed === '' ? '' : parsed }));
      return;
    }
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
      const toSave =
        (key === 'vendor' || key === 'vendor_name') && typeof (pending[key] !== undefined ? pending[key] : value) === 'string'
          ? toVendorStorageName(String(pending[key] !== undefined ? pending[key] : value))
          : (pending[key] !== undefined ? pending[key] : value);
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

  /** Apply status and save configured flag checkboxes as true/false. */
  const handleActionButtonClick = useCallback(
    async (btn: { label: string; statusValue: string; targetAttribute?: string; statusText?: string }, extraData?: Record<string, unknown>) => {
      if (!record?.id || !onUpdate) return;
      try {
        setApplyingStatusValue(btn.statusValue);
        const targetAttribute = (btn.targetAttribute || 'status').trim() || 'status';
        const existingData = (record.data as Record<string, unknown>) || {};
        const payload: Record<string, unknown> = {
          ...existingData,
          ...pending,
          [targetAttribute]: btn.statusValue,
          ...(extraData || {}),
        };
        if (targetAttribute === 'status') {
          payload.status_text = (btn.statusText ?? btn.label ?? btn.statusValue).trim();
          applyInventoryCartStatusSideEffects({
            previousStatus: existingData.status,
            nextStatus: btn.statusValue,
            data: payload,
          });
        }

        // Stage comments history: append a new `{name, role, comment}` object into `data.comments[]`
        if (Object.prototype.hasOwnProperty.call(existingData, 'comments') || typeof pending?.comments !== 'undefined') {
          const existingRaw = existingData.comments;
          const existingHistory: Array<{ name: string; role: string; comment: string }> = [];
          if (Array.isArray(existingRaw)) {
            existingHistory.push(...(existingRaw as any));
          } else if (typeof existingRaw === 'string' && existingRaw.trim()) {
            existingHistory.push({ name: '', role: '', comment: existingRaw.trim() });
          }

          const commentText = typeof pending.comments === 'string' ? pending.comments.trim() : '';
          if (commentText) {
            existingHistory.push({ name: myName, role: myRoleName ?? '', comment: commentText });
          }
          payload.comments = existingHistory;
        }

        (modalFlags ?? [])
          .filter((f) => flagConditionMatches(f))
          .forEach((flag) => {
          const key = (flag.key ?? '').trim();
          if (!key) return;
          payload[key] = flagValues[key] === true;
          });
        await onUpdate(record.id, { data: payload });
        toast({
          title: 'Updated',
          description: `${targetAttribute} set to ${btn.statusValue.replace(/_/g, ' ')}.`,
        });
        onRecordUpdated?.(record.id);
        onOpenChange(false);
      } catch (e: any) {
        toast({
          title: 'Update failed',
          description: e?.message || 'Could not update status.',
          variant: 'destructive',
        });
      } finally {
        setApplyingStatusValue(null);
      }
    },
    [record?.id, record?.data, onUpdate, toast, onRecordUpdated, onOpenChange, modalFlags, flagValues, pending, myName, myRoleName, flagConditionMatches]
  );

  const handleOpenHistory = useCallback(async () => {
    if (!record?.id) return;
    setHistoryModalOpen(true);
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const response = await apiClient.get(`/crm-records/records/${record.id}/history/`);
      const list = Array.isArray(response?.data?.history) ? response.data.history : [];
      setHistoryEntries(list as RequestHistoryEntry[]);
    } catch (e: any) {
      setHistoryEntries([]);
      setHistoryError(e?.message || 'Could not load request history.');
    } finally {
      setHistoryLoading(false);
    }
  }, [record?.id]);

  return {
    open,
    onOpenChange,
    record,
    _entityLabel,
    entityType,
    editableFieldsProp,
    onUpdate,
    onDeleted,
    onRecordUpdated,
    actionButtons,
    modalFlags,
    showFinalPriceSection,
    showDeleteRequestButton,
    showHistoryButton,
    toast,
    pending,
    setPending,
    priceInputDraft,
    setPriceInputDraft,
    saving,
    setSaving,
    deleting,
    setDeleting,
    user,
    myName,
    myRoleName,
    setMyRoleName,
    displayRows,
    statusOptions,
    canEdit,
    isInventoryRequest,
    requesterId,
    myMembershipId,
    setMyMembershipId,
    isRequester,
    assignedToId,
    isAssignee,
    effectiveShowFinalPrice,
    canShowDeleteRequestButton,
    canShowHistoryButton,
    requestStatusForWorkflow,
    requesterWorkflowButtons,
    visibleRows,
    editableSet,
    canEditInventoryRequest,
    canEditStatusForRequest,
    rowsForDisplay,
    applyingStatusValue,
    setApplyingStatusValue,
    flagValues,
    setFlagValues,
    vendors,
    setVendors,
    vendorsLoading,
    setVendorsLoading,
    isAddVendorModalOpen,
    setIsAddVendorModalOpen,
    newVendorName,
    setNewVendorName,
    newVendorLink,
    setNewVendorLink,
    savingNewVendor,
    setSavingNewVendor,
    pendingWarningAction,
    setPendingWarningAction,
    historyModalOpen,
    setHistoryModalOpen,
    historyLoading,
    setHistoryLoading,
    historyError,
    setHistoryError,
    historyEntries,
    setHistoryEntries,
    saveNewVendor,
    flagConditionMatches,
    actionButtonConditionMatches,
    handleSave,
    handleEditableChange,
    handleSaveClick,
    handleDelete,
    handleActionButtonClick,
    handleOpenHistory,
  };
}

export type RecordDetailModalModel = ReturnType<typeof useRecordDetailModal>;
