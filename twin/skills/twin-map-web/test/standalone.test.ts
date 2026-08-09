/**
 * THE PREMISE, TESTED: copy this skill directory on its own into a journalist's root and its seed
 * still renders. `SKILL.md` claims this, and `splash-twin/test/seed-renders-standalone.test.ts`
 * already proves it for the four ORIGINAL craft skills — its own `CRAFT` list is a fixed array in a
 * file this skill may not touch (only `twin-map-web/` is this task's own scope), so this is this
 * skill's OWN copy of that same proof, scoped to itself, duplicated rather than requesting an edit
 * to a file outside this directory — the same "duplicate, do not link" rule this project applies
 * everywhere a skill boundary would otherwise be crossed.
 *
 * The skill directory is copied into a fresh temporary root that contains nothing else — no
 * `proof/`, no `shared/`, no sibling skill, no repository — and its own `scripts/render-preview.mjs`
 * is run there. The result must be byte-identical to the `assets/preview.png` this repository ships,
 * which makes this a stronger claim than "it exits 0": the isolated copy draws THE SAME PICTURE, so
 * nothing it needed was silently supplied from outside the directory.
 *
 * What the temporary root does carry, and why neither weakens the claim:
 *   - `node_modules`, symlinked. A skill's own `SKILL.md` declares its npm dependencies; a
 *     journalist's root installs them. This test is about files this repository owns, not about
 *     whether `react` is on disk.
 *   - `.env`, symlinked when the repository has one. This skill's `bake-plate.mjs` bakes its plate
 *     through a MapTiler key on a cold cache — a machine dependency `twin-map-beat`'s own
 *     `test/canon.test.ts` already carries, carried here unchanged.
 *   - the baked plate at `/tmp/map-twin-web/plate-496` is a MACHINE-global cache outside the
 *     isolated root, the same shape `twin-map-beat`'s own `/tmp/map-twin/plate-900` already is —
 *     `render-preview.mjs`'s own `ensurePlate` bakes it once if missing and reuses it after that,
 *     from inside the isolated copy exactly as it would from this checked-out one.
 */
import { describe, it, expect, setDefaultTimeout } from "bun:test";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const SKILL_DIR = resolve(import.meta.dirname, "..");
const SKILLS = resolve(SKILL_DIR, "..");
const TWIN = resolve(SKILLS, "..");

// A cold-cache plate bake (headless Chrome + a real MapTiler capture) can take well over the
// default 5s budget the first time this runs on a machine.
setDefaultTimeout(300000);

describe("twin-map-web's seed renders from its own sample-data, alone", () => {
  it("should render the same preview with nothing but itself on disk", () => {
    const root = mkdtempSync(join(tmpdir(), "twin-map-web-seed-alone-"));
    try {
      symlinkSync(join(TWIN, "node_modules"), join(root, "node_modules"));
      if (existsSync(join(TWIN, ".env")))
        symlinkSync(join(TWIN, ".env"), join(root, ".env"));
      mkdirSync(join(root, "skills"));
      const copy = join(root, "skills", "twin-map-web");
      // Same depth as in this repository, because this skill's own scripts compute their package
      // root relatively (`resolve(HERE, "../../..")`) — a shallower sandbox would test a layout no
      // journalist has.
      cpSync(SKILL_DIR, copy, { recursive: true });
      expect(existsSync(join(root, "proof"))).toBe(false);
      expect(existsSync(join(root, "shared"))).toBe(false);
      expect(readdirSync(join(root, "skills"))).toEqual(["twin-map-web"]);

      const out = join(root, "out");
      const run = Bun.spawnSync(
        ["bun", "scripts/render-preview.mjs", "--out", out],
        {
          cwd: copy,
        },
      );
      const detail = new TextDecoder().decode(run.stderr).slice(-2000);
      expect(`twin-map-web exit ${run.exitCode}\n${detail}`).toContain(
        "twin-map-web exit 0",
      );

      const rendered = readFileSync(join(out, "preview.png"));
      expect(statSync(join(out, "preview.png")).size).toBeGreaterThan(0);
      expect(
        rendered.equals(readFileSync(join(SKILL_DIR, "assets", "preview.png"))),
      ).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
