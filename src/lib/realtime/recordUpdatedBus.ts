import type { RecordUpdatedPayload } from "./types";

export const PYRO_RECORD_UPDATED = "pyro-record-updated";
export const PYRO_REALTIME_SUBSCRIBERS_CHANGED = "pyro-realtime-subscribers-changed";

let realtimeSubscriberCount = 0;

export function getRealtimeSubscriberCount(): number {
  return realtimeSubscriberCount;
}

/** Keep the WS open only while a live-update listener is mounted. */
export function retainRealtimeConnection(): () => void {
  realtimeSubscriberCount += 1;
  notifySubscriberCount();
  return () => {
    realtimeSubscriberCount = Math.max(0, realtimeSubscriberCount - 1);
    notifySubscriberCount();
  };
}

function notifySubscriberCount(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(PYRO_REALTIME_SUBSCRIBERS_CHANGED, {
      detail: realtimeSubscriberCount,
    }),
  );
}

export function dispatchRecordUpdated(payload: RecordUpdatedPayload): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<RecordUpdatedPayload>(PYRO_RECORD_UPDATED, { detail: payload }),
  );
}
