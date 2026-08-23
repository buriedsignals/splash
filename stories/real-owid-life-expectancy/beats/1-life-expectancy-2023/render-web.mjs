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
  LIFE_EXPECTANCY_STUDY,
  LIFE_EXPECTANCY_BREAKS,
  bboxCenter,
  boundingBoxOf,
  joinShapes,
  joinValues,
  keepRing,
  unmatchedValues,
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
// to `LIFE_EXPECTANCY_STUDY` and the map drew 42. The two country NAMES stay in the wording because
// `checkClaim` already refuses to render if either stops being the extreme it is named as.
// The colours are READ, not typed — see `PALETTE.md` beside this file. The class shading is
// this map's data, so the accent reaches the ramp and not only the subject outline.
// STOPS AT THE STORY, not at `beats/`. The file this was copied from lives directly under
// `proof/`, where one level up IS the boundary; a beat under `stories/<slug>/beats/<id>/` needs
// two, because `PALETTE.md` is a STORY-level record — one answer for the story's whole run — and
// a walk that stops at `beats/` never reaches it and refuses a palette that is sitting right
// there.
const PALETTE = readPalette(HERE, { stopAt: resolve(HERE, "../..") });
console.log(
  `palette from ${PALETTE.source} — ground ${PALETTE.ground}, accent ${PALETTE.accent}, ` +
    `chosen by ${PALETTE.origin}`,
);

const SEED = {
  ground: PALETTE.ground,
  accent: PALETTE.accent,
  // THE SHORT FORM ON THE GRAPHIC, the full one in the hand-over. The four-study citation the story
  // records as its credit runs four lines on a phone above a map 180px tall, which inverts what the
  // reader came for; `STORYBOARD.md`'s `credit:` field carries it in full and `HANDOVER.md` prints
  // it beside the file.
  source: "UN World Population Prospects (2024) and three earlier series, via Our World in Data",
  basemapCredit: "shapes: Natural Earth 1:50m · basemap © MapTiler, © OpenStreetMap",
  // THE ARTICLE'S OWN CAUTION FIRST, in the words the dataset itself uses, and short enough to read
  // on a phone: the first draft ran six lines at 375px and pushed the beat 106px past the window.
  // The eight territories are named in full in the alt text and every one of them is a row in the
  // table, which is where a reader who needs the list will actually look.
  caveat:
    "Period life expectancy is not a forecast: it is the years a newborn would live if the chances " +
    "of dying at each age stayed exactly as they were in 2023. Monaco holds the highest reading in " +
    "the file and is under a pixel here — the table carries it, and every other country drawn. " +
    "Eight territories the source reports separately are drawn nowhere and are in no table on this " +
    "page: Natural Earth folds each of them into the state that administers it.",
  // Ruling R1: map × web is a LIVE MapTiler map. Set this false for a beat that must stay
  // request-free (an offline archive, a CMS with a Content-Security-Policy that refuses
  // api.maptiler.com) — the page then ships as the fallback layer alone.
  live: true,
};
// The plate is baked at the WIDTH the world needs, not a square edge: see `bake-plate.mjs`'s own
// `BEAT` comment. Its height is derived there and read back off `geometry.json`.
const PLATE_SIZE = 1200;
// THE BOX RANGE THIS BEAT IS DELIVERED INTO, measured on its own rendered page at the three widths
// this format drives — the second input the bake needs since 2026-08-23 (`delivery-frame.mjs`). It
// is a property of THIS beat's furniture, not of the format, and it is read back with
// `bun skills/map-web/scripts/verify-fills-the-box.mjs <page.html>`, which refuses a page whose real
// range has escaped the range its plate was baked for.
const PLATE_BOX_ASPECTS = "1.317,2.572";
// The room this beat's own labels need inside the crop, as a fraction of the box on each side —
// measured the same way, by the runs the page actually cut. `0,0` is a beat whose every run is whole.
const PLATE_CLEARANCE = "0,0";
// FROZEN BESIDE THE BEAT, for the same reason its csv is: a basemap living in `/tmp` cannot be
// committed, so the delivered html could not be reproduced or audited — and MapTiler restyles, so
// a re-bake months later is a different picture under the same shapes. `ensurePlate` below bakes
// only when this folder is empty.
const DEFAULT_PLATE_DIR = join(HERE, "plate");
const DEFAULT_VALUES_PATH = join(HERE, "life-expectancy-2023.csv");
const DEFAULT_SHAPES_PATH = join(HERE, "countries.geojson");
// `renders/`, PLURAL, and that is not a spelling preference. The story's own AGENTS.md and
// `whereIs` (`beats/<id>/renders`) both name that directory as where a beat's rendered draft
// lives, and `writeOutputReview` refuses to bind an approval to anything else. The beat this
// file was copied from writes `render/`, singular, which is invisible to all three: with the
// page fully rendered, `whereIs` still answered {"phase":"production","missing":[]}, the same
// answer it gives a beat nobody has started.
const DEFAULT_OUT_DIR = join(HERE, "renders");
const OUTPUT_NAME = "life-expectancy-2023.html";
// Mirrors `ChoroplethWeb.tsx`'s own two keys — the lowest reading on the map, and the highest
// one a reader can actually point at.
const SUBJECT_KEY = "NGA";
const COMPARISON_KEY = "JPN";
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

/** Shape key → source key, wherever the two sources spell one territory differently. Measured
 *  against this beat's own two frozen files, never copied from another beat. */
export const SHAPE_TO_SOURCE = {
  SDS: "SSD",
  SAH: "ESH",
  PSX: "PSE",
  KOS: "OWID_KOS",
};

/** Shapes this source genuinely does not report — declared, so that any other silent shape is a bug
 *  and throws. Uninhabited or unrecognised: South Georgia, the British Indian Ocean Territory,
 *  Pitcairn, Somaliland, the French Southern and Antarctic Lands, Åland, Northern Cyprus, the
 *  Australian Indian Ocean Territories, Heard Island, Norfolk Island, Ashmore and Cartier, and the
 *  disputed Kashmir polygon. */
export const EXPECTED_NO_DATA = [
  "SGS",
  "IOT",
  "PCN",
  "SOL",
  "ATF",
  "ALD",
  "CYN",
  "IOA",
  "HMD",
  "NFK",
  "ATC",
  "KAS",
];

/** What a reader is shown for a shape the source never reports. English, because this story's
 *  recorded language is `en`; each one is the territory's own common name rather than Natural
 *  Earth's polygon-sized abbreviation. Same twelve keys as `EXPECTED_NO_DATA`, in the same order. */
export const NO_DATA_NAMES = {
  SGS: "South Georgia and the South Sandwich Islands",
  IOT: "British Indian Ocean Territory",
  PCN: "Pitcairn Islands",
  SOL: "Somaliland",
  ATF: "French Southern and Antarctic Lands",
  ALD: "Åland Islands",
  CYN: "Northern Cyprus",
  IOA: "Australian Indian Ocean Territories",
  HMD: "Heard Island and McDonald Islands",
  NFK: "Norfolk Island",
  ATC: "Ashmore and Cartier Islands",
  KAS: "Kashmir (disputed)",
};

/** Readings this source carries that no shape in the 1:50m file claims, because Natural Earth draws
 *  them inside the state that administers them. Eight real readings that will appear NOWHERE on
 *  this map — which the doctrine calls worse than a bad join, because a no-data shape is at least
 *  visible and wrong-coloured, and a value with no shape leaves no mark anywhere to be wrong. They
 *  are named here, and named again in the caveat the reader sees. */
export const EXPECTED_EXTRA_VALUES = [
  "BES",
  "GIB",
  "GLP",
  "GUF",
  "MTQ",
  "MYT",
  "REU",
  "TKL",
];

/** The threshold the claim is about, and the six drawn countries that sit under it — PINNED BY CODE
 *  so that a seventh country arriving under sixty years turns the render red instead of leaving a
 *  stale sentence under a redrawn map.
 *
 *  The continent half of the claim is a DECLARATION, not a measurement, and this says so out loud:
 *  the frozen inputs carry no region column, so "all six are in sub-Saharan Africa" was checked by
 *  hand against exactly these six names and has to be checked again if this list ever changes. */
const THRESHOLD_YEARS = 60;
const UNDER_THRESHOLD = ["NGA", "TCD", "LSO", "CAF", "SSD", "SOM"];

/**
 * THE CLAIM, CHECKED AGAINST THE ACTUAL JOINED VALUES — never merely asserted in the title.
 *
 * The claim is a THRESHOLD, not a ranking, so three different things are checked and each can fail
 * on its own: that exactly six DRAWN countries read under sixty years; that they are the six named
 * above; and that the subject the map outlines really is the lowest of everything drawn.
 *
 * `drawnKeys` is what makes the first two honest. The frozen csv carries 237 readings and this map
 * draws 229 of them — eight territories the source reports separately have no shape of their own in
 * Natural Earth. Counting "under sixty" over the csv rather than over what is DRAWN would state a
 * number about the map that the map does not show.
 */
export function checkClaim(values, drawnKeys) {
  const violations = [];
  const drawn = [...values.entries()].filter(([key]) => drawnKeys.has(key));
  if (drawn.length === 0) throw new Error("cannot check the claim: nothing was drawn");

  const under = drawn.filter(([, value]) => value < THRESHOLD_YEARS).sort((a, b) => a[1] - b[1]);
  const found = under.map(([key]) => key);
  if (found.length !== UNDER_THRESHOLD.length)
    violations.push(
      `the claim says ${UNDER_THRESHOLD.length} drawn countries read under ${THRESHOLD_YEARS} years; ${found.length} do (${found.join(", ")})`,
    );
  const missing = UNDER_THRESHOLD.filter((key) => !found.includes(key));
  const extra = found.filter((key) => !UNDER_THRESHOLD.includes(key));
  if (missing.length > 0) violations.push(`named as under ${THRESHOLD_YEARS} but is not: ${missing.join(", ")}`);
  if (extra.length > 0) violations.push(`under ${THRESHOLD_YEARS} but not named: ${extra.join(", ")}`);

  const [minKey, minValue] = drawn.reduce((a, b) => (b[1] < a[1] ? b : a));
  const [maxKey, maxValue] = drawn.reduce((a, b) => (b[1] > a[1] ? b : a));
  if (minKey !== SUBJECT_KEY)
    violations.push(
      `the claimed subject is ${SUBJECT_KEY}, but the lowest of the ${drawn.length} drawn readings is ${minKey} (${minValue})`,
    );

  const comparison = values.get(COMPARISON_KEY);
  if (comparison === undefined)
    throw new Error(`cannot check the claim: no joined value for ${COMPARISON_KEY}`);

  if (violations.length > 0) throw new Error(`claim check failed:\n  ${violations.join("\n  ")}`);

  return {
    subject: { key: minKey, value: minValue },
    comparison: { key: COMPARISON_KEY, value: comparison },
    highest: { key: maxKey, value: maxValue },
    under: under.map(([key, value]) => ({ key, value })),
    drawn: drawn.length,
  };
}

/**
 * Every figure a reader receives, written from the joined rows rather than typed beside them: how
 * many countries were actually DRAWN, which year the csv holds, where the classes cut, the six
 * countries under the threshold in their own order, and the two readings `checkClaim` has pinned.
 */
export function claimSentences({ count, noData, breaks, claim, year, names }) {
  const nameOf = (key) => names.get(key) ?? key;
  const years = (v) => v.toFixed(1);
  const list = (keys) =>
    keys.length < 2 ? keys.map(nameOf).join("") : `${keys.slice(0, -1).map(nameOf).join(", ")} and ${nameOf(keys[keys.length - 1])}`;
  const underNames = list(claim.under.map((row) => row.key));
  // ONE CLAUSE. The first draft named all six countries and the map's own count in the headline; at
  // 375px that ran to eight lines and pushed the map itself 166px past the bottom of the window.
  // The names are the SUBJECT NOTE's job and the counts are the LEGEND CAPTION's, which is where a
  // reader looks for them anyway.
  const title =
    `In ${year} every country where a newborn could expect fewer than ${THRESHOLD_YEARS} years of ` +
    `life was in sub-Saharan Africa`;
  const legendCaption =
    `Period life expectancy at birth, years, ${year} — ${count} countries drawn, ` +
    `${noData} territories with no reading`;
  const alt =
    `A world choropleth of ${count} countries shaded by ${year} period life expectancy at birth, ` +
    `in ${breaks.length + 1} classes: under ${breaks[0]} years, then five-year classes, then ` +
    `${breaks[breaks.length - 1]} years and over, with ${noData} further territories the source ` +
    `does not report drawn in the no-reading class. The ${claim.under.length} countries in the ` +
    `lowest class are ${underNames}, all of them in sub-Saharan Africa. ` +
    `${nameOf(claim.subject.key)}, outlined in this map's accent colour, is the lowest reading ` +
    `drawn here at ${years(claim.subject.value)} years; ${nameOf(claim.comparison.key)}, outlined ` +
    `in ink, is at ${years(claim.comparison.value)} years. The highest reading in the source is ` +
    `${nameOf(claim.highest.key)} at ${years(claim.highest.value)} years, too small to see at this ` +
    `scale and readable in the table below.`;
  const subjectNote =
    `The ${claim.under.length}, lowest first: ${underNames} — ` +
    `${years(claim.under[0].value)} to ${years(claim.under[claim.under.length - 1].value)} years`;
  const comparisonNote =
    `${nameOf(claim.comparison.key)} ${years(claim.comparison.value)} is the highest reading big ` +
    `enough to point at; ${nameOf(claim.highest.key)} ${years(claim.highest.value)}, the file's ` +
    `highest, is under a pixel at this scale`;
  return { title, legendCaption, alt, subjectNote, comparisonNote };
}

/** `Code,Entity,Year,value` — the csv's own country names and its own single reference year, so
 *  neither has to be retyped in a sentence. Natural Earth's shape names are abbreviations
 *  ("Faeroe Is."); the source table spells them out, and it is the source's spelling a reader of
 *  the credit line would look up. */
export function labelsFromCsv(csv) {
  const [, ...lines] = parseCsvRows(csv.trim());
  const names = new Map();
  const years = new Set();
  for (const line of lines) {
    const [code, entity, year] = line;
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

async function renderMapWeb({ component, table, props, outDir, name, live = false, plan = null }) {
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
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(props.title)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
${buildCss({ ...props, ...furniture, frame: props.geometry.frame , cannotCover: props.geometry.cannotCover ?? null })}
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
  const limit = props.geometry?.cannotCover
    ? `this beat does not fill its container: ${props.geometry.cannotCover.why}. ` +
      `The box keeps the plate's own ${props.geometry.frame.width}x${props.geometry.frame.height} shape and is centred; ` +
      `filling the width would crop the study set instead. See delivery-frame.mjs, "cannotCover".`
    : null;
  if (limit) console.log(limit);
  return { outPath, limit };
}

/** Strips the `export` keyword from each top-level declaration — see `interaction.mjs`'s own
 *  header note for why. */
function inlineable(moduleSource) {
  return moduleSource.replace(/^export /gm, "");
}

function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildCss({ ground, accent, ink, muted, frame, cannotCover = null }) {
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
/* THE GRAPHIC TAKES THE WHOLE BOX, ON BOTH AXES. The owner, looking at a real delivered page in a
   2990px window (2026-08-23): *the map must take all the available width, every time* — and then,
   on the correction that followed, *the height is not an editorial choice either; like the scrolly,
   it must take all the space available.* One rule, both axes: the graphic occupies the whole box
   its host gives it, and the host decides that box.

   WHAT THIS REPLACES, AND WHY THE OLD RULE WAS NOT ENOUGH. The viewport used to be
   'width: min(100cqw, calc(100cqh * aspect))' with an 'aspect-ratio' — the PLATE's shape, sized
   inside the stage and centred. Every word of the reasoning under that was sound: a plate is never
   stretched to a shape it was not baked for (geo-discipline.md — that is a lie about distance and
   shape), so a plate squarer than its container is smaller by construction and centring is how a
   smaller graphic sits in the room it was given. The frame guard was even re-measured in that
   light, from an AREA against the window to the fraction of the axis the box is BOUND on, because
   the area punished a correct bake for the shape of its own camera. And it is exactly why the page
   the owner was looking at passed every check: Japan's plate is 1000x1089, the box is bound on
   height, it fills that height (the binding reading was 62.9%) — and the box covered 33.2% of the
   container's width, 520.1px of 1568px at 1600x900. The question the guard was answering was "how
   well does this box fit its plate"; the question that matters to a reader is "how much of the room
   it was given did the graphic take".

   SO THE BOX IS THE STAGE, AND THE PLATE IS WHAT ADAPTS. Nothing here is stretched and no page
   ground is allowed inside the frame: the two layers that carry the plate's own coordinate system
   are sized to COVER this box — scaled uniformly until they fill it on both axes, centred, with the
   overflow clipped — so the spare room shows MORE BASEMAP, ocean and the neighbouring coast, which
   is what a newsroom map looks like. That is the same answer 'scrolly''s map track already gives
   ("COVER, not contain … A contain fit would letterbox a near-square European plate inside a wide
   frame and leave a third of the picture as bare ground",
   proof/mapscrolly-one-map-europe-carbon/map-drive.mjs) — reached in CSS rather than in a scroll
   transform, because a map-web page has to be right with JavaScript off.

   The BAKE is what makes the crop safe: 'delivery-frame.mjs' solves the frame from the study set
   AND from the measured range of box shapes this beat is delivered into, so every crop the layout
   can ask for eats basemap and never the subject. 'verify-fills-the-box.mjs' reads that back off
   the rendered page. */
.mw-viewport {
  position: relative;
  width: 100%;
  height: 100%;
  /* The container the two plate layers below measure themselves against. 'size', not 'inline-size':
     the cover arithmetic needs BOTH axes of this box, which is the whole difference between filling
     a width and filling a box. */
  container-type: size;
  /* A CROPPING BOX MUST CLIP. This was 'visible' so that a point LABEL — a name, which is data —
     could spill into the page's own side gutter rather than lose its last letters at 375px
     ('Stockholm' and 'Warsaw' each lost 3-4px, measured). That trade is gone with the box that made
     it: the plate now extends PAST this box on the axis with room to spare, so anything visible
     outside the frame would be un-cropped basemap, not a rescued word. The labels are drawn at
     their marks and the marks sit inside the study set, which the bake keeps clear of the crop on
     every box shape this beat is delivered into — so the room a label needs is basemap, not gutter. */
  overflow: hidden;
  border: 1px solid var(--muted);
  /* NEUTRALISED, and '!important' is right here for the reason it was right when this rule EMITTED
     an aspect-ratio: every map-web component writes 'aspectRatio' as an INLINE style on this same
     element, and an inline style outranks any ordinary stylesheet rule. With both width and height
     definite the property has no effect anyway — but "has no effect anyway" is exactly the kind of
     reasoning that shipped a 451x2px map in round six, so the box is told its shape rather than
     left to inherit one from a beat's own file. */
  aspect-ratio: auto !important;
}
/* The two map layers occupy the SAME box, the live one underneath. It is laid out from the first
   frame rather than revealed later, because a container with no size is a map with no size:
   MapLibre reads the box at construction, and a display:none container gives it 0x0 and a canvas
   nothing ever paints into. Invisible-but-laid-out, then, and the swap is one flip of the
   fallback's own hidden attribute. */
.mw-fallback, .mw-live-map, .mw-overlay { position: absolute; inset: 0; width: 100%; height: 100%; }
/* THE COVER, AND IT IS THE WHOLE OF THE NEW RULE'S MECHANISM. The fallback plate and the overlay
   that carries this beat's marks and labels are ONE coordinate system — every mark is placed as a
   percentage of the plate — so they are sized together, to the same box, or the marks come off the
   map. That box is the smallest rectangle of the PLATE's own aspect that covers the viewport:
   'max(100cqw, 100cqh * aspect)' by 'max(100cqh, 100cqw / aspect)', centred. Scaling is uniform on
   both axes at every size, so nothing is stretched (geo-discipline.md); the viewport's
   'overflow: hidden' takes the overflow; and because the bake gave the plate real basemap around
   the study set, what is clipped is ocean.
   The live map is NOT in this box: a live canvas has no plate to keep registered with, it IS the
   container, so it stays at 'inset: 0' and fills the viewport directly.
   The plain 'width/height: 100%' left standing above is the fallback for a browser with no
   container query units — it contains rather than covers, which shows ground inside the frame but
   never a broken or stretched map. */
.mw-fallback, .mw-overlay {
  inset: auto;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: max(100cqw, calc(100cqh * ${aspect}));
  height: max(100cqh, calc(100cqw / ${aspect}));
}
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
/* B5.1. The viewport already takes the whole stage in both states; what changes live is that there
   is no plate to stay registered with. A live canvas IS the container and its camera fills it, so
   the overlay drops out of the cover box and back onto the viewport — 'live-map.mjs' re-projects
   every mark into the live camera, and a mark left in plate coordinates over a live map points at
   the wrong country. The fallback goes with it and is then hidden. */
html.mw-live .mw-fallback,
html.mw-live .mw-overlay {
  left: 0;
  top: 0;
  transform: none;
  width: 100%;
  height: 100%;
}
${
  cannotCover
    ? `/* THE ONE STUDY SET THE RULE CANNOT HOLD FOR, laid out the old way ON PURPOSE and said out
   loud rather than cropped in silence. A camera that already spans a full turn of longitude has no
   more world to its east or west (delivery-frame.mjs, 'cannotCover'), so filling a container WIDER
   than the world's own Mercator aspect can only be paid for out of latitude: measured on
   real-owid-life-expectancy at its widest box, 2.572:1 against a 1.472:1 world, filling the width
   costs 42.8% of the latitude range — everything south of 22.7°S and north of 71.8°N, which is
   Australia, New Zealand, southern Africa, most of South America and northern Canada and Russia.
   Full width, the whole subject, one window tall: this camera can have two of the three, and the
   two it keeps are the subject and the window. 'renderMapWeb' prints the reason, and
   'verify-fills-the-box.mjs' reports the shortfall as a stated exception rather than passing it.
   'container-type: normal' is what lets '100cqh' below resolve against .mw-stage again instead of
   self-referencing this box. */
.mw-viewport {
  container-type: normal;
  width: min(100%, calc(100cqh * ${aspect}));
  height: auto;
  max-width: 100%;
  margin-inline: auto;
  aspect-ratio: ${frame.width} / ${frame.height} !important;
}
.mw-fallback, .mw-overlay {
  inset: 0;
  left: auto;
  top: auto;
  transform: none;
  width: 100%;
  height: 100%;
}
`
    : ""
}.maplibregl-canvas-container canvas { outline: none; }
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
    [join(HERE, "bake-plate.mjs"), "--width", String(PLATE_SIZE), "--box-aspects", PLATE_BOX_ASPECTS, "--clearance", PLATE_CLEARANCE, "--out", plateDir],
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
  const shapes = joinShapes(LIFE_EXPECTANCY_STUDY, geometry.shapes);

  // The value-side join, and the three declarations that make it checkable (`geo-discipline.md`
  // rule 5). Every one of them was MEASURED against these two frozen files, not assumed:
  //
  //  - `SHAPE_TO_SOURCE`: four places where the two sources spell the same territory differently.
  //    Natural Earth's `SDS` is Our World in Data's `SSD` (South Sudan), `SAH` is `ESH` (Western
  //    Sahara), `PSX` is `PSE` (Palestine), and `KOS` is `OWID_KOS` — Kosovo has no ISO code of its
  //    own, so the source gives it an internal one. Unaliased, four real countries render as
  //    no-data and look entirely legitimate.
  //  - `EXPECTED_NO_DATA`: twelve shapes the source genuinely never reports. Declaring them is what
  //    makes any OTHER silent shape an error rather than a shrug.
  //  - the extra values: eight territories the source reports and Natural Earth folds into the
  //    state that administers them. Named one by one rather than waved through with "any", so a
  //    typo in a code still leaves a genuine stray refused.
  const csv = await readFile(valuesPath, "utf8");
  const values = valuesFromCsv(csv);
  const stray = unmatchedValues(LIFE_EXPECTANCY_STUDY, values, {
    alias: SHAPE_TO_SOURCE,
    expectedExtraValues: EXPECTED_EXTRA_VALUES,
  });
  if (stray.length > 0)
    throw new Error(`${stray.length} readings have no shape and were not declared: ${stray.join(", ")}`);
  const { rows } = joinValues(LIFE_EXPECTANCY_STUDY, values, {
    alias: SHAPE_TO_SOURCE,
    expectedNoData: EXPECTED_NO_DATA,
    expectedExtraValues: EXPECTED_EXTRA_VALUES,
  });

  const valueByKey = new Map(rows.map((r) => [r.key, r.value]));

  // The name a reader is shown comes from the SOURCE TABLE, never from the shapefile. Natural
  // Earth's `NAME` is a cartographic abbreviation sized to fit inside a polygon — "Faeroe Is.",
  // "Bosnia and Herz." — and the frozen `countries.geojson` carries no long form at all. Those
  // abbreviations used to reach the tooltip, the region table, the accessible label and the
  // legend callout, under a headline this same script spells "the Faroe Islands" out of the csv:
  // one artifact naming one country two ways. `displayName` throws rather than silently falling
  // back, so a code the csv stops naming cannot quietly reintroduce an abbreviation.
  const { names, year } = labelsFromCsv(csv);
  // TWO LEGITIMATE SOURCES FOR A NAME, and a hard refusal for anything outside them.
  //
  // The rule the copied code enforces — every reader-facing name comes from the SOURCE TABLE, never
  // from the shapefile — has no answer for a shape the source genuinely never reports, and this beat
  // has twelve of those. There is no csv row to read a name off, so the alternative to naming them
  // here is a tooltip reading "ALD". They are declared beside `EXPECTED_NO_DATA`, in the same order,
  // and `displayName` still throws for any key in neither list: a shape that quietly loses its name
  // is exactly the failure this refusal exists for.
  const displayName = (key) => {
    const spelled = names.get(SHAPE_TO_SOURCE[key] ?? key) ?? NO_DATA_NAMES[key];
    if (!spelled)
      throw new Error(
        `nothing names ${key}: it is not in the source table and not in this beat's own declared no-data names — every reader-facing name comes from one of those two, never from the shapefile`,
      );
    return spelled;
  };
  // ONE anchor per region, computed here and read by both halves: the component turns it into a
  // percentage of the frame for the fallback, and `livePlan` unprojects it into lon/lat for the
  // live camera. Two centroids computed in two spaces is exactly the class of defect this format
  // has already paid for once in radius and once in colour.
  const named = shapes.map((shape) => ({
    key: shape.key,
    name: displayName(shape.key),
    rings: shape.rings,
    value: valueByKey.get(shape.key) ?? null,
    anchor: bboxCenter(boundingBoxOf(shape.rings)),
  }));

  // The claim, checked against the ACTUAL joined values, not just asserted true in the title.
  const claim = checkClaim(values, new Set(named.map((r) => SHAPE_TO_SOURCE[r.key] ?? r.key)));

  const { title, legendCaption, alt, subjectNote, comparisonNote } = claimSentences({
    // WHAT THE SENTENCES COUNT is the shapes that found a READING, not the shapes drawn. 241
    // polygons are painted; 12 of them are the declared no-data class and carry no number, so "241
    // countries" in a headline would be a figure about the geography claiming to be a figure about
    // the data.
    count: named.filter((r) => r.value !== null).length,
    noData: named.length - named.filter((r) => r.value !== null).length,
    breaks: LIFE_EXPECTANCY_BREAKS,
    claim,
    year,
    names,
  });
  console.log(`title: ${title}`);
  console.log(`alt: ${alt}`);

  const collection = JSON.parse(await readFile(shapesPath, "utf8"));
  const rings = liveRings(collection, LIFE_EXPECTANCY_STUDY, geometry);
  const furniture = deriveFurniture(SEED.ground);
  const plan = SEED.live
    ? livePlan({
        geometry,
        regions: named,
        rings,
        breaks: LIFE_EXPECTANCY_BREAKS,
        ground: SEED.ground,
        ink: furniture.ink,
        accent: SEED.accent,
      })
    : null;

  const { outPath } = await renderMapWeb({
    component: ChoroplethWeb,
    table: RegionTable,
    props: {
      geometry: { frame: geometry.frame, shapes: named, cannotCover: geometry.cannotCover ?? null },
      rows: named,
      breaks: LIFE_EXPECTANCY_BREAKS,
      plate,
      title,
      source: SEED.source,
      basemapCredit: SEED.basemapCredit,
      legendCaption,
      caveat: SEED.caveat,
      alt,
      subjectNote,
      comparisonNote,
      ground: SEED.ground,
      accent: SEED.accent,
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
      `claim: ${claim.under.length} of ${claim.drawn} drawn readings under 60 years ` +
      `(${claim.under.map((r) => `${r.key} ${r.value}`).join(", ")}); lowest ${claim.subject.key} ` +
      `${claim.subject.value}; highest ${claim.highest.key} ${claim.highest.value}` +
      (plan
        ? `\nlive: study ${plan.studyBounds.west.toFixed(2)}..${plan.studyBounds.east.toFixed(2)}°E, ` +
          `${plan.studyBounds.south.toFixed(2)}..${plan.studyBounds.north.toFixed(2)}°N · ` +
          `zoom headroom ${plan.minZoomHeadroom.toFixed(2)} · ` +
          `${(JSON.stringify(plan).length / 1024).toFixed(1)} KB of plan`
        : "\nlive: off"),
  );
}

export { render, renderMapWeb, ensurePlate, loadPlate, SEED, PLATE_SIZE, DEFAULT_PLATE_DIR };
