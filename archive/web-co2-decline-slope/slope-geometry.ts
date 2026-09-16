/**
 * The pure core of "Of these ten European countries, Germany cut per-capita CO₂ emissions the
 * furthest since 1990" — a slopegraph, ten countries, two discrete periods (1990, 2024). No
 * colour, no font, no React — the same boundary `crossing-geometry.ts` keeps for the co2-suisse
 * beat next door, adapted for a type with exactly two fixed x positions per category
 * (`references/types/slope.md`) instead of a continuous time series.
 *
 * `decollide` is lifted, in shape, from the proven static slope beat at
 * `proof/static-renewables-shift/RenewablesShiftSlope.tsx` — that beat already solved "ten (there,
 * six) category labels stacked at one end must not overlap" for the static format; this file reuses
 * the same push-apart algorithm rather than inventing a second one. What is new here, because the
 * web format's own narrow layout is far tighter than that static beat's single 900px frame, is that
 * the composition (`SlopeWeb.tsx`) may need MORE than one line per label — this module only ever
 * moves a label's Y position, never its text, so wrapping is the composition's own job.
 */

import { extent } from "d3-array";
import { scaleLinear } from "d3-scale";

export type Country = { name: string; v1990: number; v2024: number };

/** Two decimals, matching the precision `BRIEF.md`'s own verified table states each value to
 *  (13.23, not 13.2) — rounding further would blur the Sweden/Switzerland 2024 near-tie (3.5916543
 *  vs 3.5946856) into a coincidence the chart cannot then explain. */
export function fmt(value: number): string {
  return value.toFixed(2);
}

/**
 * The shared, position-encoded value scale's domain — ONE scale for both periods, because a slope
 * chart's two columns are two readings of the same axis, not two different axes
 * (`references/types/slope.md`: "position, not length, is the encoding here"). Padded by a fixed
 * fraction of the data's own span so the extreme points and their labels are not jammed against the
 * plot's own top/bottom edge; never `.nice()`d, because this axis carries no rounded tick labels to
 * round for — every number a reader sees is a direct end label, measured off the real value.
 *
 * 18%, not a token few percent: this beat's own real data puts its two closest values (Sweden and
 * Switzerland, both ~3.59 t in 2024) right at the FLOOR of the combined range, with a third value
 * (France, 3.97 t) close enough behind it that `decollide` has to push all three apart — and a
 * thin edge pad left that push nowhere to go but past the plot's own bottom, which is exactly the
 * clipped-hit-target bug driving a real browser at 375px caught on this beat's first render (see
 * `SlopeWeb.tsx`'s own build-time bounds check for the guard that now catches a regression here
 * without needing another manual drive to notice it).
 */
export function valueDomain(
  data: Country[],
  padFraction = 0.18,
): [number, number] {
  const values = data.flatMap((d) => [d.v1990, d.v2024]);
  const [min, max] = extent(values) as [number, number];
  const span = max - min;
  const pad = span * padFraction;
  return [min - pad, max + pad];
}

/**
 * Push apart label Y-positions, closest pair first, until every neighbouring pair clears `minGap` —
 * the same minimal de-collision pass `static-renewables-shift`'s own `decollide` runs (there, six
 * categories on one 900px frame; here, up to ten on a layout as narrow as 360px, so it is called
 * with a taller `minGap` at that width — see `SlopeWeb.tsx`'s own layout-specific block height). The
 * MARK stays at its true, data-accurate Y always; only the returned label row may move — the "spread
 * apart" half of the slope doctrine's own fix for a busy chart's one failure mode, the other half
 * (wrap before truncating a name) is the composition's job, not this pure module's.
 */
export function decollide(values: number[], minGap: number): number[] {
  const order = values.map((_, i) => i).sort((a, b) => values[a] - values[b]);
  const y = order.map((i) => values[i]);
  for (let pass = 0; pass < values.length; pass++) {
    let moved = false;
    for (let i = 1; i < y.length; i++) {
      if (y[i] - y[i - 1] < minGap) {
        const deficit = minGap - (y[i] - y[i - 1]);
        y[i] += deficit / 2;
        y[i - 1] -= deficit / 2;
        moved = true;
      }
    }
    if (!moved) break;
  }
  const result = new Array(values.length);
  order.forEach(
    (originalIndex, sortedIndex) => (result[originalIndex] = y[sortedIndex]),
  );
  return result;
}

export type SlopeLine = {
  name: string;
  v1990: number;
  v2024: number;
  x1990: number;
  y1990: number;
  labelY1990: number;
  x2024: number;
  y2024: number;
  labelY2024: number;
};

/**
 * Data to coordinates, and nothing else. `minGap` is a pixel value the CALLER derives from its own
 * measured label block height (font metrics live in the composition, never here) — this function
 * only runs the shared scale and the de-collision pass with whatever gap it is handed.
 */
export function slopeGeometry(
  data: Country[],
  {
    x1990,
    x2024,
    top,
    bottom,
    minGap,
  }: {
    x1990: number;
    x2024: number;
    top: number;
    bottom: number;
    minGap: number;
  },
): { lines: SlopeLine[] } {
  const y = scaleLinear().domain(valueDomain(data)).range([bottom, top]);
  const y1990Raw = data.map((d) => y(d.v1990));
  const y2024Raw = data.map((d) => y(d.v2024));
  const y1990Label = decollide(y1990Raw, minGap);
  const y2024Label = decollide(y2024Raw, minGap);

  const lines = data.map((d, i) => ({
    name: d.name,
    v1990: d.v1990,
    v2024: d.v2024,
    x1990,
    y1990: y1990Raw[i],
    labelY1990: y1990Label[i],
    x2024,
    y2024: y2024Raw[i],
    labelY2024: y2024Label[i],
  }));

  return { lines };
}
