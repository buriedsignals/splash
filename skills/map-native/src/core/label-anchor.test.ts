import { describe, it, expect } from "bun:test";
import * as turf from "@turf/turf";
import { poleOfInaccessibility } from "./label-anchor.ts";

// A C-shaped (concave) polygon whose centroid falls OUTSIDE the polygon — the regression a
// centroid anchor causes (a callout dot landing off the region). Pole must land inside.
const cShape = turf.polygon([
  [
    [0, 0],
    [4, 0],
    [4, 1],
    [1, 1],
    [1, 3],
    [4, 3],
    [4, 4],
    [0, 4],
    [0, 0],
  ],
]);

describe("poleOfInaccessibility", () => {
  it("returns a point strictly inside a concave polygon (where centroid is outside)", () => {
    const centroid = turf.centroid(cShape).geometry.coordinates;
    expect(turf.booleanPointInPolygon(turf.point(centroid), cShape)).toBe(
      false,
    ); // centroid escapes

    const pole = poleOfInaccessibility(cShape);
    expect(turf.booleanPointInPolygon(turf.point(pole), cShape)).toBe(true); // pole stays inside
  });

  it("applies the operator nudge", () => {
    const base = poleOfInaccessibility(cShape);
    const nudged = poleOfInaccessibility(cShape, { nudge: [0.5, -0.25] });
    expect(nudged[0]).toBeCloseTo(base[0] + 0.5, 6);
    expect(nudged[1]).toBeCloseTo(base[1] - 0.25, 6);
  });
});
