// twin/proof/mapgen-dot-web/render-web.mjs
//
// The WEB genre of the dot-density map: the same 42-country World Bank file
// `proof/mapmore-dot-population` ships as a still, turned into ONE self-contained HTML file — a LIVE
// MapTiler map (ruling R1) over a complete baked fallback: one fluid SVG carrying geometry only
// (plate, outlines, ~3,000 dots), one HTML overlay carrying every word and every hit target, the
// accessible table this beat opts into, one inlined interaction script, one inlined maplibre-gl and
// the plan the live layer reads. The page makes exactly one external request, to api.maptiler.com;
// with no network, no key or no JavaScript it renders the fallback complete.
//
// This is this beat's OWN copy of `twin-map-web/scripts/render-web.mjs`'s machinery, adapted to a
// type that skill's seed does not carry. Nothing here imports out of a skill or across beats, except
// `#shared/twin-chart-beat/render-still.mjs` for `readPalette` — the one module in this tree that
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
import { readPalette } from "#shared/twin-chart-beat/render-still.mjs";
import { deriveFurniture } from "./render-still.mjs";
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
 * would survive in the history after any later removal. `twin-deliver` substitutes the real key at
 * the moment the file goes to a newsroom; `splash-twin/test/no-key-in-the-repository.test.ts`
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
    // `twin-map-web`'s seed derives it as the headroom its plate holds over its study set
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
  const mapHtml = renderToStaticMarkup(createElement(component, { ...props, ...furniture }));
  const tableHtml = regionTable
    ? renderToStaticMarkup(createElement(table, { countries: props.countries, ...furniture }))
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

/** Strips the `export` keyword from each top-level declaration, so the module can also sit as a
 *  plain classic `<script>` — no bundler, no `type="module"`. */
function inlineable(moduleSource) {
  return moduleSource.replace(/^export /gm, "");
}

function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildCss({ ground, accent, ink, muted, frame }) {
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
/* The viewport: the bake's own aspect, exactly, at every size — bounded by the stage's width AND its
   height, whichever binds first. A plate stretched to fill a shape it was not baked for is a lie
   about distance and shape, so it is not one of the outcomes here; a smaller, correct map is. */
.mw-viewport {
  position: relative;
  width: 100%;
  width: min(100cqw, calc(100cqh * ${aspect}));
  max-width: 100%;
  /* Flush left, not centred: when the window's HEIGHT bounds the map the leftover room is
     horizontal, and a centred map floats away from the title, the control and the legend. */
  margin-inline: 0 auto;
  /* A country label may spill past the frame rather than lose a letter — the plate and its dots are
     already clipped by the SVG's own clipPath. Live, the rule below takes over and this becomes
     'hidden': a map the reader pans must clip. */
  overflow: visible;
  border: 1px solid var(--muted);
}
/* The three layers occupy the SAME box, the live one underneath. It is laid out from the first frame
   rather than revealed later, because a container with no size is a map with no size: MapLibre reads
   the box at construction, and a display:none container gives it 0x0 and a canvas nothing ever
   paints into. Invisible-but-laid-out, then, and the swap is one flip of the fallback's own hidden
   attribute. */
.mw-fallback, .mw-live-map, .mw-overlay { position: absolute; inset: 0; width: 100%; height: 100%; }
.mw-live-map { z-index: 0; }
.mw-fallback { z-index: 1; background: var(--ground); }
.mw-fallback[hidden] { display: none; }
/* The overlay is a SIBLING of both map layers and is never hidden with either: it carries the five
   country names and all 42 Tab stops, so hiding it with the fallback would take the whole keyboard
   path away at the moment the live map arrives. Found by looking at the live page, not by an
   assertion. */
.mw-overlay { z-index: 2; pointer-events: none; }
.mw-overlay .pt { pointer-events: auto; }
/* Live, the canvas is what a pointer talks to, and the country's own polygon is what answers — a
   fill layer fires anywhere inside the country rather than over a 28px disc at its anchor, which is
   what B6.14a asked for. The buttons stay in the DOM, still Tab-reachable and still carrying their
   own aria-label; only their pointer-events go. */
html.mw-live .mw-overlay .pt { pointer-events: none; }
/* B5.1, and the conflict that dissolves with the ruling. The viewport keeps the PLATE's aspect,
   because scaling a raster non-uniformly is a lie about distance and shape. A LIVE map has no plate
   aspect to preserve — the canvas IS the container and the camera fills it — so live, the map takes
   the whole stage. The fallback keeps its aspect-ratio, unchanged, because it is still a plate. */
html.mw-live .mw-viewport { overflow: hidden; width: 100%; height: 100%; aspect-ratio: auto !important; }
.maplibregl-canvas-container canvas { outline: none; }
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
.pt {
  position: absolute;
  width: 28px;
  height: 28px;
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
`.trim();
}

/** A light neutral land fill, `ratio` of the way from ground toward ink — the same local mix the
 *  still sibling applies, so the two genres draw the same neutral. */
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
  const result = spawnSync("bun", [join(HERE, "bake.mjs"), "--size", PLATE_SIZE, "--out", plateDir], {
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
