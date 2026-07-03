import { describe, it, expect } from "bun:test";
import { BASEMAPS, BASEMAP_NAMES, resolveBasemapMeta } from "../src/basemaps";

describe("basemap registry (F10 — sub-national basemaps ship)", () => {
  it("ships world AND us-states, each with its join key", () => {
    expect(resolveBasemapMeta("world").joinKey).toBe("iso_a3");
    expect(resolveBasemapMeta("us-states").joinKey).toBe("postal");
    expect(BASEMAP_NAMES).toContain("us-states");
  });
  it("throws a clear, listed error on an unknown basemap (no silent world fallback)", () => {
    expect(() => resolveBasemapMeta("fr-cantons")).toThrow(
      /unknown basemap "fr-cantons".*valid basemaps/s,
    );
  });
  it("every registry entry has a join key and a human label", () => {
    for (const name of BASEMAP_NAMES) {
      expect(BASEMAPS[name].joinKey.length).toBeGreaterThan(0);
      expect(BASEMAPS[name].label.length).toBeGreaterThan(0);
    }
  });
});
