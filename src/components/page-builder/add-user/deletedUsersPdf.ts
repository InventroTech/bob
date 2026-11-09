import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PDFDocument, rgb } from 'pdf-lib';
import { toast } from 'sonner';

import type { DeletedUser } from '@/lib/api/services/deletedUsers';
import {
  addLetterheadToPdf,
  downloadPdfBytes,
  PDF_LETTERHEAD_BOTTOM_MARGIN_MM,
  PDF_LETTERHEAD_TOP_MARGIN_MM,
} from '@/lib/pdf/letterhead';

export const DELETED_USERS_PDF_HEADERS = [
  'Name',
  'Email',
  'Role',
  'Manager',
  'Account created',
  'Deleted at',
  'Deleted by',
] as const;

/** The backend stores UTC without a zone (USE_TZ = False), so a bare timestamp is read as UTC, not local time. */
const asUtc = (value: string) =>
  /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value.trim().replace(' ', 'T')}Z`;

export function formatLogDate(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(asUtc(value));
  return Number.isNaN(date.getTime()) ? '' : format(date, 'dd MMM yyyy, hh:mm a');
}

/** One table row per deleted user, in the order given, with dashes for missing values. */
export function deletedUsersPdfRows(users: DeletedUser[]): string[][] {
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

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

/**
 * Box over the "Custom IT built around your workflow" line in pyro-letterhead.pdf (mm from the
 * top-left of an A4 page). It sits between the logo and the bottom of the black header, so
 * filling it black removes the line. The letterhead file is shared with other reports, so it
 * is covered here instead of edited.
 */
export const LETTERHEAD_TAGLINE_BOX_MM = { x: 10, y: 29.5, width: 95, height: 6 } as const;

export async function hideLetterheadTagline(bytes: ArrayBuffer | Uint8Array): Promise<ArrayBuffer | Uint8Array> {
  try {
    const pdf = await PDFDocument.load(bytes);
    const box = LETTERHEAD_TAGLINE_BOX_MM;
    pdf.getPages().forEach((page) => {
      const { width, height } = page.getSize();
      const boxHeight = (box.height / A4_HEIGHT_MM) * height;
      page.drawRectangle({
        x: (box.x / A4_WIDTH_MM) * width,
        y: height - (box.y / A4_HEIGHT_MM) * height - boxHeight,
        width: (box.width / A4_WIDTH_MM) * width,
        height: boxHeight,
        color: rgb(0, 0, 0),
      });
    });
    return await pdf.save();
  } catch (error) {
    console.warn('Could not hide the letterhead tagline:', error);
    return bytes;
  }
}

export function deletedUsersPdfFileName(now: Date = new Date()): string {
  return `Deleted_Users_Report_${format(now, 'dd_MMM_yyyy')}.pdf`;
}

export async function downloadDeletedUsersPdf(users: DeletedUser[], now: Date = new Date()): Promise<void> {
  if (users.length === 0) {
    toast.error('No deleted users to download');
    return;
  }

  const marginX = 12;
  const topMarginY = PDF_LETTERHEAD_TOP_MARGIN_MM;
  const bottomMarginY = PDF_LETTERHEAD_BOTTOM_MARGIN_MM;

  try {
    // Portrait to match the letterhead, which is stretched to each page's size.
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    doc.setFontSize(16);
    doc.text('Deleted Users Report', marginX, topMarginY);
    doc.setFontSize(10);
    doc.text(`Generated: ${format(now, 'MMM d, yyyy h:mm a')}`, marginX, topMarginY + 8);
    doc.text(`Total deleted users: ${users.length}`, marginX, topMarginY + 16);

    autoTable(doc, {
      head: [[...DELETED_USERS_PDF_HEADERS]],
      body: deletedUsersPdfRows(users),
      startY: topMarginY + 24,
      margin: { top: topMarginY, bottom: bottomMarginY, left: marginX, right: marginX },
      styles: { fontSize: 7, overflow: 'linebreak', cellPadding: 1.5 },
      headStyles: { fillColor: [0, 0, 0] },
      columnStyles: {
        0: { cellWidth: 26 },
        1: { cellWidth: 42 },
        2: { cellWidth: 16 },
        3: { cellWidth: 24 },
        4: { cellWidth: 24 },
        5: { cellWidth: 24 },
        6: { cellWidth: 30 },
      },
    });

    const { bytes, usedLetterhead } = await addLetterheadToPdf(doc.output('arraybuffer'));
    downloadPdfBytes(usedLetterhead ? await hideLetterheadTagline(bytes) : bytes, deletedUsersPdfFileName(now));

    if (usedLetterhead) {
      toast.success('PDF downloaded');
    } else {
      toast.warning('Letterhead PDF not found, downloaded without letterhead');
    }
  } catch (error) {
    console.error('Deleted users PDF download failed:', error);
    toast.error('Failed to generate PDF');
  }
}
