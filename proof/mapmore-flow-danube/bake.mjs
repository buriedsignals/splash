// The bake for the flow-map (route) beat: one camera over the Danube corridor, one basemap
// capture, the route line and the crossed territories' shapes all projected to pixel space.
//
// Two defects fixed here that `map-beat/SKILL.md` and `map-quake-density/bake.mjs` both
// flag as landmines for the next map beat: `dataviz-light` paints water GREY (breaks the
// water/land/no-data colour discipline — `geo-discipline.md` rule 7 — so it is overridden below,
// same fix as the hex-grid beat), and a plate baked at one size drawn into a differently-sized box
// offsets every mark from the coastline beneath it — this bake is only ever called at the exact
// size the still draws at.
//
// The plate is FROZEN BESIDE THE BEAT (`plate/`), for the same reason its csv is: a render whose
// basemap lives in `/tmp` cannot be reproduced or audited, and MapTiler restyles, so two bakes on
// two dates are not the same image. The default `--out` therefore writes into the beat's own
// folder, and `render.mjs` only calls this bake when that folder is EMPTY.
//
// Usage:
//   bun proof/mapmore-flow-danube/bake.mjs --size 900x420   # → proof/mapmore-flow-danube/plate

import { existsSync, readdirSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";
import {
  parseRouteCsv,
  territoriesCrossed,
  pointOnFeature,
  routeBBoxWithin,
  keepRing,
  simplifyRing,
} from "./geo-flow.ts";

const HERE = dirname(fileURLToPath(import.meta.url));

// The Danube corridor: source region in Baden-Württemberg to the delta near the Ukrainian border.
// Landscape, because the journey itself runs west to east far more than north to south.
const BEAT = {
  bounds: [
    [6.3, 42.6],
    [30.0, 50.1],
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

const [width, height] = flag("--size", "900x420").split("x").map(Number);
const outDir = flag("--out", join(HERE, "plate"));
const routePath = flag("--route", join(HERE, "danube-route.csv"));
const countriesPath = flag("--countries", join(HERE, "countries.geojson"));
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

/** The least frame height, at this width, that holds this latitude range without cropping — the
 * Mercator world's own aspect over that range. The message a shortfall throws is only useful if the
 * number in it ACTUALLY fixes the frame, and a constant tuned against one beat's [-60°, 78°]
 * (`width * 0.5685`) is wrong at every other range. Measured: this derivation and that constant
 * differ by one pixel at 836px, so replacing it moved no plate. @parity */
function minFrameHeightPx(width, south, north) {
  return Math.ceil((width * (mercY(north) - mercY(south))) / (2 * Math.PI));
}

/** THE WORLD MUST FILL THE FRAME'S WIDTH. Under it, MapLibre draws a repeat continent inside the
 * picture carrying none of this beat's marks, and a reader can reasonably read the bare copy as a
 * place with no data — measured once at 836 × 300, where 37% of the picture was un-binned repeat.
 * `renderWorldCopies: false` is not the fix: it clamps the camera instead, which silently dropped
 * 1,057 of 14,175 events. @parity */
function assertWorldFillsFrame(camera, width) {
  if (camera.worldWidthPx >= width - 1) return;
  throw new Error(
    `this plate would not fill its frame: the world draws ${camera.worldWidthPx.toFixed(1)}px wide inside ` +
      `${width}px (${((camera.worldWidthPx / width) * 100).toFixed(0)}%).`,
  );
}

/** …AND THE FRAME MUST REACH THE BOUNDS THAT WERE ASKED FOR, or the study area is silently cropped
 * instead. The two travel together, always: either one alone can be satisfied by a plate that lies.
 * @parity */
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

const MAPTILER_KEY_ALIASES = ["MAPTILER_API_KEY", "REMOTION_MAPTILER_KEY", "VITE_MAPTILER_KEY"];
const env = parseEnvFile(await readFile(keyPath, "utf8"));
const key = env.MAPTILER_KEY ?? MAPTILER_KEY_ALIASES.map((a) => env[a]).find(Boolean);
if (!key) throw new Error(`no MAPTILER_KEY in ${keyPath}`);

// ── The route and the territories it computes as crossed ──────────────────────────────────────
const route = parseRouteCsv(await readFile(routePath, "utf8"));
const collection = JSON.parse(await readFile(countriesPath, "utf8"));
const territories = collection.features.map((f) => ({
  key: f.properties.ADM0_A3,
  name: f.properties.NAME_FR ?? f.properties.NAME,
  geometry: f.geometry,
}));

const crossings = territoriesCrossed(route, territories);
if (crossings.length === 0) throw new Error("the route crosses no declared territory — nothing to bake");
console.log(`crossings, in order: ${crossings.map((c) => c.key).join(" -> ")}`);

// Each anchor is computed against the part of the territory the route is ACTUALLY in (see
// `routeBBoxWithin`'s own doc-comment) — never the country's whole national visual centre, which
// can sit far outside this beat's own frame for a territory the route only clips the corner of.
const anchorsLonLat = crossings.map((c) => {
  const t = territories.find((t) => t.key === c.key);
  const box = routeBBoxWithin(route, t.geometry, 0.6);
  return { key: c.key, lonlat: pointOnFeature(t.geometry, box) };
});

const crossedGeometry = new Map(territories.map((t) => [t.key, t.geometry]));

// ── The capture ────────────────────────────────────────────────────────────────────────────────
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

    // Rule 9: quiet the plate — hide labels and the provider's own boundary lines.
    const hidden = [];
    for (const layer of map.getStyle().layers)
      if (layer.type === "symbol" || /border|boundary|admin/i.test(layer.id)) {
        map.setLayoutProperty(layer.id, "visibility", "none");
        hidden.push(layer.id);
      }
    // Defect fixed tonight (see this file's own header note): `dataviz-light` paints water GREY,
    // which is indistinguishable from a no-data grey under `geo-discipline.md` rule 7. Force the
    // cartographic-convention blue tint instead.
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
assertWorldFillsFrame(camera, width);
assertCameraReachesBounds(frameCorners, BEAT.bounds, width);

await mkdir(outDir, { recursive: true });
const platePath = join(outDir, "plate.png");
await page.screenshot({ path: platePath, clip: { x: 0, y: 0, width, height } });

// ── The projection ────────────────────────────────────────────────────────────────────────────
function ringsOf(geometry) {
  const polygons = geometry.type === "MultiPolygon" ? geometry.coordinates : [geometry.coordinates];
  return polygons.flat();
}

const territoryPayload = crossings.map((c) => ({
  key: c.key,
  rings: ringsOf(crossedGeometry.get(c.key)),
}));

const projected = await page.evaluate(
  ({ territoryPayload, routeCoords, anchors }) => {
    const map = window.__map;
    const at = (lng, lat) => {
      const p = map.project([lng, lat]);
      return [Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10];
    };
    return {
      territories: territoryPayload.map((t) => ({
        key: t.key,
        rings: t.rings.map((ring) => ring.map(([lng, lat]) => at(lng, lat))),
      })),
      route: routeCoords.map(([lng, lat]) => at(lng, lat)),
      anchors: anchors.map((a) => ({ key: a.key, px: at(...a.lonlat) })),
    };
  },
  { territoryPayload, routeCoords: route, anchors: anchorsLonLat },
);

await browser.close();

// ── Cull and thin, in node, with the pure functions the tests cover ────────────────────────────
const frame = { width, height };
const minGap = 0.6;

const territoriesOut = projected.territories.map((t) => {
  const rings = [];
  for (const ring of t.rings) {
    if (!keepRing(ring, frame)) continue;
    rings.push(simplifyRing(ring, minGap));
  }
  return { key: t.key, rings };
});

const empty = territoriesOut.filter((t) => t.rings.length === 0).map((t) => t.key);
if (empty.length > 0)
  console.warn(`WARNING: entirely off-frame after culling (label/route may still be nearby): ${empty.join(", ")}`);

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
  crossings: crossings.map((c) => c.key),
  anchors: Object.fromEntries(projected.anchors.map((a) => [a.key, a.px])),
  territories: territoriesOut,
  route: projected.route,
};
const geometryPath = join(outDir, "geometry.json");
await writeFile(geometryPath, JSON.stringify(geometry));

console.log(
  `gated by ${gate.how} in ${gate.ms}ms · hid ${gate.hidden} basemap layers · zoom ${geometry.zoom}\n` +
    `plate    → ${platePath}\n` +
    `geometry → ${geometryPath}  ${territoriesOut.length} territories, ${projected.route.length} route points`,
);
