/** Presentational JSX for RecordDetailModal. */

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
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Loader2,
  Save,
  Trash2,
} from 'lucide-react';
import {
  formatCurrencyDisplay,
  formatCurrencyInputLive,
  formatPriceFieldRead,
  formatPriceForInput,
  PRICE_FIELD_KEYS,
} from '@/lib/currencyFormat';
import { convertGMTtoIST } from '@/lib/timeUtils';
import { cn } from '@/lib/utils';
import { getInventoryStatusLabel, getInventoryStatusToneClass } from '@/lib/inventoryStatusStyles';
import {
  resolvePriorityFromRow,
  inventoryPriorityFieldCardClassName,
  inventoryPriorityValueTextClassName,
} from '@/lib/inventoryPriority';
import { urgencyToneButtonClassName } from '@/lib/urgencyButtonStyles';
import { OpenLinkButton } from '@/components/page-builder/OpenLinkButton';
import { RecordModalTitleDisplay } from '@/components/page-builder/RecordModalTitleDisplay';
import { StatusActionWarningModal, type StatusActionWithWarningConfig } from '@/components/config_components/StatusActionWarningModal';
import { RequestHistoryPanel } from '@/components/page-builder/RequestHistoryPanel';
import type { RecordDetailModalModel } from './useRecordDetailModal';
import {
  ENTITY_LABELS,
  ADD_VENDOR_VALUE,
  DETAIL_ROW_FULL_WIDTH_KEYS,
  LINK_KEYS,
  formatValue,
  normalizeCommentsHistory,
  normalizeStatusesHistory,
  isUrl,
  humanizeLabel,
} from './utils';

/** Render display value as clickable link when it is a URL or key is a known link field. */
function renderDisplayValue(key: string, value: unknown): React.ReactNode {
  if (PRICE_FIELD_KEYS.has(key)) {
    const n = typeof value === 'number' ? value : Number(String(value ?? '').replace(/,/g, ''));
    if (Number.isFinite(n)) {
      return (
        <span className="text-foreground font-mono tabular-nums">{formatCurrencyDisplay(n)}</span>
      );
    }
  }
  if (key === 'comments') {
    const history = normalizeCommentsHistory(value);
    return (
      <div className="space-y-2">
        {history.length === 0 ? (
          <span className="text-muted-foreground text-sm">No comments yet.</span>
        ) : (
          history.map((c, idx) => (
            <div key={idx} className="rounded-md border border-border/60 bg-muted/20 p-2 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                {c.name ? (
                  <Badge variant="outline" className="text-[11px] font-medium">
                    {c.name}
                  </Badge>
                ) : null}
                {c.role ? (
                  <Badge variant="secondary" className="text-[11px] font-normal text-muted-foreground">
                    {c.role}
                  </Badge>
                ) : null}
              </div>
              <div className="text-sm whitespace-pre-wrap">{c.comment}</div>
            </div>
          ))
        )}
      </div>
    );
  }
  if (key === 'statuses') {
    const history = normalizeStatusesHistory(value);
    if (history.length === 0) {
      return <span className="text-muted-foreground text-sm">No status changes yet.</span>;
    }
    return (
      <div className="space-y-2">
        {history.map((entry, idx) => (
          <div key={idx} className="rounded-md border border-border/60 bg-muted/20 p-2 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              {entry.changed_by ? (
                <Badge variant="outline" className="text-[11px] font-medium">
                  {entry.changed_by}
                </Badge>
              ) : null}
            </div>
            <div className="text-sm text-foreground leading-relaxed">
              {entry.previous_status ? (
                <>
                  <span className="text-muted-foreground">From </span>
                  <span className="font-medium">{getInventoryStatusLabel(entry.previous_status)}</span>
                  <span className="text-muted-foreground"> to </span>
                  <span className="font-medium">{getInventoryStatusLabel(entry.current_status)}</span>
                </>
              ) : (
                <span className="font-medium">{getInventoryStatusLabel(entry.current_status)}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (
    (key === 'created_at' || key === 'updated_at' || key === 'submitted_at') &&
    typeof value === 'string' &&
    value.trim()
  ) {
    return <span className="text-foreground">{convertGMTtoIST(value, 'date')}</span>;
  }
  const str = formatValue(value);
  if (str === '—') return <span className="text-foreground">{str}</span>;
  if (key === 'status') {
    return (
      <span
        className={cn(
          'inline-flex max-w-full items-center rounded-full border px-3 py-1 text-sm font-semibold tracking-wide',
          getInventoryStatusToneClass(str),
        )}
        title={str}
      >
        {getInventoryStatusLabel(str)}
      </span>
    );
  }
  const isLink = isUrl(value) || (LINK_KEYS.has(key) && typeof value === 'string' && value.trim().length > 0);
  if (isLink) {
    const href = typeof value === 'string' ? value.trim() : str;
    return <OpenLinkButton href={href} />;
  }
  return <span className="text-foreground">{str}</span>;
}

export function RecordDetailModalView(props: RecordDetailModalModel) {
  const {
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
  } = props;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-6xl sm:w-full max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden rounded-xl border border-border/80 shadow-xl">
        <DialogHeader className="pl-6 pr-14 pt-6 pb-4 border-b bg-muted/30 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-xl font-semibold tracking-tight">
                {_entityLabel ||
                  (entityType && ENTITY_LABELS[entityType]) ||
                  (entityType && entityType.replace(/_/g, ' ')) ||
                  'Record'}{' '}
                <span className="text-muted-foreground font-medium">#{record?.id ?? '—'}</span>
              </DialogTitle>
              {entityType && (
                <Badge variant="secondary" className="shrink-0 font-normal">
                  {ENTITY_LABELS[entityType] ?? entityType}
                </Badge>
              )}
            </div>
            {canShowHistoryButton ? (
              <Button type="button" variant="outline" size="sm" onClick={handleOpenHistory}>
                See request history
              </Button>
            ) : null}
          </div>
          <DialogDescription className="text-muted-foreground mt-1">
            {canEdit ? 'View and edit fields below. Changes are saved per field.' : 'View-only. You do not have permission to edit.'}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 pb-6">
          {rowsForDisplay.length === 0 ? (
            <div className="rounded-lg border border-dashed border-muted-foreground/25 bg-muted/20 py-12 text-center">
              <p className="text-sm text-muted-foreground">No data to display.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {rowsForDisplay.map(({ key, value, inData }) => {
                const isEditable =
                  key === 'status' && isInventoryRequest
                    ? canEditStatusForRequest && editableSet.has(key)
                    : canEditInventoryRequest && inData && editableSet.has(key);
                const displayValue = pending[key] !== undefined ? pending[key] : value;
                const isSaving = saving === key;
                const label = humanizeLabel(key);
                const rowFullWidth = DETAIL_ROW_FULL_WIDTH_KEYS.has(key);

                return (
                  <div
                    key={key}
                    className={cn(
                      'rounded-lg border border-border/60 bg-card px-4 py-3 transition-colors hover:border-border min-w-0',
                      rowFullWidth && 'lg:col-span-2 xl:col-span-3',
                    )}
                  >
                    <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
                      {label}
                    </dt>
                    <dd className="text-sm text-foreground min-w-0">
                      {isEditable ? (
                        <div className="flex flex-wrap items-center gap-2">
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
                                <SelectTrigger
                                  className={cn(
                                    'w-full max-w-md min-w-0 h-9 text-sm rounded-md border font-medium',
                                    getInventoryStatusToneClass(selectValue),
                                  )}
                                >
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                  {options.map((opt) => (
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
                            );
                          })() : key === 'vendor' || key === 'vendor_name' ? (
                            <div className="flex items-center gap-2 w-full min-w-0">
                              <div className="min-w-0 flex-1">
                              <Select
                                value={String(displayValue ?? '').trim() || undefined}
                                onValueChange={(val) => {
                                  if (val === ADD_VENDOR_VALUE) {
                                    setIsAddVendorModalOpen(true);
                                    return;
                                  }
                                  handleEditableChange(key, value, val);
                                }}
                                disabled={isSaving}
                              >
                                <SelectTrigger className="w-full min-w-0 h-9 text-sm rounded-md">
                                  <SelectValue placeholder="Select vendor" />
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
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-9 shrink-0"
                                onClick={() => setIsAddVendorModalOpen(true)}
                                disabled={isSaving}
                              >
                                + Add vendor
                              </Button>
                            </div>
                          ) : typeof displayValue === 'boolean' ? (
                            <Select
                              value={displayValue ? 'true' : 'false'}
                              onValueChange={(val) => handleEditableChange(key, value, val)}
                              disabled={isSaving}
                            >
                              <SelectTrigger className="max-w-[140px] h-9 text-sm rounded-md">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="true">Yes</SelectItem>
                                <SelectItem value="false">No</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : PRICE_FIELD_KEYS.has(key) ? (
                            <Input
                              type="text"
                              inputMode="decimal"
                              className="w-full max-w-md min-w-0 h-9 text-sm rounded-md font-mono tabular-nums"
                              value={
                                priceInputDraft[key] ??
                                formatPriceForInput(pending[key] !== undefined ? pending[key] : value)
                              }
                              onChange={(e) => handleEditableChange(key, value, e.target.value)}
                              onBlur={() => {
                                setPriceInputDraft((prev) => {
                                  const next = { ...prev };
                                  delete next[key];
                                  return next;
                                });
                                const cur = pending[key];
                                if (typeof cur === 'number' && Number.isFinite(cur)) {
                                  setPending((p) => ({ ...p, [key]: Math.round(cur * 100) / 100 }));
                                }
                              }}
                              disabled={isSaving}
                            />
                          ) : key === 'comments' ? (
                              <div className="w-full space-y-2">
                                {renderDisplayValue('comments', value)}
                                <Textarea
                                  className="w-full min-h-[80px] text-sm rounded-md"
                                  value={pending[key] !== undefined ? String(pending[key]) : ''}
                                  onChange={(e) => handleEditableChange(key, value, e.target.value)}
                                  disabled={isSaving}
                                  placeholder="Add a new comment..."
                                />
                              </div>
                            ) : key === 'urgency_level' || key === 'priority' ? (
                              (() => {
                                const priorityDisplay = resolvePriorityFromRow(record, displayValue);
                                return (
                                  <div
                                    className={cn(
                                      'inline-flex max-w-full rounded-lg border px-3 py-2.5 shadow-sm',
                                      inventoryPriorityFieldCardClassName(priorityDisplay),
                                    )}
                                    role="status"
                                    title="Derived from Request Date vs Requirement Date"
                                  >
                                    <span
                                      className={cn(
                                        'text-base font-bold tracking-wide break-words',
                                        inventoryPriorityValueTextClassName(priorityDisplay),
                                      )}
                                    >
                                      {priorityDisplay}
                                    </span>
                                  </div>
                                );
                              })()
                            ) : (
                              <Input
                                className="w-full max-w-md min-w-0 h-9 text-sm rounded-md"
                                value={pending[key] !== undefined ? String(pending[key]) : formatValue(value)}
                                onChange={(e) => handleEditableChange(key, value, e.target.value)}
                                disabled={isSaving}
                              />
                            )
                          }
                          {key !== 'urgency_level' && key !== 'priority' ? (
                          <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            className="h-9 w-9 shrink-0 rounded-md"
                            disabled={isSaving}
                            onClick={() => handleSaveClick(key, value)}
                            title={isSaving ? 'Saving…' : 'Save'}
                          >
                            {isSaving ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                            ) : (
                              <Save className="h-3.5 w-3.5" aria-hidden />
                            )}
                          </Button>
                          ) : null}
                        </div>
                      ) : (key === 'urgency_level' || key === 'priority') ? (
                        (() => {
                          const priorityDisplay = resolvePriorityFromRow(record, displayValue);
                          if (!priorityDisplay || priorityDisplay === '—') {
                            return <span className="text-muted-foreground">—</span>;
                          }
                          return (
                            <div
                              className={cn(
                                'inline-flex max-w-full rounded-lg border px-3 py-2.5 shadow-sm',
                                inventoryPriorityFieldCardClassName(priorityDisplay),
                              )}
                              role="status"
                              title="Derived from Request Date vs Requirement Date"
                            >
                              <span
                                className={cn(
                                  'text-base font-bold tracking-wide break-words',
                                  inventoryPriorityValueTextClassName(priorityDisplay),
                                )}
                              >
                                {priorityDisplay}
                              </span>
                            </div>
                          );
                        })()
                      ) : key === 'status' && String(displayValue ?? '').trim() ? (
                        <span
                          className={cn(
                            'inline-flex max-w-full items-center rounded-full border px-3 py-1 text-sm font-semibold tracking-wide',
                            getInventoryStatusToneClass(displayValue),
                          )}
                          title={String(displayValue)}
                        >
                          {getInventoryStatusLabel(displayValue)}
                        </span>
                      ) : key === 'estimated_cost' ? (
                        <span className="text-foreground font-mono tabular-nums">
                          {formatPriceFieldRead(displayValue)}
                          {record?.data && typeof record.data === 'object' && (record.data as Record<string, unknown>).including_gst === true
                            ? ' (including GST)'
                            : ' (without GST)'}
                        </span>
                      ) : (
                        renderDisplayValue(key, displayValue)
                      )}
                    </dd>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {actionButtons && actionButtons.length > 0 && record?.id && canEdit && (
          <DialogFooter className="px-6 py-4 border-t bg-muted/20 gap-2 flex-wrap">
            <div className="flex flex-wrap gap-2">
              {canShowHistoryButton ? (
                <Button
                  type="button"
                  variant="outline"
                  size="default"
                  className="h-9 rounded-md"
                  disabled={!!applyingStatusValue}
                  onClick={handleOpenHistory}
                >
                  See request history
                </Button>
              ) : null}
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
              {actionButtons.filter((btn) => actionButtonConditionMatches(btn)).map((btn) => {
                const targetAttr = btn.targetAttribute ?? 'status';
                const dataObj = record?.data && typeof record.data === 'object' ? (record.data as Record<string, unknown>) : null;
                const currentVal = String(dataObj?.[targetAttr] ?? '').toUpperCase();
                const applyingThis = applyingStatusValue === btn.statusValue;
                const highlighted =
                  currentVal === String(btn.statusValue ?? '').toUpperCase() || applyingThis;
                return (
                  <Button
                    key={btn.statusValue}
                    type="button"
                    variant="outline"
                    size="default"
                    className={cn(
                      'gap-2 h-9 rounded-md',
                      urgencyToneButtonClassName(btn.statusValue, highlighted),
                    )}
                    disabled={!!applyingStatusValue}
                    onClick={() => {
                      if (btn.openWarningModal) {
                        setPendingWarningAction(btn as StatusActionWithWarningConfig);
                        return;
                      }
                      handleActionButtonClick(btn);
                    }}
                  >
                    {applyingStatusValue === btn.statusValue ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : null}
                    {applyingStatusValue === btn.statusValue ? 'Updating…' : btn.label}
                  </Button>
                );
              })}
            </div>
          </DialogFooter>
        )}
        {isInventoryRequest && isRequester && (
          <DialogFooter className={cn(
            "px-6 py-4 border-t bg-muted/20 gap-3 sm:gap-2 flex-row",
            canShowDeleteRequestButton || requesterWorkflowButtons.length > 0
              ? "justify-between sm:justify-between"
              : "justify-end sm:justify-end",
          )}>
            <div className="flex items-center gap-2">
              {canShowHistoryButton ? (
                <Button
                  type="button"
                  variant="outline"
                  size="default"
                  disabled={deleting || !!applyingStatusValue}
                  onClick={handleOpenHistory}
                >
                  See request history
                </Button>
              ) : null}
              {canShowDeleteRequestButton ? (
                <Button
                  type="button"
                  variant="outline"
                  size="default"
                  className="gap-2 border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/70"
                  disabled={deleting || !!applyingStatusValue}
                  onClick={handleDelete}
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
            {requesterWorkflowButtons.length > 0 && record?.id && onUpdate ? (
              <div className="flex flex-wrap gap-2 items-center justify-end">
                {requesterWorkflowButtons.map((btn) => {
                  const applyingThis = applyingStatusValue === btn.statusValue;
                  return (
                    <Button
                      key={btn.statusValue}
                      type="button"
                      variant="outline"
                      size="default"
                      className={cn(
                        'gap-2 h-9 rounded-md',
                        urgencyToneButtonClassName(btn.statusValue, applyingThis),
                      )}
                      disabled={!!applyingStatusValue || deleting}
                      onClick={() => handleActionButtonClick(btn)}
                    >
                      {applyingThis ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      ) : null}
                      {applyingThis ? 'Updating…' : btn.label}
                    </Button>
                  );
                })}
              </div>
            ) : null}
          </DialogFooter>
        )}
      </DialogContent>

      <Dialog open={isAddVendorModalOpen} onOpenChange={setIsAddVendorModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add vendor</DialogTitle>
            <DialogDescription>Create vendor and use it in this row.</DialogDescription>
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
          await handleActionButtonClick(pendingWarningAction, payload);
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
