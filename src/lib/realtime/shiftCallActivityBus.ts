/**
 * Cross-component "is the RM mid-call right now" signal.
 *
 * useShiftAutoLogout needs to know this so it never interrupts an RM in the
 * middle of a call — it must wait until the call ends (the lead-card
 * carousel's currentLead clears) before showing the shift-ended overlay.
 * Same module-state + CustomEvent pattern as lib/realtime/openLeadBus.ts.
 */

export const CALL_ACTIVITY_CHANGED = "pyro-call-activity-changed";

let callActive = false;

export function setLeadCallActive(active: boolean): void {
  if (callActive === active) return;
  callActive = active;
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<{ active: boolean }>(CALL_ACTIVITY_CHANGED, { detail: { active } }),
  );
}

export function isLeadCallActive(): boolean {
  return callActive;
}
