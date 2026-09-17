import { describe, expect, it } from 'vitest';
import {
  formatLocalYmd,
  resolveRelativeDateRange,
  matchRelativeDatePresetFromParams,
  DEFAULT_RELATIVE_DATE_PRESETS,
  DEFAULT_PRICE_RANGE_PRESETS,
  matchNumberPresetFromParams,
} from './rangePresets';

describe('resolveRelativeDateRange', () => {
  it('last 3 days includes today and two previous calendar days', () => {
    const now = new Date(2026, 8, 17);
    const { start, end } = resolveRelativeDateRange(
      { id: 'last_3_days', label: 'Last 3 days', days: 3 },
      now
    );
    expect(formatLocalYmd(start)).toBe('2026-09-15');
    expect(formatLocalYmd(end)).toBe('2026-09-17');
  });

  it('last 1 month subtracts one month', () => {
    const now = new Date(2026, 8, 17);
    const { start, end } = resolveRelativeDateRange(
      { id: 'last_1_month', label: 'Last 1 month', months: 1 },
      now
    );
    expect(formatLocalYmd(start)).toBe('2026-08-17');
    expect(formatLocalYmd(end)).toBe('2026-09-17');
  });
});

describe('match presets from params', () => {
  it('matches price buckets', () => {
    expect(matchNumberPresetFromParams(DEFAULT_PRICE_RANGE_PRESETS, '500', '1000')?.id).toBe(
      '500-1000'
    );
  });

  it('matches last 7 days when start is today minus 6 days', () => {
    const now = new Date(2026, 8, 17);
    const matched = matchRelativeDatePresetFromParams(
      DEFAULT_RELATIVE_DATE_PRESETS,
      '2026-09-11',
      '2026-09-17',
      now
    );
    expect(matched?.id).toBe('last_7_days');
  });
});
