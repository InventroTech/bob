const STATUS_COLOR_CLASS_MAP: Record<string, string> = {
  NEW_REQUEST: 'border-amber-300 bg-amber-50 text-amber-900',
  REQ_TO_VERIFY: 'border-violet-200 bg-violet-50 text-violet-800',
  VENDOR_IDENTIFIED: 'border-sky-200 bg-sky-50 text-sky-700',
  IN_CART: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  IN_SHIPPING: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  ON_HOLD: 'border-amber-300 bg-amber-50 text-amber-800',
  REJECTED: 'border-rose-200 bg-rose-50 text-rose-700',
};

/** shipment_status chip tones (separate from request status). */
const SHIPMENT_STATUS_COLOR_CLASS_MAP: Record<string, string> = {
  NOT_SHIPPED: 'border-sky-200 bg-sky-50 text-sky-800',
  ORDERED: 'border-sky-200 bg-sky-50 text-sky-800',
  IN_TRANSIT: 'border-blue-200 bg-blue-50 text-blue-700',
  OUT_FOR_DELIVERY: 'border-orange-200 bg-orange-50 text-orange-800',
  DELIVERED: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  EXCEPTION: 'border-rose-200 bg-rose-50 text-rose-700',
  'N/A': 'border-orange-200 bg-orange-50 text-orange-800',
};

const DEFAULT_STATUS_CLASS = 'border-amber-200 bg-amber-50 text-amber-800';

function normalizeStatus(status: unknown): string {
  return String(status ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_');
}

export function getInventoryStatusToneClass(status: unknown): string {
  const normalized = normalizeStatus(status);
  if (!normalized) return DEFAULT_STATUS_CLASS;
  return STATUS_COLOR_CLASS_MAP[normalized] ?? DEFAULT_STATUS_CLASS;
}

export function getShipmentStatusToneClass(status: unknown): string {
  const normalized = normalizeStatus(status);
  if (!normalized) return SHIPMENT_STATUS_COLOR_CLASS_MAP['N/A'];
  return SHIPMENT_STATUS_COLOR_CLASS_MAP[normalized] ?? DEFAULT_STATUS_CLASS;
}

export function getInventoryStatusLabel(status: unknown): string {
  const raw = String(status ?? '').trim();
  if (!raw) return '—';
  const normalized = normalizeStatus(raw);
  return normalized ? normalized.replace(/_/g, ' ') : '—';
}

export function getShipmentStatusLabel(status: unknown): string {
  const raw = String(status ?? '').trim();
  if (!raw || raw === '—' || raw.toUpperCase() === 'N/A') return 'N/A';
  const normalized = normalizeStatus(raw);
  // Match All Request mock: keep underscored uppercase labels (IN_TRANSIT, etc.).
  return normalized || 'N/A';
}

/** Table chip label for request status — keep underscored form like IN_CART. */
export function getInventoryStatusChipLabel(status: unknown): string {
  const raw = String(status ?? '').trim();
  if (!raw || raw === '—') return '—';
  return normalizeStatus(raw) || '—';
}
