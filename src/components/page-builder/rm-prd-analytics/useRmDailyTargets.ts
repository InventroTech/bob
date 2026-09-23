import { useEffect, useState } from 'react';
import { rmActivityApi, type RmDailyTargetsDto } from '@/lib/api/services/rmActivity';

const EMPTY: RmDailyTargetsDto = {};

// rm_user_id -> daily trial target, sourced from each RM's DAILY_TARGET user
// setting. RMs with no target configured are simply absent from the map —
// aggregate.ts treats a missing entry as 0.
export function useRmDailyTargets() {
  const [targets, setTargets] = useState<RmDailyTargetsDto>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    rmActivityApi
      .getDailyTargets()
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
  }, []);

  return { targets, loading };
}
