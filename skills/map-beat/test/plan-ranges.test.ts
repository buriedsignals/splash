import { describe, expect, it } from "bun:test";
import { rangesNeededBy, assertRangesServed } from "#shared/map-beat/bake.mjs";

describe("the glyph range guard", () => {
  it("should need only the Latin block for plain ASCII", () => {
    expect(rangesNeededBy(["Mer du Nord", "ISLANDE"])).toEqual(["0-255"]);
  });

  it("should need the punctuation block for a typographic apostrophe", () => {
    expect(rangesNeededBy(["Mer d’Azov"])).toEqual(["0-255", "8192-8447"]);
  });

  it("should refuse a beat whose words need a range nobody serves", () => {
    expect(() => assertRangesServed(["Mer d’Azov"], ["0-255"])).toThrow(
      /8192-8447/,
    );
  });
});
