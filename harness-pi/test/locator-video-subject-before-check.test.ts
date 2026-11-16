import { afterAll, describe, expect, it } from "bun:test";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

// gx-locator video (Qwen3.5-9B, 2026-11-16, gx-locator-video-seeded-osaurus-qwen-1794833603575): the rows read
// `lon: Number(LON), lat: Number(LAT)` — the column's index, not the row's value — so every point sat at 5°, 6°.
// The model's own check ran first and said "it stands in null" three times; the session stopped on it.

const HARNESS = resolve(import.meta.dirname, "..");
const BENCH = join(homedir(), ".splash-harness", "bench", "root");
const RUN = join(homedir(), ".splash-harness", "kept-runs", "gx-locator-video-seeded-osaurus-qwen-1794833603575");
const made: string[] = [];
afterAll(() => made.forEach((d) => rmSync(d, { recursive: true, force: true })));

function stage(edit: (beat: string) => string) {
  const story = join(BENCH, "stories", `zz-locator-subject-video-${process.pid}`);
  const at = join(story, "beats", "1");
  made.push(story);
  mkdirSync(at, { recursive: true });
  for (const f of readdirSync(RUN)) if (f.endsWith(".md")) cpSync(join(RUN, f), join(story, f));
  for (const src of [join(HARNESS, "craft", "_shared"), join(HARNESS, "craft", "video", "locator")])
    for (const f of readdirSync(src)) cpSync(join(src, f), join(at, f), { recursive: true });
  for (const f of ["data.json", "beat.mjs"]) cpSync(join(RUN, "beats", "1", f), join(at, f));
  writeFileSync(join(at, "beat.mjs"), edit(readFileSync(join(at, "beat.mjs"), "utf8")));
  const out = Bun.spawnSync(["bun", join(at, "render-beat.mjs")], { cwd: BENCH, stdout: "pipe", stderr: "pipe", env: { ...process.env, MAPTILER_KEY: "" } });
  return `${out.stdout}${out.stderr}`;
}

const ready = existsSync(join(BENCH, "package.json")) && existsSync(join(RUN, "beats", "1", "beat.mjs"));
const indexRead = (b: string) => b.replace("lon: Number(r[LON]), lat: Number(r[LAT])", "lon: Number(LON), lat: Number(LAT)");

describe.skipIf(!ready)("the per-type video locator kit, given points read as column indices", () => {
  it("should name the subject's coordinates before the beat's own check runs", () => {
    expect(stage(indexRead)).toContain("subject is at 5°, 6°");
  });
  it("should say the coordinates are data.json's column positions and how to read the row's value", () => {
    expect(stage(indexRead)).toContain("r[LON]");
  });
});
