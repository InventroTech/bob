'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Building2, Check, ChevronDown, FileStack, TrendingUp } from 'lucide-react';
import type { DispatchDashboardStats, DispatchMonthlyBar } from './fetchDispatchDashboardStats';

function EngineerSelect({
  engineers,
  selectedEngineer,
  onEngineerChange,
}: {
  engineers: string[];
  selectedEngineer: string;
  onEngineerChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const displayLabel = selectedEngineer || 'All';
  const options = ['', ...engineers];

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg border border-[#E8ECEF] bg-white py-1.5 pl-3 pr-2 text-xs font-semibold text-gray-900 outline-none focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed]"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Track performance for"
      >
        <span className="max-w-[72px] truncate">{displayLabel}</span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-gray-500 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open ? (
        <ul
          role="listbox"
          className="absolute right-0 top-[calc(100%+4px)] z-50 min-w-[120px] overflow-hidden rounded-xl border border-[#E8ECEF] bg-white py-1 shadow-lg"
        >
          {options.map((value) => {
            const label = value || 'All';
            const isSelected = value === selectedEngineer;
            return (
              <li key={value || '__all__'} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs font-medium transition hover:bg-[#f5f3ff] ${
                    isSelected ? 'text-[#7c3aed]' : 'text-gray-900'
                  }`}
                  onClick={() => {
                    onEngineerChange(value);
                    setOpen(false);
                  }}
                >
                  <span>{label}</span>
                  {isSelected ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

const CHART_HEIGHT = 180;

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export function DispatchStatsTiles({
  stats,
  loading,
  className = '',
}: {
  stats: DispatchDashboardStats | null;
  loading: boolean;
  className?: string;
}) {
  if (loading) {
    return (
      <div className={`grid grid-cols-3 gap-3 ${className}`}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[100px] animate-pulse rounded-xl border border-[#E8ECEF] bg-white" />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const tiles = [
    {
      icon: <Building2 className="h-4 w-4 text-orange-500" />,
      value: formatCount(stats.customerCount),
      label: 'Customers',
      accent: 'bg-orange-50',
    },
    {
      icon: <FileStack className="h-4 w-4 text-[#7c3aed]" />,
      value: formatCount(stats.totalCount),
      label: 'Total',
      accent: 'bg-[#7c3aed]/10',
    },
    {
      icon: <TrendingUp className="h-4 w-4 text-emerald-600" />,
      value: formatCount(stats.thisMonthCount),
      label: 'This Month',
      accent: 'bg-emerald-50',
    },
  ];

  return (
    <div className={`grid grid-cols-3 gap-3 ${className}`}>
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className="flex flex-col items-center justify-center rounded-xl border border-[#E8ECEF] bg-white px-2 py-4"
        >
          <span className={`mb-1.5 flex h-8 w-8 items-center justify-center rounded-lg ${tile.accent}`}>
            {tile.icon}
          </span>
          <span className="text-lg font-bold leading-none text-gray-900">{tile.value}</span>
          <span className="mt-1 text-center text-[10px] font-semibold uppercase tracking-wide text-gray-500">
            {tile.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function buildYTicks(max: number): number[] {
  if (max <= 1) return [0, 1];
  const mid = Math.max(1, Math.round(max / 2));
  if (mid === max) return [max, 0];
  return [max, mid, 0];
}

function MonthlyBarChart({ bars }: { bars: DispatchMonthlyBar[] }) {
  const maxBar = Math.max(1, ...bars.map((b) => b.count));
  const yTicks = buildYTicks(maxBar);
  const peakMonth = useMemo(() => {
    let best = bars[0];
    for (const b of bars) {
      if (b.count > (best?.count ?? 0)) best = b;
    }
    return best;
  }, [bars]);

  const plotHeight = CHART_HEIGHT;

  return (
    <div>
      <div className="flex gap-2">
        <div
          className="flex w-5 shrink-0 flex-col justify-between pt-1 text-right text-[9px] font-medium leading-none text-gray-400"
          style={{ height: plotHeight }}
        >
          {yTicks.map((tick) => (
            <span key={tick}>{tick}</span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex justify-between gap-1 px-0.5">
            {bars.map((bar) => (
              <span
                key={`${bar.monthKey}-value`}
                className="min-w-0 flex-1 text-center text-[10px] font-bold leading-none text-gray-900"
              >
                {bar.count}
              </span>
            ))}
          </div>

          <div className="relative" style={{ height: plotHeight }}>
            <div
              className="pointer-events-none absolute inset-x-0 top-0 flex flex-col justify-between"
              style={{ height: plotHeight }}
            >
              {yTicks.map((tick) => (
                <div key={tick} className="border-t border-dashed border-[#E8ECEF]" />
              ))}
            </div>

            <div className="flex h-full items-end justify-between gap-1">
              {bars.map((bar) => {
                const barPx =
                  bar.count > 0
                    ? Math.max(14, Math.round((bar.count / maxBar) * plotHeight))
                    : 6;
                const isPeak = bar.monthKey === peakMonth?.monthKey && bar.count > 0;

                return (
                  <div
                    key={bar.monthKey}
                    className="relative flex h-full min-w-0 flex-1 items-end justify-center"
                  >
                    <div
                      className="absolute bottom-0 w-full max-w-[36px] rounded-t-md bg-[#7c3aed]/10"
                      style={{ height: plotHeight }}
                    />
                    <div
                      className={`relative z-[1] w-full max-w-[36px] rounded-t-md ${
                        bar.count > 0
                          ? 'bg-gradient-to-t from-[#7c3aed] to-[#a78bfa]'
                          : 'bg-[#7c3aed]/25'
                      } ${isPeak ? 'ring-2 ring-[#7c3aed]/25' : ''}`}
                      style={{ height: barPx }}
                      title={`${bar.label}: ${bar.count}`}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-2 flex justify-between gap-1 px-0.5 pb-0.5">
            {bars.map((bar) => (
              <span
                key={`${bar.monthKey}-label`}
                className="min-w-0 flex-1 text-center text-[11px] font-medium text-gray-600"
              >
                {bar.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {peakMonth && peakMonth.count > 0 ? (
        <p className="mt-3 rounded-lg bg-[#f5f3ff] px-2.5 py-1.5 text-center text-[11px] leading-snug text-gray-700">
          <span className="font-semibold text-[#7c3aed]">{peakMonth.label}</span> had the most activity (
          <span className="font-semibold">{peakMonth.count}</span> dispatch
          {peakMonth.count === 1 ? '' : 'es'})
        </p>
      ) : null}
    </div>
  );
}

export function DispatchSalesChartCard({
  title,
  subtitle,
  stats,
  loading,
  engineers,
  selectedEngineer,
  onEngineerChange,
  className = '',
}: {
  title: string;
  subtitle: string;
  stats: DispatchDashboardStats | null;
  loading: boolean;
  engineers: string[];
  selectedEngineer: string;
  onEngineerChange: (value: string) => void;
  className?: string;
}) {
  const monthlyBars = stats?.monthlyBars ?? [];
  const hasChartData = monthlyBars.some((b) => b.count > 0);

  return (
    <div className={`rounded-xl border border-[#E8ECEF] bg-white p-4 ${className}`}>
      <div className="flex shrink-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-gray-900">{title}</h2>
          <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>
        </div>
        {engineers.length > 0 ? (
          <EngineerSelect
            engineers={engineers}
            selectedEngineer={selectedEngineer}
            onEngineerChange={onEngineerChange}
          />
        ) : null}
      </div>

      {loading ? (
        <div className="mt-4 h-[220px] animate-pulse rounded-lg bg-gray-100" />
      ) : hasChartData ? (
        <div className="mt-4">
          <MonthlyBarChart bars={monthlyBars} />
        </div>
      ) : (
        <div className="mt-4 py-6 text-center">
          <p className="text-xs text-gray-500">No dispatch activity in the last 6 months</p>
        </div>
      )}
    </div>
  );
}

/** @deprecated Use DispatchSalesChartCard + DispatchStatsTiles separately */
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
  return (
    <div className={className}>
      <DispatchSalesChartCard
        title={title}
        subtitle={subtitle}
        stats={stats}
        loading={loading}
        engineers={[]}
        selectedEngineer=""
        onEngineerChange={() => {}}
      />
      <DispatchStatsTiles stats={stats} loading={loading} className="mt-4" />
    </div>
  );
}
