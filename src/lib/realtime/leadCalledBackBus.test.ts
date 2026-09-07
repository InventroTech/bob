import { describe, expect, it } from "vitest";
import {
  formatLeadCalledBackDetails,
  formatLeadCalledBackMessage,
} from "@/lib/realtime/leadCalledBackBus";

describe("formatLeadCalledBackDetails", () => {
  it("includes lead name and praja id without phone", () => {
    expect(
      formatLeadCalledBackDetails({
        event: "lead_called_back",
        record_id: "913285",
        entity_type: "lead",
        lead_name: "Sneha Jain",
        praja_id: "1793876",
      }),
    ).toEqual({
      leadLabel: "Sneha Jain",
      phoneLabel: null,
      metaLabel: "Praja ID: 1793876",
    });
  });

  it("falls back to praja id when name is missing", () => {
    expect(
      formatLeadCalledBackDetails({
        event: "lead_called_back",
        record_id: "913285",
        entity_type: "lead",
        praja_id: "1793876",
      }),
    ).toEqual({
      leadLabel: "Praja 1793876",
      phoneLabel: null,
      metaLabel: "Praja ID: 1793876",
    });
  });
});

describe("formatLeadCalledBackMessage", () => {
  it("includes lead name and praja id when present", () => {
    expect(
      formatLeadCalledBackMessage({
        event: "lead_called_back",
        record_id: "1",
        entity_type: "lead",
        lead_name: "Raj",
        praja_id: "PRAJA123",
      }),
    ).toEqual({
      title: "WhatsApp call back",
      description: "Raj called back · Praja ID: PRAJA123",
    });
  });

  it("falls back when praja id is missing", () => {
    expect(
      formatLeadCalledBackMessage({
        event: "lead_called_back",
        record_id: "1",
        entity_type: "lead",
        lead_name: "Raj",
      }),
    ).toEqual({
      title: "WhatsApp call back",
      description: "Raj called back on WhatsApp",
    });
  });
});
