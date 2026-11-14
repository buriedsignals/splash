import { afterAll, describe, expect, it } from "bun:test";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

// gx-lollipop static (Qwen3.5-9B, 2026-11-14): beat.mjs names each pair by `key`, the kit handed check() the same
// pairs renamed to `code`. Qwen's check read `p.key`, found neither country, and its own refusal printed
// "the six largest total emitters are , , , , , " twice to a stop. check() now receives the key under its own name.

const HARNESS = resolve(import.meta.dirname, "..");
const BENCH = join(homedir(), ".splash-harness", "bench", "root");
const RUN = join(homedir(), ".splash-harness", "kept-runs", "gx-lollipop-seeded-osaurus-qwen-1794691212111");
const story = join(BENCH, "stories", `zz-lollipop-key-test-${process.pid}`);
afterAll(() => rmSync(story, { recursive: true, force: true }));

describe.skipIf(!existsSync(join(BENCH, "package.json")) || !existsSync(RUN))("the static lollipop kit", () => {
  it("should hand check() each pair under the key beat.mjs gave it", () => {
    const at = join(story, "beats", "1");
    mkdirSync(at, { recursive: true });
    for (const f of ["PALETTE.md", "DIRECTION.md", "STORYBOARD.md"]) cpSync(join(RUN, f), join(story, f));
    for (const src of [join(HARNESS, "craft", "_shared"), join(HARNESS, "craft", "static", "lollipop")])
      for (const f of readdirSync(src)) cpSync(join(src, f), join(at, f), { recursive: true });
    cpSync(join(RUN, "beats", "1", "data.json"), join(at, "data.json"));
    const beat = readFileSync(join(RUN, "beats", "1", "beat.mjs"), "utf8").replaceAll("p.code ===", "p.key ===");
    writeFileSync(join(at, "beat.mjs"), beat);
    const run = Bun.spawnSync(["bun", join(at, "render-beat.mjs")], { cwd: BENCH, stdout: "pipe", stderr: "pipe" });
    expect(`${run.stdout}${run.stderr}`).not.toMatch(/are not both among them/);
  }, 120_000);
});
