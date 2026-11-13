import { afterAll, describe, expect, it } from "bun:test";
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

// gx-proportional-symbol web (Qwen3.5-9B, 2026-11-13): 7981 symbols, one per station, named by country. The kit
// refused the first station without a code three times; the craft never learned the kit draws one circle per
// country, which the duplicate names already said.

const HARNESS = resolve(import.meta.dirname, "..");
const KIT = join(HARNESS, "craft", "web", "proportional-symbol-symbol-bubble-map");
const SHARED = join(HARNESS, "craft", "_shared");
const FIXTURE = join(import.meta.dirname, "fixtures", "symbol-web-per-station");
const BENCH = join(homedir(), ".splash-harness", "bench", "root");
const dir = join(BENCH, "stories", `zz-symbol-web-station-test-${process.pid}`);
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

describe.skipIf(!existsSync(join(BENCH, "package.json")))("a symbol map given one symbol per row", () => {
  it("should be told to add the rows up into one circle per place", () => {
    expect(render()).toMatch(/one circle per place.*add up/i);
  }, 120_000);
});
