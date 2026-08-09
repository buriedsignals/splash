// twin/proof/weby-dumbbell-life-expectancy-gains/dumbbell-geometry.ts
//
// Pure geometry: rows to dot pairs on one shared linear scale, plus each row's own vertical band
// (`scaleBand`) — the WEB genre's hit-rects need each row's own band top/bottom, not just a y
// centre, to size the per-row hit-test rectangle `references/types/dumbbell.md` and this beat's
// own `DumbbellLifeExpectancyGainsWeb.tsx` both describe. Data to coordinates only — no colour, no
// font, no label — the same boundary the STATIC sibling's own `dumbbellGeometry`
// (`proof/more-dumbbell-life-expectancy-gains/DumbbellLifeExpectancyGains.tsx`) keeps, rewritten
// fresh here rather than imported: a beat never imports another beat's files
// (`twin-chart-web/SKILL.md`'s "duplicate, do not link" ruling), and this genre's own hit-test
// needs the band's own top/bottom, which the static beat's geometry never had to return.

import { extent } from "d3-array";
import { scaleLinear, scaleBand } from "d3-scale";

export type Row = {
  country: string;
  y2000: number;
  y2023: number;
  gap: number;
};

const X_TICK_HINT_DEFAULT = 5;

/**
 * `rows` must already be sorted (by gap, descending) before this runs — `scaleBand`'s domain
 * order is what puts the biggest gap at the top of the frame, the same invariant the static
 * sibling's geometry states. The scale is fitted to the extent of EVERY value plotted (both
 * years, all countries), `.nice()`d, and NOT anchored at zero — this is a position encoding,
 * exactly like a slope chart's, so the floor is not part of the claim.
 */
export function dumbbellGeometry(
  rows: Row[],
  {
    width,
    height,
    padding,
    xTickHint = X_TICK_HINT_DEFAULT,
  }: {
    width: number;
    height: number;
    padding: { top: number; right: number; bottom: number; left: number };
    xTickHint?: number;
  },
) {
  const plot = {
    left: padding.left,
    top: padding.top,
    right: width - padding.right,
    bottom: height - padding.bottom,
  };
  const values = rows.flatMap((r) => [r.y2000, r.y2023]);
  const scale = scaleLinear()
    .domain(extent(values) as [number, number])
    .nice()
    .range([plot.left, plot.right]);

  const band = scaleBand()
    .domain(rows.map((r) => r.country))
    .range([plot.top, plot.bottom])
    .paddingInner(0.32);

  const dots = rows.map((r) => {
    const bandTop = band(r.country)!;
    const bandBottom = bandTop + band.bandwidth();
    return {
      country: r.country,
      gap: r.gap,
      y2000: r.y2000,
      y2023: r.y2023,
      rowY: bandTop + band.bandwidth() / 2,
      // The web genre's own addition over the static sibling: each row's own band edges, so a
      // per-row hit-rect can be sized to exactly that row's vertical slice, never overlapping its
      // neighbours and never a fixed-height guess.
      bandTop,
      bandBottom,
      x2000: scale(r.y2000),
      x2023: scale(r.y2023),
    };
  });

  const ticks = scale.ticks(xTickHint);
  return {
    plot,
    dots,
    ticksX: ticks.map((value) => ({ value, x: scale(value) })),
  };
}
