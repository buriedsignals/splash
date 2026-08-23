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
import { keepPoint } from "./keep-point.ts";
import { coversTo, deliveryFrame, frameCoversTheBoxRange, labelSafeFrame } from "./delivery-frame.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * The camera: a box around THIS beat's own study set — six Portuguese cities and the five European
 * ones the recorded routes arrive at. Chosen from the geography, not a default
 * (`geo-discipline.md` rule 12): the eleven places span roughly -9.14..8.54 / 37.02..51.51, padded
 * about 2 to 3 degrees on every side so no ribbon's endpoint sits on the frame edge and so the bow
 * each ribbon takes stays inside the plate. The first attempt padded by 4 and the camera, filling a
 * square frame, widened it to 32 degrees of longitude for an 18-degree study set: the ribbons then
 * occupied a little over half the plate and the rest was empty Atlantic. Tightened here; the
 * remaining western margin is not slack, it is where the six origin names and the one on-map
 * annotation hang.
 *
 * @parity-exempt: a beat's camera is the one thing that cannot be shared with the skill it was
 * copied from. The skill's own box (-14,34 to 28,64, Lisbon to Stockholm) is 42 degrees of
 * longitude for a study set that occupies 18 of them; used here it would draw every route inside
 * the left third of the plate.
 *
 * The STYLE is this beat's own and is not a taste decision either: `PALETTE.md` records a charcoal
 * ground (#16191B), and `plateFollowsGround` refuses a beat whose plate sits on the other side of
 * the theme from its declared ground. A dark ground takes a dark basemap.
 */
const BEAT = {
  bounds: [
    [-12, 35],
    [11.5, 53.5],
  ],
  style: "dataviz-dark",
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
// Read with a number MATCH rather than a comma split: a bake that reads a journalist's csv
// already tokenises rows on newlines, and the pair of signals is what `csvSplitByHand` looks
// for — a flag parser is not a csv reader and must not look like one.
const [clearanceX = 0, clearanceY = 0] = (String(flag("--clearance", "0,0")).match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
const DELIVERY = deliveryFrame(BEAT.bounds, size, BOX_ASPECTS, { x: clearanceX, y: clearanceY });
const frameHeight = DELIVERY.frame.height;
const outDir = flag("--out", join(HERE, `plate-${size}`));
const dataPath = flag("--data", join(HERE, "places.json"));
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
  async ({ key, style, padding, styleDefinition, bounds, settleMs, width, height }) => {
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
    // uncorrected, MapTiler's `dataviz-dark` water is close enough to the land beside it to read as
    // a beat where the ocean is not covered by anything else.
    for (const id of ["Water", "Water shadow"])
      if (map.getLayer(id)) map.setPaintProperty(id, "fill-color", "#12212e");

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
  { key, style: BEAT.style, padding: DELIVERY.padding, styleDefinition: sealedStyle, bounds: BEAT.bounds, settleMs, width: size, height: frameHeight },
);

const frameCorners = frameCornersOf(gate.topLeft, gate.bottomRight);
const camera = cameraFacts(gate.zoom, frameCorners);
assertWorldFillsFrame(camera, size);
assertCameraReachesBounds(frameCorners, BEAT.bounds, size);
frameCoversTheBoxRange({ width: size, height: frameHeight }, DELIVERY.studySet, DELIVERY.boxAspects, DELIVERY.cannotCover);

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
