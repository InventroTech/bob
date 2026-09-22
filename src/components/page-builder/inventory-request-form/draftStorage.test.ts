import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_DELIVERY_ADDRESS, DEFAULT_DELIVERY_PINCODE, pickDeliveryAddress, pickDeliveryPincode, resolveDefaultDelivery } from './constants';
import {
  DRAFT_STORAGE_PREFIX,
  _resetDraftMemoryForTests,
  clearAllInventoryRequestFormDrafts,
  clearDraft,
  isMeaningfulDraft,
  loadDraft,
  makeDraftKey,
  saveDraft,
  sanitizeDraft,
} from './draftStorage';
import { newEmptyItem } from './utils';

afterEach(() => {
  _resetDraftMemoryForTests();
  window.sessionStorage.clear();
});

function sampleDraft(userId: string, projectPurpose: string) {
  return {
    userId,
    projectPurpose,
    requestCategory: 'Domestic' as const,
    deliveryPincode: '560001',
    deliveryAddress: 'Office',
    items: [{ ...newEmptyItem(), item_name_freeform: 'USB cable', quantity_required: 3 }],
    priceDraftByItemId: {},
    persistedAt: Date.now(),
  };
}

describe('inventory request form draft storage', () => {
  const requestorKey = makeDraftKey({
    userId: 'requestor-1',
    tenantSlug: 'unmannd',
    pageId: 'page-1',
    entityType: 'unmannd_request',
    variant: 'default',
  });
  const otherRequestorKey = makeDraftKey({
    userId: 'requestor-2',
    tenantSlug: 'unmannd',
    pageId: 'page-1',
    entityType: 'unmannd_request',
    variant: 'default',
  });
  const teamLeadKey = makeDraftKey({
    userId: 'team-lead-1',
    tenantSlug: 'unmannd',
    pageId: 'page-1',
    entityType: 'unmannd_request',
    variant: 'default',
  });

  it('scopes the storage key to the signed-in user', () => {
    expect(requestorKey.startsWith(DRAFT_STORAGE_PREFIX)).toBe(true);
    expect(requestorKey).toContain('requestor-1');
    expect(requestorKey).not.toBe(otherRequestorKey);
    expect(requestorKey).not.toBe(teamLeadKey);
    expect(makeDraftKey({ ...{ userId: '', tenantSlug: 'unmannd', pageId: 'page-1', entityType: 'unmannd_request', variant: 'default' } })).toBe('');
  });

  it('saves and restores filled values after a remount-style load', () => {
    const item = { ...newEmptyItem(), item_name_freeform: 'USB cable', quantity_required: 3 };
    saveDraft(requestorKey, {
      userId: 'requestor-1',
      projectPurpose: 'Drone build',
      requestCategory: 'Domestic',
      deliveryPincode: '560001',
      deliveryAddress: 'Office',
      items: [item],
      priceDraftByItemId: { [item.id]: '1,200' },
      persistedAt: Date.now(),
    });

    _resetDraftMemoryForTests();
    const restored = loadDraft(requestorKey, 'requestor-1');
    expect(restored?.projectPurpose).toBe('Drone build');
    expect(restored?.requestCategory).toBe('Domestic');
    expect(restored?.deliveryPincode).toBe('560001');
    expect(restored?.items[0]?.item_name_freeform).toBe('USB cable');
    expect(restored?.items[0]?.quantity_required).toBe(3);
    expect(restored?.priceDraftByItemId[item.id]).toBe('1,200');
  });

  it('does not restore one requestor draft for another requestor, team lead, or manager', () => {
    saveDraft(requestorKey, sampleDraft('requestor-1', 'Secret project'));

    expect(loadDraft(otherRequestorKey, 'requestor-2')).toBeNull();
    expect(loadDraft(teamLeadKey, 'team-lead-1')).toBeNull();
    expect(loadDraft(requestorKey, 'requestor-2')).toBeNull();
    expect(loadDraft(requestorKey, 'team-lead-1')).toBeNull();
    expect(loadDraft(requestorKey, 'manager-1')).toBeNull();
    expect(loadDraft(requestorKey, 'requestor-1')?.projectPurpose).toBe('Secret project');
  });

  it('treats default empty form as not meaningful', () => {
    expect(
      isMeaningfulDraft({
        projectPurpose: '',
        requestCategory: '',
        deliveryPincode: DEFAULT_DELIVERY_PINCODE,
        deliveryAddress: DEFAULT_DELIVERY_ADDRESS,
        items: [newEmptyItem()],
      }, {
        deliveryPincode: DEFAULT_DELIVERY_PINCODE,
        deliveryAddress: DEFAULT_DELIVERY_ADDRESS,
      })
    ).toBe(false);
    expect(
      isMeaningfulDraft({
        projectPurpose: '',
        requestCategory: '',
        deliveryPincode: '',
        deliveryAddress: '',
        items: [newEmptyItem()],
      })
    ).toBe(false);
  });

  it('treats a typed project or item as meaningful', () => {
    expect(
      isMeaningfulDraft({
        projectPurpose: 'Alpha',
        requestCategory: '',
        deliveryPincode: DEFAULT_DELIVERY_PINCODE,
        deliveryAddress: DEFAULT_DELIVERY_ADDRESS,
        items: [newEmptyItem()],
      }, {
        deliveryPincode: DEFAULT_DELIVERY_PINCODE,
        deliveryAddress: DEFAULT_DELIVERY_ADDRESS,
      })
    ).toBe(true);
    expect(
      isMeaningfulDraft({
        projectPurpose: '',
        requestCategory: '',
        deliveryPincode: DEFAULT_DELIVERY_PINCODE,
        deliveryAddress: DEFAULT_DELIVERY_ADDRESS,
        items: [{ ...newEmptyItem(), project_purpose: 'Beta' }],
      }, {
        deliveryPincode: DEFAULT_DELIVERY_PINCODE,
        deliveryAddress: DEFAULT_DELIVERY_ADDRESS,
      })
    ).toBe(true);
  });

  it('keeps project and shipment type independent per item', () => {
    const itemA = {
      ...newEmptyItem(),
      item_name_freeform: 'Bolt',
      project_purpose: 'Drone A',
      request_category: 'Domestic' as const,
    };
    const itemB = {
      ...newEmptyItem(),
      item_name_freeform: 'Nut',
      project_purpose: 'Drone B',
      request_category: 'International' as const,
    };
    const restored = sanitizeDraft({
      userId: 'requestor-1',
      projectPurpose: 'Legacy shared',
      requestCategory: 'Domestic',
      deliveryPincode: '560001',
      deliveryAddress: 'Office',
      items: [itemA, itemB],
      priceDraftByItemId: {},
      persistedAt: Date.now(),
    });
    expect(restored?.items[0]?.project_purpose).toBe('Drone A');
    expect(restored?.items[0]?.request_category).toBe('Domestic');
    expect(restored?.items[1]?.project_purpose).toBe('Drone B');
    expect(restored?.items[1]?.request_category).toBe('International');
  });

  it('copies legacy request-level project onto items that lack per-item fields', () => {
    const legacyItem = {
      id: 'item-1',
      item_name_freeform: 'Bolt',
      specifications: '',
      quantity_required: 1,
      required_date: '',
      product_link: '',
      product_image: '',
      vendor: '',
      estimated_cost: '',
      price_currency: 'INR',
      urgency_level: '',
      comments: '',
      price_quotes: [],
    };
    const restored = sanitizeDraft({
      userId: 'requestor-1',
      projectPurpose: 'Legacy project',
      requestCategory: 'International',
      deliveryPincode: '560001',
      deliveryAddress: 'Office',
      items: [legacyItem],
      priceDraftByItemId: {},
      persistedAt: Date.now(),
    });
    expect(restored?.items[0]?.project_purpose).toBe('Legacy project');
    expect(restored?.items[0]?.request_category).toBe('International');
  });

  it('drops expired drafts', () => {
    const stale = sanitizeDraft({
      userId: 'requestor-1',
      projectPurpose: 'Old',
      requestCategory: 'Domestic',
      deliveryPincode: '560001',
      deliveryAddress: 'Office',
      items: [{ ...newEmptyItem(), item_name_freeform: 'Bolt' }],
      priceDraftByItemId: {},
      persistedAt: Date.now() - 25 * 60 * 60 * 1000,
    });
    expect(stale).toBeNull();
  });

  it('clears a draft so the next visit starts empty', () => {
    saveDraft(requestorKey, sampleDraft('requestor-1', 'Keep me'));
    clearDraft(requestorKey);
    expect(loadDraft(requestorKey, 'requestor-1')).toBeNull();
  });

  it('clears every stored form draft at once', () => {
    saveDraft(requestorKey, sampleDraft('requestor-1', 'One'));
    saveDraft(teamLeadKey, sampleDraft('team-lead-1', 'Lead draft'));
    clearAllInventoryRequestFormDrafts();
    expect(loadDraft(requestorKey, 'requestor-1')).toBeNull();
    expect(loadDraft(teamLeadKey, 'team-lead-1')).toBeNull();
  });

  it('does not inject another company address into a draft with empty delivery fields', () => {
    const restored = sanitizeDraft({
      userId: 'requestor-1',
      projectPurpose: '',
      requestCategory: '',
      deliveryPincode: '',
      deliveryAddress: '',
      items: [newEmptyItem()],
      priceDraftByItemId: {},
      persistedAt: Date.now(),
    });
    expect(restored?.deliveryAddress).toBe('');
    expect(restored?.deliveryPincode).toBe('');
  });
});

describe('resolveDefaultDelivery', () => {
  it('uses Page Builder config for a non-Unmannd tenant', () => {
    expect(
      resolveDefaultDelivery({
        tenantSlug: 'acme',
        configAddress: 'Acme Robotics, Pune',
        configPincode: '411001',
      })
    ).toEqual({ address: 'Acme Robotics, Pune', pincode: '411001' });
  });

  it('does not fall back to Unmannd address for other tenants', () => {
    expect(resolveDefaultDelivery({ tenantSlug: 'acme' })).toEqual({
      address: '',
      pincode: '',
    });
  });

  it('keeps Unmannd fallback only for the Unmannd tenant when config is empty', () => {
    expect(resolveDefaultDelivery({ tenantSlug: 'unmannd' })).toEqual({
      address: DEFAULT_DELIVERY_ADDRESS,
      pincode: DEFAULT_DELIVERY_PINCODE,
    });
  });

  it('lets Page Builder config replace a stored Unmannd address', () => {
    expect(
      pickDeliveryAddress(DEFAULT_DELIVERY_ADDRESS, 'Acme Robotics, Pune')
    ).toBe('Acme Robotics, Pune');
    expect(pickDeliveryPincode(DEFAULT_DELIVERY_PINCODE, '411001')).toBe('411001');
    expect(pickDeliveryAddress('Warehouse 2', 'Acme Robotics, Pune')).toBe('Warehouse 2');
  });
});
