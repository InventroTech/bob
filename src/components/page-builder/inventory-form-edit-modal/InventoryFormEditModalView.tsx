/** Presentational JSX for the inventory form edit modal. */

import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogClose,
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
import { Loader2, Trash2, History, Wrench, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { formatCurrencyDisplay, formatCurrencyInputLive } from '@/lib/utils/currencyFormat';
import { formatCalendarDate } from '@/lib/utils/timeUtils';
import { cn } from '@/lib/utils';
import { urgencyToneButtonClassName } from '@/lib/utils/urgencyButtonStyles';
import {
  resolvePriorityFromRow,
  inventoryPriorityFieldCardClassName,
  inventoryPriorityValueTextClassName,
  normalizeInventoryPriorityLevel,
} from '@/lib/inventory/priority';
import { getInventoryStatusLabel, getInventoryStatusToneClass } from '@/lib/inventory/statusStyles';
import { OpenLinkButton } from '@/components/page-builder/OpenLinkButton';
import { RecordModalTitleDisplay } from '@/components/page-builder/RecordModalTitleDisplay';
import { StatusActionWarningModal } from '@/components/config_components/StatusActionWarningModal';
import { RequestHistoryViewer } from '@/components/page-builder/RequestHistoryPanel';
import { ShipmentDeliveryPipeline } from '@/components/page-builder/ShipmentDeliveryPipeline';
import {
  shouldShowShipmentTrackingSection,
  looksLikeTrackingLinkInput,
} from '@/lib/inventory/shipmentTracking';
import { CourierCombobox } from './CourierCombobox';
import { safeProfileImageUrl } from '@/lib/utils/safeProfileImageUrl';

import type { InventoryFormEditModalModel } from './useInventoryFormEditModal';
import {
  TRACKING_FORM_KEYS,
  toVendorStorageName,
  toCurrencyNumber,
  looksLikeUrl,
  isLinkLikeFieldKey,
  formatDisplayValue,
  formatPriceFieldDisplay,
  TEXTAREA_KEYS,
  NUMBER_KEYS,
  PRICE_KEYS,
  sortUnmanndFormFields,
  unmanndFieldColClass,
  UNMANND_FIELD_LABELS,
  resolveVendorDisplayName,
} from './utils';
import type { StatusActionWithWarningConfig } from '@/components/config_components/StatusActionWarningModal';
import { getRecordModalTitleParts } from '@/lib/utils/recordModalHeader';

/** Unmannd modal chrome — popup navy (#1A44A1); dashboard pages keep #0E3777. */
const UNMANND_NAVY = '#1A44A1';
const UNMANND_ID_BG = '#FFFFFF';
const UNMANND_ID_TEXT = '#1A44A1';
const UNMANND_SQUARE_BTN =
  'rounded-none border-white/40 bg-white px-4 text-[#1A44A1] hover:bg-white/90 hover:text-[#1A44A1]';
const UNMANND_CONTROL = 'bg-white';

/** Fields from Item through Vendor: tighter label ↔ control spacing. */
const UNMANND_TIGHT_LABEL_KEYS = new Set([
  'item_name_freeform',
  'status',
  'quantity_required',
  'quantity',
  'estimated_cost',
  'line_total',
  'computed_price',
  'negotiated_value',
  'vendor',
]);

function unmanndPriorityBorderClass(value: unknown): string {
  const level = normalizeInventoryPriorityLevel(value);
  if (level === 'HIGH') return 'border-orange-500';
  if (level === 'MEDIUM') return 'border-orange-400';
  if (level === 'LOW') return 'border-sky-400';
  return 'border-input';
}

function unmanndPriorityTextClass(value: unknown): string {
  const level = normalizeInventoryPriorityLevel(value);
  if (level === 'HIGH') return 'text-orange-600';
  if (level === 'MEDIUM') return 'text-orange-500';
  if (level === 'LOW') return 'text-sky-600';
  return 'text-foreground';
}

function UnmanndProductThumb({ src, alt }: { src?: string; alt?: string }) {
  const preferred = safeProfileImageUrl(src) ?? '';
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [preferred]);

  const showImg = preferred.length > 0 && !failed;

  return (
    <div className="flex h-full min-h-[11rem] w-full items-center justify-center overflow-hidden rounded-md bg-[#E6E6E6] sm:min-h-[13rem] md:min-h-0">
      {showImg ? (
        <img
          src={preferred}
          alt={alt || 'Item'}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <Wrench className="h-16 w-16 -rotate-45 text-gray-400 sm:h-20 sm:w-20" strokeWidth={1.25} aria-hidden />
      )}
    </div>
  );
}

function UnmanndModalHeader({
  record,
  formModalTitle,
  productLink,
  canShowHistoryButton,
  applyingStatusValue,
  saving,
  onHistory,
}: {
  record: any;
  formModalTitle?: string;
  productLink?: string;
  canShowHistoryButton: boolean;
  applyingStatusValue: string | null;
  saving: boolean;
  onHistory: () => void;
}) {
  const parts = getRecordModalTitleParts(record);
  const href = (productLink ?? '').trim();
  const canOpenProduct = looksLikeUrl(href);

  return (
    <div
      className="flex min-h-[4.75rem] items-stretch overflow-hidden text-white"
      style={{ backgroundColor: UNMANND_NAVY }}
    >
      {/* ID badge — flush left; thin border like the mock */}
      {parts ? (
        <div
          className="flex w-[5.75rem] shrink-0 items-center justify-center self-stretch border border-[#C8C8C8] border-r-0 px-1.5 font-mono text-sm font-extrabold tabular-nums tracking-tight sm:w-[6.5rem] sm:text-base rounded-tl-[0.75rem]"
          style={{
            backgroundColor: UNMANND_ID_BG,
            color: UNMANND_ID_TEXT,
          }}
          title="Request Number"
        >
          #{parts.idNum}
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 items-center gap-3 py-2.5 pl-4 pr-3 sm:pl-5 sm:pr-4">
        <div className="min-w-0 flex-1">
          {parts ? (
            canOpenProduct ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="block min-w-0 text-base font-bold leading-snug tracking-tight text-white underline-offset-2 hover:underline sm:text-lg"
                title="Open product link"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="line-clamp-2 break-words">{parts.itemName}</span>
              </a>
            ) : (
              <span
                className="block min-w-0 text-base font-bold leading-snug tracking-tight text-white sm:text-lg"
                title={parts.itemName === '—' ? undefined : parts.itemName}
              >
                <span className="line-clamp-2 break-words">{parts.itemName}</span>
              </span>
            )
          ) : (
            <span className="text-lg font-bold text-white">
              {formModalTitle ?? 'Edit request'}
            </span>
          )}
        </div>

        {/* Right: date | X on one row; History pill under the date */}
        <div className="flex shrink-0 items-start gap-2">
          <div className="flex flex-col items-end gap-1.5">
            {parts ? (
              <time
                className="flex h-5 items-center whitespace-nowrap text-xs font-bold uppercase leading-none tracking-wide text-white sm:text-sm"
                dateTime={parts.dateTimeAttr}
              >
                {parts.dateDisplay}
              </time>
            ) : null}
            {canShowHistoryButton ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 rounded-full border-transparent bg-white px-3 text-[#1A44A1] hover:bg-white/90 hover:text-[#1A44A1]"
                disabled={applyingStatusValue != null || saving}
                onClick={onHistory}
              >
                <History className="h-3.5 w-3.5" />
                History
              </Button>
            ) : null}
          </div>
          <DialogClose
            type="button"
            className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-sm text-white opacity-90 transition-opacity hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            aria-label="Close"
          >
            <X className="h-4 w-4" strokeWidth={2.5} />
          </DialogClose>
        </div>
      </div>
    </div>
  );
}

export function InventoryFormEditModalView(props: InventoryFormEditModalModel) {
  const {
    open,
    onOpenChange,
    record,
    entityType,
    formModalFields,
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
    showHistoryButton: _showHistoryButton,
    onDeleted,
    uiVariant = 'default',
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
    historyError,
    historyEntries,
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
    primaryQuantityFieldKey
  } = props;

  const [vendorSuggestionsOpen, setVendorSuggestionsOpen] = useState(false);
  const [vendorQuery, setVendorQuery] = useState('');

  if (!record) return null;

  const isUnmannd = uiVariant === 'unmannd';
  const orderedFields = isUnmannd ? sortUnmanndFormFields(formModalFields) : formModalFields;
  const productImageSrc = String(
    formData.product_image ??
      (record?.data as any)?.product_image ??
      (record as any)?.product_image ??
      ''
  ).trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideCloseButton={isUnmannd}
        className={cn(
          'max-h-[94vh] flex flex-col w-[calc(100vw-1rem)] max-w-6xl sm:w-full',
          isUnmannd && 'gap-0 overflow-hidden rounded-xl border-0 p-0'
        )}
      >
        {isUnmannd ? (
          <>
            <DialogHeader className="space-y-0 p-0 text-left">
              <DialogTitle className="sr-only">
                {record?.id != null ? `Request #${record.id}` : formModalTitle ?? 'Edit request'}
              </DialogTitle>
              <UnmanndModalHeader
                record={record}
                formModalTitle={formModalTitle}
                productLink={String(
                  formData.product_link ??
                    (record?.data as any)?.product_link ??
                    (record as any)?.product_link ??
                    ''
                )}
                canShowHistoryButton={!!canShowHistoryButton}
                applyingStatusValue={applyingStatusValue}
                saving={saving}
                onHistory={handleOpenHistory}
              />
              <DialogDescription className="sr-only">
                {_formModalDescription ??
                  (hasEditableField
                    ? 'Edit fields below. Use an action button to save and set status, or Save to save changes only.'
                    : 'View and update using action buttons.')}
              </DialogDescription>
            </DialogHeader>
          </>
        ) : (
        <DialogHeader>
          <div className="flex items-center justify-between gap-3 pr-10">
            <DialogTitle className="pr-2 text-left leading-snug">
              {record?.id != null ? (
                <RecordModalTitleDisplay record={record} />
              ) : (
                <span className="text-lg font-semibold tracking-tight sm:text-xl">
                  {formModalTitle ?? 'Edit record'}
                </span>
              )}
            </DialogTitle>
            {canShowHistoryButton ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 gap-1.5"
                disabled={applyingStatusValue != null || saving}
                onClick={handleOpenHistory}
              >
                <History className="h-3.5 w-3.5" />
                History
              </Button>
            ) : null}
          </div>
          <DialogDescription className="sr-only">
            {_formModalDescription ?? (hasEditableField
              ? 'Edit fields below. Use an action button to save and set status, or Save to save changes only.'
              : 'View and update using action buttons.')}
          </DialogDescription>
        </DialogHeader>
        )}
        <div className={cn('flex-1 min-h-0 overflow-y-auto space-y-4', isUnmannd ? 'bg-white px-5 py-5 sm:px-6' : 'px-1 py-4')}>
          {orderedFields.length === 0 ? (
            <p className="text-sm text-muted-foreground">No fields configured. Add fields in table config.</p>
          ) : (
            <div
              className={cn(
                'grid gap-x-6 gap-y-4',
                isUnmannd
                  ? 'grid-cols-1 md:grid-cols-12 gap-x-4 gap-y-4'
                  : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
              )}
            >
            {isUnmannd ? (
              <div className="h-44 w-full md:col-span-3 md:row-span-3 md:h-full">
                <UnmanndProductThumb
                  src={productImageSrc}
                  alt={String(
                    formData.item_name_freeform ??
                      (record?.data as any)?.item_name_freeform ??
                      ''
                  )}
                />
              </div>
            ) : null}
            {orderedFields
              .filter((field) => {
                if (field.key === 'cart_id') return false;
                // Classic modal: negotiated is injected just after Price.
                // Unmannd: render it in the grid like Price/Vendor so heights match.
                if (field.key === 'negotiated_value') return isUnmannd;
                // Dedicated shipment section owns these keys for inventory requests.
                if (!isInventoryRequest || isPaymentModal) return true;
                return !(TRACKING_FORM_KEYS as readonly string[]).includes(field.key);
              })
              .map((field) => {
              const value = formData[field.key];
              const displayStr = PRICE_KEYS.has(field.key) ? formatPriceFieldDisplay(value) : formatDisplayValue(value);
              const normalizedVendorValue =
                field.key === 'vendor'
                  ? resolveVendorDisplayName(formData.vendor ?? formData.vendor_name ?? displayStr)
                  : '';
              const isEnabled = field.enabled && canEditFields;
              const isLinkField = field.link === true || isLinkLikeFieldKey(field.key);
              const hasUrl = looksLikeUrl(displayStr);
              // Read-only link fields open in a new tab; editable ones stay as inputs.
              // Unmannd mock always shows the URL field + Open link button.
              const isClickableProductLink = !isUnmannd && isLinkField && hasUrl && !isEnabled;
              const isStatus = field.key === 'status' && statusOptions.length > 0;
              const isVendor = field.key === 'vendor';
              const isBoolean = typeof value === 'boolean';
              // urgency_level slot now shows date-derived Priority (not CRITICAL/STANDARD).
              const isPriorityField = field.key === 'urgency_level' || field.key === 'priority';
              const priorityDisplay = isPriorityField
                ? resolvePriorityFromRow(record, formData.urgency_level ?? formData.priority ?? value)
                : '';
              const isLineTotal = field.key === 'line_total' || field.key === 'computed_price';
              const isRequestDateField = field.key === 'request_date' || field.key === 'requested_date';
              const isRequiredDateField =
                field.key === 'required_date' || field.key === 'requirement_date';
              const isCalendarDateField = isRequestDateField || isRequiredDateField;
              const lineTotalDisplay = (() => {
                if (!isLineTotal) return '';
                const qtyRaw =
                  formData.quantity ??
                  formData.quantity_required ??
                  (record?.data as any)?.quantity ??
                  (record?.data as any)?.quantity_required;
                const costRaw =
                  formData.estimated_cost ?? (record?.data as any)?.estimated_cost;
                const qty = Number(qtyRaw);
                const cost = typeof costRaw === 'number' ? costRaw : Number(String(costRaw ?? '').replace(/,/g, ''));
                if (!Number.isFinite(qty) || !Number.isFinite(cost)) return '—';
                return formatCurrencyDisplay(Math.round(qty * cost * 100) / 100);
              })();
              const calendarDateRaw = isCalendarDateField
                ? String(
                    formData[field.key] ??
                      (record?.data as any)?.[field.key] ??
                      (isRequestDateField
                        ? formData.request_date ??
                          formData.requested_date ??
                          (record?.data as any)?.request_date ??
                          (record?.data as any)?.requested_date
                        : undefined) ??
                      displayStr ??
                      ''
                  )
                : '';
              const calendarDateDisplay = isCalendarDateField
                ? formatCalendarDate(calendarDateRaw)
                : '';
              const isTextarea =
                TEXTAREA_KEYS.has(field.key) &&
                !(
                  isUnmannd &&
                  (field.key === 'item_name_freeform' ||
                    field.key === 'project_purpose' ||
                    field.key === 'specifications')
                );
              const isNumber = NUMBER_KEYS.has(field.key);
              const spanFullWidth =
                TEXTAREA_KEYS.has(field.key) &&
                !(
                  isUnmannd &&
                  (field.key === 'item_name_freeform' ||
                    field.key === 'project_purpose' ||
                    field.key === 'specifications')
                );
              const fieldLabel =
                (isUnmannd && UNMANND_FIELD_LABELS[field.key]) ||
                (isPriorityField
                  ? 'Priority'
                  : isLineTotal
                    ? 'Price'
                    : isRequestDateField
                      ? 'Requested Date'
                      : isRequiredDateField
                        ? 'Requirement Date'
                        : field.label || field.key.replace(/_/g, ' '));

              const isItemField = field.key === 'item_name_freeform';
              const isTightUnmanndField =
                isUnmannd && UNMANND_TIGHT_LABEL_KEYS.has(field.key);

              const fieldNode = (
                <div
                  className={cn(
                    'min-w-0',
                    isUnmannd && field.key !== 'comments'
                      ? cn(
                          'flex h-full flex-col [&>:last-child]:mt-auto',
                          isTightUnmanndField ? 'gap-0.5' : 'gap-1.5'
                        )
                      : 'space-y-1.5',
                    isUnmannd
                      ? unmanndFieldColClass(field.key) ||
                          (spanFullWidth ? 'md:col-span-12' : '')
                      : spanFullWidth && 'md:col-span-2 xl:col-span-3'
                  )}
                >
                  <div className="flex min-w-0 shrink-0 flex-wrap items-center justify-between gap-2">
                    <Label
                      className={cn(
                        'font-medium uppercase tracking-wider text-muted-foreground whitespace-nowrap',
                        isUnmannd && isItemField
                          ? 'text-sm sm:text-base'
                          : 'text-xs'
                      )}
                    >
                      {fieldLabel}
                    </Label>
                  </div>
                  {isLineTotal ? (
                    <div
                      className={cn(
                        'flex h-9 w-full items-center rounded-md border border-border/60 px-3 text-sm font-mono tabular-nums font-semibold text-foreground',
                        isUnmannd ? 'bg-white' : 'bg-muted/20',
                      )}
                      role="status"
                      title="Quantity × Estimated cost"
                    >
                      {lineTotalDisplay}
                    </div>
                  ) : isRequestDateField || (isRequiredDateField && !isEnabled) ? (
                    <div
                      className={cn(
                        'flex h-9 w-full items-center rounded-md border border-border/60 px-3 text-sm text-foreground',
                        isUnmannd ? 'bg-white' : 'bg-muted/20',
                      )}
                      role="status"
                    >
                      {calendarDateDisplay || '—'}
                    </div>
                  ) : isRequiredDateField && isEnabled ? (
                    <Input
                      type="date"
                      className="h-9 text-sm rounded-md"
                      value={String(calendarDateRaw || '').slice(0, 10)}
                      onChange={(e) => setField(field.key, e.target.value)}
                      disabled={!isEnabled}
                    />
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
                        <div className={cn('space-y-2', isUnmannd && 'space-y-1.5')}>
                          {history.length > 0 ? (
                            <div className={cn('space-y-2', isUnmannd && 'max-h-24 space-y-1.5 overflow-y-auto')}>
                              {history.map((c, idx) => (
                                <div
                                  key={idx}
                                  className={cn(
                                    'rounded-md border border-border/60 bg-muted/20 space-y-1',
                                    isUnmannd ? 'p-1.5' : 'p-2'
                                  )}
                                >
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
                              ))}
                            </div>
                          ) : null}
                          {isUnmannd ? (
                            <Textarea
                              className="min-h-[88px] resize-none text-sm rounded-md bg-white"
                              rows={3}
                              value={newCommentValue}
                              onChange={(e) => setField('comments', e.target.value)}
                              disabled={!isEnabled}
                              placeholder="Add a new comment..."
                            />
                          ) : (
                            <Textarea
                              className="min-h-[80px] text-sm rounded-md"
                              value={newCommentValue}
                              onChange={(e) => setField('comments', e.target.value)}
                              disabled={!isEnabled}
                              placeholder="Add a new comment..."
                            />
                          )}
                        </div>
                      );
                    })()
                  ) : isVendor ? (
                    <div className="flex h-9 w-full min-w-0 flex-nowrap items-center gap-2">
                      <div className="relative min-w-0 flex-1">
                        <Input
                          className="h-9 w-full min-w-0 text-sm rounded-md bg-white"
                          value={normalizedVendorValue}
                          placeholder="Search or add vendor"
                          disabled={!isEnabled}
                          onFocus={() => {
                            if (!isEnabled) return;
                            setVendorQuery(normalizedVendorValue);
                            setVendorSuggestionsOpen(true);
                          }}
                          onBlur={() => {
                            window.setTimeout(() => setVendorSuggestionsOpen(false), 150);
                          }}
                          onChange={(e) => {
                            const raw = e.target.value;
                            setVendorQuery(raw);
                            setField(field.key, toVendorStorageName(raw));
                            setVendorSuggestionsOpen(true);
                          }}
                        />
                        {isEnabled && vendorSuggestionsOpen ? (
                          <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-background shadow-md overflow-hidden">
                            {vendorsLoading && vendors.length === 0 ? (
                              <div className="px-3 py-2 text-sm text-muted-foreground">Loading…</div>
                            ) : (
                              <div className="max-h-56 overflow-auto">
                                {(() => {
                                  const q = vendorQuery.trim().toLowerCase();
                                  const filtered = q
                                    ? vendors.filter((v) =>
                                        toVendorStorageName(v.name).toLowerCase().includes(q)
                                      ).slice(0, 12)
                                    : vendors.slice(0, 12);
                                  if (filtered.length === 0) {
                                    return (
                                      <div className="px-3 py-2 text-sm text-muted-foreground">
                                        No matches
                                      </div>
                                    );
                                  }
                                  return filtered.map((v) => {
                                    const name = toVendorStorageName(v.name);
                                    return (
                                      <button
                                        key={v.id}
                                        type="button"
                                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted truncate"
                                        onMouseDown={(ev) => ev.preventDefault()}
                                        onClick={() => {
                                          setField(field.key, name);
                                          setVendorQuery(name);
                                          setVendorSuggestionsOpen(false);
                                        }}
                                      >
                                        {name}
                                      </button>
                                    );
                                  });
                                })()}
                              </div>
                            )}
                          </div>
                        ) : null}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className={cn('h-9 shrink-0', isUnmannd && 'rounded-full bg-white px-3')}
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
                      <SelectTrigger
                        className={cn(
                          'h-9 text-sm rounded-md border font-medium',
                          isUnmannd && UNMANND_CONTROL,
                          getInventoryStatusToneClass(displayStr || statusOptions[0]),
                        )}
                      >
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((opt) => (
                          <SelectItem
                            key={opt}
                            value={opt}
                            className={cn('font-medium', getInventoryStatusToneClass(opt))}
                          >
                            {getInventoryStatusLabel(opt)}
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
                  ) : isPriorityField ? (
                    <div
                      className={cn(
                        isUnmannd
                          ? cn(
                              'flex h-9 w-full items-center rounded-md border bg-white px-3',
                              unmanndPriorityBorderClass(priorityDisplay),
                            )
                          : cn(
                              'rounded-lg border px-3 py-2.5 shadow-sm',
                              inventoryPriorityFieldCardClassName(priorityDisplay),
                            ),
                      )}
                      role="status"
                      aria-label="Priority"
                      title="Derived from Request Date vs Requirement Date"
                    >
                      <span
                        className={cn(
                          isUnmannd
                            ? cn('text-sm font-semibold', unmanndPriorityTextClass(priorityDisplay))
                            : cn(
                                'text-base font-bold tracking-wide',
                                inventoryPriorityValueTextClassName(priorityDisplay),
                              ),
                        )}
                      >
                        {priorityDisplay}
                      </span>
                    </div>
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
                      <div className="flex h-9 items-center gap-2">
                        <Input
                          type="text"
                          inputMode="decimal"
                          className={cn(
                            'h-9 min-w-0 flex-1 text-sm rounded-md font-mono tabular-nums',
                            isUnmannd && UNMANND_CONTROL,
                          )}
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
                        {(!isUnmannd || field.key === 'estimated_cost') ? (
                        <Select
                          value={String(formData.price_currency || 'INR')}
                          onValueChange={(v) => setField('price_currency', v === 'USD' ? 'USD' : 'INR')}
                          disabled={!isEnabled}
                        >
                          <SelectTrigger className={cn('h-9 w-20 shrink-0 text-sm rounded-md', isUnmannd && UNMANND_CONTROL)}>
                            <SelectValue placeholder="INR" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="INR">INR</SelectItem>
                            <SelectItem value="USD">USD</SelectItem>
                          </SelectContent>
                        </Select>
                        ) : null}
                      </div>
                    ) : (
                      <Input
                        type="number"
                        className={cn('h-9 text-sm rounded-md', isUnmannd && UNMANND_CONTROL)}
                        value={displayStr}
                        onChange={(e) => {
                          const v = e.target.value;
                          setField(field.key, v === '' ? '' : Number(v));
                        }}
                        disabled={!isEnabled}
                      />
                    )
                  ) : isClickableProductLink ? (
                    <a
                      href={displayStr}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={displayStr}
                      className="flex h-9 w-full items-center rounded-md border border-input bg-background px-3 text-sm text-black break-all truncate transition-colors hover:text-black active:border-black active:bg-black active:text-white"
                    >
                      {displayStr}
                    </a>
                  ) : isLinkField && (isEnabled || isUnmannd) ? (
                    <div className="flex items-center gap-2 min-w-0">
                      <Input
                        type="url"
                        className={cn('h-9 text-sm rounded-md flex-1 min-w-0', isUnmannd && UNMANND_CONTROL)}
                        value={displayStr}
                        onChange={(e) => setField(field.key, e.target.value)}
                        disabled={!isEnabled}
                        placeholder="https://..."
                      />
                      {hasUrl ? (
                        <OpenLinkButton href={displayStr} className={isUnmannd ? 'rounded-full bg-white' : undefined} />
                      ) : null}
                    </div>
                  ) : (
                    <Input
                      className={cn(
                        'rounded-md',
                        isUnmannd && isItemField
                          ? 'h-[4.5rem] text-base sm:text-lg'
                          : 'h-9 text-sm',
                        isUnmannd && UNMANND_CONTROL
                      )}
                      value={displayStr}
                      onChange={(e) => setField(field.key, e.target.value)}
                      disabled={!isEnabled}
                      placeholder={field.label || field.key}
                    />
                  )}
                </div>
              );

              if (isLineTotal && isInventoryRequest && !isPaymentModal && !isUnmannd) {
                return (
                  <React.Fragment key={field.key}>
                    {fieldNode}
                    <div
                      className={cn(
                        'space-y-1.5 min-w-0',
                        isUnmannd && unmanndFieldColClass('negotiated_value')
                      )}
                    >
                      <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {isUnmannd ? 'Negotiated Value' : 'Negotiated value'}
                      </Label>
                      {canEditFields ? (
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="0.00"
                          value={
                            negotiatedValueDraft ||
                            formatCurrencyDisplay(formData.negotiated_value as number | '' | string | undefined)
                          }
                          onChange={(e) => {
                            const { display, value } = formatCurrencyInputLive(e.target.value);
                            setNegotiatedValueDraft(display);
                            setField('negotiated_value', value);
                          }}
                          onBlur={() => {
                            setNegotiatedValueDraft('');
                            const parsed = toCurrencyNumber(formData.negotiated_value);
                            setField(
                              'negotiated_value',
                              parsed != null ? Math.round(parsed * 100) / 100 : ''
                            );
                          }}
                          className={cn(
                            'h-9 text-sm rounded-md font-mono tabular-nums',
                            isUnmannd && UNMANND_CONTROL,
                          )}
                          disabled={!canEditFields}
                        />
                      ) : (
                        <div
                          className={cn(
                            'flex h-9 w-full items-center rounded-md border border-border/60 px-3 text-sm font-mono tabular-nums font-semibold text-foreground',
                            isUnmannd ? 'bg-white' : 'bg-muted/20',
                          )}
                          role="status"
                        >
                          {formatCurrencyDisplay(
                            formData.negotiated_value as number | '' | string | undefined
                          ) || '—'}
                        </div>
                      )}
                    </div>
                  </React.Fragment>
                );
              }

              if (
                !isUnmannd &&
                isRequester &&
                primaryQuantityFieldKey != null &&
                field.key === primaryQuantityFieldKey
              ) {
                return (
                  <React.Fragment key={field.key}>
                    {fieldNode}
                    <div className="space-y-1.5 min-w-0">
                      <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Final price
                      </Label>
                      <div
                        className="flex h-9 w-full items-center rounded-md border border-border/60 bg-muted/20 px-3 text-sm font-mono tabular-nums font-semibold text-foreground"
                        role="status"
                      >
                        {finalPriceDisplayValue}
                      </div>
                    </div>
                  </React.Fragment>
                );
              }

              return <React.Fragment key={field.key}>{fieldNode}</React.Fragment>;
            })}
            </div>
          )}

          {/* Shipment tracking — visible to requestor / TL / PM (read-only); paste/edit for ops editors only */}
          {isInventoryRequest &&
            !isPaymentModal &&
            shouldShowShipmentTrackingSection(
              formData.status ?? (record?.data as any)?.status,
              {
                ...(typeof record?.data === 'object' && record.data ? (record.data as Record<string, unknown>) : {}),
                ...formData,
              }
            ) && (
              <div className="space-y-3 pt-2 border-t border-border/60">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Shipment tracking
                  </Label>
                  {formData.tracking_link && looksLikeUrl(String(formData.tracking_link)) ? (
                    <OpenLinkButton href={String(formData.tracking_link)} />
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  {canEditFields
                    ? 'Type the courier and tracking number, then Apply. Links are not accepted. Pipeline is read-only.'
                    : 'Delivery pipeline and tracking details for this request. Refresh to pull the latest carrier scans when available.'}
                </p>
                <ShipmentDeliveryPipeline
                  status={formData.shipment_status}
                  disabled={!canEditFields || !!applyingStatusValue || trackingLiveLoading}
                  statusDetail={trackingStatusDetail}
                  details={trackingDetails}
                  liveLoading={trackingLiveLoading}
                  onRefresh={() => {
                    void refreshLiveTracking();
                  }}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-4">
                  <div className="space-y-1.5 min-w-0">
                    <Label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      Tracking number
                    </Label>
                    <Input
                      className="h-9 text-sm rounded-md font-mono"
                      value={String(formData.tracking_number ?? '')}
                      readOnly={!canEditFields}
                      tabIndex={canEditFields ? 0 : -1}
                      disabled={!canEditFields || trackingLiveLoading}
                      placeholder={canEditFields ? 'AWB / tracking number' : '—'}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (looksLikeTrackingLinkInput(v)) return;
                        setField('tracking_number', v);
                      }}
                      onKeyDown={(e) => {
                        if (e.key !== 'Enter') return;
                        e.preventDefault();
                        const number = String(formData.tracking_number ?? '').trim();
                        const courier = String(formData.courier_name ?? '').trim();
                        if (!canEditFields || !number || !courier || trackingLiveLoading) return;
                        void applyTrackingPaste(number);
                      }}
                    />
                  </div>
                  <div className="space-y-1.5 min-w-0">
                    <Label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      Courier
                    </Label>
                    <CourierCombobox
                      value={String(formData.courier_name ?? '')}
                      onChange={(next) => setField('courier_name', next)}
                      readOnly={!canEditFields}
                      disabled={!canEditFields || trackingLiveLoading}
                      placeholder={canEditFields ? 'Type to search couriers…' : '—'}
                    />
                  </div>
                  {canEditFields ? (
                    <div className="space-y-1.5 min-w-0 flex items-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9"
                        disabled={
                          trackingLiveLoading ||
                          !String(formData.tracking_number ?? '').trim() ||
                          !String(formData.courier_name ?? '').trim() ||
                          looksLikeTrackingLinkInput(String(formData.tracking_number ?? ''))
                        }
                        onClick={() => {
                          void applyTrackingPaste(String(formData.tracking_number ?? '').trim());
                        }}
                      >
                        {trackingLiveLoading ? 'Tracking…' : 'Apply'}
                      </Button>
                    </div>
                  ) : null}
                  <div className="space-y-1.5 min-w-0">
                    <Label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      ETA
                    </Label>
                    <Input
                      type="date"
                      className="h-9 text-sm rounded-md"
                      value={String(formData.eta ?? '').slice(0, 10)}
                      onChange={(e) => setField('eta', e.target.value)}
                      disabled={!canEditFields || trackingLiveLoading}
                    />
                  </div>
                </div>
                {canEditFields ? (
                  <p className="text-[11px] text-muted-foreground">
                    Type a courier name to filter the list, then click a match.
                  </p>
                ) : null}
              </div>
            )}

          {/* Final price (form-style modal only; not shown for Inventory Payment modal — use modal fields for total_price/unit_price there) */}
          {!isUnmannd && !paymentButtonConfig && effectiveShowFinalPrice && (
            <div className="space-y-3 pt-2 border-t border-border/60 max-w-none">
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Extra charges
                  </Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={
                      extraChargesDraft ||
                      formatCurrencyDisplay(formData.extra_charges as number | '' | string | undefined)
                    }
                    onChange={(e) => {
                      const { display, value } = formatCurrencyInputLive(e.target.value);
                      setExtraChargesDraft(display);
                      setField('extra_charges', value);
                    }}
                    onBlur={() => {
                      setExtraChargesDraft('');
                      const parsed = toCurrencyNumber(formData.extra_charges);
                      setField('extra_charges', parsed != null ? Math.round(parsed * 100) / 100 : 0);
                    }}
                    className="h-9 text-sm rounded-md font-mono tabular-nums"
                    disabled={!canUpdate}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Final amount
                  </Label>
                  <Input
                    value={(() => {
                      const priceFields = getComputedPriceFields();
                      const totalRaw =
                        priceFields.total_price ??
                        (formData.total_price as number | string | undefined) ??
                        (record?.data as any)?.total_price;
                      const total = toCurrencyNumber(totalRaw) ?? 0;
                      const extraRaw =
                        (formData.extra_charges as number | string | undefined) ??
                        (record?.data as any)?.extra_charges;
                      const extra = toCurrencyNumber(extraRaw) ?? 0;
                      return formatCurrencyDisplay(Math.round((total + extra) * 100) / 100);
                    })()}
                    readOnly
                    disabled
                    className="h-9 text-sm rounded-md bg-muted/50 font-mono tabular-nums"
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Extra charge details
                  </Label>
                  <Textarea
                    value={String(formData.extra_charge_details ?? '')}
                    onChange={(e) => setField('extra_charge_details', e.target.value)}
                    placeholder="Reason/details for extra charges"
                    className="min-h-[72px] text-sm rounded-md"
                    disabled={!canUpdate}
                  />
                </div>
              </div>
            </div>
          )}
          {isPaymentModal && (
            <div className="space-y-1.5 pt-2 border-t border-border/60">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Payment note
              </Label>
              <Textarea
                value={String(formData.payment_note ?? '')}
                onChange={(e) => setField('payment_note', e.target.value)}
                placeholder="Add payment confirmation notes..."
                className="min-h-[88px] text-sm rounded-md"
                disabled={!canUpdate || !!applyingStatusValue}
              />
            </div>
          )}
        </div>
        <DialogFooter
          className={cn(
            'gap-3 flex-wrap flex-col sm:flex-row sm:items-center sm:justify-between',
            isUnmannd
              ? 'mt-0 min-h-[4.25rem] border-0 px-4 py-3 sm:justify-end sm:px-5'
              : 'border-t pt-4'
          )}
          style={isUnmannd ? { backgroundColor: UNMANND_NAVY } : undefined}
        >
          <div className="flex flex-wrap gap-2 items-center">
            {canShowDeleteRequestButton ? (
              <Button
                type="button"
                variant="outline"
                size="default"
                className={cn(
                  'gap-2 h-9 rounded-md',
                  isUnmannd
                    ? 'rounded-none border-white/50 bg-transparent px-4 text-white hover:bg-white/10 hover:text-white'
                    : 'border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/70'
                )}
                disabled={deleting || applyingStatusValue != null || saving}
                onClick={handleDeleteRequest}
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Trash2 className="h-4 w-4" aria-hidden />
                )}
                {deleting ? 'Deleting…' : 'Delete request'}
              </Button>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2 items-center justify-end">
            {hasActionButtons && (
              <>
                {(modalFlags ?? [])
                  .filter((f) => (f.key ?? '').trim() && (f.label ?? '').trim())
                  .filter((f) => flagConditionMatches(f))
                  .map((f) => {
                  const key = f.key.trim();
                  return (
                    <label
                      key={key}
                      className={cn(
                        'inline-flex items-center gap-2 px-2 py-1 rounded-md border',
                        isUnmannd ? 'border-white/30 bg-white/10' : 'bg-background'
                      )}
                    >
                      <Checkbox
                        checked={flagValues[key] === true}
                        onCheckedChange={(checked) => setFlagValues((prev) => ({ ...prev, [key]: checked === true }))}
                        disabled={!!applyingStatusValue}
                      />
                      <span className={cn('text-xs', isUnmannd ? 'text-white/80' : 'text-muted-foreground')}>
                        {f.label}
                      </span>
                    </label>
                  );
                })}
                {effectiveActionButtons!.map((btn) => {
                  const targetAttr = btn.targetAttribute ?? 'status';
                  const currentVal = String(
                    (record?.data && typeof record.data === 'object'
                      ? (record.data as Record<string, unknown>)[targetAttr]
                      : '') ?? '',
                  ).toUpperCase();
                  const applyingThis = applyingStatusValue === btn.statusValue;
                  const urgencyHighlighted =
                    currentVal === String(btn.statusValue ?? '').toUpperCase() || applyingThis;
                  return (
                  <Button
                    key={`${btn.label}-${btn.statusValue}`}
                    type="button"
                    variant="outline"
                    size="default"
                    className={cn(
                      'gap-2 h-9 rounded-md',
                      isUnmannd
                        ? UNMANND_SQUARE_BTN
                        : urgencyToneButtonClassName(btn.statusValue, urgencyHighlighted),
                    )}
                    disabled={!!applyingStatusValue}
                    onClick={() => {
                      if ((btn as any).openWarningModal) {
                        setPendingWarningAction(btn as StatusActionWithWarningConfig);
                        return;
                      }
                      handleActionClick(btn);
                    }}
                  >
                    {applyingStatusValue === btn.statusValue ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : null}
                    {applyingStatusValue === btn.statusValue ? 'Updating…' : btn.label}
                  </Button>
                );
                })}
              </>
            )}
            {canEditFields && hasEditableField && effectiveShowSaveButton && (
              <Button
                type="button"
                variant={isUnmannd ? 'outline' : 'default'}
                size="default"
                className={cn(
                  'gap-2 h-9 rounded-md',
                  isUnmannd && UNMANND_SQUARE_BTN
                )}
                disabled={saving || applyingStatusValue != null}
                onClick={handleSaveAll}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                {saving ? 'Saving…' : 'Save'}
              </Button>
            )}
          </div>
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

      <StatusActionWarningModal
        open={pendingWarningAction != null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setPendingWarningAction(null);
        }}
        actionButton={pendingWarningAction}
        actorName={myName}
        submitting={applyingStatusValue != null}
        onSubmit={async (payload) => {
          if (!pendingWarningAction) return;
          await handleActionClick(pendingWarningAction, payload);
          setPendingWarningAction(null);
        }}
      />

      <Dialog open={historyModalOpen} onOpenChange={setHistoryModalOpen}>
        <DialogContent className="flex max-h-[90vh] w-[calc(100vw-1rem)] max-w-6xl flex-col gap-0 overflow-hidden p-0 sm:w-full [&>button]:right-4 [&>button]:top-4 [&>button]:text-white [&>button]:opacity-90 [&>button]:hover:opacity-100">
          <DialogHeader
            className="space-y-1 px-5 py-4 pr-12 text-left text-white"
            style={{ backgroundColor: UNMANND_NAVY }}
          >
            <DialogTitle className="text-white">Request history</DialogTitle>
            <DialogDescription className="text-white/80">
              Each entry shows who changed what, from the previous value to the new value.
            </DialogDescription>
          </DialogHeader>
          <RequestHistoryViewer
            loading={historyLoading}
            error={historyError}
            entries={historyEntries}
            accentColor={UNMANND_NAVY}
          />
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
