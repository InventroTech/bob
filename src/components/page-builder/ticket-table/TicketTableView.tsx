/** Presentational JSX for the ticket table with dynamic select filters and preserved date range support. */

import React, { useState } from 'react';
import ShortProfileCard from '../../ui/ShortProfileCard';
import { Badge } from '@/components/ui/badge';
import { TicketCarousel } from '../ticket-carousel';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Filter, Search, Calendar as CalendarIcon, ChevronDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CustomButton } from '@/components/ui/CustomButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';

import type { TicketTableModel } from './useTicketTable';
import { getStatusColor } from './utils';

export function TicketTableView(props: TicketTableModel) {
  const {
    config,
    loading,
    tableLoading,
    searchLoading,
    displaySearchTerm,
    showFilters,
    setShowFilters,
    filteredData,
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
    dateRangeFilter,
    setDateRangeFilter,
    dynamicFilterValues,
    setDynamicFilterValues,
  } = props;

  const [selectSearchTerms, setSelectSearchTerms] = useState<Record<string, string>>({});

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-600">Loading tickets data...</div>
      </div>
    );
  }

  // Purely dynamic filters driven from Page Builder config schema
  const configuredFilters = config?.filters || [];

  const handleFilterChange = (key: string, value: any) => {
    setDynamicFilterValues(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleApplyClick = () => {
    applyFilters();
  };

  const handleResetClick = () => {
    setSelectSearchTerms({});
    resetFilters();
  };

  return (
    <>
      <div className="md:hidden w-full pb-3 px-4 pt-4">
        <h2 className="text-2xl font-bold text-gray-950">
          {config?.title || "Support Tickets"}
        </h2>
      </div>

      <div className="font-body overflow-x-auto border-2 border-gray-200 rounded-lg bg-white p-4">
        {/* Header & Search Bar */}
        <div className="mb-4 relative">
          <div className="flex justify-between items-center mb-4 gap-4 flex-wrap">
            <h5 className="hidden md:block">
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

        {/* Dynamic Filters Section */}
        {showFilters && configuredFilters.length > 0 && (
          <div className="bg-gray-50 p-4 rounded-lg border mb-4 space-y-4">
            <div className="flex justify-between items-center">
              <h5 className="font-semibold text-gray-700">Filters</h5>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {configuredFilters.map((filterItem: any, index: number) => {
                const filterKey = filterItem.key || filterItem.accessor || `filter_${index}`;
                const filterLabel = (filterItem.label || '').toLowerCase();
                const value = dynamicFilterValues[filterKey];
                const isActive = value !== undefined && value !== '' && (!(Array.isArray(value)) || value.length > 0);

                const isDateFilter = 
                  filterItem.type === 'date_range' || 
                  filterItem.type === 'date_time_range' || 
                  filterLabel.includes('date') || 
                  filterLabel.includes('created') ||
                  filterKey.includes('date') ||
                  filterKey.includes('created_at');

                return (
                  <div 
                    key={index} 
                    className={`space-y-2 relative flex flex-col ${
                      isDateFilter ? 'col-span-full' : ''
                    }`}
                  >
                    <Label className="text-sm font-medium">
                      {filterItem.label || filterKey}
                    </Label>

                    {isDateFilter ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 bg-white rounded-md border border-gray-200">
                        <div>
                          <Label className="text-xs font-medium text-gray-700 block mb-1">Start</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full justify-start text-left font-normal bg-white h-9 text-xs"
                              >
                                <CalendarIcon className="mr-2 h-4 w-4 text-gray-400" />
                                {dateRangeFilter.startDate ? format(dateRangeFilter.startDate, 'PPP') : <span className="text-muted-foreground">Start date</span>}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <CalendarComponent
                                mode="single"
                                selected={dateRangeFilter.startDate}
                                onSelect={(date) => setDateRangeFilter(prev => ({ ...prev, startDate: date ?? undefined }))}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <div className="mt-2">
                            <Input
                              type="time"
                              value={dateRangeFilter.startTime}
                              onChange={(e) => setDateRangeFilter(prev => ({ ...prev, startTime: e.target.value }))}
                              className="w-full h-9 text-xs bg-white"
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs font-medium text-gray-700 block mb-1">End</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full justify-start text-left font-normal bg-white h-9 text-xs"
                              >
                                <CalendarIcon className="mr-2 h-4 w-4 text-gray-400" />
                                {dateRangeFilter.endDate ? format(dateRangeFilter.endDate, 'PPP') : <span className="text-muted-foreground">End date</span>}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <CalendarComponent
                                mode="single"
                                selected={dateRangeFilter.endDate}
                                onSelect={(date) => setDateRangeFilter(prev => ({ ...prev, endDate: date ?? undefined }))}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <div className="mt-2">
                            <Input
                              type="time"
                              value={dateRangeFilter.endTime}
                              onChange={(e) => setDateRangeFilter(prev => ({ ...prev, endTime: e.target.value }))}
                              className="w-full h-9 text-xs bg-white"
                            />
                          </div>
                        </div>
                      </div>
                    ) : filterItem.type === 'select' || filterItem.type === 'multiselect' || (filterItem.options && filterItem.options.length > 0) ? (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={`w-full justify-between text-left font-normal bg-white h-9 ${isActive ? 'border-blue-500' : ''}`}
                          >
                            <span className="text-sm truncate">
                              {Array.isArray(value) && value.length > 0
                                ? `${value.length} selected`
                                : filterItem.placeholder || `Select ${filterItem.label?.toLowerCase() || 'value'}`}
                            </span>
                            <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[315px] p-0" align="start">
                          <div className="px-3 py-3 border-b">
                            <Label className="text-sm font-medium">Select {filterItem.label}</Label>
                            <Input
                              value={selectSearchTerms[filterKey] ?? ''}
                              onChange={(e) =>
                                setSelectSearchTerms((prev) => ({
                                  ...prev,
                                  [filterKey]: e.target.value,
                                }))
                              }
                              placeholder="Search options..."
                              className="mt-2 h-8 text-sm w-full bg-white"
                            />
                          </div>
                          <div className="max-h-60 overflow-y-auto p-1">
                            {(filterItem.options || []).map((option: any) => {
                              const optVal = option?.value ?? option;
                              const optLab = option?.label ?? option;
                              const isSelected = Array.isArray(value) ? value.includes(optVal) : value === optVal;
                              return (
                                <div key={optVal} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
                                  <Checkbox
                                    id={`${filterKey}-${optVal}`}
                                    checked={isSelected}
                                    onCheckedChange={(checked) => {
                                      let newValue: string | string[];
                                      if (Array.isArray(value)) {
                                        if (checked) {
                                          newValue = [...value, optVal];
                                        } else {
                                          newValue = value.filter(v => v !== optVal);
                                        }
                                      } else {
                                        if (checked) {
                                          newValue = [optVal];
                                        } else {
                                          newValue = [];
                                        }
                                      }
                                      handleFilterChange(filterKey, newValue);
                                    }}
                                  />
                                  <label
                                    htmlFor={`${filterKey}-${optVal}`}
                                    className="text-sm font-medium leading-none cursor-pointer flex-1 truncate"
                                  >
                                    {optLab}
                                  </label>
                                </div>
                              );
                            })}
                            {(!filterItem.options || filterItem.options.length === 0) && (
                              <div className="p-3 text-center text-xs text-gray-500">No options available</div>
                            )}
                          </div>
                          {Array.isArray(value) && value.length > 0 && (
                            <div className="p-2 border-t">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleFilterChange(filterKey, [])}
                                className="text-xs w-full h-7"
                              >
                                Clear All
                              </Button>
                            </div>
                          )}
                        </PopoverContent>
                      </Popover>
                    ) : (
                      <Input
                        type="text"
                        placeholder={filterItem.placeholder || `Filter by ${filterItem.label || filterKey}...`}
                        value={value || ''}
                        className="w-full h-9 bg-white"
                        onChange={(e) => handleFilterChange(filterKey, e.target.value)}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2 border-t">
              <CustomButton
                variant="outline"
                onClick={handleResetClick}
                className="flex-1 bg-white hover:bg-gray-100"
              >
                Reset Filters
              </CustomButton>
              <CustomButton
                variant="default"
                onClick={handleApplyClick}
                className="flex-1 bg-black text-white hover:bg-gray-800"
                disabled={tableLoading}
                loading={tableLoading}
              >
                Apply Filters
              </CustomButton>
            </div>
          </div>
        )}

        {/* Table Section */}
        <div className="w-full relative">
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

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto w-full max-w-full min-w-0">
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
                      className="border-b border-gray-200 hover:bg-gray-50 bg-white cursor-pointer"
                      onClick={() => handleRowClick(row)}
                    >
                      {tableColumns.map((col) => (
                        <td key={col.accessor} className="py-3 px-6 text-left">
                          <div className="flex items-center">
                            {col.accessor === "name" ? (
                              <ShortProfileCard
                                image={row.display_pic_url || row.image}
                                name={row.name}
                                address={row.email_id || row.email || ""}
                              />
                            ) : col.type === "chip" ? (
                              <Badge variant="outline" className={`${getStatusColor(row[col.accessor])} text-xs font-medium px-3 py-1 rounded-full border`}>
                                {row[col.accessor]}
                              </Badge>
                            ) : col.type === "link" ? (
                              row[col.accessor] && row[col.accessor] !== "N/A" ? (
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
                            ) : col.type === "action" ? (
                              <CustomButton
                                variant="outline"
                                size="sm"
                                className="text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleActionClick(row, col);
                                }}
                              >
                                {col.header || "Action"}
                              </CustomButton>
                            ) : (
                              <span className="text-sm text-gray-600">
                                {row[col.accessor] || "N/A"}
                              </span>
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

        {/* Pagination Controls */}
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
                <SelectContent align="start" sideOffset={4}>
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
        <DialogContent className="font-body max-w-6xl max-h-[90vh] flex flex-col overflow-hidden p-0 gap-0">
          <DialogHeader className="sr-only">
            <DialogTitle>
              {selectedTicket?.name ? `Ticket - ${selectedTicket.name}` : `Ticket #${selectedTicket?.id ?? ""}`}
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