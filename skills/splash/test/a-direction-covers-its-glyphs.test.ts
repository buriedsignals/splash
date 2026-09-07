/**
 * A FAMILY THAT CANNOT SET THE TEXT IS REFUSED BEFORE THE RENDER, NOT AFTER.
 *
 * Measured on 2026-09-07: `CO2` sets in the requested family at the requested weight; `CO₂` — one
 * subscript, U+2082 — drops the ENTIRE text run to a fallback face and loses the weight with it.
 * Superclarendon, Iowan Old Style and Futura, three for three, and the render exits zero. Nothing
 * anywhere goes red.
 *
 * It does not bite today only because the default family is `Helvetica, Arial, sans-serif`, which
 * covers the subscript. It bites the day a newsroom records a display serif — which is the day the
 * design base's directions axis opens.
 *
 * THE DETECTION IS EXACT, not a heuristic, and this is why: two families that differ on a control
 * string cannot produce an IDENTICAL width for the same glyph unless both fell back to the same
 * face. Measured widths at 100px — control "Ho": Superclarendon 149.0, Iowan 131.3, Futura 128.8,
 * Helvetica 123.8, Georgia 131.9, Baskerville 126.6, all distinct. Then "₂": Superclarendon, Iowan
 * and Futura all exactly 42.4 while Helvetica reads 25.7, Georgia 43.9 and Baskerville 26.9. The
 * three that collapse are the three that lack it.
 */
import { describe, it, expect } from "bun:test";
import {
  missingGlyphs,
  assertCoversText,
  familyCovers,
} from "../../../shared/chart-beat/glyph-coverage.mjs";

describe("glyph coverage", () => {
  it("should find the subscript that silently drops a whole run to a fallback", () => {
    expect(missingGlyphs("Superclarendon", "CO₂")).toEqual(["U+2082"]);
    expect(missingGlyphs("Iowan Old Style", "CO₂")).toEqual(["U+2082"]);
    expect(missingGlyphs("Futura", "CO₂")).toEqual(["U+2082"]);
  });

  it("should pass a family that genuinely covers what it is asked for", () => {
    expect(missingGlyphs("Helvetica", "CO₂ territoire")).toEqual([]);
    expect(missingGlyphs("Georgia", "CO₂")).toEqual([]);
    expect(missingGlyphs("Baskerville", "CO₂")).toEqual([]);
  });

  it("should not accuse a family over characters every family carries", () => {
    // A guard that accuses correct work is a guard someone switches off.
    for (const family of [
      "Superclarendon",
      "Iowan Old Style",
      "Futura",
      "Helvetica",
    ])
      expect(
        missingGlyphs(family, "En 2024, la Suisse a émis 32,1 Mt."),
        family,
      ).toEqual([]);
  });

  it("should catch a glyph only two families lack, where one collapse is the whole signal", () => {
    // A first version required TWO collapses before accusing a family, on the reasoning that one
    // might be coincidence. A sweep across 264 family-character pairs found the case that refutes
    // it: `⁰` (U+2070) measures 51.5 in BOTH Superclarendon and Futura, while the other four probes
    // read 34.1, 25.7, 45.1 and 25.8. Two faces twenty pixels apart on the control do not agree to
    // a hundredth of a pixel by accident. At a threshold of two, both were reported as covering a
    // character neither has.
    expect(missingGlyphs("Superclarendon", "10⁰")).toEqual(["U+2070"]);
    expect(missingGlyphs("Futura", "10⁰")).toEqual(["U+2070"]);
    for (const family of ["Iowan Old Style", "Helvetica", "Georgia", "Baskerville"])
      expect(missingGlyphs(family, "10⁰"), family).toEqual([]);
  });

  it("should leave the superscript two alone, which every probe family carries", () => {
    // The subscript fails and the superscript does not: `m²` is safe where `CO₂` is not, and a
    // guard that could not tell them apart would be refusing correct work.
    for (const family of ["Superclarendon", "Iowan Old Style", "Futura", "Helvetica"])
      expect(missingGlyphs(family, "42 m²"), family).toEqual([]);
  });

  it("should report a character no family on this machine carries", () => {
    // The rightwards arrow measures 78.3 in all six probe families: nobody has it, everybody falls
    // back. A treatment that reached for one would ship a run in the wrong face.
    expect(missingGlyphs("Georgia", "avant → après")).toEqual(["U+2192"]);
  });

  it("should name the family, the code point and the caller in what it throws", () => {
    // All three, in whatever order reads best: a reader needs to know which family, which glyph,
    // and where it was being set, and none of the three is inferable from the other two.
    let message = "";
    try {
      assertCoversText("Superclarendon", "CO₂", {
        where: "display register, title",
      });
    } catch (error) {
      message = String(error);
    }
    expect(message).toContain("Superclarendon");
    expect(message).toContain("U+2082");
    expect(message).toContain("display register, title");
  });

  it("should say nothing and throw nothing when the family covers the text", () => {
    expect(() =>
      assertCoversText("Helvetica", "CO₂ territoire", { where: "title" }),
    ).not.toThrow();
    expect(familyCovers("Helvetica", "CO₂")).toBe(true);
    expect(familyCovers("Futura", "CO₂")).toBe(false);
  });
});
