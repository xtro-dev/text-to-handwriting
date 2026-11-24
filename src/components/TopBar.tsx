import React, { useEffect, useRef, useState } from 'react';
import {
  BookmarkCheck,
  ChevronDown,
  Download,
  History,
  Maximize2,
  Minimize2,
  Moon,
  Redo2,
  RotateCcw,
  Save,
  Shuffle,
  Sparkles,
  Sun,
  Undo2,
} from 'lucide-react';
import { HANDWRITING_PRESETS } from '../constants/presets';
import type { HandwritingPreset } from '../types/handwriting';
import type { ThemeMode } from '../utils/storage';

interface TopBarProps {
  theme: ThemeMode;
  onToggleTheme: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onApplyPreset: (preset: HandwritingPreset) => void;
  onRandomize: () => void;
  onResetSettings: () => void;
  onSaveSettingsBackup: () => void;
  onRestoreSettingsBackup: () => void;
  hasSavedBackup: boolean;
  savedBackupTimestamp: number | null;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onOpenExport: () => void;
  pageCount: number;
  statusMessage: string | null;
}

export const TopBar: React.FC<TopBarProps> = ({
  theme,
  onToggleTheme,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onApplyPreset,
  onRandomize,
  onResetSettings,
  onSaveSettingsBackup,
  onRestoreSettingsBackup,
  hasSavedBackup,
  savedBackupTimestamp,
  isFullscreen,
  onToggleFullscreen,
  onOpenExport,
  pageCount,
  statusMessage,
}) => {
  const [presetsOpen, setPresetsOpen] = useState(false);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const presetsRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (presetsRef.current && !presetsRef.current.contains(e.target as Node)) {
        setPresetsOpen(false);
      }
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  return (
    <header className="h-[52px] shrink-0 border-b border-zinc-200 dark:border-zinc-800/90 bg-white dark:bg-[#121317] px-2.5 sm:px-4 flex items-center justify-between gap-2 z-30">
      {/* Left: Brand */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="flex items-center gap-2 select-none">
          <svg
            width="24"
            height="24"
            viewBox="0 0 32 32"
            fill="none"
            className="shrink-0"
            aria-hidden="true"
          >
            <rect
              width="32"
              height="32"
              rx="8"
              className="fill-zinc-900 dark:fill-zinc-100"
            />
            <path
              d="M21.5 7.5L24.5 10.5L13 22L8.5 23.5L10 19L21.5 7.5Z"
              className="stroke-white dark:stroke-zinc-900"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M18.5 10.5L21.5 13.5"
              stroke="#3B82F6"
              strokeWidth="1.9"
              strokeLinecap="round"
            />
            <path
              d="M12 25H23"
              className="stroke-zinc-400 dark:stroke-zinc-500"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
          <span className="hidden min-[440px]:inline font-semibold text-sm tracking-tight text-zinc-900 dark:text-zinc-100">
            Inkwell
          </span>
        </div>

        <span className="hidden md:inline-flex items-center rounded-md bg-zinc-100 dark:bg-zinc-800/80 px-2 py-0.5 text-[11px] font-medium text-zinc-600 dark:text-zinc-400 tabular-nums">
          {pageCount} {pageCount === 1 ? 'page' : 'pages'}
        </span>

        {statusMessage && (
          <span className="hidden lg:inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium truncate">
            <BookmarkCheck className="w-3.5 h-3.5 shrink-0" />
            {statusMessage}
          </span>
        )}
      </div>

      {/* Center / Right Controls */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        {/* Presets dropdown */}
        <div className="relative" ref={presetsRef}>
          <button
            type="button"
            onClick={() => setPresetsOpen((o) => !o)}
            aria-label="Handwriting presets"
            className="inline-flex items-center gap-1.5 h-7 sm:h-8 px-2 sm:px-2.5 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-800 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="hidden sm:inline">Presets</span>
            <ChevronDown className="w-3 h-3 text-zinc-400" />
          </button>

          {presetsOpen && (
            <div className="absolute right-0 sm:left-0 mt-1.5 w-72 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#17181d] shadow-xl py-1.5 z-50">
              <div className="px-3 py-1.5 border-b border-zinc-100 dark:border-zinc-800/80">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  Handwriting Presets
                </p>
              </div>
              <div className="max-h-80 overflow-y-auto py-1">
                {HANDWRITING_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      onApplyPreset(preset);
                      setPresetsOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/70 transition-colors cursor-pointer"
                  >
                    <div className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                      {preset.name}
                    </div>
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      {preset.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Randomize handwriting */}
        <button
          type="button"
          onClick={onRandomize}
          title="Randomize handwriting style & organic variation"
          aria-label="Randomize handwriting"
          className="inline-flex items-center gap-1.5 h-7 sm:h-8 px-2 sm:px-2.5 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-800 transition-colors cursor-pointer"
        >
          <Shuffle className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Randomize</span>
        </button>

        {/* Save / Restore / Reset Settings menu */}
        <div className="relative" ref={settingsRef}>
          <button
            type="button"
            onClick={() => setSettingsMenuOpen((o) => !o)}
            title="Save, restore, or reset settings"
            aria-label="Settings menu"
            className="inline-flex items-center gap-1 h-7 sm:h-8 px-2 sm:px-2.5 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-800 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Settings</span>
            <ChevronDown className="w-3 h-3 text-zinc-400" />
          </button>

          {settingsMenuOpen && (
            <div className="absolute right-0 mt-1.5 w-64 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#17181d] shadow-xl py-1.5 z-50">
              <button
                type="button"
                onClick={() => {
                  onSaveSettingsBackup();
                  setSettingsMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/70 transition-colors cursor-pointer"
              >
                <Save className="w-3.5 h-3.5 text-zinc-500" />
                <div>
                  <div className="font-medium">Save current settings</div>
                  <div className="text-[11px] text-zinc-400">
                    Store locally as restore point
                  </div>
                </div>
              </button>

              <button
                type="button"
                disabled={!hasSavedBackup}
                onClick={() => {
                  onRestoreSettingsBackup();
                  setSettingsMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/70 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
              >
                <History className="w-3.5 h-3.5 text-zinc-500" />
                <div>
                  <div className="font-medium">Restore saved settings</div>
                  <div className="text-[11px] text-zinc-400">
                    {savedBackupTimestamp
                      ? `Saved ${new Date(savedBackupTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                      : 'No manual save point yet'}
                  </div>
                </div>
              </button>

              <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />

              <button
                type="button"
                onClick={() => {
                  onResetSettings();
                  setSettingsMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <div>
                  <div className="font-medium">Reset all settings</div>
                  <div className="text-[11px] opacity-80">
                    Restore factory defaults
                  </div>
                </div>
              </button>
            </div>
          )}
        </div>

        <div className="hidden sm:block h-4 w-px bg-zinc-200 dark:bg-zinc-800 mx-0.5" />

        {/* Undo / Redo */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            aria-label="Undo"
            className="h-7 w-7 sm:h-8 sm:w-8 inline-flex items-center justify-center rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 disabled:opacity-35 disabled:pointer-events-none transition-colors cursor-pointer"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Shift+Z)"
            aria-label="Redo"
            className="h-7 w-7 sm:h-8 sm:w-8 inline-flex items-center justify-center rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 disabled:opacity-35 disabled:pointer-events-none transition-colors cursor-pointer"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Theme toggle */}
        <button
          type="button"
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          aria-label="Toggle color theme"
          className="h-7 w-7 sm:h-8 sm:w-8 inline-flex items-center justify-center rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors cursor-pointer"
        >
          {theme === 'dark' ? (
            <Sun className="w-3.5 h-3.5" />
          ) : (
            <Moon className="w-3.5 h-3.5" />
          )}
        </button>

        {/* Fullscreen toggle */}
        <button
          type="button"
          onClick={onToggleFullscreen}
          title={isFullscreen ? 'Exit fullscreen preview' : 'Fullscreen preview'}
          aria-label="Toggle fullscreen preview"
          className="hidden sm:inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors cursor-pointer"
        >
          {isFullscreen ? (
            <Minimize2 className="w-3.5 h-3.5" />
          ) : (
            <Maximize2 className="w-3.5 h-3.5" />
          )}
        </button>

        {/* Primary Export CTA */}
        <button
          type="button"
          onClick={onOpenExport}
          className="ml-0.5 inline-flex items-center gap-1.5 h-7 sm:h-8 px-2.5 sm:px-3 rounded-lg text-xs font-medium bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 shadow-xs transition-colors cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export</span>
        </button>
      </div>
    </header>
  );
};
