import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Calendar,
  ChevronDown,
  FileText,
  PenTool,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import { HANDWRITING_FONTS, getFontMeta } from '../constants/fonts';
import {
  INK_SWATCHES,
  LINE_COLOR_SWATCHES,
  PAGE_SIZES,
  PAPER_COLOR_SWATCHES,
  PAPER_STYLES,
  getPageDimensions,
  getPaperPreset,
} from '../constants/papers';
import { getTodayFormatted } from '../constants/presets';
import type {
  AppSettings,
  DocumentSettings,
  FontCategory,
  HandwritingSettings,
  PageNumberFormat,
  PageNumberPosition,
  PageSettings,
  PageSizeId,
  PaperTypeId,
  TextAlignment,
} from '../types/handwriting';
import { generateRandomSeed } from '../utils/randomize';
import {
  ColorPickerField,
  SectionDivider,
  SliderControl,
  ToggleSwitch,
} from './ui/Controls';

type TabId = 'handwriting' | 'page' | 'document';

interface CustomizationPanelProps {
  settings: AppSettings;
  onUpdateHandwriting: (patch: Partial<HandwritingSettings>) => void;
  onUpdatePage: (patch: Partial<PageSettings>) => void;
  onUpdateDocument: (patch: Partial<DocumentSettings>) => void;
  className?: string;
}

const PaperMiniPreview: React.FC<{ paperId: PaperTypeId }> = ({ paperId }) => {
  const preset = getPaperPreset(paperId);
  const bg = preset.backgroundColor;
  const line = preset.lineColor;

  if (paperId === 'grid') {
    return (
      <div
        className="w-full h-9 rounded border border-zinc-200 dark:border-zinc-700 overflow-hidden"
        style={{
          backgroundColor: bg,
          backgroundImage: `linear-gradient(to right, ${line} 1px, transparent 1px), linear-gradient(to bottom, ${line} 1px, transparent 1px)`,
          backgroundSize: '7px 7px',
        }}
      />
    );
  }

  if (paperId === 'dotted') {
    return (
      <div
        className="w-full h-9 rounded border border-zinc-200 dark:border-zinc-700 overflow-hidden"
        style={{
          backgroundColor: bg,
          backgroundImage: `radial-gradient(${line} 1px, transparent 1px)`,
          backgroundSize: '6px 6px',
        }}
      />
    );
  }

  if (preset.hasHorizontalLines) {
    const step = paperId === 'college-ruled' ? 5 : paperId === 'wide-ruled' ? 8 : 6.5;
    return (
      <div
        className="relative w-full h-9 rounded border border-zinc-200 dark:border-zinc-700 overflow-hidden"
        style={{
          backgroundColor: bg,
          backgroundImage: `repeating-linear-gradient(to bottom, transparent, transparent ${step - 1}px, ${line} ${step - 1}px, ${line} ${step}px)`,
          backgroundPositionY: '8px',
        }}
      >
        <div
          className="absolute top-0 bottom-0 left-3 w-px"
          style={{ backgroundColor: preset.marginLineColor }}
        />
        {paperId === 'legal' && (
          <div
            className="absolute top-0 bottom-0 left-3.5 w-px"
            style={{ backgroundColor: preset.marginLineColor }}
          />
        )}
      </div>
    );
  }

  return (
    <div
      className="w-full h-9 rounded border border-zinc-200 dark:border-zinc-700 overflow-hidden"
      style={{
        backgroundColor: bg,
        boxShadow:
          paperId === 'old-paper'
            ? 'inset 0 0 10px rgba(138, 96, 48, 0.35)'
            : undefined,
      }}
    />
  );
};

export const CustomizationPanel: React.FC<CustomizationPanelProps> = ({
  settings,
  onUpdateHandwriting,
  onUpdatePage,
  onUpdateDocument,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('handwriting');
  const [fontListOpen, setFontListOpen] = useState(false);
  const [fontFilter, setFontFilter] = useState<'all' | FontCategory>('all');

  const { handwriting, page, document: doc } = settings;
  const activeFont = getFontMeta(handwriting.fontId);
  const activePaperPreset = getPaperPreset(page.paperType);
  const pageDims = getPageDimensions(page.pageSize, page.orientation);

  const filteredFonts = useMemo(() => {
    if (fontFilter === 'all') return HANDWRITING_FONTS;
    return HANDWRITING_FONTS.filter((f) => f.category === fontFilter);
  }, [fontFilter]);

  const handleSelectPaperType = (paperId: PaperTypeId) => {
    const preset = getPaperPreset(paperId);
    const isRuled = preset.hasHorizontalLines;
    onUpdatePage({
      paperType: paperId,
      backgroundColor: preset.backgroundColor,
      lineColor: preset.lineColor,
      ruleSpacing: preset.ruleSpacing,
      showMarginLine: preset.hasMarginLine,
      showHolePunches: preset.defaultHolePunches,
      paperTexture: preset.defaultTexture,
      marginTop: isRuled ? Math.max(84, preset.topBandPx) : 64,
      marginLeft: preset.defaultMarginLeft,
    });
    if (isRuled && handwriting.snapToPaperLines) {
      onUpdateHandwriting({ lineSpacing: preset.ruleSpacing });
    }
  };

  const handleApplyMarginPreset = (preset: 'narrow' | 'standard' | 'wide') => {
    const isRuled = activePaperPreset.hasHorizontalLines;
    if (preset === 'narrow') {
      onUpdatePage({
        marginTop: isRuled ? 84 : 38,
        marginRight: 32,
        marginBottom: 38,
        marginLeft: isRuled ? 86 : 38,
      });
    } else if (preset === 'standard') {
      onUpdatePage({
        marginTop: isRuled ? 92 : 60,
        marginRight: 52,
        marginBottom: 56,
        marginLeft: isRuled ? 96 : 64,
      });
    } else {
      onUpdatePage({
        marginTop: isRuled ? 112 : 84,
        marginRight: 80,
        marginBottom: 80,
        marginLeft: isRuled ? 112 : 88,
      });
    }
  };

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'handwriting', label: 'Handwriting', icon: <PenTool className="w-3.5 h-3.5" /> },
    { id: 'page', label: 'Page', icon: <FileText className="w-3.5 h-3.5" /> },
    { id: 'document', label: 'Document', icon: <SlidersHorizontal className="w-3.5 h-3.5" /> },
  ];

  return (
    <aside
      className={`flex flex-col bg-white dark:bg-[#121317] border-l border-zinc-200 dark:border-zinc-800/90 min-h-0 ${className}`}
    >
      {/* Segmented Tabs */}
      <div className="p-2.5 border-b border-zinc-200/80 dark:border-zinc-800/80 shrink-0">
        <div className="grid grid-cols-3 gap-1 rounded-lg bg-zinc-100 dark:bg-zinc-900 p-1">
          {tabs.map((tab) => {
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center justify-center gap-1.5 h-7 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  selected
                    ? 'text-zinc-900 dark:text-zinc-100'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                {selected && (
                  <motion.span
                    layoutId="customize-tab-pill"
                    transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                    className="absolute inset-0 rounded-md bg-white dark:bg-[#1d1f26] shadow-2xs"
                  />
                )}
                <span className="relative z-10 inline-flex items-center gap-1">
                  {tab.icon}
                  <span>{tab.label}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Scrollable Controls Area */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
        {activeTab === 'handwriting' && (
          <>
            {/* Font Picker */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Handwriting Style
                </span>
                <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                  {activeFont.category}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setFontListOpen((o) => !o)}
                aria-expanded={fontListOpen}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/50 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors cursor-pointer text-left"
              >
                <div className="min-w-0">
                  <div
                    className="text-lg leading-tight text-zinc-900 dark:text-zinc-100 truncate"
                    style={{ fontFamily: `"${activeFont.family}", cursive` }}
                  >
                    {activeFont.name}
                  </div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                    {activeFont.description}
                  </div>
                </div>
                <ChevronDown
                  className={`w-4 h-4 shrink-0 text-zinc-400 transition-transform ${
                    fontListOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {fontListOpen && (
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#17181d] p-2 space-y-2 shadow-sm">
                  <div className="flex flex-wrap gap-1">
                    {(['all', 'print', 'casual', 'cursive', 'script'] as const).map(
                      (cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setFontFilter(cat)}
                          className={`px-2 py-0.5 rounded-md text-[11px] font-medium capitalize transition-colors cursor-pointer ${
                            fontFilter === cat
                              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                          }`}
                        >
                          {cat}
                        </button>
                      ),
                    )}
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-1 pr-0.5">
                    {filteredFonts.map((font) => {
                      const isSelected = font.id === handwriting.fontId;
                      return (
                        <button
                          key={font.id}
                          type="button"
                          onClick={() => {
                            onUpdateHandwriting({ fontId: font.id });
                            setFontListOpen(false);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/70'
                              : 'hover:bg-zinc-100/80 dark:hover:bg-zinc-800/60 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className="text-base leading-snug text-zinc-900 dark:text-zinc-100"
                              style={{ fontFamily: `"${font.family}", cursive` }}
                            >
                              {font.name}
                            </span>
                            <span className="text-[10px] text-zinc-400 uppercase">
                              {font.category}
                            </span>
                          </div>
                          <div
                            className="text-xs text-zinc-500 dark:text-zinc-400 truncate"
                            style={{ fontFamily: `"${font.family}", cursive` }}
                          >
                            {font.sampleText}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <SliderControl
              id="hw-font-size"
              label="Font Size"
              value={handwriting.fontSize}
              min={12}
              max={38}
              step={1}
              displayValue={`${handwriting.fontSize}px`}
              onChange={(v) => onUpdateHandwriting({ fontSize: v })}
            />

            <ColorPickerField
              label="Ink Color"
              value={handwriting.inkColor}
              swatches={INK_SWATCHES}
              onChange={(hex) => onUpdateHandwriting({ inkColor: hex })}
            />

            <SliderControl
              id="hw-pen-thickness"
              label="Pen Thickness"
              value={handwriting.penThickness}
              min={0.4}
              max={2.2}
              step={0.05}
              displayValue={`${handwriting.penThickness.toFixed(2)}×`}
              onChange={(v) => onUpdateHandwriting({ penThickness: v })}
            />

            <SectionDivider title="Spacing" />

            {activePaperPreset.hasHorizontalLines && (
              <ToggleSwitch
                id="hw-snap-rules"
                label="Snap text to paper lines"
                description="Align handwriting baselines with notebook rules"
                checked={handwriting.snapToPaperLines}
                onChange={(checked) =>
                  onUpdateHandwriting({
                    snapToPaperLines: checked,
                    lineSpacing: checked ? page.ruleSpacing : handwriting.lineSpacing,
                  })
                }
              />
            )}

            <SliderControl
              id="hw-line-spacing"
              label="Line Spacing"
              value={
                activePaperPreset.hasHorizontalLines && handwriting.snapToPaperLines
                  ? page.ruleSpacing
                  : handwriting.lineSpacing
              }
              min={16}
              max={68}
              step={1}
              disabled={
                activePaperPreset.hasHorizontalLines && handwriting.snapToPaperLines
              }
              displayValue={`${
                activePaperPreset.hasHorizontalLines && handwriting.snapToPaperLines
                  ? page.ruleSpacing
                  : handwriting.lineSpacing
              }px`}
              hint={
                activePaperPreset.hasHorizontalLines && handwriting.snapToPaperLines
                  ? 'Synced to paper rule spacing (disable snap to customize freely)'
                  : undefined
              }
              onChange={(v) => onUpdateHandwriting({ lineSpacing: v })}
            />

            <SliderControl
              id="hw-letter-spacing"
              label="Letter Spacing"
              value={handwriting.letterSpacing}
              min={-1.5}
              max={8}
              step={0.1}
              displayValue={`${handwriting.letterSpacing.toFixed(1)}px`}
              onChange={(v) => onUpdateHandwriting({ letterSpacing: v })}
            />

            <SliderControl
              id="hw-word-spacing"
              label="Word Spacing"
              value={handwriting.wordSpacing}
              min={-2}
              max={18}
              step={0.5}
              displayValue={`${handwriting.wordSpacing.toFixed(1)}px`}
              onChange={(v) => onUpdateHandwriting({ wordSpacing: v })}
            />

            <SectionDivider
              title="Natural Realism"
              rightSlot={
                <button
                  type="button"
                  onClick={() =>
                    onUpdateHandwriting({ variationSeed: generateRandomSeed() })
                  }
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Re-seed</span>
                </button>
              }
            />

            <SliderControl
              id="hw-char-variation"
              label="Character Variation"
              value={Math.round(handwriting.characterVariation * 100)}
              min={0}
              max={100}
              step={2}
              displayValue={`${Math.round(handwriting.characterVariation * 100)}%`}
              hint="Subtle per-letter rotation, slant, and spacing jitter"
              onChange={(v) => onUpdateHandwriting({ characterVariation: v / 100 })}
            />

            <SliderControl
              id="hw-baseline-variation"
              label="Baseline Drift"
              value={Math.round(handwriting.baselineVariation * 100)}
              min={0}
              max={100}
              step={2}
              displayValue={`${Math.round(handwriting.baselineVariation * 100)}%`}
              hint="Organic hand wave across each line"
              onChange={(v) => onUpdateHandwriting({ baselineVariation: v / 100 })}
            />

            <SliderControl
              id="hw-ink-imperfections"
              label="Ink Pressure & Bleed"
              value={Math.round(handwriting.inkImperfections * 100)}
              min={0}
              max={100}
              step={2}
              displayValue={`${Math.round(handwriting.inkImperfections * 100)}%`}
              onChange={(v) => onUpdateHandwriting({ inkImperfections: v / 100 })}
            />

            <SliderControl
              id="hw-margin-jitter"
              label="Margin Wobble"
              value={handwriting.marginJitter}
              min={0}
              max={5}
              step={0.2}
              displayValue={`${handwriting.marginJitter.toFixed(1)}px`}
              onChange={(v) => onUpdateHandwriting({ marginJitter: v })}
            />
          </>
        )}

        {activeTab === 'page' && (
          <>
            <div className="space-y-2">
              <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Paper Style
              </span>
              <div className="grid grid-cols-3 gap-2">
                {PAPER_STYLES.map((preset) => {
                  const selected = page.paperType === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      title={preset.name}
                      aria-label={`${preset.name} paper`}
                      onClick={() => handleSelectPaperType(preset.id)}
                      className={`group p-1.5 rounded-lg border text-left transition-all cursor-pointer ${
                        selected
                          ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50/40 dark:bg-blue-950/30'
                          : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                      }`}
                    >
                      <PaperMiniPreview paperId={preset.id} />
                      <div className="mt-1 text-[10.5px] font-medium text-zinc-700 dark:text-zinc-300 truncate text-center">
                        {preset.shortName}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <SectionDivider
              title="Format & Dimensions"
              rightSlot={
                <span className="font-mono text-[10.5px] text-zinc-400">
                  {Math.round(pageDims.widthMm)} × {Math.round(pageDims.heightMm)} mm
                </span>
              }
            />

            <div className="grid grid-cols-4 gap-1.5">
              {(Object.keys(PAGE_SIZES) as PageSizeId[]).map((sizeId) => {
                const selected = page.pageSize === sizeId;
                return (
                  <button
                    key={sizeId}
                    type="button"
                    onClick={() => onUpdatePage({ pageSize: sizeId })}
                    className={`h-8 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                      selected
                        ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/70'
                    }`}
                  >
                    {PAGE_SIZES[sizeId].label}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {(['portrait', 'landscape'] as const).map((orient) => {
                const selected = page.orientation === orient;
                return (
                  <button
                    key={orient}
                    type="button"
                    onClick={() => onUpdatePage({ orientation: orient })}
                    className={`h-8 rounded-lg text-xs font-medium capitalize border transition-colors cursor-pointer ${
                      selected
                        ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/70'
                    }`}
                  >
                    {orient}
                  </button>
                );
              })}
            </div>

            <SectionDivider title="Paper Colors & Rules" />

            <ColorPickerField
              label="Paper Background"
              value={page.backgroundColor}
              swatches={PAPER_COLOR_SWATCHES}
              onChange={(hex) => onUpdatePage({ backgroundColor: hex })}
            />

            {(activePaperPreset.hasHorizontalLines ||
              page.paperType === 'grid' ||
              page.paperType === 'dotted') && (
              <>
                <ColorPickerField
                  label="Rule / Grid Color"
                  value={page.lineColor}
                  swatches={LINE_COLOR_SWATCHES}
                  onChange={(hex) => onUpdatePage({ lineColor: hex })}
                />

                <SliderControl
                  id="page-rule-spacing"
                  label={
                    page.paperType === 'grid' || page.paperType === 'dotted'
                      ? 'Grid / Dot Spacing'
                      : 'Rule Line Spacing'
                  }
                  value={page.ruleSpacing}
                  min={16}
                  max={56}
                  step={1}
                  displayValue={`${page.ruleSpacing}px`}
                  onChange={(v) => onUpdatePage({ ruleSpacing: v })}
                />
              </>
            )}

            <SectionDivider
              title="Page Margins"
              rightSlot={
                <div className="flex items-center gap-1">
                  {(['narrow', 'standard', 'wide'] as const).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleApplyMarginPreset(preset)}
                      className="px-1.5 py-0.5 rounded text-[10px] font-medium capitalize bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              }
            />

            <div className="grid grid-cols-2 gap-3">
              <SliderControl
                id="margin-top"
                label="Top"
                value={page.marginTop}
                min={24}
                max={180}
                step={2}
                displayValue={`${page.marginTop}px`}
                onChange={(v) => onUpdatePage({ marginTop: v })}
              />
              <SliderControl
                id="margin-bottom"
                label="Bottom"
                value={page.marginBottom}
                min={24}
                max={160}
                step={2}
                displayValue={`${page.marginBottom}px`}
                onChange={(v) => onUpdatePage({ marginBottom: v })}
              />
              <SliderControl
                id="margin-left"
                label="Left"
                value={page.marginLeft}
                min={24}
                max={180}
                step={2}
                displayValue={`${page.marginLeft}px`}
                onChange={(v) => onUpdatePage({ marginLeft: v })}
              />
              <SliderControl
                id="margin-right"
                label="Right"
                value={page.marginRight}
                min={24}
                max={180}
                step={2}
                displayValue={`${page.marginRight}px`}
                onChange={(v) => onUpdatePage({ marginRight: v })}
              />
            </div>

            <SectionDivider title="Paper Details" />

            <ToggleSwitch
              id="page-texture"
              label="Paper grain texture"
              description="Subtle organic fiber & paper surface noise"
              checked={page.paperTexture}
              onChange={(checked) => onUpdatePage({ paperTexture: checked })}
            />

            {activePaperPreset.hasMarginLine && (
              <ToggleSwitch
                id="page-margin-line"
                label="Vertical margin line"
                checked={page.showMarginLine}
                onChange={(checked) => onUpdatePage({ showMarginLine: checked })}
              />
            )}

            <ToggleSwitch
              id="page-holes"
              label="Binder hole punches"
              checked={page.showHolePunches}
              onChange={(checked) => onUpdatePage({ showHolePunches: checked })}
            />
          </>
        )}

        {activeTab === 'document' && (
          <>
            {/* Alignment */}
            <div className="space-y-2">
              <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Text Alignment
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {(
                  [
                    { id: 'left', icon: <AlignLeft className="w-3.5 h-3.5" />, label: 'Left' },
                    { id: 'center', icon: <AlignCenter className="w-3.5 h-3.5" />, label: 'Center' },
                    { id: 'right', icon: <AlignRight className="w-3.5 h-3.5" />, label: 'Right' },
                    { id: 'justify', icon: <AlignJustify className="w-3.5 h-3.5" />, label: 'Justify' },
                  ] as { id: TextAlignment; icon: React.ReactNode; label: string }[]
                ).map((item) => {
                  const selected = doc.alignment === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      title={item.label}
                      aria-label={`Align ${item.label}`}
                      onClick={() => onUpdateDocument({ alignment: item.id })}
                      className={`h-8 inline-flex items-center justify-center rounded-lg border transition-colors cursor-pointer ${
                        selected
                          ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100'
                          : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/70'
                      }`}
                    >
                      {item.icon}
                    </button>
                  );
                })}
              </div>
            </div>

            <SliderControl
              id="doc-paragraph-spacing"
              label="Paragraph Spacing"
              value={doc.paragraphSpacing}
              min={0}
              max={48}
              step={2}
              displayValue={`${doc.paragraphSpacing}px`}
              onChange={(v) => onUpdateDocument({ paragraphSpacing: v })}
            />

            <SliderControl
              id="doc-first-indent"
              label="First-Line Indentation"
              value={doc.firstLineIndent}
              min={0}
              max={80}
              step={4}
              displayValue={`${doc.firstLineIndent}px`}
              onChange={(v) => onUpdateDocument({ firstLineIndent: v })}
            />

            <SectionDivider title="Title & Date (Page 1)" />

            <div className="space-y-2">
              <ToggleSwitch
                id="doc-show-title"
                label="Show document title"
                checked={doc.showTitle}
                onChange={(checked) => onUpdateDocument({ showTitle: checked })}
              />
              {doc.showTitle && (
                <input
                  type="text"
                  value={doc.title}
                  onChange={(e) => onUpdateDocument({ title: e.target.value })}
                  placeholder="Enter document title..."
                  aria-label="Document title"
                  className="w-full h-8 px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
              )}
            </div>

            <div className="space-y-2">
              <ToggleSwitch
                id="doc-show-date"
                label="Show date"
                checked={doc.showDate}
                onChange={(checked) => onUpdateDocument({ showDate: checked })}
              />
              {doc.showDate && (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={doc.date}
                    onChange={(e) => onUpdateDocument({ date: e.target.value })}
                    placeholder="Date..."
                    aria-label="Document date"
                    className="flex-1 h-8 px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                  <button
                    type="button"
                    onClick={() => onUpdateDocument({ date: getTodayFormatted() })}
                    title="Set today's date"
                    className="h-8 px-2.5 inline-flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-zinc-800 text-[11px] font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    <Calendar className="w-3 h-3" />
                    <span>Today</span>
                  </button>
                </div>
              )}
            </div>

            <SectionDivider title="Header & Footer (All Pages)" />

            <div className="space-y-2">
              <ToggleSwitch
                id="doc-show-header"
                label="Page header"
                checked={doc.showHeader}
                onChange={(checked) => onUpdateDocument({ showHeader: checked })}
              />
              {doc.showHeader && (
                <input
                  type="text"
                  value={doc.headerText}
                  onChange={(e) => onUpdateDocument({ headerText: e.target.value })}
                  placeholder="Header text (e.g. Course Name)..."
                  aria-label="Page header text"
                  className="w-full h-8 px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
              )}
            </div>

            <div className="space-y-2">
              <ToggleSwitch
                id="doc-show-footer"
                label="Page footer"
                checked={doc.showFooter}
                onChange={(checked) => onUpdateDocument({ showFooter: checked })}
              />
              {doc.showFooter && (
                <input
                  type="text"
                  value={doc.footerText}
                  onChange={(e) => onUpdateDocument({ footerText: e.target.value })}
                  placeholder="Footer text..."
                  aria-label="Page footer text"
                  className="w-full h-8 px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
              )}
            </div>

            <SectionDivider title="Page Numbering" />

            <div className="space-y-2">
              <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Position
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    { id: 'off', label: 'Off' },
                    { id: 'bottom-center', label: 'Bottom Center' },
                    { id: 'bottom-right', label: 'Bottom Right' },
                    { id: 'top-right', label: 'Top Right' },
                  ] as { id: PageNumberPosition; label: string }[]
                ).map((pos) => {
                  const selected = doc.pageNumberPosition === pos.id;
                  return (
                    <button
                      key={pos.id}
                      type="button"
                      onClick={() => onUpdateDocument({ pageNumberPosition: pos.id })}
                      className={`h-8 px-2 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ${
                        selected
                          ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100'
                          : 'border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/70'
                      }`}
                    >
                      {pos.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {doc.pageNumberPosition !== 'off' && (
              <div className="space-y-2">
                <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Number Format
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      { id: 'numeric', label: '1' },
                      { id: 'of-total', label: '1 / N' },
                      { id: 'page-prefix', label: 'Page 1' },
                    ] as { id: PageNumberFormat; label: string }[]
                  ).map((fmt) => {
                    const selected = doc.pageNumberFormat === fmt.id;
                    return (
                      <button
                        key={fmt.id}
                        type="button"
                        onClick={() => onUpdateDocument({ pageNumberFormat: fmt.id })}
                        className={`h-8 rounded-lg text-[11px] font-mono border transition-colors cursor-pointer ${
                          selected
                            ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100'
                            : 'border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/70'
                        }`}
                      >
                        {fmt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
};
