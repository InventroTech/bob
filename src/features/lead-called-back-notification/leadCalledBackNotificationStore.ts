import type { LeadCalledBackPayload } from "@/lib/realtime/types";
import {
  fetchUnreadInAppNotifications,
  inAppNotificationToPayload,
  markInAppNotificationRead,
} from "@/lib/api/services/inAppNotifications";
import { clearLeadHighlightForNotification } from "@/lib/realtime/openLeadBus";

export type LeadCalledBackNotificationItem = {
  id: string;
  notificationId: number | null;
  payload: LeadCalledBackPayload;
  receivedAt: string;
  read: boolean;
};

const MAX_ITEMS = 50;

let items: LeadCalledBackNotificationItem[] = [];
const listeners = new Set<() => void>();
let hydratePromise: Promise<void> | null = null;

function notifyListeners(): void {
  listeners.forEach((listener) => listener());
}

export function getLeadCalledBackNotifications(): LeadCalledBackNotificationItem[] {
  return items.filter((item) => !item.read);
}

export function getUnreadLeadCalledBackCount(): number {
  return items.filter((item) => !item.read).length;
}

function upsertItem(next: LeadCalledBackNotificationItem): void {
  const byNotification =
    next.notificationId != null
      ? items.findIndex((item) => item.notificationId === next.notificationId)
      : -1;
  const byId = items.findIndex((item) => item.id === next.id);
  const idx = byNotification >= 0 ? byNotification : byId;

  if (idx >= 0) {
    const existing = items[idx];
    // Never revive a notification that was already marked read locally.
    if (existing.read && next.read === false) {
      return;
    }
    const copy = items.slice();
    copy[idx] = { ...existing, ...next, read: existing.read || next.read };
    items = copy;
  } else {
    items = [next, ...items].slice(0, MAX_ITEMS);
  }
  notifyListeners();
}

export function pushLeadCalledBackNotification(payload: LeadCalledBackPayload): void {
  const notificationId =
    payload.notification_id != null ? Number(payload.notification_id) : null;
  const id =
    notificationId != null
      ? `db-${notificationId}`
      : `${payload.record_id}-${Date.now()}`;

  upsertItem({
    id,
    notificationId: Number.isFinite(notificationId as number) ? notificationId : null,
    payload: {
      ...payload,
      notification_id: notificationId,
    },
    receivedAt: new Date().toISOString(),
    read: false,
  });
}

/** Load unread rows from in_app_notifications so refresh keeps them. */
export async function hydrateLeadCalledBackNotifications(): Promise<void> {
  if (hydratePromise) return hydratePromise;

  hydratePromise = (async () => {
    try {
      const rows = await fetchUnreadInAppNotifications();
      for (const row of rows) {
        if (row.notification_type !== "lead_called_back") continue;
        const payload = inAppNotificationToPayload(row);
        upsertItem({
          id: `db-${row.id}`,
          notificationId: row.id,
          payload,
          receivedAt: row.created_at,
          read: Boolean(row.read_at),
        });
      }
    } catch (error) {
      console.warn("[lead-called-back] Failed to hydrate notifications", error);
    } finally {
      hydratePromise = null;
    }
  })();

  return hydratePromise;
}

/**
 * Mark one notification as read in DB (when we have an id) and remove it from the inbox.
 */
export async function markLeadCalledBackNotificationRead(
  item: LeadCalledBackNotificationItem,
): Promise<void> {
  items = items.map((existing) =>
    existing.id === item.id ? { ...existing, read: true } : existing,
  );
  notifyListeners();
  clearLeadHighlightForNotification(item);

  if (item.notificationId == null) return;

  try {
    await markInAppNotificationRead(item.notificationId);
  } catch (error) {
    console.warn("[lead-called-back] Failed to mark notification read", error);
    // Keep local read=true so it doesn't bounce back immediately; hydrate will reconcile.
  }
}

export function subscribeLeadCalledBackNotifications(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
