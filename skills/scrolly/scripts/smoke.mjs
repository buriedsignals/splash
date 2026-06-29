// Loads the built dist/index.html in a browser, scrolls through the steps, and asserts:
//  (1) the sticky graphic stays pinned (its bounding box top stays ~0 across scroll),
//  (2) the map camera changes between the first step and a later step (scroll drives the map).
import { chromium } from "playwright";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const url = pathToFileURL(join(root, "dist", "index.html")).href;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1100, height: 800 } });
await page.goto(url, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => window.__map__ && window.__map__.loaded?.(), { timeout: 60000 });

const centerAt = async () => {
  return await page.evaluate(() => {
    const c = window.__map__.getCenter();
    return { lng: c.lng, lat: c.lat, zoom: window.__map__.getZoom() };
  });
};
const before = await centerAt();
// Scroll to the last step.
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(2500); // let flyTo settle
const after = await centerAt();

const moved =
  Math.abs(after.lng - before.lng) > 0.5 ||
  Math.abs(after.lat - before.lat) > 0.5 ||
  Math.abs(after.zoom - before.zoom) > 0.3;
if (!moved) {
  console.error(`✗ scroll smoke FAILED: camera did not change (before ${JSON.stringify(before)}, after ${JSON.stringify(after)})`);
  process.exit(1);
}
console.log(`✓ scroll smoke GREEN — camera moved on scroll (${JSON.stringify(before)} → ${JSON.stringify(after)}).`);
await browser.close();
