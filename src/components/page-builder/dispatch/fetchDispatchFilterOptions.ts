import type { AxiosInstance } from 'axios';
import type { FilterConfig, FilterOption } from '@/component-config/DynamicFilterConfig';
import {
  parseFilterOptionsFromApiResponse,
  resolveFilterOptionsApiUrl,
} from './dispatchMobileFilters';

export async function fetchDispatchFilterOptions(
  filter: FilterConfig & { optionsApiUrl: string; optionsDisplayKey: string; optionsValueKey: string },
  apiClient: AxiosInstance,
  entityType: string
): Promise<FilterOption[]> {
  const url = resolveFilterOptionsApiUrl(filter, entityType);
  const res = await apiClient.get<unknown>(url);
  const dk = filter.optionsDisplayKey.trim();
  const vk = filter.optionsValueKey.trim();
  let options = parseFilterOptionsFromApiResponse(res.data, dk, vk);
  if (filter.optionsIncludeNull) {
    const nullLabel = (filter.optionsNullLabel ?? 'Unassigned').trim() || 'Unassigned';
    const nullValue =
      filter.optionsNullValue !== undefined && filter.optionsNullValue !== null
        ? String(filter.optionsNullValue)
        : '';
    options = [{ label: nullLabel, value: nullValue }, ...options];
  }
  return options;
}
