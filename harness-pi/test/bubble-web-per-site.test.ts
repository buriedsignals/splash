import { afterAll, describe, expect, it } from "bun:test";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

// gx-proportional-symbol web (12B and Qwen3.5-9B, 2026-11-14): the takeaway is about sites ("Un centième des sites
// porte plus d'un tiers…"), and the web kit drew one circle per country; both models then stated site figures from
// country circles. The kit now draws one circle per station, under a legibility cut it states.

const HARNESS = resolve(import.meta.dirname, "..");
const SHARED = join(HARNESS, "craft", "_shared");
const KIT = join(HARNESS, "craft", "web", "proportional-symbol-symbol-bubble-map");
const BENCH = join(homedir(), ".splash-harness", "bench", "root");
// A 12B scrolly run: its data.json is the whole WRI table, its storyboard the sites takeaway.
const KEPT = join(homedir(), ".splash-harness", "kept-runs", "gx-proportional-symbol-symbol-bubble-map-scrolly-seeded-osaurus-1794606535645");
const dir = join(BENCH, "stories", `zz-bubble-web-site-test-${process.pid}`);
afterAll(() => rmSync(dir, { recursive: true, force: true }));

function render(beat: string) {
  const at = join(dir, "beats", "1");
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(at, { recursive: true });
  for (const f of ["PALETTE.md", "DIRECTION.md"]) cpSync(join(KEPT, f), join(dir, f));
  writeFileSync(join(dir, "STORYBOARD.md"), readFileSync(join(KEPT, "STORYBOARD.md"), "utf8").replace(/format: scrolly/g, "format: web"));
  for (const src of [SHARED, KIT]) for (const f of readdirSync(src)) cpSync(join(src, f), join(at, f), { recursive: true });
  cpSync(join(KEPT, "beats", "1", "data.json"), join(at, "data.json"));
  writeFileSync(join(at, "beat.mjs"), beat);
  // Without a key the kit stops at the basemap, after every guard: reaching it is passing them.
  const run = Bun.spawnSync(["bun", join(at, "render-beat.mjs")], { cwd: BENCH, stdout: "pipe", stderr: "pipe", env: { ...process.env, MAPTILER_KEY: "", VITE_MAPTILER_KEY: "", REMOTION_MAPTILER_KEY: "" } });
  return `${run.stdout}${run.stderr}`;
}

describe.skipIf(!existsSync(join(BENCH, "package.json")) || !existsSync(KEPT))("the bubble-map web kit, one circle per station", () => {
  it("should let the worked example through to the basemap under a stated cut", () => {
    const out = render(readFileSync(join(KIT, "beat.example.mjs"), "utf8"));
    expect(out).toMatch(/cut: \d{3,4} of \d{4} symbols drawn[\s\S]*MAPTILER_KEY/);
  }, 120_000);

  it("should refuse a standfirst that leaves the cut unsaid", () => {
    const beat = 'import example from "./beat.example.mjs";\nexport default { ...example, limits: "Un cercle par centrale, à ses propres coordonnées ; l’aire du cercle est sa puissance installée. L’Algérie, l’Irak, le Maroc, la Syrie et la Tunisie, hors cadre, sont laissés de côté." };\n';
    expect(render(beat)).toMatch(/limits must say so and print figure\(cut\.threshold\)/);
  }, 120_000);

  it("should hold a standfirst written as a function to the journalist's named limits", () => {
    const beat = 'import example from "./beat.example.mjs";\nexport default { ...example, limits: (cut) => `Sous ${cut.threshold} MW, rien.` };\n';
    expect(render(beat)).toMatch(/limits: its first form must carry the limits the journalist named/);
  }, 120_000);
});
