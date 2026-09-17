/** Constants and default option lists for the inventory request form. */

import type { FormItem } from './types';

export const RECORDS_URL = '/crm-records/records/';

/** Unmannd-only fallback when that tenant has not set Page Builder defaults. */
export const UNMANND_DELIVERY_PINCODE = '562149';
export const UNMANND_DELIVERY_ADDRESS =
  'Unmannd Autonomy Pvt Ltd, Bengaluru, Karnataka 562149';

/** @deprecated Use resolveDefaultDelivery — kept for Unmannd fallback / tests. */
export const DEFAULT_DELIVERY_PINCODE = UNMANND_DELIVERY_PINCODE;
/** @deprecated Use resolveDefaultDelivery — kept for Unmannd fallback / tests. */
export const DEFAULT_DELIVERY_ADDRESS = UNMANND_DELIVERY_ADDRESS;

export function isUnmanndTenant(tenantSlug?: string | null): boolean {
  return /unman+d/i.test(String(tenantSlug || ''));
}

export function resolveDefaultDelivery(opts: {
  configAddress?: string;
  configPincode?: string;
  tenantSlug?: string | null;
}): { address: string; pincode: string } {
  const configAddress = String(opts.configAddress || '').trim();
  const configPincode = String(opts.configPincode || '').replace(/\D/g, '').slice(0, 6);
  const unmanndFallback = isUnmanndTenant(opts.tenantSlug);
  return {
    address: configAddress || (unmanndFallback ? UNMANND_DELIVERY_ADDRESS : ''),
    pincode: configPincode || (unmanndFallback ? UNMANND_DELIVERY_PINCODE : ''),
  };
}

/** Stock Unmannd prefills (and blanks) yield to the tenant's configured default. */
export function pickDeliveryAddress(stored: string, configured: string): string {
  const value = String(stored || '').trim();
  const next = String(configured || '').trim();
  if (!value || value === UNMANND_DELIVERY_ADDRESS) return next;
  return value;
}

export function pickDeliveryPincode(stored: string, configured: string): string {
  const value = String(stored || '').replace(/\D/g, '').slice(0, 6);
  const next = String(configured || '').replace(/\D/g, '').slice(0, 6);
  if (!value || value === UNMANND_DELIVERY_PINCODE) return next;
  return value;
}



export const REQUEST_CATEGORY_OPTIONS = [
  { value: 'Domestic', label: 'Domestic' },
  { value: 'International', label: 'International' },
] as const;

export const SPEC_STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'from',
  'this',
  'that',
  'product',
  'board',
  'module',
  'kit',
  'pack',
  'set',
]);

export const PRIORITY_OPTIONS = [
  { value: 'HIGH', label: 'High (Same day)' },
  { value: 'MEDIUM', label: 'Middle (2-5 days)' },
  { value: 'LOW', label: 'Low (More than 5 days)' },
] as const;

export const REQUIRED_ITEM_FIELDS: Array<{ key: keyof FormItem; label: string }> = [
  { key: 'product_link', label: 'Item link' },
  { key: 'item_name_freeform', label: 'Item name' },
  { key: 'specifications', label: 'Specifications' },
  { key: 'quantity_required', label: 'Quantity' },
  { key: 'estimated_cost', label: 'Estimated cost' },
  { key: 'vendor', label: 'Vendor' },
  { key: 'project_purpose', label: 'Project' },
  { key: 'request_category', label: 'Shipment Type' },
  { key: 'urgency_level', label: 'Priority' },
];
