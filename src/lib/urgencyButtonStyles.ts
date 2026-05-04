import { cn } from '@/lib/utils';

/** Urgency / priority values we style distinctly in tables and modals. */
export function isUrgencyToneValue(raw: string | undefined | null): boolean {
  const v = String(raw ?? '')
    .trim()
    .toUpperCase();
  return v === 'CRITICAL' || v === 'STANDARD';
}

/**
 * Tailwind classes for Critical vs Standard urgency buttons.
 * When `selected` is true, use filled style; otherwise colored outline.
 */
export function getUrgencyToneButtonClassNames(statusValue: string, selected: boolean): string {
  const v = String(statusValue ?? '')
    .trim()
    .toUpperCase();
  if (v === 'CRITICAL') {
    return selected
      ? 'border-orange-600 bg-orange-600 text-white hover:bg-orange-700 hover:text-white dark:border-orange-500 dark:bg-orange-600'
      : 'border-orange-400/90 text-orange-900 bg-orange-50/90 hover:bg-orange-100 dark:border-orange-600/80 dark:text-orange-100 dark:bg-orange-950/50 dark:hover:bg-orange-950/80';
  }
  if (v === 'STANDARD') {
    return selected
      ? 'border-sky-600 bg-sky-600 text-white hover:bg-sky-700 hover:text-white dark:border-sky-500 dark:bg-sky-600'
      : 'border-sky-400/90 text-sky-900 bg-sky-50/90 hover:bg-sky-100 dark:border-sky-600/80 dark:text-sky-100 dark:bg-sky-950/50 dark:hover:bg-sky-950/80';
  }
  return '';
}

/** Merges urgency colors when value is CRITICAL/STANDARD; otherwise returns only `extra`. */
export function urgencyToneButtonClassName(statusValue: string, selected: boolean, extra?: string): string {
  const tone = getUrgencyToneButtonClassNames(statusValue, selected);
  if (!tone) return (extra ?? '').trim();
  return cn('font-medium', tone, extra);
}

/**
 * Read-only urgency display: bordered card (label is rendered separately by the form).
 * Matches inventory “field card” look: light panel + bold value.
 */
export function urgencyReadonlyFieldCardClassName(raw: string | undefined | null): string {
  const v = String(raw ?? '').trim().toUpperCase();
  if (v === 'CRITICAL') {
    return 'border-orange-200 bg-orange-50/80 dark:border-orange-800/80 dark:bg-orange-950/35';
  }
  if (v === 'STANDARD') {
    return 'border-sky-200 bg-sky-50/80 dark:border-sky-800/80 dark:bg-sky-950/35';
  }
  return 'border-border bg-background';
}

export function urgencyReadonlyValueTextClassName(raw: string | undefined | null): string {
  const v = String(raw ?? '').trim().toUpperCase();
  if (v === 'CRITICAL') {
    return 'text-orange-950 dark:text-orange-50';
  }
  if (v === 'STANDARD') {
    return 'text-sky-950 dark:text-sky-50';
  }
  return 'text-foreground';
}
