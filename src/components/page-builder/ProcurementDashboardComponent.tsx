'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  Clock3,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  IndianRupee,
  Layers,
  Loader2,
  Package,
  RefreshCw,
  ShoppingBag,
  Tag,
  Truck,
  Wallet,
  Wrench,
} from 'lucide-react';
import { toast } from 'sonner';
import { getInventoryStatusLabel, getInventoryStatusToneClass } from '@/lib/inventory/statusStyles';
import {
  buildSpendSlices,
  fetchProcurementDashboardData,
  formatDisplayDate,
  formatInr,
  formatInrPrecise,
  rowInCalendarMonth,
  rowInDateRange,
  type CategorySlice,
  type ProcurementDashboardData,
  type ProcurementRequestRow,
  type SpendBreakdownMode,
} from './procurement/fetchProcurementDashboardData';
import { downloadReportCsv, type ReportId } from './procurement/downloadReportCsv';

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function defaultReportRange(now = new Date()): { start: string; end: string } {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start: toYmd(start), end: toYmd(end) };
}

function formatYmdLabel(ymd: string): string {
  if (!ymd) return '—';
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d) return ymd;
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export type ProcurementDashboardConfig = {
  title?: string;
  entityType?: string;
};

interface ProcurementDashboardProps {
  config?: ProcurementDashboardConfig;
}

export const DEFAULT_PROCUREMENT_DASHBOARD_CONFIG: ProcurementDashboardConfig = {
  title: 'Procurement Dashboard',
  entityType: 'unmannd_request',
};

const REPORTS: { id: ReportId; label: string; color: string; iconBg: string }[] = [
  { id: 'spend', label: 'Procurement Spend', color: 'text-blue-600', iconBg: 'bg-blue-100' },
  { id: 'supplier', label: 'Supplier Performance', color: 'text-emerald-600', iconBg: 'bg-emerald-100' },
  { id: 'department', label: 'Department Spending', color: 'text-orange-600', iconBg: 'bg-orange-100' },
  { id: 'po', label: 'Purchase Order', color: 'text-violet-600', iconBg: 'bg-violet-100' },
  { id: 'invoice', label: 'Invoice Status', color: 'text-rose-600', iconBg: 'bg-rose-100' },
  { id: 'payment', label: 'Payment Report', color: 'text-sky-600', iconBg: 'bg-sky-100' },
  { id: 'budget', label: 'Budget Utilization', color: 'text-amber-600', iconBg: 'bg-amber-100' },
  { id: 'tax', label: 'Tax Report', color: 'text-indigo-600', iconBg: 'bg-indigo-100' },
];

type StatusFilter = 'all' | 'pending' | 'ordered' | 'rejected';

const KPI_ICON = {
  blue: Wallet,
  green: Package,
  orange: Truck,
  red: AlertTriangle,
  amber: Clock3,
  cyan: ShoppingBag,
  violet: Layers,
} as const;

const KPI_ICON_WRAP = {
  blue: 'bg-blue-100 text-blue-600',
  green: 'bg-emerald-100 text-emerald-600',
  orange: 'bg-sky-100 text-sky-600',
  red: 'bg-rose-100 text-rose-600',
  amber: 'bg-orange-100 text-orange-600',
  cyan: 'bg-cyan-100 text-cyan-600',
  violet: 'bg-violet-100 text-violet-600',
} as const;

const NAVY = '#1A3673';

function matchesFilter(row: ProcurementRequestRow, filter: StatusFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'pending') {
    return row.status === 'NEW_REQUEST' || row.status === 'ON_HOLD' || row.status === 'REQ_TO_VERIFY';
  }
  if (filter === 'ordered') {
    return row.status === 'VENDOR_IDENTIFIED' || row.status === 'IN_CART' || row.status === 'IN_SHIPPING';
  }
  return row.status === 'REJECTED';
}

function exportCsv(rows: ProcurementRequestRow[]) {
  downloadReportCsv('payment', rows);
}

function handleReportClick(reportId: ReportId, rows: ProcurementRequestRow[]) {
  if (!rows.length) {
    toast.message('No request data to export yet');
    return;
  }
  const label = downloadReportCsv(reportId, rows);
  toast.success(`${label} CSV downloaded`);
}

type PeriodKey = string;

function buildPeriodOptions(now = new Date()): { key: PeriodKey; label: string; year: number; month: number }[] {
  const opts: { key: PeriodKey; label: string; year: number; month: number }[] = [];
  for (let i = 1; i <= 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth();
    const key = `${year}-${month}`;
    const label =
      i === 1
        ? 'Last Month'
        : d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    opts.push({ key, label, year, month });
  }
  opts.unshift({
    key: `${now.getFullYear()}-${now.getMonth()}`,
    label: 'This Month',
    year: now.getFullYear(),
    month: now.getMonth(),
  });
  return opts;
}

function categoryIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes('maint') || n.includes('repair')) return Wrench;
  if (n.includes('office') || n.includes('supply')) return Package;
  if (n.includes('service')) return ShoppingBag;
  if (n.includes('it') || n.includes('equip')) return Layers;
  return Tag;
}

function CategorySpendPanel({
  slices,
  total,
  periods,
  selectedPeriod,
  onPeriodChange,
  breakdown,
  onBreakdownChange,
  onViewFullReport,
}: {
  slices: CategorySlice[];
  total: number;
  periods: { key: string; label: string }[];
  selectedPeriod: string;
  onPeriodChange: (key: string) => void;
  breakdown: SpendBreakdownMode;
  onBreakdownChange: (mode: SpendBreakdownMode) => void;
  onViewFullReport: () => void;
}) {
  const circumference = 2 * Math.PI * 38;
  let offset = 0;
  const maxAmount = slices[0]?.amount || 1;
  const emptyLabel =
    breakdown === 'item'
      ? 'No item spend in this period'
      : breakdown === 'vendor'
        ? 'No vendor spend in this period'
        : 'No shipment type spend in this period';

  const modes: { id: SpendBreakdownMode; label: string }[] = [
    { id: 'category', label: 'Shipment Type' },
    { id: 'item', label: 'Item' },
    { id: 'vendor', label: 'Vendor' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-full bg-slate-100 p-1 self-start">
          {modes.map((m) => {
            const active = breakdown === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onBreakdownChange(m.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition sm:px-4 sm:text-sm ${
                  active
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {m.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
          {periods.map((p) => {
            const active = p.key === selectedPeriod;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => onPeriodChange(p.key)}
                className={`shrink-0 border-b-2 px-2.5 pb-1.5 text-sm transition ${
                  active
                    ? 'border-[#1A3673] font-semibold text-[#1A3673]'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-center">
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-center sm:gap-8">
          <div className="relative h-44 w-44 shrink-0 sm:h-48 sm:w-48">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="38" fill="none" stroke="#EEF2F7" strokeWidth="10" />
              {slices.length === 0 ? null : (
                slices.map((slice) => {
                  const pct = total > 0 ? slice.amount / total : 0;
                  const len = pct * circumference;
                  const circle = (
                    <circle
                      key={slice.name}
                      cx="50"
                      cy="50"
                      r="38"
                      fill="none"
                      stroke={slice.color}
                      strokeWidth="10"
                      strokeDasharray={`${len} ${circumference - len}`}
                      strokeDashoffset={-offset}
                    />
                  );
                  offset += len;
                  return circle;
                })
              )}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                {formatInrPrecise(total)}
              </span>
            </div>
          </div>

          <ul className="w-full max-w-[200px] space-y-2 text-sm">
            {slices.length === 0 ? (
              <li className="text-slate-500">{emptyLabel}</li>
            ) : (
              slices.map((slice) => (
                <li key={slice.name} className="flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: slice.color }}
                    />
                    <span className="truncate text-slate-600">{slice.name}</span>
                  </span>
                  <span className="shrink-0 tabular-nums font-medium text-slate-800">
                    {slice.percent.toFixed(2)}%
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>

        <ul className="space-y-3">
          {slices.map((slice) => {
            const Icon = categoryIcon(slice.name);
            const widthPct = Math.max(4, Math.round((slice.amount / maxAmount) * 100));
            return (
              <li key={`bar-${slice.name}`} className="flex items-start gap-3">
                <span
                  className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${slice.color}33`, color: slice.color }}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-slate-800">{slice.name}</span>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-900">
                      {formatInrPrecise(slice.amount)}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${widthPct}%`, backgroundColor: slice.color }}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex justify-end border-t border-slate-100 pt-3">
        <button
          type="button"
          onClick={onViewFullReport}
          className="text-sm font-medium text-[#1A3673] hover:underline"
        >
          View Full Report →
        </button>
      </div>
    </div>
  );
}

/**
 * Full procurement overview dashboard (KPI + requests table + reports + category spend).
 * Mapped to unmannd/inventory request records (not a separate payments ledger).
 */
export const ProcurementDashboardComponent: React.FC<ProcurementDashboardProps> = ({ config }) => {
  const entityType = config?.entityType || 'unmannd_request';

  const [data, setData] = useState<ProcurementDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const pageSize = 5;
  const periodOptions = useMemo(() => buildPeriodOptions(), []);
  const [selectedPeriod, setSelectedPeriod] = useState<string>(
    () => periodOptions.find((p) => p.label === 'Last Month')?.key ?? periodOptions[0]!.key
  );
  const [spendBreakdown, setSpendBreakdown] = useState<SpendBreakdownMode>('category');
  const [reportRange, setReportRange] = useState(() => defaultReportRange());
  const [showReportRangePicker, setShowReportRangePicker] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const next = await fetchProcurementDashboardData(entityType);
      setData(next);
    } catch (err) {
      console.error('[ProcurementDashboard] load failed', err);
      toast.error('Failed to load procurement dashboard');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [entityType]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredRows = useMemo(() => {
    const rows = data?.rows ?? [];
    return rows.filter((r) => matchesFilter(r, statusFilter));
  }, [data?.rows, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageRows = filteredRows.slice((safePage - 1) * pageSize, safePage * pageSize);
  // Sliding window of up to 4 page buttons so pages beyond 4 remain reachable.
  const visiblePageNumbers = useMemo(() => {
    const maxButtons = 4;
    if (pageCount <= maxButtons) {
      return Array.from({ length: pageCount }, (_, i) => i + 1);
    }
    let start = Math.max(1, safePage - Math.floor((maxButtons - 1) / 2));
    let end = start + maxButtons - 1;
    if (end > pageCount) {
      end = pageCount;
      start = end - maxButtons + 1;
    }
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [pageCount, safePage]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  const dateRangeLabel = useMemo(
    () => `${formatYmdLabel(reportRange.start)} - ${formatYmdLabel(reportRange.end)}`,
    [reportRange.end, reportRange.start]
  );

  const reportRows = useMemo(() => {
    const rows = data?.rows ?? [];
    return rows.filter((r) => rowInDateRange(r, reportRange.start, reportRange.end));
  }, [data?.rows, reportRange.end, reportRange.start]);

  const categoryView = useMemo(() => {
    const period = periodOptions.find((p) => p.key === selectedPeriod) ?? periodOptions[0]!;
    const rows = (data?.rows ?? []).filter((r) =>
      rowInCalendarMonth(r, period.year, period.month)
    );
    return buildSpendSlices(rows, spendBreakdown);
  }, [data?.rows, periodOptions, selectedPeriod, spendBreakdown]);

  const handleViewFullReport = () => {
    if (!categoryView.slices.length) {
      toast.message('No data to export for this period');
      return;
    }
    const periodRows = (data?.rows ?? []).filter((r) => {
      const period = periodOptions.find((p) => p.key === selectedPeriod) ?? periodOptions[0]!;
      return rowInCalendarMonth(r, period.year, period.month);
    });
    const reportId =
      spendBreakdown === 'vendor'
        ? 'supplier'
        : spendBreakdown === 'item'
          ? 'payment'
          : 'spend';
    downloadReportCsv(reportId, periodRows);
    toast.success('Spend breakdown CSV downloaded');
  };

  return (
    <div className="w-full space-y-4 bg-[#F5F7FA] p-3 sm:p-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Refresh
        </button>
      </div>

      {/* Spend Breakdown — full width */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        {loading && !data ? (
          <div className="flex h-40 items-center justify-center text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <CategorySpendPanel
            slices={categoryView.slices}
            total={categoryView.total}
            periods={periodOptions}
            selectedPeriod={selectedPeriod}
            onPeriodChange={setSelectedPeriod}
            breakdown={spendBreakdown}
            onBreakdownChange={setSpendBreakdown}
            onViewFullReport={handleViewFullReport}
          />
        )}
      </div>

      {/* KPI cards — single row */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {(
          data?.kpis ??
          Array.from({ length: 7 }, () => null)
        ).map((kpi, i) => {
          const tone =
            kpi?.tone ??
            (['blue', 'cyan', 'violet', 'amber', 'green', 'red', 'orange'] as const)[i]!;
          const Icon = KPI_ICON[tone];
          return (
            <div
              key={kpi?.id ?? `kpi-skeleton-${i}`}
              className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
            >
              <div className={`inline-flex rounded-lg p-1.5 ${KPI_ICON_WRAP[tone]}`}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              <p className="mt-2 text-[10px] font-semibold uppercase leading-tight tracking-wide text-slate-500">
                {kpi?.label ?? '—'}
              </p>
              <p className="mt-1 text-base font-semibold tabular-nums text-slate-900 sm:text-lg">
                {loading && !kpi ? '—' : formatInr(kpi?.amount ?? 0)}
              </p>
            </div>
          );
        })}
      </div>

      {/* Requests table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div
          className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
          style={{ backgroundColor: NAVY }}
        >
          <h3 className="text-sm font-semibold text-white">Requests</h3>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="h-8 rounded-md border-0 bg-white/95 px-2 text-xs font-medium text-slate-700 shadow-sm"
            >
              <option value="all">All Requests</option>
              <option value="pending">Pending</option>
              <option value="ordered">Ordered / Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-white/95 text-slate-600 shadow-sm">
              <Filter className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2.5">Request ID</th>
                <th className="px-4 py-2.5">Vendor</th>
                <th className="px-4 py-2.5">Item</th>
                <th className="px-4 py-2.5">Request Date</th>
                <th className="px-4 py-2.5">Track</th>
                <th className="px-4 py-2.5">Amount</th>
                <th className="px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && !data ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7} className="px-4 py-3">
                      <div className="h-4 animate-pulse rounded bg-slate-100" />
                    </td>
                  </tr>
                ))
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">
                    No requests found
                  </td>
                </tr>
              ) : (
                pageRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-2.5 font-medium text-blue-600">#{row.id}</td>
                    <td className="px-4 py-2.5 uppercase text-slate-700">{row.vendor}</td>
                    <td className="max-w-[180px] truncate px-4 py-2.5 text-slate-700">
                      {row.itemName}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">
                      {formatDisplayDate(row.requestDate)}
                    </td>
                    <td className="px-4 py-2.5">
                      {row.trackingLink ? (
                        <a
                          href={row.trackingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-blue-600 hover:underline"
                        >
                          Link
                        </a>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-slate-800">
                      {formatInr(row.amount)}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${getInventoryStatusToneClass(row.status)}`}
                      >
                        {getInventoryStatusLabel(row.status)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
          <span>
            Showing{' '}
            {filteredRows.length === 0 ? 0 : (safePage - 1) * pageSize + 1} to{' '}
            {Math.min(safePage * pageSize, filteredRows.length)} of {filteredRows.length} requests
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded border border-slate-200 px-2 py-1 disabled:opacity-40"
            >
              ‹
            </button>
            {visiblePageNumbers.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setPage(n)}
                className={`min-w-7 rounded px-2 py-1 ${
                  n === safePage
                    ? 'bg-[#1A3673] text-white'
                    : 'border border-slate-200 text-slate-700'
                }`}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              disabled={safePage >= pageCount}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              className="rounded border border-slate-200 px-2 py-1 disabled:opacity-40"
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {/* Reports — navy panel */}
      <div className="rounded-xl p-4 shadow-sm sm:p-5" style={{ backgroundColor: NAVY }}>
        <h3 className="mb-4 text-sm font-semibold text-white">Reports</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {REPORTS.map((report) => (
            <button
              key={report.id}
              type="button"
              onClick={() => handleReportClick(report.id, reportRows)}
              className="relative flex flex-col items-start gap-3 rounded-xl bg-white px-3 py-4 text-left shadow-sm transition hover:shadow-md"
            >
              <span className={`inline-flex h-10 w-10 items-center justify-center rounded-full ${report.iconBg} ${report.color}`}>
                <IndianRupee className="h-4 w-4" />
              </span>
              <span className="pr-6 text-xs font-semibold leading-snug text-slate-800">
                {report.label}
              </span>
              <Download className="absolute bottom-3 right-3 h-3.5 w-3.5 text-slate-400" />
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/15 pt-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowReportRangePicker((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-md border border-white/25 bg-white/10 px-2.5 py-1.5 text-xs text-white hover:bg-white/15"
            >
              <Calendar className="h-3.5 w-3.5" />
              {dateRangeLabel}
            </button>
            {showReportRangePicker ? (
              <div className="absolute bottom-full left-0 z-20 mb-2 w-64 rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Report date range
                </p>
                <div className="space-y-2">
                  <label className="block text-xs text-slate-600">
                    From
                    <input
                      type="date"
                      value={reportRange.start}
                      max={reportRange.end || undefined}
                      onChange={(e) =>
                        setReportRange((prev) => ({ ...prev, start: e.target.value }))
                      }
                      className="mt-1 h-8 w-full rounded-md border border-slate-200 px-2 text-xs text-slate-800"
                    />
                  </label>
                  <label className="block text-xs text-slate-600">
                    To
                    <input
                      type="date"
                      value={reportRange.end}
                      min={reportRange.start || undefined}
                      onChange={(e) =>
                        setReportRange((prev) => ({ ...prev, end: e.target.value }))
                      }
                      className="mt-1 h-8 w-full rounded-md border border-slate-200 px-2 text-xs text-slate-800"
                    />
                  </label>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setReportRange(defaultReportRange())}
                    className="text-xs font-medium text-slate-500 hover:text-slate-700"
                  >
                    This month
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowReportRangePicker(false)}
                    className="rounded-md bg-slate-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-800"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => {
              if (!reportRows.length) {
                toast.message('No request data in this date range');
                return;
              }
              exportCsv(reportRows);
              toast.success('Exported Excel (CSV)');
            }}
            className="inline-flex items-center gap-1.5 rounded-md border border-emerald-300/80 bg-white px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Export Excel
          </button>
          <button
            type="button"
            onClick={() => toast.message('PDF export coming soon')}
            className="inline-flex items-center gap-1.5 rounded-md border border-rose-300/80 bg-white px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50"
          >
            <FileText className="h-3.5 w-3.5" />
            Export PDF
          </button>
        </div>
      </div>
    </div>
  );
};
