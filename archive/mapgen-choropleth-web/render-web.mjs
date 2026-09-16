// twin/proof/mapgen-choropleth-web/render-web.mjs
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
// Usage:  bun proof/mapgen-choropleth-web/render-web.mjs [outDir]

import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
// `deriveFurniture` and `readPalette` come from the SHARED copy through the `#shared/…` subpath
// alias — a beat is a story, not a skill, so it may reach out where a skill may not. This file used
// to import `deriveFurniture` from a LOCAL copy of `render-still.mjs` four lines above this one, so
// one module was present twice in one file; that copy predated the Google-Fonts move and imported a
// `./typefaces.mjs` sibling nobody ever copied, which made this beat unrunnable.
import { deriveFurniture, measureText, readPalette } from "#shared/chart-beat/render-still.mjs";
// THE TYPEFACE TRAVELS WITH THE PAGE, AS BYTES — the same repair `proof/mapgen-locator-web` had.
// This beat's CSS said `font-family: Helvetica, Arial, sans-serif` and loaded nothing: a licensed
// face present on the author's Mac and on no CI runner, no Android phone, no Linux desktop, so the
// delivered page was set in whatever each reader happened to have. Measured on the committed file
// before this change: `.mw-title` computed to `Helvetica, Arial, sans-serif` in Chrome, and the
// page carried not one `@font-face`.
import {
  assertFontsEmbedded,
  displayableTextOf,
  dominantFontStack,
  embeddedWebFaces,
  fontFaceCss,
  fontRequestsInHtml,
} from "#shared/design-base/typefaces.mjs";
// THE DIRECTION, AND WHY A MAP BEAT READS ONE. `rapport` sets its display register in a SERIF and
// its body in an italic serif. The static choropleth on the same ground and the same data renders
// its title in Merriweather; this page came out entirely in a sans, so one direction had two
// typographic voices depending on the genre. `figureVars` emits `--title-family` and its siblings
// and `buildCss` below reads them. Nothing here names Merriweather: the family comes off the serif
// LADDER, chosen for the characters this beat actually sets.
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { figureVars, plainSpaces, webRegisters } from "#shared/design-base/web.mjs";
// THE TRUNK — the plan contract and the basemap's own two colours, reached through the `#shared/…`
// alias a beat is allowed to use. `plateTints` is what replaces this beat's typed `WATER_FILL`:
// see `basemapTints` below.
import { validateExpressions } from "#shared/map-beat/mount.mjs";
import { validateLivePlan } from "#shared/map-beat/plan.mjs";
import { assertNoDoubledBasemap } from "#shared/map-beat/style.mjs";
import { BASEMAP_MAX, SEA_LAND_MIN, plateTints } from "#shared/map-beat/tints.mjs";
import {
  ChoroplethWeb,
  RegionTable,
  choroplethRamp,
  fillFor,
  regionDetail,
  HIT_TARGET_PX,
} from "./ChoroplethWeb.tsx";
import {
  CO2_2023_STUDY,
  CO2_BREAKS,
  bboxCenter,
  boundingBoxOf,
  joinShapes,
  joinValues,
  keepRing,
  valuesFromCsv,
} from "./geo-choropleth.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
// Resolved through node's own module resolution, never by a relative path out of this beat.
// `no-cross-skill-imports.test.ts` reads path STRINGS, not just import statements, and a literal
// `../../node_modules/...` reads to it — correctly — as a specifier leaving the beat. A package
// name is the honest way to say "this comes from a dependency", and it is what a copy-pasted beat
// with its own `bun install` would resolve too.
const requireFrom = createRequire(import.meta.url);
const MAPLIBRE_JS = requireFrom.resolve("maplibre-gl/dist/maplibre-gl.js");
const MAPLIBRE_CSS = requireFrom.resolve("maplibre-gl/dist/maplibre-gl.css");

/**
 * THE LIVE LAYER IS THE TRUNK PLUS THIS BEAT'S OWN PAGE MECHANICS, in one classic script.
 *
 * `live-map.mjs` used to carry the radius strategies, the layer mounting and the style's water and
 * labels as a byte-identical copy in every map × web beat — exactly the drift
 * `references/map-plan.md` opens by naming. Those three live in `shared/map-beat/` and are read FROM
 * THERE, resolved through the same subpath alias the imports above use rather than by a relative
 * climb out of this beat.
 *
 * ORDER IS DEPENDENCY ORDER, not alphabetical: `live-map.mjs` calls into all three, and a `const`
 * declared after its use is a temporal-dead-zone error at runtime rather than a hoisted function.
 */
const LIVE_MODULES = [
  fileURLToPath(import.meta.resolve("#shared/map-beat/plan.mjs")),
  fileURLToPath(import.meta.resolve("#shared/map-beat/style.mjs")),
  fileURLToPath(import.meta.resolve("#shared/map-beat/mount.mjs")),
  join(HERE, "live-map.mjs"),
];

async function liveScript() {
  const parts = [];
  for (const path of LIVE_MODULES) parts.push(inlineable(await readFile(path, "utf8")));
  return parts.join("\n");
}

// ===== CONFIG — this beat's own words, data and claim =====
// The title and the alt text are NOT here: both state how many countries the map carries, and the
// alt states the two extreme readings and the class boundaries as well. All of those are products
// of the join this script performs, so they are built in `render()` from the joined rows — see
// `claimSentences`. Typed here, "41 countries" would have kept its wording after a code was added
// to `CO2_2023_STUDY` and the map drew 42. The two country NAMES stay in the wording because
// `checkClaim` already refuses to render if either stops being the extreme it is named as.
// The colours are READ, not typed — see `PALETTE.md` beside this file. The class shading is
// this map's data, so the accent reaches the ramp and not only the subject outline.
const PALETTE = readPalette(HERE, { stopAt: join(HERE, "..") });
console.log(
  `palette from ${PALETTE.source} — ground ${PALETTE.ground}, accent ${PALETTE.accent}, ` +
    `chosen by ${PALETTE.origin}`,
);

const SEED = {
  ground: PALETTE.ground,
  accent: PALETTE.accent,
  // The filed direction this beat is set in. A NAME, not a family: `directionFor` below resolves
  // each register down its own ladder against the characters this page actually sets, and refuses
  // rather than substitutes when no face on a ladder can set them.
  direction: "rapport",
  source: "Global Carbon Budget 2025, via Our World in Data — 2023 data",
  basemapCredit: "shapes: Natural Earth 1:50m Admin 0 Countries · basemap © MapTiler, © OpenStreetMap",
  caveat:
    "Territorial, per-capita figures: a small-population country can rank far above or below its neighbours on a small absolute change. This map states the ranking, not a cause.",
  // Ruling R1: map × web is a LIVE MapTiler map. Set this false for a beat that must stay
  // request-free (an offline archive, a CMS with a Content-Security-Policy that refuses
  // api.maptiler.com) — the page then ships as the fallback layer alone, which is exactly what it
  // was before the ruling.
  live: true,
};
const PLATE_SIZE = 496;
// FROZEN BESIDE THE BEAT, for the same reason its csv is: a basemap living in `/tmp` cannot be
// committed, so the delivered html could not be reproduced or audited — and MapTiler restyles, so
// a re-bake months later is a different picture under the same shapes. `ensurePlate` below bakes
// only when this folder is empty.
const DEFAULT_PLATE_DIR = join(HERE, "plate");
const DEFAULT_VALUES_PATH = join(HERE, "co2-per-capita-2023.csv");
const DEFAULT_SHAPES_PATH = join(HERE, "countries.geojson");
const DEFAULT_OUT_DIR = join(HERE, "render");
const OUTPUT_NAME = "choropleth.html";
const SUBJECT_KEY = "FRO";
const COMPARISON_KEY = "ALB";
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
 */
export function checkClaim(values) {
  const violations = [];
  const entries = [...values.entries()];
  const [maxKey, maxValue] = entries.reduce((a, b) => (b[1] > a[1] ? b : a));
  const [minKey, minValue] = entries.reduce((a, b) => (b[1] < a[1] ? b : a));

  if (maxKey !== SUBJECT_KEY)
    violations.push(
      `the claimed subject is ${SUBJECT_KEY}, but the actual maximum of the 41 joined values is ${maxKey} (${maxValue})`,
    );
  if (minKey !== COMPARISON_KEY)
    violations.push(
      `the claimed comparison is ${COMPARISON_KEY}, but the actual minimum of the 41 joined values is ${minKey} (${minValue})`,
    );

  const subject = values.get(SUBJECT_KEY);
  const comparison = values.get(COMPARISON_KEY);
  if (subject === undefined || comparison === undefined)
    throw new Error(`cannot check the claim: no joined value for ${SUBJECT_KEY} or ${COMPARISON_KEY}`);
  const ratio = subject / comparison;
  if (!(ratio > 8))
    violations.push(
      `the claim says "more than eight times" but ${SUBJECT_KEY} (${subject}) / ${COMPARISON_KEY} (${comparison}) = ${ratio.toFixed(2)}, not above 8`,
    );

  if (violations.length > 0)
    throw new Error(`claim check failed:\n  ${violations.join("\n  ")}`);

  return { subject: { key: maxKey, value: maxValue }, comparison: { key: minKey, value: minValue }, ratio };
}

/**
 * Every figure a reader receives, written from the joined rows rather than typed beside them: how
 * many countries were actually drawn, which year the csv holds, how many classes `CO2_BREAKS` cuts
 * and where its ends sit, and the two extreme readings `checkClaim` has just pinned.
 */
export function claimSentences({ count, breaks, claim, year, names }) {
  const nameOf = (key) => names.get(key) ?? key;
  const tonnes = (v) => v.toFixed(1);
  const subjectName = nameOf(claim.subject.key);
  const comparisonName = nameOf(claim.comparison.key);
  const title =
    `The ${subjectName}' per-capita CO₂ emissions are the highest of the ${count} countries ` +
    `on this map — more than eight times ${comparisonName}'s, the lowest`;
  const legendCaption = `CO₂ emissions per capita, tonnes/person, ${year}`;
  const alt =
    `A choropleth of ${count} European countries shaded by ${year} per-capita CO2 emissions, ` +
    `in ${breaks.length + 1} classes from under ${breaks[0]} to ${breaks[breaks.length - 1]} tonnes ` +
    `and over. The darkest class on the map is the ${subjectName}, outlined in this map's accent ` +
    `colour, at ${tonnes(claim.subject.value)} tonnes per person — the highest reading here. The ` +
    `lightest is ${comparisonName}, outlined in ink, at ${tonnes(claim.comparison.value)} tonnes per ` +
    `person — the lowest.`;
  return { title, legendCaption, alt };
}

/** `Code,Entity,Year,value` — the csv's own country names and its own single reference year, so
 *  neither has to be retyped in a sentence. Natural Earth's shape names are abbreviations
 *  ("Faeroe Is."); the source table spells them out, and it is the source's spelling a reader of
 *  the credit line would look up. */
export function labelsFromCsv(csv) {
  const [, ...lines] = csv.trim().split(/\r?\n/);
  const names = new Map();
  const years = new Set();
  for (const line of lines) {
    const [code, entity, year] = line.split(",");
    names.set(code, entity);
    years.add(year);
  }
  if (years.size !== 1) throw new Error(`expected one reference year in the csv, got ${[...years].join(", ")}`);
  return { names, year: [...years][0] };
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
  /** THE TINTS ARE THE PLATE'S OWN, READ BACK — never a second constant in this file. `bake-plate.mjs`
   *  records what it actually painted, from the trunk's `plateTints`; a plate baked before that was
   *  recorded has no answer here and is refused rather than guessed at, because the live layer would
   *  then paint one basemap and the plate under it another. */
  if (!geometry.tints?.water || !geometry.tints?.land)
    throw new Error(
      "this plate predates the MEASURED tints: re-bake it. Before `plateTints` reached this beat the " +
        "basemap was a typed `#AAC9E0` for water and the provider's own colour for land — 1.730:1 " +
        "against this white page, over the trunk's BASEMAP_MAX of " +
        `${BASEMAP_MAX}:1, and a sea/land floor of ${SEA_LAND_MIN}:1 nobody had measured against.`,
    );
  const ramp = choroplethRamp(ground, accent, breaks, geometry.tints.land);

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
        color: fillFor(region.value, ramp, breaks),
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

  /**
   * THE LIVE CAMERA FITS THE BOX THE PLATE'S CAMERA WAS FITTED TO — `bake-plate.mjs`'s
   * `studyBoundsOf`, recorded in `geometry.json`, transported rather than re-derived here.
   *
   * This used to be the union of the drawn rings CLAMPED to the plate's `frameCorners`, and both
   * halves of that were wrong once the camera stopped being a typed box. The union is not the study
   * set: `keepRing` keeps a ring that INTERSECTS the frame with a 40px margin, so Portugal's Azores
   * survive the cull, and the union then reached −31.28°E — measured, the live camera opened on
   * 71.4° of longitude against the plate's 66.3° and drew the mid-Atlantic the plate does not show.
   * And the clamp is the plate's own frame, which already carries the bake's padding, so the live
   * camera was padding a padded box.
   *
   * One box, one rule: the plate pads it by `fitPadding` at the plate's own size, the live map pads
   * the SAME box by `fitPadding` at the reader's container size. That is why they frame one Europe.
   *
   * `west`/`east`/`south`/`north` above are still computed, and still used — for `smallestDrawn` and
   * for the refusal below: a plan whose recorded bounds hold none of the drawn shapes is a plate and
   * a geometry from two different bakes.
   */
  const asked = geometry.bounds;
  if (!Array.isArray(asked) || asked.length !== 2)
    throw new Error(
      "this plate records no `bounds`: it predates the camera being read off the study set, so the " +
        "live map has no box to fit that the plate was also fitted to. Re-bake it.",
    );
  const studyBounds = { west: asked[0][0], south: asked[0][1], east: asked[1][0], north: asked[1][1] };
  if (!(west < studyBounds.east && east > studyBounds.west && south < studyBounds.north && north > studyBounds.south))
    throw new Error(
      `the recorded camera box (${studyBounds.west}..${studyBounds.east}°E, ` +
        `${studyBounds.south}..${studyBounds.north}°N) does not meet the drawn shapes ` +
        `(${west.toFixed(2)}..${east.toFixed(2)}°E, ${south.toFixed(2)}..${north.toFixed(2)}°N): ` +
        `the plate and this geometry came from two different bakes`,
    );

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
    /** The style's NAME as well as its URL: the URL carries the key placeholder, and a refusal that
     *  prints it would print a key on a delivered page. */
    styleName: geometry.style,
    // The two colours the plate was actually painted in, so `applyLiveStyle` paints the same ones.
    tints: geometry.tints,
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

/**
 * THE BEAT'S OWN DIRECTION, RESOLVED TO FACES THAT CAN SET ITS OWN WORDS.
 *
 * `resolveDirectionFamilies` walks each register's LADDER and takes the first family whose cmap
 * covers the text that register will actually set on this page — so the serif here is whatever
 * covers these 41 country names, this caveat and these class boundaries, not something typed.
 * A register whose text no family on its ladder can set REFUSES rather than substitutes, which is
 * the whole reason the ladder exists.
 *
 * Every string passes through `plainSpaces` first: one U+202F or U+00A0 refuses every family and
 * takes the render down with a message naming a code point rather than a word.
 */
function directionFor(props) {
  const path = fileURLToPath(import.meta.resolve(`#shared/design-base/directions/${SEED.direction}.md`));
  const filed = readDirection(path);
  // A direction records the ground it was measured against; `PALETTE.md` records the ground this
  // beat draws on. Two grounds are two furniture ladders, and `deriveFurniture` only ever sees one
  // of them — so they are compared rather than assumed to agree.
  if (filed.ground.toUpperCase() !== String(props.ground).toUpperCase())
    throw new Error(
      `direction "${SEED.direction}" is filed on ground ${filed.ground} and this beat's PALETTE.md ` +
        `records ${props.ground}. A direction's registers are measured against its own ground; ` +
        `pick the direction that matches the recorded palette, or re-record the palette.`,
    );
  const names = props.rows.map((r) => r.name).join(" ");
  const values = props.rows.map((r) => regionDetail(r)).join(" ");
  const ticks = [0, ...props.breaks].map((t) => `${t}`).join(" ");
  const textPerRegister = {
    display: props.title,
    eyebrow: props.legendCaption,
    body: `${props.caveat} ${props.source} ${props.basemapCredit}`,
    axis: ticks,
    annot: `${names} ${values}`,
    value: `${names} ${values}`,
  };
  for (const key of Object.keys(textPerRegister)) textPerRegister[key] = plainSpaces(textPerRegister[key]);
  return resolveDirectionFamilies(filed, textPerRegister);
}

async function renderMapWeb({ component, table, props, outDir, name, live = false, plan = null }) {
  const furniture = deriveFurniture(props.ground);
  // The registers, as CSS. `webRegisters` needs the three ink ROLES a register may ask for; it is
  // handed this beat's OWN furniture and its OWN recorded accent, never the direction's colours —
  // `PALETTE.md` is the colour authority here. Only the TYPE half of each register reaches the
  // stylesheet below; the `color:` rules are unchanged.
  const direction = directionFor(props);
  const regs = webRegisters(direction, {
    ink: { ink: furniture.ink, muted: furniture.muted, accent: props.accent },
  });
  const vars = figureVars(regs);
  console.log(
    `direction ${direction.name} (${SEED.direction}) — ` +
      direction.decisions.map((d) => `${d.register}:${d.family}`).join(", "),
  );
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
      `<script>\n${await liveScript()}\n</script>`
    : "";

  // THE PAGE'S OWN FAMILY, READ OFF WHAT THE COMPONENTS ACTUALLY ASKED FOR rather than typed into
  // the stylesheet. `dominantFontStack` reads the markup; `embeddedWebFaces` fetches and SUBSETS
  // each face to the characters this page can display; `assertFontsEmbedded` refuses a page naming a
  // family it does not carry. The document is assembled twice from one template — once to be read
  // for its font requests and its displayable text, once to be written with the faces in it.
  const stack = dominantFontStack(mapHtml + tableHtml);
  /** HOW WIDE THE PROSE IN THE READING COLUMN MAY SET, measured rather than typed.
   *
   *  The column beside the map takes whatever the map's aspect leaves, which at 1920x1080 is 880px.
   *  The legend is a GRAPHIC and is better for the room — six classes and their boundaries read
   *  further apart. The caveat is PROSE, and 880px of 11.5px type is about 160 characters a line,
   *  roughly twice any measure. `rapport.md` records its own reference's text column: **78
   *  characters**. This measures 78 characters OF THIS BEAT'S OWN CAVEAT, in the face and at the
   *  size the page actually sets it — the string's own width divided by its own length — so the cap
   *  follows the direction's face rather than a per-character constant somebody averaged once. */
  const proseMeasureCh = 78;
  const caveat = plainSpaces(props.caveat);
  const proseWidthPx = Math.round(
    (measureText(caveat, {
      fontFamily: direction.registers.body.family,
      fontSize: 11.5,
      fontWeight: direction.registers.body.fontWeight,
      italic: direction.registers.body.italic,
    }) /
      caveat.length) *
      proseMeasureCh,
  );
  const baseCss = buildCss({
    ...props,
    ...furniture,
    fontStack: stack,
    vars,
    proseWidthPx,
    frame: props.geometry.frame,
  });
  const page = (css) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(props.title)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
${css}
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

  const draft = page(baseCss);
  const faces = await embeddedWebFaces(fontRequestsInHtml(draft).requests, displayableTextOf(draft));
  const html = page(`${fontFaceCss(faces)}\n${baseCss}`);
  assertFontsEmbedded(html);

  await mkdir(outDir, { recursive: true });
  const outPath = join(outDir, name);
  await writeFile(outPath, html);
  return { outPath };
}

/** Strips the `export` keyword from each top-level declaration, and the `import` lines a trunk
 *  module is reached by — see `interaction.mjs`'s own header note for why the page gets a classic
 *  script rather than a module.
 *
 *  The import lines go rather than being rewritten because `liveScript` above concatenates the
 *  modules they name into the SAME script, in dependency order: once they are one script, every
 *  imported name is already a top-level binding in scope. */
function inlineable(moduleSource) {
  return moduleSource
    .replace(/^import\s*\{[^}]*\}\s*from\s*["'][^"']*["'];?[ \t]*\n/gm, "")
    .replace(/^export /gm, "");
}

function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildCss({ ground, accent, ink, muted, frame, fontStack, vars, proseWidthPx }) {
  if (!fontStack)
    throw new Error(
      "buildCss was given no font stack. This used to default to '\"sans-serif\"', which is not a " +
        "typographic decision anybody took — the caller reads the families the components asked for " +
        "('dominantFontStack') and the page carries them as bytes.",
    );
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
  /* THE FILED DIRECTION, AS CUSTOM PROPERTIES — 'figureVars' over this beat's own resolved
     registers. Every rule below that sets a family reads one of these, so the page's typographic
     voice is the direction's and not this stylesheet's. The SIZES this beat draws are its own and
     are left alone on purpose: a direction's sizes were measured for a 960 x 540 static plate. What
     a genre may not change is which FACE a register speaks in — and before this, the static
     choropleth of the same data on the same ground set its title in a serif while this page set
     everything in whatever 'dominantFontStack' fell through to. */
${Object.entries(vars).map(([k, v]) => `  ${k}: ${v};`).join("\n")}
}
* { box-sizing: border-box; }
body {
  margin: 0;
  padding: var(--page-pad);
  background: var(--ground);
  color: var(--ink);
  /* The family the components themselves asked for, carried as bytes by the @font-face block above.
     This rule used to say "Helvetica, Arial, sans-serif" — a licensed face nothing loaded, present
     on the author's Mac and on no CI runner, no Android phone and no Linux desktop. */
  font-family: ${fontStack};
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
/* Only the reading row gives up height. Measured, and not obvious: with 'min-height' here instead
   of 'height', the stage's own height stays INDEFINITE for container-query purposes and every 'cqh'
   inside it resolves to zero — the map collapses to its border and nothing is red. A definite
   height is what makes the stage a real size container. */
.map-web > *:not(.mw-body) { flex: 0 0 auto; }
/* THE MAP AND ITS READING, SIDE BY SIDE — and the reason is a measurement about this SUBJECT.
   The locator on this branch answered 'the map does not fill the page' by baking a landscape plate
   at the stage's own median aspect. That is right for a city, which has no aspect of its own. It is
   wrong here: the Mercator extent of the 41 countries this map draws measures 1.0075 to 1, so a
   landscape bake would add nothing but ocean — which is what map-web-discipline.md already says in
   writing about the format's own European seed.
   So the page is what changes. Stacked, the furniture below the map ate the very height that made
   the stage short, and the square map then filled 42-50% of the stage's width at five of the six
   desktop shapes it was measured at (1024x768 50%, 1280x800 42%, 1280x1200 74%, 1440x900 44%,
   1600x900 42%, 1920x1080 44%) — 700px of empty page beside a map that could not grow into it.
   Put the legend, the two direct notes and the caveat in that room instead and the map gets the
   height back AND the row fills. */
.mw-body {
  display: flex;
  flex: 1 1 auto;
  gap: 20px;
  min-height: 0;
}
/* FAMILY AND WEIGHT FROM THE DIRECTION'S DISPLAY REGISTER, size and line from this beat. The weight
   used to be a typed 700 that happened to equal this direction's; the family had no route here at
   all. The 'line-height' stays literal and is NOT the register's: 'figureVars' emits no line var,
   and this title wraps to two lines at every desktop width, so its leading is a block-height
   decision this page takes rather than the text rhythm of a paragraph. */
.mw-title {
  font-size: 21px;
  font-family: var(--title-family);
  font-weight: var(--title-weight);
  margin: 0 0 4px;
  line-height: 1.25;
}
/* The BODY register — including its slope. This direction files an italic body, and a direction
   whose prose is italic says so in every genre or it is not one direction. */
.mw-source {
  font-size: 13px;
  font-family: var(--source-family);
  font-style: var(--subtitle-style);
  color: var(--muted);
  margin: 0 0 12px;
}
/* The stage: the leftover height, and the container the map is measured against. 'container-type:
   size' is what lets the viewport below bound itself by the stage's HEIGHT as well as its width —
   CSS has no other way to say "as wide as you like, but never taller than the room left". */
/* The stage takes the row's HEIGHT and derives its width from the plate's own aspect, so the map is
   as large as the window allows and the row has no slack inside it to give away. 'flex: 0 1 auto' —
   it never grows past its aspect, and it yields first when the reading column reaches its floor. */
.mw-stage {
  flex: 0 1 auto;
  height: 100%;
  aspect-ratio: ${frame.width} / ${frame.height};
  container-type: size;
  min-height: 180px;
}
/* The reading column: everything that reads the map. It takes what the map's aspect leaves, down to
   a 300px floor — under that a class bar with six boundaries printed under it stops being readable
   as a scale, which is the one thing on this page colour is not the only channel for. */
.mw-reading {
  /* Grows into whatever the map's aspect leaves; NEVER shrinks under 300px. 'flex-shrink: 0' is
     the half that matters: with the default 1, a tall window handed the column 162px at 900x1400 —
     a class bar with six boundaries printed under it, in 162px. */
  flex: 1 0 300px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}
/* …AND WHEN THE ROOM THE WINDOW LEAVES IS VERTICAL, THE READING GOES BACK UNDERNEATH.
   The row exists because a square map in a wide, short window leaves its room beside it. A window
   taller than it is wide leaves the room below, and forcing the row there costs the map more than
   the column gains: measured at 900x1400, side by side gives a 548px map, stacked gives 868px.
   The condition is the window's own aspect, which is exactly the thing being reasoned about. */
@media (max-aspect-ratio: 1 / 1) {
  .mw-body { flex-direction: column; }
  .mw-stage { flex: 1 1 auto; height: auto; width: 100%; aspect-ratio: auto; }
  .mw-reading { flex: 0 0 auto; overflow-y: visible; }
  .mw-legend { margin-top: 14px; }
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
  /* Left-aligned, not centred: when the WINDOW's height is what bounds the map, the leftover room
     is horizontal, and a centred map floats away from the title, the legend and the caveat, which
     are all flush left at full width. */
  margin-inline: 0 auto;
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
/* THE RING: the hit target this beat already places over its two smallest claim regions, made
   visible. 'currentColor' — the accent for the subject, ink for the comparison — over a ground-
   coloured outer ring, so it separates from whatever class its neighbours landed in, exactly the
   way the claim outline under it does. It is drawn in the overlay, so it is a fixed CSS size at
   every container width and follows the live camera with every other '.pt'. */
.mw-ring {
  border: 1.6px solid currentColor;
  box-shadow: 0 0 0 1.4px var(--ground);
  background: transparent;
}
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
/* Flush with the map's own top edge now that it sits beside it rather than under it. */
.mw-legend { margin: 0 0 6px; }
/* The EYEBROW register: a short label over a scale is exactly what this caption is, so its family,
   weight and tracking come from the direction rather than from a typed 600 that matched nothing. */
.mw-legend-caption {
  font-size: 12.5px;
  font-family: var(--eyebrow-family);
  font-weight: var(--eyebrow-weight);
  letter-spacing: var(--eyebrow-tracking);
  color: var(--muted);
  margin: 0 0 8px;
}
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
/* The AXIS register: these are the class boundaries, which is what an axis is on this type. */
.mw-legend-tick { flex: 1 1 0; position: relative; font-size: 11px; font-family: var(--axis-family); color: var(--muted); }
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
/* The two direct notes: the VALUE register, which is what a named reading beside its own number is.
   Its weight comes from the register too — the typed 700 that used to be here is the direction's,
   but by coincidence rather than by route. */
.mw-subject {
  font-size: 12.5px;
  font-family: var(--label-family);
  font-weight: var(--label-weight);
  color: var(--accent);
  margin: 20px 0 2px;
}
.mw-comparison {
  font-size: 12.5px;
  font-family: var(--label-family);
  font-weight: var(--label-weight);
  color: var(--ink);
  margin: 0 0 8px;
}
/* The BODY register, slope included — this is prose, and it is the one thing in the reading column
   that is capped. The column takes the room the map's aspect leaves (880px at 1920x1080); the class
   bar above is a graphic and is better for it, but prose set that wide runs about 160 characters a
   line. The cap is 78 characters of this beat's own caveat, measured in this face at this size —
   see 'proseWidthPx' in this file, and 'rapport.md' for where 78 comes from. */
.mw-caveat {
  font-size: 11.5px;
  font-family: var(--subtitle-family);
  font-style: var(--subtitle-style);
  color: var(--muted);
  margin: 0;
  max-width: ${proseWidthPx}px;
  line-height: 1.35;
}
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
    { cwd: resolve(HERE, "../../.."), stdio: "inherit" },
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
  const shapes = joinShapes(CO2_2023_STUDY, geometry.shapes);

  // The value-side join: every declared code must find a value in the frozen csv
  // (`geo-discipline.md` rule 5, made real — no alias, no declared no-data: this beat's study set
  // is exactly the 41 codes both sources actually carry).
  const csv = await readFile(valuesPath, "utf8");
  const values = valuesFromCsv(csv);
  const { rows } = joinValues(CO2_2023_STUDY, values, { alias: {}, expectedNoData: [] });

  const valueByKey = new Map(rows.map((r) => [r.key, r.value]));

  // The name a reader is shown comes from the SOURCE TABLE, never from the shapefile. Natural
  // Earth's `NAME` is a cartographic abbreviation sized to fit inside a polygon — "Faeroe Is.",
  // "Bosnia and Herz." — and the frozen `countries.geojson` carries no long form at all. Those
  // abbreviations used to reach the tooltip, the region table, the accessible label and the
  // legend callout, under a headline this same script spells "the Faroe Islands" out of the csv:
  // one artifact naming one country two ways. `displayName` throws rather than silently falling
  // back, so a code the csv stops naming cannot quietly reintroduce an abbreviation.
  const { names, year } = labelsFromCsv(csv);
  const displayName = (key, shapeName) => {
    const spelled = names.get(key);
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

  // The claim, checked against the ACTUAL joined values, not just asserted true in the title.
  const claim = checkClaim(values);

  const { title, legendCaption, alt } = claimSentences({
    count: named.length,
    breaks: CO2_BREAKS,
    claim,
    year,
    names,
  });
  console.log(`title: ${title}`);
  console.log(`alt: ${alt}`);

  const collection = JSON.parse(await readFile(shapesPath, "utf8"));
  const rings = liveRings(collection, CO2_2023_STUDY, geometry);
  const furniture = deriveFurniture(SEED.ground);
  const plan = SEED.live
    ? livePlan({
        geometry,
        regions: named,
        rings,
        breaks: CO2_BREAKS,
        ground: SEED.ground,
        ink: furniture.ink,
        accent: SEED.accent,
      })
    : null;

  /** THE PLAN IS CHECKED WHERE IT IS WRITTEN, not only where it is read. `live-map.mjs` validates
   *  the plan it finds in the page, which is the right place for a file that arrives from another
   *  machine — but a plan that only fails in the reader's browser is a defect that ships. These three
   *  are the trunk's, so the build and the page ask the same questions of the same object. */
  if (plan) {
    assertNoDoubledBasemap(plan);
    const complaints = [...validateLivePlan(plan), ...validateExpressions(plan)];
    if (complaints.length)
      throw new Error("this beat's live plan is not renderable:\n  - " + complaints.join("\n  - "));
  }

  const { outPath } = await renderMapWeb({
    component: ChoroplethWeb,
    table: RegionTable,
    props: {
      geometry: { frame: geometry.frame, shapes: named },
      rows: named,
      breaks: CO2_BREAKS,
      plate,
      title,
      source: SEED.source,
      basemapCredit: SEED.basemapCredit,
      legendCaption,
      caveat: SEED.caveat,
      alt,
      ground: SEED.ground,
      accent: SEED.accent,
      // The plate's own basemap land, read back: the ramp's lowest class is measured against it.
      landTint: geometry.tints?.land,
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
      `claim: ${claim.subject.key} (${claim.subject.value}) / ${claim.comparison.key} (${claim.comparison.value}) = ${claim.ratio.toFixed(2)}x` +
      (plan
        ? `\nlive: study ${plan.studyBounds.west.toFixed(2)}..${plan.studyBounds.east.toFixed(2)}°E, ` +
          `${plan.studyBounds.south.toFixed(2)}..${plan.studyBounds.north.toFixed(2)}°N · ` +
          `zoom headroom ${plan.minZoomHeadroom.toFixed(2)} · ` +
          `${(JSON.stringify(plan).length / 1024).toFixed(1)} KB of plan`
        : "\nlive: off"),
  );
}

export { render, renderMapWeb, ensurePlate, loadPlate, SEED, PLATE_SIZE, DEFAULT_PLATE_DIR };
