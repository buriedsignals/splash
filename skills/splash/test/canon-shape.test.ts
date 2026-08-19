import { describe, it, expect } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { canonSkills } from "./canon-skills";

const SKILLS = join(import.meta.dirname, "..", "..");
// Discovered, not typed. It was a hard-coded array of four until 2026-08-19, while seven skills had
// a canon — and the three it did not name had let their `output-proof` go stale in silence. See
// `canon-skills.ts` and its own test.
const CRAFT = canonSkills();

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
 * `output-proof/preview.png` is a byte-identical COPY of `assets/preview.png`, and only the
 * DIRECTORY's existence was asserted above. So the preview beside the seed was `--check`-guarded
 * (each skill's own `canon.test.ts` re-renders it and fails if it drifted) while the proof beside it
 * could go stale in silence — the artifact a reader opens to see what the skill produces, guarded by
 * nothing.
 *
 * BYTES ARE THE RIGHT QUESTION HERE, and the only place in this tree where they still are. The
 * `--check` comparisons ask whether a fresh RENDER matches a committed picture, and a render is not
 * byte-reproducible across machines, so they compare decoded pixels (`scripts/compare-png.mjs`).
 * This one compares a file to a copy of itself: `cp` is exact, so anything but exact is a copy that
 * was never made.
 *
 * WHAT IT CAUGHT THE DAY IT STOPPED NAMING ONLY FOUR SKILLS. `bc308ab8` regenerated four previews
 * and only three of the matching proofs. `map-web`'s proof was left at the older picture — 36 547 of
 * 3 686 400 pixels (0,991 %) away from a fresh render, while `assets/preview.png` was 0 away — and
 * `map-web` was one of the three skills this list did not walk.
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
