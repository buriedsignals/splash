import { describe, expect, it } from "bun:test";
import {
  assertPlateMatchesMarks,
  drawnSizeOf,
} from "#shared/map-beat/geometry.mjs";

describe("the geometry a layout publishes", () => {
  it("should round the drawn size to whole pixels, because a bake takes integers", () => {
    expect(drawnSizeOf({ mapW: 573.7, mapH: 436.2 })).toEqual({
      width: 574,
      height: 436,
    });
  });

  it("should accept a plate placed at the same origin and scale as the marks", () => {
    expect(() =>
      assertPlateMatchesMarks({
        mapX: 10,
        mapY: 20,
        mapW: 574,
        mapH: 436,
        plate: { x: 10, y: 20, width: 574, height: 436 },
      }),
    ).not.toThrow();
  });

  it("should refuse a plate placed on the box instead of the marks", () => {
    expect(() =>
      assertPlateMatchesMarks({
        mapX: 10,
        mapY: 20,
        mapW: 574,
        mapH: 436,
        plate: { x: 10, y: 20, width: 428, height: 436 },
      }),
    ).toThrow(/compressed/);
  });
});
