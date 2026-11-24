import type {
  Orientation,
  PageDimensions,
  PageSizeId,
  PaperTypeId,
} from '../types/handwriting';

export interface PageSizeDefinition {
  id: PageSizeId;
  label: string;
  detail: string;
  widthMm: number;
  heightMm: number;
}

export const PAGE_SIZES: Record<PageSizeId, PageSizeDefinition> = {
  a4: {
    id: 'a4',
    label: 'A4',
    detail: '210 × 297 mm',
    widthMm: 210,
    heightMm: 297,
  },
  a5: {
    id: 'a5',
    label: 'A5',
    detail: '148 × 210 mm',
    widthMm: 148,
    heightMm: 210,
  },
  letter: {
    id: 'letter',
    label: 'Letter',
    detail: '8.5 × 11 in',
    widthMm: 215.9,
    heightMm: 279.4,
  },
  legal: {
    id: 'legal',
    label: 'Legal',
    detail: '8.5 × 14 in',
    widthMm: 215.9,
    heightMm: 355.6,
  },
};

const PX_PER_MM = 96 / 25.4;

export function getPageDimensions(
  sizeId: PageSizeId,
  orientation: Orientation,
): PageDimensions {
  const def = PAGE_SIZES[sizeId] ?? PAGE_SIZES.a4;
  const widthMm = orientation === 'portrait' ? def.widthMm : def.heightMm;
  const heightMm = orientation === 'portrait' ? def.heightMm : def.widthMm;
  return {
    widthMm,
    heightMm,
    widthPx: Math.round(widthMm * PX_PER_MM),
    heightPx: Math.round(heightMm * PX_PER_MM),
  };
}

export interface PaperStylePreset {
  id: PaperTypeId;
  name: string;
  shortName: string;
  backgroundColor: string;
  lineColor: string;
  marginLineColor: string;
  ruleSpacing: number;
  hasHorizontalLines: boolean;
  hasMarginLine: boolean;
  defaultHolePunches: boolean;
  defaultTexture: boolean;
  topBandPx: number;
  defaultMarginLeft: number;
}

export const PAPER_STYLES: PaperStylePreset[] = [
  {
    id: 'ruled',
    name: 'Ruled Notebook',
    shortName: 'Ruled',
    backgroundColor: '#fcfcfd',
    lineColor: '#bfd4ef',
    marginLineColor: '#ec8b8b',
    ruleSpacing: 32,
    hasHorizontalLines: true,
    hasMarginLine: true,
    defaultHolePunches: true,
    defaultTexture: true,
    topBandPx: 88,
    defaultMarginLeft: 86,
  },
  {
    id: 'college-ruled',
    name: 'College Ruled',
    shortName: 'College',
    backgroundColor: '#ffffff',
    lineColor: '#bcd2ee',
    marginLineColor: '#e87e7e',
    ruleSpacing: 27,
    hasHorizontalLines: true,
    hasMarginLine: true,
    defaultHolePunches: true,
    defaultTexture: false,
    topBandPx: 84,
    defaultMarginLeft: 86,
  },
  {
    id: 'wide-ruled',
    name: 'Wide Ruled',
    shortName: 'Wide',
    backgroundColor: '#ffffff',
    lineColor: '#bdd4f0',
    marginLineColor: '#ea8080',
    ruleSpacing: 36,
    hasHorizontalLines: true,
    hasMarginLine: true,
    defaultHolePunches: true,
    defaultTexture: false,
    topBandPx: 92,
    defaultMarginLeft: 86,
  },
  {
    id: 'legal',
    name: 'Legal Pad',
    shortName: 'Legal',
    backgroundColor: '#fef3a6',
    lineColor: '#98c1ea',
    marginLineColor: '#dc5b5b',
    ruleSpacing: 32,
    hasHorizontalLines: true,
    hasMarginLine: true,
    defaultHolePunches: false,
    defaultTexture: true,
    topBandPx: 92,
    defaultMarginLeft: 88,
  },
  {
    id: 'blank',
    name: 'Blank White',
    shortName: 'Blank',
    backgroundColor: '#ffffff',
    lineColor: '#d4d4d8',
    marginLineColor: '#e5e7eb',
    ruleSpacing: 32,
    hasHorizontalLines: false,
    hasMarginLine: false,
    defaultHolePunches: false,
    defaultTexture: false,
    topBandPx: 56,
    defaultMarginLeft: 64,
  },
  {
    id: 'grid',
    name: 'Grid Paper',
    shortName: 'Grid',
    backgroundColor: '#ffffff',
    lineColor: '#cbd5e1',
    marginLineColor: '#94a3b8',
    ruleSpacing: 24,
    hasHorizontalLines: false,
    hasMarginLine: false,
    defaultHolePunches: false,
    defaultTexture: false,
    topBandPx: 56,
    defaultMarginLeft: 64,
  },
  {
    id: 'dotted',
    name: 'Dotted Journal',
    shortName: 'Dotted',
    backgroundColor: '#fcfcfb',
    lineColor: '#94a3b8',
    marginLineColor: '#94a3b8',
    ruleSpacing: 24,
    hasHorizontalLines: false,
    hasMarginLine: false,
    defaultHolePunches: false,
    defaultTexture: true,
    topBandPx: 56,
    defaultMarginLeft: 64,
  },
  {
    id: 'cream',
    name: 'Plain Cream',
    shortName: 'Cream',
    backgroundColor: '#f7f1e3',
    lineColor: '#d6cbb5',
    marginLineColor: '#d6cbb5',
    ruleSpacing: 32,
    hasHorizontalLines: false,
    hasMarginLine: false,
    defaultHolePunches: false,
    defaultTexture: true,
    topBandPx: 56,
    defaultMarginLeft: 64,
  },
  {
    id: 'old-paper',
    name: 'Old Parchment',
    shortName: 'Old Paper',
    backgroundColor: '#ead8b1',
    lineColor: '#bfa982',
    marginLineColor: '#a68b63',
    ruleSpacing: 32,
    hasHorizontalLines: false,
    hasMarginLine: false,
    defaultHolePunches: false,
    defaultTexture: true,
    topBandPx: 60,
    defaultMarginLeft: 68,
  },
];

export const PAPER_STYLE_MAP: Record<PaperTypeId, PaperStylePreset> =
  PAPER_STYLES.reduce(
    (acc, paper) => {
      acc[paper.id] = paper;
      return acc;
    },
    {} as Record<PaperTypeId, PaperStylePreset>,
  );

export function getPaperPreset(paperType: PaperTypeId): PaperStylePreset {
  return PAPER_STYLE_MAP[paperType] ?? PAPER_STYLES[0];
}

export interface ColorSwatch {
  name: string;
  hex: string;
}

export const INK_SWATCHES: ColorSwatch[] = [
  { name: 'Ballpoint Blue', hex: '#1d3c8e' },
  { name: 'Royal Blue', hex: '#1e40af' },
  { name: 'Midnight Ink', hex: '#162447' },
  { name: 'Jet Black', hex: '#141416' },
  { name: 'Graphite', hex: '#383c44' },
  { name: 'Crimson Red', hex: '#991b1b' },
  { name: 'Forest Green', hex: '#14532d' },
  { name: 'Sepia Brown', hex: '#5c3a21' },
  { name: 'Plum Violet', hex: '#581c87' },
];

export const PAPER_COLOR_SWATCHES: ColorSwatch[] = [
  { name: 'Pure White', hex: '#ffffff' },
  { name: 'Notebook Off-White', hex: '#fcfcfd' },
  { name: 'Warm Cream', hex: '#f7f1e3' },
  { name: 'Soft Ivory', hex: '#f9f6ee' },
  { name: 'Legal Yellow', hex: '#fef3a6' },
  { name: 'Aged Parchment', hex: '#ead8b1' },
  { name: 'Cool Mist', hex: '#f1f5f9' },
  { name: 'Mint Pastel', hex: '#eef7f2' },
];

export const LINE_COLOR_SWATCHES: ColorSwatch[] = [
  { name: 'Notebook Blue', hex: '#bfd4ef' },
  { name: 'Slate Grid', hex: '#cbd5e1' },
  { name: 'Crisp Dot Gray', hex: '#94a3b8' },
  { name: 'Legal Cyan', hex: '#98c1ea' },
  { name: 'Warm Taupe', hex: '#d6cbb5' },
  { name: 'Faint Charcoal', hex: '#a1a1aa' },
];
