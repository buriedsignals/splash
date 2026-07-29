import { describe, it, expect } from "bun:test";
import {
  houseFill,
  houseRouteAccent,
  DEFAULT_MAP_FILL,
} from "../src/theme/house-ramp";
import { computeDotDensity, univariateAccent } from "../src/dot-density-geo";
import { computeRoute, QUALITATIVE } from "../src/route-geo";
import { locatorGeometry } from "../src/locator-geo";
import { runProduceMapConformance } from "../src/core/map-produce-conformance";

// A newsroom house palette: primary (brandHue) + secondaries (brandPalette).
const HOUSE = "#0A5C36"; // dark green — clears contrast on a light basemap
const PALE = "#FFF9C4"; // pale yellow — FAILS non-text contrast on a light basemap
const PALETTE = ["#0A5C36", "#C8102E", "#004B87"]; // green / red / blue

// ── SYMBOL ───────────────────────────────────────────────────────────────────────────────
// The single circle fill is mode-independent (size is the encoding), so the house hue is the
// fill in BOTH light and dark; the default stands in only when no house hue is set.
describe("symbol single-hue fill consumes brandHue", () => {
  it("uses the house hue as the fill (light and dark both read the same resolver)", () => {
    expect(houseFill(HOUSE)).toBe(HOUSE);
  });
  it("falls back to the CVD-safe default when no house hue is set", () => {
    expect(houseFill(undefined)).toBe(DEFAULT_MAP_FILL);
  });
});

// ── DOT-DENSITY ──────────────────────────────────────────────────────────────────────────
const feat = (id: string): GeoJSON.Feature => ({
  type: "Feature",
  properties: { iso_a3: id },
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [0, 0],
        [4, 0],
        [4, 4],
        [0, 4],
        [0, 0],
      ],
    ],
  },
});
const world = {
  type: "FeatureCollection",
  features: [feat("AAA"), feat("BBB")],
} as GeoJSON.FeatureCollection;

describe("dot-density univariate accent consumes brandHue (light + dark)", () => {
  for (const dark of [false, true]) {
    it(`paints every univariate dot in the house hue (dark=${dark})`, () => {
      expect(univariateAccent(dark, HOUSE)).toBe(HOUSE);
      const layout = computeDotDensity(
        {
          regionKey: "id",
          valueField: "pop",
          rows: [
            { id: "AAA", pop: 500000 },
            { id: "BBB", pop: 100000 },
          ],
          brandHue: HOUSE,
        },
        world,
        "iso_a3",
        dark,
      );
      const colors = new Set(
        layout.regions.flatMap((r) => r.groups.map((g) => g.color)),
      );
      expect([...colors]).toEqual([HOUSE]);
    });
  }
  it("keeps the default accent when no house hue is set", () => {
    expect(univariateAccent(false)).toBe(DEFAULT_MAP_FILL);
    expect(univariateAccent(true)).not.toBe(HOUSE);
  });
});

describe("dot-density multivariate categories consume brandPalette", () => {
  const layout = computeDotDensity(
    {
      regionKey: "id",
      categories: [
        { field: "a", label: "Group A" },
        { field: "b", label: "Group B" },
      ],
      rows: [
        { id: "AAA", a: 300000, b: 100000 },
        { id: "BBB", a: 50000, b: 50000 },
      ],
      brandPalette: PALETTE,
    },
    world,
    "iso_a3",
  );
  it("colours categories from the house palette, cycled and sorted", () => {
    expect(layout.legend).toEqual([
      { category: "Group A", color: PALETTE[0] },
      { category: "Group B", color: PALETTE[1] },
    ]);
  });
  it("an explicit categories[].color still wins over the house palette", () => {
    const l = computeDotDensity(
      {
        regionKey: "id",
        categories: [
          { field: "a", label: "Group A", color: "#123456" },
          { field: "b", label: "Group B" },
        ],
        rows: [{ id: "AAA", a: 300000, b: 100000 }],
        brandPalette: PALETTE,
      },
      world,
      "iso_a3",
    );
    expect(l.legend[0].color).toBe("#123456");
    expect(l.legend[1].color).toBe(PALETTE[1]);
  });
});

// ── ROUTE ────────────────────────────────────────────────────────────────────────────────
const poly = (k: string, x0: number): GeoJSON.Feature => ({
  type: "Feature",
  properties: { iso_a3: k, name: k },
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [x0, 0],
        [x0 + 1, 0],
        [x0 + 1, 1],
        [x0, 1],
        [x0, 0],
      ],
    ],
  },
});
const boundaries: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [poly("AAA", 0), poly("BBB", 1), poly("CCC", 2)],
};
const routeCrossing = [
  [0.2, 0.5],
  [1.5, 0.5],
] as [number, number][];

describe("route line + territories consume the house style (light + dark)", () => {
  for (const dark of [false, true]) {
    it(`derives the electric line FROM the house hue, keeping it as the line (dark=${dark})`, () => {
      const acc = houseRouteAccent(HOUSE, dark);
      expect(acc.line).toBe(HOUSE);
      expect(acc.glow).toMatch(/^#[0-9a-f]{6}$/);
      expect(acc.glow).not.toBe(HOUSE); // a derived lighter halo, not the raw line
    });
    it(`seeds territory polygon colours from brandPalette (dark=${dark})`, () => {
      const layout = computeRoute(
        {
          type: "route",
          route: routeCrossing,
          basemap: "world",
          mapStyle: dark ? "dataviz-dark" : "dataviz-light",
          title: "A route across two lands",
          brandPalette: PALETTE,
        },
        boundaries,
      );
      expect(layout.territories.map((t) => t.color)).toEqual([
        PALETTE[0],
        PALETTE[1],
      ]);
    });
  }
  it("an explicit palette still wins over brandPalette", () => {
    const layout = computeRoute(
      {
        type: "route",
        route: routeCrossing,
        basemap: "world",
        title: "A route across two lands",
        palette: QUALITATIVE,
        brandPalette: PALETTE,
      },
      boundaries,
    );
    expect(layout.territories.map((t) => t.color)).toEqual([
      QUALITATIVE[0],
      QUALITATIVE[1],
    ]);
  });
});

// ── LOCATOR ──────────────────────────────────────────────────────────────────────────────
describe("locator category markers consume brandPalette", () => {
  const catMarkers = [
    { lon: 2.35, lat: 48.85, label: "A", category: "hospital" },
    { lon: 2.4, lat: 48.9, label: "B", category: "clinic" },
    { lon: 2.3, lat: 48.8, label: "C", category: "school" },
  ];
  it("cycles the house palette first (sorted category order)", () => {
    const g = locatorGeometry({ markers: catMarkers, brandPalette: PALETTE });
    // sorted categories: clinic, hospital, school
    expect(g.legend).toEqual([
      { category: "clinic", color: PALETTE[0] },
      { category: "hospital", color: PALETTE[1] },
      { category: "school", color: PALETTE[2] },
    ]);
  });
  it("falls back to Okabe-Ito beyond the house palette length", () => {
    const twoTone = ["#0A5C36", "#C8102E"]; // only 2 house hues for 3 categories
    const g = locatorGeometry({ markers: catMarkers, brandPalette: twoTone });
    expect(g.legend.map((l) => l.color)).toEqual([
      twoTone[0], // clinic
      twoTone[1], // hospital
      QUALITATIVE[0], // school → overflow to Okabe-Ito
    ]);
  });
  it("a category-less locator paints its markers the house primary", () => {
    const g = locatorGeometry({
      markers: [{ lon: 2.35, lat: 48.85, label: "Solo" }],
      brandPalette: PALETTE,
    });
    expect(g.markers[0].color).toBe(PALETTE[0]);
  });
});

// ── CONTRAST WAIVER (policy b) ───────────────────────────────────────────────────────────
const cleanFurniture = {
  title: "Quakes cluster along the Pacific Ring of Fire",
  description: "Magnitude of recorded earthquakes, 2024",
  source: { name: "USGS", url: "https://example.org/x" },
};

describe("low-contrast house fill is KEPT and raises a review concern (never rejected)", () => {
  it("flags a pale house fill on a light symbol map as a concern, not a violation", () => {
    const res = runProduceMapConformance("symbol", {
      type: "symbol",
      basemap: "world",
      ...cleanFurniture,
      // ≥2 distinct points: a single point gives symbolGeometry a degenerate (zero-area)
      // bbox, which checkSymbolConformance correctly refuses as "basemap-fit impossible" —
      // orthogonal to what this test actually checks (the contrast concern below).
      points: [
        { lon: 2.35, lat: 48.85, value: 5, label: "Paris" },
        { lon: -0.12, lat: 51.5, value: 3, label: "London" },
      ],
      brandHue: PALE,
      brandExplicit: true,
    });
    expect(res.violations).toEqual([]); // kept, not rejected
    expect(res.concerns.some((c) => /contrast/i.test(c))).toBe(true);
  });
  it("flags a dark house line on a dark route map as a concern", () => {
    const res = runProduceMapConformance("route", {
      type: "route",
      basemap: "world",
      mapStyle: "dataviz-dark",
      ...cleanFurniture,
      route: [
        [2.35, 48.85],
        [-0.12, 51.5],
      ],
      brandHue: HOUSE, // dark green — fails on the dark basemap
      brandExplicit: true,
    });
    expect(res.violations).toEqual([]);
    expect(res.concerns.some((c) => /contrast/i.test(c))).toBe(true);
  });
  it("raises NO concern when the house fill clears contrast", () => {
    const res = runProduceMapConformance("symbol", {
      type: "symbol",
      basemap: "world",
      ...cleanFurniture,
      points: [{ lon: 2.35, lat: 48.85, value: 5, label: "Paris" }],
      brandHue: HOUSE, // dark green on a light basemap → passes
      brandExplicit: true,
    });
    expect(res.concerns).toEqual([]);
  });
  it("raises no single-fill concern for a palette-cycling locator", () => {
    const res = runProduceMapConformance("locator", {
      type: "locator",
      basemap: "world",
      ...cleanFurniture,
      markers: [{ lon: 2.35, lat: 48.85, label: "Paris", category: "x" }],
      brandHue: PALE,
      brandPalette: [PALE],
      brandExplicit: true,
    });
    expect(res.concerns).toEqual([]);
  });
});
