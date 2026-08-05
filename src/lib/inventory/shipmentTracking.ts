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

/** Map AfterShip slugs / labels onto our Courier select values. */
export function normalizeCourierLabel(value: string | null | undefined): string | null {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const key = raw.toLowerCase().replace(/[\s_]+/g, '-');
  if (key.startsWith('amazon')) return 'Amazon';
  if (key.startsWith('fedex')) return 'FedEx';
  if (key === 'dhl' || key.startsWith('dhl-')) return 'DHL';
  if (key.includes('bluedart') || key.includes('blue-dart')) return 'BlueDart';
  if (key.includes('delhivery')) return 'Delhivery';
  if (key.includes('dtdc')) return 'DTDC';
  if (key.includes('shiprocket')) return 'Shiprocket';
  if (key.includes('india-post') || key.includes('indiapost')) return 'India Post';
  return raw;
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
