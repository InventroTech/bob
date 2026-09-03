/** Presentational JSX for the lead table. */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { DynamicFilterBuilder } from '@/components/DynamicFilterBuilder';
import { CustomButton } from '@/components/ui/CustomButton';
import { CustomTable, type CustomTableColumn } from '@/components/ui/CustomTable';
import {
  DEFAULT_INVENTORY_REQUEST_FORM_MODAL_FIELDS,
  DEFAULT_PAYMENT_MODAL_FIELDS,
} from './constants';
import type { LeadTableModel } from './useLeadTable';
import {
  formatBulkActionLabel,
} from './utils';
import { urgencyToneButtonClassName } from '@/lib/utils/urgencyButtonStyles';

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
    bulkSelectionStatus,
    bulkActionButtons,
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
  } = props;

  // Row navigation for the detail modals: lets users page through filteredData
  // without closing the modal, scrolling back to the table, and reopening the next row.
  const selectedRecordIndex = useMemo(() => {
    if (selectedRecord?.id == null) return -1;
    return filteredData.findIndex((r: any) => r.id === selectedRecord.id);
  }, [filteredData, selectedRecord]);

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

  // Used for Unmannd procurement table chrome (navy headers). Page title is the sticky header.
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
  const procurementTableFrame = 'overflow-hidden mb-3';
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
          ? 'flex h-full min-h-0 w-full flex-col'
          : undefined
      }
    >
      <div
        className={
          isProcurementStyleTable
            ? 'flex min-h-0 w-full max-w-full flex-1 flex-col bg-white px-1 py-1 sm:px-2'
            : 'w-full max-w-full min-w-0 border border-gray-200 rounded-lg bg-white px-2 py-1.5'
        }
      >
        {/* Toolbar — search + Filters. Page title lives in CustomAppPage sticky header. */}
        <div
          className={`flex shrink-0 flex-nowrap items-center justify-end ${
            isProcurementStyleTable ? 'gap-3 mb-3' : 'gap-3'
          }`}
        >
          <div className="flex shrink-0 items-center gap-2">
            <div
              className={`relative flex-1 max-w-sm ${
                isProcurementStyleTable ? 'min-w-[180px]' : 'min-w-[200px]'
              }`}
            >
              <Search
                className={
                  isProcurementStyleTable
                    ? 'absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1A44A1]'
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
                    ? 'h-9 rounded-[6px] border-gray-200 bg-white pl-9 text-sm shadow-sm'
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
                    ? 'h-[38px] w-[108px] justify-center rounded-[6px] border-0 bg-[#0E3777] px-3 text-white shadow-[0_4px_10px_rgba(10,94,205,0.35)] hover:bg-[#0b2d61] hover:text-white'
                    : 'h-[38px] w-[108px] justify-center rounded-[6px] border-0 bg-[linear-gradient(104.92deg,#1B6FE8_39.48%,#0A4CB8_93.66%)] px-3 text-white shadow-[0_4px_12px_rgba(8,71,184,0.4)] hover:bg-[linear-gradient(104.92deg,#4BA3FF_0%,#2885FF_45%,#1A7AE8_100%)] hover:text-white hover:shadow-[0_4px_10px_rgba(10,94,205,0.28)]'
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

        {bulkSelectionEnabled && selectedRowCount > 0 && bulkActionButtons.length > 0 ? (
          <div
            className={
              isProcurementStyleTable
                ? 'mb-2 flex shrink-0 flex-wrap items-center gap-3 rounded-md border border-[#0E3777]/20 bg-[#F4F8FF] px-3 py-2'
                : 'mb-2 flex flex-wrap items-center gap-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-2'
            }
          >
            <span className="text-sm font-medium text-gray-800">
              {selectedRowCount} selected
              {bulkSelectionStatus ? (
                <span className="ml-1 font-normal text-gray-500">
                  ({bulkSelectionStatus.replace(/_/g, ' ')})
                </span>
              ) : null}
            </span>
            <button
              type="button"
              className="text-sm text-[#1A44A1] underline-offset-2 hover:underline"
              onClick={clearBulkSelection}
            >
              Clear
            </button>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              {bulkActionButtons.map((btn) => {
                const applyingKey = `${btn.statusValue}::${(btn.targetAttribute || 'status').trim() || 'status'}`;
                const applyingThis = bulkApplying === applyingKey;
                const bulkLabel = formatBulkActionLabel(btn.label, selectedRowCount);
                return (
                  <Button
                    key={`${btn.label}-${btn.statusValue}-${btn.targetAttribute || 'status'}`}
                    type="button"
                    variant="outline"
                    size="sm"
                    className={cn(
                      'h-9 gap-1.5 rounded-md px-4 font-semibold',
                      urgencyToneButtonClassName(btn.statusValue, applyingThis)
                    )}
                    disabled={bulkApplying != null}
                    onClick={() => void handleBulkStatusAction(btn)}
                  >
                    {applyingThis ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
                    {applyingThis ? 'Updating…' : bulkLabel}
                  </Button>
                );
              })}
            </div>
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

              return (
                <div
                  key={lead.id || index}
                  className="rounded-xl border bg-white p-4 shadow-sm cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => {
                    if (!isInPageBuilder && effectiveDetailMode !== 'none') {
                      handleRowClick(item);
                    }
                  }}
                >
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
              ? 'relative mt-1 block min-h-0 w-full max-w-full flex-1 md:flex md:flex-col'
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
            onRowClick={!isInPageBuilder && effectiveDetailMode !== 'none' ? handleRowClick : undefined}
            renderCell={renderCell}
            // Navy theme for Unmannd / procurement request tables only. All Leads & CRM stay black.
            headerBgColor={isProcurementStyleTable ? procurementHeaderBg : 'bg-black'}
            headerTextColor="text-white"
            dense={false}
            comfortable={isProcurementStyleTable}
            fillHeight={isProcurementStyleTable}
            fitViewport={isProcurementStyleTable}
            className={isProcurementStyleTable ? procurementTableFrame : undefined}
            hoverable={!isInPageBuilder && effectiveDetailMode !== 'none'}
            rowSelection={
              bulkSelectionEnabled
                ? {
                    selectedRowIds,
                    onToggleRow: (row, selected) => toggleBulkRowSelection(row, selected),
                    onToggleAll: toggleBulkSelectAll,
                    canSelectRow: canSelectBulkRow,
                  }
                : undefined
            }
          />
        </div>

        {/* Server-side pagination — editable page + Previous/Next */}
        {filteredData.length > 0 &&
          (pagination.nextPageLink || pagination.previousPageLink || pagination.currentPage > 1 || totalPages > 1) && (
            <div
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
                  {opt.status.replace(/_/g, ' ')}
                </span>
                <span className="text-muted-foreground">{opt.count}</span>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Lead Modal with LeadCard */}
      <Dialog open={isLeadModalOpen} onOpenChange={(open) => {
        setIsLeadModalOpen(open);
        // Reset selected lead when dialog closes to prevent stale state
        if (!open) {
          setSelectedLead(null);
          setActionButtonsVisible(false);
          // Reset the leadCardRef to ensure clean state on next open
          leadCardRef.current = null;
        }
      }}>
        <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col p-0 gap-0" hideCloseButton>
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
                (lead.praja_id && (l.data?.praja_id === lead.praja_id || l.data?.user_id === lead.praja_id))
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
                praja_id: lead.praja_id || leadData.praja_id || leadData.user_id || '',
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