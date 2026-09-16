import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearLeadCalledBackNotifications,
  getLeadCalledBackNotifications,
  hydrateLeadCalledBackNotifications,
  pushLeadCalledBackNotification,
} from "./leadCalledBackNotificationStore";
import type { InAppNotificationDto } from "@/lib/api/services/inAppNotifications";

vi.mock("@/lib/api/services/inAppNotifications", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/api/services/inAppNotifications")
  >("@/lib/api/services/inAppNotifications");
  return {
    ...actual,
    fetchUnreadInAppNotifications: vi.fn(),
    markInAppNotificationRead: vi.fn(),
  };
});

import { fetchUnreadInAppNotifications } from "@/lib/api/services/inAppNotifications";

const fetchUnreadMock = vi.mocked(fetchUnreadInAppNotifications);

function basePayload(overrides: Record<string, unknown> = {}) {
  return {
    event: "lead_called_back" as const,
    record_id: "913285",
    entity_type: "lead",
    lead_name: "Sneha",
    praja_id: "1793876",
    ...overrides,
  };
}

describe("leadCalledBackNotificationStore dedupe", () => {
  beforeEach(() => {
    clearLeadCalledBackNotifications();
    fetchUnreadMock.mockReset();
  });

  afterEach(() => {
    clearLeadCalledBackNotifications();
  });

  it("merges WS row without notification_id into later hydrate db row", async () => {
    pushLeadCalledBackNotification(basePayload({ notification_id: null }));

    expect(getLeadCalledBackNotifications()).toHaveLength(1);
    expect(getLeadCalledBackNotifications()[0].notificationId).toBeNull();
    expect(getLeadCalledBackNotifications()[0].id).toBe("lead:913285:1793876");

    const row: InAppNotificationDto = {
      id: 42,
      notification_type: "lead_called_back",
      title: "WhatsApp call back",
      message: "Sneha called back · Praja ID: 1793876",
      record_id: 913285,
      tenant_id: null,
      created_at: "2026-09-16T10:00:00Z",
      updated_at: "2026-09-16T10:00:00Z",
      read_at: null,
      is_read: false,
      praja_id: "1793876",
      lead_name: "Sneha",
    };
    fetchUnreadMock.mockResolvedValueOnce([row]);

    await hydrateLeadCalledBackNotifications();

    const unread = getLeadCalledBackNotifications();
    expect(unread).toHaveLength(1);
    expect(unread[0].id).toBe("db-42");
    expect(unread[0].notificationId).toBe(42);
    expect(unread[0].payload.praja_id).toBe("1793876");
  });

  it("merges hydrate-first then WS without notification_id (praja-only WS)", async () => {
    fetchUnreadMock.mockResolvedValueOnce([
      {
        id: 42,
        notification_type: "lead_called_back",
        title: "WhatsApp call back",
        message: "Sneha called back · Praja ID: 1793876",
        record_id: 913285,
        tenant_id: null,
        created_at: "2026-09-16T10:00:00Z",
        updated_at: "2026-09-16T10:00:00Z",
        read_at: null,
        is_read: false,
        praja_id: "1793876",
        lead_name: "Sneha",
      },
    ]);
    await hydrateLeadCalledBackNotifications();
    expect(getLeadCalledBackNotifications()).toHaveLength(1);

    // WS often lacks notification_id and may omit record_id — merge on praja.
    pushLeadCalledBackNotification(
      basePayload({ notification_id: null, record_id: "" }),
    );

    const unread = getLeadCalledBackNotifications();
    expect(unread).toHaveLength(1);
    expect(unread[0].id).toBe("db-42");
    expect(unread[0].notificationId).toBe(42);
  });

  it("does not collapse two distinct DB notifications for the same lead", async () => {
    fetchUnreadMock.mockResolvedValueOnce([
      {
        id: 1,
        notification_type: "lead_called_back",
        title: "WhatsApp call back",
        message: "Sneha called back · Praja ID: 1793876",
        record_id: 913285,
        tenant_id: null,
        created_at: "2026-09-16T10:00:00Z",
        updated_at: "2026-09-16T10:00:00Z",
        read_at: null,
        is_read: false,
        praja_id: "1793876",
        lead_name: "Sneha",
      },
      {
        id: 2,
        notification_type: "lead_called_back",
        title: "WhatsApp call back",
        message: "Sneha called back · Praja ID: 1793876",
        record_id: 913285,
        tenant_id: null,
        created_at: "2026-09-16T11:00:00Z",
        updated_at: "2026-09-16T11:00:00Z",
        read_at: null,
        is_read: false,
        praja_id: "1793876",
        lead_name: "Sneha",
      },
    ]);
    await hydrateLeadCalledBackNotifications();
    expect(getLeadCalledBackNotifications()).toHaveLength(2);
  });

  it("does not duplicate when WS already carried notification_id", async () => {
    pushLeadCalledBackNotification(basePayload({ notification_id: 7 }));
    fetchUnreadMock.mockResolvedValueOnce([
      {
        id: 7,
        notification_type: "lead_called_back",
        title: "WhatsApp call back",
        message: "Sneha called back · Praja ID: 1793876",
        record_id: 913285,
        tenant_id: null,
        created_at: "2026-09-16T10:00:00Z",
        updated_at: "2026-09-16T10:00:00Z",
        read_at: null,
        is_read: false,
        praja_id: "1793876",
        lead_name: "Sneha",
      },
    ]);

    await hydrateLeadCalledBackNotifications();
    expect(getLeadCalledBackNotifications()).toHaveLength(1);
    expect(getLeadCalledBackNotifications()[0].id).toBe("db-7");
  });
});
