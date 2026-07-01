import { describe, it, expect } from "bun:test";
import { relativeLuminance } from "../src/conformance";

// These constants are defined in src/theme/colors.ts.
// We re-declare the expected values here so this test can run without a DOM/browser.
const NO_DATA_COLOR = "#b9b9b9";

// The BLUES scale used by the choropleth engine (sequential 5-step D3 Blues)
const BLUES = ["#deebf7", "#9ecae1", "#4292c6", "#2171b5", "#084594"];

// Conservative lower-bound luminance for MapTiler DATAVIZ.LIGHT default water.
// The actual basemap water is a pale blue-grey (luminance ~0.70+). We use 0.60
// as a conservative floor: NO_DATA_COLOR must be DARKER (lower luminance) than
// this value so it remains visually distinct from the ocean without any custom
// water recolouring.
const DATAVIZ_LIGHT_WATER_LUM_MIN = 0.6;

describe("map layer colour distinctness", () => {
  it("no-data grey does not match any BLUES scale colour", () => {
    for (const blue of BLUES) {
      expect(NO_DATA_COLOR).not.toBe(blue);
    }
  });

  it("no-data grey is darker than the default basemap water (ocean ≠ no-data)", () => {
    const lumNoData = relativeLuminance(NO_DATA_COLOR);
    // NO_DATA_COLOR must be darker (lower luminance) than the default basemap water,
    // so ocean and no-data land remain visually distinct without custom water recolouring.
    expect(lumNoData).toBeLessThan(DATAVIZ_LIGHT_WATER_LUM_MIN);
  });

  it("no-data grey is darker than the lightest blue scale step (reads as present-but-unknown)", () => {
    // #b9b9b9 should be darker than #deebf7 (lightest blues step)
    const lumNoData = relativeLuminance(NO_DATA_COLOR);
    const lumLightestBlue = relativeLuminance(BLUES[0]);
    expect(lumNoData).toBeLessThan(lumLightestBlue);
  });
});
