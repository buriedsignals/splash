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

// Wait until a known data layer exists (choropleth, symbol, or route)
await page.waitForFunction(
  () => {
    const m = window.__map__;
    return (
      m &&
      m.getLayer &&
      (m.getLayer("choropleth-fill") ||
        m.getLayer("dot-density-dots") ||
        m.getLayer("symbol-circles") ||
        m.getLayer("locator-glyphs") ||
        m.getLayer("hex-grid-cells") ||
        m.getLayer("cartogram-cells") ||
        m.getLayer("route-fill") ||
        m.getLayer("route-line"))
    );
  },
  { timeout: 60_000 },
);

// Detect which layer type we have. Locator uses the same point-hover path as symbol
// (its glyph layer id is locator-glyphs, not symbol-circles), so it maps to "symbol".
const layerType = await page.evaluate(() => {
  const m = window.__map__;
  if (m.getLayer("dot-density-dots")) return "dot-density";
  if (m.getLayer("hex-grid-cells")) return "hex-grid";
  if (m.getLayer("cartogram-cells")) return "cartogram";
  if (m.getLayer("symbol-circles") || m.getLayer("locator-glyphs"))
    return "symbol";
  if (m.getLayer("route-fill")) return "route";
  return "choropleth";
});
const glyphLayer = await page.evaluate(() =>
  window.__map__.getLayer("locator-glyphs") ? "locator-glyphs" : "symbol-circles",
);
const isLocator = glyphLayer === "locator-glyphs";
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

if (layerType === "route") {
  console.log("route mode: scanning territory fills for popup");

  const routeScreenCoords = await page.evaluate(() => {
    const m = window.__map__;
    if (!m) return [];
    const features = m.queryRenderedFeatures({ layers: ["route-fill"] });
    if (!features || features.length === 0) return [];
    return features.slice(0, 5).map((f) => {
      const bounds = m.getBounds();
      const center = m.getCenter();
      const pt = m.project([center.lng, center.lat]);
      // Use geometry centroid if available
      if (f.geometry && f.geometry.type === "Polygon") {
        const coords = f.geometry.coordinates[0];
        const lng = coords.reduce((s, c) => s + c[0], 0) / coords.length;
        const lat = coords.reduce((s, c) => s + c[1], 0) / coords.length;
        const p = m.project([lng, lat]);
        return { x: Math.round(p.x), y: Math.round(p.y) };
      }
      return { x: Math.round(pt.x), y: Math.round(pt.y) };
    });
  });

  for (const { x, y } of routeScreenCoords) {
    const vp = page.viewportSize();
    if (x < 0 || y < 0 || x > vp.width || y > vp.height) continue;
    await page.mouse.move(x, y);
    await page.waitForTimeout(200);
    const popup = page.locator(".maplibregl-popup");
    if ((await popup.count()) > 0) {
      popupText = await popup.textContent();
      hitPoint = { x, y };
      break;
    }
  }

  // Fallback: grid scan
  if (!popupText) {
    console.log("route centroid scan missed — grid scanning");
    for (let x = 80; x <= viewport.width - 80; x += 20) {
      for (let y = 80; y <= viewport.height - 80; y += 20) {
        await page.mouse.move(x, y);
        await page.waitForTimeout(50);
        const popup = page.locator(".maplibregl-popup");
        if ((await popup.count()) > 0) {
          popupText = await popup.textContent();
          hitPoint = { x, y };
          break;
        }
      }
      if (popupText) break;
    }
  }
} else if (layerType === "dot-density") {
  console.log("dot-density mode: scanning region fills for popup");

  const regionScreenCoords = await page.evaluate(() => {
    const m = window.__map__;
    if (!m) return [];
    const features = m.queryRenderedFeatures({
      layers: ["dot-density-regions"],
    });
    if (!features || features.length === 0) return [];
    return features.slice(0, 12).map((f) => {
      const g = f.geometry;
      let ring = null;
      if (g && g.type === "Polygon") ring = g.coordinates[0];
      else if (g && g.type === "MultiPolygon") ring = g.coordinates[0][0];
      if (!ring) {
        const c = m.getCenter();
        const p = m.project([c.lng, c.lat]);
        return { x: Math.round(p.x), y: Math.round(p.y) };
      }
      const lng = ring.reduce((s, c) => s + c[0], 0) / ring.length;
      const lat = ring.reduce((s, c) => s + c[1], 0) / ring.length;
      const p = m.project([lng, lat]);
      return { x: Math.round(p.x), y: Math.round(p.y) };
    });
  });

  for (const { x, y } of regionScreenCoords) {
    if (x < 0 || y < 0 || x > viewport.width || y > viewport.height) continue;
    await page.mouse.move(x, y);
    await page.waitForTimeout(200);
    const popup = page.locator(".maplibregl-popup");
    if ((await popup.count()) > 0) {
      popupText = await popup.textContent();
      hitPoint = { x, y };
      break;
    }
  }

  if (!popupText) {
    console.log("centroid scan missed — grid scanning for region popup");
    for (let x = 80; x <= viewport.width - 80; x += 20) {
      for (let y = 80; y <= viewport.height - 80; y += 20) {
        await page.mouse.move(x, y);
        await page.waitForTimeout(50);
        const popup = page.locator(".maplibregl-popup");
        if ((await popup.count()) > 0) {
          popupText = await popup.textContent();
          hitPoint = { x, y };
          break;
        }
      }
      if (popupText) break;
    }
  }
} else if (layerType === "hex-grid") {
  console.log("hex-grid mode: scanning cell fills for popup");

  const cellScreenCoords = await page.evaluate(() => {
    const m = window.__map__;
    if (!m) return [];
    const features = m.queryRenderedFeatures({ layers: ["hex-grid-cells"] });
    if (!features || features.length === 0) return [];
    return features.slice(0, 12).map((f) => {
      const g = f.geometry;
      let ring = null;
      if (g && g.type === "Polygon") ring = g.coordinates[0];
      else if (g && g.type === "MultiPolygon") ring = g.coordinates[0][0];
      if (!ring) {
        const c = m.getCenter();
        const p = m.project([c.lng, c.lat]);
        return { x: Math.round(p.x), y: Math.round(p.y) };
      }
      const lng = ring.reduce((s, c) => s + c[0], 0) / ring.length;
      const lat = ring.reduce((s, c) => s + c[1], 0) / ring.length;
      const p = m.project([lng, lat]);
      return { x: Math.round(p.x), y: Math.round(p.y) };
    });
  });

  for (const { x, y } of cellScreenCoords) {
    if (x < 0 || y < 0 || x > viewport.width || y > viewport.height) continue;
    await page.mouse.move(x, y);
    await page.waitForTimeout(200);
    const popup = page.locator(".maplibregl-popup");
    if ((await popup.count()) > 0) {
      popupText = await popup.textContent();
      hitPoint = { x, y };
      break;
    }
  }

  if (!popupText) {
    console.log("centroid scan missed — grid scanning for hex-grid popup");
    for (let x = 80; x <= viewport.width - 80; x += 20) {
      for (let y = 80; y <= viewport.height - 80; y += 20) {
        await page.mouse.move(x, y);
        await page.waitForTimeout(50);
        const popup = page.locator(".maplibregl-popup");
        if ((await popup.count()) > 0) {
          popupText = await popup.textContent();
          hitPoint = { x, y };
          break;
        }
      }
      if (popupText) break;
    }
  }
} else if (layerType === "cartogram") {
  console.log("cartogram mode: scanning cell fills for popup");

  const cartogramCellCoords = await page.evaluate(() => {
    const m = window.__map__;
    if (!m) return [];
    const features = m.queryRenderedFeatures({ layers: ["cartogram-cells"] });
    if (!features || features.length === 0) return [];
    return features.slice(0, 12).map((f) => {
      const g = f.geometry;
      let ring = null;
      if (g && g.type === "Polygon") ring = g.coordinates[0];
      else if (g && g.type === "MultiPolygon") ring = g.coordinates[0][0];
      if (!ring) {
        const c = m.getCenter();
        const p = m.project([c.lng, c.lat]);
        return { x: Math.round(p.x), y: Math.round(p.y) };
      }
      const lng = ring.reduce((s, c) => s + c[0], 0) / ring.length;
      const lat = ring.reduce((s, c) => s + c[1], 0) / ring.length;
      const p = m.project([lng, lat]);
      return { x: Math.round(p.x), y: Math.round(p.y) };
    });
  });

  for (const { x, y } of cartogramCellCoords) {
    if (x < 0 || y < 0 || x > viewport.width || y > viewport.height) continue;
    await page.mouse.move(x, y);
    await page.waitForTimeout(200);
    const popup = page.locator(".maplibregl-popup");
    if ((await popup.count()) > 0) {
      popupText = await popup.textContent();
      hitPoint = { x, y };
      break;
    }
  }

  if (!popupText) {
    console.log("centroid scan missed — grid scanning for cartogram popup");
    for (let x = 80; x <= viewport.width - 80; x += 20) {
      for (let y = 80; y <= viewport.height - 80; y += 20) {
        await page.mouse.move(x, y);
        await page.waitForTimeout(50);
        const popup = page.locator(".maplibregl-popup");
        if ((await popup.count()) > 0) {
          popupText = await popup.textContent();
          hitPoint = { x, y };
          break;
        }
      }
      if (popupText) break;
    }
  }
} else if (layerType === "symbol") {
  console.log("symbol mode: finding largest circle by radius property");

  // Query rendered features from symbol-circles, pick the one with the largest radius
  const largestFeatureCoords = await page.evaluate((layer) => {
    const m = window.__map__;
    const features = m.queryRenderedFeatures({ layers: [layer] });
    if (!features || features.length === 0) return null;
    // Sort by radius desc, pick the largest
    features.sort(
      (a, b) => (b.properties?.radius ?? 0) - (a.properties?.radius ?? 0),
    );
    const f = features[0];
    const coords = f.geometry.coordinates;
    const pt = m.project(coords);
    return { x: Math.round(pt.x), y: Math.round(pt.y), label: f.properties?.label };
  }, glyphLayer);

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

// Assert popup has a word (region/city name). For choropleth/symbol also assert a digit value.
if (!/[A-Za-z]/.test(trimmed)) {
  console.error(`popup has no region name: "${trimmed}"`);
  await browser.close();
  process.exit(1);
}
// Locator markers encode place/category/note — not a numeric value — so the digit
// assertion applies only to choropleth/symbol (which always carry a value).
if (layerType !== "route" && !isLocator && !/\d/.test(trimmed)) {
  console.error(`popup has no value (digit): "${trimmed}"`);
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
