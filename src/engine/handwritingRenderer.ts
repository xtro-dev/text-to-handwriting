import { getFontMeta } from '../constants/fonts';
import { getPaperPreset } from '../constants/papers';
import type {
  AppSettings,
  HandwritingFontMeta,
  HumanizeStrikeStyle,
  HumanizeWordAnnotation,
  RenderedLineLayout,
  RenderedPageLayout,
} from '../types/handwriting';
import { getHumanizeProfile, getOverwriteGhostChar } from './humanize';
import { buildCanvasFontSpec } from './layout';
import { renderPaperBackground } from './paperRenderer';
import { getLuminance, hashInt, rgbaFromHex, seededBell, seededUnit } from './prng';

interface HumanizeMotionConfig {
  enabled: boolean;
  extraCharRotation: number;
  extraWordRotation: number;
  extraLetterSpacing: number;
  extraWordSpacing: number;
  extraBaselineAmp: number;
  extraPressureAmp: number;
  overwriteProb: number;
}

function getHumanizeMotion(settings: AppSettings): HumanizeMotionConfig {
  const hum = settings.humanize;
  if (!hum || !hum.enabled) {
    return {
      enabled: false,
      extraCharRotation: 0,
      extraWordRotation: 0,
      extraLetterSpacing: 0,
      extraWordSpacing: 0,
      extraBaselineAmp: 0,
      extraPressureAmp: 0,
      overwriteProb: 0,
    };
  }
  const profile = getHumanizeProfile(hum.intensity);
  const spaceFactor = Math.max(0, Math.min(1, hum.spacingVariation / 100));
  const baseFactor = Math.max(0, Math.min(1, hum.baselineVariation / 100));

  return {
    enabled: true,
    extraCharRotation: profile.rotationBoost,
    extraWordRotation: profile.wordSlopeBoost,
    extraLetterSpacing: profile.spacingBoostPx * spaceFactor,
    extraWordSpacing: (1.2 + profile.spacingBoostPx * 1.9) * spaceFactor,
    extraBaselineAmp: profile.baselineBoostPx * baseFactor,
    extraPressureAmp: profile.pressureBoost,
    overwriteProb: profile.overwriteProb,
  };
}

function drawTextWithPenPhysics(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  effectiveFontSize: number,
  inkColor: string,
  penThickness: number,
  inkImperfections: number,
  pressureFactor: number,
): void {
  // Base pen opacity simulates fine nib vs bold ink saturation + pressure variance
  const baseAlpha =
    penThickness < 1
      ? 0.72 + 0.28 * penThickness
      : 0.94 + Math.min(0.06, (penThickness - 1) * 0.04);
  const finalAlpha = Math.max(0.45, Math.min(1, baseAlpha * pressureFactor));
  const prevAlpha = ctx.globalAlpha;

  ctx.globalAlpha = prevAlpha * finalAlpha;
  ctx.fillStyle = inkColor;
  ctx.fillText(text, x, y);

  // Fast sub-pixel ink absorption feathering (avoids costly per-glyph shadowBlur)
  if (inkImperfections > 0.2) {
    ctx.globalAlpha = prevAlpha * finalAlpha * 0.14 * inkImperfections;
    ctx.fillText(text, x + 0.28, y + 0.22);
  }

  // Simulate thicker gel / marker / broad nib stroke
  if (penThickness > 1.02) {
    const extraWidth = (penThickness - 1.0) * effectiveFontSize * 0.052;
    ctx.globalAlpha = prevAlpha * finalAlpha * 0.86;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(0.2, extraWidth);
    ctx.strokeStyle = inkColor;
    ctx.strokeText(text, x, y);
  }

  ctx.globalAlpha = prevAlpha;
}

function getMacroWaveY(
  x: number,
  lineSeed: number,
  baselineVariation: number,
): number {
  if (baselineVariation <= 0.001) return 0;
  const phase1 = (lineSeed % 1000) * 0.00628;
  const phase2 = ((lineSeed >> 8) % 1000) * 0.00628;
  return (
    (Math.sin(x * 0.013 + phase1) * 2.1 +
      Math.sin(x * 0.036 + phase2) * 0.95) *
    baselineVariation
  );
}

function renderGlyphWord(
  ctx: CanvasRenderingContext2D,
  word: string,
  startX: number,
  baseY: number,
  wordSeed: number,
  effectiveFontSize: number,
  fontMeta: HandwritingFontMeta,
  settings: AppSettings,
  motion: HumanizeMotionConfig,
): number {
  const { handwriting } = settings;
  const chars = Array.from(word);
  let cursorX = startX;
  let prefix = '';

  const wordSlope = motion.enabled
    ? seededBell(wordSeed, 71) * motion.extraWordRotation
    : 0;

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const nextPrefix = prefix + ch;
    const w1 = prefix.length > 0 ? ctx.measureText(prefix).width : 0;
    const w2 = ctx.measureText(nextPrefix).width;
    const advance = Math.max(0, w2 - w1);
    prefix = nextPrefix;

    const charSeed = hashInt(wordSeed, i, handwriting.variationSeed);
    const charVar = handwriting.characterVariation;
    const baseVar = handwriting.baselineVariation;
    const inkVar = handwriting.inkImperfections;

    const waveY = getMacroWaveY(
      cursorX,
      wordSeed,
      baseVar + (motion.enabled ? motion.extraBaselineAmp * 0.38 : 0),
    );
    const dy =
      seededBell(charSeed, 11) * (2.4 * baseVar + motion.extraBaselineAmp * 0.9);
    const dx =
      seededBell(charSeed, 13) * (1.15 * charVar + motion.extraLetterSpacing);
    const angle =
      seededBell(charSeed, 17) * (0.072 * charVar + motion.extraCharRotation) +
      wordSlope * 0.45;
    const scaleX = 1 + seededBell(charSeed, 19) * 0.045 * charVar;
    const scaleY = 1 + seededBell(charSeed, 23) * 0.065 * charVar;

    // Occasional micro pen skip / heavier ink drop
    let pressure =
      1 -
      Math.abs(seededBell(charSeed, 29)) *
        (0.28 * inkVar + motion.extraPressureAmp);
    const rarity = seededUnit(charSeed, 31, 7, 3);
    if ((inkVar > 0.25 || motion.enabled) && rarity > 0.92) {
      pressure *= 0.8;
    }

    const drawX = cursorX + dx;
    const drawY = baseY + waveY + dy + (cursorX - startX) * Math.sin(wordSlope) * 0.35;
    const pivotX = drawX + advance * 0.5;
    const pivotY = drawY - effectiveFontSize * 0.26;

    const isOverwritten =
      motion.enabled &&
      motion.overwriteProb > 0 &&
      /[A-Za-z]/.test(ch) &&
      seededUnit(charSeed, 41, 13, 9) < motion.overwriteProb;

    ctx.save();
    ctx.translate(pivotX, pivotY);
    if (Math.abs(angle) > 0.0005) {
      ctx.rotate(angle);
    }
    if (Math.abs(scaleX - 1) > 0.001 || Math.abs(scaleY - 1) > 0.001) {
      ctx.scale(scaleX, scaleY);
    }

    if (isOverwritten) {
      // Draw faint initial slip stroke slightly offset before writing final glyph firmly on top
      const ghostChar = getOverwriteGhostChar(ch);
      drawTextWithPenPhysics(
        ctx,
        ghostChar,
        -advance * 0.5 - 0.85,
        effectiveFontSize * 0.26 + 0.55,
        effectiveFontSize,
        handwriting.inkColor,
        Math.max(0.55, handwriting.penThickness * 0.75),
        inkVar,
        pressure * 0.38,
      );
      drawTextWithPenPhysics(
        ctx,
        ch,
        -advance * 0.5,
        effectiveFontSize * 0.26,
        effectiveFontSize,
        handwriting.inkColor,
        Math.min(2.2, handwriting.penThickness * 1.14),
        Math.max(inkVar, 0.35),
        Math.min(1, pressure * 1.05),
      );
    } else {
      drawTextWithPenPhysics(
        ctx,
        ch,
        -advance * 0.5,
        effectiveFontSize * 0.26,
        effectiveFontSize,
        handwriting.inkColor,
        handwriting.penThickness,
        inkVar,
        pressure,
      );
    }
    ctx.restore();

    const perGapJitter = motion.enabled
      ? seededBell(charSeed, 59) * motion.extraLetterSpacing * 0.65
      : 0;
    cursorX +=
      advance +
      (i < chars.length - 1 ? handwriting.letterSpacing + perGapJitter : 0);
  }

  // Slight organic extra slant consistency per font style
  void fontMeta;
  return cursorX;
}

function renderClusterWord(
  ctx: CanvasRenderingContext2D,
  word: string,
  startX: number,
  baseY: number,
  wordSeed: number,
  effectiveFontSize: number,
  fontMeta: HandwritingFontMeta,
  settings: AppSettings,
  motion: HumanizeMotionConfig,
): number {
  const { handwriting } = settings;

  // If user applies explicit wide/tight letter spacing, switch to kerning-aware char pass
  if (Math.abs(handwriting.letterSpacing) > 0.55) {
    return renderGlyphWord(
      ctx,
      word,
      startX,
      baseY,
      wordSeed,
      effectiveFontSize,
      fontMeta,
      settings,
      motion,
    );
  }

  const wordWidth = ctx.measureText(word).width;
  const charVar = handwriting.characterVariation;
  const baseVar = handwriting.baselineVariation;
  const inkVar = handwriting.inkImperfections;

  const waveY = getMacroWaveY(
    startX + wordWidth * 0.5,
    wordSeed,
    baseVar + (motion.enabled ? motion.extraBaselineAmp * 0.35 : 0),
  );
  const dy =
    seededBell(wordSeed, 41) * (1.6 * baseVar + motion.extraBaselineAmp * 0.85);
  const angle =
    seededBell(wordSeed, 43) * (0.032 * charVar + motion.extraWordRotation);
  const scaleY = 1 + seededBell(wordSeed, 47) * 0.04 * charVar;
  const pressure =
    1 -
    Math.abs(seededBell(wordSeed, 53)) *
      (0.24 * inkVar + motion.extraPressureAmp * 0.85);

  const pivotX = startX + wordWidth * 0.5;
  const pivotY = baseY + waveY + dy - effectiveFontSize * 0.25;

  ctx.save();
  ctx.translate(pivotX, pivotY);
  if (Math.abs(angle) > 0.0004) {
    ctx.rotate(angle);
  }
  if (Math.abs(scaleY - 1) > 0.001) {
    ctx.scale(1, scaleY);
  }

  const isOverwrittenWord =
    motion.enabled &&
    motion.overwriteProb > 0 &&
    word.length >= 2 &&
    /[A-Za-z]/.test(word[0]) &&
    seededUnit(wordSeed, 79, 5, 11) < motion.overwriteProb * 1.4;

  if (isOverwrittenWord) {
    const firstCh = word[0];
    const ghost = getOverwriteGhostChar(firstCh);
    drawTextWithPenPhysics(
      ctx,
      ghost,
      -wordWidth * 0.5 - 0.7,
      effectiveFontSize * 0.25 + 0.45,
      effectiveFontSize,
      handwriting.inkColor,
      Math.max(0.55, handwriting.penThickness * 0.75),
      inkVar,
      pressure * 0.38,
    );
  }

  drawTextWithPenPhysics(
    ctx,
    word,
    -wordWidth * 0.5,
    effectiveFontSize * 0.25,
    effectiveFontSize,
    handwriting.inkColor,
    handwriting.penThickness,
    inkVar,
    pressure,
  );
  ctx.restore();

  return startX + wordWidth;
}

function drawHandStrikeThrough(
  ctx: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  width: number,
  effectiveFontSize: number,
  inkColor: string,
  penThickness: number,
  seed: number,
  style: HumanizeStrikeStyle,
): void {
  const strikeY = baseY - effectiveFontSize * 0.27;
  const startX = x - 2;
  const endX = x + width + 2.5;
  const tilt1 = seededBell(seed, 101) * 2.4;
  const tilt2 = seededBell(seed, 103) * 2.6;
  const bow = seededBell(seed, 107) * 3.0;

  ctx.save();
  ctx.strokeStyle = rgbaFromHex(inkColor, 0.84);
  ctx.lineWidth = Math.max(1.0, effectiveFontSize * 0.052 * penThickness);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  if (style === 'wave') {
    const segments = Math.max(4, Math.min(10, Math.round(width / 8)));
    ctx.moveTo(startX, strikeY + tilt1);
    for (let s = 1; s <= segments; s++) {
      const t = s / segments;
      const sx = startX + (endX - startX) * t;
      const amp = (s % 2 === 0 ? -1 : 1) * Math.max(1.4, effectiveFontSize * 0.085);
      ctx.lineTo(sx, strikeY + amp + seededBell(seed, 110 + s) * 1.1);
    }
  } else {
    ctx.moveTo(startX, strikeY + tilt1);
    ctx.quadraticCurveTo(
      (startX + endX) * 0.5,
      strikeY + bow,
      endX,
      strikeY + tilt2,
    );
    if (style === 'double') {
      const gap = effectiveFontSize * 0.11;
      ctx.moveTo(endX - 1, strikeY + tilt2 + gap);
      ctx.quadraticCurveTo(
        (startX + endX) * 0.5,
        strikeY - bow * 0.6 - gap * 0.3,
        startX + 1,
        strikeY + tilt1 - gap * 0.7,
      );
    }
  }
  ctx.stroke();
  ctx.restore();
}

function drawAboveCorrection(
  ctx: CanvasRenderingContext2D,
  correctionText: string,
  wordStartX: number,
  baseY: number,
  wordWidth: number,
  effectiveFontSize: number,
  fontMeta: HandwritingFontMeta,
  settings: AppSettings,
  seed: number,
): void {
  const { handwriting } = settings;
  const corrFontSize = Math.max(10, handwriting.fontSize * 0.68);
  const corrEffectiveSize = corrFontSize * fontMeta.sizeScale;
  const corrSpec = buildCanvasFontSpec(fontMeta, corrFontSize);

  ctx.save();
  ctx.font = corrSpec;
  const corrWidth = ctx.measureText(correctionText).width;
  const centerX = wordStartX + wordWidth * 0.5 + seededBell(seed, 131) * 2.2;
  const corrY = Math.max(
    14,
    baseY - effectiveFontSize * 0.66 + seededBell(seed, 137) * 1.4,
  );
  const tilt = seededBell(seed, 139) * 0.055;

  ctx.translate(centerX, corrY);
  ctx.rotate(tilt);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  drawTextWithPenPhysics(
    ctx,
    correctionText,
    -corrWidth * 0.5,
    0,
    corrEffectiveSize,
    handwriting.inkColor,
    Math.max(0.65, handwriting.penThickness * 0.9),
    Math.max(handwriting.inkImperfections, 0.3),
    0.92,
  );
  ctx.restore();
}

function renderHandwrittenLine(
  ctx: CanvasRenderingContext2D,
  line: RenderedLineLayout,
  effectiveFontSize: number,
  fontMeta: HandwritingFontMeta,
  settings: AppSettings,
  motion: HumanizeMotionConfig,
): void {
  const { handwriting } = settings;
  const lineSeed = hashInt(
    handwriting.variationSeed,
    line.lineIndex + 1,
    line.paragraphIndex + 17,
  );

  // Subtle organic left-margin wobble
  const marginWobble =
    line.alignment === 'left' || line.alignment === 'justify'
      ? seededBell(lineSeed, 5) *
        (handwriting.marginJitter * 2 + (motion.enabled ? motion.extraLetterSpacing * 0.9 : 0))
      : 0;

  let cursorX = line.x + marginWobble;
  const baseSpaceAdvance = ctx.measureText(' ').width + handwriting.wordSpacing;

  // Compute justification extra gap per space if needed
  let extraJustifyPerSpace = 0;
  if (
    line.alignment === 'justify' &&
    !line.isLastLineOfParagraph &&
    line.text.includes(' ')
  ) {
    const spaces = (line.text.match(/ /g) ?? []).length;
    if (spaces > 0) {
      const gap = Math.max(0, line.maxWidth - line.width);
      extraJustifyPerSpace = Math.min(effectiveFontSize * 1.35, gap / spaces);
    }
  }

  let annotationMap: Map<number, HumanizeWordAnnotation> | null = null;
  if (line.humanizeAnnotations && line.humanizeAnnotations.length > 0) {
    annotationMap = new Map();
    for (const ann of line.humanizeAnnotations) {
      annotationMap.set(ann.wordTokenIndex, ann);
    }
  }

  // Split preserving exact space tokens so leading spaces stay intact
  const tokens = line.text.split(/( )/);
  let wordTokenIndex = 0;

  for (let t = 0; t < tokens.length; t++) {
    const token = tokens[t];
    if (token === '') continue;

    if (token === ' ') {
      const spaceSeed = hashInt(lineSeed, t, 91);
      const organicSpaceJitter =
        seededBell(spaceSeed, 7) *
        (1.4 * handwriting.characterVariation + motion.extraWordSpacing);
      cursorX +=
        Math.max(2, baseSpaceAdvance + organicSpaceJitter) + extraJustifyPerSpace;
      continue;
    }

    const wordSeed = hashInt(lineSeed, t, 193);
    const wordStartX = cursorX;
    if (fontMeta.renderMode === 'cluster') {
      cursorX = renderClusterWord(
        ctx,
        token,
        cursorX,
        line.y,
        wordSeed,
        effectiveFontSize,
        fontMeta,
        settings,
        motion,
      );
    } else {
      cursorX = renderGlyphWord(
        ctx,
        token,
        cursorX,
        line.y,
        wordSeed,
        effectiveFontSize,
        fontMeta,
        settings,
        motion,
      );
    }

    const annotation = annotationMap?.get(wordTokenIndex);
    if (annotation) {
      const wordW = Math.max(6, cursorX - wordStartX);
      if (annotation.crossedOut) {
        drawHandStrikeThrough(
          ctx,
          wordStartX,
          line.y,
          wordW,
          effectiveFontSize,
          handwriting.inkColor,
          handwriting.penThickness,
          wordSeed,
          annotation.strikeStyle,
        );
      }
      if (annotation.aboveCorrection) {
        drawAboveCorrection(
          ctx,
          annotation.aboveCorrection,
          wordStartX,
          line.y,
          wordW,
          effectiveFontSize,
          fontMeta,
          settings,
          wordSeed,
        );
      }
    }
    wordTokenIndex++;

    // Add letterSpacing between trailing char and following space if applicable
    if (t < tokens.length - 1) {
      cursorX += handwriting.letterSpacing * 0.5;
    }
  }
}

function renderMetadataText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  align: CanvasTextAlign,
  fontSizePx: number,
  fontMeta: HandwritingFontMeta,
  inkColor: string,
  penThickness: number,
  alpha = 0.88,
): void {
  ctx.save();
  ctx.font = buildCanvasFontSpec(fontMeta, fontSizePx);
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.globalAlpha *= alpha;
  drawTextWithPenPhysics(
    ctx,
    text,
    x,
    y,
    fontSizePx * fontMeta.sizeScale,
    inkColor,
    penThickness,
    0.25,
    1,
  );
  ctx.restore();
}

export function renderPageToCanvas(
  canvas: HTMLCanvasElement,
  pageLayout: RenderedPageLayout,
  settings: AppSettings,
  scale = 1,
): void {
  const targetWidth = Math.max(1, Math.round(pageLayout.width * scale));
  const targetHeight = Math.max(1, Math.round(pageLayout.height * scale));

  if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
    canvas.width = targetWidth;
    canvas.height = targetHeight;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, targetWidth, targetHeight);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);

  // 1. Paper background, texture, rulings, margin line, hole punches
  renderPaperBackground(ctx, pageLayout, settings.page);

  // 2. Setup ink composite mode so ink blends realistically with light paper fibers
  const paperLum = getLuminance(settings.page.backgroundColor);
  ctx.globalCompositeOperation = paperLum > 0.45 ? 'multiply' : 'source-over';

  const { handwriting, page, document: doc } = settings;
  const fontMeta = getFontMeta(handwriting.fontId);
  const paperPreset = getPaperPreset(page.paperType);
  const effectiveFontSize = Math.max(8, handwriting.fontSize * fontMeta.sizeScale);

  // 3. Header (optional, top margin)
  if (pageLayout.headerText) {
    const headerY = paperPreset.hasHorizontalLines
      ? Math.max(22, Math.min(28, pageLayout.rulesStartY * 0.36))
      : Math.max(24, page.marginTop * 0.52);
    renderMetadataText(
      ctx,
      pageLayout.headerText,
      page.marginLeft,
      headerY,
      'left',
      Math.max(12, handwriting.fontSize * 0.76),
      fontMeta,
      handwriting.inkColor,
      Math.max(0.8, handwriting.penThickness * 0.9),
      0.78,
    );
  }

  // 4. Title & Date on Page 1
  if (pageLayout.titleText && pageLayout.titleY !== undefined) {
    const titleSize = Math.min(40, handwriting.fontSize * 1.24);
    renderMetadataText(
      ctx,
      pageLayout.titleText,
      page.marginLeft,
      pageLayout.titleY,
      'left',
      titleSize,
      fontMeta,
      handwriting.inkColor,
      Math.min(2.2, handwriting.penThickness * 1.15),
      0.96,
    );

    // Subtle hand-drawn underline on unruled papers
    if (!paperPreset.hasHorizontalLines) {
      ctx.save();
      ctx.font = buildCanvasFontSpec(fontMeta, titleSize);
      const tw = ctx.measureText(pageLayout.titleText).width;
      const underY = pageLayout.titleY + 5;
      ctx.strokeStyle = rgbaFromHex(handwriting.inkColor, 0.55);
      ctx.lineWidth = Math.max(1, handwriting.penThickness * 1.1);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(page.marginLeft, underY);
      ctx.quadraticCurveTo(
        page.marginLeft + tw * 0.5,
        underY + 1.4,
        page.marginLeft + Math.min(tw + 8, pageLayout.width - page.marginLeft - page.marginRight),
        underY - 0.6,
      );
      ctx.stroke();
      ctx.restore();
    }
  }

  if (pageLayout.dateText && pageLayout.dateY !== undefined) {
    renderMetadataText(
      ctx,
      pageLayout.dateText,
      pageLayout.width - page.marginRight,
      pageLayout.dateY,
      'right',
      Math.max(12, handwriting.fontSize * 0.85),
      fontMeta,
      handwriting.inkColor,
      handwriting.penThickness,
      0.86,
    );
  }

  // 5. Render handwritten body lines
  ctx.font = buildCanvasFontSpec(fontMeta, handwriting.fontSize);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const motion = getHumanizeMotion(settings);

  for (let i = 0; i < pageLayout.lines.length; i++) {
    renderHandwrittenLine(
      ctx,
      pageLayout.lines[i],
      effectiveFontSize,
      fontMeta,
      settings,
      motion,
    );
  }

  // 6. Footer & Page Numbers
  const footerY = pageLayout.height - Math.max(16, Math.min(28, page.marginBottom * 0.45));
  const metaSize = Math.max(12, handwriting.fontSize * 0.78);

  if (pageLayout.footerText) {
    renderMetadataText(
      ctx,
      pageLayout.footerText,
      page.marginLeft,
      footerY,
      'left',
      metaSize,
      fontMeta,
      handwriting.inkColor,
      Math.max(0.8, handwriting.penThickness * 0.9),
      0.78,
    );
  }

  if (pageLayout.pageNumberText && doc.pageNumberPosition !== 'off') {
    let pnX = pageLayout.width - page.marginRight;
    let pnY = footerY;
    let pnAlign: CanvasTextAlign = 'right';

    if (doc.pageNumberPosition === 'bottom-center') {
      pnX = pageLayout.width / 2;
      pnAlign = 'center';
    } else if (doc.pageNumberPosition === 'top-right') {
      pnX = pageLayout.width - page.marginRight;
      pnY = paperPreset.hasHorizontalLines
        ? Math.max(22, Math.min(28, pageLayout.rulesStartY * 0.36))
        : Math.max(24, page.marginTop * 0.52);
      pnAlign = 'right';
    }

    renderMetadataText(
      ctx,
      pageLayout.pageNumberText,
      pnX,
      pnY,
      pnAlign,
      metaSize,
      fontMeta,
      handwriting.inkColor,
      Math.max(0.8, handwriting.penThickness * 0.9),
      0.82,
    );
  }

  ctx.restore();
}
