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
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import puppeteer from "puppeteer";
import { render } from "../scripts/render-web.mjs";
import { motionUnderReduce } from "../scripts/detect-honours-reduced-motion.mjs";

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

/** Every delivered `chart-web` page on disk — the same discovery `accessible-table.test.ts` and
 *  `keyboard-reach.test.ts` use. */
function importsChartWebRenderer(dir: string): boolean {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return false;
  return readdirSync(dir)
    .filter((name) => name.endsWith(".mjs"))
    .some((name) =>
      readFileSync(join(dir, name), "utf8").includes("skills/chart-web/scripts/render-web.mjs"),
    );
}

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
  it("shows no motion at all while the reader has asked for none", async () => {
    const files = chartWebArtifacts();
    expect(files.length).toBeGreaterThanOrEqual(17);
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
