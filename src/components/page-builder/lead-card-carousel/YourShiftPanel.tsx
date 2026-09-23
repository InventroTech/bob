import React, { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { useRmActivityEvents } from '../rm-prd-analytics/useRmActivityEvents';
import { filterByDateRange, resolveDateRange } from '../rm-prd-analytics/dateRange';
import { computeMyShiftSnapshot } from '../rm-prd-analytics/aggregate';
import { formatElapsed } from './useLeadTimer';

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

// The RM's own shift so far today — handling time, break time, and average
// handling time per disposition. Sits above the lead card; reuses the exact
// same rm_activity_events aggregation as the RM PRD analytics dashboard,
// just scoped down to this one RM.
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

  const snapshot = useMemo(() => {
    if (!activeUserId) return null;
    const todaysEvents = filterByDateRange(events, todayBounds);
    return computeMyShiftSnapshot(todaysEvents, activeUserId);
  }, [events, activeUserId, todayBounds]);

  if (loading || !snapshot) return null;

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

      <div className="grid grid-cols-2 gap-2">
        <ShiftStat label="Handling" value={snapshot.handling.value} sub={`Pace ${snapshot.handling.pace}`} tone="amber" fraction={snapshot.handling.paceFraction} />
        <ShiftStat label="Break" value={snapshot.breakTime.value} sub={`Off lead ${snapshot.breakTime.offLeadPct}%`} tone="slate" />
        <ShiftStat label="Not Connected" value={snapshot.notConnected.value} sub={`${snapshot.notConnected.touches} · ${snapshot.notConnected.threshold}`} tone="emerald" fraction={snapshot.notConnected.fraction} />
        <ShiftStat label="Call Back" value={snapshot.callBack.value} sub={`${snapshot.callBack.touches} · ${snapshot.callBack.threshold}`} tone="amber" fraction={snapshot.callBack.fraction} />
        <ShiftStat label="Not Interested" value={snapshot.notInterested.value} sub={`${snapshot.notInterested.touches} · ${snapshot.notInterested.threshold}`} tone="red" fraction={snapshot.notInterested.fraction} />
        <ShiftStat label="Trial Subscribed" value={snapshot.trial.value} sub={`${snapshot.trial.touches} · ${snapshot.trial.threshold}`} tone="emerald" fraction={snapshot.trial.fraction} />
      </div>
    </div>
  );
};

const TONE_CLASSES = {
  amber: { box: 'border-amber-200 bg-amber-50', text: 'text-amber-800', bar: 'bg-amber-500' },
  emerald: { box: 'border-emerald-200 bg-emerald-50', text: 'text-emerald-800', bar: 'bg-emerald-500' },
  red: { box: 'border-red-200 bg-red-50', text: 'text-red-700', bar: 'bg-red-500' },
  slate: { box: 'border-slate-200 bg-slate-50', text: 'text-slate-800', bar: 'bg-slate-500' },
} as const;

const ShiftStat: React.FC<{
  label: string;
  value: string;
  sub: string;
  tone: keyof typeof TONE_CLASSES;
  fraction?: number;
}> = ({ label, value, sub, tone, fraction }) => {
  const colors = TONE_CLASSES[tone];
  return (
    <div className={cn('rounded-xl border p-2.5', colors.box)}>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className={cn('font-mono text-base font-semibold', colors.text)}>{value}</div>
      {fraction !== undefined && (
        <div className="mt-1 h-1 w-full rounded-full bg-white/70">
          <div className={cn('h-1 rounded-full', colors.bar)} style={{ width: `${Math.min(Math.max(fraction, 0), 1) * 100}%` }} />
        </div>
      )}
      <div className="mt-1 text-[10px] text-slate-400">{sub}</div>
    </div>
  );
};
