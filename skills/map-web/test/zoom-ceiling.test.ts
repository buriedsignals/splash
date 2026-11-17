import { describe, expect, it } from "bun:test";
import { zoomCeiling } from "../assets/live-locator.ts";

// A locator web page whose two closest marks already stood apart at the widest fit (gx-locator web,
// Qwen3.5-9B, mvq58): the ceiling was the widest remove's own zoom, so fitBounds could reach neither
// the region (+5.0) nor the neighbourhood (+2.4), and every remove showed the continent with JS on.

describe("zoomCeiling", () => {
  it("should reach the narrowest remove's fitted zoom when the closest marks already stand apart", () => {
    expect(zoomCeiling(3, 40, 20, [3, 5.4, 8])).toBe(8);
  });

  it("should keep the separation ceiling when it lies past every remove", () => {
    expect(zoomCeiling(3, 5, 20, [3, 4])).toBe(5);
  });

  it("should never fall below the widest remove's zoom", () => {
    expect(zoomCeiling(3, 40, 20, [])).toBe(3);
  });

  it("should ignore a remove whose fitted zoom is not a number", () => {
    expect(zoomCeiling(3, 40, 20, [Number.NaN, 6])).toBe(6);
  });
});

import { liveLocatorScript } from "../assets/live-locator.ts";

it("should carry zoomCeiling into the page's script and set the ceiling with it", async () => {
  const src = await Bun.file(new URL("../assets/live-locator.ts", import.meta.url)).text();
  expect(src).toContain("${zoomCeiling.toString()}");
  expect(src).toContain("map.setMaxZoom(zoomCeiling(outerZoom, px, need, fitZooms))");
  expect(typeof liveLocatorScript).toBe("function");
});
