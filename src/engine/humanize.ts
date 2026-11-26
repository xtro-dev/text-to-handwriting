import type {
  HumanizeIntensity,
  HumanizeSettings,
  HumanizeStrikeStyle,
  HumanizeWordAnnotation,
} from '../types/handwriting';
import { hashInt, seededBell, seededUnit } from './prng';

export interface HumanizeIntensityProfile {
  multiplier: number;
  strikeCap: number;
  rotationBoost: number;
  pressureBoost: number;
  overwriteProb: number;
  ruleMisalignPx: number;
  wordSlopeBoost: number;
  spacingBoostPx: number;
  baselineBoostPx: number;
}

const INTENSITY_PROFILES: Record<HumanizeIntensity, HumanizeIntensityProfile> = {
  low: {
    multiplier: 0.55,
    strikeCap: 0.045,
    rotationBoost: 0.024,
    pressureBoost: 0.14,
    overwriteProb: 0.011,
    ruleMisalignPx: 1.1,
    wordSlopeBoost: 0.012,
    spacingBoostPx: 1.1,
    baselineBoostPx: 1.4,
  },
  medium: {
    multiplier: 1.0,
    strikeCap: 0.075,
    rotationBoost: 0.042,
    pressureBoost: 0.24,
    overwriteProb: 0.022,
    ruleMisalignPx: 2.0,
    wordSlopeBoost: 0.022,
    spacingBoostPx: 1.8,
    baselineBoostPx: 2.3,
  },
  high: {
    multiplier: 1.55,
    strikeCap: 0.11,
    rotationBoost: 0.066,
    pressureBoost: 0.34,
    overwriteProb: 0.036,
    ruleMisalignPx: 3.1,
    wordSlopeBoost: 0.034,
    spacingBoostPx: 2.7,
    baselineBoostPx: 3.4,
  },
};

export function getHumanizeProfile(
  intensity: HumanizeIntensity,
): HumanizeIntensityProfile {
  return INTENSITY_PROFILES[intensity] ?? INTENSITY_PROFILES.medium;
}

export interface HumanizedWordToken {
  text: string;
  crossedOut: boolean;
  strikeStyle: HumanizeStrikeStyle;
  aboveCorrection?: string;
}

const SHORT_WORD_SLIPS: Record<string, string> = {
  the: 'teh',
  and: 'adn',
  for: 'fro',
  with: 'wiht',
  from: 'form',
  that: 'taht',
  this: 'thsi',
  have: 'haev',
  into: 'inot',
  when: 'wehn',
  they: 'tehy',
  their: 'thier',
  what: 'waht',
  your: 'yuor',
};

const VOWEL_SWAP: Record<string, string> = {
  a: 'e',
  e: 'i',
  i: 'e',
  o: 'u',
  u: 'o',
};

const OVERWRITE_NEIGHBORS: Record<string, string> = {
  a: 'o',
  b: 'd',
  c: 'e',
  d: 'b',
  e: 'a',
  f: 't',
  g: 'q',
  h: 'n',
  i: 'l',
  k: 'h',
  l: 'i',
  m: 'n',
  n: 'm',
  o: 'a',
  p: 'b',
  r: 'n',
  s: 'z',
  t: 'f',
  u: 'v',
  v: 'u',
  w: 'v',
};

export function getOverwriteGhostChar(ch: string): string {
  const lower = ch.toLowerCase();
  const mapped = OVERWRITE_NEIGHBORS[lower];
  if (!mapped) return ch;
  return ch === ch.toUpperCase() ? mapped.toUpperCase() : mapped;
}

function splitWordPunctuation(raw: string): {
  leading: string;
  core: string;
  trailing: string;
} {
  const match = /^([^A-Za-z]*)([A-Za-z]+)([^A-Za-z]*)$/.exec(raw);
  if (!match) {
    return { leading: '', core: raw, trailing: '' };
  }
  return { leading: match[1], core: match[2], trailing: match[3] };
}

function isEligibleForHumanSlip(word: string): boolean {
  if (word.includes('://') || word.includes('@')) return false;
  const { core } = splitWordPunctuation(word);
  return /^[A-Za-z]{3,16}$/.test(core);
}

/**
 * Generates a realistic human pen slip (transposed letter, dropped letter,
 * vowel slip, or aborted prefix) that never fails to differ from the original.
 */
export function generateHumanSlip(coreWord: string, seed: number): string {
  const lower = coreWord.toLowerCase();
  if (SHORT_WORD_SLIPS[lower] && seededUnit(seed, 1) < 0.6) {
    const slip = SHORT_WORD_SLIPS[lower];
    return coreWord[0] === coreWord[0].toUpperCase()
      ? slip[0].toUpperCase() + slip.slice(1)
      : slip;
  }

  const mode = Math.floor(seededUnit(seed, 2) * 4);

  // 1. Aborted partial word false-start
  if (mode === 0 && coreWord.length >= 4) {
    const cutLen = Math.max(2, Math.min(4, coreWord.length - 2));
    return coreWord.slice(0, cutLen);
  }

  // 2. Adjacent character transposition
  if (mode === 1 && coreWord.length >= 4) {
    const idx =
      1 + Math.floor(seededUnit(seed, 3) * Math.max(1, coreWord.length - 2));
    if (idx + 1 < coreWord.length && coreWord[idx] !== coreWord[idx + 1]) {
      return (
        coreWord.slice(0, idx) +
        coreWord[idx + 1] +
        coreWord[idx] +
        coreWord.slice(idx + 2)
      );
    }
  }

  // 3. Dropped middle letter
  if (mode === 2 && coreWord.length >= 5) {
    const idx =
      1 + Math.floor(seededUnit(seed, 4) * Math.max(1, coreWord.length - 2));
    return coreWord.slice(0, idx) + coreWord.slice(idx + 1);
  }

  // 4. Vowel slip
  for (let i = 1; i < coreWord.length - 1; i++) {
    const swapped = VOWEL_SWAP[coreWord[i].toLowerCase()];
    if (swapped) {
      return coreWord.slice(0, i) + swapped + coreWord.slice(i + 1);
    }
  }

  // Fallback aborted prefix
  return coreWord.slice(0, Math.max(2, coreWord.length - 1));
}

function pickStrikeStyle(seed: number): HumanizeStrikeStyle {
  const r = seededUnit(seed, 9);
  if (r < 0.5) return 'single';
  if (r < 0.82) return 'double';
  return 'wave';
}

/**
 * Expands a paragraph's plain words into deterministic humanized tokens,
 * inserting occasional realistic false-start cross-outs and above/beside
 * corrections while keeping 100% of the user's intended text readable.
 */
export function buildHumanizedParagraphWords(
  words: string[],
  paragraphIndex: number,
  variationSeed: number,
  humanize: HumanizeSettings,
): HumanizedWordToken[] {
  if (!humanize.enabled || words.length === 0) {
    return words.map((w) => ({
      text: w,
      crossedOut: false,
      strikeStyle: 'single',
    }));
  }

  const profile = getHumanizeProfile(humanize.intensity);
  const strikeRatio = Math.max(0, Math.min(1, humanize.strikeThroughFrequency / 100));
  const correctionRatio = Math.max(0, Math.min(1, humanize.correctionFrequency / 100));
  const effectiveStrikeProb = strikeRatio * profile.strikeCap;

  const result: HumanizedWordToken[] = [];
  let cooldown = 2; // Avoid crossing out the very first word of a paragraph

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const wordSeed = hashInt(variationSeed, paragraphIndex + 101, i + 17);

    if (
      cooldown <= 0 &&
      effectiveStrikeProb > 0 &&
      isEligibleForHumanSlip(word) &&
      seededUnit(wordSeed, 11) < effectiveStrikeProb
    ) {
      const { leading, core, trailing } = splitWordPunctuation(word);
      const strikeStyle = pickStrikeStyle(wordSeed);
      const slipCore = generateHumanSlip(core, wordSeed);
      const wantsCorrection = seededUnit(wordSeed, 13) < correctionRatio;

      if (wantsCorrection) {
        const useAbove = !leading && !trailing && seededUnit(wordSeed, 15) < 0.52;
        if (useAbove) {
          // Cross out the slip on the line and place clean correction above
          result.push({
            text: slipCore,
            crossedOut: true,
            strikeStyle,
            aboveCorrection: core,
          });
          cooldown = 5;
          continue;
        }

        // Beside correction: crossed-out false start (occasionally 2-word phrase) + real word(s)
        const nextWord = i + 1 < words.length ? words[i + 1] : '';
        const canPhrase =
          nextWord.length > 0 &&
          isEligibleForHumanSlip(nextWord) &&
          nextWord.length <= 6 &&
          seededUnit(wordSeed, 19) < 0.25;
        if (canPhrase) {
          const nextParts = splitWordPunctuation(nextWord);
          const nextSlip = generateHumanSlip(nextParts.core, wordSeed + 31);
          result.push({
            text: slipCore,
            crossedOut: true,
            strikeStyle,
          });
          result.push({
            text: nextSlip,
            crossedOut: true,
            strikeStyle,
          });
          result.push({
            text: word,
            crossedOut: false,
            strikeStyle: 'single',
          });
          result.push({
            text: nextWord,
            crossedOut: false,
            strikeStyle: 'single',
          });
          i++;
          cooldown = 6;
          continue;
        }

        result.push({
          text: slipCore,
          crossedOut: true,
          strikeStyle,
        });
        result.push({
          text: word,
          crossedOut: false,
          strikeStyle: 'single',
        });
        cooldown = 5;
        continue;
      }

      // Strike-only (correction frequency low/0): brief aborted start crossed out before real word
      const aborted = core.slice(0, Math.max(2, Math.min(3, core.length - 1)));
      result.push({
        text: aborted,
        crossedOut: true,
        strikeStyle,
      });
      result.push({
        text: word,
        crossedOut: false,
        strikeStyle: 'single',
      });
      cooldown = 5;
      continue;
    }

    result.push({
      text: word,
      crossedOut: false,
      strikeStyle: 'single',
    });
    if (cooldown > 0) cooldown--;
  }

  return result;
}

/**
 * Computes subtle deterministic notebook line misalignment when Humanize is active.
 */
export function getHumanizedLineDriftY(
  lineIndex: number,
  paragraphIndex: number,
  variationSeed: number,
  humanize: HumanizeSettings,
): number {
  if (!humanize.enabled) return 0;
  const profile = getHumanizeProfile(humanize.intensity);
  const baseFactor = humanize.baselineVariation / 100;
  const seed = hashInt(variationSeed, lineIndex + 307, paragraphIndex + 53);
  return (
    seededBell(seed, 5) *
    2 *
    profile.ruleMisalignPx *
    (0.4 + 0.8 * baseFactor)
  );
}

/**
 * Packs word annotations onto a wrapped line given its token offset.
 */
export function collectLineAnnotations(
  lineTokens: HumanizedWordToken[],
): HumanizeWordAnnotation[] | undefined {
  const annotations: HumanizeWordAnnotation[] = [];
  for (let i = 0; i < lineTokens.length; i++) {
    const tok = lineTokens[i];
    if (tok.crossedOut || tok.aboveCorrection) {
      annotations.push({
        wordTokenIndex: i,
        crossedOut: tok.crossedOut,
        strikeStyle: tok.strikeStyle,
        aboveCorrection: tok.aboveCorrection,
      });
    }
  }
  return annotations.length > 0 ? annotations : undefined;
}
