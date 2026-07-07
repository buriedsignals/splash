import { describe, it, expect } from "bun:test";
import {
  runProduceMapConformance,
  RAMP_TYPES,
} from "../src/core/map-produce-conformance";
import { MAP_TYPES } from "../src/map-types";

// Shared clean furniture for the 7 per-type configs below.
const source = { name: "Ember 2025", url: "https://example.org/x" };
const cleanTitle = "Renewables power most of Europe's north";
const cleanDescription = "Share of electricity from renewables, 2024";

// Minimal, realistic per-type configs — shapes lifted from `assets/sample-data/*.json`
// and the `*ConfigShape` types in `src/validate-config.ts`.
const configs: Record<(typeof MAP_TYPES)[number], Record<string, unknown>> = {
  choropleth: {
    // No `type` field — choropleth is the mount.tsx default, exercised separately below.
    basemap: "world",
    regionKey: "code",
    valueField: "share",
    title: cleanTitle,
    description: cleanDescription,
    source,
    rows: [
      { code: "NOR", share: 99 },
      { code: "SWE", share: 68 },
      { code: "DEU", share: 59 },
      { code: "FRA", share: 27 },
    ],
  },
  symbol: {
    type: "symbol",
    basemap: "world",
    title: cleanTitle,
    description: cleanDescription,
    valueUnit: "$bn",
    source,
    points: [
      { lon: 2.3522, lat: 48.8566, value: 181, label: "Paris" },
      { lon: -0.1276, lat: 51.5072, value: 296, label: "London" },
    ],
  },
  route: {
    type: "route",
    basemap: "world",
    title: cleanTitle,
    description: cleanDescription,
    source,
    route: [
      [2.3522, 48.8566],
      [-0.1276, 51.5072],
    ],
  },
  locator: {
    type: "locator",
    basemap: "world",
    markerStyle: "pin",
    title: cleanTitle,
    description: cleanDescription,
    source,
    markers: [
      { lon: 2.3699, lat: 48.8503, label: "Pont d'Austerlitz" },
      { lon: 2.3499, lat: 48.853, label: "Notre-Dame" },
    ],
  },
  "dot-density": {
    type: "dot-density",
    basemap: "world",
    boundaries: "world",
    regionKey: "iso_a3",
    valueField: "population",
    title: cleanTitle,
    description: cleanDescription,
    source,
    rows: [
      { iso_a3: "DEU", population: 84000000 },
      { iso_a3: "FRA", population: 68000000 },
    ],
  },
  "hex-grid": {
    type: "hex-grid",
    basemap: "world",
    aggregate: "count",
    binShape: "hex",
    title: cleanTitle,
    description: cleanDescription,
    source,
    points: [
      { lon: -0.0377, lat: 51.2629 },
      { lon: -0.3925, lat: 51.2551 },
      { lon: -0.5423, lat: 51.6124 },
    ],
  },
  cartogram: {
    type: "cartogram",
    variant: "scaled",
    basemap: "world",
    scaleType: "sequential",
    valueLabel: "CO₂ emissions (Mt)",
    title: cleanTitle,
    description: cleanDescription,
    source,
    values: [
      { id: "CHN", value: 11397 },
      { id: "IND", value: 2830 },
      { id: "RUS", value: 1769 },
    ],
  },
};

describe("runProduceMapConformance — type-less default normalization", () => {
  it("guards a type-less config as choropleth (checked:true)", () => {
    const result = runProduceMapConformance(undefined, configs.choropleth);
    expect(result.checked).toBe(true);
  });

  it("flags a type-less config with a bad title (proves the guard actually runs)", () => {
    const result = runProduceMapConformance(undefined, {
      ...configs.choropleth,
      title: "ALL CAPS TITLE HERE",
    });
    expect(result.checked).toBe(true);
    expect(result.violations.some((m) => /ALL CAPS/.test(m))).toBe(true);
  });

  it("flags a type-less config with a too-short title", () => {
    const result = runProduceMapConformance(undefined, {
      ...configs.choropleth,
      title: "Too short",
    });
    expect(result.violations.some((m) => /too short/.test(m))).toBe(true);
  });
});

describe("runProduceMapConformance — ramp palette arm (produce-time)", () => {
  it("flags a non-CVD-safe custom palette on hex-grid", () => {
    const result = runProduceMapConformance("hex-grid", {
      ...configs["hex-grid"],
      palette: ["#f00", "#0f0", "#00f"],
    });
    expect(result.checked).toBe(true);
    expect(result.violations.some((m) => /CVD-safe/.test(m))).toBe(true);
  });

  it("flags a non-CVD-safe custom palette on cartogram", () => {
    const result = runProduceMapConformance("cartogram", {
      ...configs.cartogram,
      palette: ["#f00", "#0f0", "#00f"],
    });
    expect(result.checked).toBe(true);
    expect(result.violations.some((m) => /CVD-safe/.test(m))).toBe(true);
  });

  it("flags a non-CVD-safe custom palette on choropleth", () => {
    const result = runProduceMapConformance("choropleth", {
      ...configs.choropleth,
      palette: ["#f00", "#0f0", "#00f"],
    });
    expect(result.checked).toBe(true);
    expect(result.violations.some((m) => /CVD-safe/.test(m))).toBe(true);
  });

  it("does not run the ramp arm for non-ramp types (e.g. symbol)", () => {
    // symbol has no scale palette at all — passing a bogus `palette` key must be a no-op.
    const result = runProduceMapConformance("symbol", {
      ...configs.symbol,
      palette: ["#f00", "#0f0", "#00f"],
    });
    expect(result.violations).toEqual([]);
  });
});

// Bug #6 regression: hex-grid always paints `resolvePalette("sequential", data.palette)`
// (hex-grid-geo.ts) — it never reads a `scaleType` off its config at all
// (`HexGridConfigShape` has no such field). Before this fix, the guard's RAMP arm read
// `config.scaleType` for every RAMP_TYPES member including hex-grid, so a stray
// `scaleType:"diverging"` could steer the guard toward a ramp the renderer never paints —
// either a false-positive refusal of valid sequential data, or a clean pass for a diverging
// palette that then throws at render time (`resolvePalette("sequential", "rdbu")`).
describe("runProduceMapConformance — hex-grid pins sequential (bug #6)", () => {
  // All-positive aggregate values, with an explicit stray `scaleType:"diverging"` the
  // renderer would never look at.
  const hexAllPositive: Record<string, unknown> = {
    ...configs["hex-grid"],
    aggregate: "sum",
    points: [
      { lon: -0.0377, lat: 51.2629, value: 5 },
      { lon: -0.3925, lat: 51.2551, value: 12 },
      { lon: -0.5423, lat: 51.6124, value: 8 },
    ],
    scaleType: "diverging",
  };

  it("does not false-refuse all-positive hex data carrying a stray scaleType:diverging", () => {
    // OLD behavior: the guard would have honoured config.scaleType="diverging", resolved
    // the default diverging ramp (no throw — it exists), then flagged the semantic
    // mismatch "data is all one sign (magnitude) but the scale is diverging" — a
    // false-positive refusal of a config the renderer paints perfectly fine as sequential.
    const result = runProduceMapConformance("hex-grid", hexAllPositive);
    expect(result.checked).toBe(true);
    expect(
      result.violations.some((m) => /but the scale is diverging/.test(m)),
    ).toBe(false);
    expect(result.violations).toEqual([]);
  });

  it("flags a diverging-only palette instead of green-lighting a config that crashes at render", () => {
    // Same stray scaleType:"diverging", now paired with a palette that is ONLY valid under
    // a diverging scale ("rdbu"). OLD behavior: scaleType read from config → "diverging" →
    // resolvePalette("diverging", "rdbu") succeeds (rdbu IS diverging-kind) → clean pass,
    // checked:true, violations:[] — then the real renderer calls
    // resolvePalette("sequential", "rdbu") and THROWS, crashing the produce run after the
    // guard already green-lit it. NEW behavior: the guard pins "sequential" the same way
    // the renderer does, so resolvePalette("sequential", "rdbu") throws HERE, inside the
    // guard's own try/catch — a clean violation instead of a greenlight-then-crash.
    const result = runProduceMapConformance("hex-grid", {
      ...hexAllPositive,
      palette: "rdbu",
    });
    expect(result.checked).toBe(true);
    expect(result.violations.some((m) => /palette/i.test(m))).toBe(true);
    expect(
      result.violations.some((m) => /rdbu.*diverging.*sequential/.test(m)),
    ).toBe(true);
  });
});

describe("runProduceMapConformance — clean config per type", () => {
  for (const type of MAP_TYPES) {
    it(`passes a clean ${type} config with no violations`, () => {
      const result = runProduceMapConformance(type, configs[type]);
      expect(result.checked).toBe(true);
      expect(result.violations).toEqual([]);
    });
  }
});

describe("runProduceMapConformance — unknown type", () => {
  it("returns a violation (not checked:false) for a typo'd type", () => {
    const result = runProduceMapConformance("bogus", configs.choropleth);
    expect(result.checked).toBe(true);
    expect(
      result.violations.some((m) => /unknown map type "bogus"/.test(m)),
    ).toBe(true);
  });
});

describe("runProduceMapConformance — dark theme furniture", () => {
  it("does not false-flag a clean dataviz-dark config on contrast", () => {
    const result = runProduceMapConformance("choropleth", {
      ...configs.choropleth,
      mapStyle: "dataviz-dark",
    });
    expect(result.checked).toBe(true);
    expect(result.violations).toEqual([]);
  });
});

describe("MAP_PRODUCE_GUARDED_TYPES / RAMP_TYPES", () => {
  it("names exactly the 3 ramp-driven types", () => {
    expect([...RAMP_TYPES].sort()).toEqual(
      ["cartogram", "choropleth", "hex-grid"].sort(),
    );
  });
});
