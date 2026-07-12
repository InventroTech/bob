import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import {
  cseAnalyticsApi,
  type CseMemberData,
  type CseOverviewData,
  type CseTimeSeriesPoint,
} from '@/lib/cseAnalyticsApi';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Calendar, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface CseAnalyticsComponentProps {
  config?: {
    title?: string;
    showDatePicker?: boolean;
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

const formatPercent = (value: number | null | undefined): string => {
  if (value == null) return '0%';
  return `${Math.round(value * 100)}%`;
};

const formatStatusLabel = (value: string): string =>
  value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const CseAnalyticsComponent: React.FC<CseAnalyticsComponentProps> = ({ config = {} }) => {
  const initialRange = getPresetRange('last7days');
  const [datePreset, setDatePreset] = useState<DatePreset>('last7days');
  const [fromDate, setFromDate] = useState(initialRange.from);
  const [toDate, setToDate] = useState(initialRange.to);
  const [overview, setOverview] = useState<CseOverviewData | null>(null);
  const [members, setMembers] = useState<CseMemberData[]>([]);
  const [timeSeries, setTimeSeries] = useState<CseTimeSeriesPoint[]>([]);
  const [ticketTypes, setTicketTypes] = useState<string[]>([]);
  const [cseNames, setCseNames] = useState<string[]>([]);
  const [handlingStatuses, setHandlingStatuses] = useState<string[]>([]);
  const [ticketTypeFilter, setTicketTypeFilter] = useState<string[]>([]);
  const [cseFilter, setCseFilter] = useState('');
  const [handlingStatusFilter, setHandlingStatusFilter] = useState('');
  const [ticketTypeDropdownOpen, setTicketTypeDropdownOpen] = useState(false);
  const [ticketTypeSearch, setTicketTypeSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ticketTypeDropdownRef = useRef<HTMLDivElement>(null);

  const showDatePicker = config.showDatePicker !== false;
  const title = config.title || 'CSE Analytics';

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        ticketTypeDropdownRef.current &&
        !ticketTypeDropdownRef.current.contains(e.target as Node)
      ) {
        setTicketTypeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const options = await cseAnalyticsApi.getFilterOptions();
        setTicketTypes(options.ticket_types || []);
        setCseNames(options.cse_names || []);
        setHandlingStatuses(options.handling_time_statuses || []);
      } catch (e) {
        console.error('Error loading CSE filter options:', e);
      }
    };
    loadFilterOptions();
  }, []);

  const handlePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    if (preset !== 'custom') {
      const range = getPresetRange(preset);
      setFromDate(range.from);
      setToDate(range.to);
    }
  };

  const filterParams = useMemo(
    () => ({
      from: fromDate,
      to: toDate,
      ticket_type: ticketTypeFilter.length > 0 ? ticketTypeFilter.join(',') : undefined,
      handling_status: handlingStatusFilter || undefined,
      cse_name: cseFilter || undefined,
    }),
    [fromDate, toDate, ticketTypeFilter, handlingStatusFilter, cseFilter]
  );

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError(null);
      const [ov, mem, series] = await Promise.all([
        cseAnalyticsApi.getOverview(filterParams),
        cseAnalyticsApi.getMembers(filterParams),
        cseAnalyticsApi.getTimeSeries(filterParams),
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
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [filterParams]);

  const toggleTicketType = (value: string) => {
    setTicketTypeFilter((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]
    );
  };

  const filteredTicketTypes = ticketTypes.filter((type) =>
    type.toLowerCase().includes(ticketTypeSearch.toLowerCase())
  );

  const dateLabels = timeSeries.map((p) => p.date);
  const memberChartHeight = Math.max(320, members.length * 40);

  const assignedResolvedTrend = {
    labels: dateLabels,
    datasets: [
      {
        label: 'Assigned',
        data: timeSeries.map((p) => p.assigned),
        borderColor: 'rgba(59, 130, 246, 1)',
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
        fill: true,
        tension: 0.35,
      },
      {
        label: 'Resolved',
        data: timeSeries.map((p) => p.resolved),
        borderColor: 'rgba(34, 197, 94, 1)',
        backgroundColor: 'rgba(34, 197, 94, 0.15)',
        fill: true,
        tension: 0.35,
      },
    ],
  };

  const resolveRateTrend = {
    labels: dateLabels,
    datasets: [
      {
        label: 'Resolve Rate (%)',
        data: timeSeries.map((p) => Math.round((p.resolve_rate || 0) * 100)),
        borderColor: 'rgba(168, 85, 247, 1)',
        backgroundColor: 'rgba(168, 85, 247, 0.15)',
        fill: true,
        tension: 0.35,
      },
    ],
  };

  const handlingTimeTrend = {
    labels: dateLabels,
    datasets: [
      {
        label: 'Avg Handling Time (sec)',
        data: timeSeries.map((p) => p.average_handling_time_seconds || 0),
        borderColor: 'rgba(251, 146, 60, 1)',
        backgroundColor: 'rgba(251, 146, 60, 0.15)',
        fill: true,
        tension: 0.35,
      },
    ],
  };

  const outcomeTrend = {
    labels: dateLabels,
    datasets: [
      {
        label: 'Not Connected',
        data: timeSeries.map((p) => p.not_connected),
        borderColor: 'rgba(239, 68, 68, 1)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: false,
        tension: 0.35,
      },
      {
        label: 'Call Back',
        data: timeSeries.map((p) => p.call_later),
        borderColor: 'rgba(251, 146, 60, 1)',
        backgroundColor: 'rgba(251, 146, 60, 0.1)',
        fill: false,
        tension: 0.35,
      },
    ],
  };

  const stackedDailyData = {
    labels: dateLabels,
    datasets: [
      {
        label: 'Resolved',
        data: timeSeries.map((p) => p.stacked_resolved),
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
      },
      {
        label: 'Unresolved',
        data: timeSeries.map((p) => p.stacked_unresolved),
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
      },
    ],
  };

  const outcomeBarData = {
    labels: ['Not Connected', 'Call Back', 'Resolved', "Can't Resolve"],
    datasets: [
      {
        label: 'Tickets',
        data: [
          overview?.not_connected || 0,
          overview?.call_later || 0,
          overview?.resolved || 0,
          overview?.cant_resolve || 0,
        ],
        backgroundColor: [
          'rgba(239, 68, 68, 0.8)',
          'rgba(251, 146, 60, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(107, 114, 128, 0.8)',
        ],
      },
    ],
  };

  const memberLabels = members.map((m) => m.cse_name);
  const openTicketsData = {
    labels: memberLabels,
    datasets: [
      {
        label: 'Open Call Back',
        data: members.map((m) => m.open_call_back),
        backgroundColor: 'rgba(251, 146, 60, 0.8)',
      },
      {
        label: 'Open Not Connected',
        data: members.map((m) => m.open_not_connected),
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
      },
    ],
  };

  const resolveRateByCse = {
    labels: memberLabels,
    datasets: [
      {
        label: 'Resolve Rate (%)',
        data: members.map((m) => Math.round((m.resolve_rate || 0) * 100)),
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
      },
    ],
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'top' as const } },
    scales: { y: { beginAtZero: true } },
  };

  const handlingLineOptions = {
    ...lineOptions,
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: string | number) => formatTime(Number(value)),
        },
      },
    },
  };

  const stackedOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'top' as const } },
    scales: {
      x: { stacked: true },
      y: { stacked: true, beginAtZero: true },
    },
  };

  const horizontalBarOptions = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { x: { beginAtZero: true } },
  };

  if (loading && !overview) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading CSE analytics...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 min-h-screen overflow-y-auto bg-slate-50/40">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h5>{title}</h5>
          <p className="text-sm text-muted-foreground mt-1">
            Mirrors Mixpanel support-ticket events: assigned, not connected, call back, resolved
          </p>
        </div>
        <Button onClick={fetchAll} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <h5>Filters</h5>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Date Range</label>
              <Select value={datePreset} onValueChange={(v) => handlePresetChange(v as DatePreset)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last7days">Last 7 days</SelectItem>
                  <SelectItem value="last30days">Last 30 days</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {showDatePicker && datePreset === 'custom' && (
              <>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-40" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">to</span>
                  <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-40" />
                </div>
              </>
            )}

            <div className="relative" ref={ticketTypeDropdownRef}>
              <label className="text-xs text-muted-foreground block mb-1">Ticket Type</label>
              <button
                type="button"
                onClick={() => {
                  setTicketTypeDropdownOpen(!ticketTypeDropdownOpen);
                  setTicketTypeSearch('');
                }}
                className="text-sm border rounded-lg px-3 py-2 bg-background min-w-[200px] text-left flex items-center justify-between gap-2"
              >
                <span className="truncate">
                  {ticketTypeFilter.length === 0
                    ? 'All ticket types'
                    : `${ticketTypeFilter.length} selected`}
                </span>
                <ChevronDown className="h-3 w-3 shrink-0" />
              </button>
              {ticketTypeDropdownOpen && (
                <div className="absolute z-50 mt-1 w-80 bg-background border rounded-lg shadow-lg">
                  <div className="p-2 border-b">
                    <input
                      type="text"
                      placeholder="Search ticket types"
                      value={ticketTypeSearch}
                      onChange={(e) => setTicketTypeSearch(e.target.value)}
                      className="w-full text-sm border rounded-lg px-3 py-2 bg-background outline-none"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-64 overflow-y-auto py-1">
                    {filteredTicketTypes.map((type) => (
                      <label
                        key={type}
                        className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-muted/50"
                      >
                        <input
                          type="checkbox"
                          checked={ticketTypeFilter.includes(type)}
                          onChange={() => toggleTicketType(type)}
                          className="h-4 w-4"
                        />
                        <span>{type}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="text-xs text-muted-foreground block mb-1">CSE</label>
              <select
                value={cseFilter}
                onChange={(e) => setCseFilter(e.target.value)}
                className="text-sm border rounded-lg px-3 py-2 bg-background min-w-[200px]"
              >
                <option value="">All CSEs</option>
                {cseNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground block mb-1">Handling Time Status</label>
              <select
                value={handlingStatusFilter}
                onChange={(e) => setHandlingStatusFilter(e.target.value)}
                className="text-sm border rounded-lg px-3 py-2 bg-background min-w-[180px]"
              >
                <option value="">All statuses</option>
                {handlingStatuses.map((status) => (
                  <option key={status} value={status}>
                    {formatStatusLabel(status)}
                  </option>
                ))}
              </select>
            </div>

            {(ticketTypeFilter.length > 0 || cseFilter || handlingStatusFilter) && (
              <button
                type="button"
                onClick={() => {
                  setTicketTypeFilter([]);
                  setCseFilter('');
                  setHandlingStatusFilter('');
                }}
                className="text-xs text-red-500 hover:text-red-700 underline py-2"
              >
                Clear filters
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          Error: {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
        {[
          { label: 'Assigned', value: overview?.leads_assigned ?? 0, color: 'text-blue-600' },
          { label: 'Resolved', value: overview?.resolved ?? 0, color: 'text-green-600' },
          { label: 'Resolve Rate', value: formatPercent(overview?.resolve_rate), color: 'text-purple-600' },
          { label: 'Open Call Back', value: overview?.open_call_back ?? 0, color: 'text-orange-600' },
          { label: 'Open Not Connected', value: overview?.open_not_connected ?? 0, color: 'text-red-600' },
          { label: 'Not Connected', value: overview?.not_connected ?? 0, color: 'text-red-500' },
          { label: 'Call Back', value: overview?.call_later ?? 0, color: 'text-orange-500' },
          { label: 'Avg Handling', value: formatTime(overview?.average_handling_time_seconds), color: 'text-slate-800' },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="pt-4 pb-3">
              <div className="text-xs text-muted-foreground mb-1">{kpi.label}</div>
              <div className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h5>Assigned vs Resolved</h5>
            <p className="text-sm text-muted-foreground">Daily trend (pyro_st_assigned / pyro_st_resolve)</p>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <Line data={assignedResolvedTrend} options={lineOptions} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h5>Resolve Rate Trend</h5>
            <p className="text-sm text-muted-foreground">Resolved ÷ Assigned per day</p>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <Line data={resolveRateTrend} options={lineOptions} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h5>Not Connected & Call Back Trend</h5>
            <p className="text-sm text-muted-foreground">pyro_st_not_connected / pyro_st_call_later</p>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <Line data={outcomeTrend} options={lineOptions} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h5>Avg Handling Time Trend</h5>
            <p className="text-sm text-muted-foreground">Time spent per ticket (resolution_time)</p>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <Line data={handlingTimeTrend} options={handlingLineOptions} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h5>Resolved vs Unresolved (Daily)</h5>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <Bar data={stackedDailyData} options={stackedOptions} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h5>Outcome Breakdown</h5>
            <p className="text-sm text-muted-foreground">Period totals by ticket outcome</p>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <Bar data={outcomeBarData} options={{ ...lineOptions, indexAxis: 'x' as const }} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h5>Open Tickets by CSE</h5>
            <p className="text-sm text-muted-foreground">Current open call back & not connected</p>
          </CardHeader>
          <CardContent>
            <div style={{ height: `${memberChartHeight}px` }}>
              <Bar
                data={openTicketsData}
                options={{
                  indexAxis: 'y',
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { position: 'top' } },
                  scales: { x: { stacked: true }, y: { stacked: true } },
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h5>Resolve Rate by CSE</h5>
          </CardHeader>
          <CardContent>
            <div style={{ height: `${memberChartHeight}px` }}>
              <Bar data={resolveRateByCse} options={horizontalBarOptions} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h5>CSE Performance Table</h5>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-4">CSE</th>
                  <th className="py-2 pr-4 text-right">Open CB</th>
                  <th className="py-2 pr-4 text-right">Open NC</th>
                  <th className="py-2 pr-4 text-right">Assigned</th>
                  <th className="py-2 pr-4 text-right">Resolved</th>
                  <th className="py-2 pr-4 text-right">Resolve Rate</th>
                  <th className="py-2 text-right">Avg Handling</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.cse_name} className="border-b border-muted/40">
                    <td className="py-2 pr-4 font-medium">{m.cse_name}</td>
                    <td className="py-2 pr-4 text-right">{m.open_call_back}</td>
                    <td className="py-2 pr-4 text-right">{m.open_not_connected}</td>
                    <td className="py-2 pr-4 text-right">{m.leads_assigned}</td>
                    <td className="py-2 pr-4 text-right">{m.resolved}</td>
                    <td className="py-2 pr-4 text-right">{formatPercent(m.resolve_rate)}</td>
                    <td className="py-2 text-right">{formatTime(m.average_handling_time_seconds)}</td>
                  </tr>
                ))}
                {members.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-muted-foreground">
                      No CSE data for selected filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CseAnalyticsComponent;
