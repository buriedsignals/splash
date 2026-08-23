// twin/proof/mapgen-dot-web/render-web.mjs
//
// The WEB format of the dot-density map: the same 42-country World Bank file
// `proof/mapmore-dot-population` ships as a still, turned into ONE self-contained HTML file — a LIVE
// MapTiler map (ruling R1) over a complete baked fallback: one fluid SVG carrying geometry only
// (plate, outlines, ~3,000 dots), one HTML overlay carrying every word and every hit target, the
// accessible table this beat opts into, one inlined interaction script, one inlined maplibre-gl and
// the plan the live layer reads. The page makes exactly one external request, to api.maptiler.com;
// with no network, no key or no JavaScript it renders the fallback complete.
//
// This is this beat's OWN copy of `map-web/scripts/render-web.mjs`'s machinery, adapted to a
// type that skill's seed does not carry. Nothing here imports out of a skill or across beats, except
// `#shared/chart-beat/render-still.mjs` for `readPalette` — the one module in this tree that
// reads a recorded colour answer.
//
// EVERY NUMBER A READER SEES IS COMPUTED HERE, from the frozen csv and the frozen plate, and printed
// before the render. The claim is asserted against the data first: that the five countries the title
// names really are the five largest, that they really do hold more than half the mapped population,
// and that four of them would not. The dot value is derived from the total rather than chosen, and
// the render then asserts that every dot it drew landed inside the frame — a dot scattered outside
// it is invisible, which would make a country's cloud understate its own population.
//
// Usage:  bun proof/mapgen-dot-web/render-web.mjs [outDir] [--data <csv>]

import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readPalette } from "#shared/chart-beat/render-still.mjs";
import { deriveFurniture } from "./render-still.mjs";
import { worldCopiesFor } from "./delivery-frame.mjs";
import {
  DotDensityWeb,
  CountryTable,
  NAMED,
  DOT_RADIUS_FRACTION,
  countryDetail,
} from "./DotDensityWeb.tsx";
import {
  parsePopulationCsv,
  joinPopulation,
  chooseDotValue,
  scatterInParts,
  partsInFrame,
  pointInRings,
  pixelToLonLat,
  mercatorFrameHeightPx,
  cloudAnchor,
  shapeAnchor,
  fillTightness,
  readingOrder,
  en,
} from "./geo-dot.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
// Resolved through node's own module resolution, never by a relative path into `node_modules`. A
// package name is the honest way to say "this comes from a dependency", and it is what a copy of
// this beat with its own `bun install` would resolve too.
const requireFrom = createRequire(import.meta.url);
const MAPLIBRE_JS = requireFrom.resolve("maplibre-gl/dist/maplibre-gl.js");
const MAPLIBRE_CSS = requireFrom.resolve("maplibre-gl/dist/maplibre-gl.css");

// ===== CONFIG — this beat's own story =====
const BEAT = {
  source: "Source: World Bank Open Data, indicator SP.POP.TOTL (population, total), 2023",
  basemapCredit: "basemap © MapTiler, © OpenStreetMap",
};
/** The cartographic blue `bake.mjs` forces onto `dataviz-light`'s grey water before it captures the
 *  plate, repeated here because the LIVE style needs the same correction applied to the same two
 *  layers (`live-map.mjs`'s `style.load` handler). If the live map and its own fallback disagree
 *  about the colour of water the swap is visible, and on a dot beat the correction is load-bearing
 *  rather than cosmetic: the dots are the only ink over most of the frame, so a grey sea reads as
 *  "no data here" instead of "no land here". It must equal `bake.mjs`'s own literal. */
const WATER_FILL = "#aac9e0";
const PLATE_SIZE = "1000x1000";
// THE BOX RANGE THIS BEAT IS DELIVERED INTO, measured on its own rendered page at the three widths
// this format drives — the second input the bake needs since 2026-08-23 (`delivery-frame.mjs`). It
// is a property of THIS beat's furniture, not of the format, and it is read back with
// `bun skills/map-web/scripts/verify-fills-the-box.mjs <page.html>`, which refuses a page whose real
// range has escaped the range its plate was baked for.
const PLATE_BOX_ASPECTS = "1.099,2.227";
// The room this beat's own labels need inside the crop, as a fraction of the box on each side —
// measured the same way, by the runs the page actually cut. `0,0` is a beat whose every run is whole.
const PLATE_CLEARANCE = "0,0";
// FROZEN BESIDE THE BEAT, for the same reason the csv is: a basemap living in `/tmp` cannot be
// committed, so the delivered html could be neither reproduced nor audited. `ensurePlate` bakes only
// when this folder is empty.
const DEFAULT_PLATE_DIR = join(HERE, "plate");
const DEFAULT_DATA_PATH = join(HERE, "population-europe-2023.csv");
// The same shapes the bake projected into the plate's pixel space, read here in their own lon/lat:
// the live map answers a hover with the COUNTRY's own polygon, and a polygon in plate pixels is of
// no use to a camera the reader is moving. Joined by `ADM0_A3`, exactly as `bake.mjs` joins it.
const DEFAULT_COUNTRIES_PATH = join(HERE, "countries.geojson");
// And the OUTPUT lands beside the beat, where `dot-population.html` is committed — never a scratch
// directory, which would print a path, exit zero and leave the committed artifact stale.
const DEFAULT_OUT_DIR = HERE;
const OUTPUT_NAME = "dot-population.html";
/** Natural Earth's shape code against the World Bank's own for Kosovo — the same class of mismatch
 *  every join in this tree has to declare rather than discover. */
const ALIAS = { KOS: "XKX" };
// ==========================================

/**
 * R1b — THE KEY NEVER ENTERS THE REPOSITORY. R1 accepted the key being visible to a reader of a
 * published article; it did not accept an unbounded public leak, and the two are different
 * exposures. This beat COMMITS its rendered HTML beside itself and the FJM deliverable is an MIT
 * open-source release, so a real key here would be scanned by bots within minutes of the push and
 * would survive in the history after any later removal. `deliver` substitutes the real key at
 * the moment the file goes to a newsroom; `splash/test/no-key-in-the-repository.test.ts`
 * reddens if one ever reaches a tracked file.
 *
 * The delivered key should be a SECOND, origin-restricted MapTiler key, not the development one:
 * MapTiler's documented mitigation for a client-side key is Allowed HTTP origins, enforced
 * server-side, and an account's DEFAULT key cannot be restricted — a dedicated one has to be created
 * (docs.maptiler.com/cloud/api/authentication-key/).
 */
export const KEY_PLACEHOLDER = "__MAPTILER_KEY__";

/**
 * How many decimals a lon/lat carries into the page. DERIVED, not picked: at this plate's own
 * `degreesPerPixel` (0.0672) one thousandth of a degree is 1/67 of a plate pixel — a hundredth of
 * the 0.6px gap `bake.mjs` already thins its own outlines to, and a five-hundredth of one dot's own
 * 2px radius. Full float precision would spend 210 KB of the page saying nothing a reader or a
 * pointer can tell apart.
 */
const LON_LAT_DECIMALS = 3;

/**
 * THE SMALLEST RADIUS THE LIVE FIELD MAY BE DRAWN AT, in CSS pixels — the floor under the
 * ground-area rule, and the fix for a defect that removed this beat's entire encoding at phone width.
 *
 * `radius: "ground"` is right and is not in question: a dot stands for a fixed number of people in a
 * fixed piece of ground, so its ground area must not change with zoom. What it has no answer for is
 * the bottom end. The live camera fits the study set inside the CONTAINER, and at 375 x 812 that
 * container is 341 x 352 with `live-map.mjs`'s own 48px of padding on each side, so the fit lands at
 * zoom 1.390 against a bake at 3.388 — a drawn radius of 0.50px. MapLibre's circle shader feathers a
 * circle's edge by about a pixel, so a sub-pixel disc does not shrink, it VANISHES.
 *
 * Measured in Chrome, dot ink isolated by toggling the layer so the basemap, the outlines and the
 * labels cancel exactly (mean red-channel deficit over 2–14°E / 45–53°N, against the SAME box in the
 * fallback plate, which draws the same field as SVG and is the picture this must not disagree with):
 *
 *   375 x 812 — plate 0.1856 · live, no floor 0.0119 (6% of the plate: an empty map under a legend
 *               that says 2,996 dots) · floor 0.8px 0.0598 · floor 1px 0.1156 · **floor 1.25px
 *               0.1999** · floor 1.5px 0.2749.
 *   1600 x 900 — the ground radius is already 1.24px, so the floor changes the field by 2%
 *               (0.0926 → 0.0948) and the encoding stays ground-true.
 *
 * 1.25px is therefore not a taste: it is the radius at which the live field deposits the ink the
 * plate's own field deposits, at the width where the ground rule falls below it. It binds only below
 * zoom 2.710 (`bakeZoom + log2(floor / r)`), which is the phone; every wider container and every
 * zoom a reader moves into is drawn at the true ground size.
 *
 * WHAT IT COSTS, said in the beat's own caveat rather than only here: where the floor binds, a dot
 * covers more ground than it stands for, so the field reads a little denser than it is.
 */
const DOT_RADIUS_FLOOR_PX = 1.25;

/**
 * NOTE, 2026-08-10 — this beat no longer builds its own radius expression.
 *
 * It did, for one commit, because the shared `live-map.mjs`'s ground mode had no floor and a floor
 * cannot be wrapped around one from outside: MapLibre refuses a `["zoom"]` expression nested inside
 * `["max", …]`, and it fails SILENTLY (`setPaintProperty` becomes a no-op and five different floors
 * render identically, which is how this nearly shipped unfloored twice). The cost was written down
 * at the time: a rule the boot script owns, re-implemented here, that would not follow it if it
 * changed.
 *
 * That cost is paid off rather than carried. `groundRadiusExpression(bakeZoom, { floorPx,
 * uniformRadius })` in `live-map.mjs` now builds exactly this expression — same `["exponential", 2]`,
 * same 6-level span, same `bakeZoom + log2(floor / r)` breakpoint — and refuses, naming why, a layer
 * that asks for a floor without a uniform radius. This layer declares `radius: "ground"` and the two
 * numbers, and the boot script owns the rule again.
 */

/**
 * The plan the live layer reads out of the page: the style URL with its placeholder, the camera
 * facts the bake recorded, the reader's leash, and this beat's own two layers.
 *
 * BOTH LAYERS ARE THE SAME MARKS THE FALLBACK DRAWS, read back through the projection that drew
 * them — never a second scatter and never a second join:
 *
 *   1. `mw-countries`, a `fill` of the study countries' own polygons in real lon/lat, painted the
 *      SAME land fill and outline the SVG paints. It is what closes B6.14a — *"hover/tooltip must
 *      fire as soon as you enter the country, not only over its capital"* — because a MapLibre fill
 *      answers a pointer ANYWHERE inside the polygon, which is what those words mean. The 28px disc
 *      at the country's anchor stops being what a pointer talks to (CSS drops its pointer-events),
 *      so this is closed by construction rather than by growing a target.
 *
 *      It is painted rather than invisible, and that is deliberate: the fallback draws every country
 *      with a light land fill and a muted outline, and `live-map.mjs` hides the basemap's own borders
 *      exactly as the bake hid them, so an INVISIBLE hover layer would swap a map with country edges
 *      for a map without any — the same "the live map and its fallback are one cartography" rule the
 *      water fill is set by. One layer serves both, which also keeps 210 KB of polygon from being
 *      shipped twice.
 *
 *   2. `mw-dots`, the 2,996 dots as `radius: "ground"`. A dot stands for a fixed number of people in
 *      a fixed piece of ground, so its GROUND area must not change: `live-map.mjs` builds it an
 *      exponential-base-2 interpolation off `bakeZoom`, so `r` is read as the radius the plate drew
 *      at the zoom the plate was baked at. `r` comes from `DOT_RADIUS_FRACTION`, the same constant
 *      the SVG's own `<circle>`s are drawn from — never a second radius computation.
 *
 *      ONE FEATURE PER COUNTRY, geometry `MultiPoint`, not one feature per dot. Nothing here is
 *      per-dot: every dot stands for the same number of people (that IS the encoding), hover is off
 *      on this layer, and `r` is one number for the whole field. Measured: 2,996 point features cost
 *      285 KB of page against 49 KB this way.
 */
export function livePlan({
  geometry,
  countries,
  boundaries,
  accent,
  muted,
  landFill,
  waterFill,
}) {
  const corners = geometry.frameCorners;
  if (!corners || !(geometry.degreesPerPixel > 0))
    throw new Error(
      "this plate predates the camera facts: re-bake it, or the live map has neither bounds to be " +
        "constrained to nor a ground scale to draw its dots at",
    );
  const round = (v) => Number(v.toFixed(LON_LAT_DECIMALS));
  const at = (point) => {
    const { lon, lat } = pixelToLonLat(
      point[0],
      point[1],
      corners,
      geometry.frame,
    );
    return [round(lon), round(lat)];
  };

  // The study set's own footprint: the countries that carry a value, as they are actually DRAWN.
  // Clamped to the frame the plate was baked at, because `bake.mjs` keeps a ring whose bbox comes
  // within 40px of the frame rather than cutting it at the edge — Iceland's own outline reaches a
  // quarter of a degree past the west edge, and a leash that let the reader out there would be a
  // leash around a place this map does not draw.
  let west = Infinity, east = -Infinity, south = Infinity, north = -Infinity;
  for (const country of countries)
    for (const part of boundaries.get(country.key))
      for (const ring of part)
        for (const [lon, lat] of ring) {
          if (lon < west) west = lon;
          if (lon > east) east = lon;
          if (lat < south) south = lat;
          if (lat > north) north = lat;
        }
  const studyBounds = {
    west: Math.max(west, corners.west),
    east: Math.min(east, corners.east),
    south: Math.max(south, corners.south),
    north: Math.min(north, corners.north),
  };

  const anchors = {};
  for (const country of countries) anchors[country.key] = at(country.anchor);

  return {
    styleUrl: `https://api.maptiler.com/maps/${geometry.style}/style.json?key=${KEY_PLACEHOLDER}`,
    waterFill,
    frame: geometry.frame,
    // The bake's own ground-per-pixel and the camera it was baked at. `live-map.mjs` derives every
    // drawn radius from the RATIO of the first to its own, and interpolates a ground-constant dot
    // off the second.
    degreesPerPixel: geometry.degreesPerPixel,
    metresPerPixel: geometry.metresPerPixel,
    bakeZoom: geometry.zoom,
    studyBounds,
    // THE FLOOR UNDER THE READER'S LEASH, and it is derived from THIS beat's own claim rather than
    // from its frame.
    //
    // `map-web`'s seed derives it as the headroom its plate holds over its study set
    // (`maxZoomForStudySet` minus the bake's zoom). That is the right quantity for a plate baked
    // wider than its subject, and it is worth **0.032 of a zoom level** here — because `bake.mjs`
    // deliberately chose its camera AS the study set's own mainland extent (67.19° of frame over
    // 65.72° of study set). Measured on the page, the runtime fit alone gives 1.37 zoom levels at
    // 1600 x 900 but **0.20 at 768 x 1024** — a factor of 1.15, which is not a map a reader can move
    // through, and moving through it is the whole of ruling R1.
    //
    // The obvious dot-map derivation does not exist, and that is worth writing down rather than
    // trying: for a GROUND-CONSTANT field there is no zoom at which the dots "stop merging". Dots and
    // spacing scale together by construction, so the texture is scale-invariant and a density-derived
    // bound would be a number that means nothing. What zooming a dot map buys is the COASTLINE under
    // the field — which cloud is Belgium's and which is the Netherlands'.
    //
    // So the bound is the claim's: the title names five countries, and a reader may go in until the
    // smallest of those five fills the frame. Past that the comparison the title makes is off screen,
    // which is exactly the seed's own reasoning ("the zoom at which the study set stops filling the
    // frame") read against the study set this beat's own sentence is about. Germany is the smallest of
    // the five in longitude (9.16° against the frame's 67.19°), so: 2.875 zoom levels, at every
    // container shape. It also carries the dots back over their floor — past zoom 2.710 the field is
    // ground-true again — so a phone reader can reach the honest encoding rather than only the
    // floored one.
    minZoomHeadroom: Math.max(
      0,
      Math.log2(
        Math.abs(corners.east - corners.west) /
          Math.min(
            ...NAMED.map((key) => {
              const lons = boundaries
                .get(key)
                .flat(2)
                .map(([lon]) => lon);
              return Math.max(...lons) - Math.min(...lons);
            }),
          ),
      ),
    ),
    anchors,
    layers: [
      {
        id: "mw-countries",
        type: "fill",
        data: {
          type: "FeatureCollection",
          features: countries.map((country) => ({
            type: "Feature",
            geometry: {
              type: "MultiPolygon",
              coordinates: boundaries.get(country.key),
            },
            properties: {
              key: country.key,
              name: country.name,
              // The same string the country's own `.pt` button and its table row carry, from the
              // same one implementation. `live-map.mjs` reads the button's `data-detail` when there
              // is one and this when there is not, so the two can never state different numbers.
              detail: countryDetail({
                name: country.name,
                population: country.population,
                dots: country.dots.length,
              }),
            },
          })),
        },
        paint: { "fill-color": landFill, "fill-outline-color": muted },
        hover: true,
      },
      {
        id: "mw-dots",
        type: "circle",
        data: {
          type: "FeatureCollection",
          features: countries
            .filter((country) => country.dots.length > 0)
            .map((country) => ({
              type: "Feature",
              geometry: {
                type: "MultiPoint",
                coordinates: country.dots.map(at),
              },
              properties: {
                key: country.key,
                r: geometry.frame.width * DOT_RADIUS_FRACTION,
              },
            })),
        },
        paint: { "circle-color": accent },
        // The ground rule, with the floor `DOT_RADIUS_FLOOR_PX` documents. `uniformRadius` is the
        // one radius every dot in this field is drawn at — the boot script needs it because the
        // floor is a zoom BREAKPOINT, and a breakpoint only exists when every mark shares a size.
        radius: "ground",
        radiusFloorPx: DOT_RADIUS_FLOOR_PX,
        uniformRadius: geometry.frame.width * DOT_RADIUS_FRACTION,
        // The dots do not answer a pointer, and this is the type's own rule rather than an
        // omission: a dot is not a place (its position inside its country is random) and it carries
        // no value of its own, so a tooltip on one would answer a question the encoding cannot ask.
        // The COUNTRY answers, underneath.
        hover: false,
      },
    ],
  };
}

/**
 * SSRs the map component once, SSRs the table when the beat asked for it, wraps both in one
 * self-contained HTML file and writes it. Generic across map-web beats: it knows nothing of this
 * story's own countries.
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
 * THE WORLD REPEATS, AND THE MARKS REPEAT WITH IT — the owner's ruling of 2026-08-23, in the one
 * place a delivered page is assembled.
 *
 * > *that is the normal behaviour of an interactive map — go ahead and repeat the map on the sides.*
 *
 * A camera that already spans a full turn of longitude cannot cover a wider box with one plate
 * (`delivery-frame.mjs`, `cannotCover`), and paying for the width out of latitude was refused. A
 * slippy map's own answer is to wrap, so the page paints `worldCopiesFor` copies of the plate side
 * by side, centred, and clips what hangs over.
 *
 * WHAT THIS MUST NOT REINTRODUCE, and it is the whole reason this function exists rather than a CSS
 * `background-repeat`. Two days before the ruling this format was fixed for painting three worlds,
 * and the defect was never the repeat: it was that there was ONE SET OF HIT TARGETS over three
 * painted worlds. A reader pointing at the second Africa got nothing, and nothing measured it. So
 * every copy carries its own marks, its own hit targets and its own labels, and
 * `verify-wraps-the-world.mjs` counts how many of them answer a pointer ON EACH VISIBLE COPY.
 *
 * WHY A COPY IS `<use>` AND NOT A SECOND COPY OF THE MARKUP, measured rather than preferred. The
 * world beat this exists for delivers at 2,004,428 bytes against a 2,034,847-byte ceiling
 * (`detect-weight-has-a-ceiling.mjs`) — 1.5% of headroom. Its map svg alone is 468,383 bytes
 * (182,183 of baked plate, 286,200 of 241 country outlines), so duplicating the markup twice would
 * add 1,081,182 bytes and deliver a 3.1 MB page: refused by the ceiling, and rightly. A `<use>`
 * repaints an element that is already in the document — the plate is downloaded once, every outline
 * is described once — at about 45 bytes per mark per copy, and, verified in Chrome before this was
 * written, `document.elementFromPoint` inside a copy returns the `<use>` ITSELF, carrying its own
 * `data-key`. That is the difference between a repeat a reader can point at and a decoration: a
 * single `<use>` of the whole group renders identically and answers with one identity for the entire
 * world, which is the defect wearing a cheaper coat.
 */
export function repeatWorlds(html, copies, css) {
  if (!(copies > 1)) return html;
  const marks = pointerActiveOverlayClasses(css);
  const withIds = idsForWorldCopies(html);
  return repeatLayer(repeatLayer(withIds, FALLBACK_LAYER, copies, useCopyOf), OVERLAY_LAYER, copies, (inner) =>
    overlayCopyOf(inner, marks),
  );
}

const FALLBACK_LAYER = /<div id="mw-fallback"[^>]*>/;
const OVERLAY_LAYER = /<div class="mw-overlay"[^>]*>/;

/** Splits one layer into `copies` worlds, laid out left to right, and hands every copy but the
 *  middle one to `cheapen`. The MIDDLE copy is the untouched original — which is what keeps the
 *  wrap invisible to every other reading in this format: the accessible table, the Tab order, the
 *  census of announced marks and the stranded-mark reading all still see exactly one world, sitting
 *  exactly where the one world used to sit. */
function repeatLayer(html, opener, copies, cheapen) {
  const open = opener.exec(html);
  if (!open)
    throw new Error(
      `this page has no ${opener} to repeat, so the wrap would paint worlds with nothing in them. A ` +
        `map-web component draws its plate into #mw-fallback and its marks into .mw-overlay`,
    );
  const start = open.index + open[0].length;
  const scanner = /<div\b|<\/div>/g;
  scanner.lastIndex = start;
  let depth = 1;
  let closing = null;
  for (let found = scanner.exec(html); found; found = scanner.exec(html)) {
    depth += found[0] === "</div>" ? -1 : 1;
    if (depth === 0) {
      closing = found;
      break;
    }
  }
  if (!closing) throw new Error(`the ${opener} layer never closes; nothing here can repeat it`);
  const inner = html.slice(start, closing.index);
  const middle = (copies - 1) / 2;
  const worlds = [];
  for (let n = 0; n < copies; n++)
    worlds.push(
      n === middle
        ? `<div class="mw-world" data-world="primary">${inner}</div>`
        : // `aria-hidden`, and this is the ruling's second half answered out loud: the keyboard and
          // the accessible table DO NOT MULTIPLY. A prefecture is reachable once, not once per copy
          // — a Tab order three times too long is a worse reader experience than a narrow map — so a
          // repeat is out of the accessibility tree entirely and every focusable inside it is
          // `tabindex="-1"`. It keeps the pointer, which is the channel the copies exist for.
          `<div class="mw-world" data-world="repeat" aria-hidden="true">${cheapen(inner, n)}</div>`,
    );
  return html.slice(0, start) + worlds.join("") + html.slice(closing.index);
}

/** THE PLATE COPY. Every `<image>` and `<path>` the primary svg draws is given a short id once, and
 *  the copy is one `<use>` per element in the same order — same paint, same z-order, same geometry,
 *  and one hit target per mark. `data-key` and `class` travel onto the `<use>` because they are what
 *  a pointer's answer is read from: `interaction.mjs` matches `.region[data-key]`, and a copy whose
 *  marks lost their key would be a painted world a reader can point at and learn nothing from. */
export function useCopyOf(inner) {
  const openSvg = /<svg\b[^>]*>/.exec(inner);
  if (!openSvg) throw new Error("the fallback layer draws no <svg> to repeat");
  const viewBox = /viewBox="([^"]+)"/.exec(openSvg[0])?.[1];
  if (!viewBox) throw new Error("the fallback svg carries no viewBox, so a copy has no frame to draw into");
  const uses = [];
  for (const element of inner.matchAll(/<(image|path)\b[^>]*>(<title>([^<]*)<\/title>)?/g)) {
    const tag = element[0];
    const id = /\bid="([^"]+)"/.exec(tag)?.[1];
    if (!id) continue;
    const key = /\bdata-key="([^"]+)"/.exec(tag)?.[1];
    const className = /\bclass="([^"]+)"/.exec(tag)?.[1];
    // THE MARK'S OWN `<title>` TRAVELS WITH IT. That element is the native, script-free tooltip a
    // reader gets with JavaScript off, and a copy without one would be a world a reader can point at
    // and learn nothing from in exactly the state this format promises to still work in.
    const title = element[3];
    uses.push(
      `<use href="#${id}"${className ? ` class="${className}"` : ""}${key ? ` data-key="${key}"` : ""}` +
        (title === undefined ? "/>" : `><title>${title}</title></use>`),
    );
  }
  if (uses.length === 0)
    throw new Error(
      "nothing in the fallback svg carries an id, so a copy of it would be empty — `idsForWorldCopies` " +
        "is what puts them there and it has to run before this does",
    );
  return `<svg class="map" viewBox="${viewBox}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" role="presentation">${uses.join("")}</svg>`;
}

/** Gives every drawable in the primary svg the id its copies reference. Short (`w0`, `w1`, …)
 *  because the count is the mark count and the page is already at its weight ceiling; unique across
 *  the document because nothing else in this format emits an id of that shape. Elements that
 *  already carry an id keep it. */
export function idsForWorldCopies(html) {
  let n = 0;
  return html.replace(/<(image|path)\b[^>]*>/g, (tag) =>
    /\bid="/.test(tag) ? tag : tag.replace(/^<(image|path)\b/, (open) => `${open} id="w${n++}"`),
  );
}

/** THE OVERLAY COPY, and what it keeps is DERIVED FROM THE PAGE'S OWN STYLESHEET rather than typed.
 *
 *  Only some of an overlay's elements answer a pointer, and which ones is a beat's own decision
 *  written in its own CSS: this format's symbol and hex-grid beats make every `.pt` button the
 *  target (`.mw-overlay .pt { pointer-events: auto }`), while a choropleth points at the painted
 *  country and keeps buttons only for the regions too small to land on (`.mw-overlay .pt-small`).
 *  Carrying every button on every copy would be honest and, on the 241-region world beat, would add
 *  72,208 bytes per copy to a page with 30,419 of headroom. So a copy keeps exactly the elements the
 *  browser will let a pointer reach — read off the stylesheet the page actually ships — plus every
 *  `.point-label`, because a copy with no names on it is a copy a reader cannot read.
 *
 *  A repeat's marks keep their `title` and lose their `data-detail`. Same string, and the choice of
 *  which one survives is the point: `data-detail` is what this format's censuses count a mark BY, and
 *  a copy is the same mark seen twice rather than a second mark; `title` is the tooltip the browser
 *  itself shows with the page's script absent entirely, which is a reading the copies must keep.
 *  `interaction.mjs` reads either. */
export function overlayCopyOf(inner, markClasses) {
  const keep = new Set([...markClasses, "point-label"]);
  const out = [];
  // The overlay's children are flat by construction — one `<button>` per mark, one label per name,
  // never a nested structure — so an element is its own opening tag through its own closing tag.
  for (const element of inner.matchAll(/<([a-zA-Z][\w-]*)\b[^>]*>[\s\S]*?<\/\1>/g)) {
    const whole = element[0];
    const classes = (/\bclass="([^"]*)"/.exec(whole)?.[1] ?? "").split(/\s+/);
    if (!classes.some((one) => keep.has(one))) continue;
    out.push(
      whole
        // `data-detail` GOES, `title` STAYS. The first is the attribute this format's censuses count
        // a mark by (`tableCarriesTheMarks`, `keyboardReachesEveryMark`, `announcedMarksOf`), and a
        // copy is the same mark seen twice, not a second mark. The second is the native tooltip a
        // reader gets with the page's script absent entirely, which is a channel the copies have to
        // carry. `aria-label` goes with the accessibility tree the copy is already outside of.
        .replace(/\s(?:aria-label|data-detail)="[^"]*"/g, "")
        .replace(/^<button\b/, '<button tabindex="-1"'),
    );
  }
  if (out.length === 0)
    throw new Error(
      `a repeated world would carry no pointer target at all: this page's stylesheet leaves every ` +
        `overlay element pointer-inert (looked for ${[...keep].join(", ")}). A painted world a reader ` +
        `cannot point at is the defect the wrap ruling was given WITH its engineering consequence`,
    );
  return out.join("");
}

/** The overlay classes this page's own CSS makes pointer-active, in the state that has no live map.
 *  Read from the emitted stylesheet, never declared beside it — the browser obeys the stylesheet, so
 *  the stylesheet is what a copy has to agree with. Rules qualified by `html.mw-live` are skipped:
 *  live, the canvas hit-tests every painted copy itself and the DOM copies are hidden. */
export function pointerActiveOverlayClasses(css) {
  const found = new Set();
  for (const rule of String(css ?? "").matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    const [, selector, body] = rule;
    if (!/pointer-events:\s*auto/.test(body)) continue;
    if (/html\.mw-live/.test(selector)) continue;
    if (!/\.mw-overlay\b/.test(selector)) continue;
    for (const one of selector.matchAll(/\.mw-overlay[^,]*?\.([\w-]+)/g)) found.add(one[1]);
  }
  return found;
}

/** The measured range of box shapes a wrapping beat is delivered into, refused rather than guessed
 *  at. It is baked into `geometry.json` and it is the ONLY input the copy count has that is not the
 *  camera: a beat that hands over a plate without it would get one world in a box that needs three,
 *  and the page would show its own page ground beside the map with nothing saying so. */
function requireBoxAspects(geometry) {
  const measured = geometry?.boxAspects;
  if (!measured)
    throw new Error(
      "this beat's camera spans the world, so its page fills its box by repeating that world east " +
        "and west — and the number of copies is derived from `geometry.boxAspects`, the measured " +
        "range of box shapes this beat is delivered into, which this plate does not carry. Re-bake " +
        "it (bake-plate.mjs writes it) and pass it through in `props.geometry`.",
    );
  return measured;
}

/** THE STYLESHEET HALF OF THE SAME RULING, and it is a function for the reason the markup half is
 *  one: it has to travel. `repeatWorlds` paints the copies; these rules are what make them a TILE —
 *  the plate drawn at the box's own HEIGHT, `worldCopies` of it laid across the width, and each world
 *  its own positioning context so that a mark placed as a percentage of the plate lands on the copy it
 *  belongs to instead of piling onto the first. Markup without them is three worlds stacked on one
 *  another with one set of marks over the top, which is the closed defect exactly.
 *
 *  It cannot live inside a `buildCss`: every beat's stylesheet is its own — its colours, its mark
 *  shapes, its furniture — so a rule written inside one reaches one beat. Written here it is part of
 *  the same copied set as the markup, and `the-fix-reaches-the-page-assemblers.test.ts` counts it. */
export function worldTilingCss({ frame, worldCopies }) {
  if (!(worldCopies > 1)) return "";
  return `/* THE WORLD REPEATS, AND THE MARKS REPEAT WITH IT (the owner, 2026-08-23: *that is the normal
   behaviour of an interactive map — go ahead and repeat the map on the sides*). A camera that
   already spans a full turn of longitude has no more world to its east or west, so ONE plate cannot
   cover a container wider than the world's own Mercator aspect (delivery-frame.mjs, 'cannotCover')
   and filling that width by scaling could only be paid for out of LATITUDE — measured on
   real-owid-life-expectancy at its widest box, 2.572:1 against a 1.472:1 world, 42.8% of the
   latitude range: Australia, New Zealand, southern Africa, most of South America, northern Canada
   and Russia. Latitude is the axis that cannot be repeated; longitude is the axis that already is.
   So the plate is drawn at exactly the box's HEIGHT — nothing is ever cropped off the top or the
   bottom — and ${worldCopies} copies of it fill the width, centred, with the overflow clipped.
   The odd count is what keeps the middle copy exactly where the single world used to sit.
   AT A BOX NARROWER THAN ONE WORLD (a phone) the same rule crops LONGITUDE instead, which is what a
   slippy map does at that size and the only crop a wrapping plate can take;
   'verify-wraps-the-world.mjs' prints the degrees it costs at every width this format drives. */
.mw-fallback, .mw-overlay {
  width: calc(100cqh * ${frame.width / frame.height} * ${worldCopies});
  height: 100cqh;
  display: flex;
}
/* One world. 'position: relative' is load-bearing: every mark in the overlay is placed as a
   PERCENTAGE of the plate, and a percentage resolves against the nearest positioned ancestor — so
   this box is what makes a copy's marks land on that copy's own geography instead of all of them
   piling onto the first world. */
.mw-world {
  position: relative;
  flex: 0 0 calc(100% / ${worldCopies});
  height: 100%;
  /* NOT CLIPPED TO ITS OWN BOX, and that was tried and measured rather than assumed. A mark's hit
     target is a fixed-size box centred on the mark, so a mark near a world's edge hangs part of its
     target over the NEXT world; the copies come after the primary in the DOM, so at the seam a
     copy's westernmost target lies over the primary's easternmost marks. Measured on
     proof/mapgen-hexgrid-web at 1600x900: 5 of 153 primary marks answer with their
     across-the-antimeridian NEIGHBOUR rather than with themselves (13,9 answers as -5,9; 14,8 as
     -4,8; 14,9 as -4,9) — and every one of those answers is the cell actually painted at that pixel,
     because the neighbour across the seam is the neighbour on the ground.
     'overflow: hidden' here takes those five down to two and costs more than it saves, measured both
     ways: this grid centres its outermost columns OUTSIDE the plate frame, so clipping each world
     cuts those marks' own targets where their paint leaves the world, and two of 153 then answer
     NOWHERE along their own painted edges — which splash/test/interaction-promises-are-kept.test.ts
     catches. Clamping the targets inside their world instead moves the target off the mark, with the
     same result. A reading that is right for the pixel beats a target that has left its mark or
     vanished, so the seam is left as it is and the five are named — here, in the verdict
     'collidingPointerTargets' prints, and in the report. */
}
/* LIVE, THE COPIES ARE MAPLIBRE'S OWN. A live canvas paints world copies itself and hit-tests every
   one of them through queryRenderedFeatures, so the DOM copies would be a second, staler set of
   marks over the top of them. They go; the overlay drops back onto the viewport, 'live-map.mjs'
   re-projects the ONE remaining set into the live camera, and the pointer is the canvas's job. */
html.mw-live .mw-fallback, html.mw-live .mw-overlay { display: block; }
html.mw-live [data-world="repeat"] { display: none; }
html.mw-live .mw-world { position: static; }
`;
}

async function renderMapWeb({
  component,
  table,
  props,
  outDir,
  name,
  regionTable = false,
  live = false,
  plan = null,
}) {
  const furniture = deriveFurniture(props.ground);
  // HOW MANY WORLDS THIS PAGE PAINTS, derived from the camera and from the range of box shapes this
  // beat is delivered into — the same function the bake refuses against, so the plate and the page
  // can never disagree about how many copies there are.
  const worldCopies = props.geometry?.cannotCover
    ? worldCopiesFor(props.geometry.frame, requireBoxAspects(props.geometry))
    : 1;
  const css = buildCss({ ...props, ...furniture, frame: props.geometry.frame, worldCopies });
  // THE MARKS WRAP WITH THE MAP. The stylesheet is handed over rather than re-derived: which overlay
  // elements a copy has to carry is a fact about the rules this page actually ships (`repeatWorlds`).
  const mapHtml = repeatWorlds(
    renderToStaticMarkup(createElement(component, { ...props, ...furniture })),
    worldCopies,
    css,
  );
  const tableHtml = regionTable
    ? discloseTable(
        renderToStaticMarkup(createElement(table, { countries: props.countries, ...furniture })),
        TABLE_ROW_NOUN,
      )
    : "";

  const interactionSource = await readFile(join(HERE, "interaction.mjs"), "utf8");
  const inlineScript = inlineable(interactionSource);

  // maplibre-gl inlined rather than loaded from a CDN. A `<script src>` would trade payload for a
  // SECOND third-party host; inlining keeps the count at one — api.maptiler.com — which is the
  // honest reading of R1. Measured 2026-08-10: 803 KB of JS and 65.5 KB of CSS.
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

  await mkdir(outDir, { recursive: true });
  const outPath = join(outDir, name);
  await writeFile(outPath, html);
  const limit =
    worldCopies > 1
      ? `this beat fills its container by WRAPPING: ${props.geometry.cannotCover.why}. ` +
        // AND WHAT THAT COSTS AT THE NARROW END, said in the same breath. Latitude is never cropped
        // — the plate is drawn at the box's own height — but a box NARROWER than one world crops
        // LONGITUDE, and there is no copy to recover it from because at that width no copy is on
        // screen at all. The live map does not have this limit (it fits the whole world into a
        // phone's canvas and fills the rest with latitude the plate does not hold), so the two
        // states genuinely differ there and a producer is told the number rather than left to find it.
        `At its narrowest measured box (${requireBoxAspects(props.geometry).narrowest.toFixed(3)}:1) the ` +
        `reader sees ${Math.min(360, (360 * requireBoxAspects(props.geometry).narrowest) / (props.geometry.frame.width / props.geometry.frame.height)).toFixed(0)}° of ` +
        `longitude, centred; what falls outside is in the table and on the keyboard path, and the live map pans to it. ` +
        `The page paints ${worldCopies} copies of the ${props.geometry.frame.width}x${props.geometry.frame.height} plate ` +
        `side by side, each carrying its own marks and its own hit targets; the middle copy is the ` +
        `only one in the accessibility tree, so the Tab order and the accessible table are unchanged ` +
        `at one reading per mark. Count what answers a pointer on each copy with ` +
        `map-web/scripts/verify-wraps-the-world.mjs.`
      : null;
  if (limit) console.log(limit);
  return { outPath, limit };
}

/** Strips the `export` keyword from each top-level declaration, so the module can also sit as a
 *  plain classic `<script>` — no bundler, no `type="module"`. */
function inlineable(moduleSource) {
  return moduleSource.replace(/^export /gm, "");
}

function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildCss({ ground, accent, ink, muted, frame, worldCopies = 1 }) {
  const aspect = frame.width / frame.height;
  return `
:root {
  --ground: ${ground};
  --accent: ${accent};
  --ink: ${ink};
  --muted: ${muted};
  /* One number, used by the body's own padding AND by the height the beat has to fit inside, so the
     two can never disagree about how much room the page edge takes. */
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
/* FIT THE WINDOW. The beat is a column exactly one window tall: every piece of furniture takes the
   height it needs and .mw-stage is handed whatever is left, so nothing scrolls inside the visual at
   any width. The accessible table below the beat is normal document reading, not scrolling inside
   the visual.
   'svh', not 'vh': on a phone with a retracting toolbar 'vh' is the LARGE viewport, which is exactly
   the height the beat must not assume it has. */
.map-web {
  width: 100%;
  display: flex;
  flex-direction: column;
  height: calc(100vh - var(--page-pad) * 2);
  height: calc(100svh - var(--page-pad) * 2);
}
/* Only the stage gives up height. Measured, and not obvious: with 'min-height' here instead of
   'height', the stage's height stays INDEFINITE for container-query purposes and every 'cqh' inside
   it resolves to zero — the map collapses to its border and nothing goes red. */
.map-web > *:not(.mw-stage) { flex: 0 0 auto; }
.mw-title { font-size: 21px; font-weight: 700; margin: 0 0 4px; }
.mw-source { font-size: 13px; color: var(--muted); margin: 0 0 8px; }
/* The stage: the leftover height, and the container the map is measured against. 'container-type:
   size' is what lets the viewport bound itself by the stage's HEIGHT as well as its width. */
.mw-stage { flex: 1 1 auto; container-type: size; min-height: 180px; }
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
/* The three layers occupy the SAME box, the live one underneath. It is laid out from the first frame
   rather than revealed later, because a container with no size is a map with no size: MapLibre reads
   the box at construction, and a display:none container gives it 0x0 and a canvas nothing ever
   paints into. Invisible-but-laid-out, then, and the swap is one flip of the fallback's own hidden
   attribute. */
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
/* The overlay is a SIBLING of both map layers and is never hidden with either: it carries the five
   country names and all 42 Tab stops, so hiding it with the fallback would take the whole keyboard
   path away at the moment the live map arrives. Found by looking at the live page, not by an
   assertion. */
.mw-overlay { z-index: 2; pointer-events: none; }
/* B6.14a IN THE FALLBACK TOO, ruled 2026-08-23. This line used to give .pt pointer-events auto, so
   with the script running but the live layer absent the ONLY thing a pointer could talk to was a
   28px disc at each country's cloud anchor — the very target the live layer exists to replace.
   Measured the day the country outlines gained their data-key: Germany is drawn 90px across and
   answered nothing at its own right edge. Now the outline is the target (interaction.mjs forwards a
   pointer on .region[data-key] to the button of the same key) and only the countries too small to
   land a pointer on by their own shape keep a pointer-active disc — needsPointerTarget in
   DotDensityWeb.tsx, which is the arrangement mapgen-choropleth-web already ships. */
.mw-overlay .pt { pointer-events: none; }
.mw-overlay .pt-small { pointer-events: auto; }
/* The country a pointer is on, marked on the plate itself rather than only by a disc over it. */
.region.pt-active { filter: brightness(0.9); }
/* AND THE DECORATION DOES NOT ANSWER FOR THE COUNTRY. Measured with elementFromPoint on the
   delivered page, 2026-08-23: at four points inset from Germany's own drawn edges the topmost
   element was a dot at two of them and the baked plate at a third, so forwarding the country's own
   outline was wired and still silent — the outline was never the thing a pointer reached. A dot
   stands for a number of people, carries no reading of its own and is not a target; the plate is a
   picture. Both are now transparent to a pointer and the country underneath answers. */
svg.map image, svg.map circle { pointer-events: none; }
/* Live, the canvas is what a pointer talks to, and the country's own polygon is what answers — a
   fill layer fires anywhere inside the country rather than over a 28px disc at its anchor, which is
   what B6.14a asked for. The buttons stay in the DOM, still Tab-reachable and still carrying their
   own aria-label; only their pointer-events go. */
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
${worldTilingCss({ frame, worldCopies })}.maplibregl-canvas-container canvas { outline: none; }
svg.map { display: block; width: 100%; height: 100%; }
/* Furniture, in HTML: font-size is a fixed CSS number on every rule below, so it never tracks the
   container's width the way an SVG <text> inside a scaling viewBox would. */
.point-label {
  position: absolute;
  font-size: 12px;
  font-weight: 700;
  color: var(--ink);
  background: var(--ground);
  padding: 1px 4px;
  border-radius: 2px;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0.92;
}
/* The interaction layer: a real <button>, fixed-CSS-pixel diameter — a legitimate touch and pointer
   target at every width, unlike an SVG hit circle sized in frame units. */
/* ONE SIZE, AND THE SECOND AXIS COMES FROM 'aspect-ratio', NEVER FROM A SECOND PERCENTAGE (B6.20).
   A percentage WIDTH resolves against the container's width and a percentage HEIGHT against its
   height, so the same fraction is two different numbers the moment the overlay stops being the
   plate's own square box — which is exactly what the live swap did. Measured on the committed
   symbol beat at 1600x900 (container 1566x591): the M9.1 button was 140.9 x 53.2 px, a wide flat
   grey ellipse painted behind a 60 px disc. 'aspect-ratio' is what makes the painted highlight a
   circle in SCREEN pixels at every container shape, in the live layer and in the fallback alike. */
.pt {
  position: absolute;
  width: 28px;
  aspect-ratio: 1;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
}
.pt:hover, .pt:focus, .pt.pt-active { background: var(--ink); opacity: 0.22; outline: none; }
.pt:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; opacity: 1; background: transparent; }
.mw-legend { margin: 10px 0 4px; }
.mw-legend-caption { font-size: 12.5px; font-weight: 600; color: var(--muted); margin: 0 0 6px; }
.mw-legend-marks { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; }
.mw-legend-item { display: flex; align-items: center; gap: 6px; }
.mw-legend-value { font-size: 13px; font-weight: 700; color: var(--ink); }
.mw-caveat { font-size: 11.5px; color: var(--muted); margin: 6px 0 12px; }
#tooltip {
  position: fixed;
  max-width: 260px;
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
/* The accessible table: a real, plainly visible table, never a screen-reader-only trick. It sits
   below the beat, in normal document flow. */
.region-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  margin-top: 8px;
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
.region-table td { font-variant-numeric: tabular-nums; }
.region-table tr.subject th, .region-table tr.subject td { color: var(--accent); font-weight: 700; }
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

/** A light neutral land fill, `ratio` of the way from ground toward ink — the same local mix the
 *  still sibling applies, so the two formats draw the same neutral. */
function mixHex(ground, ink, ratio) {
  const ch = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const g = ch(ground);
  const target = ch(ink);
  return (
    "#" +
    g.map((v, i) => Math.round(v + (target[i] - v) * ratio).toString(16).padStart(2, "0")).join("")
  );
}

/** Bakes the plate ONLY when the frozen one is absent — a warm run never touches the network. */
async function ensurePlate(plateDir) {
  if (existsSync(join(plateDir, "geometry.json")) && existsSync(join(plateDir, "plate.png"))) return;
  await mkdir(plateDir, { recursive: true });
  const result = spawnSync("bun", [join(HERE, "bake.mjs"), "--size", PLATE_SIZE, "--box-aspects", PLATE_BOX_ASPECTS, "--clearance", PLATE_CLEARANCE, "--box-aspects", PLATE_BOX_ASPECTS, "--clearance", PLATE_CLEARANCE, "--out", plateDir], {
    cwd: resolve(HERE, "../.."),
    stdio: "inherit",
  });
  if (result.status !== 0) throw new Error(`bake.mjs exited with ${result.status}`);
}

async function loadPlate(plateDir) {
  const geometry = JSON.parse(await readFile(join(plateDir, "geometry.json"), "utf8"));
  const png = await readFile(join(plateDir, "plate.png"));
  return { geometry, plate: `data:image/png;base64,${png.toString("base64")}` };
}

/**
 * Every study country's own polygon in real lon/lat, keyed by `ADM0_A3` — the SAME key `bake.mjs`
 * reads out of the same file, so the live map's hover targets and the plate's own outlines are one
 * join rather than two.
 *
 * Parts the camera can never show are dropped, on the same rule `partsInFrame` applies in pixel
 * space and for a stronger reason here: `live-map.mjs` leashes the reader inside the study bounds,
 * so a French overseas department or an Azorean island in this collection would be 90 KB of polygon
 * describing a place no reader of this page can reach.
 */
function boundariesInFrame(collection, frameCorners) {
  const partsOf = (geometry) =>
    geometry.type === "MultiPolygon"
      ? geometry.coordinates
      : [geometry.coordinates];
  const round = (v) => Number(v.toFixed(LON_LAT_DECIMALS));
  const inFrame = (part) => {
    const outer = part[0] ?? [];
    if (outer.length < 3) return false;
    const lons = outer.map((p) => p[0]);
    const lats = outer.map((p) => p[1]);
    return (
      Math.max(...lons) >= frameCorners.west &&
      Math.min(...lons) <= frameCorners.east &&
      Math.max(...lats) >= frameCorners.south &&
      Math.min(...lats) <= frameCorners.north
    );
  };
  const all = new Map();
  const drawn = new Map();
  for (const feature of collection.features) {
    const parts = partsOf(feature.geometry);
    all.set(feature.properties.ADM0_A3, parts);
    drawn.set(
      feature.properties.ADM0_A3,
      parts
        .filter(inFrame)
        .map((part) =>
          part.map((ring) => ring.map(([lon, lat]) => [round(lon), round(lat)])),
        ),
    );
  }
  return { all, drawn };
}

/** A lon/lat bounding box for one shape's every part, grown by `pad` degrees on all four sides. */
function boundsOfParts(parts, pad = 0) {
  let west = Infinity, east = -Infinity, south = Infinity, north = -Infinity;
  for (const part of parts)
    for (const ring of part)
      for (const [lon, lat] of ring) {
        if (lon < west) west = lon;
        if (lon > east) east = lon;
        if (lat < south) south = lat;
        if (lat > north) north = lat;
      }
  return { west: west - pad, east: east + pad, south: south - pad, north: north + pad };
}

async function render({
  dataPath,
  plateDir,
  outDir,
  countriesPath = DEFAULT_COUNTRIES_PATH,
  name = OUTPUT_NAME,
}) {
  await ensurePlate(plateDir);
  const { geometry, plate } = await loadPlate(plateDir);
  const frame = geometry.frame;

  // ── The plate's camera is ONE Web-Mercator camera, or nothing below may be unprojected ────────
  // The live layer reads the dots and the anchors back out of plate pixels with `pixelToLonLat`,
  // which is only the inverse of the projection that made them if the recorded corners, the recorded
  // frame and Web Mercator agree. They do to 1.1e-11 px on this frozen plate; there is no tolerance
  // to tune, only floating point. Half a pixel of disagreement would already put a dot in the wrong
  // country's polygon and answer a hover with the neighbour's population.
  const impliedHeight = mercatorFrameHeightPx(geometry.frameCorners, frame.width);
  if (Math.abs(impliedHeight - frame.height) > 0.5)
    throw new Error(
      `this plate's corners and its frame are not one Web-Mercator camera: ${frame.width}px wide over ` +
        `${geometry.frameCorners.west}°–${geometry.frameCorners.east}° implies a ${impliedHeight.toFixed(3)}px-tall ` +
        `frame, but the plate is ${frame.height}px. Unprojecting a dot back to lon/lat would put it somewhere ` +
        `the plate never drew it.`,
    );

  const rows = parsePopulationCsv(await readFile(dataPath, "utf8"));
  const shapeKeys = geometry.shapes.map((s) => s.key);
  const byKey = joinPopulation(shapeKeys, rows, ALIAS);
  console.log(`joined ${shapeKeys.length} shapes to ${rows.length} population rows — no unmatched either way.`);

  // ── The claim, checked against the data before anything is drawn ────────────────────────────
  const totalPopulation = rows.reduce((s, r) => s + r.population, 0);
  const namedSum = NAMED.reduce((s, code) => s + byKey.get(code).population, 0);
  const namedShare = namedSum / totalPopulation;
  const ranked = [...rows].sort((a, b) => b.population - a.population).map((r) => r.code);
  if (JSON.stringify(ranked.slice(0, NAMED.length)) !== JSON.stringify(NAMED))
    throw new Error(
      `claim check failed: the true top ${NAMED.length} by population is ${ranked.slice(0, NAMED.length).join(", ")}, not ${NAMED.join(", ")}`,
    );
  if (namedShare <= 0.5)
    throw new Error(
      `claim check failed: the title says these ${NAMED.length} hold more than half the mapped population, but they measure ${(namedShare * 100).toFixed(1)}%`,
    );
  const fourShare =
    NAMED.slice(0, NAMED.length - 1).reduce((s, code) => s + byKey.get(code).population, 0) / totalPopulation;
  if (fourShare > 0.5)
    throw new Error(
      `claim check failed: "just ${NAMED.length}" is not the smallest set that clears half — the first ${NAMED.length - 1} already hold ${(fourShare * 100).toFixed(1)}%`,
    );

  // ── The dots ────────────────────────────────────────────────────────────────────────────────
  const dotValue = chooseDotValue(totalPopulation, { targetDots: 3000, maxDots: 6000 });
  const dropped = [];
  const countries = geometry.shapes.map((shape) => {
    const row = byKey.get(shape.key);
    const parts = partsInFrame(shape.parts, frame);
    if (parts.length !== shape.parts.length)
      dropped.push(`${row.name} ${shape.parts.length - parts.length}`);
    const count = Math.round(row.population / dotValue);
    const dots = scatterInParts(parts, count, shape.key);
    return {
      key: shape.key,
      name: row.name,
      population: row.population,
      parts,
      dots,
      // A country whose population buys fewer than one dot draws none, and there is no cloud to
      // anchor on. It keeps its target, its label and its table row anyway — see `shapeAnchor`.
      anchor: dots.length ? cloudAnchor(dots, parts) : shapeAnchor(parts),
    };
  });
  const dotless = countries.filter((c) => c.dots.length === 0);
  const totalDots = countries.reduce((s, c) => s + c.dots.length, 0);
  console.log(
    `dot value: 1 dot = ${dotValue.toLocaleString("en-GB")} people → ${totalDots.toLocaleString("en-GB")} dots\n` +
      `parts dropped as entirely outside the frame (country, count): ${dropped.join(" · ") || "none"}\n` +
      `countries whose population buys fewer than one dot, so they draw none: ${dotless.map((c) => `${c.name} ${c.population.toLocaleString("en-GB")}`).join(" · ") || "none"}`,
  );

  // Every dot the reader is charged for has to be a dot the reader can see. A dot outside the frame
  // is eaten by the clip, and a country whose share of dots lands there quietly understates its own
  // population on a map whose argument is which clouds are biggest.
  const strays = countries
    .map((c) => ({
      name: c.name,
      n: c.dots.filter((p) => p[0] < 0 || p[1] < 0 || p[0] > frame.width || p[1] > frame.height).length,
    }))
    .filter((c) => c.n > 0);
  if (strays.length)
    throw new Error(
      `${strays.reduce((s, c) => s + c.n, 0)} dots were scattered outside the frame and would be clipped away: ${strays.map((c) => `${c.name} ${c.n}`).join(", ")}`,
    );

  // ── The live layer's own geography, and the check that it is the SAME geography ───────────────
  const collection = JSON.parse(await readFile(countriesPath, "utf8"));
  const { all: trueParts, drawn: boundaries } = boundariesInFrame(
    collection,
    geometry.frameCorners,
  );
  const missingShapes = countries.filter((c) => !boundaries.get(c.key)?.length);
  if (missingShapes.length)
    throw new Error(
      `${missingShapes.length} countries have a plate outline but no lon/lat polygon in ${countriesPath}: ` +
        `${missingShapes.map((c) => c.key).join(", ")} — the live map would draw a country a reader cannot hover.`,
    );

  // EVERY DOT LANDS IN ITS OWN COUNTRY, checked in lon/lat against the source geojson rather than
  // against the pixel rings it was scattered in. This is the guard on `pixelToLonLat`: the dots are
  // sampled in plate pixels and read back out, so a projection that is not the bake's own inverse
  // moves them — a linear-in-latitude reading, for one, drifts by degrees and hands Denmark's dots
  // to Germany, with nothing red and nothing visibly wrong in the picture.
  //
  // The bound is the BOUNDING BOX grown by one plate pixel, not the outline itself, and the reason
  // is measured rather than lenient: the bake thins each ring to a 0.6px gap before the scatter runs,
  // so a dot sampled inside the SIMPLIFIED outline can sit a fraction of a pixel outside the true
  // coastline. On today's numbers exactly 3 of 2,996 do (Greece 1, the Netherlands 2), which is the
  // simplification and not the projection; the finer count is printed below so a change in it is
  // visible. One plate pixel of longitude is `degreesPerPixel`; used for latitude too, where one
  // pixel is worth `degreesPerPixel · cos(lat)` degrees or less, so the bound is loose in the right
  // direction.
  const displaced = [];
  let insideOutline = 0;
  for (const country of countries) {
    const parts = trueParts.get(country.key);
    const box = boundsOfParts(parts, geometry.degreesPerPixel);
    for (const dot of country.dots) {
      const { lon, lat } = pixelToLonLat(dot[0], dot[1], geometry.frameCorners, frame);
      if (lon < box.west || lon > box.east || lat < box.south || lat > box.north)
        displaced.push(country.key);
      if (parts.some((part) => pointInRings([lon, lat], part))) insideOutline++;
    }
  }
  if (displaced.length)
    throw new Error(
      `${displaced.length} dots unproject outside their own country's bounding box: ` +
        `${[...new Set(displaced)].join(", ")} — the live map's dots are not the plate's dots.`,
    );
  console.log(
    `unprojection: the plate's corners imply a ${impliedHeight.toFixed(6)}px frame against ${frame.height}px baked; ` +
      `${insideOutline} of ${totalDots} dots land inside their own country's true outline, ` +
      `all ${totalDots} inside its bounding box.`,
  );

  // The five the title names must also carry the five biggest CLOUDS — the same statement in the
  // currency the picture actually draws. It is checked rather than assumed, because rounding a
  // population to a dot count is not order-preserving in principle.
  const byDots = [...countries].sort((a, b) => b.dots.length - a.dots.length).slice(0, NAMED.length);
  if ([...byDots.map((c) => c.key)].sort().join() !== [...NAMED].sort().join())
    throw new Error(
      `alt check failed: the ${NAMED.length} biggest dot clouds are ${byDots.map((c) => c.key).join(", ")}, not ${NAMED.join(", ")}`,
    );
  const namedDots = NAMED.reduce((s, key) => s + countries.find((c) => c.key === key).dots.length, 0);

  // Fill TIGHTNESS is a different quantity from population, and the still sibling shipped an alt
  // that confused the two: dots are scattered uniformly inside each country, so a tighter fill reads
  // as people per unit area. Measured in plate pixels, because pixels are what a reader's eye
  // compares and Mercator inflates area with latitude.
  const tightness = fillTightness(
    countries.map((c) => ({ key: c.key, parts: c.parts })),
    new Map(countries.map((c) => [c.key, c.dots.length])),
  );
  const nameOf = (key) => countries.find((c) => c.key === key).name;
  const tightestNames = tightness.slice(0, 3).map((t) => nameOf(t.key));
  const rankOf = (key) => tightness.findIndex((t) => t.key === key) + 1;
  console.log(
    `claim: top-${NAMED.length} ranking verified, ${(namedShare * 100).toFixed(1)}% of the mapped population ` +
      `(the first ${NAMED.length - 1} only ${(fourShare * 100).toFixed(1)}%)\n` +
      `fill tightness, densest first: ${tightness.slice(0, 5).map((t) => `${nameOf(t.key)} ${t.dotsPerKilopixel.toFixed(1)}`).join(" · ")} ` +
      `— France ranks ${rankOf("FRA")} of ${tightness.length}, Spain ${rankOf("ESP")}`,
  );

  const palette = readPalette(HERE, { stopAt: resolve(HERE, "..", "..") });
  console.log(`palette from ${palette.source} — ground ${palette.ground}, accent ${palette.accent}, chosen by ${palette.origin}`);
  const furniture = deriveFurniture(palette.ground);
  const landFill = mixHex(palette.ground, furniture.ink, 0.06);

  const namedNames = NAMED.map(nameOf);
  // Derived, never typed: which countries are too small to buy a single dot, and what the reader
  // should do about it. An absence on a map reads as a zero, so the sentence exists whenever the
  // list does — and disappears by itself if a future dot value makes it empty.
  const dotlessNames = readingOrder(dotless).map((c) => c.name);
  const dotlessSentence = dotlessNames.length
    ? `${dotlessNames.slice(0, -1).join(", ")}${dotlessNames.length > 1 ? " and " : ""}${dotlessNames[dotlessNames.length - 1]} have fewer people than one dot stands for, so they draw none; their figures are in the table.`
    : "";
  const listed = `${namedNames.slice(0, -1).join(", ")} and ${namedNames[namedNames.length - 1]}`;
  const title =
    `More than half the people on this map live in ${namedNames.length} countries: ${listed} hold ` +
    `${en(namedShare * 100)} % of them`;
  const legendCaption = `Each dot stands for the same number of people, wherever it falls.`;
  // No count of the absent territories: they are absent from the frozen file, so a number here could
  // only be typed, and a typed number is the one defect class this beat's own claim checks exist to
  // remove. They are named instead, which is what a reader needs — an absence on a map reads as a
  // zero, so it has to be said out loud.
  const caveat =
    `A dot's position inside its country is random, not an address: a TIGHTER fill means more people ` +
    `per square kilometre, not a bigger population — the tightest here are ${tightestNames.join(", ")}, ` +
    `none of them among the ${namedNames.length}. Zoom in and every dot covers the exact piece of ground it ` +
    `stands for; on a small screen a dot is held at ${en(DOT_RADIUS_FLOOR_PX, 2)} pixels so that the field ` +
    `cannot disappear, and there it reads a little denser than the ground it covers. ` +
    `Russia is not shown (almost none of its territory is ` +
    `in frame), nor are the micro-territories the World Bank does not report separately. ` +
    `${dotlessSentence} Where a country's own figure covers land outside this frame — French overseas ` +
    `departments, the Azores, the Canaries, Svalbard — its dots are drawn inside the territory shown.`;

  const alt =
    `Map of Europe. Small dots are scattered inside each country, one dot for every ` +
    `${en(dotValue, 0)} people, ${en(totalDots, 0)} dots in all. The ${namedNames.length} countries the title ` +
    `names — ${listed} — carry the ${namedNames.length} biggest clouds, ${en(namedDots, 0)} of the ` +
    `${en(totalDots, 0)} dots between them. Because dots fall at random inside each country, a tighter ` +
    `fill means more people per square kilometre rather than a bigger population: the tightest fills ` +
    `belong to ${tightestNames.join(", ")}, while France ranks ${rankOf("FRA")} of ${tightness.length} ` +
    `on that measure and Spain ${rankOf("ESP")}. Every country's exact population and dot count is in ` +
    `the table below the map, most populous first.`;

  const { outPath } = await renderMapWeb({
    component: DotDensityWeb,
    table: CountryTable,
    props: {
      geometry,
      plate,
      countries,
      dotValue,
      totalPopulation,
      totalDots,
      title,
      source: `${BEAT.source}, ${rows.length} countries`,
      basemapCredit: BEAT.basemapCredit,
      legendCaption,
      caveat,
      alt,
      ground: palette.ground,
      accent: palette.accent,
      landFill,
    },
    outDir,
    name,
    // OPT-IN, and this beat opts in deliberately: a dot map encodes its value as TEXTURE, so a reader
    // without spatial access to it has no legend entry, no axis and no label from which to recover a
    // single country's figure. The table is the only channel that carries all 42 readings.
    regionTable: true,
    // Ruling R1: map × web is a LIVE MapTiler map. Set this false for a beat that must stay
    // request-free (an offline archive, a CMS whose Content-Security-Policy refuses
    // api.maptiler.com) — the page then ships as the fallback layer alone, which is exactly what it
    // was before the ruling.
    live: true,
    plan: livePlan({
      geometry,
      countries,
      boundaries,
      accent: palette.accent,
      muted: furniture.muted,
      landFill,
      waterFill: WATER_FILL,
    }),
  });
  // The table and the map have to be reading the same order and the same numbers.
  const first = readingOrder(countries)[0];
  if (first.key !== NAMED[0])
    throw new Error(`the table's first row is ${first.key}, not the most populous country ${NAMED[0]}`);
  return { outPath, countries: countries.length, dots: totalDots };
}

if (import.meta.main) {
  const argv = process.argv.slice(2);
  const flag = (name, fallback) => {
    const at = argv.indexOf(name);
    return at >= 0 ? argv[at + 1] : fallback;
  };
  const positional = argv.find((a) => !a.startsWith("--"));
  const dataPath = resolve(flag("--data", DEFAULT_DATA_PATH));
  const plateDir = resolve(flag("--plate", DEFAULT_PLATE_DIR));
  const outDir = resolve(positional ?? flag("--out", DEFAULT_OUT_DIR));

  const { outPath, countries, dots } = await render({ dataPath, plateDir, outDir });
  console.log(`dot-web beat → ${outPath}  [${countries} countries, ${dots} dots]`);
}

export { render, renderMapWeb, ensurePlate, loadPlate, BEAT, PLATE_SIZE, DEFAULT_PLATE_DIR, DEFAULT_DATA_PATH };
