import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PDFDocument, PDFPage } from 'pdf-lib';

import type { DeletedUser } from '@/lib/api/services/deletedUsers';
import { downloadDeletedUsersPdf, hideLetterheadTagline, LETTERHEAD_TAGLINE_BOX_MM } from './deletedUsersPdf';

const addLetterheadToPdf = vi.fn();
const downloadPdfBytes = vi.fn();
const pdf = { setFontSize: vi.fn(), text: vi.fn(), output: vi.fn(() => new ArrayBuffer(8)) };

vi.mock('jspdf', () => ({ default: function () { return pdf; } }));
vi.mock('jspdf-autotable', () => ({ default: vi.fn() }));
vi.mock('@/lib/pdf/letterhead', () => ({
  addLetterheadToPdf: (...args: unknown[]) => addLetterheadToPdf(...args),
  downloadPdfBytes: (...args: unknown[]) => downloadPdfBytes(...args),
  PDF_LETTERHEAD_TOP_MARGIN_MM: 62,
  PDF_LETTERHEAD_BOTTOM_MARGIN_MM: 58,
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));

const A4_PT: [number, number] = [595.28, 841.89];
const MM = 72 / 25.4;

const pdfWithPages = async (count: number, size: [number, number] = A4_PT) => {
  const doc = await PDFDocument.create();
  for (let i = 0; i < count; i += 1) doc.addPage(size);
  return doc.save();
};

const deletedUser: DeletedUser = {
  id: 'log-1',
  name: 'Asha Rao',
  email: 'asha@praja.in',
  role_id: 'role-1',
  role_name: 'RM',
  manager_name: '',
  manager_email: '',
  created_at: null,
  deleted_at: '2026-11-04T10:00:00Z',
  deleted_by: 'admin@praja.in',
  deletion_reason: '',
};

let drawRectangle: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  drawRectangle = vi.spyOn(PDFPage.prototype, 'drawRectangle');
  addLetterheadToPdf.mockReset();
  downloadPdfBytes.mockReset();
});

afterEach(() => {
  drawRectangle.mockRestore();
});

describe('hideLetterheadTagline', () => {
  it('covers the tagline with one black box on every page', async () => {
    const result = await hideLetterheadTagline(await pdfWithPages(3));

    expect(drawRectangle).toHaveBeenCalledTimes(3);
    expect((await PDFDocument.load(result)).getPageCount()).toBe(3);
  });

  it('places the box over the tagline, below the logo and inside the black header', async () => {
    await hideLetterheadTagline(await pdfWithPages(1));

    const { x, y, width, height, color } = drawRectangle.mock.calls[0][0] as {
      x: number; y: number; width: number; height: number; color: { red: number; green: number; blue: number };
    };
    const topMm = (A4_PT[1] - y - height) / MM;
    const bottomMm = (A4_PT[1] - y) / MM;

    expect(color).toMatchObject({ red: 0, green: 0, blue: 0 });
    expect(x / MM).toBeCloseTo(LETTERHEAD_TAGLINE_BOX_MM.x, 0);
    expect(topMm).toBeGreaterThan(28.3);
    expect(topMm).toBeLessThan(30.8);
    expect(bottomMm).toBeGreaterThan(33.8);
    expect(bottomMm).toBeLessThan(38);
    expect(x / MM).toBeLessThan(11.5);
    expect((x + width) / MM).toBeGreaterThan(103.1);
  });

  it('scales the box with the page, like the stretched letterhead', async () => {
    const half: [number, number] = [A4_PT[0] / 2, A4_PT[1] / 2];
    await hideLetterheadTagline(await pdfWithPages(1, half));
    await hideLetterheadTagline(await pdfWithPages(1));

    const [small, full] = drawRectangle.mock.calls.map(
      (args: unknown[]) => args[0] as { x: number; width: number; height: number }
    );
    expect(small.x).toBeCloseTo(full.x / 2, 3);
    expect(small.width).toBeCloseTo(full.width / 2, 3);
    expect(small.height).toBeCloseTo(full.height / 2, 3);
  });

  it('returns the original file when it cannot be read', async () => {
    const broken = new Uint8Array([1, 2, 3]);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(await hideLetterheadTagline(broken)).toBe(broken);
    warn.mockRestore();
  });
});

describe('downloadDeletedUsersPdf and the tagline', () => {
  it('downloads the letterhead PDF with the tagline covered', async () => {
    addLetterheadToPdf.mockResolvedValue({ bytes: await pdfWithPages(2), usedLetterhead: true });

    await downloadDeletedUsersPdf([deletedUser]);

    expect(drawRectangle).toHaveBeenCalledTimes(2);
    const [downloaded] = downloadPdfBytes.mock.calls[0];
    expect((await PDFDocument.load(downloaded)).getPageCount()).toBe(2);
  });

  it('draws nothing when the letterhead is missing, so plain pages stay white', async () => {
    const plain = await pdfWithPages(1);
    addLetterheadToPdf.mockResolvedValue({ bytes: plain, usedLetterhead: false });

    await downloadDeletedUsersPdf([deletedUser]);

    expect(drawRectangle).not.toHaveBeenCalled();
    expect(downloadPdfBytes.mock.calls[0][0]).toBe(plain);
  });
});
