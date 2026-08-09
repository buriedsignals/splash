/**
 * The pure core of the "2024 per-capita CO2, ranked" lollipop — data to coordinates, and nothing
 * else, the same boundary `proof/co2-suisse/crossing-geometry.ts` and
 * `proof/web-income-life-expectancy/income-life-geometry.ts` both keep for their own beats.
 *
 * Structurally the web sibling of `proof/more-lollipop-co2-per-capita/LollipopCo2.tsx`'s own
 * `lollipopGeometry` (the static beat of this exact claim) — not imported from there (a beat never
 * imports another beat's files, `SKILL.md`'s "duplicate, do not link" ruling), and adapted to this
 * genre's own frame shape: `tickHint` is passed in per call rather than fixed at module scope, so a
 * desktop and a narrow layout can each ask the value axis for their own density
 * (`web-discipline.md`, "Responsive behaviour": "gutters... x-tick density... re-run at that
 * layout's own hint").
 *
 * The value axis keeps the bar family's non-negotiable zero floor
 * (`references/types/lollipop.md`, "The one thing that goes wrong": the stem's LENGTH is what a
 * reader measures) — `scaleLinear().domain([0, maxValue])`, never fitted to the data's own minimum.
 */

import { scaleBand, scaleLinear } from "d3-scale";

export type Row = { country: string; value: number };

export type Padding = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export type LollipopPoint = {
  country: string;
  value: number;
  /** Vertical centre of this row's band — where the stem and dot sit. */
  rowY: number;
  /** Top edge of this row's own band — the hit-rect's own `y`. */
  bandTop: number;
  /** This row's own band height — the hit-rect's own `height`, same value the dot/stem centre on. */
  bandHeight: number;
  dotX: number;
};

export type Tick = { value: number; x: number };

/**
 * Rows to stem/dot coordinates. Knows no colour, no font, no label. Band padding
 * (`paddingInner`/`paddingOuter`) is fixed, not layout-parameterised — the same call
 * `LollipopCo2.tsx`'s own `lollipopGeometry` makes, wide enough that a row of thin stems reads as
 * separated rows at either frame width.
 */
export function lollipopGeometry(
  rows: Row[],
  {
    width,
    height,
    padding,
    tickHint,
  }: { width: number; height: number; padding: Padding; tickHint: number },
): {
  plot: { left: number; top: number; right: number; bottom: number };
  zeroX: number;
  points: LollipopPoint[];
  ticks: Tick[];
} {
  const plot = {
    left: padding.left,
    top: padding.top,
    right: width - padding.right,
    bottom: height - padding.bottom,
  };

  // Length encoding, so the domain is fitted from zero — not from the data's own minimum, the
  // line-chart rule this type explicitly does not inherit.
  const maxValue = Math.max(...rows.map((r) => r.value));
  const x = scaleLinear()
    .domain([0, maxValue])
    .nice()
    .range([plot.left, plot.right]);

  const y = scaleBand()
    .domain(rows.map((r) => r.country))
    .range([plot.top, plot.bottom])
    .paddingInner(0.45)
    .paddingOuter(0.3);

  const points: LollipopPoint[] = rows.map((r) => {
    const bandTop = y(r.country)!;
    const bandHeight = y.bandwidth();
    return {
      country: r.country,
      value: r.value,
      rowY: bandTop + bandHeight / 2,
      bandTop,
      bandHeight,
      dotX: x(r.value),
    };
  });

  const ticks = x.ticks(tickHint).map((v) => ({ value: v, x: x(v) }));

  return { plot, zeroX: x(0), points, ticks };
}

const UNIT = "t";

/** The printed value label — one decimal, the same precision
 *  `proof/more-lollipop-co2-per-capita/LollipopCo2.tsx`'s own `formatValue` prints, and what a
 *  reader sees beside every dot before touching anything. */
export function formatValue(v: number): string {
  return `${v.toFixed(1)} ${UNIT}`;
}

/**
 * The full-precision reading — the one thing this genre's interaction adds that the printed label
 * (rounded to one decimal) had to drop. `v.toString()` on a value parsed straight out of the CSV's
 * own decimal literal round-trips exactly for every reading in this dataset (double-precision
 * numbers with this few significant digits re-stringify to the same digits they were parsed from);
 * this function never re-rounds or reformats what the source already carries.
 */
export function formatValueExact(v: number): string {
  return `${v} ${UNIT}`;
}

/**
 * A regular value-axis gridline that would pass straight through a row's own value label is
 * dropped for that row's band only — ported from the static beat's own fix
 * (`proof/more-lollipop-co2-per-capita/LollipopCo2.tsx`'s `verticalSegments`, written after a real
 * defect: the "4t" gridline visibly bisected Switzerland's and Sweden's own "3.6 t" labels). With
 * 15 rows any tick can land under any row's label, not just one chosen annotation, so the check
 * runs against every row's own measured label span.
 */
export function verticalSegments(
  top: number,
  bottom: number,
  gaps: [number, number][],
): [number, number][] {
  const sorted = [...gaps].sort((a, b) => a[0] - b[0]);
  const segments: [number, number][] = [];
  let cursor = top;
  for (const [gapStart, gapEnd] of sorted) {
    const start = Math.max(cursor, top);
    const end = Math.min(gapStart, bottom);
    if (end > start) segments.push([start, end]);
    cursor = Math.max(cursor, gapEnd);
  }
  if (cursor < bottom) segments.push([cursor, bottom]);
  return segments;
}
