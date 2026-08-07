import { describe, it, expect } from "bun:test";
import {
  tourBoxDelta,
  TOUR_SCALE,
  MIN_TOUR_DELTA,
  WIDE_TOUR_DELTA,
} from "./tour-box.ts";

// The four glaciers of Rémy's own run (2026-08-06) — inside 90 km.
const glaciers = [
  { lon: 8.077508042316026, lat: 46.451632464223096 },
  { lon: 7.661000215400804, lat: 45.986011489842674 },
  { lon: 8.39847520305841, lat: 46.62606149864873 },
  { lon: 7.547186841148459, lat: 46.00520315741525 },
];

describe("tourBoxDelta", () => {
  it("frames a stop at half the linear extent of the set it belongs to", () => {
    // lon spread 0.8513°, lat spread 0.6401° → half-spread 0.4256° → ×TOUR_SCALE.
    expect(tourBoxDelta(glaciers)).toBeCloseTo(
      0.4256441809549756 * TOUR_SCALE,
      9,
    );
  });

  it("gives a tightly-clustered set a stop box NARROWER than the box holding the whole set — the defect that flattened the camera", () => {
    const delta = tourBoxDelta(glaciers);
    const spreadLon = 8.39847520305841 - 7.547186841148459;
    const spreadLat = 46.62606149864873 - 45.986011489842674;
    expect(delta * 2).toBeLessThan(spreadLon);
    expect(delta * 2).toBeLessThan(spreadLat);
  });

  it("never exceeds the wide 'where is this place' box, so a set already spread across a continent is framed exactly as before", () => {
    const continental = [
      { lon: -9.1, lat: 38.7 }, // Lisbon
      { lon: 37.6, lat: 55.7 }, // Moscow
      { lon: 12.5, lat: 41.9 }, // Rome
    ];
    expect(tourBoxDelta(continental)).toBe(WIDE_TOUR_DELTA);
  });

  it("never goes tighter than the floor, so markers a few hundred metres apart do not put the camera in the street", () => {
    const sameTown = [
      { lon: 6.143, lat: 46.204 },
      { lon: 6.146, lat: 46.206 },
    ];
    expect(tourBoxDelta(sameTown)).toBe(MIN_TOUR_DELTA);
  });

  it("keeps the wide box when there is no spread at all — one marker has no tour to serve", () => {
    expect(tourBoxDelta([{ lon: 6.14, lat: 46.2 }])).toBe(WIDE_TOUR_DELTA);
    expect(
      tourBoxDelta([
        { lon: 6.14, lat: 46.2 },
        { lon: 6.14, lat: 46.2 },
      ]),
    ).toBe(WIDE_TOUR_DELTA);
  });

  it("reads the WIDER of the two axes, so a north–south set is not framed off its narrow longitude", () => {
    const northSouth = [
      { lon: 6.0, lat: 44.0 },
      { lon: 6.1, lat: 48.0 },
    ];
    // lat spread 4° → half 2° → ×0.5 = 1°, not 0.05° off the 0.1° longitude spread.
    expect(tourBoxDelta(northSouth)).toBeCloseTo(2 * TOUR_SCALE, 6);
  });
});
