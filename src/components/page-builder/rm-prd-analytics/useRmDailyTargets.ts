import { useEffect, useState } from 'react';
import { rmActivityApi, type RmDailyTargetsDto } from '@/lib/api/services/rmActivity';
import { toUtcDateParam, type DateBounds } from './dateRange';

const EMPTY: RmDailyTargetsDto = {};

// rm_user_id -> each RM's target, already summed by the backend across
// `bounds` (day-by-day: a manager's explicit override where set, else that
// RM's standing DAILY_TARGET). RMs with nothing set are absent — aggregate.ts
// treats a missing entry as 0. Pass null only when there's genuinely nothing
// to show yet (e.g. "Custom" range picked but no dates chosen). `refreshToken`
// forces a refetch on demand (e.g. a periodic tick) even when bounds haven't
// changed — a manager editing a target elsewhere (User Settings) otherwise
// has no way to reach an already-open dashboard.
export function useRmDailyTargets(bounds: DateBounds | null, refreshToken?: number) {
  const [targets, setTargets] = useState<RmDailyTargetsDto>(EMPTY);
  const [loading, setLoading] = useState(true);

  const from = bounds ? toUtcDateParam(bounds.from) : undefined;
  const to = bounds ? toUtcDateParam(bounds.to) : undefined;
  const hasWindow = bounds !== null;

  useEffect(() => {
    let cancelled = false;

    if (!hasWindow) {
      setTargets(EMPTY);
      setLoading(false);
      return;
    }

    setLoading(true);
    rmActivityApi
      .getDailyTargets({ from, to })
      .then((dto) => {
        if (!cancelled) setTargets(dto);
      })
      .catch(() => {
        // falls back to an empty map (every target reads as 0) — not worth
        // a separate error state for this
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [hasWindow, from, to, refreshToken]);

  return { targets, loading };
}
