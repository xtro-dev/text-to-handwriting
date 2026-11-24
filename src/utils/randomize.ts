import { HANDWRITING_FONTS } from '../constants/fonts';
import { INK_SWATCHES } from '../constants/papers';
import type { AppSettings } from '../types/handwriting';

function pickDifferent<T>(items: T[], current: T): T {
  if (items.length <= 1) return items[0];
  const filtered = items.filter((i) => i !== current);
  return filtered[Math.floor(Math.random() * filtered.length)] ?? items[0];
}

export function generateRandomSeed(): number {
  return Math.floor(10000 + Math.random() * 899999);
}

/**
 * Generates a realistic randomized handwriting profile (preserving document text and page layout
 * unless subtle realistic ink/font shifts are requested).
 */
export function randomizeHandwritingSettings(current: AppSettings): AppSettings {
  const fontIds = HANDWRITING_FONTS.map((f) => f.id);
  const nextFontId = pickDifferent(fontIds, current.handwriting.fontId);

  // Pick realistic dark/blue/sepia/graphite inks most often
  const naturalInks = INK_SWATCHES.slice(0, 8).map((s) => s.hex);
  const nextInk = naturalInks[Math.floor(Math.random() * naturalInks.length)];

  const randRange = (min: number, max: number, step = 0.05) => {
    const val = min + Math.random() * (max - min);
    return Math.round(val / step) * step;
  };

  return {
    ...current,
    handwriting: {
      ...current.handwriting,
      fontId: nextFontId,
      fontSize: Math.round(randRange(18, 23, 1)),
      inkColor: nextInk,
      penThickness: Number(randRange(0.85, 1.3, 0.05).toFixed(2)),
      letterSpacing: Number(randRange(-0.2, 0.8, 0.1).toFixed(1)),
      wordSpacing: Number(randRange(0.5, 3.0, 0.5).toFixed(1)),
      characterVariation: Number(randRange(0.3, 0.72, 0.02).toFixed(2)),
      baselineVariation: Number(randRange(0.28, 0.68, 0.02).toFixed(2)),
      inkImperfections: Number(randRange(0.3, 0.65, 0.02).toFixed(2)),
      marginJitter: Number(randRange(1.0, 2.8, 0.2).toFixed(1)),
      variationSeed: generateRandomSeed(),
    },
  };
}
