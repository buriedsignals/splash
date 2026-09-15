// The bake for the choropleth beat: one Europe camera, one MapTiler basemap in this direction's
// tints, and THE BEAT'S OWN PLAN mounted on top of it before the shutter.
//
// WHAT THIS FILE IS NOT ANY MORE. It used to hand-roll the whole thing — hide the basemap's symbol,
// line and texture layers inline, repaint water and land inline, screenshot, then project every
// country ring to pixel space for `geometry.json`. Every one of those now lives in `shared/map-beat`
// (`transformStyle`, `mountPlan`, `bakePlan`) because the spike demonstrated six times over that
// wiring recopied per beat drifts per beat. What is left here is what is genuinely local: finding
// Chrome, opening a page with MapLibre in it, parsing the CLI, and writing the camera facts.
//
// The projected rings are gone with the hand-rolled bake: nothing read them. The render script
// projects its own from `shapes.geojson`, and the plan carries geography in DEGREES.
//
// The plate is FROZEN BESIDE THE BEAT, for the same reason its data is: a basemap living in `/tmp`
// cannot be committed, so the delivered artifact could not be reproduced or audited — and MapTiler
// restyles, so a re-bake months later is a different picture under the same marks.
//
// THE SIZE COMES FROM THE PLAN. `--size` is OPTIONAL and is an assertion, not a setting: given, it
// must equal `plan.camera.drawn` or the bake refuses. See `drawnSizeFor` below for why the old
// shape — take `--size`, then overwrite the plan's own camera with it — made guard 5 unassertable.
//
// Usage:
//   bun proof/static-choropleth-europe-lowcarbon/bake.mjs \
//     --plan /tmp/creme.plan.json --water '#cedde1' --land '#f4f1e3' --out plate/creme

import { existsSync, readdirSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";
import { bakePlan, assertRangesServed, rangesNeededBy } from "#shared/map-beat/bake.mjs";
import { validateExpressions } from "#shared/map-beat/mount.mjs";
import { scrollyMapScript } from "#shared/map-beat/inline.mjs";
import { validatePlan } from "#shared/map-beat/plan.mjs";
import { assertNoDoubledBasemap } from "#shared/map-beat/style.mjs";
import { assertNotFallback, maptilerGlyphs, DEFAULT_RANGES } from "#shared/map-beat/glyphs.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

/** THE CAMERA HOLDS THE STUDY SET, and the study set reaches further east than a Europe-shaped box
 *  does: Cyprus sits at 33°E and Ukraine's eastern border at 40°. A bake that stopped at 33 cropped
 *  both, and `assertCameraReachesBounds` below is what turns that into a refusal rather than a plate
 *  nobody checked. Iceland at 24°W sets the west edge. */
/** EXPORTED so a caller deciding whether an already-baked plate is still current can compare what
 *  it recorded against what this bake would use TODAY, rather than keeping a second, driftable copy
 *  of the same window and style beside it. */
export const BEAT = {
  bounds: [
    [-25, 34],
    [42, 68],
  ],
  style: "dataviz-light",
};

/** THE PLAN IS A FILE, and comparing what a bake did with one against what it would do with another
 *  means comparing that file's own bytes. A digest of them is what `plate-cache.mjs` reads back: the
 *  plan carries the study shapes, every class fill, every placed word and every ink, so a plate
 *  whose plan has moved by one character is a plate that no longer draws what the beat declares. */
export async function digestOf(path) {
  const bytes = await Bun.file(path).arrayBuffer();
  return createHash("sha256").update(Buffer.from(bytes)).digest("hex");
}

const MAPLIBRE = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js";
const MAPLIBRE_CSS = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css";

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv[at + 1] : fallback;
};

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
 * Mercator world's own aspect over that range. @parity */
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

/** THE PLAN IS VALIDATED BY THE THING THAT MOUNTS IT, not only by the thing that wrote it.
 *
 *  `references/map-plan.md` §1 says `validatePlan` is the one function every renderer calls before
 *  it draws anything, and this bake is a renderer. It used to mount a plan it had never checked:
 *  `render-directions.mjs` validated the plan it BUILT, and the bake trusted the file. That holds
 *  only while the two are the same run — a plan reaching this CLI from a second beat, an older
 *  `--plan` file, or a hand edit would be mounted unvalidated, and every fault these guards catch
 *  (a duplicated layer id, a pair property assembled from two expressions, a layer that redraws the
 *  ground) is one MapLibre reports by drawing the wrong picture in silence.
 *
 *  Exported so the refusal itself is testable without a browser or a key. */
export function assertPlanIsRenderable(plan, where = "the plan handed to this bake") {
  const violations = [...validatePlan(plan), ...validateExpressions(plan)];
  if (violations.length)
    throw new Error(`${where} is not renderable:\n  ${violations.join("\n  ")}`);
  assertNoDoubledBasemap(plan);
  return plan;
}

/** GUARD 5 IS ASSERTED HERE OR IT IS ASSERTED NOWHERE.
 *
 *  The drawn size is a LAYOUT OUTPUT — `geometry.mjs` says so in its own header — and the plan is
 *  where the layout publishes it. This bake used to take it from `--size` instead and OVERWRITE
 *  `plan.camera.drawn` with it on the way into `bakePlan`, so the one guard whose whole purpose is
 *  "the bake happens at the size the layout published" could not fail: it compared the caller's
 *  number against the caller's own number. The two agreed only because `render-directions.mjs`
 *  happens to pass the same value twice; a second caller, or one flag edited by hand, would have
 *  baked a plate at a size nothing draws at and nothing would have said so.
 *
 *  So the PLAN decides, `--size` is optional, and a disagreement is a refusal rather than a silent
 *  preference for one of the two. `--size` is kept because it is what makes the disagreement
 *  visible: a caller that states a size is a caller asserting one, and an assertion that is wrong
 *  should stop the bake. */
export function drawnSizeFor(plan, sizeArg) {
  const drawn = plan?.camera?.drawn;
  if (!drawn?.width || !drawn?.height)
    throw new Error(
      "the plan carries no camera.drawn — the layout publishes the size a map is baked at, and " +
        "this bake reads it there. A plate baked at a size the component does not draw makes every " +
        "absolute length wrong by the ratio, invisibly.",
    );
  if (sizeArg === null || sizeArg === undefined) return { width: drawn.width, height: drawn.height };
  const [width, height] = String(sizeArg).split("x").map(Number);
  if (!Number.isFinite(width) || !Number.isFinite(height))
    throw new Error(`--size must be <width>x<height>, got ${JSON.stringify(sizeArg)}`);
  if (width !== drawn.width || height !== drawn.height)
    throw new Error(
      `--size says ${width}x${height} and the plan's camera.drawn says ${drawn.width}x${drawn.height}. ` +
        "These are two answers to one question and this bake will not pick between them: the drawn " +
        "size is what the LAYOUT published, so either the plan is stale or the flag is. Re-run the " +
        "beat, or drop --size and let the plan speak.",
    );
  return { width: drawn.width, height: drawn.height };
}

/** THE FACES THE PLAN ASKS FOR MUST BE THE FACES MAPTILER SERVES.
 *
 *  MapTiler answers 200 for a family it does not have and hands back Noto Sans, so a map that asks
 *  for a face nobody serves renders in a typeface nobody chose and nothing reports it. Measured on
 *  2026-09-13: `Open Sans` — the bare family name, with no face on the end — is byte-identical to
 *  the fallback, and so is `Open Sans SemiBold`; `Open Sans Medium` and `Open Sans Bold` are real.
 *  The control is a family that certainly does not exist, asked for with the SAME face suffix, so
 *  the italic fallback (Noto Sans Italic, a different file from the upright one) cannot slip past a
 *  probe that only ever compared against `Noto Sans Regular`. */
async function assertFacesServed(plan, key) {
  const faces = [...new Set(plan.layers.flatMap((l) => l.layout?.["text-font"] ?? []))];
  const words = plan.layers.flatMap((l) =>
    (l.data?.features ?? []).map((f) => f.properties?.name).filter((n) => typeof n === "string"),
  );
  const ranges = [...new Set([...DEFAULT_RANGES, ...rangesNeededBy(words)])];
  const served = [];
  for (const face of faces) {
    const suffix = face.split(" ").slice(1).join(" ") || "Regular";
    const fallback = await maptilerGlyphs(`Zzz Fictive ${suffix}`, "0-255", key);
    assertNotFallback(await maptilerGlyphs(face, "0-255", key), fallback, face);
  }
  /** A RANGE THAT IS NOT SERVED MAKES ITS CHARACTERS VANISH FROM THE WORD with no error at all, so
   *  every range the beat's own words reach is fetched and its body checked for bytes. */
  for (const range of ranges) {
    const bodies = await Promise.all(faces.map((face) => maptilerGlyphs(face, range, key)));
    if (bodies.every((b) => b.length > 0)) served.push(range);
  }
  assertRangesServed(words, served);
  return { faces, ranges: served, words: words.length };
}

/** THE ACTUAL BAKE, run only when this file is the entry point — never on import. `BEAT` and
 *  `digestOf` above are exported for a caller to compare against, and importing them must not also
 *  launch a browser and spend the MapTiler key. */
async function bake() {
  const sizeArg = flag("--size", null);
  const outDir = flag("--out", join(HERE, "plate"));
  const planPath = flag("--plan", null);
  const keyPath = flag("--env", join(HERE, "../../.env"));
  const styleName = flag("--style", BEAT.style);
  /** THE PLATE IS BAKED IN THE DIRECTION'S OWN TINTS, and that is what makes a MapTiler basemap
   *  compatible with a filed direction at all. `the-basemap-gives-up-its-contrast` cannot be
   *  satisfied by picking between two published styles: `dataviz-dark` paints dark land under a
   *  LIGHT blue sea, which on `nocturne`'s deep navy makes the water the loudest thing on the page.
   *  So the caller hands the water and land tints it derived from the direction, and the bake paints
   *  MapTiler's own geometry with them before the shutter. The geography is MapTiler's; the palette
   *  is the beat's. */
  const water = flag("--water", null);
  const land = flag("--land", null);
  if (!planPath) throw new Error("no --plan: this bake mounts the beat's plan, it does not invent one");
  if (!water || !land) throw new Error("no --water/--land: a plate is baked in the direction's own tints");

  const MAPTILER_KEY_ALIASES = ["MAPTILER_API_KEY", "REMOTION_MAPTILER_KEY", "VITE_MAPTILER_KEY"];
  const env = parseEnvFile(await readFile(keyPath, "utf8"));
  const key = env.MAPTILER_KEY ?? MAPTILER_KEY_ALIASES.map((a) => env[a]).find(Boolean);
  if (!key) throw new Error(`no MAPTILER_KEY in ${keyPath}`);

  const plan = JSON.parse(await readFile(planPath, "utf8"));
  assertPlanIsRenderable(plan, planPath);
  const { width, height } = drawnSizeFor(plan, sizeArg);

  /** THE STYLE IS A DOCUMENT HERE AND A NAME EVERYWHERE ELSE. `transformStyle` has to REWRITE the
   *  style — hide the basemap's own labels and lines, repaint water and land — and MapLibre offers
   *  no way to do that to a style it fetched by URL: `glyphs` has no setter, and `setStyle` would
   *  restart the style and carry away every layer just mounted. So the plan carries `{ name }`,
   *  which is serialisable and key-free, and the fetch happens HERE, in the one place that already
   *  reads the key. The style's own `glyphs` endpoint travels with it. */
  const styleRes = await fetch(`https://api.maptiler.com/maps/${styleName}/style.json?key=${key}`);
  if (!styleRes.ok) throw new Error(`MapTiler refused the ${styleName} style: ${styleRes.status}`);
  const styleDoc = await styleRes.json();

  const served = await assertFacesServed(plan, key);

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: resolveChrome(),
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox", "--hide-scrollbars"],
  });
  const page = await browser.newPage();
  await page.setContent(
    `<!doctype html><html><head>
<link href="${MAPLIBRE_CSS}" rel="stylesheet"/>
<script src="${MAPLIBRE}"></script>
<style>html,body{margin:0;padding:0}#map{width:${width}px;height:${height}px}</style>
</head><body><div id="map"></div></body></html>`,
    { waitUntil: "load" },
  );
  await page.waitForFunction("window.maplibregl !== undefined", { timeout: 60000 });
  /** `mountPlan` runs INSIDE the page, so the trunk's own source has to reach the browser. It does not
   *  stand alone — it calls `sourceIdOf`, `beforeIdFor`, `radiusPaintOf` and the style sweep — so its
   *  own `toString()` threw `sourceIdOf is not defined` in the page. The trunk is injected whole, as
   *  the scrolly pilot's bake page does, and never reimplemented here. */
  await page.addScriptTag({ content: `${await scrollyMapScript()}\nwindow.__mountPlan = mountPlan;` });

  await mkdir(outDir, { recursive: true });
  const platePath = join(outDir, "plate.png");
  const started = Date.now();
  const { camera: read } = await bakePlan({
    page,
    /** The camera travels UNTOUCHED. Only the style is swapped for the document fetched above —
     *  overwriting `camera.drawn` here is exactly what made guard 5 unassertable. */
    plan: { ...plan, style: styleDoc },
    glyphsUrl: styleDoc.glyphs,
    tints: { water, land },
    keepLabels: [],
    outPath: platePath,
  });
  await browser.close();

  const frameCorners = read.frameCorners;
  const facts = cameraFacts(read.zoom, frameCorners);
  assertWorldFillsFrame(facts, width);
  assertCameraReachesBounds(frameCorners, BEAT.bounds, width);

  const geometry = {
    frame: { width, height },
    bounds: BEAT.bounds,
    style: styleName,
    water,
    land,
    planDigest: await digestOf(planPath),
    zoom: Math.round(read.zoom * 1000) / 1000,
    frameCorners,
    worldWidthPx: facts.worldWidthPx,
    degreesPerPixel: facts.degreesPerPixel,
    metresPerPixel: facts.metresPerPixel,
  };
  const geometryPath = join(outDir, "geometry.json");
  await writeFile(geometryPath, JSON.stringify(geometry));

  console.log(
    `baked in ${Date.now() - started}ms · ${plan.layers.length} plan layers · zoom ${geometry.zoom}\n` +
      `faces served: ${served.faces.join(", ")} · ranges ${served.ranges.join(", ")} over ${served.words} words\n` +
      `plate    → ${platePath}\n` +
      `geometry → ${geometryPath}`,
  );
}

if (import.meta.main) await bake();
