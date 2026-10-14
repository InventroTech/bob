import React from 'react';
import { cn } from '@/lib/utils';
import { formatVsTarget, type MyShiftSnapshot, type RmPerformanceRow } from '../rm-prd-analytics/aggregate';

export type RmShiftAccent = 'emerald' | 'sky';

const TONE_CLASSES = {
  amber: { box: 'border-amber-200 bg-amber-50', text: 'text-amber-800', bar: 'bg-amber-500' },
  emerald: { box: 'border-emerald-200 bg-emerald-50', text: 'text-emerald-800', bar: 'bg-emerald-500' },
  red: { box: 'border-red-200 bg-red-50', text: 'text-red-700', bar: 'bg-red-500' },
  slate: { box: 'border-slate-200 bg-slate-50', text: 'text-slate-800', bar: 'bg-slate-500' },
  sky: { box: 'border-sky-200 bg-sky-50', text: 'text-sky-800', bar: 'bg-sky-500' },
} as const;

type Tone = keyof typeof TONE_CLASSES;

const Stat: React.FC<{ label: string; value: string; sub: string; tone: Tone; fraction?: number }> = ({
  label,
  value,
  sub,
  tone,
  fraction,
}) => {
  const colors = TONE_CLASSES[tone];
  return (
    <div className={cn('rounded-xl border p-2.5', colors.box)}>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className={cn('font-mono text-base font-semibold', colors.text)}>{value}</div>
      {fraction !== undefined && (
        <div className="mt-1 h-1 w-full rounded-full bg-white/70">
          <div
            className={cn('h-1 rounded-full', colors.bar)}
            style={{ width: `${Math.min(Math.max(fraction, 0), 1) * 100}%` }}
          />
        </div>
      )}
      <div className="mt-1 text-[10px] text-slate-400">{sub}</div>
    </div>
  );
};

export interface RmShiftStatsProps {
  snapshot: MyShiftSnapshot;
  performance: Pick<RmPerformanceRow, 'achieved' | 'target' | 'attemptsPerLead' | 'uniqueLeads' | 'touches'>;
  breaches: number;
  accent: RmShiftAccent;
}

// The one shared stat grid behind both YourShiftPanel (an RM's own view of
// their own shift) and AssignedRmPerformancePanel (anyone else's view of
// whichever RM a lead is currently assigned to) — same rm_activity_events
// aggregation, same metrics, same layout, so "my shift" and "this RM's
// shift" never show different numbers for the same person on the same day.
export const RmShiftStats: React.FC<RmShiftStatsProps> = ({ snapshot, performance, breaches, accent }) => {
  const achievedPct = performance.target ? (performance.achieved / performance.target) * 100 : 0;
  return (
    <div className="grid grid-cols-2 gap-2">
      <Stat
        label="Trials vs Target"
        value={`${performance.achieved}/${performance.target || '—'}`}
        sub={formatVsTarget(performance.achieved, performance.target)}
        tone={accent}
        fraction={performance.target ? achievedPct / 100 : undefined}
      />
      <Stat
        label="Attempts per Lead"
        value={performance.attemptsPerLead.toFixed(2)}
        sub={`${performance.uniqueLeads} leads · ${performance.touches} touches`}
        tone={accent}
      />
      <Stat
        label="Handling"
        value={snapshot.handling.value}
        sub={`Pace ${snapshot.handling.pace}`}
        tone="amber"
        fraction={snapshot.handling.paceFraction}
      />
      <Stat label="Break" value={snapshot.breakTime.value} sub={`Off lead ${snapshot.breakTime.offLeadPct}%`} tone="slate" />
      <Stat label="Breaches" value={String(breaches)} sub="Today · Review" tone={breaches > 0 ? 'red' : 'slate'} />
      <Stat
        label="Not Connected"
        value={snapshot.notConnected.value}
        sub={`${snapshot.notConnected.touches} · ${snapshot.notConnected.threshold}`}
        tone="emerald"
        fraction={snapshot.notConnected.fraction}
      />
      <Stat
        label="Call Back"
        value={snapshot.callBack.value}
        sub={`${snapshot.callBack.touches} · ${snapshot.callBack.threshold}`}
        tone="amber"
        fraction={snapshot.callBack.fraction}
      />
      <Stat
        label="Not Interested"
        value={snapshot.notInterested.value}
        sub={`${snapshot.notInterested.touches} · ${snapshot.notInterested.threshold}`}
        tone="red"
        fraction={snapshot.notInterested.fraction}
      />
      <Stat
        label="Trial Subscribed"
        value={snapshot.trial.value}
        sub={`${snapshot.trial.touches} · ${snapshot.trial.threshold}`}
        tone="emerald"
        fraction={snapshot.trial.fraction}
      />
    </div>
  );
};
