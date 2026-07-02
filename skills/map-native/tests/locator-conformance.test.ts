import { describe, it, expect } from "bun:test";
import { validateLocatorConfig } from "../src/validate-config";
import { checkLocatorConformance } from "../src/conformance";

const okColors = { text: ["#1a1a1a"], bg: "#ffffff" };
const goodInput = {
  title: "Where the wildfires burned this summer",
  description: "Fire perimeters, June 2026",
  source: { name: "Copernicus", url: "https://x" },
  markerCount: 5,
  labeledCount: 5,
  hasCategories: true,
  hasLegend: true,
  boundsNonEmpty: true,
  mapStyle: "dataviz-dark",
};

describe("validateLocatorConfig", () => {
  it("accepts a well-formed locator config", () => {
    const r = validateLocatorConfig({
      type: "locator",
      markers: [{ lon: 2.3, lat: 48.8, label: "Paris" }],
      basemap: "world",
      title: "Key sites of the flood response",
    });
    expect(r.ok).toBe(true);
  });

  it("rejects markers with no label", () => {
    const r = validateLocatorConfig({
      type: "locator",
      markers: [{ lon: 2.3, lat: 48.8 }],
      basemap: "world",
      title: "Key sites of the flood response",
    });
    expect(r.ok).toBe(false);
  });

  it("rejects an unknown mapStyle", () => {
    const r = validateLocatorConfig({
      type: "locator",
      markers: [{ lon: 2.3, lat: 48.8, label: "Paris" }],
      basemap: "world",
      mapStyle: "neon",
      title: "Key sites of the flood response",
    });
    expect(r.ok).toBe(false);
  });
});

describe("checkLocatorConformance", () => {
  it("passes a well-formed locator", () => {
    expect(checkLocatorConformance(goodInput, okColors)).toEqual([]);
  });
  it("flags unlabeled markers", () => {
    expect(
      checkLocatorConformance({ ...goodInput, labeledCount: 3 }, okColors).join(
        " ",
      ),
    ).toContain("labeled");
  });
  it("flags missing category legend when categories are present", () => {
    expect(
      checkLocatorConformance(
        { ...goodInput, hasLegend: false },
        okColors,
      ).join(" "),
    ).toContain("legend");
  });
});
