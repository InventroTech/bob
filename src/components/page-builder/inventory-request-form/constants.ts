/** Constants and default option lists for the inventory request form. */

import type { EcommerceSource, FormItem } from './types';

export const RECORDS_URL = '/crm-records/records/';
export const PRICE_COMPARE_URL = '/crm-records/price-compare/';

/** Fallback catalog when vendor API is unavailable (mirrors backend price_compare_vendors.json). */
export const FALLBACK_ECOMMERCE_SOURCES: EcommerceSource[] = [
  { id: 'amazon', label: 'Amazon', vendorName: 'AMAZON', hostIncludes: ['amazon.'], profile: 'core' },
  { id: 'robu', label: 'Robu', vendorName: 'ROBU', hostIncludes: ['robu.in'], profile: 'core' },
  { id: 'robocraze', label: 'Robocraze', vendorName: 'ROBOCRAZE', hostIncludes: ['robocraze.com'], profile: 'core' },
  { id: 'zbotic', label: 'Zbotic', vendorName: 'ZBOTIC', hostIncludes: ['zbotic.in'], profile: 'core' },
  { id: 'flyrobo', label: 'Flyrobo', vendorName: 'FLYROBO', hostIncludes: ['flyrobo.in'], profile: 'extended' },
  { id: 'robokits', label: 'Robokits', vendorName: 'ROBOKITS', hostIncludes: ['robokits.co.in'], profile: 'extended' },
  { id: 'mouser', label: 'Mouser', vendorName: 'MOUSER', hostIncludes: ['mouser.'], profile: 'extended' },
  { id: 'digikey', label: 'DigiKey', vendorName: 'DIGIKEY', hostIncludes: ['digikey.'], profile: 'extended' },
  { id: 'tannatechbiz', label: 'Tanna TechBiz', vendorName: 'TANNATECHBIZ', hostIncludes: ['tannatechbiz.com'], profile: 'extended' },
  { id: 'anubisrc', label: 'Anubis RC', vendorName: 'ANUBISRC', hostIncludes: ['anubisrc.com'], profile: 'extended' },
  { id: 'uavstore', label: 'UAV Store', vendorName: 'UAVSTORE', hostIncludes: ['uavstore.in'], profile: 'extended' },
  { id: 'fpvstore', label: 'FPV Store', vendorName: 'FPVSTORE', hostIncludes: ['fpvstore.in'], profile: 'extended' },
  { id: 'fpvguru', label: 'FPV Guru', vendorName: 'FPVGURU', hostIncludes: ['fpvguru.in'], profile: 'extended' },
  { id: 'evelta', label: 'Evelta', vendorName: 'EVELTA', hostIncludes: ['evelta.com'], profile: 'extended' },
  { id: 'tujorc', label: 'Tujorc', vendorName: 'TUJORC', hostIncludes: ['tujorc.com'], profile: 'extended' },
  { id: 'quadkart', label: 'Quad Kart', vendorName: 'QUADKART', hostIncludes: ['quadkart.in'], profile: 'extended' },
  { id: 'ktron', label: 'Ktron', vendorName: 'KTRON', hostIncludes: ['ktron.in'], profile: 'extended' },
  { id: 'drkstore', label: 'DRK Store', vendorName: 'DRKSTORE', hostIncludes: ['drkstore.in'], profile: 'extended' },
  { id: 'uavgarage', label: 'UAV Garage', vendorName: 'UAVGARAGE', hostIncludes: ['uavgarage.com'], profile: 'extended' },
  { id: 'fabtolab', label: 'Fab to Lab', vendorName: 'FABTOLAB', hostIncludes: ['fabtolab.com'], profile: 'extended' },
  { id: 'other', label: 'Other', vendorName: '', hostIncludes: [] },
];

/** 6-digit Indian PIN code for marketplace delivery ETAs. */
export const DEFAULT_DELIVERY_PINCODE = '562149';

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
  { key: 'quantity_required', label: 'Quantity' },
  { key: 'estimated_cost', label: 'Estimated cost' },
  { key: 'vendor', label: 'Vendor' },
  { key: 'urgency_level', label: 'Priority' },
];
