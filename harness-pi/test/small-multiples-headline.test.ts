import { afterAll, describe, expect, it } from "bun:test";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

// gx-small-multiples on Osaurus (2026-11-11): the 12B wrote the takeaway as the title's first form and a shorter
// second one; the plate drew the second because its ladder tried a sixth column only after shortening the title.
// The fixture is that run's own beat, data and story files.

const HARNESS = resolve(import.meta.dirname, "..");
const KIT = join(HARNESS, "craft", "static", "small-multiples");
const SHARED = join(HARNESS, "craft", "_shared");
const FIXTURE = join(import.meta.dirname, "fixtures", "small-multiples-headline");
const BENCH = join(homedir(), ".splash-harness", "bench", "root");
const dir = join(BENCH, "stories", `zz-sm-headline-test-${process.pid}`);
afterAll(() => rmSync(dir, { recursive: true, force: true }));

function render() {
  const at = join(dir, "beats", "1");
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(at, { recursive: true });
  for (const f of ["STORYBOARD.md", "PALETTE.md", "DIRECTION.md"]) cpSync(join(FIXTURE, f), join(dir, f));
  for (const f of readdirSync(SHARED)) cpSync(join(SHARED, f), join(at, f));
  for (const f of readdirSync(KIT)) cpSync(join(KIT, f), join(at, f));
  for (const f of ["beat.mjs", "data.json"]) cpSync(join(FIXTURE, f), join(at, f));
  const run = Bun.spawnSync(["bun", join(at, "render-beat.mjs")], { cwd: BENCH, stdout: "pipe", stderr: "pipe" });
  return `${run.stdout}${run.stderr}`;
}

describe.skipIf(!existsSync(join(BENCH, "package.json")))("the static small-multiples ladder", () => {
  it("should keep the title's first form, the takeaway, while a wider grid still fits", () => {
    expect(render()).toContain("ladder: headline 1,");
  });
});
