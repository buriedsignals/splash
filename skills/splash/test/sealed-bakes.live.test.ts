import { afterAll, expect, test } from "bun:test";
import { mkdtemp, mkdir, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { CO2_STUDY } from "../../map-beat/assets/geo.ts";

const root = resolve(import.meta.dirname, "../../..");
const browserInput = process.env.SPLASH_LIVE_BROWSER;
const scratch = await realpath(await mkdtemp(join(tmpdir(), "splash-sealed-bakes-")));
afterAll(() => rm(scratch, { recursive: true, force: true }));

async function execute(script: string, args: string[]) {
  if (!browserInput) return null;
  const browser = await realpath(browserInput);
  const child = Bun.spawn([
    process.execPath, "--no-env-file", join(root, script), ...args,
    "--browser", browser,
    "--maplibre-js", join(root, "node_modules", "maplibre-gl", "dist", "maplibre-gl.js"),
    "--maplibre-css", join(root, "node_modules", "maplibre-gl", "dist", "maplibre-gl.css"),
    "--style-json", join(root, "apps", "goose", "compatibility", "fixtures", "map-style.json"),
    "--settle", "50",
  ], {
    cwd: root,
    env: { PATH: "", HOME: join(scratch, "home"), TMPDIR: join(scratch, "tmp") },
    stdout: "pipe",
    stderr: "pipe",
  });
  const [exitCode, stderr] = await Promise.all([child.exited, new Response(child.stderr).text()]);
  if (exitCode !== 0) throw new Error(`${script} exited ${exitCode}: ${stderr}`);
  return browser;
}

test.skipIf(!browserInput)("all three sealed map bake entrypoints execute with the reviewed local closure", async () => {
  await mkdir(join(scratch, "home"), { recursive: true });
  await mkdir(join(scratch, "tmp"), { recursive: true });

  const shapes = {
    type: "FeatureCollection",
    features: CO2_STUDY.map((code, index) => ({
      type: "Feature",
      properties: { ADM0_A3: code, NAME: code },
      geometry: { type: "Polygon", coordinates: [[[0 + index * 0.01, 45], [0.005 + index * 0.01, 45], [0.005 + index * 0.01, 45.005], [0 + index * 0.01, 45.005], [0 + index * 0.01, 45]]] },
    })),
  };
  const shapesPath = join(scratch, "shapes.json");
  await writeFile(shapesPath, JSON.stringify(shapes));

  const staticOut = join(scratch, "static");
  await execute("skills/map-beat/scripts/bake-plate.mjs", ["--size", "320", "--out", staticOut, "--shapes", shapesPath]);
  expect((await readFile(join(staticOut, "plate.png"))).byteLength).toBeGreaterThan(1000);
  expect(JSON.parse(await readFile(join(staticOut, "geometry.json"), "utf8")).camera).toBeTruthy();

  const webOut = join(scratch, "web");
  await execute("skills/map-web/scripts/bake-plate.mjs", [
    "--size", "320", "--out", webOut, "--data", join(root, "skills", "map-web", "assets", "sample-data", "regions.json"),
  ]);
  expect((await readFile(join(webOut, "plate.png"))).byteLength).toBeGreaterThan(1000);
  expect(JSON.parse(await readFile(join(webOut, "geometry.json"), "utf8")).camera).toBeTruthy();

  const scrollyOut = join(scratch, "scrolly");
  await execute("skills/scrolly/scripts/bake-plate.mjs", ["--width", "480", "--height", "320", "--out", scrollyOut]);
  expect((await readFile(join(scrollyOut, "potomac-plate.jpg"))).byteLength).toBeGreaterThan(1000);
  expect(JSON.parse(await readFile(join(scrollyOut, "potomac-plate.json"), "utf8")).camera).toBeTruthy();
}, 120_000);
