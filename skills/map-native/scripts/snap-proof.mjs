// Proof snap for the interactive build.
// Loads dist/interactive/index.html, waits for the map layer to exist and be idle,
// dispatches on layer type (choropleth-fill vs symbol-circles), triggers a hover
// popup, and screenshots to OUTDIR/interactive.png.
import { chromium } from "playwright";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { mkdir } from "node:fs/promises";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const outDir = process.env.OUTDIR ?? join(root, "output-proof", "default");
await mkdir(outDir, { recursive: true });

const interactiveDir = process.env.SERVE_DIR ?? join(root, "dist", "interactive");
const htmlPath = join(interactiveDir, "index.html");
const fileUrl = pathToFileURL(htmlPath).href;

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1200, height: 700 },
  deviceScaleFactor: 2,
});

console.log("loading:", fileUrl);
await page.goto(fileUrl);

// Wait for the map canvas to appear
await page.waitForSelector(".maplibregl-canvas", { timeout: 60_000 });
console.log("canvas ready");

// Wait until either choropleth-fill or symbol-circles layer exists
await page.waitForFunction(
  () => {
    const m = window.__map__;
    return (
      m &&
      m.getLayer &&
      (m.getLayer("choropleth-fill") || m.getLayer("symbol-circles"))
    );
  },
  { timeout: 60_000 },
);

// Detect which layer type we have
const layerType = await page.evaluate(() => {
  const m = window.__map__;
  if (m.getLayer("symbol-circles")) return "symbol";
  return "choropleth";
});
console.log(`layer type: ${layerType}`);

// Wait for map to reach idle state
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
  { timeout: 60_000 },
);
console.log("map idle");

// Short settle for paint to flush
await page.waitForTimeout(300);

const viewport = page.viewportSize();

let popupText = null;
let hitPoint = null;

if (layerType === "symbol") {
  console.log("symbol mode: finding largest circle by radius property");

  // Query rendered features from symbol-circles, pick the one with the largest radius
  const largestFeatureCoords = await page.evaluate(() => {
    const m = window.__map__;
    const features = m.queryRenderedFeatures({ layers: ["symbol-circles"] });
    if (!features || features.length === 0) return null;
    // Sort by radius desc, pick the largest
    features.sort(
      (a, b) => (b.properties?.radius ?? 0) - (a.properties?.radius ?? 0),
    );
    const f = features[0];
    const coords = f.geometry.coordinates;
    const pt = m.project(coords);
    return { x: Math.round(pt.x), y: Math.round(pt.y), label: f.properties?.label };
  });

  if (largestFeatureCoords) {
    console.log(
      `largest circle: "${largestFeatureCoords.label}" at screen (${largestFeatureCoords.x}, ${largestFeatureCoords.y})`,
    );
    const { x, y } = largestFeatureCoords;
    await page.mouse.move(x, y);
    await page.waitForTimeout(400);

    const popup = page.locator(".maplibregl-popup");
    const count = await popup.count();
    if (count > 0) {
      popupText = await popup.textContent();
      hitPoint = { x, y };
    }
  }

  // Fallback: grid scan if the projected point missed
  if (!popupText) {
    console.log("projected point missed — grid scanning for symbol popup");
    for (let x = 80; x <= viewport.width - 80; x += 15) {
      for (let y = 80; y <= viewport.height - 80; y += 15) {
        await page.mouse.move(x, y);
        await page.waitForTimeout(50);
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
} else {
  // Choropleth path — unchanged
  console.log("scanning for filled regions to trigger popup");

  const regionScreenCoords = await page.evaluate(() => {
    const m = window.__map__;
    if (!m) return [];
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

// Assert popup contains both a digit (value) and a word (region/city name)
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
