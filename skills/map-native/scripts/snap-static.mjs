// Static snapshot for the map (non-interactive build).
// Serves dist/static over a local HTTP server, waits for idle, screenshots.
// Layer-aware: handles both choropleth-fill and symbol-circles.
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFileSync, statSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname, join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const outDir = process.env.OUTDIR ?? join(root, "output-proof", "choropleth");
await mkdir(outDir, { recursive: true });

const staticDir = process.env.SERVE_DIR ?? join(root, "dist", "static");

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
const page = await browser.newPage({
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 2,
});

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
        m.getLayer("route-fill"))
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

await browser.close();
server.close();
