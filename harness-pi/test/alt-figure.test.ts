import { afterAll, describe, expect, it } from "bun:test";
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

// Qwen3.5-9B with thinking on (2026-11-15) titled the tile cartogram at 65,1 %, the mean of the forty reported
// shares, while its alt said "63,5 % en moyenne par pays": Ukraine's empty tile counted as 0 over 41. The title
// guard held the title; nothing read the alt (TUNE.md H3).
const HARNESS = resolve(import.meta.dirname, "..");
const BENCH = join(homedir(), ".splash-harness", "bench", "root");
const KEPT = join(homedir(), ".splash-harness", "kept-runs", "gx-cartogram-area-distortion-and-tile-cartogram-seeded-osaurus-qwen-1794763049171");
const story = join(BENCH, "stories", `zz-alt-figure-test-${process.pid}`);
afterAll(() => rmSync(story, { recursive: true, force: true }));

describe.skipIf(!existsSync(join(BENCH, "package.json")) || !existsSync(KEPT))("the tile cartogram static kit", () => {
  it("should refuse an alt figure none of the map's readings holds", () => {
    const at = join(story, "beats", "1");
    mkdirSync(at, { recursive: true });
    for (const f of ["PALETTE.md", "DIRECTION.md", "STORYBOARD.md"]) cpSync(join(KEPT, f), join(story, f));
    for (const src of [join(HARNESS, "craft", "_shared"), join(HARNESS, "craft", "static", "cartogram-area-distortion-and-tile-cartogram.gestures")])
      for (const f of readdirSync(src)) cpSync(join(src, f), join(at, f), { recursive: true });
    for (const f of ["data.json", "beat.mjs", "gestures.json"]) cpSync(join(KEPT, "beats", "1", f), join(at, f));
    const run = Bun.spawnSync(["bun", join(at, "render-beat.mjs")], { cwd: BENCH, stdout: "pipe", stderr: "pipe" });
    expect(`${run.stdout}${run.stderr}`).toMatch(/alt states 63[.,]5/);
  }, 180_000);

  it("should let the alt count the places past a threshold", () => {
    // gx-choropleth (12B, 2026-11-14): "7 atteignent 94 % ou plus" counts seven of the forty places drawn.
    const kept = join(homedir(), ".splash-harness", "kept-runs", "gx-choropleth-seeded-osaurus-1794672613529");
    const at = join(story, "choropleth", "beats", "1");
    mkdirSync(at, { recursive: true });
    for (const f of ["PALETTE.md", "DIRECTION.md", "STORYBOARD.md"]) cpSync(join(kept, f), join(story, "choropleth", f));
    for (const src of [join(HARNESS, "craft", "_shared"), join(HARNESS, "craft", "static", "choropleth.gestures")])
      for (const f of readdirSync(src)) cpSync(join(src, f), join(at, f), { recursive: true });
    for (const f of ["data.json", "beat.mjs", "gestures.json"]) if (existsSync(join(kept, "beats", "1", f))) cpSync(join(kept, "beats", "1", f), join(at, f));
    const run = Bun.spawnSync(["bun", join(at, "render-beat.mjs")], { cwd: BENCH, stdout: "pipe", stderr: "pipe" });
    expect(`${run.stdout}${run.stderr}`).not.toMatch(/alt states/);
  }, 180_000);
});
