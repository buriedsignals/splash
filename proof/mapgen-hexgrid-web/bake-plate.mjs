// twin/proof/mapgen-hexgrid-web/bake-plate.mjs
//
// This beat's own bake: one world camera, one basemap capture, every quake epicentre projected to
// pixel space. Binning happens afterwards, in node, on the projected points (`geo-hex.ts`) —
// `render-web.mjs` bakes first, bins second, the same order `proof/map-quake-density/render.mjs`
// follows for its own static format. Adapted from that beat's own `bake.mjs` (a point bake has no
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
const height = Number(flag("--height", "0")) || frameHeightFor(BEAT.bounds, width);
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

/** THE FRAME THE CAMERA ITSELF ASKS FOR: the height that gives a `width`-px frame the same aspect
 * the beat's own bounds have in Web Mercator.
 *
 * THE DEFECT THIS CLOSES, reported by the owner looking at a rendered world map: the bake took ONE
 * `--size` and applied it to both axes (`width: size, height: size`, in five places). A world camera
 * is close to 2:1 in Web Mercator, so a square frame spends half its pixels on empty ocean above and
 * below the world AND halves every country — and because the delivered page sizes its map box from
 * the plate's own aspect, a square plate then sits as a square in the middle of a 1600px page with a
 * gutter either side. The map did not take the width it was given, which is the visible half of the
 * same defect.
 *
 * `minFrameHeightPx` above is this same derivation for the one camera that spans a full turn of
 * longitude — where the frame width IS the world width — and it was in this file the whole time,
 * used only to build an error message. This is it for every other camera: divide by the longitude
 * span the beat actually asked for rather than by 2π. `one-world-is-painted.test.ts` pins the two
 * against each other at planet extent and measures this one at more than one camera. */
function frameHeightFor(bounds, width) {
  const [[west, south], [east, north]] = bounds;
  const lonSpan = ((east - west) * Math.PI) / 180;
  const latSpan = mercY(north) - mercY(south);
  if (!(lonSpan > 0) || !(latSpan > 0))
    throw new Error(`a camera with no area has no frame: bounds ${JSON.stringify(bounds)}`);
  return Math.max(1, Math.ceil((width * latSpan) / lonSpan));
}

/** How much of a frame may be margin the camera never asked for. 5%: on a 1000px frame that is 50px
 * of empty ocean, which is visible; under it, the difference is the fit landing on an integer frame.
 * Measured across this format's own beats — a re-baked European choropleth wastes 0.2%, a world
 * choropleth 0.0%, and the two still on a square frame waste 8.6% and 46.2%. */
const FRAME_MARGIN_TOLERANCE = 0.05;

/** THE FRAME IS THE CAMERA'S OWN SHAPE, NOT A SQUARE. The owner's report, on a rendered map: *the
 * map does not take the full available width.*
 *
 * `assertCameraReachesBounds` above already refuses a frame that CROPS the study area. This is its
 * other half, and it was missing: a frame that is too generous on one axis does not crop anything —
 * it pads. `fitBounds` fits the bounds on whichever axis binds first, so every pixel of the other
 * axis past the camera's own aspect is empty ground, the marks are drawn that much smaller, and the
 * delivered page — which sizes its map box from the plate's own aspect — then hands the reader a
 * square in the middle of a wide window with a gutter either side. Measured on
 * `stress-f-housing-pressure`: a camera asking for 0.538 baked into a 1.000 frame, 46.2% margin.
 *
 * The number in the message is `frameHeightFor`'s, so the fix is the value the fix is computed
 * with. @parity-exempt: this format's own addition; the canonical bake has no equivalent yet. */
function frameMatchesItsCamera(bounds, frame) {
  const asked = ((bounds[1][0] - bounds[0][0]) * Math.PI) / 180 / (mercY(bounds[1][1]) - mercY(bounds[0][1]));
  const drawn = frame.width / frame.height;
  const margin = 1 - Math.min(asked, drawn) / Math.max(asked, drawn);
  if (margin <= FRAME_MARGIN_TOLERANCE) return;
  throw new Error(
    `this frame is not the shape its camera asked for: ${frame.width}x${frame.height} is ` +
      `${drawn.toFixed(3)}:1 where the bounds ask for ${asked.toFixed(3)}:1, so ` +
      `${(margin * 100).toFixed(1)}% of the plate is margin no reader can read anything off — and a ` +
      `page that sizes its map box from this plate cannot fill the width it is given. At ` +
      `${frame.width}px wide this camera wants a ${frameHeightFor(bounds, frame.width)}px height.`,
  );
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

// The frame's own TRUE corners, in lon/lat — not the nominal `BEAT.bounds` passed to `fitBounds`.
// A render audit found the two differ: `fitBounds` preserves this frame's own aspect ratio, so it
// zooms OUT until the requested bounds fit, which widens the visible lat range beyond what was
// asked for (measured here: -64.48..79.85, not the requested -60..78). A caller that later wants
// to name which real place a pixel/hex-cell sits over (`geo-hex.ts`'s `pixelToLonLat`) needs these
// true corners, or it silently mislabels the cell by several degrees of latitude — the bug this
// capture exists to prevent.
const frameCorners = frameCornersOf(gate.topLeft, gate.bottomRight);
const camera = cameraFacts(gate.zoom, frameCorners);
assertWorldFillsFrame(camera, width);
assertCameraReachesBounds(frameCorners, BEAT.bounds, width);
frameMatchesItsCamera(BEAT.bounds, { width, height });

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
    `plate    → ${platePath}\n` +
    `geometry → ${geometryPath}  ${projectedPoints.length}/${points.length} points on-frame (${offFrame} off)`,
);
