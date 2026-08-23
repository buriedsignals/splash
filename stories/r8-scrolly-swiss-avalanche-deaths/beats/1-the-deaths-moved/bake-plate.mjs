// The bake behind this beat's MAP track: one camera, one basemap capture, and the projected pixel
// of every one of the 1 406 fatal avalanches in the frozen file. Run once; the plate and its
// geometry are committed beside the beat, and the delivered HTML embeds the plate as a data URI, so
// it makes no network request and carries no MapTiler key.
//
// WHY THIS FILE EXISTS AT ALL — measured 2026-08-23, and the same finding a previous beat in this
// tree already wrote down (`stories/stress-ac-alcanede-kilns/beats/1-one-kiln-left/bake-plate.mjs`).
// `skills/scrolly/scripts/bake-plate.mjs` cannot be run for this beat, for four independent
// reasons, none of which has a flag:
//
//   1. its camera centre comes from `readStation`, which parses a USGS site file and REQUIRES
//      `site_no`, `station_nm`, `dec_lat_va`, `dec_long_va` and `drain_area_va`. An avalanche
//      register has none of those;
//   2. it writes its output as `potomac-plate.jpg` / `potomac-plate.json` whatever `--out` it is
//      given, so two beats baking into one directory would overwrite each other;
//   3. its camera is a CENTRE + ZOOM with `zoom` a module constant (`CAMERA = { zoom: 9 }`) and no
//      flag. This beat's study area is a country, which is a BOUNDS, and the skill's bake carries
//      an `@parity-exempt` note saying it deliberately has no bounds path;
//   4. `CAMERA.style` is the literal `"dataviz-light"`, also with no flag — and this story's
//      recorded ground is `#16191B`, a dark one. `plateFollowsGround`
//      (`skills/splash/scripts/preflight.mjs`) refuses that pairing, and the scrolly verifier
//      measures it again on the delivered page. The skill's own bake cannot produce a plate this
//      story's own guard would accept.
//
// So the style is DERIVED from the recorded ground here, the way `stress-f-housing-pressure` and
// `real-owid-life-expectancy` each derived it in their own beat directories. Three beats have now
// written the same four lines; no skill carries them.
//
// CLOSED UPSTREAM 2026-08-23 — all four. `skills/scrolly/scripts/bake-plate.mjs` now takes
// `--centre lon,lat`, `--bounds W,S,E,N`, `--name <basename>` and `--ground #rrggbb`, derives the
// basemap side from that ground with the same `plateFollowsGround` that will later judge the
// pairing, and calls `assertCameraReachesBounds` on the bounds path. A beat written after this date
// does NOT need to copy the four reasons above; it passes four flags. This file is kept as it
// stands rather than shrunk, and that is a deliberate refusal with a number behind it: this beat's
// plate is approved and its delivered HTML is byte-bound to the render that embeds it (gate 3), so
// re-baking to prove a shorter file would mean re-approving a page nothing is wrong with. What this
// file still carries that the skill's bake does not is the part that IS this beat's: projecting
// 1,406 accidents into the frame the plate was baked at.
//
// Everything else — the boundary-layer hide, the world-fills-the-frame and reaches-the-bounds
// assertions, the idle/settle gate, the JPEG choice — is the skill's bake, copied rather than
// imported, because nothing under a skill may be imported across a beat boundary either.
//
// Usage:
//   bun stories/r8-scrolly-swiss-avalanche-deaths/beats/1-the-deaths-moved/bake-plate.mjs

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";
import { readPalette } from "#shared/chart-beat/render-still.mjs";
import { parseAccidents } from "./avalanche-data.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const STORY_DIR = resolve(HERE, "../..");
const ROOT = resolve(HERE, "../../../..");

const MAPLIBRE = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js";
const MAPLIBRE_CSS = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css";

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv[at + 1] : fallback;
};

/** WCAG relative luminance of a `#rrggbb`, so the basemap side is a measurement rather than a
 *  preference. A byte-for-byte duplicate of the reasoning in `splash/scripts/preflight.mjs`'s
 *  `surfaceLuminance`, carried here because a beat may not import a skill's internals. */
function luminanceOf(hex) {
  const channels = [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16));
  const channel = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(channels[0]) + 0.7152 * channel(channels[1]) + 0.0722 * channel(channels[2]);
}

/** The basemap side this story's own ground puts the plate on. `DARK_SIDE` is `plateFollowsGround`'s
 *  own boundary (0.25); anything at or under it is a dark page and takes a dark basemap. */
function styleForGround(ground) {
  return luminanceOf(ground) <= 0.25 ? "dataviz-dark" : "dataviz-light";
}

const { ground } = readPalette(HERE, { stopAt: ROOT });

/** Switzerland's own extent, taken from the FROZEN FILE's own coordinates rather than from an
 *  atlas: the study area is where the accidents are, and a bounds typed by hand could crop one. */
function boundsOf(accidents, padDegrees) {
  const lats = accidents.map((a) => a.lat);
  const lons = accidents.map((a) => a.lon);
  return [
    [Math.min(...lons) - padDegrees, Math.min(...lats) - padDegrees],
    [Math.max(...lons) + padDegrees, Math.max(...lats) + padDegrees],
  ];
}

const csv = await readFile(join(STORY_DIR, "source", "data.csv"), "utf8");
const accidents = parseAccidents(csv);
const PAD = Number(flag("--pad", "0.12"));
const BOUNDS = boundsOf(accidents, PAD);

const width = Number(flag("--width", "1240"));
const height = Number(flag("--height", "640"));
const outDir = flag("--out", HERE);
const settleMs = Number(flag("--settle", "15000"));
const style = flag("--style", styleForGround(ground));

/** Headless Chrome has to be FOUND before it can be gated — a duplicate of the sibling formats'
 *  resolver, failing with every path it looked in. */
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
function assertWorldFillsFrame(camera, width) {
  if (camera.worldWidthPx >= width - 1) return;
  throw new Error(
    `this plate would not fill its frame: the world draws ${camera.worldWidthPx.toFixed(1)}px wide inside ` +
      `${width}px (${((camera.worldWidthPx / width) * 100).toFixed(0)}%).`,
  );
}
/** @parity-exempt: this beat's BOUNDS are derived from the 1,406 accidents in the frozen file
 *  (`boundsOf`), never typed, so `askedSouth` is `45.817669980000004` and the canonical bake's
 *  refusal — which interpolates the asked value raw, correct for a bake whose bounds are a typed
 *  literal — would print seventeen digits at a journalist. Every asked value is rounded to two
 *  decimals here, and the closing sentence names the latitudes rather than repeating them. The
 *  arithmetic, the 0.01° tolerance and the `minFrameHeightPx` advice are the canonical's, verbatim.
 *  Measured 2026-08-23. */
function assertCameraReachesBounds(frameCorners, bounds, width) {
  const [[askedWest, askedSouth], [askedEast, askedNorth]] = bounds;
  const shortfall = [];
  if (frameCorners.south > askedSouth + 0.01)
    shortfall.push(`south edge is ${frameCorners.south.toFixed(2)}°, asked for ${askedSouth.toFixed(2)}°`);
  if (frameCorners.north < askedNorth - 0.01)
    shortfall.push(`north edge is ${frameCorners.north.toFixed(2)}°, asked for ${askedNorth.toFixed(2)}°`);
  if (frameCorners.west > askedWest + 0.01)
    shortfall.push(`west edge is ${frameCorners.west.toFixed(2)}°, asked for ${askedWest.toFixed(2)}°`);
  if (frameCorners.east < askedEast - 0.01)
    shortfall.push(`east edge is ${frameCorners.east.toFixed(2)}°, asked for ${askedEast.toFixed(2)}°`);
  if (shortfall.length === 0) return;
  throw new Error(
    `this plate crops the study area — ${shortfall.join("; ")}. A ${width}px-wide frame needs at least ` +
      `${minFrameHeightPx(width, askedSouth, askedNorth)}px of height to hold the asked-for latitudes without cropping.`,
  );
}

const names = ["MAPTILER_KEY", ...MAPTILER_KEY_ALIASES];
const keyPath = flag("--env", join(process.cwd(), ".env"));
const fromProcess = names.map((name) => process.env[name]).find(Boolean);
const fromFile = existsSync(keyPath)
  ? (() => {
      const env = parseEnvFile(readFileSync(keyPath, "utf8"));
      return names.map((name) => env[name]).find(Boolean);
    })()
  : undefined;
const key = fromProcess ?? fromFile;
if (!key)
  throw new Error(`no MapTiler key. Looked for ${names.join(", ")} in the environment and in ${keyPath}`);

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
  async ({ key, style, bounds, settleMs, width, height, water }) => {
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

    // The place labels STAY: a reader who has never heard of Zermatt still needs Bern, Zurich and
    // the Rhone valley to place a dot. Boundary lines are hidden — the same departure the skill's
    // own locator bake makes and for the same reason.
    const hidden = [];
    for (const layer of map.getStyle().layers)
      if (/border|boundary|admin/i.test(layer.id)) {
        map.setLayoutProperty(layer.id, "visibility", "none");
        hidden.push(layer.id);
      }

    // Rule 7: water reads as a blue tint, never grey. On a DARK basemap the tint is a dark blue —
    // the light-ground values would out-shine every dot on the plate.
    for (const id of ["Water", "Water shadow", "River", "River labels"])
      if (map.getLayer(id)) {
        const type = map.getLayer(id).type;
        if (type === "fill") map.setPaintProperty(id, "fill-color", water.fill);
        if (type === "line") map.setPaintProperty(id, "line-color", water.line);
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
  {
    key,
    style,
    bounds: BOUNDS,
    settleMs,
    width,
    height,
    water: /dark/.test(style) ? { fill: "#22394d", line: "#3a6b8f" } : { fill: "#aac9e0", line: "#7fa9c9" },
  },
);

const frameCorners = frameCornersOf(gate.topLeft, gate.bottomRight);
const camera = cameraFacts(gate.zoom, frameCorners);
assertWorldFillsFrame(camera, width);
assertCameraReachesBounds(frameCorners, BOUNDS, width);

await mkdir(outDir, { recursive: true });
const platePath = join(outDir, "swiss-plate.jpg");
await page.screenshot({ path: platePath, type: "jpeg", quality: 88, clip: { x: 0, y: 0, width, height } });

// EVERY ACCIDENT IS PROJECTED BY THE MAP ITSELF, not re-derived from the frame corners: the camera
// that drew the plate is the only thing that knows exactly where a coordinate landed on it, and a
// second projection written by hand is a second chance to be wrong.
const points = await page.evaluate(
  ({ rows }) =>
    rows.map((row) => {
      const p = window.__map.project([row.lon, row.lat]);
      return [Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10, row.dead, row.side];
    }),
  { rows: accidents.map((a) => ({ lon: a.lon, lat: a.lat, dead: a.dead, side: a.side })) },
);

await browser.close();

const offPlate = points.filter(([x, y]) => x < 0 || y < 0 || x > width || y > height);
if (offPlate.length > 0)
  throw new Error(
    `${offPlate.length} of ${points.length} accidents project outside the plate — the camera does not ` +
      `hold the study area it was given`,
  );

const geometry = {
  frame: { width, height },
  style,
  ground,
  zoom: Math.round(gate.zoom * 1000) / 1000,
  bounds: BOUNDS,
  frameCorners,
  worldWidthPx: camera.worldWidthPx,
  degreesPerPixel: camera.degreesPerPixel,
  metresPerPixel: camera.metresPerPixel,
  gatedBy: gate.how,
  points,
};
const geometryPath = join(outDir, "swiss-plate.json");
await writeFile(geometryPath, JSON.stringify(geometry, null, 2) + "\n");

console.log(
  `gated by ${gate.how} in ${gate.ms}ms · hid ${gate.hidden} boundary layers · style ${style} (ground ${ground}) · zoom ${geometry.zoom}\n` +
    `plate    → ${platePath}\n` +
    `geometry → ${geometryPath}  ${points.length} accidents projected onto ${width}x${height}`,
);
