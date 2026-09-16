/**
 * The pure core of the CO₂ per-capita ranking beat: data to coordinates, and the number formatting
 * that labels them. No colour, no font, no React — the same split `proof/co2-suisse/crossing-
 * geometry.ts` keeps for its own beat: one geometry module carrying no dependency a browser bundle
 * cannot load, so it stays reusable if this beat ever grows a static or video sibling.
 */

import { scaleLinear } from "d3-scale";

export type Row = { name: string; value: number };

/**
 * English: full stop for the decimal, comma for thousands — because this beat is written in
 * English. Its title, its subtitle, its ten category names and its source line are all English
 * (`BRIEF.md`), and `render-web.mjs` ships the page as `<html lang="en">`.
 *
 * IT USED TO BE CALLED `fr` AND IT USED TO RETURN FRENCH NUMBERS, under a comment claiming the
 * convention was "independent of the chart's own display language". It is not independent: this
 * beat printed "7,1 t" beside a bar in a sentence that says "second-lowest of ten major European
 * economies", and its hover answered "3,5947 t" — a French decimal comma under English prose, which
 * an English reader reads as a thousands separator. A number formatter takes its locale from the
 * beat's own declared language, and a function's name says what it does; `fr` did neither.
 *
 * `Intl.NumberFormat` rather than a hand-rolled regex, for the reason the previous copy discovered
 * the hard way: its own grouping regex mis-grouped the FRACTION at four decimal places
 * (`3,5947` came out as `3,5 947`), caught by driving the rendered file and reading the tooltip,
 * never by a test. The platform owns this rule; no beat needs its own implementation of it.
 */
export function en(value: number, decimals = 1): string {
  return new Intl.NumberFormat("en-GB", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
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
