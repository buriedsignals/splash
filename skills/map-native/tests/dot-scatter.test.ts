import { describe, it, expect } from "bun:test";
import { scatterInPolygon, mulberry32, hashSeed } from "../src/dot-scatter";
import { booleanPointInPolygon } from "@turf/turf";

// A unit square polygon [0,0]-[10,10].
const square: GeoJSON.Feature = {
  type: "Feature",
  properties: {},
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
        [0, 0],
      ],
    ],
  },
};

describe("mulberry32 / hashSeed", () => {
  it("is deterministic and in [0,1)", () => {
    const a = mulberry32(42),
      b = mulberry32(42);
    const xs = [a(), a(), a()],
      ys = [b(), b(), b()];
    expect(xs).toEqual(ys);
    for (const x of xs) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });
  it("hashSeed is stable for a string", () => {
    expect(hashSeed("FRA|2")).toBe(hashSeed("FRA|2"));
    expect(hashSeed("FRA|2")).not.toBe(hashSeed("FRA|3"));
  });
});

describe("scatterInPolygon", () => {
  it("returns exactly nDots points", () => {
    expect(scatterInPolygon(square, 50, 7).length).toBe(50);
    expect(scatterInPolygon(square, 0, 7).length).toBe(0);
  });
  it("places every point inside the polygon", () => {
    for (const pt of scatterInPolygon(square, 200, 7))
      expect(booleanPointInPolygon(pt, square as any)).toBe(true);
  });
  it("is deterministic for the same (feature, n, seed)", () => {
    expect(scatterInPolygon(square, 40, 99)).toEqual(
      scatterInPolygon(square, 40, 99),
    );
  });
  it("differs for a different seed", () => {
    expect(scatterInPolygon(square, 40, 1)).not.toEqual(
      scatterInPolygon(square, 40, 2),
    );
  });
});
