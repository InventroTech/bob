import {
  formatDisplayDate,
  type ProcurementRequestRow,
} from './fetchProcurementDashboardData';

export type ReportId =
  | 'spend'
  | 'supplier'
  | 'department'
  | 'po'
  | 'invoice'
  | 'payment'
  | 'budget'
  | 'tax';

function downloadCsv(filename: string, header: string[], lines: string[][]) {
  const body = lines.map((cols) =>
    cols.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')
  );
  const blob = new Blob([[header.join(','), ...body].join('\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function stamp(): string {
  return new Date().toISOString().slice(0, 10);
}

function sumBy(
  rows: ProcurementRequestRow[],
  keyFn: (r: ProcurementRequestRow) => string
): { key: string; count: number; amount: number }[] {
  const map = new Map<string, { count: number; amount: number }>();
  for (const r of rows) {
    const key = keyFn(r) || '—';
    const cur = map.get(key) ?? { count: 0, amount: 0 };
    cur.count += 1;
    cur.amount += r.amount;
    map.set(key, cur);
  }
  return [...map.entries()]
    .map(([key, v]) => ({ key, ...v }))
    .sort((a, b) => b.amount - a.amount);
}

function detailLines(rows: ProcurementRequestRow[]): string[][] {
  return rows.map((r) => [
    r.id,
    r.itemName,
    r.vendor,
    formatDisplayDate(r.requestDate),
    formatDisplayDate(r.requirementDate),
    String(r.amount),
    r.status,
    r.category,
    r.department,
  ]);
}

const DETAIL_HEADER = [
  'Request ID',
  'Item',
  'Vendor',
  'Request Date',
  'Requirement Date',
  'Amount',
  'Status',
  'Shipment Type',
  'Department',
];

/** Build and download a CSV for a report tile from live request rows. */
export function downloadReportCsv(reportId: ReportId, rows: ProcurementRequestRow[]): string {
  const date = stamp();

  switch (reportId) {
    case 'spend': {
      const byCategory = sumBy(rows, (r) => r.category);
      downloadCsv(
        `procurement-spend-${date}.csv`,
        ['Shipment Type', 'Request Count', 'Total Amount'],
        byCategory.map((r) => [r.key, String(r.count), String(r.amount)])
      );
      return 'Procurement Spend';
    }
    case 'supplier': {
      const byVendor = sumBy(rows, (r) => r.vendor);
      downloadCsv(
        `supplier-performance-${date}.csv`,
        ['Vendor', 'Request Count', 'Total Amount', 'Avg Amount'],
        byVendor.map((r) => [
          r.key,
          String(r.count),
          String(r.amount),
          String(r.count ? Math.round((r.amount / r.count) * 100) / 100 : 0),
        ])
      );
      return 'Supplier Performance';
    }
    case 'department': {
      const byDept = sumBy(rows, (r) => r.department);
      downloadCsv(
        `department-spending-${date}.csv`,
        ['Department', 'Request Count', 'Total Amount'],
        byDept.map((r) => [r.key, String(r.count), String(r.amount)])
      );
      return 'Department Spending';
    }
    case 'po': {
      // Closest to "PO" in current data: vendor identified / in shipping requests.
      const poRows = rows.filter(
        (r) =>
          r.status === 'VENDOR_IDENTIFIED' ||
          r.status === 'IN_CART' ||
          r.status === 'IN_SHIPPING'
      );
      downloadCsv(`purchase-orders-${date}.csv`, DETAIL_HEADER, detailLines(poRows));
      return 'Purchase Order';
    }
    case 'invoice': {
      const byStatus = sumBy(rows, (r) => r.status || 'UNKNOWN');
      downloadCsv(
        `invoice-status-${date}.csv`,
        ['Status', 'Request Count', 'Total Amount'],
        byStatus.map((r) => [r.key, String(r.count), String(r.amount)])
      );
      return 'Invoice Status';
    }
    case 'payment': {
      downloadCsv(`payment-report-${date}.csv`, DETAIL_HEADER, detailLines(rows));
      return 'Payment Report';
    }
    case 'budget': {
      // No budget master yet — export department spend as utilization proxy.
      const byDept = sumBy(rows, (r) => r.department);
      const total = byDept.reduce((a, r) => a + r.amount, 0) || 1;
      downloadCsv(
        `budget-utilization-${date}.csv`,
        ['Department', 'Request Count', 'Spend Amount', 'Share of Total %'],
        byDept.map((r) => [
          r.key,
          String(r.count),
          String(r.amount),
          String(Math.round((r.amount / total) * 1000) / 10),
        ])
      );
      return 'Budget Utilization';
    }
    case 'tax': {
      // No tax field yet — export line amounts for offline tax calc.
      downloadCsv(
        `tax-report-${date}.csv`,
        ['Request ID', 'Vendor', 'Shipment Type', 'Amount', 'Estimated GST 18%', 'Status'],
        rows.map((r) => [
          r.id,
          r.vendor,
          r.category,
          String(r.amount),
          String(Math.round(r.amount * 0.18 * 100) / 100),
          r.status,
        ])
      );
      return 'Tax Report';
    }
    default:
      downloadCsv(`procurement-report-${date}.csv`, DETAIL_HEADER, detailLines(rows));
      return 'Report';
  }
}
