'use client';

import React, { useMemo } from 'react';
import { Building2, FileStack, TrendingUp } from 'lucide-react';
import type { DispatchDashboardStats, DispatchMonthlyBar } from './fetchDispatchDashboardStats';

const CHART_HEIGHT = 88;

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function StatTile({
  icon,
  value,
  label,
  accent,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  accent: string;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center rounded-xl bg-[#f8fafc] px-2 py-3">
      <span className={`mb-1.5 flex h-8 w-8 items-center justify-center rounded-lg ${accent}`}>{icon}</span>
      <span className="text-lg font-bold leading-none text-gray-900">{value}</span>
      <span className="mt-1 text-center text-[10px] font-medium uppercase tracking-wide text-gray-500">
        {label}
      </span>
    </div>
  );
}

function buildYTicks(max: number): number[] {
  if (max <= 1) return [0, 1];
  const mid = Math.max(1, Math.round(max / 2));
  if (mid === max) return [0, max];
  return [max, mid, 0];
}

function MonthlyBarChart({ bars }: { bars: DispatchMonthlyBar[] }) {
  const maxBar = Math.max(1, ...bars.map((b) => b.count));
  const yTicks = buildYTicks(maxBar);
  const periodTotal = bars.reduce((sum, b) => sum + b.count, 0);
  const peakMonth = useMemo(() => {
    let best = bars[0];
    for (const b of bars) {
      if (b.count > (best?.count ?? 0)) best = b;
    }
    return best;
  }, [bars]);

  const plotHeight = CHART_HEIGHT + 16;

  return (
    <div className="mt-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-gray-900">Dispatch by month</p>
        <span className="shrink-0 rounded-full bg-[#7c3aed]/10 px-2.5 py-0.5 text-[10px] font-semibold text-[#7c3aed]">
          {periodTotal} in 6 mo
        </span>
      </div>

      <div className="flex gap-2 overflow-hidden">
        <div
          className="flex w-5 shrink-0 flex-col justify-between pt-4 text-right text-[9px] font-medium leading-none text-gray-500"
          style={{ height: plotHeight }}
        >
          {yTicks.map((tick) => (
            <span key={tick}>{tick}</span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex justify-between gap-1 px-0.5">
            {bars.map((bar) => (
              <span
                key={`${bar.monthKey}-value`}
                className="min-w-0 flex-1 text-center text-[10px] font-bold leading-none text-gray-900"
              >
                {bar.count}
              </span>
            ))}
          </div>

          <div className="relative" style={{ height: CHART_HEIGHT }}>
            <div
              className="pointer-events-none absolute inset-x-0 top-0 flex flex-col justify-between"
              style={{ height: CHART_HEIGHT }}
            >
              {yTicks.map((tick) => (
                <div key={tick} className="border-t border-dashed border-gray-200" />
              ))}
            </div>

            <div className="flex h-full items-end justify-between gap-1">
              {bars.map((bar) => {
                const barPx =
                  bar.count > 0
                    ? Math.max(14, Math.round((bar.count / maxBar) * CHART_HEIGHT))
                    : 6;
                const isPeak = bar.monthKey === peakMonth?.monthKey && bar.count > 0;

                return (
                  <div
                    key={bar.monthKey}
                    className="relative flex h-full min-w-0 flex-1 items-end justify-center"
                  >
                    <div
                      className="absolute bottom-0 w-full max-w-[36px] rounded-t-md bg-[#7c3aed]/12"
                      style={{ height: CHART_HEIGHT }}
                    />
                    <div
                      className={`relative z-[1] w-full max-w-[36px] rounded-t-md shadow-sm ${
                        bar.count > 0
                          ? 'bg-gradient-to-t from-[#7c3aed] to-[#a78bfa]'
                          : 'bg-[#7c3aed]/25'
                      } ${isPeak ? 'ring-2 ring-[#7c3aed]/30' : ''}`}
                      style={{ height: barPx }}
                      title={`${bar.label}: ${bar.count}`}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-1.5 flex justify-between gap-1 px-0.5">
            {bars.map((bar) => (
              <span
                key={`${bar.monthKey}-label`}
                className="min-w-0 flex-1 text-center text-[10px] font-medium text-gray-600"
              >
                {bar.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {peakMonth && peakMonth.count > 0 ? (
        <p className="mt-3 rounded-lg bg-[#f5f3ff] px-3 py-2 text-center text-xs text-gray-900">
          <span className="font-semibold text-[#7c3aed]">{peakMonth.label}</span> had the most activity (
          <span className="font-semibold">{peakMonth.count}</span> dispatch
          {peakMonth.count === 1 ? '' : 'es'})
        </p>
      ) : null}
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="mt-4 animate-pulse space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-gray-100" />
        ))}
      </div>
      <div className="h-44 rounded-xl bg-gray-100" />
    </div>
  );
}

export function DispatchDashboardStatsCard({
  title,
  subtitle,
  stats,
  loading,
  className = '',
}: {
  title: string;
  subtitle: string;
  stats: DispatchDashboardStats | null;
  loading: boolean;
  className?: string;
}) {
  const monthlyBars = stats?.monthlyBars ?? [];
  const hasChartData = monthlyBars.some((b) => b.count > 0);

  return (
    <div className={`rounded-2xl bg-white p-4 shadow-sm ${className}`}>
      <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>

      {loading ? (
        <StatsSkeleton />
      ) : stats ? (
        <>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <StatTile
              icon={<FileStack className="h-4 w-4 text-[#7c3aed]" />}
              value={formatCount(stats.totalCount)}
              label="Total"
              accent="bg-[#7c3aed]/10"
            />
            <StatTile
              icon={<Building2 className="h-4 w-4 text-orange-600" />}
              value={formatCount(stats.customerCount)}
              label="Customers"
              accent="bg-orange-50"
            />
            <StatTile
              icon={<TrendingUp className="h-4 w-4 text-emerald-600" />}
              value={formatCount(stats.thisMonthCount)}
              label="This month"
              accent="bg-emerald-50"
            />
          </div>

          <div className="mt-4 rounded-xl border border-[#7c3aed]/15 bg-gradient-to-b from-[#7c3aed]/[0.06] to-white px-3 pb-3 pt-3">
            {hasChartData ? (
              <MonthlyBarChart bars={monthlyBars} />
            ) : (
              <div className="py-8 text-center">
                <p className="text-xs font-semibold text-gray-900">Dispatch by month</p>
                <p className="mt-2 text-xs text-gray-500">No dispatch activity in the last 6 months</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <p className="mt-4 text-center text-sm text-gray-500">Could not load summary.</p>
      )}
    </div>
  );
}
