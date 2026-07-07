import { describe, it, expect } from "bun:test";
import { validateCartogramConfig } from "../src/validate-config";
import { checkCartogramConformance } from "../src/conformance";

const okColors = { text: ["#1a1a1a"], bg: "#ffffff" };

// Four unit-square regions in a 2x2 arrangement, keyed A..D (mirrors cartogram-geo.test.ts).
const sq = (id: string, x: number, y: number): GeoJSON.Feature => ({
  type: "Feature",
  properties: { iso_a3: id },
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [x, y],
        [x + 1, y],
        [x + 1, y + 1],
        [x, y + 1],
        [x, y],
      ],
    ],
  },
});
const features: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [sq("A", 0, 1), sq("B", 2, 1), sq("C", 0, -1), sq("D", 2, -1)],
};
const values = [
  { id: "A", value: 4 },
  { id: "B", value: 16 },
  { id: "C", value: 1 },
  { id: "D", value: 9 },
];

// ─── validateCartogramConfig ────────────────────────────────────────────────

describe("validateCartogramConfig", () => {
  it("accepts a minimal valid config", () => {
    const r = validateCartogramConfig({
      type: "cartogram",
      values,
      title: "Population cartogram by region",
    });
    expect(r.ok).toBe(true);
  });

  it("accepts a full config with all optional fields", () => {
    const r = validateCartogramConfig({
      type: "cartogram",
      values,
      variant: "grid",
      scaleType: "diverging",
      bins: 5,
      title: "Population cartogram by region",
      description: "Proportional to 2026 census",
      source: { name: "INSEE", url: "https://x" },
    });
    expect(r.ok).toBe(true);
  });

  it("rejects when values is empty", () => {
    const r = validateCartogramConfig({
      type: "cartogram",
      values: [],
      title: "Population cartogram by region",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join(" ")).toContain("values");
  });

  it("rejects when a value entry has a non-numeric value", () => {
    const r = validateCartogramConfig({
      type: "cartogram",
      values: [{ id: "A", value: "bad" }],
      title: "Population cartogram by region",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join(" ")).toContain("value 0");
  });

  it("rejects an invalid variant", () => {
    const r = validateCartogramConfig({
      type: "cartogram",
      values,
      variant: "bubble",
      title: "Population cartogram by region",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join(" ")).toContain("variant");
  });

  it("rejects an invalid scaleType", () => {
    const r = validateCartogramConfig({
      type: "cartogram",
      values,
      scaleType: "rainbow",
      title: "Population cartogram by region",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join(" ")).toContain("scaleType");
  });

  it("rejects bins below 3", () => {
    const r = validateCartogramConfig({
      type: "cartogram",
      values,
      bins: 2,
      title: "Population cartogram by region",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join(" ")).toContain("bins");
  });

  it("rejects bins above 7", () => {
    const r = validateCartogramConfig({
      type: "cartogram",
      values,
      bins: 8,
      title: "Population cartogram by region",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join(" ")).toContain("bins");
  });

  it("rejects a missing title", () => {
    const r = validateCartogramConfig({
      type: "cartogram",
      values,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join(" ")).toContain("title");
  });

  it("rejects a title that is too short", () => {
    const r = validateCartogramConfig({
      type: "cartogram",
      values,
      title: "Short",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join(" ")).toContain("title");
  });
});

// ─── checkCartogramConformance ──────────────────────────────────────────────

const goodScaled = {
  title: "Population cartogram by region 2026",
  description: "Proportional squares scaled to population data",
  source: { name: "INSEE", url: "https://x" },
  values,
  variant: "scaled" as const,
  valueLabel: "pop",
  mapStyle: "dataviz-dark" as const,
  features,
};

const goodGrid = {
  ...goodScaled,
  variant: "grid" as const,
};

describe("checkCartogramConformance", () => {
  it("passes a well-formed scaled cartogram", () => {
    expect(checkCartogramConformance(goodScaled, okColors)).toEqual([]);
  });

  it("passes a well-formed grid cartogram", () => {
    expect(checkCartogramConformance(goodGrid, okColors)).toEqual([]);
  });

  it("flags a missing value label", () => {
    expect(
      checkCartogramConformance(
        { ...goodScaled, valueLabel: "" },
        okColors,
      ).join(" "),
    ).toContain("label");
  });

  it("flags an invalid mapStyle", () => {
    expect(
      checkCartogramConformance(
        { ...goodScaled, mapStyle: "neon-pink" as never },
        okColors,
      ).join(" "),
    ).toContain("mapStyle");
  });

  it("flags missing source name", () => {
    expect(
      checkCartogramConformance(
        { ...goodScaled, source: { name: "", url: "https://x" } },
        okColors,
      ).join(" "),
    ).toContain("source");
  });

  it("flags a title that is too short", () => {
    expect(
      checkCartogramConformance(
        { ...goodScaled, title: "Short" },
        okColors,
      ).join(" "),
    ).toContain("title");
  });

  it("flags a non-CVD-safe custom palette (the ramp the component actually paints)", () => {
    const r = checkCartogramConformance(
      { ...goodScaled, palette: ["#ff0000", "#00ff00", "#0000ff"] },
      okColors,
    );
    expect(r.some((m) => /palette/i.test(m))).toBe(true);
  });

  it("does not flag a named registry palette", () => {
    const r = checkCartogramConformance(
      { ...goodScaled, palette: "oranges" },
      okColors,
    );
    expect(r.some((m) => /palette/i.test(m))).toBe(false);
  });

  it("does not flag when no palette is given (library default)", () => {
    expect(checkCartogramConformance(goodScaled, okColors)).toEqual([]);
  });
});
