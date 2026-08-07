/** Constants and helpers for the inventory form edit modal. */

import { formatCurrencyDisplay, parseCurrencyInput } from '@/lib/utils/currencyFormat';

export const TRACKING_FORM_KEYS = [
  'tracking_number',
  'tracking_link',
  'courier_name',
  'shipment_status',
  'eta',
  'tracking_updated_at',
] as const;

export const RECORDS_URL = '/crm-records/records/';
export const ADD_VENDOR_VALUE = '__add_vendor__';
export const toVendorStorageName = (name: string): string =>
  String(name || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();

/** Normalize vendor from record data (string, vendor_name, or nested object). */
export function resolveVendorDisplayName(raw: unknown): string {
  if (raw == null || raw === '') return '';
  if (typeof raw === 'string' || typeof raw === 'number') {
    return toVendorStorageName(String(raw));
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    const name = o.vendor_name ?? o.name ?? o.label ?? o.value;
    if (name != null && name !== '') return toVendorStorageName(String(name));
  }
  return '';
}

export function looksLikeUrl(value: string): boolean {
  const v = (value || '').trim();
  if (!v) return false;
  return v.startsWith('http://') || v.startsWith('https://') || v.startsWith('mailto:');
}

/** Read-only modal fields that should show “Open link” instead of the raw URL. */
export function isLinkLikeFieldKey(key: string): boolean {
  if (key === 'product_link' || key === 'tracking_link' || key === 'tracking_link_url') return true;
  if (key === 'link' || key === 'url') return true;
  return key.endsWith('_link') || key.endsWith('_url');
}

export function formatDisplayValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (Array.isArray(value)) {
    const first = value[0] as any;
    if (first && typeof first === 'object' && 'comment' in first) {
      const last = value[value.length - 1] as any;
      return last?.comment != null ? String(last.comment) : '';
    }
    return value.join(', ');
  }
  return String(value);
}

export function formatPriceFieldDisplay(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  const n = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''));
  if (!Number.isFinite(n)) return formatDisplayValue(value);
  return formatCurrencyDisplay(n);
}

export function toCurrencyNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = parseCurrencyInput(value);
    if (typeof parsed === 'number' && Number.isFinite(parsed)) return parsed;
    const fallback = Number(value);
    return Number.isFinite(fallback) ? fallback : null;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Keys that we render as textarea (multi-line). */
export const TEXTAREA_KEYS = new Set([
  'comments',
  'notes',
  'description',
  'item_name_freeform',
  'project_purpose',
  'specifications',
]);

/** Preferred field order for Unmannd All Requests modal redesign. */
export const UNMANND_FORM_FIELD_ORDER = [
  'item_name_freeform',
  'status',
  'quantity_required',
  'quantity',
  'estimated_cost',
  'line_total',
  'computed_price',
  'negotiated_value',
  'vendor',
  'request_date',
  'requested_date',
  'urgency_level',
  'priority',
  'department',
  'category',
  'specifications',
  'product_link',
  'project_purpose',
  'comments',
] as const;

export function sortUnmanndFormFields<T extends { key: string }>(fields: T[]): T[] {
  const rank = new Map(UNMANND_FORM_FIELD_ORDER.map((k, i) => [k, i]));
  return [...fields].sort((a, b) => {
    const ai = rank.has(a.key) ? rank.get(a.key)! : 1000;
    const bi = rank.has(b.key) ? rank.get(b.key)! : 1000;
    if (ai !== bi) return ai - bi;
    return 0;
  });
}

export function unmanndFieldColClass(key: string): string {
  // Exact mock layout on a 3-column grid:
  // Item(2) + Status(1)
  // Qty | Cost | Price
  // Negotiated | Vendor | Date
  // Priority | Dept | Shipment Type
  // Specs(1) | Product link(2)
  // Project(3)
  // Comments(3)
  if (key === 'item_name_freeform') return 'md:col-span-2';
  if (key === 'status') return 'md:col-span-1';
  if (key === 'quantity_required' || key === 'quantity') return 'md:col-span-1';
  if (key === 'estimated_cost') return 'md:col-span-1';
  if (key === 'line_total' || key === 'computed_price') return 'md:col-span-1';
  if (key === 'negotiated_value') return 'md:col-span-1';
  if (key === 'vendor') return 'md:col-span-1';
  if (key === 'request_date' || key === 'requested_date') return 'md:col-span-1';
  if (key === 'urgency_level' || key === 'priority') return 'md:col-span-1';
  if (key === 'department') return 'md:col-span-1';
  if (key === 'category') return 'md:col-span-1';
  if (key === 'specifications') return 'md:col-span-1';
  if (key === 'product_link') return 'md:col-span-2';
  if (key === 'project_purpose') return 'md:col-span-3';
  if (key === 'comments') return 'md:col-span-3';
  return 'md:col-span-1';
}

/** Keys that are typically numbers. */
export const NUMBER_KEYS = new Set([
  'quantity', 'quantity_required', 'allocated_quantity', 'available_quantity',
  'estimated_cost', 'negotiated_value', 'total_quantity', 'total_price', 'unit_price',
]);
export const PRICE_KEYS = new Set(['estimated_cost', 'negotiated_value', 'total_price', 'unit_price']);
