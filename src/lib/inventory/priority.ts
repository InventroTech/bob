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

/** Normalize a priority label/value to HIGH | MEDIUM | LOW when possible. */
export function normalizeInventoryPriorityLevel(value: unknown): 'HIGH' | 'MEDIUM' | 'LOW' | null {
  const raw = String(value ?? '').trim();
  if (!raw || raw === '—') return null;
  const upper = raw.toUpperCase();
  const lower = raw.toLowerCase();
  if (upper === 'HIGH' || lower.startsWith('high') || upper === 'CRITICAL') return 'HIGH';
  if (upper === 'MEDIUM' || lower.startsWith('medium') || lower.startsWith('middle')) return 'MEDIUM';
  if (upper === 'LOW' || lower.startsWith('low') || upper === 'STANDARD') return 'LOW';
  return null;
}

/** Card background/border for read-only Priority in request modals. */
export function inventoryPriorityFieldCardClassName(value: unknown): string {
  const level = normalizeInventoryPriorityLevel(value);
  if (level === 'HIGH') {
    return 'border-orange-200 bg-orange-50/80 dark:border-orange-800/80 dark:bg-orange-950/35';
  }
  if (level === 'MEDIUM') {
    return 'border-amber-200 bg-amber-50/80 dark:border-amber-800/80 dark:bg-amber-950/35';
  }
  if (level === 'LOW') {
    return 'border-sky-200 bg-sky-50/80 dark:border-sky-800/80 dark:bg-sky-950/35';
  }
  return 'border-border bg-card';
}

/** Text color for read-only Priority value. */
export function inventoryPriorityValueTextClassName(value: unknown): string {
  const level = normalizeInventoryPriorityLevel(value);
  if (level === 'HIGH') return 'text-orange-950 dark:text-orange-50';
  if (level === 'MEDIUM') return 'text-amber-950 dark:text-amber-50';
  if (level === 'LOW') return 'text-sky-950 dark:text-sky-50';
  return 'text-foreground';
}

/** Short table label: HIGH / MIDDLE / LOW (full meaning stays in tooltip). */
export function formatInventoryPriorityShortLabel(value: unknown): string {
  const level = normalizeInventoryPriorityLevel(value);
  if (level === 'HIGH') return 'HIGH';
  if (level === 'MEDIUM') return 'MIDDLE';
  if (level === 'LOW') return 'LOW';
  const raw = String(value ?? '').trim();
  return raw && raw !== '—' ? raw.toUpperCase() : '—';
}

/** Colored pill styles for Priority chips in tables (matches Status pill shape). */
export function inventoryPriorityChipClassName(value: unknown): string {
  const level = normalizeInventoryPriorityLevel(value);
  if (level === 'HIGH') {
    return 'border border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-100';
  }
  if (level === 'MEDIUM') {
    return 'border border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-100';
  }
  if (level === 'LOW') {
    return 'border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-100';
  }
  return 'border border-border bg-muted/60 text-muted-foreground';
}
