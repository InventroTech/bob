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

  // WS without notification_id uses an ephemeral id (`${record}-${Date.now()}` or
  // lead:record:praja). Hydrate then inserts `db-${id}` — upsert on record/praja
  // only when at least one side is missing a DB id (do not collapse two real DB rows).
  return items.findIndex((item) => {
    if (item.read) return false;
    if (item.notificationId != null && next.notificationId != null) return false;
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
          : next.id.startsWith("db-")
            ? next.id
            : next.id.startsWith("lead:")
              ? next.id
              : existing.id.startsWith("lead:")
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
        record_id:
          normalizeOpenLeadId(next.payload.record_id) ||
          normalizeOpenLeadId(existing.payload.record_id),
        notification_id: notificationId,
        lead_name: next.payload.lead_name ?? existing.payload.lead_name,
        praja_id: next.payload.praja_id ?? existing.payload.praja_id,
      },
      // Prefer the earlier receivedAt so the inbox order stays stable.
      receivedAt: existing.receivedAt || next.receivedAt,
      read: existing.read || next.read,
    };
    items = copy;
  } else {
    items = [next, ...items].slice(0, MAX_ITEMS);
  }
  notifyListeners();
}

export function pushLeadCalledBackNotification(payload: LeadCalledBackPayload): void {
  const rawNid = payload.notification_id;
  const notificationId =
    rawNid != null && Number.isFinite(Number(rawNid)) && Number(rawNid) > 0
      ? Number(rawNid)
      : null;
  const recordId = normalizeOpenLeadId(payload.record_id);
  const prajaId = normalizeOpenLeadId(payload.praja_id);
  // Stable key when DB id is missing so repeat WS frames upsert; hydrate merges via identity.
  const id =
    notificationId != null
      ? `db-${notificationId}`
      : `lead:${recordId}:${prajaId}`;

  upsertItem({
    id,
    notificationId,
    payload: {
      ...payload,
      record_id: recordId,
      praja_id: prajaId || null,
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
