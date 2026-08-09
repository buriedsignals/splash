/**
 * Pure geometry for the small-multiples WEB beat — "Poland's per-capita CO2 emissions have
 * overtaken Germany's." Coordinates only: no colour, no font, no React, exactly the boundary
 * `ChartWebSeed.tsx`'s own `chartGeometry` draws for a single panel.
 *
 * Written fresh for this beat, not imported from `../more-small-multiples-co2-per-capita/`: a
 * skill/beat never imports another beat's files (`twin-chart-web/SKILL.md`, "duplicate, do not
 * link"), and that beat is a different genre (video) besides. The SHAPE below intentionally
 * mirrors that video beat's own `panelGeometry` — same shared-domain rule, same panel-slot
 * origin math — because both are honest readings of `small-multiples.md`'s one non-negotiable
 * rule ("same domain, same axis, same units, on every single panel, full stop"), not a copy.
 */

import { line } from "d3-shape";
import { scaleLinear } from "d3-scale";

export type Reading = { year: number; value: number };
export type Country = { name: string; data: Reading[] };

/**
 * The shared x-domain: first/last year across EVERY country's own series, computed once — never
 * a per-panel fit. All four countries in this beat share the same 1950-2024 span, but this does
 * not assume that; it reads it off the data actually passed in.
 */
export function sharedXDomain(countries: Country[]): [number, number] {
  const years = countries.flatMap((c) => c.data.map((d) => d.year));
  return [Math.min(...years), Math.max(...years)];
}

/**
 * The shared y-domain: zero to the round ceiling above the single highest reading across every
 * country and every year. Zero-based, not fitted, because this is a magnitude comparison across
 * panels (`small-multiples.md`: "a panel with a narrow real range stretched to fill the same box
 * as a panel with a huge real range will look just as dramatic as it, for no reason connected to
 * the actual numbers" — anchoring at zero is what keeps the four panels' relative HEIGHTS honest,
 * not only their shapes).
 */
export function sharedYDomain(countries: Country[]): [number, number] {
  const max = Math.max(...countries.flatMap((c) => c.data.map((d) => d.value)));
  return scaleLinear().domain([0, max]).nice().domain() as [number, number];
}

/** Conventional round y-tick values on the shared domain — one call, reused by every panel, so
 *  no panel can silently drift onto its own tick set. */
export function yTickValues(yDomain: [number, number], hint: number): number[] {
  return scaleLinear().domain(yDomain).nice().ticks(hint);
}

/**
 * Data to pixel coordinates for ONE panel, on the domain the caller computed once across every
 * country. `left`/`top`/`width`/`height` describe that panel's own plot rectangle (already net of
 * whatever gutter the caller reserved for labels) — this function does not know about headers,
 * grids of panels, or any other panel; it only ever sees the one rectangle and the one series it
 * was handed.
 */
export function panelGeometry(
  data: Reading[],
  {
    left,
    top,
    width,
    height,
  }: { left: number; top: number; width: number; height: number },
  xDomain: [number, number],
  yDomain: [number, number],
) {
  const plot = { left, top, right: left + width, bottom: top + height };
  const x = scaleLinear().domain(xDomain).range([plot.left, plot.right]);
  const y = scaleLinear().domain(yDomain).range([plot.bottom, plot.top]);
  const points = data.map((d) => ({ ...d, x: x(d.year), y: y(d.value) }));
  const path =
    line<(typeof points)[number]>()
      .x((p) => p.x)
      .y((p) => p.y)
      .digits(1)(points) ?? "";
  return { plot, points, path };
}

/** The panel's own origin (top-left corner of its FULL box, header/label/axis gutter included) —
 *  a pure row/column formula so the component never hand-derives it twice. `slot` is the panel's
 *  position in render order, `cols` how many panels sit in one row. */
export function panelOrigin(
  slot: number,
  {
    pad,
    cols,
    panelWidth,
    panelHeight,
    colGap,
    rowGap,
    gridTop,
  }: {
    pad: number;
    cols: number;
    panelWidth: number;
    panelHeight: number;
    colGap: number;
    rowGap: number;
    gridTop: number;
  },
): { left: number; top: number } {
  const col = slot % cols;
  const row = Math.floor(slot / cols);
  return {
    left: pad + col * (panelWidth + colGap),
    top: gridTop + row * (panelHeight + rowGap),
  };
}
