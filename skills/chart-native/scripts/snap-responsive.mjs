// Proof for the two fixes a static PNG can't show on its own:
//  (1) RESPONSIVE — the same embed re-laid-out at several container widths.
//  (2) INTRO REVEAL — the line animating from 0 (early frame) to full.
// Loads the single-file interactive build, drives the browser, screenshots.
import { chromium } from "playwright";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const chart = process.env.CHART ?? "line";
const outDir = process.argv[2] ?? "/tmp";
const distInteractive =
  chart === "line" ? "dist/interactive" : `dist/${chart}/interactive`;
const marker =
  chart === "bar" ? ".bar" : chart === "scatter" ? ".scatter-dot" : chart === "pie" ? ".pie-slice" : chart === "stacked" ? ".stack-seg" : chart === "slope" ? ".slope-line" : chart === "grouped" ? ".grouped-bar" : chart === "dumbbell" ? ".dumbbell-dot" : chart === "stacked-area" ? ".stacked-area-band" : chart === "heatmap" ? ".heat-cell" : chart === "histogram" ? ".hist-bar" : chart === "diverging" ? ".diverging-bar" : chart === "waterfall" ? ".waterfall-bar" : chart === "lollipop" ? ".lollipop-dot" : ".series-line";
const url = pathToFileURL(join(root, distInteractive, "index.html")).href;

const browser = await chromium.launch();

// (1) responsive: three viewport widths, each screenshot after the reveal settles
for (const w of [360, 768, 1100, 1600]) {
  const page = await browser.newPage({
    viewport: { width: w, height: 560 },
    deviceScaleFactor: 2,
  });
  await page.goto(url);
  await page.waitForSelector(marker);
  await page.waitForTimeout(2100); // let the reveal finish
  await page.locator("#root > div").screenshot({
    path: join(outDir, `responsive-${w}.png`),
  });
  console.log(`responsive-${w}.png`);
  await page.close();
}

// (2) intro reveal: the WHOLE chart builds from nothing — chrome (axes/grid/
// labels) fades in first, then the line draws. Capture two stages to prove it.
for (const [ms, name] of [
  [360, "reveal-1-chrome.png"], // axes/grid fading in, line not started
  [680, "reveal-2-line.png"], // chrome in, line drawing
]) {
  const page = await browser.newPage({
    viewport: { width: 900, height: 560 },
    deviceScaleFactor: 2,
  });
  await page.goto(url);
  await page.waitForSelector("svg");
  await page.waitForTimeout(ms);
  await page.locator("#root > div").screenshot({ path: join(outDir, name) });
  console.log(name);
  await page.close();
}

await browser.close();
console.log("Done.");
