import { describe, it, expect } from "bun:test";
import {
  tourBoxDelta,
  tourStopBox,
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

// The five Seine-side sites of the Paris 2024 opening ceremony (this repo's own
// locator-few.json). A RIBBON: 0.0804° of longitude by 0.0103° of latitude, ~8:1 — the shape
// the scalar delta above cannot serve, and the reason `tourStopBox` exists.
const seineSites = [
  { lon: 2.3699, lat: 48.8503 },
  { lon: 2.3499, lat: 48.853 },
  { lon: 2.3376, lat: 48.8606 },
  { lon: 2.313, lat: 48.8606 },
  { lon: 2.2895, lat: 48.8584 },
];
const seineBounds: [number, number, number, number] = [
  2.2895, 48.8503, 2.3699, 48.8606,
];
const width = (b: readonly number[]) => b[2]! - b[0]!;
const height = (b: readonly number[]) => b[3]! - b[1]!;

describe("tourStopBox", () => {
  it("frames a stop as a scaled-down copy of the establishing box, so the stop is the SAME shape one step in", () => {
    const box = tourStopBox(seineBounds, seineSites[0]!)!;
    expect(width(box)).toBeCloseTo(width(seineBounds) * TOUR_SCALE, 12);
    expect(height(box)).toBeCloseTo(height(seineBounds) * TOUR_SCALE, 12);
  });

  it("centres the box on the stop's own marker", () => {
    const box = tourStopBox(seineBounds, seineSites[3]!)!;
    expect((box[0] + box[2]) / 2).toBeCloseTo(seineSites[3]!.lon, 12);
    expect((box[1] + box[3]) / 2).toBeCloseTo(seineSites[3]!.lat, 12);
  });

  it("is tighter than the establishing box on BOTH axes for a ribbon-shaped set — where the scalar delta is WIDER than the whole set", () => {
    const box = tourStopBox(seineBounds, seineSites[2]!)!;
    expect(width(box)).toBeLessThan(width(seineBounds));
    expect(height(box)).toBeLessThan(height(seineBounds));
    // Why the scalar cannot serve this set: its floor binds (half-spread 0.0402 × 0.5 =
    // 0.0201 < MIN_TOUR_DELTA), so the square box it yields is 0.1° across — WIDER than the
    // 0.0804° box holding all five sites. Measured in the browser (cameraForBounds, 900×700,
    // padding 64): that box solves to zoom 11.37 against the establishing shot's 12.72, i.e.
    // the "tour" zooms OUT 1.35 levels at every stop. This box solves to 13.72 — exactly one
    // level in.
    expect(tourBoxDelta(seineSites) * 2).toBeGreaterThan(width(seineBounds));
  });

  it("returns null when the set has no spread at all — there is nothing to halve, and nothing to tour", () => {
    const one: [number, number, number, number] = [6.14, 46.2, 6.14, 46.2];
    expect(tourStopBox(one, { lon: 6.14, lat: 46.2 })).toBeNull();
  });

  it("still frames a set strung out along one axis — a zero spread on the OTHER axis is not a reason to refuse the tour", () => {
    const eastWest: [number, number, number, number] = [6.0, 46.2, 6.4, 46.2];
    const box = tourStopBox(eastWest, { lon: 6.1, lat: 46.2 })!;
    expect(width(box)).toBeCloseTo(0.4 * TOUR_SCALE, 12);
    expect(height(box)).toBe(0);
  });
});
