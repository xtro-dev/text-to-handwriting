import { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, PenLine, SlidersHorizontal } from 'lucide-react';
import { CustomizationPanel } from './components/CustomizationPanel';
import { EditorPanel } from './components/EditorPanel';
import { ExportModal } from './components/ExportModal';
import { PreviewStage } from './components/PreviewStage';
import { TopBar } from './components/TopBar';
import { getFontMeta } from './constants/fonts';
import { DEFAULT_SETTINGS, type SampleDocumentTemplate } from './constants/presets';
import { ensureAllHandwritingFontsLoaded, ensureFontLoaded } from './engine/exportEngine';
import {
  buildCanvasFontSpec,
  computePaginatedDocument,
  createTextMeasurer,
} from './engine/layout';
import { useDocumentHistory } from './hooks/useDocumentHistory';
import type {
  AppSettings,
  DocumentSettings,
  HandwritingPreset,
  HandwritingSettings,
  PageSettings,
} from './types/handwriting';
import { generateRandomSeed, randomizeHandwritingSettings } from './utils/randomize';
import {
  loadPersistedState,
  loadSettingsBackup,
  loadThemePreference,
  savePersistedState,
  saveSettingsBackup,
  saveThemePreference,
  type ThemeMode,
} from './utils/storage';

type MobilePane = 'editor' | 'preview' | 'customize';

export function App() {
  const [theme, setTheme] = useState<ThemeMode>(() => loadThemePreference());
  const { snapshot, canUndo, canRedo, commitSnapshot, undo, redo } =
    useDocumentHistory(() => loadPersistedState());

  const [fontsReady, setFontsReady] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [mobilePane, setMobilePane] = useState<MobilePane>('preview');
  const [renderPulseKey, setRenderPulseKey] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [savedBackup, setSavedBackup] = useState(() => loadSettingsBackup());

  // Apply theme class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    saveThemePreference(theme);
  }, [theme]);

  // Preload all local handwriting fonts so Canvas measures & draws accurately
  useEffect(() => {
    let active = true;
    void ensureAllHandwritingFontsLoaded().then(() => {
      if (active) setFontsReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  // Ensure newly selected font weight/face is loaded immediately
  useEffect(() => {
    const meta = getFontMeta(snapshot.settings.handwriting.fontId);
    const spec = buildCanvasFontSpec(meta, snapshot.settings.handwriting.fontSize);
    void ensureFontLoaded(spec).then(() => {
      setRenderPulseKey((k) => k + 1);
    });
  }, [snapshot.settings.handwriting.fontId, snapshot.settings.handwriting.fontSize]);

  // Persist document text and settings locally
  useEffect(() => {
    const timer = window.setTimeout(() => {
      savePersistedState(snapshot);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [snapshot]);

  const showTransientStatus = useCallback((msg: string) => {
    setStatusMessage(msg);
    window.setTimeout(() => {
      setStatusMessage((curr) => (curr === msg ? null : curr));
    }, 2600);
  }, []);

  const textMeasurer = useMemo(() => createTextMeasurer(), []);

  const paginatedDoc = useMemo(() => {
    // Include fontsReady so layout recomputes cleanly after web fonts finish loading
    void fontsReady;
    return computePaginatedDocument(snapshot.text, snapshot.settings, textMeasurer);
  }, [snapshot.text, snapshot.settings, fontsReady, textMeasurer]);

  const safeCurrentPage = Math.max(
    1,
    Math.min(paginatedDoc.pages.length, currentPage),
  );

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
        return;
      }

      const isMod = e.ctrlKey || e.metaKey;
      if (isMod && e.key.toLowerCase() === 'z') {
        const target = e.target as HTMLElement | null;
        // Let single-line inputs keep native undo unless not an input
        if (target?.tagName === 'INPUT') return;
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }

      if (isMod && e.key.toLowerCase() === 'y') {
        const target = e.target as HTMLElement | null;
        if (target?.tagName === 'INPUT') return;
        e.preventDefault();
        redo();
        return;
      }

      // Left / Right arrow page navigation when not editing text
      const activeTag = document.activeElement?.tagName;
      if (activeTag !== 'TEXTAREA' && activeTag !== 'INPUT') {
        if (e.key === 'ArrowLeft') {
          setCurrentPage((p) => Math.max(1, p - 1));
        } else if (e.key === 'ArrowRight') {
          setCurrentPage((p) => Math.min(paginatedDoc.pages.length, p + 1));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, undo, redo, paginatedDoc.pages.length]);

  const handleChangeText = useCallback(
    (nextText: string) => {
      commitSnapshot(
        (prev) => ({
          ...prev,
          text: nextText,
        }),
        'text',
      );
    },
    [commitSnapshot],
  );

  const handleUpdateHandwriting = useCallback(
    (patch: Partial<HandwritingSettings>) => {
      commitSnapshot(
        (prev) => ({
          ...prev,
          settings: {
            ...prev.settings,
            handwriting: {
              ...prev.settings.handwriting,
              ...patch,
            },
          },
        }),
        'settings',
      );
    },
    [commitSnapshot],
  );

  const handleUpdatePage = useCallback(
    (patch: Partial<PageSettings>) => {
      commitSnapshot(
        (prev) => {
          const nextPage = { ...prev.settings.page, ...patch };
          const nextHandwriting =
            patch.ruleSpacing !== undefined && prev.settings.handwriting.snapToPaperLines
              ? { ...prev.settings.handwriting, lineSpacing: patch.ruleSpacing }
              : prev.settings.handwriting;
          return {
            ...prev,
            settings: {
              ...prev.settings,
              page: nextPage,
              handwriting: nextHandwriting,
            },
          };
        },
        'settings',
      );
    },
    [commitSnapshot],
  );

  const handleUpdateDocument = useCallback(
    (patch: Partial<DocumentSettings>) => {
      commitSnapshot(
        (prev) => ({
          ...prev,
          settings: {
            ...prev.settings,
            document: {
              ...prev.settings.document,
              ...patch,
            },
          },
        }),
        'settings',
      );
    },
    [commitSnapshot],
  );

  const handleApplyPreset = useCallback(
    (preset: HandwritingPreset) => {
      commitSnapshot(
        (prev) => ({
          ...prev,
          settings: {
            handwriting: {
              ...prev.settings.handwriting,
              ...preset.handwriting,
              variationSeed: generateRandomSeed(),
            },
            page: {
              ...prev.settings.page,
              ...preset.page,
            },
            document: {
              ...prev.settings.document,
              ...(preset.document ?? {}),
            },
          },
        }),
        'replace',
      );
      showTransientStatus(`Preset: ${preset.name}`);
    },
    [commitSnapshot, showTransientStatus],
  );

  const handleRandomize = useCallback(() => {
    commitSnapshot(
      (prev) => ({
        ...prev,
        settings: randomizeHandwritingSettings(prev.settings),
      }),
      'replace',
    );
    showTransientStatus('Randomized handwriting');
  }, [commitSnapshot, showTransientStatus]);

  const handleResetSettings = useCallback(() => {
    commitSnapshot(
      (prev) => ({
        ...prev,
        settings: structuredClone(DEFAULT_SETTINGS),
      }),
      'replace',
    );
    showTransientStatus('Settings reset');
  }, [commitSnapshot, showTransientStatus]);

  const handleSaveSettingsBackup = useCallback(() => {
    saveSettingsBackup(snapshot.settings);
    setSavedBackup(loadSettingsBackup());
    showTransientStatus('Settings saved locally');
  }, [snapshot.settings, showTransientStatus]);

  const handleRestoreSettingsBackup = useCallback(() => {
    const backup = loadSettingsBackup();
    if (!backup) return;
    commitSnapshot(
      (prev) => ({
        ...prev,
        settings: structuredClone(backup.settings) as AppSettings,
      }),
      'replace',
    );
    showTransientStatus('Saved settings restored');
  }, [commitSnapshot, showTransientStatus]);

  const handleApplySample = useCallback(
    (sample: SampleDocumentTemplate) => {
      commitSnapshot(
        (prev) => ({
          text: sample.text,
          settings: {
            ...prev.settings,
            document: {
              ...prev.settings.document,
              title: sample.title,
            },
          },
        }),
        'replace',
      );
      setCurrentPage(1);
    },
    [commitSnapshot],
  );

  const handleGenerateHandwriting = useCallback(() => {
    commitSnapshot(
      (prev) => ({
        ...prev,
        settings: {
          ...prev.settings,
          handwriting: {
            ...prev.settings.handwriting,
            variationSeed: generateRandomSeed(),
          },
        },
      }),
      'settings',
    );
    setRenderPulseKey((k) => k + 1);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setMobilePane('preview');
    }
  }, [commitSnapshot]);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[#f4f4f5] dark:bg-[#0d0e11] text-zinc-900 dark:text-zinc-100">
      <TopBar
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        onApplyPreset={handleApplyPreset}
        onRandomize={handleRandomize}
        onResetSettings={handleResetSettings}
        onSaveSettingsBackup={handleSaveSettingsBackup}
        onRestoreSettingsBackup={handleRestoreSettingsBackup}
        hasSavedBackup={savedBackup !== null}
        savedBackupTimestamp={savedBackup?.savedAt ?? null}
        isFullscreen={isFullscreen}
        onToggleFullscreen={() => setIsFullscreen((f) => !f)}
        onOpenExport={() => setExportOpen(true)}
        pageCount={paginatedDoc.pages.length}
        statusMessage={statusMessage}
      />

      {/* Mobile / Tablet Pane Switcher */}
      <div className="lg:hidden shrink-0 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121317] px-3 py-1.5">
        <div className="grid grid-cols-3 gap-1 rounded-lg bg-zinc-100 dark:bg-zinc-900 p-1">
          <button
            type="button"
            onClick={() => setMobilePane('editor')}
            className={`h-7 inline-flex items-center justify-center gap-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              mobilePane === 'editor'
                ? 'bg-white dark:bg-[#1d1f26] text-zinc-900 dark:text-zinc-100 shadow-2xs'
                : 'text-zinc-500 dark:text-zinc-400'
            }`}
          >
            <PenLine className="w-3.5 h-3.5" />
            <span>Write</span>
          </button>
          <button
            type="button"
            onClick={() => setMobilePane('preview')}
            className={`h-7 inline-flex items-center justify-center gap-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              mobilePane === 'preview'
                ? 'bg-white dark:bg-[#1d1f26] text-zinc-900 dark:text-zinc-100 shadow-2xs'
                : 'text-zinc-500 dark:text-zinc-400'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Preview ({paginatedDoc.pages.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setMobilePane('customize')}
            className={`h-7 inline-flex items-center justify-center gap-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              mobilePane === 'customize'
                ? 'bg-white dark:bg-[#1d1f26] text-zinc-900 dark:text-zinc-100 shadow-2xs'
                : 'text-zinc-500 dark:text-zinc-400'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Customize</span>
          </button>
        </div>
      </div>

      {/* Main Three-Pane Workspace */}
      <main className="flex-1 flex min-h-0 overflow-hidden">
        <EditorPanel
          text={snapshot.text}
          onChangeText={handleChangeText}
          onApplySample={handleApplySample}
          onGenerateHandwriting={handleGenerateHandwriting}
          pageCount={paginatedDoc.pages.length}
          className={`${
            mobilePane === 'editor' ? 'flex w-full' : 'hidden'
          } lg:flex lg:w-[320px] xl:w-[360px] shrink-0`}
        />

        <PreviewStage
          doc={paginatedDoc}
          settings={snapshot.settings}
          currentPage={safeCurrentPage}
          onChangePage={setCurrentPage}
          isFullscreen={isFullscreen}
          onToggleFullscreen={() => setIsFullscreen((f) => !f)}
          fontsReady={fontsReady}
          renderPulseKey={renderPulseKey}
          className={`${
            mobilePane === 'preview' ? 'flex' : 'hidden'
          } lg:flex`}
        />

        <CustomizationPanel
          settings={snapshot.settings}
          onUpdateHandwriting={handleUpdateHandwriting}
          onUpdatePage={handleUpdatePage}
          onUpdateDocument={handleUpdateDocument}
          className={`${
            mobilePane === 'customize' ? 'flex w-full' : 'hidden'
          } lg:flex lg:w-[310px] xl:w-[340px] shrink-0`}
        />
      </main>

      <ExportModal
        isOpen={exportOpen}
        onClose={() => setExportOpen(false)}
        doc={paginatedDoc}
        settings={snapshot.settings}
        currentPage={safeCurrentPage}
      />
    </div>
  );
}

export default App;
