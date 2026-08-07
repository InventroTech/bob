/** Presentational JSX for the lead table. */

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Filter, MessageCircle, CheckCircle2, Clock, AlertCircle, Search, X } from 'lucide-react';
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
  } = props;

  // DYNAMIC TITLE LOGIC based on URL path
  const pathname = typeof window !== 'undefined' ? window.location.pathname.toLowerCase() : '';
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
  // Unmannd / inventory tables reuse LeadTable; do not show the CRM default "All Leads".
  const configuredTitle = (config?.title || '').trim();
  let displayTitle =
    isInventoryLikeForTitle &&
    (!configuredTitle || configuredTitle.toLowerCase() === 'all leads')
      ? undefined
      : configuredTitle || undefined;

  if (!displayTitle && !isInventoryLikeForTitle) {
    if (pathname.includes('follow')) {
      displayTitle = "Follow Up Leads";
    } else if (pathname.includes('pending')) {
      displayTitle = "Pending Leads";
    } else {
      displayTitle = "All Leads";
    }
  }
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

  const tableTitle =
    isInventoryLikeForTitle && configuredTitle.toLowerCase() === 'all leads'
      ? ''
      : configuredTitle;

  return (
    <>
      {/* Mobile Page Title - Dynamically changes based on URL */}
      {displayTitle ? (
        <div className="md:hidden w-full pb-3 px-4 pt-4">
          <h2 className="text-2xl font-bold text-gray-900">
            {displayTitle}
          </h2>
        </div>
      ) : null}

      <div className="w-full max-w-full min-w-0 border border-gray-200 rounded-lg bg-white px-2 py-1.5">
        {/* Toolbar — tight under page header so All Requests fits with less scroll */}
        <div
          className={`flex items-center gap-3 flex-wrap ${
            tableTitle || displayTitle ? 'justify-between' : 'justify-end'
          }`}
        >
          {(displayTitle || tableTitle) ? (
            <h5 className="hidden md:block !m-0 !text-sm !font-semibold !leading-none text-gray-900">
              {displayTitle || tableTitle}
            </h5>
          ) : null}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search..."
                value={displaySearchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9 h-8"
              />
            </div>
            <CustomButton
              variant="outline"
              size="sm"
              icon={<Filter className="h-4 w-4" />}
              onClick={(e) => {
                e.stopPropagation();
                setShowFilters(!showFilters);
              }}
            >
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </CustomButton>
          </div>
        </div>

        {showFilters && (
          <div className="mt-2 mb-1.5">
            <div className="bg-gray-50 p-2.5 rounded-lg border">
              {/* Use new dynamic filter system if filters are configured */}
              {hasActiveFilters ? (
                <div className="space-y-3">
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
                    className=""
                    showSummary={config?.filterOptions?.showSummary !== false}
                    compact={config?.filterOptions?.compact}
                  />

                  {/* Filter Summary */}
                  <div className="mt-3 text-sm text-gray-600">
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
                <h5>No filters configured</h5>
              )}
            </div>
          </div>
        )}

        {/* Mobile Card View */}
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

        {/* Desktop Table */}
        <div className="hidden md:block w-full max-w-full min-w-0 relative mt-1.5">
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
            })) as CustomTableColumn[]}
            data={filteredData}
            loading={tableLoading}
            emptyMessage={config?.emptyMessage || 'No data found'}
            onRowClick={!isInPageBuilder && effectiveDetailMode !== 'none' ? handleRowClick : undefined}
            renderCell={renderCell}
            headerBgColor="bg-black"
            headerTextColor="text-white"
            hoverable={!isInPageBuilder && effectiveDetailMode !== 'none'}
          />
        </div>

        {/* Server-side pagination — Previous/Next only (no page jump dropdown) */}
        {filteredData.length > 0 &&
          (pagination.nextPageLink || pagination.previousPageLink || pagination.currentPage > 1) && (
            <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-200">
              <span className="text-sm text-gray-600">Page {pagination.currentPage}</span>

              <div className="flex items-center gap-2">
                <CustomButton
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousPage}
                  disabled={!pagination.previousPageLink || tableLoading}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300 rounded-md px-4 py-1.5 h-auto disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </CustomButton>

                <CustomButton
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={!pagination.nextPageLink || tableLoading}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300 rounded-md px-4 py-1.5 h-auto disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </CustomButton>
              </div>
            </div>
          )}
      </div>

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
    </>
  );
}