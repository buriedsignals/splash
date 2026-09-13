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
//
// BOTH OF THOSE ARE NOW THE TRUNK'S, and this file stopped carrying its own answer to either. It
// used to sweep symbol/boundary layers in one hand-written loop and then paint `["Water", "Water
// shadow"]` a hard-coded `#aac9e0` in a second — the same two loops `live-map.mjs` carried on the
// other side of the swap, agreeing only as long as MapTiler kept those ids and nobody edited one.
// `shared/map-beat/style.mjs` states the rule once and `applyLiveStyle` is the one call; the live
// page runs the same file. And `#aac9e0` was never measured: it sits at 1.730:1 against this beat's
// white page, over the trunk's `BASEMAP_MAX` of 1.6:1 — a basemap carrying more weight against the
// page than the circles drawn on it, which is what `the-basemap-gives-up-its-contrast` forbids.
// `plateTints` searches for the smallest dose of the filed water hue that still separates sea from
// land by `SEA_LAND_MIN`, and the answer is recorded in `geometry.json` so the live layer paints
// what the plate was painted with rather than deriving it a second time.
//
// Rule 12 — the camera is chosen from the geography, not from a default: the study set's own extent
// is longitude 97.05 → 166.38, latitude -12.52 → 46.59, and the box below pads that on every side so
// no circle sits on the frame edge. It is the same box `proof/map-quake-symbol` bakes for its still
// and its video, so the three formats of this story share one camera.
//
// THE BOX STAYS TYPED HERE, AND THAT IS THIS TYPE'S OWN ANSWER rather than an omission. The locator
// and the choropleth on this branch both replaced a typed box with their study set's own extent,
// and neither rule transfers: a PROPORTIONAL SYMBOL's marks have EXTENT. Fitting the seventeen
// epicentres — points — puts the outermost centres on the frame edge and cuts every disc drawn
// around them in half; the largest is 45 frame units of radius, 4.5% of the plate on each side.
// So the box is the shared camera, and what this file adds is the MEASUREMENT that says it frames
// its subject: `assertFrameHoldsEverySymbol` below asks both halves of the question a point-cloud
// fit cannot — no disc is cut, and the discs fill enough of the frame to be its subject. Measured on
// the box below: the discs span 92% of the width and 87% of the height and nothing is clipped.
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
import { quakesFromCsv, arcOf, keepPoint, radiusScale, MARK_MAX_RADIUS_FRACTION } from "./geo-symbol.ts";
// THE TRUNK. A bake does not get to have its own opinion about what a basemap looks like — that is
// what `references/map-plan.md` exists to stop it re-deriving. `plateTints` is guard 7 and
// `applyLiveStyle` is the sweep both this bake and the live page now run.
import { plateTints } from "#shared/map-beat/tints.mjs";
import { readPalette } from "#shared/chart-beat/render-still.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const TRUNK_STYLE = fileURLToPath(import.meta.resolve("#shared/map-beat/style.mjs"));

/** The ground this beat is drawn on, read from its own recorded answer — the tints are measured
 *  AGAINST it, so taking it from anywhere else would measure against a page nobody renders. */
const PALETTE = readPalette(HERE, { stopAt: join(HERE, "..") });
/** The basemap's two colours, SEARCHED rather than typed: the smallest dose of the filed water hue
 *  that still separates sea from land by `SEA_LAND_MIN`, with both ends under `BASEMAP_MAX` against
 *  the page. Recorded in `geometry.json`, carried in the live plan, painted once by the trunk. */
const TINTS = plateTints({ ground: PALETTE.ground });

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

/**
 * A PROPORTIONAL SYMBOL'S SUBJECT IS ITS DISCS, NOT ITS EPICENTRES — and no existing invariant asks
 * about either.
 *
 * `assertCameraReachesBounds` above only asks whether the frame REACHES the box it was handed, so a
 * box two zoom levels too wide is green (that is what the locator's pass measured at 51% and 44%
 * fill), and a box that cuts a mark in half is green too, because `keepPoint`'s off-frame census
 * tests the CENTRE. On this beat both holes are live at once: the outermost events sit 42 and 38
 * frame units from the frame edge under discs of 42 and 45 units of radius, so the census says
 * "off-frame: none" for a picture whose two Sumatran marks would be sliced by a box 4% tighter.
 *
 * So this asks the two questions the type actually has, on the DRAWN MARK:
 *
 *   1. NO DISC IS CUT. A circle clipped by the frame is a magnitude the reader cannot compare,
 *      and on a beat whose whole claim is a comparison of areas that is the claim itself going
 *      missing. The SVG clips to the frame (`#plate-clip`) and the live canvas clips to the
 *      container, so a cut mark is cut in both halves and neither reports it.
 *   2. THE DISCS ARE THE PICTURE'S SUBJECT. The locator's `assertFrameHoldsItsSubject` measures the
 *      span of the point cloud; this measures the span of the MARKS, which is the thing a reader
 *      sees. Measured on this beat's own camera: 92% of the width, 87% of the height. The floor is
 *      the locator's own 60%, transported rather than re-picked — it is the point where a subject
 *      stops reading as the picture's subject and starts reading as something dropped into a map of
 *      somewhere else, and that judgement is about pictures, not about this beat.
 */
const SUBJECT_FILLS_AT_LEAST = 0.6;
function assertFrameHoldsEverySymbol(points, frame, radiusOf) {
  const cut = [];
  let west = Infinity;
  let east = -Infinity;
  let north = Infinity;
  let south = -Infinity;
  for (const point of points) {
    const r = radiusOf(point.mag);
    west = Math.min(west, point.px - r);
    east = Math.max(east, point.px + r);
    north = Math.min(north, point.py - r);
    south = Math.max(south, point.py + r);
    const over = [];
    if (point.px - r < 0) over.push(`${(r - point.px).toFixed(1)}px past the left edge`);
    if (point.px + r > frame.width) over.push(`${(point.px + r - frame.width).toFixed(1)}px past the right edge`);
    if (point.py - r < 0) over.push(`${(r - point.py).toFixed(1)}px past the top edge`);
    if (point.py + r > frame.height) over.push(`${(point.py + r - frame.height).toFixed(1)}px past the bottom edge`);
    if (over.length > 0) cut.push(`${point.place} (M${point.mag}, r ${r.toFixed(1)}px) ${over.join(" and ")}`);
  }
  if (cut.length > 0)
    throw new Error(
      `this frame cuts ${cut.length} of the ${points.length} circles it draws, so the areas the beat ` +
        `asks a reader to compare are not all on the plate: ${cut.join("; ")}. A symbol map's marks ` +
        `have extent — the camera has to hold the DISCS, not the epicentres.`,
    );
  const fill = Math.max((east - west) / frame.width, (south - north) / frame.height);
  if (fill >= SUBJECT_FILLS_AT_LEAST) return { fill, west, east, north, south };
  throw new Error(
    `this frame does not hold its subject: the circles span ${(east - west).toFixed(0)}x` +
      `${(south - north).toFixed(0)}px inside a ${frame.width}x${frame.height}px plate, so they fill ` +
      `${(fill * 100).toFixed(0)}% of the binding axis against a floor of ${SUBJECT_FILLS_AT_LEAST * 100}%. ` +
      `The camera is framed on something other than what the beat is about.`,
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

// THE PAGE RUNS THE TRUNK'S OWN SOURCE, not a paraphrase of it. `page.evaluate` ships a function
// body across the process boundary with no closure, so a module this file imports is not reachable
// from inside the browser — which is exactly how the sweep came to be written twice, once here and
// once in `live-map.mjs`. The file is read, its `export` keywords stripped (the page takes a classic
// script, the same treatment `render-web.mjs` gives it), and its two entry points hung off `window`.
await page.addScriptTag({
  content:
    (await readFile(TRUNK_STYLE, "utf8")).replace(/^export /gm, "") +
    "\nwindow.__applyLiveStyle = applyLiveStyle;\nwindow.__assertLiveStyleAnswered = assertLiveStyleAnswered;\n",
});

const gate = await page.evaluate(
  async ({ key, style, bounds, settleMs, tints, width, height }) => {
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

    // Rules 7 and 9 in ONE CALL, and it is the trunk's — `shared/map-beat/style.mjs`, injected into
    // this page above. Quiet the plate (every place label, road label and boundary line the provider
    // ships is a layer doing none of this beat's jobs) and paint the water and the land the beat
    // measured. On this beat rule 7 decides the whole picture: the frame is mostly ocean.
    //
    // `assertLiveStyleAnswered` is the refusal that could not exist while this was two hand-written
    // loops: a sweep that re-tinted NOTHING is what a renamed provider layer looks like, and it
    // leaves the plate in MapTiler's own near-grey water with nothing red anywhere.
    const swept = window.__assertLiveStyleAnswered(window.__applyLiveStyle(map, { tints }), style);

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
      hidden: swept.hidden,
      tinted: swept.tinted,
      zoom: map.getZoom(),
      topLeft: map.unproject([0, 0]),
      bottomRight: map.unproject([width, height]),
    };
  },
  { key, style: BEAT.style, bounds: BEAT.bounds, settleMs, tints: TINTS, width: size, height: size },
);

const frameCorners = frameCornersOf(gate.topLeft, gate.bottomRight);
const camera = cameraFacts(gate.zoom, frameCorners);
assertWorldFillsFrame(camera, size);
assertCameraReachesBounds(frameCorners, BEAT.bounds, size);

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
// The mark sizes the FRAME is judged against, from the one scale every renderer draws from — the
// component's SVG, the live plan's `r`, and this. `MARK_MAX_RADIUS_FRACTION` lives in `geo-symbol.ts`
// for exactly this reason: a bake that re-typed 0.045 would be measuring a picture nobody draws.
const maxMag = Math.max(...points.map((p) => p.mag));
const subject = assertFrameHoldsEverySymbol(
  points,
  frame,
  radiusScale(maxMag, frame.width * MARK_MAX_RADIUS_FRACTION),
);

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
  // WHAT THE PLATE WAS ACTUALLY PAINTED IN, so the live layer paints the same cartography rather
  // than deriving it a second time from a constant that has drifted.
  tints: TINTS,
  points,
};
const geometryPath = join(outDir, "geometry.json");
await writeFile(geometryPath, JSON.stringify(geometry));

console.log(
  `gated by ${gate.how} in ${gate.ms}ms · hid ${gate.hidden} and re-tinted ${gate.tinted} basemap ` +
    `layers · zoom ${geometry.zoom}\n` +
    `tints    → water ${TINTS.water}, land ${TINTS.land}, sea/land ${TINTS.seaLandContrast.toFixed(3)}:1 (measured)\n` +
    `plate    → ${platePath}\n` +
    `geometry → ${geometryPath}  ${points.length} points\n` +
    `off-frame: ${offFrame.length ? offFrame.join(", ") : "none"} · ` +
    `circles fill ${(subject.fill * 100).toFixed(0)}% of the binding axis, none cut`,
);
