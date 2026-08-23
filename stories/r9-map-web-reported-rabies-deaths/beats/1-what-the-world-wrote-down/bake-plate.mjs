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
  RABIES_2024_STUDY,
  RABIES_BREAKS,
  keepRing,
  simplifyRing,
} from "./geo-choropleth.ts";
import { choroplethSurfaces } from "./ChoroplethWeb.tsx";
import { readPalette } from "#shared/chart-beat/render-still.mjs";
import { splashEnvPath, splashRoot } from "./splash-root.mjs";
import { coversTo, deliveryFrame, frameCoversTheBoxRange, labelSafeFrame } from "./delivery-frame.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

/** THE SEA FOLLOWS THE PALETTE, and it is read here rather than imported as a constant.
 *
 *  The owner's instruction, on a rendered map: *"it has to adapt to the palette."* A fixed
 *  `WATER_FILL` measured 0.557 relative luminance against a dark ground whose ramp climbed 0.052 to
 *  0.616 — the ocean, which is most of a world map, outshone five of the six classes and read as the
 *  loudest thing on a map about land. `choroplethSurfaces` derives it from the same ground and
 *  accent the ramp comes from and refuses a pairing a reader could not separate, and it is the ONE
 *  place all three call sites — this bake, the SSR'd page and the live plan — get their answer, so
 *  the plate and the live tiles can never paint two different seas. */
// STOPS AT THE SPLASH ROOT, not at a counted number of parents. `PALETTE.md` is a STORY-level
// record — one answer for a story's whole run — so a beat under `stories/<slug>/beats/<id>/` needs
// the walk to climb two levels, and `stopAt: join(HERE, "..")` stopped it at `beats/` and threw "No
// PALETTE.md found" with the file sitting one directory further up. Same defect as the `.env` line
// above, same fix: the boundary is the root, and the root is found rather than counted.
const PALETTE = readPalette(HERE, { stopAt: splashRoot(HERE) });
const WATER_FILL = choroplethSurfaces(PALETTE.ground, PALETTE.accent, RABIES_BREAKS).water;

/** The beat's camera and its anchors — the same near-square European box
 *  `map-beat/scripts/bake-plate.mjs` uses for the near-identical study set (rule 12). */
const BEAT = {
  // THE WORLD, because the study set is the world: WHO asks all 194 of these countries the same
  // question every year and the beat is about which of them answered. Longitude runs the full turn;
  // latitude is cut at 58°S and 78°N, which is every shape this beat draws (the southernmost is
  // Chile's Cape Horn, the northernmost Greenland's Kaffeklubben coast) and no more — a Mercator
  // camera taken to the poles spends most of its pixels on ice nobody in this file reported from.
  bounds: [
    [-180, -58],
    [180, 78],
  ],
  // dataviz-DARK, not light: this story's recorded ground is #16191B. A light basemap under a dark
  // page is a white box with a map in it.
  style: "dataviz-dark",
  anchors: {
    // The two ends of the claim, projected once here rather than guessed as a pixel offset (rule 4).
    // Afghanistan reported the most (641); India is the largest of the countries that filed nothing.
    subject: [66.0, 33.9],
    comparison: [79.0, 22.0],
  },
};

const MAPLIBRE = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js";
const MAPLIBRE_CSS = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css";

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv[at + 1] : fallback;
};

// `--size` is the frame's WIDTH, and it has never been anything else — the second axis was never a
// decision anyone made, it was the same number used twice. `--width` is the name that says so;
// `--size` stays for every caller written before this. The HEIGHT is DERIVED from the camera by
// `frameHeightFor` unless `--height` overrides it, so a wide camera gets a wide frame.
const size = Number(flag("--width", flag("--size", "496")));
const outDir = flag("--out", join(HERE, "plate"));
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
// Read with a number MATCH rather than a comma split: a bake that reads a journalist's csv
// already tokenises rows on newlines, and the pair of signals is what `csvSplitByHand` looks
// for — a flag parser is not a csv reader and must not look like one.
const [clearanceX = 0, clearanceY = 0] = (String(flag("--clearance", "0,0")).match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
const DELIVERY = deliveryFrame(BEAT.bounds, size, BOX_ASPECTS, { x: clearanceX, y: clearanceY });
const frameHeight = Number(flag("--height", "0")) || DELIVERY.frame.height;
const shapesPath = flag("--shapes", join(HERE, "countries.geojson"));
const settleMs = Number(flag("--settle", "15000"));
// THE KEY HAS ONE HOME, AND IT IS NOT A FIXED NUMBER OF `..` SEGMENTS. This was
// `join(HERE, "../../.env")`, which is right for a beat living two levels under the repository root
// — where this one lives — and wrong for one at `stories/<slug>/beats/<id>/`, four levels down,
// which is where every beat a journalist commissions lives. Copied there, it resolved to the
// STORY's own folder and threw `ENOENT … stories/<slug>/.env`, sending the reader hunting for a
// missing key when what was missing was the root. `splashEnvPath` walks up to the nearest ancestor
// declaring the `#shared/*` import, which is the root by definition wherever the beat sits.
const keyPath = flag("--env", splashEnvPath(HERE));

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

const env = parseEnvFile(await readFile(keyPath, "utf8"));
const key = env.MAPTILER_KEY ?? MAPTILER_KEY_ALIASES.map((alias) => env[alias]).find(Boolean);
if (!key) throw new Error(`no MAPTILER_KEY (or alias: ${MAPTILER_KEY_ALIASES.join(", ")}) in ${keyPath}`);

// ── The shapes, keyed the way Natural Earth actually keys them (ADM0_A3, never ISO_A3) ───────────
const collection = JSON.parse(await readFile(shapesPath, "utf8"));
const byKey = new Map();
for (const feature of collection.features) byKey.set(feature.properties.ADM0_A3, feature);
const missingShapes = RABIES_2024_STUDY.filter((code) => !byKey.has(code));
if (missingShapes.length > 0)
  throw new Error(`${missingShapes.length} declared countries have no shape: ${missingShapes.join(", ")}`);

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

const payload = RABIES_2024_STUDY.map((code) => {
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
  async ({ key, style, padding, bounds, settleMs, waterFill, width, height }) => {
    const map = new maplibregl.Map({
      container: "map",
      style: `https://api.maptiler.com/maps/${style}/style.json?key=${key}`,
      interactive: false,
      attributionControl: false,
      fadeDuration: 0,
      preserveDrawingBuffer: true, // rule 6: empty canvas at screenshot time without this
      bounds,
      fitBoundsOptions: { padding, animate: false },
    });
    window.__map = map;
    await new Promise((resolve) => map.once("style.load", resolve));

    // Rule 7: water is a blue tint, never grey — `dataviz-light` paints it near-grey by default.
    for (const id of ["Water", "Water shadow"])
      if (map.getLayer(id)) map.setPaintProperty(id, "fill-color", waterFill);

    // Rule 9: quiet the plate — every place label, road label and boundary line the provider ships
    // competes with the one label this beat draws itself.
    const hidden = [];
    for (const layer of map.getStyle().layers)
      if (layer.type === "symbol" || /border|boundary|admin/i.test(layer.id)) {
        map.setLayoutProperty(layer.id, "visibility", "none");
        hidden.push(layer.id);
      }

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
      hidden: hidden.length,
      zoom: map.getZoom(),
      center: map.getCenter(),
      topLeft: map.unproject([0, 0]),
      bottomRight: map.unproject([width, height]),
    };
  },
  { key, style: BEAT.style, padding: DELIVERY.padding, bounds: BEAT.bounds, settleMs, waterFill: WATER_FILL, width: size, height: frameHeight },
);

const frameCorners = frameCornersOf(gate.topLeft, gate.bottomRight);
const camera = cameraFacts(gate.zoom, frameCorners);
assertWorldFillsFrame(camera, size);
assertCameraReachesBounds(frameCorners, BEAT.bounds, size);
frameCoversTheBoxRange({ width: size, height: frameHeight }, DELIVERY.studySet, DELIVERY.boxAspects, DELIVERY.cannotCover && { ...DELIVERY.cannotCover, worldWidthPx: camera.worldWidthPx });

await mkdir(outDir, { recursive: true });
const platePath = join(outDir, "plate.png");
await page.screenshot({ path: platePath, clip: { x: 0, y: 0, width: size, height: frameHeight } });

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
const frame = { width: size, height: frameHeight };
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
    : labelSafeFrame({ width: size, height: frameHeight }, DELIVERY.boxAspects, Boolean(DELIVERY.cannotCover)),
  frame,
  bounds: BEAT.bounds,
  style: BEAT.style,
  gatedBy: gate.how,
  zoom: Math.round(gate.zoom * 1000) / 1000,
  frameCorners,
  worldWidthPx: camera.worldWidthPx,
  degreesPerPixel: camera.degreesPerPixel,
  metresPerPixel: camera.metresPerPixel,
  anchors,
  shapes,
  // THE SEA THIS PLATE WAS PAINTED WITH. Derived here by `choroplethSurfaces` from the ramp and
  // the ground rather than by the bake family's own `basemapWaterFor` — the same placement, the
  // midpoint of the band between the ground and the first class, reached from the choropleth's
  // side of the toolchain. Recorded so a check after the fact can tell the surface this bake SET
  // from the surfaces the provider painted.
  water: { fill: WATER_FILL },
};
const geometryPath = join(outDir, "geometry.json");
await writeFile(geometryPath, JSON.stringify(geometry));

console.log(
  `gated by ${gate.how} in ${gate.ms}ms · hid ${gate.hidden} basemap layers · zoom ${geometry.zoom}\n` +
    `plate    → ${platePath}\n` +
    `geometry → ${geometryPath}  ${ringsOut}/${ringsIn} rings, ${pointsOut}/${pointsIn} points\n` +
    `off-frame entirely: ${empty.length ? empty.join(", ") : "none"}`,
);
