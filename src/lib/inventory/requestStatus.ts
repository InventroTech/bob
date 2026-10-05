/**
 * Combined request status for inventory_request / unmannd_request.
 *
 * `data.status` is the single lifecycle status shown in the UI:
 *   NEW_REQUEST → REQ_TO_VERIFY → APPROVED → IN_CART → ORDERED → DELIVERED / EXCEPTION
 *   (ON_HOLD / REJECTED at pre-order steps)
 *
 * Options (labels, colours, order, page) come from
 * GET /crm-records/status-config/?entity_type=… and fall back to the defaults below.
 */

export const REQUEST_STATUS = {
  NEW_REQUEST: 'NEW_REQUEST',
  REQ_TO_VERIFY: 'REQ_TO_VERIFY',
  APPROVED: 'APPROVED',
  IN_CART: 'IN_CART',
  ON_HOLD: 'ON_HOLD',
  REJECTED: 'REJECTED',
  ORDERED: 'ORDERED',
  DELIVERED: 'DELIVERED',
  EXCEPTION: 'EXCEPTION',
} as const;

export const LEGACY_REQUEST_STATUS_ALIASES: Record<string, string> = {
  VENDOR_IDENTIFIED: REQUEST_STATUS.APPROVED,
  IN_SHIPPING: REQUEST_STATUS.ORDERED,
};

/** Statuses after the order is placed (ops pick between these in the table). */
export const POST_ORDER_REQUEST_STATUSES: readonly string[] = [
  REQUEST_STATUS.ORDERED,
  REQUEST_STATUS.DELIVERED,
  REQUEST_STATUS.EXCEPTION,
];

export type RequestStatusPage = {
  id: string;
  label: string;
  order: number;
};

export type RequestStatusOption = {
  value: string;
  label: string;
  /** Chip text colour (hex) — also selects the chip tone. */
  color: string;
  /** Chip background colour (hex). */
  background?: string | null;
  page: string | null;
  order: number;
  active: boolean;
  builtin?: boolean;
};

export type RequestStatusConfig = {
  entity_type?: string;
  is_custom?: boolean;
  pages: RequestStatusPage[];
  statuses: RequestStatusOption[];
};

export const DEFAULT_REQUEST_STATUS_PAGES: RequestStatusPage[] = [
  { id: 'pending_approval', label: 'Pending Approvals', order: 1 },
  { id: 'in_cart', label: 'In Cart Items', order: 2 },
  { id: 'ordered', label: 'Ordered Items', order: 3 },
  { id: 'delivered', label: 'Delivered Items', order: 4 },
  { id: 'closed', label: 'Invoiced & Closed', order: 5 },
];

export const DEFAULT_REQUEST_STATUS_OPTIONS: RequestStatusOption[] = [
  { value: 'NEW_REQUEST', label: 'New request', color: '#78350F', background: '#FFFBEB', page: 'pending_approval' },
  { value: 'REQ_TO_VERIFY', label: 'Req to verify', color: '#6D28D9', background: '#F5F3FF', page: 'pending_approval' },
  { value: 'APPROVED', label: 'Approved', color: '#16A34A', background: '#DCFCE7', page: 'pending_approval' },
  { value: 'IN_CART', label: 'In cart', color: '#1B6FE8', background: '#E8F1FD', page: 'in_cart' },
  { value: 'ON_HOLD', label: 'On hold', color: '#F97316', background: '#FFF7ED', page: 'pending_approval' },
  { value: 'REJECTED', label: 'Rejected', color: '#DC2626', background: '#FEE2E2', page: 'closed' },
  { value: 'ORDERED', label: 'Ordered', color: '#1A3673', background: '#EEF2FA', page: 'ordered' },
  { value: 'DELIVERED', label: 'Delivered', color: '#15803D', background: '#DCFCE7', page: 'delivered' },
  { value: 'EXCEPTION', label: 'Exception', color: '#B91C1C', background: '#FEE2E2', page: 'ordered' },
].map((s, index) => ({ ...s, order: index + 1, active: true, builtin: true }));

export const DEFAULT_REQUEST_STATUS_CONFIG: RequestStatusConfig = {
  pages: DEFAULT_REQUEST_STATUS_PAGES,
  statuses: DEFAULT_REQUEST_STATUS_OPTIONS,
};

export const REQUEST_STATUS_ENTITY_TYPES = new Set(['inventory_request', 'unmannd_request']);

export function normalizeStatusCode(raw: unknown): string {
  return String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
}

/** Upper-snake the value and map legacy codes (VENDOR_IDENTIFIED → APPROVED, IN_SHIPPING → ORDERED). */
export function normalizeRequestStatus(raw: unknown): string {
  const code = normalizeStatusCode(raw);
  return LEGACY_REQUEST_STATUS_ALIASES[code] ?? code;
}

/**
 * Tone classes per colour (text hex from the status config, or a colour name);
 * kept as literals so Tailwind keeps them. Hex keys are lowercase Tailwind
 * palette values — unknown hex codes fall back to the default tone.
 */
const COLOR_TONE_CLASS: Record<string, string> = {
  '#78350f': 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-100',
  '#1a3673': 'border-[#1A3673]/35 bg-[#EEF2FA] text-[#1A3673] dark:border-[#1A3673]/70 dark:bg-[#1A3673]/40 dark:text-blue-100',
  '#2563eb': 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800/60 dark:bg-blue-950/40 dark:text-blue-100',
  '#6d28d9': 'border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-800/60 dark:bg-violet-950/40 dark:text-violet-100',
  '#16a34a': 'border-green-300 bg-green-50 text-green-700 dark:border-green-800/60 dark:bg-green-950/40 dark:text-green-100',
  '#1b6fe8': 'border-[#1B6FE8]/40 bg-[#E8F1FD] text-[#0A4CB8] dark:border-[#1B6FE8]/60 dark:bg-[#0A4CB8]/30 dark:text-blue-100',
  '#f97316': 'border-orange-300 bg-orange-50 text-orange-500 dark:border-orange-800/60 dark:bg-orange-950/40 dark:text-orange-100',
  '#dc2626': 'border-red-200 bg-red-50 text-red-700 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-100',
  '#4f46e5': 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-800/60 dark:bg-indigo-950/40 dark:text-indigo-100',
  '#15803d': 'border-green-500 bg-green-50 text-green-800 dark:border-green-700 dark:bg-green-950/40 dark:text-green-100',
  '#b91c1c': 'border-red-400 bg-red-50 text-red-800 dark:border-red-700 dark:bg-red-950/40 dark:text-red-100',
  blue: 'border-blue-200 bg-blue-50 text-blue-800',
  sky: 'border-sky-200 bg-sky-50 text-sky-700',
  amber: 'border-amber-300 bg-amber-50 text-amber-900',
  yellow: 'border-yellow-200 bg-yellow-50 text-yellow-800',
  green: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  teal: 'border-teal-200 bg-teal-50 text-teal-800',
  purple: 'border-violet-200 bg-violet-50 text-violet-800',
  violet: 'border-violet-200 bg-violet-50 text-violet-800',
  indigo: 'border-indigo-200 bg-indigo-50 text-indigo-800',
  orange: 'border-orange-200 bg-orange-50 text-orange-800',
  red: 'border-rose-200 bg-rose-50 text-rose-700',
  rose: 'border-rose-200 bg-rose-50 text-rose-700',
  pink: 'border-pink-200 bg-pink-50 text-pink-700',
  gray: 'border-gray-200 bg-gray-50 text-gray-700',
  slate: 'border-slate-200 bg-slate-50 text-slate-700',
};

export const DEFAULT_STATUS_TONE_CLASS = 'border-amber-200 bg-amber-50 text-amber-800';

export function statusToneClassForColor(color: string | null | undefined): string {
  return COLOR_TONE_CLASS[String(color ?? '').trim().toLowerCase()] ?? DEFAULT_STATUS_TONE_CLASS;
}

// ---------------------------------------------------------------------------
// Config store (shared across components; filled by useRequestStatusConfig)
// ---------------------------------------------------------------------------

const configByEntity = new Map<string, RequestStatusConfig>();
const inflightByEntity = new Map<string, Promise<RequestStatusConfig>>();
const listeners = new Set<() => void>();
let storeVersion = 0;

function emit() {
  storeVersion += 1;
  listeners.forEach((listener) => listener());
}

export function subscribeRequestStatusConfig(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getRequestStatusConfigVersion(): number {
  return storeVersion;
}

function sanitizeConfig(raw: unknown): RequestStatusConfig | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Partial<RequestStatusConfig>;
  const statuses = Array.isArray(obj.statuses)
    ? obj.statuses
        .filter((s): s is RequestStatusOption => !!s && typeof s.value === 'string' && !!s.value)
        .map((s, index) => ({
          value: normalizeRequestStatus(s.value),
          label: String(s.label || s.value),
          color: String(s.color || 'gray'),
          background: s.background ? String(s.background) : null,
          page: s.page ? String(s.page) : null,
          order: typeof s.order === 'number' ? s.order : index + 1,
          active: s.active !== false,
          builtin: Boolean(s.builtin),
        }))
        .sort((a, b) => a.order - b.order)
    : [];
  const pages = Array.isArray(obj.pages)
    ? obj.pages
        .filter((p): p is RequestStatusPage => !!p && typeof p.id === 'string' && !!p.id)
        .map((p, index) => ({
          id: p.id,
          label: String(p.label || p.id),
          order: typeof p.order === 'number' ? p.order : index + 1,
        }))
        .sort((a, b) => a.order - b.order)
    : [];
  if (statuses.length === 0) return null;
  return {
    entity_type: obj.entity_type,
    is_custom: Boolean(obj.is_custom),
    pages: pages.length > 0 ? pages : DEFAULT_REQUEST_STATUS_PAGES,
    statuses,
  };
}

/** Cached config for an entity type, or the defaults when not loaded / not a request entity. */
export function getRequestStatusConfig(entityType?: string | null): RequestStatusConfig {
  if (entityType && configByEntity.has(entityType)) {
    return configByEntity.get(entityType)!;
  }
  if (!entityType) {
    const first = configByEntity.values().next();
    if (!first.done) return first.value;
  }
  return DEFAULT_REQUEST_STATUS_CONFIG;
}

export async function loadRequestStatusConfig(entityType: string): Promise<RequestStatusConfig> {
  if (!REQUEST_STATUS_ENTITY_TYPES.has(entityType)) return DEFAULT_REQUEST_STATUS_CONFIG;
  const cached = configByEntity.get(entityType);
  if (cached) return cached;
  const inflight = inflightByEntity.get(entityType);
  if (inflight) return inflight;

  const promise = (async () => {
    try {
      const { apiClient } = await import('@/lib/api');
      const res = await apiClient.get<RequestStatusConfig>('/crm-records/status-config/', {
        params: { entity_type: entityType },
      });
      const config = sanitizeConfig(res.data);
      if (config) {
        configByEntity.set(entityType, config);
        emit();
        return config;
      }
    } catch (err) {
      console.warn('[status-config] fetch failed, using defaults', err);
    } finally {
      inflightByEntity.delete(entityType);
    }
    return DEFAULT_REQUEST_STATUS_CONFIG;
  })();
  inflightByEntity.set(entityType, promise);
  return promise;
}

/** Test / admin helper: drop cached configs so the next load refetches. */
export function resetRequestStatusConfigCache(): void {
  configByEntity.clear();
  inflightByEntity.clear();
  emit();
}

// ---------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------

export function findRequestStatusOption(
  status: unknown,
  entityType?: string | null
): RequestStatusOption | undefined {
  const code = normalizeRequestStatus(status);
  if (!code) return undefined;
  return getRequestStatusConfig(entityType).statuses.find((s) => s.value === code);
}

/** Codes only request entities use (not shared with lead / ticket statuses like ON_HOLD). */
const REQUEST_ONLY_STATUS_CODES = new Set([
  REQUEST_STATUS.NEW_REQUEST,
  REQUEST_STATUS.REQ_TO_VERIFY,
  REQUEST_STATUS.IN_CART,
  'VENDOR_IDENTIFIED',
  'IN_SHIPPING',
]);

export function isRequestOnlyStatusCode(status: unknown): boolean {
  return REQUEST_ONLY_STATUS_CODES.has(normalizeStatusCode(status));
}

export function getRequestStatusLabel(status: unknown, entityType?: string | null): string {
  const raw = String(status ?? '').trim();
  if (!raw) return '—';
  const option = findRequestStatusOption(raw, entityType);
  if (option) return option.label;
  return normalizeStatusCode(raw).replace(/_/g, ' ');
}

export function getRequestStatusToneClass(status: unknown, entityType?: string | null): string {
  const option = findRequestStatusOption(status, entityType);
  return option ? statusToneClassForColor(option.color) : DEFAULT_STATUS_TONE_CLASS;
}

/**
 * Allowed next statuses (step by step). ON_HOLD / REJECTED are open before ordering,
 * EXCEPTION after ordering; REJECTED and DELIVERED are final. Statuses not listed here
 * (tenant-added) are unrestricted.
 */
export const REQUEST_STATUS_TRANSITIONS: Record<string, readonly string[]> = {
  [REQUEST_STATUS.NEW_REQUEST]: [REQUEST_STATUS.REQ_TO_VERIFY, REQUEST_STATUS.ON_HOLD, REQUEST_STATUS.REJECTED],
  [REQUEST_STATUS.REQ_TO_VERIFY]: [REQUEST_STATUS.APPROVED, REQUEST_STATUS.ON_HOLD, REQUEST_STATUS.REJECTED],
  [REQUEST_STATUS.APPROVED]: [REQUEST_STATUS.IN_CART, REQUEST_STATUS.ON_HOLD, REQUEST_STATUS.REJECTED],
  [REQUEST_STATUS.IN_CART]: [REQUEST_STATUS.ORDERED, REQUEST_STATUS.ON_HOLD, REQUEST_STATUS.REJECTED],
  [REQUEST_STATUS.ON_HOLD]: [
    REQUEST_STATUS.NEW_REQUEST,
    REQUEST_STATUS.REQ_TO_VERIFY,
    REQUEST_STATUS.APPROVED,
    REQUEST_STATUS.IN_CART,
    REQUEST_STATUS.REJECTED,
  ],
  [REQUEST_STATUS.REJECTED]: [],
  [REQUEST_STATUS.ORDERED]: [REQUEST_STATUS.DELIVERED, REQUEST_STATUS.EXCEPTION],
  [REQUEST_STATUS.EXCEPTION]: [REQUEST_STATUS.ORDERED, REQUEST_STATUS.DELIVERED],
  [REQUEST_STATUS.DELIVERED]: [],
};

/**
 * Whether `to` may follow `from`. Moving to the same status is not a change (false);
 * an empty `from` or unlisted statuses are allowed.
 */
export function isRequestStatusTransitionAllowed(from: unknown, to: unknown): boolean {
  const fromCode = normalizeRequestStatus(from);
  const toCode = normalizeRequestStatus(to);
  if (!toCode) return false;
  if (fromCode === toCode) return false;
  if (!fromCode) return true;
  const allowed = REQUEST_STATUS_TRANSITIONS[fromCode];
  if (!allowed) return true;
  if (!(toCode in REQUEST_STATUS_TRANSITIONS)) return true;
  return allowed.includes(toCode);
}

/** Current status (for display) followed by the active statuses it may move to. */
export function getAllowedNextRequestStatuses(currentStatus: unknown, entityType?: string | null): string[] {
  const current = normalizeRequestStatus(currentStatus);
  const next = getRequestStatusValues(entityType).filter(
    (v) => v !== current && isRequestStatusTransitionAllowed(current, v)
  );
  return current ? [current, ...next] : next;
}

/** Active dropdown options; keeps the current value visible even if hidden / unknown. */
export function getRequestStatusDropdownOptions(
  entityType?: string | null,
  currentStatus?: unknown,
  options?: { stepsOnly?: boolean }
): Array<{ value: string; label: string }> {
  const config = getRequestStatusConfig(entityType);
  const stepsFrom = options?.stepsOnly ? normalizeRequestStatus(currentStatus) : '';
  const dropdown = config.statuses
    .filter((s) => s.active)
    .filter((s) => !stepsFrom || isRequestStatusTransitionAllowed(stepsFrom, s.value))
    .map((s) => ({ value: s.value, label: s.label }));
  const current = normalizeRequestStatus(currentStatus);
  if (current && !dropdown.some((o) => o.value === current)) {
    dropdown.unshift({ value: current, label: getRequestStatusLabel(current, entityType) });
  }
  return dropdown;
}

export function getRequestStatusValues(entityType?: string | null): string[] {
  return getRequestStatusConfig(entityType)
    .statuses.filter((s) => s.active)
    .map((s) => s.value);
}

/** Page id (stage) a status belongs to, or null when unmapped. */
export function getRequestStatusPage(status: unknown, entityType?: string | null): string | null {
  return findRequestStatusOption(status, entityType)?.page ?? null;
}

/** Stored codes (incl. legacy aliases) mapped to a page — for client-side filters. */
export function getRequestStatusesForPage(pageId: string, entityType?: string | null): string[] {
  const values: string[] = [];
  for (const s of getRequestStatusConfig(entityType).statuses) {
    if (s.page !== pageId) continue;
    values.push(s.value);
    for (const [legacy, current] of Object.entries(LEGACY_REQUEST_STATUS_ALIASES)) {
      if (current === s.value) values.push(legacy);
    }
  }
  return values;
}
