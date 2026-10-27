import { describe, expect, it } from 'vitest';
import {
  getInventoryStatusChipLabel,
  getInventoryStatusLabel,
  getInventoryStatusToneClass,
  getShipmentStatusLabel,
  getShipmentStatusToneClass,
} from './statusStyles';
import { DEFAULT_STATUS_TONE_CLASS } from './requestStatus';

describe('request status chip styles', () => {
  it('uses the configured colour per status', () => {
    const tones: Array<[string, string, string]> = [
      ['NEW_REQUEST', 'border-amber-300', 'text-amber-900'],
      ['REQ_TO_VERIFY', 'border-violet-300', 'text-violet-700'],
      ['APPROVED', 'border-green-300', 'text-green-700'],
      ['IN_CART', 'border-[#1B6FE8]/40', 'text-[#0A4CB8]'],
      ['ON_HOLD', 'border-orange-300', 'text-orange-500'],
      ['REJECTED', 'border-red-200', 'text-red-700'],
      ['ORDERED', 'border-[#1A3673]/35', 'text-[#1A3673]'],
      ['DELIVERED', 'border-green-500', 'text-green-800'],
      ['EXCEPTION', 'border-red-400', 'text-red-800'],
    ];
    for (const [status, border, text] of tones) {
      const cls = getInventoryStatusToneClass(status).split(' ');
      expect(cls).toContain(border);
      expect(cls).toContain(text);
      expect(cls.some((c) => /^bg-([a-z]+-(50|100)|\[#[0-9A-Fa-f]{6}\])$/.test(c))).toBe(true);
    }
  });

  it('styles legacy codes like their new status', () => {
    expect(getInventoryStatusToneClass('VENDOR_IDENTIFIED')).toBe(getInventoryStatusToneClass('APPROVED'));
    expect(getInventoryStatusToneClass('IN_SHIPPING')).toBe(getInventoryStatusToneClass('ORDERED'));
  });

  it('falls back for empty and unknown statuses', () => {
    expect(getInventoryStatusToneClass('')).toBe(DEFAULT_STATUS_TONE_CLASS);
    expect(getInventoryStatusToneClass(null)).toBe(DEFAULT_STATUS_TONE_CLASS);
    expect(getInventoryStatusToneClass('PAID')).toBe(DEFAULT_STATUS_TONE_CLASS);
  });

  it('labels statuses with configured labels', () => {
    expect(getInventoryStatusLabel('in_cart')).toBe('In cart');
    expect(getInventoryStatusLabel('IN_SHIPPING')).toBe('Ordered');
    expect(getInventoryStatusChipLabel('VENDOR_IDENTIFIED')).toBe('Approved');
    expect(getInventoryStatusLabel('')).toBe('—');
  });
});

describe('shipment status chip styles', () => {
  it('keeps carrier tones', () => {
    expect(getShipmentStatusToneClass('IN_TRANSIT')).toContain('blue');
    expect(getShipmentStatusToneClass('out for delivery')).toContain('orange');
    expect(getShipmentStatusToneClass('DELIVERED')).toContain('emerald');
    expect(getShipmentStatusToneClass('')).toContain('orange');
    expect(getShipmentStatusToneClass('WHATEVER')).toBe(DEFAULT_STATUS_TONE_CLASS);
  });

  it('labels shipment statuses', () => {
    expect(getShipmentStatusLabel('out_for_delivery')).toBe('OUT FOR DELIVERY');
    expect(getShipmentStatusLabel('')).toBe('N/A');
    expect(getShipmentStatusLabel('—')).toBe('N/A');
    expect(getShipmentStatusLabel('n/a')).toBe('N/A');
  });
});
