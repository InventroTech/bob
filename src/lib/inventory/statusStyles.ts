import {
  DEFAULT_STATUS_TONE_CLASS,
  getRequestStatusLabel,
  getRequestStatusToneClass,
} from '@/lib/inventory/requestStatus';

/** shipment_status chip tones (carrier detail; request status is the main chip). */
const SHIPMENT_STATUS_COLOR_CLASS_MAP: Record<string, string> = {
  NOT_SHIPPED: 'border-sky-200 bg-sky-50 text-sky-800',
  ORDERED: 'border-sky-200 bg-sky-50 text-sky-800',
  IN_TRANSIT: 'border-blue-200 bg-blue-50 text-blue-700',
  OUT_FOR_DELIVERY: 'border-orange-200 bg-orange-50 text-orange-800',
  DELIVERED: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  EXCEPTION: 'border-rose-200 bg-rose-50 text-rose-700',
  'N/A': 'border-orange-200 bg-orange-50 text-orange-800',
};

function normalizeStatus(status: unknown): string {
  return String(status ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_');
}

export function getInventoryStatusToneClass(status: unknown, entityType?: string | null): string {
  if (!normalizeStatus(status)) return DEFAULT_STATUS_TONE_CLASS;
  return getRequestStatusToneClass(status, entityType);
}

export function getShipmentStatusToneClass(status: unknown): string {
  const normalized = normalizeStatus(status);
  if (!normalized) return SHIPMENT_STATUS_COLOR_CLASS_MAP['N/A'];
  return SHIPMENT_STATUS_COLOR_CLASS_MAP[normalized] ?? DEFAULT_STATUS_TONE_CLASS;
}

export function getInventoryStatusLabel(status: unknown, entityType?: string | null): string {
  return getRequestStatusLabel(status, entityType);
}

export function getShipmentStatusLabel(status: unknown): string {
  const raw = String(status ?? '').trim();
  if (!raw || raw === '—' || raw.toUpperCase() === 'N/A') return 'N/A';
  const normalized = normalizeStatus(raw);
  return normalized ? normalized.replace(/_/g, ' ') : 'N/A';
}

/** Table chip label for request status (configured label, e.g. "In cart"). */
export function getInventoryStatusChipLabel(status: unknown, entityType?: string | null): string {
  return getInventoryStatusLabel(status, entityType);
}
