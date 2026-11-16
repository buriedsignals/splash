import { afterAll, describe, expect, it } from "bun:test";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

// gx-lollipop web, Qwen3.5-9B: reading was written as two forms, and the kit's plain() printed them glued by a comma
// ("…derrière le ratio.,Choisissez un pays pour comparer.") with no refusal. Every web kit prints its one-text fields
// (eyebrow, source, unit, reading…) through plain().

const HARNESS = resolve(import.meta.dirname, "..");
const SHARED = join(HARNESS, "craft", "_shared");
const KIT = join(HARNESS, "craft", "web", "lollipop");
const BENCH = join(homedir(), ".splash-harness", "bench", "root");
const KEPT = join(homedir(), ".splash-harness", "kept-runs", "gx-lollipop-web-seeded-osaurus-qwen-1794871712575");
const dir = join(BENCH, "stories", `zz-web-plain-test-${process.pid}`);
afterAll(() => rmSync(dir, { recursive: true, force: true }));

function render(beat: string) {
  const at = join(dir, "beats", "1");
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(at, { recursive: true });
  for (const f of ["PALETTE.md", "DIRECTION.md", "STORYBOARD.md"]) cpSync(join(KEPT, f), join(dir, f));
  for (const src of [SHARED, KIT]) for (const f of readdirSync(src)) cpSync(join(src, f), join(at, f), { recursive: true });
  cpSync(join(KEPT, "beats", "1", "data.json"), join(at, "data.json"));
  writeFileSync(join(at, "beat.mjs"), beat);
  const run = Bun.spawnSync(["bun", join(at, "render-beat.mjs")], { cwd: BENCH, stdout: "pipe", stderr: "pipe" });
  return `${run.stdout}${run.stderr}`;
}

const kept = () => readFileSync(join(KEPT, "beats", "1", "beat.mjs"), "utf8");

describe.skipIf(!existsSync(join(BENCH, "package.json")) || !existsSync(KEPT))("a web kit given a list where it prints one text", () => {
  it("should refuse it with its first item as the value that works", () => {
    expect(render(kept())).toMatch(/one text, not a list[\s\S]*a value that works: "Lecture : rangés par total/);
  }, 180_000);

  it("should not refuse the same beat once reading is one text", () => {
    const one = kept().replace(/reading: \[\s*(`[^`]*`),\s*"[^"]*",?\s*\]/, "reading: $1");
    expect(one).not.toBe(kept());
    expect(render(one)).not.toMatch(/one text, not a list/);
  }, 180_000);
});
