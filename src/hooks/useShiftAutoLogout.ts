import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTenant } from '@/hooks/useTenant';
import { rmActivityApi } from '@/lib/api/services/rmActivity';
import { CALL_ACTIVITY_CHANGED, isLeadCallActive } from '@/lib/realtime/shiftCallActivityBus';

/**
 * Enforces a 9-hour max shift for RMs: 9 hours after their first lead touch
 * of the day, show a 3-second "shift ended" notice, then log them out. If
 * they log back in the same day, don't wait another 9 hours — re-enforce
 * every 1 hour from that point on (persisted across logins via localStorage,
 * keyed per RM per local calendar date). Never interrupts an active call —
 * if the enforcement point lands mid-call, it waits for the call to end
 * (see shiftCallActivityBus) before showing the notice.
 *
 * RM role only — managers/CSEs/GMs don't have a "shift" in this sense.
 */

const SHIFT_DURATION_MS = 9 * 60 * 60 * 1000;
const REENFORCE_INTERVAL_MS = 60 * 60 * 1000;
const OVERLAY_DURATION_MS = 3000;
// How often to check whether the RM has touched their first lead yet, while
// nothing is scheduled — there's no shift clock to start before that.
const POLL_FOR_FIRST_TOUCH_MS = 2 * 60 * 1000;

const localDateKey = (d = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const storageKey = (tenantSlug: string, rmUserId: string): string =>
  `shiftAutoLogout.${tenantSlug}.${rmUserId}.${localDateKey()}`;

const readNextEnforceAt = (key: string): number | null => {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const ms = Number(raw);
    return Number.isFinite(ms) ? ms : null;
  } catch {
    return null;
  }
};

const writeNextEnforceAt = (key: string, ms: number): void => {
  try {
    window.localStorage.setItem(key, String(ms));
  } catch {
    // localStorage unavailable (e.g. private browsing) — enforcement still
    // fires this session, it just won't survive a fresh login later today
  }
};

const asUtcIso = (value: string): string =>
  value.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(value) ? value : `${value}Z`;

export function useShiftAutoLogout(): { showShiftEndedOverlay: boolean } {
  const { user, session, logout } = useAuth();
  const { customRole, tenantSlug, membershipLoaded } = useTenant();
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    if (!membershipLoaded) return;
    if (!session || !user?.id) return;
    if (!tenantSlug) return;
    if ((customRole || '').toUpperCase() !== 'RM') return;

    let cancelled = false;
    let enforceTimeoutId: number | null = null;
    let pollTimeoutId: number | null = null;
    let overlayTimeoutId: number | null = null;
    let callEndListener: ((e: Event) => void) | null = null;

    const rmUserId = user.id;
    const key = storageKey(tenantSlug, rmUserId);

    const detachCallEndListener = () => {
      if (callEndListener) {
        window.removeEventListener(CALL_ACTIVITY_CHANGED, callEndListener);
        callEndListener = null;
      }
    };

    const runEnforcement = () => {
      if (cancelled) return;

      if (isLeadCallActive()) {
        detachCallEndListener();
        callEndListener = (e: Event) => {
          const detail = (e as CustomEvent<{ active: boolean }>).detail;
          if (detail && detail.active === false) {
            detachCallEndListener();
            runEnforcement();
          }
        };
        window.addEventListener(CALL_ACTIVITY_CHANGED, callEndListener);
        return;
      }

      setShowOverlay(true);
      overlayTimeoutId = window.setTimeout(() => {
        if (cancelled) return;
        // persist BEFORE logging out — a re-login later today must re-check
        // hourly from here, not restart the full 9-hour clock
        writeNextEnforceAt(key, Date.now() + REENFORCE_INTERVAL_MS);
        void logout();
      }, OVERLAY_DURATION_MS);
    };

    const scheduleFor = (targetMs: number) => {
      const delay = Math.max(0, targetMs - Date.now());
      enforceTimeoutId = window.setTimeout(runEnforcement, delay);
    };

    const findFirstTouchAndSchedule = async () => {
      if (cancelled) return;
      const today = localDateKey();
      try {
        const events = await rmActivityApi.getEvents({ from: today, to: today, rmUserId });
        const firstStartedAt = events
          .map((e) => e.event_data?.started_at)
          .filter((v): v is string => typeof v === 'string' && v.length > 0)
          .sort()[0];

        if (firstStartedAt) {
          const firstTouchMs = new Date(asUtcIso(firstStartedAt)).getTime();
          const target = firstTouchMs + SHIFT_DURATION_MS;
          writeNextEnforceAt(key, target);
          scheduleFor(target);
          return;
        }
      } catch {
        // network hiccup — just retry on the next poll tick
      }
      if (!cancelled) {
        pollTimeoutId = window.setTimeout(findFirstTouchAndSchedule, POLL_FOR_FIRST_TOUCH_MS);
      }
    };

    const stored = readNextEnforceAt(key);
    if (stored != null) {
      scheduleFor(stored);
    } else {
      void findFirstTouchAndSchedule();
    }

    return () => {
      cancelled = true;
      if (enforceTimeoutId != null) window.clearTimeout(enforceTimeoutId);
      if (pollTimeoutId != null) window.clearTimeout(pollTimeoutId);
      if (overlayTimeoutId != null) window.clearTimeout(overlayTimeoutId);
      detachCallEndListener();
    };
  }, [membershipLoaded, session, user?.id, customRole, tenantSlug, logout]);

  return { showShiftEndedOverlay: showOverlay };
}
