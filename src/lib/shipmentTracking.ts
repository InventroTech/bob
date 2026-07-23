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

/** Request statuses where the shipment tracking editor is shown. */
export const SHIPMENT_TRACKING_VISIBLE_REQUEST_STATUSES = new Set([
  'ORDERED',
  'IN_SHIPPING',
  'FULFILLED',
  // Legacy / transitional
  'PAID',
  'PAYMENT_PENDING',
  'VENDOR_IDENTIFIED',
  'IN_CART',
  'APPROVED(2/2)',
]);

export type ShipmentTrackingFields = {
  tracking_number: string | null;
  tracking_link: string | null;
  courier_name: string | null;
  shipment_status: ShipmentStatus;
  eta: string | null;
  tracking_updated_at: string | null;
};

/** Empty defaults written on inventory_request create. */
export function emptyShipmentTrackingFields(): ShipmentTrackingFields {
  return {
    tracking_number: null,
    tracking_link: null,
    courier_name: null,
    shipment_status: DEFAULT_SHIPMENT_STATUS,
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

    // Amazon progress tracker: packageId / trackingId in query
    if (host.includes('amazon.')) {
      const amazonId =
        params.get('packageId') ||
        params.get('trackingId') ||
        params.get('orderId') ||
        params.get('shipmentId');
      if (amazonId && String(amazonId).trim()) return String(amazonId).trim();
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
  { key: 'tracking_number', label: 'Tracking no', type: 'text' as const },
  { key: 'eta', label: 'ETA', type: 'date' as const },
  { key: 'courier_name', label: 'Courier', type: 'text' as const },
] as const;

/**
 * Merge tracking columns into an inventory_request table column list
 * without duplicating keys already configured.
 */
export function mergeInventoryTrackingColumns<T extends { key: string }>(
  columns: T[] | undefined | null
): Array<T | (typeof INVENTORY_REQUEST_TRACKING_COLUMNS)[number]> {
  const existing = Array.isArray(columns) ? [...columns] : [];
  const keys = new Set(existing.map((c) => String(c.key || '').trim()).filter(Boolean));
  const extras = INVENTORY_REQUEST_TRACKING_COLUMNS.filter((c) => !keys.has(c.key));
  return [...existing, ...extras];
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
