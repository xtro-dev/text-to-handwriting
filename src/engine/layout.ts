import { getFontMeta } from '../constants/fonts';
import { getPageDimensions, getPaperPreset } from '../constants/papers';
import type {
  AppSettings,
  HandwritingFontMeta,
  HumanizeWordAnnotation,
  PaginatedDocument,
  RenderedLineLayout,
  RenderedPageLayout,
} from '../types/handwriting';
import {
  buildHumanizedParagraphWords,
  collectLineAnnotations,
  getHumanizedLineDriftY,
  type HumanizedWordToken,
} from './humanize';

export type TextMeasureFn = (text: string, fontSpec: string) => number;

/**
 * Creates a reusable Canvas 2D text measurer in browser environments.
 * Falls back gracefully to a proportional heuristic in non-DOM test contexts.
 */
export function createTextMeasurer(): TextMeasureFn {
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      return (text: string, fontSpec: string) => {
        ctx.font = fontSpec;
        return ctx.measureText(text).width;
      };
    }
  }
  return (text: string, fontSpec: string) => {
    const match = /(\d+(?:\.\d+)?)px/.exec(fontSpec);
    const size = match ? parseFloat(match[1]) : 20;
    return text.length * size * 0.48;
  };
}

export function buildCanvasFontSpec(
  fontMeta: HandwritingFontMeta,
  fontSizePx: number,
): string {
  const effectiveSize = Math.max(8, fontSizePx * fontMeta.sizeScale);
  return `${fontMeta.defaultWeight} ${effectiveSize.toFixed(2)}px "${fontMeta.family}", cursive, sans-serif`;
}

/**
 * Measures the rendered width of a string including custom letterSpacing and wordSpacing.
 */
export function measureStyledTextWidth(
  text: string,
  measureText: TextMeasureFn,
  fontSpec: string,
  letterSpacing: number,
  wordSpacing: number,
): number {
  if (!text) return 0;
  const baseWidth = measureText(text, fontSpec);
  const charCount = Array.from(text).length;
  let spaceCount = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === ' ') spaceCount++;
  }
  const extraLetters = Math.max(0, charCount - 1) * letterSpacing;
  const extraWords = spaceCount * wordSpacing;
  return Math.max(0, baseWidth + extraLetters + extraWords);
}

interface WrappedParagraphLine {
  text: string;
  width: number;
  maxWidth: number;
  paragraphIndex: number;
  isFirstLineOfParagraph: boolean;
  isLastLineOfParagraph: boolean;
  humanizeAnnotations?: HumanizeWordAnnotation[];
}

function wrapParagraph(
  rawParagraph: string,
  paragraphIndex: number,
  contentWidth: number,
  firstLineIndent: number,
  alignment: AppSettings['document']['alignment'],
  measureText: TextMeasureFn,
  fontSpec: string,
  letterSpacing: number,
  wordSpacing: number,
  humanizeSettings?: AppSettings['humanize'],
  variationSeed = 0,
): WrappedParagraphLine[] {
  const normalized = rawParagraph.replace(/\t/g, '    ');
  if (normalized.trim().length === 0) {
    return [
      {
        text: '',
        width: 0,
        maxWidth: contentWidth,
        paragraphIndex,
        isFirstLineOfParagraph: true,
        isLastLineOfParagraph: true,
      },
    ];
  }

  // Preserve leading spaces if user typed explicit indentation
  const leadingMatch = /^( +)/.exec(normalized);
  const leadingSpaces = leadingMatch ? leadingMatch[1] : '';
  const body = normalized.slice(leadingSpaces.length).trimEnd();
  const rawWords = body.split(/ +/).filter(Boolean);

  if (rawWords.length === 0) {
    return [
      {
        text: '',
        width: 0,
        maxWidth: contentWidth,
        paragraphIndex,
        isFirstLineOfParagraph: true,
        isLastLineOfParagraph: true,
      },
    ];
  }

  const wordTokens: HumanizedWordToken[] = humanizeSettings?.enabled
    ? buildHumanizedParagraphWords(
        rawWords,
        paragraphIndex,
        variationSeed,
        humanizeSettings,
      )
    : rawWords.map((w) => ({
        text: w,
        crossedOut: false,
        strikeStyle: 'single',
      }));

  const lines: WrappedParagraphLine[] = [];
  const effectiveIndent =
    alignment === 'left' || alignment === 'justify'
      ? Math.min(firstLineIndent, Math.max(0, contentWidth - 40))
      : 0;

  let isFirstLine = true;
  let currentLine = leadingSpaces;
  let currentLineTokens: HumanizedWordToken[] = [];

  const getAvailableWidth = (first: boolean) =>
    Math.max(40, contentWidth - (first ? effectiveIndent : 0));

  const pushCurrentLine = (isLast: boolean) => {
    const avail = getAvailableWidth(isFirstLine);
    const trimmed = currentLine.trimEnd();
    const w = measureStyledTextWidth(
      trimmed,
      measureText,
      fontSpec,
      letterSpacing,
      wordSpacing,
    );
    lines.push({
      text: trimmed,
      width: w,
      maxWidth: avail,
      paragraphIndex,
      isFirstLineOfParagraph: isFirstLine,
      isLastLineOfParagraph: isLast,
      humanizeAnnotations: humanizeSettings?.enabled
        ? collectLineAnnotations(currentLineTokens)
        : undefined,
    });
    isFirstLine = false;
    currentLine = '';
    currentLineTokens = [];
  };

  for (let i = 0; i < wordTokens.length; i++) {
    const token = wordTokens[i];
    const word = token.text;
    const avail = getAvailableWidth(isFirstLine);
    const separator =
      currentLine.length === 0 || currentLine.endsWith(' ') ? '' : ' ';
    const candidate = currentLine + separator + word;
    const candidateWidth = measureStyledTextWidth(
      candidate,
      measureText,
      fontSpec,
      letterSpacing,
      wordSpacing,
    );

    if (candidateWidth <= avail) {
      currentLine = candidate;
      currentLineTokens.push(token);
      continue;
    }

    // If current line already has content, emit it before handling this word
    if (currentLine.trim().length > 0) {
      pushCurrentLine(false);
    }

    // Check if the single word itself fits on a fresh line
    const freshAvail = getAvailableWidth(isFirstLine);
    const singleWordWidth = measureStyledTextWidth(
      word,
      measureText,
      fontSpec,
      letterSpacing,
      wordSpacing,
    );

    if (singleWordWidth <= freshAvail) {
      currentLine = word;
      currentLineTokens.push(token);
    } else {
      // Break ultra-long unbroken tokens (URLs, long strings) cleanly by character
      const chars = Array.from(word);
      let chunk = '';
      for (const ch of chars) {
        const nextChunk = chunk + ch;
        const nextWidth = measureStyledTextWidth(
          nextChunk,
          measureText,
          fontSpec,
          letterSpacing,
          wordSpacing,
        );
        if (nextWidth > freshAvail && chunk.length > 0) {
          currentLine = chunk;
          pushCurrentLine(false);
          chunk = ch;
        } else {
          chunk = nextChunk;
        }
      }
      currentLine = chunk;
    }
  }

  if (currentLine.length > 0 || lines.length === 0) {
    pushCurrentLine(true);
  } else if (lines.length > 0) {
    lines[lines.length - 1].isLastLineOfParagraph = true;
  }

  return lines;
}

export function formatPageNumber(
  pageNumber: number,
  totalPages: number,
  format: AppSettings['document']['pageNumberFormat'],
): string {
  switch (format) {
    case 'numeric':
      return `${pageNumber}`;
    case 'page-prefix':
      return `Page ${pageNumber}`;
    case 'of-total':
    default:
      return `${pageNumber} / ${totalPages}`;
  }
}

export function computePaginatedDocument(
  rawText: string,
  settings: AppSettings,
  measureText: TextMeasureFn = createTextMeasurer(),
): PaginatedDocument {
  const { handwriting, page, document: doc } = settings;
  const dims = getPageDimensions(page.pageSize, page.orientation);
  const paperPreset = getPaperPreset(page.paperType);
  const fontMeta = getFontMeta(handwriting.fontId);
  const fontSpec = buildCanvasFontSpec(fontMeta, handwriting.fontSize);

  const safeMarginLeft = Math.max(16, Math.min(page.marginLeft, dims.widthPx * 0.4));
  const safeMarginRight = Math.max(16, Math.min(page.marginRight, dims.widthPx * 0.4));
  const contentWidth = Math.max(80, dims.widthPx - safeMarginLeft - safeMarginRight);

  const hasRuledLines = paperPreset.hasHorizontalLines;
  const ruleSpacing = Math.max(14, page.ruleSpacing);
  const snapToLines = hasRuledLines && handwriting.snapToPaperLines;
  const lineAdvance = snapToLines
    ? ruleSpacing
    : Math.max(14, handwriting.lineSpacing);

  // Top ruling band for notebook/legal sheets
  const rulesStartY = hasRuledLines
    ? Math.max(54, Math.min(page.marginTop, 108))
    : page.marginTop;

  const hasHeader = doc.showHeader && doc.headerText.trim().length > 0;
  const hasFooter = doc.showFooter && doc.footerText.trim().length > 0;
  const hasPageNumber = doc.pageNumberPosition !== 'off';

  const footerReserve = hasFooter || hasPageNumber ? 30 : 0;
  const bottomLimitY = Math.max(
    page.marginTop + lineAdvance + 20,
    dims.heightPx - Math.max(20, page.marginBottom) - footerReserve,
  );

  // Compute starting Y baseline for body lines on Page 1 and subsequent pages
  const getPageStartY = (pageIdx: number): { startY: number; titleY?: number; dateY?: number } => {
    const hasTitleOnPage = pageIdx === 0 && doc.showTitle && doc.title.trim().length > 0;
    const hasDateOnPage = pageIdx === 0 && doc.showDate && doc.date.trim().length > 0;

    if (hasRuledLines) {
      // On lined notebooks, title & date neatly occupy the top header band above rulesStartY!
      const headerZoneBottom = rulesStartY;
      const titleY = hasTitleOnPage ? Math.max(30, headerZoneBottom - 14) : undefined;
      const dateY = hasDateOnPage ? Math.max(30, headerZoneBottom - 14) : undefined;

      // Start body text on the first ruled line >= marginTop (usually rulesStartY + ruleSpacing)
      let firstRuleY = rulesStartY + ruleSpacing;
      while (firstRuleY < page.marginTop + ruleSpacing * 0.35) {
        firstRuleY += ruleSpacing;
      }
      if (hasHeader && pageIdx > 0 && firstRuleY < rulesStartY + ruleSpacing) {
        firstRuleY = rulesStartY + ruleSpacing;
      }
      const baselineOffset = handwriting.fontSize * fontMeta.baselineOffsetRatio;
      return {
        startY: firstRuleY - baselineOffset,
        titleY,
        dateY,
      };
    }

    // Unruled papers (blank, cream, old-paper, grid, dotted)
    let cursorY = Math.max(24, page.marginTop) + (hasHeader ? 26 : 0);
    let titleY: number | undefined;
    let dateY: number | undefined;

    if (hasTitleOnPage || hasDateOnPage) {
      const headingBaseline = cursorY + handwriting.fontSize * 1.15;
      if (hasTitleOnPage) titleY = headingBaseline;
      if (hasDateOnPage) dateY = headingBaseline;
      cursorY = headingBaseline + Math.max(30, lineAdvance * 1.1);
    } else {
      cursorY += handwriting.fontSize * 0.85;
    }

    return {
      startY: cursorY,
      titleY,
      dateY,
    };
  };

  // Tokenize input text into paragraphs and wrap
  const normalizedText = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const rawParagraphs = normalizedText.split('\n');

  const wrappedLines: WrappedParagraphLine[] = [];
  rawParagraphs.forEach((p, idx) => {
    const pLines = wrapParagraph(
      p,
      idx,
      contentWidth,
      doc.firstLineIndent,
      doc.alignment,
      measureText,
      fontSpec,
      handwriting.letterSpacing,
      handwriting.wordSpacing,
      settings.humanize,
      handwriting.variationSeed,
    );
    wrappedLines.push(...pLines);
  });

  // Paginate wrapped lines cleanly across pages
  const pages: RenderedPageLayout[] = [];
  let pageIdx = 0;
  let pageMeta = getPageStartY(0);
  let cursorY = pageMeta.startY;
  let currentLines: RenderedLineLayout[] = [];
  let globalLineIndex = 0;
  let globalCharOffset = 0;

  const commitPage = () => {
    pages.push({
      pageNumber: pageIdx + 1,
      totalPages: 0, // filled once total count is known
      width: dims.widthPx,
      height: dims.heightPx,
      rulesStartY,
      ruleSpacing,
      lines: currentLines,
      titleText: pageIdx === 0 && doc.showTitle ? doc.title.trim() : undefined,
      titleY: pageMeta.titleY,
      dateText: pageIdx === 0 && doc.showDate ? doc.date.trim() : undefined,
      dateY: pageMeta.dateY,
      headerText: hasHeader ? doc.headerText.trim() : undefined,
      footerText: hasFooter ? doc.footerText.trim() : undefined,
    });
    pageIdx++;
    pageMeta = getPageStartY(pageIdx);
    cursorY = pageMeta.startY;
    currentLines = [];
  };

  const effectiveIndent =
    doc.alignment === 'left' || doc.alignment === 'justify'
      ? Math.min(doc.firstLineIndent, Math.max(0, contentWidth - 40))
      : 0;

  for (let i = 0; i < wrappedLines.length; i++) {
    const line = wrappedLines[i];
    const isBlankLine = line.text.length === 0;

    // Blank line on a fresh page at top can simply advance unless at start
    if (cursorY > bottomLimitY && currentLines.length > 0) {
      commitPage();
      // Skip stray blank paragraph line right at the top of a new overflow page
      if (isBlankLine) {
        globalCharOffset += 1;
        continue;
      }
    }

    if (!isBlankLine) {
      const baseLeftX =
        safeMarginLeft + (line.isFirstLineOfParagraph ? effectiveIndent : 0);
      let x = baseLeftX;

      if (doc.alignment === 'center') {
        x = safeMarginLeft + Math.max(0, (contentWidth - line.width) / 2);
      } else if (doc.alignment === 'right') {
        x = safeMarginLeft + Math.max(0, contentWidth - line.width);
      }

      const lineDriftY = settings.humanize?.enabled
        ? getHumanizedLineDriftY(
            globalLineIndex,
            line.paragraphIndex,
            handwriting.variationSeed,
            settings.humanize,
          )
        : 0;
      const lineY = Math.min(bottomLimitY + 2, cursorY + lineDriftY);

      currentLines.push({
        text: line.text,
        x,
        y: lineY,
        width: line.width,
        maxWidth: line.maxWidth,
        lineIndex: globalLineIndex,
        paragraphIndex: line.paragraphIndex,
        charOffset: globalCharOffset,
        isFirstLineOfParagraph: line.isFirstLineOfParagraph,
        isLastLineOfParagraph: line.isLastLineOfParagraph,
        alignment: doc.alignment,
        humanizeAnnotations: line.humanizeAnnotations,
      });
    }

    globalLineIndex++;
    globalCharOffset += line.text.length + 1;

    // Advance Y cursor
    if (isBlankLine) {
      cursorY += snapToLines
        ? ruleSpacing
        : lineAdvance + Math.max(0, doc.paragraphSpacing * 0.25);
    } else if (line.isLastLineOfParagraph) {
      if (snapToLines) {
        // Snap extra paragraph gap to nearest rule increment so handwriting stays on ruled lines
        const extraLines =
          doc.paragraphSpacing >= ruleSpacing * 0.6
            ? Math.max(1, Math.round(doc.paragraphSpacing / ruleSpacing))
            : 0;
        cursorY += ruleSpacing * (1 + extraLines);
      } else {
        cursorY += lineAdvance + doc.paragraphSpacing;
      }
    } else {
      cursorY += lineAdvance;
    }
  }

  // Always commit at least 1 page (even for empty document)
  if (currentLines.length > 0 || pages.length === 0) {
    commitPage();
  }

  const totalPages = pages.length;
  for (const p of pages) {
    p.totalPages = totalPages;
    if (hasPageNumber) {
      p.pageNumberText = formatPageNumber(
        p.pageNumber,
        totalPages,
        doc.pageNumberFormat,
      );
    }
  }

  return {
    pages,
    totalLines: globalLineIndex,
    totalParagraphs: rawParagraphs.filter((p) => p.trim().length > 0).length,
  };
}
