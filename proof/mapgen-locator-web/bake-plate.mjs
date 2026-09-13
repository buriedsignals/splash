// twin/proof/mapgen-locator-web/bake-plate.mjs
//
// The bake for the locator-web beat: one camera over central Geneva, one basemap capture, the
// eleven study-set points projected. No polygons, no join — a locator has neither
// (`map-beat/references/types/locator.md`: "position only").
//
// Baked at 420px square. That used to be "the exact pixel size this beat's own desktop `WebLayout`
// displays the plate at", and those two fixed layouts are gone (B5.1): the plate is now drawn into
// ONE fluid box whose size the reader's window decides, so 420 is a resolution choice rather than a
// match to a layout. It is also, since ruling R1, the FALLBACK layer rather than the display surface
// — what a reader sees with JavaScript off, offline, or after a key is rotated — while the camera
// facts recorded below (`frameCorners`, `zoom`, `degreesPerPixel`, `metresPerPixel`) are what the
// live map derives its own leash and mark scale from.
//
// This is `doctrine/references/geo-discipline.md` rules 1, 2, 4, 6, 7 in one script (rule 3
// does not apply — nothing here is a polygon):
//   1. the frame gate is `idle` OR a bounded settle, and it records which one fired;
//   2. the plate is fixed, so both responsive layouts this format ships never re-render tiles;
//   4. each point's own label is placed at its OWN projected pixel, in this beat's own typography
//      (done in `LocatorWeb.tsx`, not here — this script only projects and records);
//   6. capture plumbing — `preserveDrawingBuffer`, `--use-gl=angle`, a resolved Chrome path;
//   7. water reads as a blue tint, never MapTiler's own near-grey — a point-based beat leaves
//      nearly the whole plate exposed as basemap, so this matters MORE here than on a choropleth.
//
// This is this beat's OWN copy of the bake — never an import of `map-web`'s or
// `proof/map-geneva-locator`'s own `bake.mjs` (a beat's pure core and its bake are its own; see
// `mapmore-flow-danube/geo-flow.ts`'s own header for why).
//
// Usage:
//   bun proof/mapgen-locator-web/bake-plate.mjs --size 420   # → proof/mapgen-locator-web/plate

import { existsSync, readdirSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";
import { orgsFromCsv } from "./geo-locator.ts";
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
 * This line used to read `"#aac9e0"`, a constant carried byte-identically by every map × web beat
 * and by the format's own seed, and it was never measured against anything. Measured now, on this
 * beat's own white ground: `#aac9e0` sits at **1.730:1 against the page**, over the trunk's
 * `BASEMAP_MAX` of 1.6:1 — a basemap carrying more weight against the page than the markers drawn on
 * it, which is what `the-basemap-gives-up-its-contrast` forbids. `plateTints` searches for the
 * SMALLEST dose that still separates sea from land by `SEA_LAND_MIN` (1.22:1) and answers
 * `#cedfee` / `#f4f4f4` at 1.239:1 sea-to-land and 1.362:1 against the page.
 *
 * It is a CALL, not a recorded answer (rule 2: what is measured stays measured). A beat on another
 * ground gets different numbers, on purpose, and a ground where no dose works at all is refused here
 * rather than shown as a flat map.
 */
const PALETTE = readPalette(HERE, { stopAt: join(HERE, "..") });
const TINTS = plateTints({ ground: PALETTE.ground });

/**
 * THE ONE THING THIS BEAT'S GEOGRAPHY KEEPS, and it is a sentence about a city rather than a
 * setting. The trunk's sweep hides every line layer, which is right for a choropleth of Europe —
 * a road network over classed countries is noise. This frame is 4 km wide. The streets are how a
 * reader places eleven markers against a city they may already know, and taking them out left a
 * plate that was quieter and told the reader less about where anything is.
 *
 * Named as a regular expression against the provider's own layer ids rather than as a list of them,
 * because `dataviz-light` splits its network across a dozen (`Road network`, `Road motorway`,
 * `Tunnel`, …) and a list would go stale the next time MapTiler restyles. Everything else the sweep
 * hides — hillshade, landuse, boundaries, every provider label — still goes.
 */
const KEEP_TEXTURES = [/road/i];

// The camera FRAMES ITS SUBJECT, and it is no longer a rectangle anybody typed.
//
// This read `[[6.09, 46.165], [6.225, 46.26]]` — a box copied from `proof/map-geneva-locator`. The
// study set spans lon 6.1219-6.1917 and lat 46.1919-46.2335, so that box was 1.93x the subject's
// own longitude span and 2.28x its latitude span: measured on the delivered plate, the eleven
// points filled 51% of the frame's width and 44% of its height, the nine-point cluster sat in the
// upper left, and the bottom two fifths of the picture was streets carrying nothing. Nothing was
// cropped and nothing was red — `assertCameraReachesBounds` compares the measured frame against
// the typed box, so a box that is too BIG passes by construction (`camera-holds-the-study-set`
// says so about all nineteen copies of that invariant).
//
// So the bounds are now the study set's own extent, read out of the same frozen CSV the beat draws,
// and the room around it is `fitBounds`' own `padding` rather than a margin in degrees — the SAME
// rule the live camera already uses (`live-map.mjs`'s `fitPadding`: 9% of the shorter side, capped
// at 48 CSS px). Plate and live map now fit one box by one rule.
const BEAT = {
  style: "dataviz-light",
};

/** The live camera's own padding rule, transported rather than re-derived — `live-map.mjs`:
 *  "9% of the shorter side keeps every container this format has been driven at 1600 down to 768 at
 *  the old 48 exactly, and hands a phone a padding proportional to what it has." */
const MAX_FIT_PADDING_PX = 48;
const fitPadding = (width, height) => Math.min(MAX_FIT_PADDING_PX, Math.round(Math.min(width, height) * 0.09));

/** The study set's own extent, in the order `fitBounds` takes it. @parity */
function studyBoundsOf(rows) {
  const lons = rows.map((r) => r.lon);
  const lats = rows.map((r) => r.lat);
  return [
    [Math.min(...lons), Math.min(...lats)],
    [Math.max(...lons), Math.max(...lats)],
  ];
}

/**
 * A FRAME THAT IS MUCH BIGGER THAN WHAT IT FRAMES IS A DEFECT, and it is the one shape of camera
 * error no existing guard can see: `assertCameraReachesBounds` only asks whether the frame REACHES
 * the box it was given, so a camera two zoom levels too wide is green.
 *
 * Measured on the frame this replaces: 51% of the width, 44% of the height. Measured on the frame
 * below: the binding axis fills whatever `fitPadding` leaves it, which at this plate's size is 82%.
 * The floor is set between the two, at the point where a subject stops reading as the picture's
 * subject and starts reading as something dropped into a map of somewhere else.
 */
const SUBJECT_FILLS_AT_LEAST = 0.6;
function assertFrameHoldsItsSubject(points, frame) {
  const spanX = Math.max(...points.map((p) => p.px)) - Math.min(...points.map((p) => p.px));
  const spanY = Math.max(...points.map((p) => p.py)) - Math.min(...points.map((p) => p.py));
  const fill = Math.max(spanX / frame.width, spanY / frame.height);
  if (fill >= SUBJECT_FILLS_AT_LEAST) return fill;
  throw new Error(
    `this frame does not hold its subject: the study set spans ${spanX.toFixed(0)}x${spanY.toFixed(0)}px ` +
      `inside a ${frame.width}x${frame.height}px plate, so it fills ${(fill * 100).toFixed(0)}% of the ` +
      `binding axis against a floor of ${SUBJECT_FILLS_AT_LEAST * 100}%. The camera is framed on something ` +
      `other than what the beat is about.`,
  );
}

const MAPLIBRE = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js";
const MAPLIBRE_CSS = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css";

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv[at + 1] : fallback;
};

// THE PLATE IS THE SHAPE OF THE BOX THE PAGE GIVES IT, and that is a measurement rather than a
// preference. It was a 420px SQUARE, and a square plate cannot answer a wide page: `.mw-viewport`
// keeps the plate's aspect exactly (a raster stretched to a shape it was not baked for is a lie
// about distance and shape), so at every desktop window the fallback came out as a square bounded
// by the leftover HEIGHT while the title, the source line and the filter row all ran the full
// width. Measured on the delivered page at 1280x1200: a 929px square inside a 1248px stage, 318px
// of empty right margin, the composition broken in half.
//
// The map block's own aspect, measured on this beat's delivered page at six desktop shapes:
//
//     1024x768  -> 992x482   2.058      1280x800  -> 1248x529   2.357
//     1280x1200 -> 1248x929  1.343      1440x900  -> 1408x629   2.237
//     1600x900  -> 1568x629  2.491      1920x1080 -> 1888x825   2.289
//
// The plate is baked at the MEDIAN of those six, 2.263, so it fills the page's width at five of the
// six and takes 95% of it at the sixth. Wider would letterbox the subject; squarer leaves the
// margin this exists to close. The short side stays close to the old 420 so the plate is still
// sampled at roughly twice its drawn size on a desktop window.
const STAGE_ASPECT = 2.263;
const size = Number(flag("--size", "840"));
const height = Math.round(size / STAGE_ASPECT);
const outDir = flag("--out", join(HERE, "plate"));
const csvPath = flag("--data", join(HERE, "geneva-orgs.csv"));
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
if (!key) throw new Error(`no MAPTILER_KEY (or alias: ${MAPTILER_KEY_ALIASES.join(", ")}) in ${keyPath}`);

const orgs = orgsFromCsv(await readFile(csvPath, "utf8"));
// The camera's box, read off the beat's own frozen rows. Nothing in this file types a coordinate.
const BOUNDS = studyBoundsOf(orgs);
console.log(
  `camera   → study set ${BOUNDS[0][0].toFixed(4)},${BOUNDS[0][1].toFixed(4)} to ` +
    `${BOUNDS[1][0].toFixed(4)},${BOUNDS[1][1].toFixed(4)} in a ${size}x${height} frame, ` +
    `${fitPadding(size, height)}px of padding — derived from ${orgs.length} rows, not typed.`,
);

const browser = await puppeteer.launch({
  headless: true,
  executablePath: resolveChrome(),
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox", "--hide-scrollbars"],
});
const page = await browser.newPage();
await page.setViewport({ width: size, height: height, deviceScaleFactor: 2 });
await page.setContent(
  `<!doctype html><html><head>
<link href="${MAPLIBRE_CSS}" rel="stylesheet"/>
<script src="${MAPLIBRE}"></script>
<style>html,body{margin:0;padding:0}#map{width:${size}px;height:${height}px}</style>
</head><body><div id="map"></div></body></html>`,
  { waitUntil: "load" },
);
await page.waitForFunction("window.maplibregl !== undefined", { timeout: 60000 });

// THE PAGE RUNS THE TRUNK'S OWN SOURCE, not a paraphrase of it. `page.evaluate` ships a function
// body across the process boundary with no closure, so a module the bake imports is not reachable
// from inside the browser — which is exactly how the sweep came to be written twice. The file is
// read, its `export` keywords stripped (the page takes a classic script, the same treatment
// `render-web.mjs` gives it), and its two entry points hung off `window`.
await page.addScriptTag({
  content:
    (await readFile(TRUNK_STYLE, "utf8")).replace(/^export /gm, "") +
    "\nwindow.__applyLiveStyle = applyLiveStyle;\nwindow.__assertLiveStyleAnswered = assertLiveStyleAnswered;\n",
});

const gate = await page.evaluate(
  async ({ key, style, bounds, fitPadding, settleMs, width, height, tints, keepTextures }) => {
    const map = new maplibregl.Map({
      container: "map",
      style: `https://api.maptiler.com/maps/${style}/style.json?key=${key}`,
      interactive: false,
      attributionControl: false,
      fadeDuration: 0,
      preserveDrawingBuffer: true,
      bounds,
      // THE ROOM AROUND THE SUBJECT IS THE LIVE CAMERA'S OWN RULE. It was `padding: 0`, which is
      // why the typed box above had to carry the margin in degrees — and a margin in degrees is a
      // number nobody can check against a picture.
      fitBoundsOptions: { padding: fitPadding, animate: false },
    });
    window.__map = map;
    await new Promise((resolve) => map.once("style.load", resolve));

    // Rules 7 and 9 in ONE CALL, and it is the trunk's — `shared/map-beat/style.mjs`, injected into
    // this page above. Quiet the plate (every place label, road label and boundary line the provider
    // ships is a layer doing none of the jobs here) and paint the water and land the beat measured.
    //
    // What it replaced was two hand-written loops: a symbol/boundary sweep, and `["Water", "Water
    // shadow"]` named by hand and painted a hard-coded blue. The live page carried its own copy of
    // both, and the two agreed only for as long as MapTiler kept those ids and nobody edited one of
    // the lists. The plate and the live map are now the same sweep, from the same file.
    //
    // A REGULAR EXPRESSION DOES NOT CROSS THIS BOUNDARY. `page.evaluate` serialises its arguments,
    // and a RegExp serialises to `{}` — which `.test()` is not a method of, so it would throw here
    // rather than quietly match nothing. It travels as source and flags and is rebuilt in the page.
    const swept = window.__assertLiveStyleAnswered(
      window.__applyLiveStyle(map, {
        tints,
        keepTextures: keepTextures.map((r) => new RegExp(r.source, r.flags)),
      }),
      style,
    );

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
  {
    key,
    style: BEAT.style,
    bounds: BOUNDS,
    fitPadding: fitPadding(size, height),
    settleMs,
    width: size,
    height,
    tints: TINTS,
    keepTextures: KEEP_TEXTURES.map((r) => ({ source: r.source, flags: r.flags })),
  },
);

const frameCorners = frameCornersOf(gate.topLeft, gate.bottomRight);
const camera = cameraFacts(gate.zoom, frameCorners);
assertWorldFillsFrame(camera, size);
assertCameraReachesBounds(frameCorners, BOUNDS, size);

await mkdir(outDir, { recursive: true });
const platePath = join(outDir, "plate.png");
await page.screenshot({ path: platePath, clip: { x: 0, y: 0, width: size, height } });

const projected = await page.evaluate((points) => {
  const map = window.__map;
  return points.map(({ key, lon, lat }) => {
    const p = map.project([lon, lat]);
    return [key, Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10];
  });
}, orgs.map(({ key, lon, lat }) => ({ key, lon, lat })));

await browser.close();

const pxOf = new Map(projected.map(([key, x, y]) => [key, [x, y]]));
const points = orgs.map((o) => {
  const [px, py] = pxOf.get(o.key);
  return { ...o, px, py };
});

const frame = { width: size, height };
const offFrame = points.filter((p) => p.px < 0 || p.px > frame.width || p.py < 0 || p.py > frame.height);
const subjectFill = assertFrameHoldsItsSubject(points, frame);

const geometry = {
  frame,
  bounds: BOUNDS,
  style: BEAT.style,
  gatedBy: gate.how,
  zoom: Math.round(gate.zoom * 1000) / 1000,
  frameCorners,
  // WHAT THE PLATE WAS ACTUALLY BAKED IN, travelling with it. The live page paints its own style
  // from this rather than from a second constant of its own: a fallback plate and the live map
  // under it disagreeing about the colour of water is a visible swap, and it is the one thing the
  // two-layer arrangement must never do.
  tints: TINTS,
  keepTextures: KEEP_TEXTURES.map((r) => ({ source: r.source, flags: r.flags })),
  worldWidthPx: camera.worldWidthPx,
  degreesPerPixel: camera.degreesPerPixel,
  metresPerPixel: camera.metresPerPixel,
  points,
};
const geometryPath = join(outDir, "geometry.json");
await writeFile(geometryPath, JSON.stringify(geometry));

console.log(
  `gated by ${gate.how} in ${gate.ms}ms · hid ${gate.hidden} and re-tinted ${gate.tinted} basemap layers · zoom ${geometry.zoom}\n` +
    `tints    → water ${TINTS.water}, land ${TINTS.land}, sea/land ${TINTS.seaLandContrast.toFixed(3)}:1 (measured)\n` +
    `plate    → ${platePath}\n` +
    `geometry → ${geometryPath}  ${points.length} points\n` +
    `subject  → fills ${(subjectFill * 100).toFixed(0)}% of the binding axis (floor ${SUBJECT_FILLS_AT_LEAST * 100}%)\n` +
    `off-frame: ${offFrame.length ? offFrame.map((p) => p.name).join(", ") : "none"}`,
);
