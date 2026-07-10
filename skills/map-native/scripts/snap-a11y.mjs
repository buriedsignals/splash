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
const interactiveDir = process.env.SERVE_DIR ?? join(root, "dist", "interactive");
// `?staticLabels=1` asks the symbol build to render its direct labels for this a11y-fallback
// capture — the no-JS fallback has no hover, so it must carry each symbol's name+value directly
// (the live interactive.html, loaded without this flag, stays hover-only). No-op for non-symbol
// map types (mount.tsx only threads the flag to SymbolMap). Hover/controls are still exercised
// below, so this render proves BOTH: labeled-without-interaction AND the tooltip on hover.
const url =
  pathToFileURL(join(interactiveDir, "index.html")).href + "?staticLabels=1";

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
  const sourceEl = document.querySelector('[data-testid="map-source"]');
  const anchor = sourceEl && sourceEl.querySelector("a");
  const link = document.querySelector('[data-testid="map-source"] a[href]');
  const ctrlButtons = [...document.querySelectorAll(".maplibregl-ctrl button")];
  return {
    regionRole: !!region,
    regionLabel: (region && region.getAttribute("aria-label")) || "",
    sourceText: (sourceEl && sourceEl.textContent.trim()) || "",
    // A prose (name-only) source renders as plain text with no anchor — legitimate,
    // no href expected. A linked source (named dataset with a URL) renders an <a>,
    // which must carry an href. Distinguish so a legitimate prose source passes.
    sourceHasAnchor: !!anchor,
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
    if (m.getLayer("symbol-circles") || m.getLayer("locator-glyphs"))
      return "symbol";
    if (m.getLayer("route-fill") || m.getLayer("route-line")) return "route";
    if (m.getLayer("cartogram-cells")) return "cartogram";
    if (m.getLayer("hex-grid-cells")) return "hex-grid";
    return "choropleth";
  });
  const glyphLayer = await page.evaluate(() =>
    window.__map__.getLayer("locator-glyphs")
      ? "locator-glyphs"
      : "symbol-circles",
  );

  const viewport = page.viewportSize();

  if (layerType === "route") {
    // Route: query rendered route-fill features and project a centroid to trigger the tooltip
    const routeCoords = await page.evaluate(() => {
      const m = window.__map__;
      if (!m) return [];
      const features = m.queryRenderedFeatures({ layers: ["route-fill"] });
      if (!features || features.length === 0) return [];
      return features.slice(0, 5).map((f) => {
        if (f.geometry && f.geometry.type === "Polygon") {
          const coords = f.geometry.coordinates[0];
          const lng = coords.reduce((s, c) => s + c[0], 0) / coords.length;
          const lat = coords.reduce((s, c) => s + c[1], 0) / coords.length;
          const p = m.project([lng, lat]);
          return { x: Math.round(p.x), y: Math.round(p.y) };
        }
        const center = m.getCenter();
        const pt = m.project([center.lng, center.lat]);
        return { x: Math.round(pt.x), y: Math.round(pt.y) };
      });
    });

    for (const { x, y } of routeCoords) {
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
  } else if (layerType === "symbol") {
    const pt = await page.evaluate((layer) => {
      const m = window.__map__;
      const feats = m.queryRenderedFeatures({ layers: [layer] });
      if (!feats.length) return null;
      // Pick the feature with the largest radius for best hit probability
      feats.sort((a, b) => (b.properties?.radius ?? 0) - (a.properties?.radius ?? 0));
      const f = feats[0];
      const p = m.project(f.geometry.coordinates);
      return { x: Math.round(p.x), y: Math.round(p.y) };
    }, glyphLayer);
    if (pt) {
      await page.mouse.move(pt.x, pt.y);
      await page.waitForSelector(".maplibregl-popup", { timeout: 4000 });
      tooltipOk = true;
    }
  } else if (layerType === "cartogram" || layerType === "hex-grid") {
    const layer = layerType === "cartogram" ? "cartogram-cells" : "hex-grid-cells";
    const cellCoords = await page.evaluate((l) => {
      const m = window.__map__;
      if (!m) return [];
      const features = m.queryRenderedFeatures({ layers: [l] });
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
    }, layer);
    for (const { x, y } of cellCoords) {
      if (x < 0 || y < 0 || x > viewport.width || y > viewport.height) continue;
      await page.mouse.move(x, y);
      await page.waitForTimeout(200);
      const popup = page.locator(".maplibregl-popup");
      if (await popup.count() > 0) { tooltipOk = true; break; }
    }
    if (!tooltipOk) {
      outer: for (let x = 80; x <= viewport.width - 80; x += 20) {
        for (let y = 80; y <= viewport.height - 80; y += 20) {
          await page.mouse.move(x, y);
          await page.waitForTimeout(60);
          const popup = page.locator(".maplibregl-popup");
          if (await popup.count() > 0) { tooltipOk = true; break outer; }
        }
      }
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

// Detect map type for boundedNavOk type-gating.
const isCartogramMap = await page.evaluate(() =>
  !!(window.__map__ && window.__map__.getLayer && window.__map__.getLayer("cartogram-cells")),
);

// Bounded nav: attempt a large pan + extreme zoom-out, then assert centre + zoom constraints.
// For cartogram, only minZoom is checked (not maxBounds): large geographic extents make
// tight lon maxBounds impractical — any maxBounds that fits within ±180° lon can cause
// the SDK to force a higher zoom at wide viewports, hiding the data's lat extent. The
// minZoom pin alone ensures cartogram data stays visible; lon pan clamping is skipped.
const boundedNavOk = await page.evaluate(async (isCartogram) => {
  const m = window.__map__;
  if (!m) return false;
  // Large pan — should be clamped by maxBounds (or at least minZoom after zoom-out)
  await new Promise((resolve) => {
    m.once("moveend", resolve);
    m.panBy([5000, 5000], { duration: 0 });
  });
  // Extreme zoom-out — should be clamped by minZoom
  await new Promise((resolve) => {
    m.once("idle", resolve);
    m.zoomTo(0, { duration: 0 });
  });
  const zoom = m.getZoom();
  const minZoom = m.getMinZoom();
  const zoomOk = zoom >= minZoom - 0.01; // tiny float tolerance
  if (isCartogram) return zoomOk; // cartogram: only minZoom pin is enforced
  const maxBounds = m.getMaxBounds();
  if (!maxBounds) return false; // maxBounds never set → feature not enabled
  const centre = m.getCenter();
  const inBounds =
    centre.lng >= maxBounds.getWest() &&
    centre.lng <= maxBounds.getEast() &&
    centre.lat >= maxBounds.getSouth() &&
    centre.lat <= maxBounds.getNorth();
  return inBounds && zoomOk;
}, isCartogramMap);

// Controls not occluded: pick the zoom-in button and assert it is the topmost element
// at its centre point — not the title pill or any other furniture overlay.
const controlsNotOccluded = await page.evaluate(() => {
  const btn = document.querySelector(".maplibregl-ctrl-top-right .maplibregl-ctrl button");
  if (!btn) return false; // no controls present — assertion does not apply
  const rect = btn.getBoundingClientRect();
  const cx = Math.round(rect.left + rect.width / 2);
  const cy = Math.round(rect.top + rect.height / 2);
  const topEl = document.elementFromPoint(cx, cy);
  if (!topEl) return false;
  // Pass if the topmost element IS the button or a descendant of .maplibregl-ctrl
  const ctrl = topEl.closest(".maplibregl-ctrl");
  return ctrl !== null;
});

await page.locator("#root > div").first().screenshot({ path: join(outDir, "a11y.png") });
await browser.close();

const result = { ...a11y, tooltipOk, boundedNavOk, controlsNotOccluded };
console.log(JSON.stringify(result, null, 2));

const failures = [];
if (!result.regionRole) failures.push("map container missing role=region");
if (!result.regionLabel.trim()) failures.push("region missing aria-label");
// The source must be PRESENT (readable text). If it renders a link (named dataset with a
// URL), that link must carry an href. A prose / name-only source (plain text, no anchor)
// is a legitimate fallback per the source contract ("a name-only prose source with no URL
// still passes") — the "named dataset must be linked" rule is enforced at config-time by
// the conformance guard, not here.
if (!result.sourceText.trim()) failures.push("source missing (no text)");
else if (result.sourceHasAnchor && !result.sourceHref.trim())
  failures.push("source renders a link with no href");
if (result.controlButtons < 2) failures.push("missing zoom/reset control buttons");
if (!result.allButtons) failures.push("a control is not a <button> (not keyboard-reachable)");
if (!result.tooltipOk) failures.push("no popup appeared on hovering a feature");
if (!result.boundedNavOk) failures.push("bounded nav: centre escaped maxBounds or zoom < minZoom after panBy+zoomTo");
if (result.controlsNotOccluded === false) failures.push("controls occluded: title pill or other furniture rendered above the zoom/reset controls");
if (failures.length) {
  console.error("A11Y FAILURES:\n" + failures.join("\n"));
  process.exit(1);
}
console.log("a11y: all checks pass");
