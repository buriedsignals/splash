// Pure decision layer for the render-time contrast guard (snap-contrast.mjs): given
// a text fill and the background colours sampled behind it, report the WORST WCAG
// contrast and whether it violates the 4.5:1 floor. Worst-case is deliberate — a
// label straddling two stacked segments must clear contrast on BOTH.
import { contrastRatio } from "./conformance";

export const MIN_CONTRAST = 4.5;

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
