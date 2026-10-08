import React, { useEffect, useMemo, useState } from 'react';
import { Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRmActivityEvents } from '../rm-prd-analytics/useRmActivityEvents';
import { useRmDailyTargets } from '../rm-prd-analytics/useRmDailyTargets';
import { filterByDateRange, resolveDateRange } from '../rm-prd-analytics/dateRange';
import { computeLeaderboardByRm, formatVsTarget, type RmLeaderboardRow } from '../rm-prd-analytics/aggregate';
import { membershipService } from '@/lib/api/services/membership';

// how often the panel re-pulls today's events/targets — same convention as
// YourShiftPanel, otherwise it freezes at whatever it looked like on mount
const REFRESH_INTERVAL_MS = 60_000;
const TOP_N = 3;

interface LeaderboardPanelProps {
  activeUserId: string | null;
}

// Today's leaderboard, ranked by trials achieved ÷ target (see
// computeLeaderboardByRm — same ranking the RM PRD analytics dashboard's own
// Leaderboard tab uses) condensed to a top-3 + "your rank" card, so an RM can
// see where they stand without leaving the lead carousel. Scoped to the
// signed-in RM's own manager's team (their siblings under the same manager,
// found via TenantMembership.user_parent_id) — not the whole tenant. Falls
// back to unscoped if the RM has no manager set (nothing to scope against).
export const LeaderboardPanel: React.FC<LeaderboardPanelProps> = ({ activeUserId }) => {
  const [refreshTick, setRefreshTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setRefreshTick((t) => t + 1), REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  // teamRmUserIds: null while loading, undefined (not null) once resolved
  // with no manager found (fall back to unscoped), Set once resolved with a
  // manager (scope to that manager's direct reports, including me).
  const [teamRmUserIds, setTeamRmUserIds] = useState<Set<string> | null | undefined>(null);
  useEffect(() => {
    let cancelled = false;
    membershipService
      .getMyMembership()
      .then(async (my) => {
        if (cancelled) return;
        const myParentId = my?.user_parent_id;
        if (myParentId == null) {
          setTeamRmUserIds(undefined);
          return;
        }
        const allUsers = await membershipService.getUsersForHierarchy();
        if (cancelled) return;
        const ids = allUsers
          .filter((u) => u.user_parent_id === myParentId && u.user_id)
          .map((u) => u.user_id as string);
        setTeamRmUserIds(new Set(ids));
      })
      .catch(() => {
        if (!cancelled) setTeamRmUserIds(undefined);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const todayBounds = useMemo(() => resolveDateRange('Today', '', ''), [refreshTick]);
  const { events, loading: eventsLoading } = useRmActivityEvents(todayBounds, undefined, refreshTick);
  const { targets, loading: targetsLoading } = useRmDailyTargets(todayBounds, refreshTick);
  const loading = eventsLoading || targetsLoading || teamRmUserIds === null;

  const leaderboard = useMemo(() => {
    let todaysEvents = filterByDateRange(events, todayBounds);
    if (teamRmUserIds) {
      todaysEvents = todaysEvents.filter((e) => teamRmUserIds.has(e.rmUserId));
    }
    return computeLeaderboardByRm(todaysEvents, targets);
  }, [events, targets, todayBounds, teamRmUserIds]);

  const topRows = leaderboard.slice(0, TOP_N);
  const myRow = activeUserId ? leaderboard.find((row) => row.rmUserId === activeUserId) : undefined;
  const myRowInTop = myRow ? topRows.some((row) => row.rmUserId === myRow.rmUserId) : false;

  if (loading) {
    return (
      <div className="mb-8 space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-5 animate-pulse" aria-hidden>
        <div className="h-3 w-32 rounded bg-muted" />
        <div className="h-10 w-full rounded-lg bg-muted/80" />
        <div className="h-10 w-full rounded-lg bg-muted/80" />
      </div>
    );
  }

  // nothing logged for anyone today yet — nothing meaningful to rank
  if (leaderboard.length === 0) return null;

  return (
    <div className="mb-8 rounded-xl border border-slate-200 bg-slate-50/60 p-5">
      <div className="mb-4 flex items-center gap-2 text-slate-500">
        <Trophy className="h-4 w-4 shrink-0 text-amber-500" aria-hidden />
        <p className="text-xs font-semibold uppercase tracking-wide">Today&apos;s leaderboard</p>
      </div>

      <div className="space-y-2">
        {topRows.map((row) => (
          <LeaderboardRow key={row.rmUserId} row={row} highlight={row.rmUserId === activeUserId} />
        ))}
      </div>

      {myRow && !myRowInTop && (
        <>
          <div className="my-3 border-t border-dashed border-slate-300" />
          <LeaderboardRow row={myRow} highlight />
        </>
      )}
    </div>
  );
};

const RANK_MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

const LeaderboardRow: React.FC<{ row: RmLeaderboardRow; highlight?: boolean }> = ({ row, highlight }) => (
  <div
    className={cn(
      'flex items-center justify-between gap-3 rounded-lg border px-3 py-2',
      highlight ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200/80 bg-white'
    )}
  >
    <div className="flex min-w-0 items-center gap-2">
      <span className="w-6 shrink-0 text-center font-mono text-sm text-slate-500">
        {RANK_MEDAL[row.rank] ?? `#${row.rank}`}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-900">
          {row.name}
          {highlight && <span className="ml-1.5 text-xs font-normal text-emerald-700">(You)</span>}
        </p>
        <p className="truncate text-xs text-slate-400">
          {row.achieved} / {row.target} trials
        </p>
      </div>
    </div>
    <span className="shrink-0 font-mono text-sm font-semibold text-emerald-700">
      {formatVsTarget(row.achieved, row.target)}
    </span>
  </div>
);
