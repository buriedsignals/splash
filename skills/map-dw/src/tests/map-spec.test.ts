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

describe("validateMapSpec", () => {
  it("passes a complete choropleth spec", () => {
    const r = validateMapSpec(valid);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.warnings).toEqual([]);
  });

  it("rejects a non-choropleth mapType (deferred types)", () => {
    const r = validateMapSpec({ ...valid, mapType: "symbols" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join()).toMatch(/choropleth/);
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
});
