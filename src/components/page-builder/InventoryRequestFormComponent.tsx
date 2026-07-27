'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiClient, membershipService } from '@/lib/api';
import type { MembershipUser } from '@/lib/api/services/membership';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar, User, Send, Loader2, Plus, Trash2, Scale, RefreshCw, ExternalLink, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrencyDisplay, formatCurrencyInputLive } from '@/lib/currencyFormat';
import { emptyShipmentTrackingFields } from '@/lib/shipmentTracking';
import { formatInventoryPriorityLabel } from '@/lib/inventoryPriority';
import { fetchDistinctFieldValues } from '@/components/page-builder/dispatch/fetchDistinctFieldValues';
import { Badge } from '@/components/ui/badge';

const RECORDS_URL = '/crm-records/records/';
const PRICE_COMPARE_URL = '/crm-records/price-compare/';

type EcommerceSource = {
  id: string;
  label: string;
  vendorName?: string;
  hostIncludes?: readonly string[];
  profile?: 'core' | 'extended' | string;
};

/** Fallback catalog when vendor API is unavailable (mirrors backend price_compare_vendors.json). */
const FALLBACK_ECOMMERCE_SOURCES: EcommerceSource[] = [
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

type PriceQuote = {
  id: string;
  source: string;
  source_label: string;
  link: string;
  price: number | '';
  currency: 'INR' | 'USD';
  title?: string;
  image?: string;
  live?: boolean;
  /** Marketplace delivery / ETA text, e.g. "FREE delivery Fri, 24 Jul". */
  delivery_date?: string;
};

type LivePriceCompareResult = {
  source?: string;
  title?: string | null;
  price?: number | null;
  currency?: string;
  link?: string;
  image?: string | null;
  available?: boolean;
  error?: string | null;
  delivery_date?: string | null;
};

type LivePriceCompareResponse = {
  results?: LivePriceCompareResult[];
  cheapest?: LivePriceCompareResult | null;
  errors?: string[];
  amazon_paapi_configured?: boolean;
  vendors?: EcommerceSource[];
  profile?: string | null;
  error?: string;
};

type PriceCompareVendorsResponse = {
  defaults?: { profile?: string };
  vendors?: Array<{
    id?: string;
    label?: string;
    vendor_name?: string;
    hosts?: string[];
    profile?: string;
  }>;
};

const quoteFromLiveResult = (
  r: LivePriceCompareResult,
  catalog: EcommerceSource[]
): PriceQuote | null => {
  const sourceRaw = String(r.source || 'other').toLowerCase().replace(/\s+/g, '');
  const known = catalog.find((s) => s.id === sourceRaw);
  const source = known?.id || (sourceRaw || 'other');
  const priceNum = r.price == null ? '' : Number(r.price);
  if (priceNum === '' || !Number.isFinite(priceNum) || priceNum <= 0) return null;
  const currency = String(r.currency || 'INR').toUpperCase() === 'USD' ? 'USD' : 'INR';
  return {
    id: crypto.randomUUID?.() ?? `quote-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    source,
    source_label: known?.label || String(r.source || 'Other'),
    link: String(r.link || '').trim(),
    price: priceNum,
    currency,
    title: String(r.title || '').trim(),
    image: String(r.image || '').trim(),
    live: true,
    delivery_date: String(r.delivery_date || '').trim(),
  };
};

/** 6-digit Indian PIN code for marketplace delivery ETAs. */
const DEFAULT_DELIVERY_PINCODE = '562149';

const REQUEST_CATEGORY_OPTIONS = [
  { value: 'Domestic', label: 'Domestic' },
  { value: 'International', label: 'International' },
] as const;

type RequestCategory = (typeof REQUEST_CATEGORY_OPTIONS)[number]['value'] | '';

const normalizeIndianPincode = (value: string): string | null => {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 6 && digits[0] !== '0') return digits;
  return null;
};

const looksLikeProductUrl = (value: string): boolean => {
  const s = String(value || '').trim();
  if (!s) return false;
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return /^https?:\/\/\S+/i.test(s);
  }
};

interface InventoryRequestFormConfig {
  /** Entity type to save (e.g. inventory_request). */
  entityType?: string;
  /** Initial status for new records (e.g. NEW_REQUEST). */
  initialStatus?: string;
  /** Friendly initial status label stored as data.status_text. */
  initialStatusText?: string;
  /** @deprecated Use initialStatus */
  defaultStatus?: string;
  /** Options shown in the Priority / Urgency picker. Saved as `urgency_level`. */
  urgencyOptions?: Array<{ value: string; label: string }>;
}

interface VendorOption {
  id: number;
  name: string;
}

type InventoryItemSuggestion = {
  id: number;
  name: string;
  data: Record<string, unknown>;
};

const normalizeProductName = (name: string): string =>
  String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

const normalizeVendorName = (name: string): string =>
  String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

const toVendorStorageName = (name: string): string =>
  String(name || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();

interface FormItem {
  id: string;
  item_name_freeform: string;
  /** Extra product specs (length, connector, model, etc.) used to refine live price search. */
  specifications: string;
  quantity_required: number | '';
  required_date: string;
  product_link: string;
  /** Product thumbnail URL from marketplace page (og:image / JSON-LD). */
  product_image: string;
  vendor: string;
  estimated_cost: string | number | '';
  price_currency: 'INR' | 'USD';
  urgency_level: string;
  comments: string;
  /** Manual quotes from Amazon / Robu / other sites for side-by-side comparison. */
  price_quotes: PriceQuote[];
}

const newEmptyItem = (): FormItem => ({
  id: crypto.randomUUID?.() ?? `item-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  item_name_freeform: '',
  specifications: '',
  quantity_required: '',
  required_date: '',
  product_link: '',
  product_image: '',
  vendor: '',
  estimated_cost: '',
  price_currency: 'INR',
  urgency_level: '',
  comments: '',
  price_quotes: [],
});

type SpecFacet = {
  key: string;
  label: string;
  options: string[];
};

const buildPriceSearchQuery = (name: string, specifications: string): string =>
  [name.trim(), specifications.trim()].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();

/** Pull differentiating product specs from live result titles so we can ask the user. */
const extractSpecFacetsFromTitles = (titles: string[], baseName: string): SpecFacet[] => {
  const baseTokens = new Set(
    baseName
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 1)
  );

  const lengthOpts = new Set<string>();
  const connectorOpts = new Set<string>();
  const finishOpts = new Set<string>();
  const variantOpts = new Set<string>();

  for (const raw of titles) {
    const title = String(raw || '').trim();
    if (!title) continue;

    for (const m of title.matchAll(/\b(\d+(?:\.\d+)?\s*(?:cm|mm|m|ft|feet|inch|in))\b/gi)) {
      lengthOpts.add(m[1].replace(/\s+/g, '').toLowerCase().replace(/feet/i, 'ft'));
    }
    // Normalize display of lengths later

    for (const m of title.matchAll(
      /\b(USB[\s-]?A|USB[\s-]?B|USB[\s-]?C|Type[\s-]?C|Mini[\s-]?B|Micro[\s-]?USB|HDMI|RJ45)\b/gi
    )) {
      connectorOpts.add(m[1].replace(/\s+/g, ' ').trim());
    }

    if (/\bgold[-\s]?plated\b/i.test(title)) finishOpts.add('Gold-plated');
    if (/\bnickel[-\s]?plated\b/i.test(title)) finishOpts.add('Nickel-plated');

    if (/\bwithout\s+usb\s+cable\b|\bw\/?o\s+usb\s+cable\b|\bno\s+cable\b/i.test(title)) {
      variantOpts.add('Without USB cable');
    } else if (/\bwith\s+(?:usb\s+)?cable\b/i.test(title)) {
      variantOpts.add('With USB cable');
    }
    if (/\bofficial\b/i.test(title)) variantOpts.add('Official');
    if (/\bcompatible\b/i.test(title)) variantOpts.add('Compatible');
    if (/\bun[-\s]?soldered\b/i.test(title)) variantOpts.add('Unsoldered');
    if (/\bsoldered\b/i.test(title) && !/\bun[-\s]?soldered\b/i.test(title)) {
      variantOpts.add('Soldered');
    }
  }

  // Pretty-print lengths while keeping unique values
  const prettyLengths = Array.from(lengthOpts).map((l) => {
    const m = l.match(/^(\d+(?:\.\d+)?)(cm|mm|m|ft|in)$/i);
    if (!m) return l;
    return `${m[1]} ${m[2].toLowerCase()}`;
  });

  const facets: SpecFacet[] = [];
  if (prettyLengths.length >= 2) {
    facets.push({ key: 'length', label: 'Length / size', options: prettyLengths.sort() });
  }
  if (connectorOpts.size >= 2) {
    facets.push({
      key: 'connector',
      label: 'Connector / interface',
      options: Array.from(connectorOpts).sort(),
    });
  }
  if (finishOpts.size >= 2) {
    facets.push({ key: 'finish', label: 'Finish', options: Array.from(finishOpts).sort() });
  }
  if (variantOpts.size >= 2) {
    facets.push({
      key: 'variant',
      label: 'Variant',
      options: Array.from(variantOpts).sort(),
    });
  }

  // If titles still look very different and we found no structured facets,
  // fall back to asking for free-text only (handled by dialog UI).
  void baseTokens;
  return facets;
};

/** Pull measurable / distinguishing specs from a product page title into a short specs string. */
const extractSpecificationsFromTitle = (title: string): string => {
  const text = String(title || '').trim();
  if (!text) return '';

  const parts: string[] = [];
  const seen = new Set<string>();
  const push = (value: string) => {
    const v = value.replace(/\s+/g, ' ').trim();
    if (!v) return;
    const key = v.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    parts.push(v);
  };

  for (const m of text.matchAll(/\b(\d+(?:\.\d+)?)\s*(cm|mm|m|ft|feet|inch|in)\b/gi)) {
    const unit = m[2].toLowerCase().replace(/^feet$/, 'ft').replace(/^inch$/, 'in');
    push(`${m[1]} ${unit}`);
  }
  for (const m of text.matchAll(
    /\b(USB[\s-]?A|USB[\s-]?B|USB[\s-]?C|Type[\s-]?C|Mini[\s-]?B|Micro[\s-]?USB|HDMI|RJ45)\b/gi
  )) {
    push(m[1].replace(/\s+/g, ' '));
  }
  for (const m of text.matchAll(/\b(\d+(?:\.\d+)?)\s*(v|volt|volts|kv)\b/gi)) {
    push(`${m[1]} ${m[2].toUpperCase().replace(/VOLTS?/, 'V')}`);
  }
  for (const m of text.matchAll(/\b(\d+(?:\.\d+)?)\s*(mah|ah|wh)\b/gi)) {
    push(`${m[1]} ${m[2].toUpperCase()}`);
  }
  for (const m of text.matchAll(/\b(\d{4,5})\b/g)) {
    // Cell / model codes like 18650, 21700
    if (/^(18650|21700|26650|14500|18350)$/i.test(m[1])) push(m[1]);
  }
  for (const m of text.matchAll(/\b(?:pack\s*of|set\s*of|qty)\s*(\d+)\b/gi)) {
    push(`Pack of ${m[1]}`);
  }
  for (const m of text.matchAll(/\b(\d+)\s*(?:pcs|pieces|pc)\b/gi)) {
    push(`${m[1]} pcs`);
  }
  if (/\bgold[-\s]?plated\b/i.test(text)) push('Gold-plated');
  if (/\bnickel[-\s]?plated\b/i.test(text)) push('Nickel-plated');
  if (/\bwithout\s+usb\s+cable\b|\bw\/?o\s+usb\s+cable\b|\bno\s+cable\b/i.test(text)) {
    push('Without USB cable');
  } else if (/\bwith\s+(?:usb\s+)?cable\b/i.test(text)) {
    push('With USB cable');
  }
  if (/\bofficial\b/i.test(text)) push('Official');
  if (/\bcompatible\b/i.test(text)) push('Compatible');
  for (const m of text.matchAll(/\b(\d+(?:\.\d+)?)\s*(w|watt|watts|hz|mhz|ghz|rpm|awg)\b/gi)) {
    push(`${m[1]} ${m[2].toUpperCase().replace(/WATTS?/, 'W')}`);
  }
  for (const m of text.matchAll(/\b(IP\d{2})\b/gi)) {
    push(m[1].toUpperCase());
  }
  for (const m of text.matchAll(/\b(\d+(?:\.\d+)?)\s*(kg|g|lb|oz)\b/gi)) {
    push(`${m[1]} ${m[2].toLowerCase()}`);
  }
  if (/\baluminium\b|\baluminum\b/i.test(text)) push('Aluminium');
  if (/\bstainless\s*steel\b/i.test(text)) push('Stainless steel');
  if (/\bplastic\b/i.test(text)) push('Plastic');
  if (/\bcopper\b/i.test(text)) push('Copper');
  if (/\blithium\b/i.test(text)) push('Lithium');
  if (/\bli[-\s]?ion\b/i.test(text)) push('Li-ion');
  if (/\bholder\b/i.test(text)) push('Holder');
  if (/\bsocket\b/i.test(text)) push('Socket');

  return parts.slice(0, 10).join(', ');
};

/** Prefer a shorter item name: strip noisy marketplace suffixes from the page title. */
const cleanItemNameFromTitle = (title: string): string => {
  let name = String(title || '').trim();
  if (!name) return '';
  // Drop common marketplace suffixes after | or -
  name = name.split(/\s*[|\u2013\u2014]\s*/)[0]?.trim() || name;
  // Truncate very long titles at a comma if still huge
  if (name.length > 120) {
    const cut = name.slice(0, 120);
    const lastComma = cut.lastIndexOf(',');
    name = (lastComma > 40 ? cut.slice(0, lastComma) : cut).trim();
  }
  return name;
};

/**
 * Always produce something for Specifications when a product title exists:
 * structured tokens first, otherwise leftover / full title text.
 */
const resolveSpecificationsFromTitle = (rawTitle: string, itemName: string): string => {
  const title = String(rawTitle || '').trim();
  if (!title) return '';

  const extracted = extractSpecificationsFromTitle(title);
  if (extracted) return extracted;

  const name = String(itemName || '').trim();
  let leftover = title;
  if (name) {
    const idx = leftover.toLowerCase().indexOf(name.toLowerCase());
    if (idx === 0) {
      leftover = leftover.slice(name.length).replace(/^[\s,|/\-–—:]+/, '').trim();
    } else if (name.length < leftover.length) {
      // Prefer text after the first comma / dash segment as detail
      const afterComma = leftover.includes(',')
        ? leftover.slice(leftover.indexOf(',') + 1).trim()
        : '';
      if (afterComma.length >= 8) leftover = afterComma;
    }
  }

  const fallback = (leftover.length >= 8 ? leftover : title).replace(/\s+/g, ' ').trim();
  return fallback.slice(0, 240);
};

const titlesNeedSpecificationPrompt = (titles: string[], baseName: string, existingSpecs: string): boolean => {
  if ((existingSpecs || '').trim()) return false;
  const clean = titles.map((t) => String(t || '').trim()).filter(Boolean);
  if (clean.length < 2) return false;
  const facets = extractSpecFacetsFromTitles(clean, baseName);
  if (facets.some((f) => f.options.length >= 2)) return true;
  // Different products when title similarity is low (shared token overlap with base name only).
  const normalized = clean.map((t) => t.toLowerCase().replace(/\s+/g, ' '));
  const unique = new Set(normalized);
  return unique.size >= 3;
};

const SPEC_STOP_WORDS = new Set([
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

/** Collapse "7 mm" / "7mm" / "7.5 cm" into a single comparable token ("7mm"). */
const normalizeMeasurementsInText = (value: string): string =>
  String(value || '').replace(
    /\b(\d+(?:\.\d+)?)\s*(cm|mm|m|ft|feet|inch|in)\b/gi,
    (_full, n: string, u: string) => {
      const unit = String(u)
        .toLowerCase()
        .replace(/^feet$/, 'ft')
        .replace(/^inch$/, 'in');
      return `${n}${unit}`;
    }
  );

const tokenizeProductText = (value: string): string[] =>
  normalizeMeasurementsInText(value)
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !SPEC_STOP_WORDS.has(t));

/** True when a marketplace title is a close match for the requested name + specs. */
const isExactEnoughProductMatch = (title: string, name: string, specifications: string): boolean => {
  const titleText = normalizeMeasurementsInText(String(title || '').trim().toLowerCase());
  if (!titleText) return false;

  const titleTokens = new Set(tokenizeProductText(titleText));
  const nameTokens = tokenizeProductText(name);
  if (nameTokens.length === 0) return false;

  const nameHits = nameTokens.filter((t) => titleTokens.has(t) || titleText.includes(t)).length;
  if (nameTokens.length <= 2) {
    if (nameHits < nameTokens.length) return false;
  } else if (nameHits / nameTokens.length < 0.75) {
    return false;
  }

  const specTokens = tokenizeProductText(specifications);
  if (specTokens.length === 0) return true;

  // Specs like length/connector must appear; require strong overlap.
  // Length tokens are already normalized to "7mm" so they match title "… 7mm …".
  const required = specTokens.filter(
    (t) =>
      /\d/.test(t) ||
      /usb|mini|micro|type|hdmi|rj45|gold|nickel|plated|solder|cable|official|compatible/.test(t) ||
      t.length >= 3
  );
  const check = required.length > 0 ? required : specTokens;
  const tokenMatches = (t: string) => {
    if (titleTokens.has(t) || titleText.includes(t)) return true;
    // "7mm" ↔ "7 mm" already normalized; also accept bare number if unit is present nearby.
    const m = t.match(/^(\d+(?:\.\d+)?)(cm|mm|m|ft|in)$/i);
    if (!m) return false;
    const num = m[1];
    const unit = m[2].toLowerCase();
    return (
      titleText.includes(`${num}${unit}`) ||
      titleText.includes(`${num} ${unit}`) ||
      (titleTokens.has(num) && titleText.includes(unit))
    );
  };
  const specHits = check.filter(tokenMatches).length;
  if (check.length <= 2) return specHits >= check.length;
  return specHits / check.length >= 0.7;
};

const PRIORITY_OPTIONS = [
  { value: 'HIGH', label: 'High (Same day)' },
  { value: 'MEDIUM', label: 'Middle (2-5 days)' },
  { value: 'LOW', label: 'Low (More than 5 days)' },
] as const;

const REQUIRED_ITEM_FIELDS: Array<{ key: keyof FormItem; label: string }> = [
  { key: 'quantity_required', label: 'Quantity' },
  { key: 'estimated_cost', label: 'Estimated cost' },
  { key: 'vendor', label: 'Vendor' },
  { key: 'urgency_level', label: 'Priority' },
];

interface InventoryRequestFormProps {
  config?: InventoryRequestFormConfig;
  variant?: 'default' | 'procurement';
}

/** Display calendar day as DD-MM-YYYY (e.g. 25-07-2026). */
const formatRequestDateDisplay = (isoDate: string): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(isoDate || '').trim());
  if (!m) return isoDate || '—';
  return `${m[3]}-${m[2]}-${m[1]}`;
};

/**
 * Inventory request creation form for PageBuilder.
 * Supports multiple items per submission; each item is saved as a separate record via API.
 * Hierarchy (this tenant): Requestor -> Procurement Manager -> Team Lead.
 * manager = requestor's parent; team_lead = manager's parent when present.
 */
export const InventoryRequestFormComponent: React.FC<InventoryRequestFormProps> = ({
  config,
  variant = 'default',
}) => {
  const isProcurement = variant === 'procurement';
  const { user } = useAuth();

  const entityType = config?.entityType ?? 'inventory_request';
  const initialStatus = config?.initialStatus ?? config?.defaultStatus ?? 'NEW_REQUEST';  const initialStatusText = (config?.initialStatusText ?? initialStatus).trim();

  const [requestDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [department, setDepartment] = useState('');
  const [projectPurpose, setProjectPurpose] = useState('');
  const [requestCategory, setRequestCategory] = useState<RequestCategory>('');
  const [deliveryPincode, setDeliveryPincode] = useState(DEFAULT_DELIVERY_PINCODE);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [myRoleName, setMyRoleName] = useState<string>('');
  const [requesterNameFromMembership, setRequesterNameFromMembership] = useState<string>('');
  // team_lead / manager store authz_tenantmembership.id
  const [teamLeadMembershipId, setTeamLeadMembershipId] = useState<string | null>(null);
  const [managerMembershipId, setManagerMembershipId] = useState<string | null>(null);
  const [currentMembershipId, setCurrentMembershipId] = useState<string | null>(null);
  const [items, setItems] = useState<FormItem[]>(() => [newEmptyItem()]);
  const [submitting, setSubmitting] = useState(false);
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [vendorsLoading, setVendorsLoading] = useState(true);
  const [addVendorForItemId, setAddVendorForItemId] = useState<string | null>(null);
  const [newVendorName, setNewVendorName] = useState('');
  const [newVendorLink, setNewVendorLink] = useState('');
  const [savingNewVendor, setSavingNewVendor] = useState(false);
  /** Spec picker shown when live search finds multiple product variants. */
  const [specPromptItemId, setSpecPromptItemId] = useState<string | null>(null);
  const [specFacets, setSpecFacets] = useState<SpecFacet[]>([]);
  const [specSelections, setSpecSelections] = useState<Record<string, string>>({});
  const [specExtraText, setSpecExtraText] = useState('');
  const [specSampleTitles, setSpecSampleTitles] = useState<string[]>([]);
  /** At most one matching product selected (titles contain commas — don't parse via split). */
  const [selectedSampleMatch, setSelectedSampleMatch] = useState<string | null>(null);
  /** First live-search payload kept so length/size Apply filters existing hits instead of re-querying empty. */
  const [pendingSpecCompare, setPendingSpecCompare] = useState<{
    itemId: string;
    name: string;
    data: LivePriceCompareResponse;
  } | null>(null);
  /** Live-formatted price strings while typing (cleared on blur). */
  const [priceDraftByItemId, setPriceDraftByItemId] = useState<Record<string, string>>({});
  /** Vendor catalog from backend (config-driven). */
  const [ecommerceSources, setEcommerceSources] = useState<EcommerceSource[]>(() => [
    ...FALLBACK_ECOMMERCE_SOURCES,
  ]);
  /** core = small reliable set; extended = full catalog (default). */
  const [priceCompareProfile, setPriceCompareProfile] = useState<'core' | 'extended'>('extended');
  /** Per-item loading state for live marketplace price fetch. */
  const [liveCompareLoadingByItemId, setLiveCompareLoadingByItemId] = useState<Record<string, boolean>>({});
  /** Per-item loading while resolving product details from a pasted item link. */
  const [linkFetchLoadingByItemId, setLinkFetchLoadingByItemId] = useState<Record<string, boolean>>({});
  /** Last item-link URL successfully fetched per item (skip duplicate blur fetches). */
  const [lastFetchedLinkByItemId, setLastFetchedLinkByItemId] = useState<Record<string, string>>({});
  /** Shown when live search finds no close product match. */
  const [priceCompareStatusByItemId, setPriceCompareStatusByItemId] = useState<
    Record<string, 'idle' | 'found' | 'unavailable'>
  >({});
  const [focusedItemNameId, setFocusedItemNameId] = useState<string | null>(null);
  const [itemNameQuery, setItemNameQuery] = useState<string>('');
  const [itemNameSuggestions, setItemNameSuggestions] = useState<InventoryItemSuggestion[]>([]);
  const [itemNameSuggestionsOpen, setItemNameSuggestionsOpen] = useState(false);
  const [itemNameSuggestionsLoading, setItemNameSuggestionsLoading] = useState(false);
  const [projectSuggestions, setProjectSuggestions] = useState<string[]>([]);
  const [projectSuggestionsOpen, setProjectSuggestionsOpen] = useState(false);
  const [projectSuggestionsLoading, setProjectSuggestionsLoading] = useState(false);
  const [focusedVendorId, setFocusedVendorId] = useState<string | null>(null);
  const [vendorQuery, setVendorQuery] = useState<string>('');
  const [vendorSuggestionsOpen, setVendorSuggestionsOpen] = useState(false);

  const requesterDisplay =
    requesterNameFromMembership ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    '—';

  /** Vendors searched for the selected profile (extended = full catalog). */
  const activePriceCompareVendors = ecommerceSources.filter((s) => {
    if (!s.id || s.id === 'other') return false;
    if (priceCompareProfile === 'extended') return true;
    return s.profile === 'core';
  });

  const fetchVendors = useCallback(async () => {
    try {
      setVendorsLoading(true);
      const res = await apiClient.get<{ data?: { vendor_name?: string; id?: number }[]; results?: { data?: { vendor_name?: string; id?: number } }[] }>(
        `${RECORDS_URL}?entity_type=unmannd_vendor&page_size=500`
      );
      const raw = res.data?.data ?? (res.data as any)?.results ?? [];
      const list = Array.isArray(raw) ? raw : [];
      const options: VendorOption[] = list
        .map((r: any) => {
          const id = r.id ?? r.data?.id;
          const name = (r.data?.vendor_name ?? r.vendor_name ?? r.data?.name ?? '').trim();
          return id != null && name ? { id: Number(id), name } : null;
        })
        .filter(Boolean) as VendorOption[];
      setVendors(options);
    } catch (err) {
      console.error('Failed to fetch vendors', err);
      setVendors([]);
    } finally {
      setVendorsLoading(false);
    }
  }, []);

  const loadProjectSuggestions = useCallback(async () => {
    try {
      setProjectSuggestionsLoading(true);
      const values = await fetchDistinctFieldValues(entityType, 'project_purpose');
      setProjectSuggestions(values);
    } catch {
      // Keep whatever we already have (e.g. locally remembered after submit).
    } finally {
      setProjectSuggestionsLoading(false);
    }
  }, [entityType]);

  useEffect(() => {
    void loadProjectSuggestions();
  }, [loadProjectSuggestions]);

  const rememberProjectSuggestion = useCallback((value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setProjectSuggestions((prev) => {
      if (prev.some((p) => p.toLowerCase() === trimmed.toLowerCase())) return prev;
      return [...prev, trimmed].sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: 'base' })
      );
    });
  }, []);

  const filteredProjectSuggestions = (() => {
    const q = projectPurpose.trim().toLowerCase();
    const list = !q
      ? projectSuggestions
      : projectSuggestions.filter((p) => p.toLowerCase().includes(q));
    return list.slice(0, 12);
  })();

  const fetchItemSuggestions = useCallback(async (query: string) => {
    const q = query.trim();
    if (q.length < 2) {
      setItemNameSuggestions([]);
      setItemNameSuggestionsOpen(false);
      return;
    }
    try {
      setItemNameSuggestionsLoading(true);
      const res = await apiClient.get<any>(
        `${RECORDS_URL}?entity_type=unmannd_product&page_size=12&search=${encodeURIComponent(q)}`
      );
      const raw = res.data?.data ?? (res.data as any)?.results ?? [];
      const list = Array.isArray(raw) ? raw : [];
      const mapped = list
        .map((r: any) => {
          const id = r.id ?? r.data?.id;
          const data = r.data && typeof r.data === 'object' ? (r.data as Record<string, unknown>) : {};
          const name =
            String(
              data.name ?? data.item_name_freeform ?? data.item_name ?? r.item_name_freeform ?? r.name ?? ''
            ).trim();
          return id != null && name ? ({ id: Number(id), name, data } as InventoryItemSuggestion) : null;
        })
        .filter(Boolean) as InventoryItemSuggestion[];
      // De-duplicate suggestions by normalized product name so repeated requests
      // don't show the same item multiple times.
      const deduped = new Map<string, InventoryItemSuggestion>();
      mapped.forEach((m) => {
        const k = normalizeProductName(m.name);
        if (!k) return;
        if (!deduped.has(k)) deduped.set(k, m);
      });
      const uniqueSuggestions = Array.from(deduped.values());
      setItemNameSuggestions(uniqueSuggestions);
      setItemNameSuggestionsOpen(uniqueSuggestions.length > 0);
    } catch {
      setItemNameSuggestions([]);
      setItemNameSuggestionsOpen(false);
    } finally {
      setItemNameSuggestionsLoading(false);
    }
  }, []);


  /**
   * Keep a de-duplicated product catalog entry for typeahead.
   * Uses entity_type=unmannd_product and exact-name match (case-insensitive) on fetched candidates.
   */
  const upsertUnmanndProduct = useCallback(async (item: FormItem) => {
    const productName = String(item.item_name_freeform ?? '').trim();
    if (!productName) return;
    const normalizedName = normalizeProductName(productName);
    const productVendor = toVendorStorageName(String(item.vendor ?? '').trim());

    const productData: Record<string, unknown> = {
      name: productName,
      normalized_name: normalizedName,
      vendor: productVendor || '',
      default_vendor: productVendor || '',
      product_link: String(item.product_link ?? '').trim() || '',
    };
    const estCost = item.estimated_cost;
    if (estCost !== '' && estCost !== undefined) {
      productData.estimated_cost = typeof estCost === 'number' ? estCost : Number(estCost) || 0;
    }

    const searchRes = await apiClient.get<any>(
      `${RECORDS_URL}?entity_type=unmannd_product&page_size=20&search=${encodeURIComponent(productName)}`
    );
    const raw = searchRes.data?.data ?? (searchRes.data as any)?.results ?? [];
    const list = Array.isArray(raw) ? raw : [];
    const existing = list.find((r: any) => {
      const d = r?.data && typeof r.data === 'object' ? (r.data as Record<string, unknown>) : {};
      const n = normalizeProductName(
        String(d.normalized_name ?? d.name ?? d.item_name_freeform ?? r?.name ?? '')
      );
      return n === normalizedName;
    });

    if (existing?.id != null) {
      await apiClient.patch(`${RECORDS_URL}${existing.id}/`, {
        data: {
          ...(existing?.data && typeof existing.data === 'object' ? existing.data : {}),
          ...productData,
        },
      });
      return;
    }

    await apiClient.post(RECORDS_URL, {
      entity_type: 'unmannd_product',
      data: productData,
    });
  }, []);

  const deleteVendor = useCallback(
    async (vendor: VendorOption) => {
      try {
        await apiClient.delete(`${RECORDS_URL}${vendor.id}/`);
        // Optimistically remove from local list
        setVendors((prev) => prev.filter((v) => v.id !== vendor.id));
        // Clear vendor field on any items using this vendor name
        setItems((prev) =>
          prev.map((item) =>
            item.vendor === vendor.name ? { ...item, vendor: '' } : item
          )
        );
        toast.success('Vendor deleted.');
        // Refresh from server in background
        fetchVendors();
      } catch (err: unknown) {
        const msg =
          err && typeof err === 'object' && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Failed to delete vendor.';
        toast.error(msg);
      }
    },
    [fetchVendors, setItems]
  );

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  // Debounced typeahead for item name
  useEffect(() => {
    if (!focusedItemNameId) return;
    const t = window.setTimeout(() => {
      fetchItemSuggestions(itemNameQuery);
    }, 250);
    return () => window.clearTimeout(t);
  }, [focusedItemNameId, itemNameQuery, fetchItemSuggestions]);

  // Load price-compare vendor catalog from backend (single source of truth).
  useEffect(() => {
    let cancelled = false;
    const loadVendors = async () => {
      try {
        const res = await apiClient.get<PriceCompareVendorsResponse>(PRICE_COMPARE_URL);
        const rows = (res.data?.vendors ?? [])
          .map((v) => ({
            id: String(v.id || '').trim().toLowerCase(),
            label: String(v.label || v.id || '').trim(),
            vendorName: String(v.vendor_name || '').trim(),
            hostIncludes: Array.isArray(v.hosts) ? v.hosts.map(String) : [],
            profile: String(v.profile || 'extended'),
          }))
          .filter((v) => v.id && v.label);
        if (cancelled || rows.length === 0) return;
        setEcommerceSources([...rows, { id: 'other', label: 'Other', vendorName: '', hostIncludes: [] }]);
        // Form default is Extended; do not overwrite from API (settings used to force core).
      } catch {
        // Keep fallback sources.
      }
    };
    void loadVendors();
    return () => {
      cancelled = true;
    };
  }, []);

  // Pre-fill department and team_lead from current user's membership (API only)
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const loadMembershipAndTeamLead = async () => {
      const membership = await membershipService.getMyMembership();
      if (!membership || cancelled) return;

      setDepartment(membership.department ?? '');
      setMyRoleName(membership.role_name ?? membership.role_key ?? '');
      const membershipAny = membership as any;
      const membershipName = String(membershipAny.name ?? membershipAny.full_name ?? '').trim();
      if (!cancelled && membershipName) {
        setRequesterNameFromMembership(membershipName);
      }

      const parentMembershipId = membership.user_parent_id ?? null;
      const ownMembershipId =
        membership.tenant_membership_id != null ? String(membership.tenant_membership_id) : null;
      if (!cancelled && ownMembershipId) {
        setCurrentMembershipId(ownMembershipId);
      }

      // Resolve Requestor -> Team Lead -> Manager from hierarchy.
      try {
        const resp = await apiClient.get<any>('/membership/users/');
        const respData = resp.data;
        let users: MembershipUser[] = [];

        if (Array.isArray(respData)) {
          users = respData as MembershipUser[];
        } else if (respData && typeof respData === 'object') {
          if (Array.isArray(respData.results)) {
            users = respData.results as MembershipUser[];
          } else if (Array.isArray(respData.data)) {
            users = respData.data as MembershipUser[];
          }
        }

        const selfMembership = users.find((u) => {
          const uid = String(user?.id ?? '');
          return (
            (u.user_id != null && String(u.user_id) === uid) ||
            (u.uid != null && String(u.uid) === uid)
          );
        });
        const selfName = String(selfMembership?.name ?? selfMembership?.full_name ?? '').trim();
        if (!cancelled && selfName) {
          setRequesterNameFromMembership(selfName);
        }
        if (!cancelled && selfMembership?.id != null) {
          setCurrentMembershipId(String(selfMembership.id));
        }

        if (parentMembershipId != null) {
          const parentId = String(parentMembershipId);
          const parentUser = users.find(
            (u) => u.id != null && Number(u.id) === Number(parentMembershipId)
          );
          const grandparentId = parentUser?.user_parent_id ?? null;

          // Requestor → parent (PM) → grandparent (Team Lead).
          // Save PM as manager so create emails include Procurement Manager.
          setManagerMembershipId(parentId);
          if (grandparentId != null) {
            const grandparent = users.find(
              (u) => u.id != null && Number(u.id) === Number(grandparentId)
            );
            setTeamLeadMembershipId(
              grandparent?.id != null ? String(grandparent.id) : String(grandparentId)
            );
          } else {
            setTeamLeadMembershipId(parentId);
          }
          return;
        }
      } catch (err) {
        console.warn('Failed to resolve membership users for requester/team_lead/manager', err);
      }

      // If parent id is known from /membership/me/role, still save it even when users list fails.
      if (!cancelled && parentMembershipId != null) {
        const parentId = String(parentMembershipId);
        setManagerMembershipId(parentId);
        setTeamLeadMembershipId(parentId);
        return;
      }

      // Do NOT fall back to the requestor's own membership as team_lead.
      if (!cancelled) {
        console.warn('No manager/team_lead parent found for current membership; leaving unset');
      }
    };

    loadMembershipAndTeamLead();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const addItem = useCallback(() => {
    setItems((prev) => [...prev, newEmptyItem()]);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => (prev.length <= 1 ? prev : prev.filter((i) => i.id !== id)));
  }, []);

  const updateItem = useCallback((id: string, field: keyof FormItem, value: string | number | boolean | '' | PriceQuote[]) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, [field]: value } : i))
    );
  }, []);

  const removeQuote = useCallback((itemId: string, quoteId: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        return { ...item, price_quotes: item.price_quotes.filter((q) => q.id !== quoteId) };
      })
    );
  }, []);

  /** Apply a comparison quote into the main cost / vendor / product link fields. */
  const applyQuoteToItem = useCallback((itemId: string, quote: PriceQuote) => {
    if (quote.price === '' || !Number.isFinite(Number(quote.price)) || Number(quote.price) <= 0) {
      toast.error('This quote has no valid price.');
      return;
    }
    const meta = ecommerceSources.find((s) => s.id === quote.source);
    const vendorName = meta?.vendorName || toVendorStorageName(quote.source_label) || 'OTHER';
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        return {
          ...item,
          estimated_cost: Number(quote.price),
          price_currency: quote.currency,
          vendor: vendorName,
          product_link: quote.link.trim() || item.product_link,
          product_image: quote.image?.trim() || item.product_image,
        };
      })
    );
    setPriceDraftByItemId((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
    toast.success(`Using ${quote.source_label} price (${formatCurrencyDisplay(quote.price)} ${quote.currency}).`);
  }, [ecommerceSources]);

  /**
   * Fetch product title / price / vendor from a pasted item link via price-compare (urls only).
   */
  const fetchDetailsFromItemLink = useCallback(
    async (itemId: string, rawUrl?: string, options?: { force?: boolean }) => {
      const item = items.find((i) => i.id === itemId);
      if (!item) return;

      const url = String(rawUrl ?? item.product_link ?? '').trim();
      if (!looksLikeProductUrl(url)) {
        if (url) toast.error('Enter a valid product URL (https://…).');
        return;
      }

      const normalizedUrl = url;
      if (!options?.force && lastFetchedLinkByItemId[itemId] === normalizedUrl) {
        return;
      }

      const pin = normalizeIndianPincode(deliveryPincode) || DEFAULT_DELIVERY_PINCODE;

      setLinkFetchLoadingByItemId((prev) => ({ ...prev, [itemId]: true }));
      try {
        const res = await apiClient.post<LivePriceCompareResponse>(
          PRICE_COMPARE_URL,
          {
            urls: [normalizedUrl],
            pincode: pin,
          },
          { timeout: 90000 }
        );
        const data = res.data;
        if (data?.error) {
          toast.error(data.error);
          return;
        }

        const results = (data?.results ?? []).filter(
          (r) => !r.error && r.price != null && Number(r.price) > 0
        );
        if (results.length === 0) {
          const errMsg =
            (data?.results ?? []).find((r) => r.error)?.error ||
            data?.errors?.[0] ||
            'Could not fetch product details from this link.';
          toast.error(String(errMsg));
          return;
        }

        // Prefer the result whose link matches the pasted URL; else cheapest.
        const urlHost = (() => {
          try {
            return new URL(normalizedUrl).hostname.replace(/^www\./, '').toLowerCase();
          } catch {
            return '';
          }
        })();
        const matched =
          results.find((r) => {
            const link = String(r.link || '').trim();
            if (!link) return false;
            if (link === normalizedUrl) return true;
            try {
              const h = new URL(link).hostname.replace(/^www\./, '').toLowerCase();
              return Boolean(urlHost && h === urlHost);
            } catch {
              return false;
            }
          }) ||
          [...results].sort((a, b) => Number(a.price) - Number(b.price))[0];

        const quote = quoteFromLiveResult(matched, ecommerceSources);
        if (!quote) {
          toast.error('Could not read a price from this link.');
          return;
        }

        const meta = ecommerceSources.find((s) => s.id === quote.source);
        const vendorName = meta?.vendorName || toVendorStorageName(quote.source_label) || 'OTHER';
        const rawTitle = (quote.title || '').trim();
        const title = cleanItemNameFromTitle(rawTitle) || rawTitle;
        const specsFromTitle = resolveSpecificationsFromTitle(rawTitle, title);

        const productImage =
          String(matched.image || quote.image || '').trim() ||
          (item.product_image ?? '').trim();

        setItems((prev) =>
          prev.map((row) => {
            if (row.id !== itemId) return row;
            const existingQuotes = row.price_quotes.filter(
              (q) => (q.link || '').trim().toLowerCase() !== (quote.link || '').trim().toLowerCase()
            );
            return {
              ...row,
              item_name_freeform: title || row.item_name_freeform,
              // Always fill specs from the link when we have a title.
              specifications: specsFromTitle || row.specifications || title || row.item_name_freeform,
              estimated_cost: Number(quote.price),
              price_currency: quote.currency,
              vendor: vendorName || row.vendor,
              product_link: quote.link.trim() || normalizedUrl,
              product_image: productImage || row.product_image,
              price_quotes: [quote, ...existingQuotes],
            };
          })
        );
        setPriceDraftByItemId((prev) => {
          const next = { ...prev };
          delete next[itemId];
          return next;
        });
        setLastFetchedLinkByItemId((prev) => ({ ...prev, [itemId]: normalizedUrl }));
        setPriceCompareStatusByItemId((prev) => ({ ...prev, [itemId]: 'found' }));

        toast.success(
          title
            ? `Loaded “${title.slice(0, 60)}${title.length > 60 ? '…' : ''}” — ${formatCurrencyDisplay(quote.price)} ${quote.currency}`
            : `Loaded price ${formatCurrencyDisplay(quote.price)} ${quote.currency} from link`
        );
      } catch (err: unknown) {
        const msg =
          err && typeof err === 'object' && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Failed to fetch details from this link.';
        toast.error(msg);
      } finally {
        setLinkFetchLoadingByItemId((prev) => ({ ...prev, [itemId]: false }));
      }
    },
    [items, deliveryPincode, ecommerceSources, lastFetchedLinkByItemId]
  );

  /** Apply live API results into quote rows for one item. */
  const applyLivePriceResults = useCallback(
    (itemId: string, data: LivePriceCompareResponse, name: string, specifications: string) => {
      const catalog =
        data.vendors && data.vendors.length > 0
          ? [
              ...data.vendors.map((v) => ({
                id: String(v.id || '').toLowerCase(),
                label: String(v.label || v.id || ''),
                vendorName: String(v.vendorName || ''),
                hostIncludes: v.hostIncludes || [],
                profile: v.profile,
              })),
              { id: 'other', label: 'Other', vendorName: '', hostIncludes: [] },
            ]
          : ecommerceSources;

      const mapped = (data?.results ?? [])
        .map((r) => quoteFromLiveResult(r, catalog))
        .filter(Boolean) as PriceQuote[];

      // Keep only close matches for the requested name + specifications.
      let exactMatches = mapped.filter((q) =>
        isExactEnoughProductMatch(q.title || '', name, specifications)
      );
      if (exactMatches.length === 0 && specifications.trim()) {
        exactMatches = mapped.filter((q) => isExactEnoughProductMatch(q.title || '', name, ''));
      }

      const MAX_PER_SOURCE = 3;
      const SOURCE_ORDER = [
        ...catalog.map((s) => s.id).filter((id) => id !== 'other'),
        'other',
      ];
      const grouped = new Map<string, PriceQuote[]>();
      const seenLinks = new Set<string>();
      for (const q of exactMatches) {
        const linkKey = (q.link || '').trim().toLowerCase();
        if (linkKey) {
          if (seenLinks.has(linkKey)) continue;
          seenLinks.add(linkKey);
        }
        const list = grouped.get(q.source) ?? [];
        list.push(q);
        grouped.set(q.source, list);
      }

      const nextQuotes: PriceQuote[] = [];
      const orderSet = new Set(SOURCE_ORDER);
      for (const source of SOURCE_ORDER) {
        const list = (grouped.get(source) ?? [])
          .slice()
          .sort((a, b) => Number(a.price) - Number(b.price))
          .slice(0, MAX_PER_SOURCE);
        nextQuotes.push(...list);
      }
      for (const [source, list] of grouped) {
        if (orderSet.has(source)) continue;
        nextQuotes.push(
          ...list
            .slice()
            .sort((a, b) => Number(a.price) - Number(b.price))
            .slice(0, MAX_PER_SOURCE)
        );
      }

      nextQuotes.sort((a, b) => {
        const ai = SOURCE_ORDER.indexOf(a.source);
        const bi = SOURCE_ORDER.indexOf(b.source);
        const aIdx = ai === -1 ? SOURCE_ORDER.length : ai;
        const bIdx = bi === -1 ? SOURCE_ORDER.length : bi;
        if (aIdx !== bIdx) return aIdx - bIdx;
        const ap = typeof a.price === 'number' ? a.price : Number.POSITIVE_INFINITY;
        const bp = typeof b.price === 'number' ? b.price : Number.POSITIVE_INFINITY;
        return ap - bp;
      });

      if (nextQuotes.length === 0) {
        setItems((prev) =>
          prev.map((row) => (row.id === itemId ? { ...row, price_quotes: [] } : row))
        );
        setPriceCompareStatusByItemId((prev) => ({ ...prev, [itemId]: 'unavailable' }));
        toast.error('No product available');
        return false;
      }

      setItems((prev) =>
        prev.map((row) => (row.id === itemId ? { ...row, price_quotes: nextQuotes } : row))
      );
      setPriceCompareStatusByItemId((prev) => ({ ...prev, [itemId]: 'found' }));

      const bySourceCount = SOURCE_ORDER.filter((s) =>
        nextQuotes.some((q) => q.source === s && typeof q.price === 'number' && q.price > 0)
      ).length;
      const cheapest = nextQuotes.reduce((best, q) =>
        typeof q.price === 'number' &&
        typeof best.price === 'number' &&
        q.currency === best.currency &&
        q.price < best.price
          ? q
          : best
      );
      if (typeof cheapest.price === 'number') {
        toast.success(
          `Loaded prices from ${bySourceCount} site${bySourceCount === 1 ? '' : 's'}. Lowest: ${formatCurrencyDisplay(cheapest.price)} ${cheapest.currency} (${cheapest.source_label})`
        );
      } else {
        toast.success(`Loaded ${nextQuotes.length} live price${nextQuotes.length === 1 ? '' : 's'}.`);
      }
      return true;
    },
    [ecommerceSources]
  );

  /** Fetch live prices from configured vendor sites via backend. */
  const fetchLivePrices = useCallback(
    async (itemId: string, options?: { skipSpecPrompt?: boolean; specificationsOverride?: string }) => {
      const item = items.find((i) => i.id === itemId);
      if (!item) return;
      const name = (item.item_name_freeform ?? '').trim();
      const specs = (options?.specificationsOverride ?? item.specifications ?? '').trim();
      const query = buildPriceSearchQuery(name, specs);
      const urls = [
        ...(item.product_link ? [item.product_link.trim()] : []),
        ...item.price_quotes.map((q) => q.link.trim()).filter(Boolean),
      ].filter((u, idx, arr) => u && arr.indexOf(u) === idx);

      if (!query && urls.length === 0) {
        toast.error('Enter an item name (or paste a product URL) to fetch live prices.');
        return;
      }

      const pin = normalizeIndianPincode(deliveryPincode);
      if (!pin) {
        toast.error('Enter a valid 6-digit delivery PIN code to get delivery dates.');
        return;
      }

      setLiveCompareLoadingByItemId((prev) => ({ ...prev, [itemId]: true }));
      setPriceCompareStatusByItemId((prev) => ({ ...prev, [itemId]: 'idle' }));
      try {
        const vendorIdsForProfile = ecommerceSources
          .filter((s) => {
            if (!s.id || s.id === 'other') return false;
            if (priceCompareProfile === 'extended') return true;
            return s.profile === 'core';
          })
          .map((v) => v.id);
        const res = await apiClient.post<LivePriceCompareResponse>(
          PRICE_COMPARE_URL,
          {
            query: query || undefined,
            profile: priceCompareProfile,
            // Explicit IDs so Extended always hits the full catalog (not stale server default).
            sources: priceCompareProfile === 'extended' ? vendorIdsForProfile : undefined,
            urls: urls.length ? urls.slice(0, 8) : undefined,
            pincode: pin,
          },
          { timeout: 90000 }
        );
        const data = res.data;
        if (data?.error) {
          toast.error(data.error);
          setPriceCompareStatusByItemId((prev) => ({ ...prev, [itemId]: 'unavailable' }));
          return;
        }

        const pricedResults = (data?.results ?? []).filter(
          (r) => r.price != null && Number(r.price) > 0
        );
        const titles = pricedResults
          .map((r) => String(r.title || '').trim())
          .filter(Boolean);

        if (
          !options?.skipSpecPrompt &&
          name &&
          titlesNeedSpecificationPrompt(titles, name, specs)
        ) {
          const facets = extractSpecFacetsFromTitles(titles, name);
          setSpecPromptItemId(itemId);
          setSpecFacets(facets);
          setSpecSelections({});
          setSelectedSampleMatch(null);
          setSpecExtraText(specs);
          setSpecSampleTitles(titles.slice(0, 10));
          setPendingSpecCompare({ itemId, name, data: data ?? {} });
          toast.info('Multiple product variants found. Please choose specifications.');
          return;
        }

        // If nothing came back at all, or nothing matches closely enough.
        const anyExact = pricedResults.some((r) =>
          isExactEnoughProductMatch(String(r.title || ''), name, specs)
        );
        if (pricedResults.length === 0) {
          setItems((prev) =>
            prev.map((row) => (row.id === itemId ? { ...row, price_quotes: [] } : row))
          );
          setPriceCompareStatusByItemId((prev) => ({ ...prev, [itemId]: 'unavailable' }));
          toast.error('No product available');
          return;
        }
        if (!anyExact) {
          // Specs (e.g. "7 mm") can over-filter; keep name matches so stocked items still show.
          const nameOnly = pricedResults.filter((r) =>
            isExactEnoughProductMatch(String(r.title || ''), name, '')
          );
          if (nameOnly.length === 0) {
            setItems((prev) =>
              prev.map((row) => (row.id === itemId ? { ...row, price_quotes: [] } : row))
            );
            setPriceCompareStatusByItemId((prev) => ({ ...prev, [itemId]: 'unavailable' }));
            toast.error('No product available');
            return;
          }
          applyLivePriceResults(
            itemId,
            { ...(data ?? {}), results: nameOnly },
            name,
            ''
          );
          if (specs) {
            toast.info('Showing closest name matches — selected size was not found in every listing title.');
          }
          return;
        }

        applyLivePriceResults(itemId, data ?? {}, name, specs);
      } catch (err: unknown) {
        const msg =
          err && typeof err === 'object' && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Failed to fetch live prices.';
        toast.error(msg);
        setPriceCompareStatusByItemId((prev) => ({ ...prev, [itemId]: 'unavailable' }));
      } finally {
        setLiveCompareLoadingByItemId((prev) => ({ ...prev, [itemId]: false }));
      }
    },
    [items, applyLivePriceResults, deliveryPincode, priceCompareProfile, ecommerceSources]
  );

  const buildSpecBoxText = useCallback((sample: string | null, facets: Record<string, string>) => {
    const facetParts = Object.values(facets)
      .map((v) => String(v || '').trim())
      .filter(Boolean);
    return [sample ? String(sample).trim() : '', ...facetParts].filter(Boolean).join(' · ');
  }, []);

  const cancelSpecPrompt = () => {
    setSpecPromptItemId(null);
    setSpecFacets([]);
    setSpecSelections({});
    setSpecExtraText('');
    setSpecSampleTitles([]);
    setSelectedSampleMatch(null);
    setPendingSpecCompare(null);
  };

  /** Length/size chips update independently; product pick stays single via selectedSampleMatch. */
  const selectSpecFacetOption = useCallback(
    (facetKey: string, opt: string, wasSelected: boolean) => {
      setSpecSelections((prev) => {
        const next = {
          ...prev,
          [facetKey]: wasSelected ? '' : opt,
        };
        setSelectedSampleMatch((sample) => {
          setSpecExtraText(buildSpecBoxText(sample, next));
          return sample;
        });
        return next;
      });
    },
    [buildSpecBoxText]
  );

  /** Only one matching product at a time. */
  const selectSampleMatch = useCallback(
    (title: string) => {
      const value = String(title || '').trim();
      if (!value) return;
      setSelectedSampleMatch((prev) => {
        const next = prev === value ? null : value;
        setSpecSelections((facets) => {
          setSpecExtraText(buildSpecBoxText(next, facets));
          return facets;
        });
        return next;
      });
    },
    [buildSpecBoxText]
  );

  const confirmSpecPrompt = async () => {
    const itemId = specPromptItemId;
    if (!itemId) return;
    const fromFacets = Object.values(specSelections)
      .map((v) => v.trim())
      .filter(Boolean);
    const sample = (selectedSampleMatch || '').trim();
    const combined =
      buildSpecBoxText(sample || null, specSelections) ||
      specExtraText.trim() ||
      fromFacets.join(' · ');
    if (!combined) {
      toast.error('Select a sample match or length/size, or enter specifications.');
      return;
    }
    setItems((prev) =>
      prev.map((row) => (row.id === itemId ? { ...row, specifications: combined } : row))
    );
    const pending =
      pendingSpecCompare && pendingSpecCompare.itemId === itemId ? pendingSpecCompare : null;
    const pendingName = pending?.name ?? '';
    const pendingData = pending?.data ?? null;
    cancelSpecPrompt();

    // Prefer filtering the first search results (items already found) by the chosen length/size.
    if (pendingData) {
      const priced = (pendingData.results ?? []).filter(
        (r) => r.price != null && Number(r.price) > 0
      );
      const exact = priced.filter((r) =>
        isExactEnoughProductMatch(String(r.title || ''), pendingName, combined)
      );
      if (exact.length > 0) {
        applyLivePriceResults(
          itemId,
          { ...pendingData, results: exact },
          pendingName,
          combined
        );
        return;
      }
      const nameOnly = priced.filter((r) =>
        isExactEnoughProductMatch(String(r.title || ''), pendingName, '')
      );
      if (nameOnly.length > 0) {
        applyLivePriceResults(
          itemId,
          { ...pendingData, results: nameOnly },
          pendingName,
          ''
        );
        toast.info('Showing closest name matches — selected size was not found in every listing title.');
        return;
      }
    }

    await fetchLivePrices(itemId, { skipSpecPrompt: true, specificationsOverride: combined });
  };

  const startAddVendor = (itemId: string) => {
    setAddVendorForItemId(itemId);
    setNewVendorName('');
    setNewVendorLink('');
  };

  const cancelAddVendor = () => {
    setAddVendorForItemId(null);
    setNewVendorName('');
    setNewVendorLink('');
  };

  const saveNewVendor = async () => {
    const name = toVendorStorageName((newVendorName ?? '').trim());
    if (!name) {
      toast.error('Enter vendor name.');
      return;
    }
    const normalizedName = normalizeVendorName(name);
    if (!normalizedName) {
      toast.error('Enter vendor name.');
      return;
    }
    const itemId = addVendorForItemId;
    if (!itemId) return;
    try {
      setSavingNewVendor(true);

      // Fast local check against already loaded vendors (case-insensitive, whitespace-normalized).
      const existingLocal = vendors.find((v) => normalizeVendorName(v.name) === normalizedName);
      if (existingLocal) {
        updateItem(itemId, 'vendor', existingLocal.name);
        toast.info(`Vendor "${existingLocal.name}" already exists. Selected existing vendor.`);
        cancelAddVendor();
        return;
      }

      // Server-side duplicate check to prevent race conditions / stale local vendor list.
      const searchRes = await apiClient.get<any>(
        `${RECORDS_URL}?entity_type=unmannd_vendor&page_size=30&search=${encodeURIComponent(name)}`
      );
      const raw = searchRes.data?.data ?? (searchRes.data as any)?.results ?? [];
      const list = Array.isArray(raw) ? raw : [];
      const existingServer = list.find((r: any) => {
        const vendorName = String(r?.data?.vendor_name ?? r?.vendor_name ?? '').trim();
        return normalizeVendorName(vendorName) === normalizedName;
      });
      if (existingServer) {
        const resolvedName = toVendorStorageName(String(existingServer?.data?.vendor_name ?? existingServer?.vendor_name ?? name).trim());
        updateItem(itemId, 'vendor', resolvedName || name);
        toast.info(`Vendor "${resolvedName || name}" already exists. Selected existing vendor.`);
        cancelAddVendor();
        await fetchVendors();
        return;
      }

      await apiClient.post(RECORDS_URL, {
        entity_type: 'unmannd_vendor',
        data: { vendor_name: name, ...(newVendorLink.trim() ? { vendor_site_link: newVendorLink.trim() } : {}) },
      });
      await fetchVendors();
      updateItem(itemId, 'vendor', name);
      setAddVendorForItemId(null);
      setNewVendorName('');
      setNewVendorLink('');
      toast.success('Vendor added.');
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : 'Failed to add vendor.';
      toast.error(msg);
    } finally {
      setSavingNewVendor(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('You must be logged in to create a request.');
      return;
    }

    if (!requestCategory) {
      toast.error('Please select a category (Domestic or International).');
      return;
    }

    if (!projectPurpose.trim()) {
      toast.error('Please fill in the Project.');
      return;
    }

    const hasAtLeastOneNamedItem = items.some((i) => (i.item_name_freeform ?? '').trim() !== '');
    if (!hasAtLeastOneNamedItem) {
      toast.error('Add at least one item.');
      return;
    }

    const isMissingRequired = (item: FormItem, field: keyof FormItem): boolean => {
      if (field === 'quantity_required') {
        return item.quantity_required === '' || Number(item.quantity_required) <= 0;
      }
      if (field === 'estimated_cost') {
        return item.estimated_cost === '' || Number(item.estimated_cost) <= 0;
      }
      const value = item[field];
      return value == null || String(value).trim() === '';
    };

    const firstInvalid = items.find((item) => {
      // Ignore completely empty rows created via "Add item" button.
      const hasAnyInput =
        (item.item_name_freeform ?? '').trim() !== '' ||
        item.quantity_required !== '' ||
        (item.urgency_level ?? '').trim() !== '' ||
        (item.vendor ?? '').trim() !== '' ||
        (item.estimated_cost ?? '') !== '' ||
        (item.product_link ?? '').trim() !== '' ||
        (item.comments ?? '').trim() !== '';
      if (!hasAnyInput) return false;
      return REQUIRED_ITEM_FIELDS.some((f) => isMissingRequired(item, f.key));
    });

    if (firstInvalid) {
      const missing = REQUIRED_ITEM_FIELDS
        .filter((f) => isMissingRequired(firstInvalid, f.key))
        .map((f) => f.label);
      toast.error(`Please fill mandatory fields: ${missing.join(', ')}`);
      return;
    }

    const validItems = items.filter((item) => {
      const hasAnyInput =
        (item.item_name_freeform ?? '').trim() !== '' ||
        item.quantity_required !== '' ||
        (item.urgency_level ?? '').trim() !== '' ||
        (item.vendor ?? '').trim() !== '' ||
        (item.estimated_cost ?? '') !== '' ||
        (item.product_link ?? '').trim() !== '' ||
        (item.comments ?? '').trim() !== '';
      return hasAnyInput;
    });

    const requesterId = user.id;

    try {
      setSubmitting(true);

      for (const item of validItems) {
        await upsertUnmanndProduct(item);

        const urgency = String(item.urgency_level ?? '').trim().toUpperCase();
        const priorityLabel =
          PRIORITY_OPTIONS.find((o) => o.value === urgency)?.label ||
          formatInventoryPriorityLabel(urgency);

        const payloadData: Record<string, unknown> = {
          status: initialStatus,
          status_text: initialStatusText,
          // Shipment tracking fields: initialized empty; filled later by ops/procurement flows.
          ...emptyShipmentTrackingFields(),
          request_date: requestDate,
          required_date: null,
          requester_id: requesterId,
          requester_name: requesterDisplay ?? '',
          department: department || '',
          project_purpose: projectPurpose.trim() || '',
          category: requestCategory,
          delivery_pincode: normalizeIndianPincode(deliveryPincode) || '',
          delivery_address: deliveryAddress.trim() || '',
          urgency_level: urgency || '',
          priority_label: urgency ? priorityLabel : '',
          vendor: toVendorStorageName((item.vendor ?? '').trim()) || '',
          item_name_freeform: (item.item_name_freeform ?? '').trim(),
          specifications: (item.specifications ?? '').trim() || '',
          quantity_required: typeof item.quantity_required === 'number' ? item.quantity_required : Number(item.quantity_required) || 0,
          product_link: (item.product_link ?? '').trim() || '',
          product_image: (item.product_image ?? '').trim() || '',
          price_currency: item.price_currency === 'USD' ? 'USD' : 'INR',
        };
        const commentText = (item.comments ?? '').trim();
        payloadData.comments =
          commentText.length > 0
            ? [{ name: requesterDisplay ?? '', role: myRoleName ?? '', comment: commentText }]
            : [];
        const estCost = item.estimated_cost;
        if (estCost !== '' && estCost !== undefined) {
          payloadData.estimated_cost = typeof estCost === 'number' ? estCost : Number(estCost) || 0;
        }
        const filledQuotes = (item.price_quotes ?? [])
          .filter((q) => q.price !== '' && Number(q.price) > 0)
          .map((q) => ({
            source: q.source,
            source_label: q.source_label,
            link: (q.link ?? '').trim(),
            price: Number(q.price),
            currency: q.currency === 'USD' ? 'USD' : 'INR',
            title: (q.title ?? '').trim() || undefined,
            delivery_date: (q.delivery_date ?? '').trim() || undefined,
            live: q.live === true,
          }));
        if (filledQuotes.length > 0) {
          payloadData.price_comparisons = filledQuotes;
          const cheapest = filledQuotes.reduce((best, q) =>
            q.currency === best.currency && q.price < best.price ? q : best
          );
          payloadData.cheapest_comparison_price = cheapest.price;
          payloadData.cheapest_comparison_source = cheapest.source_label;
        }
        if (teamLeadMembershipId) {
          payloadData.team_lead = teamLeadMembershipId;
        }
        if (managerMembershipId) {
          payloadData.manager = managerMembershipId;
        }
        await apiClient.post(RECORDS_URL, {
          entity_type: entityType,
          data: payloadData,
        });
      }

      const count = validItems.length;
      if (isProcurement) {
        toast.success(
          count === 1 ? 'Procurement request created.' : `${count} procurement requests created.`
        );
      } else {
        toast.success(
          count === 1 ? 'Inventory request created.' : `${count} inventory requests created.`
        );
      }
      rememberProjectSuggestion(projectPurpose);
      setItems([newEmptyItem()]);
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : isProcurement
            ? 'Failed to create procurement request.'
            : 'Failed to create inventory request.';
      console.error('Failed to create request', err);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClear = () => {
    setItems([newEmptyItem()]);
    setAddVendorForItemId(null);
    setNewVendorName('');
    setNewVendorLink('');
    setPriceDraftByItemId({});
    setProjectPurpose('');
    setRequestCategory('');
    setDeliveryPincode(DEFAULT_DELIVERY_PINCODE);
    setDeliveryAddress('');
    setPriceCompareStatusByItemId({});
    setLinkFetchLoadingByItemId({});
    setLastFetchedLinkByItemId({});
    cancelSpecPrompt();
    toast.success('Form cleared.');
  };

  const hasAnyItemContent = items.some(
    (i) =>
      (i.item_name_freeform ?? '').trim() !== '' ||
      (i.specifications ?? '').trim() !== '' ||
      i.quantity_required !== '' ||
      (i.urgency_level ?? '').trim() !== '' ||
      (i.vendor ?? '').trim() !== '' ||
      (i.estimated_cost ?? '') !== '' ||
      (i.comments ?? '').trim() !== '' ||
      (i.product_link ?? '').trim() !== '' ||
      (i.price_quotes ?? []).some(
        (q) => (q.link ?? '').trim() !== '' || (q.price !== '' && Number(q.price) > 0)
      )
  );
  const isFormEmpty = !hasAnyItemContent;

  const addVendorDialog = (
    <Dialog open={addVendorForItemId !== null} onOpenChange={(open) => { if (!open) cancelAddVendor(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add vendor</DialogTitle>
          <DialogDescription>Create a vendor and auto-fill it for this item.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            placeholder="Vendor name *"
            value={newVendorName}
            onChange={(e) => setNewVendorName(e.target.value)}
            className="h-10"
          />
          <Input
            placeholder="Vendor site link (optional)"
            type="url"
            value={newVendorLink}
            onChange={(e) => setNewVendorLink(e.target.value)}
            className="h-10"
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={cancelAddVendor}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={saveNewVendor}
            disabled={savingNewVendor || !newVendorName.trim()}
          >
            {savingNewVendor ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save vendor
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const sectionLabel = (title: string) => (
    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
  );

  const renderProjectField = (opts: {
    id: string;
    labelClassName: string;
  }) => (
    <div className="space-y-1.5">
      <Label htmlFor={opts.id} className={opts.labelClassName}>
        Project <span className="text-destructive">*</span>
      </Label>
      <div className="relative">
        <Textarea
          id={opts.id}
          placeholder={
            projectSuggestions.length > 0
              ? 'Select a previous project or type a new one'
              : 'Project name or description'
          }
          value={projectPurpose}
          onFocus={() => {
            if (projectSuggestions.length > 0 || projectSuggestionsLoading) {
              setProjectSuggestionsOpen(true);
            }
          }}
          onBlur={() => {
            window.setTimeout(() => setProjectSuggestionsOpen(false), 150);
          }}
          onChange={(e) => {
            setProjectPurpose(e.target.value);
            setProjectSuggestionsOpen(true);
          }}
          rows={2}
          className="resize-y min-h-[64px]"
          autoComplete="off"
        />
        {projectSuggestionsOpen &&
          (projectSuggestionsLoading || filteredProjectSuggestions.length > 0) && (
            <div className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border border-border bg-background shadow-md">
              {projectSuggestionsLoading && projectSuggestions.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">Loading projects…</div>
              ) : (
                filteredProjectSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="block w-full truncate px-3 py-2 text-left text-sm hover:bg-muted"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setProjectPurpose(suggestion);
                      setProjectSuggestionsOpen(false);
                    }}
                  >
                    {suggestion}
                  </button>
                ))
              )}
            </div>
          )}
      </div>
    </div>
  );

  if (isProcurement) {
    return (
      <Card className="overflow-hidden border border-border shadow-sm">
        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="border-b border-border/60 bg-muted/25 px-6 py-5">
            <h2 className="text-lg font-semibold tracking-tight">New Request</h2>
          </div>

          <CardContent className="space-y-8 px-6 py-6">
            <div className="grid grid-cols-1 gap-4 rounded-lg border border-border/60 bg-muted/30 p-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Requester name</Label>
                <Input value={requesterDisplay} readOnly disabled className="h-10 bg-background/80 font-medium" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Date</Label>
                <Input
                  value={formatRequestDateDisplay(requestDate)}
                  readOnly
                  disabled
                  className="h-10 bg-background/80 font-medium"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Department</Label>
              <Input
                value={department}
                readOnly
                disabled
                placeholder="—"
                className="h-10 bg-background/80 font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="request-category" className="text-sm font-medium">
                Category <span className="text-destructive">*</span>
              </Label>
              <Select
                value={requestCategory || undefined}
                onValueChange={(v) =>
                  setRequestCategory(v === 'International' ? 'International' : 'Domestic')
                }
              >
                <SelectTrigger id="request-category" className="h-10">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {REQUEST_CATEGORY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {renderProjectField({
              id: 'project-purpose',
              labelClassName: 'text-sm font-medium',
            })}

            <div className="space-y-5">
              {items.map((item, itemIndex) => (
                <div
                  key={item.id}
                  className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3 border-b border-border/60 bg-muted/20 px-4 py-3">
                    <Badge variant="outline" className="font-medium">
                      Item {itemIndex + 1}
                    </Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(item.id)}
                      disabled={items.length <= 1}
                      className="h-8 gap-1.5 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </Button>
                  </div>

                  <div className="space-y-6 p-5">
                    <div>
                      {sectionLabel('Item details')}
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium">Item name</Label>
                          <div className="relative">
                            <Input
                              placeholder="Describe the item"
                              value={item.item_name_freeform}
                              className="h-10"
                              onFocus={() => {
                                setFocusedItemNameId(item.id);
                                setItemNameQuery(item.item_name_freeform || '');
                                if ((item.item_name_freeform || '').trim().length >= 2) {
                                  setItemNameSuggestionsOpen(itemNameSuggestions.length > 0);
                                }
                              }}
                              onBlur={() => {
                                window.setTimeout(() => {
                                  setFocusedItemNameId((prev) => (prev === item.id ? null : prev));
                                  setItemNameSuggestionsOpen(false);
                                }, 150);
                              }}
                              onChange={(e) => {
                                const v = e.target.value;
                                updateItem(item.id, 'item_name_freeform', v);
                                setFocusedItemNameId(item.id);
                                setItemNameQuery(v);
                                if (v.trim().length >= 2) setItemNameSuggestionsOpen(true);
                              }}
                            />
                            {focusedItemNameId === item.id &&
                              (itemNameSuggestionsOpen || itemNameSuggestionsLoading) && (
                                <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-border bg-background shadow-md">
                                  {itemNameSuggestionsLoading ? (
                                    <div className="px-3 py-2 text-sm text-muted-foreground">Searching…</div>
                                  ) : itemNameSuggestions.length === 0 ? (
                                    <div className="px-3 py-2 text-sm text-muted-foreground">No matches</div>
                                  ) : (
                                    <div className="max-h-56 overflow-auto">
                                      {itemNameSuggestions.map((s) => (
                                        <button
                                          key={s.id}
                                          type="button"
                                          className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                                          onMouseDown={(ev) => ev.preventDefault()}
                                          onClick={() => {
                                            updateItem(item.id, 'item_name_freeform', s.name);
                                            const d = s.data || {};
                                            const vendor = toVendorStorageName(
                                              String((d.default_vendor ?? d.vendor ?? '') as any).trim()
                                            );
                                            if (vendor) updateItem(item.id, 'vendor', vendor);
                                            const costRaw =
                                              d.default_cost_per_unit ?? d.estimated_cost ?? d.cost_per_unit;
                                            const costNum =
                                              costRaw === '' || costRaw == null ? '' : Number(costRaw);
                                            if (costNum !== '' && Number.isFinite(costNum))
                                              updateItem(item.id, 'estimated_cost', costNum);
                                            const suggestedCurrency = String(
                                              (d.price_currency ?? d.currency ?? 'INR') as any
                                            )
                                              .trim()
                                              .toUpperCase();
                                            if (suggestedCurrency === 'USD' || suggestedCurrency === 'INR') {
                                              updateItem(
                                                item.id,
                                                'price_currency',
                                                suggestedCurrency as 'INR' | 'USD'
                                              );
                                            }
                                            const productLink = String(
                                              (d.product_link ?? d.link ?? '') as any
                                            ).trim();
                                            if (productLink) updateItem(item.id, 'product_link', productLink);
                                            setItemNameSuggestionsOpen(false);
                                            setFocusedItemNameId(null);
                                          }}
                                        >
                                          <span className="truncate">{s.name}</span>
                                          <span className="shrink-0 text-xs text-muted-foreground">#{s.id}</span>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium">Specifications</Label>
                          <Input
                            placeholder="e.g. 30 cm, USB A to Mini B, gold-plated"
                            value={item.specifications}
                            onChange={(e) => updateItem(item.id, 'specifications', e.target.value)}
                            className="h-10"
                          />
                          <p className="text-xs text-muted-foreground">
                            Filled automatically from the item link when available.
                          </p>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium">Item link</Label>
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <Input
                              type="url"
                              placeholder="https://… (Amazon, Robu, vendor page, etc.)"
                              value={item.product_link}
                              onChange={(e) => updateItem(item.id, 'product_link', e.target.value)}
                              onBlur={(e) => {
                                const url = e.target.value.trim();
                                if (looksLikeProductUrl(url)) {
                                  void fetchDetailsFromItemLink(item.id, url);
                                }
                              }}
                              className="h-10 flex-1"
                              disabled={!!linkFetchLoadingByItemId[item.id]}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-10 shrink-0 gap-1.5"
                              disabled={
                                !!linkFetchLoadingByItemId[item.id] ||
                                !looksLikeProductUrl(item.product_link)
                              }
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() =>
                                void fetchDetailsFromItemLink(item.id, item.product_link, { force: true })
                              }
                            >
                              {linkFetchLoadingByItemId[item.id] ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <RefreshCw className="h-4 w-4" />
                              )}
                              Fetch details
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Paste a product URL to auto-fill item name, specifications, vendor, and cost.
                          </p>
                        </div>
                        <div className="space-y-1.5 sm:w-32">
                          <Label className="text-sm font-medium">Quantity *</Label>
                          <Input
                            type="number"
                            min={1}
                            step={1}
                            value={item.quantity_required === '' ? '' : item.quantity_required}
                            onChange={(e) => {
                              const v = e.target.value;
                              updateItem(item.id, 'quantity_required', v === '' ? '' : Number(v));
                            }}
                            placeholder="0"
                            className="h-10"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      {sectionLabel('Cost & vendor')}
                      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <div className="space-y-3">
                          <Label className="text-sm font-medium">Estimated cost *</Label>
                          <div className="flex flex-wrap items-center gap-2">
                            <Input
                              type="text"
                              inputMode="decimal"
                              placeholder="0.00"
                              value={
                                priceDraftByItemId[item.id] ?? formatCurrencyDisplay(item.estimated_cost)
                              }
                              onChange={(e) => {
                                const { display, value } = formatCurrencyInputLive(e.target.value);
                                setPriceDraftByItemId((prev) => ({ ...prev, [item.id]: display }));
                                updateItem(item.id, 'estimated_cost', value);
                              }}
                              onBlur={() => {
                                setPriceDraftByItemId((prev) => {
                                  const next = { ...prev };
                                  delete next[item.id];
                                  return next;
                                });
                                if (
                                  item.estimated_cost !== '' &&
                                  typeof item.estimated_cost === 'number'
                                ) {
                                  updateItem(
                                    item.id,
                                    'estimated_cost',
                                    Math.round(item.estimated_cost * 100) / 100
                                  );
                                }
                              }}
                              className="h-10 min-w-[8rem] font-mono tabular-nums"
                            />
                            <Select
                              value={item.price_currency || 'INR'}
                              onValueChange={(v) =>
                                updateItem(item.id, 'price_currency', v === 'USD' ? 'USD' : 'INR')
                              }
                            >
                              <SelectTrigger className="h-10 w-24">
                                <SelectValue placeholder="INR" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="INR">INR</SelectItem>
                                <SelectItem value="USD">USD</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium">Vendor *</Label>
                          <div className="flex items-start gap-2">
                            <div className="relative min-w-0 flex-1">
                              <Input
                                value={item.vendor}
                                placeholder="Search or add vendor"
                                className="h-10 w-full"
                                onFocus={() => {
                                  setFocusedVendorId(item.id);
                                  setVendorQuery(item.vendor || '');
                                  setVendorSuggestionsOpen(true);
                                }}
                                onBlur={() => {
                                  window.setTimeout(() => {
                                    setFocusedVendorId((prev) => (prev === item.id ? null : prev));
                                    setVendorSuggestionsOpen(false);
                                  }, 150);
                                }}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  updateItem(item.id, 'vendor', toVendorStorageName(v));
                                  setFocusedVendorId(item.id);
                                  setVendorQuery(v);
                                  setVendorSuggestionsOpen(true);
                                }}
                              />
                              {focusedVendorId === item.id && vendorSuggestionsOpen && (
                                <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-border bg-background shadow-md">
                                  {vendorsLoading ? (
                                    <div className="px-3 py-2 text-sm text-muted-foreground">Loading…</div>
                                  ) : (
                                    <div className="max-h-56 overflow-auto">
                                      {(() => {
                                        const q = vendorQuery.trim().toLowerCase();
                                        const filtered = q
                                          ? vendors.filter((v) => v.name.toLowerCase().includes(q)).slice(0, 12)
                                          : vendors.slice(0, 12);
                                        if (filtered.length === 0) {
                                          return (
                                            <div className="px-3 py-2 text-sm text-muted-foreground">
                                              No matches
                                            </div>
                                          );
                                        }
                                        return filtered.map((v) => (
                                          <button
                                            key={v.id}
                                            type="button"
                                            className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                                            onMouseDown={(ev) => ev.preventDefault()}
                                            onClick={() => {
                                              updateItem(item.id, 'vendor', v.name);
                                              setVendorSuggestionsOpen(false);
                                              setFocusedVendorId(null);
                                            }}
                                          >
                                            <span className="truncate">{v.name}</span>
                                            <span className="shrink-0 text-xs text-muted-foreground">#{v.id}</span>
                                          </button>
                                        ));
                                      })()}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-10 shrink-0"
                              onClick={() => {
                                startAddVendor(item.id);
                                setVendorSuggestionsOpen(false);
                                setFocusedVendorId(null);
                              }}
                            >
                              + Add vendor
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      {sectionLabel('Priority')}
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium">Priority *</Label>
                          <Select
                            value={item.urgency_level || undefined}
                            onValueChange={(v) => updateItem(item.id, 'urgency_level', v)}
                          >
                            <SelectTrigger className="h-10">
                              <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                            <SelectContent>
                              {PRIORITY_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <div>
                      {sectionLabel('Comments')}
                      <Textarea
                        placeholder="Notes for procurement (optional)"
                        value={item.comments}
                        onChange={(e) => updateItem(item.id, 'comments', e.target.value)}
                        rows={3}
                        className="min-h-[72px] resize-y text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <Button type="button" variant="outline" onClick={addItem} className="gap-2">
                <Plus className="h-4 w-4" />
                Add item
              </Button>
            </div>
          </CardContent>

          <CardFooter className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 bg-background/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <div>
              {!user && (
                <span className="text-sm text-muted-foreground">You must be signed in to submit.</span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleClear}
                disabled={submitting || isFormEmpty}
                className="min-w-[100px]"
              >
                Clear
              </Button>
              <Button type="submit" disabled={submitting || !user} className="min-w-[160px] gap-2">
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating…
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Create request
                    {items.filter((i) => (i.item_name_freeform ?? '').trim() && i.quantity_required !== '').length > 1
                      ? 's'
                      : ''}
                  </>
                )}
              </Button>
            </div>
          </CardFooter>
        </form>
        {addVendorDialog}
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border border-border/60 shadow-md">
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6 pt-6">
          <section className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider">
                  <User className="h-3.5 w-3.5" />
                  Requester name <span className="text-destructive">*</span>
                </Label>
                <Input value={requesterDisplay} readOnly disabled className="h-10 bg-muted/50 font-medium" />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider">
                  <Calendar className="h-3.5 w-3.5" />
                  Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={formatRequestDateDisplay(requestDate)}
                  readOnly
                  disabled
                  className="h-10 bg-muted/50 font-medium"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="department" className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider">
                Department
              </Label>
              <Input
                id="department"
                value={department}
                readOnly
                disabled
                placeholder="—"
                className="h-10 bg-muted/50 font-medium"
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="request-category-default"
                className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider"
              >
                Category <span className="text-destructive">*</span>
              </Label>
              <Select
                value={requestCategory || undefined}
                onValueChange={(v) =>
                  setRequestCategory(v === 'International' ? 'International' : 'Domestic')
                }
              >
                <SelectTrigger id="request-category-default" className="h-10">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {REQUEST_CATEGORY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {renderProjectField({
              id: 'project-purpose-default',
              labelClassName:
                'text-muted-foreground flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider',
            })}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label
                  htmlFor="delivery-pincode"
                  className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider"
                >
                  <MapPin className="h-3.5 w-3.5" />
                  Delivery PIN code <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="delivery-pincode"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="e.g. 560001"
                  value={deliveryPincode}
                  onChange={(e) => setDeliveryPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="h-10 font-medium"
                />
                <p className="text-[11px] text-muted-foreground">
                  Required for live delivery dates (Amazon and similar).
                </p>
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="delivery-address"
                  className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider"
                >
                  Delivery address
                </Label>
                <Input
                  id="delivery-address"
                  placeholder="Building, street, city"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="h-10 font-medium"
                />
                <p className="text-[11px] text-muted-foreground">
                  Where this order should be delivered.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-4 border-t pt-6">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Items</Label>
            </div>

            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-3"
              >
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(item.id)}
                    disabled={items.length <= 1}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    aria-label="Remove item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-medium">Item name</Label>
                    <div className="relative">
                      <Input
                        placeholder="Describe the item"
                        value={item.item_name_freeform}
                        onFocus={() => {
                          setFocusedItemNameId(item.id);
                          setItemNameQuery(item.item_name_freeform || '');
                          if ((item.item_name_freeform || '').trim().length >= 2) {
                            setItemNameSuggestionsOpen(itemNameSuggestions.length > 0);
                          }
                        }}
                        onBlur={() => {
                          window.setTimeout(() => {
                            setFocusedItemNameId((prev) => (prev === item.id ? null : prev));
                            setItemNameSuggestionsOpen(false);
                          }, 150);
                        }}
                        onChange={(e) => {
                          const v = e.target.value;
                          updateItem(item.id, 'item_name_freeform', v);
                          setFocusedItemNameId(item.id);
                          setItemNameQuery(v);
                          if (v.trim().length >= 2) setItemNameSuggestionsOpen(true);
                        }}
                        className="h-9"
                      />

                      {focusedItemNameId === item.id && (itemNameSuggestionsOpen || itemNameSuggestionsLoading) && (
                        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-background shadow-md overflow-hidden">
                          {itemNameSuggestionsLoading ? (
                            <div className="px-3 py-2 text-sm text-muted-foreground">Searching…</div>
                          ) : itemNameSuggestions.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-muted-foreground">No matches</div>
                          ) : (
                            <div className="max-h-56 overflow-auto">
                              {itemNameSuggestions.map((s) => (
                                <button
                                  key={s.id}
                                  type="button"
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center justify-between gap-2"
                                  onMouseDown={(ev) => ev.preventDefault()}
                                  onClick={() => {
                                    updateItem(item.id, 'item_name_freeform', s.name);
                                    const d = s.data || {};

                                    const vendor = toVendorStorageName(String((d.default_vendor ?? d.vendor ?? '') as any).trim());
                                    if (vendor) updateItem(item.id, 'vendor', vendor);

                                    const costRaw = d.default_cost_per_unit ?? d.estimated_cost ?? d.cost_per_unit;
                                    const costNum = costRaw === '' || costRaw == null ? '' : Number(costRaw);
                                    if (costNum !== '' && Number.isFinite(costNum)) updateItem(item.id, 'estimated_cost', costNum);
                                    const suggestedCurrency = String((d.price_currency ?? d.currency ?? 'INR') as any).trim().toUpperCase();
                                    if (suggestedCurrency === 'USD' || suggestedCurrency === 'INR') {
                                      updateItem(item.id, 'price_currency', suggestedCurrency as 'INR' | 'USD');
                                    }

                                    const productLink = String((d.product_link ?? d.link ?? '') as any).trim();
                                    if (productLink) updateItem(item.id, 'product_link', productLink);

                                    const catalogSpecs = String(
                                      (d.specifications ?? d.specs ?? d.specification ?? d.short_description ?? '') as any
                                    ).trim();
                                    if (catalogSpecs) {
                                      updateItem(item.id, 'specifications', catalogSpecs.slice(0, 180));
                                    }

                                    setItemNameSuggestionsOpen(false);
                                    setFocusedItemNameId(null);
                                  }}
                                >
                                  <span className="truncate">{s.name}</span>
                                  <span className="text-xs text-muted-foreground shrink-0">#{s.id}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-medium">Specifications</Label>
                    <Input
                      placeholder="e.g. 30 cm, USB A to Mini B, gold-plated, with cable"
                      value={item.specifications}
                      onChange={(e) => updateItem(item.id, 'specifications', e.target.value)}
                      className="h-9"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Filled automatically from the item link when available.
                    </p>
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-medium">Item link</Label>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <Input
                        type="url"
                        placeholder="https://… (Amazon, Robu, vendor page, etc.)"
                        value={item.product_link}
                        onChange={(e) => updateItem(item.id, 'product_link', e.target.value)}
                        onBlur={(e) => {
                          const url = e.target.value.trim();
                          if (looksLikeProductUrl(url)) {
                            void fetchDetailsFromItemLink(item.id, url);
                          }
                        }}
                        className="h-9 flex-1"
                        disabled={!!linkFetchLoadingByItemId[item.id]}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 shrink-0 gap-1.5"
                        disabled={
                          !!linkFetchLoadingByItemId[item.id] ||
                          !looksLikeProductUrl(item.product_link)
                        }
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() =>
                          void fetchDetailsFromItemLink(item.id, item.product_link, { force: true })
                        }
                      >
                        {linkFetchLoadingByItemId[item.id] ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3.5 w-3.5" />
                        )}
                        Fetch details
                      </Button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Paste a product URL to auto-fill item name, specifications, vendor, and cost.
                    </p>
                  </div>

                  {/* E-commerce price comparison (multi-vendor live search) */}
                  <div className="sm:col-span-2 rounded-md border border-dashed border-border/80 bg-background/60 p-3 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <Label className="text-xs font-medium flex items-center gap-1.5">
                          <Scale className="h-3.5 w-3.5" />
                          Price comparison
                        </Label>
                        <p className="text-[11px] text-muted-foreground">
                          Searching {activePriceCompareVendors.length} vendors
                          {priceCompareProfile === 'extended' ? ' (full catalog)' : ' (core set)'}.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <Select
                          value={priceCompareProfile}
                          onValueChange={(v) =>
                            setPriceCompareProfile(v === 'extended' ? 'extended' : 'core')
                          }
                        >
                          <SelectTrigger className="h-7 w-[10.5rem] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="core">Core ({ecommerceSources.filter((s) => s.id !== 'other' && s.profile === 'core').length})</SelectItem>
                            <SelectItem value="extended">
                              Extended ({ecommerceSources.filter((s) => s.id && s.id !== 'other').length})
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          size="sm"
                          className="h-7 gap-1 text-xs"
                          disabled={
                            !!liveCompareLoadingByItemId[item.id] ||
                            !normalizeIndianPincode(deliveryPincode)
                          }
                          onClick={() => fetchLivePrices(item.id)}
                          title={
                            normalizeIndianPincode(deliveryPincode)
                              ? undefined
                              : 'Enter a valid delivery PIN code first'
                          }
                        >
                          {liveCompareLoadingByItemId[item.id] ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3 w-3" />
                          )}
                          Fetch live prices
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {activePriceCompareVendors.map((v) => (
                        <Badge
                          key={v.id}
                          variant="secondary"
                          className="rounded-md px-2 py-0.5 text-[10px] font-normal"
                        >
                          {v.label}
                        </Badge>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-end">
                      <div className="space-y-1">
                        <Label
                          htmlFor={`delivery-pincode-${item.id}`}
                          className="text-[10px] text-muted-foreground uppercase tracking-wide flex items-center gap-1"
                        >
                          <MapPin className="h-3 w-3" />
                          Delivery PIN <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id={`delivery-pincode-${item.id}`}
                          inputMode="numeric"
                          maxLength={6}
                          placeholder="560001"
                          value={deliveryPincode}
                          onChange={(e) =>
                            setDeliveryPincode(e.target.value.replace(/\D/g, '').slice(0, 6))
                          }
                          className="h-8 font-mono text-xs"
                        />
                      </div>
                      <div className="space-y-1 min-w-0">
                        <Label
                          htmlFor={`delivery-address-${item.id}`}
                          className="text-[10px] text-muted-foreground uppercase tracking-wide"
                        >
                          Delivery address
                        </Label>
                        <Input
                          id={`delivery-address-${item.id}`}
                          placeholder="Building, street, city"
                          value={deliveryAddress}
                          onChange={(e) => setDeliveryAddress(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>

                    {item.price_quotes.length > 0 ? (() => {
                      const priced = item.price_quotes.filter(
                        (q) => q.price !== '' && Number.isFinite(Number(q.price)) && Number(q.price) > 0
                      );
                      const lowestId =
                        priced.length > 0
                          ? priced.reduce((best, q) =>
                              q.currency === best.currency && Number(q.price) < Number(best.price) ? q : best
                            ).id
                          : null;

                      return (
                        <div className="space-y-2">
                          {item.price_quotes.map((quote) => {
                            const isLowest = lowestId === quote.id;
                            const sourceLabel =
                              quote.source_label ||
                              ecommerceSources.find((s) => s.id === quote.source)?.label ||
                              quote.source;
                            const priceText =
                              quote.price !== '' && Number.isFinite(Number(quote.price))
                                ? `${formatCurrencyDisplay(quote.price)} ${quote.currency || 'INR'}`
                                : '—';
                            const deliveryText = (quote.delivery_date || '').trim() || '—';
                            return (
                              <div
                                key={quote.id}
                                className={`rounded-md border p-2 space-y-2 ${
                                  isLowest ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-border/50'
                                }`}
                              >
                                {quote.title ? (
                                  <p className="text-[11px] text-muted-foreground truncate" title={quote.title}>
                                    {quote.live ? 'Live · ' : ''}
                                    {quote.title}
                                  </p>
                                ) : null}
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[6.5rem_minmax(0,1fr)_7.5rem_7.5rem_auto] sm:items-center">
                                  <div className="space-y-0.5 min-w-0">
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                                      Source
                                    </p>
                                    <p className="text-xs font-medium truncate" title={sourceLabel}>
                                      {sourceLabel}
                                    </p>
                                  </div>
                                  <div className="space-y-0.5 min-w-0">
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                                      Product
                                    </p>
                                    <div className="flex items-center gap-1 min-w-0">
                                      <p
                                        className="text-xs text-muted-foreground truncate min-w-0 flex-1"
                                        title={quote.link || undefined}
                                      >
                                        {quote.link.trim() || '—'}
                                      </p>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="h-7 shrink-0 gap-1 text-xs px-2"
                                        disabled={!quote.link.trim()}
                                        onClick={() => {
                                          const url = quote.link.trim();
                                          if (!url) return;
                                          const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
                                          window.open(href, '_blank', 'noopener,noreferrer');
                                        }}
                                        title="Open product page"
                                        aria-label="Open product page"
                                      >
                                        <ExternalLink className="h-3.5 w-3.5" />
                                        Open
                                      </Button>
                                    </div>
                                  </div>
                                  <div className="space-y-0.5 min-w-0">
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                                      Delivery
                                    </p>
                                    <p className="text-xs font-medium truncate" title={deliveryText}>
                                      {deliveryText}
                                    </p>
                                  </div>
                                  <div className="space-y-0.5 min-w-0">
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                                      Price
                                      {isLowest && (
                                        <span className="rounded bg-emerald-600/15 px-1 py-0.5 text-[9px] font-semibold text-emerald-700 dark:text-emerald-400 normal-case tracking-normal">
                                          Lowest
                                        </span>
                                      )}
                                    </p>
                                    <p className="text-xs font-mono tabular-nums font-medium">{priceText}</p>
                                  </div>
                                  <div className="flex items-center gap-1 sm:justify-end">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant={isLowest ? 'default' : 'secondary'}
                                      className="h-8 text-xs"
                                      onClick={() => applyQuoteToItem(item.id, quote)}
                                    >
                                      Use
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                      onClick={() => removeQuote(item.id, quote.id)}
                                      aria-label="Remove quote"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })() : priceCompareStatusByItemId[item.id] === 'unavailable' ? (
                      <p className="text-sm text-muted-foreground py-1">
                        No product available
                      </p>
                    ) : (
                        <p className="text-[11px] text-muted-foreground">
                          Enter delivery PIN above, item name (and specs if needed), then click Fetch live prices.
                        </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-end gap-4 sm:col-span-2 w-full">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Quantity *</Label>
                      <Input
                        type="number"
                        min={1}
                        step={1}
                        value={item.quantity_required === '' ? '' : item.quantity_required}
                        onChange={(e) => {
                          const v = e.target.value;
                          updateItem(item.id, 'quantity_required', v === '' ? '' : Number(v));
                        }}
                        placeholder="0"
                        className="h-9 w-24"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Estimated cost *</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="0.00"
                          value={
                            priceDraftByItemId[item.id] ??
                            formatCurrencyDisplay(item.estimated_cost)
                          }
                          onChange={(e) => {
                            const { display, value } = formatCurrencyInputLive(e.target.value);
                            setPriceDraftByItemId((prev) => ({ ...prev, [item.id]: display }));
                            updateItem(item.id, 'estimated_cost', value);
                          }}
                          onBlur={() => {
                            setPriceDraftByItemId((prev) => {
                              const next = { ...prev };
                              delete next[item.id];
                              return next;
                            });
                            if (item.estimated_cost !== '' && typeof item.estimated_cost === 'number') {
                              updateItem(item.id, 'estimated_cost', Math.round(item.estimated_cost * 100) / 100);
                            }
                          }}
                          className="h-9 min-w-[7.5rem] font-mono tabular-nums"
                        />
                        <Select
                          value={item.price_currency || 'INR'}
                          onValueChange={(v) => updateItem(item.id, 'price_currency', (v === 'USD' ? 'USD' : 'INR'))}
                        >
                          <SelectTrigger className="h-9 w-20">
                            <SelectValue placeholder="INR" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="INR">INR</SelectItem>
                            <SelectItem value="USD">USD</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-1.5 flex-1 min-w-[180px]">
                      <Label className="text-xs font-medium">Vendor *</Label>
                      <div className="flex items-center gap-2">
                        <div className="relative w-full">
                            <Input
                              value={item.vendor}
                              placeholder="Search or add vendor"
                              className="h-9 w-full"
                              onFocus={() => {
                                setFocusedVendorId(item.id);
                                setVendorQuery(item.vendor || '');
                                setVendorSuggestionsOpen(true);
                              }}
                              onBlur={() => {
                                window.setTimeout(() => {
                                  setFocusedVendorId((prev) => (prev === item.id ? null : prev));
                                  setVendorSuggestionsOpen(false);
                                }, 150);
                              }}
                              onChange={(e) => {
                                const v = e.target.value;
                                updateItem(item.id, 'vendor', toVendorStorageName(v));
                                setFocusedVendorId(item.id);
                                setVendorQuery(v);
                                setVendorSuggestionsOpen(true);
                              }}
                            />

                            {focusedVendorId === item.id && vendorSuggestionsOpen && (
                              <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-background shadow-md overflow-hidden">
                                {vendorsLoading ? (
                                  <div className="px-3 py-2 text-sm text-muted-foreground">Loading…</div>
                                ) : (
                                  <div className="max-h-56 overflow-auto">
                                    {(() => {
                                      const q = vendorQuery.trim().toLowerCase();
                                      const filtered = q
                                        ? vendors.filter((v) => v.name.toLowerCase().includes(q)).slice(0, 12)
                                        : vendors.slice(0, 12);
                                      if (filtered.length === 0) {
                                        return (
                                          <div className="px-3 py-2 text-sm text-muted-foreground">
                                            No matches
                                          </div>
                                        );
                                      }
                                      return filtered.map((v) => (
                                        <button
                                          key={v.id}
                                          type="button"
                                          className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center justify-between gap-2"
                                          onMouseDown={(ev) => ev.preventDefault()}
                                          onClick={() => {
                                            updateItem(item.id, 'vendor', v.name);
                                            setVendorSuggestionsOpen(false);
                                            setFocusedVendorId(null);
                                          }}
                                        >
                                          <span className="truncate">{v.name}</span>
                                          <span className="text-xs text-muted-foreground shrink-0">#{v.id}</span>
                                        </button>
                                      ));
                                    })()}
                                  </div>
                                )}
                              </div>
                            )}
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-9 shrink-0"
                          onClick={() => {
                            startAddVendor(item.id);
                            setVendorSuggestionsOpen(false);
                            setFocusedVendorId(null);
                          }}
                        >
                          + Add vendor
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-medium">Priority *</Label>
                    <Select
                      value={item.urgency_level || undefined}
                      onValueChange={(v) => updateItem(item.id, 'urgency_level', v)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-medium">Comments (optional)</Label>
                    <Textarea
                      placeholder="Additional comments for this item"
                      value={item.comments}
                      onChange={(e) => updateItem(item.id, 'comments', e.target.value)}
                      rows={2}
                      className="resize-y min-h-[60px] h-auto text-sm"
                    />
                  </div>
                </div>
              </div>
            ))}
            <div className="pt-1">
              <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-1">
                <Plus className="h-4 w-4" />
                Add item
              </Button>
            </div>
          </section>
        </CardContent>

        <CardFooter className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/20 px-6 py-4">
          <div>
            {!user && (
              <span className="text-muted-foreground text-sm">You must be signed in to submit.</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={submitting || !user} className="min-w-[140px] gap-2 shadow-sm">
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Create Request{items.filter((i) => (i.item_name_freeform ?? '').trim() && i.quantity_required !== '').length > 1 ? 's' : ''}
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleClear}
              disabled={submitting || isFormEmpty}
              className="min-w-[100px]"
            >
              Clear form
            </Button>
          </div>
        </CardFooter>
      </form>

      <Dialog open={addVendorForItemId !== null} onOpenChange={(open) => { if (!open) cancelAddVendor(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add vendor</DialogTitle>
            <DialogDescription>Create a vendor and auto-fill it for this item.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Vendor name *"
              value={newVendorName}
              onChange={(e) => setNewVendorName(e.target.value)}
              className="h-9"
            />
            <Input
              placeholder="Vendor site link (optional)"
              type="url"
              value={newVendorLink}
              onChange={(e) => setNewVendorLink(e.target.value)}
              className="h-9"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={cancelAddVendor}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={saveNewVendor}
              disabled={savingNewVendor || !newVendorName.trim()}
            >
              {savingNewVendor ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save vendor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={specPromptItemId !== null}
        onOpenChange={(open) => {
          if (!open) cancelSpecPrompt();
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Choose product specifications</DialogTitle>
            <DialogDescription>
              Your item name matches multiple variants. Pick the specs you need so we fetch the right prices.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-auto pr-1">
            {specSampleTitles.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs font-medium">Matching products</Label>
                <div className="flex flex-col gap-3 max-h-72 overflow-y-auto pr-1">
                  {specSampleTitles.map((t, idx) => {
                    const selected = selectedSampleMatch === t.trim();
                    return (
                      <button
                        key={`${idx}-${t.slice(0, 40)}`}
                        type="button"
                        onClick={() => selectSampleMatch(t)}
                        className={
                          selected
                            ? 'block w-full rounded-lg border border-black bg-black px-4 py-3.5 text-left text-sm leading-relaxed text-white shadow-sm'
                            : 'block w-full rounded-lg border border-input bg-background px-4 py-3.5 text-left text-sm leading-relaxed text-foreground hover:bg-accent hover:text-accent-foreground'
                        }
                      >
                        <span className="block whitespace-normal break-words">{t}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {specFacets.map((facet) => (
              <div key={facet.key} className="space-y-1.5">
                <Label className="text-xs font-medium">{facet.label}</Label>
                <div className="flex flex-wrap gap-1.5">
                  {facet.options.map((opt) => {
                    const selected = specSelections[facet.key] === opt;
                    return (
                      <Button
                        key={opt}
                        type="button"
                        size="sm"
                        variant={selected ? 'default' : 'outline'}
                        className="h-7 rounded-full text-xs"
                        onClick={() => selectSpecFacetOption(facet.key, opt, selected)}
                      >
                        {opt}
                      </Button>
                    );
                  })}
                </div>
              </div>
            ))}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                {specFacets.length > 0 || specSampleTitles.length > 0
                  ? 'Specifications'
                  : 'Specifications *'}
              </Label>
              <Input
                placeholder="Filled when you select a product or length/size…"
                value={specExtraText}
                onChange={(e) => setSpecExtraText(e.target.value)}
                className="h-9"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                const itemId = specPromptItemId;
                const pending =
                  pendingSpecCompare && pendingSpecCompare.itemId === itemId
                    ? pendingSpecCompare
                    : null;
                cancelSpecPrompt();
                if (!itemId) return;
                if (pending?.data) {
                  applyLivePriceResults(itemId, pending.data, pending.name, '');
                  return;
                }
                await fetchLivePrices(itemId, { skipSpecPrompt: true });
              }}
            >
              Skip &amp; show all
            </Button>
            <Button type="button" onClick={confirmSpecPrompt}>
              Apply &amp; fetch prices
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {addVendorDialog}
    </Card>
  );
};
