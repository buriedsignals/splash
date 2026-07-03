import { describe, it, expect } from "bun:test";
import {
  PALETTES,
  resolvePalette,
  isCvdSafeRamp,
  BLUES,
  DEFAULT_SEQUENTIAL,
  DEFAULT_DIVERGING,
} from "../src/theme/scale";
import { checkPaletteConformance, looksDiverging } from "../src/conformance";

describe("palette semantic aliases (F1 — no silent failure on a subject name)", () => {
  it("resolves 'amber' (and other semantic names) to the registry ramp", () => {
    // The suggester picks palettes by subject; a semantic name must NOT throw (which,
    // inside the headless render, showed up only as a 30–60s snap timeout).
    expect(resolvePalette("sequential", "amber").ramp).toEqual(
      PALETTES.oranges.ramp,
    );
    expect(resolvePalette("sequential", "heat").ramp).toEqual(
      PALETTES.oranges.ramp,
    );
    expect(resolvePalette("sequential", "teal").ramp).toEqual(
      PALETTES.greens.ramp,
    );
  });

  it("throws a CLEAR, listable error on a truly unknown palette name", () => {
    expect(() => resolvePalette("sequential", "chartreuse")).toThrow(
      /unknown palette "chartreuse".*valid names/s,
    );
  });
});

describe("palette registry", () => {
  it("should expose sequential and diverging CVD-safe families beyond blues", () => {
    for (const name of ["blues", "greens", "oranges", "purples"])
      expect(PALETTES[name].kind).toBe("sequential");
    for (const name of ["rdbu", "orbu", "brbg", "puor"])
      expect(PALETTES[name].kind).toBe("diverging");
    for (const p of Object.values(PALETTES))
      expect(isCvdSafeRamp(p.ramp)).toBe(true);
  });

  it("should default to blues for sequential and orbu for diverging when no palette asked", () => {
    expect(resolvePalette("sequential").name).toBe(DEFAULT_SEQUENTIAL);
    expect(resolvePalette("sequential").ramp).toEqual(BLUES);
    expect(resolvePalette("diverging").name).toBe(DEFAULT_DIVERGING);
  });

  it("should resolve a named palette by name", () => {
    expect(resolvePalette("sequential", "oranges").ramp).toEqual(
      PALETTES.oranges.ramp,
    );
  });

  it("should reject a palette whose kind mismatches the scaleType", () => {
    expect(() => resolvePalette("sequential", "rdbu")).toThrow();
    expect(() => resolvePalette("diverging", "greens")).toThrow();
  });

  it("should reject an unknown palette name", () => {
    expect(() => resolvePalette("sequential", "chartreuse")).toThrow();
  });

  it("should accept a custom ramp of at least 3 steps", () => {
    const custom = ["#e5f5e0", "#41ab5d", "#005a32"];
    expect(resolvePalette("sequential", custom).ramp).toEqual(custom);
  });

  it("should flag a custom ramp with non-vetted colours as not CVD-safe", () => {
    expect(isCvdSafeRamp(["#ff0000", "#00ff00", "#0000ff"])).toBe(false);
  });
});

describe("palette guardrail — looksDiverging", () => {
  it("should read signed data straddling a midpoint as diverging", () => {
    expect(looksDiverging([-8, -3, 0, 4, 9])).toBe(true);
  });

  it("should read all-positive magnitude data as not diverging", () => {
    expect(looksDiverging([2, 5, 11, 27])).toBe(false);
  });

  it("should not read a tiny negative tail as diverging", () => {
    expect(looksDiverging([-0.1, 3, 8, 20])).toBe(false);
  });
});

describe("palette guardrail — checkPaletteConformance", () => {
  it("should fail when diverging data is rendered with a sequential scale", () => {
    const v = checkPaletteConformance({
      scaleType: "sequential",
      scaleColors: PALETTES.blues.ramp,
      values: [-9, -2, 1, 6, 10],
    });
    expect(v.some((m) => m.includes("diverging"))).toBe(true);
  });

  it("should fail when magnitude data is rendered with a diverging scale", () => {
    const v = checkPaletteConformance({
      scaleType: "diverging",
      scaleColors: PALETTES.rdbu.ramp,
      values: [2, 6, 12, 27],
    });
    expect(v.some((m) => m.includes("magnitude"))).toBe(true);
  });

  it("should fail when the ramp is not CVD-safe", () => {
    const v = checkPaletteConformance({
      scaleType: "sequential",
      scaleColors: ["#ff0000", "#00ff00", "#0000ff"],
    });
    expect(v.some((m) => m.includes("CVD-safe"))).toBe(true);
  });

  it("should fail when a subject is declared but the default palette is used", () => {
    const v = checkPaletteConformance({
      scaleType: "sequential",
      scaleColors: PALETTES.blues.ramp,
      paletteName: DEFAULT_SEQUENTIAL,
      subject: "solar energy",
    });
    expect(v.some((m) => m.includes("solar energy"))).toBe(true);
  });

  it("should pass a subject-fit sequential magnitude choropleth", () => {
    const v = checkPaletteConformance({
      scaleType: "sequential",
      scaleColors: PALETTES.oranges.ramp,
      values: [2001, 2010, 2020, 2025],
      paletteName: "oranges",
      subject: "solar energy",
    });
    expect(v).toEqual([]);
  });
});
