// Responsive proof for maps: the same interactive embed re-laid-out at several container
// widths. A static PNG can't show that the furniture (title / source / legend) stays
// visible and nothing overflows at narrow widths. Mirrors chart-native's snap-responsive.
import { chromium } from "playwright";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const outDir = process.env.OUTDIR ?? process.argv[2] ?? "/tmp";
const interactiveDir = process.env.SERVE_DIR ?? join(root, "dist", "interactive");
const url = pathToFileURL(join(interactiveDir, "index.html")).href;

const browser = await chromium.launch();
const failures = [];

for (const w of [360, 768, 1100, 1600]) {
  const page = await browser.newPage({
    viewport: { width: w, height: 560 },
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
    undefined,
    { timeout: 60_000 },
  );
  await page.waitForTimeout(2500); // let tiles + reveal settle

  // Detect map type before entering evaluate — route has no legend panel; a locator
  // without categories legitimately renders no legend. Both make the legend optional.
  const isRoute = await page.evaluate(() => {
    const m = window.__map__;
    return !!(
      m &&
      m.getLayer &&
      (m.getLayer("route-fill") || m.getLayer("route-line"))
    );
  });
  const isLocator = await page.evaluate(() => {
    const m = window.__map__;
    return !!(m && m.getLayer && m.getLayer("locator-glyphs"));
  });

  await page
    .locator("#root > div")
    .first()
    .screenshot({ path: join(outDir, `responsive-${w}.png`) });

  const checks = await page.evaluate(([isRouteMap, isLocatorMap]) => {
    const G = 14; // minimum gutter from frame edges (px, at device pixels)
    const inView = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return (
        r.width > 0 &&
        r.height > 0 &&
        r.left >= -1 &&
        r.top >= -1 &&
        r.right <= window.innerWidth + 1 &&
        r.bottom <= window.innerHeight + 1
      );
    };
    const titleGutterOk = (() => {
      const el = document.querySelector('[data-testid="map-title"]');
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return r.left >= G && r.right <= window.innerWidth - G;
    })();
    // Centre-check: map centre ≈ data bbox centre (within ±20% of bbox extent).
    // Verifies the ResizeObserver re-fit keeps data centred across widths.
    const centreOk = (() => {
      const m = window.__map__;
      if (!m) return false;
      // Prefer layout.bounds (choropleth) else infer from symbol layer features.
      const lb = window.__layout_bounds__;
      let bounds = lb
        ? lb
        : (() => {
            const feats = m.querySourceFeatures("symbols");
            if (!feats.length) return null;
            let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
            for (const f of feats) {
              const [lng, lat] = f.geometry.coordinates;
              if (lng < minLng) minLng = lng;
              if (lng > maxLng) maxLng = lng;
              if (lat < minLat) minLat = lat;
              if (lat > maxLat) maxLat = lat;
            }
            return [minLng, minLat, maxLng, maxLat];
          })();
      if (!bounds) return true; // no source to verify against — pass
      const [w, s, e, n] = bounds;
      const bboxCentLng = (w + e) / 2;
      const bboxCentLat = (s + n) / 2;
      const tol = Math.max((e - w) * 0.20, (n - s) * 0.20, 5);
      const c = m.getCenter();
      return (
        Math.abs(c.lng - bboxCentLng) <= tol &&
        Math.abs(c.lat - bboxCentLat) <= tol
      );
    })();
    // Data-extent-visible check: the data bbox must be fully contained in the
    // viewport — detects the minZoom-lock crop regression (narrow widths zoomed in,
    // data cropped). Guards THAT specific bug; furniture overlap (data under title/
    // legend) is covered by the measured-title-height fix + visual snapshot eyeball,
    // per the spec's out-of-scope decision.
    // Uses getBounds() (the current viewport) vs the data bbox.
    // For choropleth, uses __layout_bounds__; for symbol, queries source features.
    // Tolerance: allow the map bounds to be tighter than the data bbox by up to 5° —
    // this handles floating-point rounding in fitBounds without masking real crops.
    const dataExtentVisibleOk = (() => {
      const m = window.__map__;
      if (!m) return true; // no map yet — skip
      const lb = window.__layout_bounds__;
      let dataBounds = lb
        ? lb
        : (() => {
            const feats = m.querySourceFeatures("symbols");
            if (!feats.length) return null;
            let minLng = Infinity,
              maxLng = -Infinity,
              minLat = Infinity,
              maxLat = -Infinity;
            for (const f of feats) {
              const [lng, lat] = f.geometry.coordinates;
              if (lng < minLng) minLng = lng;
              if (lng > maxLng) maxLng = lng;
              if (lat < minLat) minLat = lat;
              if (lat > maxLat) maxLat = lat;
            }
            return [minLng, minLat, maxLng, maxLat];
          })();
      if (!dataBounds) return true;
      const [dw, ds, de, dn] = dataBounds;
      const vb = m.getBounds();
      const TOL = 5; // ° tolerance for edge padding + mercator rounding
      // ASPECT LIMIT (physics, not a bug): in Web Mercator the map cannot zoom out past
      // the point where the full world HEIGHT fills the viewport, so a tall/narrow
      // portrait viewport can only ever show ~360·(w/h) degrees of LONGITUDE. A dataset
      // wider than that is impossible to frame fully at this aspect — demanding it would
      // fail an unfixable render. In that case require BEST EFFORT instead: the map is
      // centred on the data (so it shows the middle of the extent, not a cropped edge).
      const maxFittableLngSpan = 360 * (window.innerWidth / window.innerHeight);
      const dataLngSpan = de - dw;
      if (dataLngSpan > maxFittableLngSpan) {
        // Horizontally the full width CANNOT be shown at this aspect → best effort is
        // that the map is CENTRED on the data longitude (shows the middle of the extent,
        // not a cropped edge). Vertically the height CAN be shown (the map floors at
        // full-world-height), so the data latitude band must be CONTAINED in view — a
        // centring test there is wrong (the floored map centres near the equator while
        // northern-hemisphere data still sits fully in view).
        const dataCentreLng = (dw + de) / 2;
        const c = m.getCenter();
        const lngCentred =
          Math.abs(c.lng - dataCentreLng) <= dataLngSpan * 0.15 + TOL;
        const latVisible = vb.getSouth() <= ds + TOL && vb.getNorth() >= dn - TOL;
        return lngCentred && latVisible;
      }
      // The aspect CAN show the full width → the real guard: the visible bounds must
      // contain (or almost contain) the data bounds. Catches the minZoom-lock crop
      // regression (a fittable map wrongly zoomed in, cropping the data).
      return (
        vb.getWest() <= dw + TOL &&
        vb.getSouth() <= ds + TOL &&
        vb.getEast() >= de - TOL &&
        vb.getNorth() >= dn - TOL
      );
    })();
    // Furniture-occlusion check: NO labelled point marker may sit under the title band or
    // the legend (a data point hidden behind furniture — "data must always be visible").
    // Projects every point feature and tests its pin/label bbox (anchor ± clearance) against
    // the title + legend rects. Applies to point maps (locator/symbol); choropleth has no
    // point source and skips. This is the render-level guarantee for the reservation fix.
    const dataNotUnderFurnitureOk = (() => {
      const m = window.__map__;
      if (!m) return true;
      const pts = [];
      for (const sid of ["symbols", "locator"]) {
        try {
          for (const f of m.querySourceFeatures(sid))
            if (f.geometry?.type === "Point") pts.push(f.geometry.coordinates);
        } catch {}
      }
      if (!pts.length) return true; // no point data → not applicable (e.g. choropleth)
      const rectOf = (sel) => {
        const el = document.querySelector(sel);
        if (!el || getComputedStyle(el).display === "none") return null;
        const r = el.getBoundingClientRect();
        return r.width < 2 || r.height < 2 ? null : r;
      };
      const title = rectOf('[data-testid="map-title"]');
      const legend = rectOf('[data-testid="map-legend"]');
      const filterbar = rectOf('[data-testid="map-filterbar"]');
      const C = 30; // marker pin/label clearance (matches MARKER_CLEARANCE)
      const hit = (p, box) =>
        box &&
        p.x >= box.left - 14 &&
        p.x <= box.right + 14 &&
        p.y - C <= box.bottom &&
        p.y + C >= box.top;
      for (const c of pts) {
        const p = m.project(c);
        if (hit(p, title) || hit(p, legend) || hit(p, filterbar)) return false;
      }
      return true;
    })();
    return {
      scrollOk:
        document.documentElement.scrollWidth <= window.innerWidth + 1,
      titleOk: inView('[data-testid="map-title"]'),
      titleGutterOk,
      sourceOk: inView('[data-testid="map-source"]'),
      // legendOk: choropleth/symbol MUST show a populated legend in view (strict).
      // Route has no legend panel, and a locator without categories renders an
      // empty/hidden panel — for those two the legend is OPTIONAL: absent/empty passes,
      // but if a panel IS populated (e.g. a locator WITH categories) it must be in view.
      legendOk: (() => {
        const el = document.querySelector('[data-testid="map-legend"]');
        const populated =
          !!el &&
          getComputedStyle(el).display !== "none" &&
          el.textContent.trim().length > 0;
        const legendOptional = isRouteMap || isLocatorMap;
        if (legendOptional)
          return !populated || inView('[data-testid="map-legend"]');
        return populated && inView('[data-testid="map-legend"]');
      })(),
      centreOk,
      dataExtentVisibleOk,
      dataNotUnderFurnitureOk,
    };
  }, [isRoute, isLocator]);

  console.log(JSON.stringify({ w, ...checks }));
  for (const [k, ok] of Object.entries(checks))
    if (!ok) failures.push(`${w}px: ${k}`);
  await page.close();
}

await browser.close();
if (failures.length) {
  console.error("RESPONSIVE FAILURES:\n" + failures.join("\n"));
  process.exit(1);
}
console.log("responsive: all widths pass");
