/**
 * A FAMILY THAT CANNOT SET THE TEXT IS REFUSED BEFORE THE RENDER, NOT AFTER.
 *
 * Measured on 2026-09-07: `CO2` sets in the requested family at the requested weight; `CO₂` — one
 * subscript, U+2082 — drops the ENTIRE text run to a fallback face and loses the weight with it,
 * and the render exits zero with nothing anywhere going red.
 *
 * THE ANSWER IS NOW THE FONT'S OWN cmap. This suite used to assert a METRIC heuristic: lay one
 * character out in the family and in five probe families and call it missing when two
 * differently-metricked faces produced an identical width. That inference was sound and it was
 * still an inference — its own header said it wanted the cmap and could not reach one, because
 * resvg resolves a family through `loadSystemFonts` without ever exposing a path. `typefaces.mjs`
 * exposes a path, so the question is now answered by the table the rasteriser itself consults.
 *
 * THE FAMILIES CHANGED WITH IT, and that is the point rather than a side effect. The old cases were
 * Superclarendon, Iowan Old Style, Futura, Georgia, Baskerville — five faces macOS ships, none
 * redistributable, none present on a newsroom's Linux box. The ladders now carry Google families
 * that MapTiler also serves, so these are the faces a delivered beat is really set in.
 *
 * THE CHARACTERS ARE ONES THIS REPOSITORY'S BEATS REALLY SET: `CO₂` in the Swiss emissions titles,
 * the typographic apostrophe in `l'Albanie`, the en dash in a source line's year range, accented
 * capitals throughout the French copy, and the rightwards arrow a before/after treatment reaches
 * for.
 *
 * MUTATION THAT REDDENS IT: make `missingGlyphs` return `[]` unconditionally. The first three cases
 * go red, naming the family and the code point. Make it return every code point it is asked about
 * and the "does not accuse correct work" cases go red instead — the two directions are both held.
 */
import { describe, it, expect } from "bun:test";
import {
  missingGlyphs,
  assertCoversText,
  familyCovers,
  coveredCodePoints,
} from "../../../shared/chart-beat/glyph-coverage.mjs";
import { typefaceFile } from "../../../shared/design-base/typefaces.mjs";
import { LADDERS } from "../../../shared/design-base/resolve-families.mjs";

/** A COLD CACHE FETCHES, AND A FETCH IS NOT INSTANT. Every case below asks a family a question it
 *  can only answer from the family's own file, so the first run on a machine downloads seventeen of
 *  them. Bun's default five seconds is a timeout on the network, not on the assertion. */
const COLD_CACHE = 120_000;

describe("glyph coverage, read from the cmap", () => {
  it("should find the subscript that silently drops a whole run to a fallback", () => {
    // Measured from the cmaps on 2026-09-12. These three are on the ladders and none of them has
    // U+2082 — which is exactly why the ladder is walked rather than headed blindly.
    expect(missingGlyphs("Lato", "CO₂")).toEqual(["U+2082"]);
    expect(missingGlyphs("Roboto Slab", "CO₂")).toEqual(["U+2082"]);
    expect(missingGlyphs("Roboto Mono", "CO₂")).toEqual(["U+2082"]);
  }, COLD_CACHE);

  it("should pass a family that genuinely covers what it is asked for", () => {
    expect(missingGlyphs("Merriweather", "CO₂ territoire")).toEqual([]);
    expect(missingGlyphs("Open Sans", "CO₂")).toEqual([]);
    expect(missingGlyphs("Montserrat", "CO₂")).toEqual([]);
  }, COLD_CACHE);

  it("should not accuse a family over the characters French copy is full of", () => {
    // A guard that accuses correct work is a guard someone switches off. Every family heading a
    // ladder has to set the beat copy this repository actually ships.
    const copy =
      "En 2024, la Suisse a émis 32,1 Mt. L’Albanie — 100,0 % — mène. Été 1990–2024. Î Ç À Œ";
    for (const family of [
      "Merriweather",
      "Open Sans",
      "Montserrat",
      "Inter",
      "Noto Serif",
    ])
      expect(missingGlyphs(family, copy), family).toEqual([]);
  }, COLD_CACHE);

  it("should report the arrow the families that lack it really lack", () => {
    // U+2192 is the one a before/after treatment reaches for, and it splits the ladders cleanly:
    // Open Sans, Roboto and PT Serif have no arrow; Inter, Montserrat and Merriweather do.
    expect(missingGlyphs("Open Sans", "avant → après")).toEqual(["U+2192"]);
    expect(missingGlyphs("PT Serif", "avant → après")).toEqual(["U+2192"]);
    for (const family of ["Inter", "Montserrat", "Merriweather"])
      expect(missingGlyphs(family, "avant → après"), family).toEqual([]);
  }, COLD_CACHE);

  it("should tell the subscript and the superscript apart", () => {
    // `m²` is safe in Lato where `CO₂` is not: U+00B2 is in the Latin-1 supplement every Latin
    // family carries, U+2082 is not. A guard that could not tell them apart would refuse correct
    // work on half this repository's beats.
    expect(missingGlyphs("Lato", "42 m²")).toEqual([]);
    expect(missingGlyphs("Lato", "10⁰")).toEqual(["U+2070"]);
  }, COLD_CACHE);

  it("should read the same table the rasteriser will", () => {
    // The premise under everything above: the answer comes off the file the render is handed, not
    // off a family name. A cmap that reported nothing would make every case above vacuous.
    const covered = coveredCodePoints(typefaceFile("Merriweather", 400));
    expect(covered.size).toBeGreaterThan(200);
    expect(covered.has("é".codePointAt(0)!)).toBe(true);
    expect(covered.has("₂".codePointAt(0)!)).toBe(true);
    expect(covered.has(0x4e2d)).toBe(false); // 中 — a Latin face does not carry CJK
  }, COLD_CACHE);

  it("should name the family, the code point and the caller in what it throws", () => {
    let message = "";
    try {
      assertCoversText("Lato", "CO₂", { where: "display register, title" });
    } catch (error) {
      message = String(error);
    }
    expect(message).toContain("Lato");
    expect(message).toContain("U+2082");
    expect(message).toContain("display register, title");
  }, COLD_CACHE);

  it("should say nothing and throw nothing when the family covers the text", () => {
    expect(() =>
      assertCoversText("Merriweather", "CO₂ territoire", { where: "title" }),
    ).not.toThrow();
    expect(familyCovers("Merriweather", "CO₂")).toBe(true);
    expect(familyCovers("Lato", "CO₂")).toBe(false);
  }, COLD_CACHE);

  it("should refuse a family it cannot get a file for, rather than report full coverage", () => {
    // The failure mode that would make this whole guard decorative: a family nobody can fetch
    // answering "nothing missing" because nothing was checked.
    expect(() => missingGlyphs("Helvetica", "CO₂")).toThrow(/Helvetica/);
  }, COLD_CACHE);

  it("should be able to answer for every family on every ladder", () => {
    // A ladder rung that cannot be fetched is a rung that would throw mid-render instead of being
    // stepped over — the ladder's whole contract is that it can ask each candidate the question.
    const copy = "Électricité bas-carbone en 2024 — l’Albanie à 100,0 %";
    for (const [role, families] of Object.entries(LADDERS))
      for (const family of families)
        expect(
          () => missingGlyphs(family, copy),
          `${role}: ${family}`,
        ).not.toThrow();
  }, COLD_CACHE);
});
