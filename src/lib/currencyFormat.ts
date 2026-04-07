/**
 * Shared price/currency display and input helpers for forms and modals.
 * Uses en-US grouping (,) and period (.) for decimals.
 */

/** Finished display: thousands separators + exactly 2 fraction digits. */
export function formatCurrencyDisplay(val: string | number | '' | null | undefined): string {
  if (val === '' || val === undefined || val === null) return '';
  const n = typeof val === 'number' ? val : Number(String(val).replace(/,/g, ''));
  if (!Number.isFinite(n)) return '';
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Parse user input (with optional commas) to a non-negative number or empty. */
export function parseCurrencyInput(str: string): number | '' {
  const cleaned = str.replace(/,/g, '').trim();
  if (cleaned === '' || cleaned === '.') return '';
  const parts = cleaned.split('.');
  const normalized = parts.length > 2 ? `${parts[0]}.${parts[1]}` : cleaned;
  const n = Number(normalized);
  return Number.isFinite(n) && n >= 0 ? n : '';
}

/**
 * Formats price as the user types: comma separators on the integer part, up to 2 decimal digits.
 * Does not force ".00" so partial entry like "1." stays valid.
 */
export function formatCurrencyInputLive(raw: string): { display: string; value: number | '' } {
  const cleaned = raw.replace(/[^\d.]/g, '');
  if (cleaned === '') return { display: '', value: '' };

  const firstDot = cleaned.indexOf('.');
  const intPartRaw = firstDot === -1 ? cleaned : cleaned.slice(0, firstDot);
  const decPart = firstDot === -1 ? '' : cleaned.slice(firstDot + 1).replace(/\./g, '').slice(0, 2);

  let intDigits = intPartRaw.replace(/\D/g, '');
  if (intDigits.length > 1) intDigits = intDigits.replace(/^0+(?=\d)/, '');

  const intFormatted = intDigits === '' ? '' : Number(intDigits).toLocaleString('en-US');

  let display: string;
  if (firstDot === -1) {
    display = intFormatted;
  } else if (decPart === '' && cleaned.endsWith('.')) {
    display = (intFormatted || '0') + '.';
  } else {
    display = (intFormatted || '0') + '.' + decPart;
  }

  let parseStr: string;
  if (firstDot === -1) {
    parseStr = intDigits === '' ? '0' : intDigits;
  } else {
    const intForNum = intDigits === '' ? '0' : intDigits;
    parseStr = decPart === '' && cleaned.endsWith('.') ? intForNum + '.' : intForNum + '.' + decPart;
  }

  const n = parseFloat(parseStr);
  const value = Number.isFinite(n) && n >= 0 ? n : '';
  return { display, value };
}

/** Column / field keys that represent money amounts for table + modal display. */
export const PRICE_FIELD_KEYS = new Set([
  'total_price',
  'unit_price',
  'estimated_cost',
  'default_cost_per_unit',
]);

export function formatPriceFieldRead(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  const n = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''));
  if (!Number.isFinite(n)) return String(value);
  return formatCurrencyDisplay(n);
}

/** Same as read display but empty string when missing (for controlled inputs). */
export function formatPriceForInput(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  const n = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''));
  if (!Number.isFinite(n)) return '';
  return formatCurrencyDisplay(n);
}
