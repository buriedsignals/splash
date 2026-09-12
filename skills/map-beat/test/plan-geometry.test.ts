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

  // A GUARD THAT HOLDS ONE FIELD AND NOT THE OTHERS IS WHERE THE DEFECT HIDES. The three cases
  // above only ever mismatch the width, so dropping the x, y or height comparison would leave them
  // green — and a plate offset by its origin misplaces every mark just as surely as a squeezed one.
  it.each([
    ["x", { x: 4, y: 20, width: 574, height: 436 }],
    ["y", { x: 10, y: 2, width: 574, height: 436 }],
    ["height", { x: 10, y: 20, width: 574, height: 300 }],
  ])("should refuse a plate whose %s does not match the marks", (_field, plate) => {
    expect(() =>
      assertPlateMatchesMarks({ mapX: 10, mapY: 20, mapW: 574, mapH: 436, plate }),
    ).toThrow(/compressed/);
  });
});
