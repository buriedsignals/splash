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

// gx-contour-isoline scrolly (Gemma 12B, mvg115, 2026-11-19): card 5 names the farthest point ("Le dernier point
// atteint est en Biélorussie, à 682 km") while the close camera centred that point exactly under the prose card,
// which is centred on the stage. The point and its number were drawn, and hidden.

const KIT = join(
  resolve(import.meta.dirname, ".."),
  "craft",
  "scrolly",
  "contour-isoline",
);
const BENCH = join(homedir(), ".splash-harness", "bench", "root");
const dir = join(BENCH, "stories", `zz-contour-camera-test-${process.pid}`);
afterAll(() => rmSync(dir, { recursive: true, force: true }));

// Where the summit lands on the reference frame (a fraction of its height from the top), and whether the region
// around it stays inside the frame.
function measure() {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  for (const f of readdirSync(KIT)) cpSync(join(KIT, f), join(dir, f));
  writeFileSync(
    join(dir, "probe.mjs"),
    `import { closeCameraOf } from "./plan.mjs";
import { mercatorOf } from "#shared/map-beat/scrolly.mjs";
const reference = { width: 1280, height: 900 };
const s = mercatorOf([28, 53.5]);
const box = { x0: s[0] - 0.01, x1: s[0] + 0.012, y0: s[1] - 0.008, y1: s[1] + 0.007 };
const { center, zoom } = closeCameraOf({ box, subject: s, reference });
const h = reference.height / (512 * 2 ** zoom);
const top = mercatorOf(center)[1] - h / 2;
console.log(JSON.stringify({ seat: (s[1] - top) / h, holds: top <= box.y0 && top + h >= box.y1 }));`,
  );
  const run = Bun.spawnSync(["bun", join(dir, "probe.mjs")], {
    cwd: BENCH,
    stdout: "pipe",
    stderr: "pipe",
  });
  return JSON.parse(String(run.stdout).trim().split("\n").at(-1) || "{}");
}

describe.skipIf(!existsSync(join(BENCH, "package.json")))(
  "the contour scrolly's close camera",
  () => {
    it("should seat the farthest point below the centred card, not under it", () => {
      expect(measure().seat).toBeGreaterThanOrEqual(0.68);
    });

    it("should still hold the whole region around the farthest point in the frame", () => {
      expect(measure().holds).toBe(true);
    });
  },
);
