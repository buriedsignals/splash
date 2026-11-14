import { afterAll, describe, expect, it } from "bun:test";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

// gx-locator static (Qwen3.5-9B, 2026-11-14): the beat seated « Dniepr » at 35.0, 48.5 and the render refused it —
// "sit on land on the plate" — with no value that works. The model spent its turns elsewhere and the run ended with no
// render. A water refused for sitting on land is handed the nearest water the plate paints.

const HARNESS = resolve(import.meta.dirname, "..");
const BENCH = join(homedir(), ".splash-harness", "bench", "root");
const RUN = join(homedir(), ".splash-harness", "kept-runs", "gx-locator-seeded-osaurus-qwen-1794693722817");
const story = join(BENCH, "stories", `zz-locator-water-test-${process.pid}`);
const at = join(story, "beats", "1");
afterAll(() => rmSync(story, { recursive: true, force: true }));

const render = () => {
  const run = Bun.spawnSync(["bun", join(at, "render-beat.mjs")], { cwd: BENCH, stdout: "pipe", stderr: "pipe", env: { ...process.env, MAPTILER_KEY: "" } });
  return `${run.stdout}${run.stderr}`;
};

describe.skipIf(!existsSync(join(BENCH, "package.json")) || !existsSync(join(RUN, "beats", "1", "plate")))("the static locator kit", () => {
  mkdirSync(at, { recursive: true });
  for (const f of ["PALETTE.md", "DIRECTION.md", "STORYBOARD.md", "SUBJECTS.md"]) cpSync(join(RUN, f), join(story, f));
  for (const src of [join(HARNESS, "craft", "_shared"), join(HARNESS, "craft", "static", "locator.gestures")])
    for (const f of readdirSync(src)) cpSync(join(src, f), join(at, f), { recursive: true });
  for (const f of ["data.json", "beat.mjs", "plate"]) cpSync(join(RUN, "beats", "1", f), join(at, f), { recursive: true });
  writeFileSync(join(at, "gestures.json"), JSON.stringify({ gestures: [{ do: "highlight", mark: "Zaporizhzhia NPP" }] }));

  let offer: RegExpMatchArray | null = null;
  it("should hand a water seated on land the nearest painted water", () => {
    offer = render().match(/Dniepr → lon (-?[\d.]+), lat (-?[\d.]+)/);
    expect(offer).not.toBeNull();
  });

  it("should accept the water at the offered seat", () => {
    const beat = join(at, "beat.mjs");
    const src = readFileSync(beat, "utf8").replace(/\{ forms: \["Dniepr"\], lon: [\d.]+, lat: [\d.]+ \}/, `{ forms: ["Dniepr"], lon: ${offer![1]}, lat: ${offer![2]} }`);
    writeFileSync(beat, src);
    expect(render()).not.toContain("sit on land");
  });
});
