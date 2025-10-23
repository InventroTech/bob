import { FilterConfig, FilterOption } from '@/component-config/DynamicFilterConfig';

export interface FilterQueryParams {
  [key: string]: string | string[];
}

export interface FilterServiceOptions {
  apiEndpoint?: string;
  entityType?: string;
  pageSize?: number;
  defaultParams?: FilterQueryParams;
}

/**
 * Service for managing dynamic filters and generating query parameters
 * compatible with the backend Django ORM filtering system
 */
// Encapsulates translation of UI filter state into backend query params (Django ORM-style)
export class FilterService {
  private filters: FilterConfig[] = [];
  private options: FilterServiceOptions;

  constructor(filters: FilterConfig[] = [], options: FilterServiceOptions = {}) {
    this.filters = filters;
    this.options = {
      pageSize: 10,
      ...options
    };
  }

  /**
   * Update the filter configuration
   */
  setFilters(filters: FilterConfig[]): void {
    this.filters = filters;
  }

  /**
   * Update service options
   */
  setOptions(options: FilterServiceOptions): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Get filter configuration by key
   */
  getFilter(key: string): FilterConfig | undefined {
    return this.filters.find(filter => filter.key === key);
  }

  /**
   * Get all filter options for a select filter
   */
  getFilterOptions(key: string): FilterOption[] {
    const filter = this.getFilter(key);
    return filter?.options || [];
  }

  /**
   * Generate query parameters from filter values
   */
  // Build URLSearchParams including default params and per-filter lookups
  generateQueryParams(filterValues: Record<string, any>): URLSearchParams {
    const params = new URLSearchParams();

    // Add default parameters
    if (this.options.entityType) {
      params.append('entity_type', this.options.entityType);
    }

    if (this.options.defaultParams) {
      Object.entries(this.options.defaultParams).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach(v => params.append(key, v));
        } else {
          params.append(key, String(value));
        }
      });
    }

    // Process each filter
    this.filters.forEach(filter => {
      const value = filterValues[filter.key];
      if (this.isEmpty(value)) return;

      const accessor = filter.accessor || filter.key;
      this.addFilterParam(params, accessor, filter, value);
    });

    // Note: Pagination is handled separately by the component, not by the filter service
    // The filter service should only handle filter parameters

    return params;
  }

  /**
   * Add a single filter parameter to URLSearchParams
   */
  // Route a filter/value to the appropriate param builder based on its type
  private addFilterParam(
    params: URLSearchParams,
    accessor: string,
    filter: FilterConfig,
    value: any
  ): void {
    // Use custom lookup if provided, otherwise determine from filter type
    const lookup = filter.lookup || this.getLookupFromType(filter.type);

    switch (filter.type) {
      case 'select':
        this.addSelectParam(params, accessor, value, lookup);
        break;
      case 'text':
        this.addTextParam(params, accessor, value, lookup);
        break;
      case 'search':
        this.addSearchParam(params, value);
        break;
      case 'date_gte':
      case 'date_lte':
      case 'date_range':
        this.addDateParam(params, accessor, filter, value);
        break;
      case 'number_gte':
      case 'number_lte':
      case 'gt':
      case 'lt':
        this.addNumberParam(params, accessor, filter, value);
        break;
      case 'exact':
      case 'icontains':
      case 'startswith':
      case 'endswith':
      case 'in':
        this.addGenericParam(params, accessor, filter, value);
        break;
      default:
        this.addDefaultParam(params, accessor, value, lookup);
    }
  }

  /**
   * Get Django ORM lookup from filter type
   */
  private getLookupFromType(type: FilterConfig['type']): string {
    switch (type) {
      case 'select':
        return 'in'; // Multiple selections use IN lookup
      case 'text':
        return 'icontains';
      case 'exact':
        return 'exact';
      case 'icontains':
        return 'icontains';
      case 'startswith':
        return 'startswith';
      case 'endswith':
        return 'endswith';
      case 'search':
        return 'search';
      case 'date_gte':
        return 'gte';
      case 'date_lte':
        return 'lte';
      case 'date_range':
        return 'range';
      case 'number_gte':
        return 'gte';
      case 'number_lte':
        return 'lte';
      case 'gt':
        return 'gt';
      case 'lt':
        return 'lt';
      case 'in':
        return 'in';
      default:
        return 'icontains';
    }
  }

  /**
   * Add select filter parameter (supports multiple values)
   */
  // Append select values; arrays use comma-join for IN lookups
  private addSelectParam(params: URLSearchParams, accessor: string, value: any, lookup: string = 'in'): void {
    if (Array.isArray(value)) {
      if (value.length > 0) {
        if (lookup === 'in' || lookup === '') {
          // For IN lookup, join with commas
          params.append(accessor, value.join(','));
        } else {
          // For other lookups, add multiple parameters
          value.forEach(v => params.append(`${accessor}__${lookup}`, v));
        }
      }
    } else if (typeof value === 'string' && value.trim() !== '') {
      if (lookup === 'in' || lookup === '') {
        params.append(accessor, value);
      } else {
        params.append(`${accessor}__${lookup}`, value);
      }
    }
  }

  /**
   * Add text filter parameter with specified lookup
   */
  // Append text value with the chosen lookup (icontains by default)
  private addTextParam(params: URLSearchParams, accessor: string, value: string, lookup: string = 'icontains'): void {
    if (typeof value === 'string' && value.trim() !== '') {
      const paramName = lookup === 'icontains' || lookup === '' ? `${accessor}__icontains` : `${accessor}__${lookup}`;
      params.append(paramName, value.trim());
    }
  }

  /**
   * Add global search parameter
   */
  // Append a global search param (backend decides which fields to search)
  private addSearchParam(params: URLSearchParams, value: string): void {
    if (typeof value === 'string' && value.trim() !== '') {
      params.append('search', value.trim());
    }
  }

  /**
   * Add date parameter with specified lookup
   */
  // Support date_gte/date_lte/date_range; values serialized as ISO strings
  private addDateParam(params: URLSearchParams, accessor: string, filter: FilterConfig, value: any): void {
    const lookup = filter.lookup || this.getLookupFromType(filter.type);

    if (filter.type === 'date_range' && value && typeof value === 'object') {
      // Handle date range
      if (value.start && this.isValidDate(value.start)) {
        const startDate = value.start instanceof Date ? value.start : new Date(value.start);
        params.append(`${accessor}__gte`, startDate.toISOString());
      }
      if (value.end && this.isValidDate(value.end)) {
        const endDate = value.end instanceof Date ? value.end : new Date(value.end);
        params.append(`${accessor}__lte`, endDate.toISOString());
      }
    } else if (this.isValidDate(value)) {
      const date = value instanceof Date ? value : new Date(value);
      const paramName = lookup === 'gte' || lookup === '' ? `${accessor}__gte` :
                       lookup === 'lte' ? `${accessor}__lte` :
                       lookup === 'gt' ? `${accessor}__gt` :
                       lookup === 'lt' ? `${accessor}__lt` : `${accessor}__${lookup}`;
      params.append(paramName, date.toISOString());
    }
  }

  /**
   * Add number parameter with specified lookup
   */
  // Support numeric bounds (gte/lte/gt/lt)
  private addNumberParam(params: URLSearchParams, accessor: string, filter: FilterConfig, value: any): void {
    const lookup = filter.lookup || this.getLookupFromType(filter.type);

    if (this.isValidNumber(value)) {
      const paramName = lookup === 'gte' || lookup === '' ? `${accessor}__gte` :
                       lookup === 'lte' ? `${accessor}__lte` :
                       lookup === 'gt' ? `${accessor}__gt` :
                       lookup === 'lt' ? `${accessor}__lt` : `${accessor}__${lookup}`;
      params.append(paramName, String(value));
    }
  }

  /**
   * Add generic parameter with specified lookup
   */
  // Fallback handling for explicit lookups like exact, startswith, in, etc.
  private addGenericParam(params: URLSearchParams, accessor: string, filter: FilterConfig, value: any): void {
    const lookup = filter.lookup || this.getLookupFromType(filter.type);

    if (Array.isArray(value) && value.length > 0) {
      if (lookup === 'in' || lookup === '') {
        params.append(accessor, value.join(','));
      } else {
        value.forEach(v => {
          const paramName = lookup === 'in' || lookup === '' ? accessor : `${accessor}__${lookup}`;
          params.append(paramName, v);
        });
      }
    } else if (typeof value === 'string' && value.trim() !== '') {
      const paramName = lookup === 'icontains' || lookup === '' ? `${accessor}__icontains` : `${accessor}__${lookup}`;
      params.append(paramName, value.trim());
    } else if (this.isValidNumber(value)) {
      const paramName = lookup === 'icontains' || lookup === '' ? `${accessor}__icontains` : `${accessor}__${lookup}`;
      params.append(paramName, String(value));
    }
  }

  /**
   * Add default parameter (fallback)
   */
  // Final fallback for unknown types; sensible icontains/in behavior
  private addDefaultParam(params: URLSearchParams, accessor: string, value: any, lookup: string = 'icontains'): void {
    if (Array.isArray(value) && value.length > 0) {
      if (lookup === 'in' || lookup === '') {
        params.append(accessor, value.join(','));
      } else {
        value.forEach(v => params.append(`${accessor}__${lookup}`, v));
      }
    } else if (typeof value === 'string' && value.trim() !== '') {
      const paramName = lookup === 'icontains' || lookup === '' ? `${accessor}__icontains` : `${accessor}__${lookup}`;
      params.append(paramName, value.trim());
    } else if (this.isValidNumber(value)) {
      const paramName = lookup === 'icontains' || lookup === '' ? `${accessor}__icontains` : `${accessor}__${lookup}`;
      params.append(paramName, String(value));
    }
  }

  /**
   * Check if a value is empty
   */
  private isEmpty(value: any): boolean {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim() === '';
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
  }

  /**
   * Check if a value is a valid date
   */
  private isValidDate(value: any): boolean {
    if (!value) return false;
    const date = value instanceof Date ? value : new Date(value);
    return !isNaN(date.getTime());
  }

  /**
   * Check if a value is a valid number
   */
  private isValidNumber(value: any): boolean {
    if (typeof value === 'number') return !isNaN(value);
    if (typeof value === 'string') return !isNaN(Number(value)) && value.trim() !== '';
    return false;
  }

  /**
   * Get a human-readable description of active filters
   */
  getFilterDescription(filterValues: Record<string, any>): string {
    const activeFilters: string[] = [];

    this.filters.forEach(filter => {
      const value = filterValues[filter.key];
      if (this.isEmpty(value)) return;

      const description = this.getFilterValueDescription(filter, value);
      if (description) {
        activeFilters.push(description);
      }
    });

    return activeFilters.length > 0 ? activeFilters.join(', ') : 'No filters applied';
  }

  /**
   * Get description for a single filter value
   */
  private getFilterValueDescription(filter: FilterConfig, value: any): string | null {
    switch (filter.type) {
      case 'select':
        if (Array.isArray(value)) {
          const labels = value.map(val => {
            const option = filter.options?.find(opt => opt.value === val);
            return option?.label || val;
          });
          return `${filter.label}: ${labels.join(', ')}`;
        } else {
          const option = filter.options?.find(opt => opt.value === value);
          return `${filter.label}: ${option?.label || value}`;
        }

      case 'text':
      case 'search':
        return `${filter.label}: "${value}"`;

      case 'date_gte':
        const startDate = value instanceof Date ? value : new Date(value);
        return `${filter.label} from ${startDate.toLocaleDateString()}`;

      case 'date_lte':
        const endDate = value instanceof Date ? value : new Date(value);
        return `${filter.label} to ${endDate.toLocaleDateString()}`;

      case 'date_range':
        if (value && typeof value === 'object') {
          const start = value.start instanceof Date ? value.start.toLocaleDateString() : String(value.start || '');
          const end = value.end instanceof Date ? value.end.toLocaleDateString() : String(value.end || '');
          return `${filter.label}: ${start} - ${end}`;
        }
        return `${filter.label}: ${String(value)}`;

      case 'number_gte':
        return `${filter.label} ≥ ${value}`;

      case 'number_lte':
        return `${filter.label} ≤ ${value}`;

      default:
        return `${filter.label}: ${String(value)}`;
    }
  }

  /**
   * Validate filter configuration
   */
  validateFilters(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    this.filters.forEach((filter, index) => {
      if (!filter.key || filter.key.trim() === '') {
        errors.push(`Filter ${index + 1}: Key is required`);
      }

      if (!filter.label || filter.label.trim() === '') {
        errors.push(`Filter ${index + 1} (${filter.key}): Label is required`);
      }

      if (filter.type === 'select' && (!filter.options || filter.options.length === 0)) {
        errors.push(`Filter ${index + 1} (${filter.key}): Select filters must have options`);
      }

      // Check for duplicate keys
      const duplicateIndex = this.filters.findIndex((f, i) => i !== index && f.key === filter.key);
      if (duplicateIndex !== -1) {
        errors.push(`Filter ${index + 1} (${filter.key}): Duplicate key with filter ${duplicateIndex + 1}`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}