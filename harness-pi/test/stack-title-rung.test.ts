import { afterAll, describe, expect, it } from "bun:test";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

// gx-stacked-bar static (Qwen3.5-9B, 2026-11-14): 16 countries, 13 at most on any rung. The ladder fell through to
// its last rung — the short title with no limits line — to gain two rows that still left three off the plate. The
// reader got "L'Espagne en a ajouté plus…" (en: of what?) and no line saying the bars are TWh of low-carbon power.
// When no rung holds every row, rows leave anyway: the plate keeps its full title and limits.

const HARNESS = resolve(import.meta.dirname, "..");
const BENCH = join(homedir(), ".splash-harness", "bench", "root");
const RUN = join(homedir(), ".splash-harness", "kept-runs", "gx-stacked-bar-seeded-osaurus-qwen-1794692096065");
const story = join(BENCH, "stories", `zz-stack-rung-test-${process.pid}`);
afterAll(() => rmSync(story, { recursive: true, force: true }));

describe.skipIf(!existsSync(join(BENCH, "package.json")) || !existsSync(RUN))("the static stacked-bar kit", () => {
  it("should keep the full title and limits when no rung holds every row", () => {
    const at = join(story, "beats", "1");
    mkdirSync(at, { recursive: true });
    for (const f of ["PALETTE.md", "DIRECTION.md", "STORYBOARD.md"]) cpSync(join(RUN, f), join(story, f));
    for (const src of [join(HARNESS, "craft", "_shared"), join(HARNESS, "craft", "static", "stacked-bar.gestures")])
      for (const f of readdirSync(src)) cpSync(join(src, f), join(at, f), { recursive: true });
    for (const f of ["data.json", "beat.mjs"]) cpSync(join(RUN, "beats", "1", f), join(at, f));
    const run = Bun.spawnSync(["bun", join(at, "render-beat.mjs")], { cwd: BENCH, stdout: "pipe", stderr: "pipe" });
    const svgs = existsSync(join(story, "beats", "1", "renders")) ? readdirSync(join(story, "beats", "1", "renders")).filter((f) => f.endsWith(".svg")) : [];
    expect(svgs.length, `${run.stdout}${run.stderr}`.slice(-600)).toBeGreaterThan(0);
    const svg = readFileSync(join(story, "beats", "1", "renders", svgs[0]), "utf8").replaceAll("&#x27;", "'");
    const title = [...svg.matchAll(/font-size="30"[^>]*>([^<]*)</g)].map((m) => m[1]).join(" ");
    expect(title).toContain("électricité bas-carbone");
  }, 180_000);
});
