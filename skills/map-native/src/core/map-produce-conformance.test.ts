import { describe, it, expect } from "bun:test";
import { furnitureColorsFor } from "./map-produce-conformance";
import { resolveFrameColors, tintNeutral } from "../../../../lib/core/theme";

describe("furnitureColorsFor tints muted with the house hue", () => {
  it("light-default: muted equals the independently-tinted grey; pill/ink untouched", () => {
    const base = resolveFrameColors(undefined);
    const got = furnitureColorsFor({ brandHue: "#2E7D57" });
    expect(got.muted).toBe(tintNeutral(base.muted, "#2E7D57"));
    expect(got.muted).not.toBe(base.muted);
    expect(got.pill).toBe(base.pill);
    expect(got.ink).toBe(base.ink);
  });

  it("falls back to brandPalette[0] when brandHue is absent", () => {
    const base = resolveFrameColors(undefined);
    const got = furnitureColorsFor({ brandPalette: ["#2E7D57", "#123456"] });
    expect(got.muted).toBe(tintNeutral(base.muted, "#2E7D57"));
  });

  it("no house hue -> byte-identical grey furniture", () => {
    expect(furnitureColorsFor({})).toEqual(resolveFrameColors(undefined));
  });
});
