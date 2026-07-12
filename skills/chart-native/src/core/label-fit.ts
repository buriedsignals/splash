// core/label-fit — the PURE decision layer for the render-time label-fit guard
// (scripts/snap-label-fit.mjs). The core/text.ts fitters (truncate,
// endLabelGutterPx, verticalCatLines, rotated helpers) prevent overflow IF a
// renderer calls them — nothing asserted a renderer actually did, and a missed
// call ships a silently clipped label (the stacked-area right-gutter
// "Renouvelables 280" → "Renouvelables 28" class). This module answers one
// question, testable without Playwright (same split as contrast-scan.ts vs
// snap-contrast.mjs): does a rendered text's box sit fully inside its clip
// bounds, within a small tolerance?
//
// Boxes are viewport-space DOMRect-shaped {left, top, right, bottom}. Rotated
// text needs no special handling: getBoundingClientRect already returns the
// axis-aligned box OF the rotated element, which is exactly what must fit.

/**
 * Font-metric slack (px): getBoundingClientRect for SVG text returns the EM
 * box, whose ascent overhangs the tallest painted glyph — near the plot's top
 * edge that overhang pokes past the svg viewport with zero ink clipped.
 * Calibrated on ALL 26 reachable types' sample configs through the real
 * produce path: static (article-web AND the scale-1.7 social-vertical
 * portrait) measured 0.00px overflow everywhere; interactive measured exactly
 * 3.00px on two labels at the responsive svg's top edge (scatter y-axis title
 * at y=−6, waterfall vertical value labels — both re-rendered with
 * overflow:visible and pixel-diffed IDENTICAL, i.e. pure em-box slack at the
 * 13px axis font). 4 = that 3px measured healthy maximum + 1px sub-pixel
 * slack; the real clip class sits an order of magnitude above it (the
 * pre-fix stacked-area gutter bug measured 15.4px / 84.0px here).
 */
export const LABEL_FIT_TOLERANCE_PX = 4;

export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface SideOverflow {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** Intersection of two boxes (the ancestor clip chain folds through this). May
 *  be empty (right < left / bottom < top) — overflow is then judged against
 *  the empty region, which correctly flags any visible text inside it. */
export function intersectBoxes(a: Box, b: Box): Box {
  return {
    left: Math.max(a.left, b.left),
    top: Math.max(a.top, b.top),
    right: Math.min(a.right, b.right),
    bottom: Math.min(a.bottom, b.bottom),
  };
}

/** Per-side px by which `box` exceeds `bounds` (0 = inside on that side). */
export function overflowPx(box: Box, bounds: Box): SideOverflow {
  return {
    left: Math.max(0, bounds.left - box.left),
    top: Math.max(0, bounds.top - box.top),
    right: Math.max(0, box.right - bounds.right),
    bottom: Math.max(0, box.bottom - bounds.bottom),
  };
}

/** The single worst per-side overflow (0 = fully contained). */
export function worstOverflowPx(box: Box, bounds: Box): number {
  const o = overflowPx(box, bounds);
  return Math.max(o.left, o.top, o.right, o.bottom);
}

/** true when the box leaves the bounds by MORE than the tolerance — i.e. the
 *  text would ship visibly clipped. Exactly-at-tolerance passes. */
export function isFitViolation(
  box: Box,
  bounds: Box,
  tolerancePx: number = LABEL_FIT_TOLERANCE_PX,
): boolean {
  return worstOverflowPx(box, bounds) > tolerancePx;
}
