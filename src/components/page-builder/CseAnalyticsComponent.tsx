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
  type CseSupportTicketBreakdown,
  type CseTimeSeriesPoint,
} from '@/lib/cseAnalyticsApi';
import {
  rmAnalyticsApi,
  type RmFilterParams,
  type RmMemberData,
  type RmOverviewData,
  type RmTimeSeriesPoint,
} from '@/lib/rmAnalyticsApi';
import {
  teamAnalyticsApi,
  type UnassignedLeadsBreakdown,
} from '@/lib/teamAnalyticsApi';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Calendar,
  ChevronDown,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';
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

interface AnalyticsBoardViewProps extends CseAnalyticsComponentProps {
  analyticsTypeSelector: React.ReactNode;
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

type BreakdownType = 'date' | 'cse' | 'rm' | 'manager';

type MetricFormat = 'number' | 'percent' | 'time';

interface MetricDef {
  key: string;
  label: string;
  color: string;
  format: MetricFormat;
  fromTs?: (p: CseTimeSeriesPoint | RmTimeSeriesPoint) => number;
  fromCse?: (m: CseMemberData) => number;
  fromRm?: (m: RmMemberData) => number;
  fromOverview?: (o: CseOverviewData) => number;
  fromOverviewRm?: (o: RmOverviewData) => number;
}

const METRIC_DEFS: MetricDef[] = [
  {
    key: 'assigned',
    label: 'Assigned',
    color: '#3b82f6',
    format: 'number',
    fromTs: (p) => (p as CseTimeSeriesPoint).assigned,
    fromCse: (m) => m.leads_assigned,
    fromOverview: (o) => o.leads_assigned,
  },
  {
    key: 'resolved',
    label: 'Resolved',
    color: '#22c55e',
    format: 'number',
    fromTs: (p) => (p as CseTimeSeriesPoint).resolved,
    fromCse: (m) => m.resolved,
    fromOverview: (o) => o.resolved,
  },
  {
    key: 'resolve_rate',
    label: 'Resolve Rate',
    color: '#a855f7',
    format: 'percent',
    fromTs: (p) => Math.round(((p as CseTimeSeriesPoint).resolve_rate || 0) * 100),
    fromCse: (m) => Math.round((m.resolve_rate || 0) * 100),
    fromOverview: (o) => Math.round((o.resolve_rate || 0) * 100),
  },
  {
    key: 'avg_handling_time',
    label: 'Avg Handling Time',
    color: '#fb923c',
    format: 'time',
    fromTs: (p) => Math.round((p as CseTimeSeriesPoint).average_handling_time_seconds || 0),
    fromCse: (m) => Math.round(m.average_handling_time_seconds || 0),
    fromOverview: (o) => Math.round(o.average_handling_time_seconds || 0),
  },
  {
    key: 'handling_time_ticket_count',
    label: 'Tickets in Avg',
    color: '#0ea5e9',
    format: 'number',
    fromTs: (p) => (p as CseTimeSeriesPoint).handling_time_ticket_count,
    fromCse: (m) => m.handling_time_ticket_count,
    fromOverview: (o) => o.handling_time_ticket_count,
  },
  {
    key: 'not_connected',
    label: 'Not Connected',
    color: '#ef4444',
    format: 'number',
    fromTs: (p) => (p as CseTimeSeriesPoint).not_connected,
    fromOverview: (o) => o.not_connected,
  },
  {
    key: 'call_back',
    label: 'Call Back',
    color: '#f59e0b',
    format: 'number',
    fromTs: (p) => (p as CseTimeSeriesPoint).call_later,
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

const RM_METRIC_DEFS: MetricDef[] = [
  {
    key: 'calls_made',
    label: 'Calls Made',
    color: '#3b82f6',
    format: 'number',
    fromTs: (p) => (p as RmTimeSeriesPoint).calls_made,
    fromRm: (m) => m.calls_made,
    fromOverviewRm: (o) => o.calls_made,
  },
  {
    key: 'calls_connected',
    label: 'Calls Connected',
    color: '#14b8a6',
    format: 'number',
    fromTs: (p) => (p as RmTimeSeriesPoint).calls_connected,
    fromRm: (m) => m.calls_connected,
    fromOverviewRm: (o) => o.calls_connected,
  },
  {
    key: 'trials_activated',
    label: 'Trials Activated',
    color: '#22c55e',
    format: 'number',
    fromTs: (p) => (p as RmTimeSeriesPoint).trials_activated,
    fromRm: (m) => m.trials_activated,
    fromOverviewRm: (o) => o.trials_activated,
  },
  {
    key: 'connected_to_trial_ratio',
    label: 'Connected to Trial Ratio',
    color: '#a855f7',
    format: 'percent',
    fromTs: (p) => Math.round(((p as RmTimeSeriesPoint).connected_to_trial_ratio || 0) * 100),
    fromRm: (m) => Math.round((m.connected_to_trial_ratio || 0) * 100),
    fromOverviewRm: (o) => Math.round((o.connected_to_trial_ratio || 0) * 100),
  },
  {
    key: 'attendance',
    label: 'Attendance',
    color: '#6366f1',
    format: 'number',
    fromTs: (p) => (p as RmTimeSeriesPoint).attendance,
    fromRm: (m) => m.attendance,
    fromOverviewRm: (o) => o.attendance,
  },
  {
    key: 'average_time_spent_seconds',
    label: 'Avg Handling Time',
    color: '#fb923c',
    format: 'time',
    fromTs: (p) => Math.round((p as RmTimeSeriesPoint).average_time_spent_seconds || 0),
    fromRm: (m) => Math.round(m.average_time_spent_seconds || 0),
    fromOverviewRm: (o) => Math.round(o.average_time_spent_seconds || 0),
  },
  {
    key: 'handling_time_volume',
    label: 'Leads in Avg',
    color: '#0ea5e9',
    format: 'number',
    fromTs: (p) => (p as RmTimeSeriesPoint).handling_time_volume,
    fromRm: (m) => m.handling_time_volume,
    fromOverviewRm: (o) => o.handling_time_volume,
  },
  {
    key: 'take_break_count',
    label: 'Take Break',
    color: '#f59e0b',
    format: 'number',
    fromTs: (p) => (p as RmTimeSeriesPoint).take_break_count,
    fromRm: (m) => m.take_break_count,
    fromOverviewRm: (o) => o.take_break_count,
  },
  {
    key: 'not_interested_count',
    label: 'Not Interested',
    color: '#ef4444',
    format: 'number',
    fromTs: (p) => (p as RmTimeSeriesPoint).not_interested_count,
    fromRm: (m) => m.not_interested_count,
    fromOverviewRm: (o) => o.not_interested_count,
  },
  {
    key: 'allotted_leads',
    label: 'Allotted Leads',
    color: '#84cc16',
    format: 'number',
    fromRm: (m) => m.allotted_leads,
    fromOverviewRm: (o) => o.allotted_leads,
  },
  {
    key: 'unassigned_leads',
    label: 'Unassigned Leads',
    color: '#dc2626',
    format: 'number',
    fromOverviewRm: (o) => o.unassigned_leads,
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

const getAvailableMetrics = (
  breakdown: BreakdownType,
  catalog: MetricDef[],
  chartType?: ChartType
): MetricDef[] =>
  catalog.filter((m) => {
    if (breakdown === 'date') {
      return !!m.fromTs || (chartType === 'metric' && !!m.fromOverviewRm);
    }
    if (breakdown === 'cse') return !!m.fromCse;
    if (breakdown === 'manager') return !!m.fromCse || !!m.fromRm;
    return !!m.fromRm || (chartType === 'metric' && !!m.fromOverviewRm);
  });

const getMetricLabels = (metricKeys: string[], catalog: MetricDef[]): string =>
  metricKeys
    .map((k) => catalog.find((m) => m.key === k)?.label)
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

/** Manager I chip added but no manager chosen yet — must not show unfiltered tenant data. */
const isManagerIFilterPending = (filters: ReportFilters): boolean =>
  Object.prototype.hasOwnProperty.call(filters.attributes || {}, 'manager_i') &&
  (filters.attributes.manager_i || []).length === 0;

// ---- Saved board report ----
interface BoardReport {
  id: string;
  title: string;
  chartType: ChartType;
  breakdown: BreakdownType;
  metrics: string[];
  filters: ReportFilters;
}

const isChartType = (value: unknown): value is ChartType =>
  typeof value === 'string' &&
  [
    'line',
    'stackedLine',
    'column',
    'stackedColumn',
    'bar',
    'stackedBar',
    'pie',
    'table',
    'metric',
  ].includes(value);

/** Migrates/validates a persisted board row into the current Mixpanel report shape. */
const normalizeBoardReport = (
  raw: any,
  variant: 'cse' | 'rm',
  defaultMetrics: string[],
  validMetricKeys: Set<string>
): BoardReport | null => {
  if (!raw || typeof raw !== 'object') return null;
  const id = String(raw.id || '').trim();
  if (!id) return null;

  // Drop interim RM unassigned-leads boards (source/status tabs, no metrics).
  if (raw.breakdown === 'source' || raw.breakdown === 'status') return null;
  if (!Array.isArray(raw.metrics) && !isChartType(raw.chartType)) return null;

  let breakdown: BreakdownType =
    raw.breakdown === 'cse' ||
    raw.breakdown === 'rm' ||
    raw.breakdown === 'manager' ||
    raw.breakdown === 'date'
      ? raw.breakdown
      : 'date';
  if (variant === 'rm' && breakdown === 'cse') breakdown = 'date';
  if (variant === 'cse' && breakdown === 'rm') breakdown = 'date';

  const metrics = Array.isArray(raw.metrics)
    ? raw.metrics.map(String).filter((metric) => validMetricKeys.has(metric))
    : [...defaultMetrics];
  if (metrics.length === 0) metrics.push(...defaultMetrics);

  return {
    id,
    title: String(raw.title || (variant === 'rm' ? 'RM Report' : 'CSE Report')),
    chartType: isChartType(raw.chartType) ? raw.chartType : 'column',
    breakdown,
    metrics,
    filters: normalizeFilters(raw.filters),
  };
};

/** Multi-select value picker for a single attribute. */
const AttributeValuePicker: React.FC<{
  label: string;
  values: string[];
  selected: string[];
  onToggle: (value: string) => void;
  onRemove?: () => void;
  /** When set, shown instead of "All …" when nothing is selected. */
  emptySelectionLabel?: string;
}> = ({ label, values, selected, onToggle, onRemove, emptySelectionLabel }) => {
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
  const selectionText =
    selected.length > 0
      ? `${selected.length} selected`
      : emptySelectionLabel ||
        (values.length === 0 ? `No ${label.toLowerCase()} found` : `All ${label.toLowerCase()}`);

  return (
    <div className="relative" ref={ref}>
      <label className="text-[11px] text-muted-foreground mb-1 flex items-center gap-1">
        {label}
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-muted-foreground hover:text-red-600"
            title={`Remove ${label} filter`}
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </label>
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          setSearch('');
        }}
        className="h-9 text-sm border rounded-lg px-3 bg-background min-w-[160px] text-left flex items-center justify-between gap-2"
      >
        <span className="truncate">{selectionText}</span>
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
            emptySelectionLabel={
              key === 'manager_i' ? 'Select Manager I…' : undefined
            }
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
const aggregateMembersByManager = (
  members: CseMemberData[] | RmMemberData[]
): Array<CseMemberData | RmMemberData> => {
  const isRm = members.some((member) => 'rm_name' in member);

  if (isRm) {
    const groups = new Map<string, RmMemberData>();
    const handlingWeightedSum = new Map<string, number>();
    const handlingWeight = new Map<string, number>();
    for (const member of members as RmMemberData[]) {
      const manager = (member.manager_i_name || '').trim();
      // Skip people with no Manager I — do not invent an "Unassigned" bucket.
      if (!manager) continue;
      const current = groups.get(manager) || {
        rm_name: manager,
        manager_i_name: manager,
        user_id: `manager:${manager}`,
        attendance: 0,
        calls_made: 0,
        calls_connected: 0,
        trials_activated: 0,
        connected_to_trial_ratio: null,
        average_time_spent_seconds: null,
        handling_time_volume: 0,
        take_break_count: 0,
        not_interested_count: 0,
        allotted_leads: 0,
      };
      current.attendance += member.attendance;
      current.calls_made += member.calls_made;
      current.calls_connected += member.calls_connected;
      current.trials_activated += member.trials_activated;
      current.take_break_count += member.take_break_count;
      current.not_interested_count += member.not_interested_count;
      current.allotted_leads += member.allotted_leads;
      current.handling_time_volume += member.handling_time_volume;
      const weight = member.handling_time_volume;
      handlingWeightedSum.set(
        manager,
        (handlingWeightedSum.get(manager) || 0) +
          (member.average_time_spent_seconds || 0) * weight
      );
      handlingWeight.set(manager, (handlingWeight.get(manager) || 0) + weight);
      groups.set(manager, current);
    }
    for (const [manager, group] of groups) {
      group.connected_to_trial_ratio =
        group.calls_connected > 0
          ? group.trials_activated / group.calls_connected
          : null;
      const weight = handlingWeight.get(manager) || 0;
      group.average_time_spent_seconds =
        weight > 0 ? (handlingWeightedSum.get(manager) || 0) / weight : null;
    }
    return Array.from(groups.values()).sort((a, b) =>
      a.rm_name.localeCompare(b.rm_name)
    );
  }

  const groups = new Map<string, CseMemberData>();
  const handlingWeightedSum = new Map<string, number>();
  for (const member of members as CseMemberData[]) {
    const manager = (member.manager_i_name || '').trim();
    if (!manager) continue;
    const current = groups.get(manager) || {
      cse_name: manager,
      manager_i_name: manager,
      open_call_back: 0,
      open_not_connected: 0,
      leads_assigned: 0,
      resolved: 0,
      resolve_rate: null,
      average_handling_time_seconds: null,
      handling_time_ticket_count: 0,
    };
    current.open_call_back += member.open_call_back;
    current.open_not_connected += member.open_not_connected;
    current.leads_assigned += member.leads_assigned;
    current.resolved += member.resolved;
    current.handling_time_ticket_count += member.handling_time_ticket_count;
    handlingWeightedSum.set(
      manager,
      (handlingWeightedSum.get(manager) || 0) +
        (member.average_handling_time_seconds || 0) *
          member.handling_time_ticket_count
    );
    groups.set(manager, current);
  }
  for (const [manager, group] of groups) {
    group.resolve_rate =
      group.leads_assigned > 0 ? group.resolved / group.leads_assigned : null;
    group.average_handling_time_seconds =
      group.handling_time_ticket_count > 0
        ? (handlingWeightedSum.get(manager) || 0) /
          group.handling_time_ticket_count
        : null;
  }
  return Array.from(groups.values()).sort((a, b) =>
    a.cse_name.localeCompare(b.cse_name)
  );
};

const ReportChart: React.FC<{
  chartType: ChartType;
  breakdown: BreakdownType;
  metrics: string[];
  metricCatalog: MetricDef[];
  timeSeries: CseTimeSeriesPoint[] | RmTimeSeriesPoint[];
  members: CseMemberData[] | RmMemberData[];
  overview: CseOverviewData | RmOverviewData | null;
  /** When a Manager I filter is applied, show each team member instead of one rollup row. */
  expandManagerTeam?: boolean;
}> = ({
  chartType,
  breakdown,
  metrics,
  metricCatalog,
  timeSeries,
  members,
  overview,
  expandManagerTeam = false,
}) => {
  const [tableSort, setTableSort] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  }>({ key: 'dimension', direction: 'asc' });
  const availableMetrics = getAvailableMetrics(breakdown, metricCatalog, chartType);
  const requestedMetricDefs = metrics
    .map((k) => availableMetrics.find((m) => m.key === k))
    .filter((m): m is MetricDef => Boolean(m));
  const activeMetricDefs = [...requestedMetricDefs];

  // Always show the sample volume that mathematically backs a handling average.
  if (chartType !== 'pie') {
    const companionKey = requestedMetricDefs.some(
      (metric) => metric.key === 'avg_handling_time'
    )
      ? 'handling_time_ticket_count'
      : requestedMetricDefs.some(
          (metric) => metric.key === 'average_time_spent_seconds'
        )
      ? 'handling_time_volume'
      : null;
    const companion = companionKey
      ? availableMetrics.find((metric) => metric.key === companionKey)
      : undefined;
    if (companion && !activeMetricDefs.some((metric) => metric.key === companion.key)) {
      activeMetricDefs.push(companion);
    }
  }

  // Selecting a Manager I filter should list every CSE/RM under that manager.
  const showTeamMembers = breakdown === 'manager' && expandManagerTeam;
  const chartMembers =
    breakdown === 'manager' && !expandManagerTeam
      ? aggregateMembersByManager(members)
      : members;
  const memberLabels =
    breakdown === 'cse' || showTeamMembers
      ? chartMembers.map((m) =>
          'cse_name' in m ? (m as CseMemberData).cse_name : (m as RmMemberData).rm_name
        )
      : breakdown === 'rm'
      ? (chartMembers as RmMemberData[]).map((m) => m.rm_name)
      : breakdown === 'manager'
      ? chartMembers.map((member) => member.manager_i_name || '')
      : [];

  const labels = breakdown === 'date' ? timeSeries.map((p) => p.date) : memberLabels;

  const getValues = (md: MetricDef): number[] =>
    breakdown === 'date'
      ? timeSeries.map((p) => (md.fromTs ? md.fromTs(p) : 0))
      : chartMembers.map((m) => {
          if ((breakdown === 'cse' || showTeamMembers) && md.fromCse && 'cse_name' in m) {
            return md.fromCse(m as CseMemberData);
          }
          if ((breakdown === 'rm' || showTeamMembers) && md.fromRm && 'rm_name' in m) {
            return md.fromRm(m as RmMemberData);
          }
          if (breakdown === 'manager' && md.fromRm && 'rm_name' in m) {
            return md.fromRm(m as RmMemberData);
          }
          if (breakdown === 'manager' && md.fromCse && 'cse_name' in m) {
            return md.fromCse(m as CseMemberData);
          }
          return 0;
        });

  const overviewMetricValue = (md: MetricDef): number => {
    if (md.fromOverview && overview && 'resolve_rate' in overview) {
      return md.fromOverview(overview as CseOverviewData);
    }
    if (md.fromOverviewRm && overview && 'calls_made' in overview) {
      return md.fromOverviewRm(overview as RmOverviewData);
    }
    return 0;
  };

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
    const count = activeMetricDefs.length;
    const gridCols =
      count <= 1
        ? 'grid-cols-1'
        : count === 2
        ? 'grid-cols-1 sm:grid-cols-2'
        : count === 3
        ? 'grid-cols-1 sm:grid-cols-3'
        : 'grid-cols-2 lg:grid-cols-4';
    return (
      <div className="h-full overflow-y-auto">
        <div className={`grid ${gridCols} gap-4 h-full content-center`}>
          {activeMetricDefs.map((md) => {
            // Averages (time/percent) must never be summed across rows — use overview.
            const useOverview =
              md.format === 'percent' ||
              md.format === 'time' ||
              (!!md.fromOverviewRm && !md.fromTs && !md.fromRm && !md.fromCse) ||
              (!!md.fromOverview && !md.fromTs && !md.fromCse && !md.fromRm);
            const total = useOverview
              ? overview
                ? overviewMetricValue(md)
                : 0
              : getValues(md).reduce((sum, v) => sum + v, 0);
            const display =
              md.format === 'number'
                ? total.toLocaleString()
                : formatMetricValue(md.format, total);
            return (
              <div
                key={md.key}
                className="relative overflow-hidden rounded-xl border bg-background p-5 shadow-sm"
              >
                <span
                  className="absolute inset-y-0 left-0 w-1 rounded-l-xl"
                  style={{ backgroundColor: md.color }}
                />
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: md.color }}
                  />
                  <span className="text-sm font-medium text-muted-foreground truncate">
                    {md.label}
                  </span>
                </div>
                <div
                  className="text-4xl font-bold tracking-tight tabular-nums"
                  style={{ color: md.color }}
                >
                  {display}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (chartType === 'table') {
    const rows = labels
      .map((label, rowIdx) => ({
        label,
        rowIdx,
        values: Object.fromEntries(
          activeMetricDefs.map((metric) => [
            metric.key,
            getValues(metric)[rowIdx] ?? 0,
          ])
        ) as Record<string, number>,
      }))
      .sort((a, b) => {
        const comparison =
          tableSort.key === 'dimension'
            ? a.label.localeCompare(b.label, undefined, {
                numeric: true,
                sensitivity: 'base',
              })
            : (a.values[tableSort.key] ?? 0) - (b.values[tableSort.key] ?? 0);
        return tableSort.direction === 'asc' ? comparison : -comparison;
      });

    const toggleSort = (key: string) => {
      setTableSort((current) => ({
        key,
        direction:
          current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
      }));
    };

    const SortIcon = ({ columnKey }: { columnKey: string }) =>
      tableSort.key !== columnKey ? (
        <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
      ) : tableSort.direction === 'asc' ? (
        <ArrowUp className="h-3.5 w-3.5" />
      ) : (
        <ArrowDown className="h-3.5 w-3.5" />
      );

    return (
      <div className="overflow-auto h-full border rounded-lg">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-background">
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-2 px-3">
                <button
                  type="button"
                  onClick={() => toggleSort('dimension')}
                  className="inline-flex items-center gap-1.5 hover:text-foreground"
                >
                  {breakdown === 'date'
                    ? 'Date'
                    : breakdown === 'cse'
                    ? 'CSE'
                    : breakdown === 'rm'
                    ? 'RM'
                    : 'Manager I'}
                  <SortIcon columnKey="dimension" />
                </button>
              </th>
              {activeMetricDefs.map((md) => (
                <th key={md.key} className="py-2 px-3 text-right">
                  <button
                    type="button"
                    onClick={() => toggleSort(md.key)}
                    className="ml-auto inline-flex items-center gap-1.5 hover:text-foreground"
                  >
                    {md.label}
                    <SortIcon columnKey={md.key} />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.label}-${row.rowIdx}`} className="border-b border-muted/40">
                <td className="py-2 px-3 font-medium">{row.label}</td>
                {activeMetricDefs.map((md) => (
                  <td key={md.key} className="py-2 px-3 text-right">
                    {formatMetricValue(md.format, row.values[md.key] ?? 0)}
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

const useRmReportData = (
  params: RmFilterParams,
  need: { overview: boolean; members: boolean; timeSeries: boolean },
  refreshNonce: number
) => {
  const [overview, setOverview] = useState<RmOverviewData | null>(null);
  const [members, setMembers] = useState<RmMemberData[]>([]);
  const [timeSeries, setTimeSeries] = useState<RmTimeSeriesPoint[]>([]);
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
          need.overview ? rmAnalyticsApi.getOverview(params) : Promise.resolve(null),
          need.members ? rmAnalyticsApi.getMembers(params) : Promise.resolve([]),
          need.timeSeries ? rmAnalyticsApi.getTimeSeries(params) : Promise.resolve([]),
        ]);
        if (cancelled) return;
        setOverview(ov);
        setMembers(mem);
        setTimeSeries(ts);
      } catch (e: any) {
        if (cancelled) return;
        setError(
          e?.response?.data?.error ||
            e?.response?.data?.detail ||
            e?.message ||
            'Failed to load report'
        );
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

const computeReportNeed = (report: BoardReport, metricCatalog: MetricDef[]) => {
  const metrics = Array.isArray(report.metrics) ? report.metrics : [];
  const hasPctOrTime = metrics.some((k) => {
    const md = metricCatalog.find((m) => m.key === k);
    return md && (md.format === 'percent' || md.format === 'time');
  });
  const needsOverviewOnlyMetric = metrics.some((k) => {
    const md = metricCatalog.find((m) => m.key === k);
    return (
      md &&
      (md.fromOverview || md.fromOverviewRm) &&
      !md.fromTs &&
      !md.fromCse &&
      !md.fromRm
    );
  });
  return {
    timeSeries: report.breakdown === 'date',
    members:
      report.breakdown === 'cse' ||
      report.breakdown === 'rm' ||
      report.breakdown === 'manager',
    overview:
      report.chartType === 'metric' && (hasPctOrTime || needsOverviewOnlyMetric),
  };
};

const BoardReportCard: React.FC<{
  report: BoardReport;
  options: FilterOptions;
  showDatePicker: boolean;
  refreshNonce: number;
  metricCatalog: MetricDef[];
  onRemove: (id: string) => void;
  onFiltersChange: (id: string, filters: ReportFilters) => void;
  useReportData: (
    params: CseFilterParams | RmFilterParams,
    need: { overview: boolean; members: boolean; timeSeries: boolean },
    refreshNonce: number
  ) => {
    overview: CseOverviewData | RmOverviewData | null;
    members: CseMemberData[] | RmMemberData[];
    timeSeries: CseTimeSeriesPoint[] | RmTimeSeriesPoint[];
    loading: boolean;
    error: string | null;
  };
}> = ({
  report,
  options,
  showDatePicker,
  refreshNonce,
  metricCatalog,
  onRemove,
  onFiltersChange,
  useReportData,
}) => {
  const need = useMemo(() => computeReportNeed(report, metricCatalog), [report, metricCatalog]);
  const params = useMemo(() => filtersToParams(report.filters), [report.filters]);

  const { overview, members, timeSeries, loading, error } = useReportData(
    params,
    need,
    refreshNonce
  );

  const isBarOrTable =
    report.chartType === 'bar' ||
    report.chartType === 'stackedBar' ||
    report.chartType === 'table';
  const memberCount = members.length;
  const height =
    (report.breakdown === 'cse' ||
      report.breakdown === 'rm' ||
      report.breakdown === 'manager') &&
    isBarOrTable
      ? Math.max(300, memberCount * 38 || 300)
      : 320;
  const managerFilterPending = isManagerIFilterPending(report.filters);

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
          {managerFilterPending ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm text-center px-4">
              Select a Manager I to view that team’s data
            </div>
          ) : loading ? (
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
              metricCatalog={metricCatalog}
              timeSeries={timeSeries}
              members={members}
              overview={overview}
              expandManagerTeam={(report.filters.attributes?.manager_i || []).length > 0}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
};


type RmUnassignedTab = 'source' | 'status';

const SortableCountTable: React.FC<{
  dimensionLabel: string;
  rows: Array<{ label: string; count: number }>;
}> = ({ dimensionLabel, rows }) => {
  const [sort, setSort] = useState<{
    key: 'label' | 'count';
    direction: 'asc' | 'desc';
  }>({ key: 'label', direction: 'asc' });
  const sortedRows = [...rows].sort((a, b) => {
    const comparison =
      sort.key === 'label'
        ? a.label.localeCompare(b.label, undefined, {
            numeric: true,
            sensitivity: 'base',
          })
        : a.count - b.count;
    return sort.direction === 'asc' ? comparison : -comparison;
  });
  const toggleSort = (key: 'label' | 'count') => {
    setSort((current) => ({
      key,
      direction:
        current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };
  const sortIcon = (key: 'label' | 'count') =>
    sort.key !== key ? (
      <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
    ) : sort.direction === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5" />
    );

  return (
    <div className="overflow-auto max-h-[360px] border rounded-lg">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-background">
          <tr className="border-b text-muted-foreground">
            <th className="text-left py-2 px-3 font-medium">
              <button
                type="button"
                onClick={() => toggleSort('label')}
                className="inline-flex items-center gap-1.5 hover:text-foreground"
              >
                {dimensionLabel}
                {sortIcon('label')}
              </button>
            </th>
            <th className="text-right py-2 px-3 font-medium">
              <button
                type="button"
                onClick={() => toggleSort('count')}
                className="ml-auto inline-flex items-center gap-1.5 hover:text-foreground"
              >
                Count
                {sortIcon('count')}
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row) => (
            <tr
              key={row.label}
              className="border-b border-muted/40 hover:bg-muted/30"
            >
              <td className="py-2 px-3 font-medium">{row.label}</td>
              <td className="py-2 px-3 text-right font-semibold">
                {row.count.toLocaleString()}
              </td>
            </tr>
          ))}
          {sortedRows.length === 0 && (
            <tr>
              <td colSpan={2} className="py-8 text-center text-muted-foreground">
                No results
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

const RmUnassignedLeadsPanel: React.FC<{ refreshNonce: number }> = ({ refreshNonce }) => {
  const [tab, setTab] = useState<RmUnassignedTab>('source');
  const [leadSources, setLeadSources] = useState<string[]>([]);
  const [leadStage, setLeadStage] = useState('');
  const [data, setData] = useState<UnassignedLeadsBreakdown | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await teamAnalyticsApi.getUnassignedLeadsBreakdown({
          lead_source: leadSources.length ? leadSources.join(',') : undefined,
          lead_stage: leadStage || undefined,
        });
        if (!cancelled) setData(result);
      } catch (e: any) {
        if (!cancelled) {
          setError(
            e?.response?.data?.error ||
              e?.response?.data?.detail ||
              e?.message ||
              'Failed to load unassigned leads'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [leadSources, leadStage, refreshNonce]);

  const sourceOptions = Array.from(
    new Set([...(data?.available_sources || []), ...leadSources])
  ).sort();
  const stageOptions = Array.from(
    new Set([...(data?.available_stages || []), ...(leadStage ? [leadStage] : [])])
  ).sort();
  const rows =
    tab === 'source'
      ? (data?.by_source || []).map((item) => ({
          label: item.lead_source || 'Unknown',
          count: item.count,
        }))
      : (data?.by_status || []).map((item) => ({
          label: item.lead_stage || 'Unknown',
          count: item.count,
        }));
  const hasFilters = leadSources.length > 0 || !!leadStage;

  return (
    <Card className="border border-gray-200">
      <CardHeader className="pb-2 space-y-3">
        <div>
          <h5>Unassigned Leads</h5>
          <p className="text-sm text-muted-foreground">
            Current inventory breakdown by lead source or lead status
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              ['source', 'By Lead Source'],
              ['status', 'By Lead Status'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                tab === key
                  ? 'bg-black text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          <AttributeValuePicker
            label="Lead Source"
            values={sourceOptions}
            selected={leadSources}
            onToggle={(source) =>
              setLeadSources((current) =>
                current.includes(source)
                  ? current.filter((value) => value !== source)
                  : [...current, source]
              )
            }
          />
          <div>
            <label className="text-[11px] text-muted-foreground block mb-1">
              Lead Status
            </label>
            <select
              value={leadStage}
              onChange={(event) => setLeadStage(event.target.value)}
              className="h-9 text-sm border rounded-lg px-3 bg-background min-w-[180px]"
            >
              <option value="">All Statuses</option>
              {stageOptions.map((stage) => (
                <option key={stage} value={stage}>
                  {stage}
                </option>
              ))}
            </select>
          </div>
          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setLeadSources([]);
                setLeadStage('');
              }}
              className="text-xs text-red-500 hover:text-red-700 underline h-9"
            >
              Clear filters
            </button>
          )}
          <span className="text-sm text-muted-foreground ml-auto h-9 flex items-center">
            Filtered total:{' '}
            <strong className="ml-1">
              {typeof data?.total === 'number' ? data.total.toLocaleString() : '—'}
            </strong>
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
            Loading…
          </div>
        ) : error ? (
          <div className="h-48 flex items-center justify-center text-sm text-red-600">
            {error}
          </div>
        ) : (
          <SortableCountTable
            dimensionLabel={tab === 'source' ? 'Lead Source' : 'Lead Status'}
            rows={rows}
          />
        )}
      </CardContent>
    </Card>
  );
};

type CseTicketBreakdownTab = 'type' | 'status';

const CseSupportTicketBreakdownPanel: React.FC<{ refreshNonce: number }> = ({
  refreshNonce,
}) => {
  const [tab, setTab] = useState<CseTicketBreakdownTab>('type');
  const [ticketTypes, setTicketTypes] = useState<string[]>([]);
  const [resolutionStatus, setResolutionStatus] = useState('');
  const [data, setData] = useState<CseSupportTicketBreakdown | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await cseAnalyticsApi.getSupportTicketBreakdown({
          ticket_type: ticketTypes.length ? ticketTypes.join(',') : undefined,
          resolution_status: resolutionStatus || undefined,
        });
        if (!cancelled) setData(result);
      } catch (e: any) {
        if (!cancelled) {
          setError(
            e?.response?.data?.error ||
              e?.response?.data?.detail ||
              e?.message ||
              'Failed to load support ticket breakdown'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [ticketTypes, resolutionStatus, refreshNonce]);

  const typeOptions = Array.from(
    new Set([...(data?.available_types || []), ...ticketTypes])
  ).sort();
  const statusOptions = Array.from(
    new Set([
      ...(data?.available_statuses || []),
      ...(resolutionStatus ? [resolutionStatus] : []),
    ])
  ).sort();
  const rows =
    tab === 'type'
      ? (data?.by_type || []).map((item) => ({
          label: item.ticket_type || 'Unknown',
          count: item.count,
        }))
      : (data?.by_status || []).map((item) => ({
          label: item.resolution_status || 'Open',
          count: item.count,
        }));
  const hasFilters = ticketTypes.length > 0 || !!resolutionStatus;

  return (
    <Card className="border border-gray-200">
      <CardHeader className="pb-2 space-y-3">
        <div>
          <h5>Support Ticket Breakdown</h5>
          <p className="text-sm text-muted-foreground">
            Current assigned-ticket inventory by ticket type or resolution status
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              ['type', 'By Ticket Type'],
              ['status', 'By Resolution Status'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                tab === key
                  ? 'bg-black text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          <AttributeValuePicker
            label="Ticket Type"
            values={typeOptions}
            selected={ticketTypes}
            onToggle={(ticketType) =>
              setTicketTypes((current) =>
                current.includes(ticketType)
                  ? current.filter((value) => value !== ticketType)
                  : [...current, ticketType]
              )
            }
          />
          <div>
            <label className="text-[11px] text-muted-foreground block mb-1">
              Resolution Status
            </label>
            <select
              value={resolutionStatus}
              onChange={(event) => setResolutionStatus(event.target.value)}
              className="h-9 text-sm border rounded-lg px-3 bg-background min-w-[190px]"
            >
              <option value="">All Statuses</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setTicketTypes([]);
                setResolutionStatus('');
              }}
              className="text-xs text-red-500 hover:text-red-700 underline h-9"
            >
              Clear filters
            </button>
          )}
          <span className="text-sm text-muted-foreground ml-auto h-9 flex items-center">
            Filtered total:{' '}
            <strong className="ml-1">
              {typeof data?.total === 'number' ? data.total.toLocaleString() : '—'}
            </strong>
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
            Loading…
          </div>
        ) : error ? (
          <div className="h-48 flex items-center justify-center text-sm text-red-600">
            {error}
          </div>
        ) : (
          <SortableCountTable
            dimensionLabel={tab === 'type' ? 'Ticket Type' : 'Resolution Status'}
            rows={rows}
          />
        )}
      </CardContent>
    </Card>
  );
};

const makeDefaultFilters = (): ReportFilters => {
  const range = getPresetRange('last7days');
  return { from: range.from, to: range.to, datePreset: 'last7days', attributes: {} };
};

const AnalyticsBoardVariantComponent: React.FC<
  AnalyticsBoardViewProps & { variant: 'cse' | 'rm' }
> = ({ config = {}, analyticsTypeSelector, variant }) => {
  const [visibilityScope, setVisibilityScope] = useState<string | null>(null);
  const metricCatalog = useMemo(
    () =>
      variant === 'rm' && visibilityScope !== 'all'
        ? RM_METRIC_DEFS.filter((metric) => metric.key !== 'unassigned_leads')
        : variant === 'rm'
        ? RM_METRIC_DEFS
        : METRIC_DEFS,
    [variant, visibilityScope]
  );
  const defaultMetricKeys = useMemo(
    () =>
      variant === 'rm'
        ? ['calls_made', 'trials_activated']
        : ['assigned', 'resolved'],
    [variant]
  );
  const validMetricKeys = useMemo(
    () => new Set(metricCatalog.map((metric) => metric.key)),
    [metricCatalog]
  );
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    attributes: [],
    handlingStatuses: [],
  });

  // Query builder (composer) state
  const [composerFilters, setComposerFilters] = useState<ReportFilters>(makeDefaultFilters);
  const [chartType, setChartType] = useState<ChartType>('column');
  const [breakdown, setBreakdown] = useState<BreakdownType>('date');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(defaultMetricKeys);
  const [metricDropdownOpen, setMetricDropdownOpen] = useState(false);
  const metricDropdownRef = useRef<HTMLDivElement>(null);

  // Composer preview data
  const [overview, setOverview] = useState<CseOverviewData | RmOverviewData | null>(null);
  const [members, setMembers] = useState<CseMemberData[] | RmMemberData[]>([]);
  const [timeSeries, setTimeSeries] = useState<CseTimeSeriesPoint[] | RmTimeSeriesPoint[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Board state (persisted server-side, per user — one row per board)
  const title =
    config.title ||
    (variant === 'rm' ? 'RM Analytics Board' : 'Analytics Board');
  const showDatePicker = config.showDatePicker !== false;
  const boardType = variant;
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
        setBoard(
          reports
            .map((r) =>
              normalizeBoardReport(r, variant, defaultMetricKeys, validMetricKeys)
            )
            .filter((r): r is BoardReport => Boolean(r))
        );
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
  }, [boardType, variant, defaultMetricKeys, validMetricKeys]);

  // Clean up any pending per-board save timers on unmount
  useEffect(() => {
    const timers = saveTimersRef.current;
    return () => {
      Object.values(timers).forEach((t) => clearTimeout(t));
    };
  }, []);

  const availableMetrics = useMemo(
    () => getAvailableMetrics(breakdown, metricCatalog, chartType),
    [breakdown, metricCatalog, chartType]
  );
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
        if (variant === 'rm') {
          const options = await rmAnalyticsApi.getFilterOptions();
          setVisibilityScope(options.visibility_scope || 'self');
          setFilterOptions({
            attributes: options.attributes || [],
            handlingStatuses: [],
          });
        } else {
          const options = await cseAnalyticsApi.getFilterOptions();
          setVisibilityScope(options.visibility_scope || 'self');
          setFilterOptions({
            attributes: options.attributes || [],
            handlingStatuses: options.handling_time_statuses || [],
          });
        }
      } catch (e) {
        console.error(`Error loading ${variant} filter options:`, e);
      }
    };
    loadFilterOptions();
  }, [variant]);

  const composerParams = useMemo(() => filtersToParams(composerFilters), [composerFilters]);

  const fetchPreview = async () => {
    try {
      setPreviewLoading(true);
      setError(null);
      if (variant === 'rm') {
        const rmParams = composerParams as RmFilterParams;
        const [ov, mem, series] = await Promise.all([
          rmAnalyticsApi.getOverview(rmParams),
          rmAnalyticsApi.getMembers(rmParams),
          rmAnalyticsApi.getTimeSeries(rmParams),
        ]);
        setOverview(ov);
        setMembers(mem);
        setTimeSeries(series);
      } else {
        const [ov, mem, series] = await Promise.all([
          cseAnalyticsApi.getOverview(composerParams),
          cseAnalyticsApi.getMembers(composerParams),
          cseAnalyticsApi.getTimeSeries(composerParams),
        ]);
        setOverview(ov);
        setMembers(mem);
        setTimeSeries(series);
      }
    } catch (e: any) {
      const message =
        e?.response?.data?.error ||
        e?.response?.data?.detail ||
        e.message ||
        `Failed to load ${variant.toUpperCase()} analytics`;
      setError(message);
      console.error(`Error fetching ${variant} analytics:`, e?.response?.data || e);
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
    (breakdown === 'cse' || breakdown === 'rm' || breakdown === 'manager') &&
    (composerIsBar || chartType === 'table')
      ? Math.max(320, members.length * 40)
      : 384;

  const breakdownLabel =
    breakdown === 'date'
      ? 'Date'
      : breakdown === 'manager'
      ? 'Manager I'
      : variant === 'rm'
      ? 'RM'
      : 'CSE';

  const addCurrentToBoard = () => {
    if (selectedMetrics.length === 0) return;
    const chartLabel = CHART_TYPES.find((c) => c.value === chartType)?.label || '';
    const report: BoardReport = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: `${getMetricLabels(selectedMetrics, metricCatalog)} by ${breakdownLabel} (${chartLabel})`,
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
        <div className="flex flex-wrap items-end gap-3">
          {analyticsTypeSelector}
          <Button variant="outline" onClick={() => setRefreshNonce((n) => n + 1)}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          Error: {error}
        </div>
      )}

      {variant === 'rm' && visibilityScope === 'all' && (
        <RmUnassignedLeadsPanel refreshNonce={refreshNonce} />
      )}
      {variant === 'cse' && (
        <CseSupportTicketBreakdownPanel refreshNonce={refreshNonce} />
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
                  {variant === 'rm' ? (
                    <SelectItem value="rm">By RM</SelectItem>
                  ) : (
                    <SelectItem value="cse">By CSE</SelectItem>
                  )}
                  {visibilityScope === 'all' && (
                    <SelectItem value="manager">By Manager I</SelectItem>
                  )}
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
            {isManagerIFilterPending(composerFilters) ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm text-center px-4">
                Select a Manager I to view that team’s data
              </div>
            ) : previewLoading ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                Loading preview…
              </div>
            ) : (
              <ReportChart
                chartType={chartType}
                breakdown={breakdown}
                metrics={selectedMetrics}
                metricCatalog={metricCatalog}
                timeSeries={timeSeries}
                members={members}
                overview={overview}
                expandManagerTeam={(composerFilters.attributes?.manager_i || []).length > 0}
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
              metricCatalog={metricCatalog}
              useReportData={variant === 'rm' ? useRmReportData : useCseReportData}
              onRemove={removeReport}
              onFiltersChange={updateReportFilters}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const CseAnalyticsBoardComponent: React.FC<AnalyticsBoardViewProps> = (props) => (
  <AnalyticsBoardVariantComponent {...props} variant="cse" />
);

const RmAnalyticsBoardComponent: React.FC<AnalyticsBoardViewProps> = (props) => (
  <AnalyticsBoardVariantComponent {...props} variant="rm" />
);

const CseAnalyticsComponent: React.FC<CseAnalyticsComponentProps> = ({ config = {} }) => {
  const configuredType = (config.analyticsType || 'cse').toLowerCase() === 'rm' ? 'rm' : 'cse';
  const [analyticsType, setAnalyticsType] = useState<'cse' | 'rm'>(configuredType);
  const [availableTypes, setAvailableTypes] = useState<Array<'cse' | 'rm'> | null>(
    null
  );
  const [accessError, setAccessError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    cseAnalyticsApi
      .getAvailableTypes()
      .then((types) => {
        if (cancelled) return;
        setAvailableTypes(types);
        setAnalyticsType(types.includes(configuredType) ? configuredType : types[0] || 'cse');
      })
      .catch((error) => {
        if (cancelled) return;
        console.error('Error loading analytics access:', error);
        setAvailableTypes([]);
        setAccessError('Unable to determine which analytics you can access.');
      });
    return () => {
      cancelled = true;
    };
  }, [configuredType]);

  if (availableTypes === null) {
    return (
      <div className="min-h-[240px] flex items-center justify-center text-sm text-muted-foreground">
        Loading analytics access…
      </div>
    );
  }

  if (availableTypes.length === 0) {
    return (
      <div className="min-h-[240px] flex items-center justify-center text-sm text-muted-foreground">
        {accessError || 'No analytics are available for your role or team.'}
      </div>
    );
  }

  const analyticsTypeSelector = (
    <div>
      <label className="text-xs text-muted-foreground block mb-1">Analytics Type</label>
      <Select
        value={analyticsType}
        onValueChange={(value) => setAnalyticsType(value as 'cse' | 'rm')}
      >
        <SelectTrigger className="w-[180px] bg-background">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {availableTypes.includes('cse') && (
            <SelectItem value="cse">CSE Analytics</SelectItem>
          )}
          {availableTypes.includes('rm') && (
            <SelectItem value="rm">RM Analytics</SelectItem>
          )}
        </SelectContent>
      </Select>
    </div>
  );

  return analyticsType === 'rm' ? (
    <RmAnalyticsBoardComponent
      config={{ ...config, analyticsType: 'rm' }}
      analyticsTypeSelector={analyticsTypeSelector}
    />
  ) : (
    <CseAnalyticsBoardComponent
      config={{ ...config, analyticsType: 'cse' }}
      analyticsTypeSelector={analyticsTypeSelector}
    />
  );
};

export default CseAnalyticsComponent;
