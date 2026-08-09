// The bake for the proportional-symbol WEB beat: one western-Pacific camera, one basemap capture,
// one file of projected event positions. A symbol map has no polygon and no data join, so this is a
// lighter bake than a choropleth's: points in, projected pixels out.
//
// THE PLATE IS FROZEN BESIDE THE BEAT, in `plate/`, and committed with it. A basemap living in
// `/tmp` cannot be committed, so a delivered artifact drawn over it can be neither reproduced nor
// audited — eleven map beats in this tree were in exactly that state — and MapTiler restyles, so a
// re-bake months later is a different picture under the same circles. `render-web.mjs` calls this
// only when `plate/` is empty; a warm run never touches the network.
//
// Two rules from `twin-doctrine/references/geo-discipline.md` that this bake, not the render, is
// responsible for:
//   rule 1 — the frame gate is `idle` OR a bounded settle, and the geometry records which fired;
//   rule 7 — water reads as a blue tint, never grey. `dataviz-light` paints water `hsl(240, 2%, 88%)`,
//     a near-grey. Under a choropleth that is invisible; on a POINT beat almost the whole plate is
//     exposed basemap, so uncorrected the ocean reads as no-data across the entire frame. This is a
//     Pacific-rim map: it is nearly all water.
// Rule 12 — the camera is chosen from the geography, not from a default: the study set's own extent
// is longitude 97.05 → 166.38, latitude -12.52 → 46.59, and the box below pads that on every side so
// no circle sits on the frame edge. It is the same box `proof/map-quake-symbol` bakes for its still
// and its video, so the three genres of this story share one camera.
//
// SIZE: baked generously (1000 logical px, ~2000 physical at the capture's own 2x device pixel
// ratio) and scaled UNIFORMLY within that by the page — never stretched. A stretched basemap is a
// lie about distance and shape. At the widest viewport this beat is verified at (1600px, minus the
// page's own padding) the plate draws at ~1568 CSS px, an upscale of ~1.57x; at 1024, 768 and 375 it
// is at or below native.
//
// Usage:
//   bun proof/mapgen-symbol-web/bake.mjs --size 1000        # → proof/mapgen-symbol-web/plate

import { existsSync, readdirSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";
import { quakesFromCsv, arcOf, keepPoint } from "./geo-symbol.ts";

const HERE = dirname(fileURLToPath(import.meta.url));

const BEAT = {
  bounds: [
    [90, -19],
    [173, 53],
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

const size = Number(flag("--size", "1000"));
const outDir = flag("--out", join(HERE, "plate"));
const dataPath = flag("--data", join(HERE, "quakes-symbol.csv"));
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

// What the camera already knows, and what `geometry.json` used to throw away. Every downstream
// "big enough / too big / too close together" decision needs these three numbers; without them each
// one is re-guessed as a pixel constant tuned by eye against this beat's own extent.

/** The extent ACTUALLY shown, which is NOT the bounds that were asked for: `fitBounds` fits the
 * bounds inside the box on whichever axis binds first, so the other axis always overshoots. @parity */
function frameCornersOf(topLeft, bottomRight) {
  return { west: topLeft.lng, north: topLeft.lat, east: bottomRight.lng, south: bottomRight.lat };
}

/** Web-Mercator northing for a latitude, in world units where a full turn of longitude is 2π. @parity */
function mercY(latDeg) {
  return Math.log(Math.tan(Math.PI / 4 + (latDeg * Math.PI) / 360));
}

/** How wide the world draws at this zoom (512px at zoom 0, doubling each level), and what one drawn
 * pixel is worth in degrees and in metres at the frame's own centre latitude. @parity */
function cameraFacts(zoom, corners) {
  const worldWidthPx = 512 * 2 ** zoom;
  const centreLat = (corners.north + corners.south) / 2;
  return {
    worldWidthPx: Math.round(worldWidthPx * 10) / 10,
    degreesPerPixel: Number((360 / worldWidthPx).toPrecision(6)),
    metresPerPixel: Number(((40075016.686 * Math.cos((centreLat * Math.PI) / 180)) / worldWidthPx).toPrecision(6)),
  };
}

const MAPTILER_KEY_ALIASES = ["MAPTILER_API_KEY", "REMOTION_MAPTILER_KEY", "VITE_MAPTILER_KEY"];
const env = parseEnvFile(await readFile(keyPath, "utf8"));
const key = env.MAPTILER_KEY ?? MAPTILER_KEY_ALIASES.map((a) => env[a]).find(Boolean);
if (!key) throw new Error(`no MAPTILER_KEY in ${keyPath}`);

const rows = quakesFromCsv(await readFile(dataPath, "utf8"));

const browser = await puppeteer.launch({
  headless: true,
  executablePath: resolveChrome(),
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox", "--hide-scrollbars"],
});
const page = await browser.newPage();
await page.setViewport({ width: size, height: size, deviceScaleFactor: 2 });
await page.setContent(
  `<!doctype html><html><head>
<link href="${MAPLIBRE_CSS}" rel="stylesheet"/>
<script src="${MAPLIBRE}"></script>
<style>html,body{margin:0;padding:0}#map{width:${size}px;height:${size}px}</style>
</head><body><div id="map"></div></body></html>`,
  { waitUntil: "load" },
);
await page.waitForFunction("window.maplibregl !== undefined", { timeout: 60000 });

const gate = await page.evaluate(
  async ({ key, style, bounds, settleMs, width, height }) => {
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

    // Rule 9: quiet the plate. Every place label, road label and boundary line the provider ships is
    // a layer doing none of this beat's five jobs — the circles and this beat's own furniture carry
    // it.
    const hidden = [];
    for (const layer of map.getStyle().layers)
      if (layer.type === "symbol" || /border|boundary|admin/i.test(layer.id)) {
        map.setLayoutProperty(layer.id, "visibility", "none");
        hidden.push(layer.id);
      }

    // Rule 7, and on this beat it decides the whole picture: the frame is mostly ocean.
    for (const id of ["Water", "Water shadow"])
      if (map.getLayer(id)) map.setPaintProperty(id, "fill-color", "#aac9e0");

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
    return {
      how,
      ms: Date.now() - started,
      hidden: hidden.length,
      zoom: map.getZoom(),
      topLeft: map.unproject([0, 0]),
      bottomRight: map.unproject([width, height]),
    };
  },
  { key, style: BEAT.style, bounds: BEAT.bounds, settleMs, width: size, height: size },
);

const frameCorners = frameCornersOf(gate.topLeft, gate.bottomRight);
const camera = cameraFacts(gate.zoom, frameCorners);

await mkdir(outDir, { recursive: true });
const platePath = join(outDir, "plate.png");
await page.screenshot({ path: platePath, clip: { x: 0, y: 0, width: size, height: size } });

const projected = await page.evaluate(
  (points) => {
    const map = window.__map;
    return points.map(({ key, lon, lat }) => {
      const p = map.project([lon, lat]);
      return [key, Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10];
    });
  },
  rows.map(({ key, lon, lat }) => ({ key, lon, lat })),
);

await browser.close();

const pxOf = new Map(projected.map(([key, x, y]) => [key, [x, y]]));
const points = rows.map((row) => {
  const [px, py] = pxOf.get(row.key);
  return { ...row, px, py, arc: arcOf(row) };
});

const frame = { width: size, height: size };
const offFrame = points.filter((p) => !keepPoint(p, frame)).map((p) => p.place);

const geometry = {
  frame,
  bounds: BEAT.bounds,
  style: BEAT.style,
  gatedBy: gate.how,
  zoom: Math.round(gate.zoom * 1000) / 1000,
  frameCorners,
  worldWidthPx: camera.worldWidthPx,
  degreesPerPixel: camera.degreesPerPixel,
  metresPerPixel: camera.metresPerPixel,
  points,
};
const geometryPath = join(outDir, "geometry.json");
await writeFile(geometryPath, JSON.stringify(geometry));

console.log(
  `gated by ${gate.how} in ${gate.ms}ms · hid ${gate.hidden} basemap layers · zoom ${geometry.zoom}\n` +
    `plate    → ${platePath}\n` +
    `geometry → ${geometryPath}  ${points.length} points\n` +
    `off-frame: ${offFrame.length ? offFrame.join(", ") : "none"}`,
);
