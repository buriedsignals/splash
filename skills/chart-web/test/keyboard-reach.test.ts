/**
 * THE READER'S OWN `Tab`, NOT `.focus()` — SEE THE DETECTOR'S OWN DOC COMMENT FOR WHY.
 *
 * `chart-web` ships `tabIndex={0}` and a per-reading `aria-label` on every point at build time
 * (`assets/ChartWebSeed.tsx`, item 2 of the seed's own numbered list) — a decision made long before
 * this capability had a name in the catalogue. This file is the measurement that decision earns:
 * that a real `Tab` sequence, driven at the CDP input level, actually lands on every one of them and
 * that each carries an accessible name a reader who cannot see the picture would hear or read.
 */
import { describe, expect, it, setDefaultTimeout } from "bun:test";
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import puppeteer from "puppeteer";
import { deliveredPages } from "../scripts/delivered-pages.mjs";
import { RECORDED_PAGES, pagesThatLeftTheWalk } from "./delivered-pages-ratchet.ts";
import { keyboardReachesEveryMark } from "../scripts/detect-reachable-by-keyboard.mjs";

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

describe("Tab reaches every mark and each one names itself", () => {
  it("counts a mark that is both focusable and named", async () => {
    const browser = await puppeteer.launch({ executablePath: resolveChrome() });
    try {
      const page = await browser.newPage();
      await page.setContent(
        `<button data-detail="1950 · 68.9 years" aria-label="1950: 68.9 years">•</button>`,
      );
      expect(await keyboardReachesEveryMark(page)).toEqual({
        marks: 1,
        focusable: 1,
        detailShown: 1,
      });
    } finally {
      await browser.close();
    }
  });

  it("counts a mark reached by Tab but silent about what it is", async () => {
    const browser = await puppeteer.launch({ executablePath: resolveChrome() });
    try {
      const page = await browser.newPage();
      await page.setContent(`<button data-detail="1950 · 68.9 years">•</button>`);
      expect(await keyboardReachesEveryMark(page)).toEqual({
        marks: 1,
        focusable: 1,
        detailShown: 0,
      });
    } finally {
      await browser.close();
    }
  });

  it("refuses to count a mark Tab never reaches", async () => {
    const browser = await puppeteer.launch({ executablePath: resolveChrome() });
    try {
      const page = await browser.newPage();
      await page.setContent(
        `<span data-detail="1950 · 68.9 years" aria-label="1950: 68.9 years">•</span>`,
      );
      expect(await keyboardReachesEveryMark(page)).toEqual({
        marks: 1,
        focusable: 0,
        detailShown: 0,
      });
    } finally {
      await browser.close();
    }
  });

  it("says nothing about a page whose marks announce nothing", async () => {
    const browser = await puppeteer.launch({ executablePath: resolveChrome() });
    try {
      const page = await browser.newPage();
      await page.setContent(`<svg><circle/></svg>`);
      expect(await keyboardReachesEveryMark(page)).toMatchObject({ marks: 0 });
    } finally {
      await browser.close();
    }
  });
});

/** Every delivered `chart-web` page on disk — the same discovery `accessible-table.test.ts` uses. */
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
  it("is reachable by Tab and names every one of its marks", async () => {
    const files = chartWebArtifacts();
    // A RATCHET OVER NAMES, NOT A COUNT. This walk once silently dropped a page (`web-co2-ranking`,
    // until the parent-directory lookup `deliveredPages` replaced), so a page LEAVING it must fail
    // loudly — but the `toBe(24)` this replaced could only say the total moved, stayed green on
    // one-in-one-out, and charged every shipped story a five-file edit indistinguishable from the
    // edit that papers the drop over. `RECORDED_PAGES` names the population instead: a page joins
    // freely and is measured by this loop from its first run, and one that leaves is named here.
    // Argued in full in `test/delivered-pages-ratchet.ts`.
    expect(pagesThatLeftTheWalk(RECORDED_PAGES, files, TWIN)).toEqual([]);
    const browser = await puppeteer.launch({ executablePath: resolveChrome() });
    const offenders: string[] = [];
    try {
      const page = await browser.newPage();
      for (const file of files) {
        await page.goto(`file://${file}`, { waitUntil: "load" });
        const found = await keyboardReachesEveryMark(page);
        // `|| found.marks === 0` — otherwise a zero-mark page passes vacuously (`0 !== 0` is
        // false on both sides). Its sibling `degrades-without-javascript.test.ts` already refuses
        // `marksWithJs === 0` the same way.
        if (found.focusable !== found.marks || found.detailShown !== found.marks || found.marks === 0)
          offenders.push(`${file.slice(TWIN.length + 1)}: ${JSON.stringify(found)}`);
      }
    } finally {
      await browser.close();
    }
    expect(offenders).toEqual([]);
  });
});
