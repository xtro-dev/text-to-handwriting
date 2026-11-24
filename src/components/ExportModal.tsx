import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Archive,
  CheckCircle2,
  Download,
  FileImage,
  FileText,
  Loader2,
  X,
} from 'lucide-react';
import { PAGE_SIZES, getPageDimensions } from '../constants/papers';
import {
  exportAllPagesAsZip,
  exportDocumentToPdf,
  exportSinglePageImage,
  sanitizeFilename,
} from '../engine/exportEngine';
import type {
  AppSettings,
  ExportFormat,
  ExportQuality,
  PaginatedDocument,
} from '../types/handwriting';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  doc: PaginatedDocument;
  settings: AppSettings;
  currentPage: number;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  doc,
  settings,
  currentPage,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <ExportModalContent
          onClose={onClose}
          doc={doc}
          settings={settings}
          currentPage={currentPage}
        />
      )}
    </AnimatePresence>
  );
};

const ExportModalContent: React.FC<Omit<ExportModalProps, 'isOpen'>> = ({
  onClose,
  doc,
  settings,
  currentPage,
}) => {
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [quality, setQuality] = useState<ExportQuality>('high');
  const [filename, setFilename] = useState(() =>
    sanitizeFilename(settings.document.title || 'handwritten-document'),
  );
  const [fromPage, setFromPage] = useState(1);
  const [toPage, setToPage] = useState(doc.pages.length);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(
    null,
  );
  const [completedMsg, setCompletedMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isExporting) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isExporting, onClose]);

  const dims = getPageDimensions(
    settings.page.pageSize,
    settings.page.orientation,
  );
  const safeCurrentPage = Math.max(1, Math.min(doc.pages.length, currentPage));
  const currentPageLayout = doc.pages[safeCurrentPage - 1] ?? doc.pages[0];

  const handleDownloadPdf = async () => {
    setIsExporting(true);
    setErrorMsg(null);
    setCompletedMsg(null);
    const start = Math.max(1, Math.min(doc.pages.length, fromPage));
    const end = Math.max(start, Math.min(doc.pages.length, toPage));
    try {
      await exportDocumentToPdf(
        doc,
        settings,
        quality,
        filename,
        { from: start, to: end },
        (done, total) => setProgress({ done, total }),
      );
      setCompletedMsg(
        `Exported ${end - start + 1} ${end - start + 1 === 1 ? 'page' : 'pages'} to PDF.`,
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'PDF export failed.');
    } finally {
      setIsExporting(false);
      setProgress(null);
    }
  };

  const handleDownloadSingleImage = async (imgFormat: 'png' | 'jpeg') => {
    if (!currentPageLayout) return;
    setIsExporting(true);
    setErrorMsg(null);
    setCompletedMsg(null);
    try {
      await exportSinglePageImage(
        currentPageLayout,
        settings,
        imgFormat,
        quality,
        filename,
      );
      setCompletedMsg(
        `Downloaded Page ${currentPageLayout.pageNumber} as ${imgFormat.toUpperCase()}.`,
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Image export failed.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadAllZip = async (imgFormat: 'png' | 'jpeg') => {
    setIsExporting(true);
    setErrorMsg(null);
    setCompletedMsg(null);
    try {
      await exportAllPagesAsZip(
        doc,
        settings,
        imgFormat,
        quality,
        filename,
        (done, total) => setProgress({ done, total }),
      );
      setCompletedMsg(
        `Downloaded all ${doc.pages.length} ${imgFormat.toUpperCase()} pages as ZIP.`,
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'ZIP export failed.');
    } finally {
      setIsExporting(false);
      setProgress(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
    >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              if (!isExporting) onClose();
            }}
            className="fixed inset-0 bg-black/45 backdrop-blur-[2px]"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="relative w-full max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#14151a] shadow-2xl overflow-hidden z-10"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between">
              <div>
                <h2
                  id="export-modal-title"
                  className="text-sm font-semibold text-zinc-900 dark:text-zinc-100"
                >
                  Export Handwritten Document
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {doc.pages.length} {doc.pages.length === 1 ? 'page' : 'pages'} ·{' '}
                  {PAGE_SIZES[settings.page.pageSize].label}{' '}
                  {settings.page.orientation} ({Math.round(dims.widthMm)}×
                  {Math.round(dims.heightMm)} mm)
                </p>
              </div>
              <button
                type="button"
                disabled={isExporting}
                onClick={onClose}
                aria-label="Close export modal"
                className="h-7 w-7 inline-flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {/* Format cards */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Format
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      {
                        id: 'pdf',
                        label: 'PDF',
                        sub: 'Multi-page',
                        icon: <FileText className="w-4 h-4" />,
                      },
                      {
                        id: 'png',
                        label: 'PNG',
                        sub: 'Lossless',
                        icon: <FileImage className="w-4 h-4" />,
                      },
                      {
                        id: 'jpeg',
                        label: 'JPEG',
                        sub: 'Compact',
                        icon: <FileImage className="w-4 h-4" />,
                      },
                    ] as {
                      id: ExportFormat;
                      label: string;
                      sub: string;
                      icon: React.ReactNode;
                    }[]
                  ).map((item) => {
                    const selected = format === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setFormat(item.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          selected
                            ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50/50 dark:bg-blue-950/30'
                            : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                        }`}
                      >
                        <div
                          className={`mb-1 ${
                            selected
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-zinc-500 dark:text-zinc-400'
                          }`}
                        >
                          {item.icon}
                        </div>
                        <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                          {item.label}
                        </div>
                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          {item.sub}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Resolution Quality */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Resolution Quality
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      { id: 'standard', label: 'Standard', dpi: '150 DPI' },
                      { id: 'high', label: 'High', dpi: '220 DPI' },
                      { id: 'print', label: 'Print', dpi: '288 DPI' },
                    ] as { id: ExportQuality; label: string; dpi: string }[]
                  ).map((q) => {
                    const selected = quality === q.id;
                    return (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => setQuality(q.id)}
                        className={`py-1.5 px-2 rounded-lg border text-center transition-colors cursor-pointer ${
                          selected
                            ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100'
                            : 'border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/70'
                        }`}
                      >
                        <div className="text-xs font-medium">{q.label}</div>
                        <div
                          className={`text-[10px] font-mono ${
                            selected
                              ? 'text-zinc-300 dark:text-zinc-600'
                              : 'text-zinc-400'
                          }`}
                        >
                          {q.dpi}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Filename */}
              <div className="space-y-1.5">
                <label
                  htmlFor="export-filename"
                  className="text-xs font-medium text-zinc-700 dark:text-zinc-300"
                >
                  File Name
                </label>
                <input
                  id="export-filename"
                  type="text"
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                  placeholder="handwritten-document"
                  className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
              </div>

              {/* PDF Page Range */}
              {format === 'pdf' && doc.pages.length > 1 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Page Range
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={doc.pages.length}
                      value={fromPage}
                      onChange={(e) =>
                        setFromPage(
                          Math.max(1, Math.min(doc.pages.length, Number(e.target.value) || 1)),
                        )
                      }
                      aria-label="From page"
                      className="w-20 h-8 px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs font-mono text-zinc-900 dark:text-zinc-100"
                    />
                    <span className="text-xs text-zinc-400">to</span>
                    <input
                      type="number"
                      min={fromPage}
                      max={doc.pages.length}
                      value={toPage}
                      onChange={(e) =>
                        setToPage(
                          Math.max(
                            fromPage,
                            Math.min(doc.pages.length, Number(e.target.value) || doc.pages.length),
                          ),
                        )
                      }
                      aria-label="To page"
                      className="w-20 h-8 px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs font-mono text-zinc-900 dark:text-zinc-100"
                    />
                    <span className="text-[11px] text-zinc-400">
                      of {doc.pages.length}
                    </span>
                  </div>
                </div>
              )}

              {/* Progress / Feedback */}
              {progress && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-mono text-zinc-500">
                    <span>Rendering high-DPI pages...</span>
                    <span>
                      {progress.done} / {progress.total}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full bg-blue-600 transition-all duration-150"
                      style={{
                        width: `${Math.round((progress.done / progress.total) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {completedMsg && (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{completedMsg}</span>
                </div>
              )}

              {errorMsg && (
                <div className="rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-3 py-2 text-xs text-red-700 dark:text-red-300">
                  {errorMsg}
                </div>
              )}
            </div>

            {/* Footer Action Buttons */}
            <div className="px-5 py-3.5 border-t border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-[#101115] flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
              {format === 'pdf' ? (
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={handleDownloadPdf}
                  className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-lg text-xs font-medium bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {isExporting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  <span>
                    Download PDF ({Math.max(1, toPage - fromPage + 1)}{' '}
                    {toPage - fromPage + 1 === 1 ? 'page' : 'pages'})
                  </span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={isExporting}
                    onClick={() => handleDownloadSingleImage(format)}
                    className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-lg text-xs font-medium border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>
                      Page {safeCurrentPage} (.{format === 'jpeg' ? 'jpg' : 'png'})
                    </span>
                  </button>

                  {doc.pages.length > 1 && (
                    <button
                      type="button"
                      disabled={isExporting}
                      onClick={() => handleDownloadAllZip(format)}
                      className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-lg text-xs font-medium bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      {isExporting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Archive className="w-3.5 h-3.5" />
                      )}
                      <span>All {doc.pages.length} Pages (ZIP)</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </motion.div>
    </div>
  );
};
