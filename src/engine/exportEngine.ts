import { HANDWRITING_FONTS } from '../constants/fonts';
import { getPageDimensions } from '../constants/papers';
import type {
  AppSettings,
  ExportQuality,
  PaginatedDocument,
  RenderedPageLayout,
} from '../types/handwriting';
import { renderPageToCanvas } from './handwritingRenderer';
import { buildCanvasFontSpec } from './layout';

export function getExportScale(quality: ExportQuality): number {
  switch (quality) {
    case 'standard':
      return 1.6; // ~154 DPI
    case 'print':
      return 3.0; // ~288 DPI
    case 'high':
    default:
      return 2.25; // ~216 DPI
  }
}

export async function ensureAllHandwritingFontsLoaded(fontSize = 20): Promise<void> {
  if (typeof document === 'undefined' || !('fonts' in document)) return;
  try {
    await document.fonts.ready;
    await Promise.allSettled(
      HANDWRITING_FONTS.map((font) =>
        document.fonts.load(buildCanvasFontSpec(font, fontSize), 'Handwriting sample 123'),
      ),
    );
    await document.fonts.ready;
  } catch {
    // Graceful fallback if font loading API rejects in restricted environments
  }
}

export async function ensureFontLoaded(fontSpec: string): Promise<void> {
  if (typeof document === 'undefined' || !('fonts' in document)) return;
  try {
    await document.fonts.load(fontSpec, 'AaBbCcXxYyZz 0123456789');
    await document.fonts.ready;
  } catch {
    // Ignore
  }
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: 'image/png' | 'image/jpeg',
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to encode canvas image.'));
      },
      mimeType,
      quality,
    );
  });
}

function yieldToUI(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

export function sanitizeFilename(name: string): string {
  const withoutControl = Array.from(name.trim())
    .map((ch) => (ch.charCodeAt(0) < 32 ? '-' : ch))
    .join('');
  const cleaned = withoutControl
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return cleaned || 'handwritten-document';
}

export async function exportSinglePageImage(
  pageLayout: RenderedPageLayout,
  settings: AppSettings,
  format: 'png' | 'jpeg',
  quality: ExportQuality,
  baseFilename: string,
): Promise<void> {
  await ensureAllHandwritingFontsLoaded(settings.handwriting.fontSize);
  const scale = getExportScale(quality);
  const offscreen = document.createElement('canvas');
  renderPageToCanvas(offscreen, pageLayout, settings, scale);

  const mime = format === 'png' ? 'image/png' : 'image/jpeg';
  const ext = format === 'png' ? 'png' : 'jpg';
  const blob = await canvasToBlob(
    offscreen,
    mime,
    format === 'jpeg' ? 0.94 : undefined,
  );
  const safeBase = sanitizeFilename(baseFilename);
  const suffix =
    pageLayout.totalPages > 1 ? `-page-${pageLayout.pageNumber}` : '';
  triggerDownload(blob, `${safeBase}${suffix}.${ext}`);
}

export async function exportAllPagesAsZip(
  doc: PaginatedDocument,
  settings: AppSettings,
  format: 'png' | 'jpeg',
  quality: ExportQuality,
  baseFilename: string,
  onProgress?: (completed: number, total: number) => void,
): Promise<void> {
  const { default: JSZip } = await import('jszip');
  await ensureAllHandwritingFontsLoaded(settings.handwriting.fontSize);
  const scale = getExportScale(quality);
  const zip = new JSZip();
  const mime = format === 'png' ? 'image/png' : 'image/jpeg';
  const ext = format === 'png' ? 'png' : 'jpg';
  const safeBase = sanitizeFilename(baseFilename);
  const padLen = String(doc.pages.length).length;
  const offscreen = document.createElement('canvas');

  for (let i = 0; i < doc.pages.length; i++) {
    const pageLayout = doc.pages[i];
    renderPageToCanvas(offscreen, pageLayout, settings, scale);
    const blob = await canvasToBlob(
      offscreen,
      mime,
      format === 'jpeg' ? 0.94 : undefined,
    );
    const pageNumStr = String(pageLayout.pageNumber).padStart(
      Math.max(2, padLen),
      '0',
    );
    zip.file(`${safeBase}-page-${pageNumStr}.${ext}`, blob);
    onProgress?.(i + 1, doc.pages.length);
    await yieldToUI();
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  triggerDownload(zipBlob, `${safeBase}-${ext}-pages.zip`);
}

export async function exportDocumentToPdf(
  doc: PaginatedDocument,
  settings: AppSettings,
  quality: ExportQuality,
  baseFilename: string,
  pageRange?: { from: number; to: number },
  onProgress?: (completed: number, total: number) => void,
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  await ensureAllHandwritingFontsLoaded(settings.handwriting.fontSize);

  const dims = getPageDimensions(
    settings.page.pageSize,
    settings.page.orientation,
  );
  const fromIdx = Math.max(0, (pageRange?.from ?? 1) - 1);
  const toIdx = Math.min(doc.pages.length - 1, (pageRange?.to ?? doc.pages.length) - 1);
  const selectedPages = doc.pages.slice(fromIdx, toIdx + 1);

  if (selectedPages.length === 0) return;

  // Keep memory stable on very large documents while preserving crisp print quality
  let scale = getExportScale(quality);
  if (selectedPages.length > 20 && scale > 2.0) {
    scale = 2.0;
  }

  const pdf = new jsPDF({
    orientation: settings.page.orientation,
    unit: 'mm',
    format: [dims.widthMm, dims.heightMm],
    compress: true,
  });

  const offscreen = document.createElement('canvas');

  for (let i = 0; i < selectedPages.length; i++) {
    if (i > 0) {
      pdf.addPage([dims.widthMm, dims.heightMm], settings.page.orientation);
    }
    renderPageToCanvas(offscreen, selectedPages[i], settings, scale);
    // High-quality JPEG (0.95) yields crisp edges & realistic paper grain with compact PDF size
    const dataUrl = offscreen.toDataURL('image/jpeg', 0.95);
    pdf.addImage(
      dataUrl,
      'JPEG',
      0,
      0,
      dims.widthMm,
      dims.heightMm,
      undefined,
      'FAST',
    );
    onProgress?.(i + 1, selectedPages.length);
    await yieldToUI();
  }

  const safeBase = sanitizeFilename(baseFilename);
  pdf.save(`${safeBase}.pdf`);
}
