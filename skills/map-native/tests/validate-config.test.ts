import { describe, it, expect } from "bun:test";
import { validateChoroplethConfig } from "../src/validate-config";

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
  it("warns (furniture) when description or source is missing", () => {
    const r1 = validateChoroplethConfig({ ...ok, description: undefined });
    expect(r1.ok && r1.warnings.some((w) => /description/i.test(w))).toBe(true);
    const r2 = validateChoroplethConfig({ ...ok, source: undefined });
    expect(r2.ok && r2.warnings.some((w) => /source/i.test(w))).toBe(true);
  });
});
