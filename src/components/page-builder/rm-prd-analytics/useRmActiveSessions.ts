import { useEffect, useState } from 'react';
import { rmActivityApi } from '@/lib/api/services/rmActivity';

// Which RMs currently have a lead open, as a Set of rm_user_id for O(1)
// per-row lookup in the By RM tables. Re-fetched on the same cadence as the
// rest of the dashboard (mount, manual Refresh, tab-visibility-return via
// refreshToken) rather than polled on an interval — "on lead right now" only
// needs to be as fresh as the page's last refresh, not continuously live,
// and a standing interval here would mean every open RM PRD tab polling
// forever in the background.
export function useRmActiveSessions(rmUserId?: string, managerUserId?: string, refreshToken?: number) {
  const [activeRmUserIds, setActiveRmUserIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    rmActivityApi
      .getActiveSessions({ rmUserId, managerUserId })
      .then((sessions) => {
        if (!cancelled) setActiveRmUserIds(new Set(sessions.map((s) => s.rm_user_id)));
      })
      .catch(() => {
        // best-effort presence signal — a failed fetch just means no RM
        // shows as "on lead" this refresh, not a dashboard-wide error
        if (!cancelled) setActiveRmUserIds(new Set());
      });

    return () => {
      cancelled = true;
    };
  }, [rmUserId, managerUserId, refreshToken]);

  return activeRmUserIds;
}
