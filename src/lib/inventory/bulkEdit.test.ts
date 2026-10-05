import { describe, expect, it } from 'vitest';
import {
  BULK_SKIP_VALUE,
  buildBulkPreviewRows,
  countBulkChanges,
  groupBulkRowIdsByValue,
} from './bulkEdit';
import { getRequestStatusLabel } from './requestStatus';

const formatValue = (value: unknown) => {
  const raw = String(value ?? '').trim();
  if (!raw || raw === 'N/A') return '—';
  return getRequestStatusLabel(raw);
};

const row = (id: number, status: string, itemName = `Item ${id}`) => ({
  id,
  data: { status, item_name: itemName },
});

const build = (rows: any[], targetValue: string, overrides?: Record<string, string>) =>
  buildBulkPreviewRows({ rows, targetValue, overrides, formatValue });

/** Every status and the statuses Bulk Edit may move it to. */
const ALLOWED_MOVES: Record<string, string[]> = {
  NEW_REQUEST: ['REQ_TO_VERIFY', 'ON_HOLD', 'REJECTED'],
  REQ_TO_VERIFY: ['APPROVED', 'ON_HOLD', 'REJECTED'],
  APPROVED: ['IN_CART', 'ON_HOLD', 'REJECTED'],
  IN_CART: ['ON_HOLD', 'REJECTED', 'ORDERED'],
  ON_HOLD: ['NEW_REQUEST', 'REQ_TO_VERIFY', 'APPROVED', 'IN_CART', 'REJECTED'],
  REJECTED: [],
  ORDERED: ['DELIVERED', 'EXCEPTION'],
  EXCEPTION: ['ORDERED', 'DELIVERED'],
  DELIVERED: [],
};
const ALL_STATUSES = Object.keys(ALLOWED_MOVES);

describe('bulk edit rules — allowed moves per status', () => {
  it.each(Object.entries(ALLOWED_MOVES))('%s can only move to its next steps', (from, expected) => {
    const [preview] = build([row(1, from)], '');
    expect([...preview.allowedValues].sort()).toEqual([...expected].sort());
  });

  it.each(ALL_STATUSES)('%s never lists its own status as an option', (status) => {
    const [preview] = build([row(1, status)], '');
    expect(preview.allowedValues.has(status)).toBe(false);
  });

  it('treats Rejected and Delivered as final', () => {
    for (const status of ['REJECTED', 'DELIVERED']) {
      for (const target of ALL_STATUSES) {
        const [preview] = build([row(1, status)], target);
        expect(preview.blocked).toBe(true);
        expect(preview.skipped).toBe(true);
      }
    }
  });

  it('matches every from → to pair against the rule table', () => {
    for (const from of ALL_STATUSES) {
      for (const to of ALL_STATUSES) {
        const [preview] = build([row(1, from)], to);
        const allowed = ALLOWED_MOVES[from].includes(to);
        expect({ from, to, applies: !preview.skipped }).toEqual({ from, to, applies: allowed });
      }
    }
  });
});

describe('bulk edit rules — toolbar status applied to selected rows', () => {
  it('applies an allowed next step', () => {
    const [preview] = build([row(1, 'NEW_REQUEST')], 'REQ_TO_VERIFY');
    expect(preview).toMatchObject({
      blocked: false,
      alreadyAtTarget: false,
      nextValue: 'REQ_TO_VERIFY',
      skipped: false,
      unchanged: false,
    });
  });

  it('skips a row that would jump ahead a step', () => {
    const [preview] = build([row(1, 'NEW_REQUEST')], 'APPROVED');
    expect(preview).toMatchObject({
      blocked: true,
      alreadyAtTarget: false,
      nextValue: BULK_SKIP_VALUE,
      skipped: true,
    });
  });

  it('skips a row that would go backwards', () => {
    const [preview] = build([row(1, 'ORDERED')], 'IN_CART');
    expect(preview).toMatchObject({ blocked: true, alreadyAtTarget: false, skipped: true });
  });

  it('does not allow On Hold or Rejected once ordered', () => {
    expect(build([row(1, 'ORDERED')], 'ON_HOLD')[0].skipped).toBe(true);
    expect(build([row(1, 'ORDERED')], 'REJECTED')[0].skipped).toBe(true);
  });

  it('lets On Hold return to an earlier step', () => {
    expect(build([row(1, 'ON_HOLD')], 'NEW_REQUEST')[0].skipped).toBe(false);
    expect(build([row(1, 'ON_HOLD')], 'IN_CART')[0].skipped).toBe(false);
  });

  it('lets Exception go back to Ordered', () => {
    expect(build([row(1, 'EXCEPTION')], 'ORDERED')[0].skipped).toBe(false);
  });

  it.each(ALL_STATUSES)('blocks %s → %s (same status) and marks it already at target', (status) => {
    const [preview] = build([row(1, status)], status);
    expect(preview).toMatchObject({
      blocked: true,
      alreadyAtTarget: true,
      nextValue: BULK_SKIP_VALUE,
      skipped: true,
    });
  });

  it('treats differently-cased current status as the same status', () => {
    const [preview] = build([row(1, 'delivered')], 'DELIVERED');
    expect(preview.currentValue).toBe('DELIVERED');
    expect(preview.alreadyAtTarget).toBe(true);
    expect(preview.skipped).toBe(true);
  });

  it('decides each row on its own in a mixed selection', () => {
    const previews = build(
      [row(1, 'IN_CART'), row(2, 'APPROVED'), row(3, 'ORDERED'), row(4, 'ON_HOLD')],
      'ORDERED'
    );
    expect(previews.map((p) => [p.id, p.skipped, p.alreadyAtTarget])).toEqual([
      ['1', false, false],
      ['2', true, false],
      ['3', true, true],
      ['4', true, false],
    ]);
  });

  it('marks nothing blocked before a toolbar status is chosen', () => {
    const [preview] = build([row(1, 'NEW_REQUEST')], '');
    expect(preview.blocked).toBe(false);
    expect(preview.alreadyAtTarget).toBe(false);
  });
});

describe('bulk edit rules — per-row overrides in the review popup', () => {
  it('lets the user pick a different allowed status for a blocked row', () => {
    const [preview] = build([row(1, 'NEW_REQUEST')], 'APPROVED', { '1': 'REQ_TO_VERIFY' });
    expect(preview).toMatchObject({ blocked: false, nextValue: 'REQ_TO_VERIFY', skipped: false });
  });

  it('lets the user choose "Don\'t change" for an allowed row', () => {
    const [preview] = build([row(1, 'NEW_REQUEST')], 'REQ_TO_VERIFY', { '1': BULK_SKIP_VALUE });
    expect(preview).toMatchObject({ blocked: false, nextValue: BULK_SKIP_VALUE, skipped: true });
  });

  it('keeps the "already" note on an overridden same-status row but clears blocked', () => {
    const [preview] = build([row(1, 'DELIVERED')], 'DELIVERED', { '1': BULK_SKIP_VALUE });
    expect(preview.blocked).toBe(false);
    expect(preview.alreadyAtTarget).toBe(true);
    expect(preview.skipped).toBe(true);
  });

  it('flags an override equal to the current status as unchanged', () => {
    const [preview] = build([row(1, 'IN_CART')], 'ORDERED', { '1': 'IN_CART' });
    expect(preview.skipped).toBe(false);
    expect(preview.unchanged).toBe(true);
  });

  it('only applies an override to its own row', () => {
    const previews = build([row(1, 'NEW_REQUEST'), row(2, 'NEW_REQUEST')], 'REQ_TO_VERIFY', {
      '1': BULK_SKIP_VALUE,
    });
    expect(previews.map((p) => p.nextValue)).toEqual([BULK_SKIP_VALUE, 'REQ_TO_VERIFY']);
  });
});

describe('bulk edit rules — what gets saved', () => {
  const previews = () =>
    build(
      [
        row(1, 'IN_CART'),
        row(2, 'IN_CART'),
        row(3, 'ORDERED'),
        row(4, 'APPROVED'),
        row(5, 'NEW_REQUEST'),
        row(6, 'EXCEPTION'),
      ],
      'ORDERED',
      { '5': 'REQ_TO_VERIFY', '6': 'EXCEPTION' }
    );

  it('counts only rows that will change', () => {
    expect(countBulkChanges(previews())).toBe(3);
  });

  it('groups saved rows by their new status and leaves out skipped / unchanged rows', () => {
    const grouped = groupBulkRowIdsByValue(previews());
    expect(Object.fromEntries(grouped)).toEqual({
      ORDERED: ['1', '2'],
      REQ_TO_VERIFY: ['5'],
    });
  });

  it('saves nothing when every row is skipped', () => {
    const all = build([row(1, 'DELIVERED'), row(2, 'REJECTED')], 'ORDERED');
    expect(countBulkChanges(all)).toBe(0);
    expect(groupBulkRowIdsByValue(all).size).toBe(0);
  });
});

describe('bulk edit preview rows — display fields', () => {
  it('uses the freeform item name first, then the item name, then a fallback', () => {
    const previews = build(
      [
        { id: 1, data: { status: 'NEW_REQUEST', item_name_freeform: 'Drill', item_name: 'X' } },
        { id: 2, data: { status: 'NEW_REQUEST', item_name: 'Hammer' } },
        { id: 3, data: { status: 'NEW_REQUEST' } },
      ],
      ''
    );
    expect(previews.map((p) => p.itemName)).toEqual(['Drill', 'Hammer', 'Request #3']);
  });

  it('reads the status from the row when data has none', () => {
    const [preview] = build([{ id: 1, status: 'APPROVED', data: {} }], 'IN_CART');
    expect(preview.currentValue).toBe('APPROVED');
    expect(preview.skipped).toBe(false);
  });

  it('shows the current status label', () => {
    const [preview] = build([row(1, 'IN_CART')], '');
    expect(preview.currentLabel).toBe(getRequestStatusLabel('IN_CART'));
  });
});
