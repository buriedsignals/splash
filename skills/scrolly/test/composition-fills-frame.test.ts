/**
 * FINDING 4 (round-two stress): `skills/scrolly`'s own description promises "a FIXED graphic that
 * fills the frame" — `stress-g-eight-checkpoints` delivered one covering roughly 15% of a 1440x900
 * frame, and `verify-scrolly.mjs` passed it, because every existing assertion measures the VEHICLE
 * (the handover, the card, the frame that never moves) and none of them ever measured the DRAWING
 * inside it. This file is that measurement: a real screenshot, sampled on a grid for the fraction of
 * pixels that differ from the frame's own ground colour — real ink, not a claim.
 *
 * `compositionFillsTheFrame` (`scripts/verify-scrolly.mjs`) is the pure decision this feeds.
 */
import { describe, expect, it } from "bun:test";
import puppeteer from "puppeteer-core";
import { PNG } from "pngjs";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  compositionFillsTheFrame,
  FLOOR_FRACTION,
} from "../scripts/verify-scrolly.mjs";
import { exampleRunnersFor } from "../scripts/example-runners.mjs";

const TWIN = resolve(import.meta.dirname, "..", "..", "..");

/** A DUPLICATE of the `resolveChrome` every capture script in this tree carries — a skill's own
 *  scripts stay copy-pasteable, so this is not imported from anywhere else. */
function resolveChrome(): string {
  const candidates: string[] = [];
  if (process.env.CHROME_PATH) candidates.push(process.env.CHROME_PATH);
  const cache = join(homedir(), ".cache/puppeteer/chrome");
  if (existsSync(cache))
    for (const build of readdirSync(cache).sort().reverse())
      candidates.push(
        join(
          cache,
          build,
          "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
        ),
        join(
          cache,
          build,
          "chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
        ),
        join(cache, build, "chrome-linux64/chrome"),
      );
  candidates.push(
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
  );
  const found = candidates.find((c) => existsSync(c));
  if (!found)
    throw new Error(`no Chrome to drive — looked at ${candidates.join(", ")}`);
  return found;
}

/** The fraction of a screenshot's own pixels that differ from its top-left corner (the page's own
 *  ground) by more than a perceptual threshold — grid-sampled the same way `plateLuminance` samples
 *  a plate, for the same reason: a full-resolution scan of every pixel answers a question ("is this
 *  frame's OWN colour dark or light") this file never asks; a grid answers "roughly how much of the
 *  frame is ink", which is exactly what this decision needs and no more. */
function inkCoverage(
  png: PNG,
  gridW = 144,
  gridH = 90,
  threshold = 24,
): number {
  const { width, height, data } = png;
  const at = (x: number, y: number) => {
    const i = (width * y + x) * 4;
    return [data[i], data[i + 1], data[i + 2]];
  };
  const ground = at(2, 2);
  let hit = 0;
  const total = gridW * gridH;
  for (let gy = 0; gy < gridH; gy++) {
    for (let gx = 0; gx < gridW; gx++) {
      const x = Math.min(width - 1, Math.floor(((gx + 0.5) * width) / gridW));
      const y = Math.min(height - 1, Math.floor(((gy + 0.5) * height) / gridH));
      const [r, g, b] = at(x, y);
      const dist = Math.sqrt(
        (r - ground[0]) ** 2 + (g - ground[1]) ** 2 + (b - ground[2]) ** 2,
      );
      if (dist > threshold) hit++;
    }
  }
  return hit / total;
}

async function firstStepInkFraction(
  file: string,
  w = 1440,
  h = 900,
): Promise<number> {
  const browser = await puppeteer.launch({
    executablePath: resolveChrome(),
    headless: true,
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
    await page.goto(pathToFileURL(file).href, { waitUntil: "load" });
    const buffer = await page.screenshot({ type: "png" });
    return inkCoverage(PNG.sync.read(Buffer.from(buffer)));
  } finally {
    await browser.close();
  }
}

describe("compositionFillsTheFrame", () => {
  it("agrees a picture at or above the floor is not under", () => {
    expect(compositionFillsTheFrame(0.1, 0.05)).toEqual({
      fraction: 0.1,
      floor: 0.05,
      under: false,
    });
  });

  it("refuses a picture below the floor", () => {
    expect(compositionFillsTheFrame(0.01, 0.05)).toEqual({
      fraction: 0.01,
      floor: 0.05,
      under: true,
    });
  });

  it("does not count a frame sitting exactly on the floor as under", () => {
    expect(compositionFillsTheFrame(0.05, 0.05).under).toBe(false);
  });
});

describe("stress-g-eight-checkpoints — the beat this guard was earned by", () => {
  it("clears this vehicle's own measured floor at its own first step, after the fix", async () => {
    const file = join(
      TWIN,
      "stories/stress-g-eight-checkpoints/beats/eight-checkpoints-scrolly/renders/eight-checkpoints.html",
    );
    const fraction = await firstStepInkFraction(file);
    const found = compositionFillsTheFrame(fraction, FLOOR_FRACTION);
    expect(JSON.stringify(found)).toBe(
      JSON.stringify({ ...found, under: false }),
    );
  });
});

/** EVERY DELIVERED SCROLLY THIS FORMAT HAS PRODUCED, derived rather than typed.
 *
 *  ROUND SIX: this walked a hard-coded list of four `proof/` beats. Four rounds of new scrollys
 *  landed beside it and not one of them was ever measured by the guard their own format earned —
 *  `stress-ac-alcanede-kilns`'s own maintainer note says so in as many words: "no beat produced
 *  from here on is in that population". Extending the list is not a fix; a list is the defect.
 *
 *  Derived the way `frame-fills-window.test.ts` derives its own: `exampleRunnersFor` finds every
 *  committed runner in the tree whose source names this skill's `scripts/` directory, and the
 *  delivered pages are the `.html` files those runners write beside themselves. A scrolly committed
 *  tomorrow is measured with nobody remembering to add it, which is the whole property.
 *
 *  `export/` is excluded: a hand-over folder holds a COPY of the page the beat already delivered,
 *  so counting it measures the same drawing twice and doubles the browser time for nothing. */
const DELIVERED_HTML = /\.html$/;
const NOT_A_DELIVERY = /^(export|source|node_modules)$/;

function deliveredPagesUnder(dir: string, out: string[] = [], depth = 0): string[] {
  if (!existsSync(dir) || depth > 2) return out;
  for (const name of readdirSync(dir)) {
    if (name.startsWith(".")) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (!NOT_A_DELIVERY.test(name)) deliveredPagesUnder(path, out, depth + 1);
    } else if (DELIVERED_HTML.test(name)) out.push(path);
  }
  return out;
}

let discovered: string[] | null = null;
function deliveredPages(): string[] {
  if (discovered) return discovered;
  const found = new Set<string>();
  const { called } = exampleRunnersFor(TWIN, "scrolly");
  for (const runner of called)
    for (const page of deliveredPagesUnder(dirname(join(TWIN, runner)))) found.add(page);
  discovered = [...found].filter((file) => existsSync(file)).sort();
  return discovered;
}

describe("every delivered scrolly in the tree — was stress-g the outlier, or the seed", () => {
  it("finds them by derivation rather than by a list, and finds more than the list named", async () => {
    // The list this replaced named four. A derivation that found four or fewer would be a
    // derivation that had quietly become the list again.
    expect(deliveredPages().length).toBeGreaterThan(4);
  });

  it("names, for the whole population, what nothing had ever measured before", async () => {
    const readings: string[] = [];
    for (const file of deliveredPages()) {
      const fraction = await firstStepInkFraction(file);
      readings.push(`${file.replace(`${TWIN}/`, "")}: ${(fraction * 100).toFixed(1)}%`);
      // Reported, not asserted against a floor here — these are the format's OWN pre-existing
      // beats, several already below stress-g's own measured reading, which is exactly the
      // "stress-g was not the outlier" finding this file exists to prove with numbers rather than
      // assert as debt against beats this stress round did not produce.
      expect(`${file}: ${fraction > 0 ? "ink" : "blank"}`).toBe(`${file}: ink`);
    }
    console.log(readings.join("\n"));
    expect(readings.length).toBe(deliveredPages().length);
  }, 600000);
});
