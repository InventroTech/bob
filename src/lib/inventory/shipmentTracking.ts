/** Canonical shipment statuses for inventory_request.data.shipment_status */
export const SHIPMENT_STATUSES = [
  'NOT_SHIPPED',
  'ORDERED',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'EXCEPTION',
] as const;

export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];

export const DEFAULT_SHIPMENT_STATUS: ShipmentStatus = 'NOT_SHIPPED';

export type AftershipCourier = {
  name: string;
  slug: string;
};

/** Couriers we alias case-insensitively (FedEx / fedex / FEDEX all work). */
export const SHIPMENT_COURIER_OPTIONS = [
  'Amazon',
  'BlueDart',
  'Delhivery',
  'FedEx',
  'DHL',
  'DTDC',
  'Shiprocket',
  'India Post',
] as const;

/** Shown first in the courier picker before the user types. */
export const PREFERRED_SHIPMENT_COURIERS: AftershipCourier[] = [
  { name: 'Amazon', slug: 'amazon' },
  { name: 'BlueDart', slug: 'bluedart' },
  { name: 'Delhivery', slug: 'delhivery' },
  { name: 'DHL Express', slug: 'dhl' },
  { name: 'DTDC India', slug: 'dtdc' },
  { name: 'Ecom Express', slug: 'ecom-express' },
  { name: 'FedEx', slug: 'fedex' },
  { name: 'India Post Domestic', slug: 'india-post' },
  { name: 'Shiprocket X', slug: 'shiprocket' },
];

const PREFERRED_COURIER_SLUGS = new Set(PREFERRED_SHIPMENT_COURIERS.map((c) => c.slug));

const COURIER_PICK_LIMIT = 80;

function courierSearchKey(value: string): string {
  return value.trim().toLowerCase();
}

export function filterAftershipCouriers(
  couriers: AftershipCourier[],
  query: string,
  limit = COURIER_PICK_LIMIT
): AftershipCourier[] {
  const q = courierSearchKey(query);
  if (!q) {
    const bySlug = new Map(couriers.map((c) => [c.slug, c]));
    return PREFERRED_SHIPMENT_COURIERS.map((preferred) => {
      const hit = bySlug.get(preferred.slug);
      return hit ? { ...hit, name: preferred.name } : preferred;
    });
  }
  const compactQ = q.replace(/[^a-z0-9]+/g, '');
  const scored = couriers
    .map((courier) => {
      const name = courier.name.toLowerCase();
      const slug = courier.slug.toLowerCase();
      const compactName = name.replace(/[^a-z0-9]+/g, '');
      let score = 99;
      if (slug === q || name === q) score = 0;
      else if (slug.startsWith(q) || name.startsWith(q) || compactName.startsWith(compactQ)) score = 1;
      else if (slug.includes(q) || name.includes(q) || compactName.includes(compactQ)) score = 2;
      return { courier, score };
    })
    .filter((row) => row.score < 99)
    .sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score;
      const aPref = PREFERRED_COURIER_SLUGS.has(a.courier.slug) ? 0 : 1;
      const bPref = PREFERRED_COURIER_SLUGS.has(b.courier.slug) ? 0 : 1;
      if (aPref !== bPref) return aPref - bPref;
      return a.courier.name.localeCompare(b.courier.name);
    });
  return scored.slice(0, limit).map((row) => row.courier);
}

export function findAftershipCourier(
  value: string | null | undefined,
  catalog: AftershipCourier[] = []
): AftershipCourier | undefined {
  const raw = String(value ?? '').trim();
  if (!raw) return undefined;
  const lower = raw.toLowerCase();
  const pool = catalog.length > 0 ? catalog : PREFERRED_SHIPMENT_COURIERS;
  const bySlug = pool.find((c) => c.slug === lower);
  if (bySlug) return bySlug;
  const nameHits = pool.filter((c) => c.name.toLowerCase() === lower);
  if (nameHits.length === 1) return nameHits[0];
  if (nameHits.length > 1) {
    return nameHits.find((c) => PREFERRED_COURIER_SLUGS.has(c.slug)) ?? nameHits[0];
  }
  const compact = lower.replace(/[^a-z0-9]+/g, '');
  const compactHits = pool.filter(
    (c) =>
      c.slug.replace(/[^a-z0-9]+/g, '') === compact ||
      c.name.toLowerCase().replace(/[^a-z0-9]+/g, '') === compact
  );
  if (compactHits.length === 1) return compactHits[0];
  if (compactHits.length > 1) {
    return compactHits.find((c) => PREFERRED_COURIER_SLUGS.has(c.slug)) ?? compactHits[0];
  }
  return undefined;
}

export function courierDisplayName(
  value: string | null | undefined,
  catalog: AftershipCourier[] = []
): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const found = findAftershipCourier(raw, catalog);
  if (!found) return normalizeCourierLabel(raw) || raw;
  const preferred = PREFERRED_SHIPMENT_COURIERS.find((row) => row.slug === found.slug);
  return preferred?.name ?? found.name;
}

/** Slug to send to AfterShip; keeps catalog picks like dhl-global-mail intact. */
export function courierValueForTrack(
  value: string | null | undefined,
  catalog: AftershipCourier[] = []
): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const found = findAftershipCourier(raw, catalog);
  if (found) return found.slug;
  return normalizeCourierLabel(raw) || raw;
}

let aftershipCourierCache: AftershipCourier[] | null = null;
let aftershipCourierInflight: Promise<AftershipCourier[]> | null = null;

export function getCachedAftershipCouriers(): AftershipCourier[] {
  return aftershipCourierCache ?? PREFERRED_SHIPMENT_COURIERS;
}

export async function fetchAftershipCouriers(): Promise<AftershipCourier[]> {
  if (aftershipCourierCache) return aftershipCourierCache;
  if (!aftershipCourierInflight) {
    aftershipCourierInflight = (async () => {
      try {
        const { apiClient } = await import('@/lib/api');
        const res = await apiClient.get<{ couriers?: AftershipCourier[] }>(
          '/crm-records/shipment-couriers/'
        );
        const rows = Array.isArray(res.data?.couriers) ? res.data.couriers : [];
        const cleaned = rows.filter(
          (row): row is AftershipCourier =>
            Boolean(row && typeof row.name === 'string' && typeof row.slug === 'string')
        );
        if (cleaned.length > 0) {
          aftershipCourierCache = cleaned;
          return cleaned;
        }
      } catch (err) {
        console.warn('[shipment-couriers] catalog fetch failed', err);
      }
      aftershipCourierInflight = null;
      return PREFERRED_SHIPMENT_COURIERS;
    })();
  }
  return aftershipCourierInflight;
}

/** True when the value is a URL / track link rather than an AWB. */
export function looksLikeTrackingLinkInput(value: string | null | undefined): boolean {
  const v = String(value ?? '').trim();
  if (!v) return false;
  if (/^https?:\/\//i.test(v)) return true;
  if (/^www\./i.test(v)) return true;
  if (v.includes('://')) return true;
  if (/[\/]/.test(v)) return true;
  return false;
}

/** Happy-path delivery pipeline shown in the form modal (excludes NOT_SHIPPED / EXCEPTION). */
export const SHIPMENT_PIPELINE_STEPS = [
  'ORDERED',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
] as const satisfies readonly ShipmentStatus[];

export type ShipmentPipelineStep = (typeof SHIPMENT_PIPELINE_STEPS)[number];

export function normalizeShipmentStatus(status: unknown): ShipmentStatus | null {
  const raw = String(status ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_');
  if (!raw) return null;
  return SHIPMENT_STATUSES.includes(raw as ShipmentStatus) ? (raw as ShipmentStatus) : null;
}

/**
 * When tracking link/number is first applied and status is still empty / NOT_SHIPPED,
 * move into ORDERED so the delivery pipeline shows a current state.
 */
export function advanceShipmentStatusForTracking(
  currentStatus: unknown,
  hasTracking: boolean
): ShipmentStatus | null {
  const normalized = normalizeShipmentStatus(currentStatus);
  if (!hasTracking) return normalized;
  if (!normalized || normalized === 'NOT_SHIPPED') return 'ORDERED';
  return normalized;
}

export type ShipmentTrackEvent = {
  time?: string | null;
  message?: string | null;
  location?: string | null;
  status?: string | null;
};

export type ShipmentTrackDetails = {
  origin?: string | null;
  destination?: string | null;
  current_location?: string | null;
  events?: ShipmentTrackEvent[];
};

export type LiveShipmentTrackResult = {
  ok?: boolean;
  shipment_status?: string | null;
  courier_name?: string | null;
  eta?: string | null;
  tracking_number?: string | null;
  tracking_link?: string | null;
  status_detail?: string | null;
  error?: string | null;
  method?: string | null;
  tracked_at?: string | null;
  origin?: string | null;
  destination?: string | null;
  current_location?: string | null;
  events?: ShipmentTrackEvent[];
};

export function shipmentDetailsFromTrackResult(
  result: LiveShipmentTrackResult | null | undefined
): ShipmentTrackDetails | null {
  if (!result) return null;
  const events = Array.isArray(result.events) ? result.events : [];
  const details: ShipmentTrackDetails = {
    origin: result.origin ?? null,
    destination: result.destination ?? null,
    current_location: result.current_location ?? null,
    events,
  };
  if (!details.origin && !details.destination && !details.current_location && events.length === 0) {
    return null;
  }
  return details;
}

export function looksLikeAmazonTrackingId(value: string | null | undefined): boolean {
  const v = String(value ?? '').trim();
  if (!v) return false;
  if (/^\d{3}-\d{7}-\d{7}$/.test(v)) return true;
  if (/^TBA[0-9A-Z]{8,}$/i.test(v)) return true;
  if (/^(TBA|AMZL)/i.test(v)) return true;
  return false;
}

/** Map typed courier names onto a canonical label, ignoring case and punctuation. */
export function normalizeCourierLabel(value: string | null | undefined): string | null {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const compact = raw.toLowerCase().replace(/[^a-z0-9]+/g, '');
  if (compact.startsWith('amazon') || compact === 'amzn' || compact === 'amzl') return 'Amazon';
  if (compact.includes('fedex')) return 'FedEx';
  if (compact === 'dhl' || compact.startsWith('dhl')) return 'DHL';
  if (compact.includes('bluedart')) return 'BlueDart';
  if (compact.includes('delhivery')) return 'Delhivery';
  if (compact.includes('dtdc')) return 'DTDC';
  if (compact.includes('shiprocket')) return 'Shiprocket';
  if (compact.includes('indiapost') || compact === 'post') return 'India Post';
  return raw.replace(/\s+/g, ' ');
}

export function publicTrackingLink(
  awb: string | null | undefined,
  courier?: string | null
): string | null {
  const number = String(awb ?? '').trim();
  if (!number) return null;
  const safe = encodeURIComponent(number);
  const raw = String(courier ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-');
  let slug = raw;
  if (raw.includes('fedex')) slug = 'fedex';
  else if (raw === 'dhl' || raw.startsWith('dhl')) slug = 'dhl';
  else if (raw.includes('bluedart') || raw.includes('blue-dart')) slug = 'bluedart';
  else if (raw.includes('delhivery')) slug = 'delhivery';
  else if (raw.includes('dtdc')) slug = 'dtdc';
  else if (raw.includes('shiprocket')) slug = 'shiprocket';
  else if (raw.includes('india-post') || raw.includes('indiapost') || raw === 'india post')
    slug = 'india-post';

  if (slug === 'fedex') return `https://www.fedex.com/fedextrack/?trknbr=${safe}`;
  if (slug === 'dhl' || slug.startsWith('dhl'))
    return `https://www.dhl.com/en/express/tracking.html?AWB=${safe}&brand=DHL`;
  if (slug === 'delhivery') return `https://www.delhivery.com/track/package/?waybill=${safe}`;
  if (slug === 'bluedart') return `https://www.aftership.com/track/bluedart/${safe}`;
  if (slug === 'dtdc') return `https://www.aftership.com/track/dtdc/${safe}`;
  if (slug === 'shiprocket') return `https://www.aftership.com/track/shiprocket/${safe}`;
  if (slug === 'india-post') return `https://www.aftership.com/track/india-post/${safe}`;
  if (slug && !['aftership', 'auto-detect', 'auto', '__auto__'].includes(slug)) {
    return `https://www.aftership.com/track/${encodeURIComponent(slug)}/${safe}`;
  }
  return `https://www.aftership.com/track/${safe}`;
}

/**
 * Ask the backend to resolve live carrier status from AWB / tracking link.
 * Updates the delivery pipeline automatically from the response.
 */
export async function fetchLiveShipmentStatus(input: {
  tracking_number?: string | null;
  tracking_link?: string | null;
  courier_name?: string | null;
}): Promise<LiveShipmentTrackResult> {
  const body = {
    tracking_number: input.tracking_number || null,
    tracking_link: input.tracking_link || null,
    courier_name: input.courier_name || null,
  };
  console.log('[shipment-track] request', body);
  try {
    const { apiClient } = await import('@/lib/api');
    const res = await apiClient.post<LiveShipmentTrackResult>('/crm-records/shipment-track/', body, {
      timeout: 30000,
    });
    const data = res.data ?? {};
    console.log('[shipment-track] response', {
      ok: data.ok,
      shipment_status: data.shipment_status,
      status_detail: data.status_detail,
      courier_name: data.courier_name,
      method: data.method,
      error: data.error,
      tracking_number: data.tracking_number,
      tracking_link: data.tracking_link,
      eta: data.eta,
      tracked_at: data.tracked_at,
      origin: data.origin,
      destination: data.destination,
      current_location: data.current_location,
      events_count: Array.isArray(data.events) ? data.events.length : 0,
      full: data,
    });
    return data;
  } catch (err) {
    console.error('[shipment-track] request failed', err);
    throw err;
  }
}

/** Request statuses where the shipment tracking editor is shown. */
export const SHIPMENT_TRACKING_VISIBLE_REQUEST_STATUSES = new Set([
  'VENDOR_IDENTIFIED',
  'IN_CART',
  'IN_SHIPPING',
]);

export type ShipmentTrackingFields = {
  tracking_number: string | null;
  tracking_link: string | null;
  courier_name: string | null;
  /** Null until ops sets a real shipment state (avoid showing NOT_SHIPPED on brand-new requests). */
  shipment_status: ShipmentStatus | null;
  eta: string | null;
  tracking_updated_at: string | null;
};

/** Empty defaults written on inventory_request create. */
export function emptyShipmentTrackingFields(): ShipmentTrackingFields {
  return {
    tracking_number: null,
    tracking_link: null,
    courier_name: null,
    shipment_status: null,
    eta: null,
    tracking_updated_at: null,
  };
}

function looksLikeUrl(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  if (/^https?:\/\//i.test(v)) return true;
  if (/^www\./i.test(v)) return true;
  return false;
}

function ensureHttpUrl(value: string): string {
  const v = value.trim();
  if (/^https?:\/\//i.test(v)) return v;
  if (/^www\./i.test(v)) return `https://${v}`;
  return v;
}

/** Extract AWB / tracking id from common carrier / aggregator URLs. */
export function extractTrackingNumberFromUrl(url: string): string | null {
  try {
    const parsed = new URL(ensureHttpUrl(url));
    const host = (parsed.hostname || '').toLowerCase();
    const params = parsed.searchParams;
    const path = parsed.pathname || '';

    const paramKeys = [
      'waybill',
      'awb',
      'tracking_number',
      'trackingNumber',
      'tracking_id',
      'trackingId',
      'trackId',
      'shipment_id',
      'cnno',
      'ref',
      'id',
    ];
    for (const key of paramKeys) {
      const val = params.get(key);
      if (val && String(val).trim().length >= 5) return String(val).trim();
    }

    // aftership.com/<carrier>/<number>
    if (host.includes('aftership.')) {
      const parts = path.split('/').filter(Boolean);
      const last = parts[parts.length - 1];
      if (last && /^[A-Za-z0-9-]{5,}$/.test(last)) return last;
    }

    // delhivery / shiprocket style path segments
    if (host.includes('delhivery.') || host.includes('shiprocket.') || host.includes('bluedart.')) {
      const parts = path.split('/').filter(Boolean);
      const last = parts[parts.length - 1];
      if (last && /^[A-Za-z0-9-]{6,}$/.test(last) && !/^(track|tracking|shipment|order)$/i.test(last)) {
        return last;
      }
    }
  } catch {
    // ignore parse errors
  }
  return null;
}

export type NormalizeTrackingPasteResult = {
  tracking_link: string | null;
  tracking_number: string | null;
};

/**
 * Split a pasted tracking value into link vs number.
 * URLs go to tracking_link (and AWB extracted when possible);
 * plain text goes to tracking_number.
 */
export function normalizeTrackingPaste(raw: string): NormalizeTrackingPasteResult {
  const value = String(raw ?? '').trim();
  if (!value) {
    return { tracking_link: null, tracking_number: null };
  }

  if (looksLikeUrl(value)) {
    const link = ensureHttpUrl(value);
    const extracted = extractTrackingNumberFromUrl(link);
    return {
      tracking_link: link,
      tracking_number: extracted,
    };
  }

  return {
    tracking_link: null,
    tracking_number: value,
  };
}

/** Default table columns for inventory request shipment tracking. */
export const INVENTORY_REQUEST_TRACKING_COLUMNS = [
  { key: 'shipment_status', label: 'Shipment', type: 'chip' as const },
  { key: 'tracking_link', label: 'Track', type: 'link' as const },
] as const;

/**
 * Merge tracking columns into an inventory_request table column list
 * without duplicating keys already configured.
 * Requirement Date is replaced by ETA (shown in that slot); ETA / Tracking No / Courier are not appended at the end.
 */
export function mergeInventoryTrackingColumns<T extends { key: string; label?: string; type?: string }>(
  columns: T[] | undefined | null
): Array<T | (typeof INVENTORY_REQUEST_TRACKING_COLUMNS)[number]> {
  const existing = Array.isArray(columns) ? [...columns] : [];
  const remapped = existing
    .filter((c) => {
      const key = String(c.key || '').trim();
      // Drop legacy Details, Tracking No, Courier, and trailing ETA (ETA lives where Requirement Date was).
      return (
        key &&
        key !== 'tracking_details' &&
        key !== 'eta' &&
        key !== 'tracking_number' &&
        key !== 'courier_name'
      );
    })
    .map((c) => {
      const key = String(c.key || '').trim();
      if (key === 'required_date' || key === 'requirement_date') {
        return {
          ...c,
          key: 'eta',
          label: 'ETA',
          type: (c.type as string) || 'date',
        } as T;
      }
      return c;
    });

  // If remapping created a duplicate eta, keep the first.
  const seen = new Set<string>();
  const cleaned = remapped.filter((c) => {
    const key = String(c.key || '').trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const keys = new Set(cleaned.map((c) => String(c.key || '').trim()).filter(Boolean));
  const extras = INVENTORY_REQUEST_TRACKING_COLUMNS.filter((c) => !keys.has(c.key));
  return [...cleaned, ...extras];
}

export function shouldShowShipmentTrackingSection(
  requestStatus: unknown,
  data?: Record<string, unknown> | null
): boolean {
  const status = String(requestStatus ?? '')
    .trim()
    .toUpperCase();
  if (SHIPMENT_TRACKING_VISIBLE_REQUEST_STATUSES.has(status)) return true;
  if (!data) return false;
  const hasTracking =
    Boolean(String(data.tracking_number ?? '').trim()) ||
    Boolean(String(data.tracking_link ?? '').trim()) ||
    Boolean(String(data.courier_name ?? '').trim()) ||
    (Boolean(String(data.shipment_status ?? '').trim()) &&
      String(data.shipment_status).toUpperCase() !== DEFAULT_SHIPMENT_STATUS);
  return hasTracking;
}
