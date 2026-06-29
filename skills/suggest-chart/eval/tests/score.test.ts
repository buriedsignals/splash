import { describe, it, expect } from "bun:test";
import { scoreSpec } from "../score";

const validMap = {
  producer: "map-dw",
  mapType: "choropleth",
  basemap: "world",
  mapKeyAttr: "ISO_A3",
  regionKey: "code",
  valueColumn: "share",
  title: "Renewables form a clear north–south gradient across Europe",
  altInsight: "Norway leads at 99%, France at 27%",
  source: { name: "Ember", url: "https://example.org" },
  data: "code,share\nNOR,99\nFRA,27",
};

describe("scoreSpec — map routing", () => {
  it("passes a valid map when a map is expected", () => {
    const r = scoreSpec(validMap, { family: "geographic", element: "map" });
    expect(r.pass).toBe(true);
  });
  it("fails when a map is expected but a chart was emitted (under-routing)", () => {
    const chart = {
      type: "d3-bars",
      title: "x",
      data: "code,share\nNOR,99",
      altInsight: "x",
    };
    const r = scoreSpec(chart, { family: "geographic", element: "map" });
    expect(r.pass).toBe(false);
    expect(r.notes.some((n) => /map/i.test(n))).toBe(true);
  });
  it("fails when a chart is expected but a map was emitted (Gate 5: ranking should stay bars)", () => {
    const r = scoreSpec(validMap, { family: "ranking", element: "chart" });
    expect(r.pass).toBe(false);
    expect(r.notes.some((n) => /map|gate 5/i.test(n))).toBe(true);
  });
  it("defaults element to chart (existing behaviour unchanged)", () => {
    const chart = {
      type: "d3-bars",
      title: "Departments by budget share",
      data: "department,budget\nEducation,42\nRoads,31\nHealth,28",
      altInsight: "Education gets the largest share",
      baseColor: "#0072B2",
      sort: "desc",
    };
    const r = scoreSpec(chart, { family: "ranking" }); // no element → chart
    expect(r.validates).toBe(true);
  });
});

const validLine = {
  type: "d3-lines",
  title: "Unemployment fell to a five-year low",
  data: "year,value\n2018,5.1\n2023,3.7",
  altInsight: "Unemployment fell from 5.1% in 2018 to 3.7% in 2023",
  baseColor: "#0072B2",
};

describe("scoreSpec", () => {
  it("passes a valid spec in the right family with no warnings", () => {
    const r = scoreSpec(validLine, {
      family: "change-over-time",
      maxWarnings: 0,
    });
    expect(r.validates).toBe(true);
    expect(r.familyMatch).toBe(true);
    expect(r.guardrailsOk).toBe(true);
    expect(r.pass).toBe(true);
  });

  it("fails and notes an invalid spec", () => {
    const r = scoreSpec(
      { ...validLine, title: "" },
      { family: "change-over-time" },
    );
    expect(r.validates).toBe(false);
    expect(r.pass).toBe(false);
    expect(r.notes.join()).toMatch(/invalid/);
  });

  it("fails when the type is outside the expected family", () => {
    const r = scoreSpec(validLine, { family: "ranking" });
    expect(r.validates).toBe(true);
    expect(r.familyMatch).toBe(false);
    expect(r.pass).toBe(false);
    expect(r.notes.join()).toMatch(/not in family/);
  });

  it("fails when warnings exceed maxWarnings", () => {
    const labelTitle = { ...validLine, title: "year" };
    const r = scoreSpec(labelTitle, {
      family: "change-over-time",
      maxWarnings: 0,
    });
    expect(r.validates).toBe(true);
    expect(r.guardrailsOk).toBe(false);
    expect(r.pass).toBe(false);
    expect(r.notes.join()).toMatch(/warnings/);
  });

  it("passes a no-chart decision when family is none", () => {
    const r = scoreSpec(
      { decision: "no-chart", reason: "data too thin" },
      { family: "none" },
    );
    expect(r.pass).toBe(true);
  });

  it("fails when a chart is emitted but no-chart was expected", () => {
    const r = scoreSpec(validLine, { family: "none" });
    expect(r.pass).toBe(false);
    expect(r.notes.join()).toMatch(/no-chart/);
  });
});

const nativeMap = {
  producer: "map-native",
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

describe("scoreSpec — native map", () => {
  it("passes a valid map-native config when producer map-native is expected", () => {
    const r = scoreSpec(nativeMap, {
      family: "geographic",
      element: "map",
      producer: "map-native",
    });
    expect(r.pass).toBe(true);
  });
  it("fails when producer map-native is expected but a map-dw spec was emitted", () => {
    const mapDw = {
      producer: "map-dw",
      mapType: "choropleth",
      basemap: "world",
      mapKeyAttr: "ISO_A3",
      regionKey: "code",
      valueColumn: "share",
      data: "code,share\nNOR,99",
      title: "Renewables form a clear north–south gradient across Europe",
      altInsight: "north high, south low",
    };
    const r = scoreSpec(mapDw, {
      family: "geographic",
      element: "map",
      producer: "map-native",
    });
    expect(r.pass).toBe(false);
    expect(r.notes.some((n) => /producer/i.test(n))).toBe(true);
  });
  it("still accepts a map-dw spec when producer is unset (element-level only)", () => {
    const mapDw = {
      producer: "map-dw",
      mapType: "choropleth",
      basemap: "world",
      mapKeyAttr: "ISO_A3",
      regionKey: "code",
      valueColumn: "share",
      data: "code,share\nNOR,99",
      title: "Renewables form a clear north–south gradient across Europe",
      altInsight: "north high, south low",
    };
    expect(
      scoreSpec(mapDw, { family: "geographic", element: "map" }).validates,
    ).toBe(true);
  });
});
