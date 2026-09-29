import { describe, expect, it } from 'vitest';
import { BREACH_SECONDS, generateTouches } from './touchData';
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
    prajaId: '1793876',
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

describe('generateTouches', () => {
  it('excludes calls still open (no endedAt yet)', () => {
    const rows = generateTouches([callTouch({ endedAt: null, durationSeconds: null })], 'all');
    expect(rows).toHaveLength(0);
  });

  it('sorts by the real start instant, not the formatted clock string, across multiple days', () => {
    const events = [
      callTouch({ id: 1, startedAt: '2026-09-22T01:00:00Z', endedAt: '2026-09-22T01:01:00Z' }), // day 2, early clock time
      callTouch({ id: 2, startedAt: '2026-09-21T23:00:00Z', endedAt: '2026-09-21T23:01:00Z' }), // day 1, later clock time
    ];
    const rows = generateTouches(events, 'all');
    // chronologically, day 1's 23:00 call happened first even though its
    // clock string ("23:00:00") sorts after day 2's ("01:00:00")
    expect(rows.map((r) => r.touchId)).toEqual([2, 1]);
  });

  describe('breach filter boundary (matches OVER 25m flag: >= 1500s)', () => {
    it('includes a call at exactly 1500s', () => {
      const rows = generateTouches([callTouch({ durationSeconds: BREACH_SECONDS })], 'breach');
      expect(rows).toHaveLength(1);
    });

    it('excludes a call one second under 1500s', () => {
      const rows = generateTouches([callTouch({ durationSeconds: BREACH_SECONDS - 1 })], 'breach');
      expect(rows).toHaveLength(0);
    });
  });

  it('filters by disposition', () => {
    const events = [
      callTouch({ id: 1, updatedStatus: 'TRIAL_ACTIVATED' }),
      callTouch({ id: 2, updatedStatus: 'NOT_CONNECTED' }),
    ];
    expect(generateTouches(events, 'trial').map((r) => r.touchId)).toEqual([1]);
    expect(generateTouches(events, 'notConnected').map((r) => r.touchId)).toEqual([2]);
  });

  it('shows the human-facing praja_id, not the internal lead record id', () => {
    const rows = generateTouches([callTouch({ leadRecordId: 999, prajaId: '1793876' })], 'all');
    expect(rows[0].prajaId).toBe('1793876');
  });

  describe('state name resolution', () => {
    it('resolves the raw Circle ID to a display name when a lookup is given', () => {
      const rows = generateTouches([callTouch({ state: '72631' })], 'all', { '72631': 'Tamil Nadu' });
      expect(rows[0].state).toBe('Tamil Nadu');
    });

    it('falls back to the raw ID when it has no entry in the lookup', () => {
      const rows = generateTouches([callTouch({ state: '999999' })], 'all', { '72631': 'Tamil Nadu' });
      expect(rows[0].state).toBe('999999');
    });

    it('falls back to the raw ID when no lookup is given at all', () => {
      const rows = generateTouches([callTouch({ state: '72631' })], 'all');
      expect(rows[0].state).toBe('72631');
    });
  });
});
