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
// Two rules from `doctrine/references/geo-discipline.md` that this bake, not the render, is
// responsible for:
//   rule 1 — the frame gate is `idle` OR a bounded settle, and the geometry records which fired;
//   rule 7 — water reads as a blue tint, never grey. `dataviz-light` paints water `hsl(240, 2%, 88%)`,
//     a near-grey. Under a choropleth that is invisible; on a POINT beat almost the whole plate is
//     exposed basemap, so uncorrected the ocean reads as no-data across the entire frame. This is a
//     Pacific-rim map: it is nearly all water.
// Rule 12 — the camera is chosen from the geography, not from a default: the study set's own extent
// is longitude 97.05 → 166.38, latitude -12.52 → 46.59, and the box below pads that on every side so
// no circle sits on the frame edge. It is the same box `proof/map-quake-symbol` bakes for its still
// and its video, so the three formats of this story share one camera.
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
import { coversTo, deliveryFrame, frameCoversTheBoxRange, labelSafeFrame } from "./delivery-frame.mjs";

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
// THE FRAME IS THE SHAPE OF THE BOX, NOT OF THE CAMERA (2026-08-23). The delivered page now takes
// the whole container on both axes and fills it by COVER, so the plate has to carry enough real
// basemap around the study set that every crop the layout can ask for lands on ocean. See
// `delivery-frame.mjs` for the derivation, the argument it overrules, and the one camera it cannot
// be solved for. `--box-aspects` is measured off the rendered page with `verify-fills-the-box.mjs`;
// `--clearance` is the room this beat's own labels need, measured the same way.
const BOX_ASPECTS =
  flag("--box-aspects", null) ??
  (() => {
    throw new Error(
      "--box-aspects <narrowest>,<widest> is required: it is the range of shapes this beat's own " +
        ".mw-stage takes on the rendered page, measured with verify-fills-the-box.mjs. A plate " +
        "baked without it is a plate baked for a box nobody looked at.",
    );
  })();
const [clearanceX = 0, clearanceY = 0] = String(flag("--clearance", "0,0")).split(",").map(Number);
const DELIVERY = deliveryFrame(BEAT.bounds, size, BOX_ASPECTS, { x: clearanceX, y: clearanceY });
const frameHeight = DELIVERY.frame.height;
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

const rows = quakesFromCsv(await readFile(dataPath, "utf8"));

const browser = await puppeteer.launch({
  headless: true,
  executablePath: resolveChrome(),
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox", "--hide-scrollbars"],
});
const page = await browser.newPage();
await page.setViewport({ width: size, height: frameHeight, deviceScaleFactor: 2 });
await page.setContent(
  `<!doctype html><html><head>
<link href="${MAPLIBRE_CSS}" rel="stylesheet"/>
<script src="${MAPLIBRE}"></script>
<style>html,body{margin:0;padding:0}#map{width:${size}px;height:${frameHeight}px}</style>
</head><body><div id="map"></div></body></html>`,
  { waitUntil: "load" },
);
await page.waitForFunction("window.maplibregl !== undefined", { timeout: 60000 });

const gate = await page.evaluate(
  async ({ key, style, padding, bounds, settleMs, width, height }) => {
    const map = new maplibregl.Map({
      container: "map",
      style: `https://api.maptiler.com/maps/${style}/style.json?key=${key}`,
      interactive: false,
      attributionControl: false,
      fadeDuration: 0,
      preserveDrawingBuffer: true,
      bounds,
      fitBoundsOptions: { padding, animate: false },
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
  { key, style: BEAT.style, padding: DELIVERY.padding, bounds: BEAT.bounds, settleMs, width: size, height: frameHeight },
);

const frameCorners = frameCornersOf(gate.topLeft, gate.bottomRight);
const camera = cameraFacts(gate.zoom, frameCorners);
assertWorldFillsFrame(camera, size);
assertCameraReachesBounds(frameCorners, BEAT.bounds, size);
frameCoversTheBoxRange({ width: size, height: frameHeight }, DELIVERY.studySet, DELIVERY.boxAspects, DELIVERY.cannotCover);

await mkdir(outDir, { recursive: true });
const platePath = join(outDir, "plate.png");
await page.screenshot({ path: platePath, clip: { x: 0, y: 0, width: size, height: frameHeight } });

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

const frame = { width: size, height: frameHeight };
const offFrame = points.filter((p) => !keepPoint(p, frame)).map((p) => p.place);

const geometry = {
  // What this plate was baked for, so the delivered page can be checked against it rather than
  // trusted: where the camera's bounds landed inside the frame, the box range asked for, the
  // range the frame actually reaches, and the named impossibility when there is one.
  studySet: DELIVERY.studySet,
  boxAspects: DELIVERY.boxAspects,
  clearance: DELIVERY.clearance,
  cannotCover: DELIVERY.cannotCover,
  coversTo: coversTo({ width: size, height: frameHeight }, DELIVERY.studySet),
  // The box a LABEL has to stay inside — the intersection of every band the delivery can show,
  // never the plate. A plate the cover crops is a plate whose own edge is not the picture's edge.
  // A `cannotCover` plate is contained rather than cropped, so its label box IS its frame.
  labelFrame: DELIVERY.cannotCover
    ? { width: size, height: frameHeight, left: 0, top: 0, safeWidth: size, safeHeight: frameHeight }
    : labelSafeFrame({ width: size, height: frameHeight }, DELIVERY.boxAspects),
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
