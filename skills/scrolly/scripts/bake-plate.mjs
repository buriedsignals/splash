// twin/skills/scrolly/scripts/bake-plate.mjs
//
// The bake behind this seed's MAP track. One camera, one basemap capture, one projected pixel for
// the gauge station — after this runs there is no map anywhere in this skill: the scrolly's map
// frame draws a baked `<image>` and one marker, so the delivered HTML carries no MapTiler key and
// makes no network request (`references/scrolly-discipline.md`, "A map track without a live map").
//
// A skill directory has to build after being copied into a journalist's root, so nothing under a
// skill may import out of it. This is this skill's OWN copy of a bake — deliberately duplicated
// from the shape `map-web/scripts/bake-plate.mjs` ships, never an import of it.
//
// Two deliberate departures from the sibling map format's own bake, both because this is a LOCATOR
// plate rather than a data surface:
//   - the basemap's own place labels are KEPT. `geo-discipline.md` rule 9 ("quiet the plate") exists
//     because a layer doing none of the beat's five jobs is noise; here the beat's whole job is
//     "where is this gauge", and the toponyms are what answer it. Boundary lines are still hidden.
//   - the camera is a CENTRE + ZOOM, not a bounds box, so the station lands on the plate's own
//     centre by construction — which is what keeps the marker inside the safe band at every aspect
//     ratio the full-bleed graphic is COVER-cropped to (`ScrollySeed.tsx`, `safeBand`).
// Rule 7 still applies and is applied: water reads as a blue tint, never grey.
//
// Usage:
//   bun skills/scrolly/scripts/bake-plate.mjs
//   bun skills/scrolly/scripts/bake-plate.mjs --out /tmp/plate --width 1000 --height 640

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";
import { readStation } from "../assets/gauge-data.ts";

const HERE = dirname(fileURLToPath(import.meta.url));

/** The camera's own centre is READ from the frozen USGS site file, never typed here — the same
 *  rule the beat's prose keeps. A coordinate re-typed into a bake script is a coordinate that can
 *  drift from the one the beat credits, and nothing would notice. */
/** Zoom 9 puts roughly 200 km of the Potomac valley across the plate — enough that a reader who
 *  has never heard of Point of Rocks can place it against Frederick, Leesburg and the river's own
 *  bends, which is the only job this frame has. */
const CAMERA = { zoom: 9, style: "dataviz-light" };

const MAPLIBRE = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js";
const MAPLIBRE_CSS = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css";

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv[at + 1] : fallback;
};

const width = Number(flag("--width", "1000"));
const height = Number(flag("--height", "640"));
const outDir = flag("--out", join(HERE, "../assets/sample-data"));
const settleMs = Number(flag("--settle", "15000"));
const sealedBrowserPath = flag("--browser", null);
const sealedMaplibreJsPath = flag("--maplibre-js", null);
const sealedMaplibreCssPath = flag("--maplibre-css", null);
const sealedStylePath = flag("--style-json", null);
const sealedMapTilerEnv = argv.includes("--maptiler-env");
const stationPath = flag("--station", join(HERE, "../assets/sample-data/potomac-station.rdb"));
const sealedRuntimeValues = [sealedBrowserPath, sealedMaplibreJsPath, sealedMaplibreCssPath];
const sealed = sealedRuntimeValues.some(Boolean) || Boolean(sealedStylePath) || sealedMapTilerEnv;
if (sealed && (!sealedRuntimeValues.every(Boolean) || Boolean(sealedStylePath) === sealedMapTilerEnv)) {
  throw new Error("sealed scrolly map bake requires --browser, --maplibre-js, --maplibre-css, and exactly one of --style-json or --maptiler-env");
}
if (sealedBrowserPath && (!isAbsolute(sealedBrowserPath) || !existsSync(sealedBrowserPath))) {
  throw new Error(`sealed Chrome is not an existing absolute path: ${sealedBrowserPath}`);
}
if (!isAbsolute(stationPath) || !existsSync(stationPath)) {
  throw new Error(`station data is not an existing absolute path: ${stationPath}`);
}
const STATION = readStation(await readFile(stationPath, "utf8"));
// Resolved from the WORKING DIRECTORY, never by walking up out of this skill's own directory — a
// skill copied into a journalist's root sits at a different depth, and this skill's own canon test
// fails any specifier that leaves its directory. The environment wins over the file when both
// carry a key.
const keyPath = sealed ? null : flag("--env", join(process.cwd(), ".env"));

/** Headless Chrome has to be FOUND before it can be gated. Resolve the candidates in order and
 *  fail naming every path looked in — a duplicate of the sibling formats' own resolver. */
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

// A DUPLICATE of the key-alias resolution the sibling map formats carry, not an import.
const MAPTILER_KEY_ALIASES = ["MAPTILER_API_KEY", "REMOTION_MAPTILER_KEY", "VITE_MAPTILER_KEY"];

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

/** A longitude into this camera's own frame, `[west, west + 360)`. `map.project` does NOT wrap to
 * the camera, so a Pacific-centred beat must normalise every longitude before projecting it or every
 * western-Pacific point projects to a negative x and is culled. Two of nineteen bakes carried this
 * as a closure over `BEAT`, which is why seventeen could not have it. @parity */
function normaliseLon(lon, west) {
  return west + ((((lon - west) % 360) + 360) % 360);
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

const names = ["MAPTILER_KEY", ...MAPTILER_KEY_ALIASES];
const sealedStyle = sealedStylePath ? JSON.parse(await readFile(sealedStylePath, "utf8")) : null;
const fromProcess = sealedStyle ? undefined : names.map((name) => process.env[name]).find(Boolean);
const fromFile = !sealed && existsSync(keyPath)
  ? (() => {
      const env = parseEnvFile(readFileSync(keyPath, "utf8"));
      return names.map((name) => env[name]).find(Boolean);
    })()
  : undefined;
const key = fromProcess ?? fromFile;
if (!key && !sealedStyle && sealed) throw new Error("sealed scrolly map bake did not receive MAPTILER_KEY from Engine");
if (!key && !sealedStyle)
  throw new Error(
    `no MapTiler key. Looked for ${names.join(", ")} in the environment and in ${keyPath}`,
  );

const browser = await puppeteer.launch({
  headless: true,
  executablePath: sealedBrowserPath ?? resolveChrome(),
  args: [
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--no-sandbox",
    "--hide-scrollbars",
  ],
});
const page = await browser.newPage();
await page.setViewport({ width, height, deviceScaleFactor: 2 });
if (sealed) {
  await page.setContent(
    `<!doctype html><html><head>
<style>html,body{margin:0;padding:0}#map{width:${width}px;height:${height}px}</style>
</head><body><div id="map"></div></body></html>`,
    { waitUntil: "load" },
  );
  await page.addStyleTag({ path: sealedMaplibreCssPath });
  await page.addScriptTag({ path: sealedMaplibreJsPath });
} else {
  await page.setContent(
    `<!doctype html><html><head>
<link href="${MAPLIBRE_CSS}" rel="stylesheet"/>
<script src="${MAPLIBRE}"></script>
<style>html,body{margin:0;padding:0}#map{width:${width}px;height:${height}px}</style>
</head><body><div id="map"></div></body></html>`,
    { waitUntil: "load" },
  );
}
await page.waitForFunction("window.maplibregl !== undefined", { timeout: 60000 });

const gate = await page.evaluate(
  async ({ key, style, styleDefinition, zoom, centre, settleMs, width, height }) => {
    const map = new maplibregl.Map({
      container: "map",
      style: styleDefinition ?? `https://api.maptiler.com/maps/${style}/style.json?key=${key}`,
      interactive: false,
      attributionControl: false,
      fadeDuration: 0,
      // Without this the WebGL canvas is empty by the time a screenshot reads it.
      preserveDrawingBuffer: true,
      center: centre,
      zoom,
    });
    window.__map = map;
    await new Promise((resolve) => map.once("style.load", resolve));

    // Boundary/admin lines only — the place labels stay (see this file's own header note).
    const hidden = [];
    for (const layer of map.getStyle().layers)
      if (/border|boundary|admin/i.test(layer.id)) {
        map.setLayoutProperty(layer.id, "visibility", "none");
        hidden.push(layer.id);
      }

    // Rule 7: water reads as a blue tint, never grey — `dataviz-light` paints it near-grey, which
    // on a river beat would read as no-data exactly where the subject is.
    for (const id of ["Water", "Water shadow", "River", "River labels"])
      if (map.getLayer(id)) {
        const type = map.getLayer(id).type;
        if (type === "fill") map.setPaintProperty(id, "fill-color", "#aac9e0");
        if (type === "line") map.setPaintProperty(id, "line-color", "#7fa9c9");
      }

    // Gate on idle OR a bounded settle, and record which one fired: `idle` alone never fires when
    // one tile never resolves, and the capture then hangs forever rather than slowly.
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
  { key, style: CAMERA.style, styleDefinition: sealedStyle, zoom: CAMERA.zoom, centre: [STATION.lon, STATION.lat], settleMs, width, height },
);

const frameCorners = frameCornersOf(gate.topLeft, gate.bottomRight);
const camera = cameraFacts(gate.zoom, frameCorners);
// @parity-exempt assertCameraReachesBounds: this bake fixes its camera by centre and zoom, not
// by bounds, so there is no asked-for extent for the frame to fall short of. The world-fill
// invariant still applies and is asserted.
assertWorldFillsFrame(camera, width);

await mkdir(outDir, { recursive: true });
const platePath = join(outDir, "potomac-plate.jpg");
// JPEG, not PNG, and this is a size decision made with a number rather than a preference: the plate
// is embedded as a data URI in a self-contained HTML file, and a 2000x1280 PNG of a basemap costs
// several megabytes where a quality-88 JPEG of the same capture costs a few hundred kilobytes. A
// basemap is continuous-tone imagery — the one medium JPEG is built for. The seed's own drawn and
// chart frames stay vector, where the same trade would be a real loss.
await page.screenshot({
  path: platePath,
  type: "jpeg",
  quality: 88,
  clip: { x: 0, y: 0, width, height },
});

const projected = await page.evaluate(
  ({ lon, lat }) => {
    const p = window.__map.project([lon, lat]);
    return [Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10];
  },
  { lon: STATION.lon, lat: STATION.lat },
);

await browser.close();

const geometry = {
  frame: { width, height },
  style: CAMERA.style,
  zoom: Math.round(gate.zoom * 1000) / 1000,
  frameCorners,
  worldWidthPx: camera.worldWidthPx,
  degreesPerPixel: camera.degreesPerPixel,
  metresPerPixel: camera.metresPerPixel,
  gatedBy: gate.how,
  station: { ...STATION, px: projected[0], py: projected[1] },
};
const geometryPath = join(outDir, "potomac-plate.json");
await writeFile(geometryPath, JSON.stringify(geometry, null, 2) + "\n");

console.log(
  `gated by ${gate.how} in ${gate.ms}ms · hid ${gate.hidden} boundary layers · zoom ${geometry.zoom}\n` +
    `plate    → ${platePath}\n` +
    `geometry → ${geometryPath}  station at ${projected[0]},${projected[1]} of ${width}x${height}`,
);
