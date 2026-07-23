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
        requestStatus: 'PENDING_PM',
        isRequester: true,
      })
    ).toEqual([]);
    expect(
      getInventoryWorkflowButtons({
        requestStatus: 'VENDOR_IDENTIFIED',
        isRequester: true,
      })
    ).toEqual([]);
  });

  it('non-requestor can Approve/Reject on PENDING_PM, DRAFT, and NEW_REQUEST', () => {
    for (const status of ['PENDING_PM', 'DRAFT', 'NEW_REQUEST']) {
      const buttons = getInventoryWorkflowButtons({
        requestStatus: status,
        isRequester: false,
      });
      expect(buttons.map((b) => b.statusValue)).toEqual(['VENDOR_IDENTIFIED', 'REJECTED']);
    }
  });

  it('non-requestor sees Order on VENDOR_IDENTIFIED and PAYMENT_PENDING (no role required)', () => {
    for (const status of ['VENDOR_IDENTIFIED', 'VENDOR IDENTIFIED', 'PAYMENT_PENDING']) {
      const buttons = getInventoryWorkflowButtons({
        requestStatus: status,
        roleNameOrKey: 'engineer',
        isRequester: false,
      });
      expect(buttons.map((b) => [b.label, b.statusValue])).toEqual([['Order', 'IN_SHIPPING']]);
    }
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
      { label: 'Custom', statusValue: 'PAYMENT_PENDING' },
    ]);
    expect(filtered.map((b) => b.statusValue)).toEqual(['PAYMENT_PENDING']);
  });
});

describe('shipment tracking visibility', () => {
  it('shows from VENDOR_IDENTIFIED / PAYMENT_PENDING / IN_SHIPPING', () => {
    expect(shouldShowShipmentTrackingSection('PENDING_PM')).toBe(false);
    expect(shouldShowShipmentTrackingSection('VENDOR_IDENTIFIED')).toBe(true);
    expect(shouldShowShipmentTrackingSection('PAYMENT_PENDING')).toBe(true);
    expect(shouldShowShipmentTrackingSection('IN_SHIPPING')).toBe(true);
  });
});
