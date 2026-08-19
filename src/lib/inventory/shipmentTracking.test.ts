import { describe, expect, it } from 'vitest';
import {
  normalizeTrackingPaste,
  shouldShowShipmentTrackingSection,
  advanceShipmentStatusForTracking,
  looksLikeTrackingLinkInput,
  normalizeCourierLabel,
  filterAftershipCouriers,
  courierValueForTrack,
} from './shipmentTracking';

describe('shipment tracking visibility + paste', () => {
  it('shows tracking section from VENDOR_IDENTIFIED / IN_CART / IN_SHIPPING', () => {
    expect(shouldShowShipmentTrackingSection('NEW_REQUEST')).toBe(false);
    expect(shouldShowShipmentTrackingSection('VENDOR_IDENTIFIED')).toBe(true);
    expect(shouldShowShipmentTrackingSection('IN_CART')).toBe(true);
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

  it('rejects tracking links so ops can only enter a number', () => {
    expect(looksLikeTrackingLinkInput('471904076719')).toBe(false);
    expect(looksLikeTrackingLinkInput('402-1234567-1234567')).toBe(false);
    expect(looksLikeTrackingLinkInput('https://www.fedex.com/fedextrack/?trknbr=1')).toBe(true);
    expect(looksLikeTrackingLinkInput('www.delhivery.com/track/ABC')).toBe(true);
  });

  it('treats courier names as case-insensitive', () => {
    expect(normalizeCourierLabel('fedex')).toBe('FedEx');
    expect(normalizeCourierLabel('FEDEX')).toBe('FedEx');
    expect(normalizeCourierLabel('Fed Ex')).toBe('FedEx');
    expect(normalizeCourierLabel('dhl')).toBe('DHL');
    expect(normalizeCourierLabel('BLUE DART')).toBe('BlueDart');
    expect(normalizeCourierLabel('amazon')).toBe('Amazon');
  });

  it('filters the courier catalog by typed text', () => {
    const catalog = [
      { name: 'FedEx®', slug: 'fedex' },
      { name: 'FedEx® Freight', slug: 'fedex-freight' },
      { name: 'Delhivery', slug: 'delhivery' },
      { name: 'DHL Express', slug: 'dhl' },
    ];
    expect(filterAftershipCouriers(catalog, '').map((c) => c.slug)).toEqual(
      expect.arrayContaining(['fedex', 'delhivery', 'dhl'])
    );
    expect(filterAftershipCouriers(catalog, 'fed').map((c) => c.slug)).toEqual([
      'fedex',
      'fedex-freight',
    ]);
    expect(courierValueForTrack('FedEx', catalog)).toBe('fedex');
    expect(courierValueForTrack('dhl', catalog)).toBe('dhl');
  });
});
