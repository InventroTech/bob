import type { LeadCalledBackPayload } from "./types";

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
