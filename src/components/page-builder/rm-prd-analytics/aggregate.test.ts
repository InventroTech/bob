import { describe, expect, it } from 'vitest';
import {
  BREACH_THRESHOLDS,
  computeAchtOverall,
  computeAdherenceByRm,
  computeLeaderboardByRm,
  computeMyShiftSnapshot,
  computePerformanceByRm,
  computePerformanceByRmFromSummary,
  computeSquadSummaries,
  computeTeamTotals,
  computeTeamTotalsFromSummary,
  formatVsTarget,
  isBreachedCall,
  type RmPerformanceSummaryByRm,
  type RmPerformanceSummaryTeam,
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

describe('breach counting is disposition-specific (each disposition has its own threshold)', () => {
  it('counts a trial-activated call at exactly its 25:00 threshold', () => {
    const rows = computeAdherenceByRm([
      callTouch({ updatedStatus: 'TRIAL_ACTIVATED', durationSeconds: BREACH_THRESHOLDS.TRIAL_ACTIVATED }),
    ]);
    expect(rows[0].breaches).toBe(1);
  });

  it('does not count a trial-activated call one second under its threshold', () => {
    const rows = computeAdherenceByRm([
      callTouch({ updatedStatus: 'TRIAL_ACTIVATED', durationSeconds: BREACH_THRESHOLDS.TRIAL_ACTIVATED - 1 }),
    ]);
    expect(rows[0].breaches).toBe(0);
  });

  it('counts a not-connected call at its own 3-minute threshold, far under the trial threshold', () => {
    const rows = computeAdherenceByRm([
      callTouch({ updatedStatus: 'NOT_CONNECTED', durationSeconds: BREACH_THRESHOLDS.NOT_CONNECTED }),
    ]);
    expect(rows[0].breaches).toBe(1);
  });

  it('counts a call-back call at its own 10-minute threshold', () => {
    const rows = computeAdherenceByRm([
      callTouch({ updatedStatus: 'CALL_BACK', durationSeconds: BREACH_THRESHOLDS.CALL_BACK }),
    ]);
    expect(rows[0].breaches).toBe(1);
  });

  it('counts a not-interested call at its own 15-minute threshold', () => {
    const rows = computeAdherenceByRm([
      callTouch({ updatedStatus: 'NOT_INTERESTED', durationSeconds: BREACH_THRESHOLDS.NOT_INTERESTED }),
    ]);
    expect(rows[0].breaches).toBe(1);
  });

  it('sums breaches across dispositions within the same RM', () => {
    const rows = computeAdherenceByRm([
      callTouch({ id: 1, updatedStatus: 'NOT_CONNECTED', durationSeconds: BREACH_THRESHOLDS.NOT_CONNECTED }),
      callTouch({ id: 2, updatedStatus: 'CALL_BACK', durationSeconds: BREACH_THRESHOLDS.CALL_BACK }),
      callTouch({ id: 3, updatedStatus: 'NOT_INTERESTED', durationSeconds: 1 }), // under its own 15m threshold
    ]);
    expect(rows[0].breaches).toBe(2);
  });
});

// Regression coverage for the gaming vector closed alongside the "one lead
// at a time" redesign: duration_seconds comes out null (not a guessed
// number) from the backend whenever there's no trustworthy measured
// session for a touch — e.g. an RM evicted their own session by opening a
// different lead elsewhere, then self-reported a duration when they
// eventually dispositioned the abandoned one. These null rows must never
// get silently counted as "0 seconds" — that would both hide a possible
// breach (0s never breaches) and drag every average down by counting an
// unmeasured call as a confirmed fast one.
describe('null duration_seconds ("unknown", not measured) is excluded, not treated as 0', () => {
  it('isBreachedCall never flags a null-duration call as a breach', () => {
    expect(
      isBreachedCall({ updatedStatus: 'NOT_CONNECTED', durationSeconds: null })
    ).toBe(false);
  });

  it('a null-duration call does not count toward breaches', () => {
    const rows = computeAdherenceByRm([
      callTouch({ updatedStatus: 'NOT_CONNECTED', durationSeconds: null }),
    ]);
    expect(rows[0].breaches).toBe(0);
  });

  it('ACHT averages only the measured calls, not diluted by an unmeasured one', () => {
    const rows = computeAdherenceByRm([
      callTouch({ id: 1, updatedStatus: 'TRIAL_ACTIVATED', durationSeconds: 100 }),
      callTouch({ id: 2, updatedStatus: 'TRIAL_ACTIVATED', durationSeconds: null }),
    ]);
    // if the null call were counted as 0s, this would read 50s instead of 100s
    expect(rows[0].achtSeconds).toBe(100);
  });

  it('computeAchtOverall averages only the measured calls per disposition', () => {
    const result = computeAchtOverall([
      callTouch({ id: 1, updatedStatus: 'CALL_BACK', durationSeconds: 200 }),
      callTouch({ id: 2, updatedStatus: 'CALL_BACK', durationSeconds: null }),
    ]);
    expect(result.callBack.value).toBe('3m 20s');
    expect(result.callBack.touches).toBe(1); // the measured count, not 2
  });

  it('computeMyShiftSnapshot averages only the measured calls per disposition', () => {
    const snapshot = computeMyShiftSnapshot(
      [
        callTouch({ id: 1, rmUserId: 'rm-1', updatedStatus: 'NOT_INTERESTED', durationSeconds: 90 }),
        callTouch({ id: 2, rmUserId: 'rm-1', updatedStatus: 'NOT_INTERESTED', durationSeconds: null }),
      ],
      'rm-1'
    );
    expect(snapshot.notInterested.value).toBe('1m 30s');
    expect(snapshot.notInterested.touches).toBe(1);
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

  it('never goes negative — two fully overlapping leads merge into one real 10m window, not 20m', () => {
    // an RM can legitimately have two leads' sessions open at once (two
    // tabs — see record_lead_opened, which keeps every lead's session
    // independent rather than evicting one). Handling time merges
    // overlapping windows before summing, so this correctly reads as 10m
    // of real wall-clock handling, not 20m — which is what used to
    // silently exceed the login envelope and required clamping.
    const events = [
      callTouch({ id: 1, startedAt: '2026-09-20T04:00:00Z', endedAt: '2026-09-20T04:10:00Z', durationSeconds: 600 }),
      callTouch({ id: 2, startedAt: '2026-09-20T04:00:00Z', endedAt: '2026-09-20T04:10:00Z', durationSeconds: 600 }),
    ];
    const rows = computeAdherenceByRm(events);
    expect(rows[0].handlingHours).toBe('10m');
    expect(rows[0].breakTime).toBe('0m');
  });
});

describe('Handling Time merges overlapping [started_at, ended_at] windows instead of summing them', () => {
  it('two leads open at the exact same time count once, not twice', () => {
    const rows = computeAdherenceByRm([
      callTouch({ id: 1, startedAt: '2026-09-20T04:00:00Z', endedAt: '2026-09-20T04:10:00Z', durationSeconds: 600 }),
      callTouch({ id: 2, startedAt: '2026-09-20T04:00:00Z', endedAt: '2026-09-20T04:10:00Z', durationSeconds: 600 }),
    ]);
    expect(rows[0].handlingMinutes).toBe(10);
  });

  it('partially overlapping leads merge into the union of their windows', () => {
    // [04:00–04:10] and [04:05–04:20] merge into [04:00–04:20] = 20m, not
    // the naive 10m + 15m = 25m a flat sum would give
    const rows = computeAdherenceByRm([
      callTouch({ id: 1, startedAt: '2026-09-20T04:00:00Z', endedAt: '2026-09-20T04:10:00Z', durationSeconds: 600 }),
      callTouch({ id: 2, startedAt: '2026-09-20T04:05:00Z', endedAt: '2026-09-20T04:20:00Z', durationSeconds: 900 }),
    ]);
    expect(rows[0].handlingMinutes).toBe(20);
  });

  it('a short lead fully nested inside a longer one adds nothing extra', () => {
    // a 3rd, briefer lead entirely inside lead 1's span — three real
    // dispositions, but the union is still just lead 1's own 10 minutes
    const rows = computeAdherenceByRm([
      callTouch({ id: 1, startedAt: '2026-09-20T04:00:00Z', endedAt: '2026-09-20T04:10:00Z', durationSeconds: 600 }),
      callTouch({ id: 2, startedAt: '2026-09-20T04:02:00Z', endedAt: '2026-09-20T04:03:00Z', durationSeconds: 60 }),
    ]);
    expect(rows[0].handlingMinutes).toBe(10);
  });

  it('non-overlapping leads still sum normally — merging never loses real, separate handling time', () => {
    const rows = computeAdherenceByRm([
      callTouch({ id: 1, startedAt: '2026-09-20T04:00:00Z', endedAt: '2026-09-20T04:05:00Z', durationSeconds: 300 }),
      callTouch({ id: 2, startedAt: '2026-09-20T05:00:00Z', endedAt: '2026-09-20T05:10:00Z', durationSeconds: 600 }),
    ]);
    expect(rows[0].handlingMinutes).toBe(15);
  });

  it('computeMyShiftSnapshot merges overlapping windows the same way as the Adherence tab', () => {
    const snapshot = computeMyShiftSnapshot(
      [
        callTouch({ id: 1, rmUserId: 'rm-1', startedAt: '2026-09-20T04:00:00Z', endedAt: '2026-09-20T04:10:00Z', durationSeconds: 600 }),
        callTouch({ id: 2, rmUserId: 'rm-1', startedAt: '2026-09-20T04:00:00Z', endedAt: '2026-09-20T04:10:00Z', durationSeconds: 600 }),
      ],
      'rm-1'
    );
    expect(snapshot.handling.value).toBe('10m');
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

describe('computeLeaderboardByRm ranking', () => {
  it('ranks by vs-target ratio, not raw achieved count', () => {
    const events = [
      callTouch({ rmUserId: 'rm-1', leadRecordId: 1, updatedStatus: 'TRIAL_ACTIVATED' }),
      callTouch({ rmUserId: 'rm-1', leadRecordId: 2, id: 2, updatedStatus: 'TRIAL_ACTIVATED' }),
      callTouch({ rmUserId: 'rm-2', leadRecordId: 3, id: 3, updatedStatus: 'TRIAL_ACTIVATED' }),
    ];
    // rm-1: 2 achieved / 10 target = 20%; rm-2: 1 achieved / 2 target = 50%
    const targets = { 'rm-1': 10, 'rm-2': 2 };
    const rows = computeLeaderboardByRm(computePerformanceByRm(events, targets));
    expect(rows[0].rmUserId).toBe('rm-2'); // higher ratio wins despite fewer raw trials
    expect(rows[0].rank).toBe(1);
    expect(rows[1].rmUserId).toBe('rm-1');
    expect(rows[1].rank).toBe(2);
  });

  it('breaks a tied vs-target ratio by raw achieved, then unique leads', () => {
    const events = [
      callTouch({ rmUserId: 'rm-1', leadRecordId: 1, updatedStatus: 'TRIAL_ACTIVATED' }),
      callTouch({ rmUserId: 'rm-1', leadRecordId: 2, id: 2, updatedStatus: 'NOT_CONNECTED' }),
      callTouch({ rmUserId: 'rm-2', leadRecordId: 3, id: 3, updatedStatus: 'TRIAL_ACTIVATED' }),
    ];
    // both land on a 1/1 = 100% ratio and 1 achieved — rm-1 worked more
    // unique leads (2 vs 1), so it wins the tie-break
    const targets = { 'rm-1': 1, 'rm-2': 1 };
    const rows = computeLeaderboardByRm(computePerformanceByRm(events, targets));
    expect(rows[0].rmUserId).toBe('rm-1');
  });

  it('sorts an RM with no configured target after an RM with a real 0% result', () => {
    const events = [
      callTouch({ rmUserId: 'rm-1', leadRecordId: 1, updatedStatus: 'NOT_CONNECTED' }), // 0 achieved, has a target -> real 0%
      callTouch({ rmUserId: 'rm-2', leadRecordId: 2, id: 2, updatedStatus: 'NOT_CONNECTED' }), // 0 achieved, no target -> unset
    ];
    const targets = { 'rm-1': 10 };
    const rows = computeLeaderboardByRm(computePerformanceByRm(events, targets));
    expect(rows[0].rmUserId).toBe('rm-1'); // a real 0% ranks above "no target at all"
    expect(rows[1].rmUserId).toBe('rm-2');
    expect(rows[1].vsTargetPct).toBe(-1); // never a false 0%
  });

  it('squad is the RM\'s own manager', () => {
    const rows = computeLeaderboardByRm(
      computePerformanceByRm([
        callTouch({ rmUserId: 'rm-1', managerName: 'Harish Manjunath', updatedStatus: 'TRIAL_ACTIVATED' }),
      ])
    );
    expect(rows[0].squad).toBe('Harish Manjunath');
  });

  it('flags clearedGoal only when target is set and actually met', () => {
    const rows = computeLeaderboardByRm(
      computePerformanceByRm(
        [
          callTouch({ rmUserId: 'rm-1', leadRecordId: 1, updatedStatus: 'TRIAL_ACTIVATED' }),
          callTouch({ rmUserId: 'rm-2', leadRecordId: 2, id: 2, updatedStatus: 'TRIAL_ACTIVATED' }),
        ],
        { 'rm-1': 1 } // rm-1 meets target; rm-2 has no target at all
      )
    );
    const rm1 = rows.find((r) => r.rmUserId === 'rm-1')!;
    const rm2 = rows.find((r) => r.rmUserId === 'rm-2')!;
    expect(rm1.clearedGoal).toBe(true);
    expect(rm2.clearedGoal).toBe(false);
  });
});

describe('computeSquadSummaries', () => {
  it("rolls each manager's whole team into one row and ranks by team vs-target ratio", () => {
    const events = [
      callTouch({ rmUserId: 'rm-1', managerName: 'Mgr A', leadRecordId: 1, updatedStatus: 'TRIAL_ACTIVATED' }),
      callTouch({ rmUserId: 'rm-2', managerName: 'Mgr A', leadRecordId: 2, id: 2, updatedStatus: 'TRIAL_ACTIVATED' }),
      callTouch({ rmUserId: 'rm-3', managerName: 'Mgr B', leadRecordId: 3, id: 3, updatedStatus: 'TRIAL_ACTIVATED' }),
    ];
    // Mgr A's squad (rm-1, rm-2): 2 achieved / 10 target = 20%
    // Mgr B's squad (rm-3): 1 achieved / 1 target = 100%
    const targets = { 'rm-1': 5, 'rm-2': 5, 'rm-3': 1 };
    const rows = computeSquadSummaries(computePerformanceByRm(events, targets));
    expect(rows).toHaveLength(2);
    expect(rows[0].squad).toBe('Mgr B'); // higher team ratio ranks first
    expect(rows[0].rank).toBe(1);
    expect(rows[1].squad).toBe('Mgr A');
  });

  it('counts an idle RM (no events) toward team achieved/target only if they have events in range', () => {
    const events = [
      callTouch({ rmUserId: 'rm-1', managerName: 'Mgr A', leadRecordId: 1, updatedStatus: 'TRIAL_ACTIVATED' }),
    ];
    const rows = computeSquadSummaries(computePerformanceByRm(events, { 'rm-1': 5 }));
    expect(rows).toHaveLength(1);
    expect(rows[0].rmCount).toBe(1);
    expect(rows[0].achieved).toBe(1);
    expect(rows[0].target).toBe(5);
  });

  it('picks the majority state among the squad\'s RMs', () => {
    const events = [
      callTouch({ rmUserId: 'rm-1', managerName: 'Mgr A', state: 'KA', leadRecordId: 1 }),
      callTouch({ rmUserId: 'rm-2', managerName: 'Mgr A', state: 'KA', leadRecordId: 2, id: 2 }),
      callTouch({ rmUserId: 'rm-3', managerName: 'Mgr A', state: 'TN', leadRecordId: 3, id: 3 }),
    ];
    const rows = computeSquadSummaries(computePerformanceByRm(events));
    expect(rows[0].state).toBe('KA');
  });

  it('a squad with no configured target anywhere reads pct 0, not NaN/Infinity', () => {
    const rows = computeSquadSummaries(
      computePerformanceByRm([
        callTouch({ rmUserId: 'rm-1', managerName: 'Mgr A', updatedStatus: 'TRIAL_ACTIVATED' }),
      ])
    );
    expect(rows[0].target).toBe(0);
    expect(rows[0].pct).toBe(0);
  });
});

describe('computePerformanceByRmFromSummary', () => {
  const summaryRow = (overrides: Partial<RmPerformanceSummaryByRm> = {}): RmPerformanceSummaryByRm => ({
    rmUserId: 'rm-1',
    rmName: 'Asha',
    managerName: 'Manager One',
    state: 'KA',
    touches: 10,
    uniqueLeads: 8,
    dispositionCounts: { NOT_CONNECTED: 4, CALL_BACK: 2, NOT_INTERESTED: 1, TRIAL_ACTIVATED: 1 },
    ...overrides,
  });

  it('maps a summary row to the exact same shape computePerformanceByRm produces from raw events', () => {
    const fromSummary = computePerformanceByRmFromSummary([summaryRow()], { 'rm-1': 5 });
    expect(fromSummary[0]).toEqual({
      rmUserId: 'rm-1',
      name: 'Asha',
      manager: 'Manager One',
      team: '',
      state: 'KA',
      uniqueLeads: 8,
      touches: 10,
      attemptsPerLead: 1.25,
      notConnectedRate: 50, // 4/8
      callBackRate: 25, // 2/8
      notInterestedRate: 12.5, // 1/8
      trialRate: 12.5, // 1/8
      achieved: 1,
      target: 5,
    });
  });

  it('a disposition with zero touches is simply absent from dispositionCounts, not a 0 entry', () => {
    const rows = computePerformanceByRmFromSummary([summaryRow({ dispositionCounts: { TRIAL_ACTIVATED: 2 } })]);
    expect(rows[0].notConnectedRate).toBe(0);
    expect(rows[0].callBackRate).toBe(0);
    expect(rows[0].achieved).toBe(2);
  });

  it('an RM with no configured target reads target 0, not undefined/NaN', () => {
    const rows = computePerformanceByRmFromSummary([summaryRow()], {});
    expect(rows[0].target).toBe(0);
  });

  it('zero unique leads does not divide by zero', () => {
    const rows = computePerformanceByRmFromSummary([summaryRow({ touches: 0, uniqueLeads: 0, dispositionCounts: {} })]);
    expect(rows[0].attemptsPerLead).toBe(0);
    expect(rows[0].notConnectedRate).toBe(0);
  });
});

describe('computeTeamTotalsFromSummary', () => {
  const team = (overrides: Partial<RmPerformanceSummaryTeam> = {}): RmPerformanceSummaryTeam => ({
    touches: 20,
    uniqueLeads: 15,
    dispositionCounts: { NOT_CONNECTED: 8, CALL_BACK: 3, NOT_INTERESTED: 2, TRIAL_ACTIVATED: 2 },
    ...overrides,
  });

  it('matches computeTeamTotals\' output shape and math for the equivalent raw events', () => {
    const fromSummary = computeTeamTotalsFromSummary(team(), ['rm-1', 'rm-2'], { 'rm-1': 10, 'rm-2': 5 });
    expect(fromSummary).toEqual({
      uniqueLeadsHandled: 15,
      touches: 20,
      attemptsPerLead: 1.33,
      achieved: 2,
      target: 15, // 10 + 5
      trialActivationRate: 13.3, // 2/15
      notConnectedRate: { rate: 53.3, leads: 8 },
      callBackRate: { rate: 20, leads: 3 },
      notInterestedRate: { rate: 13.3, leads: 2 },
      trialSubscribedRate: { rate: 13.3, leads: 2 },
    });
  });

  it('only sums targets for RMs actually passed in activeRmUserIds, not every configured target', () => {
    // rm-3 has a configured target but isn't active in this range — must not count
    const fromSummary = computeTeamTotalsFromSummary(team(), ['rm-1'], { 'rm-1': 10, 'rm-3': 100 });
    expect(fromSummary.target).toBe(10);
  });

  it('zero unique leads at the team level does not divide by zero', () => {
    const fromSummary = computeTeamTotalsFromSummary(
      { touches: 0, uniqueLeads: 0, dispositionCounts: {} },
      [],
      {}
    );
    expect(fromSummary.attemptsPerLead).toBe(0);
    expect(fromSummary.trialActivationRate).toBe(0);
  });
});
