import type { LeadCalledBackPayload } from "@/lib/realtime/types";
import {
  fetchUnreadInAppNotifications,
  inAppNotificationToPayload,
  markInAppNotificationRead,
} from "@/lib/api/services/inAppNotifications";
import {
  clearLeadHighlightForNotification,
  normalizeOpenLeadId,
} from "@/lib/realtime/openLeadBus";

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
/** Bumps on clear so an in-flight hydrate cannot repopulate after logout. */
let hydrateGeneration = 0;

function notifyListeners(): void {
  listeners.forEach((listener) => listener());
}

export function getLeadCalledBackNotifications(): LeadCalledBackNotificationItem[] {
  return items.filter((item) => !item.read);
}

export function getUnreadLeadCalledBackCount(): number {
  return items.filter((item) => !item.read).length;
}

function sameLeadIdentity(
  a: LeadCalledBackNotificationItem,
  b: LeadCalledBackNotificationItem,
): boolean {
  const aRecord = normalizeOpenLeadId(a.payload.record_id);
  const bRecord = normalizeOpenLeadId(b.payload.record_id);
  if (aRecord && bRecord && aRecord === bRecord) return true;

  const aPraja = normalizeOpenLeadId(a.payload.praja_id);
  const bPraja = normalizeOpenLeadId(b.payload.praja_id);
  if (aPraja && bPraja && aPraja === bPraja) return true;

  return false;
}

function findMergeIndex(next: LeadCalledBackNotificationItem): number {
  if (next.notificationId != null) {
    const byNotification = items.findIndex(
      (item) => item.notificationId === next.notificationId,
    );
    if (byNotification >= 0) return byNotification;
  }

  const byId = items.findIndex((item) => item.id === next.id);
  if (byId >= 0) return byId;

  // WS may arrive without notification_id (`${record}-${Date.now()}`) before hydrate
  // inserts `db-${id}` — merge unread rows for the same lead so the inbox stays unique.
  return items.findIndex((item) => {
    if (item.read) return false;
    return sameLeadIdentity(item, next);
  });
}

function upsertItem(next: LeadCalledBackNotificationItem): void {
  const idx = findMergeIndex(next);

  if (idx >= 0) {
    const existing = items[idx];
    // Never revive a notification that was already marked read locally.
    if (existing.read && next.read === false) {
      return;
    }
    const notificationId = next.notificationId ?? existing.notificationId;
    const preferredId =
      notificationId != null
        ? `db-${notificationId}`
        : existing.id.startsWith("db-")
          ? existing.id
          : next.id;
    const copy = items.slice();
    copy[idx] = {
      ...existing,
      ...next,
      id: preferredId,
      notificationId,
      payload: {
        ...existing.payload,
        ...next.payload,
        notification_id: notificationId,
        lead_name: next.payload.lead_name ?? existing.payload.lead_name,
        praja_id: next.payload.praja_id ?? existing.payload.praja_id,
      },
      read: existing.read || next.read,
    };
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
    notificationId != null && Number.isFinite(notificationId)
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

  const generation = hydrateGeneration;
  hydratePromise = (async () => {
    try {
      const rows = await fetchUnreadInAppNotifications();
      if (generation !== hydrateGeneration) return;
      for (const row of rows) {
        if (generation !== hydrateGeneration) return;
        if (row.notification_type !== "lead_called_back") continue;
        const payload = inAppNotificationToPayload(row);
        upsertItem({
          id: `db-${row.id}`,
          notificationId: row.id,
          payload,
          receivedAt: row.created_at,
          read: Boolean(row.read_at) || row.is_read === true,
        });
      }
    } catch (error) {
      console.warn("[lead-called-back] Failed to hydrate notifications", error);
    } finally {
      if (generation === hydrateGeneration) {
        hydratePromise = null;
      }
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

/** Drop in-memory inbox (logout / session end / spoof switch). */
export function clearLeadCalledBackNotifications(): void {
  items = [];
  hydratePromise = null;
  hydrateGeneration += 1;
  notifyListeners();
}
