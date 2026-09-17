export type NumberRangePreset = {
  id: string;
  label: string;
  min?: number;
  max?: number;
};

export type RelativeDatePreset = {
  id: string;
  label: string;
  days?: number;
  months?: number;
};

export const DEFAULT_PRICE_RANGE_PRESETS: NumberRangePreset[] = [
  { id: '0-500', label: '0-500', min: 0, max: 500 },
  { id: '500-1000', label: '500-1000', min: 500, max: 1000 },
  { id: '1000-5000', label: '1000-5000', min: 1000, max: 5000 },
];

export const DEFAULT_RELATIVE_DATE_PRESETS: RelativeDatePreset[] = [
  { id: 'last_3_days', label: 'Last 3 days', days: 3 },
  { id: 'last_7_days', label: 'Last 7 days', days: 7 },
  { id: 'last_15_days', label: 'Last 15 days', days: 15 },
  { id: 'last_1_month', label: 'Last 1 month', months: 1 },
];

export function numberRangePresetLabel(preset: NumberRangePreset): string {
  const label = String(preset.label || '').trim();
  if (label && !/^range_\d+$/.test(label)) return label;
  if (preset.min != null && preset.max != null) return `${preset.min}-${preset.max}`;
  if (preset.min != null) return `${preset.min}+`;
  if (preset.max != null) return `≤ ${preset.max}`;
  return 'Untitled';
}

export function relativeDatePresetLabel(preset: RelativeDatePreset): string {
  const label = String(preset.label || '').trim();
  if (label && !/^date_\d+$/.test(label)) return label;
  const months = Number(preset.months);
  const days = Number(preset.days);
  if (Number.isFinite(months) && months > 0 && !(Number.isFinite(days) && days > 0 && preset.days != null && preset.months == null)) {
    if (preset.months != null && preset.days == null) {
      return months === 1 ? 'Last 1 month' : `Last ${months} months`;
    }
  }
  if (Number.isFinite(days) && days > 0) {
    return `Last ${days} days`;
  }
  if (Number.isFinite(months) && months > 0) {
    return months === 1 ? 'Last 1 month' : `Last ${months} months`;
  }
  return 'Untitled';
}

export function formatLocalYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Inclusive calendar window ending today (last 3 days = today and the 2 days before). */
export function resolveRelativeDateRange(
  preset: RelativeDatePreset,
  now: Date = new Date()
): { start: Date; end: Date } {
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  if (preset.months && preset.months > 0) {
    start.setMonth(start.getMonth() - preset.months);
  } else if (preset.days && preset.days > 0) {
    start.setDate(start.getDate() - (preset.days - 1));
  }
  return { start, end };
}

export function selectedPresetIds(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => String(v)).filter(Boolean);
  }
  if (value && typeof value === 'object') {
    const preset = (value as { preset?: unknown }).preset;
    if (typeof preset === 'string' && preset) return [preset];
  }
  if (typeof value === 'string' && value && value !== '__none__') return [value];
  return [];
}

export function findNumberRangePreset(
  presets: NumberRangePreset[] | undefined,
  value: unknown
): NumberRangePreset | undefined {
  if (!presets?.length || value == null) return undefined;
  const ids = selectedPresetIds(value);
  if (ids.length) return presets.find((p) => p.id === ids[0]);
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const range = value as { min?: unknown; max?: unknown };
    const min = range.min === '' || range.min == null ? undefined : Number(range.min);
    const max = range.max === '' || range.max == null ? undefined : Number(range.max);
    return presets.find((p) => p.min === min && p.max === max);
  }
  return undefined;
}

export function findRelativeDatePreset(
  presets: RelativeDatePreset[] | undefined,
  value: unknown
): RelativeDatePreset | undefined {
  if (!presets?.length || value == null) return undefined;
  const ids = selectedPresetIds(value);
  if (!ids.length) return undefined;
  return presets.find((p) => p.id === ids[0]);
}

export function resolveNumberRangeBounds(
  value: unknown,
  presets?: NumberRangePreset[]
): { min?: number; max?: number } {
  const ids = selectedPresetIds(value);
  if (ids.length && presets?.length) {
    const selected = presets.find((p) => p.id === ids[0]);
    if (!selected) return {};
    return { min: selected.min, max: selected.max };
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const range = value as { min?: unknown; max?: unknown };
    const min =
      range.min !== '' && range.min != null && !isNaN(Number(range.min))
        ? Number(range.min)
        : undefined;
    const max =
      range.max !== '' && range.max != null && !isNaN(Number(range.max))
        ? Number(range.max)
        : undefined;
    return { min, max };
  }
  return {};
}

export function resolveDateRangeBounds(
  value: unknown,
  presets?: RelativeDatePreset[],
  now: Date = new Date()
): { start?: Date; end?: Date } {
  const preset = findRelativeDatePreset(presets, value);
  if (preset) {
    return resolveRelativeDateRange(preset, now);
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const range = value as { start?: unknown; end?: unknown };
    const start =
      range.start instanceof Date
        ? range.start
        : range.start
          ? new Date(range.start as string)
          : undefined;
    const end =
      range.end instanceof Date
        ? range.end
        : range.end
          ? new Date(range.end as string)
          : undefined;
    return {
      start: start && !isNaN(start.getTime()) ? start : undefined,
      end: end && !isNaN(end.getTime()) ? end : undefined,
    };
  }
  return {};
}

export function matchNumberPresetFromParams(
  presets: NumberRangePreset[] | undefined,
  minValue: string | null,
  maxValue: string | null
): NumberRangePreset | undefined {
  if (!presets?.length) return undefined;
  const min = minValue == null || minValue === '' ? undefined : Number(minValue);
  const max = maxValue == null || maxValue === '' ? undefined : Number(maxValue);
  return presets.find((p) => p.min === min && p.max === max);
}

export function matchRelativeDatePresetFromParams(
  presets: RelativeDatePreset[] | undefined,
  startValue: string | null,
  endValue: string | null,
  now: Date = new Date()
): RelativeDatePreset | undefined {
  if (!presets?.length || !startValue) return undefined;
  const today = formatLocalYmd(now);
  if (endValue && endValue !== today) return undefined;
  return presets.find((preset) => {
    const { start } = resolveRelativeDateRange(preset, now);
    return formatLocalYmd(start) === startValue;
  });
}
