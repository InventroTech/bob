/**
 * Cross-component "is the RM mid-call right now" signal.
 *
 * useShiftAutoLogout needs to know this so it never interrupts an RM in the
 * middle of a call — it must wait until the call ends (the lead-card
 * carousel's currentLead clears) before showing the shift-ended overlay.
 * The sidebar (CustomAppLayout) also uses this, via useLeadCallActive below,
 * to block navigating to another page while a lead is open — same reason:
 * the RM shouldn't be able to walk away from an undispositioned lead.
 * Same module-state + CustomEvent pattern as lib/realtime/openLeadBus.ts.
 */

import { useEffect, useState } from "react";

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

// Reactive version of isLeadCallActive() for components outside the
// lead-card-carousel subtree (e.g. the sidebar) that need to re-render when
// a lead opens/closes, not just read the value once.
export function useLeadCallActive(): boolean {
  const [active, setActive] = useState(isLeadCallActive());

  useEffect(() => {
    const handleChange = () => setActive(isLeadCallActive());
    handleChange();
    window.addEventListener(CALL_ACTIVITY_CHANGED, handleChange);
    return () => window.removeEventListener(CALL_ACTIVITY_CHANGED, handleChange);
  }, []);

  return active;
}
