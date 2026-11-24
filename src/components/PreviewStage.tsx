import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Columns2,
  File as FileIcon,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { renderPageToCanvas } from '../engine/handwritingRenderer';
import type {
  AppSettings,
  PaginatedDocument,
  RenderedPageLayout,
} from '../types/handwriting';

interface HandwrittenPageCanvasProps {
  pageLayout: RenderedPageLayout;
  settings: AppSettings;
  zoom: number;
  fontsReady: boolean;
  isActive?: boolean;
  onSelect?: () => void;
  showPageCaption?: boolean;
}

const HandwrittenPageCanvas: React.FC<HandwrittenPageCanvasProps> = ({
  pageLayout,
  settings,
  zoom,
  fontsReady,
  isActive = false,
  onSelect,
  showPageCaption = false,
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isNearViewport, setIsNearViewport] = useState(true);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setIsNearViewport(true);
          }
        }
      },
      { rootMargin: '600px 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !fontsReady || !isNearViewport) return;

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const backingScale = Math.min(2.6, Math.max(1.35, zoom * dpr));
    renderPageToCanvas(canvas, pageLayout, settings, backingScale);
  }, [pageLayout, settings, zoom, fontsReady, isNearViewport]);

  const displayWidth = Math.round(pageLayout.width * zoom);
  const displayHeight = Math.round(pageLayout.height * zoom);

  return (
    <div
      ref={wrapperRef}
      onClick={onSelect}
      className="flex flex-col items-center gap-2 shrink-0"
    >
      <div
        className={`relative rounded-[2px] transition-shadow duration-200 ${
          isActive
            ? 'ring-2 ring-blue-500/50 shadow-[0_14px_38px_-10px_rgba(0,0,0,0.22),0_4px_12px_-2px_rgba(0,0,0,0.08)] dark:shadow-[0_18px_46px_-10px_rgba(0,0,0,0.65)]'
            : 'shadow-[0_12px_34px_-10px_rgba(0,0,0,0.18),0_3px_10px_-2px_rgba(0,0,0,0.06)] dark:shadow-[0_16px_42px_-10px_rgba(0,0,0,0.58)]'
        }`}
        style={{ width: displayWidth, height: displayHeight }}
      >
        <canvas
          ref={canvasRef}
          aria-label={`Handwritten page ${pageLayout.pageNumber} of ${pageLayout.totalPages}`}
          style={{
            width: displayWidth,
            height: displayHeight,
            display: 'block',
            borderRadius: '2px',
          }}
        />
      </div>

      {showPageCaption && (
        <span className="text-[11px] font-mono tabular-nums text-zinc-500 dark:text-zinc-400">
          Page {pageLayout.pageNumber} of {pageLayout.totalPages}
        </span>
      )}
    </div>
  );
};

interface PreviewStageProps {
  doc: PaginatedDocument;
  settings: AppSettings;
  currentPage: number;
  onChangePage: (page: number) => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  fontsReady: boolean;
  renderPulseKey: number;
  className?: string;
}

export const PreviewStage: React.FC<PreviewStageProps> = ({
  doc,
  settings,
  currentPage,
  onChangePage,
  isFullscreen,
  onToggleFullscreen,
  fontsReady,
  renderPulseKey,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 700 });
  const [viewMode, setViewMode] = useState<'single' | 'all'>('single');
  const [zoomMode, setZoomMode] = useState<'fit' | 'manual'>('fit');
  const [manualZoom, setManualZoom] = useState(0.85);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setContainerSize({ width, height });
        }
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const firstPage = doc.pages[0];
  const fitZoom = useMemo(() => {
    if (!firstPage) return 0.75;
    const padX = containerSize.width < 640 ? 28 : 64;
    const padY = 92;
    const availW = Math.max(200, containerSize.width - padX);
    const availH = Math.max(240, containerSize.height - padY);
    const byW = availW / firstPage.width;
    const byH = viewMode === 'single' ? availH / firstPage.height : byW;
    return Math.max(0.28, Math.min(1.25, Math.min(byW, byH)));
  }, [containerSize, firstPage, viewMode]);

  const effectiveZoom = zoomMode === 'fit' ? fitZoom : manualZoom;
  const safePageIndex = Math.max(0, Math.min(doc.pages.length - 1, currentPage - 1));
  const activePage = doc.pages[safePageIndex] ?? firstPage;

  const handleZoomStep = (delta: number) => {
    const base = zoomMode === 'fit' ? fitZoom : manualZoom;
    const next = Math.max(0.25, Math.min(2.0, Number((base + delta).toFixed(2))));
    setZoomMode('manual');
    setManualZoom(next);
  };

  return (
    <section
      className={`relative flex-1 flex flex-col min-w-0 min-h-0 bg-[#eceef1] dark:bg-[#191a20] select-none ${
        isFullscreen ? 'fixed inset-0 z-50' : ''
      } ${className}`}
    >
      {/* Floating Control Toolbar */}
      <div className="shrink-0 px-3 py-2 flex items-center justify-center pointer-events-none z-20">
        <div className="pointer-events-auto inline-flex items-center gap-1 sm:gap-1.5 rounded-xl border border-zinc-200/90 dark:border-zinc-800 bg-white/95 dark:bg-[#14151a]/95 backdrop-blur-sm px-2 py-1 shadow-sm">
          {/* View mode toggle */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/80 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('single')}
              title="Single page view"
              className={`inline-flex items-center gap-1 h-6 px-2 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                viewMode === 'single'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <FileIcon className="w-3 h-3" />
              <span className="hidden sm:inline">Single</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('all')}
              title="Continuous all pages view"
              className={`inline-flex items-center gap-1 h-6 px-2 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                viewMode === 'all'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <Columns2 className="w-3 h-3" />
              <span className="hidden sm:inline">All</span>
            </button>
          </div>

          <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 mx-0.5" />

          {/* Page Navigation */}
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              disabled={safePageIndex <= 0}
              onClick={() => onChangePage(safePageIndex)}
              aria-label="Previous page"
              className="h-6 w-6 inline-flex items-center justify-center rounded-md text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-35 disabled:pointer-events-none transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-1.5 text-[11px] font-mono tabular-nums text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
              {safePageIndex + 1} / {doc.pages.length}
            </span>
            <button
              type="button"
              disabled={safePageIndex >= doc.pages.length - 1}
              onClick={() => onChangePage(safePageIndex + 2)}
              aria-label="Next page"
              className="h-6 w-6 inline-flex items-center justify-center rounded-md text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-35 disabled:pointer-events-none transition-colors cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 mx-0.5" />

          {/* Zoom controls */}
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => handleZoomStep(-0.1)}
              title="Zoom out"
              aria-label="Zoom out"
              className="h-6 w-6 inline-flex items-center justify-center rounded-md text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoomMode('fit')}
              title="Fit page to screen"
              className={`h-6 px-1.5 rounded-md text-[11px] font-mono tabular-nums transition-colors cursor-pointer ${
                zoomMode === 'fit'
                  ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium'
                  : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              {Math.round(effectiveZoom * 100)}%
            </button>
            <button
              type="button"
              onClick={() => handleZoomStep(0.1)}
              title="Zoom in"
              aria-label="Zoom in"
              className="h-6 w-6 inline-flex items-center justify-center rounded-md text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 mx-0.5" />

          <button
            type="button"
            onClick={onToggleFullscreen}
            title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen preview'}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            className="h-6 w-6 inline-flex items-center justify-center rounded-md text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Scrollable Desk Canvas */}
      <div
        ref={containerRef}
        className="flex-1 min-h-0 overflow-auto px-4 pb-8 pt-2 flex flex-col items-center"
      >
        {viewMode === 'single' && activePage ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${activePage.pageNumber}-${renderPulseKey}`}
              initial={{ opacity: 0.88, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0.88 }}
              transition={{ duration: 0.14, ease: 'easeOut' }}
              className="my-auto"
            >
              <HandwrittenPageCanvas
                pageLayout={activePage}
                settings={settings}
                zoom={effectiveZoom}
                fontsReady={fontsReady}
              />
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="flex flex-col items-center gap-6 py-2">
            {doc.pages.map((pageLayout) => (
              <HandwrittenPageCanvas
                key={`${pageLayout.pageNumber}-${renderPulseKey}`}
                pageLayout={pageLayout}
                settings={settings}
                zoom={effectiveZoom}
                fontsReady={fontsReady}
                isActive={pageLayout.pageNumber === safePageIndex + 1}
                onSelect={() => onChangePage(pageLayout.pageNumber)}
                showPageCaption
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
