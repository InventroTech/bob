import { describe, expect, it } from 'vitest';
import { resolveTableEntityType, usesInventorySearch } from './utils';

const LEAD_COLUMNS = ['name', 'phone_number', 'praja_id', 'assigned_to', 'lead_stage', 'lead_score'].map((key) => ({
  key,
}));

describe('resolveTableEntityType', () => {
  it('reads entity_type from the endpoint first', () => {
    expect(
      resolveTableEntityType(
        { entityType: 'inventory_request', forceQueryParams: { entity_type: 'lead' } },
        '/crm-records/records/?entity_type=unmannd_request'
      )
    ).toBe('unmannd_request');
  });

  it('falls back to forceQueryParams, then entityType', () => {
    expect(resolveTableEntityType({ entityType: 'lead', forceQueryParams: { entity_type: 'unmannd_request' } })).toBe(
      'unmannd_request'
    );
    expect(resolveTableEntityType({ entityType: ' Lead ' })).toBe('lead');
  });

  it('uses the config endpoint when no resolved endpoint is given', () => {
    expect(resolveTableEntityType({ apiEndpoint: '/crm-records/records/?page=1&entity_type=lead' })).toBe('lead');
  });

  it('returns an empty string when nothing names an entity type', () => {
    expect(resolveTableEntityType({})).toBe('');
    expect(resolveTableEntityType(null)).toBe('');
  });
});

describe('usesInventorySearch', () => {
  it('is false for a procurement widget listing leads (the slow Sentry query)', () => {
    expect(
      usesInventorySearch({ inventoryTableKind: 'procurement', entityType: 'lead', columns: LEAD_COLUMNS })
    ).toBe(false);
  });

  it('is false when the endpoint loads leads even if the widget tags itself as procurement', () => {
    expect(
      usesInventorySearch({ inventoryTableKind: 'procurement', columns: LEAD_COLUMNS }, '/crm-records/records/?entity_type=lead')
    ).toBe(false);
  });

  it('is true for inventory and unmannd request tables', () => {
    expect(usesInventorySearch({ entityType: 'inventory_request' })).toBe(true);
    expect(usesInventorySearch({}, '/crm-records/records/?entity_type=unmannd_request')).toBe(true);
    expect(usesInventorySearch({ forceQueryParams: { entity_type: 'unmannd_request' } })).toBe(true);
  });

  it('still trusts the procurement tag when no entity type is set', () => {
    expect(usesInventorySearch({ inventoryTableKind: 'procurement' })).toBe(true);
  });

  it('still detects inventory tables by their columns', () => {
    expect(usesInventorySearch({ entityType: 'unmannd_vendor', columns: [{ key: 'item_name' }] })).toBe(true);
  });

  it('is false for a plain lead table', () => {
    expect(usesInventorySearch({ entityType: 'lead', columns: LEAD_COLUMNS })).toBe(false);
  });

  it('is false without config', () => {
    expect(usesInventorySearch(undefined)).toBe(false);
  });
});
