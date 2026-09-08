import { useEffect, useRef } from "react";
import {
  PYRO_RECORD_UPDATED,
  retainRealtimeConnection,
} from "@/lib/realtime/recordUpdatedBus";
import type { RecordUpdatedPayload } from "@/lib/realtime/types";

/** Coalesce list refetches when many CRM records update in a short window. */
export const REALTIME_LIST_DEBOUNCE_MS = 1500;

type UseRecordUpdatedOptions = {
  entityType?: string;
  recordId?: string;
  enabled?: boolean;
  /** Trailing debounce. Last matching payload is delivered once the burst settles. */
  debounceMs?: number;
};

export function useRecordUpdated(
  handler: (payload: RecordUpdatedPayload) => void,
  options: UseRecordUpdatedOptions = {},
): void {
  const { entityType, recordId, enabled = true, debounceMs = 0 } = options;
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const release = retainRealtimeConnection();

    const listener = (event: Event) => {
      const payload = (event as CustomEvent<RecordUpdatedPayload>).detail;
      if (!payload || payload.event !== "record_updated") return;
      if (entityType && payload.entity_type !== entityType) return;
      if (recordId && payload.record_id !== recordId) return;

      if (debounceMs > 0) {
        if (timerRef.current != null) window.clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(() => {
          timerRef.current = null;
          handlerRef.current(payload);
        }, debounceMs);
        return;
      }

      handlerRef.current(payload);
    };

    window.addEventListener(PYRO_RECORD_UPDATED, listener);
    return () => {
      release();
      window.removeEventListener(PYRO_RECORD_UPDATED, listener);
      if (timerRef.current != null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [enabled, entityType, recordId, debounceMs]);
}
