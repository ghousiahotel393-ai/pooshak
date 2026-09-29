/**
 * Barcode label layout — ONE shared source of truth for both the on-screen preview and the
 * printed output. All physical dimensions are computed in millimetres from the paper type,
 * columns, rows, margins and gaps, then converted to CSS px for the preview (which is only
 * scaled by a CSS transform). The print output uses the very same mm-sized elements, so the
 * preview and the print can never diverge.
 */

const MM_TO_PX = 96 / 25.4; // CSS reference pixels per millimetre (~3.7795)

export function mmToPx(mm: number): number {
  return mm * MM_TO_PX;
}

export interface PaperGeometry {
  widthMm: number;
  heightMm: number;
  marginMm: number;
  isThermal: boolean;
}

/** Physical page/label dimensions for every paper type in the PAPER TYPE dropdown. */
export function getPaperGeometry(paperSize: string): PaperGeometry {
  if (paperSize === 'A4') {
    return { widthMm: 210, heightMm: 297, marginMm: 5, isThermal: false };
  }
  const m = /Thermal-(\d+)x(\d+)/.exec(paperSize);
  if (m) {
    return { widthMm: Number(m[1]), heightMm: Number(m[2]), marginMm: 1, isThermal: true };
  }
  // Unknown → treat as A4 so nothing crashes.
  return { widthMm: 210, heightMm: 297, marginMm: 5, isThermal: false };
}

export interface CellSize {
  cellWmm: number;
  cellHmm: number;
  cellWpx: number;
  cellHpx: number;
}

/**
 * Size of a single label cell in mm + px. On A4 the printable area (page minus margins minus
 * inter-cell gaps) is divided into columns × rows. A thermal label IS the whole printable area.
 */
export function getCellSize(
  geo: PaperGeometry,
  columns: number,
  rows: number,
  gapXmm: number,
  gapYmm: number
): CellSize {
  const cols = Math.max(1, columns);
  const rws = Math.max(1, rows);
  const innerW = Math.max(1, geo.widthMm - 2 * geo.marginMm);
  const innerH = Math.max(1, geo.heightMm - 2 * geo.marginMm);
  const cellWmm = geo.isThermal ? innerW : (innerW - (cols - 1) * gapXmm) / cols;
  const cellHmm = geo.isThermal ? innerH : (innerH - (rws - 1) * gapYmm) / rws;
  return { cellWmm, cellHmm, cellWpx: mmToPx(cellWmm), cellHpx: mmToPx(cellHmm) };
}

export interface LabelFontSizes {
  name: number;
  price: number;
  sku: number;
  cat: number;
  nameLH: number;
}

/** Build the name/price/sku/category font sizes (px) from the base font size and content scale. */
export function buildLabelFontSizes(baseFontPx: number, contentScale: number): LabelFontSizes {
  const s = contentScale > 0 ? contentScale : 1;
  const name = Math.max(6, Math.round((baseFontPx + 1) * s));
  return {
    name,
    price: Math.max(6, Math.round((baseFontPx + 1) * s)),
    sku: Math.max(5, Math.round((baseFontPx - 1) * s)),
    cat: Math.max(5, Math.round((baseFontPx - 2) * s)),
    nameLH: Math.max(7, Math.round(name * 1.15)),
  };
}

/**
 * Auto-fit the FULL product title into `maxLines` lines within the cell width by shrinking the
 * font (never truncating with an ellipsis). Deterministic (no DOM measurement) so the preview
 * and the print compute an identical size. Returns the largest font (down to `minPx`) at which
 * the whole title fits in the allowed number of lines.
 */
export function fitTitleFontPx(
  name: string,
  cellWpx: number,
  cellPadPx: number,
  baseFontPx: number,
  maxLines: number,
  minPx = 5
): number {
  const text = (name || '').trim();
  if (!text) return baseFontPx;
  // Bold uppercase glyphs advance ~0.62em on average; keep a little side padding in reserve.
  const AVG_GLYPH = 0.62;
  const usableW = Math.max(1, cellWpx - 2 * cellPadPx - 2);
  const longestWord = text.split(/\s+/).reduce((n, w) => Math.max(n, w.length), 0);

  for (let fs = baseFontPx; fs >= minPx; fs -= 0.5) {
    const charsPerLine = Math.floor(usableW / (fs * AVG_GLYPH));
    if (charsPerLine < 1) continue;
    // A single word must also fit on one line (word-break can hyphenate, but keep it honest).
    const lines = Math.ceil(text.length / charsPerLine);
    if (lines <= maxLines && longestWord <= charsPerLine * 1.4) return fs;
  }
  return minPx;
}
