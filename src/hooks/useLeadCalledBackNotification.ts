import { useEffect, useRef } from "react";
import { showLeadCalledBackNotification } from "@/features/lead-called-back-notification/showLeadCalledBackNotification";
import { PYRO_LEAD_CALLED_BACK } from "@/lib/realtime/leadCalledBackBus";
import { retainRealtimeConnection } from "@/lib/realtime/recordUpdatedBus";
import type { LeadCalledBackPayload } from "@/lib/realtime/types";

type UseLeadCalledBackNotificationOptions = {
  enabled?: boolean;
};

/** Collapse duplicate WS frames for the same event; allow later call-backs from the same lead. */
export const LEAD_CALLED_BACK_DEDUPE_WINDOW_MS = 8_000;

export function leadCalledBackDedupeKey(payload: LeadCalledBackPayload): string {
  const notificationId =
    payload.notification_id != null ? Number(payload.notification_id) : NaN;
  if (Number.isFinite(notificationId) && notificationId > 0) {
    return `nid:${notificationId}`;
  }
  // No DB notification id — short-window key only (not session-long lead identity).
  return `lead:${payload.record_id}:${payload.praja_id ?? ""}`;
}

export function useLeadCalledBackNotification(
  options: UseLeadCalledBackNotificationOptions = {},
): void {
  const { enabled = true } = options;
  /** notification_id keys: seen for the session (same DB row should not re-toast). */
  const seenNotificationIdsRef = useRef<Set<string>>(new Set());
  /** lead-identity keys without notification_id: expire after a short window. */
  const recentLeadKeysRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (!enabled) return;

    const release = retainRealtimeConnection();

    const listener = (event: Event) => {
      const payload = (event as CustomEvent<LeadCalledBackPayload>).detail;
      if (!payload || payload.event !== "lead_called_back") return;

      const dedupeKey = leadCalledBackDedupeKey(payload);
      const now = Date.now();

      if (dedupeKey.startsWith("nid:")) {
        if (seenNotificationIdsRef.current.has(dedupeKey)) return;
        seenNotificationIdsRef.current.add(dedupeKey);
        if (seenNotificationIdsRef.current.size > 100) {
          seenNotificationIdsRef.current.clear();
          seenNotificationIdsRef.current.add(dedupeKey);
        }
      } else {
        const lastSeen = recentLeadKeysRef.current.get(dedupeKey);
        if (
          lastSeen != null &&
          now - lastSeen < LEAD_CALLED_BACK_DEDUPE_WINDOW_MS
        ) {
          return;
        }
        recentLeadKeysRef.current.set(dedupeKey, now);
        for (const [key, at] of recentLeadKeysRef.current) {
          if (now - at >= LEAD_CALLED_BACK_DEDUPE_WINDOW_MS) {
            recentLeadKeysRef.current.delete(key);
          }
        }
      }

      showLeadCalledBackNotification(payload);
    };

    window.addEventListener(PYRO_LEAD_CALLED_BACK, listener);
    return () => {
      release();
      window.removeEventListener(PYRO_LEAD_CALLED_BACK, listener);
    };
  }, [enabled]);
}
