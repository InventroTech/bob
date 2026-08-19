import { describe, expect, it } from 'vitest';
import {
  canRequesterEditInventoryRequest,
  filterDuplicateInventoryWorkflowButtons,
  getInventoryWorkflowButtons,
  inventoryRequesterIdFromRecord,
  isInventoryApproverActor,
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
      }).map((b) => b.label)
    ).toEqual(['Verify']);
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
      }).map((b) => b.label)
    ).toEqual(['Verify']);
    expect(
      isInventoryApproverActor({
        roleNameOrKey: 'Procurement Manager',
        isRequester: true,
      })
    ).toBe(false);
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

  it('team lead can remove a cart item back to vendor identified and then Order', () => {
    expect(
      getInventoryWorkflowButtons({
        requestStatus: 'IN_CART',
        roleNameOrKey: 'Team Lead',
      }).map((b) => ({ label: b.label, statusValue: b.statusValue }))
    ).toEqual([
      { label: 'Put on Hold', statusValue: 'ON_HOLD' },
      { label: 'Remove from cart', statusValue: 'VENDOR_IDENTIFIED' },
      { label: 'Order', statusValue: 'IN_SHIPPING' },
    ]);
  });

  it('clears cart_id when an item is removed from the cart', () => {
    const data: Record<string, unknown> = { cart_id: 'cart-1', status: 'IN_CART' };
    applyInventoryCartStatusSideEffects({
      previousStatus: 'IN_CART',
      nextStatus: 'VENDOR_IDENTIFIED',
      data,
    });
    expect(data.cart_id).toBeNull();
  });

  it('does not clear cart_id on approve into vendor identified', () => {
    const data: Record<string, unknown> = { cart_id: 'cart-1' };
    applyInventoryCartStatusSideEffects({
      previousStatus: 'NEW_REQUEST',
      nextStatus: 'VENDOR_IDENTIFIED',
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
      }).map((b) => b.label)
    ).toEqual(['Verify', 'Reject', 'Put on Hold']);
  });

  it('filters duplicate Page Builder status buttons', () => {
    expect(
      filterDuplicateInventoryWorkflowButtons([
        { label: 'Approve', statusValue: 'VENDOR_IDENTIFIED' },
        { label: 'Add to cart', statusValue: 'IN_CART' },
        { label: 'Custom', statusValue: 'OTHER' },
      ]).map((b) => b.statusValue)
    ).toEqual(['OTHER']);
  });

  it('lets the requestor edit until the request is approved', () => {
    expect(canRequesterEditInventoryRequest('NEW_REQUEST')).toBe(true);
    expect(canRequesterEditInventoryRequest('ON_HOLD')).toBe(true);
    expect(canRequesterEditInventoryRequest('REQ_TO_VERIFY')).toBe(true);
    expect(canRequesterEditInventoryRequest('VENDOR_IDENTIFIED')).toBe(false);
    expect(canRequesterEditInventoryRequest('IN_CART')).toBe(false);
    expect(canRequesterEditInventoryRequest('IN_SHIPPING')).toBe(false);
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
