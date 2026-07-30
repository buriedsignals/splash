import { describe, it, expect } from "bun:test";
import { GeographyInputSchema } from "./declaration";

const valid = {
  path: "communes-haute-savoie.geojson",
  encoding: "geojson" as const,
  crs: "EPSG:4326" as const,
  level: "communes de Haute-Savoie",
  licence: "Licence Ouverte 2.0",
  edition: "2024",
  credit: { name: "IGN — Admin Express" },
};

describe("GeographyInputSchema", () => {
  it("parses a fully declared geography", () => {
    const r = GeographyInputSchema.safeParse(valid);
    expect(r.success).toBe(true);
  });

  it("refuses a declaration with no edition — the field Splash refuses to guess", () => {
    // The spec is explicit this is the field Splash refuses most firmly to invent: three of
    // five real licences read (IGN, ONS, swisstopo) require a year or vintage nowhere in the
    // file, and the mtime cannot supply it (a 2026 re-download of a 2021 edition has a 2026
    // mtime). Omitting it must fail the parse, not silently default to "".
    const { edition, ...withoutEdition } = valid;
    const r = GeographyInputSchema.safeParse(withoutEdition);
    expect(r.success).toBe(false);
    if (!r.success)
      expect(r.error.issues.some((i) => i.path[0] === "edition")).toBe(true);
  });

  it("refuses an unknown field — strict, like SourceLedgerSchema", () => {
    const r = GeographyInputSchema.safeParse({
      ...valid,
      mapType: "choropleth",
    });
    expect(r.success).toBe(false);
  });

  it("refuses a crs outside the three accepted values", () => {
    const r = GeographyInputSchema.safeParse({ ...valid, crs: "EPSG:2056" });
    expect(r.success).toBe(false);
  });

  it("accepts a declaration with no joinKey — Splash measures instead of demanding one (R3)", () => {
    const { joinKey, ...withoutJoinKey } = { ...valid, joinKey: "INSEE_COM" };
    const r = GeographyInputSchema.safeParse(withoutJoinKey);
    expect(r.success).toBe(true);
  });
});
