import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ORDERED_STATUSES,
  PENDING_STATUSES,
  REJECTED_STATUSES,
  fetchProcurementDashboardData,
  type ProcurementRequestRow,
} from './fetchProcurementDashboardData';
import { downloadReportCsv } from './downloadReportCsv';

const apiGet = vi.fn();
vi.mock('@/lib/api/client', () => ({ apiClient: { get: (...args: unknown[]) => apiGet(...args) } }));

function record(id: number, status: string, amount: number, requestDate = '2026-06-01') {
  return { id, data: { status, estimated_cost: amount, request_date: requestDate, item_name: `Item ${id}` } };
}

describe('procurement status groups', () => {
  it('groups the combined statuses', () => {
    expect([...PENDING_STATUSES].sort()).toEqual(['NEW_REQUEST', 'ON_HOLD', 'REQ_TO_VERIFY']);
    expect([...ORDERED_STATUSES].sort()).toEqual(['APPROVED', 'DELIVERED', 'EXCEPTION', 'IN_CART', 'ORDERED']);
    expect([...REJECTED_STATUSES]).toEqual(['REJECTED']);
  });

  it('does not use legacy codes', () => {
    for (const set of [PENDING_STATUSES, ORDERED_STATUSES, REJECTED_STATUSES]) {
      expect(set.has('VENDOR_IDENTIFIED')).toBe(false);
      expect(set.has('IN_SHIPPING')).toBe(false);
    }
  });
});

describe('fetchProcurementDashboardData', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-15T12:00:00'));
    apiGet.mockResolvedValue({
      data: [
        record(1, 'NEW_REQUEST', 100),
        record(2, 'VENDOR_IDENTIFIED', 200),
        record(3, 'APPROVED', 50),
        record(4, 'IN_SHIPPING', 300),
        record(5, 'DELIVERED', 400),
        record(6, 'EXCEPTION', 25),
        record(7, 'in cart', 70),
        record(8, 'REJECTED', 10),
        record(9, 'REQ_TO_VERIFY', 5),
        record(10, 'ON_HOLD', 7),
        record(11, 'APPROVED', 1000, '2025-06-01'),
      ],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    apiGet.mockReset();
  });

  it('normalizes row statuses (legacy and casing)', async () => {
    const { rows } = await fetchProcurementDashboardData('unmannd_request');
    const byId = Object.fromEntries(rows.map((r) => [r.id, r.status]));
    expect(byId['2']).toBe('APPROVED');
    expect(byId['4']).toBe('ORDERED');
    expect(byId['7']).toBe('IN_CART');
  });

  it('builds KPI totals from the combined statuses', async () => {
    const { kpis } = await fetchProcurementDashboardData('unmannd_request');
    const byId = Object.fromEntries(kpis.map((k) => [k.id, k]));
    expect(byId.total.amount).toBe(1167);
    expect(byId.new.amount).toBe(100);
    expect(byId.to_verify.amount).toBe(5);
    expect(byId.on_hold.amount).toBe(7);
    expect(byId.vendor_identified.label).toBe('Approved');
    expect(byId.vendor_identified.amount).toBe(250);
    expect(byId.vendor_identified.priorAmount).toBe(1000);
    expect(byId.rejected.amount).toBe(10);
    expect(byId.in_shipping.label).toBe('Ordered');
    expect(byId.in_shipping.amount).toBe(725);
  });

  it('ages pending, approved and in-cart requests', async () => {
    const { aging } = await fetchProcurementDashboardData('unmannd_request');
    const byKey = Object.fromEntries(aging.map((b) => [b.key, b]));
    expect(byKey['0_30']).toMatchObject({ count: 6, amount: 432 });
    expect(byKey['90_plus']).toMatchObject({ count: 1, amount: 1000 });
    expect(byKey['31_60'].count).toBe(0);
  });

  it('requests the entity type with paging', async () => {
    await fetchProcurementDashboardData('unmannd_request');
    const url = String(apiGet.mock.calls[0][0]);
    expect(url).toContain('entity_type=unmannd_request');
    expect(url).toContain('include_count=true');
  });
});

describe('downloadReportCsv purchase order report', () => {
  let csvParts: string[] = [];

  beforeEach(() => {
    csvParts = [];
    vi.stubGlobal(
      'Blob',
      class {
        constructor(parts: string[]) {
          csvParts = parts;
        }
      }
    );
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:x'), revokeObjectURL: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function row(id: string, status: string): ProcurementRequestRow {
    return {
      id,
      itemName: 'Item',
      vendor: 'V',
      requestDate: null,
      requirementDate: null,
      amount: 1,
      status,
      category: 'C',
      department: 'D',
      trackingLink: null,
      raw: { id } as never,
    };
  }

  it('includes approved onwards and excludes pending / rejected', () => {
    const rows = ['NEW_REQUEST', 'REQ_TO_VERIFY', 'ON_HOLD', 'REJECTED', 'APPROVED', 'IN_CART', 'ORDERED', 'DELIVERED', 'EXCEPTION']
      .map((s) => row(s, s));
    expect(downloadReportCsv('po', rows)).toBe('Purchase Order');
    const lines = csvParts.join('').split('\n').slice(1);
    const ids = lines.map((l) => l.split(',')[0].replace(/"/g, ''));
    expect(ids).toEqual(['APPROVED', 'IN_CART', 'ORDERED', 'DELIVERED', 'EXCEPTION']);
  });

  it('groups the invoice report by combined status', () => {
    downloadReportCsv('invoice', [row('1', 'ORDERED'), row('2', 'ORDERED'), row('3', 'DELIVERED')]);
    const body = csvParts.join('');
    expect(body).toContain('"ORDERED","2","2"');
    expect(body).toContain('"DELIVERED","1","1"');
  });
});
