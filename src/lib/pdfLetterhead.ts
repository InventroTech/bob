import { PDFDocument } from 'pdf-lib';

export const LETTERHEAD_PDF_PATH = '/pyro-letterhead.pdf';
export const PDF_LETTERHEAD_TOP_MARGIN_MM = 62;
export const PDF_LETTERHEAD_BOTTOM_MARGIN_MM = 58;

export function downloadPdfBytes(bytes: ArrayBuffer | Uint8Array, filename: string) {
  const blobPart: ArrayBuffer = bytes instanceof ArrayBuffer ? bytes : new ArrayBuffer(bytes.byteLength);
  if (bytes instanceof Uint8Array) {
    new Uint8Array(blobPart).set(bytes);
  }

  const blob = new Blob([blobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function addLetterheadToPdf(contentBytes: ArrayBuffer) {
  try {
    const letterheadResponse = await fetch(LETTERHEAD_PDF_PATH);
    if (!letterheadResponse.ok) {
      return { bytes: contentBytes, usedLetterhead: false };
    }

    const letterheadBytes = await letterheadResponse.arrayBuffer();
    const contentPdf = await PDFDocument.load(contentBytes);
    const outputPdf = await PDFDocument.create();
    const [letterheadPage] = await outputPdf.embedPdf(letterheadBytes, [0]);
    const embeddedContentPages = await outputPdf.embedPdf(
      contentBytes,
      contentPdf.getPageIndices()
    );

    contentPdf.getPages().forEach((sourcePage, index) => {
      const { width, height } = sourcePage.getSize();
      const page = outputPdf.addPage([width, height]);
      page.drawPage(letterheadPage, { x: 0, y: 0, width, height });
      page.drawPage(embeddedContentPages[index], { x: 0, y: 0, width, height });
    });

    return { bytes: await outputPdf.save(), usedLetterhead: true };
  } catch (error) {
    console.warn('Letterhead could not be applied:', error);
    return { bytes: contentBytes, usedLetterhead: false };
  }
}
