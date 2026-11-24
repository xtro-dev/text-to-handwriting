import { describe, expect, it } from 'vitest';
import { HANDWRITING_FONTS } from '../../constants/fonts';
import { PAGE_SIZES, PAPER_STYLES, getPageDimensions } from '../../constants/papers';
import { DEFAULT_SETTINGS, SAMPLE_TEMPLATES } from '../../constants/presets';
import { randomizeHandwritingSettings } from '../../utils/randomize';
import { mergeWithDefaultSettings } from '../../utils/storage';
import { computePaginatedDocument, formatPageNumber } from '../layout';
import { getLuminance, parseHexColor, seededBell, seededUnit } from '../prng';

const fixedWidthMeasure = (text: string) => text.length * 9.5;

describe('Page dimensions and paper definitions', () => {
  it('computes accurate portrait and landscape dimensions for all formats', () => {
    for (const id of Object.keys(PAGE_SIZES) as (keyof typeof PAGE_SIZES)[]) {
      const portrait = getPageDimensions(id, 'portrait');
      const landscape = getPageDimensions(id, 'landscape');
      expect(portrait.heightMm).toBeGreaterThan(portrait.widthMm);
      expect(landscape.widthMm).toBe(portrait.heightMm);
      expect(landscape.heightMm).toBe(portrait.widthMm);
      expect(portrait.widthPx).toBeGreaterThan(300);
      expect(portrait.heightPx).toBeGreaterThan(400);
    }
  });

  it('includes all 9 required paper styles', () => {
    const ids = PAPER_STYLES.map((p) => p.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        'blank',
        'ruled',
        'college-ruled',
        'wide-ruled',
        'grid',
        'dotted',
        'cream',
        'old-paper',
        'legal',
      ]),
    );
  });

  it('includes 15 freely available handwriting fonts', () => {
    expect(HANDWRITING_FONTS.length).toBeGreaterThanOrEqual(15);
    for (const font of HANDWRITING_FONTS) {
      expect(font.family.length).toBeGreaterThan(0);
      expect(font.sizeScale).toBeGreaterThan(0.5);
    }
  });
});

describe('Deterministic PRNG and color helpers', () => {
  it('produces repeatable deterministic values within expected bounds', () => {
    const a = seededUnit(10, 20, 30, 40);
    const b = seededUnit(10, 20, 30, 40);
    const c = seededUnit(10, 21, 30, 40);
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(1);

    const bell = seededBell(999, 3);
    expect(bell).toBeGreaterThanOrEqual(-0.5);
    expect(bell).toBeLessThanOrEqual(0.5);
  });

  it('parses hex colors and computes relative luminance', () => {
    expect(parseHexColor('#fff')).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseHexColor('#1d3c8e')).toEqual({ r: 29, g: 60, b: 142 });
    expect(getLuminance('#ffffff')).toBeCloseTo(1, 2);
    expect(getLuminance('#000000')).toBeCloseTo(0, 2);
  });
});

describe('Handwriting layout & pagination engine', () => {
  it('always produces at least 1 page for empty text', () => {
    const doc = computePaginatedDocument('', DEFAULT_SETTINGS, fixedWidthMeasure);
    expect(doc.pages.length).toBe(1);
    expect(doc.pages[0].pageNumber).toBe(1);
    expect(doc.pages[0].totalPages).toBe(1);
  });

  it('paginates long multi-page documents without clipping past bottom margin', () => {
    const longSample = SAMPLE_TEMPLATES.find((s) => s.id === 'long-multipage')?.text ?? '';
    const veryLongText = `${longSample}\n\n${longSample}\n\n${longSample}`;
    const doc = computePaginatedDocument(veryLongText, DEFAULT_SETTINGS, fixedWidthMeasure);

    expect(doc.pages.length).toBeGreaterThanOrEqual(3);
    const bottomLimit = DEFAULT_SETTINGS.page.marginBottom;
    for (const page of doc.pages) {
      expect(page.totalPages).toBe(doc.pages.length);
      for (const line of page.lines) {
        expect(line.y).toBeLessThan(page.height - bottomLimit);
        expect(line.x).toBeGreaterThanOrEqual(DEFAULT_SETTINGS.page.marginLeft);
      }
    }
  });

  it('wraps unbroken long strings so text never overflows horizontal margins', () => {
    const unbroken = 'x'.repeat(300);
    const doc = computePaginatedDocument(unbroken, DEFAULT_SETTINGS, fixedWidthMeasure);
    const maxAllowedWidth =
      doc.pages[0].width -
      DEFAULT_SETTINGS.page.marginLeft -
      DEFAULT_SETTINGS.page.marginRight;
    expect(doc.pages[0].lines.length).toBeGreaterThan(2);
    for (const line of doc.pages[0].lines) {
      expect(line.width).toBeLessThanOrEqual(maxAllowedWidth + 0.01);
    }
  });

  it('applies first-line indentation only to first line of each paragraph', () => {
    const settings = structuredClone(DEFAULT_SETTINGS);
    settings.document.firstLineIndent = 36;
    settings.document.alignment = 'left';
    const text = Array.from({ length: 40 }, () => 'handwriting').join(' ');
    const doc = computePaginatedDocument(text, settings, fixedWidthMeasure);
    const lines = doc.pages[0].lines;
    expect(lines.length).toBeGreaterThan(1);
    expect(lines[0].isFirstLineOfParagraph).toBe(true);
    expect(lines[0].x).toBe(settings.page.marginLeft + 36);
    expect(lines[1].isFirstLineOfParagraph).toBe(false);
    expect(lines[1].x).toBe(settings.page.marginLeft);
  });

  it('formats page numbers properly in all styles', () => {
    expect(formatPageNumber(2, 5, 'numeric')).toBe('2');
    expect(formatPageNumber(2, 5, 'of-total')).toBe('2 / 5');
    expect(formatPageNumber(2, 5, 'page-prefix')).toBe('Page 2');
  });
});

describe('Settings persistence and randomization helpers', () => {
  it('merges partial settings cleanly with defaults', () => {
    const merged = mergeWithDefaultSettings({
      handwriting: { fontSize: 28 },
      page: { pageSize: 'letter' },
    });
    expect(merged.handwriting.fontSize).toBe(28);
    expect(merged.handwriting.fontId).toBe(DEFAULT_SETTINGS.handwriting.fontId);
    expect(merged.page.pageSize).toBe('letter');
    expect(merged.document.alignment).toBe('left');
  });

  it('randomizes handwriting settings cleanly without leaving valid bounds', () => {
    const randomized = randomizeHandwritingSettings(DEFAULT_SETTINGS);
    expect(randomized.handwriting.fontId).not.toBe(DEFAULT_SETTINGS.handwriting.fontId);
    expect(randomized.handwriting.fontSize).toBeGreaterThanOrEqual(18);
    expect(randomized.handwriting.fontSize).toBeLessThanOrEqual(23);
    expect(randomized.handwriting.variationSeed).not.toBe(
      DEFAULT_SETTINGS.handwriting.variationSeed,
    );
  });
});
