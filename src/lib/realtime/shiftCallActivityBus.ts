/**
 * Cross-component "is the RM mid-call right now" signal, plus a separate
 * "sidebar navigation should be locked" signal.
 *
 * useShiftAutoLogout needs the first so it never interrupts an RM in the
 * middle of a call — it must wait until the call ends (the lead-card
 * carousel's currentLead clears) before showing the shift-ended overlay.
 * The sidebar (CustomAppLayout) uses the second, via useLeadNavLocked below,
 * to block navigating to another page while a lead the RM can't freely close
 * is open — this is deliberately NOT the same signal as callActive: a lead
 * opened in a table's "View Profile" modal with "Lock lead modal" enabled
 * should block sidebar navigation (same reason as the carousel: don't let
 * the RM walk away from an undispositioned lead), but must NOT also exempt
 * the RM from shift auto-logout the way an actual carousel call does — see
 * setLeadCallActive's own docs on why "a modal opened on an arbitrary lead"
 * must not count as "mid-call".
 * Same module-state + CustomEvent pattern as lib/realtime/openLeadBus.ts.
 */

import { useEffect, useState } from "react";

export const CALL_ACTIVITY_CHANGED = "pyro-call-activity-changed";

let callActive = false;
let modalLeadLocked = false;

function notifyActivityChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CALL_ACTIVITY_CHANGED));
}

// The RM's own live queue has a lead open (non-modal lead-card carousel) —
// read by useShiftAutoLogout, which must never interrupt an active call.
export function setLeadCallActive(active: boolean): void {
  if (callActive === active) return;
  callActive = active;
  notifyActivityChanged();
}

export function isLeadCallActive(): boolean {
  return callActive;
}

// A table-opened lead ("View Profile") whose modal has "Lock lead modal"
// enabled — only a disposition button can close it. Intentionally a
// separate flag from callActive (see file docstring): read only by the
// sidebar's nav-lock, never by useShiftAutoLogout.
export function setLeadModalLocked(active: boolean): void {
  if (modalLeadLocked === active) return;
  modalLeadLocked = active;
  notifyActivityChanged();
}

export function isLeadNavLocked(): boolean {
  return callActive || modalLeadLocked;
}

// Reactive version of isLeadNavLocked() for components outside the
// lead-card-carousel subtree (e.g. the sidebar) that need to re-render when
// either signal changes, not just read the combined value once.
export function useLeadNavLocked(): boolean {
  const [active, setActive] = useState(isLeadNavLocked());

  useEffect(() => {
    const handleChange = () => setActive(isLeadNavLocked());
    handleChange();
    window.addEventListener(CALL_ACTIVITY_CHANGED, handleChange);
    return () => window.removeEventListener(CALL_ACTIVITY_CHANGED, handleChange);
  }, []);

  return active;
}
