import type { LeadCalledBackPayload } from "./types";

export const PYRO_LEAD_CALLED_BACK = "pyro-lead-called-back";

export function dispatchLeadCalledBack(payload: LeadCalledBackPayload): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<LeadCalledBackPayload>(PYRO_LEAD_CALLED_BACK, { detail: payload }),
  );
}

export function formatLeadCalledBackDetails(payload: LeadCalledBackPayload): {
  leadLabel: string;
  phoneLabel: string | null;
  metaLabel: string | null;
} {
  const name = payload.lead_name?.trim();
  const phone = payload.phone_number?.trim();
  const prajaId = payload.praja_id?.trim();

  // Prefer real lead name; never show internal CRM record id in the UI.
  const leadLabel = name || (prajaId ? `Praja ${prajaId}` : null) || phone || "Unknown lead";
  const metaLabel = prajaId ? `Praja ID: ${prajaId}` : null;

  return {
    leadLabel,
    phoneLabel: phone || null,
    metaLabel,
  };
}

export function formatLeadCalledBackMessage(payload: LeadCalledBackPayload): {
  title: string;
  description: string;
} {
  const { leadLabel, phoneLabel } = formatLeadCalledBackDetails(payload);
  return {
    title: "WhatsApp call back",
    description: phoneLabel
      ? `${leadLabel} called back · ${phoneLabel}`
      : `${leadLabel} called back on WhatsApp`,
  };
}
