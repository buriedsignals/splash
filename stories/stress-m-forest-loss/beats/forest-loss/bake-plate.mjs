// stories/stress-m-forest-loss/beats/forest-loss/bake-plate.mjs
//
// One camera for a band of ground that never fits a square frame: Brazil to Indonesia is 228° of
// longitude, and every declared country sits within 37°S-15°N of the equator. Rule 12's own
// "camera chosen from the geography, layout adapts to it": this beat's plate is a WIDE SHORT band,
// and the frame around it (static: a header above it; video: a 1080x1080 square that letterboxes
// hard, per rule 13's own third clause) gives the leftover height to furniture, not to a taller
// camera.
//
// geo-discipline.md rules 1, 2, 3, 6, 7, 9, 11, 12.
//
// Usage:
//   bun stories/stress-m-forest-loss/beats/forest-loss/bake-plate.mjs --width 836 --out plate-still
//   bun stories/stress-m-forest-loss/beats/forest-loss/bake-plate.mjs --width 1016 --out plate-video

import { existsSync, readdirSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";
import { FOREST_STUDY, WATER_FILL, keepRing, simplifyRing } from "./geo-forest.ts";

const HERE = dirname(fileURLToPath(import.meta.url));

/** A box wide enough for all seven declared countries with margin: Peru in the west, Indonesia in
 *  the east, Brazil's south in the south, South Sudan's north in the north. */
const BEAT = { bounds: [[-84, -37], [144, 15]], style: "dataviz-light" };

const MAPLIBRE = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js";
const MAPLIBRE_CSS = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css";

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv[at + 1] : fallback;
};

const width = Number(flag("--width", "836"));
const height = Number(flag("--height", String(Math.ceil(width * 0.19) + 20)));
const outDir = flag("--out", join(HERE, "plate-still"));
const shapesPath = flag("--shapes", join(HERE, "countries.geojson"));
const settleMs = Number(flag("--settle", "15000"));
const keyPath = flag("--env", join(HERE, "../../../../.env"));

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
  if (!found) throw new Error(`no Chrome to capture with. Looked in:\n  ${candidates.join("\n  ")}\nSet CHROME_PATH, or run: bunx puppeteer browsers install chrome`);
  return found;
}

const MAPTILER_KEY_ALIASES = ["MAPTILER_API_KEY", "REMOTION_MAPTILER_KEY", "VITE_MAPTILER_KEY"];
function parseEnvFile(text) {
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(\S+)\s*$/.exec(line);
    if (match) env[match[1]] = match[2];
  }
  return env;
}

function frameCornersOf(topLeft, bottomRight) {
  return { west: topLeft.lng, north: topLeft.lat, east: bottomRight.lng, south: bottomRight.lat };
}
function mercY(latDeg) {
  return Math.log(Math.tan(Math.PI / 4 + (latDeg * Math.PI) / 360));
}
function cameraFacts(zoom, corners) {
  const worldWidthPx = 512 * 2 ** zoom;
  const centreLat = (corners.north + corners.south) / 2;
  return {
    worldWidthPx: Math.round(worldWidthPx * 10) / 10,
    degreesPerPixel: Number((360 / worldWidthPx).toPrecision(6)),
    metresPerPixel: Number(((40075016.686 * Math.cos((centreLat * Math.PI) / 180)) / worldWidthPx).toPrecision(6)),
  };
}
function minFrameHeightPx(w, south, north) {
  return Math.ceil((w * (mercY(north) - mercY(south))) / (2 * Math.PI));
}
function assertWorldFillsFrame(camera, w) {
  if (camera.worldWidthPx >= w - 1) return;
  throw new Error(`this plate would not fill its frame: the world draws ${camera.worldWidthPx.toFixed(1)}px wide inside ${w}px.`);
}
function assertCameraReachesBounds(frameCorners, bounds, w) {
  const [[askedWest, askedSouth], [askedEast, askedNorth]] = bounds;
  const shortfall = [];
  if (frameCorners.south > askedSouth + 0.01) shortfall.push(`south edge is ${frameCorners.south.toFixed(2)}°, asked for ${askedSouth}°`);
  if (frameCorners.north < askedNorth - 0.01) shortfall.push(`north edge is ${frameCorners.north.toFixed(2)}°, asked for ${askedNorth}°`);
  if (frameCorners.west > askedWest + 0.01) shortfall.push(`west edge is ${frameCorners.west.toFixed(2)}°, asked for ${askedWest}°`);
  if (frameCorners.east < askedEast - 0.01) shortfall.push(`east edge is ${frameCorners.east.toFixed(2)}°, asked for ${askedEast}°`);
  if (shortfall.length === 0) return;
  throw new Error(`this plate crops the study area — ${shortfall.join("; ")}. A ${w}px-wide frame needs at least ${minFrameHeightPx(w, askedSouth, askedNorth)}px of height.`);
}

const env = parseEnvFile(await readFile(keyPath, "utf8"));
const key = env.MAPTILER_KEY ?? MAPTILER_KEY_ALIASES.map((alias) => env[alias]).find(Boolean);
if (!key) throw new Error(`no MAPTILER_KEY (or alias: ${MAPTILER_KEY_ALIASES.join(", ")}) in ${keyPath}`);

const collection = JSON.parse(await readFile(shapesPath, "utf8"));
const byKey = new Map();
for (const feature of collection.features) byKey.set(feature.properties.ADM0_A3, feature);
// Direction 2 from BRIEF.md: no alias, ADM0_A3 straight — this is what actually works in this
// tree (Natural Earth's own ADM0_A3 for South Sudan is `SDS`, matching the ministry's own code).
const missingShapes = FOREST_STUDY.filter((code) => !byKey.has(code));
if (missingShapes.length > 0) throw new Error(`${missingShapes.length} declared countries have no shape: ${missingShapes.join(", ")}`);

function ringsOf(geometry) {
  const polygons = geometry.type === "MultiPolygon" ? geometry.coordinates : [geometry.coordinates];
  return polygons.flat();
}
const payload = FOREST_STUDY.map((code) => {
  const feature = byKey.get(code);
  return { key: code, name: feature.properties.NAME, rings: ringsOf(feature.geometry) };
});

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
  async ({ key, style, bounds, settleMs, waterFill, width, height }) => {
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
    for (const id of ["Water", "Water shadow"]) if (map.getLayer(id)) map.setPaintProperty(id, "fill-color", waterFill);
    const hidden = [];
    for (const layer of map.getStyle().layers)
      if (layer.type === "symbol" || /border|boundary|admin/i.test(layer.id)) {
        map.setLayoutProperty(layer.id, "visibility", "none");
        hidden.push(layer.id);
      }
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
  { key, style: BEAT.style, bounds: BEAT.bounds, settleMs, waterFill: WATER_FILL, width, height },
);

const frameCorners = frameCornersOf(gate.topLeft, gate.bottomRight);
const camera = cameraFacts(gate.zoom, frameCorners);
assertWorldFillsFrame(camera, width);
assertCameraReachesBounds(frameCorners, BEAT.bounds, width);

await mkdir(outDir, { recursive: true });
const platePath = join(outDir, "plate.png");
await page.screenshot({ path: platePath, clip: { x: 0, y: 0, width, height } });

const projected = await page.evaluate((shapes) => {
  const map = window.__map;
  const at = (lng, lat) => {
    const p = map.project([lng, lat]);
    return [Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10];
  };
  return shapes.map((shape) => ({ key: shape.key, name: shape.name, rings: shape.rings.map((ring) => ring.map(([lng, lat]) => at(lng, lat))) }));
}, payload);

await browser.close();

const frame = { width, height };
const minGap = 0.6;
let ringsIn = 0, ringsOut = 0, pointsIn = 0, pointsOut = 0;
const shapes = projected.map((shape) => {
  const rings = [];
  for (const ring of shape.rings) {
    ringsIn++;
    pointsIn += ring.length;
    if (!keepRing(ring, frame)) continue;
    const thin = simplifyRing(ring, minGap);
    ringsOut++;
    pointsOut += thin.length;
    rings.push(thin);
  }
  return { key: shape.key, name: shape.name, rings };
});

const empty = shapes.filter((s) => s.rings.length === 0).map((s) => s.key);
if (empty.length > 0) throw new Error(`${empty.length} declared shapes had every ring culled out of frame: ${empty.join(", ")}`);

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
  shapes,
};
const geometryPath = join(outDir, "geometry.json");
await writeFile(geometryPath, JSON.stringify(geometry));

console.log(
  `gated by ${gate.how} in ${gate.ms}ms · hid ${gate.hidden} basemap layers · zoom ${geometry.zoom}\n` +
    `frame ${width}x${height}\n` +
    `plate    → ${platePath}\n` +
    `geometry → ${geometryPath}  ${ringsOut}/${ringsIn} rings, ${pointsOut}/${pointsIn} points\n` +
    `off-frame entirely: ${empty.length ? empty.join(", ") : "none"}`,
);
