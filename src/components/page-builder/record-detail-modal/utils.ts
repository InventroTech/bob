/** Constants and pure helpers for RecordDetailModal. */

import type { NormalizedStatusHistoryEntry } from './types';

export const ENTITY_LABELS: Record<string, string> = {
  inventory_request: 'Inventory request',
  inventory_item: 'Inventory item',
  lead: 'Lead',
};

/** Top-level keys that are part of the API record (tenant_id excluded from view). */
export const RECORD_TOP_LEVEL_KEYS = ['id', 'created_at', 'updated_at'];

/** Default editable data fields per entity type. total_quantity is computed (allocated + available) for inventory_item. */
export const DEFAULT_EDITABLE_BY_ENTITY: Record<string, string[]> = {
  inventory_item: [
    'status',
    'allocated_quantity',
    'available_quantity',
    'location',
    'default_cost_per_unit',
    'default_vendor',
    'active',
  ],
  inventory_request: [
    'status',
    'quantity',
    'vendor',
    'tracking_number',
    'notes',
    'department',
    'sub_department',
    'project_purpose',
    'item_name_freeform',
    'part_number_or_sku',
    'quantity_required',
    'vendor_name',
    'tracking_link',
    'comments',
    'urgency_level',
    'expected_delivery_date',
    'procurement_type',
  ],
};

/** Fields hidden from all users (internal/system fields). */
export const FIELDS_HIDDEN_FOR_ALL: string[] = ['requester_id', 'pyro_data', 'entity_type', 'submitted_at', 'request_date', "assigned_to_id", "created_by_id","updated_at"];

/** inventory_request: data keys hidden from requestor (PM-only). Requestor never sees these in the modal. */
export const FIELDS_HIDDEN_FROM_REQUESTER: string[] = ['assigned_to_id', 'comments', 'requester_name'];

/** inventory_request: data keys the requestor is allowed to edit (subset; status and assignee are PM-only). */
export const EDITABLE_FIELDS_FOR_REQUESTER: string[] = [
  'project_purpose',
  'item_name_freeform',
  'specifications',
  'quantity_required',
  'quantity',
  'estimated_cost',
  'vendor',
  'product_link',
  'additional_link',
  'comments',
  'notes',
  'department',
];

/** Data keys hidden in default record when Final price section is off (matches form modal behavior). */
export const FINAL_PRICE_HIDDEN_ROW_KEYS = new Set([
  'total_price',
  'unit_price',
  'estimated_cost',
  'price_currency',
  'including_gst',
]);
export const ADD_VENDOR_VALUE = '__add_vendor__';
export const toVendorStorageName = (name: string): string =>
  String(name || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();

/** Detail rows that span both columns (long text, comments). */
export const DETAIL_ROW_FULL_WIDTH_KEYS = new Set([
  'comments',
  'statuses',
  'notes',
  'description',
  'item_name_freeform',
  'project_purpose',
]);

export function buildDisplayRows(record: any, entityType?: string): Array<{ key: string; value: unknown; inData: boolean }> {
  if (!record || typeof record !== 'object') return [];

  const rows: Array<{ key: string; value: unknown; inData: boolean }> = [];

  for (const k of RECORD_TOP_LEVEL_KEYS) {
    if (!(k in record)) continue;
    const v = record[k];
    if (k === 'data') continue;
    rows.push({ key: k, value: v, inData: false });
  }

  const data = record.data;
  if (data && typeof data === 'object') {
    const alloc = data.allocated_quantity;
    const avail = data.available_quantity;
    const hasNums = typeof alloc === 'number' && typeof avail === 'number';

    for (const [k, v] of Object.entries(data)) {
      let value = v;
      if (entityType === 'inventory_item' && k === 'total_quantity' && hasNums) {
        value = (alloc as number) + (avail as number);
      }
      rows.push({ key: k, value, inData: true });
    }
  }

  return rows.sort((a, b) => a.key.localeCompare(b.key));
}

export function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
    try {
      const d = new Date(value);
      if (!isNaN(d.getTime())) return d.toLocaleString();
    } catch {
      // keep as-is
    }
  }
  if (Array.isArray(value)) {
    // Special-case comments history arrays: show only the last comment text.
    const first = value[0] as any;
    if (first && typeof first === 'object' && 'comment' in first) {
      const last = value[value.length - 1] as any;
      return last?.comment != null ? String(last.comment) : '';
    }
    return value.join(', ');
  }
  return String(value);
}

export function normalizeCommentsHistory(value: unknown): Array<{ name: string; role: string; comment: string }> {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return (value as any[])
      .map((v) => {
        if (!v || typeof v !== 'object') return null;
        const name = typeof (v as any).name === 'string' ? (v as any).name : '';
        const role = typeof (v as any).role === 'string' ? (v as any).role : '';
        const comment = typeof (v as any).comment === 'string' ? (v as any).comment : '';
        if (!comment.trim()) return null;
        return { name, role, comment };
      })
      .filter(Boolean) as Array<{ name: string; role: string; comment: string }>;
  }
  if (typeof value === 'string' && value.trim()) {
    return [{ name: '', role: '', comment: value.trim() }];
  }
  return [];
}


export function normalizeStatusesHistory(value: unknown): NormalizedStatusHistoryEntry[] {
  if (value == null) return [];
  let raw: unknown = value;
  if (typeof value === 'string' && value.trim()) {
    try {
      raw = JSON.parse(value) as unknown;
    } catch {
      return [];
    }
  }
  if (!Array.isArray(raw)) return [];
  return (raw as unknown[])
    .map((v) => {
      if (!v || typeof v !== 'object') return null;
      const o = v as Record<string, unknown>;
      const current_status =
        typeof o.current_status === 'string' ? o.current_status.trim() : '';
      const previous_status =
        typeof o.previous_status === 'string' ? o.previous_status.trim() : '';
      const changed_by = typeof o.changed_by === 'string' ? o.changed_by.trim() : '';
      if (!current_status && !previous_status) return null;
      return { current_status, previous_status, changed_by };
    })
    .filter(Boolean) as NormalizedStatusHistoryEntry[];
}

/** Hide read-only rows with no meaningful value; keep editable rows so users can fill them. */
export function isDetailValueEmpty(key: string, value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  if (Array.isArray(value)) {
    if (key === 'comments') return normalizeCommentsHistory(value).length === 0;
    if (key === 'statuses') return normalizeStatusesHistory(value).length === 0;
    return value.length === 0;
  }
  if (typeof value === 'object' && !(value instanceof Date)) {
    return Object.keys(value as object).length === 0;
  }
  return false;
}

/** Keys that typically hold URLs; show as clickable links. */
export const LINK_KEYS = new Set([
  'tracking_link',
  'tracking_link_url',
  'link',
  'url',
  'product_link',
  'profile_link',
  'user_profile_link',
  'whatsapp_link',
]);

export function isUrl(value: unknown): boolean {
  if (typeof value !== 'string' || !value.trim()) return false;
  const v = value.trim();
  return v.startsWith('http://') || v.startsWith('https://') || v.startsWith('mailto:');
}

export function humanizeLabel(key: string): string {
  const known: Record<string, string> = {
    created_at: 'Created at',
    updated_at: 'Updated at',
    status: 'Status',
    quantity: 'Quantity',
    quantity_required: 'Quantity required',
    vendor: 'Vendor',
    vendor_name: 'Vendor name',
    tracking_number: 'Tracking number',
    tracking_link: 'Tracking link',
    courier_name: 'Courier',
    shipment_status: 'Shipment status',
    eta: 'ETA',
    tracking_updated_at: 'Tracking updated',
    notes: 'Notes',
    comments: 'Comments',
    department: 'Department',
    sub_department: 'Sub-department',
    project_purpose: 'Project',
    item_name_freeform: 'Item name',
    product_link: 'Product link',
    part_number_or_sku: 'Part number / SKU',
    urgency_level: 'Priority',
    priority: 'Priority',
    expected_delivery_date: 'Expected delivery',
    procurement_type: 'Procurement type',
    invoice_number: 'Invoice number',
    payment_terms: 'Payment terms',
    statuses: 'Status history',
    allocated_quantity: 'Allocated quantity',
    available_quantity: 'Available quantity',
    total_quantity: 'Total quantity',
    location: 'Location',
    default_cost_per_unit: 'Cost per unit',
    default_vendor: 'Default vendor',
    active: 'Active',
  };
  if (known[key]) return known[key];
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
