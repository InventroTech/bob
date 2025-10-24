import React from 'react';
import { FilterConfig } from '@/component-config/DynamicFilterConfig';
import { useFilters } from '@/hooks/useFilters';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar as CalendarIcon, X, ChevronDown } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface DynamicFilterBuilderProps {
  filters: FilterConfig[];
  onFiltersChange: (params: URLSearchParams) => void;
  className?: string;
  showSummary?: boolean;
  compact?: boolean;
}

// Renders a form UI for dynamic filters and exposes URLSearchParams via onFiltersChange
export const DynamicFilterBuilder: React.FC<DynamicFilterBuilderProps> = ({
  filters,
  onFiltersChange,
  className = '',
  showSummary = true,
  compact = false
}) => {
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
  } = useFilters();

  const activeFiltersCount = getActiveFiltersCount();

  const handleFilterChange = (key: string, value: any) => {
    setFilterValue(key, value);
  };

  // Compute query params and notify parent (consumer handles URL update + API call)
  const handleApplyFilters = () => {
    const params = getQueryParams(filters);
    onFiltersChange(params);
    applyFilters();
    clearFilters(); // Reset the filter UI state after applying
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
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={`w-full justify-start text-left font-normal ${isActive ? 'border-blue-500' : ''}`}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {value ? format(new Date(value), 'PPP') : `From ${filter.label}`}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={value ? new Date(value) : undefined}
                onSelect={(date) => handleFilterChange(filter.key, date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        );

      case 'date_lte':
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={`w-full justify-start text-left font-normal ${isActive ? 'border-blue-500' : ''}`}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {value ? format(new Date(value), 'PPP') : `To ${filter.label}`}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={value ? new Date(value) : undefined}
                onSelect={(date) => handleFilterChange(filter.key, date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        );

      case 'date_range':
        return (
          <div className="space-y-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={`w-full justify-start text-left font-normal ${isActive ? 'border-blue-500' : ''}`}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {value?.start ? format(new Date(value.start), 'PPP') : 'Start date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={value?.start ? new Date(value.start) : undefined}
                  onSelect={(date) =>
                    handleFilterChange(filter.key, {
                      ...value,
                      start: date
                    })
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={`w-full justify-start text-left font-normal ${isActive ? 'border-blue-500' : ''}`}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {value?.end ? format(new Date(value.end), 'PPP') : 'End date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={value?.end ? new Date(value.end) : undefined}
                  onSelect={(date) =>
                    handleFilterChange(filter.key, {
                      ...value,
                      end: date
                    })
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        );

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