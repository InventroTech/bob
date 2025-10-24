import { useState, useCallback, useMemo } from 'react';
import { FilterConfig, FilterOption } from '../component-config/DynamicFilterConfig';

export interface FilterValue {
  [key: string]: any;
}

export interface FilterState {
  values: FilterValue;
  applied: boolean;
}

export interface UseFiltersReturn {
  filterState: FilterState;
  setFilterValue: (key: string, value: any) => void;
  setFilterValues: (values: FilterValue) => void;
  clearFilters: () => void;
  applyFilters: () => void;
  applyFiltersAndClear: () => void;
  resetFilters: () => void;
  isFilterActive: (key: string) => boolean;
  getActiveFiltersCount: () => number;
  getQueryParams: (filters: FilterConfig[]) => URLSearchParams;
  getFilterDisplayValue: (key: string, filters: FilterConfig[]) => string;
}

// Lightweight, UI-agnostic filter state manager.
// Holds current values and computes URLSearchParams compatible with backend.
export const useFilters = (initialValues: FilterValue = {}): UseFiltersReturn => {
  const [filterState, setFilterState] = useState<FilterState>({
    values: initialValues,
    applied: false,
  });

  const setFilterValue = useCallback((key: string, value: any) => {
    setFilterState(prev => ({
      ...prev,
      values: {
        ...prev.values,
        [key]: value,
      },
    }));
  }, []);

  const setFilterValues = useCallback((values: FilterValue) => {
    setFilterState(prev => ({
      ...prev,
      values: {
        ...prev.values,
        ...values,
      },
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilterState(prev => ({
      ...prev,
      values: {},
    }));
  }, []);

  const applyFilters = useCallback(() => {
    setFilterState(prev => ({
      ...prev,
      applied: true,
    }));
  }, []);

  const applyFiltersAndClear = useCallback(() => {
    setFilterState(prev => ({
      ...prev,
      values: {},
      applied: true,
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilterState({
      values: {},
      applied: false,
    });
  }, []);

  const isFilterActive = useCallback((key: string) => {
    const value = filterState.values[key];
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    if (typeof value === 'object' && value !== null) {
      return Object.keys(value).length > 0;
    }
    return value !== undefined && value !== null && value !== '' && value !== false;
  }, [filterState.values]);

  const getActiveFiltersCount = useCallback(() => {
    return Object.keys(filterState.values).filter(key => isFilterActive(key)).length;
  }, [filterState.values, isFilterActive]);

  // Convert in-memory filter values into query params based on FilterConfig
  const getQueryParams = useCallback((filters: FilterConfig[]): URLSearchParams => {
    const params = new URLSearchParams();

    filters.forEach(filter => {
      const value = filterState.values[filter.key];
      if (!value) return;

      const accessor = filter.accessor || filter.key;

      // Skip filters with empty accessor or key to prevent duplicate field mapping
      if (!accessor || accessor.trim() === '') {
        return;
      }

      switch (filter.type) {
        case 'select':
          // Handle multiple selections as comma-separated values
          if (Array.isArray(value)) {
            if (value.length > 0) {
              params.append(accessor, value.join(','));
            }
          } else if (typeof value === 'string' && value.trim() !== '') {
            params.append(accessor, value);
          }
          break;

        case 'text':
          // Text search - use direct field search
          if (typeof value === 'string' && value.trim() !== '') {
            params.append(`${accessor}__icontains`, value.trim());
          }
          break;

        case 'search':
          // Global search
          if (typeof value === 'string' && value.trim() !== '') {
            params.append('search', value.trim());
          }
          break;

        case 'date_gte':
          // Date from (>=)
          if (value instanceof Date || (typeof value === 'string' && value.trim() !== '')) {
            const date = value instanceof Date ? value : new Date(value);
            if (!isNaN(date.getTime())) {
              params.append(`${accessor}__gte`, date.toISOString());
            }
          }
          break;

        case 'date_lte':
          // Date to (<=)
          if (value instanceof Date || (typeof value === 'string' && value.trim() !== '')) {
            const date = value instanceof Date ? value : new Date(value);
            if (!isNaN(date.getTime())) {
              params.append(`${accessor}__lte`, date.toISOString());
            }
          }
          break;

        case 'date_range':
          // Date range (both start and end)
          if (value && typeof value === 'object') {
            if (value.start && (value.start instanceof Date || typeof value.start === 'string')) {
              const startDate = value.start instanceof Date ? value.start : new Date(value.start);
              if (!isNaN(startDate.getTime())) {
                params.append(`${accessor}__gte`, startDate.toISOString());
              }
            }
            if (value.end && (value.end instanceof Date || typeof value.end === 'string')) {
              const endDate = value.end instanceof Date ? value.end : new Date(value.end);
              if (!isNaN(endDate.getTime())) {
                params.append(`${accessor}__lte`, endDate.toISOString());
              }
            }
          }
          break;

        case 'number_gte':
          // Number from (>=)
          if (typeof value === 'number' || (typeof value === 'string' && !isNaN(Number(value)))) {
            params.append(`${accessor}__gte`, String(value));
          }
          break;

        case 'number_lte':
          // Number to (<=)
          if (typeof value === 'number' || (typeof value === 'string' && !isNaN(Number(value)))) {
            params.append(`${accessor}__lte`, String(value));
          }
          break;

        default:
          // Fallback - treat as text search
          if (typeof value === 'string' && value.trim() !== '') {
            params.append(`${accessor}__icontains`, value.trim());
          } else if (Array.isArray(value) && value.length > 0) {
            params.append(accessor, value.join(','));
          }
      }
    });

    return params;
  }, [filterState.values]);

  // For badges/summary: map a stored value to a human-readable label (when options exist)
  const getFilterDisplayValue = useCallback((key: string, filters: FilterConfig[]): string => {
    const filter = filters.find(f => f.key === key);
    if (!filter) return '';

    const value = filterState.values[key];
    if (!value) return '';

    switch (filter.type) {
      case 'select':
        if (Array.isArray(value)) {
          const optionLabels = value.map(val => {
            const option = filter.options?.find(opt => opt.value === val);
            return option?.label || val;
          });
          return optionLabels.join(', ');
        } else {
          const option = filter.options?.find(opt => opt.value === value);
          return option?.label || String(value);
        }

      case 'date_gte':
      case 'date_lte':
        if (value instanceof Date) {
          return value.toLocaleDateString();
        }
        return String(value);

      case 'date_range':
        if (value && typeof value === 'object') {
          const start = value.start instanceof Date ? value.start.toLocaleDateString() : String(value.start || '');
          const end = value.end instanceof Date ? value.end.toLocaleDateString() : String(value.end || '');
          return `${start} - ${end}`;
        }
        return String(value);

      case 'number_gte':
      case 'number_lte':
        return String(value);

      default:
        return String(value);
    }
  }, [filterState.values]);

  return {
    filterState,
    setFilterValue,
    setFilterValues,
    clearFilters,
    applyFilters,
    applyFiltersAndClear,
    resetFilters,
    isFilterActive,
    getActiveFiltersCount,
    getQueryParams,
    getFilterDisplayValue,
  };
};