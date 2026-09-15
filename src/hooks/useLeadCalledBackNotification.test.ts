import { describe, expect, it } from "vitest";
import { leadCalledBackDedupeKey } from "./useLeadCalledBackNotification";
import type { LeadCalledBackPayload } from "@/lib/realtime/types";

function payload(
  overrides: Partial<LeadCalledBackPayload> = {},
): LeadCalledBackPayload {
  return {
    event: "lead_called_back",
    record_id: "913285",
    entity_type: "lead",
    praja_id: "1793876",
    ...overrides,
  };
}

describe("leadCalledBackDedupeKey", () => {
  it("prefers notification_id so a later call from the same lead is a new key", () => {
    expect(leadCalledBackDedupeKey(payload({ notification_id: 10 }))).toBe(
      "nid:10",
    );
    expect(leadCalledBackDedupeKey(payload({ notification_id: 11 }))).toBe(
      "nid:11",
    );
  });

  it("falls back to lead identity only when notification_id is missing", () => {
    expect(leadCalledBackDedupeKey(payload({ notification_id: null }))).toBe(
      "lead:913285:1793876",
    );
    expect(leadCalledBackDedupeKey(payload({ notification_id: 0 }))).toBe(
      "lead:913285:1793876",
    );
  });
});
