// stories/r8-map-static-honey-yields/beats/1-honey-yield-2025/bake-plate.mjs
//
// ONE bake for this beat: one camera over the lower forty-eight states, one basemap capture, one
// file of pixel-space rings. Copied from `skills/map-beat/scripts/bake-plate.mjs`; every shared
// function is byte-identical to the seed's and `splash/test/bake-parity.test.ts` walks it.
//
// geo-discipline.md rules 1, 2, 3, 4, 6, 9, 11 and 12 — the same list the seed's own bake states.
//
// ONE THING IS THIS BEAT'S OWN, AND IT IS A DEFECT IN THE SEED, NOT A PREFERENCE. The seed takes
// `--size` and uses it for BOTH the frame's width and its height, so it can only ever bake a
// SQUARE plate. Rule 12's second clause says the camera takes three inputs — the geography, the
// study set and the target aspect — and a square-only bake takes one. The continental United
// States projects to an aspect of 1.77 (58.6 degrees of longitude against 25.4 of latitude at this
// centre); baked square it would spend 44 per cent of its own pixels on Hudson Bay and the Gulf of
// Mexico, and the beat would then have to crop by hand what the camera should never have taken.
// So this copy takes `--height` as well, defaulting to `--size` so the seed's own invocation is
// unchanged. Reported in NOTES-FOR-MAINTAINER.md.
//
// Usage:
//   bun stories/r8-map-static-honey-yields/beats/1-honey-yield-2025/bake-plate.mjs \
//     --shapes ./states.geojson --size 1188 --height 656 --out ./plate

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { isAbsolute, join } from "node:path";
import puppeteer from "puppeteer-core";
import { splashEnvPath } from "./splash-root.mjs";
import {
  HONEY_STUDY,
  LIGHT_PLATE_LAND_WATER_SEPARATION,
  deltaE76,
  waterTintFor,
  assertStageServesGeography,
  extentFacts,
  keepRing,
  simplifyRing,
  studyExtentOf,
} from "./geo-honey.ts";
import { decodePng } from "./compare-png.mjs";

/** MapTiler `dataviz-dark`'s own land fill, MEASURED off a first capture of this exact camera at
 *  three inland points (Kansas, Maine, Texas), all three `#292929`. It is declared here rather than
 *  read out of the style because the derivation has to happen BEFORE the capture — and it is
 *  CHECKED after the capture (`assertPlateSeparatesWaterFromLand`, below) against the pixels that
 *  were actually written, so a style change moves the plate and the check goes red rather than the
 *  water quietly going back to grey. */
const PLATE_LAND = "#292929";

/** Rule 7's blue tint, derived for THIS plate rather than taken as a light-plate constant. */
const WATER_TINT = waterTintFor(PLATE_LAND);

/** Two coordinates whose pixels are sampled out of the finished plate: one unambiguously ocean
 *  (the central Gulf of Mexico) and one unambiguously inland (the geographic centre of the lower
 *  forty-eight, in Kansas). Coordinates, not pixels, so they follow the camera. */
const PROBES = { water: [-90.0, 25.5], land: [-98.5, 39.5] };

/** The beat's camera and its anchors — the journalist's frame, not a default. */
const BEAT = {
  // The lower forty-eight, corner to corner: Cape Flattery in the north-west, the Florida Keys in
  // the south, Maine's eastern tip. Alaska and Hawaii are deliberately outside the frame AND
  // outside the study set, and STORYBOARD.md's `limits` says so — both are among the states USDA
  // does not report separately, so the frame hides no reading it could have shown.
  bounds: [
    [-125.2, 24.2],
    [-66.6, 49.6],
  ],
  // A DARK style, because PALETTE.md records a #16191B ground. `plateFollowsGround`
  // (map-beat/scripts/verify-map.mjs) refuses the two-sided disagreement — a charcoal beat over a
  // pale basemap is the delivered-route defect that guard was written for.
  style: "dataviz-dark",
  anchors: {
    // Mississippi's own centre, where the subject's outline is pointed at.
    subject: [-89.7, 32.75],
    // Where its label hangs: south-east of the state, over the Gulf, which is the only empty ground
    // this camera holds near the subject. A coordinate, not a pixel constant, so the layout moves
    // when the camera does.
    label: [-87.1, 28.2],
  },
};

const MAPLIBRE = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js";
const MAPLIBRE_CSS = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css";

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv[at + 1] : fallback;
};

const size = Number(flag("--size", "620"));
// THIS BEAT'S OWN, and the seed has no equivalent: the frame's height, defaulting to `--size` so a
// caller that passes only `--size` gets exactly the seed's square plate. See the header.
const height = Number(flag("--height", String(size)));
const outDir = flag("--out", `/tmp/map-twin/plate-${size}`);
const shapesPath = flag("--shapes", null);

/** WHERE THE COUNTRY SHAPES COME FROM — and the answer is "not from this tree", said out loud.
 *
 *  This flag used to default to `/tmp/map-twin/ne50.geojson`. No script in this tree writes that
 *  file, and nothing in this toolchain acquires country geography at all, so the default was a path
 *  that is never there: the bake failed at the wrong moment, with the wrong message — a bare
 *  `ENOENT … open '/tmp/map-twin/ne50.geojson'` raised by `readFile` far below, AFTER the Splash
 *  root had been resolved and the journalist's MapTiler key read, and on a machine that has a key,
 *  after Chrome had been launched. That reads like a broken install. What is actually true is that
 *  the geography has not been acquired yet, and a bake cannot acquire it: Natural Earth is ~20 MB of
 *  public-domain GeoJSON that has no business being committed to a skill.
 *
 *  So the acquisition stays the producer's, and what the toolchain owes back is a REFUSAL IT CAN
 *  ACT ON — what is missing, the command that gets it, and the flag to point at the result. Stated
 *  HERE, beside the flag, so it costs no key and no browser; a refusal that arrives after a 15 s
 *  settle is a refusal the producer pays for twice.
 *
 *  1:50m, not 1:110m, and the difference is measured: at 1:110m a world beat lost 64 readings to
 *  shapes that do not exist in that file; at 1:50m it lost 8 (`map-web/SKILL.md`, "Producing a
 *  choropleth", step 1). */
const NATURAL_EARTH_50M =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson";

function refuseTheMissingGeography(path) {
  const acquire =
    `Acquire it once, beside the beat, and freeze it there:\n` +
    `  curl -sSo ./countries.geojson \\\n    ${NATURAL_EARTH_50M}\n` +
    `then re-run this bake with --shapes ./countries.geojson (1:50m, never 1:110m: at 1:110m a ` +
    `world beat loses 64 readings to shapes that file does not carry, against 8 at 1:50m). Trim it ` +
    `to the shapes the beat declares and simplify it before baking.`;
  if (path == null)
    throw new Error(
      `this bake needs country shapes and nothing in this toolchain acquires them: pass --shapes ` +
        `<file.geojson>. There is no default, because the default used to be ` +
        `/tmp/map-twin/ne50.geojson and no script in this tree has ever written it.\n${acquire}`,
    );
  if (!existsSync(path))
    throw new Error(
      `--shapes ${path} is not there, so there is no geography to bake.\n${acquire}`,
    );
}

refuseTheMissingGeography(shapesPath);
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

// A DUPLICATE of splash's own key-alias resolution (`scripts/keys.mjs`'s `KEY_ALIASES` /
// `resolveEnvKey`), not an import — a skill directory has to stay copy-pasteable on its own (see
// `../assets/geo.ts`'s own header, or `storyboard/scripts/capability-gap.mjs`, for the same
// rule applied elsewhere in this branch). The sibling engine (splash's own skills/map-native,
// skills/dw-chart) reads the map key under these names, not this project's own `MAPTILER_KEY` —
// measured in that repository's own scripts, not guessed. A newsroom whose engine `.env` already
// works should not have to keep a second copy of the key under a different name just for this
// toolchain. Canonical name wins when both happen to be set — read it first, fall back to each
// alias in order, never the reverse.
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

// B4.1's stage decision, taken BEFORE the camera because it is an input to it and not a report on
// it. Web Mercator's world is square: a frame taller than `width * 360 / lonSpan` never gets the
// longitude it asked for, whatever `fitBounds` is told, because MapLibre will not zoom out past the
// point where the world still fills the canvas vertically. This bake is square, so at 59° it costs
// nothing — it is here so that the day this beat is asked for a 1080x1920 story the refusal names
// the stage that works instead of silently delivering 203° of world.
assertStageServesGeography(size, height, BEAT.bounds[1][0] - BEAT.bounds[0][0]);

const env = sealed ? {} : parseEnvFile(await readFile(keyPath, "utf8"));
const sealedStyle = sealedStylePath ? JSON.parse(await readFile(sealedStylePath, "utf8")) : null;
const key = sealedStyle
  ? null
  : sealed
    ? process.env.MAPTILER_KEY ?? ""
    : env.MAPTILER_KEY ?? MAPTILER_KEY_ALIASES.map((alias) => env[alias]).find(Boolean);
if (!key && !sealedStyle) {
  if (sealed) throw new Error("sealed MapTiler bake did not receive MAPTILER_KEY from Engine");
  throw new Error(`no MAPTILER_KEY (or alias: ${MAPTILER_KEY_ALIASES.join(", ")}) in ${keyPath}`);
}

// ── The shapes, keyed the way Natural Earth actually keys them ─────────────────────────────────
//
// THE SECOND THING THIS COPY CHANGES, and it is the same class as `--height`. The seed reads
// `feature.properties.ADM0_A3` as a LITERAL, so it can bake admin-0 country shapes and nothing
// else. `geo-discipline.md` rule 5 is right that ADM0_A3 and not ISO_A3 is the country key — and
// it is silent about the fact that a subnational geography has no ADM0_A3 at all. Natural Earth's
// `ne_50m_admin_1_states_provinces` keys a United States state by `postal` (`iso_3166_2` says the
// same thing as `US-XX`; `adm1_code` matches nothing a publisher writes). So the key is a flag,
// defaulting to the seed's own literal. Reported in NOTES-FOR-MAINTAINER.md.
const shapeKey = flag("--key", "ADM0_A3");
const collection = JSON.parse(await readFile(shapesPath, "utf8"));
const byKey = new Map();
for (const feature of collection.features) {
  byKey.set(feature.properties[shapeKey], feature);
}
const missingShapes = HONEY_STUDY.filter((code) => !byKey.has(code));
if (missingShapes.length > 0)
  throw new Error(
    `${missingShapes.length} declared shapes have no geometry under "${shapeKey}": ` +
      `${missingShapes.join(", ")}. The file carries ${collection.features.length} features, ` +
      `whose first one keys ${JSON.stringify(Object.keys(collection.features[0]?.properties ?? {}).slice(0, 12))}.`,
  );

/** MultiPolygon and Polygon both become a flat list of rings; holes are rings too. */
function ringsOf(geometry) {
  const polygons = geometry.type === "MultiPolygon" ? geometry.coordinates : [geometry.coordinates];
  return polygons.flat();
}

const payload = HONEY_STUDY.map((code) => {
  const feature = byKey.get(code);
  return {
    key: code,
    name: feature.properties.NAME_FR ?? feature.properties.NAME,
    rings: ringsOf(feature.geometry),
  };
});

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
const page = await browser.newPage();
await page.setViewport({ width: size, height, deviceScaleFactor: 2 });
if (sealed) {
  await page.setContent(
    `<!doctype html><html><head>
<style>html,body{margin:0;padding:0}#map{width:${size}px;height:${height}px}</style>
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
<style>html,body{margin:0;padding:0}#map{width:${size}px;height:${height}px}</style>
</head><body><div id="map"></div></body></html>`,
    { waitUntil: "load" },
  );
}
await page.waitForFunction("window.maplibregl !== undefined", { timeout: 60000 });

const gate = await page.evaluate(
  async ({ key, style, styleDefinition, bounds, settleMs, width, height, waterTint, probes }) => {
    const map = new maplibregl.Map({
      container: "map",
      style: styleDefinition ?? `https://api.maptiler.com/maps/${style}/style.json?key=${key}`,
      interactive: false,
      attributionControl: false,
      fadeDuration: 0,
      // Without this the WebGL canvas is empty by the time a screenshot reads it (rule 6).
      preserveDrawingBuffer: true,
      bounds,
      fitBoundsOptions: { padding: 0, animate: false },
    });
    window.__map = map;
    await new Promise((resolve) => map.once("style.load", resolve));

    // Rule 9: quiet the plate. Every place label, road label and boundary line the provider ships
    // is a layer doing none of the five jobs here — and an unlabelled dark region is the only way a
    // map stays discreet about a country the prose has already named.
    const hidden = [];
    for (const layer of map.getStyle().layers)
      if (layer.type === "symbol" || /border|boundary|admin/i.test(layer.id)) {
        map.setLayoutProperty(layer.id, "visibility", "none");
        hidden.push(layer.id);
      }

    // Rule 7: water reads as a BLUE TINT, never grey. The seed's own bake omits this line, and on
    // `dataviz-dark` the provider paints water #141414 against land #292929 — two neutral greys
    // 10.27 ΔE76 apart, which is the failure mode rule 7 exists to prevent, arriving from the dark
    // side. The value is derived in node (`waterTintFor`) and handed in.
    const tinted = [];
    for (const id of ["Water", "Water shadow", "River", "River labels"])
      if (map.getLayer(id)) {
        const type = map.getLayer(id).type;
        if (type === "fill") map.setPaintProperty(id, "fill-color", waterTint);
        if (type === "line") map.setPaintProperty(id, "line-color", waterTint);
        tinted.push(id);
      }

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
      tinted,
      probePixels: Object.fromEntries(
        Object.entries(probes).map(([name, lngLat]) => [name, map.project(lngLat)]),
      ),
      zoom: map.getZoom(),
      center: map.getCenter(),
      topLeft: map.unproject([0, 0]),
      bottomRight: map.unproject([width, height]),
    };
  },
  {
    key,
    style: BEAT.style,
    styleDefinition: sealedStyle,
    bounds: BEAT.bounds,
    settleMs,
    width: size,
    height,
    waterTint: WATER_TINT,
    probes: PROBES,
  },
);

const frameCorners = frameCornersOf(gate.topLeft, gate.bottomRight);
const camera = cameraFacts(gate.zoom, frameCorners);
assertWorldFillsFrame(camera, size);
assertCameraReachesBounds(frameCorners, BEAT.bounds, size);

await mkdir(outDir, { recursive: true });
const platePath = join(outDir, "plate.png");
await page.screenshot({ path: platePath, clip: { x: 0, y: 0, width: size, height } });

/** THE CHECK THAT OBSERVES ITS OWN FAILURE. The tint above is derived from a land colour this file
 *  DECLARES, so a style revision would move the land and leave the derivation pointing at a colour
 *  that is no longer on the plate — a coast that quietly went back to grey, which is exactly the
 *  silence rule 7 is about. So the finished PNG is decoded and two pixels are read out of it: the
 *  central Gulf of Mexico and the geographic centre of the lower forty-eight. Both must be what
 *  this bake asked for, and they must be at least as far apart as the light plate's own land and
 *  water already are. */
function assertPlateSeparatesWaterFromLand(png, probePixels, scale) {
  const at = ({ x, y }) => {
    const i = (Math.round(y * scale) * png.width + Math.round(x * scale)) * 4;
    return `#${[png.data[i], png.data[i + 1], png.data[i + 2]].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
  };
  const water = at(probePixels.water);
  const land = at(probePixels.land);
  const separation = deltaE76(water, land);
  if (land !== PLATE_LAND)
    throw new Error(
      `this plate's land reads ${land} where this bake derived its water tint from ${PLATE_LAND}. ` +
        `The style has moved under the derivation; re-measure the land and re-derive.`,
    );
  if (separation < LIGHT_PLATE_LAND_WATER_SEPARATION)
    throw new Error(
      `this plate's water (${water}) is ${separation.toFixed(2)} ΔE76 from its land (${land}), ` +
        `under the ${LIGHT_PLATE_LAND_WATER_SEPARATION} the light plate already reaches — ` +
        `geo-discipline.md rule 7: a reader cannot find the coast.`,
    );
  return { water, land, separation };
}

const separation = assertPlateSeparatesWaterFromLand(
  decodePng(readFileSync(platePath)),
  gate.probePixels,
  2,
);
console.log(
  `water    → tinted ${gate.tinted.length} layer(s) to ${WATER_TINT}; the finished plate reads ` +
    `water ${separation.water} against land ${separation.land}, ${separation.separation.toFixed(2)} ΔE76 ` +
    `(the light plate's own pair reaches ${LIGHT_PLATE_LAND_WATER_SEPARATION}).`,
);

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
const frame = { width: size, height };
const minGap = 0.6;
let ringsIn = 0;
let ringsOut = 0;
let pointsIn = 0;
let pointsOut = 0;

// The study set's own footprint, in lon/lat. NOT `BEAT.bounds` — that is a box somebody typed and
// tuned by eye until the fit matched it, which is why all eleven point beats in this tree report an
// admitted ratio of ~1.00 against their own bounds and x1.15 to x2.46 against their own data.
//
// WHICH VERTICES, and why this beat answers it differently from a point beat. A point beat measures
// its WHOLE catalogue, so a ratio below 1 is a crop it must disclose (`map-quake-density`: x0.718,
// its 104 poleward events). A polygon beat cannot: Natural Earth's Russia reaches Kamchatka and its
// France reaches French Guiana, and rule 11 culls both — measured here, taking every vertex of every
// kept ring gives x0.164, a number dominated entirely by territory this beat has never claimed to
// show. So this bake measures the footprint the frame DRAWS, and the ratio answers the question a
// journalist actually asks of a choropleth: how much of what I am showing is not my subject.
const drawnVertices = [];
const insideFrame = (lon, lat) => {
  const wrapped = lon < frameCorners.west ? lon + 360 : lon;
  return (
    wrapped >= frameCorners.west &&
    wrapped <= frameCorners.east &&
    lat >= frameCorners.south &&
    lat <= frameCorners.north
  );
};

const shapes = projected.map((shape, shapeIndex) => {
  const rings = [];
  for (const [ringIndex, ring] of shape.rings.entries()) {
    ringsIn++;
    pointsIn += ring.length;
    if (!keepRing(ring, frame)) continue;
    for (const [lon, lat] of payload[shapeIndex].rings[ringIndex])
      if (insideFrame(lon, lat)) drawnVertices.push({ lon, lat });
    const thin = simplifyRing(ring, minGap);
    ringsOut++;
    pointsOut += thin.length;
    rings.push(thin);
  }
  return { key: shape.key, name: shape.name, rings };
});

// A DECLARED shape with nothing left to draw is the camera cropping the study set, and until now
// this bake counted it into a `console.log` and carried on — the same shape as the four bakes that
// count their off-frame points and never assert on them, which is how `map-quake-density` ships a
// green bake that drops 104 events. `assertCameraReachesBounds` cannot see it: it compares the frame
// against `BEAT.bounds`, a box somebody typed, and a box that already excludes a country passes by
// construction. This is the same question asked of the STUDY SET, which is what `HONEY_STUDY` is.
const empty = shapes.filter((s) => s.rings.length === 0).map((s) => s.key);
if (empty.length > 0)
  throw new Error(
    `this camera crops ${empty.length} of the ${HONEY_STUDY.length} shapes this beat declares, entirely: ` +
      `${empty.join(", ")}. The frame shows ${frameCorners.west.toFixed(2)}°..${frameCorners.east.toFixed(2)}° / ` +
      `${frameCorners.south.toFixed(2)}°..${frameCorners.north.toFixed(2)}°. Either widen the camera, or drop them ` +
      `from the study set and say so — a declared shape that renders as nothing looks exactly like a shape ` +
      `the source is silent about.`,
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
  // B4.1: which rung of the ladder this camera sits on, how much ground it covers, how much
  // Mercator distorts inside it, and how much more geography the fit admitted than the subject
  // occupies. Every one of these was already implied by numbers the plate recorded and none of them
  // was ever written down, so every downstream size decision re-guessed it as a pixel constant.
  extent: extentFacts(frameCorners, studyExtentOf(drawnVertices, frameCorners.west)),
  anchors,
  shapes,
};
const geometryPath = join(outDir, "geometry.json");
await writeFile(geometryPath, JSON.stringify(geometry));

console.log(
  `gated by ${gate.how} in ${gate.ms}ms · hid ${gate.hidden} basemap layers · zoom ${geometry.zoom}\n` +
    `extent   → ${geometry.extent.band} (${Math.round(geometry.extent.groundWidthKm)} km across), admitted ` +
    `x${geometry.extent.admittedLonRatio} lon / x${geometry.extent.admittedLatRatio} lat beyond the drawn ` +
    `subject, Mercator area bias x${geometry.extent.mercatorAreaBias}\n` +
    `plate    → ${platePath}\n` +
    `geometry → ${geometryPath}  ${ringsOut}/${ringsIn} rings, ${pointsOut}/${pointsIn} points\n` +
    `off-frame entirely: ${empty.length ? empty.join(", ") : "none"}`,
);
