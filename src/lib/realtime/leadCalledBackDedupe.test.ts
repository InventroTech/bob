import { describe, expect, it } from "vitest";
import {
  LEAD_CALLED_BACK_DEDUPE_WINDOW_MS,
  leadCalledBackDedupeKey,
} from "@/lib/realtime/leadCalledBackDedupe";
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

  it("treats negative notification_id as missing", () => {
    expect(leadCalledBackDedupeKey(payload({ notification_id: -5 }))).toBe(
      "lead:913285:1793876",
    );
  });

  it("includes empty praja in lead key when praja absent", () => {
    expect(
      leadCalledBackDedupeKey(
        payload({ notification_id: null, praja_id: null }),
      ),
    ).toBe("lead:913285:");
  });

  it("different record ids produce different lead keys", () => {
    const a = leadCalledBackDedupeKey(
      payload({ notification_id: null, record_id: "1" }),
    );
    const b = leadCalledBackDedupeKey(
      payload({ notification_id: null, record_id: "2" }),
    );
    expect(a).not.toBe(b);
  });

  it("exposes a positive dedupe window for lead-identity keys", () => {
    expect(LEAD_CALLED_BACK_DEDUPE_WINDOW_MS).toBeGreaterThan(0);
    expect(LEAD_CALLED_BACK_DEDUPE_WINDOW_MS).toBe(8_000);
  });
});
