/** State, effects, and handlers for the inventory request form. */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { apiClient, membershipService } from '@/lib/api';
import type { MembershipUser } from '@/lib/api/services/membership';
import { toast } from 'sonner';
import { formatCurrencyDisplay } from '@/lib/utils/currencyFormat';
import { emptyShipmentTrackingFields } from '@/lib/inventory/shipmentTracking';
import { formatInventoryPriorityLabel } from '@/lib/inventory/priority';
import {
  isInventoryTeamLeadRole,
} from '@/lib/inventory/workflow';
import { fetchDistinctFieldValues } from '@/components/page-builder/dispatch/fetchDistinctFieldValues';
import { supabase } from '@/lib/supabase';
import { getTenantIdFromJWT, getRoleIdFromJWT } from '@/lib/auth/jwt';
import { getEffectiveToken, fetchPagesForRole } from '@/lib/auth/spoof';

import {
  RECORDS_URL,
  PRICE_COMPARE_URL,
  FALLBACK_ECOMMERCE_SOURCES,
  DEFAULT_DELIVERY_PINCODE,
  DEFAULT_DELIVERY_ADDRESS,
  PRIORITY_OPTIONS,
  REQUIRED_ITEM_FIELDS,
} from './constants';
import type {
  EcommerceSource,
  FormItem,
  InventoryItemSuggestion,
  InventoryRequestFormProps,
  LivePriceCompareResponse,
  PriceCompareVendorsResponse,
  PriceQuote,
  RequestCategory,
  SpecFacet,
  VendorOption,
} from './types';
import {
  quoteFromLiveResult,
  normalizeIndianPincode,
  looksLikeProductUrl,
  normalizeProductName,
  normalizeVendorName,
  toVendorStorageName,
  newEmptyItem,
  buildPriceSearchQuery,
  extractSpecFacetsFromTitles,
  cleanItemNameFromTitle,
  resolveSpecificationsFromTitle,
  titlesNeedSpecificationPrompt,
  isExactEnoughProductMatch,
} from './utils';

const normalizePageName = (name: string) => name.trim().toLowerCase().replace(/\s+/g, ' ');

function isApproverLikeRole(roleName: string | null | undefined): boolean {
  if (isInventoryTeamLeadRole(roleName)) return true;
  const r = String(roleName ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
  // Procurement Manager (and similar) — not generic "manager".
  return r.includes('procurement');
}

function pickPageIdByNames(
  pages: Array<{ id: string; name: string }>,
  exactNames: string[],
  fuzzyIncludes: string[]
): string | null {
  for (const exact of exactNames) {
    const hit = pages.find((p) => normalizePageName(p.name) === exact);
    if (hit) return hit.id;
  }
  for (const fuzzy of fuzzyIncludes) {
    const hit = pages.find((p) => normalizePageName(p.name).includes(fuzzy));
    if (hit) return hit.id;
  }
  return null;
}

/**
 * After create:
 * - Prefer Page Builder override `redirectAfterSubmitPageName` when set
 * - Prefer My Request(s) for all roles (including TL / Procurement Manager)
 * - Approver roles fall back to All Request(s) if My Request page is missing
 */
function pickPostCreatePageId(
  pages: Array<{ id: string; name: string }>,
  preferredName: string | undefined,
  roleName: string | null | undefined
): string | null {
  if (!pages.length) return null;
  const preferred = preferredName ? normalizePageName(preferredName) : '';
  if (preferred) {
    const exactPreferred = pages.find((p) => normalizePageName(p.name) === preferred);
    if (exactPreferred) return exactPreferred.id;
    const fuzzyPreferred = pages.find((p) => normalizePageName(p.name).includes(preferred));
    if (fuzzyPreferred) return fuzzyPreferred.id;
  }

  const myRequest = pickPageIdByNames(
    pages,
    ['my requests', 'my request'],
    ['my request']
  );
  if (myRequest) return myRequest;

  if (isApproverLikeRole(roleName)) {
    return pickPageIdByNames(
      pages,
      ['all requests', 'all request'],
      ['all request']
    );
  }

  return null;
}

export function useInventoryRequestForm({
  config,
  variant = 'default',
}: InventoryRequestFormProps) {
  const isProcurement = variant === 'procurement';
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const { tenantSlug } = useParams<{ tenantSlug?: string }>();

  const entityType = config?.entityType ?? 'inventory_request';
  const initialStatus = config?.initialStatus ?? config?.defaultStatus ?? 'NEW_REQUEST';
  const initialStatusText = (config?.initialStatusText ?? initialStatus).trim();
  const redirectPageName = config?.redirectAfterSubmitPageName;

  const [requestDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [department, setDepartment] = useState('');
  const [projectPurpose, setProjectPurpose] = useState('');
  const [requestCategory, setRequestCategory] = useState<RequestCategory>('');
  const [deliveryPincode, setDeliveryPincode] = useState(DEFAULT_DELIVERY_PINCODE);
  const [deliveryAddress, setDeliveryAddress] = useState(DEFAULT_DELIVERY_ADDRESS);
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
  /** core = small reliable set (default); extended = full catalog. */
  const [priceCompareProfile, setPriceCompareProfile] = useState<'core' | 'extended'>('core');
  /** Per-item loading state for live marketplace price fetch. */
  const [liveCompareLoadingByItemId, setLiveCompareLoadingByItemId] = useState<Record<string, boolean>>({});
  /** Per-item loading while resolving product details from a pasted item link. */
  const [linkFetchLoadingByItemId, setLinkFetchLoadingByItemId] = useState<Record<string, boolean>>({});
  /** Shake nounce for header/item fields that failed validation (or link fetch). */
  const [fieldShakeNonce, setFieldShakeNonce] = useState<Record<string, number>>({});
  /** First missing field to focus after validation shake re-render. */
  const pendingFocusFieldKeyRef = useRef<string | null>(null);
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
        // Form default is Core; keep local selection unless the user changes the profile control.
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
    const shakeKey = `item:${id}:${String(field)}`;
    setFieldShakeNonce((prev) => {
      if (!prev[shakeKey]) return prev;
      const next = { ...prev };
      delete next[shakeKey];
      return next;
    });
  }, []);

  const shakeFields = useCallback((keys: string[]) => {
    if (keys.length === 0) return;
    pendingFocusFieldKeyRef.current = keys[0];
    setFieldShakeNonce((prev) => {
      const next = { ...prev };
      for (const key of keys) {
        next[key] = (next[key] ?? 0) + 1;
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const key = pendingFocusFieldKeyRef.current;
    if (!key) return;
    pendingFocusFieldKeyRef.current = null;
    const timer = window.setTimeout(() => {
      const wrap = document.querySelector(`[data-shake-key="${CSS.escape(key)}"]`);
      if (!wrap) return;
      wrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const focusable = wrap.querySelector<HTMLElement>(
        'input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), button[role="combobox"], [role="combobox"]'
      );
      focusable?.focus({ preventScroll: true });
    }, 50);
    return () => window.clearTimeout(timer);
  }, [fieldShakeNonce]);

  const clearFieldShake = useCallback((key: string) => {
    setFieldShakeNonce((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
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
  const shakeItemLink = useCallback(
    (itemId: string) => {
      shakeFields([`item:${itemId}:product_link`]);
    },
    [shakeFields]
  );

  const fetchDetailsFromItemLink = useCallback(
    async (itemId: string, rawUrl?: string, options?: { force?: boolean }) => {
      const item = items.find((i) => i.id === itemId);
      if (!item) return;

      const url = String(rawUrl ?? item.product_link ?? '').trim();
      if (!looksLikeProductUrl(url)) {
        shakeItemLink(itemId);
        if (url) {
          toast.error('Enter a valid product URL (https://…).');
        }
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
          shakeItemLink(itemId);
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
          shakeItemLink(itemId);
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
          shakeItemLink(itemId);
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
        clearFieldShake(`item:${itemId}:product_link`);

        toast.success(
          title
            ? `Loaded “${title.slice(0, 60)}${title.length > 60 ? '…' : ''}” — ${formatCurrencyDisplay(quote.price)} ${quote.currency}`
            : `Loaded price ${formatCurrencyDisplay(quote.price)} ${quote.currency} from link`
        );
      } catch (err: unknown) {
        shakeItemLink(itemId);
        const msg =
          err && typeof err === 'object' && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Failed to fetch details from this link.';
        toast.error(msg);
      } finally {
        setLinkFetchLoadingByItemId((prev) => ({ ...prev, [itemId]: false }));
      }
    },
    [items, deliveryPincode, ecommerceSources, lastFetchedLinkByItemId, shakeItemLink, clearFieldShake]
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

    const itemHasAnyInput = (item: FormItem): boolean =>
      (item.item_name_freeform ?? '').trim() !== '' ||
      item.quantity_required !== '' ||
      (item.urgency_level ?? '').trim() !== '' ||
      (item.vendor ?? '').trim() !== '' ||
      (item.estimated_cost ?? '') !== '' ||
      (item.product_link ?? '').trim() !== '' ||
      (item.specifications ?? '').trim() !== '' ||
      (item.comments ?? '').trim() !== '';

    const missingKeys: string[] = [];
    const missingLabels: string[] = [];

    if (!requestCategory) {
      missingKeys.push('requestCategory');
      missingLabels.push('Shipment Type');
    }
    if (!projectPurpose.trim()) {
      missingKeys.push('projectPurpose');
      missingLabels.push('Project');
    }
    if (!normalizeIndianPincode(deliveryPincode)) {
      missingKeys.push('deliveryPincode');
      missingLabels.push('Delivery PIN code');
    }
    if (!deliveryAddress.trim()) {
      missingKeys.push('deliveryAddress');
      missingLabels.push('Delivery address');
    }

    const rowsToValidate = items.filter(itemHasAnyInput);
    if (rowsToValidate.length === 0) {
      const firstId = items[0]?.id;
      if (firstId) {
        for (const f of REQUIRED_ITEM_FIELDS) {
          missingKeys.push(`item:${firstId}:${String(f.key)}`);
        }
        missingLabels.push('Item details');
      } else {
        missingLabels.push('Add at least one item');
      }
    } else {
      for (const item of rowsToValidate) {
        for (const f of REQUIRED_ITEM_FIELDS) {
          if (isMissingRequired(item, f.key)) {
            missingKeys.push(`item:${item.id}:${String(f.key)}`);
            missingLabels.push(f.label);
          }
        }
      }
    }

    if (missingKeys.length > 0 || missingLabels.length > 0) {
      if (missingKeys.length > 0) shakeFields(missingKeys);
      const uniqueLabels = [...new Set(missingLabels)];
      toast.error(`Please fill mandatory fields: ${uniqueLabels.join(', ')}`);
      return;
    }

    const validItems = rowsToValidate;

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

      // After create: prefer My Requests for all roles (TL / PM included); All Requests as fallback for approvers.
      let redirected = false;
      if (tenantSlug) {
        try {
          const token = await getEffectiveToken(session?.access_token ?? null);
          const tenantId = token ? getTenantIdFromJWT(token) : null;
          const roleId = token ? getRoleIdFromJWT(token) : null;
          let pages: Array<{ id: string; name: string }> = [];
          if (token && tenantId && roleId) {
            const spoofToken =
              typeof window !== 'undefined' ? window.localStorage.getItem('pyro_spoof_jwt') : null;
            if (spoofToken) {
              pages = await fetchPagesForRole(tenantId, roleId, spoofToken);
            } else {
              const { data } = await supabase
                .from('pages')
                .select('id, name')
                .eq('tenant_id', tenantId)
                .eq('role', roleId)
                .order('display_order', { ascending: true });
              pages = data ?? [];
            }
          }
          const pageId = pickPostCreatePageId(pages, redirectPageName, myRoleName);
          if (pageId) {
            navigate(`/app/${tenantSlug}/pages/${pageId}`);
            redirected = true;
          }
        } catch (navErr) {
          console.warn('Could not navigate after request create', navErr);
        }
      } else {
        navigate('/inventory/requests');
        redirected = true;
      }

      if (!redirected) {
        setItems([newEmptyItem()]);
        setProjectPurpose('');
        setRequestCategory('');
        setDeliveryPincode(DEFAULT_DELIVERY_PINCODE);
        setDeliveryAddress(DEFAULT_DELIVERY_ADDRESS);
        setPriceDraftByItemId({});
        setPriceCompareStatusByItemId({});
        setLinkFetchLoadingByItemId({});
        setFieldShakeNonce({});
        setLastFetchedLinkByItemId({});
      }
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
    setDeliveryAddress(DEFAULT_DELIVERY_ADDRESS);
    setPriceCompareStatusByItemId({});
    setLinkFetchLoadingByItemId({});
    setFieldShakeNonce({});
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

  return {
    user,
    isProcurement,
    requestDate,
    department,
    projectPurpose,
    setProjectPurpose,
    requestCategory,
    setRequestCategory,
    deliveryPincode,
    setDeliveryPincode,
    deliveryAddress,
    setDeliveryAddress,
    items,
    submitting,
    vendors,
    vendorsLoading,
    addVendorForItemId,
    newVendorName,
    setNewVendorName,
    newVendorLink,
    setNewVendorLink,
    savingNewVendor,
    specPromptItemId,
    specFacets,
    specSelections,
    specExtraText,
    setSpecExtraText,
    specSampleTitles,
    selectedSampleMatch,
    pendingSpecCompare,
    priceDraftByItemId,
    setPriceDraftByItemId,
    ecommerceSources,
    priceCompareProfile,
    setPriceCompareProfile,
    liveCompareLoadingByItemId,
    linkFetchLoadingByItemId,
    fieldShakeNonce,
    clearFieldShake,
    priceCompareStatusByItemId,
    focusedItemNameId,
    setFocusedItemNameId,
    itemNameQuery,
    setItemNameQuery,
    itemNameSuggestions,
    itemNameSuggestionsOpen,
    setItemNameSuggestionsOpen,
    itemNameSuggestionsLoading,
    projectSuggestions,
    projectSuggestionsOpen,
    setProjectSuggestionsOpen,
    projectSuggestionsLoading,
    focusedVendorId,
    setFocusedVendorId,
    vendorQuery,
    setVendorQuery,
    vendorSuggestionsOpen,
    setVendorSuggestionsOpen,
    requesterDisplay,
    activePriceCompareVendors,
    filteredProjectSuggestions,
    addItem,
    removeItem,
    updateItem,
    removeQuote,
    applyQuoteToItem,
    fetchDetailsFromItemLink,
    applyLivePriceResults,
    fetchLivePrices,
    cancelSpecPrompt,
    selectSpecFacetOption,
    selectSampleMatch,
    confirmSpecPrompt,
    startAddVendor,
    cancelAddVendor,
    saveNewVendor,
    handleSubmit,
    handleClear,
    isFormEmpty,
  };


}

export type InventoryRequestFormModel = ReturnType<typeof useInventoryRequestForm>;
