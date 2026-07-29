/** Pure helpers for the inventory request form. */

import { SPEC_STOP_WORDS } from './constants';
import type {
  EcommerceSource,
  FormItem,
  LivePriceCompareResult,
  PriceQuote,
  SpecFacet,
} from './types';

export const quoteFromLiveResult = (
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


export const normalizeIndianPincode = (value: string): string | null => {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 6 && digits[0] !== '0') return digits;
  return null;
};

export const looksLikeProductUrl = (value: string): boolean => {
  const s = String(value || '').trim();
  if (!s) return false;
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return /^https?:\/\/\S+/i.test(s);
  }
};

export const normalizeProductName = (name: string): string =>
  String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

export const normalizeVendorName = (name: string): string =>
  String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

export const toVendorStorageName = (name: string): string =>
  String(name || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();

export const newEmptyItem = (): FormItem => ({
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

export const buildPriceSearchQuery = (name: string, specifications: string): string =>
  [name.trim(), specifications.trim()].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();

/** Pull differentiating product specs from live result titles so we can ask the user. */
export const extractSpecFacetsFromTitles = (titles: string[], baseName: string): SpecFacet[] => {
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
export const extractSpecificationsFromTitle = (title: string): string => {
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
export const cleanItemNameFromTitle = (title: string): string => {
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
export const resolveSpecificationsFromTitle = (rawTitle: string, itemName: string): string => {
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

export const titlesNeedSpecificationPrompt = (titles: string[], baseName: string, existingSpecs: string): boolean => {
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

/** Collapse "7 mm" / "7mm" / "7.5 cm" into a single comparable token ("7mm"). */
export const normalizeMeasurementsInText = (value: string): string =>
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

export const tokenizeProductText = (value: string): string[] =>
  normalizeMeasurementsInText(value)
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !SPEC_STOP_WORDS.has(t));

/** True when a marketplace title is a close match for the requested name + specs. */
export const isExactEnoughProductMatch = (title: string, name: string, specifications: string): boolean => {
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

export const formatRequestDateDisplay = (isoDate: string): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(isoDate || '').trim());
  if (!m) return isoDate || '—';
  return `${m[3]}-${m[2]}-${m[1]}`;
};
