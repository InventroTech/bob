export type OpenLeadRequest = {
  record_id: string;
  praja_id?: string | null;
  lead_name?: string | null;
  phone_number?: string | null;
  /** in_app_notifications id — highlight clears when this is marked read */
  notification_id?: number | null;
  /** Local inbox item id (e.g. `db-123`) */
  notification_item_id?: string | null;
};

export const PYRO_OPEN_LEAD = "pyro-open-lead";
export const PYRO_NAVIGATE_TO_LEAD = "pyro-navigate-to-lead";
export const PYRO_CLEAR_LEAD_HIGHLIGHT = "pyro-clear-lead-highlight";
export const PYRO_LEAD_HIGHLIGHT_CHANGED = "pyro-lead-highlight-changed";

const OPEN_LEAD_HIGHLIGHT_KEY = "pyro-open-lead-highlight";

export type OpenLeadHighlightStash = {
  record_id: string;
  praja_id?: string | null;
  lead_name?: string | null;
  phone_number?: string | null;
  notification_id?: number | null;
  notification_item_id?: string | null;
};

let pendingOpenLead: OpenLeadRequest | null = null;
let activeHighlight: OpenLeadHighlightStash | null = null;
/** Pathname of the last mounted All Leads table, e.g. `/app/praja/pages/<id>`. */
let registeredAllLeadsPath: string | null = null;

function emitHighlightChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PYRO_LEAD_HIGHLIGHT_CHANGED));
}

export function registerAllLeadsPath(pathname: string): void {
  if (!pathname) return;
  registeredAllLeadsPath = pathname.split("?")[0];
}

export function getRegisteredAllLeadsPath(): string | null {
  return registeredAllLeadsPath;
}

export function getPendingOpenLead(): OpenLeadRequest | null {
  return pendingOpenLead;
}

export function consumePendingOpenLead(): OpenLeadRequest | null {
  const pending = pendingOpenLead;
  pendingOpenLead = null;
  return pending;
}

function readStashFromSession(): OpenLeadHighlightStash | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(OPEN_LEAD_HIGHLIGHT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OpenLeadHighlightStash;
    if (!parsed?.record_id) {
      window.sessionStorage.removeItem(OPEN_LEAD_HIGHLIGHT_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Survives All Leads remount until the notification is marked as read. */
export function stashOpenLeadHighlight(request: OpenLeadRequest): void {
  if (!request.record_id) return;
  const existing = getActiveLeadHighlight();
  const stash: OpenLeadHighlightStash = {
    record_id: String(request.record_id),
    praja_id: request.praja_id ?? existing?.praja_id ?? null,
    lead_name: request.lead_name ?? existing?.lead_name ?? null,
    phone_number: request.phone_number ?? existing?.phone_number ?? null,
    notification_id: request.notification_id ?? existing?.notification_id ?? null,
    notification_item_id:
      request.notification_item_id ?? existing?.notification_item_id ?? null,
  };
  activeHighlight = stash;
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.setItem(OPEN_LEAD_HIGHLIGHT_KEY, JSON.stringify(stash));
    } catch {
      // ignore quota / private mode
    }
  }
  emitHighlightChanged();
}

export function getActiveLeadHighlight(): OpenLeadHighlightStash | null {
  if (activeHighlight?.record_id) return activeHighlight;
  const fromSession = readStashFromSession();
  if (fromSession) {
    activeHighlight = fromSession;
    return fromSession;
  }
  return null;
}

export function peekOpenLeadHighlight(): OpenLeadHighlightStash | null {
  return getActiveLeadHighlight();
}

export function clearOpenLeadHighlightStash(): void {
  activeHighlight = null;
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(OPEN_LEAD_HIGHLIGHT_KEY);
  } catch {
    // ignore
  }
}

export function dispatchClearLeadHighlight(): void {
  clearOpenLeadHighlightStash();
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PYRO_CLEAR_LEAD_HIGHLIGHT));
  emitHighlightChanged();
}

/** Clear the All Leads highlight when this inbox item is marked as read. */
export function clearLeadHighlightForNotification(item: {
  id: string;
  notificationId: number | null;
  payload: {
    record_id: string;
    praja_id?: string | null;
  };
}): void {
  const stash = getActiveLeadHighlight();
  if (!stash) {
    dispatchClearLeadHighlight();
    return;
  }

  const sameNotification =
    (item.notificationId != null &&
      stash.notification_id != null &&
      Number(stash.notification_id) === Number(item.notificationId)) ||
    (stash.notification_item_id != null &&
      stash.notification_item_id === item.id);

  const sameLead =
    String(stash.record_id) === String(item.payload.record_id) ||
    (stash.praja_id != null &&
      item.payload.praja_id != null &&
      String(stash.praja_id) === String(item.payload.praja_id));

  if (sameNotification || sameLead) {
    dispatchClearLeadHighlight();
  }
}

export function rowMatchesLeadHighlight(
  row: any,
  stash: OpenLeadHighlightStash | null = getActiveLeadHighlight(),
): boolean {
  if (!stash || !row) return false;

  // Prefer Praja ID — phone can be shared across test leads.
  const praja = row?.praja_id ?? row?.data?.praja_id ?? row?.data?.user_id;
  if (
    stash.praja_id != null &&
    String(stash.praja_id).trim() !== "" &&
    praja != null &&
    String(praja) !== "N/A" &&
    String(praja) === String(stash.praja_id)
  ) {
    return true;
  }

  // Fall back to CRM record id only when Praja ID is unavailable on the stash.
  if (stash.praja_id == null || String(stash.praja_id).trim() === "") {
    const id = row?.id != null ? String(row.id) : "";
    const rid = row?.record_id != null ? String(row.record_id) : "";
    if (id === String(stash.record_id) || rid === String(stash.record_id)) return true;
  }

  return false;
}

export function formatOpenLeadIdentity(request: OpenLeadRequest): string {
  const name = request.lead_name?.trim() || "Lead";
  const praja = request.praja_id?.trim();
  const phone = request.phone_number?.trim();
  if (praja) return `${name} · Praja ID: ${praja}`;
  if (phone) return `${name} · ${phone}`;
  return `${name} · Record #${request.record_id}`;
}

function buildOpenLeadSearch(request: OpenLeadRequest): string {
  const params = new URLSearchParams();
  params.set("open_lead", String(request.record_id));
  if (request.praja_id) params.set("praja_id", String(request.praja_id));
  if (request.lead_name) params.set("lead_name", String(request.lead_name));
  return `?${params.toString()}`;
}

/**
 * Open a lead from a WhatsApp call-back notification.
 * Highlight stays until the notification is marked as read.
 */
export function requestOpenLead(
  request: OpenLeadRequest,
  options?: { allLeadsPath?: string | null },
): void {
  if (!request.record_id) return;

  pendingOpenLead = request;
  // Set highlight immediately so All Leads can paint the row as soon as it mounts.
  stashOpenLeadHighlight(request);

  if (typeof window === "undefined") return;

  const targetPath =
    (options?.allLeadsPath || registeredAllLeadsPath || "").split("?")[0] || null;

  if (!targetPath) {
    window.dispatchEvent(
      new CustomEvent<OpenLeadRequest>(PYRO_OPEN_LEAD, { detail: request }),
    );
    return;
  }

  const search = buildOpenLeadSearch(request);
  const alreadyOnPage = window.location.pathname === targetPath;

  window.dispatchEvent(
    new CustomEvent<{ pathname: string; search: string; replace: boolean }>(
      PYRO_NAVIGATE_TO_LEAD,
      {
        detail: {
          pathname: targetPath,
          search,
          replace: alreadyOnPage,
        },
      },
    ),
  );

  // Always poke the table: immediately if already there, else after mount.
  window.setTimeout(() => {
    window.dispatchEvent(
      new CustomEvent<OpenLeadRequest>(PYRO_OPEN_LEAD, { detail: request }),
    );
  }, alreadyOnPage ? 50 : 500);

  // Second poke in case the first landed while the table was still loading.
  window.setTimeout(() => {
    window.dispatchEvent(
      new CustomEvent<OpenLeadRequest>(PYRO_OPEN_LEAD, { detail: request }),
    );
  }, alreadyOnPage ? 400 : 1200);
}
