/**
 * THE PREMISE, TESTED: copy this skill directory on its own into a journalist's root and its seed
 * still renders. `SKILL.md` claims this, and `splash/test/seed-renders-standalone.test.ts`
 * already proves it for the four ORIGINAL craft skills — its own `CRAFT` list is a fixed array in a
 * file this skill may not touch (only `map-web/` is this task's own scope), so this is this
 * skill's OWN copy of that same proof, scoped to itself, duplicated rather than requesting an edit
 * to a file outside this directory — the same "duplicate, do not link" rule this project applies
 * everywhere a skill boundary would otherwise be crossed.
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
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import puppeteer from "puppeteer";
import { comparePngBuffers } from "../scripts/compare-png.mjs";

const SKILL_DIR = resolve(import.meta.dirname, "..");
const SKILLS = resolve(SKILL_DIR, "..");
const TWIN = resolve(SKILLS, "..");

// A cold-cache plate bake (headless Chrome + a real MapTiler capture) can take well over the
// default 5s budget the first time this runs on a machine.
setDefaultTimeout(300000);

/** A DUPLICATE of `bake-plate.mjs`'s own `resolveChrome` — see `render-preview.mjs`'s own copy for
 *  why this is duplicated rather than imported (a skill's own scripts stay copy-pasteable). */
function resolveChrome() {
  const candidates = [];
  if (process.env.CHROME_PATH) candidates.push(process.env.CHROME_PATH);
  const cache = join(homedir(), ".cache/puppeteer/chrome");
  if (existsSync(cache))
    for (const build of readdirSync(cache).sort().reverse())
      candidates.push(
        join(
          cache,
          build,
          "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
        ),
        join(
          cache,
          build,
          "chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
        ),
        join(cache, build, "chrome-linux64/chrome"),
      );
  candidates.push(
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  );
  const found = candidates.find((path) => existsSync(path));
  if (!found)
    throw new Error(
      `no Chrome to capture with. Looked in:\n  ${candidates.join("\n  ")}`,
    );
  return found;
}

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

      // Tolerant pixel comparison, not `.equals()` — see compare-png.mjs's own header note: two
      // Chrome launches of the identical HTML are not always byte-identical.
      const browser = await puppeteer.launch({
        headless: true,
        executablePath: resolveChrome(),
        args: ["--no-sandbox", "--hide-scrollbars"],
      });
      try {
        const page = await browser.newPage();
        const diff = await comparePngBuffers(
          page,
          rendered,
          readFileSync(join(SKILL_DIR, "assets", "preview.png")),
        );
        expect(`same: ${diff.same} (${diff.reason ?? "no diff"})`).toBe(
          `same: true (no diff)`,
        );
      } finally {
        await browser.close();
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
