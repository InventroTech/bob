import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_DELIVERY_ADDRESS, DEFAULT_DELIVERY_PINCODE } from './constants';
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
      })
    ).toBe(true);
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
});
