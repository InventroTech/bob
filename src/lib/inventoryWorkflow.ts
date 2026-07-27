/**
 * Inventory request flow:
 *
 *   NEW_REQUEST / ON_HOLD
 *     → (team lead OR PM Approve) VENDOR_IDENTIFIED
 *     → (team lead OR PM Reject / Send to verify / Hold)
 *   REQ_TO_VERIFY
 *     → (requestor Verify) VENDOR_IDENTIFIED
 *   VENDOR_IDENTIFIED
 *     → (team lead OR PM Order / Hold)
 *
 * Rules:
 * - Team lead can Approve/Reject, including on requests they created.
 * - PM can Approve/Reject other people's requests, but NOT their own
 *   (on their own request they are treated like a requestor).
 * - Plain requestors only get Verify on REQ_TO_VERIFY.
 */

export const INVENTORY_APPROVABLE_STATUSES = new Set([
  'NEW_REQUEST',
  'ON_HOLD',
]);

export const INVENTORY_HOLDABLE_STATUSES = new Set([
  'NEW_REQUEST',
  'VENDOR_IDENTIFIED',
]);

export const INVENTORY_ORDERABLE_STATUSES = new Set([
  'VENDOR_IDENTIFIED',
]);

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

function idsMatch(
  left: number | string | null | undefined,
  right: unknown
): boolean {
  if (left == null || right == null || right === '') return false;
  const a = String(left).trim();
  const b = String(right).trim();
  return !!a && !!b && a === b;
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

/** Procurement / manager-like roles. */
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

/** True when the current user is the record's team_lead. */
export function isAssignedInventoryTeamLead(
  membershipId: number | string | null | undefined,
  teamLeadOnRecord: unknown,
  userId?: number | string | null
): boolean {
  return idsMatch(membershipId, teamLeadOnRecord) || idsMatch(userId, teamLeadOnRecord);
}

/** True when the current user is the record's manager (PM). */
export function isAssignedInventoryManager(
  membershipId: number | string | null | undefined,
  managerOnRecord: unknown,
  userId?: number | string | null
): boolean {
  return idsMatch(membershipId, managerOnRecord) || idsMatch(userId, managerOnRecord);
}

function isTeamLeadActor(opts: {
  roleNameOrKey?: string | null;
  roleKey?: string | null;
  membershipId?: number | string | null;
  userId?: number | string | null;
  teamLeadOnRecord?: unknown;
}): boolean {
  const roles = [opts.roleNameOrKey, opts.roleKey];
  if (roles.some((r) => isInventoryTeamLeadRole(r))) return true;
  return isAssignedInventoryTeamLead(opts.membershipId, opts.teamLeadOnRecord, opts.userId);
}

/** Team lead or PM — can Approve / Reject (PM excluded when acting as requestor). */
export function isInventoryApproverActor(opts: {
  roleNameOrKey?: string | null;
  roleKey?: string | null;
  membershipId?: number | string | null;
  userId?: number | string | null;
  teamLeadOnRecord?: unknown;
  managerOnRecord?: unknown;
  workflowMode?: InventoryWorkflowMode | null;
  isRequester?: boolean;
}): boolean {
  const isTl = isTeamLeadActor(opts);
  // Team lead may Approve even on their own request.
  if (isTl) return true;

  // PM (and anyone else) cannot Approve/Reject a request they created.
  if (opts.isRequester) return false;

  const roles = [opts.roleNameOrKey, opts.roleKey];
  if (roles.some((r) => isInventoryProcurementRole(r))) return true;
  if (isAssignedInventoryManager(opts.membershipId, opts.managerOnRecord, opts.userId)) {
    return true;
  }
  if (opts.workflowMode === 'manager' || opts.workflowMode === 'team_lead') return true;
  return false;
}

/**
 * Built-in workflow buttons.
 * Team lead: Approve/Reject (including own requests).
 * PM: Approve/Reject others' requests only — own requests = requestor (Verify only).
 */
export function getInventoryWorkflowButtons(opts: {
  requestStatus: unknown;
  roleNameOrKey?: string | null | undefined;
  roleKey?: string | null | undefined;
  membershipId?: number | string | null;
  userId?: number | string | null;
  teamLeadOnRecord?: unknown;
  managerOnRecord?: unknown;
  isRequester?: boolean;
  workflowMode?: InventoryWorkflowMode | null;
}): InventoryWorkflowActionButton[] {
  const status = normalizeStatus(opts.requestStatus);
  const buttons: InventoryWorkflowActionButton[] = [];
  const isApprover = isInventoryApproverActor(opts);

  if (!isApprover) {
    if (opts.isRequester && status === 'REQ_TO_VERIFY') {
      buttons.push({
        label: 'Verify',
        statusValue: 'VENDOR_IDENTIFIED',
        statusText: 'VENDOR_IDENTIFIED',
      });
    }
    return buttons;
  }

  if (INVENTORY_APPROVABLE_STATUSES.has(status)) {
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

  if (INVENTORY_HOLDABLE_STATUSES.has(status)) {
    buttons.push({
      label: 'Put on Hold',
      statusValue: 'ON_HOLD',
      statusText: 'ON_HOLD',
    });
  }

  if (INVENTORY_ORDERABLE_STATUSES.has(status)) {
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
