// Static snapshot for the map (non-interactive build).
// Serves dist/static over a local HTTP server, waits for idle, screenshots.
// Layer-aware: handles both choropleth-fill and symbol-circles.
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFileSync, statSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname, join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  checkFurnitureI18n,
  collectFurnitureI18n,
  furnitureGateApplies,
} from "./lib/furniture-i18n.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const outDir = process.env.OUTDIR ?? join(root, "output-proof", "choropleth");
await mkdir(outDir, { recursive: true });

const staticDir = process.env.SERVE_DIR ?? join(root, "dist", "static");

// Channel-driven format (Slice 2): produce.mjs threads the channel's exact deliverable
// pixels (MAP_WIDTH/MAP_HEIGHT, from renderSize(channel) in skills/splash/src/channel.ts)
// so static.png comes out AT that size — deviceScaleFactor:1 so the viewport IS the final
// pixel box (no 2x-rounding surprise, e.g. article-web's odd 675 height). Manual/no-env
// runs (e.g. `bun scripts/snap-static.mjs` per SKILL.md) keep the original 1280x720 @2x.
const hasChannelSize = process.env.MAP_WIDTH && process.env.MAP_HEIGHT;
const viewport = hasChannelSize
  ? { width: Number(process.env.MAP_WIDTH), height: Number(process.env.MAP_HEIGHT) }
  : { width: 1280, height: 720 };
const deviceScaleFactor = hasChannelSize ? 1 : 2;

// Serve static files from dist/static
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
  // Strip query string
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
console.log("serving:", baseUrl);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport, deviceScaleFactor });

console.log("loading:", baseUrl);
await page.goto(baseUrl);

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
console.log("map layer ready");

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
await page.waitForTimeout(500);

const outPath = join(outDir, "static.png");
await page.screenshot({ path: outPath, fullPage: false });
console.log("wrote", outPath);

// Guard: a static map must have NO interactive controls
const ctrlButtons = await page.evaluate(
  () => document.querySelectorAll(".maplibregl-ctrl button").length,
);
if (ctrlButtons > 0) {
  console.error(
    `STATIC FAILURE: ${ctrlButtons} interactive control button(s) in a static map`,
  );
  await browser.close();
  server.close();
  process.exit(1);
}
console.log("static: no interactive controls");

// i18n FURNITURE GATE (P5) — reuses THIS already-loaded page (no extra browser
// session): when the produced config's lang renders non-English furniture, the
// HTML furniture (MapFrame title/source, legend) must actually carry it. GL-internal
// canvas text is not DOM-reachable and stays out of scope (see scripts/lib/
// furniture-i18n.mjs). CONFIG is what produce.mjs threads to every snap; manual
// runs without it skip the gate (English furniture is correct then).
const configPath = process.env.CONFIG;
const lang = configPath
  ? JSON.parse(readFileSync(configPath, "utf8")).lang
  : undefined;
if (furnitureGateApplies(lang)) {
  const i18nViolations = checkFurnitureI18n(
    await page.evaluate(collectFurnitureI18n),
    lang,
  );
  if (i18nViolations.length) {
    console.error(
      `STATIC FAILURE: i18n furniture gate (lang "${lang}") — ${i18nViolations.length} violation(s):`,
    );
    for (const v of i18nViolations) console.error(`  - ${v}`);
    await browser.close();
    server.close();
    process.exit(1);
  }
  console.log(`static: i18n furniture OK (lang "${lang}")`);
}

await browser.close();
server.close();
