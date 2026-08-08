/**
 * The pure core of beat 1 of "CO₂ suisse, retour au niveau de 1967": data to coordinates, and the
 * French number furniture that labels them. No colour, no font, no React, and — the reason this
 * file exists as its own module — no `@resvg/resvg-js`.
 *
 * It was lifted out of `EmissionsLine.tsx` verbatim when the video beat arrived. The static beat
 * imports it and draws an SVG on disk; the video beat imports it and draws the same coordinates
 * frame by frame in a browser. One geometry, two outputs — which is only possible if the geometry
 * carries no dependency the browser cannot load. `EmissionsLine.tsx` imports `measureText` from a
 * script that loads a native rasteriser at module scope, so a Remotion bundle that reached it
 * would not build.
 */

import { extent } from "d3-array";
import { scaleLinear } from "d3-scale";

export type Reading = { year: number; mt: number };

/** French: comma decimal, thin space for thousands. The furniture speaks the journalist's language. */
export function fr(value: number, decimals = 1): string {
  return value
    .toFixed(decimals)
    .replace(".", ",")
    .replace(/\B(?=(\d{3})+(?!\d))/, " ");
}

/**
 * The fitted vertical scale. The reference joins the readings in the extent, because a level the
 * beat is about must be inside the frame even in the year it is not approached.
 *
 * `.nice()` rounds that extent outward to round values and stops. What it replaced padded by 15%,
 * stepped the padded ends, and then had to defend itself against its own widening — the comment
 * about "flooring 4,9 to a multiple of 5 gives 0" was a patch on arithmetic that should never have
 * reached zero. d3 rounds 10,25–46,20 to 10–50 and there is nothing left to defend against.
 */
function yScale(data: Reading[], reference: number) {
  return scaleLinear()
    .domain(extent([...data.map((d) => d.mt), reference]) as [number, number])
    .nice();
}

/**
 * Three ticks — floor, THE REFERENCE LEVEL, top.
 *
 * The middle tick is not the arithmetic middle and it is not one of d3's: it is the level the beat
 * is about, placed on the axis on purpose. Cycle 1 rendered a round [0, 30, 60] scale and the
 * render showed why that is wrong twice over — the floor snapped all the way down to zero (a third
 * of the frame empty under a line whose slope carries the story, exactly the failure
 * `static-discipline.md` describes), and the 30 gridline landed 20 px from the 1967 reference at
 * 32,5, so the one rule the reader must see had a decorative twin beside it.
 *
 * Putting the reference ON the axis removes both: the fitted floor keeps the slope, and the middle
 * gridline IS the reference, so nothing competes with it and the number is stated once, on the axis.
 * The floor and the top are d3's rounded domain ends, which is why they read as round numbers.
 */
export function yTickValues(data: Reading[], reference: number): number[] {
  const [floor, ceiling] = yScale(data, reference).domain();
  return [floor, reference, ceiling];
}

/** Data to coordinates. No colour, no font, no label. */
export function crossingGeometry(
  data: Reading[],
  {
    width,
    height,
    padding,
    reference,
  }: {
    width: number;
    height: number;
    padding: { top: number; right: number; bottom: number; left: number };
    reference: number;
  },
) {
  const plot = {
    left: padding.left,
    top: padding.top,
    right: width - padding.right,
    bottom: height - padding.bottom,
  };
  const years = data.map((d) => d.year);
  const first = Math.min(...years);
  const last = Math.max(...years);
  const ticks = yTickValues(data, reference);

  // The x domain is the years themselves, never nicened — rounding it outward would invent time.
  const x = scaleLinear().domain([first, last]).range([plot.left, plot.right]);
  const y = yScale(data, reference).range([plot.bottom, plot.top]);

  const points = data.map((d) => ({ ...d, x: x(d.year), y: y(d.mt) }));
  const peak = points.reduce((a, b) => (b.mt > a.mt ? b : a));
  const end = points[points.length - 1];

  // The crossing itself: the first reading after the peak that sits at or below the reference.
  const crossing =
    points.slice(points.indexOf(peak)).find((p) => p.mt <= reference) ?? null;

  return {
    plot,
    points,
    peak,
    end,
    crossing,
    referenceY: y(reference),
    ticksY: ticks.map((value) => ({ value, y: y(value) })),
    ticksX: [first, years[Math.floor(years.length / 2)], last].map((year) => ({
      year,
      x: x(year),
    })),
  };
}
