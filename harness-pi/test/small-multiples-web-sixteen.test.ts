import { afterAll, describe, expect, it } from "bun:test";
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

// gx-small-multiples web (Qwen3.5-9B, 2026-11-16): the takeaway is about all sixteen countries, and the kit refused
// more than 12 panels while the panels guard refused 12 of 16 — the model went 12 → 16 → 12 until the same failure
// stopped it. The scrolly kit takes 24; the web grid lays any count in its columns. Fixture: that run's own beat.
const HARNESS = resolve(import.meta.dirname, "..");
const KIT = join(HARNESS, "craft", "web", "small-multiples");
const SHARED = join(HARNESS, "craft", "_shared");
const FIXTURE = join(import.meta.dirname, "fixtures", "small-multiples-web-sixteen");
const BENCH = join(homedir(), ".splash-harness", "bench", "root");
const dir = join(BENCH, "stories", `zz-sm-web-sixteen-test-${process.pid}`);
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

describe.skipIf(!existsSync(join(BENCH, "package.json")))("the web small-multiples kit", () => {
  it("should draw every one of sixteen panels a takeaway about all sixteen needs", () => {
    expect(render()).not.toContain("draw at most");
  });
});
