import { describe, expect, it } from 'vitest';
import {
  REQUEST_STAGE_SERVER_FILTERS,
  applyRequestStageFiltersToParams,
  buildRequestStageListUrl,
  filterRowsByRequestStage,
  formatStageCount,
  getRowPrimaryRequestStage,
  parseListTotalCount,
  rowMatchesRequestStage,
} from './requestStageTabs';

describe('requestStageTabs', () => {
  const rows = [
    { id: '1', status: 'NEW_REQUEST' },
    { id: '2', data: { status: 'ON_HOLD' } },
    { id: '3', data: { status: 'IN_CART' } },
    { id: '4', data: { status: 'IN_SHIPPING', shipment_status: 'ORDERED' } },
    { id: '5', data: { status: 'VENDOR_IDENTIFIED', shipment_status: 'DELIVERED' } },
    { id: '6', data: { status: 'REJECTED' } },
    { id: '7', data: { status: 'VENDOR_IDENTIFIED' } },
  ];

  it('matches pending / cart / ordered / delivered / closed', () => {
    expect(rowMatchesRequestStage(rows[0], 'pending_approval')).toBe(true);
    expect(rowMatchesRequestStage(rows[2], 'in_cart')).toBe(true);
    expect(rowMatchesRequestStage(rows[3], 'ordered')).toBe(true);
    expect(rowMatchesRequestStage(rows[4], 'delivered')).toBe(true);
    expect(rowMatchesRequestStage(rows[5], 'invoiced_closed')).toBe(true);
  });

  it('assigns a single primary stage (no double-count)', () => {
    expect(getRowPrimaryRequestStage(rows[4])).toBe('delivered');
    expect(rowMatchesRequestStage(rows[4], 'ordered')).toBe(false);
    expect(getRowPrimaryRequestStage(rows[6])).toBeNull();
  });

  it('filters by stage', () => {
    expect(filterRowsByRequestStage(rows, 'in_cart')).toHaveLength(1);
  });

  it('builds server filters and list URLs', () => {
    expect(REQUEST_STAGE_SERVER_FILTERS.pending_approval?.status).toContain('NEW_REQUEST');
    expect(REQUEST_STAGE_SERVER_FILTERS.ordered?.shipment_status).toBe('ORDERED');
    expect(REQUEST_STAGE_SERVER_FILTERS.delivered?.shipment_status).toBe('DELIVERED');
    expect(REQUEST_STAGE_SERVER_FILTERS.in_cart?.status).toBe('IN_CART');
    expect(REQUEST_STAGE_SERVER_FILTERS.invoiced_closed?.status).toBe('REJECTED');
    const params = new URLSearchParams('status=FOO&page=3');
    applyRequestStageFiltersToParams(params, 'in_cart');
    expect(params.get('status')).toBe('IN_CART');

    const allParams = new URLSearchParams('status=VENDOR_IDENTIFIED&shipment_status=ORDERED');
    applyRequestStageFiltersToParams(allParams, 'all');
    expect(allParams.get('status')).toBe('VENDOR_IDENTIFIED');
    expect(allParams.get('shipment_status')).toBe('ORDERED');

    const url = buildRequestStageListUrl('/crm-records/records/?entity_type=unmannd_request&page=9', {
      stage: 'ordered',
      page: 1,
      pageSize: 1,
      includeCount: true,
    });
    expect(url).toContain('shipment_status=ORDERED');
    expect(url).toContain('page=1');
    expect(url).toContain('page_size=1');
    expect(url).toContain('include_count=true');
    expect(url).not.toContain('page=9');
  });

  it('treats REJECTED as closed; shipment ORDERED beats IN_CART (no double-count)', () => {
    expect(getRowPrimaryRequestStage({ data: { status: 'REJECTED', shipment_status: 'DELIVERED' } })).toBe(
      'invoiced_closed'
    );
    expect(
      getRowPrimaryRequestStage({ data: { status: 'IN_CART', shipment_status: 'ORDERED' } })
    ).toBe('ordered');
    expect(rowMatchesRequestStage({ data: { status: 'IN_CART', shipment_status: 'ORDERED' } }, 'in_cart')).toBe(
      false
    );
  });

  it('parses list totals', () => {
    expect(parseListTotalCount({ page_meta: { total_count: 14 } })).toBe(14);
    expect(parseListTotalCount({ count: 8 })).toBe(8);
  });

  it('pads stage counts to two digits', () => {
    expect(formatStageCount(2)).toBe('02');
    expect(formatStageCount(120)).toBe('120');
  });
});
