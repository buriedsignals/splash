/**
 * A RIGHT-TO-LEFT RUN CARRIES ITS OWN DIRECTION — round-five finding X3, walked over this format's
 * own committed beats.
 *
 * resvg runs Arabic joining and the bidi algorithm inside a run, and IGNORES SVG's `direction`
 * attribute for the paragraph. Measured 2026-08-21: three renders of one string, with
 * `direction="rtl"`, with `unicode-bidi: bidi-override` and with neither, produced identical ink —
 * and a sentence-final ASCII full stop was drawn at the visual RIGHT of the line, so the line read
 * `.الجدول`. What resvg DOES honour is the Unicode formatting characters: RLI/PDI, RLE/PDF and a
 * TRAILING RLM all place the stop correctly; a bare string and a LEADING RLM do not.
 *
 * Two things are walked, and the second is the one that matters. The unit cases prove the decision
 * can actually FAIL — a sweep that can only pass measures nothing. The sweep runs over this format's
 * own committed beats, real material, never a fixture.
 */
import { describe, expect, it } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { rtlRunsAreIsolated, beatsCalling } from "../scripts/detect-rtl-isolation.mjs";

const ROOT = join(import.meta.dirname, "..", "..", "..");
const SKILL = "scrolly";

/** A throwaway beat on disk carrying one drawn SVG. */
function beatDrawing(svg: string): string {
  const beat = mkdtempSync(join(tmpdir(), "rtl-isolation-"));
  mkdirSync(join(beat, "renders"), { recursive: true });
  writeFileSync(join(beat, "renders", "still.svg"), svg);
  return beat;
}

const drawn = (run: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg"><rect/><text x="0" y="0">${run}</text></svg>`;

describe("rtlRunsAreIsolated decides, and can fail", () => {
  it("refuses an Arabic run with no explicit direction, which resvg lays out left to right", () => {
    const found = rtlRunsAreIsolated(beatDrawing(drawn("الجدول يغطي سبع محافظات فقط.")));
    expect(found.applies).toBe(true);
    expect(found.clean).toBe(false);
    expect(found.hits.join("\n")).toContain("ignores SVG's own direction attribute");
  });

  it("refuses a run that asks for direction the one way this rasteriser ignores", () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg"><text direction="rtl" x="0" y="0">الجدول يغطي.</text></svg>';
    expect(rtlRunsAreIsolated(beatDrawing(svg)).clean).toBe(false);
  });

  it("accepts a run wrapped in an isolate — U+2067 / U+2069", () => {
    expect(rtlRunsAreIsolated(beatDrawing(drawn("⁧الجدول يغطي.⁩"))).clean).toBe(true);
  });

  it("accepts an embedding — U+202B / U+202C — which is the other form resvg honours", () => {
    expect(rtlRunsAreIsolated(beatDrawing(drawn("‫الجدول يغطي.‬"))).clean).toBe(true);
  });

  it("accepts a TRAILING right-to-left mark, and refuses a leading one, as measured", () => {
    expect(rtlRunsAreIsolated(beatDrawing(drawn("الجدول يغطي.‏"))).clean).toBe(true);
    expect(rtlRunsAreIsolated(beatDrawing(drawn("‏الجدول يغطي."))).clean).toBe(false);
  });

  it("reads a letter written as a numeric entity, because a reader still receives it", () => {
    expect(rtlRunsAreIsolated(beatDrawing(drawn("&#1575;&#1604;&#1580;&#1583;&#1608;&#1604;."))).clean).toBe(false);
  });

  it("never fires on a beat that draws no right-to-left letter at all", () => {
    expect(rtlRunsAreIsolated(beatDrawing(drawn("Tunis leads the field."))).applies).toBe(false);
  });

  it("never fires on a beat that drew no svg", () => {
    expect(rtlRunsAreIsolated(mkdtempSync(join(tmpdir(), "rtl-none-"))).applies).toBe(false);
  });

  // A `<desc>` is spoken by a screen reader, which does its own bidi, and is never laid out by this
  // rasteriser. Refusing it would be a rule about a surface the defect cannot reach.
  it("has no opinion about the <desc> a screen reader speaks", () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg"><desc>الجدول يغطي سبع محافظات.</desc><rect/></svg>';
    expect(rtlRunsAreIsolated(beatDrawing(svg)).applies).toBe(false);
  });
});

describe(`every committed ${"scrolly"} beat draws its right-to-left runs with a direction`, () => {
  const beats = beatsCalling(ROOT, SKILL);

  it("leaves no run for the rasteriser to lay out the wrong way round", () => {
    const wrong = beats
      .map((beat) => ({ beat, found: rtlRunsAreIsolated(join(ROOT, beat)) }))
      .filter(({ found }) => found.applies && !found.clean)
      .flatMap(({ beat, found }) => found.hits.map((hit: string) => `${beat} — ${hit}`));
    expect(wrong).toEqual([]);
  });
});
