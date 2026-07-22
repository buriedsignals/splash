import { describe, it, expect } from "bun:test";
import { mapArcErrors, type MapArcBeat } from "./map-story.ts";
import { validateChoroplethConfig } from "./validate-config.ts";

const validRegions = ["Geneva", "Vaud", "Zurich", "Bern"];

describe("mapArcErrors", () => {
  it("accepts a well-formed region-anchored arc (establish→build→turn→payoff)", () => {
    const arcBeats: MapArcBeat[] = [
      { region: "Geneva", role: "establish", text: "Geneva starts low." },
      { region: "Vaud", role: "build", text: "Vaud climbs." },
      { region: "Zurich", role: "turn", text: "Zurich is the peak." },
      { region: "Bern", role: "payoff", text: "Bern lands the argument." },
    ];
    expect(mapArcErrors(arcBeats, validRegions)).toEqual([]);
  });

  it("rejects an unknown region", () => {
    const arcBeats: MapArcBeat[] = [
      { region: "Atlantis", role: "establish", text: "sets" },
    ];
    const errs = mapArcErrors(arcBeats, validRegions);
    expect(errs.some((e) => /not found|region/i.test(e))).toBe(true);
  });

  it("rejects an arc with no establish", () => {
    const arcBeats: MapArcBeat[] = [
      { region: "Vaud", role: "build", text: "climbs" },
      { region: "Bern", role: "payoff", text: "lands" },
    ];
    const errs = mapArcErrors(arcBeats, validRegions);
    expect(errs.some((e) => /open.*establish/i.test(e))).toBe(true);
  });

  it("rejects an arc with no payoff", () => {
    const arcBeats: MapArcBeat[] = [
      { region: "Geneva", role: "establish", text: "sets" },
      { region: "Vaud", role: "build", text: "climbs" },
    ];
    const errs = mapArcErrors(arcBeats, validRegions);
    expect(errs.some((e) => /close.*payoff/i.test(e))).toBe(true);
  });

  it("rejects an arc with no build", () => {
    const arcBeats: MapArcBeat[] = [
      { region: "Geneva", role: "establish", text: "sets" },
      { region: "Bern", role: "payoff", text: "lands" },
    ];
    const errs = mapArcErrors(arcBeats, validRegions);
    expect(errs.some((e) => /build/i.test(e))).toBe(true);
  });

  it("rejects more than one turn", () => {
    const arcBeats: MapArcBeat[] = [
      { region: "Geneva", role: "establish", text: "sets" },
      { region: "Vaud", role: "turn", text: "peak 1" },
      { region: "Zurich", role: "turn", text: "peak 2" },
      { region: "Bern", role: "payoff", text: "lands" },
    ];
    const errs = mapArcErrors(arcBeats, validRegions);
    expect(errs.some((e) => /turn|peak/i.test(e))).toBe(true);
  });

  it("rejects a role beat with an empty claim (text)", () => {
    const arcBeats: MapArcBeat[] = [
      { region: "Geneva", role: "establish", text: "sets" },
      { region: "Vaud", role: "build", text: "   " },
      { region: "Bern", role: "payoff", text: "lands" },
    ];
    const errs = mapArcErrors(arcBeats, validRegions);
    expect(errs.some((e) => /claim|text/i.test(e))).toBe(true);
  });

  it("stays byte-identical for legacy region-only beats (no role) — arc validation skipped", () => {
    const arcBeats: MapArcBeat[] = [{ region: "Geneva" }, { region: "Bern" }];
    expect(mapArcErrors(arcBeats, validRegions)).toEqual([]);
  });

  it("returns [] for an empty/absent arcBeats list", () => {
    expect(mapArcErrors([], validRegions)).toEqual([]);
  });
});

describe("mapArcErrors wired into validateChoroplethConfig", () => {
  const baseSpec = {
    regionKey: "region",
    valueField: "value",
    basemap: "world",
    title: "A choropleth with a real insight",
    rows: [
      { region: "Geneva", value: 10 },
      { region: "Vaud", value: 20 },
      { region: "Zurich", value: 30 },
    ],
  };

  it("passes with a well-formed arcBeats override anchored on real regions", () => {
    const result = validateChoroplethConfig({
      ...baseSpec,
      arcBeats: [
        { region: "Geneva", role: "establish", text: "Geneva starts." },
        { region: "Vaud", role: "build", text: "Vaud climbs." },
        { region: "Zurich", role: "payoff", text: "Zurich lands it." },
      ],
    });
    expect(result.ok).toBe(true);
  });

  it("fails on an arcBeats override anchored on a non-existent region", () => {
    const result = validateChoroplethConfig({
      ...baseSpec,
      arcBeats: [{ region: "Nowhere", role: "establish", text: "sets" }],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => /not found|region/i.test(e))).toBe(true);
    }
  });

  it("validates exactly as today when arcBeats is absent (behaviour-preserving)", () => {
    const result = validateChoroplethConfig(baseSpec);
    expect(result.ok).toBe(true);
  });
});
