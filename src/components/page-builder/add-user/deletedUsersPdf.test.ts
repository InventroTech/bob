import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';

import type { DeletedUser } from '@/lib/api/services/deletedUsers';
import {
  DELETED_USERS_PDF_HEADERS,
  deletedUsersPdfFileName,
  deletedUsersPdfRows,
  downloadDeletedUsersPdf,
  formatLogDate,
} from './deletedUsersPdf';

const autoTable = vi.fn();
const addLetterheadToPdf = vi.fn();
const downloadPdfBytes = vi.fn();
const pdf = { setFontSize: vi.fn(), text: vi.fn(), output: vi.fn(() => new ArrayBuffer(8)) };
const jsPDF = vi.fn((..._options: unknown[]) => pdf);

vi.mock('jspdf', () => ({ default: function (...args: unknown[]) { return jsPDF(...args); } }));
vi.mock('jspdf-autotable', () => ({ default: (...args: unknown[]) => autoTable(...args) }));
vi.mock('@/lib/pdf/letterhead', () => ({
  addLetterheadToPdf: (...args: unknown[]) => addLetterheadToPdf(...args),
  downloadPdfBytes: (...args: unknown[]) => downloadPdfBytes(...args),
  PDF_LETTERHEAD_TOP_MARGIN_MM: 62,
  PDF_LETTERHEAD_BOTTOM_MARGIN_MM: 58,
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));

const user = (overrides: Partial<DeletedUser> = {}): DeletedUser => ({
  id: 'log-1',
  name: 'Asha Rao',
  email: 'asha@praja.in',
  role_id: 'role-1',
  role_name: 'RM',
  manager_name: 'Big Boss',
  manager_email: 'boss@praja.in',
  created_at: '2026-01-05T04:30:00Z',
  deleted_at: '2026-11-04T10:00:00Z',
  deleted_by: 'admin@praja.in',
  deletion_reason: 'Left the company',
  ...overrides,
});

const NOW = new Date(2026, 10, 4, 15, 30);

beforeEach(() => {
  jsPDF.mockClear();
  autoTable.mockReset();
  downloadPdfBytes.mockReset();
  addLetterheadToPdf.mockReset().mockResolvedValue({ bytes: new Uint8Array([1]), usedLetterhead: true });
  pdf.setFontSize.mockClear();
  pdf.text.mockClear();
  pdf.output.mockClear();
  vi.mocked(toast.success).mockReset();
  vi.mocked(toast.error).mockReset();
  vi.mocked(toast.warning).mockReset();
});

describe('deletedUsersPdfRows', () => {
  it('writes one row per deleted user in the given order', () => {
    const rows = deletedUsersPdfRows([user({ name: 'Asha' }), user({ name: 'Ravi', email: 'ravi@praja.in' })]);

    expect(rows.map((row) => row[0])).toEqual(['Asha', 'Ravi']);
  });

  it('puts every field in the right column', () => {
    const [row] = deletedUsersPdfRows([user()]);

    expect(row).toHaveLength(DELETED_USERS_PDF_HEADERS.length);
    expect(row[0]).toBe('Asha Rao');
    expect(row[1]).toBe('asha@praja.in');
    expect(row[2]).toBe('RM');
    expect(row[3]).toBe('Big Boss');
    expect(row[4]).toBe(formatLogDate('2026-01-05T04:30:00Z'));
    expect(row[5]).toBe(formatLogDate('2026-11-04T10:00:00Z'));
    expect(row[6]).toBe('admin@praja.in');
  });

  it('shows the manager email when the manager has no name', () => {
    const [row] = deletedUsersPdfRows([user({ manager_name: null })]);

    expect(row[3]).toBe('boss@praja.in');
  });

  it('shows dashes and "Not recorded" for missing values', () => {
    const [row] = deletedUsersPdfRows([
      user({
        name: '',
        role_name: null,
        manager_name: null,
        manager_email: null,
        created_at: null,
        deleted_at: null,
        deleted_by: null,
        deletion_reason: null,
      }),
    ]);

    expect(row).toEqual(['—', 'asha@praja.in', '—', '—', '—', '—', 'Not recorded']);
  });

  it('has no Reason column', () => {
    expect(DELETED_USERS_PDF_HEADERS).not.toContain('Reason');
    expect(DELETED_USERS_PDF_HEADERS).toEqual([
      'Name',
      'Email',
      'Role',
      'Manager',
      'Account created',
      'Deleted at',
      'Deleted by',
    ]);
  });

  it('never puts the deletion reason in the PDF', () => {
    const [row] = deletedUsersPdfRows([user({ deletion_reason: 'Left the company' })]);

    expect(row).not.toContain('Left the company');
    expect(row).toHaveLength(7);
  });
});

describe('formatLogDate', () => {
  it('formats a date with day, month, year and time', () => {
    expect(formatLogDate('2026-11-04T10:00:00')).toMatch(/^04 Nov 2026, \d{2}:\d{2} (AM|PM)$/);
  });

  it('returns empty text for missing or invalid dates', () => {
    expect(formatLogDate(null)).toBe('');
    expect(formatLogDate(undefined)).toBe('');
    expect(formatLogDate('not a date')).toBe('');
  });
});

describe('deletedUsersPdfFileName', () => {
  it("names the file with today's date", () => {
    expect(deletedUsersPdfFileName(NOW)).toBe('Deleted_Users_Report_04_Nov_2026.pdf');
  });
});

describe('downloadDeletedUsersPdf', () => {
  it('builds a portrait A4 report with a title, date and total', async () => {
    await downloadDeletedUsersPdf([user(), user({ id: 'log-2' })], NOW);

    expect(jsPDF).toHaveBeenCalledWith({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const texts = pdf.text.mock.calls.map((call) => call[0]);
    expect(texts).toContain('Deleted Users Report');
    expect(texts).toContain('Generated: Nov 4, 2026 3:30 PM');
    expect(texts).toContain('Total deleted users: 2');
  });

  it('puts the header and one row per user in the table', async () => {
    const users = [user({ name: 'Asha' }), user({ id: 'log-2', name: 'Ravi' })];

    await downloadDeletedUsersPdf(users, NOW);

    const options = autoTable.mock.calls[0][1];
    expect(options.head).toEqual([[...DELETED_USERS_PDF_HEADERS]]);
    expect(options.body).toEqual(deletedUsersPdfRows(users));
  });

  it('sizes one column per header and fills the page width between the margins', async () => {
    await downloadDeletedUsersPdf([user()], NOW);

    const options = autoTable.mock.calls[0][1];
    const widths = Object.values(options.columnStyles as Record<string, { cellWidth: number }>).map((c) => c.cellWidth);
    expect(widths).toHaveLength(DELETED_USERS_PDF_HEADERS.length);
    expect(widths.reduce((sum, w) => sum + w, 0)).toBe(210 - options.margin.left - options.margin.right);
  });

  it('downloads the file with the letterhead and says it worked', async () => {
    await downloadDeletedUsersPdf([user()], NOW);

    expect(addLetterheadToPdf).toHaveBeenCalledTimes(1);
    expect(downloadPdfBytes).toHaveBeenCalledWith(new Uint8Array([1]), 'Deleted_Users_Report_04_Nov_2026.pdf');
    expect(toast.success).toHaveBeenCalledWith('PDF downloaded');
  });

  it('still downloads, with a warning, when the letterhead is missing', async () => {
    addLetterheadToPdf.mockResolvedValue({ bytes: new ArrayBuffer(4), usedLetterhead: false });

    await downloadDeletedUsersPdf([user()], NOW);

    expect(downloadPdfBytes).toHaveBeenCalledTimes(1);
    expect(toast.warning).toHaveBeenCalledWith('Letterhead PDF not found, downloaded without letterhead');
  });

  it('does nothing but say so when there is nobody to download', async () => {
    await downloadDeletedUsersPdf([], NOW);

    expect(jsPDF).not.toHaveBeenCalled();
    expect(downloadPdfBytes).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('No deleted users to download');
  });

  it('shows an error and downloads nothing when the PDF cannot be built', async () => {
    autoTable.mockImplementation(() => {
      throw new Error('boom');
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await downloadDeletedUsersPdf([user()], NOW);

    expect(downloadPdfBytes).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('Failed to generate PDF');
  });
});
