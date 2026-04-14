import React, { useEffect, useRef, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { teamAnalyticsApi } from '@/lib/teamAnalyticsApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface OverviewData {
  attendance: number;
  total_team_size: number;
  calls_made: number;
  trials_activated: number;
  connected_to_trial_ratio: number | null;
  average_time_spent_seconds: number | null;
  trail_target: number;
  allotted_leads: number;
  unassigned_leads: number;
}

interface MemberData {
  user_id: string;
  email: string;
  daily_target: number;
  attendance: number;
  total_events: number;
  calls_made: number;
  calls_connected: number;
  trials_activated: number;
  connected_to_trial_ratio: number | null;
  get_next_lead_count: number;
  take_break_count: number;
  not_interested_count: number;
  average_time_spent_seconds: number;
}

interface EventData {
  event_type: string;
  count: number;
}

// Helper function to get today's date in user's local timezone (YYYY-MM-DD format)
const getLocalDateString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper function to get yesterday's date in user's local timezone (YYYY-MM-DD format)
const getYesterdayDateString = (): string => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const year = yesterday.getFullYear();
  const month = String(yesterday.getMonth() + 1).padStart(2, '0');
  const day = String(yesterday.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const TeamDashboardPage: React.FC = () => {
  const [date, setDate] = useState<string>(getLocalDateString());
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [yesterdayOverview, setYesterdayOverview] = useState<OverviewData | null>(null);
  const [members, setMembers] = useState<MemberData[]>([]);
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUnassignedBreakdown, setShowUnassignedBreakdown] = useState(false);
  const [unassignedBreakdown, setUnassignedBreakdown] = useState<{
    total: number;
    by_source: Array<{ lead_source: string; count: number }>;
    by_status: Array<{ lead_stage: string; count: number }>;
    available_sources: string[];
    available_stages: string[];
  } | null>(null);
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const [breakdownTab, setBreakdownTab] = useState<'source' | 'status'>('source');
  const [sourceFilter, setSourceFilter] = useState<string[]>([]);
  const [stageFilter, setStageFilter] = useState<string>('');
  const [sourceDropdownOpen, setSourceDropdownOpen] = useState(false);
  const [sourceSearch, setSourceSearch] = useState('');
  const sourceDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sourceDropdownRef.current && !sourceDropdownRef.current.contains(e.target as Node)) {
        setSourceDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Use allotted_leads from API (sum of daily_limit from user_settings), fallback to default
  const allottedLeads = overview?.allotted_leads || 1600;
  // Use trail_target from API (sum of daily_target from user_settings), fallback to default
  const trailTarget = overview?.trail_target || 160;
  // Use dynamic total_team_size from API, fallback to 18 if not available yet
  const totalTeamSize = overview?.total_team_size || 18;

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get yesterday's date for comparison
      const yesterdayDate = getYesterdayDateString();

      const [ov, mem, ev, yesterdayOv] = await Promise.all([
        teamAnalyticsApi.getTeamOverview(date),
        teamAnalyticsApi.getTeamMembers({ date }),
        teamAnalyticsApi.getTeamEvents({ date }),
        teamAnalyticsApi.getTeamOverview(yesterdayDate).catch(() => null), // Fetch yesterday's data, ignore errors
      ]);

      setOverview(ov);
      setMembers(mem);
      setEvents(ev);
      setYesterdayOverview(yesterdayOv);
    } catch (e: any) {
      setError(e.message || 'Failed to load team analytics');
      console.error('Error fetching team analytics:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnassignedBreakdown = async (sources?: string[], stage?: string) => {
    try {
      setBreakdownLoading(true);
      const params: { lead_source?: string; lead_stage?: string } = {};
      if (sources && sources.length > 0) params.lead_source = sources.join(',');
      if (stage) params.lead_stage = stage;
      const data = await teamAnalyticsApi.getUnassignedLeadsBreakdown(params);
      setUnassignedBreakdown(data);
    } catch (e: any) {
      console.error('Error fetching unassigned breakdown:', e);
    } finally {
      setBreakdownLoading(false);
    }
  };

  const toggleSourceOption = (value: string) => {
    const next = sourceFilter.includes(value)
      ? sourceFilter.filter((s) => s !== value)
      : [...sourceFilter, value];
    setSourceFilter(next);
    fetchUnassignedBreakdown(next.length > 0 ? next : undefined, stageFilter || undefined);
  };

  const handleStageFilterChange = (value: string) => {
    setStageFilter(value);
    fetchUnassignedBreakdown(sourceFilter.length > 0 ? sourceFilter : undefined, value || undefined);
  };

  const toggleUnassignedBreakdown = () => {
    const next = !showUnassignedBreakdown;
    setShowUnassignedBreakdown(next);
    if (next && !unassignedBreakdown) {
      fetchUnassignedBreakdown();
    }
  };

  useEffect(() => {
    fetchAll();
  }, [date]);

  // Calculate connected to trial ratio
  // If backend provides ratio, use it; otherwise calculate from events
  const callsConnected = events.find(e => e.event_type === 'lead.call_back_later')?.count || 0;
  const connectedToTrialRatio = overview?.connected_to_trial_ratio
    ? Math.round(overview.connected_to_trial_ratio * 100)
    : callsConnected > 0 && overview?.trials_activated
    ? Math.round((overview.trials_activated / callsConnected) * 100)
    : 0;

  // Format time from seconds to MM:SS
  const formatTime = (seconds: number | null): string => {
    if (!seconds) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Prepare sorted members for trial activation chart
  const sortedMembersForTrial = members
    .sort((a, b) => b.trials_activated - a.trials_activated)
    .slice(0, 7);

  // Prepare Trail Activation chart data - stacked progress bar
  const trailActivationData = {
    labels: sortedMembersForTrial.map(m => {
      // Use email for display, fallback to truncated user_id
      return m.email || m.user_id.substring(0, 8) + '...';
    }),
    datasets: [
      {
        label: 'Actual',
        data: sortedMembersForTrial.map(m => m.trials_activated || 0),
        backgroundColor: 'rgba(34, 197, 94, 0.8)', // Green - current progress
        barThickness: 10,
      },
      {
        label: 'Remaining',
        data: sortedMembersForTrial.map(m => {
          const target = m.daily_target || 0;
          const actual = m.trials_activated || 0;
          // Show remaining target (grey), or 0 if actual exceeds target
          return Math.max(0, target - actual);
        }),
        backgroundColor: 'rgba(200, 200, 200, 0.5)', // Grey - remaining target
        barThickness: 10,
      },
    ],
  };

  // Calculate dynamic max for x-axis based on max(target, actual) across all members
  const maxTrialValue = Math.max(
    ...sortedMembersForTrial.map(m => Math.max(m.daily_target || 0, m.trials_activated || 0)),
    10 // At least 10 for visibility
  );
  const roundedMaxTrial = Math.ceil(maxTrialValue / 5) * 5; // Round up to nearest 5

  const trailActivationOptions = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 15,
        },
      },
      title: {
        display: false,
      },
    },
    scales: {
      x: {
        stacked: true, // Enable stacking for progress bar effect
        beginAtZero: true,
        max: roundedMaxTrial,
        title: {
          display: true,
          text: 'No. of trials activated',
        },
      },
      y: {
        stacked: true, // Enable stacking for progress bar effect
        beginAtZero: true,
      },
    },
  };

  // Prepare Average Time Spent chart data
  // Use each member's individual average_time_spent_seconds, not the team-wide average
  // Note: average_time_spent_seconds is in seconds (not milliseconds)
  const sortedMembersForTime = members
    .sort((a, b) => b.total_events - a.total_events)
    .slice(0, 7);
  
  const timeData = sortedMembersForTime.map(m => m.average_time_spent_seconds || 0);
  
  // Calculate dynamic max value based on data
  // Round up to nearest nice number (60, 120, 300, 600, 900, 1200, etc.)
  const maxTimeValue = Math.max(...timeData, 60); // At least 60 seconds for visibility
  let roundedMaxTime: number;
  if (maxTimeValue <= 60) {
    roundedMaxTime = 60;
  } else if (maxTimeValue <= 120) {
    roundedMaxTime = 120;
  } else if (maxTimeValue <= 300) {
    roundedMaxTime = 300;
  } else if (maxTimeValue <= 600) {
    roundedMaxTime = 600;
  } else if (maxTimeValue <= 900) {
    roundedMaxTime = 900;
  } else if (maxTimeValue <= 1200) {
    roundedMaxTime = 1200;
  } else if (maxTimeValue <= 1800) {
    roundedMaxTime = 1800;
  } else {
    // For values > 30 minutes, round up to nearest 5 minutes
    roundedMaxTime = Math.ceil(maxTimeValue / 300) * 300;
  }
  
  // Calculate step size based on max value (aim for ~10 ticks)
  const timeStepSize = Math.max(30, Math.ceil(roundedMaxTime / 10 / 30) * 30); // Round to nearest 30 seconds
  
  const averageTimeData = {
    labels: sortedMembersForTime.map(m => {
      return m.email || m.user_id.substring(0, 8) + '...';
    }),
    datasets: [
      {
        label: 'Time',
        data: timeData,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        barThickness: 10,
      },
    ],
  };

  const averageTimeOptions = {
    indexAxis: 'y' as const,
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 15,
        },
      },
      title: {
        display: false,
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        max: roundedMaxTime,
        ticks: {
          stepSize: timeStepSize,
          callback: function (value: any) {
            const totalSeconds = Math.round(value);
            const mins = Math.floor(totalSeconds / 60);
            const secs = totalSeconds % 60;
            return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
          },
        },
        title: {
          display: true,
          text: 'Time (MM:SS)',
        },
      },
      y: {
        beginAtZero: true,
      },
    },
  };

  // Prepare Call Breakdown stacked bar chart data
  // Stacked bar showing: calls made, not connected, calls connected, trial activated, call back, not interested
  const sortedMembers = members
    .sort((a, b) => b.total_events - a.total_events)
    .slice(0, 7);

  const memberLabels = sortedMembers.map(m => m.email || m.user_id.substring(0, 8) + '...');

  // Calculate data for each member
  const callsMadeData = sortedMembers.map(m => m.calls_made || 0);
  const trialActivatedData = sortedMembers.map(m => m.trials_activated || 0);
  const notInterestedData = sortedMembers.map(m => m.not_interested_count || 0);
  
  // Calls connected = trials_activated + not_interested + call_back_later
  // The backend's calls_connected already includes all three, so use it directly
  const callsConnectedData = sortedMembers.map(m => m.calls_connected || 0);
  
  // Calculate call_back_later count: calls_connected - trials - not_interested
  // This gives us the pure call_back_later events
  const callBackData = sortedMembers.map(m => {
    const callsConnected = m.calls_connected || 0;
    const trials = m.trials_activated || 0;
    const notInterested = m.not_interested_count || 0;
    // Call back = calls_connected - trials_activated - not_interested
    return Math.max(0, callsConnected - trials - notInterested);
  });
  
  const notConnectedData = sortedMembers.map(m => {
    // Not connected = calls_made - calls_connected
    const callsConnected = m.calls_connected || 0;
    return Math.max(0, (m.calls_made || 0) - callsConnected);
  });

  // Calculate max value for dynamic scaling
  const allValues = [
    ...callsMadeData,
    ...notConnectedData,
    ...callsConnectedData,
    ...trialActivatedData,
    ...callBackData,
    ...notInterestedData,
  ];
  const maxValue = Math.max(...allValues, 10); // At least 10 for visibility
  const roundedMax = Math.ceil(maxValue / 50) * 50; // Round up to nearest 50

  const callBreakdownData = {
    labels: memberLabels,
    datasets: [
      {
        label: 'Calls Made',
        data: callsMadeData,
        backgroundColor: 'rgba(59, 130, 246, 0.8)', // Blue
        barThickness: 15, // Fixed bar thickness for horizontal bars
      },
      {
        label: 'Not Connected',
        data: notConnectedData,
        backgroundColor: 'rgba(239, 68, 68, 0.8)', // Red
        barThickness: 15,
      },
      {
        label: 'Calls Connected',
        data: callsConnectedData,
        backgroundColor: 'rgba(34, 197, 94, 0.8)', // Green
        barThickness: 15,
      },
      {
        label: 'Trial Activated',
        data: trialActivatedData,
        backgroundColor: 'rgba(168, 85, 247, 0.8)', // Purple
        barThickness: 15,
      },
      {
        label: 'Call Back',
        data: callBackData,
        backgroundColor: 'rgba(251, 146, 60, 0.8)', // Orange
        barThickness: 15,
      },
      {
        label: 'Not Interested',
        data: notInterestedData,
        backgroundColor: 'rgba(236, 72, 153, 0.8)', // Pink
        barThickness: 15,
      },
    ],
  };

  const callBreakdownOptions = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 12,
          },
        },
      },
      title: {
        display: false,
      },
    },
    scales: {
      x: {
        stacked: true,
        beginAtZero: true,
        max: roundedMax,
        ticks: {
          stepSize: Math.max(10, Math.ceil(roundedMax / 10)),
        },
      },
      y: {
        stacked: true,
        categoryPercentage: 0.5, // Reduce spacing between categories (makes bars thinner)
        barPercentage: 0.8, // Reduce bar width within category (makes bars thinner)
      },
    },
  };

  // Calculate summary metrics for call breakdown
  const totalAllottedLeads = allottedLeads;
  const totalCallsMade = overview?.calls_made || 0;
  // Sum of calls_connected from all team members (trials_activated + not_interested + call_back_later)
  const totalCallsConnected = members.reduce((sum, m) => sum + (m.calls_connected || 0), 0);
  // Not connected = calls_made - calls_connected (same logic as graph)
  const totalNotConnected = Math.max(0, totalCallsMade - totalCallsConnected);
  const totalTrailActivated = overview?.trials_activated || 0;
  const totalCallBack = callsConnected;
  const totalNotInterested = events.find(e => e.event_type === 'lead.not_interested')?.count || 0;

  if (loading && !overview) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Loading team analytics...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header with Date Picker */}
      <div className="flex items-center justify-between mb-6">
        <h5>Team Dashboard</h5>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-40"
            />
          </div>
          <Button onClick={fetchAll} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          Error: {error}
        </div>
      )}

      {/* Overview and Connected to Trial Ratio - Side by Side */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Overview Card - 60% width */}
        <Card className="flex-[0_0_60%]">
          <CardHeader className="pb-2">
            <h5>Overview</h5>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">RM Attendance</div>
                <div className="text-2xl font-bold">
                  {overview?.attendance || 0}/{totalTeamSize}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Allotted Leads</div>
                <div className="text-2xl font-bold">{totalAllottedLeads}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Calls Made</div>
                <div className="text-2xl font-bold">{overview?.calls_made || 0}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Trial Target</div>
                <div className="text-2xl font-bold">{trailTarget}</div>
              </div>
              <div
                className="cursor-pointer hover:bg-muted/50 rounded-lg p-2 -m-2 transition-colors"
                onClick={toggleUnassignedBreakdown}
              >
                <div className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1">
                  Unassigned Leads
                  {showUnassignedBreakdown ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </div>
                <div className="text-2xl font-bold text-amber-600">
                  {overview?.unassigned_leads || 0}
                </div>
              </div>
            </div>

            {/* Unassigned Leads Breakdown */}
            {showUnassignedBreakdown && (
              <div className="mt-4 border-t pt-4">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <button
                    onClick={() => setBreakdownTab('source')}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      breakdownTab === 'source'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    By Lead Source
                  </button>
                  <button
                    onClick={() => setBreakdownTab('status')}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      breakdownTab === 'status'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    By Lead Status
                  </button>
                </div>

                {/* Filters */}
                {unassignedBreakdown && (
                  <div className="space-y-2 mb-3">
                    <div className="flex flex-wrap gap-3 items-start">
                      {/* Multi-select Lead Source */}
                      <div className="relative" ref={sourceDropdownRef}>
                        <label className="text-xs text-muted-foreground block mb-1">Lead Source:</label>
                        <button
                          onClick={() => { setSourceDropdownOpen(!sourceDropdownOpen); setSourceSearch(''); }}
                          className="text-sm border-2 border-foreground/20 rounded-lg px-3 py-1.5 bg-background min-w-[220px] text-left flex items-center justify-between gap-2"
                        >
                          <span className="truncate">
                            {sourceFilter.length === 0
                              ? 'All Sources'
                              : `${sourceFilter.length} selected`}
                          </span>
                          <ChevronDown className="h-3 w-3 shrink-0" />
                        </button>
                        {sourceDropdownOpen && (() => {
                          const filtered = unassignedBreakdown.available_sources.filter((s) =>
                            s.toLowerCase().includes(sourceSearch.toLowerCase())
                          );
                          const selectedInFiltered = filtered.filter((s) => sourceFilter.includes(s));
                          return (
                            <div className="absolute z-50 mt-1 w-80 bg-background border-2 border-foreground/20 rounded-lg shadow-lg">
                              {/* Search */}
                              <div className="p-2 border-b">
                                <input
                                  type="text"
                                  placeholder="Search lead sources"
                                  value={sourceSearch}
                                  onChange={(e) => setSourceSearch(e.target.value)}
                                  className="w-full text-sm border-2 border-foreground/20 rounded-lg px-3 py-2 bg-background outline-none focus:border-foreground/40"
                                  autoFocus
                                />
                              </div>
                              {/* Select all / Clear */}
                              <div className="flex items-center justify-between px-3 py-2 border-b">
                                <button
                                  className="text-sm font-medium hover:underline"
                                  onClick={() => {
                                    const next = [...new Set([...sourceFilter, ...filtered])];
                                    setSourceFilter(next);
                                    fetchUnassignedBreakdown(next.length > 0 ? next : undefined, stageFilter || undefined);
                                  }}
                                >
                                  Select all matching ({filtered.length})
                                </button>
                                <button
                                  className="text-sm text-red-400 hover:text-red-600 hover:underline"
                                  onClick={() => {
                                    const next = sourceFilter.filter((s) => !filtered.includes(s));
                                    setSourceFilter(next);
                                    fetchUnassignedBreakdown(next.length > 0 ? next : undefined, stageFilter || undefined);
                                  }}
                                >
                                  Clear matching ({selectedInFiltered.length})
                                </button>
                              </div>
                              {/* Checkbox list */}
                              <div className="max-h-64 overflow-y-auto py-1">
                                {filtered.map((s) => (
                                  <label
                                    key={s}
                                    className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-muted/50"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={sourceFilter.includes(s)}
                                      onChange={() => toggleSourceOption(s)}
                                      className="h-4 w-4 rounded border-2 border-foreground/30"
                                    />
                                    <span>{s}</span>
                                  </label>
                                ))}
                                {filtered.length === 0 && (
                                  <div className="px-3 py-3 text-sm text-muted-foreground text-center">No matching sources</div>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Single-select Lead Status */}
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">Lead Status:</label>
                        <select
                          value={stageFilter}
                          onChange={(e) => handleStageFilterChange(e.target.value)}
                          className="text-sm border-2 border-foreground/20 rounded-lg px-3 py-1.5 bg-background"
                        >
                          <option value="">All Statuses</option>
                          {unassignedBreakdown.available_stages.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>

                      {(sourceFilter.length > 0 || stageFilter) && (
                        <div className="self-end">
                          <button
                            onClick={() => { setSourceFilter([]); setStageFilter(''); fetchUnassignedBreakdown(); }}
                            className="text-xs text-red-500 hover:text-red-700 underline py-1.5"
                          >
                            Clear all filters
                          </button>
                        </div>
                      )}

                      <span className="text-xs text-muted-foreground self-end ml-auto py-1.5">
                        Filtered total: <strong>{unassignedBreakdown.total}</strong>
                      </span>
                    </div>

                  </div>
                )}

                {breakdownLoading ? (
                  <div className="text-sm text-muted-foreground py-2">Loading breakdown...</div>
                ) : unassignedBreakdown ? (
                  <div className="max-h-60 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-background">
                        <tr className="border-b">
                          <th className="text-left py-1.5 font-medium text-muted-foreground">
                            {breakdownTab === 'source' ? 'Lead Source' : 'Lead Status'}
                          </th>
                          <th className="text-right py-1.5 font-medium text-muted-foreground">Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(breakdownTab === 'source'
                          ? unassignedBreakdown.by_source
                          : unassignedBreakdown.by_status
                        ).map((item, idx) => (
                          <tr key={idx} className="border-b border-muted/50 hover:bg-muted/30">
                            <td className="py-1.5">
                              {breakdownTab === 'source'
                                ? (item as any).lead_source
                                : (item as any).lead_stage}
                            </td>
                            <td className="text-right py-1.5 font-medium">{item.count}</td>
                          </tr>
                        ))}
                        {(breakdownTab === 'source'
                          ? unassignedBreakdown.by_source
                          : unassignedBreakdown.by_status
                        ).length === 0 && (
                          <tr>
                            <td colSpan={2} className="py-3 text-center text-muted-foreground">No results</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Connected to Trail Ratio Card - 40% width */}
        <Card className="flex-[0_0_40%]">
          <CardHeader>
            <h5>Connected to Trail ratio</h5>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {callsConnected} to {trailTarget}
              </span>
              <span className="text-lg font-semibold">{connectedToTrialRatio}%</span>
            </div>
            <Progress value={connectedToTrialRatio} className="h-3" />
            <div className="text-xs text-muted-foreground">
              {overview?.trials_activated || 0} trials activated from {callsConnected} connected calls
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Two Column Layout for Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trail Activation Chart */}
        <Card>
          <CardHeader>
            <h5>Trail Activation</h5>
            <div className="text-sm text-muted-foreground">
              Overall: Current {overview?.trials_activated || 0} ({Math.round(((overview?.trials_activated || 0) / trailTarget) * 100)}% of Target {trailTarget})
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <Bar data={trailActivationData} options={trailActivationOptions} />
            </div>
          </CardContent>
        </Card>

        {/* Average Time Spent Chart */}
        <Card>
          <CardHeader>
            <h5>Average Time Spent</h5>
            <div className="text-sm text-muted-foreground">
              Overall: {formatTime(overview?.average_time_spent_seconds || null)}{' '}
              {(() => {
                const todayTime = overview?.average_time_spent_seconds || 0;
                const yesterdayTime = yesterdayOverview?.average_time_spent_seconds || 0;
                
                if (yesterdayTime === 0) {
                  return '(no yesterday data available)';
                }
                
                const percentChange = ((todayTime - yesterdayTime) / yesterdayTime) * 100;
                const sign = percentChange >= 0 ? '+' : '';
                return `(${sign}${Math.round(percentChange)}% yesterday)`;
              })()}
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <Bar data={averageTimeData} options={averageTimeOptions} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Call Breakdown Section */}
      <Card>
        <CardHeader>
          <h5>Call Breakdown</h5>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Summary Metrics Row */}
          <div className="grid grid-cols-2 md:grid-cols-7 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Total Allotted Leads</div>
              <div className="text-lg font-semibold">{totalAllottedLeads}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Calls Made</div>
              <div className="text-lg font-semibold">{totalCallsMade}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Not Connected</div>
              <div className="text-lg font-semibold">{totalNotConnected}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Calls Connected</div>
              <div className="text-lg font-semibold">{totalCallsConnected}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Trail Activated</div>
              <div className="text-lg font-semibold">{totalTrailActivated}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Call Back</div>
              <div className="text-lg font-semibold">{totalCallBack}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Not Interested</div>
              <div className="text-lg font-semibold">{totalNotInterested}</div>
            </div>
          </div>

          {/* Stacked Bar Chart */}
          <div className="h-96 w-full min-w-0">
            <Bar data={callBreakdownData} options={callBreakdownOptions} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TeamDashboardPage;

