import { format } from 'date-fns';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

import type { DeletedUser } from '@/lib/api/services/deletedUsers';

export const DELETED_USERS_EXCEL_HEADERS = [
  'Name',
  'Email',
  'Role',
  'Manager',
  'Account created',
  'Deleted at',
  'Deleted by',
] as const;

/** Only this account gets an editable download; everyone else gets a protected sheet. */
export const DELETED_USERS_EXCEL_EDITOR_EMAIL = 'durgaprasanth.ambati@praja.buzz';

const SHEET_NAME = 'Deleted Users';

export function canEditDeletedUsersExcel(downloaderEmail: string | null | undefined): boolean {
  return (downloaderEmail ?? '').trim().toLowerCase() === DELETED_USERS_EXCEL_EDITOR_EMAIL;
}

/** The backend stores UTC without a zone (USE_TZ = False), so a bare timestamp is read as UTC, not local time. */
const asUtc = (value: string) =>
  /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value.trim().replace(' ', 'T')}Z`;

export function formatLogDate(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(asUtc(value));
  return Number.isNaN(date.getTime()) ? '' : format(date, 'dd MMM yyyy, hh:mm a');
}

/** One table row per deleted user, in the order given, with dashes for missing values. */
export function deletedUsersExcelRows(users: DeletedUser[]): string[][] {
  return users.map((user) => [
    user.name || '—',
    user.email,
    user.role_name || '—',
    user.manager_name || user.manager_email || '—',
    formatLogDate(user.created_at) || '—',
    formatLogDate(user.deleted_at) || '—',
    user.deleted_by || 'Not recorded',
  ]);
}

export function deletedUsersExcelFileName(now: Date = new Date()): string {
  return `Deleted_Users_Report_${format(now, 'dd_MMM_yyyy')}.xlsx`;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/**
 * Builds a real .xlsx of deleted users (not a renamed CSV). Only writes rows already
 * held in memory — never parses a file — so it doesn't use the xlsx package's read path.
 * Anyone may download; only {@link DELETED_USERS_EXCEL_EDITOR_EMAIL} gets an editable sheet.
 */
export function downloadDeletedUsersExcel(
  users: DeletedUser[],
  now: Date = new Date(),
  downloaderEmail?: string | null,
): void {
  if (users.length === 0) {
    toast.error('No deleted users to download');
    return;
  }

  try {
    const worksheet = XLSX.utils.aoa_to_sheet([
      [...DELETED_USERS_EXCEL_HEADERS],
      ...deletedUsersExcelRows(users),
    ]);
    if (!canEditDeletedUsersExcel(downloaderEmail)) {
      // Soft lock in Excel/Google Sheets: cells stay selectable, edits need Unprotect Sheet.
      worksheet['!protect'] = {
        selectLockedCells: true,
        selectUnlockedCells: true,
      };
    }
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, SHEET_NAME);
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    triggerDownload(blob, deletedUsersExcelFileName(now));
    toast.success('Excel downloaded');
  } catch (error) {
    console.error('Deleted users Excel download failed:', error);
    toast.error('Failed to generate Excel');
  }
}
