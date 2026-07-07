import { describe, it, expect } from "bun:test";
import { worstContrast, isContrastViolation } from "../src/core/contrast-scan";

describe("contrast-scan", () => {
  it("should flag vermillion text on white paper (3.87 < 4.5)", () => {
    expect(isContrastViolation("#D55E00", ["#ffffff"])).toBe(true);
  });

  it("should pass ink text on white paper", () => {
    expect(isContrastViolation("#1a1a1a", ["#ffffff"])).toBe(false);
  });

  it("should take the worst background when a label straddles two colours", () => {
    // white label: fine over a dark blue slice, failing over the white paper
    const w = worstContrast("#ffffff", ["#0072B2", "#ffffff"]);
    expect(w).toBeCloseTo(1, 1); // white-on-white ~1:1 dominates
    expect(isContrastViolation("#ffffff", ["#0072B2", "#ffffff"])).toBe(true);
  });

  it("should pass white label fully inside a dark slice", () => {
    expect(isContrastViolation("#ffffff", ["#0072B2"])).toBe(false);
  });
});
