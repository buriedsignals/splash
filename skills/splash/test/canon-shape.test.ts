import { describe, it, expect } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const SKILLS = join(import.meta.dirname, "..", "..");
const CRAFT = [
  "chart-beat",
  "chart-web",
  "chart-video",
  "map-beat",
];

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
