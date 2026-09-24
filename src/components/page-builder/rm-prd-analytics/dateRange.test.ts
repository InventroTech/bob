import { describe, expect, it } from 'vitest';
import { daysInRange, filterByDateRange, resolveDateRange } from './dateRange';

describe('resolveDateRange', () => {
  it('Today spans from local midnight to now', () => {
    const bounds = resolveDateRange('Today', '', '');
    expect(bounds).not.toBeNull();
    const from = new Date(bounds!.from);
    expect(from.getHours()).toBe(0);
    expect(from.getMinutes()).toBe(0);
    expect(bounds!.to).toBeLessThanOrEqual(Date.now());
    expect(bounds!.to).toBeGreaterThanOrEqual(bounds!.from);
  });

  it('Custom with no dates chosen yet returns null ("show nothing")', () => {
    expect(resolveDateRange('Custom', '', '')).toBeNull();
    expect(resolveDateRange('Custom', '2026-09-01', '')).toBeNull();
  });

  it('Custom with both dates set spans full days inclusive', () => {
    const bounds = resolveDateRange('Custom', '2026-09-01', '2026-09-03');
    expect(bounds).not.toBeNull();
    expect(new Date(bounds!.from).getDate()).toBe(1);
    expect(new Date(bounds!.to).getDate()).toBe(3);
    expect(new Date(bounds!.to).getHours()).toBe(23);
  });

  it('an unrecognized range returns null', () => {
    expect(resolveDateRange('Not a range', '', '')).toBeNull();
  });
});

describe('daysInRange', () => {
  it('is 1 for Today and Yesterday', () => {
    expect(daysInRange(resolveDateRange('Today', '', ''))).toBe(1);
    expect(daysInRange(resolveDateRange('Yesterday', '', ''))).toBe(1);
  });

  it('is 7 for Last 7 days and 30 for Last 30 days', () => {
    expect(daysInRange(resolveDateRange('Last 7 days', '', ''))).toBe(7);
    expect(daysInRange(resolveDateRange('Last 30 days', '', ''))).toBe(30);
  });

  it('counts a Custom range inclusively', () => {
    // Sep 1 through Sep 3 is 3 calendar days: 1st, 2nd, 3rd
    expect(daysInRange(resolveDateRange('Custom', '2026-09-01', '2026-09-03'))).toBe(3);
    // same day picked for both ends is still 1 day
    expect(daysInRange(resolveDateRange('Custom', '2026-09-01', '2026-09-01'))).toBe(1);
  });

  it('is 1 when there are no bounds (nothing to scale)', () => {
    expect(daysInRange(null)).toBe(1);
  });
});

describe('filterByDateRange', () => {
  it('passes everything through when bounds is null', () => {
    const rows = [{ startedAt: '2020-01-01T00:00:00Z' }];
    expect(filterByDateRange(rows, null)).toEqual(rows);
  });

  it('keeps only rows whose startedAt falls within [from, to] inclusive', () => {
    const bounds = { from: Date.UTC(2026, 8, 21, 0, 0, 0), to: Date.UTC(2026, 8, 21, 23, 59, 59) };
    const rows = [
      { startedAt: '2026-09-20T23:59:59.000Z' }, // just before
      { startedAt: '2026-09-21T00:00:00.000Z' }, // exact lower bound
      { startedAt: '2026-09-21T12:00:00.000Z' }, // inside
      { startedAt: '2026-09-22T00:00:00.000Z' }, // just after
    ];
    expect(filterByDateRange(rows, bounds).map((r) => r.startedAt)).toEqual([
      '2026-09-21T00:00:00.000Z',
      '2026-09-21T12:00:00.000Z',
    ]);
  });
});
