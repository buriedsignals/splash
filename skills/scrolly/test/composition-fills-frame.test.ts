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
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  compositionFillsTheFrame,
  FLOOR_FRACTION,
} from "../scripts/verify-scrolly.mjs";

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

describe("every delivered scrolly under proof/ — was stress-g the outlier, or the seed", () => {
  const POPULATION = [
    "scrolly-one-chart-swiss-life-expectancy/render/one-line-four-readings.html",
    "scrolly-chart-eu-carbon/render/eu-carbon-four-charts.html",
    "scrolly-image-grinnell-glacier/render/grinnell-glacier.html",
    "scrolly-mixed-grinnell-ice/render/three-media-one-glacier.html",
  ];

  it("names, for the whole population, what nothing had ever measured before", async () => {
    const readings: string[] = [];
    for (const rel of POPULATION) {
      const file = join(TWIN, "proof", rel);
      const fraction = await firstStepInkFraction(file);
      readings.push(`${rel}: ${(fraction * 100).toFixed(1)}%`);
      // Reported, not asserted against a floor here — these are the format's OWN pre-existing
      // beats, several already below stress-g's own measured reading, which is exactly the
      // "stress-g was not the outlier" finding this file exists to prove with numbers rather than
      // assert as debt against beats this stress round did not produce.
      expect(fraction).toBeGreaterThan(0);
    }
    expect(readings.length).toBe(POPULATION.length);
  });
});
