/**
 * THE OTHER VOCABULARY FOR "WHERE THIS GOES", AND THE ONE WORD THE TWO SHARE.
 *
 * Round seven, defect D11. Gate 2b offers "Static / print" and records `static`; passing that
 * recorded format into `proposePalette` — the obvious next call, and the one a real run made —
 * threw `surface must be one of screen, print — got "static"`, with nothing said about why the two
 * vocabularies differ or which fact the surface needs that the format does not carry.
 *
 * The population below is DERIVED from the gate's own list, never typed here: a format added to
 * `storyboard/scripts/format-gate.mjs` fails this test until `FORMAT_SURFACES` answers for it.
 * A skill may not import another skill at runtime; a skill's `test/` directory may, solely to
 * assert two implementations agree (`splash/test/no-cross-skill-imports.test.ts` says so in as
 * many words), which is why the derivation lives here.
 */
import { describe, it, expect } from "bun:test";
import { PUBLICATION_FORMATS } from "../../storyboard/scripts/format-gate.mjs";
import { FORMAT_SURFACES, SURFACES, resolveSurface, proposePalette, groundForSurface } from "../scripts/palette.mjs";

const HOUSE = { name: "Buried Signals", brandColor: "#D4A853", accents: "#5B8A8A", ground: "#16191B" };

describe("the format vocabulary this skill has to answer for", () => {
  it("should hold an answer for every format gate 2b can record, and for no word it cannot", () => {
    expect(Object.keys(FORMAT_SURFACES).sort()).toEqual([...PUBLICATION_FORMATS].sort());
  });

  it("should resolve every format to a surface this skill measures, or to a stated refusal", () => {
    for (const format of PUBLICATION_FORMATS) {
      const answer = FORMAT_SURFACES[format];
      expect(answer.because.length).toBeGreaterThan(20);
      if (answer.surface === null) {
        expect(() => resolveSurface(format)).toThrow(answer.because);
      } else {
        expect(Object.keys(SURFACES)).toContain(answer.surface);
        expect(resolveSurface(format).surface).toBe(answer.surface);
      }
    }
  });

  it("should measure a web, video or scrolly beat on the newsroom's screen ground, as the surface it resolves to would", () => {
    for (const format of PUBLICATION_FORMATS.filter((f: string) => FORMAT_SURFACES[f].surface === "screen")) {
      expect(groundForSurface(HOUSE, format)).toBe(groundForSurface(HOUSE, "screen"));
      const p = proposePalette({ newsroom: HOUSE, subject: "wildfires", surface: format });
      expect(p.surface).toBe("screen");
      expect(p.surfaceStatedAs).toBe(format);
      // The journalist's own word is not silently renamed: the translation is said out loud.
      expect(p.surfaceLimit).toContain(format);
    }
  });

  it("should refuse the one format that does not decide a surface, naming the fact it is missing", () => {
    expect(() => proposePalette({ newsroom: HOUSE, surface: "static" })).toThrow(/FORMAT/);
    expect(() => proposePalette({ newsroom: HOUSE, surface: "static" })).toThrow(/screen/);
    expect(() => proposePalette({ newsroom: HOUSE, surface: "static" })).toThrow(/print/);
    // and never by measuring it as one of them anyway
    expect(FORMAT_SURFACES.static.surface).toBeNull();
  });

  it("should still refuse a word neither vocabulary holds, and point at both", () => {
    expect(() => proposePalette({ newsroom: HOUSE, surface: "billboard" })).toThrow(/surface/);
    expect(() => proposePalette({ newsroom: HOUSE, surface: "billboard" })).toThrow(/print/);
    expect(() => proposePalette({ newsroom: HOUSE, surface: "billboard" })).toThrow(/scrolly/);
  });
});
