export type PageSizeId = 'a4' | 'a5' | 'letter' | 'legal';

export type Orientation = 'portrait' | 'landscape';

export type PaperTypeId =
  | 'blank'
  | 'ruled'
  | 'college-ruled'
  | 'wide-ruled'
  | 'grid'
  | 'dotted'
  | 'cream'
  | 'old-paper'
  | 'legal';

export type TextAlignment = 'left' | 'center' | 'right' | 'justify';

export type PageNumberPosition = 'off' | 'bottom-center' | 'bottom-right' | 'top-right';

export type PageNumberFormat = 'numeric' | 'of-total' | 'page-prefix';

export type FontCategory = 'print' | 'casual' | 'cursive' | 'script';

export type FontRenderMode = 'glyph' | 'cluster';

export type HandwritingFontId =
  | 'caveat'
  | 'kalam'
  | 'patrick-hand'
  | 'indie-flower'
  | 'shadows-into-light'
  | 'architects-daughter'
  | 'gloria-hallelujah'
  | 'reenie-beanie'
  | 'homemade-apple'
  | 'dancing-script'
  | 'satisfy'
  | 'sacramento'
  | 'la-belle-aurore'
  | 'cedarville-cursive'
  | 'bad-script';

export interface HandwritingFontMeta {
  id: HandwritingFontId;
  name: string;
  family: string;
  category: FontCategory;
  renderMode: FontRenderMode;
  defaultWeight: number;
  /** Visual cap-height normalization scale so switching fonts preserves readable size */
  sizeScale: number;
  /** Offset ratio below ruled baseline so glyphs sit naturally on notebook lines */
  baselineOffsetRatio: number;
  description: string;
  sampleText: string;
}

export interface HandwritingSettings {
  fontId: HandwritingFontId;
  fontSize: number;
  inkColor: string;
  penThickness: number;
  letterSpacing: number;
  wordSpacing: number;
  lineSpacing: number;
  snapToPaperLines: boolean;
  characterVariation: number;
  baselineVariation: number;
  inkImperfections: number;
  marginJitter: number;
  variationSeed: number;
}

export interface PageSettings {
  paperType: PaperTypeId;
  pageSize: PageSizeId;
  orientation: Orientation;
  backgroundColor: string;
  lineColor: string;
  ruleSpacing: number;
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
  showMarginLine: boolean;
  showHolePunches: boolean;
  paperTexture: boolean;
}

export interface DocumentSettings {
  alignment: TextAlignment;
  paragraphSpacing: number;
  firstLineIndent: number;
  showTitle: boolean;
  title: string;
  showDate: boolean;
  date: string;
  showHeader: boolean;
  headerText: string;
  showFooter: boolean;
  footerText: string;
  pageNumberPosition: PageNumberPosition;
  pageNumberFormat: PageNumberFormat;
}

export interface AppSettings {
  handwriting: HandwritingSettings;
  page: PageSettings;
  document: DocumentSettings;
}

export interface DocumentSnapshot {
  text: string;
  settings: AppSettings;
}

export interface PageDimensions {
  widthMm: number;
  heightMm: number;
  widthPx: number;
  heightPx: number;
}

export interface RenderedLineLayout {
  text: string;
  x: number;
  y: number;
  width: number;
  maxWidth: number;
  lineIndex: number;
  paragraphIndex: number;
  charOffset: number;
  isFirstLineOfParagraph: boolean;
  isLastLineOfParagraph: boolean;
  alignment: TextAlignment;
}

export interface RenderedPageLayout {
  pageNumber: number;
  totalPages: number;
  width: number;
  height: number;
  rulesStartY: number;
  ruleSpacing: number;
  lines: RenderedLineLayout[];
  titleText?: string;
  titleY?: number;
  dateText?: string;
  dateY?: number;
  headerText?: string;
  footerText?: string;
  pageNumberText?: string;
}

export interface PaginatedDocument {
  pages: RenderedPageLayout[];
  totalLines: number;
  totalParagraphs: number;
}

export interface HandwritingPreset {
  id: string;
  name: string;
  description: string;
  handwriting: Partial<HandwritingSettings>;
  page: Partial<PageSettings>;
  document?: Partial<DocumentSettings>;
}

export type ExportFormat = 'pdf' | 'png' | 'jpeg';

export type ExportQuality = 'standard' | 'high' | 'print';
