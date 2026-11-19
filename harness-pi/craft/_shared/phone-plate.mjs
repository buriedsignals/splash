// A web plate whose words sit inside its viewBox letterboxes on a phone and its words shrink with it: the radar's
// axis names printed at ~5 px, the small multiples' panel names at ~7 px (375 × 812, 2026-11-19). Such a kit draws
// a second plate laid out for the phone, marked data-fit="phone", and this sheet shows one plate or the other.

/** chart-web's narrow breakpoint (NARROW_FLOOR_BELOW_PX in render-web.mjs), under which the phone plates show. */
export const PHONE_BELOW_PX = 640;

/** The plot's width on a 375 px phone, in CSS px: a plate this many viewBox units wide draws its words at their size. */
export const PHONE_PLOT_PX = 343;

/** The two container rules that show the wide plates above the breakpoint and the phone plates under it. */
export function phoneFitCss(scope) {
  return [
    `@container not (max-width: ${PHONE_BELOW_PX}px) { ${scope} .chart-plot svg[data-fit="phone"] { display: none !important; } }`,
    `@container (max-width: ${PHONE_BELOW_PX}px) { ${scope} .chart-plot svg[data-fit="wide"] { display: none !important; } }`,
  ];
}

/**
 * How much larger a phone plate `plateWidth` viewBox units wide must draw words it draws at `drawnAt` units on its
 * wide plate, so they print at the axis register's own `axisPx` on a 375 px page. Never smaller than the wide plate.
 */
export function phonePlateScale({ plateWidth, drawnAt, axisPx }) {
  return Math.max(1, (plateWidth / PHONE_PLOT_PX) * (axisPx / drawnAt));
}
