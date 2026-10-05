import { describe, expect, it } from 'vitest';
import {
  BULK_SKIP_VALUE,
  buildBulkPreviewRows,
  countBulkChanges,
  groupBulkRowIdsByValue,
} from './bulkEdit';
import { getRequestStatusLabel, getRequestStatusValues } from './requestStatus';

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

const ALL_STATUSES = getRequestStatusValues();
const [FIRST, SECOND, THIRD] = ALL_STATUSES;
const LAST = ALL_STATUSES[ALL_STATUSES.length - 1];

describe('bulk edit — no step-order conditions', () => {
  it('has statuses from the status config to test with', () => {
    expect(ALL_STATUSES.length).toBeGreaterThanOrEqual(3);
  });

  it.each(ALL_STATUSES)('%s can move to every other active status', (status) => {
    const [preview] = build([row(1, status)], '');
    expect([...preview.allowedValues].sort()).toEqual(ALL_STATUSES.filter((s) => s !== status).sort());
  });

  it('applies every different from → to pair', () => {
    for (const from of ALL_STATUSES) {
      for (const to of ALL_STATUSES) {
        if (from === to) continue;
        const [preview] = build([row(1, from)], to);
        expect({ from, to, nextValue: preview.nextValue, blocked: preview.blocked }).toEqual({
          from,
          to,
          nextValue: to,
          blocked: false,
        });
      }
    }
  });

  it('lets a row jump forward and backward through the list', () => {
    expect(build([row(1, FIRST)], LAST)[0].skipped).toBe(false);
    expect(build([row(1, LAST)], FIRST)[0].skipped).toBe(false);
  });

  it('lets a row with an unknown status move anywhere', () => {
    const [preview] = build([row(1, 'CUSTOM_STEP')], FIRST);
    expect(preview).toMatchObject({ blocked: false, nextValue: FIRST, skipped: false });
  });

  it('lets a row with no status move anywhere', () => {
    const [preview] = build([{ id: 1, data: {} }], FIRST);
    expect(preview).toMatchObject({ blocked: false, nextValue: FIRST, skipped: false });
  });
});

describe('bulk edit — same status is not a change', () => {
  it.each(ALL_STATUSES)('%s → %s is skipped and marked already at target', (status) => {
    const [preview] = build([row(1, status)], status);
    expect(preview).toMatchObject({
      blocked: true,
      alreadyAtTarget: true,
      nextValue: BULK_SKIP_VALUE,
      skipped: true,
    });
  });

  it.each(ALL_STATUSES)('%s never lists its own status as an option', (status) => {
    const [preview] = build([row(1, status)], '');
    expect(preview.allowedValues.has(status)).toBe(false);
  });

  it('treats a differently-cased current status as the same status', () => {
    const [preview] = build([row(1, FIRST.toLowerCase())], FIRST);
    expect(preview.currentValue).toBe(FIRST);
    expect(preview.alreadyAtTarget).toBe(true);
  });

  it('decides each row on its own in a mixed selection', () => {
    const previews = build([row(1, FIRST), row(2, SECOND), row(3, THIRD)], SECOND);
    expect(previews.map((p) => [p.id, p.skipped, p.alreadyAtTarget])).toEqual([
      ['1', false, false],
      ['2', true, true],
      ['3', false, false],
    ]);
  });

  it('marks nothing blocked before a toolbar status is chosen', () => {
    const [preview] = build([row(1, FIRST)], '');
    expect(preview.blocked).toBe(false);
    expect(preview.alreadyAtTarget).toBe(false);
  });
});

describe('bulk edit — per-row overrides in the review popup', () => {
  it('lets the user pick a different status for a same-status row', () => {
    const [preview] = build([row(1, FIRST)], FIRST, { '1': SECOND });
    expect(preview).toMatchObject({ blocked: false, nextValue: SECOND, skipped: false });
  });

  it('lets the user choose "Don\'t change" for a row', () => {
    const [preview] = build([row(1, FIRST)], SECOND, { '1': BULK_SKIP_VALUE });
    expect(preview).toMatchObject({ blocked: false, nextValue: BULK_SKIP_VALUE, skipped: true });
  });

  it('flags an override equal to the current status as unchanged', () => {
    const [preview] = build([row(1, FIRST)], SECOND, { '1': FIRST });
    expect(preview.skipped).toBe(false);
    expect(preview.unchanged).toBe(true);
  });

  it('only applies an override to its own row', () => {
    const previews = build([row(1, FIRST), row(2, FIRST)], SECOND, { '1': BULK_SKIP_VALUE });
    expect(previews.map((p) => p.nextValue)).toEqual([BULK_SKIP_VALUE, SECOND]);
  });
});

describe('bulk edit — what gets saved', () => {
  const previews = () =>
    build(
      [row(1, FIRST), row(2, FIRST), row(3, SECOND), row(4, THIRD), row(5, THIRD)],
      SECOND,
      { '4': FIRST, '5': THIRD }
    );

  it('counts only rows that will change', () => {
    expect(countBulkChanges(previews())).toBe(3);
  });

  it('groups saved rows by their new status and leaves out skipped / unchanged rows', () => {
    expect(Object.fromEntries(groupBulkRowIdsByValue(previews()))).toEqual({
      [SECOND]: ['1', '2'],
      [FIRST]: ['4'],
    });
  });

  it('saves nothing when every row is already at the chosen status', () => {
    const all = build([row(1, FIRST), row(2, FIRST)], FIRST);
    expect(countBulkChanges(all)).toBe(0);
    expect(groupBulkRowIdsByValue(all).size).toBe(0);
  });
});

describe('bulk edit preview rows — display fields', () => {
  it('uses the freeform item name first, then the item name, then a fallback', () => {
    const previews = build(
      [
        { id: 1, data: { status: FIRST, item_name_freeform: 'Drill', item_name: 'X' } },
        { id: 2, data: { status: FIRST, item_name: 'Hammer' } },
        { id: 3, data: { status: FIRST } },
      ],
      ''
    );
    expect(previews.map((p) => p.itemName)).toEqual(['Drill', 'Hammer', 'Request #3']);
  });

  it('reads the status from the row when data has none', () => {
    const [preview] = build([{ id: 1, status: FIRST, data: {} }], SECOND);
    expect(preview.currentValue).toBe(FIRST);
    expect(preview.skipped).toBe(false);
  });

  it('shows the current status label', () => {
    const [preview] = build([row(1, FIRST)], '');
    expect(preview.currentLabel).toBe(getRequestStatusLabel(FIRST));
  });
});
