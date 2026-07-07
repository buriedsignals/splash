// Render-time theme guard (feedback→système, Task 8 of the render-quality lot): when a
// map is produced with `mapStyle:"dataviz-dark"`, assert it ACTUALLY rendered dark — not
// just that the config asked for it. Catches a renderer silently dropping mapStyle (the
// exact #1/#4 class this lot fixed for ChoroplethMap/SymbolMap: basemap+legend+furniture
// all rendered light while the config said dark) mechanically, at render time, for every
// map type produce.mjs ever builds. Wired into produce.mjs AFTER snap-a11y (the last step
// in map-native's existing snap pipeline — map-native has no snap-contrast.mjs yet; that
// harness is a separate, not-yet-built satellite, see CLAUDE.md "parité harnais-contraste
// côté map"), gated to run ONLY when `config.mapStyle === "dataviz-dark"`, fail-hard.
//
// Two INDEPENDENT assertions:
//
//  1. FURNITURE (exact, DOM-level — mirrors snap-contrast.mjs's real-background sampling):
//     the title pill and the legend box (when present) are real DOM elements painted via
//     an inline `background` style (FRAME_COLORS_DARK.pill / legendTheme(true).bg). Read
//     their computed `background-color` directly and assert WCAG relative luminance is
//     low. No screenshot/pixel work needed here; this is exact, not statistical.
//
//  2. BASEMAP (best-effort, screenshot-sampled): the MapTiler basemap is a WebGL canvas —
//     `elementsFromPoint`/`getComputedStyle` (used for #1) cannot see into it. Playwright's
//     `page.screenshot()` DOES capture the composited GL canvas (it reads the compositor's
//     output, unlike `canvas.toDataURL()`, which needs `preserveDrawingBuffer` — NOT set on
//     every map component; see conformance-au-produce backlog). We screenshot the page,
//     load the PNG bytes back into the SAME page as an <img> → <canvas> (a same-origin
//     data: URL, so `getImageData` is untainted), then sample a coarse GRID of pixels,
//     EXCLUDING any point that falls near a furniture DOM rect (title/source/legend/filter
//     bar, ± a clearance margin), and take the MEDIAN luminance of the rest.
//
//     Median (not mean, not a single fixed corner) is deliberate: `resolveMapFrame`'s `pad`
//     guarantees `fitBounds` insets the DATA away from every edge by `side`/`topBand`/
//     `bottomBand` (core/map-format.ts) — so the majority of non-furniture pixels are
//     basemap VOID (ocean/background), not data fill, for every shipped type. A handful of
//     bright data patches near an edge cannot flip a median computed over a whole-canvas
//     grid. Manually verified: a real dark-choropleth static render (Europe renewables,
//     8 filled countries on a `world` basemap) has the dark charcoal basemap void as the
//     overwhelming majority of sampled points; the light counterpart was equally decisive
//     the other way (see task-8-report.md for both screenshots).
//
// LIMITATIONS (documented, not silently assumed):
//  - The basemap assertion is a STATISTICAL median over a coarse grid, not a per-pixel
//    guarantee. A hypothetical map type whose data fill covers the overwhelming majority
//    of the frame (leaving negligible basemap void near the edges — e.g. a very tightly
//    cropped hex-grid/cartogram) could in principle skew the median. Not observed on any
//    shipped type when manually checked. If a future type regresses this, assertion #1
//    (exact, DOM-level) still independently catches a dropped mapStyle for the furniture.
//  - Checks only the first idle frame of the STATIC build (one fixed camera) — this is
//    complete for static, which is what this guard targets (mirrors snap-static.mjs's
//    scope). Video/scrolly dark-mode parity is a separate, already-tracked follow-up
//    (ChoroplethStory/Reveal/Scrolly + SymbolStory/Scrolly hardcode light — see
//    .superpowers/sdd/progress.md "MAJOR follow-up") and is out of scope here.
//  - Reads the legend/title background via the CSS `background-color` the component
//    assigned, not a re-derivation of the design tokens — a component that hardcodes a
//    dark-LOOKING but not-actually-derived-from-resolveMapStyle color would still pass
//    this (it does not replace the resolveMapStyle-consumption parity test in
//    tests/resolve-map-style-parity.test.ts, which is the code-level guard for that).
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFileSync, statSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname, join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { relativeLuminance } from "../src/conformance.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const outDir = process.env.OUTDIR ?? join(root, "output-proof", "theme");
await mkdir(outDir, { recursive: true });

const staticDir = process.env.SERVE_DIR ?? join(root, "dist", "static");

// A relative luminance below this is "dark" (WCAG 0-1 scale). The dark tokens
// (FRAME_COLORS_DARK.pill #18181b-ish, legendTheme(true).bg #18181b-ish) sit at ~0.01;
// the light tokens (near-white) sit at ~0.9-1.0. 0.3 leaves generous margin either side —
// this is a theme classifier, not a WCAG contrast check (MIN_CONTRAST lives elsewhere).
const DARK_LUMINANCE_MAX = 0.3;

const MIME = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
};

const server = createServer((req, res) => {
  let url = req.url ?? "/";
  if (url === "/" || url === "") url = "/index.html";
  const cleanUrl = url.split("?")[0];
  const filePath = join(staticDir, cleanUrl);
  try {
    statSync(filePath);
    const ext = extname(filePath);
    const mime = MIME[ext] ?? "application/octet-stream";
    res.writeHead(200, { "Content-Type": mime });
    res.end(readFileSync(filePath));
  } catch {
    res.writeHead(404);
    res.end("not found");
  }
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const { port } = server.address();
const baseUrl = `http://127.0.0.1:${port}`;

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 2,
});

await page.goto(baseUrl);
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
await page.waitForFunction(
  () => {
    const m = window.__map__;
    return m && m.loaded && m.loaded() && m.areTilesLoaded && m.areTilesLoaded();
  },
  { timeout: 60_000 },
);
await page.waitForTimeout(500);

// --- Assertion 1: furniture (exact, DOM-level) ---------------------------------------
function toHex(rgbLike) {
  if (!rgbLike) return null;
  const { r, g, b } = rgbLike;
  const h = (n) => Math.round(n).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

const furnitureRgb = await page.evaluate(() => {
  const parseRgb = (s) => {
    const m = s && s.match(/[\d.]+/g);
    if (!m) return null;
    return { r: Number(m[0]), g: Number(m[1]), b: Number(m[2]) };
  };
  const read = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    return parseRgb(getComputedStyle(el).backgroundColor);
  };
  return {
    title: read('[data-testid="map-title"]'),
    legend: read('[data-testid="map-legend"]'),
  };
});

const furnitureChecked = [];
const furnitureViolations = [];
for (const [name, rgb] of Object.entries(furnitureRgb)) {
  if (!rgb) continue; // absent (e.g. a type with no legend) — not applicable
  const hex = toHex(rgb);
  const lum = relativeLuminance(hex);
  furnitureChecked.push({ name, hex, luminance: Number(lum.toFixed(4)) });
  if (lum >= DARK_LUMINANCE_MAX) {
    furnitureViolations.push(
      `${name} background ${hex} has luminance ${lum.toFixed(3)} (>= ${DARK_LUMINANCE_MAX}) — not dark`,
    );
  }
}

// --- Assertion 2: basemap (best-effort, screenshot-sampled median) --------------------
const shotBuffer = await page.screenshot();
const dataUrl = `data:image/png;base64,${shotBuffer.toString("base64")}`;

const basemapSamplesRgb = await page.evaluate(async (url) => {
  const img = new Image();
  img.src = url;
  await img.decode();
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);

  const scaleX = img.naturalWidth / window.innerWidth;
  const scaleY = img.naturalHeight / window.innerHeight;

  const rectOf = (sel) => {
    const el = document.querySelector(sel);
    if (!el || getComputedStyle(el).display === "none") return null;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return null;
    return {
      left: r.left * scaleX,
      right: r.right * scaleX,
      top: r.top * scaleY,
      bottom: r.bottom * scaleY,
    };
  };
  const MARGIN = 24; // image-space px clearance kept around every furniture rect
  const furnitureRects = [
    '[data-testid="map-title"]',
    '[data-testid="map-source"]',
    '[data-testid="map-legend"]',
    '[data-testid="map-filterbar"]',
  ]
    .map(rectOf)
    .filter(Boolean)
    .map((r) => ({
      left: r.left - MARGIN,
      right: r.right + MARGIN,
      top: r.top - MARGIN,
      bottom: r.bottom + MARGIN,
    }));

  const inFurniture = (x, y) =>
    furnitureRects.some(
      (r) => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom,
    );

  const STEP = 40; // image-space px grid step
  const EDGE_INSET = 8; // avoid the very edge (antialiasing)
  const samples = [];
  for (let y = EDGE_INSET; y < canvas.height - EDGE_INSET; y += STEP) {
    for (let x = EDGE_INSET; x < canvas.width - EDGE_INSET; x += STEP) {
      if (inFurniture(x, y)) continue;
      const [r, g, b] = ctx.getImageData(x, y, 1, 1).data;
      samples.push({ r, g, b });
    }
  }
  return samples;
}, dataUrl);

await page.screenshot({ path: join(outDir, "theme.png") });
await browser.close();
server.close();

const luminances = basemapSamplesRgb
  .map((rgb) => relativeLuminance(toHex(rgb)))
  .sort((a, b) => a - b);
const medianLuminance =
  luminances.length === 0
    ? null
    : luminances.length % 2 === 1
      ? luminances[(luminances.length - 1) / 2]
      : (luminances[luminances.length / 2 - 1] +
          luminances[luminances.length / 2]) /
        2;

const basemapViolations = [];
if (medianLuminance === null) {
  basemapViolations.push(
    "basemap sample grid was empty (every grid point fell inside a furniture rect) — cannot assert basemap darkness",
  );
} else if (medianLuminance >= DARK_LUMINANCE_MAX) {
  basemapViolations.push(
    `basemap median luminance ${medianLuminance.toFixed(3)} (>= ${DARK_LUMINANCE_MAX}) over ${luminances.length} sampled points — basemap does not appear dark`,
  );
}

const result = {
  furniture: furnitureChecked,
  basemapSampleCount: luminances.length,
  basemapMedianLuminance:
    medianLuminance === null ? null : Number(medianLuminance.toFixed(4)),
};
console.log(JSON.stringify(result, null, 2));

const violations = [...furnitureViolations, ...basemapViolations];
if (violations.length) {
  console.error("SNAP-THEME FAILURES (expected dark, rendered light):\n" + violations.join("\n"));
  process.exit(1);
}
console.log(
  `[snap-theme] OK — furniture + basemap (median over ${luminances.length} points) render dark.`,
);
