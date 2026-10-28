import React, { useEffect, useMemo, useState } from 'react';
import { useRmActivityEvents } from '../rm-prd-analytics/useRmActivityEvents';
import { useRmDailyTargets } from '../rm-prd-analytics/useRmDailyTargets';
import { filterByDateRange, resolveDateRange } from '../rm-prd-analytics/dateRange';
import { computeAdherenceByRm, computeMyShiftSnapshot, computePerformanceByRm } from '../rm-prd-analytics/aggregate';
import { formatElapsed } from './useLeadTimer';
import { RmShiftStats } from './RmShiftStats';

// how often the panel re-pulls today's events — without this it freezes at
// whatever it looked like when the lead card first opened
const REFRESH_INTERVAL_MS = 60_000;

const TODAY_LABEL = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  timeZone: 'Asia/Kolkata',
}).format(new Date());

interface YourShiftPanelProps {
  activeUserId: string | null;
  elapsedSecondsOnLead: number;
}

// The RM's own shift so far today — target vs achieved, attempts per lead,
// breaches, handling/break time, and average handling time per disposition.
// Sits above the lead card; shares RmShiftStats with AssignedRmPerformancePanel
// (same rm_activity_events aggregation, same metrics) so an RM's own view of
// their shift always matches what a manager sees when they open one of this
// RM's leads from the table — just scoped down to this one RM.
export const YourShiftPanel: React.FC<YourShiftPanelProps> = ({ activeUserId, elapsedSecondsOnLead }) => {
  // Bumped every REFRESH_INTERVAL_MS so both todayBounds' `to` (the
  // client-side trim boundary below) and the fetch itself move forward —
  // "today"'s date string alone never changes intraday, so without this
  // the panel would fetch once at mount and then sit frozen for the rest
  // of the shift while only the "On This Lead" stopwatch above kept ticking.
  const [refreshTick, setRefreshTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setRefreshTick((t) => t + 1), REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  // this panel only ever needs today's events, scoped to this one RM —
  // windows the fetch itself instead of downloading every RM's events
  // tenant-wide and filtering to the current user in the browser
  const todayBounds = useMemo(() => resolveDateRange('Today', '', ''), [refreshTick]);
  const { events, loading } = useRmActivityEvents(
    activeUserId ? todayBounds : null,
    activeUserId ?? undefined,
    refreshTick
  );
  // targets are keyed by rm_user_id tenant-wide, but events is already
  // narrowed server-side to activeUserId, so computePerformanceByRm below
  // only ever produces (at most) this one RM's own row
  const { targets } = useRmDailyTargets(activeUserId ? todayBounds : null, refreshTick);

  const stats = useMemo(() => {
    if (!activeUserId) return null;
    const todaysEvents = filterByDateRange(events, todayBounds);
    const snapshot = computeMyShiftSnapshot(todaysEvents, activeUserId);
    const performance = computePerformanceByRm(todaysEvents, targets)[0] ?? {
      achieved: 0,
      target: targets[activeUserId] ?? 0,
      attemptsPerLead: 0,
      uniqueLeads: 0,
      touches: 0,
    };
    const breaches = computeAdherenceByRm(todaysEvents)[0]?.breaches ?? 0;
    return { snapshot, performance, breaches };
  }, [events, activeUserId, todayBounds, targets]);

  if (loading || !stats) return null;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Your Shift
        </div>
        <span className="text-xs text-slate-400">{TODAY_LABEL}</span>
      </div>

      <div className="mb-3 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">On This Lead</span>
        <span className="font-mono text-lg font-semibold text-slate-900">{formatElapsed(elapsedSecondsOnLead)}</span>
      </div>

      <RmShiftStats snapshot={stats.snapshot} performance={stats.performance} breaches={stats.breaches} accent="emerald" />
    </div>
  );
};
