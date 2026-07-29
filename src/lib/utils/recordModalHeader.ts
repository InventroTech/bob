/**
 * Shared record modal header line: request #, item name (`data.item_name_freeform`), date.
 * Used by record table modals (detail, form edit, receive shipment).
 */

import { formatCalendarDate } from '@/lib/utils/timeUtils';

export type RecordModalTitleInput = {
  id?: number | string | null;
  created_at?: string | null;
  data?: Record<string, unknown> | null;
};

function formatModalHeaderDate(raw: unknown): string {
  if (raw == null || raw === '') return '—';
  const formatted = formatCalendarDate(String(raw).trim());
  return !formatted || formatted === 'N/A' || formatted === 'Invalid date' ? '—' : formatted;
}

function dateTimeAttrFromRaw(raw: unknown): string | undefined {
  if (raw == null || raw === '') return undefined;
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString();
  return undefined;
}

export type RecordModalTitleParts = {
  idNum: string;
  itemName: string;
  dateDisplay: string;
  dateTimeAttr?: string;
};

/**
 * Parsed title segments for layout + plain string (`buildRecordModalTitle`).
 * Order: Request Number → Item → Date.
 */
export function getRecordModalTitleParts(
  record: RecordModalTitleInput | null | undefined,
): RecordModalTitleParts | null {
  if (!record || record.id === null || record.id === undefined || record.id === '') return null;

  const idNum = String(record.id);
  const data =
    record.data && typeof record.data === 'object' && !Array.isArray(record.data)
      ? (record.data as Record<string, unknown>)
      : {};
  const flat = record as Record<string, unknown>;
  const itemName =
    String(data.item_name_freeform ?? flat.item_name_freeform ?? '')
      .trim() || '—';
  const dateRaw = data.request_date ?? record.created_at ?? '';
  const dateDisplay = formatModalHeaderDate(dateRaw);
  const dateTimeAttr = dateTimeAttrFromRaw(dateRaw);

  return { idNum, itemName, dateDisplay, dateTimeAttr };
}

/**
 * Plain string title (e.g. aria-label, tests): `#id, item name, date`.
 */
export function buildRecordModalTitle(record: RecordModalTitleInput | null | undefined): string {
  const parts = getRecordModalTitleParts(record);
  if (!parts) return 'Record';
  return `#${parts.idNum} | ${parts.itemName} · ${parts.dateDisplay}`;
}
