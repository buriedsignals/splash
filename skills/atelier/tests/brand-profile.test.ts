// F2 — the newsroom brand profile (house style, first cut: colours only). A per-
// project brand.json declares the house `palette` (+ optional `accent`); when present
// the producer spec is SEEDED from it and marked brandExplicit so the a11y guards
// apply policy (b). Absent/invalid → null → today's auto subject-fit behaviour.
import { describe, it, expect } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  parseBrandProfile,
  loadBrandProfile,
  seedBrandColor,
  type BrandProfile,
} from "../src/brand-profile";

function tmpProject(brandJson?: string): string {
  const dir = mkdtempSync(join(tmpdir(), "atelier-brand-"));
  if (brandJson !== undefined)
    writeFileSync(join(dir, "brand.json"), brandJson);
  return dir;
}

describe("parseBrandProfile", () => {
  it("parses a palette (+ optional accent) of #rrggbb hues", () => {
    const p = parseBrandProfile(
      '{"palette":["#E30613","#1D1D1B"],"accent":"#F5A623"}',
    );
    expect(p).toEqual({
      palette: ["#E30613", "#1D1D1B"],
      accent: "#F5A623",
    });
  });

  it("drops non-hex palette entries, keeps the valid ones", () => {
    const p = parseBrandProfile('{"palette":["#E30613","red","#1D1D1B"]}');
    expect(p?.palette).toEqual(["#E30613", "#1D1D1B"]);
  });

  it("returns null for malformed JSON", () => {
    expect(parseBrandProfile("{not json")).toBeNull();
  });

  it("returns null when there is no usable palette (→ auto path)", () => {
    expect(parseBrandProfile('{"palette":[]}')).toBeNull();
    expect(parseBrandProfile('{"accent":"#F5A623"}')).toBeNull();
  });
});

describe("loadBrandProfile", () => {
  it("reads brand.json when present", () => {
    const dir = tmpProject('{"palette":["#E30613"]}');
    try {
      expect(loadBrandProfile(dir)).toEqual({ palette: ["#E30613"] });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("returns null when brand.json is missing (auto behaviour, unchanged)", () => {
    const dir = tmpProject(); // no brand.json written
    try {
      expect(loadBrandProfile(dir)).toBeNull();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("seedBrandColor", () => {
  const brand: BrandProfile = { palette: ["#E30613", "#1D1D1B"] };

  it("seeds the primary house hue + marks brandExplicit on a spec with no colour", () => {
    const out = seedBrandColor({ title: "t" }, brand);
    expect(out.baseColor).toBe("#E30613");
    expect(out.brandExplicit).toBe(true);
  });

  it("marks brandExplicit when the spec already carries a house-palette colour", () => {
    const out = seedBrandColor({ baseColor: "#1D1D1B" }, brand);
    expect(out.baseColor).toBe("#1D1D1B");
    expect(out.brandExplicit).toBe(true);
  });

  it("does NOT mark brandExplicit for a colour outside the house palette (a11y stays strict)", () => {
    const out = seedBrandColor({ baseColor: "#0072B2" }, brand);
    expect(out.baseColor).toBe("#0072B2");
    expect(out.brandExplicit).toBe(false);
  });
});
