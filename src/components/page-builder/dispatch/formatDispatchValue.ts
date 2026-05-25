import type { DispatchFieldType } from './dispatchFieldSections';

/** Shown in detail cards and list when a field value is null or empty. */
export const DISPATCH_NO_DATA = 'No Data Available';

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** Format ISO / sheet dates for mobile display (e.g. 14-JAN-26). */
export function formatDispatchDate(value: unknown): string {
  if (value === null || value === undefined || value === '') return DISPATCH_NO_DATA;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^\d{2}-[A-Z]{3}-\d{2,4}$/i.test(trimmed)) return trimmed.toUpperCase();
    const d = new Date(trimmed);
    if (!Number.isNaN(d.getTime())) {
      const yy = String(d.getFullYear()).slice(-2);
      return `${pad2(d.getDate())}-${MONTHS[d.getMonth()]}-${yy}`;
    }
    return trimmed;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) {
      const yy = String(d.getFullYear()).slice(-2);
      return `${pad2(d.getDate())}-${MONTHS[d.getMonth()]}-${yy}`;
    }
  }
  return String(value);
}

export function formatDispatchCurrency(value: unknown): string {
  if (value === null || value === undefined || value === '') return DISPATCH_NO_DATA;
  const n = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''));
  if (!Number.isFinite(n)) return String(value);
  return `₹ ${n.toLocaleString('en-IN')}/-`;
}

export function formatDispatchBool(value: unknown): { text: string; positive: boolean } {
  if (value === true || value === 'true' || value === 'TRUE' || value === 'Yes' || value === 'yes') {
    return { text: 'Yes', positive: true };
  }
  if (value === false || value === 'false' || value === 'FALSE' || value === 'No' || value === 'no') {
    return { text: 'No', positive: false };
  }
  const s = value == null ? '' : String(value).trim();
  if (!s) return { text: DISPATCH_NO_DATA, positive: false };
  const lower = s.toLowerCase();
  if (['sent', 'done', 'yes', 'received', 'complete', 'completed'].some((w) => lower.includes(w))) {
    return { text: s, positive: true };
  }
  return { text: s, positive: false };
}

export function formatDispatchValue(value: unknown, type: DispatchFieldType = 'str'): string {
  switch (type) {
    case 'date':
      return formatDispatchDate(value);
    case 'currency':
      return formatDispatchCurrency(value);
    case 'bool':
      return formatDispatchBool(value).text;
    case 'time':
      return value == null || value === '' ? DISPATCH_NO_DATA : String(value);
    default:
      return value == null || value === '' ? DISPATCH_NO_DATA : String(value);
  }
}

export function getRecordData(record: { data?: Record<string, unknown> }): Record<string, unknown> {
  return record?.data && typeof record.data === 'object' ? record.data : {};
}
