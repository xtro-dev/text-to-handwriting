/**
 * Deterministic 32-bit PRNG (Mulberry32) and hashing utilities so that
 * handwriting micro-variations remain stable across re-renders while still
 * looking organically human.
 */

export function hashInt(a: number, b = 0, c = 0): number {
  let h = (a ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (b + 0x85ebca6b), 0xc2b2ae35) >>> 0;
  h = Math.imul(h ^ (c + 0x27d4eb2f), 0x165667b1) >>> 0;
  h ^= h >>> 15;
  return h >>> 0;
}

export function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Returns a deterministic value in [0, 1) from integer coordinates.
 */
export function seededUnit(a: number, b = 0, c = 0, d = 0): number {
  const h1 = hashInt(a, b, c);
  const h2 = hashInt(h1, d, 0x517cc1b7);
  return h2 / 4294967296;
}

/**
 * Returns a bell-curve (Irwin-Hall order-3) deterministic random value centered at 0,
 * roughly within [-0.5, 0.5] with strong concentration near 0 — much closer to
 * real human motor variance than flat uniform noise.
 */
export function seededBell(seed: number, salt = 0): number {
  const u1 = seededUnit(seed, salt, 11);
  const u2 = seededUnit(seed, salt, 37);
  const u3 = seededUnit(seed, salt, 73);
  return (u1 + u2 + u3) / 3 - 0.5;
}

export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

export function parseHexColor(hex: string): RGBColor {
  const cleaned = hex.replace('#', '').trim();
  if (cleaned.length === 3) {
    const r = parseInt(cleaned[0] + cleaned[0], 16);
    const g = parseInt(cleaned[1] + cleaned[1], 16);
    const b = parseInt(cleaned[2] + cleaned[2], 16);
    if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) {
      return { r, g, b };
    }
  }
  if (cleaned.length >= 6) {
    const r = parseInt(cleaned.slice(0, 2), 16);
    const g = parseInt(cleaned.slice(2, 4), 16);
    const b = parseInt(cleaned.slice(4, 6), 16);
    if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) {
      return { r, g, b };
    }
  }
  return { r: 29, g: 60, b: 142 };
}

export function rgbaFromHex(hex: string, alpha: number): string {
  const { r, g, b } = parseHexColor(hex);
  const clamped = Math.max(0, Math.min(1, alpha));
  return `rgba(${r}, ${g}, ${b}, ${clamped.toFixed(3)})`;
}

/**
 * Relative luminance in [0, 1] for deciding ink blend mode on dark vs light papers.
 */
export function getLuminance(hex: string): number {
  const { r, g, b } = parseHexColor(hex);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}
