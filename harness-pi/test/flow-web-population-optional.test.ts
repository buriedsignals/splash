import { afterAll, describe, expect, it } from "bun:test";
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

// gx-flow-map web (Qwen3.5-9B, mvq65): the per-type web kit required a population column for its
// per-inhabitant measure, the seed's table (entity, code, month, people) has none, and the cell
// refused three times on "data.json has no column population". A data-shape refusal with no value
// that works. Without population the page divides by what the data supports: count and per area.

const HARNESS = resolve(import.meta.dirname, "..");
const BENCH = join(homedir(), ".splash-harness", "bench", "root");
const RUN = join(
  homedir(),
  ".splash-harness",
  "kept-runs",
  "gx-flow-web-qwen-mvq65-fixture",
);
const made: string[] = [];
afterAll(() =>
  made.forEach((d) => rmSync(d, { recursive: true, force: true })),
);

function render(beatFile: string) {
  const story = join(
    BENCH,
    "stories",
    `zz-flow-population-${process.pid}-${made.length}`,
  );
  const dir = join(story, "beats", "1");
  made.push(story);
  mkdirSync(dir, { recursive: true });
  for (const f of readdirSync(RUN))
    if (f.endsWith(".md")) cpSync(join(RUN, f), join(story, f));
  for (const src of [
    join(HARNESS, "craft", "_shared"),
    join(HARNESS, "craft", "web", "flow-map-route-and-origin-destination"),
  ])
    for (const f of readdirSync(src))
      cpSync(join(src, f), join(dir, f), { recursive: true });
  cpSync(join(RUN, "beats", "1", "data.json"), join(dir, "data.json"));
  cpSync(join(RUN, "beats", "1", beatFile), join(dir, "beat.mjs"));
  const out = Bun.spawnSync(["bun", join(dir, "render-beat.mjs")], {
    cwd: BENCH,
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, MAPTILER_KEY: "" },
  });
  return `${out.stdout}${out.stderr}`;
}

describe.skipIf(
  !existsSync(join(BENCH, "package.json")) ||
    !existsSync(join(RUN, "beats", "1", "beat.two-measures.mjs")),
)("the web flow map without a population column", () => {
  it("should name the value that works when the beat names a population column the data lacks", () => {
    expect(render("beat.mjs")).toMatch(/population: null/);
  });

  it("should draw the per-area measure when population is null", () => {
    expect(render("beat.two-measures.mjs")).toMatch(/measure perArea /);
  });

  it("should offer no per-inhabitant measure when population is null", () => {
    expect(render("beat.two-measures.mjs")).not.toMatch(/measure perCapita /);
  });
});
