import { describe, it, expect } from "bun:test";
import {
  validateChoroplethConfig,
  validateRouteConfig,
  validateSymbolConfig,
  validateLocatorConfig,
  validateDotDensityConfig,
  validateHexGridConfig,
  validateCartogramConfig,
} from "../src/validate-config";

const ok = {
  regionKey: "code",
  valueField: "share",
  rows: [
    { code: "NOR", share: 99 },
    { code: "POL", share: 21 },
  ],
  basemap: "world",
  title: "Renewables form a clear north–south gradient across Europe",
  description: "Share of electricity from renewables, by country, 2024",
  valueUnit: "%",
  source: { name: "Ember", url: "https://example.org" },
};

describe("validateChoroplethConfig", () => {
  it("accepts a well-formed config", () => {
    const r = validateChoroplethConfig(ok);
    expect(r.ok).toBe(true);
    expect(r.ok && r.warnings.length).toBe(0);
  });
  it("errors when rows is empty or a row lacks the keys", () => {
    expect(validateChoroplethConfig({ ...ok, rows: [] }).ok).toBe(false);
    expect(
      validateChoroplethConfig({ ...ok, rows: [{ code: "NOR" }] }).ok,
    ).toBe(false); // no share
    expect(
      validateChoroplethConfig({ ...ok, rows: [{ code: "NOR", share: "x" }] })
        .ok,
    ).toBe(false); // non-numeric
  });
  it("errors on a missing regionKey/valueField/basemap", () => {
    expect(validateChoroplethConfig({ ...ok, regionKey: "" }).ok).toBe(false);
    expect(validateChoroplethConfig({ ...ok, valueField: "" }).ok).toBe(false);
    expect(validateChoroplethConfig({ ...ok, basemap: "" }).ok).toBe(false);
  });
  it("errors on a title that is not an insight (too short / a year range)", () => {
    expect(validateChoroplethConfig({ ...ok, title: "Map" }).ok).toBe(false);
    expect(validateChoroplethConfig({ ...ok, title: "2019–2024" }).ok).toBe(
      false,
    );
  });
  it("accepts a valid named palette that matches the scaleType", () => {
    expect(
      validateChoroplethConfig({
        ...ok,
        scaleType: "sequential",
        palette: "oranges",
      }).ok,
    ).toBe(true);
  });
  it("errors on an unknown palette", () => {
    expect(validateChoroplethConfig({ ...ok, palette: "chartreuse" }).ok).toBe(
      false,
    );
  });
  it("errors when the palette kind mismatches the scaleType", () => {
    expect(
      validateChoroplethConfig({
        ...ok,
        scaleType: "sequential",
        palette: "rdbu",
      }).ok,
    ).toBe(false);
  });
  it("errors on a custom ramp that is not CVD-safe", () => {
    expect(
      validateChoroplethConfig({
        ...ok,
        palette: ["#ff0000", "#00ff00", "#0000ff"],
      }).ok,
    ).toBe(false);
  });
  it("warns (furniture) when description or source is missing", () => {
    const r1 = validateChoroplethConfig({ ...ok, description: undefined });
    expect(r1.ok && r1.warnings.some((w) => /description/i.test(w))).toBe(true);
    const r2 = validateChoroplethConfig({ ...ok, source: undefined });
    expect(r2.ok && r2.warnings.some((w) => /source/i.test(w))).toBe(true);
  });
  it("accepts a known cameraMode and rejects an unknown one", () => {
    expect(
      validateChoroplethConfig({ ...ok, cameraMode: "guided-tour" }).ok,
    ).toBe(true);
    const bad = validateChoroplethConfig({ ...ok, cameraMode: "guidedtour" });
    expect(bad.ok).toBe(false);
    if (!bad.ok)
      expect(bad.errors.some((e) => /cameraMode/.test(e))).toBe(true);
  });
});

const okSymbol = {
  type: "symbol",
  points: [
    { lon: 2.35, lat: 48.85, value: 100, label: "Paris" },
    { lon: -3.7, lat: 40.4, value: 400, label: "Madrid" },
  ],
  basemap: "world",
  title: "Madrid dwarfs Paris on this measure",
  description: "Value by city, 2024",
  valueUnit: "k",
  source: { name: "Source 2025", url: "https://example.org/x" },
};

describe("validateSymbolConfig", () => {
  it("accepts a well-formed symbol config with no warnings", () => {
    const r = validateSymbolConfig(okSymbol);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.warnings).toEqual([]);
  });
  it("rejects an out-of-range longitude", () => {
    const r = validateSymbolConfig({
      ...okSymbol,
      points: [{ lon: 200, lat: 40, value: 1 }],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => /lon/.test(e))).toBe(true);
  });
  it("rejects a non-numeric or negative value", () => {
    const bad = validateSymbolConfig({
      ...okSymbol,
      points: [{ lon: 2, lat: 48, value: -5 }],
    });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.errors.some((e) => /value/.test(e))).toBe(true);
  });
  it("rejects an empty points array", () => {
    const r = validateSymbolConfig({ ...okSymbol, points: [] });
    expect(r.ok).toBe(false);
  });
  it("rejects a title that is just a year range", () => {
    const r = validateSymbolConfig({ ...okSymbol, title: "2024" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => /title/.test(e))).toBe(true);
  });
  it("accepts a known cameraMode and rejects an unknown one", () => {
    expect(
      validateSymbolConfig({ ...okSymbol, cameraMode: "route-reveal" }).ok,
    ).toBe(true);
    const bad = validateSymbolConfig({ ...okSymbol, cameraMode: "orbit" });
    expect(bad.ok).toBe(false);
    if (!bad.ok)
      expect(bad.errors.some((e) => /cameraMode/.test(e))).toBe(true);
  });
  it("warns on missing description and source", () => {
    const r = validateSymbolConfig({
      type: "symbol",
      points: [{ lon: 2, lat: 48, value: 1 }],
      basemap: "world",
      title: "A perfectly long insight title here",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.warnings.some((w) => /description/.test(w))).toBe(true);
      expect(r.warnings.some((w) => /source/.test(w))).toBe(true);
    }
  });
});

const okRoute = {
  type: "route",
  route: [
    [89.6, 27.7],
    [90.2, 24.0],
    [90.4, 23.7],
  ],
  basemap: "world",
  mapStyle: "dataviz-dark",
  title: "The river that crosses three lands",
  description: "Its course, 2024",
  source: { name: "Source 2025", url: "https://example.org/x" },
};

describe("validateRouteConfig", () => {
  it("accepts a well-formed route config", () => {
    expect(validateRouteConfig(okRoute).ok).toBe(true);
  });
  it("rejects a route with fewer than 2 points or an out-of-range coord", () => {
    expect(validateRouteConfig({ ...okRoute, route: [[1, 1]] }).ok).toBe(false);
    expect(
      validateRouteConfig({
        ...okRoute,
        route: [
          [200, 1],
          [2, 2],
        ],
      }).ok,
    ).toBe(false);
  });
  it("rejects an empty basemap (boundary preset)", () => {
    expect(validateRouteConfig({ ...okRoute, basemap: "" }).ok).toBe(false);
  });
  it("accepts a known mapStyle and rejects an unknown one", () => {
    expect(
      validateRouteConfig({ ...okRoute, mapStyle: "dataviz-light" }).ok,
    ).toBe(true);
    const bad = validateRouteConfig({ ...okRoute, mapStyle: "midnight" });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.errors.some((e) => /mapStyle/.test(e))).toBe(true);
  });
  it("rejects a title that is not an insight", () => {
    expect(validateRouteConfig({ ...okRoute, title: "Map" }).ok).toBe(false);
  });
});

describe("validateChoroplethConfig — filters block", () => {
  const base = {
    regionKey: "iso",
    valueField: "v",
    basemap: "world",
    rows: [
      { iso: "FRA", v: 5 },
      { iso: "DEU", v: 9 },
    ],
    title: "Renewables form a clear north–south gradient across Europe",
    source: { name: "s", url: "https://example.org" },
    description: "desc",
  };
  it("rejects an invalid filters block and accepts a valid one", () => {
    expect(
      validateChoroplethConfig({
        ...base,
        filters: [{ kind: "range", field: "nope" }],
      }).ok,
    ).toBe(false);
    expect(
      validateChoroplethConfig({
        ...base,
        filters: [{ kind: "range", field: "v" }],
      }).ok,
    ).toBe(true);
  });
});

describe("validateSymbolConfig — filters wiring", () => {
  const base = {
    type: "symbol",
    points: [
      { lon: 2.35, lat: 48.85, value: 100, label: "Paris" },
      { lon: -3.7, lat: 40.4, value: 400, label: "Madrid" },
    ],
    basemap: "world",
    title: "Madrid dwarfs Paris on this measure",
    description: "Value by city, 2024",
    source: { name: "Source 2025", url: "https://example.org/x" },
  };
  it("rejects a filter referencing an absent field and accepts one referencing 'value'", () => {
    expect(
      validateSymbolConfig({
        ...base,
        filters: [{ kind: "range", field: "nope" }],
      }).ok,
    ).toBe(false);
    expect(
      validateSymbolConfig({
        ...base,
        filters: [{ kind: "range", field: "value" }],
      }).ok,
    ).toBe(true);
  });
});

describe("validateLocatorConfig — filters wiring", () => {
  const base = {
    type: "locator",
    markers: [
      { lon: 6.15, lat: 46.2, label: "Geneva" },
      { lon: 7.45, lat: 46.95, label: "Bern" },
    ],
    basemap: "world",
    title: "Two Swiss cities anchor the story",
    description: "Key locations, 2024",
    source: { name: "Source 2025", url: "https://example.org/x" },
  };
  it("rejects a filter referencing an absent field and accepts one referencing 'lon'", () => {
    expect(
      validateLocatorConfig({
        ...base,
        filters: [{ kind: "range", field: "nope" }],
      }).ok,
    ).toBe(false);
    expect(
      validateLocatorConfig({
        ...base,
        filters: [{ kind: "range", field: "lon" }],
      }).ok,
    ).toBe(true);
  });
});

describe("basemap registry — unregistered basemap is rejected by all validators", () => {
  it("rejects basemap 'france' for locator and accepts 'world'", () => {
    const locatorBase = {
      type: "locator",
      markers: [
        { lon: 6.15, lat: 46.2, label: "Geneva" },
        { lon: 7.45, lat: 46.95, label: "Bern" },
      ],
      title: "Two Swiss cities anchor the story",
      description: "Key locations, 2024",
      source: { name: "Source 2025", url: "https://example.org/x" },
    };
    const bad = validateLocatorConfig({ ...locatorBase, basemap: "france" });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.errors.some((e) => /france/.test(e))).toBe(true);
    expect(validateLocatorConfig({ ...locatorBase, basemap: "world" }).ok).toBe(
      true,
    );
  });
  it("rejects basemap 'france' for symbol and accepts 'world'", () => {
    const symbolBase = {
      type: "symbol",
      points: [{ lon: 2.35, lat: 48.85, value: 100, label: "Paris" }],
      title: "Paris dominates the national ranking",
      description: "Value by city, 2024",
      source: { name: "Source 2025", url: "https://example.org/x" },
    };
    const bad = validateSymbolConfig({ ...symbolBase, basemap: "france" });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.errors.some((e) => /france/.test(e))).toBe(true);
    expect(validateSymbolConfig({ ...symbolBase, basemap: "world" }).ok).toBe(
      true,
    );
  });
});

describe("validateDotDensityConfig — filters wiring", () => {
  const base = {
    type: "dot-density",
    regionKey: "iso",
    boundaries: "world-countries",
    rows: [
      { iso: "FRA", population: 68000000 },
      { iso: "DEU", population: 84000000 },
    ],
    valueField: "population",
    basemap: "world",
    title: "Western Europe's population clusters inland",
    description: "Population distribution, 2024",
    source: { name: "Source 2025", url: "https://example.org/x" },
  };
  it("rejects a filter referencing an absent field and accepts one referencing 'population'", () => {
    expect(
      validateDotDensityConfig({
        ...base,
        filters: [{ kind: "range", field: "nope" }],
      }).ok,
    ).toBe(false);
    expect(
      validateDotDensityConfig({
        ...base,
        filters: [{ kind: "range", field: "population" }],
      }).ok,
    ).toBe(true);
  });
  it("rejects a category filter for dot-density", () => {
    const rows = [
      { iso: "FRA", population: 68000000, region: "west" },
      { iso: "DEU", population: 84000000, region: "east" },
      { iso: "ESP", population: 47000000, region: "south" },
    ];
    const r = validateDotDensityConfig({
      ...base,
      rows,
      filters: [{ kind: "category", field: "region" }],
    });
    expect(r.ok).toBe(false);
    if (!r.ok)
      expect(
        r.errors.some((e) =>
          e.includes("category filters are not supported for dot-density maps"),
        ),
      ).toBe(true);
  });
  it("accepts a range filter for dot-density", () => {
    expect(
      validateDotDensityConfig({
        ...base,
        filters: [{ kind: "range", field: "population" }],
      }).ok,
    ).toBe(true);
  });
});

describe("validateHexGridConfig — filters wiring", () => {
  const base = {
    type: "hex-grid",
    points: [
      { lon: 2.35, lat: 48.85, value: 12 },
      { lon: -3.7, lat: 40.4, value: 7 },
    ],
    aggregate: "sum",
    basemap: "world",
    title: "Incident density peaks around the capital",
    description: "Incidents by cell, 2024",
    source: { name: "Source 2025", url: "https://example.org/x" },
  };
  it("rejects a filter referencing an absent field and accepts one referencing 'value'", () => {
    expect(
      validateHexGridConfig({
        ...base,
        filters: [{ kind: "range", field: "nope" }],
      }).ok,
    ).toBe(false);
    expect(
      validateHexGridConfig({
        ...base,
        filters: [{ kind: "range", field: "value" }],
      }).ok,
    ).toBe(true);
  });
});

describe("validateCartogramConfig — filters wiring", () => {
  const base = {
    type: "cartogram",
    values: [
      { id: "FRA", value: 68 },
      { id: "DEU", value: 84 },
    ],
    title: "Germany outweighs France in population share",
    description: "Population by country, 2024",
    source: { name: "Source 2025", url: "https://example.org/x" },
  };
  it("rejects a filter referencing an absent field and accepts one referencing 'value'", () => {
    expect(
      validateCartogramConfig({
        ...base,
        filters: [{ kind: "range", field: "nope" }],
      }).ok,
    ).toBe(false);
    expect(
      validateCartogramConfig({
        ...base,
        filters: [{ kind: "range", field: "value" }],
      }).ok,
    ).toBe(true);
  });
});
