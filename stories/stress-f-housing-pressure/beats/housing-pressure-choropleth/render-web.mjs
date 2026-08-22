// stories/stress-f-housing-pressure/beats/housing-pressure-choropleth/render-web.mjs
//
// This beat's own third rung — the same role `map-web/scripts/render-web.mjs` plays for the
// symbol-map format: bakes/loads the plate, joins the frozen csv to the shapes, checks the claim
// against the ACTUAL joined values (not just asserting the title is true), and turns the result
// into ONE self-contained HTML file — one fluid SVG (geometry only) plus its HTML overlay and HTML
// furniture, the always-rendered accessible table, one inlined interaction script, and — since
// ruling R1 (2026-08-10) — the live MapTiler layer that makes this a map a reader can move through
// instead of a picture.
//
// WHAT CHANGED ON 2026-08-10, and both halves are one change:
//   - R1: the page ships `live-map.mjs` (a byte-identical copy of the format's own boot script, in
//     this folder), maplibre-gl inlined, and a PLAN describing this beat's own layers. The baked
//     plate is still shipped, as the fallback layer. `KEY_PLACEHOLDER` below is R1b: the key never
//     enters the repository.
//   - B5.1: the two-rung `layouts` API is gone. There is no `WebLayout`, no `measureText`, no
//     media-query swap between two SSR'd frames — one fluid render, and `buildCss` gives the map
//     whatever height the window has left. Measured before: 1705px of page in a 900px window.
//
// `renderMapWeb` below is this beat's own copy of the format's generic machinery (nothing here
// imports across proof/ beats or out of a skill); everything under the CONFIG block is this SEED
// beat's own words, data paths and claim.
//
// Usage:  bun stories/stress-f-housing-pressure/beats/housing-pressure-choropleth/render-web.mjs [outDir]

import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { deriveFurniture } from "./render-still.mjs";
// `readPalette` comes from the SHARED copy through the `#shared/…` subpath alias — a beat is a
// story, not a skill, so it may reach out where a skill may not.
import { readPalette } from "#shared/chart-beat/render-still.mjs";
import {
  ChoroplethWeb,
  RegionTable,
  choroplethSurfaces,
  fillFor,
  regionDetail,
  HIT_TARGET_PX,
} from "./ChoroplethWeb.tsx";
import {
  HOUSING_STUDY,
  PRESSURE_BREAKS,
  bboxCenter,
  boundingBoxOf,
  joinShapes,
  joinValues,
  luminanceOf,
  keepRing,
  valuesFromCsv,
} from "./geo-choropleth.ts";

/**
 * RFC 4180 row tokeniser, inlined here rather than imported — no cross-skill runtime import, and
 * a proof/story workspace is not a skill either. A naive comma split corrupts a quoted thousands
 * separator ("1,234.5") or a quoted name carrying its own comma ("Netherlands, the"); this walks
 * the text one character at a time instead. Returns one array of raw field strings per row
 * (header included), quotes stripped, doubled quotes un-escaped, and a lone CR or CRLF closing a
 * row the same way LF does.
 */
function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  let i = 0;
  while (i < text.length) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        quoted = false; i += 1; continue;
      }
      field += char; i += 1; continue;
    }
    if (char === '"') { quoted = true; i += 1; continue; }
    if (char === ",") { row.push(field); field = ""; i += 1; continue; }
    if (char === "\r") { row.push(field); rows.push(row); row = []; field = ""; i += (text[i + 1] === "\n") ? 2 : 1; continue; }
    if (char === "\n") { row.push(field); rows.push(row); row = []; field = ""; i += 1; continue; }
    field += char; i += 1;
  }
  if (field !== "" || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

const HERE = dirname(fileURLToPath(import.meta.url));
// Resolved through node's own module resolution, never by a relative path out of this beat.
// `no-cross-skill-imports.test.ts` reads path STRINGS, not just import statements, and a literal
// `../../node_modules/...` reads to it — correctly — as a specifier leaving the beat. A package
// name is the honest way to say "this comes from a dependency", and it is what a copy-pasted beat
// with its own `bun install` would resolve too.
const requireFrom = createRequire(import.meta.url);
const MAPLIBRE_JS = requireFrom.resolve("maplibre-gl/dist/maplibre-gl.js");
const MAPLIBRE_CSS = requireFrom.resolve("maplibre-gl/dist/maplibre-gl.css");

// ===== CONFIG — this beat's own words, data and claim =====
// The title and the alt text are NOT here: both state how many countries the map carries, and the
// alt states the two extreme readings and the class boundaries as well. All of those are products
// of the join this script performs, so they are built in `render()` from the joined rows — see
// `claimSentences`. Typed here, "41 countries" would have kept its wording after a code was added
// to `HOUSING_STUDY` and the map drew 42. The two country NAMES stay in the wording because
// `checkClaim` already refuses to render if either stops being the extreme it is named as.
// The colours are READ, not typed — see `PALETTE.md` beside this file. The class shading is
// this map's data, so the accent reaches the ramp and not only the subject outline.
const PALETTE = readPalette(HERE, { stopAt: join(HERE, "../../../..") });
console.log(
  `palette from ${PALETTE.source} — ground ${PALETTE.ground}, accent ${PALETTE.accent}, ` +
    `chosen by ${PALETTE.origin}`,
);

const SEED = {
  ground: PALETTE.ground,
  accent: PALETTE.accent,
  source: "Source: national statistics offices, household survey (share of households spending over 40% of income on housing)",
  basemapCredit: "shapes: Natural Earth 1:50m Admin 0 Countries · basemap © MapTiler, © OpenStreetMap",
  caveat:
    "Malta's figure comes from a different survey and is not directly comparable with the other seven readings; it is included because the statistics office publishes it in the same table, and it takes this map's top class alone.",
  // Ruling R1: map × web is a LIVE MapTiler map. Set this false for a beat that must stay
  // request-free (an offline archive, a CMS with a Content-Security-Policy that refuses
  // api.maptiler.com) — the page then ships as the fallback layer alone, which is exactly what it
  // was before the ruling.
  live: true,
  // This beat's article and takeaway are English throughout — see `assertRecordedLanguage`, above.
  language: "en",
};
const PLATE_SIZE = 496;
// FROZEN BESIDE THE BEAT, for the same reason readPalette walks up to the story: a basemap living
// in `/tmp` cannot be committed, so the delivered html could not be reproduced or audited — and
// MapTiler restyles, so a re-bake months later is a different picture under the same shapes.
// `ensurePlate` below bakes only when this folder is empty. The VALUES themselves are never copied
// beside this beat — `DEFAULT_VALUES_PATH` reads the story's own frozen `source/data.csv` directly,
// the same pattern `stories/heat-pump-adoption-across-europe`'s own beat follows.
const DEFAULT_PLATE_DIR = join(HERE, "plate");
const DEFAULT_VALUES_PATH = join(HERE, "../../source/data.csv");
const DEFAULT_SHAPES_PATH = join(HERE, "countries.geojson");
const DEFAULT_OUT_DIR = join(HERE, "renders");
const OUTPUT_NAME = "housing-pressure-choropleth.html";
const SUBJECT_KEY = "MLT";
const COMPARISON_KEY = "SWE";
// Trap 2: the statistics office's own code for Kosovo (`XKX`) is not this tree's mapping
// convention (`KOS`, Natural Earth's `ADM0_A3`) — the article says so explicitly. Aliased at the
// value-side join, never at the shape side: this beat's declared study set already names `KOS`.
const CODE_ALIAS = { KOS: "XKX" };
// Trap 3: Greenland (`GRL`) is a value the source table carries with no shape in this study's
// declared set — declared here, by name, as ground the source legitimately covers that this study
// does not claim, rather than silently dropped or silently aliased in.
const OUT_OF_SCOPE_VALUES = ["GRL"];
// =========================================

/**
 * R1b — THE KEY NEVER ENTERS THE REPOSITORY. R1 accepted the key being visible to a reader of a
 * published article; it did not accept an unbounded public leak, and the two are different
 * exposures. Every map × web beat commits its rendered HTML, and the FJM deliverable is an MIT
 * open-source release, so a real key here would be scanned by bots within minutes of the push and
 * would survive in the history after any later removal. `deliver` substitutes the real key at
 * the moment the file goes to a newsroom; `splash/test/no-key-in-the-repository.test.ts`
 * reddens if one ever reaches a tracked file.
 *
 * The delivered key should be a SECOND, origin-restricted MapTiler key, not the development one:
 * MapTiler's documented mitigation for a client-side key is Allowed HTTP origins, enforced
 * server-side, and an account's DEFAULT key cannot be restricted — a dedicated one has to be
 * created (docs.maptiler.com/cloud/api/authentication-key/).
 */
export const KEY_PLACEHOLDER = "__MAPTILER_KEY__";

/**
 * Reads the ACTUAL joined values and checks the claim against them — never just asserts the title
 * is true. Throws, loudly, naming exactly what failed, the same way
 * `map-beat/assets/geo.ts`'s own `claimViolations` does for its own story.
 *
 * `values` here is the STUDY-SCOPED joined map (`rows`, built after `joinValues` has already
 * resolved the `KOS`/`XKX` alias and excluded `GRL`) — never the raw csv's own codes — so the
 * extremes this function names are the extremes of the eight countries this map actually draws,
 * under the keys this beat's own study set declares.
 */
export function checkClaim(values) {
  const violations = [];
  const entries = [...values.entries()];
  const [maxKey, maxValue] = entries.reduce((a, b) => (b[1] > a[1] ? b : a));
  const [minKey, minValue] = entries.reduce((a, b) => (b[1] < a[1] ? b : a));

  if (maxKey !== SUBJECT_KEY)
    violations.push(
      `the claimed subject is ${SUBJECT_KEY}, but the actual maximum of the ${entries.length} joined values is ${maxKey} (${maxValue})`,
    );
  if (minKey !== COMPARISON_KEY)
    violations.push(
      `the claimed comparison is ${COMPARISON_KEY}, but the actual minimum of the ${entries.length} joined values is ${minKey} (${minValue})`,
    );

  const subject = values.get(SUBJECT_KEY);
  const comparison = values.get(COMPARISON_KEY);
  if (subject === undefined || comparison === undefined)
    throw new Error(`cannot check the claim: no joined value for ${SUBJECT_KEY} or ${COMPARISON_KEY}`);

  if (violations.length > 0)
    throw new Error(`claim check failed:\n  ${violations.join("\n  ")}`);

  return {
    subject: { key: maxKey, value: maxValue },
    comparison: { key: minKey, value: minValue },
  };
}

/**
 * Every figure a reader receives, written from the joined rows rather than typed beside them: how
 * many countries were actually drawn, how many classes `PRESSURE_BREAKS` cuts and where its ends
 * sit, and the two extreme readings `checkClaim` has just pinned. No "X times higher" multiplier —
 * the subject's own reading is drawn from a different survey (the caveat says so), so a ratio
 * against it would state a precision the two numbers do not share.
 */
export function claimSentences({ count, breaks, claim, names, ramp }) {
  const nameOf = (key) => names.get(key) ?? key;
  // WHICH END OF THE RAMP IS DARK IS A FACT ABOUT THE PALETTE, not a word to be typed.
  //
  // The alt text used to say the top class was "the darkest" and the bottom "the lightest". That is
  // true of a ramp drawn on a WHITE ground, which is what this file was copied from; this story
  // records `#16191B` (relative luminance 0.009), and its ramp CLIMBS — measured on the rendered
  // page, the top class is 0.381 against a first class of 0.071, so the sentence a screen-reader
  // read out named the wrong end of the legend for every reading on the map. Read off the ramp
  // that is actually painted, the words cannot disagree with it again.
  const climbs = luminanceOf(ramp[ramp.length - 1]) > luminanceOf(ramp[0]);
  const [topShade, bottomShade] = climbs
    ? ["lightest", "darkest"]
    : ["darkest", "lightest"];
  const pct = (v) => v.toFixed(0);
  const subjectName = nameOf(claim.subject.key);
  const comparisonName = nameOf(claim.comparison.key);
  const title =
    `${subjectName}'s reported housing-cost burden, at ${pct(claim.subject.value)}%, towers over ` +
    `the ${count} countries on this map — but the figure is not directly comparable`;
  const legendCaption = `Share of households spending over 40% of income on housing (%)`;
  const alt =
    `A choropleth of ${count} European countries shaded by the share of households spending over ` +
    `40% of income on housing, in ${breaks.length + 1} classes from under ${breaks[0]}% to ` +
    `${breaks[breaks.length - 1]}% and over. ${subjectName} sits alone in the ${topShade}, top class, ` +
    `outlined in this map's accent colour, at ${pct(claim.subject.value)}% — a figure the caveat ` +
    `below states is not comparable with the rest. The ${bottomShade} class holds ${comparisonName}, ` +
    `outlined in ink, at ${pct(claim.comparison.value)}% — the lowest, fully comparable reading here.`;
  return { title, legendCaption, alt };
}

/** `code,country,pressure` — the csv's own country names, so they do not have to be retyped in a
 *  sentence. Natural Earth's shape names are cartographic abbreviations; the source table spells
 *  them out, and it is the source's spelling a reader of the credit line would look up.
 *
 *  Keyed by the SOURCE TABLE's own `code` column (`XKX` for Kosovo, never `KOS`) — the same code
 *  the value-side join reads before aliasing — so `displayName` below has to apply the same
 *  `CODE_ALIAS` this beat's join does, or a study-set key (`KOS`) would find no name here at all.
 *  There is no reference year in this source table (unlike the CO₂ choropleth this file was copied
 *  from); this beat's claim carries no year sentence. */
export function labelsFromCsv(csv) {
  const [, ...lines] = parseCsvRows(csv.trim());
  const names = new Map();
  for (const line of lines) {
    const [code, entity] = line;
    if (!code) continue;
    names.set(code, entity);
  }
  return { names };
}

// ── The camera, read back off the bake ──────────────────────────────────────────────────────────
//
// `bake-plate.mjs` records what the camera ACTUALLY showed (`frameCorners`) and what one drawn
// pixel is worth (`degreesPerPixel`). Those two numbers are enough to move a point between the
// plate's own pixels and the world in either direction — which is what lets the live map and the
// fallback share ONE anchor per region instead of computing a centroid twice, in two spaces, with
// nothing to notice when they drift apart.

/** Web-Mercator northing for a latitude, in world units where a full turn of longitude is 2π — the
 *  same function `bake-plate.mjs` projects with, carried here rather than imported across a beat. */
function mercY(latDeg) {
  return Math.log(Math.tan(Math.PI / 4 + (latDeg * Math.PI) / 360));
}

function latFromMercY(m) {
  return ((Math.atan(Math.exp(m)) - Math.PI / 4) * 360) / Math.PI;
}

/** Fails loud, naming what it looked for, on a plate baked before the camera facts were recorded
 *  (2026-08-10). Nothing below can be guessed from a plate without them: a live map would have
 *  neither bounds to be constrained to nor a way to put a hit target where its region is. */
export function cameraOf(geometry) {
  if (!geometry.frameCorners || !(geometry.degreesPerPixel > 0))
    throw new Error(
      "this plate predates the camera facts: geometry.json carries no `frameCorners` " +
        `(${JSON.stringify(geometry.frameCorners)}) or no positive \`degreesPerPixel\` ` +
        `(${JSON.stringify(geometry.degreesPerPixel)}). Re-bake it with bake-plate.mjs, or the live ` +
        "map has neither bounds to be constrained to nor a ground scale to place its marks at.",
    );
  const corners = geometry.frameCorners;
  const worldWidthPx = 360 / geometry.degreesPerPixel;
  const northMerc = mercY(corners.north);
  return {
    corners,
    worldWidthPx,
    /** lon/lat → the plate's own pixels. Verified against the baked rings: it reproduces
     *  `geometry.shapes`' own coordinates to within 0.05px, which is the bake's own rounding. */
    project: ([lon, lat]) => [
      ((lon - corners.west) * worldWidthPx) / 360,
      ((northMerc - mercY(lat)) * worldWidthPx) / (2 * Math.PI),
    ],
    /** …and back. The live layer needs the region anchors in lon/lat; the fallback needs the same
     *  anchors in frame units. One anchor, inverted, rather than two centroids. */
    unproject: ([px, py]) => [
      corners.west + (px * 360) / worldWidthPx,
      latFromMercY(northMerc - (py * 2 * Math.PI) / worldWidthPx),
    ],
  };
}

/**
 * The live layer's own geometry: the SAME 41 shapes, in lon/lat, joined out of `countries.geojson`
 * exactly the way `bake-plate.mjs` joins them — `ADM0_A3`, never `ISO_A3` (`geo-discipline.md` rule
 * 5), and a MultiPolygon flattened to its own parts' rings, which is safe because the fill is
 * `evenodd` (see `geo-choropleth.ts`'s own `keepRing` doc-comment for the trap this is NOT).
 *
 * NOT unprojected from the SVG's pixel paths, deliberately: those are thinned to 0.6px and rounded
 * to 0.1px AT THE PLATE'S OWN ZOOM, so a reader who zooms in would be looking at that quantisation
 * as a staircase along every coastline. The real coordinates cost more and are what a live map is
 * for.
 *
 * Rings are culled by the SAME `keepRing` the bake culls with, against the SAME projected frame, so
 * the live map draws neither more nor less of a country than the plate under it does — and the
 * Azores and the Canaries, which the plate never showed, are not paid for in payload either.
 * Coordinates are rounded to 4 decimals: 0.0001° is 11m, and under a tenth of a pixel at the
 * deepest zoom this beat's own leash allows. Measured on this beat's 41 shapes: 279.7 KB at full
 * precision, 228.9 KB at 4dp.
 *
 * THE PART STRUCTURE IS KEPT, AND THAT IS THE ONE THING THIS MAY NOT COPY FROM THE BAKE. The bake
 * FLATTENS a MultiPolygon's parts into one list of rings, and `geo-choropleth.ts`'s own `keepRing`
 * doc-comment explains why that is safe there: an SVG `<path>` filled `evenodd` sums ray-crossings
 * across every subpath and needs no outer/hole grouping. GeoJSON is not that. A `Polygon`'s FIRST
 * ring is its exterior and every ring after it is a HOLE, so the same flattening turns the Faroe
 * Islands' four other islands into holes cut out of the first one — measured on the live page at
 * zoom 6.2: one island filled, four drawn as white outlines, on the beat whose entire claim is about
 * the Faroe Islands. Every multi-part country in the study set (Greece, Italy, Denmark, the UK,
 * Norway, Croatia, Spain, Estonia, Sweden) had the same wound. So each PART becomes its own polygon
 * of a `MultiPolygon` here, culled on its own outer ring, and its holes travel with it.
 */
export function liveRings(collection, keys, geometry) {
  const { project } = cameraOf(geometry);
  const frame = geometry.frame;
  const byKey = new Map();
  for (const feature of collection.features)
    byKey.set(feature.properties.ADM0_A3, feature);

  const missing = keys.filter((key) => !byKey.has(key));
  if (missing.length > 0)
    throw new Error(
      `${missing.length} declared countries have no shape in countries.geojson: ${missing.join(", ")}`,
    );

  const round = (ring) =>
    ring.map(([lon, lat]) => [Number(lon.toFixed(4)), Number(lat.toFixed(4))]);

  const shapes = new Map();
  for (const key of keys) {
    const geom = byKey.get(key).geometry;
    const parts = geom.type === "MultiPolygon" ? geom.coordinates : [geom.coordinates];
    const kept = [];
    for (const part of parts) {
      // The OUTER ring decides whether the part is in frame at all; its holes are inside it by
      // construction and travel with it or not at all.
      const [outer, ...holes] = part;
      if (!outer || !keepRing(outer.map(project), frame)) continue;
      kept.push([round(outer), ...holes.map(round)]);
    }
    if (kept.length === 0)
      throw new Error(
        `every part of ${key} was culled out of frame — the live map would draw nothing where the plate draws a country`,
      );
    shapes.set(key, kept);
  }
  return shapes;
}

/**
 * THE PLAN the live layer reads out of the page — this beat's own answer to the LAYERS contract
 * `live-map.mjs` declares (that file is byte-identical in every map × web beat and may not know
 * what any one of them draws).
 *
 * A choropleth's answer differs from the symbol seed's on three points, and each one is the whole
 * reason this function is beat-specific rather than shared:
 *
 *   1. THE HOVER TARGET IS THE FILL, not a disc at a centroid. `hover: true` on a `fill` layer is
 *      the entirety of B6.14a: a pointer gets the region's own value on ENTERING the region,
 *      anywhere inside it, because `queryRenderedFeatures` hit-tests the rendered polygon. There is
 *      no radius to tune and no country whose hover only fires over its capital.
 *   2. EVERY FEATURE CARRIES THE EXACT COLOUR ITS OWN `<path>` IS PAINTED, read from
 *      `ChoroplethWeb.tsx`'s own `choroplethRamp`/`fillFor` — the same two functions the component
 *      calls. A second ramp derived here would be the "one mark, two halves, two mechanisms" class
 *      `map-web-discipline.md` names, in colour instead of in radius.
 *   3. THE BORDERS ARE THE FILL LAYER'S OWN `fill-outline-color`, matching the SVG's own
 *      ground-coloured stroke, rather than a second `line` layer over the same rings. Measured: the
 *      rings are 228.9 KB and `map.addSource` in the boot script takes one source per layer, so a
 *      borders layer would ship a second copy of all of them for a hairline `fill-outline-color`
 *      already draws. The two CLAIM outlines below ARE line layers, because they are two shapes (a
 *      few KB) and because the accent outline is the argument itself.
 *
 * `minZoomHeadroom` is derived differently too, and it has to be: the seed's own derivation is the
 * headroom the plate's frame had over its study SET, and for a choropleth those are the same box —
 * the study set IS the frame, so that derivation yields zero and hands the reader a map they cannot
 * move through, which is the one outcome R1 exists to forbid. The honest floor here is the beat's
 * smallest region: a reader must be able to bring Andorra (2.5 frame units across) up to this
 * beat's own minimum pointer target, `HIT_TARGET_PX`. Derived from the plate's own geometry, so a
 * beat with no tiny region gets a correspondingly shorter leash.
 */
export function livePlan({ geometry, regions, rings, breaks, ground, ink, accent }) {
  const camera = cameraOf(geometry);
  const { ramp, noData, water } = choroplethSurfaces(ground, accent, breaks);

  const features = [];
  const anchors = {};
  let west = Infinity,
    east = -Infinity,
    south = Infinity,
    north = -Infinity;
  let smallestDrawn = Infinity;

  for (const region of regions) {
    const own = rings.get(region.key);
    if (!own)
      throw new Error(
        `no live rings for ${region.key} — the live map would draw a hole where the plate draws a country`,
      );
    anchors[region.key] = camera.unproject(region.anchor);
    features.push({
      type: "Feature",
      // MultiPolygon, always — see `liveRings`: a country's islands are PARTS, never holes.
      geometry: { type: "MultiPolygon", coordinates: own },
      properties: {
        key: region.key,
        name: region.name,
        value: region.value,
        // The one detail string the button, the table and this feature all read from.
        detail: regionDetail(region),
        // A region with no joined value is painted the beat's own no-data grey, explicitly — never
        // dropped from the map and never allowed to fall through to the ramp's first class, which
        // would read as a legitimate low value (`geo-discipline.md` rule 5's own failure mode).
        color: fillFor(region.value, ramp, breaks, noData),
      },
    });
    if (region.value === null) continue;
    // The study footprint is the footprint of the regions that actually carry a value…
    for (const [outer] of own)
      for (const [lon, lat] of outer) {
        if (lon < west) west = lon;
        if (lon > east) east = lon;
        if (lat < south) south = lat;
        if (lat > north) north = lat;
      }
    const box = boundingBoxOf(region.rings);
    smallestDrawn = Math.min(
      smallestDrawn,
      Math.max(box.maxX - box.minX, box.maxY - box.minY),
    );
  }

  // …CLAMPED to what the plate actually showed. Ukraine reaches 40.1°E and Iceland −28.8°W, both
  // past a frame that stops at 33°/−26°: a ring is kept when it INTERSECTS the frame, so its own
  // coordinates can run beyond it. Left unclamped, the live camera would open on a wider Europe
  // than the plate, the title and the picture would stop agreeing, and the leash would be set on a
  // view the beat never claimed.
  const shown = geometry.frameCorners;
  const studyBounds = {
    west: Math.max(west, shown.west),
    east: Math.min(east, shown.east),
    south: Math.max(south, shown.south),
    north: Math.min(north, shown.north),
  };

  const outline = (key, colour) => {
    const region = regions.find((r) => r.key === key);
    if (!region) throw new Error(`no region ${key} to outline`);
    return {
      type: "Feature",
      geometry: { type: "MultiPolygon", coordinates: rings.get(key) },
      properties: { key, colour, detail: regionDetail(region) },
    };
  };
  const claimOutlines = {
    type: "FeatureCollection",
    features: [outline(COMPARISON_KEY, ink), outline(SUBJECT_KEY, accent)],
  };

  return {
    styleUrl: `https://api.maptiler.com/maps/${geometry.style}/style.json?key=${KEY_PLACEHOLDER}`,
    // THE SAME `water` THE BAKE PAINTED AND THE SSR'd PAGE DREW, derived here from the same
    // palette rather than passed in. It used to be a parameter carrying a module constant, which is
    // how the live layer and the plate could have disagreed about the colour of the sea.
    waterFill: water,
    frame: geometry.frame,
    degreesPerPixel: geometry.degreesPerPixel,
    metresPerPixel: geometry.metresPerPixel,
    bakeZoom: geometry.zoom,
    studyBounds,
    // How far in the reader may go, at minimum, whatever the container's shape does to the fit —
    // see this function's own header for why a choropleth cannot use the seed's derivation.
    minZoomHeadroom: Math.max(0, Math.log2(HIT_TARGET_PX / smallestDrawn)),
    // Where each `.pt` button follows the camera to, keyed exactly as the markup's own `data-key`.
    anchors,
    layers: [
      {
        id: "mw-regions",
        type: "fill",
        data: { type: "FeatureCollection", features },
        paint: {
          "fill-color": ["get", "color"],
          // The SVG's own ground-coloured separation between neighbours, drawn by the fill layer
          // itself rather than by a second copy of 228.9 KB of rings.
          "fill-outline-color": ground,
        },
        // A polygon reprojects on its own — there is no radius to derive from the camera.
        hover: true,
      },
      // The two marks the argument is made of, in the SAME two passes the SVG draws them in: a
      // ground-coloured halo so the outline separates from whatever class its neighbours landed in,
      // then the colour itself. `hover: false` — an outline pixel is decoration, and the region
      // underneath it is what answers (the defect this beat already fixed once in the SVG, where
      // the Faroe Islands' own stroke covered nearly the whole shape and swallowed every hover).
      //
      // NO `line-join` HERE, and it is not an omission: `line-join` is a MapLibre LAYOUT property,
      // and the LAYERS contract `live-map.mjs` reads carries `paint` only. Written as paint it is
      // rejected — `layers.mw-claim.paint.line-join: unknown property` — and `addLayer` then drops
      // THE WHOLE LAYER, so both claim outlines were simply absent from the live map while every
      // test in this repository stayed green and the fallback still drew them. Found by opening the
      // keyed page and looking for the accent outline that was not there. The SVG keeps its own
      // `strokeLinejoin="round"`; the live outline takes MapLibre's default mitre, which at 2px on
      // a coastline is not a difference a reader can see.
      {
        id: "mw-claim-halo",
        type: "line",
        data: claimOutlines,
        paint: { "line-color": ground, "line-width": 4.2 },
        hover: false,
      },
      {
        id: "mw-claim",
        type: "line",
        data: claimOutlines,
        paint: { "line-color": ["get", "colour"], "line-width": 2 },
        hover: false,
      },
    ],
  };
}

/**
 * SSRs the map ONCE — the fluid SVG plus its HTML overlay IS the one responsive render, there is no
 * per-layout duplication left — SSRs the accessible table, wraps both in one self-contained HTML
 * file and writes it to disk.
 */
/** What the collapsed disclosure's own summary calls its rows (B5.2). A beat's word, not a
 *  format's — `discloseTable` refuses to invent one. */
const TABLE_ROW_NOUN = "countries";

/**
 * RULING B5.2 (2026-08-10, the owner): *"Pour toutes les cartes on n'affiche pas le tableau de
 * valeurs qui se trouve en dessous, ou alors cache-les dans un accordéon, et pour tous."* The value
 * table is COLLAPSED by default on every map page, without exception.
 *
 * He offered two ways out and this format takes the second, and the REASON matters more than the
 * choice — without it a later reader meets a collapsed table and "fixes" it back open. The table is
 * the map's own accessible alternative (`references/map-web-discipline.md`, "The accessibility
 * question"): a map is a spatial medium, a screen-reader user has no spatial access to it, and the
 * ordered list of readings is the only honest answer this format found. Deleting it would trade a
 * page-height problem for an accessibility regression. Collapsed is what he asked for AND keeps the
 * data reachable.
 *
 * A NATIVE `<details>`/`<summary>`, never a scripted accordion and never `display: none`. It opens
 * with the page's script disabled, it is keyboard-operable and announced as a disclosure with zero
 * authoring, and a screen-reader user can open it — none of which a hand-built widget or a hidden
 * block gives for free. This is the one thing that keeps the ruling from being the `sr-only` failure
 * the discipline file already names: the content is one keystroke away, not gone.
 *
 * The summary says WHAT it holds and HOW MANY rows, so a reader knows what opening it costs. The
 * count is read off the rendered table's own `<tbody>` rather than passed in beside it — a second
 * number for the same fact is how a caption comes to disagree with the rows under it.
 */
export function discloseTable(tableHtml, rowNoun) {
  if (!tableHtml) return "";
  if (typeof rowNoun !== "string" || rowNoun.trim() === "")
    throw new Error(
      "this beat renders a value table but named no `tableRowNoun`: the disclosure summary has to " +
        "say what it holds (\"41 countries\", \"156 cells\"), and nothing here can invent that word",
    );
  const body = tableHtml.slice(tableHtml.indexOf("<tbody"));
  const rows = (body.match(/<tr[\s>]/g) ?? []).length;
  if (rows === 0)
    throw new Error(
      "the value table rendered no <tbody> rows: refusing to label a disclosure with a count " +
        "nobody can check",
    );
  return (
    `<details class="mw-table-disclosure">` +
    `<summary>${escapeHtml(`Table of values — ${rows} ${rowNoun}`)}</summary>\n` +
    `${tableHtml}\n</details>`
  );
}

/** THE LANGUAGE THE DELIVERED PAGE IS WRITTEN IN, read off what the story recorded — never
 *  detected from the prose and never defaulted. `renderWeb`'s own HTML shell used to hard-code
 *  `<html lang="fr">`, baked in for its first caller (a French CO₂ beat); every beat written in
 *  another language misdeclared itself to a screen reader and to a translation engine, and the gap
 *  was patched per-beat in a runner rather than closed here. Same shape ruling R4 already settled
 *  for `deliver`'s own hand-over documents (`skills/deliver/scripts/journalist-language.mjs`): the
 *  language is RECORDED for the story, confirmed with the journalist, and handed in — this function
 *  only refuses to ship without one, or with one that is not a real language tag.
 *
 *  Throws rather than defaulting to English: a page silently declaring the wrong language is
 *  exactly the defect this exists to close, and a default is how it would come back. */
function assertRecordedLanguage(language) {
  const recorded = String(language ?? "").trim();
  if (recorded === "")
    throw new Error(
      "a delivered page declares the language it is written in, and none was given — pass the story's own recorded language (STORYBOARD.md's `language:` field, or the beat's own recorded answer) as `props.language`. It is never detected from the prose and never defaulted",
    );
  if (!/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/.test(recorded))
    throw new Error(
      `language ${JSON.stringify(recorded)} is not a language code (fr, en, de-CH) — pass the code, not the language's name`,
    );
  return recorded;
}

async function renderMapWeb({ component, table, props, outDir, name, live = false, plan = null }) {
  const language = assertRecordedLanguage(props.language);
  const furniture = deriveFurniture(props.ground);
  const mapHtml = renderToStaticMarkup(createElement(component, { ...props, ...furniture }));
  const tableHtml = discloseTable(
    renderToStaticMarkup(createElement(table, { rows: props.rows, ...furniture })),
    TABLE_ROW_NOUN,
  );

  const interactionSource = await readFile(join(HERE, "interaction.mjs"), "utf8");
  const inlineScript = inlineable(interactionSource);

  // maplibre-gl inlined rather than loaded from a CDN. A `<script src>` would trade 803 KB of
  // payload for a SECOND third-party host; inlining keeps the count at one — api.maptiler.com —
  // which is the honest reading of R1. The price is stated rather than discovered: this page was
  // 429 KB as a picture, and the library, this beat's own 41 polygons in lon/lat and the boot
  // script are what a map a reader can move through costs.
  const liveBlock = live
    ? `<style>\n${await readFile(MAPLIBRE_CSS, "utf8")}\n</style>\n` +
      `<script type="application/json" id="mw-live-plan">${JSON.stringify(plan).replace(/</g, "\\u003c")}</script>\n` +
      `<script>\n${await readFile(MAPLIBRE_JS, "utf8")}\n</script>\n` +
      `<script>\n${inlineable(await readFile(join(HERE, "live-map.mjs"), "utf8"))}\n</script>`
    : "";

  const html = `<!doctype html>
<html lang="${language}">
<head>
<meta charset="utf-8">
<title>${escapeHtml(props.title)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
${buildCss({ ...props, ...furniture, frame: props.geometry.frame })}
</style>
</head>
<body>
<div class="map-web-page">
${mapHtml}
${tableHtml}
</div>
<div id="tooltip" role="status" aria-live="polite" hidden></div>
<script>
${inlineScript}
</script>
${liveBlock}
</body>
</html>
`;

  await mkdir(outDir, { recursive: true });
  const outPath = join(outDir, name);
  await writeFile(outPath, html);
  return { outPath };
}

/** Strips the `export` keyword from each top-level declaration — see `interaction.mjs`'s own
 *  header note for why. */
function inlineable(moduleSource) {
  return moduleSource.replace(/^export /gm, "");
}

function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildCss({ ground, accent, ink, muted, frame }) {
  // The plate's own aspect, the one number both the stage's width bound and the viewport's
  // aspect-ratio are computed from, so the box can never be asked to be two shapes at once.
  const aspect = frame.width / frame.height;
  return `
:root {
  --ground: ${ground};
  --accent: ${accent};
  --ink: ${ink};
  --muted: ${muted};
  /* One number, used by the body's own padding AND by the height the beat is asked to fit inside,
     so the two can never disagree about how much room the page edge takes. */
  --page-pad: 16px;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  padding: var(--page-pad);
  background: var(--ground);
  color: var(--ink);
  font-family: Helvetica, Arial, sans-serif;
}
.map-web-page { width: 100%; }
/* FIT THE WINDOW (map-web-discipline.md, "Fit the window"). The beat is a column exactly one
   window tall: every piece of furniture takes the height it needs, and .mw-stage is handed
   whatever is left. Nothing scrolls inside the visual, at any width — before this, the beat SSR'd
   two fixed 860px frames and drew every word inside them, so at 1600x900 the page ran 1705px tall
   and the widest visual used 54% of the width.
   'svh', not 'vh': on a phone with a retracting toolbar, 'vh' is the LARGE viewport, which is
   exactly the height the beat must not assume it has. The 'vh' line above it is the fallback for a
   browser without 'svh', and errs one toolbar too tall rather than clipping.
   The accessible table below is the ONE thing deliberately outside this column: 41 rows do not fit
   in a window beside a map, and the two ways to force them in — shrink the map to a stamp, or put
   the table behind a disclosure widget this format forbids — are both worse than letting the linear
   reading follow the claim. See RegionTable's own doc-comment. */
.map-web {
  width: 100%;
  display: flex;
  flex-direction: column;
  height: calc(100vh - var(--page-pad) * 2);
  height: calc(100svh - var(--page-pad) * 2);
}
/* Only the stage gives up height. Measured, and not obvious: with 'min-height' here instead of
   'height', the stage's own height stays INDEFINITE for container-query purposes and every 'cqh'
   inside it resolves to zero — the map collapses to its border and nothing is red. A definite
   height is what makes the stage a real size container. */
.map-web > *:not(.mw-stage) { flex: 0 0 auto; }
.mw-title { font-size: 21px; font-weight: 700; margin: 0 0 4px; line-height: 1.25; }
.mw-source { font-size: 13px; color: var(--muted); margin: 0 0 12px; }
/* The stage: the leftover height, and the container the map is measured against. 'container-type:
   size' is what lets the viewport below bound itself by the stage's HEIGHT as well as its width —
   CSS has no other way to say "as wide as you like, but never taller than the room left". */
.mw-stage {
  flex: 1 1 auto;
  container-type: size;
  min-height: 180px;
}
/* The viewport: the bake's own aspect, exactly, at every size — bounded by the stage's width AND
   its height, whichever binds first. A plate stretched to fill a shape it was not baked for is a
   lie about distance and shape (geo-discipline.md), so it is not one of the outcomes here; a
   smaller, correct map is. The plain 'width: 100%' above the 'min()' is the fallback for a browser
   without container query units. */
.mw-viewport {
  position: relative;
  width: 100%;
  width: min(100cqw, calc(100cqh * ${aspect}));
  max-width: 100%;
  /* CENTRED (finding 3, round-two stress): this beat's plate is baked square (496x496) against a
     wide desktop window, so the stage's own height is what bounds the map and the leftover room is
     horizontal. Left-aligned, that room measured as a choropleth in the left half of a 1440x900
     window with the right half empty ground — not a smaller map, a broken-looking one. The title,
     the legend and the caveat are never the map's own width to keep an edge aligned WITH — every
     one already spans the full stage at 100% — so centring loses no real alignment and reads as a
     deliberately framed, smaller map: this format never stretches a plate to a shape it was not
     baked for (geo-discipline.md), so a plate whose own aspect is squarer than the window is
     smaller by design. See skills/map-web/scripts/render-web.mjs's own copy of this note. */
  margin-inline: auto;
  overflow: hidden;
  border: 1px solid var(--muted);
}
/* The two map layers occupy the SAME box, the live one underneath. It is laid out from the first
   frame rather than revealed later, because a container with no size is a map with no size:
   MapLibre reads the box at construction, and a display:none container gives it 0x0 and a canvas
   nothing ever paints into. Invisible-but-laid-out, then, and the swap is one flip of the
   fallback's own hidden attribute. */
.mw-fallback, .mw-live-map, .mw-overlay { position: absolute; inset: 0; width: 100%; height: 100%; }
.mw-live-map { z-index: 0; }
.mw-fallback { z-index: 1; background: var(--ground); }
.mw-fallback[hidden] { display: none; }
/* The overlay is a SIBLING of both map layers and is never hidden with either: it carries every Tab
   stop and every region's own aria-label, so hiding it with the fallback would take the whole
   keyboard path away at the moment the live map arrives. Found by looking at the live page, not by
   an assertion. */
.mw-overlay { z-index: 2; pointer-events: none; }
/* WHICH TARGET THE POINTER TALKS TO, in the fallback: the region's own painted <path>, forwarded to
   that region's button by interaction.mjs — a polygon is a fairer target than a disc at its
   centroid, and it can never answer for a neighbour. The six regions too small to land a pointer on
   at this camera (ChoroplethWeb.tsx's own needsPointerTarget) are the exception and keep a
   pointer-active button; every other button stays in the DOM for keyboard reach and for its
   aria-label, with its pointer-events off. */
.mw-overlay .pt { pointer-events: none; }
.mw-overlay .pt-small { pointer-events: auto; }
/* Live, the canvas is what a pointer talks to: queryRenderedFeatures makes the hit area the
   RENDERED MARK at every size and every zoom, which is what B6.14a asked for and what a 28px button
   at a country's centroid could never give. */
html.mw-live .mw-overlay .pt { pointer-events: none; }
/* B5.1, and the conflict that dissolves with the ruling. The viewport keeps the PLATE's aspect,
   because scaling a raster non-uniformly is a lie about distance and shape. A LIVE map has no plate
   aspect to preserve — the canvas IS the container and the camera fills it — so live, the map takes
   the whole stage. The fallback keeps its aspect-ratio, unchanged, because it is still a plate. */
html.mw-live .mw-viewport { overflow: hidden; width: 100%; height: 100%; aspect-ratio: auto !important; }
.maplibregl-canvas-container canvas { outline: none; }
svg.map { display: block; width: 100%; height: 100%; }
/* The region a pointer is on, marked on the plate itself rather than by a disc floating over it. */
.region.pt-active { filter: brightness(0.85); }
/* The hit target: a real <button>, fixed-CSS-pixel diameter, transparent until it is hovered or
   focused — a legitimate touch/pointer target at every width for the regions that need one. */
/* ONE SIZE, AND THE SECOND AXIS COMES FROM 'aspect-ratio', NEVER FROM A SECOND PERCENTAGE (B6.20).
   A percentage WIDTH resolves against the container's width and a percentage HEIGHT against its
   height, so the same fraction is two different numbers the moment the overlay stops being the
   plate's own square box — which is exactly what the live swap did. Measured on the committed
   symbol beat at 1600x900 (container 1566x591): the M9.1 button was 140.9 x 53.2 px, a wide flat
   grey ellipse painted behind a 60 px disc. 'aspect-ratio' is what makes the painted highlight a
   circle in SCREEN pixels at every container shape, in the live layer and in the fallback alike. */
.pt {
  position: absolute;
  aspect-ratio: 1;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
}
.pt-small:hover, .pt-small:focus {
  background: var(--muted);
  opacity: 0.28;
  outline: none;
}
.pt:focus-visible {
  outline: 2px solid var(--ink);
  outline-offset: 2px;
  opacity: 1;
  background: transparent;
}
/* The legend: fixed CSS pixel type, so the class boundaries read the same however wide the map
   above them is drawn. The bar is one flex row of equal classes; the ticks below are a second row
   of the same six cells, each printing its own class's lower boundary at its left edge — the same
   numbers the SVG legend printed, in the same places (types/choropleth.md: colour is never the only
   channel a value travels through). */
.mw-legend { margin: 14px 0 6px; }
.mw-legend-caption { font-size: 12.5px; font-weight: 600; color: var(--muted); margin: 0 0 8px; }
.mw-legend-bar { position: relative; display: flex; width: 100%; height: 22px; }
.mw-legend-class { flex: 1 1 0; }
/* Where the subject and the comparison sit on the SAME continuous scale the class bar only shows in
   discrete steps — the argument made visible as a distance. A CSS triangle, so it needs no second
   asset and takes its colour from the mark it stands for. */
.mw-legend-marker {
  position: absolute;
  top: -9px;
  width: 0;
  height: 0;
  transform: translateX(-50%);
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-bottom: 7px solid currentColor;
}
.mw-legend-ticks { display: flex; width: 100%; margin-top: 4px; }
.mw-legend-tick { flex: 1 1 0; position: relative; font-size: 11px; color: var(--muted); }
.mw-legend-tick span { position: absolute; left: 0; transform: translateX(-50%); white-space: nowrap; }
.mw-legend-tick:first-child span { transform: none; }
.mw-legend-nodata {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: var(--muted);
  margin: 22px 0 0;
}
.mw-legend-swatch { display: block; width: 18px; height: 13px; border: 0.5px solid var(--muted); }
.mw-subject { font-size: 12.5px; font-weight: 700; color: var(--accent); margin: 22px 0 2px; }
.mw-comparison { font-size: 12.5px; font-weight: 700; color: var(--ink); margin: 0 0 8px; }
.mw-caveat { font-size: 11.5px; color: var(--muted); margin: 0 0 4px; line-height: 1.35; }
#tooltip {
  position: fixed;
  max-width: 240px;
  padding: 6px 10px;
  font-size: 13px;
  line-height: 1.3;
  background: var(--ground);
  color: var(--ink);
  border: 1px solid var(--muted);
  border-radius: 3px;
  pointer-events: none;
  z-index: 10;
}
#tooltip[hidden] { display: none; }
/* The accessible table (ChoroplethWeb.tsx's RegionTable): a real, always-visible table, not a
   screen-reader-only trick — see references/map-web-discipline.md, "The accessibility question".
   It follows the one-window-tall column above rather than sitting inside it; RegionTable's own
   doc-comment states that trade. */
.region-table {
  max-width: 860px;
  border-collapse: collapse;
  font-size: 14px;
  margin-top: 28px;
}
.region-table caption {
  text-align: left;
  font-size: 12.5px;
  color: var(--muted);
  margin-bottom: 8px;
}
.region-table th, .region-table td {
  text-align: left;
  padding: 5px 16px 5px 0;
  border-bottom: 1px solid var(--muted);
}
.region-table tr.subject th, .region-table tr.subject td {
  color: var(--accent);
  font-weight: 700;
}
/* B5.2 (ruling, 2026-08-10): the value table is COLLAPSED on every map page, without exception —
   see references/map-web-discipline.md, "The table is collapsed, and why it is not deleted". A
   native disclosure element (details/summary — written without its angle brackets here, because
   this comment ships inside the delivered page and a guard that scans for the tag would find it),
   so it opens with the page's script off, is announced as a disclosure and is keyboard-operable
   with nothing authored here. The summary is the whole control, so it is given a
   real target height and a visible focus ring rather than the browser's 15px default line. The
   native marker is KEPT: it is the affordance that says open/closed, and replacing it with a drawn
   one would be inventing a control a reader already knows. */
.mw-table-disclosure { margin-top: 10px; }
.mw-table-disclosure > summary {
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
  padding: 9px 0;
  border-top: 1px solid var(--muted);
}
.mw-table-disclosure > summary:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }
`.trim();
}

/** Bakes the plate if it is not already at `plateDir`. */
async function ensurePlate(plateDir) {
  if (existsSync(join(plateDir, "geometry.json")) && existsSync(join(plateDir, "plate.png"))) return;
  await mkdir(plateDir, { recursive: true });
  const result = spawnSync(
    "bun",
    [join(HERE, "bake-plate.mjs"), "--size", String(PLATE_SIZE), "--out", plateDir],
    { cwd: resolve(HERE, "../../../.."), stdio: "inherit" },
  );
  if (result.status !== 0) throw new Error(`bake-plate.mjs exited with ${result.status}`);
}

async function loadPlate(plateDir) {
  const geometry = JSON.parse(await readFile(join(plateDir, "geometry.json"), "utf8"));
  const png = await readFile(join(plateDir, "plate.png"));
  return { geometry, plate: `data:image/png;base64,${png.toString("base64")}` };
}

/** This beat's own runner: bakes the plate if missing, joins the shapes to the frozen csv, checks
 *  the claim against the actual joined values, and hands everything to `renderMapWeb`. The shapes
 *  the FALLBACK draws are read from the BAKED geometry (`bake-plate.mjs` already reads
 *  `countries.geojson` and joins on `ADM0_A3` before it ever writes `geometry.json`); the LIVE
 *  layer's own lon/lat rings are read from that same `countries.geojson` here, by `liveRings`. */
async function render({ valuesPath, shapesPath, plateDir, outDir, name = OUTPUT_NAME }) {
  await ensurePlate(plateDir);
  const { geometry, plate } = await loadPlate(plateDir);

  // The shape-side join: every declared code must find a shape (`geo-choropleth.ts`'s own
  // `joinShapes`, thrown loud on a miss — this ran once already inside `bake-plate.mjs`, and runs
  // again here against the BAKED geometry so a stale plate directory cannot silently drop a shape).
  const shapes = joinShapes(HOUSING_STUDY, geometry.shapes);

  // The value-side join: every declared code must find a value in the frozen csv — Trap 2 (Kosovo
  // under the statistics office's own `XKX`, not this tree's `KOS`) resolved by `CODE_ALIAS`, and
  // Trap 3 (Greenland, `GRL`, a value with no shape in this study's declared set) declared through
  // `OUT_OF_SCOPE_VALUES` rather than silently dropped. Both directions of the join were driven
  // bare first, without either declaration, to see exactly what it said — see the beat's own report
  // for the verbatim text of both thrown errors.
  const csv = await readFile(valuesPath, "utf8");
  const values = valuesFromCsv(csv);
  const { rows } = joinValues(HOUSING_STUDY, values, {
    alias: CODE_ALIAS,
    expectedNoData: [],
    expectedExtraValues: OUT_OF_SCOPE_VALUES,
  });

  const valueByKey = new Map(rows.map((r) => [r.key, r.value]));

  // The name a reader is shown comes from the SOURCE TABLE, never from the shapefile. Natural
  // Earth's `NAME` is a cartographic abbreviation sized to fit inside a polygon, and the frozen
  // `countries.geojson` carries no long form at all. `labelsFromCsv` keys its map by the source
  // table's OWN code column (`XKX` for Kosovo), so `displayName` applies the same `CODE_ALIAS` the
  // value-side join does before looking a study-set key (`KOS`) up — the alias is spent twice,
  // deliberately, rather than the study set carrying two different names for Kosovo. `displayName`
  // throws rather than silently falling back, so a code the csv stops naming cannot quietly
  // reintroduce an abbreviation.
  const { names } = labelsFromCsv(csv);
  const displayName = (key, shapeName) => {
    const spelled = names.get(CODE_ALIAS[key] ?? key);
    if (!spelled)
      throw new Error(
        `the csv names no entity for ${key}, so the map would fall back to the shapefile's own "${shapeName}" — every reader-facing name in this beat comes from the source table`,
      );
    return spelled;
  };
  // ONE anchor per region, computed here and read by both halves: the component turns it into a
  // percentage of the frame for the fallback, and `livePlan` unprojects it into lon/lat for the
  // live camera. Two centroids computed in two spaces is exactly the class of defect this format
  // has already paid for once in radius and once in colour.
  const named = shapes.map((shape) => ({
    key: shape.key,
    name: displayName(shape.key, shape.name),
    rings: shape.rings,
    value: valueByKey.get(shape.key) ?? null,
    anchor: bboxCenter(boundingBoxOf(shape.rings)),
  }));

  // The claim, checked against the ACTUAL joined, study-scoped values, not just asserted true in
  // the title — and never against the raw csv's own codes (which still carry XKX and GRL).
  const claim = checkClaim(valueByKey);

  const { title, legendCaption, alt } = claimSentences({
    count: named.length,
    breaks: PRESSURE_BREAKS,
    claim,
    names,
    ramp: choroplethSurfaces(SEED.ground, SEED.accent, PRESSURE_BREAKS).ramp,
  });
  console.log(`title: ${title}`);
  console.log(`alt: ${alt}`);

  const collection = JSON.parse(await readFile(shapesPath, "utf8"));
  const rings = liveRings(collection, HOUSING_STUDY, geometry);
  const furniture = deriveFurniture(SEED.ground);
  const plan = SEED.live
    ? livePlan({
        geometry,
        regions: named,
        rings,
        breaks: PRESSURE_BREAKS,
        ground: SEED.ground,
        ink: furniture.ink,
        accent: SEED.accent,
      })
    : null;

  const { outPath } = await renderMapWeb({
    component: ChoroplethWeb,
    table: RegionTable,
    props: {
      geometry: { frame: geometry.frame, shapes: named },
      rows: named,
      breaks: PRESSURE_BREAKS,
      plate,
      title,
      source: SEED.source,
      basemapCredit: SEED.basemapCredit,
      legendCaption,
      caveat: SEED.caveat,
      alt,
      ground: SEED.ground,
      accent: SEED.accent,
      language: SEED.language,
    },
    outDir,
    name,
    live: SEED.live,
    plan,
  });
  return { outPath, regions: named.length, claim, plan };
}

if (import.meta.main) {
  const argv = process.argv.slice(2);
  const flag = (name, fallback) => {
    const at = argv.indexOf(name);
    return at >= 0 ? argv[at + 1] : fallback;
  };
  const positional = argv.find((a) => !a.startsWith("--"));
  const valuesPath = resolve(flag("--values", DEFAULT_VALUES_PATH));
  const shapesPath = resolve(flag("--shapes", DEFAULT_SHAPES_PATH));
  const plateDir = resolve(flag("--plate", DEFAULT_PLATE_DIR));
  const outDir = resolve(positional ?? flag("--out", DEFAULT_OUT_DIR));

  const { outPath, regions, claim, plan } = await render({ valuesPath, shapesPath, plateDir, outDir });
  console.log(
    `choropleth-web beat → ${outPath}  [${regions} regions]\n` +
      `claim: subject ${claim.subject.key} (${claim.subject.value}%) · comparison ${claim.comparison.key} (${claim.comparison.value}%)` +
      (plan
        ? `\nlive: study ${plan.studyBounds.west.toFixed(2)}..${plan.studyBounds.east.toFixed(2)}°E, ` +
          `${plan.studyBounds.south.toFixed(2)}..${plan.studyBounds.north.toFixed(2)}°N · ` +
          `zoom headroom ${plan.minZoomHeadroom.toFixed(2)} · ` +
          `${(JSON.stringify(plan).length / 1024).toFixed(1)} KB of plan`
        : "\nlive: off"),
  );
}

export { render, renderMapWeb, ensurePlate, loadPlate, SEED, PLATE_SIZE, DEFAULT_PLATE_DIR };
