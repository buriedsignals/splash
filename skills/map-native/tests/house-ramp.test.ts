import { describe, it, expect } from "bun:test";
import {
  houseRamp,
  relativeLuminance,
  isMonotonicLuminanceRamp,
  contrastOk,
} from "../src/theme/house-ramp";

const HEX = /^#[0-9a-f]{6}$/;

describe("relativeLuminance", () => {
  it("is 1 for white and 0 for black", () => {
    expect(relativeLuminance("#ffffff")).toBeCloseTo(1, 5);
    expect(relativeLuminance("#000000")).toBeCloseTo(0, 5);
  });
  it("orders a light green above a dark green", () => {
    expect(relativeLuminance("#9be3b8")).toBeGreaterThan(
      relativeLuminance("#0a5c36"),
    );
  });
});

describe("houseRamp", () => {
  const ramp = houseRamp("#0A5C36"); // Heidi green

  it("returns 5 valid #rrggbb stops by default", () => {
    expect(ramp.length).toBe(5);
    for (const c of ramp) expect(c).toMatch(HEX);
  });

  it("runs light → dark (first stop far lighter than the last)", () => {
    expect(relativeLuminance(ramp[0]!)).toBeGreaterThan(
      relativeLuminance(ramp[4]!),
    );
    expect(relativeLuminance(ramp[0]!)).toBeGreaterThan(0.7); // light tint
    expect(relativeLuminance(ramp[4]!)).toBeLessThan(0.25); // dark shade
  });

  it("is strictly monotonic in luminance → CVD-safe by construction", () => {
    expect(isMonotonicLuminanceRamp(ramp)).toBe(true);
  });

  it("honours a custom stop count", () => {
    expect(houseRamp("#C8102E", 7).length).toBe(7);
  });

  it("is deterministic", () => {
    expect(houseRamp("#0A5C36")).toEqual(houseRamp("#0A5C36"));
  });

  it("produces a CVD-safe monotonic ramp for several distinct house hues", () => {
    for (const hue of ["#0A5C36", "#C8102E", "#E4A400", "#4B2E83", "#111111"])
      expect(isMonotonicLuminanceRamp(houseRamp(hue))).toBe(true);
  });
});

describe("isMonotonicLuminanceRamp", () => {
  it("accepts a strictly decreasing ramp", () => {
    expect(isMonotonicLuminanceRamp(["#eeeeee", "#999999", "#333333"])).toBe(
      true,
    );
  });
  it("accepts a strictly increasing ramp", () => {
    expect(isMonotonicLuminanceRamp(["#333333", "#999999", "#eeeeee"])).toBe(
      true,
    );
  });
  it("rejects a non-monotonic ramp (a peak in the middle)", () => {
    expect(isMonotonicLuminanceRamp(["#333333", "#eeeeee", "#666666"])).toBe(
      false,
    );
  });
  it("rejects a ramp with a flat (equal-luminance) step", () => {
    expect(isMonotonicLuminanceRamp(["#eeeeee", "#eeeeee", "#333333"])).toBe(
      false,
    );
  });
});

describe("contrastOk (single fill vs the light/dark basemap)", () => {
  it("a mid house hue clears the light basemap but a very light fill does not", () => {
    expect(contrastOk("#0a5c36", false)).toBe(true); // dark green on light basemap
    expect(contrastOk("#f2f2f2", false)).toBe(false); // near-white on light basemap
  });
  it("a light house hue clears the dark basemap but a very dark fill does not", () => {
    expect(contrastOk("#9be3b8", true)).toBe(true); // light green on dark basemap
    expect(contrastOk("#0a1a10", true)).toBe(false); // near-black on dark basemap
  });
});
