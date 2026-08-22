// The bake behind this beat's MAP track: one camera, one basemap capture, one projected pixel for
// the kiln site. Run once; the plate and its geometry are committed beside the beat and the
// delivered HTML embeds the plate as a data URI, so it makes no network request and carries no
// MapTiler key.
//
// WHY THIS FILE EXISTS AT ALL. `skills/scrolly/scripts/bake-plate.mjs` is the shape this is copied
// from, and it cannot be used directly: its camera centre comes from `readStation`, which parses a
// USGS site file and REQUIRES `site_no`, `station_nm`, `dec_lat_va`, `dec_long_va` and
// `drain_area_va`. A lime-kiln site has no drainage area, and the skill's bake writes its output as
// `potomac-plate.jpg` / `potomac-plate.json` whatever `--out` it is given. So a beat whose subject
// is not a river gauge has to carry its own bake. Reported as a defect in the story's own report.
//
// Everything else — the boundary-layer hide, the world-fills-the-frame assertion, the idle/settle
// gate, the JPEG choice — is that file's, copied rather than imported, because nothing under a
// skill may be imported across a beat boundary either.
//
// Usage:
//   MAPTILER_KEY=... bun stories/stress-ac-alcanede-kilns/beats/1-one-kiln-left/bake-plate.mjs

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";
import { deriveFacts, parseRows } from "./kiln-data.ts";
import { safeBand } from "./KilnFrames.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const STORY_DIR = resolve(HERE, "../..");

const MAPLIBRE = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js";
const MAPLIBRE_CSS = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css";

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv[at + 1] : fallback;
};

const width = Number(flag("--width", "1000"));
const height = Number(flag("--height", "640"));
const outDir = flag("--out", HERE);
const settleMs = Number(flag("--settle", "15000"));

/** Zoom 9 puts roughly 200 km of the Estremadura limestone belt across the plate — Leiria, Santarem
 *  and the Atlantic coast — which is what a reader who has never heard of Alcanede needs in order
 *  to put it anywhere. The centre is READ from the frozen file, never typed here.
 *
 *  The STYLE is a flag, not a constant, and that is a deliberate departure from the skill's own
 *  bake, which hard-codes `dataviz-light`. This story's recorded ground is dark, and
 *  `verify-scrolly.mjs`'s own `plateFollowsGround` refuses a plate on the opposite side of the
 *  declared ground — so a dark-ground newsroom cannot use the shipped bake at all. */
const CAMERA = { zoom: 9, style: flag("--style", "dataviz-dark") };

/** WHERE THE MARKER SITS IN THE PLATE, and why it is NOT the plate's own centre.
 *
 *  `skills/scrolly/scripts/bake-plate.mjs` centres its camera on the subject "so the station lands
 *  on the plate's own centre by construction". On this vehicle that is the one place the marker
 *  cannot be: the prose card is centred over the graphic and, at `data-progress = i` — the position
 *  this step's own sentence is read at — it is dead centre by the definition of that signal. Driven,
 *  the seed's own recipe put "Alcanede" and its dot under the card on 52 of 240 animation frames at
 *  1600x900, including every frame at the step's own centre: a locator whose only two marks are
 *  invisible exactly when its sentence is being read.
 *
 *  Horizontally there is no escape — `safeBand`'s guaranteed-visible width for a 1000x640 plate is
 *  268 of 1000 px, x in [378, 622], which is all but exactly the card's own stripe at 1600px. So the
 *  camera is offset VERTICALLY instead: the site is panned to `--marker-y` of the plate's height,
 *  which is inside the safe band and above the card's own box at both desktop widths. */
const markerY = Number(flag("--marker-y", "170"));

const facts = deriveFacts(parseRows(await readFile(join(STORY_DIR, "source", "data.csv"), "utf8")));

/** A DUPLICATE of the resolver every capture script in this tree carries, not an import. */
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

// The alias list the sibling bakes carry, copied for the same reason: a root's own `.env` records
// the key under one of several names.
const MAPTILER_KEY_ALIASES = ["MAPTILER_API_KEY", "REMOTION_MAPTILER_KEY", "VITE_MAPTILER_KEY"];

function parseEnvFile(text) {
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(\S+)\s*$/.exec(line);
    if (match) env[match[1]] = match[2];
  }
  return env;
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

/** THE WORLD MUST FILL THE FRAME'S WIDTH — under it MapLibre draws a repeat continent carrying none
 *  of this beat's marks. */
function assertWorldFillsFrame(camera, width) {
  if (camera.worldWidthPx >= width - 1) return;
  throw new Error(
    `this plate would not fill its frame: the world draws ${camera.worldWidthPx.toFixed(1)}px wide inside ` +
      `${width}px (${((camera.worldWidthPx / width) * 100).toFixed(0)}%).`,
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
if (!key) throw new Error(`no MapTiler key. Looked for ${names.join(", ")} in the environment and in ${keyPath}`);

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
  async ({ key, style, zoom, centre, settleMs, width, height, water, markerY }) => {
    const map = new maplibregl.Map({
      container: "map",
      style: `https://api.maptiler.com/maps/${style}/style.json?key=${key}`,
      interactive: false,
      attributionControl: false,
      fadeDuration: 0,
      preserveDrawingBuffer: true,
      center: centre,
      zoom,
    });
    window.__map = map;
    await new Promise((r) => map.once("style.load", r));

    // Boundary/admin lines hidden; the place labels stay — a locator's whole job is answering
    // "where is this", and the toponyms are what answer it.
    const hidden = [];
    for (const layer of map.getStyle().layers)
      if (/border|boundary|admin/i.test(layer.id)) {
        map.setLayoutProperty(layer.id, "visibility", "none");
        hidden.push(layer.id);
      }

    // geo-discipline rule 7: water reads as a blue tint, never grey.
    for (const id of ["Water", "Water shadow", "River", "River labels"])
      if (map.getLayer(id)) {
        const type = map.getLayer(id).type;
        if (type === "fill") map.setPaintProperty(id, "fill-color", water.fill);
        if (type === "line") map.setPaintProperty(id, "line-color", water.line);
      }

    // Move the SITE off the plate's centre — see `markerY`'s own note. Done before the settle so
    // the capture is of the camera the geometry file will describe.
    map.setCenter(map.unproject([width / 2, height / 2 + (height / 2 - markerY)]));

    const started = Date.now();
    const how = await new Promise((resolve) => {
      let done = false;
      const finish = (h) => {
        if (!done) {
          done = true;
          resolve(h);
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
    style: CAMERA.style,
    zoom: CAMERA.zoom,
    centre: [facts.site.lon, facts.site.lat],
    settleMs,
    width,
    height,
    // geo-discipline rule 7: water reads as a blue tint, never grey — and the tint has to be
    // on the same side as the basemap it sits in, or the rule buys a stripe nobody can see.
    water: /dark/.test(CAMERA.style) ? { fill: "#22394d", line: "#3a6b8f" } : { fill: "#aac9e0", line: "#7fa9c9" },
    markerY,
  },
);

const frameCorners = {
  west: gate.topLeft.lng,
  north: gate.topLeft.lat,
  east: gate.bottomRight.lng,
  south: gate.bottomRight.lat,
};
const camera = cameraFacts(gate.zoom, frameCorners);
assertWorldFillsFrame(camera, width);

await mkdir(outDir, { recursive: true });
const platePath = join(outDir, "site-plate.jpg");
await page.screenshot({ path: platePath, type: "jpeg", quality: 88, clip: { x: 0, y: 0, width, height } });

const projected = await page.evaluate(
  ({ lon, lat }) => {
    const p = window.__map.project([lon, lat]);
    return [Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10];
  },
  { lon: facts.site.lon, lat: facts.site.lat },
);

await browser.close();

// The marker must land inside the band a COVER-cropped frame guarantees is on screen at every
// aspect this graphic meets — asserted here, at the bake, rather than clamped silently at the draw.
const safe = safeBand({ width, height });
if (projected[0] < safe.x[0] || projected[0] > safe.x[1] || projected[1] < safe.y[0] || projected[1] > safe.y[1])
  throw new Error(
    `the site projects to ${projected[0]},${projected[1]} — outside the safe band ` +
      `x [${safe.x[0].toFixed(0)}, ${safe.x[1].toFixed(0)}], y [${safe.y[0].toFixed(0)}, ${safe.y[1].toFixed(0)}] ` +
      `of a ${width}x${height} plate, so a cover-crop can take it off screen. Move --marker-y.`,
  );

const geometry = {
  frame: { width, height },
  style: CAMERA.style,
  zoom: Math.round(gate.zoom * 1000) / 1000,
  frameCorners,
  worldWidthPx: camera.worldWidthPx,
  degreesPerPixel: camera.degreesPerPixel,
  metresPerPixel: camera.metresPerPixel,
  gatedBy: gate.how,
  site: { lat: facts.site.lat, lon: facts.site.lon, px: projected[0], py: projected[1] },
};
const geometryPath = join(outDir, "site-plate.json");
await writeFile(geometryPath, JSON.stringify(geometry, null, 2) + "\n");

console.log(
  `gated by ${gate.how} in ${gate.ms}ms · hid ${gate.hidden} boundary layers · zoom ${geometry.zoom}\n` +
    `plate    → ${platePath}\n` +
    `geometry → ${geometryPath}  site at ${projected[0]},${projected[1]} of ${width}x${height}`,
);
