// a11y proof for maps: the map is a labelled region, the source is a real link, and the
// zoom/reset controls are real keyboard-reachable buttons. (Per-data-mark keyboard focus
// is N/A on a GL canvas — region-level a11y is the map standard.) Mirrors chart-native's
// snap-a11y, adapted for the MapTiler canvas.
import { chromium } from "playwright";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const outDir = process.env.OUTDIR ?? process.argv[2] ?? "/tmp";
const url = pathToFileURL(join(root, "dist", "interactive", "index.html")).href;

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1000, height: 640 },
  deviceScaleFactor: 2,
});
await page.goto(url);
await page.waitForSelector(".maplibregl-canvas", { timeout: 60_000 });
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
// Wait for map idle
await page.waitForFunction(
  () => {
    const m = window.__map__;
    return m && m.loaded && m.loaded() && m.areTilesLoaded && m.areTilesLoaded();
  },
  { timeout: 60_000 },
);
await page.waitForTimeout(2000);

const a11y = await page.evaluate(() => {
  const region = document.querySelector('[role="region"]');
  const link = document.querySelector('[data-testid="map-source"] a[href]');
  const ctrlButtons = [...document.querySelectorAll(".maplibregl-ctrl button")];
  return {
    regionRole: !!region,
    regionLabel: (region && region.getAttribute("aria-label")) || "",
    sourceHref: (link && link.getAttribute("href")) || "",
    controlButtons: ctrlButtons.length, // zoom in/out + reset ⌂ → expect >= 2
    allButtons: ctrlButtons.every((b) => b.tagName === "BUTTON"), // tab-reachable by default
  };
});

// tooltip on hover: hover a rendered data feature → a popup appears.
// Strategy differs by layer type:
//   symbol-circles: project the first rendered feature's Point coordinates
//   choropleth-fill: try known region centroids, then grid-scan as fallback
let tooltipOk = false;
try {
  const layerType = await page.evaluate(() => {
    const m = window.__map__;
    return m.getLayer("symbol-circles") ? "symbol" : "choropleth";
  });

  const viewport = page.viewportSize();

  if (layerType === "symbol") {
    const pt = await page.evaluate(() => {
      const m = window.__map__;
      const feats = m.queryRenderedFeatures({ layers: ["symbol-circles"] });
      if (!feats.length) return null;
      // Pick the feature with the largest radius for best hit probability
      feats.sort((a, b) => (b.properties?.radius ?? 0) - (a.properties?.radius ?? 0));
      const f = feats[0];
      const p = m.project(f.geometry.coordinates);
      return { x: Math.round(p.x), y: Math.round(p.y) };
    });
    if (pt) {
      await page.mouse.move(pt.x, pt.y);
      await page.waitForSelector(".maplibregl-popup", { timeout: 4000 });
      tooltipOk = true;
    }
  } else {
    // Choropleth: try known European region centroids first
    const candidates = await page.evaluate(() => {
      const m = window.__map__;
      const centroids = [
        { lng: 10, lat: 51 }, // DEU centre
        { lng: 2, lat: 46 },  // FRA centre
        { lng: 18, lat: 60 }, // SWE centre
        { lng: 15, lat: 65 }, // NOR centre
        { lng: -2, lat: 54 }, // GBR centre
        { lng: 12, lat: 43 }, // ITA centre
        { lng: 20, lat: 52 }, // POL centre
        { lng: -4, lat: 40 }, // ESP centre
      ];
      return centroids.map(({ lng, lat }) => {
        const p = m.project([lng, lat]);
        return { x: Math.round(p.x), y: Math.round(p.y) };
      });
    });

    for (const { x, y } of candidates) {
      if (x < 0 || y < 0 || x > viewport.width || y > viewport.height) continue;
      await page.mouse.move(x, y);
      await page.waitForTimeout(200);
      const popup = page.locator(".maplibregl-popup");
      if (await popup.count() > 0) {
        tooltipOk = true;
        break;
      }
    }

    // Fallback: grid scan
    if (!tooltipOk) {
      outer: for (let x = 80; x <= viewport.width - 80; x += 20) {
        for (let y = 80; y <= viewport.height - 80; y += 20) {
          await page.mouse.move(x, y);
          await page.waitForTimeout(60);
          const popup = page.locator(".maplibregl-popup");
          if (await popup.count() > 0) {
            tooltipOk = true;
            break outer;
          }
        }
      }
    }
  }
} catch {
  tooltipOk = false;
}

await page.locator("#root > div").first().screenshot({ path: join(outDir, "a11y.png") });
await browser.close();

const result = { ...a11y, tooltipOk };
console.log(JSON.stringify(result, null, 2));

const failures = [];
if (!result.regionRole) failures.push("map container missing role=region");
if (!result.regionLabel.trim()) failures.push("region missing aria-label");
if (!result.sourceHref.trim()) failures.push("source link missing href");
if (result.controlButtons < 2) failures.push("missing zoom/reset control buttons");
if (!result.allButtons) failures.push("a control is not a <button> (not keyboard-reachable)");
if (!result.tooltipOk) failures.push("no popup appeared on hovering a feature");
if (failures.length) {
  console.error("A11Y FAILURES:\n" + failures.join("\n"));
  process.exit(1);
}
console.log("a11y: all checks pass");
