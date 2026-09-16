// twin/proof/mapgen-choropleth-web/bake-plate.mjs
//
// The bake for THIS beat's choropleth: one camera, one basemap capture, one file of pixel-space
// polygon rings for the 41 declared countries. After this runs, `ChoroplethWeb.tsx` draws an
// `<image>` and some `<path>`s — never a live map.
//
// This is `geo-discipline.md` rules 1, 2, 3, 4, 6, 7, 9, 11 and 12 in one script, the same list
// `map-beat/scripts/bake-plate.mjs` states for its own build:
//   1. the frame gate is `idle` OR a bounded settle, and it records which one fired;
//   2. the plate is fixed, so the web format never re-renders tiles per interaction and shimmers;
//   3. the shapes are baked to ordered pixel rings HERE — a provider basemap serves administrative
//      boundary LINES, never polygons, so a choropleth's shapes can never come from the tiles;
//   4. the subject/comparison label anchors are projected here too, by `map.project()`;
//   6. capture plumbing: `preserveDrawingBuffer`, `--use-gl=angle`, a Chrome resolved and named if
//      missing;
//   7. `dataviz-light` paints water GREY — overridden to a genuine blue (`#aac9e0`, from
//      `geo-choropleth.ts`'s own `WATER_FILL`) in the `style.load` handler before capture, the exact
//      defect `mapmore-flow-danube/bake.mjs`'s own header names for the next map beat to avoid;
//   9. every symbol/boundary basemap layer is hidden before capture — the beat draws the only
//      labels;
//  11. rings are culled by their projected box and thinned to the drawing resolution, in node, after
//      capture — see `geo-choropleth.ts`'s own `keepRing` doc-comment for why flattening a
//      MultiPolygon's rings across DIFFERENT shapes (never within one shape's own parts) would be
//      the trap, and why this file's own `ringsOf` (below) does not fall into it;
//  12. the camera bounds below are the SAME box `map-beat/scripts/bake-plate.mjs` uses for the
//      near-identical European CO₂ study set (Iceland and the Faroe Islands both need the -26° west
//      edge; the box is near-square on purpose, so a landscape frame never smuggles in the
//      mid-Atlantic and a third of North Africa the way a wider one would).
//
// Baked at the EXACT pixel size `ChoroplethWeb.tsx`'s desktop layout displays it at (496), scaled
// down uniformly for the narrow layout inside the SVG (`mapSize / geometry.frame.width`, applied to
// both the plate `<image>` and every projected mark) — one plate, never baked twice, the same
// pattern `map-web/assets/MapWebSeed.tsx` already proves for the symbol-map format.
//
// Usage:
//   bun proof/mapgen-choropleth-web/bake-plate.mjs --size 496   # → proof/mapgen-choropleth-web/plate

import { existsSync, readdirSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";
import {
  CO2_2023_STUDY,
  keepRing,
  simplifyRing,
} from "./geo-choropleth.ts";
// THE TRUNK, REACHED THROUGH THE `#shared/…` SUBPATH ALIAS. A beat is a story, not a skill, so it
// may reach out where a skill may not — and what it reaches for is the wiring
// `references/map-plan.md` exists to stop it re-deriving. `plateTints` is guard 7 and
// `applyLiveStyle` is the sweep both this bake and the live page now run.
import { plateTints } from "#shared/map-beat/tints.mjs";
import { readPalette } from "#shared/chart-beat/render-still.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const TRUNK_STYLE = fileURLToPath(import.meta.resolve("#shared/map-beat/style.mjs"));

/**
 * THE TWO COLOURS OF THE BASEMAP, MEASURED RATHER THAN TYPED — guard 7 of `references/map-plan.md`.
 *
 * Rule 7 of `geo-discipline.md` used to reach this file as `geo-choropleth.ts`'s `WATER_FILL`,
 * `"#AAC9E0"` — a constant carried byte-identically by every map × web beat and by the format's own
 * seed, and never measured against anything. Measured now, on this beat's own white ground:
 * `#AAC9E0` sits at **1.730:1 against the page**, over the trunk's `BASEMAP_MAX` of 1.6:1 — a
 * basemap carrying more weight against the page than the classes drawn on it, which is what
 * `the-basemap-gives-up-its-contrast` forbids. And it answered for WATER only: the provider's own
 * land went untouched here and in the live page both, so the ONE thing a choropleth's shading is
 * read against was whatever `dataviz-light` happened to ship.
 *
 * `plateTints` searches for the SMALLEST dose of the filed water hue that still separates sea from
 * land by `SEA_LAND_MIN` (1.22:1) while staying under `BASEMAP_MAX` against the page, and answers
 * both colours together.
 *
 * It is a CALL, not a recorded answer (rule 2: what is measured stays measured). A beat on another
 * ground gets different numbers, on purpose, and a ground where no dose works at all is refused
 * here rather than shown as a flat map.
 */
const PALETTE = readPalette(HERE, { stopAt: join(HERE, "..") });
const TINTS = plateTints({ ground: PALETTE.ground });

/**
 * THE CAMERA IS READ OFF THE STUDY SET, NOT TYPED — and the derivation is the choropleth's own,
 * because the locator's is wrong here.
 *
 * This was `[[-26, 36], [33, 67]]`, a box somebody typed, carried over from
 * `map-beat/scripts/bake-plate.mjs`. Measured on the plate it produced: **five of the 41 countries
 * the title counts were cut by the frame** — Norway lost 43.5% of its drawn points, Ukraine 36.2%,
 * Finland 22.4%, Sweden 7.8%. Nothing was red and structurally could not be:
 * `assertCameraReachesBounds` below compares the measured frame against the TYPED box, so a box
 * that is too small passes by construction, exactly as a box that is too big does.
 *
 * And a naive union of the study set is worse than the typed box, which is why somebody typed one:
 * France reaches Réunion at 55.8°E and −21.4°S, the Netherlands reaches Curaçao at −68.4°W, Norway
 * reaches Svalbard at 80.5°N and Portugal the Azores at −31.3°W. A camera fitted to that draws the
 * Atlantic with Europe as a stamp in the corner.
 *
 * So the rule is **each country's own LARGEST PART**, and it is a measurement rather than a list of
 * exceptions: the part with the largest bounding box is the mainland for every country in this study
 * set, and the overseas départements, the Caribbean municipalities, Svalbard and the Azores fall out
 * without being named. The union of those 41 boxes is
 * −24.48…40.13°E, 35.82…71.09°N — Iceland west, Ukraine east, Malta south, Nordkapp north — and its
 * Mercator aspect is **1.0075**, which is why this plate is square and a landscape bake would only
 * add ocean (`map-web-discipline.md`, "Fit the window", says the same about the format's own seed).
 *
 * The room around the subject is the LIVE camera's own rule transported rather than re-derived —
 * `live-map.mjs`'s `fitPadding`: 9% of the shorter side capped at 48px, which is 45px on this
 * frame. Plate and live map fit one box by one rule.
 */
function studyBoundsOf(collection, keys) {
  const byKey = new Map();
  for (const feature of collection.features) byKey.set(feature.properties.ADM0_A3, feature);
  let west = Infinity, east = -Infinity, south = Infinity, north = -Infinity;
  for (const key of keys) {
    const feature = byKey.get(key);
    if (!feature) throw new Error(`no shape for ${key}: the camera cannot be read off a study set with a hole in it`);
    const parts =
      feature.geometry.type === "MultiPolygon" ? feature.geometry.coordinates : [feature.geometry.coordinates];
    let best = null;
    let bestArea = -Infinity;
    for (const part of parts) {
      let w = Infinity, e = -Infinity, s = Infinity, n = -Infinity;
      for (const [lon, lat] of part[0]) {
        if (lon < w) w = lon;
        if (lon > e) e = lon;
        if (lat < s) s = lat;
        if (lat > n) n = lat;
      }
      const area = (e - w) * (n - s);
      if (area > bestArea) {
        bestArea = area;
        best = [w, e, s, n];
      }
    }
    west = Math.min(west, best[0]);
    east = Math.max(east, best[1]);
    south = Math.min(south, best[2]);
    north = Math.max(north, best[3]);
  }
  return [
    [west, south],
    [east, north],
  ];
}

/** `live-map.mjs`'s own rule, transported: 9% of the shorter side, capped at the ceiling that file
 *  states. Not re-derived — a second derivation of one number is how the plate and the live camera
 *  come to frame two different Europes. */
const MAX_FIT_PADDING_PX = 48;
function fitPaddingFor(width, height) {
  return Math.min(MAX_FIT_PADDING_PX, Math.round(Math.min(width, height) * 0.09));
}

/** The beat's anchors and its basemap style. `bounds` is filled in below, from the shapes. */
const BEAT = {
  bounds: null,
  style: "dataviz-light",
  anchors: {
    // Faroe Islands (the subject) and Albania (the comparison) — where each one's own direct label
    // hangs, projected once here rather than guessed as a fixed pixel offset (rule 4).
    subject: [-6.8, 62.35],
    comparison: [20.1, 41.0],
  },
};

const MAPLIBRE = "https://unpkg.com/maplibre-gl@5.24.0/dist/maplibre-gl.js";
const MAPLIBRE_CSS = "https://unpkg.com/maplibre-gl@5.24.0/dist/maplibre-gl.css";

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv[at + 1] : fallback;
};

const size = Number(flag("--size", "496"));
const outDir = flag("--out", join(HERE, "plate"));
const shapesPath = flag("--shapes", join(HERE, "countries.geojson"));
const settleMs = Number(flag("--settle", "15000"));
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

// A duplicate of the sibling map beats' own key-alias resolution — not an import, a beat directory
// stays copy-pasteable on its own (see `geo-choropleth.ts`'s own header for the same rule stated
// there).
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
 * …AND EVERY COUNTRY THE TITLE COUNTS IS ON THE MAP. The choropleth's own version of
 * `proof/mapgen-locator-web`'s `assertFrameHoldsItsSubject`, and it asks the opposite question,
 * because a choropleth's subject is not a cloud of points that can be too small inside its frame —
 * it is a set of SHAPES that can be sliced by it.
 *
 * `assertCameraReachesBounds` above cannot see this: it compares the measured frame against the box
 * that was ASKED for, so a box too small for the study set passes by construction. Measured on the
 * plate this beat shipped before the camera was read off the shapes: **Norway 43.5% of its drawn
 * points outside the frame, Ukraine 36.2%, Finland 22.4%, Sweden 7.8%** — under a title that says
 * "the 41 countries on this map".
 *
 * It measures only the rings the frame actually DRAWS — a ring with at least one point inside it.
 * `keepRing` discards a ring entirely outside the frame, but with a 40px margin, so a part that sits
 * just beyond the edge survives the cull and is then clipped away by the viewport. Measured: the
 * Canary Islands are 17.6% of Spain's retained outline and are drawn nowhere, because the camera is
 * fitted to Spain's LARGEST part. Counting them as a cut would be counting an exclusion the
 * derivation already made on purpose. A ring that is half in and half out is the real thing here,
 * and that is what a reader sees as a country sliced by the edge.
 *
 * The floor is 2%: a coastline antialiases across the frame edge, and nothing under a fortieth of a
 * country's drawn outline reads as a cut.
 */
function assertFrameHoldsEveryRegion(shapes, frame, maxOutsideFraction = 0.02) {
  const inFrame = ([x, y]) => x >= 0 && x <= frame.width && y >= 0 && y <= frame.height;
  const cut = [];
  for (const shape of shapes) {
    let outside = 0;
    let total = 0;
    for (const ring of shape.rings) {
      if (!ring.some(inFrame)) continue;
      for (const point of ring) {
        total += 1;
        if (!inFrame(point)) outside += 1;
      }
    }
    if (total > 0 && outside / total > maxOutsideFraction)
      cut.push(`${shape.name} (${shape.key}) ${((outside / total) * 100).toFixed(1)}%`);
  }
  if (cut.length === 0) return;
  throw new Error(
    `this frame cuts ${cut.length} of the ${shapes.length} countries the map counts, by more than ` +
      `${(maxOutsideFraction * 100).toFixed(0)}% of their own outline: ${cut.join(", ")}. The camera ` +
      `is read off the study set (\`studyBoundsOf\`) — a shortfall here means a country's largest ` +
      `part is not what the frame was fitted to.`,
  );
}

const env = parseEnvFile(await readFile(keyPath, "utf8"));
const key = env.MAPTILER_KEY ?? MAPTILER_KEY_ALIASES.map((alias) => env[alias]).find(Boolean);
if (!key) throw new Error(`no MAPTILER_KEY (or alias: ${MAPTILER_KEY_ALIASES.join(", ")}) in ${keyPath}`);

// ── The shapes, keyed the way Natural Earth actually keys them (ADM0_A3, never ISO_A3) ───────────
const collection = JSON.parse(await readFile(shapesPath, "utf8"));
const byKey = new Map();
for (const feature of collection.features) byKey.set(feature.properties.ADM0_A3, feature);
const missingShapes = CO2_2023_STUDY.filter((code) => !byKey.has(code));
if (missingShapes.length > 0)
  throw new Error(`${missingShapes.length} declared countries have no shape: ${missingShapes.join(", ")}`);

// The camera, read off the shapes this beat actually draws — see `studyBoundsOf` above.
BEAT.bounds = studyBoundsOf(collection, CO2_2023_STUDY);

/**
 * MultiPolygon and Polygon both become a flat list of rings; holes are rings too. Flattens across a
 * shape's own PARTS (never across two different shapes — this runs once per feature, below), which
 * is safe here because the drawing path fills with `fill-rule="evenodd"` — see `geo-choropleth.ts`'s
 * own `keepRing` doc-comment for the full reasoning and the trap this is NOT.
 */
function ringsOf(geometry) {
  const polygons = geometry.type === "MultiPolygon" ? geometry.coordinates : [geometry.coordinates];
  return polygons.flat();
}

const payload = CO2_2023_STUDY.map((code) => {
  const feature = byKey.get(code);
  return {
    key: code,
    name: feature.properties.NAME,
    rings: ringsOf(feature.geometry),
  };
});

// ── The capture ────────────────────────────────────────────────────────────────────────────────
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

// THE TRUNK'S SWEEP, INJECTED INTO THE CAPTURE PAGE. `page.evaluate` ships a function body with no
// closure, which is precisely how this sweep came to be written twice — once here and once in
// `live-map.mjs`. One file, read from `shared/map-beat/style.mjs`, is what makes the plate and the
// live map one cartography.
await page.addScriptTag({
  content:
    (await readFile(TRUNK_STYLE, "utf8")).replace(/^export /gm, "") +
    "\nwindow.__applyLiveStyle = applyLiveStyle;\nwindow.__assertLiveStyleAnswered = assertLiveStyleAnswered;\n",
});

const gate = await page.evaluate(
  async ({ key, style, bounds, fitPadding, settleMs, tints, width, height }) => {
    const map = new maplibregl.Map({
      container: "map",
      style: `https://api.maptiler.com/maps/${style}/style.json?key=${key}`,
      interactive: false,
      attributionControl: false,
      fadeDuration: 0,
      canvasContextAttributes: { preserveDrawingBuffer: true }, // rule 6: empty canvas at screenshot time without this
      bounds,
      // THE ROOM AROUND THE SUBJECT IS THE LIVE CAMERA'S OWN RULE. It was `padding: 0`, which is
      // why the typed box had to carry its margin in degrees — and a margin in degrees is a number
      // nobody can check against a picture.
      fitBoundsOptions: { padding: fitPadding, animate: false },
    });
    window.__map = map;
    await new Promise((resolve) => map.once("style.load", resolve));

    // Rules 7 and 9 in ONE CALL, and it is the trunk's — `shared/map-beat/style.mjs`, injected into
    // this page above. Quiet the plate (every place label, road label and boundary line the provider
    // ships is a layer doing none of the jobs here) and paint the water AND the land the beat
    // measured. What it replaced was two hand-written loops, and the live page carried its own copy
    // of both; the two agreed only for as long as MapTiler kept those ids and nobody edited one of
    // the lists.
    const swept = window.__assertLiveStyleAnswered(window.__applyLiveStyle(map, { tints }), style);

    // Rule 1: idle OR a bounded settle, and say which — `idle` alone never fires when one tile
    // never resolves, and the capture then hangs forever rather than slowly.
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
      center: map.getCenter(),
      topLeft: map.unproject([0, 0]),
      bottomRight: map.unproject([width, height]),
    };
  },
  {
    key,
    style: BEAT.style,
    bounds: BEAT.bounds,
    fitPadding: fitPaddingFor(size, size),
    settleMs,
    tints: TINTS,
    width: size,
    height: size,
  },
);

const frameCorners = frameCornersOf(gate.topLeft, gate.bottomRight);
const camera = cameraFacts(gate.zoom, frameCorners);
assertWorldFillsFrame(camera, size);
assertCameraReachesBounds(frameCorners, BEAT.bounds, size);

await mkdir(outDir, { recursive: true });
const platePath = join(outDir, "plate.png");
await page.screenshot({ path: platePath, clip: { x: 0, y: 0, width: size, height: size } });

// ── The projection (rule 3 and rule 4) ─────────────────────────────────────────────────────────
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

const anchors = await page.evaluate((points) => {
  const map = window.__map;
  return Object.fromEntries(
    Object.entries(points).map(([name, [lng, lat]]) => {
      const p = map.project([lng, lat]);
      return [name, [Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10]];
    }),
  );
}, BEAT.anchors);

await browser.close();

// ── Cull and thin, in node, with the pure functions the tests cover ────────────────────────────
const frame = { width: size, height: size };
const minGap = 0.6;
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

assertFrameHoldsEveryRegion(shapes, frame);

const geometry = {
  frame,
  bounds: BEAT.bounds,
  style: BEAT.style,
  // WHAT THE PLATE WAS ACTUALLY PAINTED IN, carried so the live layer paints the same two colours
  // rather than re-deriving them — the same reason `frameCorners` and `degreesPerPixel` are here.
  tints: TINTS,
  gatedBy: gate.how,
  zoom: Math.round(gate.zoom * 1000) / 1000,
  frameCorners,
  worldWidthPx: camera.worldWidthPx,
  degreesPerPixel: camera.degreesPerPixel,
  metresPerPixel: camera.metresPerPixel,
  anchors,
  shapes,
};
const geometryPath = join(outDir, "geometry.json");
await writeFile(geometryPath, JSON.stringify(geometry));

console.log(
  `bounds   → read off the study set's largest parts: ` +
    `${BEAT.bounds[0][0].toFixed(2)}..${BEAT.bounds[1][0].toFixed(2)}°E, ` +
    `${BEAT.bounds[0][1].toFixed(2)}..${BEAT.bounds[1][1].toFixed(2)}°N, padded ${fitPaddingFor(size, size)}px\n` +
  `tints    → water ${TINTS.water}, land ${TINTS.land}, sea/land ${TINTS.seaLandContrast.toFixed(3)}:1 (measured)\n` +
  `gated by ${gate.how} in ${gate.ms}ms · hid ${gate.hidden}, re-tinted ${gate.tinted} basemap layers · zoom ${geometry.zoom}\n` +
    `plate    → ${platePath}\n` +
    `geometry → ${geometryPath}  ${ringsOut}/${ringsIn} rings, ${pointsOut}/${pointsIn} points\n` +
    `off-frame entirely: ${empty.length ? empty.join(", ") : "none"}`,
);
