import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/services/inAppNotifications", () => ({
  fetchUnreadInAppNotifications: vi.fn(),
  markInAppNotificationRead: vi.fn(),
  inAppNotificationToPayload: (row: {
    id: number;
    record_id: number | null;
    lead_name?: string | null;
    praja_id?: string | null;
    title?: string;
  }) => ({
    event: "lead_called_back" as const,
    record_id: row.record_id != null ? String(row.record_id) : "",
    entity_type: "lead",
    lead_name: row.lead_name ?? row.title ?? null,
    praja_id: row.praja_id ?? null,
    notification_id: row.id,
  }),
}));

import {
  clearLeadCalledBackNotifications,
  getLeadCalledBackNotifications,
  getUnreadLeadCalledBackCount,
  hydrateLeadCalledBackNotifications,
  markLeadCalledBackNotificationRead,
  pushLeadCalledBackNotification,
  subscribeLeadCalledBackNotifications,
} from "./leadCalledBackNotificationStore";
import {
  fetchUnreadInAppNotifications,
  markInAppNotificationRead,
  type InAppNotificationDto,
} from "@/lib/api/services/inAppNotifications";
import {
  clearOpenLeadHighlightStash,
  getActiveLeadHighlight,
  stashOpenLeadHighlight,
} from "@/lib/realtime/openLeadBus";

const fetchUnreadMock = vi.mocked(fetchUnreadInAppNotifications);
const markReadMock = vi.mocked(markInAppNotificationRead);

function payload(overrides: Record<string, unknown> = {}) {
  return {
    event: "lead_called_back" as const,
    record_id: "913285",
    entity_type: "lead",
    lead_name: "Sneha",
    praja_id: "1793876",
    ...overrides,
  };
}

function dbRow(
  overrides: Partial<InAppNotificationDto> & { id: number },
): InAppNotificationDto {
  return {
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
    ...overrides,
  };
}

describe("lead called back inbox — edge cases", () => {
  beforeEach(() => {
    clearLeadCalledBackNotifications();
    clearOpenLeadHighlightStash();
    fetchUnreadMock.mockReset();
    markReadMock.mockReset();
    markReadMock.mockResolvedValue(dbRow({ id: 1 }));
  });

  afterEach(() => {
    clearLeadCalledBackNotifications();
    clearOpenLeadHighlightStash();
  });

  describe("push identity / ids", () => {
    it("uses db-{id} when notification_id is present", () => {
      pushLeadCalledBackNotification(payload({ notification_id: 42 }));
      expect(getLeadCalledBackNotifications()[0].id).toBe("db-42");
      expect(getLeadCalledBackNotifications()[0].notificationId).toBe(42);
    });

    it("uses stable lead:record:praja when notification_id is missing", () => {
      pushLeadCalledBackNotification(payload({ notification_id: null }));
      expect(getLeadCalledBackNotifications()[0].id).toBe("lead:913285:1793876");
    });

    it("treats notification_id 0 as missing (invalid)", () => {
      pushLeadCalledBackNotification(payload({ notification_id: 0 }));
      expect(getLeadCalledBackNotifications()[0].notificationId).toBeNull();
      expect(getLeadCalledBackNotifications()[0].id).toBe("lead:913285:1793876");
    });

    it("treats negative notification_id as missing", () => {
      pushLeadCalledBackNotification(payload({ notification_id: -1 }));
      expect(getLeadCalledBackNotifications()[0].notificationId).toBeNull();
    });

    it("upserts repeat WS frames without notification_id (same lead key)", () => {
      pushLeadCalledBackNotification(payload({ notification_id: null, lead_name: "A" }));
      pushLeadCalledBackNotification(payload({ notification_id: null, lead_name: "B" }));
      expect(getLeadCalledBackNotifications()).toHaveLength(1);
      expect(getLeadCalledBackNotifications()[0].payload.lead_name).toBe("B");
    });

    it("keeps two different leads without notification_id as separate rows", () => {
      pushLeadCalledBackNotification(
        payload({ notification_id: null, record_id: "1", praja_id: "P1" }),
      );
      pushLeadCalledBackNotification(
        payload({ notification_id: null, record_id: "2", praja_id: "P2" }),
      );
      expect(getLeadCalledBackNotifications()).toHaveLength(2);
    });

    it("praja-only WS rows share one inbox slot", () => {
      pushLeadCalledBackNotification(
        payload({ notification_id: null, record_id: "", praja_id: "1793876" }),
      );
      pushLeadCalledBackNotification(
        payload({ notification_id: null, record_id: "", praja_id: "1793876", lead_name: "Again" }),
      );
      expect(getLeadCalledBackNotifications()).toHaveLength(1);
      expect(getLeadCalledBackNotifications()[0].id).toBe("lead::1793876");
    });
  });

  describe("WS ↔ hydrate merge", () => {
    it("WS then hydrate merges on record_id", async () => {
      pushLeadCalledBackNotification(payload({ notification_id: null }));
      fetchUnreadMock.mockResolvedValueOnce([dbRow({ id: 42 })]);
      await hydrateLeadCalledBackNotifications();
      expect(getLeadCalledBackNotifications()).toHaveLength(1);
      expect(getLeadCalledBackNotifications()[0].id).toBe("db-42");
    });

    it("hydrate then praja-only WS merges", async () => {
      fetchUnreadMock.mockResolvedValueOnce([dbRow({ id: 42 })]);
      await hydrateLeadCalledBackNotifications();
      pushLeadCalledBackNotification(
        payload({ notification_id: null, record_id: "", praja_id: "1793876" }),
      );
      expect(getLeadCalledBackNotifications()).toHaveLength(1);
      expect(getLeadCalledBackNotifications()[0].notificationId).toBe(42);
    });

    it("does not merge two DB ids for the same lead", async () => {
      fetchUnreadMock.mockResolvedValueOnce([
        dbRow({ id: 1 }),
        dbRow({ id: 2, created_at: "2026-09-16T11:00:00Z" }),
      ]);
      await hydrateLeadCalledBackNotifications();
      expect(getLeadCalledBackNotifications()).toHaveLength(2);
    });

    it("skips non lead_called_back rows on hydrate", async () => {
      fetchUnreadMock.mockResolvedValueOnce([
        dbRow({ id: 1, notification_type: "other" }),
        dbRow({ id: 2 }),
      ]);
      await hydrateLeadCalledBackNotifications();
      expect(getLeadCalledBackNotifications()).toHaveLength(1);
      expect(getLeadCalledBackNotifications()[0].notificationId).toBe(2);
    });

    it("hydrate with empty results leaves inbox empty", async () => {
      fetchUnreadMock.mockResolvedValueOnce([]);
      await hydrateLeadCalledBackNotifications();
      expect(getLeadCalledBackNotifications()).toHaveLength(0);
    });

    it("hydrate failure does not throw and leaves existing WS row", async () => {
      pushLeadCalledBackNotification(payload({ notification_id: null }));
      fetchUnreadMock.mockRejectedValueOnce(new Error("network"));
      await expect(hydrateLeadCalledBackNotifications()).resolves.toBeUndefined();
      expect(getLeadCalledBackNotifications()).toHaveLength(1);
    });

    it("concurrent hydrate calls share one in-flight promise", async () => {
      let resolveFetch!: (v: InAppNotificationDto[]) => void;
      fetchUnreadMock.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
      );
      const a = hydrateLeadCalledBackNotifications();
      const b = hydrateLeadCalledBackNotifications();
      expect(fetchUnreadMock).toHaveBeenCalledTimes(1);
      resolveFetch([dbRow({ id: 9 })]);
      await Promise.all([a, b]);
      expect(getLeadCalledBackNotifications()).toHaveLength(1);
    });
  });

  describe("mark as read", () => {
    it("hides unread after mark read and calls API when notificationId present", async () => {
      pushLeadCalledBackNotification(payload({ notification_id: 7 }));
      const item = getLeadCalledBackNotifications()[0];
      await markLeadCalledBackNotificationRead(item);
      expect(getLeadCalledBackNotifications()).toHaveLength(0);
      expect(getUnreadLeadCalledBackCount()).toBe(0);
      expect(markReadMock).toHaveBeenCalledWith(7);
    });

    it("marks local read even when API mark-read fails", async () => {
      pushLeadCalledBackNotification(payload({ notification_id: 7 }));
      markReadMock.mockRejectedValueOnce(new Error("fail"));
      const item = getLeadCalledBackNotifications()[0];
      await markLeadCalledBackNotificationRead(item);
      expect(getLeadCalledBackNotifications()).toHaveLength(0);
    });

    it("does not call API when notificationId is null", async () => {
      pushLeadCalledBackNotification(payload({ notification_id: null }));
      const item = getLeadCalledBackNotifications()[0];
      await markLeadCalledBackNotificationRead(item);
      expect(markReadMock).not.toHaveBeenCalled();
      expect(getLeadCalledBackNotifications()).toHaveLength(0);
    });

    it("clears open-lead highlight when marked notification matches stash", async () => {
      stashOpenLeadHighlight({
        record_id: "913285",
        praja_id: "1793876",
        notification_id: 7,
        notification_item_id: "db-7",
      });
      pushLeadCalledBackNotification(payload({ notification_id: 7 }));
      const item = getLeadCalledBackNotifications()[0];
      await markLeadCalledBackNotificationRead(item);
      expect(getActiveLeadHighlight()).toBeNull();
    });

    it("does not revive a locally-read item when hydrate returns unread", async () => {
      pushLeadCalledBackNotification(payload({ notification_id: 7 }));
      await markLeadCalledBackNotificationRead(getLeadCalledBackNotifications()[0]);
      expect(getLeadCalledBackNotifications()).toHaveLength(0);

      fetchUnreadMock.mockResolvedValueOnce([dbRow({ id: 7, is_read: false, read_at: null })]);
      // New hydrate after previous finished
      await hydrateLeadCalledBackNotifications();
      // upsert refuses to revive read=true with next.read=false
      expect(getLeadCalledBackNotifications()).toHaveLength(0);
    });
  });

  describe("clear / subscribe / counts", () => {
    it("clear empties inbox and bumps hydrate generation (in-flight hydrate ignored)", async () => {
      let resolveFetch!: (v: InAppNotificationDto[]) => void;
      fetchUnreadMock.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
      );
      const pending = hydrateLeadCalledBackNotifications();
      clearLeadCalledBackNotifications();
      resolveFetch([dbRow({ id: 1 })]);
      await pending;
      expect(getLeadCalledBackNotifications()).toHaveLength(0);
    });

    it("subscribe notifies on push", () => {
      const listener = vi.fn();
      const unsub = subscribeLeadCalledBackNotifications(listener);
      pushLeadCalledBackNotification(payload({ notification_id: 1 }));
      expect(listener).toHaveBeenCalled();
      unsub();
      pushLeadCalledBackNotification(payload({ notification_id: 2 }));
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("unread count only counts unread items", async () => {
      pushLeadCalledBackNotification(payload({ notification_id: 1 }));
      pushLeadCalledBackNotification(payload({ notification_id: 2, record_id: "2", praja_id: "P2" }));
      expect(getUnreadLeadCalledBackCount()).toBe(2);
      await markLeadCalledBackNotificationRead(getLeadCalledBackNotifications()[0]);
      expect(getUnreadLeadCalledBackCount()).toBe(1);
    });

    it("caps inbox at MAX_ITEMS (50)", () => {
      for (let i = 1; i <= 55; i += 1) {
        pushLeadCalledBackNotification(
          payload({
            notification_id: i,
            record_id: String(i),
            praja_id: `P${i}`,
          }),
        );
      }
      expect(getLeadCalledBackNotifications()).toHaveLength(50);
    });
  });
});
