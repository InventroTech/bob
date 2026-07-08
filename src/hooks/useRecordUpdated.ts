import { useEffect } from "react";
import { PYRO_RECORD_UPDATED } from "@/lib/realtime/recordUpdatedBus";
import type { RecordUpdatedPayload } from "@/lib/realtime/types";

type UseRecordUpdatedOptions = {
  entityType?: string;
  recordId?: string;
  enabled?: boolean;
};

export function useRecordUpdated(
  handler: (payload: RecordUpdatedPayload) => void,
  options: UseRecordUpdatedOptions = {},
): void {
  const { entityType, recordId, enabled = true } = options;

  useEffect(() => {
    if (!enabled) return;

    const listener = (event: Event) => {
      const payload = (event as CustomEvent<RecordUpdatedPayload>).detail;
      if (!payload || payload.event !== "record_updated") return;
      if (entityType && payload.entity_type !== entityType) return;
      if (recordId && payload.record_id !== recordId) return;
      handler(payload);
    };

    window.addEventListener(PYRO_RECORD_UPDATED, listener);
    return () => window.removeEventListener(PYRO_RECORD_UPDATED, listener);
  }, [enabled, entityType, recordId, handler]);
}
