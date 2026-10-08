import { describe, expect, it } from 'vitest';
import {
  computeAdherenceByRm,
  computeLeaderboardByManager,
  computeLeaderboardByRm,
  computePerformanceByRm,
  computeTeamTotals,
  formatVsTarget,
} from './aggregate';
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
    prajaId: null,
    updatedStatus: 'TRIAL_ACTIVATED',
    leadGroup: null,
    party: null,
    reason: null,
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
    prajaId: null,
    updatedStatus: null,
    leadGroup: null,
    party: null,
    reason: null,
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

  it('uses the target as-is — it already arrives pre-summed for the selected range', () => {
    // the backend sums each RM's real day-by-day targets across whatever
    // range is selected (see get_rm_daily_targets_sum); this layer must not
    // re-scale it a second time (e.g. by multiplying by a day count)
    const events = [callTouch({ rmUserId: 'rm-1' })];
    expect(computePerformanceByRm(events, { 'rm-1': 63 })[0].target).toBe(63);
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

describe('computeLeaderboardByRm ranking', () => {
  it('ranks by vs-target ratio, not raw achieved count', () => {
    const events = [
      callTouch({ rmUserId: 'rm-1', leadRecordId: 1, updatedStatus: 'TRIAL_ACTIVATED' }),
      callTouch({ rmUserId: 'rm-1', leadRecordId: 2, id: 2, updatedStatus: 'TRIAL_ACTIVATED' }),
      callTouch({ rmUserId: 'rm-2', leadRecordId: 3, id: 3, updatedStatus: 'TRIAL_ACTIVATED' }),
    ];
    // rm-1: 2 achieved / 10 target = 20%; rm-2: 1 achieved / 2 target = 50%
    const targets = { 'rm-1': 10, 'rm-2': 2 };
    const rows = computeLeaderboardByRm(events, targets);
    expect(rows[0].rmUserId).toBe('rm-2'); // higher ratio wins despite fewer raw trials
    expect(rows[0].rank).toBe(1);
    expect(rows[1].rmUserId).toBe('rm-1');
  });

  it('breaks a tied vs-target ratio by raw achieved, then unique leads', () => {
    const events = [
      callTouch({ rmUserId: 'rm-1', leadRecordId: 1, updatedStatus: 'TRIAL_ACTIVATED' }),
      callTouch({ rmUserId: 'rm-1', leadRecordId: 2, id: 2, updatedStatus: 'NOT_CONNECTED' }),
      callTouch({ rmUserId: 'rm-2', leadRecordId: 3, id: 3, updatedStatus: 'TRIAL_ACTIVATED' }),
    ];
    // both rm-1 and rm-2 land on a 1/1 = 100% ratio and 1 achieved — rm-1
    // worked more unique leads (2 vs 1), so it wins the tie-break
    const targets = { 'rm-1': 1, 'rm-2': 1 };
    const rows = computeLeaderboardByRm(events, targets);
    expect(rows[0].rmUserId).toBe('rm-1');
  });

  it('sorts an RM with no configured target after an RM with a real 0% result', () => {
    const events = [
      callTouch({ rmUserId: 'rm-1', leadRecordId: 1, updatedStatus: 'NOT_CONNECTED' }), // 0 achieved, has a target -> real 0%
      callTouch({ rmUserId: 'rm-2', leadRecordId: 2, id: 2, updatedStatus: 'NOT_CONNECTED' }), // 0 achieved, no target -> unset
    ];
    const targets = { 'rm-1': 10 };
    const rows = computeLeaderboardByRm(events, targets);
    expect(rows[0].rmUserId).toBe('rm-1'); // a real 0% ranks above "no target at all"
    expect(rows[1].rmUserId).toBe('rm-2');
    expect(rows[1].vsTargetPct).toBe(-1); // "—", never a false 0%
  });
});

describe('computeLeaderboardByManager', () => {
  it("rolls each manager's whole team into one row and ranks by team vs-target ratio", () => {
    const events = [
      callTouch({ rmUserId: 'rm-1', leadRecordId: 1, updatedStatus: 'TRIAL_ACTIVATED' }),
      callTouch({ rmUserId: 'rm-2', leadRecordId: 2, id: 2, updatedStatus: 'TRIAL_ACTIVATED' }),
      callTouch({ rmUserId: 'rm-3', leadRecordId: 3, id: 3, updatedStatus: 'TRIAL_ACTIVATED' }),
    ];
    // mgr-a's team (rm-1, rm-2): 2 achieved / 10 target = 20%
    // mgr-b's team (rm-3): 1 achieved / 1 target = 100%
    const targets = { 'rm-1': 5, 'rm-2': 5, 'rm-3': 1 };
    const rmToManagerUserId = { 'rm-1': 'mgr-a', 'rm-2': 'mgr-a', 'rm-3': 'mgr-b' };
    const managerNameByUserId = { 'mgr-a': 'Manager A', 'mgr-b': 'Manager B' };
    const rows = computeLeaderboardByManager(events, targets, rmToManagerUserId, managerNameByUserId);
    expect(rows).toHaveLength(2);
    expect(rows[0].managerUserId).toBe('mgr-b'); // higher team ratio ranks first
    expect(rows[0].rank).toBe(1);
    expect(rows[1].managerUserId).toBe('mgr-a');
  });

  it('excludes RMs with no resolved manager instead of mis-bucketing them', () => {
    const events = [
      callTouch({ rmUserId: 'rm-1', leadRecordId: 1, updatedStatus: 'TRIAL_ACTIVATED' }),
      callTouch({ rmUserId: 'rm-unmapped', leadRecordId: 2, id: 2, updatedStatus: 'TRIAL_ACTIVATED' }),
    ];
    const targets = { 'rm-1': 2 };
    const rmToManagerUserId = { 'rm-1': 'mgr-a' }; // rm-unmapped intentionally absent
    const managerNameByUserId = { 'mgr-a': 'Manager A' };
    const rows = computeLeaderboardByManager(events, targets, rmToManagerUserId, managerNameByUserId);
    expect(rows).toHaveLength(1);
    expect(rows[0].managerUserId).toBe('mgr-a');
    expect(rows[0].achieved).toBe(1); // only rm-1's event counted, not rm-unmapped's
  });

  it("counts an idle RM's target toward the team total even with zero events today", () => {
    const events = [
      callTouch({ rmUserId: 'rm-1', leadRecordId: 1, updatedStatus: 'TRIAL_ACTIVATED' }),
      // rm-2 is on mgr-a's team but has no events in this range at all
    ];
    const targets = { 'rm-1': 5, 'rm-2': 5 };
    const rmToManagerUserId = { 'rm-1': 'mgr-a', 'rm-2': 'mgr-a' };
    const managerNameByUserId = { 'mgr-a': 'Manager A' };
    const rows = computeLeaderboardByManager(events, targets, rmToManagerUserId, managerNameByUserId);
    expect(rows).toHaveLength(1);
    // target must be rm-1's 5 PLUS idle rm-2's 5 = 10, not just rm-1's 5 —
    // an idle RM with a real target must not silently drop out of the
    // denominator and make the team's vs-target % look artificially high
    expect(rows[0].target).toBe(10);
    expect(rows[0].rmCount).toBe(2);
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
