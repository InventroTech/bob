import { describe, expect, it } from 'vitest';
import {
  filterDuplicateInventoryWorkflowButtons,
  getInventoryWorkflowButtons,
  isInventoryApproverActor,
  isInventoryProcurementRole,
  isInventoryTeamLeadRole,
} from './inventoryWorkflow';

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

  it('team lead can Order on VENDOR_IDENTIFIED', () => {
    expect(
      getInventoryWorkflowButtons({
        requestStatus: 'VENDOR_IDENTIFIED',
        roleNameOrKey: 'Team Lead',
      }).map((b) => b.label)
    ).toEqual(['Put on Hold', 'Order']);
  });

  it('recognizes TL and PM roles', () => {
    expect(isInventoryApproverActor({ roleNameOrKey: 'Team Lead' })).toBe(true);
    expect(isInventoryApproverActor({ roleNameOrKey: 'Procurement Manager' })).toBe(true);
    expect(isInventoryApproverActor({ roleNameOrKey: 'Engineer' })).toBe(false);
    expect(isInventoryTeamLeadRole('TL')).toBe(true);
    expect(isInventoryProcurementRole('PM')).toBe(true);
  });

  it('filters duplicate Page Builder status buttons', () => {
    expect(
      filterDuplicateInventoryWorkflowButtons([
        { label: 'Approve', statusValue: 'VENDOR_IDENTIFIED' },
        { label: 'Custom', statusValue: 'OTHER' },
      ]).map((b) => b.statusValue)
    ).toEqual(['OTHER']);
  });
});
