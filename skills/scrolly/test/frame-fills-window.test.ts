/**
 * FINDING 3 (round-two stress): does the graphic's own CONTAINER actually occupy a real share of
 * the reader's own window, at three widths, on a REAL delivered page — never a claim taken on
 * trust. Drives a real browser (the same `resolveChrome`/Puppeteer shape every capture script in
 * this tree carries) and measures `.scrolly-graphic`'s own bounding box against the window it was
 * opened in.
 *
 * This is the CONTAINER-level reading — this vehicle's own scaffold gives every beat a fixed graphic
 * that fills the frame by construction (`render-scrolly.mjs`, "THE GRAPHIC FILLS THE FRAME"), and
 * this file proves that promise against real delivered pages rather than trusting the CSS. Whether
 * the DRAWING inside that container makes honest use of it — `stress-g-eight-checkpoints`'s own
 * defect, a track occupying roughly 15% of the frame it was given — is a different question, answered
 * by this format's own `reveal-fills-the-frame` guard instead.
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
import { render } from "../scripts/render-scrolly.mjs";

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
      const el = document.querySelector(".scrolly-graphic");
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { width: r.width, height: r.height };
    });
    if (!box)
      throw new Error(`${file}: no .scrolly-graphic on the delivered page`);
    return (box.width * box.height) / (w * h);
  } finally {
    await browser.close();
  }
}

describe("graphicFillsItsFrame — the graphic's own share of the window, measured", () => {
  it("clears this format's own floor on the seed, at every width", async () => {
    const outDir = mkdtempSync(join(tmpdir(), "scrolly-frame-"));
    try {
      const { outPath } = await render({ outDir });
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

  it("clears this format's own floor on stress-g-eight-checkpoints, at every width", async () => {
    const file = join(
      TWIN,
      "stories/stress-g-eight-checkpoints/beats/eight-checkpoints-scrolly/renders/eight-checkpoints.html",
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
