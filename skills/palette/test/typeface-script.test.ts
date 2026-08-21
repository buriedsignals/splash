/**
 * THE TYPEFACE GATE STOPS BEING GREEN WHERE IT MATTERS LEAST — round five, finding X2.
 *
 * `RESOLUTION_PROBE` is `"Handgloves 0123456789 — MWmw il1 %"`, a LATIN string, and it is the only
 * thing `familyResolves` has ever laid out. So the one measurement the typeface gate makes says
 * nothing whatever about a story written in another script: on `stress-x-tunisian-water`,
 * `familyResolves("Geeza Pro")` returns true — correctly, for Latin — and rendered with that story's
 * own strings Geeza Pro draws the ASCII colon and `2025` as EMPTY BOXES.
 *
 * WHAT WAS MEASURED HERE, on this machine, 2026-08-21, and what it forces this fix to be. resvg
 * gives NO way to ask whether a family covers a string: a family it FINDS is used for the whole run
 * and the characters it lacks come out as notdef boxes, while the same characters rendered alone
 * fall back correctly, so neither a bounding box nor a per-character probe can see the boxes. Two
 * renders settle it — `المحافظة: تونس 2025` in `Geeza Pro` draws five boxes, the same string in
 * `Helvetica` draws none — and nothing in the API distinguishes them.
 *
 * So the fix is the honest half of this toolchain's lexicon policy: the probe becomes the text the
 * story will actually draw, the answer says WHICH question it answered ("does this family supply its
 * own ink for this text"), and the question it cannot answer is NAMED rather than implied.
 */
import { describe, it, expect } from "bun:test";
import { familyResolves } from "../../map-beat/scripts/render-still.mjs";
import { proposeTypeface } from "../scripts/typeface.mjs";

const HOUSE = { name: "Buried Signals", typefaces: "Space Grotesk, Courier New" };
// `stress-x-tunisian-water`'s own category axis and its own footnote year, verbatim.
const ARABIC_SAMPLE = "المحافظة: تونس 2025";

describe("familyResolves probes the text it is given, not one fixed Latin string", () => {
  it("still answers the Latin probe when given nothing else", () => {
    expect(familyResolves("Helvetica")).toBe(true);
    expect(familyResolves("NoSuchFaceExistsAnywhere-QQZX")).toBe(false);
  });

  it("answers differently for the story's own script than for Latin", () => {
    // Helvetica has no Arabic of its own: resvg falls through to the substrate's fallback, which is
    // precisely why `stress-x` records `origin: default` and gets a correct render out of it.
    expect(familyResolves("Helvetica")).toBe(true);
    expect(familyResolves("Helvetica", ARABIC_SAMPLE)).toBe(false);
  });

});

describe("proposeTypeface measures the story's own strings, and names what it could not measure", () => {
  const resolves = (family: string, sample?: string) => familyResolves(family, sample);

  it("measures every option against the sample it is given", () => {
    const proposal = proposeTypeface({ newsroom: HOUSE, resolves, sample: ARABIC_SAMPLE });
    for (const option of proposal.options) {
      if (option.origin === "default") continue;
      expect(option.drawsTheSample).toBeDefined();
    }
  });

  it("states the question the substrate cannot answer, whenever a sample was given", () => {
    const proposal = proposeTypeface({ newsroom: HOUSE, resolves, sample: ARABIC_SAMPLE });
    expect(proposal.sampleLimit).toContain("EMPTY BOXES");
    expect(proposal.sampleLimit).toContain("Geeza Pro");
  });

  // THE STATED MISS. A proposal made without the story's own text is a proposal about a Latin probe,
  // and it may not read as though it were about the story.
  it("says so when no sample was given at all", () => {
    const proposal = proposeTypeface({ newsroom: HOUSE, resolves });
    expect(proposal.sampleLimit).toContain("no sample");
    for (const option of proposal.options) expect(option.drawsTheSample).toBeNull();
  });

  it("keeps refusing a family this machine does not have, as it always did", () => {
    const proposal = proposeTypeface({
      newsroom: { name: "x", typefaces: "NoSuchFaceExistsAnywhere-QQZX" },
      resolves,
      sample: ARABIC_SAMPLE,
    });
    expect(proposal.recommended).toBe("default");
  });
});
