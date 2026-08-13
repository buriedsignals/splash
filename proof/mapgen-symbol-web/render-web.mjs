// twin/proof/mapgen-symbol-web/render-web.mjs
//
// The WEB format of the proportional-symbol map: the same seventeen USGS events
// `proof/map-quake-symbol` ships as a still and as a video, turned into ONE self-contained HTML
// file — one fluid SVG carrying geometry only, one HTML overlay carrying every word and every
// control, the accessible table this beat opts into, one inlined interaction script, and no external
// request once the plate is inlined as a data URI.
//
// This is this beat's OWN copy of `map-web/scripts/render-web.mjs`'s machinery, adapted to this
// beat's component and its filter dimension. Nothing here imports out of a skill or across beats,
// except `#shared/chart-beat/render-still.mjs` for `readPalette` — the one module in this tree
// that reads a recorded colour answer, which every format draws from.
//
// EVERY NUMBER A READER SEES IS COMPUTED HERE, from the frozen csv, and printed to the console
// before the render. Nothing is typed: the event count, the year window, the magnitudes, the
// percentage the largest circle exceeds the second by, the energy ratios and the distance between
// the two events whose hit targets overlap are all derived, and the claim itself is asserted against
// the data before anything is drawn.
//
// Usage:  bun proof/mapgen-symbol-web/render-web.mjs [outDir] [--data <csv>]

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
import { QuakeSymbolWeb, QuakeTable, SUBJECT_KEY, quakeDetail } from "./QuakeSymbolWeb.tsx";
import {
  quakesFromCsv,
  arcOf,
  drawOrder,
  groupsOf,
  slugOf,
  radiusScale,
  yearWindow,
  energyRatio,
  symbolClaimViolations,
  en,
} from "./geo-symbol.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
// Resolved through node's own module resolution, never by a relative path out of this beat.
// `no-cross-skill-imports.test.ts` reads path STRINGS, not just import statements, and a literal
// `../../node_modules/...` reads to it — correctly — as a specifier leaving the beat. A package
// name is the honest way to say "this comes from a dependency".
const requireFrom = createRequire(import.meta.url);
const MAPLIBRE_JS = requireFrom.resolve("maplibre-gl/dist/maplibre-gl.js");
const MAPLIBRE_CSS = requireFrom.resolve("maplibre-gl/dist/maplibre-gl.css");

// ===== CONFIG — this beat's own story =====
const BEAT = {
  source: "Source: USGS Earthquake Catalog (earthquake.usgs.gov), western Pacific",
  basemapCredit: "basemap © MapTiler, © OpenStreetMap",
};
/** geo-discipline rule 7's water colour, applied to the LIVE style exactly as `bake.mjs` applies it
 *  to the baked one — read from the bake rather than typed twice. */
const WATER_FILL = "#aac9e0";
const PLATE_SIZE = 1000;
// FROZEN BESIDE THE BEAT, for the same reason the csv is: a basemap living in `/tmp` cannot be
// committed, so the delivered html could be neither reproduced nor audited — and MapTiler restyles,
// so a re-bake months later is a different picture under the same circles. `ensurePlate` bakes only
// when this folder is empty.
const DEFAULT_PLATE_DIR = join(HERE, "plate");
const DEFAULT_DATA_PATH = join(HERE, "quakes-symbol.csv");
// And the OUTPUT lands beside the beat, where `quake-symbol.html` is committed. A render whose
// default output is a scratch directory prints a path, exits zero, and leaves the committed artifact
// stale — thirty beat scripts in this tree were in exactly that state.
const DEFAULT_OUT_DIR = HERE;
const OUTPUT_NAME = "quake-symbol.html";
// ==========================================

/**
 * SSRs the map component once (the fluid SVG plus its HTML overlay IS the one responsive render),
 * SSRs the table when the beat asked for it, wraps both in one self-contained HTML file and writes
 * it. Generic across map-web beats: it knows nothing of this story's own points or groups.
 */
/**
 * RULING R1b — THE KEY NEVER ENTERS THE REPOSITORY. R1 accepted the key being visible to a reader of
 * a published article; it did not accept an unbounded public leak, and the two are different
 * exposures. This beat COMMITS its rendered HTML and the FJM deliverable is an MIT open-source
 * release, so a real key here would be scanned by bots within minutes of the push and would survive
 * in the history after any later removal. `deliver` substitutes the real key at the moment the
 * file goes to a newsroom; `splash/test/no-key-in-the-repository.test.ts` reddens if one ever
 * reaches a tracked file.
 *
 * The delivered key is a SECOND, origin-restricted MapTiler key, not the development one: MapTiler's
 * documented mitigation for a client-side key is Allowed HTTP origins, enforced server-side, and an
 * account's DEFAULT key cannot be restricted.
 */
export const KEY_PLACEHOLDER = "__MAPTILER_KEY__";

/**
 * The plan the live layer reads out of the page. Every camera number comes from this beat's own
 * frozen `geometry.json` — `frameCorners` is the extent the camera ACTUALLY showed, which is not the
 * bounds it was asked for.
 *
 * ONE LAYER, and it is a proportional symbol, so its radius is `"camera"`: derived from the camera
 * at the fit and then held constant in screen pixels as the reader zooms. A circle here encodes a
 * MAGNITUDE, and growing it with the zoom would make M9.1 mean two different sizes at two zooms.
 */
export function livePlan({ geometry, subjectKey, accent, muted, waterFill }) {
  const corners = geometry.frameCorners;
  if (!corners || !(geometry.degreesPerPixel > 0))
    throw new Error(
      "this plate predates the camera facts: re-bake it, or the live map has neither bounds to be " +
        "constrained to nor a ground scale to draw its marks at",
    );
  const lons = geometry.points.map((p) => p.lon);
  const lats = geometry.points.map((p) => p.lat);
  const maxMag = Math.max(...geometry.points.map((p) => p.mag));
  // THE SAME radius scale the SVG draws from — `QuakeSymbolWeb`'s own
  // `MARK_MAX_RADIUS_FRACTION` (0.045), so the fallback circle and the live circle can never be two
  // sizes. A second constant here is exactly the "two numbers describing one circle" defect the live
  // layer already paid for once.
  const radiusOf = radiusScale(maxMag, geometry.frame.width * 0.045);
  const anchors = {};
  for (const point of geometry.points) anchors[point.key] = [point.lon, point.lat];
  const studyLonSpan = Math.max(...lons) - Math.min(...lons);
  return {
    styleUrl: `https://api.maptiler.com/maps/${geometry.style}/style.json?key=${KEY_PLACEHOLDER}`,
    waterFill,
    frame: geometry.frame,
    degreesPerPixel: geometry.degreesPerPixel,
    metresPerPixel: geometry.metresPerPixel,
    bakeZoom: geometry.zoom,
    studyBounds: {
      west: Math.min(...lons),
      east: Math.max(...lons),
      south: Math.min(...lats),
      north: Math.max(...lats),
    },
    // HOW FAR IN THE READER MAY GO, AT MINIMUM — and this beat is the reason the floor exists.
    //
    // `leash()`'s own rule is "as far as the study set still fills the frame", which is right for a
    // reader looking at the whole claim and useless for the reader this beat has: the two events off
    // Singkil and Sinabang sit 3.6 px apart on a 1000 px plate under circles ~28 px across, and the
    // beat's own caveat says so in words. A reader who cannot pull them apart has exactly the map
    // the still already gave them. Measured on the delivered page before this floor existed: 1.58
    // zoom levels of headroom at 1600x900 and **0.33 at 768x1024** — a factor of 1.26, which is not
    // "moving through the map" in any sense ruling R1 meant.
    //
    // So the floor is the zoom at which the CLOSEST PAIR stops overlapping. A camera-scaled circle
    // holds its screen size as the reader zooms (a circle encodes a magnitude, not a ground area),
    // so each doubling of zoom doubles the distance between two centres while the radii stay put:
    // the pair separates once `distance x 2**h >= rA + rB`. Every number in it is read off this
    // beat's own frozen data and its own radius scale — nothing is picked.
    minZoomHeadroom: separationHeadroom(geometry.points, radiusOf),
    anchors,
    layers: [
      {
        id: "mw-marks",
        type: "circle",
        // Largest first in the SOURCE order, so MapLibre paints the small circles last and a small
        // event inside a large one stays hoverable — the same invariant `targetOrder` states for
        // the HTML buttons.
        data: {
          type: "FeatureCollection",
          features: drawOrder(geometry.points).map((point) => ({
            type: "Feature",
            geometry: { type: "Point", coordinates: [point.lon, point.lat] },
            properties: {
              key: point.key,
              name: point.place,
              group: slugOf(point.arc),
              subject: point.key === subjectKey,
              r: radiusOf(point.mag),
            },
          })),
        },
        paint: {
          "circle-color": ["case", ["get", "subject"], accent, muted],
          "circle-opacity": ["case", ["get", "subject"], 0.42, 0.26],
          "circle-stroke-color": ["case", ["get", "subject"], accent, muted],
          "circle-stroke-width": 1,
        },
        radius: "camera",
        filterProperty: "group",
        hover: true,
      },
    ],
  };
}

/**
 * The zoom headroom a reader needs before the two closest events stop overlapping — measured on the
 * plate, in the plate's own units, from the same radius scale the circles are drawn at.
 *
 * Returns 0 when nothing overlaps, which is the honest answer: a study set drawn without collisions
 * needs no extra leash, and `leash()`'s own frame-filling rule then governs alone.
 */
export function separationHeadroom(points, radiusOf) {
  let worst = 0;
  for (let i = 0; i < points.length; i++)
    for (let j = i + 1; j < points.length; j++) {
      const gap = Math.hypot(points[i].px - points[j].px, points[i].py - points[j].py);
      const touching = radiusOf(points[i].mag) + radiusOf(points[j].mag);
      if (gap <= 0 || gap >= touching) continue;
      worst = Math.max(worst, Math.log2(touching / gap));
    }
  return Math.round(worst * 1000) / 1000;
}

/** What the collapsed disclosure's own summary calls its rows (B5.2). A beat's word, not a
 *  format's — `discloseTable` refuses to invent one. */
const TABLE_ROW_NOUN = "earthquakes";

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

async function renderMapWeb({ component, table, props, outDir, name, regionTable = false, live = false, plan = null }) {
  const furniture = deriveFurniture(props.ground);
  const mapHtml = renderToStaticMarkup(createElement(component, { ...props, ...furniture }));
  const tableHtml = regionTable
    ? discloseTable(
        renderToStaticMarkup(createElement(table, { points: props.geometry.points, ...furniture })),
        TABLE_ROW_NOUN,
      )
    : "";

  const interactionSource = await readFile(join(HERE, "interaction.mjs"), "utf8");
  const inlineScript = inlineable(interactionSource);

  // maplibre-gl inlined rather than loaded from a CDN. A `<script src>` would trade 803 KB of
  // payload for a SECOND third-party host; inlining keeps the count at one — api.maptiler.com —
  // which is the honest reading of R1.
  const liveBlock = live
    ? `<style>\n${await readFile(MAPLIBRE_CSS, "utf8")}\n</style>\n` +
      `<script type="application/json" id="mw-live-plan">${JSON.stringify(plan).replace(/</g, "\\u003c")}</script>\n` +
      `<script>\n${await readFile(MAPLIBRE_JS, "utf8")}\n</script>\n` +
      `<script>\n${inlineable(await readFile(join(HERE, "live-map.mjs"), "utf8"))}\n</script>`
    : "";

  const groups = groupsOf(props.geometry.points);
  assertDistinctSlugs(groups);

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(props.title)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
${buildCss({ ...props, ...furniture, groups, frame: props.geometry.frame })}
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

/**
 * Fails loud when two filter groups slug to the same string, or when one slugs to `all` — both
 * would silently narrow to the wrong set rather than break the build. `#mw-filter-all` is the
 * reserved id of the unfiltered option, and every group's identity travels through `slugOf` twice
 * (the radio's `id`, and the `data-group` every mark, button and row carries).
 */
function assertDistinctSlugs(groups) {
  const seen = new Map();
  for (const group of groups) {
    const slug = slugOf(group);
    if (slug === "all")
      throw new Error(
        `the filter group ${JSON.stringify(group)} slugs to "all", the reserved id of the unfiltered option — rename it`,
      );
    if (!slug)
      throw new Error(`the filter group ${JSON.stringify(group)} slugs to an empty string — rename it`);
    if (seen.has(slug))
      throw new Error(
        `the filter groups ${JSON.stringify(seen.get(slug))} and ${JSON.stringify(group)} both slug to ${JSON.stringify(slug)} — one filter would narrow to both`,
      );
    seen.set(slug, group);
  }
}

/**
 * One `:has()` rule per group, hiding every mark, hit target and table row NOT tagged with the
 * checked group — pure CSS, so the filter works identically with the page's own inline script absent
 * entirely. The SLUG is what the selector quotes: the raw group name, HTML-escaped into a CSS
 * string, once turned `&` into five literal characters that matched no element, and one filter left
 * a reader an empty map with nothing red anywhere.
 */
function buildCss({ ground, accent, ink, muted, groups, frame }) {
  const aspect = frame.width / frame.height;
  const filterRules = groups
    .map((g) => {
      const id = `mw-filter-${slugOf(g)}`;
      const attr = slugOf(g);
      return [
        `.map-web-page:has(#${id}:checked) .pt:not([data-group="${attr}"]) { display: none; }`,
        // B6.18b: the LABEL too. Without this rule a filter hid the subject's circle and its hit
        // target and left "M9.1" floating over a mark that was no longer on the map — measured on
        // the delivered page, not deduced. The seed had this rule; this beat did not.
        `.map-web-page:has(#${id}:checked) .point-label:not([data-group="${attr}"]) { display: none; }`,
        `.map-web-page:has(#${id}:checked) svg.map circle[data-group]:not([data-group="${attr}"]) { display: none; }`,
        `.map-web-page:has(#${id}:checked) .region-table tbody tr:not([data-group="${attr}"]) { display: none; }`,
      ].join("\n");
    })
    .join("\n");

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
   height it needs, and .mw-stage is handed whatever is left. Nothing scrolls inside the visual, at
   any width. The accessible table below the beat is normal document reading and is deliberately not
   inside this box — it is not "scrolling inside the visual", it is the page continuing.
   'svh', not 'vh': on a phone with a retracting toolbar 'vh' is the LARGE viewport, which is exactly
   the height the beat must not assume it has. The 'vh' line above it is the fallback for a browser
   without 'svh', and errs one toolbar too tall rather than clipping. */
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
.mw-source { font-size: 13px; color: var(--muted); margin: 0 0 12px; }
.mw-filter { border: 0; padding: 0; margin: 0 0 14px; min-width: 0; }
.mw-filter legend {
  padding: 0;
  margin: 0 0 6px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}
.mw-filter-options { display: flex; flex-wrap: wrap; gap: 6px; }
.mw-chip {
  position: relative;
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 5px 14px;
  border: 1px solid var(--muted);
  border-radius: 999px;
  font-size: 13px;
  line-height: 1.2;
  color: var(--ink);
  background: var(--ground);
  cursor: pointer;
}
/* Out of sight, still in the accessibility tree, still focusable, still keyboard-operable. NOT
   'display: none' and NOT 'visibility: hidden' — either would take the radio out of the tab order
   and out of the arrow-key group, which is the whole thing this treatment must not cost. */
.mw-chip input {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: 0;
  opacity: 0;
  pointer-events: none;
}
.mw-chip:hover { border-color: var(--ink); }
.mw-chip:has(input:checked) {
  background: var(--ink);
  border-color: var(--ink);
  color: var(--ground);
  font-weight: 600;
}
.mw-chip:has(input:focus-visible) { outline: 2px solid var(--ink); outline-offset: 2px; }
/* In forced-colours mode the system paints its own background and text, so "the filled chip is the
   checked one" stops being visible at all. Rather than invent a substitute indicator, put the native
   control back — the OS already draws a radio the reader recognises. */
@media (forced-colors: active) {
  .mw-chip input {
    position: static;
    width: auto;
    height: auto;
    opacity: 1;
    pointer-events: auto;
    margin-right: 6px;
  }
  .mw-chip:has(input:checked) { font-weight: 700; }
}
/* The stage: the leftover height, and the container the map is measured against. 'container-type:
   size' is what lets the viewport bound itself by the stage's HEIGHT as well as its width — CSS has
   no other way to say "as wide as you like, never taller than the room left". */
.mw-stage { flex: 1 1 auto; container-type: size; min-height: 180px; }
/* The viewport: the bake's own aspect, exactly, at every size — bounded by the stage's width AND its
   height, whichever binds first. A plate stretched to fill a shape it was not baked for is a lie
   about distance and shape, so it is not one of the outcomes here; a smaller, correct map is. The
   plain 'width: 100%' above the 'min()' is the fallback for a browser without container query
   units. */
.mw-viewport {
  position: relative;
  width: 100%;
  width: min(100cqw, calc(100cqh * ${aspect}));
  max-width: 100%;
  /* Flush left, not centred: when the window's HEIGHT is what bounds the map, the leftover room is
     horizontal, and a centred map floats away from the title, the chips and the legend, which are
     all flush left. */
  margin-inline: 0 auto;
  /* 'visible', not 'hidden'. The plate and its circles are already clipped to the frame by the SVG's
     own clipPath, so the only thing this would ever clip is the subject's own label — a word, which
     is data. Letting it spill into the page's side gutter keeps the word whole. */
  overflow: visible;
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
/* The overlay is a SIBLING of both map layers and is never hidden with either: it carries the
   subject's label and every Tab stop, so hiding it with the fallback would take the whole keyboard
   path away at the moment the live map arrives. */
.mw-overlay { z-index: 2; pointer-events: none; }
.mw-overlay .pt { pointer-events: auto; }
/* Live, the canvas is what a pointer talks to: queryRenderedFeatures makes the hit area the
   RENDERED MARK at every size and every zoom, which is what B6.18a asked for and what a fixed 28px
   button under a 90px disc could never give. The buttons stay in the DOM, still Tab-reachable and
   still carrying their own aria-label — only their pointer-events go. */
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
  font-weight: 600;
  color: var(--ink);
  background: var(--ground);
  padding: 1px 4px;
  border-radius: 2px;
  white-space: nowrap;
  pointer-events: none;
}
.point-label.subject { color: var(--accent); font-weight: 700; }
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
.pt:hover, .pt:focus, .pt.pt-active { background: var(--muted); opacity: 0.28; outline: none; }
.pt:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; opacity: 1; background: transparent; }
.mw-legend { margin: 12px 0 4px; }
.mw-legend-caption { font-size: 12.5px; font-weight: 600; color: var(--muted); margin: 0 0 8px; }
.mw-legend-marks { display: flex; align-items: flex-end; gap: 16px; flex-wrap: wrap; }
.mw-legend-item { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.mw-legend-swatch { display: block; border-radius: 50%; border: 1px solid var(--muted); }
.mw-legend-value { font-size: 12px; color: var(--muted); }
.mw-subject { font-size: 12px; font-weight: 700; color: var(--accent); margin: 8px 0 4px; }
.mw-caveat { font-size: 11.5px; color: var(--muted); margin: 0 0 12px; }
${filterRules}
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
   below the beat, in normal document flow, and the same filter rule above narrows it. */
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

/** Bakes the plate ONLY when the frozen one is absent — a warm run never touches the network. */
async function ensurePlate(plateDir) {
  if (existsSync(join(plateDir, "geometry.json")) && existsSync(join(plateDir, "plate.png"))) return;
  await mkdir(plateDir, { recursive: true });
  const result = spawnSync(
    "bun",
    [join(HERE, "bake.mjs"), "--size", String(PLATE_SIZE), "--out", plateDir],
    { cwd: resolve(HERE, "../.."), stdio: "inherit" },
  );
  if (result.status !== 0) throw new Error(`bake.mjs exited with ${result.status}`);
}

async function loadPlate(plateDir) {
  const geometry = JSON.parse(await readFile(join(plateDir, "geometry.json"), "utf8"));
  const png = await readFile(join(plateDir, "plate.png"));
  return { geometry, plate: `data:image/png;base64,${png.toString("base64")}` };
}

/** Great-circle distance in kilometres between two events, so the caveat's "closer than a pointer
 *  target is wide" carries a measured number rather than an impression. */
function haversineKm(a, b) {
  const R = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** The two events that sit closest together on the PLATE — the pair whose hit targets overlap, found
 *  by measuring rather than by remembering which two they were. */
function closestPair(points) {
  let best = null;
  for (let i = 0; i < points.length; i++)
    for (let j = i + 1; j < points.length; j++) {
      const px = Math.hypot(points[i].px - points[j].px, points[i].py - points[j].py);
      if (!best || px < best.platePx) best = { a: points[i], b: points[j], platePx: px };
    }
  return best;
}

async function render({ dataPath, plateDir, outDir, name = OUTPUT_NAME }) {
  await ensurePlate(plateDir);
  const { geometry, plate } = await loadPlate(plateDir);

  const rows = quakesFromCsv(await readFile(dataPath, "utf8"));
  const pxOf = new Map(geometry.points.map((p) => [p.key, { px: p.px, py: p.py }]));
  const points = rows.map((row) => {
    const projected = pxOf.get(row.key);
    if (!projected) throw new Error(`the bake has no projected point for ${row.key} (${row.place})`);
    return { ...row, ...projected, arc: arcOf(row) };
  });
  if (points.length !== rows.length)
    throw new Error(`merge dropped rows: ${rows.length} events, ${points.length} merged`);

  // ── The claim, checked against the data before anything is drawn ────────────────────────────
  const violations = symbolClaimViolations({ rows, subjectKey: SUBJECT_KEY });
  if (violations.length)
    throw new Error(
      `claim check failed: the beat names ${SUBJECT_KEY} as the largest event, but ${violations.join("; ")}`,
    );
  const ranked = drawOrder(points);
  const subject = ranked[0];
  const second = ranked[1];
  if (subject.key !== SUBJECT_KEY)
    throw new Error(`the largest event is ${subject.key} (${subject.place}), not the named subject ${SUBJECT_KEY}`);

  const window = yearWindow(rows);
  const magFloor = Math.min(...rows.map((r) => r.mag));
  // The percentage through the beat's OWN scale, so the sentence cannot drift from the circles it
  // describes: the max radius cancels out of the ratio, and the pixel difference is quoted at the
  // plate's own scale, which is the one number the geometry actually holds.
  const plateRadius = radiusScale(subject.mag, geometry.frame.width * 0.045);
  const percentWider = (plateRadius(subject.mag) / plateRadius(second.mag) - 1) * 100;
  const pixelsWider = plateRadius(subject.mag) - plateRadius(second.mag);
  const energyOverSecond = energyRatio(subject.mag, second.mag);
  const energyPerStep = energyRatio(1, 0);
  const groups = groupsOf(points);
  const perArc = groups.map((g) => ({ arc: g, n: points.filter((p) => p.arc === g).length }));
  const near = closestPair(points);
  const nearKm = haversineKm(near.a, near.b);

  console.log(
    `${points.length} events, ${window.label}, M${en(magFloor)}–M${en(subject.mag)}\n` +
      `subject ${subject.place} M${en(subject.mag)} · second ${second.place} M${en(second.mag)}\n` +
      `radius ratio ${(plateRadius(subject.mag) / plateRadius(second.mag)).toFixed(6)} → +${percentWider.toFixed(2)}% ` +
      `(${pixelsWider.toFixed(2)} px at the ${geometry.frame.width}px plate scale)\n` +
      `energy: subject is ${energyOverSecond.toFixed(1)}x the second, one whole step is ${energyPerStep.toFixed(1)}x\n` +
      `arcs: ${perArc.map((a) => `${a.arc} ${a.n}`).join(" · ")}\n` +
      `closest pair on the plate: ${near.a.place} / ${near.b.place} — ${near.platePx.toFixed(1)}px apart, ${nearKm.toFixed(0)} km`,
  );

  const palette = readPalette(HERE, { stopAt: resolve(HERE, "..", "..") });
  console.log(`palette from ${palette.source} — ground ${palette.ground}, accent ${palette.accent}, chosen by ${palette.origin}`);

  // The furniture is kept SHORT on purpose. This format gives the map whatever height the window has
  // left once every word has taken its own, so a sentence that wraps to five lines on a phone is
  // paid for in map. Measured at 375 x 812 with a first, wordier draft: 535px of furniture and a
  // 180px map — the stage's own floor, a map smaller than the text describing it.
  const title =
    `${points.length} great quakes, ${window.label}: the biggest circle is only ` +
    `${en(percentWider)} % wider than the next`;
  // No "∝": Helvetica renders the proportionality sign as a stray mark here, caught by looking at
  // the rendered page rather than at the string.
  const legendCaption =
    `Circle area is proportional to reported magnitude. Magnitude is logarithmic — one whole step ` +
    `is about ${en(energyPerStep, 0)}× the energy.`;
  const subjectNote =
    `${subject.place} — M${en(subject.mag)}, and ${en(energyOverSecond)}× the energy of the ` +
    `M${en(second.mag)} that follows it. The accent, not the size, is what identifies it.`;
  // The place strings carry their own distances ("78 km WSW of Singkil"), which reads as a second
  // measurement beside the one this sentence makes. The settlement each is measured from is what a
  // reader needs, and it is taken from the source's own string rather than typed.
  const placeShort = (place) => place.split(" of ").pop().split(",")[0];
  const caveat =
    `Every M${en(magFloor)}+ event the catalogue lists here between ${window.first} and ${window.last}. ` +
    `Where two sit closer than a pointer target is wide — the events off ${placeShort(near.a.place)} and ` +
    `${placeShort(near.b.place)} are ${en(nearKm, 0)} km apart, and the narrower the screen the more pairs ` +
    `do — only one of them answers the pointer. Every event is in the table below, and in the keyboard order.`;
  const alt =
    `Map of the western Pacific, from Sumatra to the Kuril Islands. ${points.length} circles mark great ` +
    `earthquakes between ${window.first} and ${window.last}, each sized by its reported magnitude. The largest, ` +
    `${subject.place} at M${en(subject.mag)}, is drawn in the accent colour — but it is only ${en(percentWider)} % ` +
    `wider than the M${en(second.mag)} event off Sumatra, a difference of ${en(pixelsWider)} pixels at the plate's own ` +
    `${geometry.frame.width}-pixel scale, so the ranking is not readable from the picture. The events sit on ` +
    `${groups.length} arcs: ${perArc.map((a) => `${a.arc} ${a.n}`).join(", ")}. Every magnitude, place and date is ` +
    `listed in the table below the map, strongest first.`;

  const { outPath } = await renderMapWeb({
    component: QuakeSymbolWeb,
    table: QuakeTable,
    props: {
      geometry: { ...geometry, points },
      plate,
      title,
      source: `${BEAT.source}, M${en(magFloor)}+, ${window.label}`,
      basemapCredit: BEAT.basemapCredit,
      legendCaption,
      subjectNote,
      caveat,
      alt,
      ground: palette.ground,
      accent: palette.accent,
    },
    outDir,
    name,
    // OPT-IN, and this beat opts in deliberately: seventeen magnitudes whose circles differ by under
    // 3% at the top cannot be ranked by eye, and the table is the only channel that carries every
    // reading at once — including the event whose hit target is covered by its neighbour's.
    regionTable: true,
    // Ruling R1: this beat is a LIVE MapTiler map with the baked plate as its fallback layer.
    live: true,
    plan: livePlan({
      geometry: { ...geometry, points },
      subjectKey: SUBJECT_KEY,
      accent: palette.accent,
      muted: deriveFurniture(palette.ground).muted,
      // The SAME literal the bake writes into the plate (`bake.mjs`'s water override). If the live
      // style and its own fallback disagree about the colour of water, the swap is visible.
      waterFill: WATER_FILL,
    }),
  });
  // The one thing a reader is promised and a markup check cannot see: the detail string on the hit
  // target has to be the SAME string the table shows for that event.
  const subjectDetail = quakeDetail(subject);
  if (!subjectDetail.includes(`M${en(subject.mag)}`))
    throw new Error(`the subject's own detail string lost its magnitude: ${subjectDetail}`);
  return { outPath, points: points.length };
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

  const { outPath, points } = await render({ dataPath, plateDir, outDir });
  console.log(`symbol-web beat → ${outPath}  [${points} events]`);
}

export { render, renderMapWeb, ensurePlate, loadPlate, BEAT, WATER_FILL, PLATE_SIZE, DEFAULT_PLATE_DIR, DEFAULT_DATA_PATH };
