import { describe, it, expect } from "bun:test";
import { scoreMapSpec } from "../score";

const good = {
  mapType: "choropleth",
  basemap: "world-2019",
  mapKeyAttr: "DW_STATE_CODE",
  regionKey: "code",
  valueColumn: "value",
  data: "code,value\nFRA,10\nSWE,70",
  title: "Sweden leads western Europe on this measure",
  altInsight: "Sweden highest at 70, France lowest at 10",
};

describe("scoreMapSpec", () => {
  it("passes a valid, key-bound spec on a known basemap", () => {
    const r = scoreMapSpec(good, { basemap: "world-2019", maxWarnings: 0 });
    expect(r.validates).toBe(true);
    expect(r.basemapKnown).toBe(true);
    expect(r.keyBound).toBe(true);
    expect(r.conformanceOk).toBe(true);
    expect(r.pass).toBe(true);
  });

  it("fails and notes an invalid spec", () => {
    const r = scoreMapSpec(
      { ...good, altInsight: "" },
      { basemap: "world-2019" },
    );
    expect(r.validates).toBe(false);
    expect(r.pass).toBe(false);
    expect(r.notes.join()).toMatch(/invalid/);
  });

  it("fails when the basemap is not in the known allowlist", () => {
    const r = scoreMapSpec(
      { ...good, basemap: "narnia-2030" },
      { basemap: "narnia-2030" },
    );
    expect(r.basemapKnown).toBe(false);
    expect(r.pass).toBe(false);
  });

  it("fails when keys are not bound to the data", () => {
    const r = scoreMapSpec(
      { ...good, regionKey: "iso" },
      { basemap: "world-2019" },
    );
    expect(r.keyBound).toBe(false);
    expect(r.pass).toBe(false);
  });

  it("fails conformance when a label-like title exceeds maxWarnings", () => {
    const r = scoreMapSpec(
      { ...good, title: "value" },
      { basemap: "world-2019", maxWarnings: 0 },
    );
    expect(r.validates).toBe(true);
    expect(r.conformanceOk).toBe(false);
    expect(r.pass).toBe(false);
  });
});

const goodSymbol = {
  mapType: "symbol",
  basemap: "france-metropolitan-departments",
  latColumn: "lat",
  lonColumn: "lon",
  sizeColumn: "population",
  data: "city,lat,lon,population\nParis,48.85,2.35,2100\nLyon,45.76,4.83,520",
  title: "Population concentrates in Paris",
  altInsight: "Paris far larger than Lyon",
};

describe("scoreMapSpec — symbol", () => {
  it("rejects a symbol spec and routes it to map-native (static circles are unlabeled)", () => {
    // #2 — map-dw symbol maps are retired as a claim-carrying producer: Datawrapper draws
    // proportional circles with values on HOVER only, so the owned static PNG ships mute,
    // unlabeled circles. The gate must FAIL a symbol spec regardless of maxWarnings and steer
    // it to map-native, whose proportional-symbol renderer labels the circles by name + value.
    const r = scoreMapSpec(goodSymbol, {
      basemap: "france-metropolitan-departments",
      maxWarnings: 1,
    });
    expect(r.validates).toBe(false);
    expect(r.pass).toBe(false);
    expect(r.notes.join()).toMatch(/map-native/);
  });
});

// Sub-national extent (~0.1°): validates, but the REGIONAL_EXTENT_DEG guardrail warns
// to steer a regional point map toward map-native (map-dw generalizes coastlines here).
const regionalLocator = {
  mapType: "locator",
  title: "Three sites along the Arve valley",
  altInsight: "Annemasse, Geneva, Chamonix",
  markers: [
    { lng: 6.2347, lat: 46.1939, label: "Annemasse" },
    { lng: 6.1432, lat: 46.2044, label: "Geneva" },
  ],
};

// National extent (≥ REGIONAL_EXTENT_DEG): map-dw's basemap is fine at this zoom, so a
// well-formed spec passes cleanly with no tight-extent warning.
const nationalLocator = {
  mapType: "locator",
  title: "Three capitals across western Europe",
  altInsight: "Lisbon, Rome, Berlin",
  markers: [
    { lng: -9.14, lat: 38.72, label: "Lisbon" },
    { lng: 12.49, lat: 41.9, label: "Rome" },
    { lng: 13.4, lat: 52.52, label: "Berlin" },
  ],
};

describe("scoreMapSpec — locator", () => {
  it("passes a valid national-extent locator with markers and no basemap", () => {
    const r = scoreMapSpec(nationalLocator, {});
    expect(r.validates).toBe(true);
    expect(r.basemapKnown).toBe(true); // no basemap needed
    expect(r.keyBound).toBe(true);
    expect(r.pass).toBe(true);
  });

  it("fails an invalid locator spec (no markers)", () => {
    const r = scoreMapSpec({ ...nationalLocator, markers: [] }, {});
    expect(r.validates).toBe(false);
    expect(r.pass).toBe(false);
  });

  it("warns on a sub-national locator and only passes when the warning is allowed", () => {
    const strict = scoreMapSpec(regionalLocator, {});
    expect(strict.validates).toBe(true); // structurally valid…
    expect(strict.pass).toBe(false); // …but the tight-extent warning fails the strict gate
    expect(strict.notes.some((n) => n.includes("map-native"))).toBe(true);

    const lenient = scoreMapSpec(regionalLocator, { maxWarnings: 1 });
    expect(lenient.pass).toBe(true);
  });
});
