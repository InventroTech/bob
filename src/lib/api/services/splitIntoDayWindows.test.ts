import { describe, expect, it, vi } from 'vitest';

vi.mock('../client', () => ({ apiClient: { get: vi.fn() } }));

import { splitIntoDayWindows } from './rmActivity';

describe('splitIntoDayWindows', () => {
  it('splits an inclusive range into every day, oldest first', () => {
    expect(splitIntoDayWindows('2026-09-28', '2026-10-02')).toEqual([
      '2026-09-28',
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
    ]);
  });

  it('returns 31 days for the 30-day dashboard range from Sentry', () => {
    const days = splitIntoDayWindows('2026-09-28', '2026-10-28');
    expect(days).toHaveLength(31);
    expect(days?.[0]).toBe('2026-09-28');
    expect(days?.[30]).toBe('2026-10-28');
  });

  it('returns a single day when from and to are the same', () => {
    expect(splitIntoDayWindows('2026-10-28', '2026-10-28')).toEqual(['2026-10-28']);
  });

  it('crosses month and leap-year boundaries correctly', () => {
    expect(splitIntoDayWindows('2028-02-28', '2028-03-01')).toEqual(['2028-02-28', '2028-02-29', '2028-03-01']);
    expect(splitIntoDayWindows('2026-12-31', '2027-01-01')).toEqual(['2026-12-31', '2027-01-01']);
  });

  it('returns null when either date is missing', () => {
    expect(splitIntoDayWindows(undefined, '2026-10-28')).toBeNull();
    expect(splitIntoDayWindows('2026-10-28', undefined)).toBeNull();
    expect(splitIntoDayWindows()).toBeNull();
  });

  it('returns null for invalid dates or a reversed range', () => {
    expect(splitIntoDayWindows('28-10-2026', '2026-10-28')).toBeNull();
    expect(splitIntoDayWindows('2026-10-28', 'not-a-date')).toBeNull();
    expect(splitIntoDayWindows('2026-10-28', '2026-10-01')).toBeNull();
  });
});
