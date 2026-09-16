import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import { inAppNotificationToPayload } from "./inAppNotifications";
import type { InAppNotificationDto } from "./inAppNotifications";

function row(overrides: Partial<InAppNotificationDto> = {}): InAppNotificationDto {
  return {
    id: 1,
    notification_type: "lead_called_back",
    title: "Title",
    message: "Sneha called back · Praja ID: 1793876",
    record_id: 10,
    tenant_id: null,
    created_at: "2026-09-16T10:00:00Z",
    updated_at: "2026-09-16T10:00:00Z",
    read_at: null,
    is_read: false,
    ...overrides,
  };
}

describe("inAppNotificationToPayload", () => {
  it("prefers structured praja_id / lead_name over message regex", () => {
    const payload = inAppNotificationToPayload(
      row({
        title: "Title fallback",
        message: "Old Copy called back · Praja ID: FROM-MESSAGE",
        praja_id: "STRUCTURED-PRAJA",
        lead_name: "Structured Name",
      }),
    );

    expect(payload.praja_id).toBe("STRUCTURED-PRAJA");
    expect(payload.lead_name).toBe("Structured Name");
  });

  it("prefers nested data.praja_id / data.lead_name over message", () => {
    const payload = inAppNotificationToPayload(
      row({
        message: "Msg called back · Praja ID: FROM-MESSAGE",
        data: { praja_id: "DATA-PRAJA", lead_name: "Data Name" },
      }),
    );
    expect(payload.praja_id).toBe("DATA-PRAJA");
    expect(payload.lead_name).toBe("Data Name");
  });

  it("falls back to message regex when structured fields are absent", () => {
    const payload = inAppNotificationToPayload(row());
    expect(payload.praja_id).toBe("1793876");
    expect(payload.lead_name).toBe("Sneha");
  });

  it("falls back to title when name cannot be parsed from message", () => {
    const payload = inAppNotificationToPayload(
      row({
        title: "Fallback Title",
        message: "no match here",
        lead_name: null,
        praja_id: null,
      }),
    );
    expect(payload.lead_name).toBe("Fallback Title");
    expect(payload.praja_id).toBeNull();
  });

  it("uses empty record_id string when record_id is null", () => {
    const payload = inAppNotificationToPayload(row({ record_id: null }));
    expect(payload.record_id).toBe("");
  });

  it("sets notification_id from row.id", () => {
    const payload = inAppNotificationToPayload(row({ id: 55 }));
    expect(payload.notification_id).toBe(55);
    expect(payload.event).toBe("lead_called_back");
    expect(payload.entity_type).toBe("lead");
  });

  it("trims whitespace-only structured fields and falls back", () => {
    const payload = inAppNotificationToPayload(
      row({
        lead_name: "   ",
        praja_id: "  ",
        message: "Raj called back · Praja ID: P9",
      }),
    );
    expect(payload.lead_name).toBe("Raj");
    expect(payload.praja_id).toBe("P9");
  });

  it("top-level structured fields beat nested data", () => {
    const payload = inAppNotificationToPayload(
      row({
        lead_name: "Top",
        praja_id: "TOP",
        data: { lead_name: "Nested", praja_id: "NESTED" },
      }),
    );
    expect(payload.lead_name).toBe("Top");
    expect(payload.praja_id).toBe("TOP");
  });
});
