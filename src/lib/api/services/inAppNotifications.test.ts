import { describe, expect, it, vi } from "vitest";

// inAppNotifications imports apiClient → auth → supabase; CI has no VITE_SUPABASE_URL.
vi.mock("@/lib/api", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import { inAppNotificationToPayload } from "./inAppNotifications";

describe("inAppNotificationToPayload", () => {
  it("prefers structured praja_id / lead_name over message regex", () => {
    const payload = inAppNotificationToPayload({
      id: 1,
      notification_type: "lead_called_back",
      title: "Title fallback",
      message: "Old Copy called back · Praja ID: FROM-MESSAGE",
      record_id: 10,
      tenant_id: null,
      created_at: "2026-09-16T10:00:00Z",
      updated_at: "2026-09-16T10:00:00Z",
      read_at: null,
      is_read: false,
      praja_id: "STRUCTURED-PRAJA",
      lead_name: "Structured Name",
    });

    expect(payload.praja_id).toBe("STRUCTURED-PRAJA");
    expect(payload.lead_name).toBe("Structured Name");
  });

  it("falls back to message regex when structured fields are absent", () => {
    const payload = inAppNotificationToPayload({
      id: 2,
      notification_type: "lead_called_back",
      title: "Title",
      message: "Sneha called back · Praja ID: 1793876",
      record_id: 10,
      tenant_id: null,
      created_at: "2026-09-16T10:00:00Z",
      updated_at: "2026-09-16T10:00:00Z",
      read_at: null,
      is_read: false,
    });

    expect(payload.praja_id).toBe("1793876");
    expect(payload.lead_name).toBe("Sneha");
  });
});
