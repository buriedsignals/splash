// Pure decision layer for the render-time contrast guard (snap-contrast.mjs): given
// a text fill and the background colours sampled behind it, report the WORST WCAG
// contrast and whether it violates the 4.5:1 floor. Worst-case is deliberate — a
// label straddling two stacked segments must clear contrast on BOTH.
import { contrastRatio } from "./conformance";

export const MIN_CONTRAST = 4.5;
// WCAG SC 1.4.3 "large-scale text" thresholds, in CSS px: 18pt = 24px (normal
// weight) or 14pt = 18.66px (BOLD). Large text needs only 3:1 (LARGE_TEXT_CONTRAST),
// everything else the 4.5:1 floor. 96px/in ⇒ 1pt = 96/72 = 1.333px.
export const LARGE_TEXT_CONTRAST = 3;
export const LARGE_TEXT_NORMAL_PX = 24; // 18pt
export const LARGE_TEXT_BOLD_PX = 18.66; // 14pt

/**
 * The WCAG SC 1.4.3 minimum contrast for a piece of text, given its rendered size
 * (CSS px) and whether it is bold (font-weight ≥ 700). Large-scale text — ≥24px, or
 * ≥18.66px when bold — is conformant at 3:1; all other text needs 4.5:1. This is what
 * lets the heatmap's in-cell value labels (colour IS the data, so mid-tone cells have
 * no 4.5:1 text colour) stay conformant: they render as large BOLD numbers whose
 * max-contrast fill always clears 3:1 across the whole sequential ramp.
 */
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
