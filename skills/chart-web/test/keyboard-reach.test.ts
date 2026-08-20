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
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import puppeteer from "puppeteer";
import { keyboardReachesEveryMark } from "../scripts/detect-reachable-by-keyboard.mjs";

const SKILL = resolve(import.meta.dirname, "..");
const TWIN = resolve(SKILL, "..", "..");
const PROOF = join(TWIN, "proof");

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

/** Whether SOME `.mjs` directly inside `dir` imports chart-web's own `render-web.mjs` by path —
 *  told apart from its `map-web` sibling (both live under `proof/`, both ship self-contained HTML
 *  with `data-detail` marks) by the one thing that cannot drift silently: which format's own
 *  `renderWeb` actually wrote the file. Checked against the page's OWN directory and its PARENT:
 *  a runner usually sits beside its own output (`proof/co2-suisse/render-web.mjs` next to
 *  `co2.html`) but not always — `proof/web-co2-ranking/render-web.mjs` writes one directory down,
 *  into `dist/co2-ranking.html` — and a same-directory-only check silently skipped that page
 *  (measured 2026-08-20, reproduced standalone: 17 files found, not 18). */
function importsChartWebRenderer(dir: string): boolean {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return false;
  return readdirSync(dir)
    .filter((name) => name.endsWith(".mjs"))
    .some((name) =>
      readFileSync(join(dir, name), "utf8").includes(
        "skills/chart-web/scripts/render-web.mjs",
      ),
    );
}

/** Every delivered `chart-web` page on disk — the same discovery `accessible-table.test.ts` uses. */
function chartWebArtifacts(): string[] {
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.name.endsWith(".html")) {
        const source = readFileSync(path, "utf8");
        if (/data-step|step-panel/.test(source)) continue; // scrolly, not this format
        if (importsChartWebRenderer(dir) || importsChartWebRenderer(dirname(dir))) found.push(path);
      }
    }
  };
  if (existsSync(PROOF) && statSync(PROOF).isDirectory()) walk(PROOF);
  return found;
}

describe("every chart-web page on disk", () => {
  it("is reachable by Tab and names every one of its marks", async () => {
    const files = chartWebArtifacts();
    // Same exact count as `accessible-table.test.ts`, for the same reason: this walker used to be
    // the same-directory-only version (measured 2026-08-20: 17 files, silently missing
    // `web-co2-ranking/dist/co2-ranking.html`, whose runner writes one directory down from its own
    // output) until fix round 1 gave it the parent-directory fallback above. Asserted exactly, not
    // just a floor, so a count that creeps back down to 17 fails loudly.
    expect(files.length).toBe(18);
    const browser = await puppeteer.launch({ executablePath: resolveChrome() });
    const offenders: string[] = [];
    try {
      const page = await browser.newPage();
      for (const file of files) {
        await page.goto(`file://${file}`, { waitUntil: "load" });
        const found = await keyboardReachesEveryMark(page);
        if (found.focusable !== found.marks || found.detailShown !== found.marks)
          offenders.push(`${file.slice(TWIN.length + 1)}: ${JSON.stringify(found)}`);
      }
    } finally {
      await browser.close();
    }
    expect(offenders).toEqual([]);
  });
});
