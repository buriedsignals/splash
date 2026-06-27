// Proof snap for the choropleth interactive build.
// Loads dist/interactive/index.html, waits for the map layer to exist and be idle,
// moves the mouse over filled regions, asserts a popup appears with the value,
// and screenshots to output-proof/choropleth/interactive.png.
import { chromium } from "playwright";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { mkdir } from "node:fs/promises";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const outDir = process.env.OUTDIR ?? join(root, "output-proof", "choropleth");
await mkdir(outDir, { recursive: true });

const htmlPath = join(root, "dist", "interactive", "index.html");
const fileUrl = pathToFileURL(htmlPath).href;

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1200, height: 700 },
  deviceScaleFactor: 2,
});

console.log("loading:", fileUrl);
await page.goto(fileUrl);

// Wait for the map canvas to appear
await page.waitForSelector(".maplibregl-canvas", { timeout: 30_000 });
console.log("canvas ready");

// Wait until the choropleth-fill layer exists (exposed via window.__map__)
await page.waitForFunction(
  () => {
    const m = window.__map__;
    return m && m.getLayer && m.getLayer("choropleth-fill");
  },
  { timeout: 30_000 },
);
console.log("choropleth-fill layer ready");

// Wait for map to reach idle state (synchronous boolean poll — Promise return is always truthy)
await page.waitForFunction(
  () => {
    const m = window.__map__;
    return (
      m &&
      m.loaded &&
      m.loaded() &&
      m.areTilesLoaded &&
      m.areTilesLoaded()
    );
  },
  { timeout: 30_000 },
);
console.log("map idle");

// Short settle for paint to flush
await page.waitForTimeout(300);

console.log("scanning for filled regions to trigger popup");

const viewport = page.viewportSize();
const cx = viewport.width / 2;
const cy = viewport.height / 2;

// Query the map from JS to find screen coordinates of known data regions
const regionScreenCoords = await page.evaluate(() => {
  const m = window.__map__;
  if (!m) return [];
  // Try known country centroids (NOR, SWE, DEU, FRA, ESP, GBR, ITA, POL)
  const centroids = [
    { name: "NOR", lng: 15, lat: 65 },
    { name: "SWE", lng: 18, lat: 60 },
    { name: "DEU", lng: 10, lat: 51 },
    { name: "FRA", lng: 2, lat: 46 },
    { name: "GBR", lng: -2, lat: 54 },
    { name: "ESP", lng: -4, lat: 40 },
    { name: "ITA", lng: 12, lat: 43 },
    { name: "POL", lng: 20, lat: 52 },
  ];
  return centroids.map(({ name, lng, lat }) => {
    const pt = m.project([lng, lat]);
    return { name, x: Math.round(pt.x), y: Math.round(pt.y) };
  });
});

console.log("candidate screen coords:", JSON.stringify(regionScreenCoords));

let popupText = null;
let hitPoint = null;

// Try the known region centroids first
for (const { name, x, y } of regionScreenCoords) {
  if (x < 0 || y < 0 || x > viewport.width || y > viewport.height) continue;
  await page.mouse.move(x, y);
  await page.waitForTimeout(200);

  const popup = page.locator(".maplibregl-popup");
  const count = await popup.count();
  if (count > 0) {
    popupText = await popup.textContent();
    hitPoint = { name, x, y };
    break;
  }
}

// Fallback: grid scan
if (!popupText) {
  console.log("centroid scan missed — grid scanning");
  for (let x = 80; x <= viewport.width - 80; x += 20) {
    for (let y = 80; y <= viewport.height - 80; y += 20) {
      await page.mouse.move(x, y);
      await page.waitForTimeout(60);
      const popup = page.locator(".maplibregl-popup");
      const count = await popup.count();
      if (count > 0) {
        popupText = await popup.textContent();
        hitPoint = { x, y };
        break;
      }
    }
    if (popupText) break;
  }
}

if (!popupText) {
  console.error("no popup found — taking screenshot for debugging");
  await page.screenshot({ path: join(outDir, "interactive.png") });
  console.log("wrote interactive.png (no popup detected)");
  await browser.close();
  process.exit(1);
}

const trimmed = popupText.trim();
console.log(`popup at ${JSON.stringify(hitPoint)}: "${trimmed}"`);

// Assert popup contains both a digit (value) and a word (region name)
if (!/\d/.test(trimmed)) {
  console.error(`popup has no value (digit): "${trimmed}"`);
  await browser.close();
  process.exit(1);
}
if (!/[A-Za-z]/.test(trimmed)) {
  console.error(`popup has no region name: "${trimmed}"`);
  await browser.close();
  process.exit(1);
}
console.log("popup value assertion passed");

// Ensure popup is still visible for the screenshot
if (hitPoint) {
  await page.mouse.move(hitPoint.x, hitPoint.y);
  await page.waitForTimeout(200);
}

await page.screenshot({ path: join(outDir, "interactive.png") });
console.log("wrote interactive.png");

await browser.close();
