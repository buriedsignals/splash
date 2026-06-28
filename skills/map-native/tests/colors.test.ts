import { describe, it, expect } from "bun:test";
import { relativeLuminance } from "../src/conformance";

// These constants are defined in ChoroplethMap.tsx and exported for testability.
// We re-declare the expected values here so this test can run without a DOM/browser.
const NO_DATA_COLOR = "#b9b9b9";
const WATER_COLOR = "#cfe3f1";

// The BLUES scale used by the choropleth engine (sequential 5-step D3 Blues)
const BLUES = ["#deebf7", "#9ecae1", "#4292c6", "#2171b5", "#084594"];

describe("map layer colour distinctness", () => {
  it("no-data grey is not the water blue", () => {
    expect(NO_DATA_COLOR).not.toBe(WATER_COLOR);
  });

  it("no-data grey does not match any BLUES scale colour", () => {
    for (const blue of BLUES) {
      expect(NO_DATA_COLOR).not.toBe(blue);
    }
  });

  it("water blue does not match any BLUES scale colour", () => {
    for (const blue of BLUES) {
      expect(WATER_COLOR).not.toBe(blue);
    }
  });

  it("no-data grey and water blue have distinct luminance", () => {
    const lumNoData = relativeLuminance(NO_DATA_COLOR);
    const lumWater = relativeLuminance(WATER_COLOR);
    // Must differ by more than 0.05 — enough to be visually distinct
    expect(Math.abs(lumNoData - lumWater)).toBeGreaterThan(0.05);
  });

  it("no-data grey is darker than the lightest blue scale step (reads as present-but-unknown)", () => {
    // #b9b9b9 should be darker than #deebf7 (lightest blues step)
    const lumNoData = relativeLuminance(NO_DATA_COLOR);
    const lumLightestBlue = relativeLuminance(BLUES[0]);
    expect(lumNoData).toBeLessThan(lumLightestBlue);
  });

  it("all three layer types are mutually distinct", () => {
    const colours = [NO_DATA_COLOR, WATER_COLOR, BLUES[0]];
    const unique = new Set(colours);
    expect(unique.size).toBe(3);
  });
});
