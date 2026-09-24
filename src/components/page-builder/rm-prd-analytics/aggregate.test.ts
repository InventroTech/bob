import { describe, expect, it } from 'vitest';
import { computeAdherenceByRm, computePerformanceByRm, computeTeamTotals, formatVsTarget } from './aggregate';
import type { RmActivityEvent } from './types';

function callTouch(overrides: Partial<RmActivityEvent> = {}): RmActivityEvent {
  return {
    id: 1,
    rmUserId: 'rm-1',
    rmName: 'Asha',
    managerName: 'Manager One',
    team: '',
    state: '1',
    eventType: 'CALL_TOUCH',
    leadRecordId: 101,
    updatedStatus: 'TRIAL_ACTIVATED',
    leadBucket: null,
    party: null,
    startedAt: '2026-09-21T04:00:00Z',
    endedAt: '2026-09-21T04:01:00Z',
    durationSeconds: 60,
    ...overrides,
  };
}

function breakEvent(
  eventType: 'BREAK_START' | 'BREAK_END',
  startedAt: string,
  overrides: Partial<RmActivityEvent> = {}
): RmActivityEvent {
  return {
    id: 1,
    rmUserId: 'rm-1',
    rmName: 'Asha',
    managerName: 'Manager One',
    team: '',
    state: '1',
    eventType,
    leadRecordId: null,
    updatedStatus: null,
    leadBucket: null,
    party: null,
    startedAt,
    endedAt: null,
    durationSeconds: null,
    ...overrides,
  };
}

describe('formatVsTarget', () => {
  it('formats a normal achieved/target ratio as a percentage', () => {
    expect(formatVsTarget(6, 9)).toBe('66.7%');
    expect(formatVsTarget(9, 9)).toBe('100.0%');
  });

  it('returns a dash instead of Infinity%/NaN% when target is 0', () => {
    expect(formatVsTarget(0, 0)).toBe('—');
    expect(formatVsTarget(5, 0)).toBe('—'); // would otherwise be Infinity%
  });
});

describe('computePerformanceByRm target', () => {
  it('is 0 (not a flat default) for an RM with no configured daily target', () => {
    const rows = computePerformanceByRm([callTouch()], {});
    expect(rows).toHaveLength(1);
    expect(rows[0].target).toBe(0);
  });

  it('uses each RM\'s own configured target', () => {
    const rows = computePerformanceByRm([callTouch({ rmUserId: 'rm-1' })], { 'rm-1': 12 });
    expect(rows[0].target).toBe(12);
  });

  it('scales a daily target by daysInRange for multi-day views (Last 7/30/Custom)', () => {
    const events = [callTouch({ rmUserId: 'rm-1' })];
    // target is a single day's goal — a 7-day view's achieved accumulates
    // over the whole window, so the target must scale to match or every RM
    // looks like they smashed a one-day goal
    expect(computePerformanceByRm(events, { 'rm-1': 9 }, 7)[0].target).toBe(63);
    expect(computePerformanceByRm(events, { 'rm-1': 9 }, 30)[0].target).toBe(270);
    // Today/Yesterday (daysInRange defaults to 1) leave it unscaled
    expect(computePerformanceByRm(events, { 'rm-1': 9 })[0].target).toBe(9);
  });
});

describe('computeTeamTotals target', () => {
  it('sums only the targets of RMs actually active (present) in the events', () => {
    const events = [
      callTouch({ rmUserId: 'rm-1', leadRecordId: 101 }),
      callTouch({ rmUserId: 'rm-2', leadRecordId: 102, id: 2 }),
    ];
    // rm-3 has a configured target but never appears in events — must not count
    const targets = { 'rm-1': 9, 'rm-2': 6, 'rm-3': 100 };
    expect(computeTeamTotals(events, targets).target).toBe(15);
  });

  it('scales team target by daysInRange too', () => {
    const events = [callTouch({ rmUserId: 'rm-1' })];
    expect(computeTeamTotals(events, { 'rm-1': 9 }, 7).target).toBe(63);
  });

  it('null leadRecordId does not collapse into a single counted unique lead', () => {
    const events = [
      callTouch({ leadRecordId: null, id: 1, updatedStatus: 'NOT_CONNECTED' }),
      callTouch({ leadRecordId: null, id: 2, updatedStatus: 'CALL_BACK' }),
      callTouch({ leadRecordId: 201, id: 3, updatedStatus: 'TRIAL_ACTIVATED' }),
    ];
    const totals = computeTeamTotals(events);
    // only the one real lead counts — the two null-lead calls must not
    // register as "1 unique lead" that then makes the disposition rates
    // fail to sum to 100%
    expect(totals.uniqueLeadsHandled).toBe(1);
  });
});

describe('breach counting boundary (>= 1500s, matches the touch report flag)', () => {
  it('counts a call at exactly 25:00 as a breach', () => {
    const rows = computeAdherenceByRm([callTouch({ durationSeconds: 1500 })]);
    expect(rows[0].breaches).toBe(1);
  });

  it('does not count a call one second under 25:00', () => {
    const rows = computeAdherenceByRm([callTouch({ durationSeconds: 1499 })]);
    expect(rows[0].breaches).toBe(0);
  });
});

describe('login span across multiple calendar days', () => {
  it('sums each day\'s own shift span instead of the wall-clock gap between days', () => {
    const events = [
      // day 1: a 1-hour shift
      callTouch({ id: 1, startedAt: '2026-09-20T04:00:00Z', endedAt: '2026-09-20T05:00:00Z' }),
      // day 2, a full day later: another 1-hour shift
      callTouch({ id: 2, startedAt: '2026-09-21T04:00:00Z', endedAt: '2026-09-21T05:00:00Z' }),
    ];
    const rows = computeAdherenceByRm(events);
    // correct: 1h (day 1) + 1h (day 2) = 2h. the old bug treated this as one
    // continuous shift from day-1's first event to day-2's last (~25h),
    // which also wrecks occupancy (handling ÷ login) since login balloons
    // while handling stays the real ~2h of actual call time
    expect(rows[0].loginHours).toBe('2h 00m');
  });
});

describe('break time = login − handling (BREAK_START/BREAK_END aren\'t written by any real flow yet)', () => {
  it('derives break time as the residual of login minus handling', () => {
    const events = [
      // a 2-hour shift with only 20 minutes of actual call time — the other
      // 100 minutes (waiting, gaps between calls) reads as break
      callTouch({ id: 1, startedAt: '2026-09-20T04:00:00Z', endedAt: '2026-09-20T04:05:00Z', durationSeconds: 300 }),
      callTouch({ id: 2, startedAt: '2026-09-20T05:45:00Z', endedAt: '2026-09-20T06:00:00Z', durationSeconds: 900 }),
    ];
    const rows = computeAdherenceByRm(events);
    expect(rows[0].loginHours).toBe('2h 00m'); // 04:00 to 06:00
    expect(rows[0].handlingHours).toBe('20m'); // 5m + 15m
    expect(rows[0].breakTime).toBe('1h 40m'); // 120m − 20m
  });

  it('never goes negative even if handling somehow exceeds the login envelope', () => {
    const events = [
      callTouch({ id: 1, startedAt: '2026-09-20T04:00:00Z', endedAt: '2026-09-20T04:10:00Z', durationSeconds: 600 }),
      // reported as overlapping the first call (bad data) — durations sum
      // to more than the actual wall-clock envelope
      callTouch({ id: 2, startedAt: '2026-09-20T04:00:00Z', endedAt: '2026-09-20T04:10:00Z', durationSeconds: 600 }),
    ];
    const rows = computeAdherenceByRm(events);
    expect(rows[0].breakTime).toBe('0m');
  });

  it('an open break on a past day does not set live status (only today counts)', () => {
    const rows = computeAdherenceByRm([
      breakEvent('BREAK_START', '2020-01-01T10:00:00Z', { id: 1 }), // never closed, years old
    ]);
    expect(rows[0].status).toBe('Idle');
  });

  it('reports live status only from an open call/break happening today', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString();
    const rows = computeAdherenceByRm([
      callTouch({ startedAt: fiveMinAgo, endedAt: null, durationSeconds: null }),
    ]);
    expect(rows[0].status).toBe('On lead');
    expect(rows[0].statusMinutes).toBeGreaterThanOrEqual(4);
    expect(rows[0].statusMinutes).toBeLessThanOrEqual(6);
  });
});
