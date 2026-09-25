// Turns the "Date Range" filter into an actual [from, to] window and filters
// events by it. Today/Yesterday/Last 7/30 days are computed off the browser's
// local clock; Custom uses whatever two dates the user picked.

export interface DateBounds {
  from: number; // epoch ms, inclusive
  to: number; // epoch ms, inclusive
}

const startOfDay = (d: Date) => {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const endOfDay = (d: Date) => {
  const copy = new Date(d);
  copy.setHours(23, 59, 59, 999);
  return copy;
};

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

// customFrom/customTo are plain "YYYY-MM-DD" strings from <input type="date">.
// Returns null when there's nothing to filter by yet (e.g. Custom picked but
// no dates chosen) — callers should treat null as "show everything".
export function resolveDateRange(dateRange: string, customFrom: string, customTo: string): DateBounds | null {
  const now = new Date();

  switch (dateRange) {
    case 'Today':
      return { from: startOfDay(now).getTime(), to: now.getTime() };
    case 'Yesterday': {
      const yesterday = daysAgo(1);
      return { from: startOfDay(yesterday).getTime(), to: endOfDay(yesterday).getTime() };
    }
    case 'Last 7 days':
      return { from: startOfDay(daysAgo(6)).getTime(), to: now.getTime() };
    case 'Last 30 days':
      return { from: startOfDay(daysAgo(29)).getTime(), to: now.getTime() };
    case 'Custom':
      if (!customFrom || !customTo) return null;
      return { from: startOfDay(new Date(customFrom)).getTime(), to: endOfDay(new Date(customTo)).getTime() };
    default:
      return null;
  }
}

export function filterByDateRange<T extends { startedAt: string }>(rows: T[], bounds: DateBounds | null): T[] {
  if (!bounds) return rows;
  return rows.filter((row) => {
    const t = new Date(row.startedAt).getTime();
    return t >= bounds.from && t <= bounds.to;
  });
}

// bounds are epoch ms and may straddle two UTC calendar days (e.g. "Today"
// in IST); widen to the UTC dates the instants fall in so a `from`/`to`
// backend window is a superset — filterByDateRange does the precise trim
// afterward. Shared by useRmActivityEvents and useRmDailyTargets so both
// windowed fetches use the same date-string convention.
export const toUtcDateParam = (ms: number) => new Date(ms).toISOString().slice(0, 10);
