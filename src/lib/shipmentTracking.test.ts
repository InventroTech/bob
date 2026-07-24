import { describe, expect, it } from 'vitest';
import {
  normalizeTrackingPaste,
  shouldShowShipmentTrackingSection,
  advanceShipmentStatusForTracking,
} from './shipmentTracking';

describe('shipment tracking visibility + paste', () => {
  it('shows tracking section from VENDOR_IDENTIFIED / IN_SHIPPING', () => {
    expect(shouldShowShipmentTrackingSection('NEW_REQUEST')).toBe(false);
    expect(shouldShowShipmentTrackingSection('VENDOR_IDENTIFIED')).toBe(true);
    expect(shouldShowShipmentTrackingSection('IN_SHIPPING')).toBe(true);
  });

  it('shows tracking if data already has a link even on earlier status', () => {
    expect(
      shouldShowShipmentTrackingSection('NEW_REQUEST', {
        tracking_link: 'https://www.delhivery.com/track/ABC123456',
      })
    ).toBe(true);
  });

  it('normalizes pasted tracking URL into link + number when possible', () => {
    const out = normalizeTrackingPaste(
      'https://www.delhivery.com/track/shipment/ABC123456789'
    );
    expect(out.tracking_link).toMatch(/^https:\/\//);
    expect(out.tracking_number).toBeTruthy();
  });

  it('advances blank / NOT_SHIPPED to ORDERED when tracking is present', () => {
    expect(advanceShipmentStatusForTracking(null, true)).toBe('ORDERED');
    expect(advanceShipmentStatusForTracking('NOT_SHIPPED', true)).toBe('ORDERED');
    expect(advanceShipmentStatusForTracking('IN_TRANSIT', true)).toBe('IN_TRANSIT');
    expect(advanceShipmentStatusForTracking('ORDERED', false)).toBe('ORDERED');
  });
});
