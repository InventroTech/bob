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
// see where they stand without leaving the lead carousel.
//
// Scoped server-side to the caller's own manager's team (siblings under the
// same manager — see membershipService.getMyTeamRmUserIds, which returns
// only that sibling group, not the full tenant directory). The events/
// targets fetch itself only ever requests this team's rows (via rmUserIds),
// it never downloads the whole tenant and filters client-side — and the
// fetched events are still re-filtered against the resolved team below
// (defense in depth: don't trust the response alone if that param were ever
// ignored). Spoofing swaps the JWT identity every request carries (see
// lib/auth/accessTokenProvider.ts), so "my team" already resolves to the
// spoofed RM's own team during a spoofed session — the effect below still
// keys off activeUserId purely to re-resolve if an admin switches who
// they're spoofing mid-session. If the team can't be resolved — the lookup
// failed, or this user has no manager to scope against — the card simply
// doesn't render rather than falling back to an unscoped fetch.
export const LeaderboardPanel: React.FC<LeaderboardPanelProps> = ({ activeUserId }) => {
  const [refreshTick, setRefreshTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setRefreshTick((t) => t + 1), REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  // teamRmUserIds: null while activeUserId/the team lookup isn't resolved
  // yet, undefined once resolution finished with nothing to scope to
  // (lookup failed, or this user has no manager) — both terminal states
  // below mean "don't render," never "fetch everyone instead."
  const [teamRmUserIds, setTeamRmUserIds] = useState<Set<string> | null | undefined>(null);
  useEffect(() => {
    if (!activeUserId) {
      setTeamRmUserIds(null);
      return;
    }
    let cancelled = false;
    membershipService
      .getMyTeamRmUserIds()
      .then((ids) => {
        if (!cancelled) setTeamRmUserIds(ids.length > 0 ? new Set(ids) : undefined);
      })
      .catch(() => {
        if (!cancelled) setTeamRmUserIds(undefined);
      });
    return () => {
      cancelled = true;
    };
  }, [activeUserId]);

  const resolvedTeamIds = useMemo(() => (teamRmUserIds ? Array.from(teamRmUserIds) : undefined), [teamRmUserIds]);
  const hasResolvedTeam = !!resolvedTeamIds && resolvedTeamIds.length > 0;
  // bounds stay null — skipping the fetch entirely, see useRmActivityEvents
  // — until the team resolves to a real, non-empty id list; this is what
  // keeps the fetch itself server-scoped instead of ever requesting
  // everyone and filtering afterward
  const todayBounds = useMemo(
    () => (hasResolvedTeam ? resolveDateRange('Today', '', '') : null),
    [hasResolvedTeam, refreshTick]
  );
  const { events, loading: eventsLoading } = useRmActivityEvents(todayBounds, undefined, refreshTick, resolvedTeamIds);
  const { targets, loading: targetsLoading } = useRmDailyTargets(todayBounds, refreshTick, resolvedTeamIds);
  // still resolving (teamRmUserIds === null) is loading; a resolved
  // empty/undefined team is NOT loading — it's the "nothing to show" state
  // handled by the empty-leaderboard check below
  const loading = teamRmUserIds === null || (hasResolvedTeam && (eventsLoading || targetsLoading));

  const leaderboard = useMemo(() => {
    if (!hasResolvedTeam || !teamRmUserIds) return [];
    let todaysEvents = filterByDateRange(events, todayBounds);
    // defense in depth: the fetch above already requests only this team's
    // rows via rmUserIds, but don't blindly trust the response — if that
    // param were ever ignored or mishandled server-side, this still never
    // shows anyone outside the resolved team
    todaysEvents = todaysEvents.filter((e) => teamRmUserIds.has(e.rmUserId));
    return computeLeaderboardByRm(todaysEvents, targets);
  }, [events, targets, todayBounds, hasResolvedTeam, teamRmUserIds]);

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
