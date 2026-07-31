// Render-time WCAG guard for map-native FURNITURE TEXT (title/description/source/legend/
// filter-bar) — the render-time counterpart chart-native already has (snap-contrast.mjs)
// that map-native was missing (produce.mjs used to note "map-native has no snap-contrast.mjs
// yet" next to its dark-theme guard; see CLAUDE.md "parité harnais-contraste côté map"). The
// existing config-time guard (src/core/map-produce-conformance.ts) only validates the
// PRE-VETTED FRAME_COLORS(_HOUSE) TOKENS against an assumed-opaque backdrop — its own header
// comment calls it "drift-defense … not a live paint check". This snap checks what the
// browser ACTUALLY painted, after the fact, on the real produced dist.
//
// THE MAP-NATIVE-SPECIFIC CHALLENGE this script exists to solve: unlike chart-native's SVG
// chart (an entirely DOM-composited surface), map-native's furniture sits ON TOP OF a
// MapLibre GL <canvas> basemap — a WebGL surface `getComputedStyle`/`elementsFromPoint`
// cannot see into (the same limitation snap-theme.mjs's header documents and solves for the
// BASEMAP median; this solves the equivalent problem for FURNITURE TEXT). Compounding it,
// map-native's furniture backgrounds are THEMSELVES semi-transparent (`rgba(...)`, ~0.82-0.92
// alpha — see src/theme/map-tokens.ts's FRAME_COLORS.pill and src/theme/legend-theme.ts) and
// the `map-source` band has NO backing at all (MapFrame.tsx only spreads `pillStyle` onto the
// TITLE band, never the source band — see that file) — so a naive
// `getComputedStyle(el).backgroundColor` read would be flatly wrong for map-source (misses
// the canvas entirely) and only an approximation for the pill-backed elements (assumes fully
// opaque, ignoring the ~8-18% the canvas actually contributes through the alpha).
//
// TECHNIQUE — composited-pixel sampling (mirrors snap-theme.mjs's basemap-median approach,
// scoped to specific text elements instead of a whole-canvas grid):
//   1. In-page (closure-free, ./lib/furniture-contrast-browser.mjs#collectFurnitureLeaves):
//      find every furniture TEXT LEAF (HTML or SVG; an element with a direct, non-whitespace
//      text child) under the 4 furniture roots (`data-testid="map-title|map-source|
//      map-legend|map-filterbar"`), read its raw fill/color + font metrics, then hide ONLY
//      the glyph (`color`/`fill` → transparent, not `visibility:hidden` — that would also
//      erase an element's OWN background, e.g. a pressed `filter-chip`'s solid pill).
//   2. ONE `page.screenshot()`. Playwright screenshots the COMPOSITOR OUTPUT — it captures
//      the GL canvas and every DOM layer above it, already alpha-blended exactly as shipped.
//      This is the crux: no manual alpha-compositing math, no dependency on
//      `preserveDrawingBuffer` (unlike `canvas.toDataURL()`, not set on every map component).
//   3. The screenshot is fed back into the SAME page as a `data:` URL → offscreen `<canvas>`
//      (same-origin, untainted), then sampled at 3 image-space points per leaf (left/mid/
//      right — ./lib/furniture-contrast.mjs#computeSamplePoints, pure + unit-tested) via
//      `getImageData`.
//   4. WCAG contrast (glyph fill vs. the WORST of the 3 sampled backgrounds) is computed in
//      Node via the shared core (../../../lib/core/contrast.ts — the same primitives
//      chart-native's snap-contrast.mjs imports via its contrast-scan.ts shim; map-native has
//      no such shim yet, so this imports lib/core directly, per this task's own instruction
//      not to re-copy the math). `wcagMinContrast(fontPx, bold)` applies the SC 1.4.3
//      large-text 3:1 provision.
//
// SCOPE — map-native's KEEP-vs-REJECT policy, do not conflate: this guards FURNITURE TEXT
// contrast only (WCAG 1.4.3). Furniture ink is ALWAYS derived to be legible
// (resolveFrameColors picks the max-contrast pole for any ground), so a failure here is
// always a real render defect — hence a HARD FAIL, no brand-colour downgrade bucket (unlike
// chart-native's policy-b "concern" for a journalist's own mark colour). It does NOT touch
// the separate mark-vs-basemap WCAG 1.4.11 non-text concern (a house hue painted as a
// symbol/route/dot fill against the basemap) — that stays exactly what
// runProduceMapConformance already treats it as: a KEPT, render-review CONCERN (policy b,
// map-produce-conformance.ts). Turning that into a hard fail here would reject a newsroom's
// deliberate house-colour choice; explicitly out of scope.
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFileSync, statSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { worstContrast, wcagMinContrast, MIN_CONTRAST } from "../../../lib/core/contrast.ts";
import {
  parseCssColorToHex,
  isBoldFontWeight,
  computeSamplePoints,
} from "./lib/furniture-contrast.mjs";
import {
  collectFurnitureLeaves,
  decodeScreenshot,
  readPixelsAtPoints,
} from "./lib/furniture-contrast-browser.mjs";
import { lateRefusalSentence, recordLateRefusal } from "../../splash/src/late-refusal.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const outDir = process.env.OUTDIR ?? join(root, "output-proof", "contrast");
await mkdir(outDir, { recursive: true });

// MODE picks the loading strategy — mirrors produce.mjs's two dist shapes: "static"
// (multi-file build, served over http, like snap-static.mjs/snap-theme.mjs) or
// "interactive" (vite-plugin-singlefile bundle, opened over file://, like snap-a11y.mjs/
// snap-proof.mjs). Default "static" — the format produce.mjs builds first/most often.
const mode = process.env.MODE === "interactive" ? "interactive" : "static";
// The map archetype (choropleth/symbol/route/…) for the late-refusal subject — read off
// the same CONFIG env produce.mjs threads to every snap (see snap-contrast.mjs's sibling
// in chart-native, which gets it via CHART instead; map-native has no such env, only CONFIG).
const type = process.env.CONFIG
  ? (JSON.parse(readFileSync(process.env.CONFIG, "utf8")).type ?? "choropleth")
  : "map";
const serveDir =
  process.env.SERVE_DIR ?? join(root, "dist", mode === "interactive" ? "interactive" : "static");

let server = null;
let pageUrl;
if (mode === "static") {
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
  server = createServer((req, res) => {
    let url = req.url ?? "/";
    if (url === "/" || url === "") url = "/index.html";
    const cleanUrl = url.split("?")[0];
    const filePath = join(serveDir, cleanUrl);
    try {
      statSync(filePath);
      const ext = extname(filePath);
      res.writeHead(200, { "Content-Type": MIME[ext] ?? "application/octet-stream" });
      res.end(readFileSync(filePath));
    } catch {
      res.writeHead(404);
      res.end("not found");
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  pageUrl = `http://127.0.0.1:${server.address().port}`;
} else {
  pageUrl = pathToFileURL(join(serveDir, "index.html")).href;
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 700 }, deviceScaleFactor: 2 });

console.log(`[snap-contrast map ${mode}] loading:`, pageUrl);
await page.goto(pageUrl);
await page.waitForSelector(".maplibregl-canvas", { timeout: 60_000 });
// Playwright's two-arg `waitForFunction(fn, options)` form treats the second
// positional argument as the in-page function's `arg`, not as `options` — the
// `{ timeout }` object below was silently discarded and every call actually ran
// under Playwright's 30_000ms default, not the intended 90_000ms. Passing the
// explicit `undefined` arg is what makes the third positional actually bind as
// options (mirrors the same fix in snap-static.mjs). Bumped from the
// originally-intended 60_000 to 90_000 for real headroom: subsetGeometry
// (lib/geo/subset.ts) now runs a filter pass AND a simplify/encode pass, and
// every real produce is slower for it.
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
  { timeout: 90_000 },
);
await page.waitForFunction(
  () => {
    const m = window.__map__;
    return m && m.loaded && m.loaded() && m.areTilesLoaded && m.areTilesLoaded();
  },
  undefined,
  { timeout: 90_000 },
);
await page.waitForTimeout(500);

// Step 1 — find every furniture text leaf and hide its glyph (background untouched).
const leaves = await page.evaluate(collectFurnitureLeaves);

// Step 2 — ONE screenshot of the now-glyph-free, still-fully-composited page.
const shotBuffer = await page.screenshot();
const dataUrl = `data:image/png;base64,${shotBuffer.toString("base64")}`;

// Step 3 — decode it back in-page, get the image/CSS scale factors.
const { naturalWidth, naturalHeight, innerWidth, innerHeight } = await page.evaluate(
  decodeScreenshot,
  dataUrl,
);
const scaleX = naturalWidth / innerWidth;
const scaleY = naturalHeight / innerHeight;

// Step 4 — Node computes the worst-case sample points per leaf (pure, unit-tested), then
// ONE batched page.evaluate reads every point's composited pixel off the stashed canvas.
const allPoints = leaves.map((leaf) => computeSamplePoints(leaf.rect, scaleX, scaleY));
const flatPoints = allPoints.flat();
const flatPixels = flatPoints.length
  ? await page.evaluate(readPixelsAtPoints, flatPoints)
  : [];

// Debug artifact — the composited, glyph-free screenshot actually sampled.
await page.screenshot({ path: join(outDir, `contrast-${mode}.png`) });

await browser.close();
if (server) server.close();

// Re-assemble per-leaf: 3 points each, in the same order they were flattened.
let cursor = 0;
const samples = leaves.map((leaf) => {
  const pixels = flatPixels.slice(cursor, cursor + 3);
  cursor += 3;
  const fill = parseCssColorToHex(leaf.rawColor);
  const bgs = pixels
    .map(([r, g, b, a]) => (a === 0 ? null : `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`))
    .filter(Boolean);
  return {
    text: leaf.text,
    fill,
    bgs,
    fontPx: leaf.fontPx,
    bold: isBoldFontWeight(leaf.fontWeight),
  };
});

const violations = [];
for (const s of samples) {
  if (!s.fill || s.bgs.length === 0) continue; // transparent glyph / no sample — nothing to check
  const worst = worstContrast(s.fill, s.bgs);
  const min = wcagMinContrast(s.fontPx, s.bold);
  if (worst >= min) continue;
  violations.push({ ...s, worst: Number(worst.toFixed(2)), min });
}

console.log(
  JSON.stringify({ mode, checked: samples.length, violations }, null, 2),
);
if (violations.length) {
  const r = {
    guard: "snap-contrast (map)",
    subject: `${type}/${mode}`,
    reason: `${violations.length} furniture text label(s) below their WCAG floor (${MIN_CONTRAST}:1, or 3:1 for large-scale text)`,
    deviation:
      "raise the contrast of the failing furniture label (a darker/lighter ink, or a different " +
      "house ground), then produce again — this is measured on the render, so it cannot be told at the offer",
  };
  console.error(lateRefusalSentence(r));
  for (const v of violations) {
    console.error(`  ✗ "${v.text}" fill ${v.fill} worst-bg contrast ${v.worst}:1 (needs ${v.min}:1)`);
  }
  recordLateRefusal(outDir, r);
  process.exit(1);
}
console.log(
  `[snap-contrast map ${mode}] OK — ${samples.length} furniture text label(s) clear their WCAG floor against the real composited (canvas + overlay) background.`,
);
