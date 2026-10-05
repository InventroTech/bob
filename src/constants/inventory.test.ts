import { describe, expect, it } from 'vitest';
import { ALLOWED_STATUSES, INVENTORY_REQUEST_STATUSES } from './inventory';
import { DEFAULT_REQUEST_STATUS_OPTIONS } from '@/lib/inventory/requestStatus';

describe('inventory status constants', () => {
  it('matches the built-in request status list', () => {
    expect([...INVENTORY_REQUEST_STATUSES]).toEqual(DEFAULT_REQUEST_STATUS_OPTIONS.map((s) => s.value));
  });

  it('has no legacy codes', () => {
    expect(INVENTORY_REQUEST_STATUSES).not.toContain('VENDOR_IDENTIFIED');
    expect(INVENTORY_REQUEST_STATUSES).not.toContain('IN_SHIPPING');
  });

  it('uses the same list for procurement and inventory', () => {
    expect(ALLOWED_STATUSES.unmannd_request).toBe(INVENTORY_REQUEST_STATUSES);
    expect(ALLOWED_STATUSES.inventory_request).toBe(INVENTORY_REQUEST_STATUSES);
  });
});
