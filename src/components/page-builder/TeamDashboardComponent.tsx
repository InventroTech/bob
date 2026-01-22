import React, { useEffect, useState } from 'react';
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
import { Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface TeamDashboardComponentProps {
  config?: {
    title?: string;
    allottedLeads?: number;
    trailTarget?: number;
    totalTeamSize?: number;
    showDatePicker?: boolean;
  };
}

interface OverviewData {
  attendance: number;
  total_team_size: number;
  calls_made: number;
  trials_activated: number;
  connected_to_trial_ratio: number | null;
  average_time_spent_seconds: number | null;
  trail_target: number;
  allotted_leads: number;
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

const TeamDashboardComponent: React.FC<TeamDashboardComponentProps> = ({ config = {} }) => {
  const [date, setDate] = useState<string>(getLocalDateString());
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [yesterdayOverview, setYesterdayOverview] = useState<OverviewData | null>(null);
  const [members, setMembers] = useState<MemberData[]>([]);
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use allotted_leads from API (sum of daily_limit from user_settings), fallback to config or default
  const allottedLeads = overview?.allotted_leads || config.allottedLeads || 1600;
  // Use trail_target from API (sum of daily_target from user_settings), fallback to config or default
  const trailTarget = overview?.trail_target || config.trailTarget || 160;
  // Use dynamic total_team_size from API, fallback to config if not available yet
  const totalTeamSize = overview?.total_team_size || config.totalTeamSize || 18;
  const showDatePicker = config.showDatePicker !== false;

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

  useEffect(() => {
    fetchAll();
  }, [date]);

  // Calculate connected to trial ratio
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

  // Prepare Trail Activation chart data
  // Prepare sorted members for trial activation chart
  const sortedMembersForTrial = members
    .sort((a, b) => b.trials_activated - a.trials_activated)
    .slice(0, 7);

  const trailActivationData = {
    labels: sortedMembersForTrial.map(m => {
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
        backgroundColor: 'rgba(0, 0, 0, 0.8)', // Black
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
        barThickness: 10, // Fixed bar thickness for horizontal bars
      },
      {
        label: 'Not Connected',
        data: notConnectedData,
        backgroundColor: 'rgba(239, 68, 68, 0.8)', // Red
        barThickness: 10,
      },
      {
        label: 'Calls Connected',
        data: callsConnectedData,
        backgroundColor: 'rgba(34, 197, 94, 0.8)', // Green
        barThickness: 10,
      },
      {
        label: 'Trial Activated',
        data: trialActivatedData,
        backgroundColor: 'rgba(168, 85, 247, 0.8)', // Purple
        barThickness: 10,
      },
      {
        label: 'Call Back',
        data: callBackData,
        backgroundColor: 'rgba(251, 146, 60, 0.8)', // Orange
        barThickness: 10,
      },
      {
        label: 'Not Interested',
        data: notInterestedData,
        backgroundColor: 'rgba(236, 72, 153, 0.8)', // Pink
        barThickness: 10,
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
    <div className="w-full space-y-6 p-6 bg-white">
      {/* Header with Date Picker */}
      {(config.title || showDatePicker) && (
        <div className="flex items-center justify-between mb-6">
          {config.title && <h5>{config.title}</h5>}
          {showDatePicker && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-gray-600" />
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-40 border-gray-300"
                />
              </div>
              <Button onClick={fetchAll} disabled={loading} className="bg-black text-white hover:bg-gray-800">
                {loading ? 'Loading...' : 'Refresh'}
              </Button>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          Error: {error}
        </div>
      )}

      {/* Overview and Connected to Trial Ratio - Side by Side */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Overview Card - 60% width */}
        <Card className="border border-gray-200 flex-[0_0_60%]">
          <CardHeader className="pb-2">
            <h5>Overview</h5>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm font-medium text-gray-600 mb-1">RM Attendance</div>
                <div className="text-2xl font-bold text-black">
                  {overview?.attendance || 0}/{totalTeamSize}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600 mb-1">Allotted Leads</div>
                <div className="text-2xl font-bold text-black">{totalAllottedLeads}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600 mb-1">Calls Made</div>
                <div className="text-2xl font-bold text-black">{overview?.calls_made || 0}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600 mb-1">Trial Target</div>
                <div className="text-2xl font-bold text-black">{trailTarget}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Connected to Trail Ratio Card - 40% width */}
        <Card className="border border-gray-200 flex-[0_0_40%]">
          <CardHeader>
            <h5>Connected to Trial ratio</h5>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {overview?.trials_activated} to {overview?.calls_made}
              </span>
              <span className="text-lg font-semibold text-black">{connectedToTrialRatio}%</span>
            </div>
            <Progress 
              value={connectedToTrialRatio} 
              className="h-3 bg-gray-200 [&>div]:bg-black" 
            />
            {/* <div className="text-xs text-gray-500">
              {overview?.trials_activated || 0} trials activated from {overview?.calls_made} connected calls
            </div> */}
          </CardContent>
        </Card>
      </div>

      {/* Two Column Layout for Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trail Activation Chart */}
        <Card className="border border-gray-200">
          <CardHeader>
            <h5>Trial Activation</h5>
            <div className="text-sm text-gray-600">
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
        <Card className="border border-gray-200">
          <CardHeader>
            <h5>Average Time Spent</h5>
            <div className="text-sm text-gray-600">
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
      <Card className="border border-gray-200">
        <CardHeader>
          <h5>Call Breakdown</h5>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Summary Metrics Row */}
          <div className="grid grid-cols-2 md:grid-cols-7 gap-4 text-sm">
            <div>
              <div className="text-gray-600">Total Allotted Leads</div>
              <div className="text-lg font-semibold text-black">{totalAllottedLeads}</div>
            </div>
            <div>
              <div className="text-gray-600">Calls Made</div>
              <div className="text-lg font-semibold text-black">{totalCallsMade}</div>
            </div>
            <div>
              <div className="text-gray-600">Not Connected</div>
              <div className="text-lg font-semibold text-black">{totalNotConnected}</div>
            </div>
            <div>
              <div className="text-gray-600">Calls Connected</div>
              <div className="text-lg font-semibold text-black">{totalCallsConnected}</div>
            </div>
            <div>
              <div className="text-gray-600">Trail Activated</div>
              <div className="text-lg font-semibold text-black">{totalTrailActivated}</div>
            </div>
            <div>
              <div className="text-gray-600">Call Back</div>
              <div className="text-lg font-semibold text-black">{totalCallBack}</div>
            </div>
            <div>
              <div className="text-gray-600">Not Interested</div>
              <div className="text-lg font-semibold text-black">{totalNotInterested}</div>
            </div>
          </div>

          {/* Stacked Bar Chart */}
          <div className="h-96 w-full min-w-0">
            {sortedMembers.length > 0 ? (
              <Bar data={callBreakdownData} options={callBreakdownOptions} />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                No data available
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TeamDashboardComponent;

