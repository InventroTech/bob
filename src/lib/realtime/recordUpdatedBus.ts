import type { RecordUpdatedPayload } from "./types";

export const PYRO_RECORD_UPDATED = "pyro-record-updated";

export function dispatchRecordUpdated(payload: RecordUpdatedPayload): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<RecordUpdatedPayload>(PYRO_RECORD_UPDATED, { detail: payload }),
  );
}
