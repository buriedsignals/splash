// twin/proof/mapscrolly-one-map-europe-carbon/bake.mjs
//
// THE ONE PLATE this beat's camera moves inside. Not one plate per step: `geo-discipline.md` rule 2
// ("a moving camera needs a fixed plate") says a camera that moves must move WITHIN a fixed capture,
// because re-rendering tiles per camera position resamples the basemap slightly differently every
// time and the picture shimmers. That rule was written for a video's own camera; a scroll-driven
// camera is the same camera with the reader's thumb on the timeline, so it inherits the rule
// unchanged. The consequence is a resolution BUDGET rather than a free zoom, and `render.mjs`
// asserts it: the plate is captured at a raster resolution that still holds one source pixel per
// delivered pixel at this beat's DEEPEST step camera, measured, not hoped for.
//
// This is a DUPLICATE of `proof/mapgen-choropleth-web/bake-plate.mjs`, trimmed to what a scrolly
// needs and re-aimed at a bigger capture — a beat directory stays copy-pasteable on its own, so
// nothing here imports out of this folder except puppeteer and this beat's own `geo-choropleth.ts`.
// The camera bounds are the SAME near-square European box that beat uses (rule 12: the camera is
// decided by the geography, and this is the same study set), so the two beats' plates are directly
// comparable and neither invents a framing.
//
// What is different, and why:
//   - `--size 1100` rather than 496. The scrolly's graphic fills the reader's whole viewport and
//     the camera zooms into it; 496 CSS px of plate stretched over a 900px-tall graphic is already
//     soft before any zoom. At `deviceScaleFactor: 2` this writes a 2200 x 2200 raster.
//   - no `anchors` block. Every label this beat hangs is anchored on a SHAPE's own projected
//     bounding box, computed from the rings below, so no anchor can drift from the country it
//     names.
//
// Usage:
//   bun proof/mapscrolly-one-map-europe-carbon/bake.mjs            # -> ./plate
//   bun proof/mapscrolly-one-map-europe-carbon/bake.mjs --size 1100

import { existsSync, readdirSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";
import {
  CO2_2023_STUDY,
  WATER_FILL,
  keepRing,
  simplifyRing,
} from "./geo-choropleth.ts";

const HERE = dirname(fileURLToPath(import.meta.url));

/** The camera. Near-square on purpose: a wider frame holding 36N-67N also holds a third of North
 *  Africa and most of the mid-Atlantic, and no layout work removes them (rule 12). */
const BEAT = {
  bounds: [
    [-26, 36],
    [33, 67],
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

const size = Number(flag("--size", "1100"));
const outDir = flag("--out", join(HERE, "plate"));
const shapesPath = flag("--shapes", join(HERE, "countries.geojson"));
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
  if (!found)
    throw new Error(
      `no Chrome to capture with. Looked in:\n  ${candidates.join("\n  ")}\nSet CHROME_PATH, or run: bunx puppeteer browsers install chrome`,
    );
  return found;
}

// A duplicate of the sibling map beats' own key-alias resolution — not an import; a beat directory
// stays copy-pasteable on its own. The key is read at BAKE time only. Nothing it touches reaches
// the delivered HTML: the plate is a raster and the geometry is pixels.
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

function minFrameHeightPx(width, south, north) {
  return Math.ceil((width * (mercY(north) - mercY(south))) / (2 * Math.PI));
}

/** The world must fill the frame's width, or MapLibre draws a repeat continent carrying none of
 *  this beat's marks and a reader can fairly read the bare copy as a place with no data. */
function assertWorldFillsFrame(camera, width) {
  if (camera.worldWidthPx >= width - 1) return;
  throw new Error(
    `this plate would not fill its frame: the world draws ${camera.worldWidthPx.toFixed(1)}px wide inside ` +
      `${width}px (${((camera.worldWidthPx / width) * 100).toFixed(0)}%).`,
  );
}

/** ...and the frame must reach the bounds that were asked for, or the study area is cropped
 *  instead. Either check alone can be satisfied by a plate that lies. */
function assertCameraReachesBounds(frameCorners, bounds, width) {
  const [[askedWest, askedSouth], [askedEast, askedNorth]] = bounds;
  const shortfall = [];
  if (frameCorners.south > askedSouth + 0.01)
    shortfall.push(`south edge is ${frameCorners.south.toFixed(2)}°, asked for ${askedSouth}°`);
  if (frameCorners.north < askedNorth - 0.01)
    shortfall.push(`north edge is ${frameCorners.north.toFixed(2)}°, asked for ${askedNorth}°`);
  if (frameCorners.west > askedWest + 0.01)
    shortfall.push(`west edge is ${frameCorners.west.toFixed(2)}°, asked for ${askedWest}°`);
  if (frameCorners.east < askedEast - 0.01)
    shortfall.push(`east edge is ${frameCorners.east.toFixed(2)}°, asked for ${askedEast}°`);
  if (shortfall.length === 0) return;
  throw new Error(
    `this plate crops the study area — ${shortfall.join("; ")}. A ${width}px-wide frame needs at least ` +
      `${minFrameHeightPx(width, askedSouth, askedNorth)}px of height to hold ${askedSouth}°–${askedNorth}° without cropping.`,
  );
}

const env = parseEnvFile(await readFile(keyPath, "utf8"));
const key = env.MAPTILER_KEY ?? MAPTILER_KEY_ALIASES.map((alias) => env[alias]).find(Boolean);
if (!key) throw new Error(`no MAPTILER_KEY (or alias: ${MAPTILER_KEY_ALIASES.join(", ")}) in ${keyPath}`);

const collection = JSON.parse(await readFile(shapesPath, "utf8"));
const byKey = new Map();
for (const feature of collection.features) byKey.set(feature.properties.ADM0_A3, feature);
const missingShapes = CO2_2023_STUDY.filter((code) => !byKey.has(code));
if (missingShapes.length > 0)
  throw new Error(`${missingShapes.length} declared countries have no shape: ${missingShapes.join(", ")}`);

/** MultiPolygon and Polygon both become a flat list of rings; holes are rings too. Flattened across
 *  one shape's own PARTS only — never across two shapes — which is safe because the drawing path
 *  fills with `fill-rule="evenodd"`. */
function ringsOf(geometry) {
  const polygons = geometry.type === "MultiPolygon" ? geometry.coordinates : [geometry.coordinates];
  return polygons.flat();
}

const payload = CO2_2023_STUDY.map((code) => {
  const feature = byKey.get(code);
  return { key: code, name: feature.properties.NAME, rings: ringsOf(feature.geometry) };
});

const browser = await puppeteer.launch({
  headless: true,
  executablePath: resolveChrome(),
  args: [
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--no-sandbox",
    "--hide-scrollbars",
  ],
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
  async ({ key, style, bounds, settleMs, waterFill, width, height }) => {
    const map = new maplibregl.Map({
      container: "map",
      style: `https://api.maptiler.com/maps/${style}/style.json?key=${key}`,
      interactive: false,
      attributionControl: false,
      fadeDuration: 0,
      preserveDrawingBuffer: true, // rule 6: an empty canvas at screenshot time without this
      bounds,
      fitBoundsOptions: { padding: 0, animate: false },
    });
    window.__map = map;
    await new Promise((resolve) => map.once("style.load", resolve));

    // rule 7: water is a blue tint, never the near-grey `dataviz-light` ships.
    for (const id of ["Water", "Water shadow"])
      if (map.getLayer(id)) map.setPaintProperty(id, "fill-color", waterFill);

    // rule 9: quiet the plate — the beat draws the only labels, and a camera that zooms would
    // otherwise magnify the provider's own type into the reader's face at the deepest step.
    const hidden = [];
    for (const layer of map.getStyle().layers)
      if (layer.type === "symbol" || /border|boundary|admin/i.test(layer.id)) {
        map.setLayoutProperty(layer.id, "visibility", "none");
        hidden.push(layer.id);
      }

    // rule 1: idle OR a bounded settle, and record which one fired.
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
  { key, style: BEAT.style, bounds: BEAT.bounds, settleMs, waterFill: WATER_FILL, width: size, height: size },
);

const frameCorners = frameCornersOf(gate.topLeft, gate.bottomRight);
const camera = cameraFacts(gate.zoom, frameCorners);
assertWorldFillsFrame(camera, size);
assertCameraReachesBounds(frameCorners, BEAT.bounds, size);

await mkdir(outDir, { recursive: true });
const platePath = join(outDir, "plate.png");
await page.screenshot({ path: platePath, clip: { x: 0, y: 0, width: size, height: size } });

const projected = await page.evaluate((shapes) => {
  const map = window.__map;
  const at = (lng, lat) => {
    const p = map.project([lng, lat]);
    return [Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10];
  };
  return shapes.map((shape) => ({
    key: shape.key,
    name: shape.name,
    rings: shape.rings.map((ring) => ring.map(([lng, lat]) => at(lng, lat))),
  }));
}, payload);

await browser.close();

// Cull and thin in node, with the pure functions this beat's own tests cover. `minGap` is 0.6 CSS
// px at the WIDEST camera; at the deepest step camera that same gap is magnified, so the thinning
// floor is set against the deepest zoom rather than the plate — a coastline thinned for a
// continental view visibly polygonises when the camera flies into it.
const frame = { width: size, height: size };
const minGap = 0.25;
let ringsIn = 0;
let ringsOut = 0;
let pointsIn = 0;
let pointsOut = 0;

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
if (empty.length > 0)
  throw new Error(`${empty.length} declared shapes had every ring culled out of frame: ${empty.join(", ")}`);

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
  minGap,
  shapes,
};
const geometryPath = join(outDir, "geometry.json");
await writeFile(geometryPath, JSON.stringify(geometry));

console.log(
  `gated by ${gate.how} in ${gate.ms}ms · hid ${gate.hidden} basemap layers · zoom ${geometry.zoom}\n` +
    `plate    → ${platePath}\n` +
    `geometry → ${geometryPath}  ${ringsOut}/${ringsIn} rings, ${pointsOut}/${pointsIn} points`,
);
