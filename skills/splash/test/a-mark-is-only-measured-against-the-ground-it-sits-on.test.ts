/**
 * A MARK IS ONLY MEASURED AGAINST THE GROUNDS IT ACTUALLY SITS ON — AND THE OCCUPANCY IS MEASURED,
 * NEVER NAMED.
 *
 * THE DEFECT, MEASURED COLD ON 2026-09-16. `plateGrounds` handed every map beat BOTH of a basemap's
 * grounds, so `guardColour` measured every mark against the sea whether or not the mark had ever
 * been near it. The newsroom's house accent `#0B7A75` is 30.0° of hue from `#1F6FB2`, the filed
 * water convention — inside the 40° this corpus counts as ONE pole — so twelve beats were refused
 * outright, at render time, over a ground most of them never touch. A guard that refuses what is not
 * there is not a stricter guard: it is a guard a producer learns to switch off.
 *
 * WHAT REPLACES IT. `markOccupancy`, which reads the plate the beat itself baked, under the
 * footprints the beat itself draws. Nothing here knows a beat's name or its type, and that is the
 * point: measured on this corpus, a dot map's dots are NOT all on land (213 of 8 900 European
 * stations are offshore wind), a choropleth's fills are not all on land either (Malta is a fill on a
 * sea MapTiler does not draw at z3.7), and a hex cartogram — whose seating is not a geolocation —
 * puts nine of its thirty-two cells over open water. A list of type names would have got all three
 * wrong.
 *
 * MUTATIONS THAT MUST GO RED (every one of them runs below as a live mutation, not as a comment):
 *   1. `plateGrounds` given no occupancy at all → refuses, rather than guessing either way.
 *   2. a ground reported as occupied when it is not → the guard refuses a mark over a sea it never
 *      touches, which is the defect this closes.
 *   3. a ground reported as UNOCCUPIED when the marks are seated on it → the blue-on-blue passes,
 *      which is the defect the guard exists to catch.
 *   4. the occupancy measured against a field that says everything is land → a mark at sea comes
 *      back land-seated.
 *   5. the marks and the plate put in two different pixel spaces → refuses, rather than answering
 *      from samples that all fell off the plate.
 */
import { describe, it, expect } from "bun:test";
import {
  SEATED_SHARE_MIN,
  frameProjector,
  inradiusOf,
  markOccupancy,
  radiusOf,
  samplesOf,
} from "#shared/map-beat/occupancy.mjs";
import { plateGrounds, plateTints, WATER_HUE } from "#shared/map-beat/tints.mjs";
import { guardColour } from "#shared/design-base/compose.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..", "..");
const DIRECTIONS = join(ROOT, "shared", "design-base", "directions");

/** A basemap in one straight coastline: land to the left of x = 100, water to the right, on a
 *  200 x 200 frame. Both depths are exact, so every case below is arithmetic rather than a
 *  photograph — the photograph is what the beats themselves run against. */
function coastline({ landLeftOf = 100, width = 200, height = 200 } = {}) {
  return {
    frame: { width, height },
    waterDepthAt: (x: number, y: number) => {
      if (x < 0 || y < 0 || x >= width || y >= height) return null;
      return x < landLeftOf ? 0 : x - landLeftOf + 1;
    },
    landDepthAt: (x: number, y: number) => {
      if (x < 0 || y < 0 || x >= width || y >= height) return null;
      return x < landLeftOf ? Math.min(landLeftOf - x, x + 1) : 0;
    },
  };
}

/** Everything is land, everywhere — mutation 4's field. */
const ALL_LAND = {
  frame: { width: 200, height: 200 },
  waterDepthAt: () => 0,
  landDepthAt: () => 100,
};

const discAt = (x: number, r: number) => ({ kind: "disc", x, y: 100, r });

describe("the occupancy is measured on what the beat paints", () => {
  it("should seat a placed mark on the ground that has room for it", () => {
    const field = coastline();
    // 30 px out to sea, radius 8: the water runs 31 px deep under it. Seated on water.
    expect(markOccupancy([discAt(130, 8)], field).water).toBe(true);
    // 30 px inland, same radius. Seated on land, and NOT on water.
    const inland = markOccupancy([discAt(70, 8)], field);
    expect([inland.water, inland.land]).toEqual([false, true]);
  });

  it("should call a mark that only laps the coastline land-seated, not water-seated", () => {
    // Centre 5 px inland, radius 8: a third of the disc is over the sea and the sea under it is
    // never more than 3 px deep. A coastline is not a seat.
    const lapping = markOccupancy([discAt(95, 8)], coastline());
    expect([lapping.water, lapping.land]).toEqual([false, true]);
  });

  it("should seat a straddling mark on both, rather than on nothing at all", () => {
    // The `proof/static-locator-zaporizhzhia` case in miniature: a pin bigger than either ground is
    // deep at that point. Neither has room for it; it is on both.
    // An estuary: water from 90 to 120, land either side, neither running more than 15 px deep
    // anywhere near the pin. A 30 px pin at the water's edge fits in neither.
    const estuary = {
      frame: { width: 200, height: 200 },
      waterDepthAt: (x: number) => (x >= 90 && x < 120 ? Math.min(x - 89, 120 - x) : 0),
      landDepthAt: (x: number) =>
        x >= 90 && x < 120 ? 0 : Math.min(15, x < 90 ? Math.min(90 - x, x - 59) : x - 119),
    };
    const straddling = markOccupancy([{ kind: "disc", x: 95, y: 100, r: 30 }], estuary);
    expect([straddling.water, straddling.land]).toEqual([true, true]);
  });

  it("should seat an AREA mark on the ground it mostly covers, not on the one with room for it", () => {
    // An area mark claims a ground rather than being placed on one, and measured the other way it
    // answers nothing: a country fill's own inradius IS the depth of the land beneath it, so "has
    // the land room for it" turns on which raster rounds first. Great Britain's fill came out
    // seated on NEITHER ground, at 33.4 px of inradius against 33-ish px of land.
    const field = coastline();
    const boxFrom = (x0: number, x1: number) => ({
      kind: "area",
      rings: [[[x0, 60], [x1, 60], [x1, 140], [x0, 140], [x0, 60]]],
    });
    expect(markOccupancy([boxFrom(10, 90)], field).land).toBe(true);
    expect(markOccupancy([boxFrom(10, 90)], field).water).toBe(false);
    expect(markOccupancy([boxFrom(110, 190)], field).water).toBe(true);
    // Straddling, three quarters on land: it claims the land.
    const mostlyLand = markOccupancy([boxFrom(40, 120)], field);
    expect([mostlyLand.water, mostlyLand.land]).toEqual([false, true]);
  });

  it("should take a band's own width into account, not only its spine", () => {
    const field = coastline();
    const spine = [[99, 20], [99, 180]] as Array<[number, number]>;
    // The same course, twice. Drawn as a hairline it stays on the land it runs along; drawn 8 px
    // wide its own edge is 4 px out to sea, which is a whole mark's worth of water. A band is not
    // its spine, and measuring one as a line would have answered `false` for both.
    expect(markOccupancy([{ kind: "band", points: spine, width: 1 }], field).water).toBe(false);
    expect(markOccupancy([{ kind: "band", points: spine, width: 8 }], field).water).toBe(true);
  });

  it("should count a ground as occupied only once a real share of the marks are seated on it", () => {
    const field = coastline();
    const land = Array.from({ length: 9 }, () => discAt(50, 6));
    const sea = [discAt(150, 6)];
    // One offshore mark in ten — Malta among forty-one countries, an offshore wind farm among eight
    // thousand stations. A share below the floor is an exception, not a seat.
    expect(markOccupancy([...land, ...sea], field).water).toBe(false);
    // Half of them, and the beat is drawn on the sea.
    expect(markOccupancy([...land.slice(0, 5), ...Array(5).fill(discAt(150, 6))], field).water).toBe(true);
    expect(SEATED_SHARE_MIN).toBeGreaterThan(0.174);
    expect(SEATED_SHARE_MIN).toBeLessThanOrEqual(0.281);
  });

  it("should report the share behind every verdict, so a beat prints what it found", () => {
    const { measured } = markOccupancy(
      [discAt(150, 6), discAt(50, 6), discAt(50, 6), discAt(50, 6)],
      coastline(),
    );
    expect(measured.onWater).toBe(1);
    expect(measured.marks).toBe(4);
    expect(measured.waterShare).toBe(0.25);
  });

  it("should measure an area mark's own radius on its own rings (MUTATION: a hex is not a country)", () => {
    const hex: Array<[number, number]> = [];
    for (let i = 0; i < 6; i += 1) {
      const a = (Math.PI / 3) * i;
      hex.push([100 + 30 * Math.cos(a), 100 + 30 * Math.sin(a)]);
    }
    hex.push(hex[0]);
    // A regular hexagon of circumradius 30 has an inradius of 30·cos30 = 25.98.
    expect(inradiusOf([hex])).toBeCloseTo(25.98, 0);
    expect(radiusOf({ kind: "band", points: [[0, 0], [10, 0]], width: 9 })).toBe(4.5);
    expect(samplesOf(discAt(130, 8)).length).toBeGreaterThan(20);
  });
});

describe("the grounds a guard is handed", () => {
  it("should refuse to guess when nothing says where the marks land (MUTATION 1)", () => {
    const tints = plateTints(readDirection(join(DIRECTIONS, "creme.md")));
    // @ts-expect-error — the mutation is the missing argument.
    expect(() => plateGrounds(tints)).toThrow(/markOccupancy/);
    // @ts-expect-error — and a half-answer is not an answer either.
    expect(() => plateGrounds(tints, { water: true })).toThrow(/markOccupancy/);
  });

  it("should drop the water when the marks are not seated on it, and keep the land", () => {
    const tints = plateTints(readDirection(join(DIRECTIONS, "creme.md")));
    const onLand = plateGrounds(tints, { water: false, land: true });
    expect(onLand.map((g) => g.name)).toEqual(["the basemap's land"]);
    // The land declares no pigment: it is the direction's own paper walked toward its own ink, and
    // paper carries no convention a reader could mistake a mark for.
    expect(onLand[0].pigment).toBeUndefined();
    const onWater = plateGrounds(tints, { water: true, land: false });
    expect(onWater.map((g) => g.pigment)).toEqual([WATER_HUE]);
  });

  it("should stop refusing a house teal over a sea the marks never touch (MUTATION 2)", () => {
    const direction = readDirection(join(DIRECTIONS, "creme.md"));
    const house = { ...direction, accent: "#0B7A75" };
    const tints = plateTints(house, { landDose: 0.07 });
    // Seated on land, as eight of the twelve measured: nothing to say.
    expect(guardColour(house, plateGrounds(tints, { water: false, land: true }))).toEqual([]);
    // The mutation — the water reported as occupied when it is not — is the refusal that shipped.
    const wrong = guardColour(house, plateGrounds(tints, { water: true, land: true }));
    expect(wrong.join(" ")).toContain("30.0°");
    expect(wrong.join(" ")).toMatch(/ONE\s+pole/);
  });

  it("should still refuse a mark drawn in the hue of a sea it IS seated on (MUTATION 3)", () => {
    const direction = readDirection(join(DIRECTIONS, "creme.md"));
    // A mark drawn in the water's own convention, on a beat whose marks are seated on water.
    const blue = { ...direction, accent: "#176EB6" };
    const tints = plateTints(blue);
    expect(guardColour(blue, plateGrounds(tints, { water: true, land: true })).join(" ")).toMatch(
      /ONE\s+pole/,
    );
    // …and the mutation that would let it back in is reporting the water unoccupied. This is the
    // exact shape of "weakening the wrong thing", and it is here so that it cannot happen quietly.
    expect(guardColour(blue, plateGrounds(tints, { water: false, land: true }))).toEqual([]);
  });
});

describe("the measurement itself can go wrong, and says so", () => {
  it("should come back land-seated against a field that says everything is land (MUTATION 4)", () => {
    // The field is the one thing `markOccupancy` cannot check for itself, so the mutation that
    // matters is a broken field: a mark 50 px out to sea reports LAND, and the guard then measures
    // a river against nothing. This is why the field is read off the plate's own recorded tints and
    // refuses a plate that recorded none.
    const truthful = markOccupancy([discAt(150, 6)], coastline());
    const lying = markOccupancy([discAt(150, 6)], ALL_LAND);
    expect(truthful.water).toBe(true);
    expect(lying.water).toBe(false);
    expect(lying.land).toBe(true);
  });

  it("should refuse an occupancy measured across two pixel spaces (MUTATION 5)", () => {
    // Every footprint off the plate: the marks were handed in one space and the plate is in another,
    // which used to answer a confident `false` from zero samples.
    expect(() => markOccupancy([discAt(4000, 6)], coastline())).toThrow(/two spaces|pixel space/);
    expect(() => markOccupancy([], coastline())).toThrow(/no marks/);
  });

  it("should put a degree where the plate put it, from the camera the bake recorded", () => {
    const project = frameProjector({
      frame: { width: 1600, height: 660 },
      frameCorners: { west: 6, east: 31, south: 42.8, north: 49.9 },
    });
    const [x0, y0] = project([6, 49.9]);
    const [x1] = project([31, 49.9]);
    expect(Math.round(x0)).toBe(0);
    expect(Math.abs(y0)).toBeLessThan(0.001);
    expect(Math.round(x1)).toBe(1600);
    // Mercator, not linear in latitude: the middle of the box in DEGREES is above the middle of the
    // frame in pixels.
    const [, mid] = project([6, (42.8 + 49.9) / 2]);
    expect(mid).toBeGreaterThan(330);
    expect(() => frameProjector({ frame: { width: 0 }, frameCorners: null })).toThrow(/settled on/);
  });
});
