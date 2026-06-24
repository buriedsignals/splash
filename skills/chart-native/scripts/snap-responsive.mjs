// Proof for the two fixes a static PNG can't show on its own:
//  (1) RESPONSIVE — the same embed re-laid-out at several container widths.
//  (2) INTRO REVEAL — the line animating from 0 (early frame) to full.
// Loads the single-file interactive build, drives the browser, screenshots.
import { chromium } from "playwright";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const outDir = process.argv[2] ?? "/tmp";
const url = pathToFileURL(join(root, "dist/interactive/index.html")).href;

const browser = await chromium.launch();

// (1) responsive: three viewport widths, each screenshot after the reveal settles
for (const w of [360, 768, 1100]) {
  const page = await browser.newPage({
    viewport: { width: w, height: 560 },
    deviceScaleFactor: 2,
  });
  await page.goto(url);
  await page.waitForSelector(".series-line");
  await page.waitForTimeout(1700); // let the reveal finish
  await page.locator("#root > div").screenshot({
    path: join(outDir, `responsive-${w}.png`),
  });
  console.log(`responsive-${w}.png`);
  await page.close();
}

// (2) intro reveal: capture an EARLY frame (line barely drawn) to prove it
// starts at 0, then the settled frame.
{
  const page = await browser.newPage({
    viewport: { width: 900, height: 560 },
    deviceScaleFactor: 2,
  });
  await page.goto(url);
  await page.waitForSelector(".series-line");
  await page.waitForTimeout(220); // ~early in the 1200ms eased reveal
  await page.locator("#root > div").screenshot({
    path: join(outDir, "reveal-early.png"),
  });
  console.log("reveal-early.png");
  await page.close();
}

await browser.close();
console.log("Done.");
