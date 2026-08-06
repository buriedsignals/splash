import { describe, it, expect } from "bun:test";
import {
  bearing,
  haversineKm,
  makePathWalker,
  smoothFlightPath,
  type LngLat,
} from "../src/flight-path";

// The camera core is pure geometry: everything the flyover looks like at frame N comes from
// these four functions. They are testable without Cesium, WebGL or a network.

describe("smoothFlightPath", () => {
  it("should refuse a path that cannot define a direction", () => {
    expect(() => smoothFlightPath([[0, 0]] as LngLat[])).toThrow(
      "at least two points",
    );
  });

  it("should keep the endpoints and only round what is between them", () => {
    const source: LngLat[] = [
      [0, 0],
      [1, 0],
      [1, 1],
    ];
    const curve = smoothFlightPath(source, 3);
    expect(curve[0]).toEqual([0, 0]);
    expect(curve[curve.length - 1]).toEqual([1, 1]);
    expect(curve.length).toBeGreaterThan(source.length);
  });

  it("should round a right-angle corner into a curve (no snapped heading)", () => {
    const corner: LngLat[] = [
      [0, 0],
      [1, 0],
      [1, 1],
    ];
    const raw = corner.map((p) => p);
    const smoothed = smoothFlightPath(corner, 3);
    const maxDelta = (path: LngLat[]) => {
      let worst = 0;
      for (let i = 2; i < path.length; i++) {
        let d =
          bearing(path[i - 1], path[i]) - bearing(path[i - 2], path[i - 1]);
        while (d > Math.PI) d -= 2 * Math.PI;
        while (d < -Math.PI) d += 2 * Math.PI;
        worst = Math.max(worst, Math.abs(d));
      }
      return worst;
    };
    // The raw route turns 90 degrees at one vertex; the smoothed one spreads that turn out.
    expect(maxDelta(raw)).toBeGreaterThan(Math.PI / 4);
    expect(maxDelta(smoothed)).toBeLessThan(Math.PI / 8);
  });

  it("should not wrap a route that crosses the antimeridian back around the globe", () => {
    const crossing: LngLat[] = [
      [179.5, 10],
      [-179.5, 10],
    ];
    const curve = smoothFlightPath(crossing, 1);
    // Unwrapped: the second point continues past 180 instead of jumping ~360 degrees west.
    expect(curve[curve.length - 1][0]).toBeCloseTo(180.5, 6);
    expect(haversineKm(curve[0], curve[curve.length - 1])).toBeLessThan(200);
  });
});

describe("makePathWalker", () => {
  const path: LngLat[] = [
    [0, 0],
    [0, 0.1], // ~11.1 km
    [0, 1], // ~100 km further
  ];

  it("should report the path length in km", () => {
    const walker = makePathWalker(path);
    expect(walker.lengthKm).toBeCloseTo(haversineKm(path[0], path[2]), 3);
  });

  it("should walk by ARC LENGTH, not by vertex index (constant ground speed)", () => {
    const walker = makePathWalker(path);
    const half = walker.along(walker.lengthKm / 2);
    // Vertex-index interpolation would put the halfway point at [0, 0.1] (the 2nd of 3 points);
    // arc-length walking puts it near the true midpoint latitude, ~0.5.
    expect(half[1]).toBeGreaterThan(0.4);
    expect(half[1]).toBeLessThan(0.6);
  });

  it("should clamp before the start and past the end instead of extrapolating", () => {
    const walker = makePathWalker(path);
    expect(walker.along(-50)).toEqual(path[0]);
    expect(walker.along(walker.lengthKm + 50)).toEqual(path[2]);
  });
});

describe("bearing", () => {
  it("should return 0 for due north and PI/2 for due east (Cesium heading convention)", () => {
    expect(bearing([0, 0], [0, 1])).toBeCloseTo(0, 6);
    expect(bearing([0, 0], [1, 0])).toBeCloseTo(Math.PI / 2, 6);
  });
});
