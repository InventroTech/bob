const STATUS_COLOR_CLASS_MAP: Record<string, string> = {
  NEW_REQUEST: 'border-sky-200 bg-sky-50 text-sky-800',
  REQ_TO_VERIFY: 'border-violet-200 bg-violet-50 text-violet-800',
  VENDOR_IDENTIFIED: 'border-sky-200 bg-sky-50 text-sky-800',
  IN_SHIPPING: 'border-cyan-200 bg-cyan-50 text-cyan-800',
  ON_HOLD: 'border-amber-200 bg-amber-50 text-amber-900',
  REJECTED: 'border-rose-200 bg-rose-50 text-rose-800',
};

/** shipment_status chip tones (separate from request status). */
const SHIPMENT_STATUS_COLOR_CLASS_MAP: Record<string, string> = {
  NOT_SHIPPED: 'border-slate-200 bg-slate-50 text-slate-700',
  ORDERED: 'border-sky-200 bg-sky-50 text-sky-800',
  IN_TRANSIT: 'border-indigo-200 bg-indigo-50 text-indigo-800',
  OUT_FOR_DELIVERY: 'border-amber-200 bg-amber-50 text-amber-900',
  DELIVERED: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  EXCEPTION: 'border-rose-200 bg-rose-50 text-rose-800',
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
  if (!normalized) return DEFAULT_STATUS_CLASS;
  return SHIPMENT_STATUS_COLOR_CLASS_MAP[normalized] ?? DEFAULT_STATUS_CLASS;
}

export function getInventoryStatusLabel(status: unknown): string {
  const raw = String(status ?? '').trim();
  if (!raw) return '—';
  const normalized = normalizeStatus(raw);
  return normalized ? normalized.replace(/_/g, ' ') : '—';
}

export function getShipmentStatusLabel(status: unknown): string {
  return getInventoryStatusLabel(status);
}
