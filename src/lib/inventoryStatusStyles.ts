const STATUS_COLOR_CLASS_MAP: Record<string, string> = {
  NEW_REQUEST: 'border-sky-200 bg-sky-50 text-sky-800',
  'APPROVED(1/2)': 'border-violet-200 bg-violet-50 text-violet-800',
  'APPROVED(2/2)': 'border-emerald-200 bg-emerald-50 text-emerald-800',
  IN_CART: 'border-indigo-200 bg-indigo-50 text-indigo-800',
  PAID: 'border-green-200 bg-green-50 text-green-800',
};

const DEFAULT_STATUS_CLASS = 'border-amber-200 bg-amber-50 text-amber-800';

function normalizeStatus(status: unknown): string {
  return String(status ?? '')
    .trim()
    .toUpperCase();
}

export function getInventoryStatusToneClass(status: unknown): string {
  const normalized = normalizeStatus(status);
  if (!normalized) return DEFAULT_STATUS_CLASS;
  return STATUS_COLOR_CLASS_MAP[normalized] ?? DEFAULT_STATUS_CLASS;
}

export function getInventoryStatusLabel(status: unknown): string {
  const normalized = normalizeStatus(status);
  return normalized ? normalized.replace(/_/g, ' ') : '—';
}
