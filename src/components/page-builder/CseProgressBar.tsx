'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { createApiClient } from '@/lib/api/client';
import { TrophyIcon } from '@/components/icons/CustomIcons';

const API_BASE_URL = (
  import.meta.env.VITE_RENDER_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:8000'
).replace(/\/+$/, '');

const apiClient = createApiClient(API_BASE_URL);

export const SUPPORT_TICKET_ASSIGNED_EVENT = 'support-ticket-assigned';

interface DailyProgressResponse {
  taken_today: number;
  resolved_today: number;
  resolve_rate: number | null;
  goal_percent: number;
}

interface CseProgressBarProps {
  config?: {
    title?: string;
    refreshInterval?: number;
    progressBarColor?: string;
  };
}

function ProgressTrack({
  taken,
  resolved,
  resolveRate,
  goalPercent,
  progressBarColor,
}: {
  taken: number;
  resolved: number;
  resolveRate: number | null;
  goalPercent: number;
  progressBarColor?: string;
}) {
  const rate = resolveRate ?? 0;
  const goal = goalPercent > 0 ? goalPercent : 80;
  const isAchieved = resolveRate != null && rate >= goal;
  const isBelow = resolveRate != null && rate < goal;
  const displayProgress = goal > 0 ? (rate / goal) * 100 : 0;
  const barColor = isAchieved
    ? '#16a34a'
    : progressBarColor && progressBarColor !== ''
      ? progressBarColor
      : '#16a34a';

  const rateLabel =
    resolveRate == null ? '—' : `${Number.isInteger(rate) ? rate : rate.toFixed(1)}%`;

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-body-sm-medium text-foreground">Resolve rate</span>
        {taken <= 0 ? (
          <span className="text-body-sm text-muted-foreground">No tickets yet</span>
        ) : isBelow ? (
          <span className="rounded-lg bg-amber-100 px-2.5 py-1 text-body-sm-medium text-amber-900">
            {rateLabel} / {goal}% goal
          </span>
        ) : isAchieved ? (
          <span className="rounded-lg bg-green-100 px-2.5 py-1 text-body-sm-medium text-green-800">
            {rateLabel} / {goal}% goal
          </span>
        ) : (
          <span className="text-body-sm text-muted-foreground">
            {rateLabel} / {goal}% goal
          </span>
        )}
      </div>
      {taken > 0 && (
        <>
          <p className="text-body-sm text-muted-foreground">
            {isAchieved
              ? 'Resolve-rate goal met — keep going.'
              : `${resolved} of ${taken} resolved today`}
          </p>
          <div className="relative overflow-visible py-1.5">
            <div className="relative h-2.5 rounded-full bg-gray-200">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(displayProgress, 100)}%`,
                  backgroundColor: barColor,
                }}
              />
              {isAchieved && (
                <div
                  className="absolute top-1/2 z-20"
                  style={{
                    left: rate > goal ? '85%' : '100%',
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <TrophyIcon className="h-5 w-5 drop-shadow-sm" />
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export const CseProgressBar: React.FC<CseProgressBarProps> = ({ config }) => {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<DailyProgressResponse>({
    taken_today: 0,
    resolved_today: 0,
    resolve_rate: null,
    goal_percent: 80,
  });

  const fetchProgress = useCallback(
    async (isInitialLoad = false) => {
      if (!session) {
        if (isInitialLoad) setLoading(false);
        return;
      }
      try {
        const response = await apiClient.get<DailyProgressResponse>(
          '/support-ticket/daily-progress/'
        );
        const data = response.data;
        setProgress({
          taken_today: Number(data?.taken_today) || 0,
          resolved_today: Number(data?.resolved_today) || 0,
          resolve_rate:
            typeof data?.resolve_rate === 'number' && Number.isFinite(data.resolve_rate)
              ? data.resolve_rate
              : null,
          goal_percent:
            typeof data?.goal_percent === 'number' && Number.isFinite(data.goal_percent)
              ? data.goal_percent
              : 80,
        });
      } catch (error) {
        console.error('[CseProgressBar] Failed to load daily progress:', error);
      } finally {
        if (isInitialLoad) setLoading(false);
      }
    },
    [session]
  );

  useEffect(() => {
    if (!session) return;
    setLoading(true);
    fetchProgress(true);
  }, [session, fetchProgress]);

  useEffect(() => {
    if (!session) return;
    const intervalMs = config?.refreshInterval ?? 30000;
    if (intervalMs <= 0) return;
    const id = window.setInterval(() => fetchProgress(false), intervalMs);
    return () => window.clearInterval(id);
  }, [session, config?.refreshInterval, fetchProgress]);

  useEffect(() => {
    const onAssigned = () => {
      fetchProgress(false);
    };
    window.addEventListener(SUPPORT_TICKET_ASSIGNED_EVENT, onAssigned);
    return () => window.removeEventListener(SUPPORT_TICKET_ASSIGNED_EVENT, onAssigned);
  }, [fetchProgress]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-600">Loading CSE progress...</div>
      </div>
    );
  }

  return (
    <Card className="border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-4">
        <h5>{config?.title || 'CSE Resolve Rate'}</h5>
        <p className="text-body text-muted-foreground">
          Percent of all tickets you took today that are resolved, vs your goal.
        </p>
      </div>
      <ProgressTrack
        taken={progress.taken_today}
        resolved={progress.resolved_today}
        resolveRate={progress.resolve_rate}
        goalPercent={progress.goal_percent}
        progressBarColor={config?.progressBarColor}
      />
    </Card>
  );
};
