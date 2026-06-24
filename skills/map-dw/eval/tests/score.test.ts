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
  it("passes a valid, lat/lon/size-bound symbol spec on a known basemap", () => {
    const r = scoreMapSpec(goodSymbol, {
      basemap: "france-metropolitan-departments",
    });
    expect(r.validates).toBe(true);
    expect(r.basemapKnown).toBe(true);
    expect(r.keyBound).toBe(true);
    expect(r.pass).toBe(true);
  });

  it("fails when a size/lat/lon column is not bound to the data", () => {
    const r = scoreMapSpec(
      { ...goodSymbol, sizeColumn: "ghost" },
      { basemap: "france-metropolitan-departments" },
    );
    expect(r.pass).toBe(false);
  });
});

const goodLocator = {
  mapType: "locator",
  title: "Three sites along the Arve valley",
  altInsight: "Annemasse, Geneva, Chamonix",
  markers: [
    { lng: 6.2347, lat: 46.1939, label: "Annemasse" },
    { lng: 6.1432, lat: 46.2044, label: "Geneva" },
  ],
};

describe("scoreMapSpec — locator", () => {
  it("passes a valid locator spec with markers and no basemap", () => {
    const r = scoreMapSpec(goodLocator, {});
    expect(r.validates).toBe(true);
    expect(r.basemapKnown).toBe(true); // no basemap needed
    expect(r.keyBound).toBe(true);
    expect(r.pass).toBe(true);
  });

  it("fails an invalid locator spec (no markers)", () => {
    const r = scoreMapSpec({ ...goodLocator, markers: [] }, {});
    expect(r.validates).toBe(false);
    expect(r.pass).toBe(false);
  });
});
