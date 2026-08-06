/** Presentational JSX for the inventory form edit modal. */

import React from 'react';
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
import { Loader2, Trash2, History } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { formatCurrencyDisplay, formatCurrencyInputLive } from '@/lib/utils/currencyFormat';
import { formatCalendarDate } from '@/lib/utils/timeUtils';
import { cn } from '@/lib/utils';
import { urgencyToneButtonClassName } from '@/lib/utils/urgencyButtonStyles';
import {
  resolvePriorityFromRow,
  inventoryPriorityFieldCardClassName,
  inventoryPriorityValueTextClassName,
} from '@/lib/inventory/priority';
import { getInventoryStatusLabel, getInventoryStatusToneClass } from '@/lib/inventory/statusStyles';
import { OpenLinkButton } from '@/components/page-builder/OpenLinkButton';
import { RecordModalTitleDisplay } from '@/components/page-builder/RecordModalTitleDisplay';
import { StatusActionWarningModal } from '@/components/config_components/StatusActionWarningModal';
import { RequestHistoryPanel } from '@/components/page-builder/RequestHistoryPanel';
import { ShipmentDeliveryPipeline } from '@/components/page-builder/ShipmentDeliveryPipeline';
import {
  SHIPMENT_STATUSES,
  shouldShowShipmentTrackingSection,
  publicTrackingLink,
} from '@/lib/inventory/shipmentTracking';

import type { InventoryFormEditModalModel } from './useInventoryFormEditModal';
import {
  ADD_VENDOR_VALUE,
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
  resolveVendorDisplayName,
} from './utils';
import type { StatusActionWithWarningConfig } from '@/components/config_components/StatusActionWarningModal';
import { getRecordModalTitleParts } from '@/lib/utils/recordModalHeader';

/** Unmannd modal chrome — design navy header/footer + white ID block. */
const UNMANND_NAVY = '#1A44A1';
const UNMANND_ID_BG = '#FFFFFF';
const UNMANND_ID_TEXT = '#1E3A5F';

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
      className="flex min-h-[4.25rem] items-stretch overflow-visible pr-12 text-white sm:pr-16"
      style={{ backgroundColor: UNMANND_NAVY }}
    >
      {parts ? (
        <div
          className="my-1.5 ml-0 mr-1.5 flex w-[5.25rem] shrink-0 items-center justify-center self-stretch rounded-lg px-2 font-mono text-base font-extrabold tabular-nums tracking-tight sm:w-[6.5rem] sm:text-lg"
          style={{
            backgroundColor: UNMANND_ID_BG,
            color: UNMANND_ID_TEXT,
            border: '2px solid #000000',
          }}
          title="Request Number"
        >
          #{parts.idNum}
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 sm:px-5">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-2">
          {parts ? (
            canOpenProduct ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 text-lg font-semibold leading-snug tracking-tight text-white underline-offset-2 hover:underline sm:text-xl"
                title="Open product link"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="line-clamp-2 break-words">{parts.itemName}</span>
              </a>
            ) : (
              <span
                className="min-w-0 text-lg font-semibold leading-snug tracking-tight text-white sm:text-xl"
                title={parts.itemName === '—' ? undefined : parts.itemName}
              >
                <span className="line-clamp-2 break-words">{parts.itemName}</span>
              </span>
            )
          ) : (
            <span className="text-xl font-semibold text-white">
              {formModalTitle ?? 'Edit request'}
            </span>
          )}
        </div>
        <div className="mr-1 flex w-[7.5rem] shrink-0 flex-col items-stretch gap-1 sm:mr-3">
          {parts ? (
            <time
              className="text-center text-[11px] font-semibold uppercase leading-none tracking-wide text-white/90 sm:text-xs"
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
              className="h-8 w-full gap-1.5 rounded-full border-transparent bg-white px-2.5 text-[#1A44A1] hover:bg-white/90 hover:text-[#1A44A1]"
              disabled={applyingStatusValue != null || saving}
              onClick={onHistory}
            >
              <History className="h-3.5 w-3.5" />
              History
            </Button>
          ) : null}
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
    showHistoryButton,
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
    primaryQuantityFieldKey
  } = props;

  if (!record) return null;

  const isUnmannd = uiVariant === 'unmannd';
  const orderedFields = isUnmannd ? sortUnmanndFormFields(formModalFields) : formModalFields;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'max-h-[94vh] flex flex-col w-[calc(100vw-1rem)] max-w-6xl sm:w-full',
          isUnmannd &&
            'gap-0 overflow-hidden border-0 p-0 [&>button]:right-4 [&>button]:top-4 [&>button]:text-white [&>button]:opacity-90 [&>button]:hover:opacity-100'
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
        <div className={cn('flex-1 min-h-0 overflow-y-auto space-y-4', isUnmannd ? 'bg-[#F7F8FA] px-5 py-4 sm:px-6' : 'px-1 py-4')}>
          {orderedFields.length === 0 ? (
            <p className="text-sm text-muted-foreground">No fields configured. Add fields in table config.</p>
          ) : (
            <div
              className={cn(
                'grid gap-x-6 gap-y-4',
                isUnmannd
                  ? 'grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-3'
                  : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
              )}
            >
            {orderedFields
              .filter((field) => {
                if (field.key === 'cart_id') return false;
                // Rendered inline just after Price (line_total / computed_price).
                if (field.key === 'negotiated_value') return false;
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
              const isClickableProductLink = isLinkField && hasUrl && !isEnabled;
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
              const fieldLabel = isPriorityField
                ? 'Priority'
                : isLineTotal
                  ? 'Price'
                  : isRequestDateField
                    ? 'Requested Date'
                    : isRequiredDateField
                      ? 'Requirement Date'
                      : field.label || field.key.replace(/_/g, ' ');

              const fieldNode = (
                <div
                  className={cn(
                    'space-y-1.5 min-w-0',
                    isUnmannd
                      ? unmanndFieldColClass(field.key) ||
                          (spanFullWidth ? 'md:col-span-2 xl:col-span-3' : '')
                      : spanFullWidth && 'md:col-span-2 xl:col-span-3'
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
                    <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {fieldLabel}
                    </Label>
                  </div>
                  {isLineTotal ? (
                    <div
                      className="flex h-9 w-full items-center rounded-md border border-border/60 bg-muted/20 px-3 text-sm font-mono tabular-nums font-semibold text-foreground"
                      role="status"
                      title="Quantity × Estimated cost"
                    >
                      {lineTotalDisplay}
                    </div>
                  ) : isRequestDateField || (isRequiredDateField && !isEnabled) ? (
                    <div
                      className="flex h-9 w-full items-center rounded-md border border-border/60 bg-muted/20 px-3 text-sm text-foreground"
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
                              className="min-h-[52px] resize-none text-sm rounded-md bg-white"
                              rows={2}
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
                    <div className="flex items-center gap-2 w-full min-w-0">
                      <div className="min-w-0 flex-1">
                      <Select
                        value={normalizedVendorValue || undefined}
                        onValueChange={(v) => {
                          if (v === ADD_VENDOR_VALUE) {
                            setIsAddVendorModalOpen(true);
                            return;
                          }
                          setField(field.key, toVendorStorageName(v ?? ''));
                        }}
                        disabled={!isEnabled}
                      >
                        <SelectTrigger className="h-9 w-full min-w-0 text-sm rounded-md">
                          <SelectValue placeholder="Select or add vendor" />
                        </SelectTrigger>
                        <SelectContent>
                          {normalizedVendorValue &&
                          !vendors.some((v) => toVendorStorageName(v.name) === normalizedVendorValue) ? (
                            <SelectItem value={normalizedVendorValue}>
                              {normalizedVendorValue}
                            </SelectItem>
                          ) : null}
                          {vendorsLoading ? (
                            <SelectItem value="__loading__" disabled>
                              Loading…
                            </SelectItem>
                          ) : (
                            vendors.map((v) => (
                              <SelectItem key={v.id} value={toVendorStorageName(v.name)}>
                                {toVendorStorageName(v.name)}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      </div>
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
                      <SelectTrigger
                        className={cn(
                          'h-9 text-sm rounded-md border font-medium',
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
                        'rounded-lg border px-3 py-2.5 shadow-sm',
                        inventoryPriorityFieldCardClassName(priorityDisplay),
                      )}
                      role="status"
                      aria-label="Priority"
                      title="Derived from Request Date vs Requirement Date"
                    >
                      <span
                        className={cn(
                          'text-base font-bold tracking-wide',
                          inventoryPriorityValueTextClassName(priorityDisplay),
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
                  ) : isLinkField && isEnabled ? (
                    <div className="flex items-center gap-2 min-w-0">
                      <Input
                        type="url"
                        className="h-9 text-sm rounded-md flex-1 min-w-0"
                        value={displayStr}
                        onChange={(e) => setField(field.key, e.target.value)}
                        disabled={!isEnabled}
                        placeholder="https://..."
                      />
                      {hasUrl ? <OpenLinkButton href={displayStr} /> : null}
                    </div>
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

              if (isLineTotal && isInventoryRequest && !isPaymentModal) {
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
                        Negotiated value
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
                          className="h-9 text-sm rounded-md font-mono tabular-nums"
                          disabled={!canEditFields}
                        />
                      ) : (
                        <div
                          className="flex h-9 w-full items-center rounded-md border border-border/60 bg-muted/20 px-3 text-sm font-mono tabular-nums font-semibold text-foreground"
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
                    ? 'Paste a tracking link or AWB in Paste tracking, then click Apply. We look up the carrier and update the delivery pipeline when scans are available. Pipeline is read-only.'
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
                {canEditFields ? (
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      Paste tracking
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      <Input
                        className="h-9 text-sm rounded-md flex-1 min-w-[12rem]"
                        value={trackingPasteDraft}
                        onChange={(e) => setTrackingPasteDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key !== 'Enter') return;
                          e.preventDefault();
                          if (!trackingPasteDraft.trim() || trackingLiveLoading) return;
                          void applyTrackingPaste(trackingPasteDraft);
                        }}
                        placeholder="https://… or tracking number"
                        disabled={trackingLiveLoading}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9"
                        disabled={!trackingPasteDraft.trim() || trackingLiveLoading}
                        onClick={() => {
                          void applyTrackingPaste(trackingPasteDraft);
                        }}
                      >
                        {trackingLiveLoading ? 'Tracking…' : 'Apply'}
                      </Button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Type or paste here, then click Apply. Nothing is applied until then.
                    </p>
                  </div>
                ) : null}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-4">
                  <div className="space-y-1.5 min-w-0">
                    <Label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      Tracking number
                    </Label>
                    <Input
                      className="h-9 text-sm rounded-md font-mono bg-muted/40"
                      value={String(formData.tracking_number ?? '')}
                      readOnly
                      tabIndex={-1}
                      disabled={!canEditFields || trackingLiveLoading}
                      placeholder={canEditFields ? 'Filled from Paste tracking' : '—'}
                    />
                  </div>
                  <div className="space-y-1.5 min-w-0">
                    <Label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      Tracking link
                    </Label>
                    <Input
                      className="h-9 text-sm rounded-md bg-muted/40"
                      value={String(formData.tracking_link ?? '')}
                      readOnly
                      tabIndex={-1}
                      disabled={!canEditFields || trackingLiveLoading}
                      placeholder={canEditFields ? 'Filled from Paste tracking' : '—'}
                    />
                  </div>
                  <div className="space-y-1.5 min-w-0">
                    <Label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      Courier
                    </Label>
                    <Select
                      value={String(formData.courier_name ?? '').trim() || '__auto__'}
                      onValueChange={(v) => {
                        setField('courier_name', v === '__auto__' ? '' : v);
                      }}
                      disabled={!canEditFields || trackingLiveLoading}
                    >
                      <SelectTrigger className="h-9 w-full text-sm rounded-md">
                        <SelectValue placeholder="Auto-detect" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__auto__">Auto-detect</SelectItem>
                        <SelectItem value="Amazon">Amazon</SelectItem>
                        <SelectItem value="BlueDart">BlueDart</SelectItem>
                        <SelectItem value="Delhivery">Delhivery</SelectItem>
                        <SelectItem value="FedEx">FedEx</SelectItem>
                        <SelectItem value="DHL">DHL</SelectItem>
                        <SelectItem value="DTDC">DTDC</SelectItem>
                        <SelectItem value="Shiprocket">Shiprocket</SelectItem>
                        <SelectItem value="India Post">India Post</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
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
              ? 'mt-0 min-h-[4.25rem] border-0 px-4 py-3 sm:px-5'
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
                    ? 'border-white/50 bg-transparent text-white hover:bg-white/10 hover:text-white'
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
                    key={btn.statusValue}
                    type="button"
                    variant="outline"
                    size="default"
                    className={cn(
                      'gap-2 h-9 rounded-md',
                      isUnmannd
                        ? 'border-white/40 bg-white text-[#1A44A1] hover:bg-white/90 hover:text-[#1A44A1]'
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
                  isUnmannd &&
                    'border-white/40 bg-white text-[#1A44A1] hover:bg-white/90 hover:text-[#1A44A1]'
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
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Request history</DialogTitle>
            <DialogDescription>Each entry shows who changed what, from the previous value to the new value.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto pr-1">
            <RequestHistoryPanel loading={historyLoading} error={historyError} entries={historyEntries} />
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
