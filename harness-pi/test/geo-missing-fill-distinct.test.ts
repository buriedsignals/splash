import { afterAll, describe, expect, it } from "bun:test";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

// gx-choropleth web (Gemma 12B, 2026-11-19): "< 40 %" and "non rapporté" drew in one grey, because both the
// lowest class and the no-data fill were lifted to the same 3:1 floor against a white ground. A reader could not
// tell Poland (a value) from Ukraine (no value). The video palette, which does not lift no-data, kept them apart.

const HARNESS = resolve(import.meta.dirname, "..");
const SHARED = join(HARNESS, "craft", "_shared");
const BENCH = join(homedir(), ".splash-harness", "bench", "root");
const dir = join(BENCH, "stories", `zz-geo-missing-test-${process.pid}`);
afterAll(() => rmSync(dir, { recursive: true, force: true }));

function measure(ground: string, accent: string) {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  for (const f of readdirSync(SHARED)) cpSync(join(SHARED, f), join(dir, f));
  writeFileSync(
    join(dir, "probe.mjs"),
    `import { geoPalette } from "./GestureGeoAreaStatic.tsx";
import { contrast } from "#shared/chart-beat/render-still.mjs";
const p = geoPalette({ ground: process.env.G, accent: process.env.A }, 6);
console.log(JSON.stringify({ low: contrast(p.missingFill, p.classFill(0)), ground: contrast(p.missingFill, process.env.G) }));`,
  );
  const run = Bun.spawnSync(["bun", join(dir, "probe.mjs")], {
    cwd: BENCH,
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, G: ground, A: accent },
  });
  return JSON.parse(String(run.stdout).trim().split("\n").at(-1) ?? "{}");
}

describe.skipIf(!existsSync(join(BENCH, "package.json")))(
  "the no-data fill of an area map",
  () => {
    it("should stand apart from the lowest class on a white ground", () => {
      expect(measure("#FFFFFF", "#0B7A75").low).toBeGreaterThanOrEqual(1.5);
    });

    it("should stand apart from the lowest class on a cream ground", () => {
      expect(measure("#F5F0E6", "#B5452B").low).toBeGreaterThanOrEqual(1.5);
    });
  },
);
