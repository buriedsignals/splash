/**
 * The pure core of the "2024 per-capita CO2, ranked" lollipop — data to coordinates, and nothing
 * else, the same boundary `proof/co2-suisse/crossing-geometry.ts` and
 * `proof/web-income-life-expectancy/income-life-geometry.ts` both keep for their own beats.
 *
 * Structurally the web sibling of `proof/more-lollipop-co2-per-capita/LollipopCo2.tsx`'s own
 * `lollipopGeometry` (the static beat of this exact claim) — not imported from there (a beat never
 * imports another beat's files, `SKILL.md`'s "duplicate, do not link" ruling), and adapted to this
 * format's own frame shape: `tickHint` is passed in per call rather than fixed at module scope, so
 * the one fluid frame states its own density explicitly (`web-discipline.md`, "Cheap, not
 * recomputed": the hint is decided ONCE, at the canonical width, and never re-derived as the frame
 * stretches).
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
 * The finer reading hover adds — THREE decimals, the same count on every row.
 *
 * It used to be `${v}`: the CSV's own decimal literal, re-stringified. That is defensible as a
 * citation and indefensible as a reading. Measured across this beat's fifteen rows, it printed
 * **five decimals on one row, six on seven, and seven on seven** — a float's own digit count
 * standing in for an editorial one, so a reader hovering Portugal was told "3.4089074 t": CO₂ per
 * head to a ten-thousandth of a gram, from a national inventory divided by a mid-year population
 * estimate.
 *
 * THREE is derived, not chosen. The hover's job here is the detail the printed label had to drop,
 * and the only detail actually dropped is a RANKING: at one decimal Sweden and Switzerland both
 * print "3.6 t", while the title calls Switzerland third-lowest. Rounding all fifteen frozen
 * readings and counting distinct values: **1 dp → 14 of 15, 2 dp → 14 of 15 (Sweden and
 * Switzerland still tied), 3 dp → 15 of 15**. Three decimals is the fewest at which every row in
 * this beat is a different number, and therefore the fewest at which the sentence over the chart
 * can be checked against it. A fourth would add a digit that separates nothing.
 */
export function formatValueFine(v: number): string {
  return `${v.toFixed(3)} ${UNIT}`;
}

/**
 * GONE, deliberately: `verticalSegments` used to cut each value-axis gridline around the rows whose
 * own value label sat on it (the static sibling's fix for the "4t" gridline bisecting "3.6 t"). It
 * required the label's WIDTH in the same user units the gridline is drawn in — which the fluid
 * frame no longer has: the label is HTML at a fixed pixel size while the gridline lives in a
 * `viewBox` that stretches, so the two cannot be compared at build time at all. The collision is
 * closed the way the format already closes it for its own reference/peak/end labels instead: each
 * value label carries a `--ground` chip behind it (`.value-label`, `render-web.mjs`'s `EXTRA_CSS`)
 * and simply covers whatever passes underneath, at every container width, with nothing measured.
 */
