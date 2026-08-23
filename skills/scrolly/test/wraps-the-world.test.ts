import { describe, expect, it } from "bun:test";
import {
  everyPaintedWorldCarriesTheMarks,
  fallbackWorldCopies,
  worldCopiesToCover,
  MEASURED_WIDEST_BOX_ASPECT,
  MARGIN_BOX_ASPECT,
} from "../scripts/detect-wraps-the-world.mjs";

/** The one world camera this vehicle owns — `proof/mapscrolly-quakes-three-ways`, whose plate is
 *  836x520 of a 836.5px world (359.8° of longitude). Every number below is that beat's own. */
const QUAKES = { frameWidth: 836, frameHeight: 520, worldWidthPx: 836.5 };

function world(index: number, over: Record<string, unknown> = {}) {
  return {
    index,
    role: index === 0 ? "primary" : "repeat",
    offsetPx: index * 1000,
    visiblePx: 300,
    owed: ["a", "b"],
    painted: ["a", "b"],
    ...over,
  };
}

describe("worldCopiesToCover", () => {
  it("should ask for no copy when one tile already spans the box", () => {
    expect(worldCopiesToCover(800, 900)).toBe(0);
    expect(worldCopiesToCover(900, 900)).toBe(0);
  });

  it("should ask for one copy each side as soon as the box is wider than a tile", () => {
    expect(worldCopiesToCover(901, 900)).toBe(1);
    expect(worldCopiesToCover(2700, 900)).toBe(1);
  });

  it("should ask for two each side only past three tiles", () => {
    expect(worldCopiesToCover(2701, 900)).toBe(2);
  });

  it("should return zero rather than throw on a tile of no width", () => {
    expect(worldCopiesToCover(1600, 0)).toBe(0);
  });
});

describe("fallbackWorldCopies", () => {
  it("should give the quakes beat one copy each side at the widest box this vehicle declares", () => {
    const widest = MEASURED_WIDEST_BOX_ASPECT + MARGIN_BOX_ASPECT;
    expect(
      fallbackWorldCopies(widest, QUAKES.frameHeight, QUAKES.worldWidthPx),
    ).toBe(1);
  });

  it("should still give one copy each side at the two widths the owner reads on", () => {
    // 1600x900 -> a 1600x816.5 box; 2990x1718 -> a 2990x1649.5 one. Measured, not assumed.
    expect(
      fallbackWorldCopies(
        1600 / 816.5,
        QUAKES.frameHeight,
        QUAKES.worldWidthPx,
      ),
    ).toBe(1);
    expect(
      fallbackWorldCopies(
        2990 / 1649.5,
        QUAKES.frameHeight,
        QUAKES.worldWidthPx,
      ),
    ).toBe(1);
  });

  it("should ask for no copy at a phone's box, where one tile is already wider than the box", () => {
    expect(
      fallbackWorldCopies(375 / 583.5, QUAKES.frameHeight, QUAKES.worldWidthPx),
    ).toBe(0);
  });

  it("should ask for a second copy each side only past a box three tiles wide", () => {
    const threeTiles = (3 * QUAKES.worldWidthPx) / QUAKES.frameHeight;
    expect(
      fallbackWorldCopies(threeTiles, QUAKES.frameHeight, QUAKES.worldWidthPx),
    ).toBe(1);
    expect(
      fallbackWorldCopies(
        threeTiles * 1.01,
        QUAKES.frameHeight,
        QUAKES.worldWidthPx,
      ),
    ).toBe(2);
  });
});

describe("everyPaintedWorldCarriesTheMarks", () => {
  const reading = (over: Record<string, unknown> = {}) => ({
    boxWidthPx: 2400,
    tilePx: 1000,
    worlds: [world(-1), world(0), world(1)],
    ...over,
  });

  it("should pass a page whose every visible copy paints what the primary paints", () => {
    const r = everyPaintedWorldCarriesTheMarks(reading());
    expect(r.short).toEqual([]);
    expect(r.adrift).toEqual([]);
    expect(r.uncoveredPx).toBe(0);
    expect(r.visible).toBe(3);
  });

  it("should refuse a copy that paints the basemap and none of the beat's own marks", () => {
    const r = everyPaintedWorldCarriesTheMarks(
      reading({ worlds: [world(-1, { painted: [] }), world(0), world(1)] }),
    );
    expect(r.short).toEqual([{ copy: -1, of: 2, missing: ["a", "b"] }]);
  });

  it("should charge a copy only for the marks the primary itself answers for", () => {
    const r = everyPaintedWorldCarriesTheMarks(
      reading({
        worlds: [
          world(-1, { owed: ["a", "z"], painted: ["a"] }),
          world(0),
          world(1),
        ],
      }),
    );
    // `z` is drawn by nobody on the primary either, so it is not this rule's shortfall.
    expect(r.short).toEqual([]);
  });

  it("should refuse a copy that does not sit a whole number of tiles from the primary", () => {
    const r = everyPaintedWorldCarriesTheMarks(
      reading({ worlds: [world(-1, { offsetPx: -940 }), world(0), world(1)] }),
    );
    expect(r.adrift.map((one: { copy: number }) => one.copy)).toEqual([-1]);
  });

  it("should not count a copy the box never reaches as one that passed on an empty set", () => {
    const r = everyPaintedWorldCarriesTheMarks(
      reading({
        boxWidthPx: 900,
        worlds: [
          world(-1, { visiblePx: 0, painted: [] }),
          world(0),
          world(1, { visiblePx: 0, painted: [] }),
        ],
      }),
    );
    expect(r.short).toEqual([]);
    expect(r.visible).toBe(1);
    expect(r.offScreen).toEqual([-1, 1]);
  });

  it("should report the width of box the painted tiles never reach", () => {
    const r = everyPaintedWorldCarriesTheMarks(reading({ boxWidthPx: 4000 }));
    expect(r.uncoveredPx).toBe(1000);
    expect(r.needed).toBe(2);
  });

  it("should throw rather than guess when no world is the primary", () => {
    expect(() =>
      everyPaintedWorldCarriesTheMarks(
        reading({ worlds: [world(-1), world(1)] }),
      ),
    ).toThrow(/primary/);
  });
});
