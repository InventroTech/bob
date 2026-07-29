/** Presentational JSX for the ticket table. */

import React from 'react';
import ShortProfileCard from '../../ui/ShortProfileCard';
import { Badge } from '@/components/ui/badge';
import { TicketCarousel } from '../ticket-carousel';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { X, Filter, Calendar, Clock, Search, ChevronDown, Calendar as CalendarIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { CustomButton } from '@/components/ui/CustomButton';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';

import type { TicketTableModel } from './useTicketTable';
import {
  getStatusColor,
  SUPPORT_TICKET_STATE_FILTER_OPTIONS,
  SUPPORT_TICKET_CALL_ATTEMPT_FILTER_OPTIONS,
} from './utils';

export function TicketTableView(props: TicketTableModel) {
  const {
    config,
    loading,
    tableLoading,
    searchLoading,
    displaySearchTerm,
    showFilters,
    setShowFilters,
    resolutionStatusFilter,
    setResolutionStatusFilter,
    assignedToFilter,
    setAssignedToFilter,
    posterStatusFilter,
    setPosterStatusFilter,
    stateFilter,
    setStateFilter,
    callAttemptsFilter,
    setCallAttemptsFilter,
    dateRangeFilter,
    setDateRangeFilter,
    filtersApplied,
    filteredData,
    data,
    pagination,
    selectedTicket,
    setSelectedTicket,
    isTicketModalOpen,
    setIsTicketModalOpen,
    tableColumns,
    handleSearchChange,
    handleRowClick,
    handleTicketUpdate,
    handleActionClick,
    handlePageChange,
    handleNextPage,
    handlePreviousPage,
    applyFilters,
    resetFilters,
    getUniqueResolutionStatuses,
    getUniqueAssignedTo,
    getUniquePosterStatuses,
    apiPrefix,
    searchTerm,
    stateToParamValue,
  } = props;

if (loading) {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="text-gray-600">Loading tickets data...</div>
    </div>
  );
}

return (
  <>
    <div className="font-body overflow-x-auto border-2 border-gray-200 rounded-lg bg-white p-4">
      {/* Filter Section */}
      <div className="mb-4 relative">
        <div className="flex justify-between items-center mb-4 gap-4 flex-wrap">
          <h5>
            {config?.title || "Support Tickets"}
          </h5>
          <div className="flex items-center gap-2 relative">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search..."
                value={displaySearchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <CustomButton
              variant="outline"
              size="sm"
              icon={<Filter className="h-4 w-4" />}
              onClick={() => setShowFilters(!showFilters)}
              className="bg-gray-100 hover:bg-gray-200 rounded-md"
            >
              Filters
            </CustomButton>
          </div>
        </div>
      </div>

      {/* Filter Section */}
      <div className="mb-4">
        {showFilters && (
          <div className="bg-gray-50 p-4 rounded-lg border">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-gray-700 mb-2">
                  Resolution Status
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between"
                    >
                      <span className="text-sm">
                        {resolutionStatusFilter.length > 0
                          ? `${resolutionStatusFilter.length} status(es) selected`
                          : "All Resolution Statuses"}
                      </span>
                      <ChevronDown className="h-3 w-3 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-60 p-4" align="start">
                    <div className="space-y-3">
                      <h5>Select Resolution Statuses</h5>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {getUniqueResolutionStatuses().map((status) => (
                          <div key={status} className="flex items-center space-x-2">
                            <Checkbox
                              id={`resolution-${status}`}
                              checked={resolutionStatusFilter.includes(status)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setResolutionStatusFilter(prev => [...prev, status]);
                                } else {
                                  setResolutionStatusFilter(prev => prev.filter(s => s !== status));
                                }
                              }}
                            />
                            <label
                              htmlFor={`resolution-${status}`}
                              className="text-body-sm-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                              {status === null ? 'Open' : status}
                            </label>
                          </div>
                        ))}
                      </div>
                      {resolutionStatusFilter.length > 0 && (
                        <div className="pt-2 border-t">
                          <CustomButton
                            variant="ghost"
                            size="sm"
                            onClick={() => setResolutionStatusFilter([])}
                            className="text-xs"
                          >
                            Clear All
                          </CustomButton>
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <label className="block text-gray-700 mb-2">
                  Poster Status
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between"
                    >
                      <span className="text-sm">
                        {posterStatusFilter.length > 0
                          ? `${posterStatusFilter.length} status(es) selected`
                          : "All Poster Statuses"}
                      </span>
                      <ChevronDown className="h-3 w-3 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-60 p-4" align="start">
                    <div className="space-y-3">
                      <h4>Select Poster Statuses</h4>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {getUniquePosterStatuses().map((status) => (
                          <div key={status} className="flex items-center space-x-2">
                            <Checkbox
                              id={`poster-${status}`}
                              checked={posterStatusFilter.includes(status)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setPosterStatusFilter(prev => [...prev, status]);
                                } else {
                                  setPosterStatusFilter(prev => prev.filter(s => s !== status));
                                }
                              }}
                            />
                            <label
                              htmlFor={`poster-${status}`}
                              className="text-body-sm-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                              {status}
                            </label>
                          </div>
                        ))}
                      </div>
                      {posterStatusFilter.length > 0 && (
                        <div className="pt-2 border-t">
                          <CustomButton
                            variant="ghost"
                            size="sm"
                            onClick={() => setPosterStatusFilter([])}
                            className="text-xs"
                          >
                            Clear All
                          </CustomButton>
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <label className="block text-gray-700 mb-2">
                  Assigned To
                </label>
                <Select value={assignedToFilter} onValueChange={setAssignedToFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Assignees" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Assignees</SelectItem>
                    <SelectItem value="myself">Assigned to myself</SelectItem>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {getUniqueAssignedTo().map(assignee => (
                      <SelectItem key={assignee.id} value={assignee.id}>
                        {assignee.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-gray-700 mb-2">
                  State
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between"
                    >
                      <span className="text-sm">
                        {stateFilter.length > 0
                          ? `${stateFilter.length} state(s) selected`
                          : 'All States'}
                      </span>
                      <ChevronDown className="h-3 w-3 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-60 p-4" align="start">
                    <div className="space-y-3">
                      <h5>Select states</h5>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {SUPPORT_TICKET_STATE_FILTER_OPTIONS.map((state) => {
                          const value = stateToParamValue(state);
                          const label = state == null ? 'null' : state;
                          return (
                            <div key={value} className="flex items-center space-x-2">
                              <Checkbox
                                id={`state-${value}`}
                                checked={stateFilter.includes(value)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setStateFilter((prev) => [...prev, value]);
                                  } else {
                                    setStateFilter((prev) => prev.filter((s) => s !== value));
                                  }
                                }}
                              />
                              <label
                                htmlFor={`state-${value}`}
                                className="text-body-sm-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                              >
                                {label}
                              </label>
                            </div>
                          );
                        })}
                      </div>
                      {stateFilter.length > 0 && (
                        <div className="pt-2 border-t">
                          <CustomButton
                            variant="ghost"
                            size="sm"
                            onClick={() => setStateFilter([])}
                            className="text-xs"
                          >
                            Clear All
                          </CustomButton>
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <label className="block text-gray-700 mb-2">
                  Number of Call Attempts
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between"
                    >
                      <span className="text-sm">
                        {callAttemptsFilter.length > 0
                          ? `${callAttemptsFilter.length} attempt count(s) selected`
                          : 'All Call Attempts'}
                      </span>
                      <ChevronDown className="h-3 w-3 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-60 p-4" align="start">
                    <div className="space-y-3">
                      <h5>Select call attempts</h5>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {SUPPORT_TICKET_CALL_ATTEMPT_FILTER_OPTIONS.map((count) => (
                          <div key={count} className="flex items-center space-x-2">
                            <Checkbox
                              id={`call-attempts-${count}`}
                              checked={callAttemptsFilter.includes(count)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setCallAttemptsFilter((prev) => [...prev, count]);
                                } else {
                                  setCallAttemptsFilter((prev) => prev.filter((c) => c !== count));
                                }
                              }}
                            />
                            <label
                              htmlFor={`call-attempts-${count}`}
                              className="text-body-sm-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                              {count}
                            </label>
                          </div>
                        ))}
                      </div>
                      {callAttemptsFilter.length > 0 && (
                        <div className="pt-2 border-t">
                          <CustomButton
                            variant="ghost"
                            size="sm"
                            onClick={() => setCallAttemptsFilter([])}
                            className="text-xs"
                          >
                            Clear All
                          </CustomButton>
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Date Range Filters - 2nd Line */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-gray-700 mb-2">
                  Start Date
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRangeFilter.startDate ? (
                        format(dateRangeFilter.startDate, "PPP")
                      ) : (
                        <span className="text-muted-foreground">Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={dateRangeFilter.startDate}
                      onSelect={(date) => setDateRangeFilter(prev => ({
                        ...prev,
                        startDate: date
                      }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <div className="mt-2">
                  <label className="block text-gray-600 mb-1">
                    Start Time
                  </label>
                  <Input
                    type="time"
                    value={dateRangeFilter.startTime}
                    onChange={(e) => setDateRangeFilter(prev => ({
                      ...prev,
                      startTime: e.target.value
                    }))}
                    className="w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 mb-2">
                  End Date
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRangeFilter.endDate ? (
                        format(dateRangeFilter.endDate, "PPP")
                      ) : (
                        <span className="text-muted-foreground">Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={dateRangeFilter.endDate}
                      onSelect={(date) => setDateRangeFilter(prev => ({
                        ...prev,
                        endDate: date
                      }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <div className="mt-2">
                  <label className="block text-gray-600 mb-1">
                    End Time
                  </label>
                  <Input
                    type="time"
                    value={dateRangeFilter.endTime}
                    onChange={(e) => setDateRangeFilter(prev => ({
                      ...prev,
                      endTime: e.target.value
                    }))}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons - 3rd Line */}
            <div className="flex items-center gap-2 mt-4">
              <CustomButton
                variant="outline"
                onClick={resetFilters}
                className="flex-1"
              >
                Reset Filters
              </CustomButton>
              <CustomButton
                variant="default"
                onClick={() => applyFilters()}
                className="flex-1"
                disabled={tableLoading}
                loading={tableLoading}
              >
                Apply Filters
              </CustomButton>
            </div>

            {/* Filter Summary */}
            <div className="mt-3 text-sm text-gray-600">
              Showing {filteredData.length} of {pagination.totalCount > 0 ? pagination.totalCount : (filtersApplied ? filteredData.length : data.length)} tickets
              {filtersApplied && (resolutionStatusFilter.length > 0 || assignedToFilter !== 'all' || posterStatusFilter.length > 0 || stateFilter.length > 0 || callAttemptsFilter.length > 0 || dateRangeFilter.startDate || dateRangeFilter.endDate || searchTerm.trim() !== '') && (
                <span className="ml-2">
                  (Filtered by: 
                  {resolutionStatusFilter.length > 0 && ` Resolution Status: ${resolutionStatusFilter.map(status => status === null ? 'Open' : status).join(', ')}`}
                  {assignedToFilter !== 'all' && ` ${resolutionStatusFilter.length > 0 ? ', ' : ''}Assignee: ${assignedToFilter === 'myself' ? 'Myself' : assignedToFilter === 'unassigned' ? 'Unassigned' : getUniqueAssignedTo().find(a => a.id === assignedToFilter)?.name || assignedToFilter}`}
                  {posterStatusFilter.length > 0 && ` ${(resolutionStatusFilter.length > 0 || assignedToFilter !== 'all') ? ', ' : ''}Poster Status: ${posterStatusFilter.join(', ')}`}
                  {stateFilter.length > 0 && ` ${(resolutionStatusFilter.length > 0 || assignedToFilter !== 'all' || posterStatusFilter.length > 0) ? ', ' : ''}State: ${stateFilter.join(', ')}`}
                  {callAttemptsFilter.length > 0 && ` ${(resolutionStatusFilter.length > 0 || assignedToFilter !== 'all' || posterStatusFilter.length > 0 || stateFilter.length > 0) ? ', ' : ''}Call Attempts: ${[...callAttemptsFilter].sort((a, b) => a - b).join(', ')}`}
                  {(dateRangeFilter.startDate || dateRangeFilter.endDate) && ` ${(resolutionStatusFilter.length > 0 || assignedToFilter !== 'all' || posterStatusFilter.length > 0 || stateFilter.length > 0 || callAttemptsFilter.length > 0) ? ', ' : ''}Date Range: ${dateRangeFilter.startDate ? format(dateRangeFilter.startDate, 'MMM dd, yyyy') + ' ' + dateRangeFilter.startTime : 'Any'} to ${dateRangeFilter.endDate ? format(dateRangeFilter.endDate, 'MMM dd, yyyy') + ' ' + dateRangeFilter.endTime : 'Any'}`}
                  {searchTerm.trim() !== '' && ` ${(resolutionStatusFilter.length > 0 || assignedToFilter !== 'all' || posterStatusFilter.length > 0 || stateFilter.length > 0 || callAttemptsFilter.length > 0 || dateRangeFilter.startDate || dateRangeFilter.endDate) ? ', ' : ''}Search: "${searchTerm}"`}
                  )
                </span>
              )}
              {!filtersApplied && (resolutionStatusFilter.length > 0 || assignedToFilter !== 'all' || posterStatusFilter.length > 0 || stateFilter.length > 0 || callAttemptsFilter.length > 0 || dateRangeFilter.startDate || dateRangeFilter.endDate || searchTerm.trim() !== '') && (
                <span className="ml-2 text-orange-600">
                  (Filters selected - click "Apply Filters" to see results)
                </span>
              )}
              {pagination.totalCount > 0 && (
                <span className="ml-2 text-blue-600">
                  (Page {pagination.currentPage} of {pagination.numberOfPages})
                </span>
              )}
            </div>
          </div>
        )}
      </div>


      {/* Table Section */}
      <div className="w-full relative">
        {/* Loading Overlay */}
        {(tableLoading || searchLoading) && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10 rounded-lg">
            <div className="flex flex-col items-center space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="text-gray-600 font-medium">
                {searchLoading ? 'Searching through all tickets...' : 'Loading...'}
              </span>
            </div>
          </div>
        )}

        <div className="overflow-hidden w-full">
          <table className="min-w-full bg-white">
            <thead>
              <tr className="bg-black border-b border-gray-200">
                {tableColumns.map((col) => (
                  <th key={col.accessor} className="py-3 px-6 text-left text-sm font-semibold text-white">
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-gray-600 text-sm bg-white">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={tableColumns.length} className="text-center py-8 text-gray-500">
                    No data found
                  </td>
                </tr>
              ) : (
                filteredData.map((row: any, rowIndex: number) => (
                  <tr 
                    key={rowIndex} 
                    className={`border-b border-gray-200 hover:bg-gray-50 bg-white cursor-pointer`}
                    onClick={() => handleRowClick(row)}
                  >
                    {tableColumns.map((col) => (
                      <td key={col.accessor} className="py-3 px-6 text-left">
                        <div className="flex items-center">
                          {col.accessor === 'name' ? (
                            <ShortProfileCard
                              image={row.display_pic_url || row.image}
                              name={row.name}
                              address={row.email_id || row.email || ''}
                            />
                          ) : col.type === 'chip' ? (
                            <Badge 
                              variant="outline" 
                              className={`${getStatusColor(row[col.accessor])} text-xs font-medium px-3 py-1 rounded-full border`}
                            >
                              {row[col.accessor]}
                            </Badge>
                          ) : col.type === 'link' ? (
                            row[col.accessor] && row[col.accessor] !== 'N/A' ? (
                              <a
                                href={row[col.accessor]}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 underline text-sm"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {row[col.accessor]}
                              </a>
                            ) : (
                              <span className="text-sm text-gray-400">N/A</span>
                            )
                          ) : col.type === 'action' ? (
                            <CustomButton
                              variant="outline"
                              size="sm"
                              className="text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleActionClick(row, col);
                              }}
                            >
                              {col.header || 'Action'}
                            </CustomButton>
                          ) : (
                            <span className="text-sm text-gray-600">{row[col.accessor] || 'N/A'}</span>
                          )}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Server-side pagination controls */}
      {pagination.totalCount > 0 && filteredData.length > 0 && (
        <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Page</span>
            <Select
              value={pagination.currentPage.toString()}
              onValueChange={handlePageChange}
              disabled={tableLoading}
            >
              <SelectTrigger className="bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300 rounded-md px-3 py-1.5 h-auto w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: pagination.numberOfPages }, (_, i) => i + 1).map((pageNum) => (
                  <SelectItem key={pageNum} value={pageNum.toString()} className="hover:bg-gray-100 focus:bg-gray-100">
                    {pageNum}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-gray-600">of {pagination.numberOfPages}</span>
          </div>
          
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

    {/* Ticket Modal */}
    <Dialog
      open={isTicketModalOpen}
      onOpenChange={(open) => {
        setIsTicketModalOpen(open);
        if (!open) {
          setSelectedTicket(null);
        }
      }}
    >
      <DialogContent
        className="font-body max-w-6xl max-h-[90vh] flex flex-col overflow-hidden p-0 gap-0"
        onPointerDownOutside={(event) => {
          // Portaled popovers render outside dialog DOM; don't dismiss on those clicks.
          const target = event.target as HTMLElement | null;
          if (target?.closest?.("[data-radix-popper-content-wrapper]")) {
            event.preventDefault();
          }
        }}
        onFocusOutside={(event) => {
          const target = event.target as HTMLElement | null;
          if (target?.closest?.("[data-radix-popper-content-wrapper]")) {
            event.preventDefault();
          }
        }}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>
            {selectedTicket?.name
              ? `Ticket - ${selectedTicket.name}`
              : `Ticket #${selectedTicket?.id ?? ""}`}
          </DialogTitle>
          <DialogDescription>View and manage support ticket details</DialogDescription>
        </DialogHeader>
        {selectedTicket && (
          <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6">
            <TicketCarousel
              key={selectedTicket.record_id ?? selectedTicket.id ?? selectedTicket.support_ticket_id}
              config={{
                apiPrefix: config?.apiPrefix || "renderer",
                title: `Ticket #${selectedTicket.support_ticket_id ?? selectedTicket.id}`,
                whatsappTemplatesApiEndpoint: (config as any)?.whatsappTemplatesApiEndpoint,
              }}
              initialTicket={selectedTicket}
              isInModal
              onUpdate={handleTicketUpdate}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  </>
);
}
