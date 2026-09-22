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
