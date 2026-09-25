import { describe, expect, it } from 'vitest';
import { filterByDateRange, resolveDateRange, toUtcDateParam } from './dateRange';

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

describe('toUtcDateParam', () => {
  it('formats an epoch ms instant as a YYYY-MM-DD UTC date string', () => {
    expect(toUtcDateParam(Date.UTC(2026, 8, 21, 15, 30, 0))).toBe('2026-09-21');
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
