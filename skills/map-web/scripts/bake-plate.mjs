// twin/skills/map-web/scripts/bake-plate.mjs
//
// The bake for the web format's proportional-symbol seed: one camera, one basemap capture, one
// file of projected point positions. No polygon rings and no data join — a symbol map has neither
// (`map-beat/references/types/proportional-symbol.md`: "there is no data JOIN for this
// type") — so this is a lighter bake than a choropleth's: points in, projected pixels out.
//
// After this runs there is no map anywhere in this skill, same invariant `map-beat` ships:
// the interactive HTML draws an `<image>` and some `<circle>`s through `render-web.mjs`.
//
// This is `doctrine/references/geo-discipline.md` rules 1, 2, 4, 6 in one script (rule 3 does
// not apply — nothing here is a polygon) — read before touching this file:
//   1. the frame gate is `idle` OR a bounded settle, and it records which one fired;
//   2. the plate is fixed, so the two responsive layouts this format ships never re-render tiles;
//   4. each point's own label is placed at its OWN projected pixel, in this beat's own typography;
//   6. capture plumbing — `preserveDrawingBuffer`, `--use-gl=angle`, a resolved Chrome path.
// Rule 7 (water reads as a blue tint, never grey) applies here MORE than to a choropleth: a
// point-based beat leaves nearly the whole plate exposed as basemap, so MapTiler's own
// `dataviz-light` near-grey water (`hsl(240, 2%, 88%)`) would be visible everywhere between the
// circles rather than hidden under polygon fills — this is the render that actually looks at it.
//
// A skill directory has to build after being copied into a journalist's root, so nothing under a
// skill may import out of it (`splash/test/no-cross-skill-imports.test.ts` fails loud on any
// specifier that does) — this file is this skill's OWN copy of the bake, not an import of
// `map-beat`'s or `proof/map-quake-symbol`'s.
//
// Usage:
//   bun skills/map-web/scripts/bake-plate.mjs --size 1000 --out /tmp/map-twin-web/plate-1000
//
// SIZE: baked generously (1000 logical px, ~2000 physical px at the capture's own 2x device pixel
// ratio) so the plate stays at or near native resolution when displayed full-width up to the widest
// tested viewport (1600px) — see references/map-web-discipline.md, "Full width, genuinely", for the
// exact numbers this trades off against file size and bake time.

import { existsSync, readdirSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";
import { splashEnvPath } from "./splash-root.mjs";
import { coversTo, deliveryFrame, frameCoversTheBoxRange, labelSafeFrame } from "./delivery-frame.mjs";
import { keepPoint } from "../assets/geo-symbol.ts";

const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * The camera: a box around this beat's own sample of European metro areas (Lisbon to Athens,
 * Athens to Stockholm), padded so no circle sits on the frame edge — the same reasoning
 * `map-beat/scripts/bake-plate.mjs` gives for its own wider Europe box, applied to a smaller
 * study set. Chosen from the geography, not a default (`geo-discipline.md` rule 12): the study
 * set's own lon/lat extent is roughly -9.1..23.7 / 38.0..59.3, padded ~5° on every side.
 */
const SEED_BEAT = {
  bounds: [
    [-14, 34],
    [28, 64],
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

// `--size` is the frame's WIDTH, and it has never been anything else — the second axis was never a
// decision anyone made, it was the same number used twice. `--width` is the name that says so;
// `--size` stays for every caller written before this. The HEIGHT is DERIVED from the camera unless
// a beat overrides it, so a wide camera gets a wide frame and fills the page it is drawn into.
const size = Number(flag("--width", flag("--size", "1000")));
const outDir = flag("--out", `/tmp/map-twin-web/plate-${size}`);
const dataPath = flag("--data", join(HERE, "../assets/sample-data/regions.json"));
/**
 * THE CAMERA AND THE BASEMAP ARE THE BEAT'S, NOT THE SKILL'S.
 *
 * Both used to be constants in this file and nothing else: `--size`, `--out` and `--data` were
 * flags, while the two decisions that are most obviously per-story — WHICH GROUND this map covers
 * and WHICH BASEMAP it is drawn over — could only be changed by editing a file inside the skill.
 * The consequence was measured twice in round six: `bake-plate.mjs` hard-codes `dataviz-light` with
 * no flag, and a beat that needed another camera copied the whole script into its own directory to
 * change two lines, which is how a beat's bake drifts from the canonical one
 * (`splash/test/bake-parity.test.ts` found exactly that, in two functions, this round).
 *
 * `--bounds` takes the same `[[west, south], [east, north]]` the camera has always been written as,
 * as JSON; `--style` takes a MapTiler style id. Both default to the seed's own, so every existing
 * caller — the example runners, the sealed-bake path, the install check — runs unchanged. The
 * camera is still CHOSEN FROM THE GEOGRAPHY and never defaulted into (geo-discipline.md rule 12):
 * what changes is only that a beat can now say so on the command line instead of in a fork.
 */
function beatCamera() {
  const declared = flag("--bounds", null);
  const style = flag("--style", SEED_BEAT.style);
  if (!declared) return { bounds: SEED_BEAT.bounds, style };
  let bounds;
  try {
    bounds = JSON.parse(declared);
  } catch {
    throw new Error(`--bounds is not JSON: ${declared}`);
  }
  const shaped =
    Array.isArray(bounds) &&
    bounds.length === 2 &&
    bounds.every((corner) => Array.isArray(corner) && corner.length === 2 && corner.every(Number.isFinite));
  if (!shaped)
    throw new Error(
      `--bounds must be [[west, south], [east, north]] with four finite numbers; got ${declared}`,
    );
  const [[west, south], [east, north]] = bounds;
  if (!(east > west) || !(north > south))
    throw new Error(
      `--bounds must run west to east and south to north; got ${declared} — a box with no area ` +
        "bakes a plate with no ground in it",
    );
  return { bounds, style };
}

const BEAT = beatCamera();
// DERIVED FROM THE CAMERA **AND FROM THE BOX**, and that pairing is the 2026-08-23 change. The
// frame used to be `frameHeightFor(bounds, size)` — the camera's own Mercator shape and nothing
// else — and the delivered page then sized its map box from the plate, so a portrait camera got a
// portrait box in a landscape container: measured on the page the owner was looking at, 520.1px of
// box in 1568px of container. The graphic now takes the whole box on both axes and the plate is
// what has to fit THAT, so the frame is solved from the study set plus the range of box shapes this
// beat is actually delivered into. See `delivery-frame.mjs`'s own header for the full argument and
// for what it overrules.
const boxAspectsFlag =
  flag("--box-aspects", null) ??
  (() => {
    throw new Error(
      "--box-aspects <narrowest>,<widest> is required: it is the range of shapes this beat's own " +
        ".mw-stage takes on the rendered page, measured with verify-fills-the-box.mjs. A plate " +
        "baked without it is a plate baked for a box nobody looked at.",
    );
  })();
// `--clearance <x>,<y>`: the fraction of the delivered BOX each side must keep clear of the study
// set, so a point LABEL — drawn beside its mark at a fixed CSS size, outside the SVG, and therefore
// no part of the study set — is not cut by the crop. Zero by default: a beat that draws no labels
// outside its marks needs none, and `verify-fills-the-box.mjs` prints the pair a beat that does
// need one should be re-baked with, measured from the runs the page actually cut.
// Read with a number MATCH rather than a comma split: a bake that reads a journalist's csv
// already tokenises rows on newlines, and the pair of signals is what `csvSplitByHand` looks
// for — a flag parser is not a csv reader and must not look like one.
const [clearanceX = 0, clearanceY = 0] = (String(flag("--clearance", "0,0")).match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
const DELIVERY = deliveryFrame(BEAT.bounds, size, boxAspectsFlag, { x: clearanceX, y: clearanceY });
const frameHeight = Number(flag("--height", "0")) || DELIVERY.frame.height;
const settleMs = Number(flag("--settle", "15000"));
const sealedBrowserPath = flag("--browser", null);
const sealedMaplibreJsPath = flag("--maplibre-js", null);
const sealedMaplibreCssPath = flag("--maplibre-css", null);
const sealedStylePath = flag("--style-json", null);
const sealedMapTilerEnv = argv.includes("--maptiler-env");
const sealedRuntimeValues = [sealedBrowserPath, sealedMaplibreJsPath, sealedMaplibreCssPath];
const sealed = sealedRuntimeValues.some(Boolean) || Boolean(sealedStylePath) || sealedMapTilerEnv;
if (sealed && (!sealedRuntimeValues.every(Boolean) || Boolean(sealedStylePath) === sealedMapTilerEnv)) {
  throw new Error("sealed map bake requires --browser, --maplibre-js, --maplibre-css, and exactly one of --style-json or --maptiler-env");
}
if (sealedBrowserPath && (!isAbsolute(sealedBrowserPath) || !existsSync(sealedBrowserPath))) {
  throw new Error(`sealed Chrome is not an existing absolute path: ${sealedBrowserPath}`);
}
// The Splash root's own `.env` — the same file `recordKey` writes a journalist's key into. This
// used to be a fixed three-level climb (`../../../.env`), which is `twin/.env` in this checkout and
// the DEVELOPER's `.env` anywhere the skills are installed as a symlink, because both Bun and Node
// resolve the link before computing `import.meta.url`. See `splash-root.mjs`.
const keyPath = sealed ? null : flag("--env", splashEnvPath(import.meta.dirname));

/**
 * Headless Chrome has to be FOUND before it can be gated (rule 6). puppeteer's own download is
 * missing on a clean install often enough that the chart format wrote the same note; this resolves
 * the candidates in order and fails naming every path it looked in.
 */
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

// A DUPLICATE of splash's own key-alias resolution, not an import — a skill directory has to
// stay copy-pasteable on its own (see `map-beat/scripts/bake-plate.mjs`'s own header note for
// the same rule applied there). Canonical name wins when both happen to be set.
const MAPTILER_KEY_ALIASES = ["MAPTILER_API_KEY", "REMOTION_MAPTILER_KEY", "VITE_MAPTILER_KEY"];

/** Parses `KEY=value` lines from a `.env` file's text into a plain object — one pair per line. */
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

/** A longitude into this camera's own frame, `[west, west + 360)`. `map.project` does NOT wrap to
 * the camera, so a Pacific-centred beat must normalise every longitude before projecting it or every
 * western-Pacific point projects to a negative x and is culled. Two of nineteen bakes carried this
 * as a closure over `BEAT`, which is why seventeen could not have it. @parity */
function normaliseLon(lon, west) {
  return west + ((((lon - west) % 360) + 360) % 360);
}

/** THE FRAME IS THE SHAPE OF THE BOX, NOT OF THE CAMERA — and `frameMatchesItsCamera` used to be
 * the refusal that said the opposite. It refused any frame whose aspect differed from the camera's
 * own by more than 5%, which is now the normal, correct case: a portrait study set delivered into a
 * 2.77:1 box needs a plate with ocean either side, and that plate is 66% margin by design. The
 * refusal it is replaced by is `frameCoversTheBoxRange` in `delivery-frame.mjs`, which asks the
 * question that actually protects the reader — does every crop the delivery can ask for land on
 * basemap rather than on the subject — and `deliveryFrame` is the derivation that answers it.
 * `FRAME_MARGIN_TOLERANCE` went with it: margin is no longer waste to be tolerated, it is the
 * mechanism. @parity-exempt: this format's own addition; the canonical bake has no equivalent. */

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

let key = null;
let sealedStyle = null;
if (sealed) {
  if (sealedStylePath) sealedStyle = JSON.parse(await readFile(sealedStylePath, "utf8"));
  else {
    key = process.env.MAPTILER_KEY ?? "";
    if (!key) throw new Error("sealed MapTiler bake did not receive MAPTILER_KEY from Engine");
  }
} else {
  const env = parseEnvFile(await readFile(keyPath, "utf8"));
  key = env.MAPTILER_KEY ?? MAPTILER_KEY_ALIASES.map((alias) => env[alias]).find(Boolean);
  if (!key) throw new Error(`no MAPTILER_KEY (or alias: ${MAPTILER_KEY_ALIASES.join(", ")}) in ${keyPath}`);
}

const points = JSON.parse(await readFile(dataPath, "utf8"));

// ── The capture ────────────────────────────────────────────────────────────────────────────────
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
try {
const page = await browser.newPage();
await page.setViewport({ width: size, height: frameHeight, deviceScaleFactor: 2 });
if (sealed) {
  await page.setContent(
    `<!doctype html><html><head>
<style>html,body{margin:0;padding:0}#map{width:${size}px;height:${frameHeight}px}</style>
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
<style>html,body{margin:0;padding:0}#map{width:${size}px;height:${frameHeight}px}</style>
</head><body><div id="map"></div></body></html>`,
    { waitUntil: "load" },
  );
}
await page.waitForFunction("window.maplibregl !== undefined", { timeout: 60000 });

const gate = await page.evaluate(
  async ({ key, style, styleDefinition, bounds, padding, settleMs, width, height }) => {
    const map = new maplibregl.Map({
      container: "map",
      style: styleDefinition ?? `https://api.maptiler.com/maps/${style}/style.json?key=${key}`,
      interactive: false,
      attributionControl: false,
      fadeDuration: 0,
      // Without this the WebGL canvas is empty by the time a screenshot reads it (rule 6).
      preserveDrawingBuffer: true,
      bounds,
      fitBoundsOptions: { padding, animate: false },
    });
    window.__map = map;
    await new Promise((resolve) => map.once("style.load", resolve));

    // Rule 9: quiet the plate. Every place label, road label and boundary line the provider ships
    // is a layer doing none of the five jobs here — the circles and this beat's own labels carry it.
    const hidden = [];
    for (const layer of map.getStyle().layers)
      if (layer.type === "symbol" || /border|boundary|admin/i.test(layer.id)) {
        map.setLayoutProperty(layer.id, "visibility", "none");
        hidden.push(layer.id);
      }

    // Rule 7: water reads as a blue tint, never grey — see this file's own header note. Left
    // uncorrected, MapTiler's `dataviz-light` water is close enough to grey to read as no-data on
    // a beat where the ocean is not covered by anything else.
    for (const id of ["Water", "Water shadow"])
      if (map.getLayer(id)) map.setPaintProperty(id, "fill-color", "#aac9e0");

    // Rule 1: idle OR a bounded settle, and say which. `idle` alone never fires when one tile never
    // resolves, and the capture then hangs forever rather than slowly.
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
  { key, style: BEAT.style, styleDefinition: sealedStyle, bounds: BEAT.bounds, padding: DELIVERY.padding, settleMs, width: size, height: frameHeight },
);

const frameCorners = frameCornersOf(gate.topLeft, gate.bottomRight);
const camera = cameraFacts(gate.zoom, frameCorners);
assertWorldFillsFrame(camera, size);
assertCameraReachesBounds(frameCorners, BEAT.bounds, size);
frameCoversTheBoxRange({ width: size, height: frameHeight }, DELIVERY.studySet, DELIVERY.boxAspects);

await mkdir(outDir, { recursive: true });
const platePath = join(outDir, "plate.png");
await page.screenshot({ path: platePath, clip: { x: 0, y: 0, width: size, height: frameHeight } });

// ── The projection (rule 4) ────────────────────────────────────────────────────────────────────
const projected = await page.evaluate((rows) => {
  const map = window.__map;
  return rows.map(({ key, lon, lat }) => {
    const p = map.project([lon, lat]);
    return [key, Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10];
  });
}, points.map(({ key, lon, lat }) => ({ key, lon, lat })));

const pxOf = new Map(projected.map(([key, x, y]) => [key, [x, y]]));
const projectedPoints = points.map((p) => {
  const [px, py] = pxOf.get(p.key);
  return { ...p, px, py };
});

const frame = { width: size, height: frameHeight };
const offFrame = projectedPoints.filter((p) => !keepPoint(p, frame)).map((p) => p.name);

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
  // WHAT THIS PLATE WAS BAKED FOR, so the delivered page can be checked against it rather than
  // trusted. `studySet` is where the camera's own bounds landed inside the frame, `boxAspects` is
  // the measured range asked for, and `coversTo` is the range the frame actually reaches — the two
  // differ for a camera that already spans a full turn of longitude and has no more world to give.
  studySet: DELIVERY.studySet,
  boxAspects: DELIVERY.boxAspects,
  clearance: DELIVERY.clearance,
  coversTo: coversTo({ width: size, height: frameHeight }, DELIVERY.studySet),
  // The box a LABEL has to stay inside — the intersection of every band the delivery can show,
  // never the plate. A plate the cover crops is a plate whose own edge is not the picture's edge.
  // A `cannotCover` plate is contained rather than cropped, so its label box IS its frame.
  labelFrame: DELIVERY.cannotCover
    ? { width: size, height: frameHeight, left: 0, top: 0, safeWidth: size, safeHeight: frameHeight }
    : labelSafeFrame({ width: size, height: frameHeight }, DELIVERY.boxAspects),
  points: projectedPoints,
};
const geometryPath = join(outDir, "geometry.json");
await writeFile(geometryPath, JSON.stringify(geometry));

console.log(
  `gated by ${gate.how} in ${gate.ms}ms · hid ${gate.hidden} basemap layers · zoom ${geometry.zoom}\n` +
    `plate    → ${platePath}\n` +
    `geometry → ${geometryPath}  ${projectedPoints.length} points\n` +
    `off-frame: ${offFrame.length ? offFrame.join(", ") : "none"}`,
);
} finally {
  await browser.close();
}
