import { afterAll, describe, expect, it } from "bun:test";
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

// The 12B's tile cartogram (2026-11-14) titled "… compté au kilomètre carré, à 44,9 %": the seeded takeaway's figure,
// which nothing on the plate draws and data.json cannot give (no area column).
const HARNESS = resolve(import.meta.dirname, "..");
const BENCH = join(homedir(), ".splash-harness", "bench", "root");
const KEPT = join(homedir(), ".splash-harness", "kept-runs", "gx-cartogram-area-distortion-and-tile-cartogram-web-seeded-osaurus-1794674070349");
const story = join(BENCH, "stories", `zz-cartogram-title-test-${process.pid}`);
afterAll(() => rmSync(story, { recursive: true, force: true }));

describe.skipIf(!existsSync(join(BENCH, "package.json")) || !existsSync(KEPT))("the tile cartogram web kit", () => {
  it("should refuse a title figure none of the map's readings holds", () => {
    const at = join(story, "beats", "1");
    mkdirSync(at, { recursive: true });
    for (const f of ["PALETTE.md", "DIRECTION.md", "STORYBOARD.md"]) cpSync(join(KEPT, f), join(story, f));
    for (const src of [join(HARNESS, "craft", "_shared"), join(HARNESS, "craft", "web", "cartogram-area-distortion-and-tile-cartogram.gestures")])
      for (const f of readdirSync(src)) cpSync(join(src, f), join(at, f), { recursive: true });
    for (const f of ["data.json", "beat.mjs", "gestures.json"]) if (existsSync(join(KEPT, "beats", "1", f))) cpSync(join(KEPT, "beats", "1", f), join(at, f));
    const run = Bun.spawnSync(["bun", join(at, "render-beat.mjs")], { cwd: BENCH, stdout: "pipe", stderr: "pipe" });
    expect(`${run.stdout}${run.stderr}`).toMatch(/title states 44\.9/);
  }, 180_000);
});
