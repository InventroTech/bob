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
export const TEXTAREA_KEYS = new Set(['comments', 'notes', 'description', 'item_name_freeform', 'project_purpose']);

/** Keys that are typically numbers. */
export const NUMBER_KEYS = new Set([
  'quantity', 'quantity_required', 'allocated_quantity', 'available_quantity',
  'estimated_cost', 'negotiated_value', 'total_quantity', 'total_price', 'unit_price',
]);
export const PRICE_KEYS = new Set(['estimated_cost', 'negotiated_value', 'total_price', 'unit_price']);
