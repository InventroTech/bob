import React, { useMemo } from 'react';
import { useRmActivityEvents } from '../rm-prd-analytics/useRmActivityEvents';
import { useRmDailyTargets } from '../rm-prd-analytics/useRmDailyTargets';
import { filterByDateRange, resolveDateRange } from '../rm-prd-analytics/dateRange';
import { computePerformanceByRm, formatVsTarget, type RmPerformanceRow } from '../rm-prd-analytics/aggregate';

interface AssignedRmPerformancePanelProps {
  rmUserId: string | null;
}

const ZERO_ROW = (rmUserId: string, target: number): RmPerformanceRow => ({
  rmUserId,
  name: '',
  manager: '',
  team: '',
  state: '',
  uniqueLeads: 0,
  touches: 0,
  attemptsPerLead: 0,
  notConnectedRate: 0,
  callBackRate: 0,
  notInterestedRate: 0,
  trialRate: 0,
  achieved: 0,
  target,
});

// The performance of the RM this lead is assigned to, so far today — shown
// when a lead is opened from the table view (not YourShiftPanel's "my own
// shift", since whoever is browsing the table usually isn't the RM working
// this lead). Reuses the exact same rm_activity_events aggregation as the
// RM PRD analytics dashboard, scoped to this one RM.
export const AssignedRmPerformancePanel: React.FC<AssignedRmPerformancePanelProps> = ({ rmUserId }) => {
  const todayBounds = useMemo(() => resolveDateRange('Today', '', ''), []);
  const { events, loading: eventsLoading } = useRmActivityEvents(
    rmUserId ? todayBounds : null,
    rmUserId ?? undefined
  );
  const { targets, loading: targetsLoading } = useRmDailyTargets(rmUserId ? todayBounds : null);

  const row = useMemo(() => {
    if (!rmUserId) return null;
    const todaysEvents = filterByDateRange(events, todayBounds);
    const existing = computePerformanceByRm(todaysEvents, targets).find((r) => r.rmUserId === rmUserId);
    // no touches yet today — still show the target so a manager can see
    // what's expected, with everything else at 0
    return existing ?? ZERO_ROW(rmUserId, targets[rmUserId] ?? 0);
  }, [events, targets, rmUserId, todayBounds]);

  // A lead can genuinely have no assigned_to right now — e.g. auto-released
  // back to the pool after sitting unworked — even though it was touched
  // before (the NOT_CONNECTED/etc. history above still shows). Say so
  // explicitly rather than silently disappearing, which looked like a bug
  // ("shows for some leads, not others") when it's actually expected.
  if (!rmUserId) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 p-5 text-center text-sm text-slate-400">
        No RM currently assigned to this lead
      </div>
    );
  }

  if (eventsLoading || targetsLoading || !row) return null;

  return (
    <div>
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <span className="h-2 w-2 rounded-full bg-sky-500" />
        {row.name ? `${row.name} – Today` : 'Assigned RM – Today'}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Stat
          label="Target vs Achieved"
          value={`${row.achieved}/${row.target || '—'}`}
          sub={formatVsTarget(row.achieved, row.target)}
        />
        <Stat label="Leads Touched" value={String(row.uniqueLeads)} sub={`${row.touches} total touches`} />
        <Stat label="Conversion Rate" value={`${row.trialRate}%`} sub="Trial / leads touched" />
        <Stat label="Not Connected" value={`${row.notConnectedRate}%`} sub="of leads touched" />
      </div>
    </div>
  );
};

const Stat: React.FC<{ label: string; value: string; sub: string }> = ({ label, value, sub }) => (
  <div className="rounded-xl border border-sky-200 bg-sky-50 p-2.5">
    <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
    <div className="font-mono text-base font-semibold text-sky-800">{value}</div>
    <div className="mt-1 text-[10px] text-slate-400">{sub}</div>
  </div>
);
