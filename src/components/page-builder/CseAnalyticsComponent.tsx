import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bar, Line, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import {
  cseAnalyticsApi,
  type CseAttributeOption,
  type CseFilterParams,
  type CseMemberData,
  type CseOverviewData,
  type CseTimeSeriesPoint,
} from '@/lib/api/services/cseAnalytics';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Calendar, ChevronDown, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface CseAnalyticsComponentProps {
  config?: {
    title?: string;
    showDatePicker?: boolean;
    /** Analytics type this board belongs to (e.g. 'cse', 'rm'). */
    analyticsType?: string;
  };
}

type DatePreset = 'last7days' | 'last30days' | 'custom';

const formatDate = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getPresetRange = (preset: DatePreset): { from: string; to: string } => {
  const today = new Date();
  const to = formatDate(today);
  const start = new Date(today);
  if (preset === 'last30days') {
    start.setDate(today.getDate() - 29);
  } else {
    start.setDate(today.getDate() - 6);
  }
  return { from: formatDate(start), to };
};

const formatTime = (seconds: number | null | undefined): string => {
  if (seconds == null || Number.isNaN(seconds)) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const formatStatusLabel = (value: string): string =>
  value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

// ---- Mixpanel-style query builder config ----
type ChartType =
  | 'line'
  | 'stackedLine'
  | 'column'
  | 'stackedColumn'
  | 'bar'
  | 'stackedBar'
  | 'pie'
  | 'table'
  | 'metric';

type BreakdownType = 'date' | 'cse';

type MetricFormat = 'number' | 'percent' | 'time';

interface MetricDef {
  key: string;
  label: string;
  color: string;
  format: MetricFormat;
  fromTs?: (p: CseTimeSeriesPoint) => number;
  fromCse?: (m: CseMemberData) => number;
  fromOverview?: (o: CseOverviewData) => number;
}

const METRIC_DEFS: MetricDef[] = [
  {
    key: 'assigned',
    label: 'Assigned',
    color: '#3b82f6',
    format: 'number',
    fromTs: (p) => p.assigned,
    fromCse: (m) => m.leads_assigned,
    fromOverview: (o) => o.leads_assigned,
  },
  {
    key: 'resolved',
    label: 'Resolved',
    color: '#22c55e',
    format: 'number',
    fromTs: (p) => p.resolved,
    fromCse: (m) => m.resolved,
    fromOverview: (o) => o.resolved,
  },
  {
    key: 'resolve_rate',
    label: 'Resolve Rate',
    color: '#a855f7',
    format: 'percent',
    fromTs: (p) => Math.round((p.resolve_rate || 0) * 100),
    fromCse: (m) => Math.round((m.resolve_rate || 0) * 100),
    fromOverview: (o) => Math.round((o.resolve_rate || 0) * 100),
  },
  {
    key: 'avg_handling_time',
    label: 'Avg Handling Time',
    color: '#fb923c',
    format: 'time',
    fromTs: (p) => Math.round(p.average_handling_time_seconds || 0),
    fromCse: (m) => Math.round(m.average_handling_time_seconds || 0),
    fromOverview: (o) => Math.round(o.average_handling_time_seconds || 0),
  },
  {
    key: 'not_connected',
    label: 'Not Connected',
    color: '#ef4444',
    format: 'number',
    fromTs: (p) => p.not_connected,
    fromOverview: (o) => o.not_connected,
  },
  {
    key: 'call_back',
    label: 'Call Back',
    color: '#f59e0b',
    format: 'number',
    fromTs: (p) => p.call_later,
    fromOverview: (o) => o.call_later,
  },
  {
    key: 'open_call_back',
    label: 'Open Call Back',
    color: '#f97316',
    format: 'number',
    fromCse: (m) => m.open_call_back,
    fromOverview: (o) => o.open_call_back,
  },
  {
    key: 'open_not_connected',
    label: 'Open Not Connected',
    color: '#dc2626',
    format: 'number',
    fromCse: (m) => m.open_not_connected,
    fromOverview: (o) => o.open_not_connected,
  },
];

const CHART_TYPES: { value: ChartType; label: string }[] = [
  { value: 'line', label: 'Line' },
  { value: 'stackedLine', label: 'Stacked Line' },
  { value: 'column', label: 'Column' },
  { value: 'stackedColumn', label: 'Stacked Column' },
  { value: 'bar', label: 'Bar' },
  { value: 'stackedBar', label: 'Stacked Bar' },
  { value: 'pie', label: 'Pie' },
  { value: 'table', label: 'Table' },
  { value: 'metric', label: 'Metric' },
];

const PIE_PALETTE = [
  '#3b82f6',
  '#22c55e',
  '#a855f7',
  '#fb923c',
  '#ef4444',
  '#14b8a6',
  '#eab308',
  '#ec4899',
  '#6366f1',
  '#84cc16',
  '#f97316',
  '#06b6d4',
];

const hexToRgba = (hex: string, alpha: number): string => {
  const value = hex.replace('#', '');
  const r = parseInt(value.substring(0, 2), 16);
  const g = parseInt(value.substring(2, 4), 16);
  const b = parseInt(value.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const formatMetricValue = (format: MetricFormat, value: number): string => {
  if (format === 'percent') return `${value}%`;
  if (format === 'time') return formatTime(value);
  return `${value}`;
};

const getAvailableMetrics = (breakdown: BreakdownType): MetricDef[] =>
  METRIC_DEFS.filter((m) => (breakdown === 'date' ? !!m.fromTs : !!m.fromCse));

const getMetricLabels = (metricKeys: string[]): string =>
  metricKeys
    .map((k) => METRIC_DEFS.find((m) => m.key === k)?.label)
    .filter(Boolean)
    .join(', ');

// ---- Per-report filters ----
interface ReportFilters {
  from: string;
  to: string;
  datePreset: DatePreset;
  // Dynamic attribute filters: data field -> selected values
  attributes: Record<string, string[]>;
  handling_status?: string;
}

interface FilterOptions {
  attributes: CseAttributeOption[];
  handlingStatuses: string[];
}

const HANDLING_STATUS_KEY = 'handling_status';

/** Migrates any older/persisted filter shape to the current one. */
const normalizeFilters = (raw: any): ReportFilters => {
  const fallback = getPresetRange('last7days');
  const attributes: Record<string, string[]> =
    raw && typeof raw.attributes === 'object' && raw.attributes ? { ...raw.attributes } : {};
  // Back-compat: fold legacy dedicated fields into attributes
  if (raw?.ticket_type && !attributes.support_ticket_type) {
    attributes.support_ticket_type = String(raw.ticket_type).split(',').filter(Boolean);
  }
  if (raw?.cse_name && !attributes.cse_name) {
    attributes.cse_name = [String(raw.cse_name)];
  }
  return {
    from: raw?.from || fallback.from,
    to: raw?.to || fallback.to,
    datePreset: (raw?.datePreset as DatePreset) || 'last7days',
    attributes,
    handling_status: raw?.handling_status || undefined,
  };
};

const filtersToParams = (filters: ReportFilters): CseFilterParams => {
  const attrs = filters.attributes || {};
  const nonEmpty = Object.fromEntries(
    Object.entries(attrs).filter(([, values]) => Array.isArray(values) && values.length > 0)
  );
  const af = Object.keys(nonEmpty).length > 0 ? JSON.stringify(nonEmpty) : undefined;
  return {
    from: filters.from,
    to: filters.to,
    handling_status: filters.handling_status,
    af,
  };
};

// ---- Saved board report ----
interface BoardReport {
  id: string;
  title: string;
  chartType: ChartType;
  breakdown: BreakdownType;
  metrics: string[];
  filters: ReportFilters;
}

/** Multi-select value picker for a single attribute. */
const AttributeValuePicker: React.FC<{
  label: string;
  values: string[];
  selected: string[];
  onToggle: (value: string) => void;
  onRemove: () => void;
}> = ({ label, values, selected, onToggle, onRemove }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const filtered = values.filter((v) => v.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="relative" ref={ref}>
      <label className="text-[11px] text-muted-foreground mb-1 flex items-center gap-1">
        {label}
        <button
          type="button"
          onClick={onRemove}
          className="text-muted-foreground hover:text-red-600"
          title={`Remove ${label} filter`}
        >
          <X className="h-3 w-3" />
        </button>
      </label>
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          setSearch('');
        }}
        className="h-9 text-sm border rounded-lg px-3 bg-background min-w-[160px] text-left flex items-center justify-between gap-2"
      >
        <span className="truncate">
          {selected.length === 0 ? `All ${label.toLowerCase()}` : `${selected.length} selected`}
        </span>
        <ChevronDown className="h-3 w-3 shrink-0" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-72 bg-background border rounded-lg shadow-lg">
          <div className="p-2 border-b">
            <input
              type="text"
              placeholder={`Search ${label.toLowerCase()}`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-sm border rounded-lg px-3 py-2 bg-background outline-none"
              autoFocus
            />
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {filtered.map((value) => (
              <label
                key={value}
                className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-muted/50"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(value)}
                  onChange={() => onToggle(value)}
                  className="h-4 w-4"
                />
                <span className="truncate">{value}</span>
              </label>
            ))}
            {filtered.length === 0 && (
              <div className="px-3 py-3 text-sm text-muted-foreground text-center">
                No matching values
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Compact, self-contained filter bar. Date range is always available; any other
 * attribute can be added on demand (Mixpanel-style). Used by the composer and by
 * every board card so each report keeps its own filters.
 */
const ReportFilterBar: React.FC<{
  filters: ReportFilters;
  onChange: (next: ReportFilters) => void;
  options: FilterOptions;
  showDatePicker?: boolean;
}> = ({ filters, onChange, options, showDatePicker = true }) => {
  const [addOpen, setAddOpen] = useState(false);
  const addRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (addRef.current && !addRef.current.contains(e.target as Node)) setAddOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const patch = (p: Partial<ReportFilters>) => onChange({ ...filters, ...p });
  const attributes = filters.attributes || {};

  const setPreset = (preset: DatePreset) => {
    if (preset === 'custom') {
      patch({ datePreset: preset });
      return;
    }
    const range = getPresetRange(preset);
    patch({ datePreset: preset, from: range.from, to: range.to });
  };

  const patchAttributes = (next: Record<string, string[]>) => patch({ attributes: next });

  const addAttribute = (key: string) => {
    if (attributes[key]) return;
    patchAttributes({ ...attributes, [key]: [] });
    setAddOpen(false);
  };

  const removeAttribute = (key: string) => {
    const next = { ...attributes };
    delete next[key];
    patchAttributes(next);
  };

  const toggleAttributeValue = (key: string, value: string) => {
    const current = attributes[key] || [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    patchAttributes({ ...attributes, [key]: next });
  };

  const activeKeys = Object.keys(attributes);
  const availableToAdd = options.attributes.filter((a) => !activeKeys.includes(a.key));
  const hasActive =
    activeKeys.some((k) => (attributes[k] || []).length > 0) || !!filters.handling_status;

  return (
    <div className="flex flex-wrap gap-2 items-end">
      <div>
        <label className="text-[11px] text-muted-foreground block mb-1">Date Range</label>
        <Select value={filters.datePreset} onValueChange={(v) => setPreset(v as DatePreset)}>
          <SelectTrigger className="h-9 w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="last7days">Last 7 days</SelectItem>
            <SelectItem value="last30days">Last 30 days</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {showDatePicker && filters.datePreset === 'custom' && (
        <>
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={filters.from}
              onChange={(e) => patch({ from: e.target.value, datePreset: 'custom' })}
              className="h-9 w-36"
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">to</span>
            <Input
              type="date"
              value={filters.to}
              onChange={(e) => patch({ to: e.target.value, datePreset: 'custom' })}
              className="h-9 w-36"
            />
          </div>
        </>
      )}

      {activeKeys.map((key) => {
        const def = options.attributes.find((a) => a.key === key);
        return (
          <AttributeValuePicker
            key={key}
            label={def?.label || key}
            values={def?.values || []}
            selected={attributes[key] || []}
            onToggle={(value) => toggleAttributeValue(key, value)}
            onRemove={() => removeAttribute(key)}
          />
        );
      })}

      {filters.handling_status && (
        <div>
          <label className="text-[11px] text-muted-foreground mb-1 flex items-center gap-1">
            Handling Status
            <button
              type="button"
              onClick={() => patch({ handling_status: undefined })}
              className="text-muted-foreground hover:text-red-600"
              title="Remove Handling Status filter"
            >
              <X className="h-3 w-3" />
            </button>
          </label>
          <select
            value={filters.handling_status || ''}
            onChange={(e) => patch({ handling_status: e.target.value || undefined })}
            className="h-9 text-sm border rounded-lg px-3 bg-background min-w-[150px]"
          >
            {options.handlingStatuses.map((status) => (
              <option key={status} value={status}>
                {formatStatusLabel(status)}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Add filter */}
      <div className="relative" ref={addRef}>
        <button
          type="button"
          onClick={() => setAddOpen((o) => !o)}
          className="h-9 text-sm border border-dashed rounded-lg px-3 bg-background flex items-center gap-1 text-muted-foreground hover:text-foreground hover:border-foreground/40"
        >
          <Plus className="h-3.5 w-3.5" />
          Add filter
        </button>
        {addOpen && (
          <div className="absolute z-50 mt-1 w-56 bg-background border rounded-lg shadow-lg max-h-64 overflow-y-auto py-1">
            {availableToAdd.map((a) => (
              <button
                key={a.key}
                type="button"
                onClick={() => addAttribute(a.key)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50"
              >
                {a.label}
              </button>
            ))}
            {!filters.handling_status && options.handlingStatuses.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  patch({ handling_status: options.handlingStatuses[0] });
                  setAddOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50"
              >
                Handling Status
              </button>
            )}
            {availableToAdd.length === 0 && !!filters.handling_status && (
              <div className="px-3 py-3 text-sm text-muted-foreground text-center">
                All filters added
              </div>
            )}
          </div>
        )}
      </div>

      {hasActive && (
        <button
          type="button"
          onClick={() => patch({ attributes: {}, handling_status: undefined })}
          className="text-xs text-red-500 hover:text-red-700 underline h-9"
        >
          Clear
        </button>
      )}
    </div>
  );
};

/**
 * Reusable, presentational report renderer. Given a chart type, breakdown,
 * selected metrics and the already-fetched data, it draws the visualization.
 * Fills its parent, so wrap it in a sized container.
 */
const ReportChart: React.FC<{
  chartType: ChartType;
  breakdown: BreakdownType;
  metrics: string[];
  timeSeries: CseTimeSeriesPoint[];
  members: CseMemberData[];
  overview: CseOverviewData | null;
}> = ({ chartType, breakdown, metrics, timeSeries, members, overview }) => {
  const availableMetrics = getAvailableMetrics(breakdown);
  const activeMetricDefs = metrics
    .map((k) => availableMetrics.find((m) => m.key === k))
    .filter((m): m is MetricDef => Boolean(m));

  const labels =
    breakdown === 'date' ? timeSeries.map((p) => p.date) : members.map((m) => m.cse_name);

  const getValues = (md: MetricDef): number[] =>
    breakdown === 'date'
      ? timeSeries.map((p) => (md.fromTs ? md.fromTs(p) : 0))
      : members.map((m) => (md.fromCse ? md.fromCse(m) : 0));

  const isStacked = chartType.startsWith('stacked');
  const isLineChart = chartType === 'line' || chartType === 'stackedLine';
  const isBar = chartType === 'bar' || chartType === 'stackedBar';

  const baseTooltip = {
    enabled: true,
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    titleColor: '#fff',
    bodyColor: '#fff',
    padding: 10,
    cornerRadius: 6,
    displayColors: true,
  };

  if (activeMetricDefs.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Select at least one metric
      </div>
    );
  }

  if (labels.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        No data for the selected filters
      </div>
    );
  }

  if (chartType === 'metric') {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 h-full items-center">
        {activeMetricDefs.map((md) => {
          const total =
            md.format === 'percent' || md.format === 'time'
              ? overview && md.fromOverview
                ? md.fromOverview(overview)
                : 0
              : getValues(md).reduce((sum, v) => sum + v, 0);
          return (
            <div key={md.key} className="text-center">
              <div className="text-sm text-muted-foreground mb-2">{md.label}</div>
              <div className="text-3xl font-bold" style={{ color: md.color }}>
                {formatMetricValue(md.format, total)}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (chartType === 'table') {
    return (
      <div className="overflow-auto h-full border rounded-lg">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-background">
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-2 px-3">{breakdown === 'date' ? 'Date' : 'CSE'}</th>
              {activeMetricDefs.map((md) => (
                <th key={md.key} className="py-2 px-3 text-right">
                  {md.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {labels.map((label, rowIdx) => (
              <tr key={label} className="border-b border-muted/40">
                <td className="py-2 px-3 font-medium">{label}</td>
                {activeMetricDefs.map((md) => (
                  <td key={md.key} className="py-2 px-3 text-right">
                    {formatMetricValue(md.format, getValues(md)[rowIdx] ?? 0)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (chartType === 'pie') {
    const md = activeMetricDefs[0];
    const data = {
      labels,
      datasets: [
        {
          label: md.label,
          data: getValues(md),
          backgroundColor: labels.map((_, i) => PIE_PALETTE[i % PIE_PALETTE.length]),
          borderColor: '#fff',
          borderWidth: 1,
        },
      ],
    };
    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right' as const },
        tooltip: {
          ...baseTooltip,
          callbacks: {
            label: (ctx: any) =>
              `${ctx.label}: ${formatMetricValue(md.format, Number(ctx.parsed))}`,
          },
        },
        datalabels: {
          color: '#fff',
          font: { weight: 'bold' as const, size: 11 },
          formatter: (value: number) => (value ? formatMetricValue(md.format, value) : ''),
        },
      },
    };
    return (
      <div className="h-full w-full">
        <Pie data={data} options={options} plugins={[ChartDataLabels]} />
      </div>
    );
  }

  // Line / column / bar
  const data = {
    labels,
    datasets: activeMetricDefs.map((md) => ({
      label: md.label,
      data: getValues(md),
      borderColor: md.color,
      backgroundColor: isLineChart ? hexToRgba(md.color, 0.15) : hexToRgba(md.color, 0.85),
      fill: isLineChart ? isStacked : undefined,
      tension: 0.35,
      borderWidth: isLineChart ? 2 : 0,
      pointRadius: isLineChart ? 3 : 0,
      stack: isStacked ? 'stack-1' : undefined,
    })),
  };

  const singleFormat = activeMetricDefs.every((m) => m.format === activeMetricDefs[0].format)
    ? activeMetricDefs[0].format
    : 'number';

  const valueAxisTicks =
    singleFormat === 'time'
      ? { callback: (v: string | number) => formatTime(Number(v)) }
      : singleFormat === 'percent'
      ? { callback: (v: string | number) => `${v}%` }
      : {};

  const options = {
    indexAxis: isBar ? ('y' as const) : ('x' as const),
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    layout: isBar ? { padding: { right: 44 } } : undefined,
    plugins: {
      legend: { position: 'top' as const },
      tooltip: {
        ...baseTooltip,
        callbacks: {
          label: (ctx: any) => {
            const md = activeMetricDefs[ctx.datasetIndex];
            const raw = Number(isBar ? ctx.parsed.x : ctx.parsed.y);
            return `${ctx.dataset.label}: ${md ? formatMetricValue(md.format, raw) : raw}`;
          },
        },
      },
      datalabels: {
        anchor: 'end' as const,
        align: isBar ? ('end' as const) : ('top' as const),
        color: isStacked ? '#fff' : '#334155',
        font: { weight: 'bold' as const, size: 10 },
        display: (ctx: any) => {
          if (breakdown === 'date' && labels.length > 14) return false;
          return ctx.dataset.data[ctx.dataIndex] !== 0;
        },
        formatter: (value: number, ctx: any) => {
          const md = activeMetricDefs[ctx.datasetIndex];
          return value ? (md ? formatMetricValue(md.format, value) : value) : '';
        },
      },
    },
    scales: {
      x: {
        stacked: isStacked,
        ...(isBar ? { beginAtZero: true, ticks: valueAxisTicks } : {}),
      },
      y: {
        stacked: isStacked,
        beginAtZero: true,
        ...(isBar ? {} : { ticks: valueAxisTicks }),
      },
    },
  };

  return (
    <div className="h-full w-full">
      {isLineChart ? (
        <Line data={data} options={options} plugins={[ChartDataLabels]} />
      ) : (
        <Bar data={data} options={options} plugins={[ChartDataLabels]} />
      )}
    </div>
  );
};

/** Fetches only the data sources a report needs, based on its config. */
const useCseReportData = (
  params: CseFilterParams,
  need: { overview: boolean; members: boolean; timeSeries: boolean },
  refreshNonce: number
) => {
  const [overview, setOverview] = useState<CseOverviewData | null>(null);
  const [members, setMembers] = useState<CseMemberData[]>([]);
  const [timeSeries, setTimeSeries] = useState<CseTimeSeriesPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const key = JSON.stringify({ params, need, refreshNonce });

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const [ov, mem, ts] = await Promise.all([
          need.overview ? cseAnalyticsApi.getOverview(params) : Promise.resolve(null),
          need.members ? cseAnalyticsApi.getMembers(params) : Promise.resolve([]),
          need.timeSeries ? cseAnalyticsApi.getTimeSeries(params) : Promise.resolve([]),
        ]);
        if (cancelled) return;
        setOverview(ov);
        setMembers(mem as CseMemberData[]);
        setTimeSeries(ts as CseTimeSeriesPoint[]);
      } catch (e: any) {
        if (cancelled) return;
        const message =
          e?.response?.data?.error ||
          e?.response?.data?.detail ||
          e?.message ||
          'Failed to load report';
        setError(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { overview, members, timeSeries, loading, error };
};

const computeReportNeed = (report: BoardReport) => {
  const hasPctOrTime = report.metrics.some((k) => {
    const md = METRIC_DEFS.find((m) => m.key === k);
    return md && (md.format === 'percent' || md.format === 'time');
  });
  return {
    timeSeries: report.breakdown === 'date',
    members: report.breakdown === 'cse',
    overview: report.chartType === 'metric' && hasPctOrTime,
  };
};

const BoardReportCard: React.FC<{
  report: BoardReport;
  options: FilterOptions;
  showDatePicker: boolean;
  refreshNonce: number;
  onRemove: (id: string) => void;
  onFiltersChange: (id: string, filters: ReportFilters) => void;
}> = ({ report, options, showDatePicker, refreshNonce, onRemove, onFiltersChange }) => {
  const need = useMemo(() => computeReportNeed(report), [report]);
  const params = useMemo(() => filtersToParams(report.filters), [report.filters]);

  const { overview, members, timeSeries, loading, error } = useCseReportData(
    params,
    need,
    refreshNonce
  );

  const isBarOrTable =
    report.chartType === 'bar' ||
    report.chartType === 'stackedBar' ||
    report.chartType === 'table';
  const height =
    report.breakdown === 'cse' && isBarOrTable
      ? Math.max(300, members.length * 38 || 300)
      : 320;

  return (
    <Card>
      <CardHeader className="pb-2 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h5>{report.title}</h5>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                title="Delete this board"
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this board?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete “{report.title}”? This action cannot be
                  undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>No</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onRemove(report.id)}
                  className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                >
                  Yes, delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        <ReportFilterBar
          filters={report.filters}
          onChange={(next) => onFiltersChange(report.id, next)}
          options={options}
          showDatePicker={showDatePicker}
        />
      </CardHeader>
      <CardContent>
        <div style={{ height: `${height}px` }}>
          {loading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              Loading…
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full text-red-600 text-sm text-center px-4">
              {error}
            </div>
          ) : (
            <ReportChart
              chartType={report.chartType}
              breakdown={report.breakdown}
              metrics={report.metrics}
              timeSeries={timeSeries}
              members={members}
              overview={overview}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const makeDefaultFilters = (): ReportFilters => {
  const range = getPresetRange('last7days');
  return { from: range.from, to: range.to, datePreset: 'last7days', attributes: {} };
};

const CseAnalyticsComponent: React.FC<CseAnalyticsComponentProps> = ({ config = {} }) => {
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    attributes: [],
    handlingStatuses: [],
  });

  // Query builder (composer) state
  const [composerFilters, setComposerFilters] = useState<ReportFilters>(makeDefaultFilters);
  const [chartType, setChartType] = useState<ChartType>('column');
  const [breakdown, setBreakdown] = useState<BreakdownType>('date');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['assigned', 'resolved']);
  const [metricDropdownOpen, setMetricDropdownOpen] = useState(false);
  const metricDropdownRef = useRef<HTMLDivElement>(null);

  // Composer preview data
  const [overview, setOverview] = useState<CseOverviewData | null>(null);
  const [members, setMembers] = useState<CseMemberData[]>([]);
  const [timeSeries, setTimeSeries] = useState<CseTimeSeriesPoint[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Board state (persisted server-side, per user — one row per board)
  const title = config.title || 'Analytics Board';
  const showDatePicker = config.showDatePicker !== false;
  const boardType = config.analyticsType || 'cse';
  const [board, setBoard] = useState<BoardReport[]>([]);
  const [refreshNonce, setRefreshNonce] = useState(0);
  // Per-board debounce timers for filter edits (keyed by report id)
  const saveTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (metricDropdownRef.current && !metricDropdownRef.current.contains(e.target as Node)) {
        setMetricDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load the user's saved boards from the backend (one row per board)
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const reports = await cseAnalyticsApi.getBoards<BoardReport>(boardType);
        if (cancelled) return;
        setBoard(reports.map((r) => ({ ...r, filters: normalizeFilters(r.filters) })));
      } catch (e) {
        if (!cancelled) {
          console.error('Error loading analytics boards:', e);
          setBoard([]);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
     
  }, [boardType]);

  // Clean up any pending per-board save timers on unmount
  useEffect(() => {
    const timers = saveTimersRef.current;
    return () => {
      Object.values(timers).forEach((t) => clearTimeout(t));
    };
  }, []);

  const availableMetrics = useMemo(() => getAvailableMetrics(breakdown), [breakdown]);
  const activeMetricDefs = useMemo(
    () =>
      selectedMetrics
        .map((k) => availableMetrics.find((m) => m.key === k))
        .filter((m): m is MetricDef => Boolean(m)),
    [selectedMetrics, availableMetrics]
  );

  // Keep the metric selection valid when the breakdown changes
  useEffect(() => {
    setSelectedMetrics((prev) => {
      const allowed = availableMetrics.map((m) => m.key);
      const next = prev.filter((k) => allowed.includes(k));
      return next.length > 0 ? next : allowed.slice(0, 2);
    });
  }, [availableMetrics]);

  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const options = await cseAnalyticsApi.getFilterOptions();
        setFilterOptions({
          attributes: options.attributes || [],
          handlingStatuses: options.handling_time_statuses || [],
        });
      } catch (e) {
        console.error('Error loading CSE filter options:', e);
      }
    };
    loadFilterOptions();
  }, []);

  const composerParams = useMemo(() => filtersToParams(composerFilters), [composerFilters]);

  const fetchPreview = async () => {
    try {
      setPreviewLoading(true);
      setError(null);
      const [ov, mem, series] = await Promise.all([
        cseAnalyticsApi.getOverview(composerParams),
        cseAnalyticsApi.getMembers(composerParams),
        cseAnalyticsApi.getTimeSeries(composerParams),
      ]);
      setOverview(ov);
      setMembers(mem);
      setTimeSeries(series);
    } catch (e: any) {
      const message =
        e?.response?.data?.error ||
        e?.response?.data?.detail ||
        e.message ||
        'Failed to load CSE analytics';
      setError(message);
      console.error('Error fetching CSE analytics:', e?.response?.data || e);
    } finally {
      setPreviewLoading(false);
    }
  };

  useEffect(() => {
    fetchPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [composerParams, refreshNonce]);

  const toggleMetric = (key: string) => {
    setSelectedMetrics((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const composerIsBar = chartType === 'bar' || chartType === 'stackedBar';
  const composerHeight =
    breakdown === 'cse' && (composerIsBar || chartType === 'table')
      ? Math.max(320, members.length * 40)
      : 384;

  const addCurrentToBoard = () => {
    if (selectedMetrics.length === 0) return;
    const chartLabel = CHART_TYPES.find((c) => c.value === chartType)?.label || '';
    const report: BoardReport = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: `${getMetricLabels(selectedMetrics)} by ${breakdown === 'date' ? 'Date' : 'CSE'} (${chartLabel})`,
      chartType,
      breakdown,
      metrics: [...selectedMetrics],
      filters: { ...composerFilters },
    };
    // Optimistic add, then persist as its own row
    setBoard((prev) => [report, ...prev]);
    cseAnalyticsApi.createBoard(boardType, report).catch((e) => {
      console.error('Error creating analytics board:', e);
    });
  };

  const removeReport = (id: string) => {
    setBoard((prev) => prev.filter((r) => r.id !== id));
    if (saveTimersRef.current[id]) {
      clearTimeout(saveTimersRef.current[id]);
      delete saveTimersRef.current[id];
    }
    cseAnalyticsApi.deleteBoard(boardType, id).catch((e) => {
      console.error('Error deleting analytics board:', e);
    });
  };

  const updateReportFilters = (id: string, filters: ReportFilters) => {
    let updated: BoardReport | undefined;
    setBoard((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        updated = { ...r, filters };
        return updated;
      })
    );
    // Debounce persistence of this board's filter changes
    if (saveTimersRef.current[id]) clearTimeout(saveTimersRef.current[id]);
    saveTimersRef.current[id] = setTimeout(() => {
      if (!updated) return;
      cseAnalyticsApi.updateBoard(boardType, id, updated).catch((e) => {
        console.error('Error updating analytics board:', e);
      });
    }, 600);
  };

  return (
    <div className="container mx-auto p-6 space-y-6 min-h-screen overflow-y-auto bg-slate-50/40">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h5>{title}</h5>
          <p className="text-sm text-muted-foreground mt-1">
            Build reports and pin them to your board — each report keeps its own filters
          </p>
        </div>
        <Button variant="outline" onClick={() => setRefreshNonce((n) => n + 1)}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          Error: {error}
        </div>
      )}

      {/* Explore / composer */}
      <Card>
        <CardHeader className="pb-2">
          <h5>Explore</h5>
          <p className="text-sm text-muted-foreground">
            Choose filters, a metric, a breakdown and a chart type, then add it to your board
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <ReportFilterBar
            filters={composerFilters}
            onChange={setComposerFilters}
            options={filterOptions}
            showDatePicker={showDatePicker}
          />

          <div className="flex flex-wrap gap-3 items-end border-t pt-4">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Chart Type</label>
              <Select value={chartType} onValueChange={(v) => setChartType(v as ChartType)}>
                <SelectTrigger className="w-[170px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHART_TYPES.map((ct) => (
                    <SelectItem key={ct.value} value={ct.value}>
                      {ct.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground block mb-1">Breakdown</label>
              <Select value={breakdown} onValueChange={(v) => setBreakdown(v as BreakdownType)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">By Date</SelectItem>
                  <SelectItem value="cse">By CSE</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="relative" ref={metricDropdownRef}>
              <label className="text-xs text-muted-foreground block mb-1">
                {chartType === 'pie' ? 'Metric' : 'Metrics'}
              </label>
              <button
                type="button"
                onClick={() => setMetricDropdownOpen((prev) => !prev)}
                className="text-sm border rounded-lg px-3 py-2 bg-background min-w-[220px] text-left flex items-center justify-between gap-2"
              >
                <span className="truncate">
                  {selectedMetrics.length === 0
                    ? 'Select metrics'
                    : activeMetricDefs.map((m) => m.label).join(', ')}
                </span>
                <ChevronDown className="h-3 w-3 shrink-0" />
              </button>
              {metricDropdownOpen && (
                <div className="absolute z-50 mt-1 w-72 bg-background border rounded-lg shadow-lg">
                  <div className="max-h-64 overflow-y-auto py-1">
                    {availableMetrics.map((m) => {
                      const singleSelect = chartType === 'pie';
                      const checked = selectedMetrics.includes(m.key);
                      return (
                        <label
                          key={m.key}
                          className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-muted/50"
                        >
                          <input
                            type={singleSelect ? 'radio' : 'checkbox'}
                            checked={checked}
                            onChange={() =>
                              singleSelect ? setSelectedMetrics([m.key]) : toggleMetric(m.key)
                            }
                            className="h-4 w-4"
                          />
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: m.color }}
                          />
                          <span>{m.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <Button onClick={addCurrentToBoard} disabled={selectedMetrics.length === 0}>
              <Plus className="h-4 w-4 mr-2" />
              Add to Board
            </Button>
          </div>

          <div style={{ height: `${composerHeight}px` }}>
            {previewLoading ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                Loading preview…
              </div>
            ) : (
              <ReportChart
                chartType={chartType}
                breakdown={breakdown}
                metrics={selectedMetrics}
                timeSeries={timeSeries}
                members={members}
                overview={overview}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Board */}
      <div className="flex items-center justify-between">
        <div>
          <h5>Your Board</h5>
          <p className="text-sm text-muted-foreground">
            {board.length} report{board.length === 1 ? '' : 's'} — adjust filters or delete each card
          </p>
        </div>
      </div>

      {board.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Your board is empty. Build a report above and click “Add to Board”.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {board.map((report) => (
            <BoardReportCard
              key={report.id}
              report={report}
              options={filterOptions}
              showDatePicker={showDatePicker}
              refreshNonce={refreshNonce}
              onRemove={removeReport}
              onFiltersChange={updateReportFilters}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CseAnalyticsComponent;
