import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  REQUEST_STAGE_TABS,
  applyRequestStageFiltersToParams,
  buildRequestStageListUrl,
  countRowsByRequestStage,
  emptyRequestStageCounts,
  filterRowsByRequestStage,
  formatStageCount,
  getRequestStageServerFilter,
  getRequestStageTabs,
  getRowPrimaryRequestStage,
  getRowRequestStatus,
  getRowShipmentStatus,
  parseListTotalCount,
  rowMatchesRequestStage,
} from './requestStageTabs';
import { loadRequestStatusConfig, resetRequestStatusConfigCache } from './requestStatus';

const apiGet = vi.fn();
vi.mock('@/lib/api', () => ({ apiClient: { get: (...args: unknown[]) => apiGet(...args) } }));

describe('requestStageTabs', () => {
  const rows = [
    { id: '1', status: 'NEW_REQUEST' },
    { id: '2', data: { status: 'ON_HOLD' } },
    { id: '3', data: { status: 'IN_CART' } },
    { id: '4', data: { status: 'ORDERED', shipment_status: 'IN_TRANSIT' } },
    { id: '5', data: { status: 'DELIVERED', shipment_status: 'DELIVERED' } },
    { id: '6', data: { status: 'REJECTED' } },
    { id: '7', data: { status: 'APPROVED' } },
    { id: '8', data: { status: 'EXCEPTION' } },
  ];

  it('builds tabs from the configured pages', () => {
    expect(REQUEST_STAGE_TABS.map((t) => t.id)).toEqual([
      'all',
      'pending_approval',
      'in_cart',
      'ordered',
      'delivered',
      'closed',
    ]);
  });

  it('puts each row on the page its status maps to', () => {
    expect(rowMatchesRequestStage(rows[0], 'pending_approval')).toBe(true);
    expect(rowMatchesRequestStage(rows[6], 'pending_approval')).toBe(true);
    expect(rowMatchesRequestStage(rows[2], 'in_cart')).toBe(true);
    expect(rowMatchesRequestStage(rows[3], 'ordered')).toBe(true);
    expect(rowMatchesRequestStage(rows[7], 'ordered')).toBe(true);
    expect(rowMatchesRequestStage(rows[4], 'delivered')).toBe(true);
    expect(rowMatchesRequestStage(rows[5], 'closed')).toBe(true);
  });

  it('reads legacy codes as their new status', () => {
    expect(getRowPrimaryRequestStage({ data: { status: 'VENDOR_IDENTIFIED' } })).toBe(
      'pending_approval'
    );
    expect(getRowPrimaryRequestStage({ data: { status: 'IN_SHIPPING' } })).toBe('ordered');
  });

  it('assigns a single primary stage from status only', () => {
    expect(
      getRowPrimaryRequestStage({ data: { status: 'IN_CART', shipment_status: 'ORDERED' } })
    ).toBe('in_cart');
    expect(getRowPrimaryRequestStage({ data: { status: 'SOMETHING_ELSE' } })).toBeNull();
  });

  it('filters and counts by stage', () => {
    expect(filterRowsByRequestStage(rows, 'in_cart')).toHaveLength(1);
    const counts = countRowsByRequestStage(rows);
    expect(counts.all).toBe(rows.length);
    expect(counts.pending_approval).toBe(3);
    expect(counts.ordered).toBe(2);
    expect(counts.closed).toBe(1);
  });

  it('uses stage=<page id> as the server filter', () => {
    expect(getRequestStageServerFilter('all')).toBeNull();
    expect(getRequestStageServerFilter('ordered')).toEqual({ stage: 'ordered' });

    const params = new URLSearchParams('status=FOO&shipment_status=BAR&page=3');
    applyRequestStageFiltersToParams(params, 'in_cart');
    expect(params.get('stage')).toBe('in_cart');
    expect(params.has('status')).toBe(false);
    expect(params.has('shipment_status')).toBe(false);

    const allParams = new URLSearchParams('status=APPROVED');
    applyRequestStageFiltersToParams(allParams, 'all');
    expect(allParams.get('status')).toBe('APPROVED');
    expect(allParams.has('stage')).toBe(false);

    const url = buildRequestStageListUrl(
      '/crm-records/records/?entity_type=unmannd_request&stage=old&page=9',
      { stage: 'ordered', page: 1, pageSize: 1, includeCount: true }
    );
    expect(url).toContain('stage=ordered');
    expect(url).not.toContain('stage=old');
    expect(url).toContain('page=1');
    expect(url).toContain('page_size=1');
    expect(url).toContain('include_count=true');
    expect(url).not.toContain('page=9');
  });

  it('keeps user status filters on All stage list URL (counts match table)', () => {
    const extra = new URLSearchParams('status=APPROVED&search=widget');
    const url = buildRequestStageListUrl(
      '/crm-records/records/?entity_type=unmannd_request&status=OLD&page=9',
      { stage: 'all', extraParams: extra, page: 1, pageSize: 10, includeCount: true }
    );
    expect(url).toContain('status=APPROVED');
    expect(url).toContain('search=widget');
    expect(url).not.toContain('status=OLD');

    const orderedUrl = buildRequestStageListUrl('/crm-records/records/?entity_type=unmannd_request', {
      stage: 'ordered',
      extraParams: new URLSearchParams('status=APPROVED'),
      page: 1,
      pageSize: 1,
    });
    expect(orderedUrl).toContain('stage=ordered');
    expect(orderedUrl).not.toContain('status=APPROVED');
  });

  it('parses list totals', () => {
    expect(parseListTotalCount({ page_meta: { total_count: 14 } })).toBe(14);
    expect(parseListTotalCount({ count: 8 })).toBe(8);
  });

  it('pads stage counts to two digits', () => {
    expect(formatStageCount(2)).toBe('02');
    expect(formatStageCount(120)).toBe('120');
  });

  it('clamps negative counts to zero', () => {
    expect(formatStageCount(-3)).toBe('00');
  });
});

describe('default stage tabs', () => {
  it('numbers steps and labels the default pages', () => {
    expect(REQUEST_STAGE_TABS.map((t) => [t.step, t.label])).toEqual([
      [1, 'All Request'],
      [2, 'Pending Approvals'],
      [3, 'In Cart Items'],
      [4, 'Ordered Items'],
      [5, 'Delivered Items'],
      [6, 'Invoiced & Closed'],
    ]);
  });

  it('splits labels into two lines and marks closed as complete', () => {
    const byId = Object.fromEntries(REQUEST_STAGE_TABS.map((t) => [t.id, t]));
    expect(byId.all.labelLines).toEqual(['All', 'Request']);
    expect(byId.pending_approval.labelLines).toEqual(['Pending', 'Approvals']);
    expect(byId.in_cart.labelLines).toEqual(['In Cart', 'Items']);
    expect(byId.closed.completeSuffix).toBe('Complete');
    expect(byId.closed.labelLines).toBeUndefined();
  });

  it('getRequestStageTabs(null) matches REQUEST_STAGE_TABS', () => {
    expect(getRequestStageTabs(null)).toEqual(REQUEST_STAGE_TABS);
  });
});

describe('row helpers', () => {
  it('reads status from data first, then the row', () => {
    expect(getRowRequestStatus({ status: 'IN_CART', data: { status: 'ordered' } })).toBe('ORDERED');
    expect(getRowRequestStatus({ status: 'in cart' })).toBe('IN_CART');
    expect(getRowRequestStatus(null)).toBe('');
    expect(getRowRequestStatus({ data: 'not-an-object', status: 'APPROVED' })).toBe('APPROVED');
  });

  it('reads shipment status from data first, then the row', () => {
    expect(getRowShipmentStatus({ data: { shipment_status: 'in transit' } })).toBe('IN_TRANSIT');
    expect(getRowShipmentStatus({ shipment_status: 'DELIVERED' })).toBe('DELIVERED');
    expect(getRowShipmentStatus(undefined)).toBe('');
  });

  it('null rows have no stage but match "all"', () => {
    expect(getRowPrimaryRequestStage(null)).toBeNull();
    expect(rowMatchesRequestStage(null, 'ordered')).toBe(true);
    expect(rowMatchesRequestStage({ data: { status: 'IN_CART' } }, 'all')).toBe(true);
  });

  it('rows with no status match no concrete stage', () => {
    expect(getRowPrimaryRequestStage({ data: {} })).toBeNull();
    expect(rowMatchesRequestStage({ data: {} }, 'pending_approval')).toBe(false);
  });

  it('all-stage filter returns the same array', () => {
    const list = [{ id: 1, status: 'NEW_REQUEST' }];
    expect(filterRowsByRequestStage(list, 'all')).toBe(list);
  });
});

describe('stage counts', () => {
  it('starts every tab at zero', () => {
    expect(emptyRequestStageCounts()).toEqual({
      all: 0,
      pending_approval: 0,
      in_cart: 0,
      ordered: 0,
      delivered: 0,
      closed: 0,
    });
  });

  it('uses the API total for "all" when given', () => {
    const counts = countRowsByRequestStage([{ data: { status: 'IN_CART' } }], 57);
    expect(counts.all).toBe(57);
    expect(counts.in_cart).toBe(1);
  });

  it('ignores invalid totals', () => {
    const rows = [{ data: { status: 'IN_CART' } }, { data: { status: 'ORDERED' } }];
    expect(countRowsByRequestStage(rows, -1).all).toBe(2);
    expect(countRowsByRequestStage(rows, undefined).all).toBe(2);
  });

  it('skips rows with unmapped statuses', () => {
    const counts = countRowsByRequestStage([{ data: { status: 'PAID' } }]);
    expect(counts.all).toBe(1);
    expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(1);
  });

  it('counts legacy codes on their new page', () => {
    const counts = countRowsByRequestStage([
      { data: { status: 'VENDOR_IDENTIFIED' } },
      { data: { status: 'IN_SHIPPING' } },
    ]);
    expect(counts.pending_approval).toBe(1);
    expect(counts.ordered).toBe(1);
  });
});

describe('stage list URLs', () => {
  it('adds entity_type for records endpoints when missing', () => {
    const url = buildRequestStageListUrl('/crm-records/records/', {
      stage: 'in_cart',
      entityType: 'inventory_request',
    });
    expect(url).toContain('entity_type=inventory_request');
    expect(url).toContain('stage=in_cart');
    expect(url).toContain('page=1');
    expect(url).toContain('page_size=10');
    expect(url).not.toContain('include_count');
  });

  it("keeps the endpoint's own entity_type", () => {
    const url = buildRequestStageListUrl('/crm-records/records/?entity_type=unmannd_request', {
      stage: 'ordered',
      entityType: 'inventory_request',
    });
    expect(url).toContain('entity_type=unmannd_request');
    expect(url).not.toContain('entity_type=inventory_request');
  });

  it('does not add entity_type for other endpoints', () => {
    const url = buildRequestStageListUrl('/other/list/', { stage: 'ordered', entityType: 'x' });
    expect(url).not.toContain('entity_type');
  });

  it('applies forced params but not status filters on concrete stages', () => {
    const url = buildRequestStageListUrl('/crm-records/records/', {
      stage: 'delivered',
      forceQueryParams: { requester_id: 'u1', status: 'APPROVED', shipment_status: 'X', stage: 'y', blank: ' ' },
    });
    const params = new URLSearchParams(url.split('?')[1]);
    expect(params.get('requester_id')).toBe('u1');
    expect(params.get('stage')).toBe('delivered');
    expect(params.has('status')).toBe(false);
    expect(params.has('shipment_status')).toBe(false);
    expect(params.has('blank')).toBe(false);
  });

  it('keeps forced status filters on "all"', () => {
    const url = buildRequestStageListUrl('/crm-records/records/', {
      stage: 'all',
      forceQueryParams: { status: 'APPROVED' },
    });
    expect(url).toContain('status=APPROVED');
    expect(url).not.toContain('stage=');
  });

  it('extra params never override pagination', () => {
    const url = buildRequestStageListUrl('/crm-records/records/', {
      stage: 'all',
      page: 2,
      pageSize: 25,
      extraParams: new URLSearchParams('page=9&page_size=99&search=x'),
    });
    const params = new URLSearchParams(url.split('?')[1]);
    expect(params.get('page')).toBe('2');
    expect(params.get('page_size')).toBe('25');
    expect(params.get('search')).toBe('x');
  });

  it('keeps the endpoint stage on "all"', () => {
    const url = buildRequestStageListUrl('/crm-records/records/?stage=ordered', { stage: 'all' });
    expect(url).toContain('stage=ordered');
  });

  it('handles an empty endpoint', () => {
    expect(buildRequestStageListUrl('', { stage: 'all' })).toBe('?page=1&page_size=10');
  });
});

describe('parseListTotalCount', () => {
  it('reads alternative total keys', () => {
    expect(parseListTotalCount({ total_count: 3 })).toBe(3);
    expect(parseListTotalCount({ total: 5 })).toBe(5);
    expect(parseListTotalCount({ count: '7' })).toBe(7);
  });

  it('returns 0 for missing or invalid totals', () => {
    expect(parseListTotalCount(null)).toBe(0);
    expect(parseListTotalCount('x')).toBe(0);
    expect(parseListTotalCount({ count: -1 })).toBe(0);
    expect(parseListTotalCount({ page_meta: { total_count: null } })).toBe(0);
  });
});

describe('stage tabs from a loaded tenant config', () => {
  afterEach(() => {
    resetRequestStatusConfigCache();
    apiGet.mockReset();
  });

  async function loadCustom() {
    apiGet.mockResolvedValueOnce({
      data: {
        entity_type: 'unmannd_request',
        is_custom: true,
        pages: [
          { id: 'pending_approval', label: 'Waiting', order: 1 },
          { id: 'paid', label: 'Paid Items', order: 2 },
          { id: 'closed', label: 'Closed', order: 3 },
        ],
        statuses: [
          { value: 'NEW_REQUEST', label: 'New', color: 'blue', page: 'pending_approval', order: 1, active: true },
          { value: 'APPROVED', label: 'Approved', color: 'green', page: 'paid', order: 2, active: true },
          { value: 'PAID', label: 'Paid', color: 'green', page: 'paid', order: 3, active: true },
          { value: 'REJECTED', label: 'Rejected', color: 'gray', page: 'closed', order: 4, active: true },
        ],
      },
    });
    await loadRequestStatusConfig('unmannd_request');
  }

  it('builds tabs from the tenant pages', async () => {
    await loadCustom();
    const tabs = getRequestStageTabs('unmannd_request');
    expect(tabs.map((t) => t.id)).toEqual(['all', 'pending_approval', 'paid', 'closed']);
    expect(tabs[1].labelLines).toBeUndefined();
    expect(tabs[2].labelLines).toEqual(['Paid', 'Items']);
    expect(tabs[3].completeSuffix).toBe('Complete');
  });

  it('counts and filters rows with the tenant mapping', async () => {
    await loadCustom();
    const rows = [
      { data: { status: 'NEW_REQUEST' } },
      { data: { status: 'VENDOR_IDENTIFIED' } },
      { data: { status: 'PAID' } },
      { data: { status: 'IN_CART' } },
    ];
    const counts = countRowsByRequestStage(rows, undefined, 'unmannd_request');
    expect(counts).toEqual({ all: 4, pending_approval: 1, paid: 2, closed: 0 });
    expect(filterRowsByRequestStage(rows, 'paid', 'unmannd_request')).toHaveLength(2);
    expect(emptyRequestStageCounts('unmannd_request')).toEqual({
      all: 0,
      pending_approval: 0,
      paid: 0,
      closed: 0,
    });
  });

  it("prefers the row's own entity_type", async () => {
    await loadCustom();
    const row = { entity_type: 'inventory_request', data: { status: 'APPROVED' } };
    expect(getRowPrimaryRequestStage(row, 'unmannd_request')).toBe('pending_approval');
  });
});
