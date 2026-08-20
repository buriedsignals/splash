/**
 * FINDING 3 (round-two stress): does the graphic actually occupy a real share of the reader's own
 * window, at three widths, on a REAL delivered page — never a claim taken on trust. Drives a real
 * browser (the same `resolveChrome`/Puppeteer shape every capture script in this tree carries) and
 * measures `.chart-figure`'s own bounding box against the window it was opened in.
 *
 * `graphicFillsItsFrame` (`scripts/detect-fills-its-frame.mjs`) is the pure decision; this file is
 * the measurement that feeds it, over the seed and this stress round's own `stress-d-asylum-gap`.
 */
import { describe, expect, it } from "bun:test";
import puppeteer from "puppeteer-core";
import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  graphicFillsItsFrame,
  FLOOR_FRACTION,
} from "../scripts/detect-fills-its-frame.mjs";
import { render } from "../scripts/render-web.mjs";

const SKILL = resolve(import.meta.dirname, "..");
const TWIN = resolve(SKILL, "..", "..");

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

/** Desktop, laptop, phone — the same three shapes `scrolly/scripts/verify-scrolly.mjs`'s own
 *  `WIDTHS` checks this vehicle at, reused here so "three widths" means the same three everywhere
 *  this capability is measured. */
const WIDTHS = [
  { w: 1600, h: 900 },
  { w: 1280, h: 800 },
  { w: 375, h: 812 },
];

async function graphicFraction(
  file: string,
  w: number,
  h: number,
): Promise<number> {
  const browser = await puppeteer.launch({
    executablePath: resolveChrome(),
    headless: true,
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
    await page.goto(pathToFileURL(file).href, { waitUntil: "load" });
    const box = await page.evaluate(() => {
      const el = document.querySelector(".chart-figure");
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { width: r.width, height: r.height };
    });
    if (!box)
      throw new Error(`${file}: no .chart-figure on the delivered page`);
    return (box.width * box.height) / (w * h);
  } finally {
    await browser.close();
  }
}

describe("graphicFillsItsFrame — the graphic's own share of the window, measured", () => {
  it("clears this format's own floor on the seed, at every width", async () => {
    const outDir = mkdtempSync(join(tmpdir(), "chart-web-frame-"));
    try {
      const { outPath } = await render({
        dataPath: join(SKILL, "assets/sample-data/rainfall.json"),
        outDir,
      });
      for (const { w, h } of WIDTHS) {
        const fraction = await graphicFraction(outPath, w, h);
        const found = graphicFillsItsFrame(fraction, FLOOR_FRACTION);
        expect(`${w}x${h}: ${JSON.stringify(found)}`).toBe(
          `${w}x${h}: ${JSON.stringify({ ...found, under: false })}`,
        );
      }
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
  });

  it("clears this format's own floor on stress-d-asylum-gap, at every width", async () => {
    const file = join(
      TWIN,
      "stories/stress-d-asylum-gap/beats/asylum-applications-gap/asylum-applications-gap.html",
    );
    for (const { w, h } of WIDTHS) {
      const fraction = await graphicFraction(file, w, h);
      const found = graphicFillsItsFrame(fraction, FLOOR_FRACTION);
      expect(`${w}x${h}: ${JSON.stringify(found)}`).toBe(
        `${w}x${h}: ${JSON.stringify({ ...found, under: false })}`,
      );
    }
  });
});
