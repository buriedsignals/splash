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

/**
 * WCAG SC 1.4.3 minimum contrast for text of a given rendered size (CSS px) and
 * weight. `deviceScale` multiplies the size before the large-text provision is
 * applied, and it defaults to 1.
 *
 * NO CALLER PASSES IT, deliberately. It was briefly threaded from chart-native's
 * static snap as STATIC_DEVICE_SCALE = 2, on the premise that a ×2-exported PNG's
 * delivered pixel is what the reader perceives — and that premise is wrong:
 * deviceScaleFactor is a RESOLUTION factor (sharper, not bigger). Passing 2 put
 * chart-native's entire type scale (title 22 / label 14 / axis 13 / source 12) over
 * the threshold and so relaxed every static label from 4.5:1 to 3:1; on
 * social-vertical a 13px label on a ~400 CSS px phone viewport is perceived at ~9px,
 * i.e. the relaxation is wrong by ~3× in the permissive direction. Reverted after the
 * final review of feat/family-c-capability-and-validation measured it. The parameter
 * and its tests are kept because the arithmetic is right for a case where the export
 * scale genuinely IS an apparent-size factor; nothing here has been shown to be one.
 */
export function wcagMinContrast(
  fontPx: number,
  bold: boolean,
  deviceScale = 1,
): number {
  const delivered = fontPx * deviceScale;
  const isLarge =
    delivered >= LARGE_TEXT_NORMAL_PX ||
    (bold && delivered >= LARGE_TEXT_BOLD_PX);
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
