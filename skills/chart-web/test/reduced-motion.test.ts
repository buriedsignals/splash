/**
 * A READER WHO ASKED THEIR OS FOR LESS MOTION GETS NONE — MEASURED, NOT ASSUMED.
 *
 * `render-web.mjs`'s own `entranceCss()` gates every keyframe inside
 * `@media (prefers-reduced-motion: no-preference)` rather than resetting `animation: none` back
 * under `reduce` (that file's own doc comment argues why: a reset depends on a cascade nobody can
 * see and can be outweighed). This is the measurement that argument earns: driven live, does a page
 * under `reduce` actually never show an interpolating value, and does a page WITHOUT it actually
 * show one — so a suite that always reported zero either way could never be mistaken for proof.
 */
import { describe, expect, it, setDefaultTimeout } from "bun:test";
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import puppeteer from "puppeteer";
import { render } from "../scripts/render-web.mjs";
import { motionUnderReduce } from "../scripts/detect-honours-reduced-motion.mjs";
import { deliveredPages } from "../scripts/delivered-pages.mjs";

const SKILL = resolve(import.meta.dirname, "..");
const TWIN = resolve(SKILL, "..", "..");

setDefaultTimeout(600000);

/** A DUPLICATE of the `resolveChrome` every browser-driving file in this tree carries — duplicated,
 *  not imported, for the reason every other copy in this repository states. */
function resolveChrome(): string {
  const candidates: string[] = [];
  if (process.env.CHROME_PATH) candidates.push(process.env.CHROME_PATH);
  const cache = join(homedir(), ".cache/puppeteer/chrome");
  if (existsSync(cache))
    for (const build of readdirSync(cache).sort().reverse())
      candidates.push(
        join(cache, build, "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"),
        join(cache, build, "chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"),
        join(cache, build, "chrome-linux64/chrome"),
      );
  candidates.push("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");
  const found = candidates.find((path) => existsSync(path));
  if (!found) throw new Error(`no Chrome to drive with. Looked in:\n  ${candidates.join("\n  ")}`);
  return found;
}

describe("motion mid-flight is measured, not merely a difference or a fraction", () => {
  it("counts a real 300ms CSS transition passing through an intermediate opacity", async () => {
    const browser = await puppeteer.launch({ executablePath: resolveChrome() });
    try {
      const page = await browser.newPage();
      await page.setContent(
        `<style>#m{opacity:0;transition:opacity .3s linear}#m.go{opacity:1}</style>
         <div id="m"></div>
         <script>requestAnimationFrame(()=>document.getElementById("m").classList.add("go"))</script>`,
      );
      const found = await motionUnderReduce(page);
      expect(found.movedFrames).toBeGreaterThan(0);
    } finally {
      await browser.close();
    }
  });

  it("does not count an instant class swap with no transition property", async () => {
    const browser = await puppeteer.launch({ executablePath: resolveChrome() });
    try {
      const page = await browser.newPage();
      await page.setContent(
        `<style>#m{opacity:0}#m.go{opacity:1}</style>
         <div id="m"></div>
         <script>requestAnimationFrame(()=>document.getElementById("m").classList.add("go"))</script>`,
      );
      const found = await motionUnderReduce(page);
      expect(found).toEqual({ movedFrames: 0, totalFrames: found.totalFrames });
    } finally {
      await browser.close();
    }
  });

  it("does not count an element permanently drawn at a fractional opacity", async () => {
    const browser = await puppeteer.launch({ executablePath: resolveChrome() });
    try {
      const page = await browser.newPage();
      await page.setContent(`<div style="opacity:0.5">watermark, never moves</div>`);
      const found = await motionUnderReduce(page);
      expect(found).toEqual({ movedFrames: 0, totalFrames: found.totalFrames });
    } finally {
      await browser.close();
    }
  });
});

describe("the seed's own entrance", () => {
  it("builds under normal conditions and does not build at all under reduce", async () => {
    const dir = mkdtempSync(join(tmpdir(), "chart-web-motion-"));
    const { outPath } = await render({
      dataPath: join(SKILL, "assets/sample-data/rainfall.json"),
      outDir: dir,
    });
    const browser = await puppeteer.launch({ executablePath: resolveChrome() });
    try {
      const normalPage = await browser.newPage();
      await normalPage.goto(`file://${outPath}`, { waitUntil: "load" });
      const normal = await motionUnderReduce(normalPage);
      expect(normal.movedFrames).toBeGreaterThan(0);

      const reducedPage = await browser.newPage();
      await reducedPage.emulateMediaFeatures([
        { name: "prefers-reduced-motion", value: "reduce" },
      ]);
      await reducedPage.goto(`file://${outPath}`, { waitUntil: "load" });
      const reduced = await motionUnderReduce(reducedPage);
      expect(reduced.movedFrames).toBe(0);
    } finally {
      await browser.close();
    }
  });
});

/** Every delivered `chart-web` page on disk, from EVERY root a beat can live in — not only
 *  `proof/`.
 *
 *  This walk used to start at `PROOF` and go no further, so the population it measured was the
 *  beats the SKILL wrote for itself and never a beat a journalist made. Six chart-web beats live
 *  under `stories/` today and not one of them had ever been put to any of these four capabilities.
 *  The very first run of the widened walk found one: a delivered page with no accessible table at
 *  all, 10 marks and 10 missing, which `proof/` could not see by construction.
 *
 *  `deliveredPages` (`scripts/delivered-pages.mjs`) is the derivation, shared by all four walks so
 *  a fifth cannot disagree with them about what a chart-web beat is. */
function chartWebArtifacts(): string[] {
  return deliveredPages(TWIN);
}

describe("every chart-web page on disk", () => {
  it("shows no motion at all while the reader has asked for none", async () => {
    const files = chartWebArtifacts();
    // Measured 2026-08-22, after the walk was widened from `proof/` alone to every root a beat
    // lives in: 24 delivered pages — the 18 under `proof/` this used to see, plus 6 under
    // `stories/`. Asserted exactly, not as a floor: a walk of this shape is exactly the kind of
    // check that silently drops a page (this one did, on `web-co2-ranking`, until the
    // parent-directory lookup that `deliveredPages` replaced), so a count that creeps back down
    // must fail loudly. A 25th delivered beat SHOULD turn this red — bump the number here and in
    // its four siblings rather than loosen it back to a floor.
    expect(files.length).toBe(24);
    const browser = await puppeteer.launch({ executablePath: resolveChrome() });
    const offenders: string[] = [];
    try {
      const page = await browser.newPage();
      await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
      for (const file of files) {
        await page.goto(`file://${file}`, { waitUntil: "load" });
        const found = await motionUnderReduce(page);
        if (found.movedFrames > 0)
          offenders.push(`${file.slice(TWIN.length + 1)}: ${JSON.stringify(found)}`);
      }
    } finally {
      await browser.close();
    }
    expect(offenders).toEqual([]);
  });
});
