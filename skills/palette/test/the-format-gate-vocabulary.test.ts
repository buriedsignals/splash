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
import {
  DESTINED_FORMATS,
  PUBLICATION_DESTINATIONS,
} from "../../storyboard/scripts/storyboard.mjs";
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

  // ── THE SECOND FACT, AND WHERE IT IS RECORDED ────────────────────────────────────────────────
  //
  // Round seven, defect D11, the half that spans two skills. The refusal above is correct and
  // stays; what was missing is that nothing ASKED the question or had anywhere to put the answer.
  // A slot now carries an optional `destination`, gate 2c asks for it, and this is the seam where
  // the two vocabularies meet — asserted rather than assumed, because a skill may not import
  // another skill at runtime and a table typed twice is a table that drifts.

  it("should publish to exactly the surfaces it can measure, no third word on either side", () => {
    expect([...PUBLICATION_DESTINATIONS].sort()).toEqual(Object.keys(SURFACES).sort());
  });

  // THE POPULATION IS DERIVED ACROSS THE BOUNDARY. `DESTINED_FORMATS` is the storyboard's answer to
  // "which format has to be asked"; `FORMAT_SURFACES[f].surface === null` is this skill's answer to
  // "which format does not decide a surface on its own". They are the same question measured in two
  // files, and a gate that stopped asking — or started asking about a format whose surface is
  // already settled — reddens here rather than at a render.
  it("should ask about exactly the formats this skill cannot resolve alone", () => {
    const undecided = PUBLICATION_FORMATS.filter(
      (format: string) => FORMAT_SURFACES[format].surface === null,
    );
    expect(undecided.length).toBeGreaterThan(0);
    expect([...DESTINED_FORMATS].sort()).toEqual(undecided.sort());
  });

  it("should resolve a static beat the way it resolves the other three, once the slot records where it lands", () => {
    for (const destination of PUBLICATION_DESTINATIONS) {
      expect(resolveSurface("static", destination).surface).toBe(destination);
      expect(resolveSurface("static", destination).statedAs).toBe("static");
      const p = proposePalette({ newsroom: HOUSE, surface: "static", destination });
      expect(p.surface).toBe(destination);
      expect(p.surfaceStatedAs).toBe("static");
      expect(p.ground).toBe(groundForSurface(HOUSE, destination));
      // The journalist's own word is not silently renamed, and the sentence says which record
      // settled it.
      expect(p.surfaceLimit).toContain("static");
      expect(p.surfaceLimit).toContain(`destination: ${destination}`);
    }
    // The two grounds are genuinely different, which is the whole reason the fact is asked for.
    const onPaper = proposePalette({ newsroom: HOUSE, surface: "static", destination: "print" });
    const onScreen = proposePalette({ newsroom: HOUSE, surface: "static", destination: "screen" });
    expect(onPaper.ground).not.toBe(onScreen.ground);
    expect(onPaper.groundOrigin).toBe("sheet");
    expect(onScreen.groundOrigin).toBe("newsroom");
  });

  it("should name the field and the question when a static beat has recorded neither", () => {
    for (const call of [
      () => proposePalette({ newsroom: HOUSE, surface: "static" }),
      () => proposePalette({ newsroom: HOUSE, surface: "static", destination: null }),
    ]) {
      expect(call).toThrow(/destination/);
      expect(call).toThrow(/gate 2c/);
      expect(call).toThrow(/Where does this static graphic land/);
    }
  });

  it("should refuse a destination it cannot measure, rather than reading it as a screen", () => {
    expect(() => proposePalette({ newsroom: HOUSE, surface: "static", destination: "billboard" })).toThrow(
      /destination/,
    );
    for (const word of PUBLICATION_DESTINATIONS)
      expect(() =>
        proposePalette({ newsroom: HOUSE, surface: "static", destination: "billboard" }),
      ).toThrow(new RegExp(word));
  });

  // A CONTRADICTION IS NOT A PREFERENCE. A `web` slot carrying `destination: print` is refused by
  // the storyboard gate too, in its own words; if one of them ever stops refusing, the other still
  // does, and neither guesses which half the journalist meant.
  it("should refuse a destination that contradicts the format the slot records", () => {
    for (const format of PUBLICATION_FORMATS.filter(
      (f: string) => FORMAT_SURFACES[f].surface === "screen",
    )) {
      expect(() => resolveSurface(format, "print")).toThrow(/print/);
      expect(() => resolveSurface(format, "print")).toThrow(new RegExp(format));
      expect(resolveSurface(format, "screen").surface).toBe("screen");
    }
    expect(() => resolveSurface("print", "screen")).toThrow(/disagree/);
  });

  // The surface stated on its own is unchanged: a caller who already knows it says so, and the
  // destination is the other way round to the same answer.
  it("should take a destination with no format at all", () => {
    for (const destination of PUBLICATION_DESTINATIONS)
      expect(resolveSurface(null, destination).surface).toBe(destination);
    expect(resolveSurface(null, null).surface).toBe(null);
  });

  it("should still refuse a word neither vocabulary holds, and point at both", () => {
    expect(() => proposePalette({ newsroom: HOUSE, surface: "billboard" })).toThrow(/surface/);
    expect(() => proposePalette({ newsroom: HOUSE, surface: "billboard" })).toThrow(/print/);
    expect(() => proposePalette({ newsroom: HOUSE, surface: "billboard" })).toThrow(/scrolly/);
  });
});
