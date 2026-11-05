import { useEffect, useState } from 'react';
import { rmActivityApi } from '@/lib/api/services/rmActivity';
import type { RmPerformanceSummaryByRm, RmPerformanceSummaryTeam } from './aggregate';
import { toUtcDateParam, type DateBounds } from './dateRange';

const EMPTY_TEAM: RmPerformanceSummaryTeam = { touches: 0, uniqueLeads: 0, dispositionCounts: {} };

export interface RmPerformanceSummaryFilters {
  managerName?: string;
  leadGroup?: string;
  state?: string;
  party?: string;
}

// Performance tab's numbers, pre-aggregated server-side (see
// GET /analytics/rm-performance-summary/) — one request covering the whole
// date range, computed in Postgres, instead of useRmActivityEvents'
// multi-day raw-row download that the Performance/Leaderboard/Squad tabs
// used to depend on. Same bounds/rmUserId/managerUserId/refreshToken
// contract as useRmActivityEvents (pass bounds=null to skip the fetch
// entirely — e.g. when the Adherence tab is the only one open, so there's
// no reason to pull Performance numbers nobody's looking at). `filters`
// must mirror whatever the filter bar is applying client-side to the raw
// events feed (manager/leadGroup/state/party) — see getPerformanceSummary's
// own docstring for why these can't be left out.
export function useRmPerformanceSummary(
  bounds: DateBounds | null,
  rmUserId?: string,
  refreshToken?: number,
  managerUserId?: string,
  filters?: RmPerformanceSummaryFilters
) {
  const [byRm, setByRm] = useState<RmPerformanceSummaryByRm[]>([]);
  const [team, setTeam] = useState<RmPerformanceSummaryTeam>(EMPTY_TEAM);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const from = bounds ? toUtcDateParam(bounds.from) : undefined;
  const to = bounds ? toUtcDateParam(bounds.to) : undefined;
  const hasWindow = bounds !== null;
  // destructured to primitives so a freshly-literal `filters` object passed
  // in on every render doesn't retrigger this effect every single render
  const { managerName, leadGroup, state, party } = filters ?? {};

  useEffect(() => {
    let cancelled = false;

    if (!hasWindow) {
      setByRm([]);
      setTeam(EMPTY_TEAM);
      setError(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);
    rmActivityApi
      .getPerformanceSummary({ from, to, rmUserId, managerUserId, managerName, leadGroup, state, party }, controller.signal)
      .then((dto) => {
        if (cancelled) return;
        setByRm(
          dto.by_rm.map((row) => ({
            rmUserId: row.rm_user_id,
            rmName: row.rm_name,
            managerName: row.manager_name,
            state: row.state,
            touches: row.touches,
            uniqueLeads: row.unique_leads,
            dispositionCounts: row.disposition_counts,
          }))
        );
        setTeam({
          touches: dto.team.touches,
          uniqueLeads: dto.team.unique_leads,
          dispositionCounts: dto.team.disposition_counts,
        });
      })
      .catch((err) => {
        // cancelled means a newer request superseded this one (abort, not
        // a real failure) — nothing to show the user either way
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load performance summary');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [hasWindow, from, to, rmUserId, managerUserId, refreshToken, managerName, leadGroup, state, party]);

  return { byRm, team, loading, error };
}
