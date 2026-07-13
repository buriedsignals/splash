import { describe, it, expect } from "bun:test";
import {
  shortWayLongitudeExtent,
  normalizeLongitude,
  lerpLongitude,
} from "../src/core/longitude";

describe("shortWayLongitudeExtent", () => {
  it("reduces to [min, max] for data that does not cross the dateline", () => {
    // Europe sample: -3.7 … 13.4
    const { west, east } = shortWayLongitudeExtent([
      2.35, -0.13, 13.4, -3.7, 12.5, 4.9,
    ]);
    expect(west).toBeCloseTo(-3.7, 5);
    expect(east).toBeCloseTo(13.4, 5);
  });

  it("takes the SHORT way for antimeridian-straddling points (Pacific Ring of Fire)", () => {
    // Alaska -176.6 … Japan 142.4 … NZ 166.5 … Chile -73.2 (spans the dateline).
    const lons = [142.4, -73.2, -176.6, 95.9, -99.5, 125.1, 166.5, -74.2];
    const { west, east } = shortWayLongitudeExtent(lons);
    // Minimal arc starts at Sumatra (95.9) and sweeps east across the Pacific to Chile
    // (-73.2 unwrapped to 286.8). NOT the naive [-176.6, 166.5] (343° wide, Africa-centred).
    expect(west).toBeCloseTo(95.9, 5);
    expect(east).toBeCloseTo(286.8, 5);
    const span = east - west;
    expect(span).toBeLessThan(200); // ~191°, the short way — never ~343°
    const center = normalizeLongitude((west + east) / 2);
    expect(center).toBeCloseTo(-168.65, 1); // Pacific, not ~-5 (Africa)
  });

  it("handles two points straddling the dateline (short arc, not the long one)", () => {
    const { west, east } = shortWayLongitudeExtent([170, -170]);
    expect(west).toBeCloseTo(170, 5);
    expect(east).toBeCloseTo(190, 5); // -170 unwrapped
    expect(east - west).toBeCloseTo(20, 5); // short way, not 340
  });

  it("throws on empty input", () => {
    expect(() => shortWayLongitudeExtent([])).toThrow();
  });
});

describe("normalizeLongitude", () => {
  it("wraps values outside [-180, 180) back in", () => {
    expect(normalizeLongitude(190)).toBeCloseTo(-170, 5);
    expect(normalizeLongitude(286.8)).toBeCloseTo(-73.2, 5);
    expect(normalizeLongitude(-190)).toBeCloseTo(170, 5);
    expect(normalizeLongitude(45)).toBeCloseTo(45, 5);
  });
});

describe("lerpLongitude", () => {
  it("interpolates linearly when the endpoints do not cross the dateline", () => {
    expect(lerpLongitude(0, 40, 0)).toBeCloseTo(0, 5);
    expect(lerpLongitude(0, 40, 0.5)).toBeCloseTo(20, 5);
    expect(lerpLongitude(0, 40, 1)).toBeCloseTo(40, 5);
  });

  it("takes the SHORT way across the antimeridian (Japan +142 → Chile -73)", () => {
    // Short way is eastward across the Pacific (+142 → +180/-180 → -73), ~145°.
    // The midpoint must be OUT past the dateline (~-145.5), NOT ~34 (mid-Africa, the
    // long way that the old naive lerp took — proven by frame 315 over Kenya).
    const mid = lerpLongitude(142.4, -73.2, 0.5);
    expect(mid).toBeCloseTo(-145.4, 0);
    expect(lerpLongitude(142.4, -73.2, 0)).toBeCloseTo(142.4, 4);
    expect(lerpLongitude(142.4, -73.2, 1)).toBeCloseTo(-73.2, 4);
  });

  it("is symmetric — reversing endpoints crosses the same short arc", () => {
    const mid = lerpLongitude(-73.2, 142.4, 0.5);
    expect(mid).toBeCloseTo(-145.4, 0);
  });
});
