export type OpenLeadRequest = {
  record_id: string;
  praja_id?: string | null;
  lead_name?: string | null;
  /** in_app_notifications id — highlight clears when this is marked read */
  notification_id?: number | null;
  /** Local inbox item id (e.g. `db-123`) */
  notification_item_id?: string | null;
};

export const PYRO_OPEN_LEAD = "pyro-open-lead";
export const PYRO_NAVIGATE_TO_LEAD = "pyro-navigate-to-lead";
export const PYRO_CLEAR_LEAD_HIGHLIGHT = "pyro-clear-lead-highlight";
export const PYRO_LEAD_HIGHLIGHT_CHANGED = "pyro-lead-highlight-changed";

/** Legacy key — cleared on access so old phone-containing entries are purged. */
const LEGACY_OPEN_LEAD_HIGHLIGHT_KEY = "pyro-open-lead-highlight";

export type OpenLeadHighlightStash = {
  record_id: string;
  praja_id?: string | null;
  lead_name?: string | null;
  notification_id?: number | null;
  notification_item_id?: string | null;
};

let pendingOpenLead: OpenLeadRequest | null = null;
/** In-memory only — never write PII (e.g. phone) to session/local storage. */
let activeHighlight: OpenLeadHighlightStash | null = null;
/** Pathname of the last mounted All Leads table, e.g. `/app/praja/pages/<id>`. */
let registeredAllLeadsPath: string | null = null;

function emitHighlightChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PYRO_LEAD_HIGHLIGHT_CHANGED));
}

function purgeLegacyHighlightStorage(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(LEGACY_OPEN_LEAD_HIGHLIGHT_KEY);
  } catch {
    // ignore
  }
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

/**
 * Coerce CRM / Praja ids without turning null/undefined into "null" / "undefined".
 */
export function normalizeOpenLeadId(value: unknown): string {
  if (value == null) return "";
  const s = String(value).trim();
  if (!s || s === "null" || s === "undefined") return "";
  return s;
}

/**
 * Keep highlight in memory until the notification is marked as read.
 * Does not use sessionStorage/localStorage (CodeQL clear-text storage).
 */
function hasOpenLeadIdentity(request: {
  record_id?: string | null;
  praja_id?: string | null;
}): boolean {
  return Boolean(normalizeOpenLeadId(request.record_id) || normalizeOpenLeadId(request.praja_id));
}

export function stashOpenLeadHighlight(request: OpenLeadRequest): void {
  if (!hasOpenLeadIdentity(request)) return;
  purgeLegacyHighlightStorage();

  const existing = activeHighlight;
  const requestRecordId = normalizeOpenLeadId(request.record_id);
  const requestPrajaId = normalizeOpenLeadId(request.praja_id);
  // Only fill missing fields from the previous stash when it is the same lead.
  // Otherwise a praja-only open would inherit another lead's record_id.
  const sameLead =
    existing != null &&
    ((requestRecordId !== "" &&
      normalizeOpenLeadId(existing.record_id) === requestRecordId) ||
      (requestPrajaId !== "" &&
        normalizeOpenLeadId(existing.praja_id) === requestPrajaId));

  const recordId =
    requestRecordId ||
    (sameLead ? normalizeOpenLeadId(existing?.record_id) : "");
  const prajaId =
    requestPrajaId ||
    (sameLead ? normalizeOpenLeadId(existing?.praja_id) : "") ||
    null;
  const leadName =
    request.lead_name != null && String(request.lead_name).trim() !== ""
      ? String(request.lead_name)
      : sameLead && existing?.lead_name != null
        ? String(existing.lead_name)
        : null;
  const notificationId =
    request.notification_id != null
      ? Number(request.notification_id)
      : sameLead && existing?.notification_id != null
        ? Number(existing.notification_id)
        : null;
  const notificationItemId =
    request.notification_item_id != null
      ? String(request.notification_item_id)
      : sameLead && existing?.notification_item_id != null
        ? String(existing.notification_item_id)
        : null;

  activeHighlight = {
    record_id: recordId,
    praja_id: prajaId,
    lead_name: leadName,
    notification_id: Number.isFinite(notificationId as number) ? notificationId : null,
    notification_item_id: notificationItemId,
  };
  emitHighlightChanged();
}

export function getActiveLeadHighlight(): OpenLeadHighlightStash | null {
  purgeLegacyHighlightStorage();
  if (!activeHighlight) return null;
  return hasOpenLeadIdentity(activeHighlight) ? activeHighlight : null;
}

export function peekOpenLeadHighlight(): OpenLeadHighlightStash | null {
  return getActiveLeadHighlight();
}

export function clearOpenLeadHighlightStash(): void {
  activeHighlight = null;
  purgeLegacyHighlightStorage();
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
  const praja = row?.praja_id ?? row?.data?.praja_id;
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
  if (praja) return `${name} · Praja ID: ${praja}`;
  const recordId = request.record_id?.trim();
  if (recordId) return `${name} · Record #${recordId}`;
  return name;
}

function buildOpenLeadSearch(request: OpenLeadRequest): string {
  const params = new URLSearchParams();
  const recordId = normalizeOpenLeadId(request.record_id);
  const prajaId = normalizeOpenLeadId(request.praja_id);
  if (recordId) params.set("open_lead", recordId);
  if (prajaId) params.set("praja_id", prajaId);
  if (request.lead_name) params.set("lead_name", String(request.lead_name));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/**
 * Open a lead from a WhatsApp call-back notification.
 * Highlight stays until the notification is marked as read.
 * Requires record_id and/or praja_id (praja-only is allowed when CRM id is missing).
 */
export function requestOpenLead(
  request: OpenLeadRequest,
  options?: { allLeadsPath?: string | null },
): void {
  if (!hasOpenLeadIdentity(request)) return;

  const safeRequest: OpenLeadRequest = {
    record_id: normalizeOpenLeadId(request.record_id),
    praja_id: normalizeOpenLeadId(request.praja_id) || null,
    lead_name: request.lead_name ?? null,
    notification_id: request.notification_id ?? null,
    notification_item_id: request.notification_item_id ?? null,
  };

  pendingOpenLead = safeRequest;
  // Set highlight immediately so All Leads can paint the row as soon as it mounts.
  stashOpenLeadHighlight(safeRequest);

  if (typeof window === "undefined") return;

  const targetPath =
    (options?.allLeadsPath || registeredAllLeadsPath || "").split("?")[0] || null;

  if (!targetPath) {
    window.dispatchEvent(
      new CustomEvent<OpenLeadRequest>(PYRO_OPEN_LEAD, { detail: safeRequest }),
    );
    return;
  }

  const search = buildOpenLeadSearch(safeRequest);
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
      new CustomEvent<OpenLeadRequest>(PYRO_OPEN_LEAD, { detail: safeRequest }),
    );
  }, alreadyOnPage ? 50 : 500);

  // Second poke in case the first landed while the table was still loading.
  window.setTimeout(() => {
    window.dispatchEvent(
      new CustomEvent<OpenLeadRequest>(PYRO_OPEN_LEAD, { detail: safeRequest }),
    );
  }, alreadyOnPage ? 400 : 1200);
}
