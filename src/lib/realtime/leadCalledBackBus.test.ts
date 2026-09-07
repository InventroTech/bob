import { describe, expect, it } from "vitest";
import {
  formatLeadCalledBackDetails,
  formatLeadCalledBackMessage,
} from "@/lib/realtime/leadCalledBackBus";

describe("formatLeadCalledBackDetails", () => {
  it("includes lead name, phone, and praja id (not record id)", () => {
    expect(
      formatLeadCalledBackDetails({
        event: "lead_called_back",
        record_id: "913285",
        entity_type: "lead",
        lead_name: "Sneha Jain",
        phone_number: "9876543210",
        praja_id: "1793876",
      }),
    ).toEqual({
      leadLabel: "Sneha Jain",
      phoneLabel: "9876543210",
      metaLabel: "Praja ID: 1793876",
    });
  });

  it("falls back to praja id when name is missing", () => {
    expect(
      formatLeadCalledBackDetails({
        event: "lead_called_back",
        record_id: "913285",
        entity_type: "lead",
        phone_number: "9876543210",
        praja_id: "1793876",
      }),
    ).toEqual({
      leadLabel: "Praja 1793876",
      phoneLabel: "9876543210",
      metaLabel: "Praja ID: 1793876",
    });
  });
});

describe("formatLeadCalledBackMessage", () => {
  it("includes lead name and phone when present", () => {
    expect(
      formatLeadCalledBackMessage({
        event: "lead_called_back",
        record_id: "1",
        entity_type: "lead",
        lead_name: "Raj",
        phone_number: "9876543210",
      }),
    ).toEqual({
      title: "WhatsApp call back",
      description: "Raj called back · 9876543210",
    });
  });

  it("falls back when phone is missing", () => {
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
