/** API `ordering` values for dispatch list (see RecordListCreateView). */

export type DispatchSortOption = {
  id: string;
  label: string;
  ordering: string;
  section: 'Date' | 'Name & reference' | 'System';
};

export const DEFAULT_DISPATCH_SORT_ID = 'dc_date_desc';

export const DISPATCH_SORT_OPTIONS: DispatchSortOption[] = [
  { id: 'dc_date_desc', label: 'DC Date — newest first', ordering: '-data__dc_date', section: 'Date' },
  { id: 'dc_date_asc', label: 'DC Date — oldest first', ordering: 'data__dc_date', section: 'Date' },
  { id: 'po_date_desc', label: 'PO Date — newest first', ordering: '-data__po_date', section: 'Date' },
  { id: 'po_date_asc', label: 'PO Date — oldest first', ordering: 'data__po_date', section: 'Date' },
  { id: 'account_asc', label: 'Account name — A to Z', ordering: 'data__account_name', section: 'Name & reference' },
  { id: 'account_desc', label: 'Account name — Z to A', ordering: '-data__account_name', section: 'Name & reference' },
  { id: 'dc_number_asc', label: 'DC No — A to Z', ordering: 'data__dc_number', section: 'Name & reference' },
  { id: 'dc_number_desc', label: 'DC No — Z to A', ordering: '-data__dc_number', section: 'Name & reference' },
  { id: 'engineer_asc', label: 'Engineer — A to Z', ordering: 'data__engineer', section: 'Name & reference' },
  { id: 'po_number_asc', label: 'PO No — A to Z', ordering: 'data__po_number', section: 'Name & reference' },
  { id: 'updated_desc', label: 'Recently updated', ordering: '-updated_at', section: 'System' },
  { id: 'created_desc', label: 'Recently created', ordering: '-created_at', section: 'System' },
];

export function getDispatchSortOrdering(sortId: string): string {
  const match = DISPATCH_SORT_OPTIONS.find((o) => o.id === sortId);
  return match?.ordering ?? DISPATCH_SORT_OPTIONS[0].ordering;
}

export function getDispatchSortLabel(sortId: string): string {
  const match = DISPATCH_SORT_OPTIONS.find((o) => o.id === sortId);
  return match?.label ?? DISPATCH_SORT_OPTIONS[0].label;
}

export function isDefaultDispatchSort(sortId: string): boolean {
  return sortId === DEFAULT_DISPATCH_SORT_ID;
}
