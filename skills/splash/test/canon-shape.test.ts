import { describe, it, expect } from "bun:test";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const SKILLS = join(import.meta.dirname, "..", "..");

/**
 * THE POPULATION IS DISCOVERED, NOT LISTED. This file used to name four craft skills by hand, and
 * the tree grew three more that render a seed of their own — image-beat, map-web, scrolly — none of
 * which the list knew about. Two of those three were carrying a stale `output-proof/preview.png`
 * the whole time, invisible because they were outside a frozen population.
 *
 * The key is `scripts/render-preview.mjs`: a skill that renders its OWN seed is a craft skill, and
 * the canon's three assets are what it owes. Keying on the script rather than on the assets matters
 * — a skill that loses its `preview.png` stays in the population and fails here, where keying on
 * the preview itself would have let it drop out silently. `dw-beat` ships no seed (it delegates
 * every render to Datawrapper) and is correctly outside.
 */
const CRAFT = readdirSync(SKILLS, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .filter((s) => existsSync(join(SKILLS, s, "scripts", "render-preview.mjs")))
  .sort();

describe("the canon's population is discovered from the tree", () => {
  it("should find craft skills to check at all", () => {
    expect(CRAFT.length).toBeGreaterThan(0);
  });
});

describe("every craft skill carries the canon's four assets", () => {
  for (const s of CRAFT) {
    it(`${s} should carry sample-data, preview.png and output-proof`, () => {
      expect(existsSync(join(SKILLS, s, "assets", "sample-data"))).toBe(true);
      expect(existsSync(join(SKILLS, s, "assets", "preview.png"))).toBe(true);
      expect(existsSync(join(SKILLS, s, "output-proof"))).toBe(true);
    });
  }
});

/**
 * `output-proof/preview.png` is a byte-identical copy of `assets/preview.png` in all four skills, and
 * only the DIRECTORY's existence was asserted above. So the preview beside the seed was
 * `--check`-guarded (each skill's own `canon.test.ts` re-renders it and fails if it drifted) while the
 * proof beside it could go stale in silence — the artifact a reader opens to see what the skill
 * produces, guarded by nothing.
 */
describe("output-proof is the preview, not a snapshot of an older seed", () => {
  for (const s of CRAFT) {
    it(`${s} should carry an output-proof byte-identical to its preview`, () => {
      const preview = readFileSync(join(SKILLS, s, "assets", "preview.png"));
      const proof = readFileSync(
        join(SKILLS, s, "output-proof", "preview.png"),
      );
      expect(proof.equals(preview)).toBe(true);
    });
  }
});
