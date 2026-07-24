import { describe, expect, it } from 'vitest';
import {
  filterDuplicateInventoryWorkflowButtons,
  getInventoryWorkflowButtons,
  isInventoryProcurementRole,
  isInventoryTeamLeadRole,
} from './inventoryWorkflow';
import { shouldShowShipmentTrackingSection } from './shipmentTracking';

describe('inventory procurement → order flow (existing statuses)', () => {
  it('requestor never sees Approve/Reject/Order', () => {
    expect(
      getInventoryWorkflowButtons({
        requestStatus: 'NEW_REQUEST',
        isRequester: true,
        workflowMode: 'manager',
      })
    ).toEqual([]);
    expect(
      getInventoryWorkflowButtons({
        requestStatus: 'VENDOR_IDENTIFIED',
        isRequester: true,
        workflowMode: 'team_lead',
      })
    ).toEqual([]);
  });

  it('manager can Approve/Reject on NEW_REQUEST', () => {
    const buttons = getInventoryWorkflowButtons({
      requestStatus: 'NEW_REQUEST',
      isRequester: false,
      workflowMode: 'manager',
    });
    expect(buttons.map((b) => b.statusValue)).toEqual(['VENDOR_IDENTIFIED', 'REJECTED']);
  });

  it('team lead never sees Approve/Reject on new requests', () => {
    expect(
      getInventoryWorkflowButtons({
        requestStatus: 'NEW_REQUEST',
        isRequester: false,
        workflowMode: 'team_lead',
        roleNameOrKey: 'Team Lead',
      })
    ).toEqual([]);
  });

  it('team lead sees Order on VENDOR_IDENTIFIED', () => {
    for (const status of ['VENDOR_IDENTIFIED', 'VENDOR IDENTIFIED']) {
      const buttons = getInventoryWorkflowButtons({
        requestStatus: status,
        roleNameOrKey: 'Team Lead',
        workflowMode: 'team_lead',
        isRequester: false,
      });
      expect(buttons.map((b) => [b.label, b.statusValue])).toEqual([['Order', 'IN_SHIPPING']]);
    }
  });

  it('manager does not see Order (team-lead-only action)', () => {
    expect(
      getInventoryWorkflowButtons({
        requestStatus: 'VENDOR_IDENTIFIED',
        workflowMode: 'manager',
        isRequester: false,
      })
    ).toEqual([]);
  });

  it('auto mode: team-lead role hides Approve; procurement role shows Approve', () => {
    expect(
      getInventoryWorkflowButtons({
        requestStatus: 'NEW_REQUEST',
        roleNameOrKey: 'CSE Team Lead',
        isRequester: false,
        workflowMode: 'auto',
      })
    ).toEqual([]);
    expect(
      getInventoryWorkflowButtons({
        requestStatus: 'NEW_REQUEST',
        roleNameOrKey: 'Procurement Manager',
        isRequester: false,
        workflowMode: 'auto',
      }).map((b) => b.label)
    ).toEqual(['Approve', 'Reject']);
  });

  it('recognizes procurement vs team-lead roles', () => {
    expect(isInventoryProcurementRole('Procurement Manager')).toBe(true);
    expect(isInventoryProcurementRole('team_lead')).toBe(false);
    expect(isInventoryTeamLeadRole('TL')).toBe(true);
    expect(isInventoryTeamLeadRole('CSE Team Lead')).toBe(true);
  });

  it('filters duplicate Page Builder status buttons', () => {
    const filtered = filterDuplicateInventoryWorkflowButtons([
      { label: 'Approve vendor', statusValue: 'VENDOR_IDENTIFIED' },
      { label: 'Custom', statusValue: 'SOME_CUSTOM' },
    ]);
    expect(filtered.map((b) => b.statusValue)).toEqual(['SOME_CUSTOM']);
  });
});

describe('shipment tracking visibility', () => {
  it('shows from VENDOR_IDENTIFIED / IN_SHIPPING', () => {
    expect(shouldShowShipmentTrackingSection('NEW_REQUEST')).toBe(false);
    expect(shouldShowShipmentTrackingSection('VENDOR_IDENTIFIED')).toBe(true);
    expect(shouldShowShipmentTrackingSection('IN_SHIPPING')).toBe(true);
  });
});
