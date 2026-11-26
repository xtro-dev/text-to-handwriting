import { getPaperPreset } from '../constants/papers';
import type { PageSettings, RenderedPageLayout } from '../types/handwriting';
import { mulberry32, parseHexColor, rgbaFromHex } from './prng';

const textureCache = new Map<string, HTMLCanvasElement>();

function getPaperNoiseTile(variant: 'light' | 'cream' | 'old'): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const cached = textureCache.get(variant);
  if (cached) return cached;

  const size = 256;
  const tile = document.createElement('canvas');
  tile.width = size;
  tile.height = size;
  const ctx = tile.getContext('2d');
  if (!ctx) return null;

  const rand = mulberry32(variant === 'old' ? 918273 : variant === 'cream' ? 445566 : 123456);
  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;

  const intensity = variant === 'old' ? 22 : variant === 'cream' ? 12 : 7;

  for (let i = 0; i < data.length; i += 4) {
    const n = (rand() + rand()) * 0.5 - 0.5;
    const isDarkSpeck = n < 0;
    if (variant === 'old') {
      data[i] = isDarkSpeck ? 110 : 252;
      data[i + 1] = isDarkSpeck ? 82 : 242;
      data[i + 2] = isDarkSpeck ? 48 : 215;
    } else if (variant === 'cream') {
      data[i] = isDarkSpeck ? 145 : 255;
      data[i + 1] = isDarkSpeck ? 130 : 252;
      data[i + 2] = isDarkSpeck ? 105 : 244;
    } else {
      data[i] = isDarkSpeck ? 150 : 255;
      data[i + 1] = isDarkSpeck ? 155 : 255;
      data[i + 2] = isDarkSpeck ? 165 : 255;
    }
    data[i + 3] = Math.round(Math.abs(n) * 2 * intensity);
  }
  ctx.putImageData(imgData, 0, 0);

  // Subtle organic paper fibers for aged / cream paper
  const fiberCount = variant === 'old' ? 110 : variant === 'cream' ? 45 : 22;
  ctx.lineWidth = 0.6;
  for (let f = 0; f < fiberCount; f++) {
    const fx = rand() * size;
    const fy = rand() * size;
    const len = 4 + rand() * 12;
    const angle = rand() * Math.PI * 2;
    ctx.strokeStyle =
      variant === 'old'
        ? `rgba(120, 88, 52, ${(0.03 + rand() * 0.05).toFixed(3)})`
        : `rgba(120, 120, 125, ${(0.015 + rand() * 0.025).toFixed(3)})`;
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(fx + Math.cos(angle) * len, fy + Math.sin(angle) * len);
    ctx.stroke();
  }

  // Subtle aging foxing spots for old paper
  if (variant === 'old') {
    for (let s = 0; s < 16; s++) {
      const sx = rand() * size;
      const sy = rand() * size;
      const sr = 2 + rand() * 8;
      const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr);
      grad.addColorStop(0, 'rgba(146, 102, 54, 0.065)');
      grad.addColorStop(1, 'rgba(146, 102, 54, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  textureCache.set(variant, tile);
  return tile;
}

export function renderPaperBackground(
  ctx: CanvasRenderingContext2D,
  pageLayout: RenderedPageLayout,
  page: PageSettings,
): void {
  const { width, height, rulesStartY, ruleSpacing } = pageLayout;
  const preset = getPaperPreset(page.paperType);

  // 1. Base paper fill (slight 1px bleed eliminates subpixel alpha fringe at high-DPI edges)
  ctx.save();
  ctx.fillStyle = page.backgroundColor;
  ctx.fillRect(-1, -1, width + 2, height + 2);

  // 2. Old parchment aging gradients & vignette
  if (page.paperType === 'old-paper') {
    const cx = width * 0.5;
    const cy = height * 0.5;
    const maxR = Math.hypot(cx, cy);
    const vignette = ctx.createRadialGradient(cx, cy, maxR * 0.45, cx, cy, maxR);
    vignette.addColorStop(0, 'rgba(255, 248, 232, 0.14)');
    vignette.addColorStop(0.72, 'rgba(196, 162, 110, 0.08)');
    vignette.addColorStop(1, 'rgba(138, 96, 48, 0.24)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);

    // Subtle warm organic patches
    const p1 = ctx.createRadialGradient(width * 0.18, height * 0.22, 10, width * 0.18, height * 0.22, width * 0.42);
    p1.addColorStop(0, 'rgba(164, 118, 62, 0.07)');
    p1.addColorStop(1, 'rgba(164, 118, 62, 0)');
    ctx.fillStyle = p1;
    ctx.fillRect(0, 0, width, height);

    const p2 = ctx.createRadialGradient(width * 0.82, height * 0.78, 10, width * 0.82, height * 0.78, width * 0.38);
    p2.addColorStop(0, 'rgba(150, 105, 55, 0.08)');
    p2.addColorStop(1, 'rgba(150, 105, 55, 0)');
    ctx.fillStyle = p2;
    ctx.fillRect(0, 0, width, height);
  }

  // 3. Subtle paper grain texture
  if (page.paperTexture) {
    const variant =
      page.paperType === 'old-paper'
        ? 'old'
        : page.paperType === 'cream' || page.paperType === 'legal'
          ? 'cream'
          : 'light';
    const tile = getPaperNoiseTile(variant);
    if (tile) {
      const pattern = ctx.createPattern(tile, 'repeat');
      if (pattern) {
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, width, height);
      }
    }
  }

  // 4. Ruling patterns
  const lineRgb = parseHexColor(page.lineColor);
  const lineStroke = `rgba(${lineRgb.r}, ${lineRgb.g}, ${lineRgb.b}, 0.85)`;
  const faintStroke = `rgba(${lineRgb.r}, ${lineRgb.g}, ${lineRgb.b}, 0.55)`;

  if (
    page.paperType === 'ruled' ||
    page.paperType === 'college-ruled' ||
    page.paperType === 'wide-ruled' ||
    page.paperType === 'legal'
  ) {
    // Horizontal lines
    ctx.lineWidth = 1;
    ctx.strokeStyle = lineStroke;

    // Top band line (double line on legal pad)
    const topY = Math.round(rulesStartY) + 0.5;
    ctx.beginPath();
    ctx.moveTo(0, topY);
    ctx.lineTo(width, topY);
    ctx.stroke();

    if (page.paperType === 'legal') {
      ctx.beginPath();
      ctx.moveTo(0, topY - 3);
      ctx.lineTo(width, topY - 3);
      ctx.stroke();
    }

    const bottomEnd = height - 24;
    for (let y = rulesStartY + ruleSpacing; y <= bottomEnd; y += ruleSpacing) {
      const snappedY = Math.round(y) + 0.5;
      ctx.beginPath();
      ctx.moveTo(0, snappedY);
      ctx.lineTo(width, snappedY);
      ctx.stroke();
    }

    // Vertical left margin line
    if (page.showMarginLine) {
      const marginX = Math.round(Math.max(36, Math.min(76, page.marginLeft - 14))) + 0.5;
      ctx.strokeStyle = rgbaFromHex(preset.marginLineColor, 0.72);
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(marginX, 0);
      ctx.lineTo(marginX, height);
      ctx.stroke();

      if (page.paperType === 'legal') {
        ctx.beginPath();
        ctx.moveTo(marginX + 4, 0);
        ctx.lineTo(marginX + 4, height);
        ctx.stroke();
      }
    }
  } else if (page.paperType === 'grid') {
    const step = Math.max(12, ruleSpacing);
    const startX = 20;
    const startY = 20;

    ctx.lineWidth = 0.85;
    let col = 0;
    for (let x = startX; x <= width - 16; x += step) {
      const sx = Math.round(x) + 0.5;
      ctx.strokeStyle = col % 5 === 0 ? lineStroke : faintStroke;
      ctx.beginPath();
      ctx.moveTo(sx, 16);
      ctx.lineTo(sx, height - 16);
      ctx.stroke();
      col++;
    }

    let row = 0;
    for (let y = startY; y <= height - 16; y += step) {
      const sy = Math.round(y) + 0.5;
      ctx.strokeStyle = row % 5 === 0 ? lineStroke : faintStroke;
      ctx.beginPath();
      ctx.moveTo(16, sy);
      ctx.lineTo(width - 16, sy);
      ctx.stroke();
      row++;
    }
  } else if (page.paperType === 'dotted') {
    const step = Math.max(12, ruleSpacing);
    const startX = 28;
    const startY = 28;
    ctx.fillStyle = `rgba(${lineRgb.r}, ${lineRgb.g}, ${lineRgb.b}, 0.88)`;

    for (let y = startY; y <= height - 24; y += step) {
      for (let x = startX; x <= width - 24; x += step) {
        ctx.beginPath();
        ctx.arc(x, y, 1.15, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // 5. Optional 3-hole notebook punches along left margin
  if (page.showHolePunches) {
    const holeX = 28;
    const holePositions = [height * 0.14, height * 0.5, height * 0.86];
    const holeRadius = 9.5;

    for (const hy of holePositions) {
      // Soft inner shadow ring to give physical depth
      const ringGrad = ctx.createRadialGradient(
        holeX + 1,
        hy + 1,
        holeRadius * 0.55,
        holeX,
        hy,
        holeRadius,
      );
      ringGrad.addColorStop(0, 'rgba(100, 108, 122, 0.22)');
      ringGrad.addColorStop(0.85, 'rgba(130, 138, 152, 0.34)');
      ringGrad.addColorStop(1, 'rgba(70, 75, 85, 0.42)');

      ctx.fillStyle = ringGrad;
      ctx.beginPath();
      ctx.arc(holeX, hy, holeRadius, 0, Math.PI * 2);
      ctx.fill();

      // Subtle inner hole cutout tint
      ctx.fillStyle = 'rgba(226, 228, 233, 0.88)';
      ctx.beginPath();
      ctx.arc(holeX + 0.6, hy + 0.6, holeRadius - 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}
