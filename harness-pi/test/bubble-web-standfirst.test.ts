import { afterAll, describe, expect, it } from "bun:test";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

// i19 (12B, 2026-11-14): the web kit printed limits + the Mercator sentence (~330 characters) in the standfirst,
// which chart-web clamps to one line above 1100 px — cut mid-sentence at every desktop width. The Mercator sentence
// belongs to the reading line, which is never clamped.

const HARNESS = resolve(import.meta.dirname, "..");
const BENCH = join(homedir(), ".splash-harness", "bench", "root");
const I19 = join(homedir(), ".splash-harness", "kept-runs", "gx-proportional-symbol-symbol-bubble-map-web-seeded-osaurus-1794670487949");
const ENV = resolve(HARNESS, "..", "..", "sp1", ".env");
const story = join(BENCH, "stories", `zz-standfirst-test-${process.pid}`);
afterAll(() => rmSync(story, { recursive: true, force: true }));

const keyOf = () => {
  if (!existsSync(ENV)) return undefined;
  const line = readFileSync(ENV, "utf8").split("\n").find((l) => /^(VITE_|REMOTION_)?MAPTILER_KEY=/.test(l));
  return line?.split("=").slice(1).join("=").trim().replace(/^["']|["']$/g, "") || undefined;
};
const text = (html: string, cls: string) =>
  (html.match(new RegExp(`class="${cls}"[^>]*>([^<]*)<`)) ?? [])[1] ?? "";

describe.skipIf(!existsSync(join(BENCH, "package.json")) || !existsSync(I19) || !keyOf())("the bubble-map web standfirst", () => {
  it("should keep the Mercator sentence out of the clamped standfirst and print it in the reading", () => {
    const at = join(story, "beats", "1");
    mkdirSync(at, { recursive: true });
    for (const f of ["PALETTE.md", "DIRECTION.md", "STORYBOARD.md"]) cpSync(join(I19, f), join(story, f));
    for (const src of [join(HARNESS, "craft", "_shared"), join(HARNESS, "craft", "web", "proportional-symbol-symbol-bubble-map")])
      for (const f of readdirSync(src)) cpSync(join(src, f), join(at, f), { recursive: true });
    cpSync(join(I19, "beats", "1", "data.json"), join(at, "data.json"));
    // i19's alt is refused for its top 100 at 100 % (assertNoWholeAsPart); a true top 5 lets it reach the page.
    const beat = readFileSync(join(I19, "beats", "1", "beat.mjs"), "utf8")
      .replace("ranked.slice(0, 100)", "ranked.slice(0, 5)")
      .replace("Ces 100 premiers sites couvrent", "Ces cinq premiers pays couvrent");
    writeFileSync(join(at, "beat.mjs"), beat);
    const run = Bun.spawnSync(["bun", join(at, "render-beat.mjs")], {
      cwd: BENCH, stdout: "pipe", stderr: "pipe", env: { ...process.env, MAPTILER_KEY: keyOf() },
    });
    if (run.exitCode !== 0) throw new Error(`${run.stdout}${run.stderr}`.slice(-1500));
    const page = join(at, "renders", readdirSync(join(at, "renders")).find((f) => f.endsWith(".html") && !f.includes(".local."))!);
    const html = readFileSync(page, "utf8");
    expect(run.exitCode).toBe(0);
    expect({ caveat: /Mercator/.test(text(html, "chart-caveat")), reading: /Lecture[^<]*Mercator/.test(html) }).toEqual({ caveat: false, reading: true });
  }, 300_000);
});
