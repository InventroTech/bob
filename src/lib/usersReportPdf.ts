import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';
import {
  addLetterheadToPdf,
  downloadPdfBytes,
  PDF_LETTERHEAD_BOTTOM_MARGIN_MM,
  PDF_LETTERHEAD_TOP_MARGIN_MM,
} from '@/lib/pdfLetterhead';

export interface UsersReportRow {
  name: string;
  email: string;
  department?: string;
  role?: { name?: string } | null;
  created_at: string;
}

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function formatCreatedAt(value: string) {
  return format(
    new Date(new Date(value).getTime() + IST_OFFSET_MS),
    'MMM d, yyyy h:mm a',
  );
}

export async function downloadUsersReportPdf(users: UsersReportRow[]) {
  const rows = users.filter((user) => user.name && user.email);
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
      head: [['Name', 'Email', 'Department', 'Role', 'Created At']],
      body: rows.map((user) => [
        user.name,
        user.email,
        user.department || '—',
        user.role?.name || 'No Role',
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
