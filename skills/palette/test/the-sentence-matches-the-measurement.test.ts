/**
 * EVERY SENTENCE THIS PROPOSAL PRINTS ABOUT A MEASUREMENT, CROSS-CHECKED AGAINST THE MEASUREMENT
 * ITSELF — never against the words it happens to use.
 *
 * Round seven, real story `real-gwis-wildfire-counts` (defect D8): with no profile passed and a
 * directory to look in, one output carried both of these:
 *
 *   "Measured against #FFFFFF, the ground NEWSROOM.md records."
 *   "A NEWSROOM.md exists at …/NEWSROOM.md and was not read."
 *
 * The real file records `ground: #16191B`. The first sentence attributed the paper DEFAULT to a
 * named file nothing had opened, in the same message that admits it was not opened.
 *
 * Round seven, real story `real-ember-renewables` (defect D9): the raw text of `NEWSROOM.md` was
 * passed where the parsed profile belongs. It is truthy, so it went through, and the proposal
 * reported "A newsroom profile was passed to this proposal, so its own recorded values are what
 * was measured" while measuring everything against white.
 *
 * So the tests below never assert a phrase. They assert an EQUIVALENCE between what the printed
 * sentence claims and what `groundOrigin` — the value the ratios were actually measured with —
 * says happened. Break either half and the pair goes red.
 */
import { describe, it, expect } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { proposePalette, groundProvenance, PAPER_GROUND } from "../scripts/palette.mjs";

const HOUSE = { name: "Buried Signals", brandColor: "#D4A853", accents: "#5B8A8A", ground: "#16191B" };
const NO_GROUND = { name: "Buried Signals", brandColor: "#D4A853" };
const NO_COLOURS = { name: "Buried Signals" };

/** Does this sentence CLAIM the ground came out of the newsroom's own file? */
const claimsTheRecordedGround = (says: string) => /NEWSROOM\.md/.test(says);

describe("the ground sentence and the ground measurement", () => {
  const cases: { name: string; newsroom: unknown; surface: string | null }[] = [];
  for (const [name, newsroom] of [
    ["a complete profile", HOUSE],
    ["a profile with no ground", NO_GROUND],
    ["a profile with no colours at all", NO_COLOURS],
    ["no profile", undefined],
  ] as const) {
    for (const surface of ["screen", "print", null] as const) {
      cases.push({ name: `${name}, surface ${surface ?? "unstated"}`, newsroom, surface });
    }
  }

  for (const { name, newsroom, surface } of cases) {
    it(`should name NEWSROOM.md in the ground sentence only when the ground came from it — ${name}`, () => {
      const p = proposePalette({ newsroom, subject: "wildfires in Africa", surface });
      expect(claimsTheRecordedGround(p.surfaceLimit)).toBe(p.groundOrigin === "newsroom");
    });

    it(`should measure against exactly the ground its own sentence quotes — ${name}`, () => {
      const p = proposePalette({ newsroom, subject: "wildfires in Africa", surface });
      expect(p.surfaceLimit).toContain(p.ground);
      const recorded = (newsroom as { ground?: string } | undefined)?.ground;
      // The equivalence the run broke: the ground IS the recorded one exactly when the origin says so.
      expect(p.ground === recorded).toBe(p.groundOrigin === "newsroom");
    });
  }

  it("should call the ground the PAPER DEFAULT, not the newsroom's record, when no profile was passed", () => {
    const p = proposePalette({ subject: "wildfires in Africa", surface: "screen" });
    expect(p.ground).toBe(PAPER_GROUND);
    expect(p.groundOrigin).toBe("paper-default");
    expect(claimsTheRecordedGround(p.surfaceLimit)).toBe(false);
  });

  // The exact call the real story made, with the real tree under it.
  it("should not attribute the paper default to a NEWSROOM.md it reports as unread", () => {
    const root = mkdtempSync(join(tmpdir(), "palette-sentence-"));
    try {
      writeFileSync(join(root, "NEWSROOM.md"), '---\nname: BS\nbrandColor: "#D4A853"\nground: "#16191B"\n---\n');
      const beat = join(root, "beats", "1-africa");
      mkdirSync(beat, { recursive: true });
      const p = proposePalette({ subject: "wildfires in Africa", surface: "screen", from: beat, stopAt: root });
      expect(p.newsroomLookup.found).toBe(join(root, "NEWSROOM.md"));
      // The file was found and NOT read, so no sentence may credit it with the ground measured.
      expect(claimsTheRecordedGround(p.surfaceLimit)).toBe(false);
      expect(p.surfaceLimit).not.toContain("#16191B");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("should expose the provenance as a value a caller can read, not only as prose", () => {
    expect(groundProvenance(HOUSE, "screen")).toMatchObject({ ground: "#16191B", origin: "newsroom" });
    expect(groundProvenance(HOUSE, "print")).toMatchObject({ ground: PAPER_GROUND, origin: "sheet" });
    expect(groundProvenance(HOUSE, null)).toMatchObject({ ground: "#16191B", origin: "newsroom" });
    expect(groundProvenance(undefined, "screen")).toMatchObject({ ground: PAPER_GROUND, origin: "paper-default" });
    expect(groundProvenance(NO_GROUND, "screen")).toMatchObject({ ground: PAPER_GROUND, origin: "paper-default" });
  });
});

describe("a newsroom argument of the wrong shape", () => {
  it("should REFUSE the raw text of NEWSROOM.md, naming the parser that turns it into a profile", () => {
    const text = '---\nname: BS\nbrandColor: "#D4A853"\nground: "#16191B"\n---\n';
    expect(() => proposePalette({ newsroom: text, subject: "renewables" })).toThrow(/parseNewsroom/);
    expect(() => proposePalette({ newsroom: text, subject: "renewables" })).toThrow(/newsroom/);
  });

  it("should refuse anything that is not a profile object, rather than measure against white and say it measured", () => {
    for (const wrong of [42, true, ["#D4A853"], () => "#D4A853"]) {
      expect(() => proposePalette({ newsroom: wrong, subject: "renewables" })).toThrow(/newsroom/);
    }
  });

  it("should refuse a ground that is not a hex even when no brand colour is recorded beside it", () => {
    expect(() => proposePalette({ newsroom: { ground: "nope" }, subject: "renewables" })).toThrow(/ground/);
    expect(() => proposePalette({ newsroom: { brandColor: "nope" }, subject: "renewables" })).toThrow(/brandColor/);
  });

  it("should not claim a passed profile's recorded values were measured when none of them were", () => {
    for (const newsroom of [NO_GROUND, NO_COLOURS]) {
      const p = proposePalette({ newsroom, subject: "wildfires in Africa", surface: "screen" });
      const contributed =
        p.groundOrigin === "newsroom" || p.options.some((o: { origin: string }) => o.origin === "newsroom");
      // The sentence the ember run got: "its own recorded values are what was measured".
      const claimsMeasured = /recorded values are what was measured/.test(p.newsroomLookup.says);
      expect(claimsMeasured).toBe(contributed);
    }
  });

  it("should still say its recorded values were measured when they actually were", () => {
    const p = proposePalette({ newsroom: HOUSE, subject: "wildfires in Africa", surface: "screen" });
    expect(/recorded values are what was measured/.test(p.newsroomLookup.says)).toBe(true);
  });
});
