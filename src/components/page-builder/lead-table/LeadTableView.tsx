/** Presentational JSX for the lead table. */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Filter, MessageCircle, CheckCircle2, Clock, AlertCircle, Search, X, Loader2 } from 'lucide-react';
import LeadCardCarousel from '../lead-card-carousel';
import { RecordDetailModal } from '../record-detail-modal';
import { InventoryFormEditModal } from '../inventory-form-edit-modal';
import { UnmanndRequestDetailModal } from '../unmannd-request-detail-modal';
import { ReceiveShipmentDetailModal } from '../ReceiveShipmentDetailModal';
import { AssignLeadModal } from '../AssignLeadModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DynamicFilterBuilder } from '@/components/DynamicFilterBuilder';
import { CustomButton } from '@/components/ui/CustomButton';
import { CustomTable, type CustomTableColumn } from '@/components/ui/CustomTable';
import {
  DEFAULT_INVENTORY_REQUEST_FORM_MODAL_FIELDS,
  DEFAULT_PAYMENT_MODAL_FIELDS,
} from './constants';
import type { LeadTableModel } from './useLeadTable';
import {
  formatInventoryTableToolbarTitle,
  inferInventoryTableKindFromPageName,
  TABLE_COMPONENT_KIND_MAP,
} from './utils';
import { usePageDisplayTitle } from './InventoryTablePageContext';
import { getRequestStatusDropdownOptions, getRequestStatusLabel } from '@/lib/inventory/requestStatus';
import { buildBulkEditPayload, logBulkEdit } from '@/lib/inventory/bulkEditHistory';
import {
  BULK_SKIP_VALUE,
  buildBulkPreviewRows,
  countBulkChanges,
  groupBulkRowIdsByValue,
} from '@/lib/inventory/bulkEdit';
import { BulkEditHistoryDialog } from './BulkEditHistoryDialog';

export function LeadTableView(props: LeadTableModel) {
  const {
    config,
    loading,
    effectiveApiEndpoint,
    displaySearchTerm,
    handleSearchChange,
    showFilters,
    setShowFilters,
    hasActiveFilters,
    effectiveFilters,
    filterState,
    setFilterValue,
    setFilterValues,
    clearFilters,
    applyFilterState,
    resetFilters,
    isFilterActive,
    getActiveFiltersCount,
    getQueryParams,
    getFilterDisplayValue,
    updateURL,
    requestSequenceRef,
    fetchFilteredData,
    filteredData,
    pagination,
    filtersApplied,
    filterService,
    tableLoading,
    tableColumns,
    isInPageBuilder,
    effectiveDetailMode,
    handleRowClick,
    getLeadRowId,
    getLeadRowClassName,
    getLeadRowStyle,
    highlightedLeadId,
    renderCell,
    handlePreviousPage,
    handleNextPage,
    handleGoToPage,
    isLeadModalOpen,
    setIsLeadModalOpen,
    setSelectedLead,
    setActionButtonsVisible,
    leadCardRef,
    selectedLead,
    data,
    setData,
    setFilteredData,
    handleModalLeadUpdate,
    actionButtonsVisible,
    isCallBackModalOpen,
    setIsCallBackModalOpen,
    isLeadActionSubmitting,
    setIsLeadActionSubmitting,
    isRecordDetailModalOpen,
    setIsRecordDetailModalOpen,
    setSelectedRecord,
    selectedRecord,
    useFormModal,
    isCustomModalOpen,
    setIsCustomModalOpen,
    apiClient,
    bulkSelectionEnabled,
    selectedRowIds,
    selectedRowCount,
    selectedBulkRows,
    bulkEditActor,
    bulkApplying,
    canSelectBulkRow,
    toggleBulkRowSelection,
    toggleBulkSelectAll,
    clearBulkSelection,
    handleBulkStatusAction,
    bulkStatusPickerOpen,
    setBulkStatusPickerOpen,
    bulkStatusPickerOptions,
    selectBulkRowsByStatus,
    requestStatusEntityType,
    requestStatusConfig,
  } = props;

  const bulkTargetAttribute = 'status';
  const [bulkTargetValue, setBulkTargetValue] = useState('');
  const [bulkEditMode, setBulkEditMode] = useState(false);

  // Row navigation for the detail modals: lets users page through filteredData
  // without closing the modal, scrolling back to the table, and reopening the next row.
  const selectedRecordIndex = useMemo(() => {
    if (selectedRecord?.id == null) return -1;
    return filteredData.findIndex((r: any) => r.id === selectedRecord.id);
  }, [filteredData, selectedRecord]);

  // Combined request status catalog from the backend config (not workflow-gated).
  const bulkValueOptions = useMemo(
    () => getRequestStatusDropdownOptions(requestStatusEntityType),
    // requestStatusConfig changes when the backend config loads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [requestStatusEntityType, requestStatusConfig]
  );

  useEffect(() => {
    if (bulkValueOptions.length === 0) {
      setBulkTargetValue('');
      return;
    }
    if (!bulkValueOptions.some((opt) => opt.value === bulkTargetValue)) {
      setBulkTargetValue('');
    }
  }, [bulkValueOptions, bulkTargetValue]);

  const handleStartBulkEdit = useCallback(() => {
    setBulkEditMode(true);
    clearBulkSelection();
    setBulkTargetValue('');
  }, [clearBulkSelection]);

  const exitBulkEdit = useCallback(() => {
    setBulkEditMode(false);
    setBulkTargetValue('');
    clearBulkSelection();
  }, [clearBulkSelection]);

  /** Bulk Edit: clicking anywhere on a row toggles its selection (no detail popup). */
  const handleBulkRowClick = useCallback(
    (row: any) => {
      if (!canSelectBulkRow(row)) return;
      toggleBulkRowSelection(row, !selectedRowIds.has(String(row?.id)));
    },
    [canSelectBulkRow, selectedRowIds, toggleBulkRowSelection]
  );

  const [confirmExitBulkOpen, setConfirmExitBulkOpen] = useState(false);
  const confirmExitBulkOpenRef = useRef(false);
  confirmExitBulkOpenRef.current = confirmExitBulkOpen;

  // No Cancel button: clicking outside the table / bulk controls (or Esc) asks to keep editing or cancel.
  useEffect(() => {
    if (!bulkEditMode) {
      setConfirmExitBulkOpen(false);
      return;
    }
    const keepOpenSelector = [
      '[data-bulk-edit-keep]',
      '[data-radix-popper-content-wrapper]',
      '[role="listbox"]',
      '[role="dialog"]',
      '[role="alertdialog"]',
    ].join(',');
    const onPointerDown = (event: PointerEvent) => {
      if (bulkApplying != null || confirmExitBulkOpenRef.current) return;
      const target = event.target as Element | null;
      if (!target || !target.isConnected) return;
      if (target.closest(keepOpenSelector)) return;
      setConfirmExitBulkOpen(true);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || bulkApplying != null || confirmExitBulkOpenRef.current) return;
      setConfirmExitBulkOpen(true);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [bulkEditMode, bulkApplying]);

  const [bulkPreviewOpen, setBulkPreviewOpen] = useState(false);
  /** Review popup: per-row value overrides (row id → value, or BULK_SKIP_VALUE). */
  const [bulkRowOverrides, setBulkRowOverrides] = useState<Record<string, string>>({});

  const openBulkPreview = useCallback(() => {
    setBulkRowOverrides({});
    setBulkPreviewOpen(true);
  }, []);

  const formatBulkValue = useCallback(
    (value: unknown) => {
      const raw = String(value ?? '').trim();
      if (!raw || raw === 'N/A') return '—';
      return getRequestStatusLabel(raw, requestStatusEntityType);
    },
    [requestStatusEntityType]
  );

  const bulkPreviewRows = useMemo(() => {
    if (!bulkPreviewOpen) return [];
    return buildBulkPreviewRows({
      rows: selectedBulkRows ?? [],
      targetValue: bulkTargetValue,
      attribute: bulkTargetAttribute,
      overrides: bulkRowOverrides,
      entityType: requestStatusEntityType,
      formatValue: formatBulkValue,
    });
  }, [
    bulkPreviewOpen,
    bulkTargetAttribute,
    bulkTargetValue,
    bulkRowOverrides,
    selectedBulkRows,
    formatBulkValue,
    requestStatusEntityType,
  ]);

  const bulkPreviewChangeCount = countBulkChanges(bulkPreviewRows);

  /** Review popup → Confirm & Save: apply each row's chosen value, then leave Bulk Edit. */
  const handleBulkSave = useCallback(async () => {
    setBulkPreviewOpen(false);
    if (selectedRowCount === 0) return;
    const rowIdsByValue = groupBulkRowIdsByValue(bulkPreviewRows);
    let anyOk = false;
    const savedRowIds = new Set<string>();
    for (const [value, rowIds] of rowIdsByValue) {
      const match = bulkValueOptions.find((opt) => opt.value === value);
      if (!match) continue;
      const ok = await handleBulkStatusAction(
        {
          label: match.label,
          statusValue: match.value,
          targetAttribute: bulkTargetAttribute,
          statusText: match.label,
        },
        { rowIds }
      );
      if (ok) rowIds.forEach((id) => savedRowIds.add(id));
      anyOk = anyOk || ok;
    }
    if (savedRowIds.size > 0) {
      void logBulkEdit(
        apiClient,
        buildBulkEditPayload({
          entityType: requestStatusEntityType,
          field: bulkTargetAttribute,
          actor: bulkEditActor,
          changes: bulkPreviewRows
            .filter((row) => savedRowIds.has(row.id))
            .map((row) => ({
              record_id: row.id,
              item: row.itemName,
              from: row.currentValue,
              to: row.nextValue,
            })),
        })
      );
    }
    if (anyOk) {
      setBulkEditMode(false);
      setBulkTargetValue('');
    }
  }, [
    apiClient,
    bulkEditActor,
    bulkPreviewRows,
    bulkTargetAttribute,
    bulkValueOptions,
    handleBulkStatusAction,
    requestStatusEntityType,
    selectedRowCount,
  ]);

  const [bulkHistoryOpen, setBulkHistoryOpen] = useState(false);

  const handleNavigateRecord = useCallback(
    (direction: 'prev' | 'next') => {
      if (selectedRecordIndex === -1) return;
      const nextIndex = direction === 'next' ? selectedRecordIndex + 1 : selectedRecordIndex - 1;
      if (nextIndex < 0 || nextIndex >= filteredData.length) return;
      setSelectedRecord(filteredData[nextIndex]);
    },
    [selectedRecordIndex, filteredData, setSelectedRecord]
  );

  const navigationPosition =
    selectedRecordIndex !== -1 ? { index: selectedRecordIndex, total: filteredData.length } : undefined;
  const hasPreviousRecord = selectedRecordIndex > 0;
  const hasNextRecord = selectedRecordIndex !== -1 && selectedRecordIndex < filteredData.length - 1;

  // Used for Unmannd procurement table chrome (navy headers).
  const endpointForTitle = String(config?.apiEndpoint || effectiveApiEndpoint || '');
  const forceEntityType = String(
    (config as { forceQueryParams?: Record<string, string> } | undefined)?.forceQueryParams
      ?.entity_type || ''
  ).trim();
  const isInventoryLikeForTitle =
    config?.entityType === 'unmannd_request' ||
    config?.entityType === 'inventory_request' ||
    forceEntityType === 'unmannd_request' ||
    forceEntityType === 'inventory_request' ||
    /(?:^|[?&])entity_type=(?:unmannd_request|inventory_request)(?:&|$)/i.test(endpointForTitle) ||
    Boolean(
      Array.isArray(config?.columns) &&
        config.columns.some((col: { key?: string }) =>
          ['item_name_freeform', 'item_name', 'quantity_required', 'urgency_level'].includes(
            String(col?.key || '')
          )
        )
    );

  // Navy header/border for Procurement / My Request / Pending Approval / etc.
  // CRM All Leads and other default tables keep black headers.
  // Dashboard/main pages use #0E3777 (popup chrome uses #1A44A1).
  const isProcurementStyleTable =
    config?.tableType === 'itemsTable' || isInventoryLikeForTitle;
  const procurementHeaderBg = 'bg-[#0E3777]';
  // Side borders on body cells (not the wrapper) so they line up with the navy header edges.
  const procurementTableFrame =
    'mb-3 [&_tbody_td:first-child]:border-l [&_tbody_td:last-child]:border-r [&_tbody_td]:border-gray-200';
  const pageChromeTitle = usePageDisplayTitle().trim();
  const pageComponentType = (config as { pageComponentType?: string } | undefined)?.pageComponentType;
  const inventoryTableKindForTitle =
    inferInventoryTableKindFromPageName(pageChromeTitle) ||
    TABLE_COMPONENT_KIND_MAP[pageComponentType || ''] ||
    (config as { inventoryTableKind?: string } | undefined)?.inventoryTableKind;
  const pageTitleText =
    (isProcurementStyleTable
      ? formatInventoryTableToolbarTitle(pageChromeTitle, inventoryTableKindForTitle)
      : pageChromeTitle || (config?.title || '').trim()) || pageChromeTitle;
  const pageTitleDisplay = isProcurementStyleTable
    ? pageTitleText.toUpperCase()
    : pageTitleText;
  const isMyRequestPageChrome = isProcurementStyleTable;
  /** Inventory tables: compact search; Filters fixed on the right, same height. */
  const searchFieldWidthClass = isMyRequestPageChrome
    ? 'w-[180px] max-w-[180px] shrink-0'
    : 'min-w-[200px] max-w-sm flex-1';
  const filtersButtonWidthClass = isMyRequestPageChrome ? 'w-[100px]' : 'w-[108px]';
  const filtersButtonPadClass = 'px-3';
  const toolbarControlHeightClass = 'h-9';
  const isUnmanndEntity =
    config?.entityType === 'unmannd_request' ||
    /(?:^|[?&])entity_type=unmannd_request(?:&|$)/i.test(
      String(config?.apiEndpoint || effectiveApiEndpoint || '')
    );
  const useUnmanndDetailModal =
    useFormModal &&
    isUnmanndEntity &&
    effectiveDetailMode !== 'receive_shipments' &&
    effectiveDetailMode !== 'inventory_payment_modal';

  const totalPages = Math.max(
    1,
    pagination.numberOfPages ||
      (pagination.pageSize > 0
        ? Math.ceil((pagination.totalCount || 0) / pagination.pageSize)
        : 1)
  );
  const [pageInput, setPageInput] = useState(
    String(pagination.currentPage).padStart(2, '0')
  );

  useEffect(() => {
    setPageInput(String(pagination.currentPage).padStart(2, '0'));
  }, [pagination.currentPage]);

  const commitPageInput = () => {
    const parsed = Number.parseInt(pageInput.replace(/\D/g, ''), 10);
    if (!Number.isFinite(parsed)) {
      setPageInput(String(pagination.currentPage).padStart(2, '0'));
      return;
    }
    void handleGoToPage(parsed);
    setPageInput(String(Math.min(Math.max(1, parsed), totalPages)).padStart(2, '0'));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-600">Loading data...</div>
      </div>
    );
  }

  if (!effectiveApiEndpoint) {
    return (
      <div className="w-full border-2 border-dashed border-gray-300 rounded-lg bg-white p-8 text-center space-y-2">
        <div className="text-sm font-medium text-gray-800">Records Table (API)</div>
        <div className="text-sm text-gray-600">
          Configure an <span className="font-mono text-xs">API Endpoint</span> (and entity type) in the
          component settings to load requests.
        </div>
      </div>
    );
  }

  return (
    <div
      className={
        isProcurementStyleTable
          ? 'flex w-full flex-col'
          : undefined
      }
    >
      <div
        className={
          isProcurementStyleTable
            ? 'flex w-full max-w-full flex-col bg-white px-1 py-1 sm:px-2'
            : 'w-full max-w-full min-w-0 border border-gray-200 rounded-lg bg-white px-2 py-1.5'
        }
      >
        {/* Toolbar — title left; Bulk Edit / search / Filters right. */}
        <div
          className={cn(
            'mb-3 flex shrink-0 flex-col gap-3 border-b border-gray-200 pb-3',
            'sm:flex-row sm:flex-nowrap sm:gap-3',
            isProcurementStyleTable ? 'sm:items-start' : 'sm:items-center',
            pageTitleDisplay ? 'sm:justify-between' : 'sm:justify-end'
          )}
        >
          {pageTitleDisplay ? (
            <h1
              className={
                isProcurementStyleTable
                  ? '!m-0 min-w-0 truncate font-[Helvetica,Arial,sans-serif] text-[28px] font-bold uppercase leading-[32px] sm:!mt-2 sm:leading-none tracking-normal text-gray-900 max-sm:text-2xl'
                  : '!m-0 min-w-0 truncate text-2xl font-bold leading-tight text-gray-900'
              }
            >
              {pageTitleDisplay}
            </h1>
          ) : null}

          <div
            className={cn(
              'flex w-full shrink-0 flex-nowrap items-center gap-2',
              isMyRequestPageChrome
                ? 'ml-auto w-auto shrink-0 justify-end sm:mt-9'
                : pageTitleDisplay
                  ? 'sm:mt-0 sm:w-auto sm:justify-end'
                  : 'sm:justify-end'
            )}
          >
            {bulkSelectionEnabled && bulkEditMode ? (
              <div data-bulk-edit-keep className="mr-auto flex min-w-0 flex-wrap items-center gap-2">
                <Select
                  value={bulkTargetValue || undefined}
                  onValueChange={setBulkTargetValue}
                  disabled={bulkValueOptions.length === 0 || bulkApplying != null}
                >
                  <SelectTrigger className="h-9 min-w-[150px] gap-2 rounded-[6px] border-gray-200 bg-white text-sm font-semibold text-gray-800 shadow-sm">
                    <span className="!flex min-w-0 items-center gap-1 truncate">
                      {bulkTargetValue ? <span className="shrink-0 text-gray-500">Status:</span> : null}
                      <SelectValue placeholder="Status" />
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {bulkValueOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            {bulkSelectionEnabled ? (
              <span data-bulk-edit-keep className="contents">
              <CustomButton
                variant="default"
                size="sm"
                disabled={
                  bulkEditMode &&
                  (selectedRowCount === 0 ||
                    !bulkTargetValue ||
                    bulkValueOptions.length === 0 ||
                    bulkApplying != null)
                }
                onClick={(e) => {
                  e.stopPropagation();
                  if (bulkEditMode) {
                    openBulkPreview();
                  } else {
                    handleStartBulkEdit();
                  }
                }}
                className={
                  bulkEditMode
                    ? 'h-9 shrink-0 justify-center rounded-[6px] border-0 bg-[#0E3777] px-4 text-white hover:bg-[#0b2d61]'
                    : 'h-9 shrink-0 justify-center rounded-[6px] border-0 bg-[linear-gradient(104.92deg,#1B6FE8_39.48%,#0A4CB8_93.66%)] px-4 text-white shadow-[0_4px_12px_rgba(8,71,184,0.4)] hover:bg-[linear-gradient(104.92deg,#4BA3FF_0%,#2885FF_45%,#1A7AE8_100%)] hover:text-white'
                }
              >
                {bulkApplying != null ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden />
                    Saving…
                  </>
                ) : bulkEditMode ? (
                  'Save'
                ) : (
                  'Bulk Edit'
                )}
              </CustomButton>
              </span>
            ) : null}
            {bulkSelectionEnabled && !bulkEditMode ? (
              <CustomButton
                variant="default"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setBulkHistoryOpen(true);
                }}
                className="h-9 shrink-0 justify-center rounded-[6px] border-0 bg-[linear-gradient(104.92deg,#1B6FE8_39.48%,#0A4CB8_93.66%)] px-4 text-white shadow-[0_4px_12px_rgba(8,71,184,0.4)] hover:bg-[linear-gradient(104.92deg,#4BA3FF_0%,#2885FF_45%,#1A7AE8_100%)] hover:text-white"
              >
                Bulk Edit History
              </CustomButton>
            ) : null}
            <div
              data-bulk-edit-keep
              className={cn(
                'relative',
                searchFieldWidthClass
              )}
            >
              <Search
                className={
                  isProcurementStyleTable
                    ? 'absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400'
                    : 'absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400'
                }
              />
              <Input
                type="text"
                placeholder="Search..."
                value={displaySearchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className={
                  isProcurementStyleTable
                    ? `${toolbarControlHeightClass} w-full rounded-[6px] border-gray-200 bg-white pl-9 text-sm shadow-sm`
                    : 'pl-9 h-8 rounded-md'
                }
              />
            </div>
            <CustomButton
              variant={isProcurementStyleTable ? 'default' : 'outline'}
              size="sm"
              icon={<Filter className="h-4 w-4" />}
              onClick={(e) => {
                e.stopPropagation();
                setShowFilters(!showFilters);
              }}
              className={
                isProcurementStyleTable
                  ? showFilters
                    ? `${toolbarControlHeightClass} ${filtersButtonWidthClass} shrink-0 justify-center rounded-[6px] border-0 bg-[#0E3777] ${filtersButtonPadClass} text-white shadow-none hover:bg-[#0b2d61] hover:text-white`
                    : `${toolbarControlHeightClass} ${filtersButtonWidthClass} shrink-0 justify-center rounded-[6px] border-0 bg-[linear-gradient(104.92deg,#1B6FE8_39.48%,#0A4CB8_93.66%)] ${filtersButtonPadClass} text-white shadow-none hover:bg-[linear-gradient(104.92deg,#4BA3FF_0%,#2885FF_45%,#1A7AE8_100%)] hover:text-white`
                  : undefined
              }
            >
              {isProcurementStyleTable
                ? 'Filters'
                : showFilters
                  ? 'Hide Filters'
                  : 'Show Filters'}
            </CustomButton>
          </div>
        </div>

        {bulkSelectionEnabled ? (
          <BulkEditHistoryDialog
            open={bulkHistoryOpen}
            onOpenChange={setBulkHistoryOpen}
            apiClient={apiClient}
            entityType={requestStatusEntityType}
          />
        ) : null}

        <AlertDialog open={bulkPreviewOpen} onOpenChange={setBulkPreviewOpen}>
          <AlertDialogContent className="w-[calc(100vw-2rem)] max-w-3xl overflow-hidden border-0 p-0">
            <AlertDialogHeader className="space-y-0 bg-[#0E3777] px-6 py-4 text-left">
              <AlertDialogTitle className="text-lg font-bold uppercase tracking-wide text-white">
                Review changes
              </AlertDialogTitle>
            </AlertDialogHeader>
            <div className="space-y-3 px-6 pt-1">
              <AlertDialogDescription className="text-sm text-gray-700">
                {`${bulkPreviewChangeCount} of ${bulkPreviewRows.length} request${bulkPreviewRows.length === 1 ? '' : 's'} — `}
                <span className="font-semibold text-[#0E3777]">Status</span>
                {' will change as below. Use the New column to change a single request.'}
              </AlertDialogDescription>
              <div className="max-h-[50vh] overflow-y-auto rounded-md border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-[#0E3777] text-left text-xs uppercase tracking-wide text-white">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Item</th>
                      <th className="px-3 py-2 font-semibold">Current</th>
                      <th className="px-3 py-2 font-semibold" aria-label="changes to" />
                      <th className="px-3 py-2 font-semibold">New</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkPreviewRows.map((row) => (
                      <tr key={row.id} className="border-t border-gray-200">
                        <td className="max-w-[18rem] truncate px-3 py-2 text-gray-800" title={row.itemName}>
                          {row.itemName}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-gray-600">{row.currentLabel}</td>
                        <td className="px-1 py-2 text-gray-400">→</td>
                        <td className="px-3 py-1.5">
                          <Select
                            value={row.nextValue || undefined}
                            onValueChange={(value) =>
                              setBulkRowOverrides((prev) => ({ ...prev, [row.id]: value }))
                            }
                          >
                            <SelectTrigger
                              className={cn(
                                'h-8 w-[11rem] rounded-[6px] border-gray-200 bg-white text-sm font-semibold shadow-sm',
                                row.skipped || row.unchanged ? 'text-gray-400' : 'text-[#1B6FE8]'
                              )}
                            >
                              <SelectValue placeholder="Choose value" />
                            </SelectTrigger>
                            <SelectContent className="z-[100]">
                              <SelectItem value={BULK_SKIP_VALUE}>Don&apos;t change</SelectItem>
                              {bulkValueOptions
                                .filter((opt) => row.allowedValues.has(opt.value))
                                .map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          {row.unchanged ? (
                            <span className="ml-2 text-xs text-gray-400">no change</span>
                          ) : null}
                          {row.blocked ? (
                            <span className="mt-1 block text-xs text-amber-700">
                              Already {row.currentLabel}
                            </span>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <AlertDialogFooter className="gap-2 px-6 pb-5">
              <AlertDialogCancel className="h-9 rounded-[6px] border border-[#0E3777] bg-white px-4 font-semibold text-[#0E3777] hover:bg-[#0E3777]/5 hover:text-[#0E3777]">
                Back
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={bulkPreviewChangeCount === 0}
                onClick={() => void handleBulkSave()}
                className="h-9 rounded-[6px] border-0 bg-[linear-gradient(104.92deg,#1B6FE8_39.48%,#0A4CB8_93.66%)] px-4 font-semibold text-white shadow-[0_4px_12px_rgba(8,71,184,0.4)] hover:bg-[linear-gradient(104.92deg,#4BA3FF_0%,#2885FF_45%,#1A7AE8_100%)]"
              >
                Confirm &amp; Save
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={confirmExitBulkOpen} onOpenChange={setConfirmExitBulkOpen}>
          <AlertDialogContent className="overflow-hidden border-0 p-0">
            <AlertDialogHeader className="space-y-0 bg-[#0E3777] px-6 py-4 text-left">
              <AlertDialogTitle className="text-lg font-bold uppercase tracking-wide text-white">
                Leave Bulk Edit?
              </AlertDialogTitle>
            </AlertDialogHeader>
            <div className="px-6 pt-1">
              <AlertDialogDescription className="text-sm text-gray-700">
                {selectedRowCount > 0
                  ? `You have ${selectedRowCount} row${selectedRowCount === 1 ? '' : 's'} selected. Do you want to keep editing or cancel Bulk Edit?`
                  : 'Do you want to keep editing or cancel Bulk Edit?'}
              </AlertDialogDescription>
            </div>
            <AlertDialogFooter className="gap-2 px-6 pb-5">
              <AlertDialogCancel className="h-9 rounded-[6px] border border-[#0E3777] bg-white px-4 font-semibold text-[#0E3777] hover:bg-[#0E3777]/5 hover:text-[#0E3777]">
                Keep editing
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={exitBulkEdit}
                className="h-9 rounded-[6px] border-0 bg-[linear-gradient(104.92deg,#1B6FE8_39.48%,#0A4CB8_93.66%)] px-4 font-semibold text-white shadow-[0_4px_12px_rgba(8,71,184,0.4)] hover:bg-[linear-gradient(104.92deg,#4BA3FF_0%,#2885FF_45%,#1A7AE8_100%)]"
              >
                Cancel Bulk Edit
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {bulkSelectionEnabled && bulkEditMode && selectedRowCount === 0 ? (
          <div className="mb-2 shrink-0 text-sm text-gray-600">
            Click rows to select them, then choose a Status and Save.
          </div>
        ) : null}
        {bulkSelectionEnabled && bulkEditMode && selectedRowCount > 0 ? (
          <div className="mb-2 shrink-0 text-sm text-gray-600">
            {selectedRowCount} selected — choose a Status, then Save.
          </div>
        ) : null}

        {showFilters && (
          <div className={isProcurementStyleTable ? 'mt-1.5 mb-2 shrink-0' : 'mt-2 mb-1.5'}>
            <div
              className={
                isProcurementStyleTable
                  ? 'rounded-lg border border-[#0E3777] bg-[#0E3777] p-3 text-white'
                  : 'rounded-lg border bg-gray-50 p-2.5'
              }
            >
              {/* Use new dynamic filter system if filters are configured */}
              {hasActiveFilters ? (
                <div className={isProcurementStyleTable ? 'space-y-2' : 'space-y-3'}>
                  <DynamicFilterBuilder
                    filters={effectiveFilters}
                    filterContext={{
                      filterState,
                      setFilterValue,
                      setFilterValues,
                      clearFilters,
                      applyFilters: applyFilterState,
                      resetFilters,
                      isFilterActive,
                      getActiveFiltersCount,
                      getQueryParams,
                      getFilterDisplayValue,
                    }}
                    onFiltersChange={(params) => {
                      // Add pagination parameters to URL for complete bookmarkable state
                      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
                      params.set('page', '1');
                      params.set('page_size', isMobile ? '7' : '10');

                      // Only add entity_type if using generic records endpoint and entityType is configured
                      if ((effectiveApiEndpoint ?? '').includes('/crm-records/records') && config?.entityType) {
                        params.set('entity_type', config.entityType);
                      }

                      // Update the URL with complete parameters so users can bookmark/share
                      updateURL(params);

                      // Trigger API call with new parameters
                      const currentSequence = ++requestSequenceRef.current;
                      fetchFilteredData(currentSequence, params);
                    }}
                    className={
                      isProcurementStyleTable
                        ? [
                            // Labels stay white on navy
                            '[&>div>div>label]:!text-white',
                            // Filter field controls: white boxes, dark readable text
                            '[&>div.grid_input]:!bg-white [&>div.grid_input]:!text-gray-900 [&>div.grid_input]:placeholder:!text-gray-500',
                            '[&>div.grid_textarea]:!bg-white [&>div.grid_textarea]:!text-gray-900',
                            '[&>div.grid_button]:!bg-white [&>div.grid_button]:!text-gray-900',
                            '[&>div.grid_button_span]:!text-gray-900',
                            // Apply Filters — white on navy (was nearly invisible as dark-on-navy)
                            '[&>div.flex>button:first-child]:!bg-white [&>div.flex>button:first-child]:!text-[#0E3777]',
                            '[&>div.flex>button:first-child]:hover:!bg-white/90',
                            '[&>div.flex>button:first-child]:disabled:!bg-white/50 [&>div.flex>button:first-child]:disabled:!text-[#0E3777]/60',
                            // Clear All — light outline on navy
                            '[&>div.flex>button:not(:first-child)]:!border-white/70 [&>div.flex>button:not(:first-child)]:!bg-transparent',
                            '[&>div.flex>button:not(:first-child)]:!text-white [&>div.flex>button:not(:first-child)]:hover:!bg-white/10',
                          ].join(' ')
                        : ''
                    }
                    showSummary={config?.filterOptions?.showSummary !== false}
                    compact={config?.filterOptions?.compact}
                  />

                  {/* Filter Summary */}
                  <div
                    className={
                      isProcurementStyleTable
                        ? 'mt-3 text-sm text-white/85'
                        : 'mt-3 text-sm text-gray-600'
                    }
                  >
                    Showing {filteredData.length} records
                    {pagination.currentPage > 1 && (
                      <span> · Page {pagination.currentPage}</span>
                    )}
                    {filtersApplied && getActiveFiltersCount() > 0 && hasActiveFilters && (
                      <span className="ml-2">
                        (Filtered by: {filterService!.getFilterDescription(filterState.values)})
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <h5 className={isProcurementStyleTable ? 'text-white' : undefined}>
                  No filters configured
                </h5>
              )}
            </div>
          </div>
        )}

        {/* Mobile Card View - Only for Praja CRM */}
        {!isProcurementStyleTable && (
          <div className="md:hidden space-y-4 mt-1.5">
            {filteredData.map((item, index) => {
              const lead = item;
              const rowId = getLeadRowId?.(lead);
              const isHighlighted = Boolean(
                (highlightedLeadId && rowId && highlightedLeadId === rowId) ||
                  getLeadRowStyle?.(lead)?.backgroundColor,
              );

              return (
                <div
                  key={lead.id || index}
                  data-row-id={rowId}
                  data-highlighted={isHighlighted ? 'true' : undefined}
                  style={getLeadRowStyle?.(lead)}
                  className={`rounded-xl border p-4 shadow-sm cursor-pointer transition-colors ${
                    isHighlighted
                      ? 'border-blue-300 text-blue-900 ring-2 ring-blue-400 animate-pulse'
                      : 'border bg-white hover:bg-gray-50'
                  }`}
                  onClick={() => {
                    if (!isInPageBuilder && effectiveDetailMode !== 'none') {
                      handleRowClick(item);
                    }
                  }}
                >
                  {isHighlighted ? (
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                      Called back
                    </p>
                  ) : null}
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                    <div>
                      <p className="text-xs text-gray-500">Name</p>
                      <p className="font-semibold">{lead.name}</p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500">Praja ID</p>
                      <p>{lead.praja_id}</p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500">Phone Number</p>
                      <p>{lead.phone_number}</p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500">Party</p>
                      <p>{lead.affiliated_party}</p>
                    </div>

                    <div className="col-span-2">
                      <p className="text-xs text-gray-500">Lead Score</p>
                      <p>{lead.lead_score}</p>
                    </div>

                    <div className="col-span-2">
                      <Button
                        className="w-full mt-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLead(item);
                          setIsLeadModalOpen(true);
                        }}
                      >
                        View Profile
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Desktop / Responsive Table */}
        <div
          className={
            isProcurementStyleTable
              ? 'relative mt-1 w-full max-w-full'
              : 'hidden md:block w-full max-w-full min-w-0 relative mt-1.5'
          }
        >
          {/* Loading Overlay */}
          {tableLoading && (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10 rounded-lg">
              <div className="flex items-center space-x-2">
                <span className="text-gray-600"></span>
              </div>
            </div>
          )}

          <div data-bulk-edit-keep className="contents">
          <CustomTable
            columns={tableColumns.map((col) => ({
              header: col.header,
              accessor: col.accessor,
              type: col.type,
              linkField: col.linkField,
              editableInTable: col.editableInTable,
              openCard: col.openCard,
              actionApiEndpoint: col.actionApiEndpoint,
              actionApiMethod: col.actionApiMethod,
              actionApiHeaders: col.actionApiHeaders,
              actionApiPayload: col.actionApiPayload,
              align: col.align,
              width: col.width,
              minWidth: col.minWidth,
              maxWidth: col.maxWidth,
            })) as CustomTableColumn[]}
            data={filteredData}
            loading={tableLoading}
            emptyMessage={config?.emptyMessage || 'No data found'}
            onRowClick={
              bulkSelectionEnabled && bulkEditMode
                ? handleBulkRowClick
                : !isInPageBuilder && effectiveDetailMode !== 'none'
                  ? handleRowClick
                  : undefined
            }
            getRowId={getLeadRowId}
            getRowClassName={getLeadRowClassName}
            getRowStyle={getLeadRowStyle}
            renderCell={renderCell}
            // Navy theme for Unmannd / procurement request tables only. All Leads & CRM stay black.
            headerBgColor={isProcurementStyleTable ? procurementHeaderBg : 'bg-black'}
            headerTextColor="text-white"
            dense={false}
            comfortable={isProcurementStyleTable}
            fillHeight={false}
            fitViewport={isProcurementStyleTable}
            className={isProcurementStyleTable ? procurementTableFrame : undefined}
            hoverable={(bulkSelectionEnabled && bulkEditMode) || (!isInPageBuilder && effectiveDetailMode !== 'none')}
            rowSelection={
              bulkSelectionEnabled && bulkEditMode
                ? {
                    selectedRowIds,
                    onToggleRow: (row, selected) => toggleBulkRowSelection(row, selected),
                    onToggleAll: toggleBulkSelectAll,
                    canSelectRow: canSelectBulkRow,
                    placeBesideAccessor: 'item_name',
                  }
                : undefined
            }
          />
          </div>
        </div>

        {/* Server-side pagination — editable page + Previous/Next */}
        {filteredData.length > 0 &&
          (pagination.nextPageLink || pagination.previousPageLink || pagination.currentPage > 1 || totalPages > 1) && (
            <div
              data-bulk-edit-keep
              className={
                isProcurementStyleTable
                  ? 'mt-auto -mx-1 flex shrink-0 items-center justify-end gap-4 border-t border-gray-300 px-1 pt-4 pb-1 sm:-mx-2 sm:px-2'
                  : 'flex justify-between items-center mt-2 pt-2 border-t border-gray-200'
              }
            >
              {isProcurementStyleTable ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    inputMode="numeric"
                    aria-label="Go to page"
                    value={pageInput}
                    disabled={tableLoading}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^\d]/g, '').slice(0, 4);
                      setPageInput(raw);
                    }}
                    onBlur={commitPageInput}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        commitPageInput();
                      }
                    }}
                    className="h-9 w-12 rounded-lg border-gray-200 bg-white px-1 text-center text-sm font-medium tabular-nums text-gray-900 shadow-none"
                  />
                  <span className="text-sm text-gray-500 tabular-nums">
                    of {String(totalPages).padStart(2, '0')}
                  </span>
                </div>
              ) : (
                <span className="text-sm text-gray-600">Page {pagination.currentPage}</span>
              )}

              <div className="flex items-center gap-2">
                <CustomButton
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousPage}
                  disabled={!pagination.previousPageLink || tableLoading}
                  className={
                    isProcurementStyleTable
                      ? 'h-9 rounded-full border-0 bg-gray-100 px-5 font-semibold text-gray-500 hover:bg-gray-200 hover:text-gray-600 disabled:opacity-60 disabled:cursor-not-allowed'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300 rounded-md px-4 py-1.5 h-auto disabled:opacity-50 disabled:cursor-not-allowed'
                  }
                >
                  Previous
                </CustomButton>

                <CustomButton
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={!pagination.nextPageLink || tableLoading}
                  className={
                    isProcurementStyleTable
                      ? 'h-9 rounded-full border-0 bg-gray-200 px-5 font-bold text-gray-900 hover:bg-gray-300 disabled:opacity-60 disabled:cursor-not-allowed'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300 rounded-md px-4 py-1.5 h-auto disabled:opacity-50 disabled:cursor-not-allowed'
                  }
                >
                  Next
                </CustomButton>
              </div>
            </div>
          )}
      </div>

      <Dialog open={bulkStatusPickerOpen} onOpenChange={setBulkStatusPickerOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Select by status</DialogTitle>
            <DialogDescription>
              This page has requests with different statuses. Choose which status to select.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 pt-2">
            {bulkStatusPickerOptions.map((opt) => (
              <Button
                key={opt.status}
                type="button"
                variant="outline"
                className="h-10 justify-between rounded-md px-4"
                onClick={() => selectBulkRowsByStatus(opt.status)}
              >
                <span className="font-semibold uppercase tracking-wide">
                  {getRequestStatusLabel(opt.status, requestStatusEntityType)}
                </span>
                <span className="text-muted-foreground">{opt.count}</span>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Lead Modal with LeadCard */}
      <Dialog open={isLeadModalOpen} onOpenChange={(open) => {
        // Locked: closing only via a disposition button (handled below in
        // onActionComplete), not outside click / Escape / the X button —
        // all three close attempts arrive here as the same open=false, so
        // blocking it in one place covers all of them.
        if (!open && config?.lockLeadModal) {
          return;
        }
        setIsLeadModalOpen(open);
        // Reset selected lead when dialog closes to prevent stale state
        if (!open) {
          setSelectedLead(null);
          setActionButtonsVisible(false);
          setIsLeadActionSubmitting(false);
          // Reset the leadCardRef to ensure clean state on next open
          leadCardRef.current = null;
        }
      }}>
        <DialogContent
          className="max-w-6xl max-h-[90vh] flex flex-col p-0 gap-0"
          hideCloseButton={Boolean(config?.lockLeadModal)}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>
              {selectedLead?.name || (selectedLead as any)?.data?.name || 'Lead Details'}
            </DialogTitle>
            <DialogDescription>
              View and manage lead information
            </DialogDescription>
          </DialogHeader>

          {selectedLead && (() => {
            const transformLeadForCard = (lead: any) => {
              const originalLead = data.find(l => 
                l.id === lead.id || 
                l.id === lead.user_id ||
                (lead.praja_id && l.data?.praja_id === lead.praja_id)
              ) || lead;
              const leadData = originalLead.data || {};
              return {
                id: lead.id || originalLead.id,
                created_at: lead.created_at || originalLead.created_at,
                name: lead.name || leadData.name || 'N/A',
                email: lead.email || leadData.email || '',
                phone: lead.phone_number || leadData.phone_number || leadData.phone_no || leadData.phone || '',
                phone_no: lead.phone_number || leadData.phone_number || leadData.phone_no || leadData.phone || '',
                phone_number: lead.phone_number || leadData.phone_number || leadData.phone_no || leadData.phone || '',
                company: lead.company || leadData.company || '',
                position: lead.position || leadData.position || '',
                source: lead.source || leadData.lead_source || leadData.source || '',
                lead_source: leadData.lead_source || lead.source || '',
                status: lead.status || lead.lead_stage || leadData.lead_stage || leadData.lead_status || 'New',
                notes: lead.notes || leadData.notes || leadData.latest_remarks || '',
                budget: lead.budget || leadData.budget || 0,
                location: lead.location || leadData.location || leadData.state || '',
                tags: lead.tags || leadData.tags || [],
                display_pic_url: lead.display_pic_url || leadData.display_pic_url || null,
                linkedin_profile: lead.linkedin_profile || leadData.linkedin_profile || '',
                website: lead.website || leadData.website || '',
                next_follow_up: lead.next_follow_up || leadData.next_follow_up || leadData.next_call_at || '',
                lead_stage: lead.lead_stage || leadData.lead_stage || leadData.lead_status || 'New',
                // Never fall back to user_id — can collide with open/highlight-by-praja.
                praja_id: lead.praja_id || leadData.praja_id || '',
                affiliated_party: lead.affiliated_party || leadData.affiliated_party || '',
                rm_dashboard: lead.rm_dashboard || leadData.rm_dashboard || '',
                user_profile_link: lead.user_profile_link || leadData.user_profile_link || '',
                whatsapp_link: lead.whatsapp_link || leadData.whatsapp_link || '',
                package_to_pitch: lead.package_to_pitch || leadData.package_to_pitch || '',
                premium_poster_count: lead.premium_poster_count || leadData.premium_poster_count || 0,
                last_active_date: lead.last_active_date || leadData.last_active_date || '',
                last_active_date_time: lead.last_active_date_time || leadData.last_active_date_time || '',
                latest_remarks: lead.latest_remarks || leadData.latest_remarks || '',
                tasks: lead.tasks || leadData.tasks || [],
                data: {
                  ...leadData,
                  name: leadData.name || lead.name || 'N/A',
                  phone_number: leadData.phone_number || lead.phone_number || '',
                  lead_stage: leadData.lead_stage || lead.lead_stage || 'New',
                  praja_id: leadData.praja_id || lead.praja_id || '',
                },
              };
            };

            const transformedLead = transformLeadForCard(selectedLead);

            return (
              <>
                <div className="flex-1 min-h-0 overflow-y-auto">
                  <LeadCardCarousel
                    ref={leadCardRef}
                    config={{
                      ...config,
                      statusDataApiEndpoint: undefined,
                    }}
                    initialLead={transformedLead}
                    isInModal={true}
                    hideActionBar
                    onLeadUpdate={handleModalLeadUpdate}
                    onActionButtonsVisibilityChange={setActionButtonsVisible}
                    onCallBackModalChange={setIsCallBackModalOpen}
                    onUpdatingChange={setIsLeadActionSubmitting}
                    onActionComplete={(leadId, action) => {
                      // Remove the lead from the table only when it's NOT "Call Back Later" (callback leads stay in list)
                      if (action !== "Call Back Later") {
                        const normalizedId = leadId != null ? Number(leadId) : NaN;
                        if (!Number.isNaN(normalizedId)) {
                          setData(prevData => prevData.filter(lead => Number(lead.id) !== normalizedId));
                          setFilteredData(prevData => prevData.filter(lead => Number(lead.id) !== normalizedId));
                        }
                      }
                      // Always close the modal
                      setIsLeadModalOpen(false);
                      setSelectedLead(null);
                      setActionButtonsVisible(false);
                      setIsLeadActionSubmitting(false);
                    }}
                  />
                </div>
                {/* Action bar at bottom of modal — 4 equal columns so Call Back Later stays on-screen */}
                {actionButtonsVisible && !isCallBackModalOpen && (
                <div className="shrink-0 border-t border-slate-200 bg-white px-3 md:px-4 lg:px-6 py-3 md:py-4 grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-2 lg:gap-3 w-full max-w-full box-border">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full max-w-full min-w-0 h-auto min-h-12 rounded-xl gap-1.5 md:gap-2 px-2 md:px-2.5 lg:px-3 py-2.5 text-xs md:text-sm !whitespace-normal leading-tight hover:bg-slate-100 hover:text-slate-900"
                    disabled={isLeadActionSubmitting}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('[LeadTable] Trial Activated clicked, ref:', leadCardRef.current);
                      if (leadCardRef.current?.handleTrialActivated) {
                        leadCardRef.current.handleTrialActivated();
                      } else {
                        console.error('[LeadTable] handleTrialActivated not available on ref');
                      }
                    }}
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 break-words">Trial Activated</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full max-w-full min-w-0 h-auto min-h-12 rounded-xl gap-1.5 md:gap-2 px-2 md:px-2.5 lg:px-3 py-2.5 text-xs md:text-sm !whitespace-normal leading-tight hover:bg-slate-100 hover:text-slate-900"
                    disabled={isLeadActionSubmitting}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('[LeadTable] Not Interested clicked, ref:', leadCardRef.current);
                      if (leadCardRef.current?.handleNotInterestedClick) {
                        leadCardRef.current.handleNotInterestedClick();
                      } else {
                        console.error('[LeadTable] handleNotInterestedClick not available on ref');
                      }
                    }}
                  >
                    <MessageCircle className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 break-words">Not Interested</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full max-w-full min-w-0 h-auto min-h-12 rounded-xl gap-1.5 md:gap-2 px-2 md:px-2.5 lg:px-3 py-2.5 text-xs md:text-sm !whitespace-normal leading-tight hover:bg-slate-100 hover:text-slate-900"
                    disabled={isLeadActionSubmitting}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('[LeadTable] Call Not Connected clicked, ref:', leadCardRef.current);
                      if (leadCardRef.current?.handleCallNotConnected) {
                        leadCardRef.current.handleCallNotConnected();
                      } else {
                        console.error('[LeadTable] handleCallNotConnected not available on ref');
                      }
                    }}
                  >
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 break-words">Not Connected</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full max-w-full min-w-0 h-auto min-h-12 rounded-xl gap-1.5 md:gap-2 px-2 md:px-2.5 lg:px-3 py-2.5 text-xs md:text-sm !whitespace-normal leading-tight hover:bg-slate-100 hover:text-slate-900"
                    disabled={isLeadActionSubmitting}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('[LeadTable] Call Back Later clicked, ref:', leadCardRef.current);
                      if (leadCardRef.current?.handleCallBackLaterClick) {
                        leadCardRef.current.handleCallBackLaterClick();
                      } else {
                        console.error('[LeadTable] handleCallBackLaterClick not available on ref');
                      }
                    }}
                  >
                    <Clock className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 break-words">Call Back Later</span>
                  </Button>
                </div>
                )}
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Receive Shipments: inventory manager quick-actions modal */}
      {effectiveDetailMode === 'receive_shipments' && (
        <ReceiveShipmentDetailModal
          open={isRecordDetailModalOpen}
          onOpenChange={(open) => {
            setIsRecordDetailModalOpen(open);
            if (!open) setSelectedRecord(null);
          }}
          record={selectedRecord}
          onSuccess={async () => {
            setSelectedRecord(null);
            setIsRecordDetailModalOpen(false);
            try {
              await fetchFilteredData();
            } catch (e) {
              console.error('Error refreshing table after receive action:', e);
            }
          }}
        />
      )}

      {/* Unmannd All Requests — branded detail modal (dark header/footer). */}
      {useUnmanndDetailModal && (
        <UnmanndRequestDetailModal
          open={isRecordDetailModalOpen}
          onOpenChange={(open) => {
            setIsRecordDetailModalOpen(open);
            if (!open) setSelectedRecord(null);
          }}
          record={selectedRecord}
          entityType="unmannd_request"
          formModalFields={
            ((config?.formModalFields?.length
              ? config.formModalFields
              : DEFAULT_INVENTORY_REQUEST_FORM_MODAL_FIELDS) ?? []
            ).map((field) => {
              if (field.key === 'urgency_level' || field.key === 'priority') {
                return { ...field, label: 'Priority', enabled: false };
              }
              const vendorEditable = (config?.formModalFields?.length
                ? config.formModalFields
                : DEFAULT_INVENTORY_REQUEST_FORM_MODAL_FIELDS
              ).some((f) => f.key === 'vendor' && f.enabled);
              if (field.key === 'product_link' && vendorEditable) {
                return { ...field, enabled: true, link: true };
              }
              return field;
            })
          }
          formModalTitle={config?.formModalTitle}
          formModalDescription={config?.formModalDescription}
          actionButtons={config?.statusButtons}
          showSaveButton={config?.showFormModalSaveButton}
          inventoryWorkflowMode={config?.inventoryWorkflowMode}
          showFinalPriceSection={config?.showFinalPriceSection}
          modalFlags={config?.modalFlags}
          onUpdate={effectiveApiEndpoint && (effectiveApiEndpoint.includes('/crm-records/records') || effectiveApiEndpoint.includes('/records/'))
            ? async (recordId: number, patch: { data?: Record<string, unknown> }) => {
                const base = effectiveApiEndpoint.split('?')[0].replace(/\/$/, '');
                const url = `${base}/${recordId}/`;
                const currentFromSelected = selectedRecord && selectedRecord.id === recordId ? selectedRecord : null;
                const currentFromList = currentFromSelected == null ? data.find((r: any) => r.id === recordId) : null;
                const existingData =
                  (currentFromSelected?.data as Record<string, unknown> | undefined) ||
                  (currentFromList?.data as Record<string, unknown> | undefined) ||
                  {};
                const fullData = patch.data != null ? { ...existingData, ...patch.data } : existingData;
                const body = patch.data != null ? { ...patch, data: fullData } : patch;
                const response = await apiClient.patch(url, body);
                const updated = response.data;
                setSelectedRecord((prev: any) =>
                  prev?.id === recordId ? { ...prev, ...updated, data: updated?.data ?? fullData } : prev,
                );
                setData((prev) =>
                  prev.map((r: any) =>
                    r.id === recordId ? { ...r, ...updated, data: updated?.data ?? fullData } : r,
                  ),
                );
                setFilteredData((prev) =>
                  prev.map((r: any) =>
                    r.id === recordId ? { ...r, ...updated, data: updated?.data ?? fullData } : r,
                  ),
                );
              }
            : undefined}
          onRecordUpdated={async (recordId: number) => {
            try { await fetchFilteredData(); } catch (e) { console.error('Error refreshing table after form modal update', e); }
          }}
          showDeleteRequestButton={config?.showDeleteRequestButton}
          showHistoryButton={config?.showHistoryButton ?? true}
          onDeleted={async (recordId: number) => {
            setData((prev) => prev.filter((r: any) => r.id !== recordId));
            setFilteredData((prev) => prev.filter((r: any) => r.id !== recordId));
            setSelectedRecord(null);
            setIsRecordDetailModalOpen(false);
            try {
              await fetchFilteredData();
            } catch (e) {
              console.error('Error refreshing table after delete:', e);
            }
          }}
          onNavigate={handleNavigateRecord}
          hasPrevious={hasPreviousRecord}
          hasNext={hasNextRecord}
          navigationPosition={navigationPosition}
        />
      )}

      {/* Form-style edit modal (inventory form layout + action buttons) */}
      {effectiveDetailMode !== 'receive_shipments' && useFormModal && !useUnmanndDetailModal && (
        <InventoryFormEditModal
          open={isRecordDetailModalOpen}
          onOpenChange={(open) => {
            setIsRecordDetailModalOpen(open);
            if (!open) setSelectedRecord(null);
          }}
          record={selectedRecord}
          entityType={config?.entityType}
          formModalFields={
            ((config?.formModalFields?.length
              ? config.formModalFields
              : effectiveDetailMode === 'inventory_payment_modal'
                ? DEFAULT_PAYMENT_MODAL_FIELDS
                : config?.entityType === 'inventory_request' || config?.entityType === 'unmannd_request'
                  ? DEFAULT_INVENTORY_REQUEST_FORM_MODAL_FIELDS
                  : []) ?? []
            ).map((field) => {
              if (field.key === 'urgency_level' || field.key === 'priority') {
                return { ...field, label: 'Priority', enabled: false };
              }
              const vendorEditable = (config?.formModalFields?.length
                ? config.formModalFields
                : DEFAULT_INVENTORY_REQUEST_FORM_MODAL_FIELDS
              ).some((f) => f.key === 'vendor' && f.enabled);
              if (
                field.key === 'product_link' &&
                vendorEditable &&
                (config?.entityType === 'inventory_request' || config?.entityType === 'unmannd_request')
              ) {
                return { ...field, enabled: true, link: true };
              }
              return field;
            })
          }
          formModalTitle={config?.formModalTitle}
          formModalDescription={config?.formModalDescription}
          actionButtons={effectiveDetailMode === 'inventory_payment_modal' ? undefined : config?.statusButtons}
          paymentButtonConfig={effectiveDetailMode === 'inventory_payment_modal' ? config?.paymentModalConfig : undefined}
          showSaveButton={config?.showFormModalSaveButton}
          inventoryWorkflowMode={config?.inventoryWorkflowMode}
          showFinalPriceSection={config?.showFinalPriceSection}
          modalFlags={config?.modalFlags}
          onUpdate={effectiveApiEndpoint && (effectiveApiEndpoint.includes('/crm-records/records') || effectiveApiEndpoint.includes('/records/'))
            ? async (recordId: number, patch: { data?: Record<string, unknown> }) => {
                const base = effectiveApiEndpoint.split('?')[0].replace(/\/$/, '');
                const url = `${base}/${recordId}/`;
                const currentFromSelected = selectedRecord && selectedRecord.id === recordId ? selectedRecord : null;
                const currentFromList = currentFromSelected == null ? data.find((r: any) => r.id === recordId) : null;
                const existingData =
                  (currentFromSelected?.data as Record<string, unknown> | undefined) ||
                  (currentFromList?.data as Record<string, unknown> | undefined) ||
                  {};
                const fullData = patch.data != null ? { ...existingData, ...patch.data } : existingData;
                const body = patch.data != null ? { ...patch, data: fullData } : patch;
                const response = await apiClient.patch(url, body);
                const updated = response.data;
                setSelectedRecord((prev: any) =>
                  prev?.id === recordId ? { ...prev, ...updated, data: updated?.data ?? fullData } : prev,
                );
                setData((prev) =>
                  prev.map((r: any) =>
                    r.id === recordId ? { ...r, ...updated, data: updated?.data ?? fullData } : r,
                  ),
                );
                setFilteredData((prev) =>
                  prev.map((r: any) =>
                    r.id === recordId ? { ...r, ...updated, data: updated?.data ?? fullData } : r,
                  ),
                );
              }
            : undefined}
          onRecordUpdated={async (recordId: number) => {
            try { await fetchFilteredData(); } catch (e) { console.error('Error refreshing table after form modal update', e); }
          }}
          showDeleteRequestButton={config?.showDeleteRequestButton}
          showHistoryButton={config?.showHistoryButton}
          onDeleted={async (recordId: number) => {
            setData((prev) => prev.filter((r: any) => r.id !== recordId));
            setFilteredData((prev) => prev.filter((r: any) => r.id !== recordId));
            setSelectedRecord(null);
            setIsRecordDetailModalOpen(false);
            try {
              await fetchFilteredData();
            } catch (e) {
              console.error('Error refreshing table after delete:', e);
            }
          }}
          onNavigate={handleNavigateRecord}
          hasPrevious={hasPreviousRecord}
          hasNext={hasNextRecord}
          navigationPosition={navigationPosition}
        />
      )}

      {/* Default record detail modal (inventory_request, inventory_item, etc.) */}
      {effectiveDetailMode !== 'receive_shipments' && !useFormModal && (
      <RecordDetailModal
        open={isRecordDetailModalOpen}
        onOpenChange={(open) => {
          setIsRecordDetailModalOpen(open);
          if (!open) setSelectedRecord(null);
        }}
        record={selectedRecord}
        entityType={config?.entityType}
        editableFields={(() => {
          const fromColumns = (config?.columns ?? []).filter((c: { key?: string; editable?: boolean }) => c.key && c.editable).map((c: { key: string }) => c.key);
          const fromModalConfig = (config?.modalFieldConfig ?? []).filter((f: { key: string; editable: boolean }) => f.key && f.editable).map((f: { key: string }) => f.key);
          const merged = [...new Set([...fromColumns, ...fromModalConfig])];
          return merged.length > 0 ? merged : undefined;
        })()}
        modalFlags={config?.modalFlags}
        showFinalPriceSection={config?.showFinalPriceSection}
        showDeleteRequestButton={config?.showDeleteRequestButton}
        showHistoryButton={config?.showHistoryButton}
        onUpdate={effectiveApiEndpoint && (effectiveApiEndpoint.includes('/crm-records/records') || effectiveApiEndpoint.includes('/records/'))
          ? async (recordId: number, patch: { data?: Record<string, unknown> }) => {
              const base = effectiveApiEndpoint.split('?')[0].replace(/\/$/, '');
              const url = `${base}/${recordId}/`;

              // Ensure we never accidentally overwrite the whole JSONB with a partial object.
              // Merge incoming patch.data with the current record.data before sending to the API.
              const currentFromSelected = selectedRecord && selectedRecord.id === recordId ? selectedRecord : null;
              const currentFromList =
                currentFromSelected == null
                  ? data.find((r: any) => r.id === recordId)
                  : null;
              const existingData =
                (currentFromSelected?.data as Record<string, unknown> | undefined) ||
                (currentFromList?.data as Record<string, unknown> | undefined) ||
                {};

              const fullData =
                patch.data != null ? { ...existingData, ...patch.data } : existingData;

              const body =
                patch.data != null
                  ? { ...patch, data: fullData }
                  : patch;

              const response = await apiClient.patch(url, body);
              const updated = response.data;

              setSelectedRecord((prev: any) =>
                prev?.id === recordId
                  ? {
                      ...prev,
                      ...updated,
                      data: updated?.data ?? fullData,
                    }
                  : prev,
              );
              setData((prev) =>
                prev.map((r: any) =>
                  r.id === recordId
                    ? {
                        ...r,
                        ...updated,
                        data: updated?.data ?? fullData,
                      }
                    : r,
                ),
              );
              setFilteredData((prev) =>
                prev.map((r: any) =>
                  r.id === recordId
                    ? {
                        ...r,
                        ...updated,
                        data: updated?.data ?? fullData,
                      }
                    : r,
                ),
              );
            }
          : undefined}
        onDeleted={async (recordId: number) => {
          // Optimistically remove from current client-side data
          setData((prev) => prev.filter((r: any) => r.id !== recordId));
          setFilteredData((prev) => prev.filter((r: any) => r.id !== recordId));
          setSelectedRecord(null);
          setIsRecordDetailModalOpen(false);
          // Re-fetch from server so pagination / counts stay correct
          try {
            await fetchFilteredData();
          } catch (e) {
            console.error('Error refreshing table after delete:', e);
          }
        }}
        onRecordUpdated={async (recordId: number) => {
          // Refetch table so status/other fields updated by modal actions (e.g. Proceed to PM) are reflected
          try {
            await fetchFilteredData();
          } catch (e) {
            console.error('Error refreshing table after record update:', e);
          }
        }}
        actionButtons={config?.statusButtons}
      />
      )}

      {effectiveDetailMode === 'lead_assignment_modal' && (
        <AssignLeadModal
          open={isCustomModalOpen}
          onOpenChange={(open) => {
            setIsCustomModalOpen(open);
            if (!open) setSelectedRecord(null);
          }}
          leadRecord={selectedRecord}
          updateBasePath={effectiveApiEndpoint.split('?')[0].replace(/\/$/, '')}
          title={config?.formModalTitle || 'Assign Lead'}
          description={config?.formModalDescription || 'Select a user and assign this lead.'}
          onSaved={async () => {
            try {
              await fetchFilteredData();
            } catch (e) {
              console.error('Error refreshing table after lead assignment:', e);
            }
          }}
        />
      )}
    </div>
  );
}