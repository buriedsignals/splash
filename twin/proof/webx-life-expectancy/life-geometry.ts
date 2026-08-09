/**
 * The pure core of the "Life expectancy in Switzerland" web beat: data to coordinates, and the
 * number formatting that labels them. No colour, no font, no React — the same split
 * `proof/co2-suisse/crossing-geometry.ts` and `proof/web-co2-ranking/bar-geometry.ts` keep for
 * their own beats.
 */

import { extent, tickStep } from "d3-array";
import { scaleLinear } from "d3-scale";
import { line } from "d3-shape";

export type Reading = { year: number; value: number };

/** English, one decimal — this beat's own words are English throughout (`BRIEF.md`), unlike the
 *  co2-suisse/ranking beats' French-formatted numbers; there is no house convention forcing a
 *  French thousands/decimal style onto an English-language beat. */
export function fr(value: number, decimals = 1): string {
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/** Fitted, not zero-anchored — a line carries its value by slope, and this series sits 69-84,
 *  nowhere near zero (`references/types/line.md`, "Where it goes wrong"). */
function yScale(data: Reading[]) {
  return scaleLinear()
    .domain(extent(data.map((d) => d.value)) as [number, number])
    .nice();
}

export function yTickValues(data: Reading[], hint: number): number[] {
  return yScale(data).ticks(hint);
}

export function xTickValues(years: number[], hint: number): number[] {
  const first = Math.min(...years);
  const last = Math.max(...years);
  if (first === last) return [first];
  const step = tickStep(first, last, hint);
  const values: number[] = [];
  for (let year = Math.ceil(first / step) * step; year <= last; year += step) {
    values.push(year);
  }
  return values;
}

export function chartGeometry(
  data: Reading[],
  {
    width,
    height,
    padding,
  }: {
    width: number;
    height: number;
    padding: { top: number; right: number; bottom: number; left: number };
  },
) {
  const plot = {
    left: padding.left,
    top: padding.top,
    right: width - padding.right,
    bottom: height - padding.bottom,
  };
  const years = data.map((d) => d.year);
  const x = scaleLinear()
    .domain([Math.min(...years), Math.max(...years)])
    .range([plot.left, plot.right]);
  const y = yScale(data).range([plot.bottom, plot.top]);
  const points = data.map((d) => ({
    year: d.year,
    value: d.value,
    x: x(d.year),
    y: y(d.value),
  }));
  const path =
    line<(typeof points)[number]>()
      .x((p) => p.x)
      .y((p) => p.y)
      .digits(1)(points) ?? "";
  return { plot, points, path, y };
}
