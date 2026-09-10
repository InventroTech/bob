import { useEffect, useRef } from "react";
import { showLeadCalledBackNotification } from "@/features/lead-called-back-notification/showLeadCalledBackNotification";
import { PYRO_LEAD_CALLED_BACK } from "@/lib/realtime/leadCalledBackBus";
import { retainRealtimeConnection } from "@/lib/realtime/recordUpdatedBus";
import type { LeadCalledBackPayload } from "@/lib/realtime/types";

type UseLeadCalledBackNotificationOptions = {
  enabled?: boolean;
};

export function useLeadCalledBackNotification(
  options: UseLeadCalledBackNotificationOptions = {},
): void {
  const { enabled = true } = options;
  const seenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled) return;

    const release = retainRealtimeConnection();

    const listener = (event: Event) => {
      const payload = (event as CustomEvent<LeadCalledBackPayload>).detail;
      if (!payload || payload.event !== "lead_called_back") return;

      const dedupeKey = `${payload.record_id}:${payload.praja_id ?? ""}`;
      if (seenRef.current.has(dedupeKey)) return;
      seenRef.current.add(dedupeKey);
      if (seenRef.current.size > 100) {
        seenRef.current.clear();
        seenRef.current.add(dedupeKey);
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
