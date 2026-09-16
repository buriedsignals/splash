/**
 * The beat's own reading layer: the join, the readings the prose states, and the CAMERAS.
 *
 * Nothing here draws. In particular the four cameras are DERIVED from the projected shapes of the
 * countries each step is about — a camera typed as a centre and a zoom would be a claim about where
 * Czechia is, made by hand, in a file that already holds the answer.
 */

import type { BakedShape, Ring } from "./geo-choropleth.ts";
import { boundingBoxOf, valuesFromCsv } from "./geo-choropleth.ts";

export type Geometry = {
  frame: { width: number; height: number };
  zoom: number;
  frameCorners: { west: number; north: number; east: number; south: number };
  degreesPerPixel: number;
  metresPerPixel: number;
  minGap: number;
  shapes: BakedShape[];
};

export type Country = {
  key: string;
  name: string;
  value: number;
  rings: Ring[];
  /** The shoelace area of every ring, in plate pixels — how much of the picture this country IS. */
  painted: number;
  box: { minX: number; maxX: number; minY: number; maxY: number };
};

/** Signed area doubled, summed over rings; holes come back negative and subtract themselves. */
function ringArea(ring: Ring): number {
  let sum = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i]!;
    const [x2, y2] = ring[(i + 1) % ring.length]!;
    sum += x1 * y2 - x2 * y1;
  }
  return sum / 2;
}

export function paintedArea(rings: Ring[]): number {
  return Math.abs(rings.reduce((total, ring) => total + ringArea(ring), 0));
}

export function join(geometry: Geometry, csv: string): Country[] {
  const values = valuesFromCsv(csv);
  const missing = geometry.shapes
    .filter((s) => !values.has(s.key))
    .map((s) => s.key);
  // A silent join failure is the defect `geo-discipline.md` rule 5 exists for: an unmatched shape
  // draws as no-data and looks like a country that reports nothing, which is a claim.
  if (missing.length)
    throw new Error(
      `${missing.length} baked shapes have no value: ${missing.join(", ")}`,
    );
  return geometry.shapes.map((shape) => ({
    key: shape.key,
    name: shape.name,
    value: values.get(shape.key)!,
    rings: shape.rings,
    painted: paintedArea(shape.rings),
    box: boundingBoxOf(shape.rings),
  }));
}

export type MapFacts = {
  countries: Country[];
  count: number;
  highest: Country;
  lowest: Country;
  ratio: number;
  median: number;
  /** Within `bandWidth` of the median. */
  bandWidth: number;
  band: Country[];
  bandShareOfPaint: number;
  bandSpread: number;
  fullSpread: number;
};

export function deriveFacts(countries: Country[], bandWidth = 1): MapFacts {
  const sorted = [...countries].sort((a, b) => a.value - b.value);
  const lowest = sorted[0]!;
  const highest = sorted[sorted.length - 1]!;
  const mid = sorted.length / 2;
  const median =
    sorted.length % 2
      ? sorted[Math.floor(mid)]!.value
      : (sorted[mid - 1]!.value + sorted[mid]!.value) / 2;

  const band = countries
    .filter((c) => Math.abs(c.value - median) <= bandWidth)
    .sort((a, b) => b.value - a.value);
  const totalPaint = countries.reduce((sum, c) => sum + c.painted, 0);

  return {
    countries,
    count: countries.length,
    highest,
    lowest,
    ratio: highest.value / lowest.value,
    median,
    bandWidth,
    band,
    bandShareOfPaint: band.reduce((sum, c) => sum + c.painted, 0) / totalPaint,
    bandSpread:
      Math.max(...band.map((c) => c.value)) -
      Math.min(...band.map((c) => c.value)),
    fullSpread: highest.value - lowest.value,
  };
}

export type Camera = { cx: number; cy: number; spanX: number; spanY: number };

/**
 * The camera that holds these countries, with `pad` times their own extent around them — computed
 * from the projected rings, so a camera can never point somewhere the country is not. `pad` is the
 * only judgement in it, and it is stated per step.
 */
export function cameraFor(countries: Country[], pad: number): Camera {
  const boxes = countries.map((c) => c.box);
  const minX = Math.min(...boxes.map((b) => b.minX));
  const maxX = Math.max(...boxes.map((b) => b.maxX));
  const minY = Math.min(...boxes.map((b) => b.minY));
  const maxY = Math.max(...boxes.map((b) => b.maxY));
  return {
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
    spanX: (maxX - minX) * pad,
    spanY: (maxY - minY) * pad,
  };
}

export function wholePlate(geometry: Geometry): Camera {
  return {
    cx: geometry.frame.width / 2,
    cy: geometry.frame.height / 2,
    spanX: geometry.frame.width,
    spanY: geometry.frame.height,
  };
}

export function t1(value: number): string {
  return value.toFixed(1);
}
