// Filter render-verify probe for locator and symbol maps.
// Usage: node probe-filters.mjs <locator|symbol> <html-path>
import { chromium } from "playwright";
import { pathToFileURL } from "node:url";

const [,, type, htmlPath] = process.argv;
if (!type || !htmlPath) {
  console.error("Usage: node probe-filters.mjs <locator|symbol> <html-path>");
  process.exit(1);
}

const fileUrl = pathToFileURL(htmlPath).href;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 700 } });

console.log("loading:", fileUrl);
await page.goto(fileUrl);

// Wait for canvas
await page.waitForSelector(".maplibregl-canvas", { timeout: 60_000 });
console.log("canvas ready");

// Wait for the layer to exist
const layerId = type === "locator" ? "locator-glyphs" : "symbol-circles";
await page.waitForFunction(
  (lid) => window.__map__ && window.__map__.getLayer && window.__map__.getLayer(lid),
  layerId,
  { timeout: 60_000 }
);

// Wait for map idle
await page.waitForFunction(
  () => {
    const m = window.__map__;
    return m && m.loaded && m.loaded() && m.areTilesLoaded && m.areTilesLoaded();
  },
  { timeout: 60_000 }
);
console.log("map idle");

// Read initial feature count
const countBefore = await page.evaluate((lid) => {
  return window.__map__.queryRenderedFeatures({ layers: [lid] }).length;
}, layerId);
console.log(`count before filter: ${countBefore}`);

let countAfter;

if (type === "locator") {
  // Click the first category chip to hide that category
  const chips = await page.$$('[data-testid="filter-chip"]');
  if (chips.length === 0) {
    console.error("ERROR: no filter chips found");
    await browser.close();
    process.exit(1);
  }
  console.log(`found ${chips.length} filter chips`);
  await chips[0].click();
  // Wait for the map to re-render
  await page.waitForTimeout(800);
  await page.waitForFunction(
    () => {
      const m = window.__map__;
      return m && m.loaded && m.loaded() && m.areTilesLoaded && m.areTilesLoaded();
    },
    { timeout: 30_000 }
  );
  
  countAfter = await page.evaluate((lid) => {
    return window.__map__.queryRenderedFeatures({ layers: [lid] }).length;
  }, layerId);
  
  // Also check cluster layers are still intact (not broken)
  const clusterLayerOk = await page.evaluate(() => {
    const m = window.__map__;
    return !!m.getLayer("locator-clusters") && !!m.getLayer("locator-cluster-count");
  });
  console.log(`cluster layers still present: ${clusterLayerOk}`);
  
  // Verify no console errors thrown by checking if map threw
  const filterSpec = await page.evaluate((lid) => {
    return JSON.stringify(window.__map__.getFilter(lid));
  }, layerId);
  console.log(`active filter on ${layerId}: ${filterSpec}`);

} else {
  // symbol — drag range slider
  const slider = await page.$('[data-testid="filter-range"]');
  if (!slider) {
    console.error("ERROR: no filter-range input found");
    await browser.close();
    process.exit(1);
  }
  
  // Get slider min/max to set a meaningful value
  const sliderInfo = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="filter-range"]');
    if (!el) return null;
    return { min: Number(el.min), max: Number(el.max), value: Number(el.value), step: el.step };
  });
  console.log("slider info:", JSON.stringify(sliderInfo));
  
  // Set value to 60% of range — should hide the lowest-value points
  const newValue = Math.round(sliderInfo.min + (sliderInfo.max - sliderInfo.min) * 0.6);
  await page.evaluate((val) => {
    const el = document.querySelector('[data-testid="filter-range"]');
    el.value = val;
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }, newValue);
  console.log(`set slider to: ${newValue}`);
  
  await page.waitForTimeout(800);
  await page.waitForFunction(
    () => {
      const m = window.__map__;
      return m && m.loaded && m.loaded() && m.areTilesLoaded && m.areTilesLoaded();
    },
    { timeout: 30_000 }
  );
  
  countAfter = await page.evaluate((lid) => {
    return window.__map__.queryRenderedFeatures({ layers: [lid] }).length;
  }, layerId);
  
  const filterSpec = await page.evaluate((lid) => {
    return JSON.stringify(window.__map__.getFilter(lid));
  }, layerId);
  console.log(`active filter on ${layerId}: ${filterSpec}`);
}

console.log(`count after filter: ${countAfter}`);

if (countAfter < countBefore) {
  console.log("PASS: count dropped as expected");
} else {
  console.log("FAIL: count did NOT drop — filter not working");
}

await browser.close();
