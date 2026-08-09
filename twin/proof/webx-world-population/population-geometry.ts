/**
 * The pure core of the "world population" web beat: data to coordinates, and the number
 * formatting that labels them. No colour, no font, no React — the same split every geometry file
 * in this corpus keeps.
 */

import { extent, tickStep } from "d3-array";
import { scaleLinear } from "d3-scale";
import { area, line } from "d3-shape";

export type Reading = { year: number; population: number };

export function billions(v: number, decimals = 1): string {
  return (v / 1e9).toFixed(decimals);
}

/** Zero baseline — the bar family's rule, restated for a filled area's AREA rather than a bar's
 *  height (`references/types/area.md`, "What the drawing actually needs"): population is a STOCK,
 *  not a rate, and the fill's area is what a reader measures. */
function yScale(data: Reading[]) {
  return scaleLinear()
    .domain([0, extent(data.map((d) => d.population))[1] as number])
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
    population: d.population,
    x: x(d.year),
    y: y(d.population),
  }));
  const areaPath =
    area<(typeof points)[number]>()
      .x((p) => p.x)
      .y0(y(0))
      .y1((p) => p.y)(points) ?? "";
  const linePath =
    line<(typeof points)[number]>()
      .x((p) => p.x)
      .y((p) => p.y)(points) ?? "";
  return { plot, points, areaPath, linePath, zeroY: y(0), y };
}
