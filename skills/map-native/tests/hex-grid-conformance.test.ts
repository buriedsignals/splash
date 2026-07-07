import { describe, it, expect } from "bun:test";
import { validateHexGridConfig } from "../src/validate-config";
import { checkHexGridConformance } from "../src/conformance";

const okColors = { text: ["#1a1a1a"], bg: "#ffffff" };
const good = {
  title: "Where the earthquakes cluster",
  description: "Seismic events binned into 50km hexagons, 2026",
  source: { name: "USGS", url: "https://x" },
  hasBinLegend: true,
  hasAggregateLabel: true,
  cellCount: 180,
  boundsNonEmpty: true,
  mapStyle: "dataviz-dark",
};

describe("validateHexGridConfig", () => {
  it("accepts a count config", () => {
    const r = validateHexGridConfig({
      type: "hex-grid",
      points: [{ lon: 2, lat: 48 }],
      basemap: "world",
      title: "Where the earthquakes cluster",
    });
    expect(r.ok).toBe(true);
  });
  it("rejects sum/mean when points lack value", () => {
    const r = validateHexGridConfig({
      type: "hex-grid",
      points: [{ lon: 2, lat: 48 }],
      aggregate: "mean",
      basemap: "world",
      title: "Where the earthquakes cluster",
    });
    expect(r.ok).toBe(false);
  });
  it("rejects an invalid binShape", () => {
    const r = validateHexGridConfig({
      type: "hex-grid",
      points: [{ lon: 2, lat: 48 }],
      binShape: "triangle",
      basemap: "world",
      title: "Where the earthquakes cluster",
    });
    expect(r.ok).toBe(false);
  });
  it("rejects a non-CVD-safe custom palette", () => {
    const r = validateHexGridConfig({
      type: "hex-grid",
      points: [{ lon: 2, lat: 48 }],
      basemap: "world",
      title: "Where the earthquakes cluster",
      palette: ["#ff0000", "#00ff00", "#0000ff"],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join(" ")).toContain("palette");
  });
  it("accepts a named registry palette", () => {
    const r = validateHexGridConfig({
      type: "hex-grid",
      points: [{ lon: 2, lat: 48 }],
      basemap: "world",
      title: "Where the earthquakes cluster",
      palette: "oranges",
    });
    expect(r.ok).toBe(true);
  });
});

describe("checkHexGridConformance", () => {
  it("passes a well-formed hex-grid", () => {
    expect(checkHexGridConformance(good, okColors)).toEqual([]);
  });
  it("flags a missing bin legend", () => {
    expect(
      checkHexGridConformance({ ...good, hasBinLegend: false }, okColors).join(
        " ",
      ),
    ).toContain("legend");
  });
  it("flags zero cells", () => {
    expect(
      checkHexGridConformance({ ...good, cellCount: 0 }, okColors).join(" "),
    ).toContain("cell");
  });
  it("flags a non-CVD-safe custom palette (the ramp the component actually paints)", () => {
    const r = checkHexGridConformance(
      { ...good, palette: ["#ff0000", "#00ff00", "#0000ff"] },
      okColors,
    );
    expect(r.some((m) => /palette/i.test(m))).toBe(true);
  });
  it("does not flag a named registry palette", () => {
    const r = checkHexGridConformance(
      { ...good, palette: "oranges" },
      okColors,
    );
    expect(r.some((m) => /palette/i.test(m))).toBe(false);
  });
  it("does not flag when no palette is given (library default BLUES)", () => {
    expect(checkHexGridConformance(good, okColors)).toEqual([]);
  });
});
