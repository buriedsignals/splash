// Loads the built dist/index.html in a browser, scrolls through the steps, and asserts
// the map camera changes between the first step and a REVEAL step (scroll drives the map).
// NB: compare against a reveal step, NOT the last step — the title and takeaway beats both
// frame the full data extent, so their cameras coincide and comparing them is a false negative.
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
// Also assert the page is actually scrollable (the sticky-graphic layout must leave
// the document taller than the viewport, or nothing can drive the steps).
const scrollable = await page.evaluate(
  () => document.documentElement.scrollHeight > window.innerHeight + 100,
);
if (!scrollable) {
  console.error("✗ scroll smoke FAILED: document is not scrollable (sticky layout collapsed the height)");
  process.exit(1);
}

const before = await centerAt();
// Scroll to ~45% — a REVEAL step (the camera zooms to a region there). Comparing
// against the last step would compare two full-extent cameras (false negative).
await page.evaluate(() =>
  window.scrollTo(0, (document.documentElement.scrollHeight - window.innerHeight) * 0.45),
);
await page.waitForTimeout(2500); // let flyTo settle
const after = await centerAt();
const step = await page.evaluate(() => window.__scrolly_step__);

const moved =
  Math.abs(after.lng - before.lng) > 0.5 ||
  Math.abs(after.lat - before.lat) > 0.5 ||
  Math.abs(after.zoom - before.zoom) > 0.3;
if (!moved) {
  console.error(`✗ scroll smoke FAILED: camera did not change (before ${JSON.stringify(before)}, after ${JSON.stringify(after)}, step ${step})`);
  process.exit(1);
}
console.log(`✓ scroll smoke GREEN — scrollable + camera moved on scroll to step ${step} (${JSON.stringify(before)} → ${JSON.stringify(after)}).`);
await browser.close();
