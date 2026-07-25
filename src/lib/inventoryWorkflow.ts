/**
 * Inventory request flow on the existing status architecture:
 *
 *   NEW_REQUEST
 *     → (manager Approve) VENDOR_IDENTIFIED
 *     → (manager Send to requestor to verify) REQ_TO_VERIFY
 *     → (manager Reject) REJECTED
 *     → (manager Put on Hold) ON_HOLD
 *   ON_HOLD
 *     → (manager Approve) VENDOR_IDENTIFIED
 *     → (manager Send to requestor to verify) REQ_TO_VERIFY
 *     → (manager Reject) REJECTED
 *   REQ_TO_VERIFY
 *     → (requestor Verify) VENDOR_IDENTIFIED
 *   VENDOR_IDENTIFIED
 *     → (team lead Order) IN_SHIPPING
 *     → (manager Put on Hold) ON_HOLD
 *   IN_SHIPPING → shipment tracking (paste link/AWB)
 *
 * Page Builder can set inventoryWorkflowMode:
 *   - manager   → Approve / Reject / Put on Hold / Send to verify
 *   - team_lead → Order only (no Approve / Reject on new requests)
 *   - auto      → infer from membership role
 */

export const INVENTORY_APPROVABLE_STATUSES = new Set([
  'NEW_REQUEST',
  'ON_HOLD',
]);

/** Statuses where a procurement manager can put the request on hold. */
export const INVENTORY_HOLDABLE_STATUSES = new Set([
  'NEW_REQUEST',
  'VENDOR_IDENTIFIED',
]);

/** Statuses where Order is available (moves request into shipping). */
export const INVENTORY_ORDERABLE_STATUSES = new Set([
  'VENDOR_IDENTIFIED',
]);

/** Page Builder status values that duplicate built-in workflow buttons. */
export const INVENTORY_WORKFLOW_BUILTIN_STATUS_VALUES = new Set([
  'VENDOR_IDENTIFIED',
  'REQ_TO_VERIFY',
  'REJECTED',
  'IN_SHIPPING',
  'ON_HOLD',
]);

export type InventoryWorkflowMode = 'auto' | 'manager' | 'team_lead';

export type InventoryWorkflowActionButton = {
  label: string;
  statusValue: string;
  statusText?: string;
  targetAttribute?: string;
};

function normalizeRole(role: string | null | undefined): string {
  return String(role ?? '')
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, '_');
}

function normalizeStatus(status: unknown): string {
  return String(status ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_');
}

/** Team-lead-like role from membership role_key / role_name. */
export function isInventoryTeamLeadRole(role: string | null | undefined): boolean {
  const r = normalizeRole(role);
  if (!r) return false;
  if (r === 'tl' || r === 'team_lead' || r === 'teamlead' || r === 'lead') return true;
  if (r.startsWith('tl_') || r.endsWith('_tl') || r.includes('_tl_')) return true;
  if (r.includes('team_lead') || r.includes('teamlead')) return true;
  if (r.includes('team') && r.includes('lead')) return true;
  return false;
}

/** Procurement / manager-like roles (All Requests actors). */
export function isInventoryProcurementRole(role: string | null | undefined): boolean {
  const r = normalizeRole(role);
  if (!r) return false;
  if (isInventoryTeamLeadRole(role)) return false;
  return (
    r.includes('procurement') ||
    r.includes('manager') ||
    r.includes('admin') ||
    r === 'pm' ||
    r.includes('project_manager') ||
    r.includes('gm') ||
    r.includes('head')
  );
}

/**
 * True when the current user is the record's team_lead.
 * `team_lead` may be a tenant membership id or (legacy) auth user id.
 */
export function isAssignedInventoryTeamLead(
  membershipId: number | string | null | undefined,
  teamLeadOnRecord: unknown,
  userId?: number | string | null
): boolean {
  if (teamLeadOnRecord == null || teamLeadOnRecord === '') return false;
  const tl = String(teamLeadOnRecord).trim();
  if (!tl) return false;
  if (membershipId != null && String(membershipId).trim() === tl) return true;
  if (userId != null && String(userId).trim() === tl) return true;
  return false;
}

function resolveWorkflowMode(opts: {
  workflowMode?: InventoryWorkflowMode | null;
  roleNameOrKey?: string | null;
  roleKey?: string | null;
}): 'manager' | 'team_lead' {
  if (opts.workflowMode === 'manager' || opts.workflowMode === 'team_lead') {
    return opts.workflowMode;
  }
  const roles = [opts.roleNameOrKey, opts.roleKey];
  if (roles.some((r) => isInventoryTeamLeadRole(r))) return 'team_lead';
  if (roles.some((r) => isInventoryProcurementRole(r))) return 'manager';
  // Unknown role: default to manager-style approve (safe for Manager All Requests).
  // Team-lead pages should set inventoryWorkflowMode=team_lead in Page Builder.
  return 'manager';
}

/**
 * Built-in Approve / Reject / Put on Hold / Send to verify / Order / Verify for the record form modal.
 *
 * Manager: Approve/Reject/Send-to-verify on NEW_REQUEST or ON_HOLD; Put on Hold on open requests.
 * Requestor: Verify on REQ_TO_VERIFY only.
 * Team lead: Order on VENDOR_IDENTIFIED (never Approve/Reject).
 */
export function getInventoryWorkflowButtons(opts: {
  requestStatus: unknown;
  roleNameOrKey?: string | null | undefined;
  roleKey?: string | null | undefined;
  membershipId?: number | string | null;
  userId?: number | string | null;
  teamLeadOnRecord?: unknown;
  isRequester?: boolean;
  /** Page-level override: manager All Requests vs team-lead All Requests. */
  workflowMode?: InventoryWorkflowMode | null;
}): InventoryWorkflowActionButton[] {
  const status = normalizeStatus(opts.requestStatus);
  const buttons: InventoryWorkflowActionButton[] = [];

  if (opts.isRequester) {
    if (status === 'REQ_TO_VERIFY') {
      buttons.push({
        label: 'Verify',
        statusValue: 'VENDOR_IDENTIFIED',
        statusText: 'VENDOR_IDENTIFIED',
      });
    }
    return buttons;
  }

  const mode = resolveWorkflowMode(opts);

  if (mode === 'manager' && INVENTORY_APPROVABLE_STATUSES.has(status)) {
    buttons.push(
      {
        label: 'Approve',
        statusValue: 'VENDOR_IDENTIFIED',
        statusText: 'VENDOR_IDENTIFIED',
      },
      {
        label: 'Send to requestor to verify',
        statusValue: 'REQ_TO_VERIFY',
        statusText: 'REQ TO VERIFY',
      },
      { label: 'Reject', statusValue: 'REJECTED', statusText: 'REJECTED' }
    );
  }

  if (mode === 'manager' && INVENTORY_HOLDABLE_STATUSES.has(status)) {
    buttons.push({
      label: 'Put on Hold',
      statusValue: 'ON_HOLD',
      statusText: 'ON_HOLD',
    });
  }

  if (mode === 'team_lead' && INVENTORY_ORDERABLE_STATUSES.has(status)) {
    buttons.push({
      label: 'Order',
      statusValue: 'IN_SHIPPING',
      statusText: 'IN_SHIPPING',
    });
  }

  return buttons;
}

/** Drop Page Builder buttons that would duplicate built-in workflow actions. */
export function filterDuplicateInventoryWorkflowButtons<
  T extends { statusValue?: string; label?: string },
>(buttons: T[] | undefined | null): T[] {
  if (!Array.isArray(buttons)) return [];
  return buttons.filter((btn) => {
    const value = normalizeStatus(btn.statusValue);
    if (!value) return true;
    return !INVENTORY_WORKFLOW_BUILTIN_STATUS_VALUES.has(value);
  });
}
