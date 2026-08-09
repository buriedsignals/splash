// twin/proof/mapgen-hexgrid-web/bake-plate.mjs
//
// This beat's own bake: one world camera, one basemap capture, every quake epicentre projected to
// pixel space. Binning happens afterwards, in node, on the projected points (`geo-hex.ts`) —
// `render-web.mjs` bakes first, bins second, the same order `proof/map-quake-density/render.mjs`
// follows for its own static genre. Adapted from that beat's own `bake.mjs` (a point bake has no
// polygon join — camera, water-colour override, idle-or-settle gate, then `map.project()` per
// point) — this is this beat's OWN physical copy, sized for THIS beat's desktop web layout rather
// than the static beat's 900×560 frame, and writing into its own `/tmp` namespace so concurrent
// work on other beats never collides with it.
//
// Usage:
// The plate is FROZEN BESIDE THE BEAT, for the same reason its data is: a basemap living in `/tmp`
// cannot be committed, so the delivered artifact could not be reproduced or audited — and MapTiler
// restyles, so a re-bake months later is a different picture under the same marks. The render calls
// this bake only when the beat's own plate folder is empty.
//
//   bun proof/mapgen-hexgrid-web/bake-plate.mjs --width 836 --height 520   # → proof/mapgen-hexgrid-web/plate

import { existsSync, readdirSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";
import { quakePointsFromCsv } from "./geo-hex.ts";

const HERE = dirname(fileURLToPath(import.meta.url));

// The SAME real, world-spanning camera `proof/map-quake-density/bake.mjs` uses — clipped short of
// the poles (Mercator's own distortion there would blow up the hex cells, and a magnitude-4+
// catalogue has almost nothing to show above ~80°).
const BEAT = {
  bounds: [
    [-179.9, -60],
    [179.9, 78],
  ],
  style: "dataviz-light",
};

const MAPLIBRE = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js";
const MAPLIBRE_CSS = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css";

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv[at + 1] : fallback;
};

const width = Number(flag("--width", "836"));
const height = Number(flag("--height", "520"));
const outDir = flag("--out", join(HERE, "plate"));
const csvPath = flag("--data", join(HERE, "quakes-density.csv"));
const settleMs = Number(flag("--settle", "20000"));
const keyPath = flag("--env", join(HERE, "../../.env"));

function resolveChrome() {
  const candidates = [];
  if (process.env.CHROME_PATH) candidates.push(process.env.CHROME_PATH);
  const cache = join(homedir(), ".cache/puppeteer/chrome");
  if (existsSync(cache))
    for (const build of readdirSync(cache).sort().reverse())
      candidates.push(
        join(cache, build, "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"),
        join(cache, build, "chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"),
        join(cache, build, "chrome-linux64/chrome"),
      );
  candidates.push("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");
  const found = candidates.find((path) => existsSync(path));
  if (!found) throw new Error(`no Chrome to capture with. Looked in:\n  ${candidates.join("\n  ")}`);
  return found;
}

function parseEnvFile(text) {
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(\S+)\s*$/.exec(line);
    if (match) env[match[1]] = match[2];
  }
  return env;
}

const MAPTILER_KEY_ALIASES = ["MAPTILER_API_KEY", "REMOTION_MAPTILER_KEY", "VITE_MAPTILER_KEY"];
const env = parseEnvFile(await readFile(keyPath, "utf8"));
const key = env.MAPTILER_KEY ?? MAPTILER_KEY_ALIASES.map((a) => env[a]).find(Boolean);
if (!key) throw new Error(`no MAPTILER_KEY in ${keyPath}`);

const points = quakePointsFromCsv(await readFile(csvPath, "utf8"));

const browser = await puppeteer.launch({
  headless: true,
  executablePath: resolveChrome(),
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox", "--hide-scrollbars"],
});
const page = await browser.newPage();
await page.setViewport({ width, height, deviceScaleFactor: 2 });
await page.setContent(
  `<!doctype html><html><head>
<link href="${MAPLIBRE_CSS}" rel="stylesheet"/>
<script src="${MAPLIBRE}"></script>
<style>html,body{margin:0;padding:0}#map{width:${width}px;height:${height}px}</style>
</head><body><div id="map"></div></body></html>`,
  { waitUntil: "load" },
);
await page.waitForFunction("window.maplibregl !== undefined", { timeout: 60000 });

const gate = await page.evaluate(
  async ({ key, style, bounds, settleMs }) => {
    const map = new maplibregl.Map({
      container: "map",
      style: `https://api.maptiler.com/maps/${style}/style.json?key=${key}`,
      interactive: false,
      attributionControl: false,
      fadeDuration: 0,
      preserveDrawingBuffer: true,
      bounds,
      fitBoundsOptions: { padding: 0, animate: false },
    });
    window.__map = map;
    await new Promise((resolve) => map.once("style.load", resolve));

    const hidden = [];
    for (const layer of map.getStyle().layers)
      if (layer.type === "symbol" || /border|boundary|admin/i.test(layer.id)) {
        map.setLayoutProperty(layer.id, "visibility", "none");
        hidden.push(layer.id);
      }
    // Rule 7 of geo-discipline.md: water is a blue tint, never grey — MapTiler's dataviz-light
    // basemap paints water a near-grey (hsl(240, 2%, 88%)) and a point-based beat leaves nearly
    // the whole plate exposed as basemap, so this override is not optional here.
    for (const id of ["Water", "Water shadow"]) if (map.getLayer(id)) map.setPaintProperty(id, "fill-color", "#aac9e0");

    const started = Date.now();
    const how = await new Promise((resolve) => {
      let done = false;
      const finish = (how) => {
        if (!done) {
          done = true;
          resolve(how);
        }
      };
      map.once("idle", () => finish("idle"));
      setTimeout(() => finish("settle"), settleMs);
    });
    return { how, ms: Date.now() - started, hidden: hidden.length, zoom: map.getZoom() };
  },
  { key, style: BEAT.style, bounds: BEAT.bounds, settleMs },
);

await mkdir(outDir, { recursive: true });
const platePath = join(outDir, "plate.png");
await page.screenshot({ path: platePath, clip: { x: 0, y: 0, width, height } });

// Project in chunks — 14k+ points through page.evaluate at once is fine in one call, but keep it
// explicit in case a future dataset is bigger.
const projected = await page.evaluate((coords) => {
  const map = window.__map;
  const out = new Float64Array(coords.length);
  for (let i = 0; i < coords.length; i += 2) {
    const p = map.project([coords[i], coords[i + 1]]);
    out[i] = p.x;
    out[i + 1] = p.y;
  }
  return Array.from(out);
}, points.flatMap((p) => [p.lon, p.lat]));

// The frame's own TRUE corners, in lon/lat — not the nominal `BEAT.bounds` passed to `fitBounds`.
// A render audit found the two differ: `fitBounds` preserves this frame's own aspect ratio, so it
// zooms OUT until the requested bounds fit, which widens the visible lat range beyond what was
// asked for (measured here: -64.48..79.85, not the requested -60..78). A caller that later wants
// to name which real place a pixel/hex-cell sits over (`geo-hex.ts`'s `pixelToLonLat`) needs these
// true corners, or it silently mislabels the cell by several degrees of latitude — the bug this
// capture exists to prevent.
const frameCorners = await page.evaluate(({ width, height }) => {
  const map = window.__map;
  const topLeft = map.unproject([0, 0]);
  const bottomRight = map.unproject([width, height]);
  return {
    west: topLeft.lng,
    north: topLeft.lat,
    east: bottomRight.lng,
    south: bottomRight.lat,
  };
}, { width, height });

await browser.close();

const frame = { width, height };
const projectedPoints = [];
let offFrame = 0;
for (let i = 0; i < points.length; i++) {
  const px = projected[i * 2];
  const py = projected[i * 2 + 1];
  if (px < 0 || px > frame.width || py < 0 || py > frame.height) {
    offFrame++;
    continue;
  }
  // `i` is the point's own row index in the frozen CSV, carried through the projection so a cell
  // can be asked WHICH events it holds and their own catalogued place names can be read out of the
  // file. Without it the alt text and the accessible table can only type a location, which is how
  // "the Tonga-Kermadec trench" came to sit beside a coordinate 700 km away.
  projectedPoints.push({ px: Math.round(px * 10) / 10, py: Math.round(py * 10) / 10, i });
}

const geometry = {
  frame,
  bounds: BEAT.bounds,
  frameCorners,
  style: BEAT.style,
  gatedBy: gate.how,
  zoom: Math.round(gate.zoom * 1000) / 1000,
  points: projectedPoints,
};
const geometryPath = join(outDir, "geometry.json");
await writeFile(geometryPath, JSON.stringify(geometry));

console.log(
  `gated by ${gate.how} in ${gate.ms}ms · hid ${gate.hidden} basemap layers · zoom ${geometry.zoom}\n` +
    `plate    → ${platePath}\n` +
    `geometry → ${geometryPath}  ${projectedPoints.length}/${points.length} points on-frame (${offFrame} off)`,
);
