import { describe, it, expect } from "bun:test";
import { validateMapSpec } from "../map-spec";

const valid = {
  mapType: "choropleth",
  basemap: "world-2019",
  mapKeyAttr: "DW_STATE_CODE",
  regionKey: "code",
  valueColumn: "value",
  data: "code,value\nFRA,10\nDEU,40\nSWE,70",
  title: "Sweden leads renewable adoption in western Europe",
  altInsight: "Sweden has the highest value (70); France the lowest (10)",
};

describe("validateMapSpec — choropleth", () => {
  it("passes a complete choropleth spec", () => {
    const r = validateMapSpec(valid);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.warnings).toEqual([]);
  });

  it("rejects an unknown mapType", () => {
    const r = validateMapSpec({ ...valid, mapType: "heatmap" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join()).toMatch(/choropleth.*symbol.*locator/);
  });

  it("requires basemap, mapKeyAttr, title, altInsight", () => {
    for (const f of ["basemap", "mapKeyAttr", "title", "altInsight"]) {
      const r = validateMapSpec({ ...valid, [f]: "" });
      expect(r.ok).toBe(false);
    }
  });

  it("fails when regionKey is not a column of the data (key-bound)", () => {
    const r = validateMapSpec({ ...valid, regionKey: "iso" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join()).toMatch(/regionKey/);
  });

  it("fails when valueColumn is not a column of the data (key-bound)", () => {
    const r = validateMapSpec({ ...valid, valueColumn: "amount" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join()).toMatch(/valueColumn/);
  });

  it("fails on a malformed colour stop", () => {
    const r = validateMapSpec({
      ...valid,
      colorScale: [
        { color: "blue", position: 0 },
        { color: "#0072B2", position: 1 },
      ],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join()).toMatch(/colorScale/i);
  });

  it("fails when colour stop positions are out of 0..1 or not ascending", () => {
    const desc = validateMapSpec({
      ...valid,
      colorScale: [
        { color: "#0072B2", position: 1 },
        { color: "#deebf7", position: 0 },
      ],
    });
    expect(desc.ok).toBe(false);
    const oob = validateMapSpec({
      ...valid,
      colorScale: [
        { color: "#deebf7", position: 0 },
        { color: "#0072B2", position: 2 },
      ],
    });
    expect(oob.ok).toBe(false);
  });

  it("accepts a valid two-stop blue colorScale", () => {
    const r = validateMapSpec({
      ...valid,
      colorScale: [
        { color: "#deebf7", position: 0 },
        { color: "#0072B2", position: 1 },
      ],
    });
    expect(r.ok).toBe(true);
  });

  it("warns when the title looks like a bare label, not an insight", () => {
    const r = validateMapSpec({ ...valid, title: "value" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.warnings.join()).toMatch(/label/);
  });

  it("accepts a valid numeral numberFormat with no warning", () => {
    const r = validateMapSpec({ ...valid, numberFormat: "0%" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.warnings).toEqual([]);
  });

  // Mirrors dw-chart's chart-spec.ts guard: a printf/Python leftover token is silently
  // unrecognised by Datawrapper and the legend falls back to bare numbers — warn so the
  // caller (the ② suggester layer) knows its token was auto-corrected.
  it("warns when numberFormat is a printf-style token that gets auto-corrected", () => {
    const r = validateMapSpec({ ...valid, numberFormat: ".0f%" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.warnings.join()).toMatch(/numberFormat/);
  });

  it("fails on an un-mappable numberFormat", () => {
    const r = validateMapSpec({ ...valid, numberFormat: "%s" });
    expect(r.ok).toBe(false);
  });

  it("#1c — warns when a '%' numberFormat is applied to 0–1 fractional value data", () => {
    const r = validateMapSpec({
      ...valid,
      data: "code,value\nFRA,0.10\nDEU,0.40\nSWE,0.70",
      numberFormat: "0%",
    });
    expect(r.ok).toBe(true);
    if (r.ok)
      expect(
        r.warnings.some((w) => /appends "%" WITHOUT multiplying/.test(w)),
      ).toBe(true);
  });

  it("#1c — does NOT warn when the '%' value data is already percentage points", () => {
    const r = validateMapSpec({ ...valid, numberFormat: "0%" }); // values 10/40/70
    expect(r.ok).toBe(true);
    if (r.ok)
      expect(
        r.warnings.some((w) => /appends "%" WITHOUT multiplying/.test(w)),
      ).toBe(false);
  });

  it("#1b — accepts a unit suffix on a choropleth (no error, no warning)", () => {
    const r = validateMapSpec({ ...valid, unit: "%" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.warnings).toEqual([]);
  });
});

const validSymbol = {
  mapType: "symbol",
  basemap: "france-metropolitan-departments",
  latColumn: "lat",
  lonColumn: "lon",
  sizeColumn: "population",
  data: "city,lat,lon,population\nParis,48.85,2.35,2100\nLyon,45.76,4.83,520",
  title: "Population concentrates in Paris and Lyon",
  altInsight: "Paris (2.1M) dwarfs Lyon (0.52M) among these French cities",
};

describe("validateMapSpec — symbol", () => {
  it("passes a complete symbol spec (with the #2 hover-only legibility warning)", () => {
    const r = validateMapSpec(validSymbol);
    expect(r.ok).toBe(true);
    // #2 — every DW symbol map is hover-only, so it always carries the 'not directly
    // labeled' warning steering static-legibility cases to map-native.
    if (r.ok)
      expect(r.warnings).toEqual([
        "symbol map is not directly labeled — Datawrapper draws proportional circles with values on HOVER only (it cannot label symbols by data column), so the static export is not legible without interaction; use map-native (which labels the top-N circles by name + value) for a statically-legible proportional-symbol map",
      ]);
  });

  it("#2 — the not-directly-labeled warning fires on every symbol map (steer static to map-native)", () => {
    const r = validateMapSpec(validSymbol);
    expect(r.ok).toBe(true);
    if (r.ok)
      expect(r.warnings.some((w) => /not directly labeled/.test(w))).toBe(true);
  });

  it("#2 — a choropleth is NOT flagged as unlabeled (it can label by column)", () => {
    const r = validateMapSpec(valid);
    expect(r.ok).toBe(true);
    if (r.ok)
      expect(r.warnings.some((w) => /not directly labeled/.test(w))).toBe(
        false,
      );
  });

  it("requires lat/lon/size columns and they must be real data columns", () => {
    for (const f of ["latColumn", "lonColumn", "sizeColumn"]) {
      const missing = validateMapSpec({ ...validSymbol, [f]: "" });
      expect(missing.ok).toBe(false);
      const wrong = validateMapSpec({ ...validSymbol, [f]: "nope" });
      expect(wrong.ok).toBe(false);
      if (!wrong.ok) expect(wrong.errors.join()).toMatch(new RegExp(f));
    }
  });

  it("fails when an optional colorColumn is not a data column", () => {
    const r = validateMapSpec({ ...validSymbol, colorColumn: "ghost" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join()).toMatch(/colorColumn/);
  });

  it("requires basemap and altInsight", () => {
    for (const f of ["basemap", "altInsight"]) {
      const r = validateMapSpec({ ...validSymbol, [f]: "" });
      expect(r.ok).toBe(false);
    }
  });

  it("validates colorScale stops like choropleth", () => {
    const r = validateMapSpec({
      ...validSymbol,
      colorScale: [{ color: "notahex", position: 0 }],
    });
    expect(r.ok).toBe(false);
  });
});

const validLocator = {
  mapType: "locator",
  title: "Three sites along the Arve valley",
  altInsight: "Annemasse, Geneva and Chamonix marked along the Arve",
  markers: [
    { lng: 6.2347, lat: 46.1939, label: "Annemasse" },
    { lng: 6.1432, lat: 46.2044, label: "Geneva" },
    { lng: 6.8694, lat: 45.9237, label: "Chamonix" },
  ],
};

describe("validateMapSpec — locator", () => {
  it("passes a complete locator spec", () => {
    const r = validateMapSpec(validLocator);
    expect(r.ok).toBe(true);
  });

  it("requires a non-empty markers array", () => {
    const empty = validateMapSpec({ ...validLocator, markers: [] });
    expect(empty.ok).toBe(false);
    if (!empty.ok) expect(empty.errors.join()).toMatch(/markers/);
    const missing = validateMapSpec({ ...validLocator, markers: undefined });
    expect(missing.ok).toBe(false);
  });

  it("fails on out-of-range coordinates", () => {
    const badLng = validateMapSpec({
      ...validLocator,
      markers: [{ lng: 999, lat: 46, label: "x" }],
    });
    expect(badLng.ok).toBe(false);
    if (!badLng.ok) expect(badLng.errors.join()).toMatch(/lng/);
    const badLat = validateMapSpec({
      ...validLocator,
      markers: [{ lng: 6, lat: 200, label: "x" }],
    });
    expect(badLat.ok).toBe(false);
    if (!badLat.ok) expect(badLat.errors.join()).toMatch(/lat/);
  });

  it("requires a label on every marker", () => {
    const r = validateMapSpec({
      ...validLocator,
      markers: [{ lng: 6, lat: 46, label: "" }],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join()).toMatch(/label/);
  });

  it("fails on a malformed marker colour", () => {
    const r = validateMapSpec({
      ...validLocator,
      markers: [{ lng: 6, lat: 46, label: "x", color: "red" }],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join()).toMatch(/color/);
  });

  it("requires title and altInsight", () => {
    for (const f of ["title", "altInsight"]) {
      const r = validateMapSpec({ ...validLocator, [f]: "" });
      expect(r.ok).toBe(false);
    }
  });

  it("warns to prefer map-native for a sub-national / regional extent", () => {
    // Lamerd ↔ Kuwait ≈ 5° span — map-dw renders inland Lamerd offshore here.
    const r = validateMapSpec({
      ...validLocator,
      markers: [
        { lng: 53.1804, lat: 27.3424, label: "Lamerd" },
        { lng: 47.9774, lat: 29.3759, label: "Kuwait" },
      ],
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.warnings.join()).toMatch(/prefer map-native/);
  });

  it("does NOT warn for a wide continental / global extent", () => {
    // European capitals span ~40° of longitude — map-dw's basemap is fine.
    const r = validateMapSpec({
      ...validLocator,
      markers: [
        { lng: -9.14, lat: 38.72, label: "Lisbon" },
        { lng: 30.52, lat: 50.45, label: "Kyiv" },
      ],
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.warnings.join()).not.toMatch(/prefer map-native/);
  });
});
