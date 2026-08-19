/**
 * THE PREMISE, TESTED: copy this skill directory on its own into a journalist's root and its seed
 * still renders. `SKILL.md` claims this, and this file is this skill's own proof of it.
 *
 * WHY IT WAS WRITTEN, AND WHAT CHANGED SINCE. `splash/test/seed-renders-standalone.test.ts` proved
 * the same thing for four skills through a hard-coded `CRAFT` array this skill's own task could not
 * touch, so the claim was duplicated here rather than reaching outside this directory. On 2026-08-19
 * that array became a filesystem discovery (`splash/test/canon-skills.ts`) and the walking guard now
 * covers all seven canon skills, this one included. This copy is kept anyway: it is the only proof
 * that travels WITH the skill, and a journalist who receives `map-web/` alone can run it.
 *
 * The skill directory is copied into a fresh temporary root that contains nothing else — no
 * `proof/`, no `shared/`, no sibling skill, no repository — and its own `scripts/render-preview.mjs`
 * is run there. The result must match the `assets/preview.png` this repository ships (compared
 * tolerantly, by decoded pixel — see `scripts/compare-png.mjs`'s own header note: two Chrome
 * launches of identical HTML are not always byte-identical), which makes this a stronger claim than
 * "it exits 0": the isolated copy draws THE SAME PICTURE, so nothing it needed was silently supplied
 * from outside the directory.
 *
 * What the temporary root does carry, and why neither weakens the claim:
 *   - `node_modules`, symlinked. A skill's own `SKILL.md` declares its npm dependencies; a
 *     journalist's root installs them. This test is about files this repository owns, not about
 *     whether `react` is on disk.
 *   - `.env`, symlinked when the repository has one. This skill's `bake-plate.mjs` bakes its plate
 *     through a MapTiler key on a cold cache — a machine dependency `map-beat`'s own
 *     `test/canon.test.ts` already carries, carried here unchanged.
 *   - the baked plate at `/tmp/map-twin-web/plate-496` is a MACHINE-global cache outside the
 *     isolated root, the same shape `map-beat`'s own `/tmp/map-twin/plate-900` already is —
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
import { comparePngBuffers } from "../scripts/compare-png.mjs";

const SKILL_DIR = resolve(import.meta.dirname, "..");
const SKILLS = resolve(SKILL_DIR, "..");
const TWIN = resolve(SKILLS, "..");

// A cold-cache plate bake (headless Chrome + a real MapTiler capture) can take well over the
// default 5s budget the first time this runs on a machine.
setDefaultTimeout(300000);


describe("map-web's seed renders from its own sample-data, alone", () => {
  it("should render the same preview with nothing but itself on disk", async () => {
    const root = mkdtempSync(join(tmpdir(), "map-web-seed-alone-"));
    try {
      symlinkSync(join(TWIN, "node_modules"), join(root, "node_modules"));
      if (existsSync(join(TWIN, ".env")))
        symlinkSync(join(TWIN, ".env"), join(root, ".env"));
      mkdirSync(join(root, "skills"));
      const copy = join(root, "skills", "map-web");
      // Same depth as in this repository, because this skill's own scripts compute their package
      // root relatively (`resolve(HERE, "../../..")`) — a shallower sandbox would test a layout no
      // journalist has.
      cpSync(SKILL_DIR, copy, { recursive: true });
      expect(existsSync(join(root, "proof"))).toBe(false);
      expect(existsSync(join(root, "shared"))).toBe(false);
      expect(readdirSync(join(root, "skills"))).toEqual(["map-web"]);

      const out = join(root, "out");
      const run = Bun.spawnSync(
        ["bun", "scripts/render-preview.mjs", "--out", out],
        {
          cwd: copy,
        },
      );
      const detail = new TextDecoder().decode(run.stderr).slice(-2000);
      expect(`map-web exit ${run.exitCode}\n${detail}`).toContain(
        "map-web exit 0",
      );

      const rendered = readFileSync(join(out, "preview.png"));
      expect(statSync(join(out, "preview.png")).size).toBeGreaterThan(0);

      // Tolerant pixel comparison, not `.equals()` — see compare-png.mjs's own header note. It no
      // longer borrows a browser to decode: the comparator decodes PNG itself, so this comparison
      // costs nothing and every canon skill can carry the same copy of it.
      const diff = comparePngBuffers(
        rendered,
        readFileSync(join(SKILL_DIR, "assets", "preview.png")),
      );
      expect(`same: ${diff.same} (${diff.reason ?? "no diff"})`).toBe(
        `same: true (no diff)`,
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
