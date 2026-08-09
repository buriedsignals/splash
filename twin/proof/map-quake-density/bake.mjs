// The bake for the hex-grid beat: one world camera, one basemap capture, every quake epicentre
// projected to pixel space. Binning happens afterwards, in node, on the projected points
// (`geo-hex.ts`) — the bake only owns the camera and the projection.
//
// Usage:
// The plate is FROZEN BESIDE THE BEAT, for the same reason its data is: a basemap living in `/tmp`
// cannot be committed, so the delivered artifact could not be reproduced or audited — and MapTiler
// restyles, so a re-bake months later is a different picture under the same marks. The render calls
// this bake only when the beat's own plate folder is empty.
//
//   bun proof/map-quake-density/bake.mjs --width 836 --height 480   # → proof/map-quake-density/plate

import { existsSync, readdirSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";
import { quakePointsFromCsv } from "./geo-hex.ts";

const HERE = dirname(fileURLToPath(import.meta.url));

// A world camera, clipped short of the poles — Mercator's own distortion there would blow up the
// hex cells and a magnitude-4+ catalogue has almost nothing to show above ~80°.
//
// THE FRAME MUST BE WIDER THAN IT IS TALL BY THE WORLD'S OWN RATIO. `fitBounds` fits the bounds
// inside the box on whichever axis binds first. Baked at 836 × 300 this box was HEIGHT-limited:
// 138° of latitude in 300 px forced a world only 527.7 px wide inside an 836 px frame, and
// MapLibre's `renderWorldCopies` filled the remaining 37% with repeat continents carrying NO
// hexagons — a reader saw the Americas drawn twice, once binned and once bare, and could
// reasonably read the bare copy as a place with no earthquakes. A geographic lie in a delivered
// artifact, measured in the plate's own geometry: the baked points spanned x = 154–682 of an
// 836 px frame, so 37% of the picture was un-binned repeat.
//
// The invariant that kills it is not "switch the copies off" — with `renderWorldCopies: false`
// MapLibre instead CLAMPS the camera so the world fills the width, which at 836 × 300 cropped the
// study area to 35°S–67°N and silently dropped 1,057 of the 14,175 events (measured, not assumed).
// The invariant is that THE WORLD MUST FILL THE FRAME'S WIDTH: then a copy, if drawn at all, lies
// entirely outside the picture. That is asserted after the fit, together with the bounds actually
// reaching the frame's corners. For this latitude range the height must be at least
// width × 0.5685 — 475.3 px at 836, hence the 480 this beat bakes.
//
// The camera is PACIFIC-CENTRED (−20…340 rather than −180…180) because the subject is the Ring of
// Fire. On a Greenwich-centred world the antimeridian runs through the densest cluster: measured,
// the Fiji–Tonga cell landed hard against the west edge with half of it clipped away by the frame
// and its own neighbours binned into a separate cell 836 px east — 1,451 events in the visible
// half against 1,713 when the cluster is kept whole. Cutting at 20°W instead puts the seam in the
// mid-Atlantic, which leaves both the Ring of Fire AND Africa uncut and costs this catalogue
// almost nothing. `map.project` does NOT wrap to the camera, so every longitude is normalised into
// [−20, 340) before projection — without that, every western-Pacific event projects to a negative
// x and is culled.
const BEAT = {
  bounds: [
    [-20, -60],
    [340, 78],
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

const width = Number(flag("--width", "900"));
const height = Number(flag("--height", "560"));
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

const points = quakePointsFromCsv(await readFile(csvPath, "utf8"));

/** Into the camera's own longitude frame, [west, west + 360) — see BEAT's note on the seam. */
const west = BEAT.bounds[0][0];
const normaliseLon = (lon) => west + (((lon - west) % 360) + 360) % 360;

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

    const hidden = [];
    for (const layer of map.getStyle().layers)
      if (layer.type === "symbol" || /border|boundary|admin/i.test(layer.id)) {
        map.setLayoutProperty(layer.id, "visibility", "none");
        hidden.push(layer.id);
      }
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
    return {
      how,
      ms: Date.now() - started,
      hidden: hidden.length,
      zoom: map.getZoom(),
      topLeft: map.unproject([0, 0]),
      bottomRight: map.unproject([width, height]),
    };
  },
  { key, style: BEAT.style, bounds: BEAT.bounds, settleMs, width, height },
);

const frameCorners = frameCornersOf(gate.topLeft, gate.bottomRight);
const camera = cameraFacts(gate.zoom, frameCorners);

// The two assertions this beat's own defect earned: the world must FILL the frame's width (or a
// repeat continent shows, carrying no hexagons and reading as "no earthquakes here"), AND the
// frame must actually reach the bounds that were asked for (or the study area is silently cropped
// instead). Either one alone can be satisfied by a plate that lies.
if (camera.worldWidthPx < width - 1)
  throw new Error(
    `this plate would not fill its frame: the world draws ${camera.worldWidthPx.toFixed(1)}px wide inside ` +
      `${width}px (${((camera.worldWidthPx / width) * 100).toFixed(0)}%).`,
  );
const [[askedWest, askedSouth], [askedEast, askedNorth]] = BEAT.bounds;
const shortfall = [];
if (frameCorners.south > askedSouth + 0.01)
  shortfall.push(`south edge is ${frameCorners.south.toFixed(2)}°, asked for ${askedSouth}°`);
if (frameCorners.north < askedNorth - 0.01)
  shortfall.push(`north edge is ${frameCorners.north.toFixed(2)}°, asked for ${askedNorth}°`);
if (frameCorners.west > askedWest + 0.01)
  shortfall.push(`west edge is ${frameCorners.west.toFixed(2)}°, asked for ${askedWest}°`);
if (frameCorners.east < askedEast - 0.01)
  shortfall.push(`east edge is ${frameCorners.east.toFixed(2)}°, asked for ${askedEast}°`);
if (shortfall.length > 0)
  throw new Error(
    `this plate crops the study area — ${shortfall.join("; ")}. A ${width}px-wide frame needs at least ` +
      `${Math.ceil(width * 0.5685)}px of height to hold ${askedSouth}°–${askedNorth}° without cropping.`,
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
}, points.flatMap((p) => [normaliseLon(p.lon), p.lat]));

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
  // `i` is the point's own row index in the frozen CSV. It travels so the render can ask a cell
  // WHICH events it holds, and read their place names out of the file instead of typing one.
  projectedPoints.push({ px: Math.round(px * 10) / 10, py: Math.round(py * 10) / 10, i });
}

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
  points: projectedPoints,
};
const geometryPath = join(outDir, "geometry.json");
await writeFile(geometryPath, JSON.stringify(geometry));

console.log(
  `gated by ${gate.how} in ${gate.ms}ms · hid ${gate.hidden} basemap layers · zoom ${geometry.zoom}\n` +
    `world     ${geometry.worldWidthPx}px wide in a ${width}px frame (fills ${((camera.worldWidthPx / width) * 100).toFixed(1)}%)\n` +
    `frame     ${frameCorners.west.toFixed(2)}..${frameCorners.east.toFixed(2)}°, ` +
    `${frameCorners.south.toFixed(2)}..${frameCorners.north.toFixed(2)}°\n` +
    `plate    → ${platePath}\n` +
    `geometry → ${geometryPath}  ${projectedPoints.length}/${points.length} points on-frame (${offFrame} off)`,
);
