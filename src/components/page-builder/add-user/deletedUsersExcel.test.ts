import { format } from 'date-fns';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';

import type { DeletedUser } from '@/lib/api/services/deletedUsers';
import {
  DELETED_USERS_EXCEL_HEADERS,
  deletedUsersExcelFileName,
  deletedUsersExcelRows,
  downloadDeletedUsersExcel,
  formatLogDate,
} from './deletedUsersExcel';

const aoaToSheet = vi.fn((rows: unknown[]) => ({ rows }));
const bookNew = vi.fn(() => ({ sheets: [] as unknown[] }));
const bookAppendSheet = vi.fn((workbook: { sheets: unknown[] }, worksheet: unknown, name: string) => {
  workbook.sheets.push({ worksheet, name });
});
const write = vi.fn((_workbook?: unknown, _options?: unknown) => new Uint8Array([1, 2, 3]).buffer);

vi.mock('xlsx', () => ({
  utils: {
    aoa_to_sheet: (rows: unknown[]) => aoaToSheet(rows),
    book_new: () => bookNew(),
    book_append_sheet: (workbook: { sheets: unknown[] }, worksheet: unknown, name: string) =>
      bookAppendSheet(workbook, worksheet, name),
  },
  write: (workbook: unknown, options: unknown) => write(workbook, options),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

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
  ...overrides,
});

const NOW = new Date(2026, 10, 4, 15, 30);

const click = vi.fn();
const createObjectURL = vi.fn((_blob: Blob) => 'blob:deleted-users');
const revokeObjectURL = vi.fn();

beforeEach(() => {
  aoaToSheet.mockClear();
  bookNew.mockClear();
  bookAppendSheet.mockClear();
  write.mockClear().mockReturnValue(new Uint8Array([1, 2, 3]).buffer);
  vi.mocked(toast.success).mockReset();
  vi.mocked(toast.error).mockReset();
  click.mockReset();
  createObjectURL.mockClear().mockReturnValue('blob:deleted-users');
  revokeObjectURL.mockClear();
  vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
  vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
    if (tag === 'a') {
      return { href: '', download: '', click, remove: vi.fn() } as unknown as HTMLAnchorElement;
    }
    return document.createElement(tag);
  }) as typeof document.createElement);
  vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
});

describe('deletedUsersExcelRows', () => {
  it('writes one row per deleted user in the given order', () => {
    const rows = deletedUsersExcelRows([user({ name: 'Asha' }), user({ name: 'Ravi', email: 'ravi@praja.in' })]);

    expect(rows.map((row) => row[0])).toEqual(['Asha', 'Ravi']);
  });

  it('puts every field in the right column', () => {
    const [row] = deletedUsersExcelRows([user()]);

    expect(row).toHaveLength(DELETED_USERS_EXCEL_HEADERS.length);
    expect(row[0]).toBe('Asha Rao');
    expect(row[1]).toBe('asha@praja.in');
    expect(row[2]).toBe('RM');
    expect(row[3]).toBe('Big Boss');
    expect(row[4]).toBe(formatLogDate('2026-01-05T04:30:00Z'));
    expect(row[5]).toBe(formatLogDate('2026-11-04T10:00:00Z'));
    expect(row[6]).toBe('admin@praja.in');
  });

  it('shows the manager email when the manager has no name', () => {
    const [row] = deletedUsersExcelRows([user({ manager_name: null })]);

    expect(row[3]).toBe('boss@praja.in');
  });

  it('shows dashes and "Not recorded" for missing values', () => {
    const [row] = deletedUsersExcelRows([
      user({
        name: '',
        role_name: null,
        manager_name: null,
        manager_email: null,
        created_at: null,
        deleted_at: null,
        deleted_by: null,
      }),
    ]);

    expect(row).toEqual(['—', 'asha@praja.in', '—', '—', '—', '—', 'Not recorded']);
  });

  it('has no Reason column', () => {
    expect(DELETED_USERS_EXCEL_HEADERS).not.toContain('Reason');
    expect(DELETED_USERS_EXCEL_HEADERS).toEqual([
      'Name',
      'Email',
      'Role',
      'Manager',
      'Account created',
      'Deleted at',
      'Deleted by',
    ]);
  });
});

describe('formatLogDate', () => {
  it('reads a timestamp without a timezone as UTC, like the backend sends it', () => {
    expect(formatLogDate('2026-11-09T11:49:00')).toBe(format(new Date(Date.UTC(2026, 10, 9, 11, 49)), 'dd MMM yyyy, hh:mm a'));
    expect(formatLogDate('2026-11-09T11:49:00.123456')).toBe(formatLogDate('2026-11-09T11:49:00Z'));
    expect(formatLogDate('2026-11-09 11:49:00')).toBe(formatLogDate('2026-11-09T11:49:00Z'));
  });

  it('keeps timestamps that already carry a timezone', () => {
    expect(formatLogDate('2026-11-09T17:19:00+05:30')).toBe(formatLogDate('2026-11-09T11:49:00Z'));
    expect(formatLogDate('2026-11-09T11:49:00Z')).toBe(format(new Date(Date.UTC(2026, 10, 9, 11, 49)), 'dd MMM yyyy, hh:mm a'));
  });

  it('formats a date with day, month, year and time', () => {
    expect(formatLogDate('2026-11-04T10:00:00')).toMatch(/^04 Nov 2026, \d{2}:\d{2} (AM|PM)$/);
  });

  it('returns empty text for missing or invalid dates', () => {
    expect(formatLogDate(null)).toBe('');
    expect(formatLogDate(undefined)).toBe('');
    expect(formatLogDate('not a date')).toBe('');
  });
});

describe('deletedUsersExcelFileName', () => {
  it("names the file with today's date", () => {
    expect(deletedUsersExcelFileName(NOW)).toBe('Deleted_Users_Report_04_Nov_2026.xlsx');
  });
});

describe('downloadDeletedUsersExcel', () => {
  it('writes a workbook with the header and one row per user', () => {
    const users = [user({ name: 'Asha' }), user({ id: 'log-2', name: 'Ravi' })];

    downloadDeletedUsersExcel(users, NOW);

    expect(aoaToSheet).toHaveBeenCalledWith([[...DELETED_USERS_EXCEL_HEADERS], ...deletedUsersExcelRows(users)]);
    expect(bookAppendSheet.mock.calls[0][2]).toBe('Deleted Users');
    expect(write).toHaveBeenCalledWith(expect.anything(), { bookType: 'xlsx', type: 'array' });
  });

  it('downloads a real .xlsx file and says it worked', () => {
    downloadDeletedUsersExcel([user()], NOW);

    expect(createObjectURL).toHaveBeenCalled();
    const blob = createObjectURL.mock.calls[0]![0]!;
    expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(click).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith('Excel downloaded');
  });

  it('does nothing but say so when there is nobody to download', () => {
    downloadDeletedUsersExcel([], NOW);

    expect(aoaToSheet).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('No deleted users to download');
  });

  it('shows an error and downloads nothing when Excel cannot be built', () => {
    write.mockImplementation(() => {
      throw new Error('xlsx failed');
    });
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    downloadDeletedUsersExcel([user()], NOW);

    expect(toast.error).toHaveBeenCalledWith('Failed to generate Excel');
    expect(click).not.toHaveBeenCalled();
    error.mockRestore();
  });
});
