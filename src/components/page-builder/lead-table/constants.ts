/** Constants for the lead table module. */

import type { Column } from './types';

export const URGENCY_BUTTON_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'STANDARD', label: 'Standard' },
  { value: 'CRITICAL', label: 'Critical' },
];

// Lightweight mustache-style matcher for replacing tokens like {{current_user}}
export const PLACEHOLDER_REGEX = /{{\s*([^}]+)\s*}}/g;

/** Injected My Requests column: Edit until the request is approved. */
export const REQUESTER_EDIT_COLUMN_ACCESSOR = '__requester_edit';

// Default columns used if no custom columns are configured
export const defaultColumns: Column[] = [
  { header: 'Stage', accessor: 'lead_stage', type: 'chip' },
  { header: 'Customer Name', accessor: 'name', type: 'text' },
  { header: 'Praja ID', accessor: 'praja_id', type: 'text' },
  { header: 'Party', accessor: 'affiliated_party', type: 'text' },
  { header: 'Phone No', accessor: 'phone_number', type: 'text' },
];

/** Default form modal fields for inventory_request when none configured; all enabled for edit. */
export const DEFAULT_INVENTORY_REQUEST_FORM_MODAL_FIELDS: Array<{ key: string; label: string; enabled: boolean; link?: boolean }> = [
  { key: 'status', label: 'Status', enabled: true },
  { key: 'quantity_required', label: 'Quantity required', enabled: true },
  { key: 'item_name_freeform', label: 'Item name', enabled: true },
  { key: 'vendor', label: 'Vendor', enabled: true },
  { key: 'product_link', label: 'Product link', enabled: true, link: true },
  { key: 'additional_link', label: 'Additional link', enabled: false, link: true },
  { key: 'comments', label: 'Comments', enabled: true },
  { key: 'notes', label: 'Notes', enabled: true },
  { key: 'urgency_level', label: 'Priority', enabled: false },
  { key: 'project_purpose', label: 'Project', enabled: true },
  { key: 'department', label: 'Department', enabled: true },
];

/** Default fields for Inventory Payment modal when none configured (mix of show-only and editable). */
export const DEFAULT_PAYMENT_MODAL_FIELDS: Array<{ key: string; label: string; enabled: boolean }> = [
  { key: 'status', label: 'Status', enabled: true },
  { key: 'item_name_freeform', label: 'Item name', enabled: false },
  { key: 'quantity', label: 'Quantity', enabled: false },
  { key: 'total_price', label: 'Total price', enabled: false },
  { key: 'unit_price', label: 'Unit price', enabled: false },
  { key: 'vendor', label: 'Vendor', enabled: false },
  { key: 'comments', label: 'Comments', enabled: true },
];
