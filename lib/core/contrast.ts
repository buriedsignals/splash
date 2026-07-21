// WCAG contrast primitives (pure). The single source for luminance/ratio/min-contrast
// across all engines — previously duplicated in chart-native/src/core/conformance.ts
// and dw-chart/src/contrast.ts.
export const MIN_CONTRAST = 4.5;
export const LARGE_TEXT_CONTRAST = 3;
export const LARGE_TEXT_NORMAL_PX = 24; // 18pt
export const LARGE_TEXT_BOLD_PX = 18.66; // 14pt

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

/** WCAG relative luminance of a #rrggbb colour. */
export function relativeLuminance(hex: string): number {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) throw new Error(`not a #rrggbb colour: ${hex}`);
  const n = parseInt(m[1], 16);
  return (
    0.2126 * channel((n >> 16) & 255) +
    0.7152 * channel((n >> 8) & 255) +
    0.0722 * channel(n & 255)
  );
}

/** WCAG contrast ratio between two #rrggbb colours (1..21). */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

/** WCAG SC 1.4.3 minimum contrast for text of a given rendered size (CSS px) and weight. */
export function wcagMinContrast(fontPx: number, bold: boolean): number {
  const isLarge =
    fontPx >= LARGE_TEXT_NORMAL_PX || (bold && fontPx >= LARGE_TEXT_BOLD_PX);
  return isLarge ? LARGE_TEXT_CONTRAST : MIN_CONTRAST;
}

export function worstContrast(fill: string, bgs: string[]): number {
  if (bgs.length === 0) return 21;
  return bgs.reduce((w, bg) => Math.min(w, contrastRatio(fill, bg)), 21);
}

export function isContrastViolation(
  fill: string,
  bgs: string[],
  min: number = MIN_CONTRAST,
): boolean {
  return worstContrast(fill, bgs) < min;
}
