/**
 * Simple inventory request workflow:
 * NEW_REQUEST → (manager/staff Approve) APPROVED → (team lead Order) ORDERED
 */

export const INVENTORY_SIMPLE_STATUSES = [
  'NEW_REQUEST',
  'APPROVED',
  'ORDERED',
  'IN_SHIPPING',
  'FULFILLED',
  'REJECTED',
] as const;

export type InventorySimpleStatus = (typeof INVENTORY_SIMPLE_STATUSES)[number];

/** Statuses that still need manager Approve (includes legacy create defaults). */
export const INVENTORY_APPROVABLE_STATUSES = new Set([
  'NEW_REQUEST',
  'DRAFT',
  'PENDING_PM',
]);

/** Page Builder / legacy status values that conflict with the simple approve→order flow. */
export const INVENTORY_WORKFLOW_CONFLICTING_STATUS_VALUES = new Set([
  'NEW_REQUEST',
  'APPROVED',
  'ORDERED',
  'REJECTED',
  'APPROVED(1/2)',
  'APPROVED(2/2)',
  'IN_CART',
  'PAID',
  'DRAFT',
  'PENDING_PM',
  'VENDOR_IDENTIFIED',
  'PAYMENT_PENDING',
]);

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

/** Team-lead-like role from membership role_key / role_name. */
export function isInventoryTeamLeadRole(role: string | null | undefined): boolean {
  const r = normalizeRole(role);
  if (!r) return false;
  if (r === 'tl' || r === 'team_lead' || r === 'teamlead') return true;
  if (r.includes('team_lead') || r.includes('teamlead')) return true;
  return false;
}

/** Manager-like role (Approve / Reject). Excludes pure team-lead roles. */
export function isInventoryManagerRole(role: string | null | undefined): boolean {
  const r = normalizeRole(role);
  if (!r) return false;
  if (isInventoryTeamLeadRole(role)) return false;
  return (
    r.includes('manager') ||
    r.includes('admin') ||
    r.includes('procurement') ||
    r === 'pm' ||
    r.includes('project_manager') ||
    r.includes('gm') ||
    r.includes('head')
  );
}

export function isAssignedInventoryTeamLead(
  membershipId: number | string | null | undefined,
  teamLeadOnRecord: unknown
): boolean {
  if (membershipId == null || teamLeadOnRecord == null || teamLeadOnRecord === '') return false;
  return String(membershipId) === String(teamLeadOnRecord);
}

/**
 * Built-in Approve / Reject / Order buttons for the current user + request status.
 *
 * Approve: managers (broad role match) OR any non-team-lead staff who isn't the requestor
 *   — so All Requests never ends up Save-only when role naming differs.
 * Order: team-lead role OR assigned team_lead on the record, only when APPROVED.
 */
export function getSimpleInventoryWorkflowButtons(opts: {
  requestStatus: unknown;
  roleNameOrKey: string | null | undefined;
  /** Optional second role string (e.g. role_key when roleNameOrKey is role_name). */
  roleKey?: string | null | undefined;
  membershipId?: number | string | null;
  teamLeadOnRecord?: unknown;
  /** When true, never show Approve/Reject (requestor viewing own request). */
  isRequester?: boolean;
}): InventoryWorkflowActionButton[] {
  const status = String(opts.requestStatus ?? '')
    .trim()
    .toUpperCase();
  const isTeamLead =
    isInventoryTeamLeadRole(opts.roleNameOrKey) ||
    isInventoryTeamLeadRole(opts.roleKey) ||
    isAssignedInventoryTeamLead(opts.membershipId, opts.teamLeadOnRecord);

  // Approve: anyone on All Requests who is not the requestor and not the team lead.
  // (Role names vary; requiring "manager" in the name caused Save-only modals.)
  const showApprove = !opts.isRequester && !isTeamLead && INVENTORY_APPROVABLE_STATUSES.has(status);

  const buttons: InventoryWorkflowActionButton[] = [];

  if (showApprove) {
    buttons.push(
      { label: 'Approve', statusValue: 'APPROVED', statusText: 'APPROVED' },
      { label: 'Reject', statusValue: 'REJECTED', statusText: 'REJECTED' }
    );
  }

  if (isTeamLead && status === 'APPROVED') {
    buttons.push({ label: 'Order', statusValue: 'ORDERED', statusText: 'ORDERED' });
  }

  return buttons;
}

/** Strip Page Builder buttons that would fight the simple workflow transitions. */
export function filterConflictingInventoryStatusButtons<
  T extends { statusValue?: string; label?: string },
>(buttons: T[] | undefined | null): T[] {
  if (!Array.isArray(buttons)) return [];
  return buttons.filter((btn) => {
    const value = String(btn.statusValue ?? '')
      .trim()
      .toUpperCase();
    if (!value) return true;
    return !INVENTORY_WORKFLOW_CONFLICTING_STATUS_VALUES.has(value);
  });
}
