/** Priority from Request Date vs Requirement Date (required_date). */

export type InventoryPriority = {
  value: 'HIGH' | 'MEDIUM' | 'LOW';
  label: string;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseDateOnly(value: string): Date | null {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    const date = new Date(year, month, day);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const fallback = new Date(trimmed);
  if (Number.isNaN(fallback.getTime())) return null;
  return new Date(fallback.getFullYear(), fallback.getMonth(), fallback.getDate());
}

/**
 * High   = Request Date same as Requirement Date (or requirement already due)
 * Middle = Requirement Date is 2–5 days after Request Date
 * Low    = Requirement Date is more than 5 days after Request Date
 */
export function calculateInventoryPriority(
  requestDate: string,
  requiredDate: string
): InventoryPriority | null {
  const start = parseDateOnly(requestDate);
  const end = parseDateOnly(requiredDate);
  if (!start || !end) return null;

  const diffDays = Math.round((end.getTime() - start.getTime()) / MS_PER_DAY);

  if (diffDays <= 0) {
    return { value: 'HIGH', label: 'High (Same day)' };
  }
  if (diffDays <= 5) {
    return { value: 'MEDIUM', label: 'Middle (2-5 day)' };
  }
  return { value: 'LOW', label: 'Low (More than 5 days)' };
}

/** Resolve priority label from stored value, or from the two date fields on a row. */
export function resolvePriorityFromRow(row: any, storedValue?: unknown): string {
  const requestDate =
    row?.data?.request_date ?? row?.request_date ?? '';
  const requiredDate =
    row?.data?.required_date ?? row?.required_date ?? '';

  const calculated = calculateInventoryPriority(String(requestDate), String(requiredDate));
  if (calculated) return calculated.label;

  return formatInventoryPriorityLabel(storedValue);
}

export function formatInventoryPriorityLabel(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '—';
  const upper = raw.toUpperCase();
  const lower = raw.toLowerCase();
  if (upper === 'HIGH' || lower.startsWith('high') || upper === 'CRITICAL') {
    return 'High (Same day)';
  }
  if (
    upper === 'MEDIUM' ||
    lower.startsWith('medium') ||
    lower.startsWith('middle')
  ) {
    return 'Middle (2-5 day)';
  }
  if (upper === 'LOW' || lower.startsWith('low') || upper === 'STANDARD') {
    return 'Low (More than 5 days)';
  }
  return raw;
}
