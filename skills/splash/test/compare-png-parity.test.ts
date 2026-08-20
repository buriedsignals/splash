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
import { existsSync, readdirSync } from "node:fs";

const SKILLS = join(import.meta.dirname, "..", "..");
const CANONICAL = join(SKILLS, "splash", "scripts", "compare-png.mjs");

/** Every skill holding a copy, DISCOVERED rather than typed — the same treatment `canon-skills.ts`
 *  gives its own subject, and for a reason this file learned the hard way. It used to walk
 *  `canonSkills()`, which is the set with all four canon assets, and that was the same set as the
 *  copy-holders right up until it wasn't: `dw-beat` has no seed and no preview, delegates its
 *  rendering entirely, and still needs the decoder to read the surface an export came back on. Its
 *  copy would have sat here unwalked, which is precisely the silent divergence the copies are
 *  supposed to be paying for. A file on disk is the honest subject. */
function copyHolders(): string[] {
  return readdirSync(SKILLS, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== "splash")
    .map((entry) => entry.name)
    .filter((skill) => existsSync(join(SKILLS, skill, "scripts", "compare-png.mjs")))
    .sort();
}

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

  it("should walk every copy on disk, and at least the canon skills'", () => {
    const holders = copyHolders();
    for (const skill of canonSkills()) expect(holders).toContain(skill);
    expect(holders.length).toBeGreaterThanOrEqual(canonSkills().length);
  });

  for (const skill of copyHolders()) {
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
