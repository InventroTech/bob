/** State, effects, and handlers for the inventory request form. */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { apiClient, membershipService } from '@/lib/api';
import type { MembershipUser } from '@/lib/api/services/membership';
import { toast } from 'sonner';
import { emptyShipmentTrackingFields } from '@/lib/inventory/shipmentTracking';
import { fetchProductFromLink, looksLikeProductUrl } from '@/lib/inventory/productLinkExtract';
import { formatInventoryPriorityLabel } from '@/lib/inventory/priority';
import {
  isInventoryTeamLeadRole,
} from '@/lib/inventory/workflow';
import { fetchDistinctFieldValues } from '@/components/page-builder/dispatch/fetchDistinctFieldValues';
import { supabase } from '@/lib/supabase';
import { getTenantIdFromJWT, getRoleIdFromJWT } from '@/lib/auth/jwt';
import { getEffectiveToken, fetchPagesForRole, useSpoofUserId } from '@/lib/auth/spoof';

import {
  RECORDS_URL,
  DEFAULT_DELIVERY_PINCODE,
  DEFAULT_DELIVERY_ADDRESS,
  PRIORITY_OPTIONS,
  REQUIRED_ITEM_FIELDS,
} from './constants';
import type {
  FormItem,
  InventoryItemSuggestion,
  InventoryRequestFormProps,
  PriceQuote,
  RequestCategory,
  VendorOption,
} from './types';
import type { InventoryRequestFormDraft } from './draftStorage';
import {
  normalizeIndianPincode,
  normalizeProductName,
  normalizeVendorName,
  toVendorStorageName,
  newEmptyItem,
  extractSpecificationsFromTitle,
} from './utils';
import {
  clearDraft,
  isMeaningfulDraft,
  loadDraft,
  makeDraftKey,
  saveDraft,
} from './draftStorage';

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
 * - Final fallbacks: any request list page (not New/Create), else first available page
 */
function pickPostCreatePageId(
  pages: Array<{ id: string; name: string }>,
  preferredName: string | undefined,
  roleName: string | null | undefined,
  currentPageId?: string | null
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
    const allRequests = pickPageIdByNames(
      pages,
      ['all requests', 'all request'],
      ['all request']
    );
    if (allRequests) return allRequests;
  }

  const isNewRequestPage = (name: string) => {
    const n = normalizePageName(name);
    return n.includes('new request') || n.includes('create request') || n === 'new';
  };

  // Unmannd / inventory: land on any request list (not the create form).
  const requestList = pages.find((p) => {
    if (currentPageId && p.id === currentPageId) return false;
    if (isNewRequestPage(p.name)) return false;
    const n = normalizePageName(p.name);
    return (
      n.includes('my request') ||
      n.includes('all request') ||
      n.includes('pending approval') ||
      n === 'requests' ||
      (n.includes('request') && !n.includes('form'))
    );
  });
  if (requestList) return requestList.id;

  const other = pages.find((p) => !currentPageId || p.id !== currentPageId);
  return other?.id ?? pages[0]?.id ?? null;
}

export function useInventoryRequestForm({
  config,
  variant = 'default',
}: InventoryRequestFormProps) {
  const isProcurement = variant === 'procurement';
  const { user, session } = useAuth();
  const spoofUserId = useSpoofUserId();
  const draftOwnerId = spoofUserId || user?.id || null;
  const navigate = useNavigate();
  const { tenantSlug, pageId: currentPageId } = useParams<{
    tenantSlug?: string;
    pageId?: string;
  }>();

  const entityType = config?.entityType ?? 'inventory_request';
  const draftKey = draftOwnerId
    ? makeDraftKey({
        userId: draftOwnerId,
        tenantSlug,
        pageId: currentPageId,
        entityType,
        variant: isProcurement ? 'procurement' : 'default',
      })
    : '';
  // Navy chrome for Unmannd: procurement form, unmannd entity, or unmannd tenant slug.
  const useNavyTheme =
    isProcurement ||
    String(entityType).toLowerCase() === 'unmannd_request' ||
    /unman+d/i.test(String(tenantSlug || ''));
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
  const [showSubmitSuccess, setShowSubmitSuccess] = useState(false);
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [vendorsLoading, setVendorsLoading] = useState(true);
  const [addVendorForItemId, setAddVendorForItemId] = useState<string | null>(null);
  const [newVendorName, setNewVendorName] = useState('');
  const [newVendorLink, setNewVendorLink] = useState('');
  const [savingNewVendor, setSavingNewVendor] = useState(false);
  /** Live-formatted price strings while typing (cleared on blur). */
  const [priceDraftByItemId, setPriceDraftByItemId] = useState<Record<string, string>>({});
  /** Shake nounce for header/item fields that failed validation. */
  const [fieldShakeNonce, setFieldShakeNonce] = useState<Record<string, number>>({});
  /** First missing field to focus after validation shake re-render. */
  const pendingFocusFieldKeyRef = useRef<string | null>(null);
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
  const [linkFetchLoadingByItemId, setLinkFetchLoadingByItemId] = useState<Record<string, boolean>>({});
  const lastFetchedLinkByItemIdRef = useRef<Record<string, string>>({});
  const linkFetchSeqByItemIdRef = useRef<Record<string, number>>({});
  const [draftHydrated, setDraftHydrated] = useState(false);
  const appliedOwnerIdRef = useRef<string | null>(null);
  const snapshotRef = useRef<(InventoryRequestFormDraft & { key: string }) | null>(null);
  const persistTimerRef = useRef<number | null>(null);
  const skipPersistRef = useRef(false);
  const userIdRef = useRef(draftOwnerId);
  userIdRef.current = draftOwnerId;

  const requesterDisplay =
    requesterNameFromMembership ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    '—';

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

  const applyEmptyForm = useCallback(() => {
    setProjectPurpose('');
    setRequestCategory('');
    setDeliveryPincode(DEFAULT_DELIVERY_PINCODE);
    setDeliveryAddress(DEFAULT_DELIVERY_ADDRESS);
    setItems([newEmptyItem()]);
    setPriceDraftByItemId({});
    setFieldShakeNonce({});
  }, []);

  const applyDraftToForm = useCallback((draft: InventoryRequestFormDraft) => {
    setProjectPurpose(draft.projectPurpose);
    setRequestCategory(draft.requestCategory);
    setDeliveryPincode(draft.deliveryPincode || DEFAULT_DELIVERY_PINCODE);
    setDeliveryAddress(draft.deliveryAddress || DEFAULT_DELIVERY_ADDRESS);
    setItems(draft.items.length > 0 ? draft.items : [newEmptyItem()]);
    setPriceDraftByItemId(draft.priceDraftByItemId ?? {});
    setFieldShakeNonce({});
  }, []);

  // Only record a snapshot once this owner's fields are on screen, so we never
  // write requestor A's values into team lead / manager / another requestor's slot.
  if (appliedOwnerIdRef.current === draftOwnerId && draftKey && draftOwnerId) {
    snapshotRef.current = {
      key: draftKey,
      userId: draftOwnerId,
      projectPurpose,
      requestCategory,
      deliveryPincode,
      deliveryAddress,
      items,
      priceDraftByItemId,
      persistedAt: Date.now(),
    };
  }

  useEffect(() => {
    skipPersistRef.current = true;

    const prev = snapshotRef.current;
    if (prev?.userId && prev.key && draftOwnerId && prev.userId !== draftOwnerId) {
      const { key: prevKey, ...prevDraft } = prev;
      if (isMeaningfulDraft(prevDraft)) {
        saveDraft(prevKey, { ...prevDraft, persistedAt: Date.now() });
      } else {
        clearDraft(prevKey);
      }
      snapshotRef.current = null;
    }

    if (!draftOwnerId || !draftKey) {
      appliedOwnerIdRef.current = null;
      applyEmptyForm();
      setDraftHydrated(false);
      return;
    }

    const draft = loadDraft(draftKey, draftOwnerId);
    if (draft) applyDraftToForm(draft);
    else applyEmptyForm();
    appliedOwnerIdRef.current = draftOwnerId;
    setDraftHydrated(true);
  }, [draftKey, draftOwnerId, applyEmptyForm, applyDraftToForm]);

  useEffect(() => {
    if (!draftHydrated) return;
    if (skipPersistRef.current) {
      skipPersistRef.current = false;
      return;
    }
    if (!draftOwnerId || !draftKey) return;
    if (appliedOwnerIdRef.current !== draftOwnerId) return;

    const persist = () => {
      persistTimerRef.current = null;
      const snap = snapshotRef.current;
      if (!snap?.key || !snap.userId) return;
      if (snap.userId !== userIdRef.current) return;
      const { key, ...draft } = snap;
      if (!isMeaningfulDraft(draft)) {
        clearDraft(key);
        return;
      }
      saveDraft(key, { ...draft, persistedAt: Date.now() });
    };
    if (persistTimerRef.current != null) {
      window.clearTimeout(persistTimerRef.current);
    }
    persistTimerRef.current = window.setTimeout(persist, 250);
    return () => {
      if (persistTimerRef.current != null) {
        window.clearTimeout(persistTimerRef.current);
        persistTimerRef.current = null;
      }
      if (!skipPersistRef.current && userIdRef.current) persist();
    };
  }, [
    draftHydrated,
    draftKey,
    draftOwnerId,
    projectPurpose,
    requestCategory,
    deliveryPincode,
    deliveryAddress,
    items,
    priceDraftByItemId,
  ]);

  const discardDraft = useCallback(() => {
    skipPersistRef.current = true;
    if (persistTimerRef.current != null) {
      window.clearTimeout(persistTimerRef.current);
      persistTimerRef.current = null;
    }
    snapshotRef.current = null;
    if (draftKey) clearDraft(draftKey);
  }, [draftKey]);

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
      product_image: String(item.product_image ?? '').trim() || '',
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

  const fetchDetailsFromProductLink = useCallback(
    async (itemId: string, rawUrl?: string, opts?: { force?: boolean }) => {
      const item = items.find((i) => i.id === itemId);
      const url = (rawUrl ?? item?.product_link ?? '').trim();
      console.log('[product-link-extract] fetch click', {
        itemId,
        url,
        force: !!opts?.force,
        looksLikeUrl: looksLikeProductUrl(url),
        alreadyFetched: lastFetchedLinkByItemIdRef.current[itemId] === url,
      });
      if (!looksLikeProductUrl(url)) {
        console.warn('[product-link-extract] skipped: URL must start with https://');
        toast.error('Paste a valid https:// product URL first.');
        return;
      }
      if (!opts?.force && lastFetchedLinkByItemIdRef.current[itemId] === url) {
        console.log('[product-link-extract] skipped: already fetched this URL');
        return;
      }

      const seq = (linkFetchSeqByItemIdRef.current[itemId] ?? 0) + 1;
      linkFetchSeqByItemIdRef.current[itemId] = seq;
      setLinkFetchLoadingByItemId((prev) => ({ ...prev, [itemId]: true }));
      try {
        const result = await fetchProductFromLink({
          url,
          pincode: deliveryPincode,
        });
        if (linkFetchSeqByItemIdRef.current[itemId] !== seq) return;
        lastFetchedLinkByItemIdRef.current[itemId] = url;
        if (!result.ok) {
          console.warn('[product-link-extract] extract not ok', result);
          toast.error(result.error || 'Could not fetch product details from this link.');
          return;
        }
        console.log('[product-link-extract] applying to form', {
          title: result.title,
          price: result.price,
          vendor: result.vendor,
          image: result.image,
        });
        setItems((prev) =>
          prev.map((row) => {
            if (row.id !== itemId) return row;
            const title = String(result.title || '').trim();
            const specs = row.specifications.trim() || extractSpecificationsFromTitle(title);
            const next: FormItem = {
              ...row,
              product_link: String(result.link || url).trim() || row.product_link,
            };
            if (title) next.item_name_freeform = title;
            if (specs) next.specifications = specs;
            if (result.image) next.product_image = String(result.image).trim();
            if (result.vendor && !row.vendor.trim()) {
              next.vendor = toVendorStorageName(String(result.vendor));
            }
            if (result.price != null && Number.isFinite(Number(result.price))) {
              next.estimated_cost = Math.round(Number(result.price) * 100) / 100;
            }
            if (result.currency === 'USD' || result.currency === 'INR') {
              next.price_currency = result.currency;
            }
            return next;
          })
        );
        if (result.price != null) {
          setPriceDraftByItemId((prev) => {
            const next = { ...prev };
            delete next[itemId];
            return next;
          });
        }
        const bits = [
          result.title ? 'name' : null,
          result.price != null ? 'price' : null,
          result.image ? 'image' : null,
        ].filter(Boolean);
        toast.success(`Fetched ${bits.join(', ') || 'product details'} from the link.`);
      } catch (err) {
        if (linkFetchSeqByItemIdRef.current[itemId] !== seq) return;
        console.error('[product-link-extract] catch', err);
        const apiData =
          err && typeof err === 'object' && 'data' in err
            ? (err as { data?: { error?: string } }).data
            : undefined;
        const msg =
          (apiData && typeof apiData.error === 'string' && apiData.error) ||
          (err && typeof err === 'object' && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Could not fetch product details from this link.');
        toast.error(msg);
      } finally {
        if (linkFetchSeqByItemIdRef.current[itemId] === seq) {
          setLinkFetchLoadingByItemId((prev) => {
            const next = { ...prev };
            delete next[itemId];
            return next;
          });
        }
      }
    },
    [items, deliveryPincode]
  );

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
      discardDraft();

      const navigateAfterCreate = async () => {
        // After create: prefer My Requests for all roles (TL / PM included); All Requests as fallback for approvers.
        let redirected = false;
        if (tenantSlug) {
          try {
            const token = await getEffectiveToken(session?.access_token ?? null);
            const tenantId = token ? getTenantIdFromJWT(token) : null;
            const roleId = token ? getRoleIdFromJWT(token) : null;
            let pages: Array<{ id: string; name: string }> = [];
            if (token && tenantId && roleId) {
              // Prefer the same Pages API path as the sidebar (works for spoof + normal JWT).
              try {
                pages = await fetchPagesForRole(tenantId, roleId, token);
              } catch (pagesErr) {
                console.warn('fetchPagesForRole failed after create; trying Supabase', pagesErr);
              }
              if (!pages.length) {
                const { data } = await supabase
                  .from('pages')
                  .select('id, name')
                  .eq('tenant_id', tenantId)
                  .eq('role', roleId)
                  .eq('is_deleted', false)
                  .order('display_order', { ascending: true });
                pages = data ?? [];
              }
            }
            const pageId = pickPostCreatePageId(
              pages,
              redirectPageName,
              myRoleName,
              currentPageId
            );
            if (pageId) {
              navigate(`/app/${tenantSlug}/pages/${pageId}`);
              redirected = true;
            } else {
              console.warn('No post-create page found', {
                pageCount: pages.length,
                pageNames: pages.map((p) => p.name),
                redirectPageName,
                myRoleName,
              });
              toast.message('Request created, but no list page was found to open.');
            }
          } catch (navErr) {
            console.warn('Could not navigate after request create', navErr);
            toast.message('Request created, but navigation failed.');
          }
        } else {
          navigate('/inventory/requests');
          redirected = true;
        }

        if (!redirected) {
          setShowSubmitSuccess(false);
          applyEmptyForm();
        }
      };

      // Unmannd: brief success animation before leaving the form.
      if (useNavyTheme) {
        setShowSubmitSuccess(true);
        await new Promise((r) => window.setTimeout(r, 1400));
      }
      await navigateAfterCreate();
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : isProcurement
            ? 'Failed to create procurement request.'
            : 'Failed to create inventory request.';
      console.error('Failed to create request', err);
      toast.error(message);
      setShowSubmitSuccess(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClear = () => {
    applyEmptyForm();
    setAddVendorForItemId(null);
    setNewVendorName('');
    setNewVendorLink('');
    discardDraft();
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
      (i.product_link ?? '').trim() !== ''
  );
  const isFormEmpty = !hasAnyItemContent;

  return {
    user,
    isProcurement,
    useNavyTheme,
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
    showSubmitSuccess,
    vendors,
    vendorsLoading,
    addVendorForItemId,
    newVendorName,
    setNewVendorName,
    newVendorLink,
    setNewVendorLink,
    savingNewVendor,
    priceDraftByItemId,
    setPriceDraftByItemId,
    fieldShakeNonce,
    clearFieldShake,
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
    linkFetchLoadingByItemId,
    fetchDetailsFromProductLink,
    requesterDisplay,
    filteredProjectSuggestions,
    addItem,
    removeItem,
    updateItem,
    startAddVendor,
    cancelAddVendor,
    saveNewVendor,
    handleSubmit,
    handleClear,
    isFormEmpty,
  };


}

export type InventoryRequestFormModel = ReturnType<typeof useInventoryRequestForm>;
