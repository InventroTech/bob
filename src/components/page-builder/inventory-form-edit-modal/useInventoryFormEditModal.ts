/** State, effects, and handlers for the inventory form edit modal. */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { apiClient, membershipService } from '@/lib/api';
import { ALLOWED_STATUSES } from '@/constants/inventory';
import { formatCurrencyDisplay, formatCurrencyInputLive, parseCurrencyInput } from '@/lib/utils/currencyFormat';
import { formatCalendarDate } from '@/lib/utils/timeUtils';
import {
  resolvePriorityFromRow,
  inventoryPriorityFieldCardClassName,
  inventoryPriorityValueTextClassName,
} from '@/lib/inventory/priority';
import { getInventoryStatusLabel, getInventoryStatusToneClass } from '@/lib/inventory/statusStyles';
import { urgencyToneButtonClassName } from '@/lib/utils/urgencyButtonStyles';
import { cn } from '@/lib/utils';
import {
  SHIPMENT_STATUSES,
  DEFAULT_SHIPMENT_STATUS,
  normalizeTrackingPaste,
  advanceShipmentStatusForTracking,
  shouldShowShipmentTrackingSection,
  fetchLiveShipmentStatus,
  shipmentDetailsFromTrackResult,
  publicTrackingLink,
  normalizeCourierLabel,
  type ShipmentTrackDetails,
} from '@/lib/inventory/shipmentTracking';
import {
  applyInventoryCartStatusSideEffects,
  canRequesterEditInventoryRequest,
  filterDuplicateInventoryWorkflowButtons,
  getInventoryWorkflowButtons,
  inventoryRequesterIdFromRecord,
  isInventoryRequestRowRequester,
  INVENTORY_REQUESTER_EDITABLE_FORM_KEYS,
} from '@/lib/inventory/workflow';
import type { RequestHistoryEntry } from '@/components/page-builder/RequestHistoryPanel';
import type { StatusActionWithWarningConfig } from '@/components/config_components/StatusActionWarningModal';
import type { InventoryFormEditModalProps, StatusHistoryEntry } from './types';
import {
  TRACKING_FORM_KEYS,
  RECORDS_URL,
  ADD_VENDOR_VALUE,
  toVendorStorageName,
  resolveVendorDisplayName,
  looksLikeUrl,
  isLinkLikeFieldKey,
  formatDisplayValue,
  formatPriceFieldDisplay,
  toCurrencyNumber,
  TEXTAREA_KEYS,
  NUMBER_KEYS,
  PRICE_KEYS,
} from './utils';

export function useInventoryFormEditModal({

  open,
  onOpenChange,
  record,
  entityType,
  formModalFields,
  actionButtons,
  onUpdate,
  onRecordUpdated,
  formModalTitle,
  formModalDescription: _formModalDescription,
  showSaveButton,
  inventoryWorkflowMode,
  paymentButtonConfig,
  modalFlags,
  showFinalPriceSection,
  showDeleteRequestButton,
  showHistoryButton,
  onDeleted,
  uiVariant = 'default',
}: InventoryFormEditModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [applyingStatusValue, setApplyingStatusValue] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [vendors, setVendors] = useState<Array<{ id: number; name: string }>>([]);
  const [vendorsLoading, setVendorsLoading] = useState(false);
  const [isAddVendorModalOpen, setIsAddVendorModalOpen] = useState(false);
  const [newVendorName, setNewVendorName] = useState('');
  const [newVendorLink, setNewVendorLink] = useState('');
  const [savingNewVendor, setSavingNewVendor] = useState(false);
  const [pendingWarningAction, setPendingWarningAction] = useState<StatusActionWithWarningConfig | null>(null);
  const [finalPriceValue, setFinalPriceValue] = useState<string>('');
  const [finalPriceIsTotal, setFinalPriceIsTotal] = useState<boolean>(false);
  const [extraChargesDraft, setExtraChargesDraft] = useState<string>('');
  const [negotiatedValueDraft, setNegotiatedValueDraft] = useState<string>('');
  /** Live-formatted strings for price form fields while typing (cleared on blur). */
  const [priceFieldDraft, setPriceFieldDraft] = useState<Record<string, string>>({});
  const [flagValues, setFlagValues] = useState<Record<string, boolean>>({});
  const [myRoleName, setMyRoleName] = useState<string>('');
  const [myRoleKey, setMyRoleKey] = useState<string>('');
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyEntries, setHistoryEntries] = useState<RequestHistoryEntry[]>([]);
  const [trackingPasteDraft, setTrackingPasteDraft] = useState('');
  const [myMembershipId, setMyMembershipId] = useState<number | null>(null);
  const [trackingLiveLoading, setTrackingLiveLoading] = useState(false);
  const [trackingStatusDetail, setTrackingStatusDetail] = useState<string | null>(null);
  const [trackingDetails, setTrackingDetails] = useState<ShipmentTrackDetails | null>(null);

  const myName =
    user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || '—';

  const statusOptions = entityType
    ? (ALLOWED_STATUSES[entityType] ??
        (entityType === 'unmannd_request' ? ALLOWED_STATUSES.inventory_request : []) ??
        [])
    : [];
  const isInventoryRequest =
    entityType === 'inventory_request' || entityType === 'unmannd_request';
  const requesterId = inventoryRequesterIdFromRecord(record);
  const isRequester =
    isInventoryRequest &&
    isInventoryRequestRowRequester(requesterId, user?.id ?? null, myMembershipId);
  const canShowDeleteRequestButton =
    showDeleteRequestButton === true &&
    isInventoryRequest &&
    isRequester &&
    !paymentButtonConfig;
  const canShowHistoryButton = showHistoryButton === true && record?.id != null;
  const canUpdate = Boolean(onUpdate && record?.id != null);
  const requestStatusForEdit =
    (formData.status != null && String(formData.status).trim() !== ''
      ? formData.status
      : undefined) ??
    (record?.data && typeof record.data === 'object'
      ? (record.data as Record<string, unknown>).status
      : undefined) ??
    (record as { status?: unknown } | null)?.status;
  const requesterMayEdit =
    isRequester && canRequesterEditInventoryRequest(requestStatusForEdit);
  /** Requestors can edit fields until the request is approved. */
  const canEditFields = canUpdate && (!isRequester || requesterMayEdit);
  const isPaymentModal = Boolean(paymentButtonConfig);
  const hasPriceFieldInForm = formModalFields.some((f) => PRICE_KEYS.has(f.key));
  const effectiveShowFinalPrice = showFinalPriceSection !== false && !isRequester;

  useEffect(() => {
    if (!open || !user) return;
    let cancelled = false;

    const load = async () => {
      try {
        const membership = await membershipService.getMyMembership();
        if (cancelled) return;
        setMyRoleName(membership?.role_name ?? '');
        setMyRoleKey(membership?.role_key ?? '');
        const mid = membership?.tenant_membership_id;
        setMyMembershipId(typeof mid === 'number' && Number.isFinite(mid) ? mid : mid != null ? Number(mid) : null);
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

  /** Parents rebuild formModalFields each render; hydrate off a stable key instead. */
  const formModalFieldsRef = useRef(formModalFields);
  formModalFieldsRef.current = formModalFields;
  const formModalFieldsKey = useMemo(
    () => formModalFields.map((f) => f.key).join('\u0000'),
    [formModalFields]
  );
  const hasVendorField =
    formModalFieldsKey.split('\u0000').includes('vendor') ||
    formModalFieldsKey.split('\u0000').includes('vendor_name');
  const hydratedRecordIdRef = useRef<number | string | null | undefined>(undefined);

  const applyLiveTrackingResult = useCallback(
    (result: Awaited<ReturnType<typeof fetchLiveShipmentStatus>>): Record<string, unknown> => {
      console.log('[shipment-track] apply result to form', {
        ok: result.ok,
        incomingStatus: result.shipment_status,
        statusDetail: result.status_detail,
        error: result.error,
        method: result.method,
        courier: result.courier_name,
      });
      const patch: Record<string, unknown> = {};
      // Never overwrite a real AWB with HTML-scrape junk like "Shipment".
      const incomingNumber = String(result.tracking_number ?? '').trim();
      const looksLikeValidAwb =
        incomingNumber.length >= 8 &&
        incomingNumber.length <= 40 &&
        /\d/.test(incomingNumber) &&
        !/^(shipment|tracking|delivered|delivery|exception|aftership|bluedart|package|courier|status|transit|ordered)$/i.test(
          incomingNumber
        );
      if (looksLikeValidAwb) {
        setField('tracking_number', incomingNumber);
        patch.tracking_number = incomingNumber;
      }
      // Always fill tracking link when the user only pasted an AWB.
      if (result.tracking_link) {
        setField('tracking_link', result.tracking_link);
        patch.tracking_link = result.tracking_link;
      } else if (result.tracking_number) {
        const synthesized = publicTrackingLink(result.tracking_number, result.courier_name);
        if (synthesized) {
          setField('tracking_link', synthesized);
          patch.tracking_link = synthesized;
        }
      }
      // Only overwrite courier on a confirmed live hit.
      if (result.ok === true && result.courier_name) {
        const label = normalizeCourierLabel(result.courier_name) || String(result.courier_name);
        setField('courier_name', label);
        patch.courier_name = label;
      }
      if (result.eta) {
        const eta = String(result.eta).slice(0, 10);
        setField('eta', eta);
        patch.eta = eta;
      }
      setTrackingStatusDetail(
        result.status_detail ||
          (result.ok === false && result.error ? result.error : null)
      );
      setTrackingDetails(shipmentDetailsFromTrackResult(result));
      // Soft / pending failures must not move the pipeline.
      if (result.ok === false) {
        console.warn('[shipment-track] live track not confirmed — pipeline left unchanged', {
          error: result.error,
          statusDetail: result.status_detail,
        });
        if (Object.keys(patch).length > 0) {
          patch.tracking_updated_at = new Date().toISOString();
          setField('tracking_updated_at', patch.tracking_updated_at);
        }
        return patch;
      }
      if (!result.shipment_status) {
        console.warn('[shipment-track] no shipment_status in response — pipeline unchanged');
        if (Object.keys(patch).length > 0) {
          patch.tracking_updated_at = new Date().toISOString();
          setField('tracking_updated_at', patch.tracking_updated_at);
        }
        return patch;
      }
      const incoming = String(result.shipment_status).trim().toUpperCase().replace(/\s+/g, '_');
      console.log('[shipment-track] setting pipeline (ok)', incoming);
      setField('shipment_status', incoming);
      patch.shipment_status = incoming;
      patch.tracking_updated_at = new Date().toISOString();
      setField('tracking_updated_at', patch.tracking_updated_at);
      return patch;
    },
    [setField]
  );

  const persistShipmentTrackingPatch = useCallback(
    async (patch: Record<string, unknown>) => {
      if (!onUpdate || record?.id == null || Object.keys(patch).length === 0) return;
      try {
        await onUpdate(record.id, { data: patch });
      } catch (err) {
        console.error('[shipment-track] failed to auto-persist tracking fields', err);
      }
    },
    [onUpdate, record?.id]
  );

  const refreshLiveTracking = useCallback(
    async (overrides?: {
      tracking_number?: string | null;
      tracking_link?: string | null;
      courier_name?: string | null;
      silent?: boolean;
    }) => {
      const number = String(overrides?.tracking_number ?? formData.tracking_number ?? '').trim();
      const link = String(overrides?.tracking_link ?? formData.tracking_link ?? '').trim();
      const courier = String(overrides?.courier_name ?? formData.courier_name ?? '').trim();
      if (!number && !link) {
        if (!overrides?.silent) {
          toast({
            title: 'Add tracking first',
            description: 'Paste a tracking number or link to refresh the delivery pipeline.',
            variant: 'destructive',
          });
        }
        return;
      }
      setTrackingLiveLoading(true);
      try {
        const result = await fetchLiveShipmentStatus({
          tracking_number: number || null,
          tracking_link: link || null,
          courier_name: courier || null,
        });
        const patch = applyLiveTrackingResult(result);
        // Persist identifiers on soft-fail; full pipeline fields when ok.
        if (Object.keys(patch).length > 0) {
          await persistShipmentTrackingPatch(patch);
        }
        if (!overrides?.silent) {
          toast({
            title: result.ok ? 'Tracking updated' : 'Tracking checked',
            description: result.ok
              ? `Pipeline: ${String(result.shipment_status || '').replace(/_/g, ' ')}`
              : result.error || 'Saved identifiers; live carrier status was unavailable.',
          });
        }
      } catch (err) {
        console.error('Live shipment track failed', err);
        setTrackingStatusDetail('Live tracking timed out. Try Refresh again in a moment.');
        // Keep any previously loaded route/events on timeout.
        if (!overrides?.silent) {
          toast({
            title: 'Live tracking timed out',
            description: 'Could not reach the carrier in time. Try Refresh again.',
            variant: 'destructive',
          });
        }
      } finally {
        setTrackingLiveLoading(false);
      }
    },
    [
      formData.tracking_number,
      formData.tracking_link,
      formData.courier_name,
      applyLiveTrackingResult,
      persistShipmentTrackingPatch,
      toast,
    ]
  );

  const refreshLiveTrackingRef = useRef(refreshLiveTracking);
  refreshLiveTrackingRef.current = refreshLiveTracking;

  const applyTrackingPaste = useCallback(
    async (raw: string, { clearDraft = false }: { clearDraft?: boolean } = {}) => {
      const paste = raw.trim();
      if (!paste) return;
      const normalized = normalizeTrackingPaste(paste);
      // Bare AWB → number only. Do NOT invent an AfterShip URL before live lookup —
      // that breaks carrier resolution (same path as typing into Tracking number).
      const nextNumber = normalized.tracking_number || null;
      const nextLink = normalized.tracking_link || null;
      if (nextNumber) setField('tracking_number', nextNumber);
      if (nextLink) {
        setField('tracking_link', nextLink);
      } else if (nextNumber) {
        // Clear a stale link so live track uses AWB-only (like the old Tracking no field).
        setField('tracking_link', '');
      }
      const nextStatus = advanceShipmentStatusForTracking(
        formData.shipment_status,
        Boolean(nextLink || nextNumber)
      );
      if (nextStatus) setField('shipment_status', nextStatus);
      if (clearDraft) setTrackingPasteDraft('');
      await refreshLiveTracking({
        tracking_number: nextNumber,
        // Only send a real pasted URL — never a synthesized aftership.com link.
        tracking_link: nextLink,
        courier_name: String(formData.courier_name ?? '') || null,
      });
    },
    [
      formData.shipment_status,
      formData.courier_name,
      setField,
      refreshLiveTracking,
    ]
  );

  const fetchVendors = useCallback(async () => {
    try {
      setVendorsLoading(true);
      const res = await apiClient.get<any>(`${RECORDS_URL}?entity_type=unmannd_vendor&page_size=500`);
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
    if (open && hasVendorField) fetchVendors();
  }, [open, hasVendorField, fetchVendors]);

  const saveNewVendor = useCallback(async () => {
    const name = toVendorStorageName((newVendorName ?? '').trim());
    if (!name) {
      toast({ title: 'Enter vendor name', variant: 'destructive' });
      return;
    }
    try {
      setSavingNewVendor(true);
      await apiClient.post(RECORDS_URL, {
        entity_type: 'unmannd_vendor',
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
      setExtraChargesDraft('');
      setNegotiatedValueDraft('');
      setPriceFieldDraft({});
      setTrackingPasteDraft('');
      hydratedRecordIdRef.current = undefined;
      return;
    }
    const data = record.data && typeof record.data === 'object' ? (record.data as Record<string, unknown>) : {};
    const recordAny = record as Record<string, unknown>;
    setPriceFieldDraft({});
    // Only clear live tracking display when switching to a different request — a
    // re-sync of the same record must not wipe the pipeline / scan history.
    const switchedRecord = hydratedRecordIdRef.current !== record.id;
    hydratedRecordIdRef.current = record.id;
    if (switchedRecord) {
      setTrackingStatusDetail(null);
      setTrackingDetails(null);
    }
    const initial: Record<string, unknown> = {};
    formModalFieldsRef.current.forEach((f) => {
      const val = data[f.key] ?? recordAny[f.key];
      if (f.key === 'comments') {
        // If backend stores comments as history array, keep input blank for "new stage comment".
        initial[f.key] = Array.isArray(val) ? '' : val !== undefined && val !== null ? val : '';
        return;
      }
      if (f.key === 'vendor' || f.key === 'vendor_name') {
        const fromField = resolveVendorDisplayName(val);
        const fromAlt =
          f.key === 'vendor'
            ? resolveVendorDisplayName(data.vendor_name ?? recordAny.vendor_name)
            : resolveVendorDisplayName(data.vendor ?? recordAny.vendor);
        initial[f.key] = fromField || fromAlt || '';
        return;
      }
      initial[f.key] = val !== undefined && val !== null ? val : '';
    });
    // Ensure `vendor` is populated even if only `vendor_name` exists on the record.
    if (!initial.vendor) {
      const fallback = resolveVendorDisplayName(
        data.vendor ?? data.vendor_name ?? recordAny.vendor ?? recordAny.vendor_name
      );
      if (fallback) initial.vendor = fallback;
    }
    if (data.extra_charges != null && data.extra_charges !== '') {
      const parsedExtraCharges = toCurrencyNumber(data.extra_charges);
      if (parsedExtraCharges != null) {
        initial.extra_charges = parsedExtraCharges;
      }
    }
    if (data.negotiated_value != null && data.negotiated_value !== '') {
      const parsedNegotiated = toCurrencyNumber(data.negotiated_value);
      if (parsedNegotiated != null) {
        initial.negotiated_value = parsedNegotiated;
      }
    }
    if (data.extra_charge_details != null) {
      initial.extra_charge_details = String(data.extra_charge_details);
    }
    if (data.final_amount != null && data.final_amount !== '') {
      const parsedFinalAmount = toCurrencyNumber(data.final_amount);
      if (parsedFinalAmount != null) {
        initial.final_amount = parsedFinalAmount;
      }
    }
    if (data.payment_note != null) {
      initial.payment_note = String(data.payment_note);
    }
    // Always hydrate shipment tracking fields for inventory requests (dedicated section).
    if (isInventoryRequest) {
      for (const key of TRACKING_FORM_KEYS) {
        if (initial[key] !== undefined) continue;
        const val = data[key];
        if (key === 'shipment_status') {
          initial[key] =
            val != null && String(val).trim()
              ? String(val).trim().toUpperCase().replace(/\s+/g, '_')
              : null;
        } else {
          initial[key] = val !== undefined && val !== null ? val : '';
        }
      }
    }
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
    // `formModalFields` is excluded on purpose: parents rebuild that array on every
    // render, and re-running this would reset live tracking mid-lookup.
  }, [open, record?.id, record?.data, formModalFieldsKey, paymentButtonConfig, hasPriceFieldInForm, modalFlags, effectiveShowFinalPrice, isInventoryRequest]);

  // When a request already has tracking, refresh live carrier status into the pipeline.
  useEffect(() => {
    if (!open || !isInventoryRequest || isPaymentModal) return;
    const data = record?.data && typeof record.data === 'object' ? (record.data as Record<string, unknown>) : {};
    const number = String(data.tracking_number ?? '').trim();
    const link = String(data.tracking_link ?? '').trim();
    if (!number && !link) return;
    let cancelled = false;
    (async () => {
      setTrackingLiveLoading(true);
      try {
        const result = await fetchLiveShipmentStatus({
          tracking_number: number || null,
          tracking_link: link || null,
          courier_name: String(data.courier_name ?? '').trim() || null,
        });
        if (cancelled) return;
        const patch = applyLiveTrackingResult(result);
        if (Object.keys(patch).length > 0) {
          await persistShipmentTrackingPatch(patch);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Auto live shipment track failed', err);
        }
      } finally {
        if (!cancelled) setTrackingLiveLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Only on open / record change — not on every form edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, record?.id, isInventoryRequest, isPaymentModal]);

  // Keep delivery pipeline fresh while the modal stays open with tracking.
  useEffect(() => {
    if (!open || !isInventoryRequest || isPaymentModal) return;
    const number = String(formData.tracking_number ?? '').trim();
    const link = String(formData.tracking_link ?? '').trim();
    if (!number && !link) return;
    const POLL_MS = 3 * 60 * 1000;
    const id = window.setInterval(() => {
      void refreshLiveTrackingRef.current({ silent: true });
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [
    open,
    record?.id,
    isInventoryRequest,
    isPaymentModal,
    formData.tracking_number,
    formData.tracking_link,
  ]);

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

  /** Compute final_amount from total_price + extra_charges. */
  const getComputedFinalAmountFields = useCallback(
    (baseData: Record<string, unknown>): Record<string, unknown> => {
      const totalPrice = toCurrencyNumber(baseData.total_price) ?? 0;
      const extraCharges = toCurrencyNumber(baseData.extra_charges) ?? 0;
      const roundedExtra = Math.round(extraCharges * 100) / 100;
      const finalAmount = Math.round((totalPrice + roundedExtra) * 100) / 100;
      return {
        extra_charges: roundedExtra,
        final_amount: finalAmount,
      };
    },
    []
  );

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
    [formData, record?.data]
  );

  const applyShipmentTrackingOnSave = useCallback(
    (dataToSend: Record<string, unknown>) => {
      if (!isInventoryRequest) return;
      const paste = trackingPasteDraft.trim();
      if (paste) {
        const normalized = normalizeTrackingPaste(paste);
        if (normalized.tracking_link) dataToSend.tracking_link = normalized.tracking_link;
        if (normalized.tracking_number) dataToSend.tracking_number = normalized.tracking_number;
      }
      const link = String(dataToSend.tracking_link ?? '').trim();
      let number = String(dataToSend.tracking_number ?? '').trim();
      if (link && !number) {
        const extracted = normalizeTrackingPaste(link).tracking_number;
        if (extracted) number = extracted;
      }
      dataToSend.tracking_link = link || null;
      dataToSend.tracking_number = number || null;
      dataToSend.courier_name = String(dataToSend.courier_name ?? '').trim() || null;
      dataToSend.eta = String(dataToSend.eta ?? '').trim() || null;
      const hasTracking = Boolean(link || number);
      // Requestors are not allowed to move/change the delivery pipeline.
      // We still allow them to edit other fields without overwriting shipment_status.
      if (isRequester) {
        delete dataToSend.shipment_status;
      } else {
      const statusRaw = String(dataToSend.shipment_status ?? '').trim().toUpperCase().replace(/\s+/g, '_');
      const currentStatus = SHIPMENT_STATUSES.includes(statusRaw as (typeof SHIPMENT_STATUSES)[number])
        ? statusRaw
        : null;
      // Pasting a link/AWB should move the pipeline into ORDERED (not stay blank / NOT_SHIPPED).
      dataToSend.shipment_status = advanceShipmentStatusForTracking(currentStatus, hasTracking);
      }

      const prev = (record?.data && typeof record.data === 'object' ? record.data : {}) as Record<string, unknown>;
      const keys = (isRequester
        ? ([
            'tracking_number',
            'tracking_link',
            'courier_name',
            'eta',
          ] as const)
        : ([
            'tracking_number',
            'tracking_link',
            'courier_name',
            'shipment_status',
            'eta',
          ] as const));
      const changed = keys.some((k) => String(dataToSend[k] ?? '') !== String(prev[k] ?? ''));
      if (changed) {
        dataToSend.tracking_updated_at = new Date().toISOString();
      } else if (prev.tracking_updated_at != null) {
        dataToSend.tracking_updated_at = prev.tracking_updated_at;
      }
    },
    [isInventoryRequest, trackingPasteDraft, record?.data, isRequester]
  );

  const handleActionClick = useCallback(
    async (btn: { label: string; statusValue: string; targetAttribute?: string; statusText?: string }, extraData?: Record<string, unknown>) => {
      if (!record?.id || !onUpdate) return;

      if (isPaymentModal) {
        const paymentNote = String(extraData?.payment_note ?? formData.payment_note ?? '').trim();
        if (!paymentNote) {
          toast({
            title: 'Payment note required',
            description: 'Please add a payment note before proceeding.',
            variant: 'destructive',
          });
          return;
        }
      }

      try {
        setApplyingStatusValue(btn.statusValue);
        const targetAttribute = (btn.targetAttribute || 'status').trim() || 'status';
        const priceOverrides = paymentButtonConfig || !effectiveShowFinalPrice ? {} : getComputedPriceFields();
        const dataToSend: Record<string, unknown> = {
          ...formData,
          ...priceOverrides,
          [targetAttribute]: btn.statusValue,
          ...(extraData || {}),
        };
        if (targetAttribute === 'status') {
          dataToSend.status_text = (btn.statusText ?? btn.label ?? btn.statusValue).trim();
          applyInventoryCartStatusSideEffects({
            previousStatus:
              record?.data && typeof record.data === 'object'
                ? (record.data as Record<string, unknown>).status
                : undefined,
            nextStatus: btn.statusValue,
            data: dataToSend,
          });
          // Order → IN_SHIPPING should start the delivery pipeline at ORDERED.
          if (String(btn.statusValue).toUpperCase().replace(/\s+/g, '_') === 'IN_SHIPPING') {
            dataToSend.shipment_status = advanceShipmentStatusForTracking(
              dataToSend.shipment_status,
              true
            );
          }
        }
        if (isPaymentModal) {
          dataToSend.payment_note = String(extraData?.payment_note ?? formData.payment_note ?? '').trim();
        }
        if (!paymentButtonConfig && effectiveShowFinalPrice) {
          Object.assign(dataToSend, getComputedFinalAmountFields(dataToSend));
        }
        if (typeof dataToSend.vendor === 'string') {
          dataToSend.vendor = toVendorStorageName(dataToSend.vendor);
        }

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
              { name: myName, role: myRoleName || myRoleKey || '', comment: commentText },
            ];
          }
          dataToSend.comments = history;
        }

        // Status history: append each status transition as {current_status, previous_status, changed_by}.
        const previousStatus =
          record?.data && typeof record.data === 'object' ? (record.data as any)?.status : undefined;
        const currentStatus =
          targetAttribute === 'status' && dataToSend.status != null && String(dataToSend.status).trim()
            ? String(dataToSend.status).trim()
            : '';
        const previousStatusText =
          previousStatus != null && String(previousStatus).trim() ? String(previousStatus).trim() : '';
        if (currentStatus && currentStatus !== previousStatusText) {
          const existingRaw = (record?.data as any)?.statuses;
          let statusHistory: StatusHistoryEntry[] = [];
          if (Array.isArray(existingRaw)) {
            statusHistory = (existingRaw as any).filter(
              (entry: any) =>
                entry &&
                typeof entry === 'object' &&
                typeof entry.current_status === 'string' &&
                typeof entry.previous_status === 'string' &&
                typeof entry.changed_by === 'string'
            );
          }
          statusHistory = [
            ...statusHistory,
            {
              current_status: currentStatus,
              previous_status: previousStatusText,
              changed_by: myName,
            },
          ];
          dataToSend.statuses = statusHistory;
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
        applyShipmentTrackingOnSave(dataToSend);
        await onUpdate(record.id, { data: dataToSend });
        setTrackingPasteDraft('');
        toast({
          title: 'Saved',
          description: `${((btn.targetAttribute || 'status').trim() || 'status')} set to ${btn.statusValue.replace(/_/g, ' ')}.`,
        });
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
    [record?.id, record?.data, entityType, formData, getComputedPriceFields, getComputedFinalAmountFields, paymentButtonConfig, effectiveShowFinalPrice, onUpdate, onRecordUpdated, onOpenChange, toast, modalFlags, flagValues, myName, myRoleName, myRoleKey, flagConditionMatches, isPaymentModal, applyShipmentTrackingOnSave]
  );

  const handleSaveAll = useCallback(async () => {
    if (!record?.id || !onUpdate) return;
    try {
      setSaving(true);
      const priceOverrides = paymentButtonConfig || !effectiveShowFinalPrice ? {} : getComputedPriceFields();
      const dataToSend: Record<string, unknown> = { ...formData, ...priceOverrides };
      if (!paymentButtonConfig && effectiveShowFinalPrice) {
        Object.assign(dataToSend, getComputedFinalAmountFields(dataToSend));
      }
      if (typeof dataToSend.vendor === 'string') {
        dataToSend.vendor = toVendorStorageName(dataToSend.vendor);
      }

      if (isRequester) {
        const previousStatus =
          record?.data && typeof record.data === 'object'
            ? (record.data as Record<string, unknown>).status
            : undefined;
        if (previousStatus != null && String(previousStatus).trim() !== '') {
          dataToSend.status = previousStatus;
          const previousStatusText = (record.data as Record<string, unknown>).status_text;
          if (previousStatusText != null && String(previousStatusText).trim() !== '') {
            dataToSend.status_text = previousStatusText;
          }
        }
      }

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
          history = [...history, { name: myName, role: myRoleName || myRoleKey || '', comment: commentText }];
        }
        dataToSend.comments = history;
      }

      // Status history: append on manual status edits followed by Save.
      const previousStatus =
        record?.data && typeof record.data === 'object' ? (record.data as any)?.status : undefined;
      const currentStatus =
        dataToSend.status != null && String(dataToSend.status).trim() ? String(dataToSend.status).trim() : '';
      const previousStatusText =
        previousStatus != null && String(previousStatus).trim() ? String(previousStatus).trim() : '';
      if (currentStatus && currentStatus !== previousStatusText) {
        const existingRaw = (record?.data as any)?.statuses;
        let statusHistory: StatusHistoryEntry[] = [];
        if (Array.isArray(existingRaw)) {
          statusHistory = (existingRaw as any).filter(
            (entry: any) =>
              entry &&
              typeof entry === 'object' &&
              typeof entry.current_status === 'string' &&
              typeof entry.previous_status === 'string' &&
              typeof entry.changed_by === 'string'
          );
        }
        statusHistory = [
          ...statusHistory,
          {
            current_status: currentStatus,
            previous_status: previousStatusText,
            changed_by: myName,
          },
        ];
        dataToSend.statuses = statusHistory;
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
      applyShipmentTrackingOnSave(dataToSend);
      await onUpdate(record.id, { data: dataToSend });
      setTrackingPasteDraft('');
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
  }, [record?.id, record?.data, entityType, formData, getComputedPriceFields, getComputedFinalAmountFields, paymentButtonConfig, effectiveShowFinalPrice, onUpdate, onRecordUpdated, onOpenChange, toast, modalFlags, flagValues, myName, myRoleName, myRoleKey, flagConditionMatches, applyShipmentTrackingOnSave, isRequester]);

  const handleDeleteRequest = useCallback(async () => {
    if (!canShowDeleteRequestButton || !record?.id) return;
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
  }, [canShowDeleteRequestButton, record?.id, onDeleted, onOpenChange, toast]);

  const handleOpenHistory = useCallback(async () => {
    if (!record?.id) return;
    setHistoryModalOpen(true);
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const response = await apiClient.get(`/crm-records/records/${record.id}/history/`);
      const list = Array.isArray(response?.data?.history)
        ? (response.data.history as RequestHistoryEntry[])
        : [];
      setHistoryEntries(list);
    } catch (err: any) {
      setHistoryEntries([]);
      setHistoryError(err?.message || 'Could not load request history.');
    } finally {
      setHistoryLoading(false);
    }
  }, [record?.id]);

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

  const paymentButtonsEnabled = paymentButtonConfig?.conditionalButton && paymentButtonConfig?.defaultButton;
  const statusFromForm =
    formData.status != null && String(formData.status).trim() !== '' ? formData.status : undefined;
  // Prefer saved record status for Approve / Reject / Order so a mismatched status
  // dropdown (e.g. NEW_REQUEST not in options) cannot hide the workflow buttons.
  const requestStatusForWorkflow =
    (record?.data && typeof record.data === 'object'
      ? (record.data as Record<string, unknown>).status ??
        (record.data as Record<string, unknown>).status_text
      : undefined) ??
    statusFromForm ??
    (record as { status?: unknown } | null)?.status;
  const teamLeadFromForm =
    formData.team_lead != null && String(formData.team_lead).trim() !== ''
      ? formData.team_lead
      : undefined;
  const teamLeadOnRecord =
    teamLeadFromForm ??
    (record?.data && typeof record.data === 'object'
      ? (record.data as Record<string, unknown>).team_lead
      : undefined);
  const managerFromForm =
    formData.manager != null && String(formData.manager).trim() !== ''
      ? formData.manager
      : undefined;
  const managerOnRecord =
    managerFromForm ??
    (record?.data && typeof record.data === 'object'
      ? (record.data as Record<string, unknown>).manager
      : undefined);

  const workflowButtons =
    isInventoryRequest && !isPaymentModal
      ? getInventoryWorkflowButtons({
          requestStatus: requestStatusForWorkflow,
          roleNameOrKey: myRoleName,
          roleKey: myRoleKey,
          membershipId: myMembershipId,
          userId: user?.id ?? null,
          teamLeadOnRecord,
          managerOnRecord,
          isRequester,
          workflowMode: inventoryWorkflowMode ?? 'auto',
        })
      : [];

  const configuredActionButtons = paymentButtonsEnabled
    ? [paymentConditionMatches ? paymentButtonConfig.conditionalButton : paymentButtonConfig.defaultButton]
    : isInventoryRequest && !isPaymentModal
      ? filterDuplicateInventoryWorkflowButtons(
          (actionButtons ?? []).filter((btn) => actionButtonConditionMatches(btn))
        )
      : (actionButtons ?? []).filter((btn) => actionButtonConditionMatches(btn));

  const effectiveActionButtons = paymentButtonsEnabled
    ? configuredActionButtons
    : [...workflowButtons, ...configuredActionButtons];
  const hasActionButtons = effectiveActionButtons && effectiveActionButtons.length > 0;
  const effectiveFormModalFields = requesterMayEdit
    ? formModalFields.map((field) => {
        if (field.key === 'status') return { ...field, enabled: false };
        if (INVENTORY_REQUESTER_EDITABLE_FORM_KEYS.has(field.key)) {
          return { ...field, enabled: true };
        }
        return field;
      })
    : formModalFields;
  const hasEditableField = effectiveFormModalFields.some((f) => f.enabled);
  // Default: if showSaveButton is undefined, show Save only when there are no action buttons.
  // Requestors get Save only while the request is still pending approval.
  const effectiveShowSaveButton = isRequester
    ? requesterMayEdit
    : showSaveButton !== undefined
      ? showSaveButton
      : !hasActionButtons;

  const finalPriceDisplayValue = (() => {
    const data = record?.data && typeof record.data === 'object' ? (record.data as Record<string, unknown>) : {};
    const fromFinal = toCurrencyNumber(formData.final_amount ?? data.final_amount);
    if (fromFinal != null) return formatCurrencyDisplay(fromFinal);
    const fromTotal = toCurrencyNumber(formData.total_price ?? data.total_price);
    if (fromTotal != null) return formatCurrencyDisplay(fromTotal);
    const fromUnit = toCurrencyNumber(formData.unit_price ?? data.unit_price);
    if (fromUnit != null) {
      const qty = getQuantity();
      return formatCurrencyDisplay(Math.round(fromUnit * qty * 100) / 100);
    }
    return '—';
  })();

  const quantityFieldKeys = effectiveFormModalFields
    .filter((f) => f.key === 'quantity_required' || f.key === 'quantity')
    .map((f) => f.key);
  const primaryQuantityFieldKey = quantityFieldKeys[0] ?? null;


  return {
    open,
    onOpenChange,
    record,
    entityType,
    formModalFields: effectiveFormModalFields,
    actionButtons,
    onUpdate,
    onRecordUpdated,
    formModalTitle,
    showSaveButton,
    inventoryWorkflowMode,
    paymentButtonConfig,
    modalFlags,
    showFinalPriceSection,
    showDeleteRequestButton,
    showHistoryButton,
    onDeleted,
    uiVariant,
    _formModalDescription,
    toast,
    user,
    formData,
    setFormData,
    applyingStatusValue,
    setApplyingStatusValue,
    saving,
    setSaving,
    deleting,
    setDeleting,
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
    finalPriceValue,
    setFinalPriceValue,
    finalPriceIsTotal,
    setFinalPriceIsTotal,
    extraChargesDraft,
    setExtraChargesDraft,
    negotiatedValueDraft,
    setNegotiatedValueDraft,
    priceFieldDraft,
    setPriceFieldDraft,
    flagValues,
    setFlagValues,
    myRoleName,
    setMyRoleName,
    myRoleKey,
    setMyRoleKey,
    historyModalOpen,
    setHistoryModalOpen,
    historyLoading,
    setHistoryLoading,
    historyError,
    setHistoryError,
    historyEntries,
    setHistoryEntries,
    trackingPasteDraft,
    setTrackingPasteDraft,
    myMembershipId,
    setMyMembershipId,
    trackingLiveLoading,
    setTrackingLiveLoading,
    trackingStatusDetail,
    setTrackingStatusDetail,
    trackingDetails,
    setTrackingDetails,
    myName,
    statusOptions,
    isInventoryRequest,
    requesterId,
    isRequester,
    canShowDeleteRequestButton,
    canShowHistoryButton,
    canUpdate,
    canEditFields,
    isPaymentModal,
    hasPriceFieldInForm,
    effectiveShowFinalPrice,
    setField,
    formModalFieldsRef,
    formModalFieldsKey,
    hydratedRecordIdRef,
    applyLiveTrackingResult,
    persistShipmentTrackingPatch,
    refreshLiveTracking,
    refreshLiveTrackingRef,
    applyTrackingPaste,
    fetchVendors,
    saveNewVendor,
    getQuantity,
    getComputedPriceFields,
    getComputedFinalAmountFields,
    flagConditionMatches,
    actionButtonConditionMatches,
    applyShipmentTrackingOnSave,
    handleActionClick,
    handleSaveAll,
    handleDeleteRequest,
    handleOpenHistory,
    paymentConditionMatches,
    paymentButtonsEnabled,
    statusFromForm,
    requestStatusForWorkflow,
    teamLeadFromForm,
    teamLeadOnRecord,
    managerFromForm,
    managerOnRecord,
    workflowButtons,
    configuredActionButtons,
    effectiveActionButtons,
    hasActionButtons,
    hasEditableField,
    effectiveShowSaveButton,
    finalPriceDisplayValue,
    quantityFieldKeys,
    primaryQuantityFieldKey,
  };
}

export type InventoryFormEditModalModel = ReturnType<typeof useInventoryFormEditModal>;
