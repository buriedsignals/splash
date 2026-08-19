/**
 * EIGHT COPIES OF ONE DECISION, held byte-identical.
 *
 * `comparePngBuffers` answers "is this the same PICTURE" for every canon guard in the tree. A skill
 * never imports another skill, so each canon skill carries its own copy and `skills/splash` carries
 * the canonical one — the same treatment `render-still.mjs` and the timing vocabulary already get in
 * `root-template-shared.test.ts`, and for the same reason: the risk a copy buys is silent
 * divergence, and the only thing that pays it back is a test that walks all of them.
 *
 * BYTE-IDENTICAL, not merely equivalent. There is nothing skill-specific in this file — no path, no
 * threshold, no format — so a copy that differs at all differs by accident, and a guard whose
 * tolerance quietly drifted in one skill would let that skill ship a picture its neighbours refuse.
 * That is the exact shape of "a creation process weaker than another" this whole chantier exists to
 * make impossible.
 */
import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { canonSkills } from "./canon-skills";

const SKILLS = join(import.meta.dirname, "..", "..");
const CANONICAL = join(SKILLS, "splash", "scripts", "compare-png.mjs");

describe("every canon skill carries the same picture comparator", () => {
  const canonical = readFileSync(CANONICAL, "utf8");

  it("should have a canonical copy that really is the comparator", () => {
    expect(canonical).toContain("export function comparePngBuffers");
    expect(canonical).toContain("export function decodePng");
    // The two numbers every copy has to agree on, asserted here so a drift in ANY copy is a diff
    // against a value this file names out loud rather than against an opaque blob.
    expect(canonical).toContain("tolerance = 6");
    expect(canonical).toContain("maxDiffFraction = 0.002");
  });

  for (const skill of canonSkills()) {
    it(`${skill} should carry a copy byte-identical to splash's`, () => {
      const copy = readFileSync(
        join(SKILLS, skill, "scripts", "compare-png.mjs"),
        "utf8",
      );
      expect(`${skill}\n${copy}`).toBe(`${skill}\n${canonical}`);
    });
  }

  it("should have every canon skill's --check use it, none left comparing bytes", () => {
    const offenders: string[] = [];
    for (const skill of canonSkills()) {
      const render = readFileSync(
        join(SKILLS, skill, "scripts", "render-preview.mjs"),
        "utf8",
      );
      if (!render.includes("comparePngBuffers"))
        offenders.push(`${skill}: no comparator`);
      // The exact expression that was wrong in six skills at once, named so a reintroduction reads
      // as itself in the failure output.
      if (/committed\.equals\(/.test(render))
        offenders.push(`${skill}: still asks committed.equals(...)`);
    }
    expect(offenders).toEqual([]);
  });
});
