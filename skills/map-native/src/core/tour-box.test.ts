import { describe, it, expect } from "bun:test";
import {
  establishBox,
  tourStopBox,
  TOUR_SCALE,
  WIDE_TOUR_DELTA,
} from "./tour-box.ts";

const width = (b: readonly number[]) => b[2]! - b[0]!;
const height = (b: readonly number[]) => b[3]! - b[1]!;
const bboxOf = (ms: { lon: number; lat: number }[]) =>
  [
    Math.min(...ms.map((m) => m.lon)),
    Math.min(...ms.map((m) => m.lat)),
    Math.max(...ms.map((m) => m.lon)),
    Math.max(...ms.map((m) => m.lat)),
  ] as [number, number, number, number];

// The four glaciers of Rémy's own run (2026-08-06) — inside 90 km. CLUSTERED, roughly
// square (0.8513° × 0.6401°).
const glaciers = [
  { lon: 8.077508042316026, lat: 46.451632464223096 },
  { lon: 7.661000215400804, lat: 45.986011489842674 },
  { lon: 8.39847520305841, lat: 46.62606149864873 },
  { lon: 7.547186841148459, lat: 46.00520315741525 },
];
const glacierBounds = bboxOf(glaciers);

// The five Seine-side sites of the Paris 2024 opening ceremony (this repo's own
// locator-few.json). A RIBBON: 0.0804° of longitude by 0.0103° of latitude, ~8:1.
const seineSites = [
  { lon: 2.3699, lat: 48.8503 },
  { lon: 2.3499, lat: 48.853 },
  { lon: 2.3376, lat: 48.8606 },
  { lon: 2.313, lat: 48.8606 },
  { lon: 2.2895, lat: 48.8584 },
];
const seineBounds = bboxOf(seineSites);

// Six European cities — this repo's own symbol.json. CONTINENTAL: 17.1° × 12.1°.
const cities = [
  { lon: 2.3522, lat: 48.8566 },
  { lon: -0.1276, lat: 51.5072 },
  { lon: 13.405, lat: 52.52 },
  { lon: -3.7038, lat: 40.4168 },
  { lon: 12.4964, lat: 41.9028 },
  { lon: 4.9041, lat: 52.3676 },
];
const cityBounds = bboxOf(cities);

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

  it("halves BOTH axes of a clustered set — not the wider axis twice, which spent a square budget on the narrow one", () => {
    // The scalar this function replaced read max(lonSpread, latSpread)/4 and spent it on
    // both axes: 0.2128° square. Latitude binds a 16:9 frame here, so that box came out
    // 0.58 of a level in from the establishing shot instead of a clean level (measured off
    // the rendered mp4: establish 8.478, stops 9.06). Halving each axis on its own is what
    // makes it exactly one.
    const box = tourStopBox(glacierBounds, glaciers[0]!)!;
    expect(width(box)).toBeCloseTo(width(glacierBounds) * TOUR_SCALE, 12);
    expect(height(box)).toBeCloseTo(height(glacierBounds) * TOUR_SCALE, 12);
    expect(height(box)).toBeLessThan(width(box)); // the set is wider than it is tall
  });

  it("is tighter than the establishing box on BOTH axes for a ribbon-shaped set", () => {
    const box = tourStopBox(seineBounds, seineSites[2]!)!;
    expect(width(box)).toBeLessThan(width(seineBounds));
    expect(height(box)).toBeLessThan(height(seineBounds));
  });

  it("has NO floor: a set a few hundred metres across is framed at half its own spread, never at a constant wider than the set itself", () => {
    // The scalar carried a 0.05° floor. On the Seine ribbon that floor BOUND (half-spread
    // 0.0402 × 0.5 = 0.0201 < 0.05), yielding a 0.1° square — wider than the 0.0804° box
    // holding all five sites. Measured off the rendered mp4 at 1280×720: every stop came
    // out at zoom 11.07 against the establishing shot's 13.26, i.e. the "tour" zoomed OUT
    // 2.19 levels at every beat. A box defined as half of a frame the reader has just been
    // shown needs no floor: half of a readable frame is readable.
    const sameTown = [
      { lon: 6.143, lat: 46.204 },
      { lon: 6.146, lat: 46.206 },
    ];
    const b = bboxOf(sameTown);
    const box = tourStopBox(b, sameTown[0]!)!;
    expect(width(box)).toBeCloseTo(width(b) * TOUR_SCALE, 12);
    expect(width(box)).toBeLessThan(width(b));
    expect(height(box)).toBeLessThan(height(b));
  });

  it("never frames a stop wider than the city box — a set spread across a continent gets EXACTLY the ±WIDE_TOUR_DELTA box every stop used to get", () => {
    for (const c of cities) {
      expect(tourStopBox(cityBounds, c)).toEqual([
        c.lon - WIDE_TOUR_DELTA,
        c.lat - WIDE_TOUR_DELTA,
        c.lon + WIDE_TOUR_DELTA,
        c.lat + WIDE_TOUR_DELTA,
      ]);
    }
  });

  it("caps each axis on its own, so a set wide in longitude and shallow in latitude keeps its shallow axis halved rather than inflated to the cap", () => {
    const wideRibbon: [number, number, number, number] = [-30, 44, 30, 46];
    const box = tourStopBox(wideRibbon, { lon: 0, lat: 45 })!;
    expect(width(box)).toBe(WIDE_TOUR_DELTA * 2); // 60° / 4 = 15° → capped
    expect(height(box)).toBeCloseTo(2 * TOUR_SCALE, 12); // 2° / 4 = 0.5° → uncapped
  });

  it("the cap can only TIGHTEN a stop, never widen it — the invariant that makes every stop at least one zoom level in", () => {
    const sets: [number, number, number, number][] = [
      glacierBounds,
      seineBounds,
      cityBounds,
      [-30, 44, 30, 46],
      [6, 46.2, 6.4, 46.2],
    ];
    for (const b of sets) {
      const box = tourStopBox(b, {
        lon: (b[0] + b[2]) / 2,
        lat: (b[1] + b[3]) / 2,
      })!;
      expect(width(box)).toBeLessThanOrEqual(width(b) * TOUR_SCALE + 1e-12);
      expect(height(box)).toBeLessThanOrEqual(height(b) * TOUR_SCALE + 1e-12);
    }
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

describe("establishBox", () => {
  it("leaves a set with real spread exactly as it is, on either axis", () => {
    expect(establishBox(glacierBounds)).toEqual(glacierBounds);
    expect(establishBox(seineBounds)).toEqual(seineBounds);
    const eastWest: [number, number, number, number] = [6.0, 46.2, 6.4, 46.2];
    expect(establishBox(eastWest)).toEqual(eastWest);
  });

  it("widens a set with NO spread to the 'where is this place' framing — a zero-area box solves to zoom 22, a blank tile", () => {
    expect(establishBox([6.14, 46.2, 6.14, 46.2])).toEqual([
      6.14 - WIDE_TOUR_DELTA,
      46.2 - WIDE_TOUR_DELTA,
      6.14 + WIDE_TOUR_DELTA,
      46.2 + WIDE_TOUR_DELTA,
    ]);
  });
});
