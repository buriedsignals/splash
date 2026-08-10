/**
 * The pure core of the population-pyramid web beat — data to coordinates, and the exact-figure
 * formatting the tooltip/`data-detail` strings speak. No colour, no font, no React: the same split
 * every other beat's own geometry module keeps (`income-life-geometry.ts`,
 * `co2-suisse/crossing-geometry.ts`).
 *
 * Adapted from `proof/static-swiss-age-pyramid/SwissAgePyramid.tsx`'s own `pyramidGeometry` — NOT
 * imported from it (`chart-web/SKILL.md`: a beat never imports another beat's files, "duplicate,
 * do not link") — for this genre's own shape: `bandGutter` and `xTickHint` are now CALL-TIME
 * parameters instead of module-level constants, because the two `WebLayout` rungs this genre ships
 * (desktop/narrow) each need their own gutter width and tick density, not one frame's fixed numbers.
 *
 * One addition the static beat's geometry has no reason to carry: each bar also gets a `hitY`/
 * `hitHeight` pair spanning the FULL row slot `scaleBand` reserved for it (bar height plus half the
 * inner padding on each side), not just the narrower rendered bar height. Two adjacent bars leave a
 * gap between them for visual separation (`paddingInner`); a hit-rect sized to the bar alone would
 * leave that gap a dead zone no pointer or tap could land in. Sizing the hit-rect to the row's own
 * `step()` instead makes every hit-rect share an edge with its neighbours — full vertical coverage,
 * zero gaps, and the visible bar still draws at its own narrower height inside that slot.
 */

import { scaleBand, scaleLinear } from "d3-scale";

export type Band = { ageBand: string; male: number; female: number };

type Padding = { top: number; right: number; bottom: number; left: number };

/**
 * Data to mirrored-bar coordinates, and nothing else. Youngest band first in `bands` (index 0 =
 * "0-4"); reversed here so it lands at the BOTTOM of the frame — `scaleBand`'s range runs
 * top-to-bottom in SVG y, so the oldest band has to come first in the domain to end up at the top.
 * Age bands keep this natural sequence always; sorting by value would destroy the silhouette the
 * type exists to show (`references/types/population-pyramid.md`).
 */
export function pyramidGeometry(
  bands: Band[],
  {
    width,
    height,
    padding,
    bandGutter,
    xTickHint,
  }: {
    width: number;
    height: number;
    padding: Padding;
    /** Width, in px, of the reserved central gutter the age-band label sits in — this layout's own
     *  number, measured from the widest label string that will actually be drawn there. */
    bandGutter: number;
    /** How many round-number ticks `magnitude.ticks` is hinted to produce on this layout's own
     *  mirrored axis. */
    xTickHint: number;
  },
) {
  const plot = {
    left: padding.left,
    top: padding.top,
    right: width - padding.right,
    bottom: height - padding.bottom,
  };
  const centerX = (plot.left + plot.right) / 2;
  const halfWidth = (plot.right - plot.left - bandGutter) / 2;

  const maxValue = Math.max(...bands.map((b) => Math.max(b.male, b.female)));
  // Zero-anchored, mirrored, ONE shared scale for both sides — never two independent scales that
  // happen to look similar (`population-pyramid.md`: "there is no zoomed-range version of this
  // type").
  const magnitude = scaleLinear()
    .domain([0, maxValue])
    .nice()
    .range([0, halfWidth]);

  const order = [...bands].reverse().map((b) => b.ageBand);
  const y = scaleBand()
    .domain(order)
    .range([plot.top, plot.bottom])
    .paddingInner(0.15);
  const step = y.step();
  const bandwidth = y.bandwidth();
  const slack = (step - bandwidth) / 2;

  const bars = bands.map((b) => {
    const rowY = y(b.ageBand)!;
    const maleWidth = magnitude(b.male);
    const femaleWidth = magnitude(b.female);
    return {
      ageBand: b.ageBand,
      male: b.male,
      female: b.female,
      y: rowY,
      height: bandwidth,
      // The full row slot, edge-to-edge with its neighbours — see this file's own doc-comment.
      hitY: rowY - slack,
      hitHeight: step,
      centerLabelY: rowY + bandwidth / 2,
      male_: { x: centerX - bandGutter / 2 - maleWidth, width: maleWidth },
      female_: { x: centerX + bandGutter / 2, width: femaleWidth },
    };
  });

  const ticks = magnitude.ticks(xTickHint).filter((v) => v > 0);
  return {
    plot,
    centerX,
    bars,
    ticksLeft: ticks.map((v) => ({
      value: v,
      x: centerX - bandGutter / 2 - magnitude(v),
    })),
    ticksRight: ticks.map((v) => ({
      value: v,
      x: centerX + bandGutter / 2 + magnitude(v),
    })),
  };
}

/** Rounded-thousands axis tick label — what the static frame's own axis prints, and all this genre
 *  prints unconditionally too: "330k". Unlike the static frame, this genre also carries the EXACT
 *  per-band figure, but only on demand (`data-detail`) — see `exactCount` below. */
export function thousands(v: number): string {
  return Math.round(v / 1000).toLocaleString("en-US") + "k";
}

/** The exact, comma-thousands integer a reader gets on hover/tap/keyboard-focus — the reading the
 *  static frame had no room to print for any of the 42 (21 bands × 2 sexes) figures
 *  (`web-discipline.md`, "What hover reveals"). English convention (comma thousands), matching this
 *  beat's own English words throughout. */
export function exactCount(v: number): string {
  return v.toLocaleString("en-US");
}
