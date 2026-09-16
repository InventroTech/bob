/** Persist New Request form values across in-app tab switches and remounts. */

import type { FormItem, RequestCategory } from './types';
import { newEmptyItem } from './utils';

export const DRAFT_STORAGE_PREFIX = 'bob.inventoryRequestFormDraft.v2';
const LEGACY_DRAFT_PREFIXES = ['bob.inventoryRequestFormDraft.v1'];
export const DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type InventoryRequestFormDraft = {
  userId: string | null;
  projectPurpose: string;
  requestCategory: RequestCategory;
  deliveryPincode: string;
  deliveryAddress: string;
  items: FormItem[];
  priceDraftByItemId: Record<string, string>;
  persistedAt: number;
};

export type DraftKeyParts = {
  /** Required — drafts are private to this user (requestor / TL / manager). */
  userId: string;
  tenantSlug?: string | null;
  pageId?: string | null;
  entityType: string;
  variant: string;
};

const memoryCache = new Map<string, InventoryRequestFormDraft>();

export function makeDraftKey(parts: DraftKeyParts): string {
  const userId = String(parts.userId || '').trim();
  if (!userId) return '';
  return [
    DRAFT_STORAGE_PREFIX,
    parts.tenantSlug ?? '',
    parts.pageId ?? '',
    parts.entityType,
    parts.variant,
    userId,
  ].join(':');
}

function itemHasDraftContent(item: FormItem): boolean {
  return (
    (item.item_name_freeform ?? '').trim() !== '' ||
    (item.specifications ?? '').trim() !== '' ||
    item.quantity_required !== '' ||
    (item.urgency_level ?? '').trim() !== '' ||
    (item.vendor ?? '').trim() !== '' ||
    (item.estimated_cost ?? '') !== '' ||
    (item.comments ?? '').trim() !== '' ||
    (item.product_link ?? '').trim() !== '' ||
    (item.product_image ?? '').trim() !== '' ||
    (item.project_purpose ?? '').trim() !== '' ||
    Boolean(item.request_category)
  );
}

export type DeliveryDefaults = {
  deliveryAddress: string;
  deliveryPincode: string;
};

export function isMeaningfulDraft(
  draft: Pick<
    InventoryRequestFormDraft,
    'projectPurpose' | 'requestCategory' | 'deliveryPincode' | 'deliveryAddress' | 'items'
  >,
  defaults: DeliveryDefaults = { deliveryAddress: '', deliveryPincode: '' }
): boolean {
  if (draft.projectPurpose.trim()) return true;
  if (draft.requestCategory) return true;
  if (draft.deliveryPincode.trim() && draft.deliveryPincode.trim() !== defaults.deliveryPincode) {
    return true;
  }
  if (draft.deliveryAddress.trim() && draft.deliveryAddress.trim() !== defaults.deliveryAddress) {
    return true;
  }
  return draft.items.some(itemHasDraftContent);
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

function sanitizeQuantity(value: unknown): number | '' {
  if (value === '' || value == null) return '';
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : '';
}

function sanitizeRequestCategory(value: unknown): RequestCategory {
  return value === 'Domestic' || value === 'International' ? value : '';
}

function sanitizeFormItem(
  raw: unknown,
  fallback?: { projectPurpose: string; requestCategory: RequestCategory }
): FormItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const base = newEmptyItem();
  const projectPurpose =
    'project_purpose' in o
      ? asString(o.project_purpose)
      : fallback?.projectPurpose ?? '';
  const requestCategory =
    'request_category' in o
      ? sanitizeRequestCategory(o.request_category)
      : fallback?.requestCategory ?? '';
  return {
    ...base,
    id: asString(o.id) || base.id,
    item_name_freeform: asString(o.item_name_freeform),
    specifications: asString(o.specifications),
    quantity_required: sanitizeQuantity(o.quantity_required),
    required_date: asString(o.required_date),
    product_link: asString(o.product_link),
    product_image: asString(o.product_image),
    vendor: asString(o.vendor),
    estimated_cost: sanitizeQuantity(o.estimated_cost),
    price_currency: o.price_currency === 'USD' ? 'USD' : 'INR',
    urgency_level: asString(o.urgency_level),
    project_purpose: projectPurpose,
    request_category: requestCategory,
    comments: asString(o.comments),
    price_quotes: Array.isArray(o.price_quotes) ? (o.price_quotes as FormItem['price_quotes']) : [],
  };
}

function sanitizePriceDrafts(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, string> = {};
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === 'string') out[id] = value;
  }
  return out;
}

export function sanitizeDraft(raw: unknown): InventoryRequestFormDraft | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const persistedAt = typeof o.persistedAt === 'number' ? o.persistedAt : 0;
  if (persistedAt > 0 && Date.now() - persistedAt > DRAFT_MAX_AGE_MS) return null;

  const requestCategory = sanitizeRequestCategory(o.requestCategory);
  const projectPurpose = asString(o.projectPurpose);
  const items = Array.isArray(o.items)
    ? o.items
        .map((raw) =>
          sanitizeFormItem(raw, { projectPurpose, requestCategory })
        )
        .filter((item): item is FormItem => item != null)
    : [];

  return {
    userId: typeof o.userId === 'string' && o.userId ? o.userId : null,
    projectPurpose: asString(o.projectPurpose),
    requestCategory,
    deliveryPincode: asString(o.deliveryPincode),
    deliveryAddress: asString(o.deliveryAddress),
    items: items.length > 0 ? items : [newEmptyItem()],
    priceDraftByItemId: sanitizePriceDrafts(o.priceDraftByItemId),
    persistedAt,
  };
}

function draftBelongsToOwner(draft: InventoryRequestFormDraft, ownerUserId: string): boolean {
  return Boolean(draft.userId && ownerUserId && draft.userId === ownerUserId);
}

export function loadDraft(key: string, ownerUserId: string): InventoryRequestFormDraft | null {
  if (!key || !ownerUserId) return null;

  const fromMemory = memoryCache.get(key);
  if (fromMemory) {
    const fresh = sanitizeDraft(fromMemory);
    if (fresh && draftBelongsToOwner(fresh, ownerUserId)) return fresh;
    if (!fresh) memoryCache.delete(key);
    else return null;
  }

  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = sanitizeDraft(JSON.parse(raw));
    if (!parsed) {
      window.sessionStorage.removeItem(key);
      return null;
    }
    if (!draftBelongsToOwner(parsed, ownerUserId)) return null;
    memoryCache.set(key, parsed);
    return parsed;
  } catch {
    return null;
  }
}

export function saveDraft(key: string, draft: InventoryRequestFormDraft): void {
  if (!key || !draft.userId) return;
  memoryCache.set(key, draft);
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(draft));
  } catch {
    // Private mode / quota — in-memory cache still covers in-app tab switches.
  }
}

export function clearDraft(key: string): void {
  memoryCache.delete(key);
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function clearAllInventoryRequestFormDrafts(): void {
  memoryCache.clear();
  if (typeof window === 'undefined') return;
  try {
    const prefixes = [DRAFT_STORAGE_PREFIX, ...LEGACY_DRAFT_PREFIXES];
    const keys: string[] = [];
    for (let i = 0; i < window.sessionStorage.length; i += 1) {
      const k = window.sessionStorage.key(i);
      if (k && prefixes.some((prefix) => k.startsWith(prefix))) keys.push(k);
    }
    for (const k of keys) window.sessionStorage.removeItem(k);
  } catch {
    /* ignore */
  }
}

/** Test-only: drop in-memory drafts without touching sessionStorage. */
export function _resetDraftMemoryForTests(): void {
  memoryCache.clear();
}
