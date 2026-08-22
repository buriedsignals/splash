/**
 * THE MARKS SSR SHIPPED, STILL THERE WITH SCRIPTING GONE.
 *
 * `ChartWebSeed.tsx`'s own numbered list states the discipline: `tabIndex`/`aria-label` are
 * "written on every point at build time — not assembled by the inline script — so the no-JS frame
 * is still keyboard-reachable... with the script absent entirely." This is the measurement that
 * claim earns for the marks themselves, not just their keyboard reach: does the population of
 * `data-detail` marks survive turning JavaScript off, or was it built by the very script being
 * removed.
 */
import { describe, expect, it, setDefaultTimeout } from "bun:test";
import { existsSync, mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import puppeteer from "puppeteer";
import { staticFrameSurvives } from "../scripts/detect-degrades-without-javascript.mjs";
import { deliveredPages } from "../scripts/delivered-pages.mjs";

const SKILL = resolve(import.meta.dirname, "..");
const TWIN = resolve(SKILL, "..", "..");

setDefaultTimeout(600000);

/** `page.reload()` only has something real to reload when the page was navigated with `goto()` to
 *  an actual URL — `setContent()` has none, and a reload of it goes to a blank page, which is a
 *  fact about Puppeteer rather than about the detector. Every synthetic fixture below writes its
 *  markup to a real temp file and `goto()`s it, so `staticFrameSurvives`'s own internal reload has
 *  a URL to return to — exactly the shape a delivered `file://` beat already has. */
function fixture(html: string): string {
  const dir = mkdtempSync(join(tmpdir(), "chart-web-nojs-"));
  const path = join(dir, "fixture.html");
  writeFileSync(path, html);
  return path;
}

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

describe("the mark population, before and after scripting is removed", () => {
  it("counts marks baked at build time as surviving, unchanged", async () => {
    const browser = await puppeteer.launch({ executablePath: resolveChrome() });
    try {
      const page = await browser.newPage();
      await page.goto(`file://${fixture(
        `<button data-detail="a">•</button><button data-detail="b">•</button>`,
      )}`, { waitUntil: "load" });
      expect(await staticFrameSurvives(page)).toEqual({ marksWithJs: 2, marksWithout: 2 });
    } finally {
      await browser.close();
    }
  });

  it("catches marks a script builds that scripting-off never gets", async () => {
    const browser = await puppeteer.launch({ executablePath: resolveChrome() });
    try {
      const page = await browser.newPage();
      await page.goto(`file://${fixture(
        `<div id="root"></div>
         <script>
           document.getElementById("root").innerHTML =
             '<button data-detail="a"></button><button data-detail="b"></button>';
         </script>`,
      )}`, { waitUntil: "load" });
      expect(await staticFrameSurvives(page)).toEqual({ marksWithJs: 2, marksWithout: 0 });
    } finally {
      await browser.close();
    }
  });

  it("says nothing about a page whose marks announce nothing", async () => {
    const browser = await puppeteer.launch({ executablePath: resolveChrome() });
    try {
      const page = await browser.newPage();
      await page.goto(`file://${fixture(`<svg><circle/></svg>`)}`, { waitUntil: "load" });
      expect(await staticFrameSurvives(page)).toEqual({ marksWithJs: 0, marksWithout: 0 });
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
  it("keeps every mark when scripting is taken away", async () => {
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
      for (const file of files) {
        const page = await browser.newPage();
        await page.goto(`file://${file}`, { waitUntil: "load" });
        const found = await staticFrameSurvives(page);
        if (found.marksWithout !== found.marksWithJs || found.marksWithJs === 0)
          offenders.push(`${file.slice(TWIN.length + 1)}: ${JSON.stringify(found)}`);
        await page.close();
      }
    } finally {
      await browser.close();
    }
    expect(offenders).toEqual([]);
  });
});
