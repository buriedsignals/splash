import { afterAll, describe, expect, it } from "bun:test";
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

// stress-t web map on Osaurus (2026-11-11): under the journalist's full limits the phone frame overflowed, the
// 12B cut those limits to pass, and the shorter form it had added was never drawn. The fixture is that run's beat
// with the storyboard's limits as the first form and a short one after it.

const HARNESS = resolve(import.meta.dirname, "..");
const KIT = join(HARNESS, "craft", "web", "choropleth.gestures");
const SHARED = join(HARNESS, "craft", "_shared");
const FIXTURE = join(import.meta.dirname, "fixtures", "geo-web-phone-caveat");
const BENCH = join(homedir(), ".splash-harness", "bench", "root");
const dir = join(BENCH, "stories", `zz-geo-web-phone-test-${process.pid}`);
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

describe.skipIf(!existsSync(join(BENCH, "package.json")))("the web choropleth on a phone", () => {
  it("should draw the last limits form and fit the phone frame under a long caveat", () => {
    expect(render()).not.toContain("phone 375x812");
  }, 240_000);
});
