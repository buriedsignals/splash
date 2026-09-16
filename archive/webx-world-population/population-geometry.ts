/**
 * The pure core of the "world population" web beat: data to coordinates, and the number
 * formatting that labels them. No colour, no font, no React — the same split every geometry file
 * in this corpus keeps.
 */

import { extent, tickStep } from "d3-array";
import { scaleLinear } from "d3-scale";
import { area, line } from "d3-shape";

export type Reading = { year: number; population: number };

/** The language this beat's own page declares (`<html lang="en">`, set by its runner) and the ONLY
 *  thing the formatters below take their locale from. Named after the beat's declared language, not
 *  after a formatter: this file used to reach for `toLocaleString("en-US")` at each call site, one
 *  hard-coded locale per label, with nothing tying any of them to what the page says it is. */
export const BEAT_LANG = "en";

/** Billions to one decimal, grouped and pointed the way `BEAT_LANG` says. Through `Intl` rather
 *  than `toFixed`, and that is not cosmetic: `toFixed` rounds the DOUBLE (it rounds 380.449999…
 *  down to 380.4), while `Intl` rounds the decimal value the source published. The two disagree
 *  whenever a figure lands just under a half. */
export function billions(v: number, decimals = 1): string {
  return new Intl.NumberFormat(BEAT_LANG, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(v / 1e9);
}

/** Any plain number this beat prints in its prose (the multiple, for one), to `decimals` places, in
 *  `BEAT_LANG`. Named for what it does rather than for a locale, so the name cannot go on meaning
 *  something the body has stopped doing. */
export function formatNumber(value: number, decimals = 1): string {
  return new Intl.NumberFormat(BEAT_LANG, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/** A whole count of people, grouped the way `BEAT_LANG` says — the exact figure hover reveals, to
 *  the nearest person as the source reports it. */
export function formatInteger(v: number): string {
  return new Intl.NumberFormat(BEAT_LANG, {
    maximumFractionDigits: 0,
  }).format(v);
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
