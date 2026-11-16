import { afterAll, describe, expect, it } from "bun:test";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

// gx-locator video (the per-type kit, Qwen3.5-9B, 2026-11-16, gx-locator-video-seeded-osaurus-qwen-1794829596293):
// places: rows.map((r) => ({ …, name: r.name, label: r.name })) and the French film printed « Bucharest », « Kyiv ».
// T7 guarded only the gesture kits; web, video and scrolly start point maps on their per-type kits.

const HARNESS = resolve(import.meta.dirname, "..");
const BENCH = join(homedir(), ".splash-harness", "bench", "root");
const KEPT = join(homedir(), ".splash-harness", "kept-runs");
const RUNS = { video: "gx-locator-video-seeded-osaurus-qwen-1794829596293", web: "gx-locator-web-seeded-osaurus-qwen-1794827803674" };
const made: string[] = [];
afterAll(() => made.forEach((d) => rmSync(d, { recursive: true, force: true })));

function stage(format: "video" | "web", edit: (beat: string) => string) {
  const run = join(KEPT, RUNS[format]);
  const story = join(BENCH, "stories", `zz-locator-names-${format}-${process.pid}`);
  const at = join(story, "beats", "1");
  made.push(story);
  mkdirSync(at, { recursive: true });
  for (const f of readdirSync(run)) if (f.endsWith(".md")) cpSync(join(run, f), join(story, f));
  for (const src of [join(HARNESS, "craft", "_shared"), join(HARNESS, "craft", format, "locator")])
    for (const f of readdirSync(src)) cpSync(join(src, f), join(at, f), { recursive: true });
  for (const f of ["data.json", "beat.mjs"]) cpSync(join(run, "beats", "1", f), join(at, f));
  writeFileSync(join(at, "beat.mjs"), edit(readFileSync(join(at, "beat.mjs"), "utf8")));
  const out = Bun.spawnSync(["bun", join(at, "render-beat.mjs")], { cwd: BENCH, stdout: "pipe", stderr: "pipe", env: { ...process.env, MAPTILER_KEY: "" } });
  return `${out.stdout}${out.stderr}`;
}

const ready = (format: "video" | "web") => existsSync(join(BENCH, "package.json")) && existsSync(join(KEPT, RUNS[format], "beats", "1", "beat.mjs"));

describe.skipIf(!ready("video"))("the per-type video locator kit", () => {
  it("should refuse a place labelled with data.json's spelling on a French page", () => {
    expect(stage("video", (b) => b)).toContain('label: "Bucarest"');
  });
});

describe.skipIf(!ready("web"))("the per-type web locator kit", () => {
  it("should refuse a place named in data.json's spelling on a French page", () => {
    expect(stage("web", (b) => b.replace("name: FRENCH_PLACE[p.name] ?? p.name", "name: p.name"))).toContain('{ name: "Bucarest" }');
  });
});
