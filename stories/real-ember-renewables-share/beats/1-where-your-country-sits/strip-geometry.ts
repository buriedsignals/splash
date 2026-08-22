/**
 * This beat's own geometry, pure and separable from any rendering: it takes the 211 readings and
 * returns where each dot goes inside one canonical plot rectangle. Nothing here knows about SVG,
 * about HTML, about colour, or about a browser.
 *
 * The shape is the same one every chart beat in this tree uses (`crossing-geometry.ts` in the CO2
 * story, `income-life-geometry.ts` next door): the composition imports it and so would a static or
 * video sibling of this beat, so the three could never draw different pictures of one claim.
 */

export type Reading = {
  /** The entity's own name as the frozen file spells it. */
  country: string;
  /** The frozen file's own code column — the stable key, since two entities can share a prefix. */
  code: string;
  /** Renewable share of electricity generation, per cent. */
  share: number;
};

export type PlacedDot = Reading & {
  x: number;
  y: number;
};

/** The axis this strip is drawn on is the measure's own full domain, not the data's extent. A share
 *  of electricity runs 0-100 by definition, and the claim is that the countries fill it — so a
 *  scale trimmed to [min, max] would be the claim drawing itself. Fixed, and stated. */
export const DOMAIN: readonly [number, number] = [0, 100];

/**
 * Vertical placement. A dot strip's y carries NO meaning; it exists only so that dots at similar
 * values do not sit on top of each other. Two rules, both of which the type's own sheet asks for:
 *
 *   1. The jitter is DETERMINISTIC — seeded from the country's own code — so a re-render moves no
 *      dot, and a screenshot taken today can be compared with one taken tomorrow.
 *   2. It is bounded to a band around the lane's centre, so the strip reads as one lane rather
 *      than as a cloud with a second axis a reader would try to decode.
 */
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // >>> 0 keeps it unsigned; / 2^32 lands it in [0, 1).
  return (h >>> 0) / 4294967296;
}

/**
 * Places every reading inside a `width` x `height` rectangle. `bandFraction` is how much of the
 * height the jitter band occupies, centred: 0.72 leaves a clear margin top and bottom so a dot's
 * own focus ring never clips against the plot edge.
 */
export function stripGeometry(
  readings: Reading[],
  { width, height, bandFraction = 0.72 }: { width: number; height: number; bandFraction?: number },
): { dots: PlacedDot[]; x: (share: number) => number } {
  const [lo, hi] = DOMAIN;
  const x = (share: number) => ((share - lo) / (hi - lo)) * width;
  const band = height * bandFraction;
  const top = (height - band) / 2;
  const dots = readings.map((r) => ({
    ...r,
    x: x(r.share),
    y: top + hash(r.code) * band,
  }));
  return { dots, x };
}

/** The value axis's own ticks. Fixed at the domain's own round divisions, for the same reason the
 *  domain is fixed: a share axis a reader already knows the shape of. */
export function xTickValues(): number[] {
  return [0, 25, 50, 75, 100];
}

/** The median of a set of readings — the second rule this beat draws, and the number that makes
 *  the world's own weighted figure legible as a weighted figure. */
export function median(values: number[]): number {
  if (values.length === 0) throw new Error("a median needs at least one value");
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** One decimal, the precision the frozen file's own figures are quoted at in the article. */
export function pct(value: number): string {
  return `${value.toFixed(1)}%`;
}
