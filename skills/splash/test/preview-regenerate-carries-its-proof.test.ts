/**
 * THE MECHANISM, NOT JUST THE SYMPTOM. `canon-shape.test.ts` catches a stale `output-proof/preview.png`
 * AFTER a commit lands — it has now caught the identical defect three times on `map-web`
 * (`bc308ab8`, `97293519`, and the state this branch found in `72cbf492`), and every time a human had
 * to notice a red suite and dispatch a second command. The two prior fixes were both a manual `cp` of
 * `assets/preview.png` onto `output-proof/preview.png` after the fact — the after-the-fact catch, not
 * a change to the thing that kept forgetting.
 *
 * WHAT ACTUALLY BROKE, each time: the documented workflow was two separate commands —
 * `render-preview.mjs` (writes `assets/preview.png`) and then, sometime later or never,
 * `render-preview.mjs --out output-proof` (writes `output-proof/preview.png` from a SECOND, separate
 * render). Two commands means a human can run only the first and stop there — which is exactly what
 * happened three times. A second render is not even guaranteed to reproduce the first byte-for-byte
 * (Chrome/resvg anti-aliasing jitter — `compare-png.mjs`'s own header measures this), so even running
 * both commands is not a reliable fix.
 *
 * THE FIX: the canonical regenerate invocation (no `--out`) now writes `output-proof/preview.png` from
 * the SAME buffer, in the SAME run, right after it writes `assets/preview.png` — never a second render,
 * never a second command. This is tested here by actually running each skill's own
 * `scripts/render-preview.mjs`, with no arguments, against an isolated copy — the same standalone
 * isolation `seed-renders-standalone.test.ts` already proves is real — after first corrupting the
 * copy's own `output-proof/preview.png` so a coincidentally byte-reproducible render cannot pass this
 * test by accident: the file must be OVERWRITTEN by the run, not merely still be sitting there.
 */
import { describe, it, expect, setDefaultTimeout } from "bun:test";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { canonSkills } from "./canon-skills";

const SKILLS = join(import.meta.dirname, "..", "..");
const TWIN = join(SKILLS, "..");
const CRAFT = canonSkills();

// A remotion still (chart-video) and a plate-backed map render (map-beat) both run real renderers
// here — the same cost `seed-renders-standalone.test.ts` already pays for the same reason.
setDefaultTimeout(300000);

describe("regenerating a preview regenerates its proof, in the same run", () => {
  for (const skill of CRAFT) {
    it(`${skill}: render-preview.mjs with no --out overwrites output-proof/preview.png from the fresh render`, () => {
      const root = mkdtempSync(join(tmpdir(), "twin-proof-together-"));
      try {
        symlinkSync(join(TWIN, "node_modules"), join(root, "node_modules"));
        if (existsSync(join(TWIN, ".env")))
          symlinkSync(join(TWIN, ".env"), join(root, ".env"));
        mkdirSync(join(root, "skills"));
        const copy = join(root, "skills", skill);
        cpSync(join(SKILLS, skill), copy, { recursive: true });

        // Corrupt the copy's own proof — a stale sentinel, not a real PNG. If the script does not
        // touch this file, the sentinel survives and the assertion below fails deterministically,
        // whether or not this machine's render happens to be byte-reproducible.
        const proofPath = join(copy, "output-proof", "preview.png");
        writeFileSync(proofPath, Buffer.from("stale sentinel — not a real render"));

        const run = Bun.spawnSync(["bun", "scripts/render-preview.mjs"], {
          cwd: copy,
        });
        const detail = new TextDecoder().decode(run.stderr).slice(-2000);
        expect(`${skill} exit ${run.exitCode}\n${detail}`).toContain(
          `${skill} exit 0`,
        );

        const assetsPath = join(copy, "assets", "preview.png");
        expect(existsSync(assetsPath)).toBe(true);
        expect(existsSync(proofPath)).toBe(true);

        const freshAssets = readFileSync(assetsPath);
        const freshProof = readFileSync(proofPath);
        expect(freshProof.equals(Buffer.from("stale sentinel — not a real render"))).toBe(
          false,
        );
        expect(freshProof.equals(freshAssets)).toBe(true);
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    });
  }
});
