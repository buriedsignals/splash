/**
 * WHO THE CANON GUARDS WALK, AND WHY IT IS NOT A LIST ANYONE TYPES.
 *
 * `canon-shape.test.ts` and `seed-renders-standalone.test.ts` each carried the same hard-coded array
 * of FOUR skills. Seven have a canon. The three the arrays did not name — `image-beat`, `map-web`,
 * `scrolly` — were guarded by nothing on the output-proof side, and it had already cost something
 * measurable: `assets/preview.png` was regenerated in `bc308ab8` (2026-08-11) and
 * `output-proof/preview.png` was not, leaving `map-web` 0,992 % and `scrolly` 0,202 % of their pixels
 * apart from the picture they claim to prove, in silence.
 *
 * A hard-coded list cannot fail that way once; it fails that way every time a skill is added. So the
 * list is DISCOVERED from the filesystem — a skill has a canon if it carries all four canon assets —
 * and this file is the guard on the discovery itself: an exclusion must be written down WITH ITS
 * REASON, and a skill that grows a canon is walked from that moment without anyone remembering to
 * add it.
 */
import { describe, it, expect } from "bun:test";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { CANON_ASSETS, EXCLUDED, canonSkills } from "./canon-skills";

const SKILLS = join(import.meta.dirname, "..", "..");

describe("the canon guards walk every skill that has a canon", () => {
  it("should discover the seven skills that carry all four canon assets", () => {
    expect(canonSkills()).toEqual([
      "chart-beat",
      "chart-video",
      "chart-web",
      "image-beat",
      "map-beat",
      "map-web",
      "scrolly",
    ]);
  });

  it("should find every discovered skill really carrying all four canon assets", () => {
    for (const skill of canonSkills())
      for (const asset of CANON_ASSETS)
        expect(`${skill}/${asset}`).toBe(
          existsSync(join(SKILLS, skill, asset))
            ? `${skill}/${asset}`
            : `${skill}/${asset} MISSING`,
        );
  });

  it("should exclude no skill that has a canon without writing the reason beside it", () => {
    for (const [skill, reason] of Object.entries(EXCLUDED)) {
      expect(typeof reason).toBe("string");
      expect(reason.length).toBeGreaterThan(40);
    }
  });

  it("should name no skill in the exclusion list that does not exist", () => {
    const dirs = readdirSync(SKILLS, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
    for (const skill of Object.keys(EXCLUDED)) expect(dirs).toContain(skill);
  });

  it("should refuse a skill that grows a canon and is neither walked nor excluded", () => {
    // The whole point, stated as an assertion rather than as a convention: the two guards' subject
    // is `canonSkills() ∪ EXCLUDED`, and that union is the filesystem's answer, not an author's.
    const carriers = readdirSync(SKILLS, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .filter((skill) =>
        CANON_ASSETS.every((asset) => existsSync(join(SKILLS, skill, asset))),
      );
    expect(carriers.sort()).toEqual(
      [...canonSkills(), ...Object.keys(EXCLUDED)].sort(),
    );
  });
});
