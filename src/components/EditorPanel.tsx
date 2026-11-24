import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ClipboardPaste,
  Copy,
  FileText,
  FileUp,
  PenLine,
  Trash2,
  ChevronDown,
} from 'lucide-react';
import { SAMPLE_TEMPLATES, type SampleDocumentTemplate } from '../constants/presets';

interface EditorPanelProps {
  text: string;
  onChangeText: (text: string) => void;
  onApplySample: (sample: SampleDocumentTemplate) => void;
  onGenerateHandwriting: () => void;
  pageCount: number;
  className?: string;
}

export const EditorPanel: React.FC<EditorPanelProps> = ({
  text,
  onChangeText,
  onApplySample,
  onGenerateHandwriting,
  pageCount,
  className = '',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const samplesRef = useRef<HTMLDivElement>(null);
  const [samplesOpen, setSamplesOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [generatedFlash, setGeneratedFlash] = useState(false);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (samplesRef.current && !samplesRef.current.contains(e.target as Node)) {
        setSamplesOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const stats = useMemo(() => {
    const chars = text.length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const paragraphs = text.trim()
      ? text.split(/\n+/).filter((p) => p.trim().length > 0).length
      : 0;
    return { chars, words, paragraphs };
  }, [text]);

  const handleFileLoad = async (file: File) => {
    try {
      const content = await file.text();
      onChangeText(content);
    } catch {
      // Ignore unreadable file errors
    }
  };

  const handleCopy = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard fallback ignored if blocked
    }
  };

  const handlePaste = async () => {
    try {
      const pasted = await navigator.clipboard.readText();
      if (pasted) {
        onChangeText(text ? `${text}\n${pasted}` : pasted);
      }
    } catch {
      // If clipboard read permission is denied, focus textarea cleanly
    }
  };

  const handleGenerateClick = () => {
    onGenerateHandwriting();
    setGeneratedFlash(true);
    setTimeout(() => setGeneratedFlash(false), 900);
  };

  return (
    <aside
      className={`flex flex-col bg-white dark:bg-[#121317] border-r border-zinc-200 dark:border-zinc-800/90 min-h-0 ${className}`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
          void handleFileLoad(file);
        }
      }}
    >
      {/* Editor Toolbar */}
      <div className="px-3 py-2.5 border-b border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between gap-1.5 flex-wrap">
        <div className="flex items-center gap-1">
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,text/plain,.md"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFileLoad(file);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Upload .txt file"
            className="inline-flex items-center gap-1.5 h-7 px-2 rounded-md text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <FileUp className="w-3.5 h-3.5 text-zinc-500" />
            <span>Upload .txt</span>
          </button>

          <div className="relative" ref={samplesRef}>
            <button
              type="button"
              onClick={() => setSamplesOpen((o) => !o)}
              className="inline-flex items-center gap-1 h-7 px-2 rounded-md text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-zinc-500" />
              <span>Samples</span>
              <ChevronDown className="w-3 h-3 text-zinc-400" />
            </button>
            {samplesOpen && (
              <div className="absolute left-0 mt-1 w-60 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#17181d] shadow-xl py-1 z-40">
                {SAMPLE_TEMPLATES.map((sample) => (
                  <button
                    key={sample.id}
                    type="button"
                    onClick={() => {
                      onApplySample(sample);
                      setSamplesOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors cursor-pointer"
                  >
                    <div className="font-medium text-zinc-900 dark:text-zinc-100">
                      {sample.label}
                    </div>
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                      {sample.title}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={handlePaste}
            title="Paste from clipboard"
            aria-label="Paste text"
            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <ClipboardPaste className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleCopy}
            disabled={!text}
            title="Copy all text"
            aria-label="Copy text"
            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-35 disabled:pointer-events-none transition-colors cursor-pointer"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={() => onChangeText('')}
            disabled={!text}
            title="Clear text"
            aria-label="Clear text"
            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-zinc-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-35 disabled:pointer-events-none transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Textarea */}
      <div className="relative flex-1 min-h-0 flex flex-col">
        <textarea
          value={text}
          onChange={(e) => onChangeText(e.target.value)}
          placeholder="Type or paste your text here, or drop a .txt file..."
          aria-label="Document text input"
          spellCheck={true}
          className="flex-1 w-full resize-none bg-transparent p-4 text-[13.5px] leading-relaxed text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none"
        />

        {isDragging && (
          <div className="absolute inset-2 rounded-xl border-2 border-dashed border-blue-500 bg-blue-50/90 dark:bg-blue-950/80 flex flex-col items-center justify-center gap-2 pointer-events-none">
            <FileUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <p className="text-xs font-medium text-blue-700 dark:text-blue-200">
              Drop .txt file to load into editor
            </p>
          </div>
        )}
      </div>

      {/* Bottom Stats + Generate Action */}
      <div className="px-3.5 py-2.5 border-t border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-[#101115] space-y-2.5">
        <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-zinc-500 dark:text-zinc-400">
          <span>
            {stats.words.toLocaleString()} words · {stats.chars.toLocaleString()} chars
          </span>
          <span>
            {stats.paragraphs} ¶ · {pageCount} {pageCount === 1 ? 'pg' : 'pgs'}
          </span>
        </div>

        <button
          type="button"
          onClick={handleGenerateClick}
          className="w-full h-8 inline-flex items-center justify-center gap-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors cursor-pointer"
        >
          {generatedFlash ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Handwriting Updated</span>
            </>
          ) : (
            <>
              <PenLine className="w-3.5 h-3.5" />
              <span>Generate Handwriting</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};
