/**
 * The pure core of the CO₂ per-capita ranking beat: data to coordinates, and the number formatting
 * that labels them. No colour, no font, no React — the same split `proof/co2-suisse/crossing-
 * geometry.ts` keeps for its own beat: one geometry module carrying no dependency a browser bundle
 * cannot load, so it stays reusable if this beat ever grows a static or video sibling.
 */

import { scaleLinear } from "d3-scale";

export type Row = { name: string; value: number };

/** French: comma decimal, thin space for thousands — the same `fr()` convention every beat in this
 *  codebase uses for its numbers, independent of the chart's own display language (this beat's own
 *  title/labels are English, per `BRIEF.md`; only the number formatting follows this convention).
 *
 *  Grouped on the INTEGER part only, unlike `proof/co2-suisse/crossing-geometry.ts`'s own copy of
 *  this helper, which applies its thousands-separator regex to the whole formatted string. That
 *  never surfaced there because every call in that beat uses `decimals = 1`, so the fractional part
 *  is always a single digit and can never match a run of three. This beat's own hover detail calls
 *  `fr(value, 4)` (`RankingWeb.tsx`, matching `BRIEF.md`'s own verified precision) — at four
 *  fractional digits the same regex mis-grouped the FRACTION too: `3,5947` came out as `3,5 947`,
 *  caught by driving the rendered file and reading the tooltip text, not by a unit test. */
export function fr(value: number, decimals = 1): string {
  const [intPart, fracPart] = Math.abs(value).toFixed(decimals).split(".");
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const sign = value < 0 ? "-" : "";
  return fracPart !== undefined
    ? `${sign}${grouped},${fracPart}`
    : `${sign}${grouped}`;
}

export type PositionedRow = Row & {
  x0: number;
  x1: number;
  barWidth: number;
  top: number;
  height: number;
  centerY: number;
};

/**
 * Data to coordinates for a horizontal ranking bar chart: one row per category, a shared zero
 * baseline, in whatever order the caller hands rows (this beat's own runner sorts descending by
 * value before calling this — `bar-and-column.md`: "for a ranking, sort by value"). No colour, no
 * font, no label.
 */
export function rankingGeometry(
  rows: Row[],
  {
    width,
    height,
    padding,
    rowHeight,
    gapRatio,
  }: {
    width: number;
    height: number;
    padding: { top: number; right: number; bottom: number; left: number };
    rowHeight: number;
    /** Fraction of `rowHeight` left as the gap between bars — bar-and-column.md: "roughly a fifth
     *  to a third of the band's width, so the bars read as discrete marks". */
    gapRatio: number;
  },
) {
  if (rows.length === 0)
    throw new Error("a ranking beat needs at least one row, got 0");
  const plot = {
    left: padding.left,
    top: padding.top,
    right: width - padding.right,
    bottom: height - padding.bottom,
  };
  const maxValue = Math.max(...rows.map((r) => r.value));
  // Zero baseline, non-negotiable (bar-and-column.md, "Where it goes wrong"): the domain always
  // starts at 0 — a bar's LENGTH is the whole encoding, unlike a line's fitted scale.
  const x = scaleLinear().domain([0, maxValue]).range([plot.left, plot.right]);
  const barHeight = rowHeight * (1 - gapRatio);
  const positioned: PositionedRow[] = rows.map((r, i) => {
    const bandTop = plot.top + i * rowHeight;
    const top = bandTop + (rowHeight - barHeight) / 2;
    return {
      ...r,
      x0: x(0),
      x1: x(r.value),
      barWidth: x(r.value) - x(0),
      top,
      height: barHeight,
      centerY: top + barHeight / 2,
    };
  });
  return { plot, rows: positioned, x, maxValue };
}
