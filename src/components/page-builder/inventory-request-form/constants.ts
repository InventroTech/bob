/** Constants and default option lists for the inventory request form. */

import type { FormItem } from './types';

export const RECORDS_URL = '/crm-records/records/';

/** 6-digit Indian PIN code for marketplace delivery ETAs. */
export const DEFAULT_DELIVERY_PINCODE = '562149';

/** Default ship-to address (editable on the form). */
export const DEFAULT_DELIVERY_ADDRESS =
  'Unmannd Autonomy Pvt Ltd, Bengaluru, Karnataka 562149';



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
  { key: 'urgency_level', label: 'Priority' },
];
