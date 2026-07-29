import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';
import {
  addLetterheadToPdf,
  downloadPdfBytes,
  PDF_LETTERHEAD_BOTTOM_MARGIN_MM,
  PDF_LETTERHEAD_TOP_MARGIN_MM,
} from '@/lib/pdf/letterhead';

export interface UsersReportRow {
  name: string;
  email: string;
  department?: string;
  role?: { name?: string } | null;
  created_at: string;
  /** CSE daily target is a resolve-rate goal (%); others use a count-based daily target. */
  supportResolveRateGoal?: string | number;
  dailyTarget?: string | number;
}

function isCseRoleName(name?: string): boolean {
  const upper = (name ?? '').toUpperCase();
  return upper.includes('CSE') || upper.includes('CUSTOMER SUPPORT');
}

function isBlankValue(value?: string | number): boolean {
  return value === undefined || value === null || value === '—' || value === '';
}

/** CSE rows show the resolve-rate goal as a percentage; everyone else the daily target. */
function formatTargetForReport(row: UsersReportRow): string {
  if (isCseRoleName(row.role?.name)) {
    return isBlankValue(row.supportResolveRateGoal) ? '—' : `${row.supportResolveRateGoal}%`;
  }
  return isBlankValue(row.dailyTarget) ? '—' : String(row.dailyTarget);
}

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** Internal/test accounts omitted from exported users PDF. */
const PDF_EXCLUDED_EMAILS = new Set([
  'bibhab1208@gmail.com',
  'bibhabindia2@gmail.com',
  'bibhabindia@gmail.com',
  'bibhab.pyro@thecircleapp.in',
  'bibhab@thepyro.ai',
  'ritamvlog@gmail.com',
  'ritam.pyro@circleapp.in',
  'harisudhan@thepyro.ai',
  'anirudh@thepyro.ai',
]);

function isExcludedFromUsersPdf(email: string | undefined | null): boolean {
  if (!email) return true;
  return PDF_EXCLUDED_EMAILS.has(email.trim().toLowerCase());
}

function formatCreatedAt(value: string) {
  return format(
    new Date(new Date(value).getTime() + IST_OFFSET_MS),
    'MMM d, yyyy h:mm a',
  );
}

export async function downloadUsersReportPdf(users: UsersReportRow[]) {
  const rows = users.filter(
    (user) => user.name && user.email && !isExcludedFromUsersPdf(user.email),
  );
  if (rows.length === 0) {
    toast.error('No users to download');
    return;
  }

  const marginX = 12;
  const topMarginY = PDF_LETTERHEAD_TOP_MARGIN_MM;
  const bottomMarginY = PDF_LETTERHEAD_BOTTOM_MARGIN_MM;
  const filename = `Users_Report_${format(new Date(), 'dd_MMM_yyyy')}.pdf`;

  try {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    doc.setFontSize(16);
    doc.text('Users Report', marginX, topMarginY);

    doc.setFontSize(10);
    doc.text(`Generated: ${format(new Date(), 'MMM d, yyyy h:mm a')}`, marginX, topMarginY + 8);
    doc.text(`Total users: ${rows.length}`, marginX, topMarginY + 16);

    autoTable(doc, {
      head: [['Name', 'Email', 'Department', 'Role', 'Target', 'Created At']],
      body: rows.map((user) => [
        user.name,
        user.email,
        user.department || '—',
        user.role?.name || 'No Role',
        formatTargetForReport(user),
        formatCreatedAt(user.created_at),
      ]),
      startY: topMarginY + 24,
      margin: {
        top: topMarginY,
        bottom: bottomMarginY,
        left: marginX,
        right: marginX,
      },
      styles: { fontSize: 9 },
      headStyles: { fillColor: [0, 0, 0] },
    });

    const contentBytes = doc.output('arraybuffer');
    const { bytes, usedLetterhead } = await addLetterheadToPdf(contentBytes);
    downloadPdfBytes(bytes, filename);

    if (!usedLetterhead) {
      toast.warning('Letterhead PDF not found, downloaded without letterhead');
    } else {
      toast.success('PDF downloaded');
    }
  } catch (error) {
    console.error('PDF download failed:', error);
    toast.error('Failed to generate PDF');
  }
}
