import { describe, expect, it } from 'vitest';
import {
  canRequesterEditInventoryRequest,
  filterDuplicateInventoryWorkflowButtons,
  getInventoryWorkflowButtons,
  inventoryRequesterIdFromRecord,
  isInventoryApproverActor,
  isInventoryOpsEditorRole,
  isInventoryProcurementRole,
  isInventoryRequestRowRequester,
  isInventoryTeamLeadRole,
  applyInventoryCartStatusSideEffects,
} from './workflow';

describe('inventory Approve/Reject for team lead and PM', () => {
  it('plain requestor only gets Verify on REQ_TO_VERIFY', () => {
    expect(
      getInventoryWorkflowButtons({
        requestStatus: 'NEW_REQUEST',
        isRequester: true,
        roleNameOrKey: 'Engineer',
      })
    ).toEqual([]);
    expect(
      getInventoryWorkflowButtons({
        requestStatus: 'REQ_TO_VERIFY',
        isRequester: true,
        roleNameOrKey: 'Engineer',
      }).map((b) => ({ label: b.label, statusValue: b.statusValue }))
    ).toEqual([{ label: 'Verify', statusValue: 'NEW_REQUEST' }]);
  });

  it('team lead can Approve/Reject on NEW_REQUEST', () => {
    expect(
      getInventoryWorkflowButtons({
        requestStatus: 'NEW_REQUEST',
        isRequester: false,
        roleNameOrKey: 'Team Lead',
      }).map((b) => b.label)
    ).toEqual(['Approve', 'Send to requestor to verify', 'Reject', 'Put on Hold']);
  });

  it('PM can Approve/Reject someone else\'s NEW_REQUEST', () => {
    expect(
      getInventoryWorkflowButtons({
        requestStatus: 'NEW_REQUEST',
        isRequester: false,
        roleNameOrKey: 'Procurement Manager',
      }).map((b) => b.label)
    ).toEqual(['Approve', 'Send to requestor to verify', 'Reject', 'Put on Hold']);
  });

  it('team lead can Approve their own request', () => {
    expect(
      getInventoryWorkflowButtons({
        requestStatus: 'NEW_REQUEST',
        isRequester: true,
        roleNameOrKey: 'CSE Team Lead',
      }).map((b) => b.label)
    ).toContain('Approve');
  });

  it('PM cannot Approve/Reject their own request (same as requestor)', () => {
    expect(
      getInventoryWorkflowButtons({
        requestStatus: 'NEW_REQUEST',
        isRequester: true,
        roleNameOrKey: 'Procurement Manager',
      })
    ).toEqual([]);
    expect(
      getInventoryWorkflowButtons({
        requestStatus: 'REQ_TO_VERIFY',
        isRequester: true,
        roleNameOrKey: 'Procurement Manager',
      }).map((b) => ({ label: b.label, statusValue: b.statusValue }))
    ).toEqual([{ label: 'Verify', statusValue: 'NEW_REQUEST' }]);
    expect(
      isInventoryApproverActor({
        roleNameOrKey: 'Procurement Manager',
        isRequester: true,
      })
    ).toBe(false);
  });

  it('TL and PM remain ops editors on requests they created (tracking/edits)', () => {
    expect(isInventoryOpsEditorRole('Team Lead', 'team_lead_unmannd')).toBe(true);
    expect(isInventoryOpsEditorRole('Procurement Manager', 'pm')).toBe(true);
    expect(isInventoryOpsEditorRole('Engineer', 'AGENT')).toBe(false);
    // After approval, requestor edit is locked — ops roles still count as editors.
    expect(canRequesterEditInventoryRequest('VENDOR_IDENTIFIED')).toBe(false);
    expect(canRequesterEditInventoryRequest('IN_SHIPPING')).toBe(false);
  });

  it('assigned team_lead on record can Approve', () => {
    expect(
      getInventoryWorkflowButtons({
        requestStatus: 'NEW_REQUEST',
        isRequester: false,
        membershipId: 10,
        teamLeadOnRecord: 10,
      }).map((b) => b.label)
    ).toContain('Approve');
  });

  it('assigned manager on record can Approve others\' requests only', () => {
    expect(
      getInventoryWorkflowButtons({
        requestStatus: 'NEW_REQUEST',
        isRequester: false,
        membershipId: 20,
        managerOnRecord: 20,
      }).map((b) => b.label)
    ).toContain('Approve');
    expect(
      getInventoryWorkflowButtons({
        requestStatus: 'NEW_REQUEST',
        isRequester: true,
        membershipId: 20,
        managerOnRecord: 20,
        roleNameOrKey: 'Procurement Manager',
      })
    ).toEqual([]);
  });

  it('team lead can add approved items to the cart', () => {
    expect(
      getInventoryWorkflowButtons({
        requestStatus: 'VENDOR_IDENTIFIED',
        roleNameOrKey: 'Team Lead',
      }).map((b) => b.label)
    ).toEqual(['Put on Hold', 'Add to cart']);
  });

  it('team lead can add APPROVED items to the cart', () => {
    expect(
      getInventoryWorkflowButtons({
        requestStatus: 'APPROVED',
        roleNameOrKey: 'Team Lead',
      }).map((b) => b.label)
    ).toEqual(['Put on Hold', 'Add to cart']);
  });

  it('Approve sets APPROVED', () => {
    expect(
      getInventoryWorkflowButtons({
        requestStatus: 'NEW_REQUEST',
        roleNameOrKey: 'Team Lead',
      }).find((b) => b.label === 'Approve')?.statusValue
    ).toBe('APPROVED');
  });

  it('team lead can remove a cart item back to approved and then Order', () => {
    expect(
      getInventoryWorkflowButtons({
        requestStatus: 'IN_CART',
        roleNameOrKey: 'Team Lead',
      }).map((b) => ({ label: b.label, statusValue: b.statusValue }))
    ).toEqual([
      { label: 'Put on Hold', statusValue: 'ON_HOLD' },
      { label: 'Remove from cart', statusValue: 'APPROVED' },
      { label: 'Order', statusValue: 'ORDERED' },
    ]);
  });

  it('shows no workflow buttons after ordering', () => {
    for (const status of ['ORDERED', 'DELIVERED', 'EXCEPTION', 'IN_SHIPPING']) {
      expect(
        getInventoryWorkflowButtons({ requestStatus: status, roleNameOrKey: 'Team Lead' })
      ).toEqual([]);
    }
  });

  it('clears cart_id when an item is removed from the cart', () => {
    const data: Record<string, unknown> = { cart_id: 'cart-1', status: 'IN_CART' };
    applyInventoryCartStatusSideEffects({
      previousStatus: 'IN_CART',
      nextStatus: 'APPROVED',
      data,
    });
    expect(data.cart_id).toBeNull();
  });

  it('clears cart_id for legacy VENDOR_IDENTIFIED remove-from-cart', () => {
    const data: Record<string, unknown> = { cart_id: 'cart-1', status: 'IN_CART' };
    applyInventoryCartStatusSideEffects({
      previousStatus: 'IN_CART',
      nextStatus: 'VENDOR_IDENTIFIED',
      data,
    });
    expect(data.cart_id).toBeNull();
  });

  it('does not clear cart_id on approve', () => {
    const data: Record<string, unknown> = { cart_id: 'cart-1' };
    applyInventoryCartStatusSideEffects({
      previousStatus: 'NEW_REQUEST',
      nextStatus: 'APPROVED',
      data,
    });
    expect(data.cart_id).toBe('cart-1');
  });

  it('recognizes TL and PM roles', () => {
    expect(isInventoryApproverActor({ roleNameOrKey: 'Team Lead' })).toBe(true);
    expect(isInventoryApproverActor({ roleNameOrKey: 'Procurement Manager' })).toBe(true);
    expect(isInventoryApproverActor({ roleNameOrKey: 'Engineer' })).toBe(false);
    expect(isInventoryTeamLeadRole('TL')).toBe(true);
    expect(isInventoryProcurementRole('PM')).toBe(true);
  });

  it('team lead can Approve/Reject/Hold after sending to requestor to verify', () => {
    expect(
      getInventoryWorkflowButtons({
        requestStatus: 'REQ_TO_VERIFY',
        isRequester: false,
        roleNameOrKey: 'Team Lead',
      }).map((b) => b.label)
    ).toEqual(['Approve', 'Reject', 'Put on Hold']);
  });

  it('PM can Approve/Reject/Hold on REQ_TO_VERIFY for someone else\'s request', () => {
    expect(
      getInventoryWorkflowButtons({
        requestStatus: 'REQ_TO_VERIFY',
        isRequester: false,
        roleNameOrKey: 'Procurement Manager',
      }).map((b) => b.label)
    ).toEqual(['Approve', 'Reject', 'Put on Hold']);
  });

  it('team lead who is the requestor still gets Verify on REQ_TO_VERIFY', () => {
    expect(
      getInventoryWorkflowButtons({
        requestStatus: 'REQ_TO_VERIFY',
        isRequester: true,
        roleNameOrKey: 'Team Lead',
      }).map((b) => ({ label: b.label, statusValue: b.statusValue }))
    ).toEqual([
      { label: 'Verify', statusValue: 'NEW_REQUEST' },
      { label: 'Reject', statusValue: 'REJECTED' },
      { label: 'Put on Hold', statusValue: 'ON_HOLD' },
    ]);
  });

  it('filters duplicate Page Builder status buttons', () => {
    expect(
      filterDuplicateInventoryWorkflowButtons([
        { label: 'Verify', statusValue: 'NEW_REQUEST' },
        { label: 'Approve', statusValue: 'VENDOR_IDENTIFIED' },
        { label: 'Approve', statusValue: 'APPROVED' },
        { label: 'Order', statusValue: 'IN_SHIPPING' },
        { label: 'Add to cart', statusValue: 'IN_CART' },
        { label: 'Custom', statusValue: 'OTHER' },
      ]).map((b) => b.statusValue)
    ).toEqual(['OTHER']);
  });

  it('uses friendly labels as status text on every built-in button', () => {
    const texts = (status: string) =>
      getInventoryWorkflowButtons({ requestStatus: status, roleNameOrKey: 'Team Lead' }).map(
        (b) => [b.statusValue, b.statusText]
      );
    expect(texts('NEW_REQUEST')).toEqual([
      ['APPROVED', 'Approved'],
      ['REQ_TO_VERIFY', 'Req to verify'],
      ['REJECTED', 'Rejected'],
      ['ON_HOLD', 'On hold'],
    ]);
    expect(texts('APPROVED')).toEqual([
      ['ON_HOLD', 'On hold'],
      ['IN_CART', 'In cart'],
    ]);
    expect(texts('IN_CART')).toEqual([
      ['ON_HOLD', 'On hold'],
      ['APPROVED', 'Approved'],
      ['ORDERED', 'Ordered'],
    ]);
  });

  it('Verify uses the New request label', () => {
    expect(
      getInventoryWorkflowButtons({ requestStatus: 'REQ_TO_VERIFY', isRequester: true })[0]
    ).toEqual({ label: 'Verify', statusValue: 'NEW_REQUEST', statusText: 'New request' });
  });

  it('ON_HOLD can be approved, sent to verify or rejected but not held again', () => {
    expect(
      getInventoryWorkflowButtons({ requestStatus: 'ON_HOLD', roleNameOrKey: 'Team Lead' }).map(
        (b) => b.label
      )
    ).toEqual(['Approve', 'Send to requestor to verify', 'Reject']);
  });

  it('shows no buttons for rejected, empty or custom statuses', () => {
    for (const status of ['REJECTED', '', null, 'PAID']) {
      expect(
        getInventoryWorkflowButtons({ requestStatus: status, roleNameOrKey: 'Team Lead' })
      ).toEqual([]);
    }
  });

  it('reads lowercase / spaced legacy codes', () => {
    expect(
      getInventoryWorkflowButtons({
        requestStatus: 'vendor identified',
        roleNameOrKey: 'Team Lead',
      }).map((b) => b.label)
    ).toEqual(['Put on Hold', 'Add to cart']);
  });

  it('non-approvers never get workflow buttons beyond Verify', () => {
    for (const status of ['NEW_REQUEST', 'APPROVED', 'IN_CART', 'ORDERED']) {
      expect(
        getInventoryWorkflowButtons({ requestStatus: status, roleNameOrKey: 'Engineer' })
      ).toEqual([]);
    }
  });

  it('workflowMode lets any non-requestor approve', () => {
    expect(
      getInventoryWorkflowButtons({ requestStatus: 'NEW_REQUEST', workflowMode: 'manager' }).map(
        (b) => b.label
      )
    ).toContain('Approve');
    expect(
      getInventoryWorkflowButtons({
        requestStatus: 'NEW_REQUEST',
        workflowMode: 'manager',
        isRequester: true,
      })
    ).toEqual([]);
  });

  it('keeps cart_id for other transitions', () => {
    const cases: Array<[string, string]> = [
      ['IN_CART', 'ORDERED'],
      ['IN_CART', 'IN_CART'],
      ['APPROVED', 'IN_CART'],
      ['ORDERED', 'APPROVED'],
      ['IN_CART', 'ON_HOLD'],
    ];
    for (const [previousStatus, nextStatus] of cases) {
      const data: Record<string, unknown> = { cart_id: 'cart-1' };
      applyInventoryCartStatusSideEffects({ previousStatus, nextStatus, data });
      expect(data.cart_id).toBe('cart-1');
    }
  });

  it('clears cart_id for lowercase remove-from-cart', () => {
    const data: Record<string, unknown> = { cart_id: 'cart-1' };
    applyInventoryCartStatusSideEffects({ previousStatus: 'in cart', nextStatus: 'approved', data });
    expect(data.cart_id).toBeNull();
  });

  it('keeps custom and post-order Page Builder buttons', () => {
    expect(
      filterDuplicateInventoryWorkflowButtons([
        { label: 'Delivered', statusValue: 'DELIVERED' },
        { label: 'Exception', statusValue: 'exception' },
        { label: 'Paid', statusValue: 'PAID' },
        { label: 'No status' },
        { label: 'Approve lower', statusValue: 'approved' },
        { label: 'Order lower', statusValue: 'in shipping' },
      ]).map((b) => b.label)
    ).toEqual(['Delivered', 'Exception', 'Paid', 'No status']);
  });

  it('handles missing Page Builder button lists', () => {
    expect(filterDuplicateInventoryWorkflowButtons(undefined)).toEqual([]);
    expect(filterDuplicateInventoryWorkflowButtons(null)).toEqual([]);
  });

  it('lets the requestor edit until the request is approved', () => {
    expect(canRequesterEditInventoryRequest('NEW_REQUEST')).toBe(true);
    expect(canRequesterEditInventoryRequest('ON_HOLD')).toBe(true);
    expect(canRequesterEditInventoryRequest('REQ_TO_VERIFY')).toBe(true);
    expect(canRequesterEditInventoryRequest('VENDOR_IDENTIFIED')).toBe(false);
    expect(canRequesterEditInventoryRequest('APPROVED')).toBe(false);
    expect(canRequesterEditInventoryRequest('IN_CART')).toBe(false);
    expect(canRequesterEditInventoryRequest('IN_SHIPPING')).toBe(false);
    expect(canRequesterEditInventoryRequest('ORDERED')).toBe(false);
    expect(canRequesterEditInventoryRequest('DELIVERED')).toBe(false);
    expect(canRequesterEditInventoryRequest('REJECTED')).toBe(false);
    expect(isInventoryRequestRowRequester('user-1', 'user-1', 10)).toBe(true);
    expect(isInventoryRequestRowRequester(10, 'user-1', 10)).toBe(true);
    expect(isInventoryRequestRowRequester('other', 'user-1', 10)).toBe(false);
    expect(
      inventoryRequesterIdFromRecord({
        requester_id: 'row-level',
        data: { created_by_id: 'created' },
      })
    ).toBe('row-level');
    expect(
      inventoryRequesterIdFromRecord({
        data: { requester_id: 'from-data', created_by_id: 'created' },
      })
    ).toBe('from-data');
    expect(
      inventoryRequesterIdFromRecord({
        data: { created_by_id: 'created' },
      })
    ).toBe('created');
  });
});
