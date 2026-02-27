import React from 'react';
import { FilterConfig } from '@/component-config/DynamicFilterConfig';
import { useFilters } from '@/hooks/useFilters';
import type { FilterState } from '@/hooks/useFilters';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar as CalendarIcon, X, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';

export interface FilterContextInjected {
  filterState: FilterState;
  setFilterValue: (key: string, value: any) => void;
  setFilterValues: (values: Record<string, any>) => void;
  clearFilters: () => void;
  applyFilters: () => void;
  resetFilters: () => void;
  isFilterActive: (key: string) => boolean;
  getActiveFiltersCount: () => number;
  getQueryParams: (filters: FilterConfig[]) => URLSearchParams;
  getFilterDisplayValue: (key: string, filters: FilterConfig[]) => string;
}

interface DynamicFilterBuilderProps {
  filters: FilterConfig[];
  onFiltersChange: (params: URLSearchParams) => void;
  className?: string;
  showSummary?: boolean;
  compact?: boolean;
  /** When provided, use this context so parent and builder share filter state (ensures Apply sends correct params e.g. assigned_to). */
  filterContext?: FilterContextInjected;
}

// Renders a form UI for dynamic filters and exposes URLSearchParams via onFiltersChange
export const DynamicFilterBuilder: React.FC<DynamicFilterBuilderProps> = ({
  filters,
  onFiltersChange,
  className = '',
  showSummary = true,
  compact = false,
  filterContext
}) => {
  const internal = useFilters();
  const {
    filterState,
    setFilterValue,
    setFilterValues,
    clearFilters,
    applyFilters,
    resetFilters,
    isFilterActive,
    getActiveFiltersCount,
    getQueryParams,
    getFilterDisplayValue
  } = filterContext ?? internal;

  const activeFiltersCount = getActiveFiltersCount();

  const handleFilterChange = (key: string, value: any) => {
    setFilterValue(key, value);
  };

  // Compute query params and notify parent (consumer handles URL update + API call)
  const handleApplyFilters = () => {
    const params = getQueryParams(filters);
    onFiltersChange(params);
    applyFilters();
    // clearFilters(); // Reset the filter UI state after applying
  };

  // Do not auto-apply filters on change. Apply only when the user clicks the button.

  // Reset all filters to empty (selects -> []; text/date -> '') and emit params
  const handleClearFilters = () => {
    resetFilters();
    // Pass empty params to parent to trigger refetch of unfiltered data
    onFiltersChange(new URLSearchParams());
  };

  const handleRemoveFilter = (key: string) => {
    const filter = filters.find(f => f.key === key);
    if (filter?.type === 'select') {
      setFilterValue(key, []);
    } else {
      setFilterValue(key, '');
    }
  };

  // Render appropriate input by filter type; values are kept in useFilters state
  const renderFilterInput = (filter: FilterConfig) => {
    const value = filterState.values[filter.key];
    const isActive = isFilterActive(filter.key);

    switch (filter.type) {
      case 'select':
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={`w-full justify-between text-left font-normal ${isActive ? 'border-blue-500' : ''}`}
              >
                <span className="text-sm">
                  {Array.isArray(value) && value.length > 0
                    ? `${value.length} selected`
                    : filter.placeholder || `Select ${filter.label.toLowerCase()}`}
                </span>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-60 p-0" align="start">
              <div className="p-3 border-b">
                <Label className="text-sm font-medium">Select {filter.label}</Label>
              </div>
              <div className="max-h-60 overflow-y-auto p-1">
                {filter.options?.map((option) => {
                  const isSelected = Array.isArray(value) ? value.includes(option.value) : value === option.value;
                  return (
                    <div key={option.value} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
                      <Checkbox
                        id={`${filter.key}-${option.value}`}
                        checked={isSelected}
                        onCheckedChange={(checked) => {
                          let newValue: string | string[];
                          if (Array.isArray(value)) {
                            if (checked) {
                              newValue = [...value, option.value];
                            } else {
                              newValue = value.filter(v => v !== option.value);
                            }
                          } else {
                            if (checked) {
                              newValue = [option.value];
                            } else {
                              newValue = [];
                            }
                          }
                          handleFilterChange(filter.key, newValue);
                        }}
                      />
                      <label
                        htmlFor={`${filter.key}-${option.value}`}
                        className="text-sm font-medium leading-none cursor-pointer flex-1"
                      >
                        {option.label}
                      </label>
                    </div>
                  );
                })}
              </div>
              {Array.isArray(value) && value.length > 0 && (
                <div className="p-3 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleFilterChange(filter.key, [])}
                    className="text-xs w-full"
                  >
                    Clear All
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        );

      case 'text':
        return (
          <Input
            type="text"
            placeholder={filter.placeholder || `Enter ${filter.label.toLowerCase()}`}
            value={value || ''}
            onChange={(e) => handleFilterChange(filter.key, e.target.value)}
            className={isActive ? 'border-blue-500' : ''}
          />
        );

      case 'search':
        return (
          <Input
            type="text"
            placeholder={filter.placeholder || 'Search...'}
            value={value || ''}
            onChange={(e) => handleFilterChange(filter.key, e.target.value)}
            className={isActive ? 'border-blue-500' : ''}
          />
        );

      case 'date_gte':
        return (
          <div className="relative">
            <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <Input
              type="date"
              value={value ? new Date(value).toISOString().split('T')[0] : ''}
              onChange={(e) => handleFilterChange(filter.key, e.target.value ? new Date(e.target.value) : '')}
              className={`pl-10 ${isActive ? 'border-blue-500' : ''}`}
              placeholder={`From ${filter.label}`}
            />
          </div>
        );

      case 'date_lte':
        return (
          <div className="relative">
            <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <Input
              type="date"
              value={value ? new Date(value).toISOString().split('T')[0] : ''}
              onChange={(e) => handleFilterChange(filter.key, e.target.value ? new Date(e.target.value) : '')}
              className={`pl-10 ${isActive ? 'border-blue-500' : ''}`}
              placeholder={`To ${filter.label}`}
            />
          </div>
        );

      case 'date_range': {
        const startDate = value?.start ? (value.start instanceof Date ? value.start : new Date(value.start)) : undefined;
        const endDate = value?.end ? (value.end instanceof Date ? value.end : new Date(value.end)) : undefined;
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`w-full justify-start text-left font-normal ${isActive ? 'border-blue-500 ring-1 ring-blue-500/20' : ''}`}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? (
                      format(startDate, 'PPP')
                    ) : (
                      <span className="text-muted-foreground">Start date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={startDate}
                    onSelect={(date) =>
                      handleFilterChange(filter.key, {
                        ...value,
                        start: date ?? undefined
                      })
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`w-full justify-start text-left font-normal ${isActive ? 'border-blue-500 ring-1 ring-blue-500/20' : ''}`}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? (
                      format(endDate, 'PPP')
                    ) : (
                      <span className="text-muted-foreground">End date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={endDate}
                    onSelect={(date) =>
                      handleFilterChange(filter.key, {
                        ...value,
                        end: date ?? undefined
                      })
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        );
      }

      case 'date_time_range': {
        const startDate = value?.start ? (value.start instanceof Date ? value.start : new Date(value.start)) : undefined;
        const endDate = value?.end ? (value.end instanceof Date ? value.end : new Date(value.end)) : undefined;
        const startTimeStr = startDate ? format(startDate, 'HH:mm') : '00:00';
        const endTimeStr = endDate ? format(endDate, 'HH:mm') : '23:59';
        const applyStartTime = (timeStr: string) => {
          const [h, m] = timeStr.split(':').map(Number);
          const base = startDate ? new Date(startDate) : new Date();
          base.setHours(isNaN(h) ? 0 : h, isNaN(m) ? 0 : m, 0, 0);
          handleFilterChange(filter.key, { ...value, start: base });
        };
        const applyEndTime = (timeStr: string) => {
          const [h, m] = timeStr.split(':').map(Number);
          const base = endDate ? new Date(endDate) : new Date();
          base.setHours(isNaN(h) ? 23 : h, isNaN(m) ? 59 : m, 0, 0);
          handleFilterChange(filter.key, { ...value, end: base });
        };
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`w-full justify-start text-left font-normal ${isActive ? 'border-blue-500 ring-1 ring-blue-500/20' : ''}`}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? (
                      format(startDate, 'PPP')
                    ) : (
                      <span className="text-muted-foreground">Start date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => {
                      const d = date ? (() => {
                        const d2 = new Date(date);
                        if (startDate) d2.setHours(startDate.getHours(), startDate.getMinutes(), 0, 0);
                        else d2.setHours(0, 0, 0, 0);
                        return d2;
                      })() : undefined;
                      handleFilterChange(filter.key, { ...value, start: d });
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <div className="mt-2">
                <Input
                  type="time"
                  value={startTimeStr}
                  onChange={(e) => applyStartTime(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
            <div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`w-full justify-start text-left font-normal ${isActive ? 'border-blue-500 ring-1 ring-blue-500/20' : ''}`}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? (
                      format(endDate, 'PPP')
                    ) : (
                      <span className="text-muted-foreground">End date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => {
                      const d = date ? (() => {
                        const d2 = new Date(date);
                        if (endDate) d2.setHours(endDate.getHours(), endDate.getMinutes(), 0, 0);
                        else d2.setHours(23, 59, 0, 0);
                        return d2;
                      })() : undefined;
                      handleFilterChange(filter.key, { ...value, end: d });
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <div className="mt-2">
                <Input
                  type="time"
                  value={endTimeStr}
                  onChange={(e) => applyEndTime(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        );
      }

      case 'number_gte':
        return (
          <Input
            type="number"
            placeholder={`Min ${filter.label}`}
            value={value || ''}
            onChange={(e) => handleFilterChange(filter.key, e.target.value)}
            className={isActive ? 'border-blue-500' : ''}
          />
        );

      case 'number_lte':
        return (
          <Input
            type="number"
            placeholder={`Max ${filter.label}`}
            value={value || ''}
            onChange={(e) => handleFilterChange(filter.key, e.target.value)}
            className={isActive ? 'border-blue-500' : ''}
          />
        );

      default:
        return (
          <Input
            type="text"
            placeholder={filter.placeholder || `Enter ${filter.label.toLowerCase()}`}
            value={value || ''}
            onChange={(e) => handleFilterChange(filter.key, e.target.value)}
            className={isActive ? 'border-blue-500' : ''}
          />
        );
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Filter Inputs */}
      <div className={`grid gap-4 ${compact ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
        {filters.map((filter) => (
          <div key={filter.key} className="space-y-2">
            <Label className="text-sm font-medium">
              {filter.label}
              {isFilterActive(filter.key) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-2 h-4 w-4 p-0 text-gray-500 hover:text-red-500"
                  onClick={() => handleRemoveFilter(filter.key)}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </Label>
            {renderFilterInput(filter)}
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={handleApplyFilters}
          disabled={activeFiltersCount === 0}
          className="flex-1 sm:flex-none"
        >
          Apply Filters
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>

        {filterState.applied && (
          <Button
            variant="outline"
            onClick={handleClearFilters}
            className="flex-1 sm:flex-none"
          >
            Clear All
          </Button>
        )}
      </div>

      {/* Filter Summary */}
      {showSummary && activeFiltersCount > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Active Filters:</Label>
          <div className="flex flex-wrap gap-2">
            {filters
              .filter(filter => isFilterActive(filter.key))
              .map(filter => (
                <Badge
                  key={filter.key}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  {filter.label}: {getFilterDisplayValue(filter.key, filters)}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-1 h-4 w-4 p-0 text-gray-500 hover:text-red-500"
                    onClick={() => handleRemoveFilter(filter.key)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};