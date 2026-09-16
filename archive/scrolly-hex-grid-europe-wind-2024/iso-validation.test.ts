// Named test for the friction this beat's own cold run logged (2026-09-16): plan.mjs's ISO A2 table was a
// partial copy of the worked example's own 32 countries, and each missing code was discovered one refusal at
// a time. This asserts the fix: `hexMapPlan` now validates the beat's WHOLE country list (hosts + origin) in
// one call, against the shared canonical table, and names every missing code together.
import { describe, expect, it } from "bun:test";
import { MissingIso2CodesError } from "#shared/map-beat/iso-codes.mjs";
import { hexMapPlan } from "./plan.mjs";

const colours = {
  sea: "#000",
  land: "#111",
  neutral: "#222",
  originFill: "#333",
  originEdge: "#444",
  border: "#555",
};
const strokes = { border: 1 };
const camera = { camX: 0.5, camY: 0.5, camZoom: 3, camBearing: 0, camPitch: 0 };
const base = {
  colours,
  strokes,
  camera,
  referenceWidth: 100,
  referenceHeight: 100,
};

describe("hexMapPlan's own country validation", () => {
  it("should build a plan for a valid host list with no origin", () => {
    const plan = hexMapPlan({
      hosts: ["DEU", "FRA", "ITA"],
      origin: null,
      ...base,
    });
    expect(plan.layers.some((l) => l.id === "hosts")).toBe(true);
    expect(plan.layers.some((l) => l.id === "origin")).toBe(false);
  });

  it("should build a plan for a valid host list with an origin country", () => {
    const plan = hexMapPlan({ hosts: ["DEU", "FRA"], origin: "UKR", ...base });
    expect(plan.layers.some((l) => l.id === "origin")).toBe(true);
    expect(plan.layers.some((l) => l.id === "origin-edge")).toBe(true);
  });

  it("should refuse a host list carrying an unrecognised code, naming it", () => {
    expect(() =>
      hexMapPlan({ hosts: ["DEU", "ZZZ"], origin: null, ...base }),
    ).toThrow(MissingIso2CodesError);
  });

  it("should report every missing code together, hosts and origin alike, not one at a time", () => {
    try {
      hexMapPlan({ hosts: ["DEU", "ZZZ", "FRA"], origin: "YYY", ...base });
      throw new Error("expected hexMapPlan to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(MissingIso2CodesError);
      expect(error.codes).toEqual(["ZZZ", "YYY"]);
    }
  });
});
