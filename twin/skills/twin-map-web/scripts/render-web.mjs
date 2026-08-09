// twin/skills/twin-map-web/scripts/render-web.mjs
//
// The map genre's own third rung, the same role `twin-chart-web/scripts/render-web.mjs` plays for
// charts: rung one and two of a map beat are the still and the video
// (`twin-map-beat/scripts/render-map.mjs`); this turns the SAME baked plate into one self-contained
// HTML file — one fluid SVG (geometry only) plus its full HTML overlay (furniture, controls), the
// accessible region table when the beat opted into it (`regionTable`, off by default), one inlined
// interaction script, no external request once the plate is inlined as a data URI. The beat it
// writes fits the reader's window: see `buildCss`'s own "FIT THE WINDOW" note.
//
// It runs in node, which is why it derives the furniture colours: `deriveFurniture` lives beside a
// native rasteriser in this skill's OWN `./render-still.mjs` (a byte-identical copy of
// `twin-chart-beat`'s — a skill never imports another skill, so nothing under a skill may import
// out of it; `splash-twin/test/no-cross-skill-imports.test.ts` fails loud on any specifier that
// does).
//
// `renderMapWeb` below is the genre's own machinery and knows nothing of any one story: it takes
// the component, the accessible-table component and the props to call the first with, as
// arguments — never reaches for one story's own constants by name. Everything under it (the
// CONFIG block, `ensurePlate`, `render`, the CLI block) is the runner for THIS SKILL'S OWN SEED —
// `assets/MapWebSeed.tsx`, drawn from `assets/sample-data/regions.json` — the same "the skill's
// script hosts its own worked values behind a labelled seam" shape `twin-chart-web`'s own
// `render-web.mjs` uses.
//
// Usage:  bun skills/twin-map-web/scripts/render-web.mjs [outDir] [--data <json>]

import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { deriveFurniture, readPalette } from "./render-still.mjs";
import { MapWebSeed, RegionTable } from "../assets/MapWebSeed.tsx";
import { groupsOf, markLayers, maxZoomForStudySet, slugOf } from "../assets/geo-symbol.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
// Resolved through node's own module resolution, never by a relative path out of this skill.
// `no-cross-skill-imports.test.ts` reads path STRINGS, not just import statements, and a literal
// `../../../node_modules/...` reads to it — correctly — as a specifier leaving the skill. A package
// name is the honest way to say "this comes from a dependency", and it is what a copy-pasted skill
// with its own `bun install` would resolve too.
const requireFrom = createRequire(import.meta.url);
const MAPLIBRE_JS = requireFrom.resolve("maplibre-gl/dist/maplibre-gl.js");
const MAPLIBRE_CSS = requireFrom.resolve("maplibre-gl/dist/maplibre-gl.css");

// ===== CONFIG — edit for your story =====
// Everything between here and the closing marker is the SEED beat's own words and defaults — what
// a journalist writing their own map-web beat replaces wholesale. Everything else in this file —
// `renderMapWeb` and its `{ component, table, props, outDir, name, regionTable }` signature,
// `inlineable`, `escapeHtml`, `assertDistinctSlugs`, `buildCss` — is this genre's own mechanics and
// is left alone.
// The colours are the one part of `SEED` that is not words: READ back from this skill's own
// `PALETTE.md`, exactly as a beat reads its story's answer.
const SEED_PALETTE = readPalette(join(HERE, "..", "assets"), { stopAt: join(HERE, "..") });
const SEED = {
  ground: SEED_PALETTE.ground,
  accent: SEED_PALETTE.accent,
  title: "A sample of major European metro-area populations",
  source: "Sample data — not a real measurement",
  basemapCredit: "basemap © MapTiler, © OpenStreetMap",
  legendCaption: "Population, millions",
  caveat: "Sample data for demonstration purposes, not a census figure.",
  alt:
    "A map of Europe with thirteen circles, one per sample metro area, sized by population. " +
    "Paris draws the largest circle; Dublin the smallest.",
  // Ruling R1: map × web is a LIVE MapTiler map. Set this false for a beat that must stay
  // request-free (an offline archive, a CMS with a Content-Security-Policy that refuses
  // api.maptiler.com) — the page then ships as the fallback layer alone, which is exactly what it
  // was before the ruling.
  live: true,
  // The subject, and the seed's own mark sizing — the live layer draws from the SAME `radiusScale`
  // the SVG draws from, so the swap cannot change how big a circle is.
  subjectKey: "paris",
  waterFill: "#aac9e0",
  // The accessible region table: OPT-IN per beat, and off here. What that costs a reader with no
  // spatial access to the map is stated plainly in references/map-web-discipline.md, "The
  // accessibility question" — read it before leaving this false in a beat of your own. Turning it
  // on costs one word here; every `.pt` button keeps its own `aria-label` either way.
  regionTable: false,
};
// Baked generously so the plate stays at or near native resolution across the tested width range
// (375–1600px, minus the page's own 16px body padding on each side) rather than a narrow max-width
// that would leave gutters beside a full-bleed beat — see references/map-web-discipline.md, "Full
// width, genuinely", for the exact numbers this trades off.
const PLATE_SIZE = 1000;
const DEFAULT_PLATE_DIR = `/tmp/map-twin-web/plate-${PLATE_SIZE}`;
const DEFAULT_DATA_PATH = join(HERE, "../assets/sample-data/regions.json");
const DEFAULT_OUT_DIR = "/tmp/map-web-twin";
const OUTPUT_NAME = "population.html";
// =========================================

/**
 * SSRs the map component ONCE (no per-layout duplication — the fluid SVG plus its HTML overlay IS
 * the one responsive render, see `MapWebSeed.tsx`'s own header note), SSRs `table` when — and only
 * when — the beat asked for it, wraps the result in one self-contained HTML file and writes it to
 * disk. Generic across every map-web beat: it does not know a story's own point count or its own
 * filter groups.
 *
 * `regionTable` (default FALSE) is the accessible region table's own switch. It is opt-in rather
 * than automatic, and `references/map-web-discipline.md`'s "The accessibility question" states in
 * full what a reader with no spatial access to the map loses when a beat leaves it off — a beat
 * making that choice should have read it.
 */
/**
 * R1b — THE KEY NEVER ENTERS THE REPOSITORY. R1 accepted the key being visible to a reader of a
 * published article; it did not accept an unbounded public leak, and the two are different
 * exposures. Every map × web beat commits its rendered HTML, and the FJM deliverable is an MIT
 * open-source release, so a real key here would be scanned by bots within minutes of the push and
 * would survive in the history after any later removal. `twin-deliver` substitutes the real key at
 * the moment the file goes to a newsroom; `splash-twin/test/no-key-in-the-repository.test.ts`
 * reddens if one ever reaches a tracked file.
 *
 * The delivered key should be a SECOND, origin-restricted MapTiler key, not the development one:
 * MapTiler's documented mitigation for a client-side key is Allowed HTTP origins, enforced
 * server-side, and an account's DEFAULT key cannot be restricted — a dedicated one has to be
 * created (docs.maptiler.com/cloud/api/authentication-key/).
 */
export const KEY_PLACEHOLDER = "__MAPTILER_KEY__";

/**
 * The plan the live layer reads out of the page: the style URL with its placeholder, the reader's
 * leash, and the marks as GeoJSON. Every camera number comes from the bake's own `geometry.json`
 * — `frameCorners` is the extent the camera ACTUALLY showed, which is not the bounds it was asked
 * for, and it has only been recorded since 2026-08-10. This function is why that task came first.
 */
export function livePlan({ geometry, subjectKey, accent, muted, waterFill }) {
  const corners = geometry.frameCorners;
  if (!corners)
    throw new Error(
      "this plate predates the camera facts: re-bake it, or the live map has no bounds to be constrained to",
    );
  const lons = geometry.points.map((p) => p.lon);
  const lats = geometry.points.map((p) => p.lat);
  const studyLonSpan = Math.max(...lons) - Math.min(...lons);
  const maxValue = Math.max(...geometry.points.map((p) => p.value));
  return {
    styleUrl: `https://api.maptiler.com/maps/${geometry.style}/style.json?key=${KEY_PLACEHOLDER}`,
    waterFill,
    frame: geometry.frame,
    maxBounds: corners,
    minZoom: geometry.zoom,
    maxZoom: maxZoomForStudySet(geometry.zoom, Math.abs(corners.east - corners.west), studyLonSpan),
    studyBounds: {
      west: Math.min(...lons),
      east: Math.max(...lons),
      south: Math.min(...lats),
      north: Math.max(...lats),
    },
    marks: markLayers(geometry.points, {
      maxValue,
      maxRadiusFrameUnits: geometry.frame.width * 0.062,
      subjectKey,
      accent,
      muted,
    }),
  };
}

async function renderMapWeb({ component, table, props, outDir, name, regionTable = false, live = false, plan = null }) {
  const furniture = deriveFurniture(props.ground);
  const mapHtml = renderToStaticMarkup(createElement(component, { ...props, ...furniture }));
  const tableHtml = regionTable
    ? renderToStaticMarkup(
        createElement(table, { points: props.geometry.points, ...furniture }),
      )
    : "";

  const interactionSource = await readFile(join(HERE, "../assets/interaction.mjs"), "utf8");
  const inlineScript = inlineable(interactionSource);

  // maplibre-gl inlined rather than loaded from a CDN. A `<script src>` would trade 803 KB of
  // payload for a SECOND third-party host; inlining keeps the count at one — api.maptiler.com —
  // which is the honest reading of R1. Measured 2026-08-10: 803 KB of JS and 65.5 KB of CSS, against
  // committed pages that ran 186–642 KB, almost all of it the plate. Keeping the fallback AND adding
  // the library roughly doubles the file, and that is the price of the ruling, stated rather than
  // discovered.
  const liveBlock = live
    ? `<style>\n${await readFile(MAPLIBRE_CSS, "utf8")}\n</style>\n` +
      `<script type="application/json" id="mw-live-plan">${JSON.stringify(plan).replace(/</g, "\\u003c")}</script>\n` +
      `<script>\n${await readFile(MAPLIBRE_JS, "utf8")}\n</script>\n` +
      `<script>\n${inlineable(await readFile(join(HERE, "../assets/live-map.mjs"), "utf8"))}\n</script>`
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

/** Strips the `export` keyword from each top-level declaration — see `interaction.mjs`'s own
 *  header note for why. */
function inlineable(moduleSource) {
  return moduleSource.replace(/^export /gm, "");
}

function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Fails loud when two filter groups slug to the same string, or when one of them slugs to `all` —
 * both would silently break the filter rather than break the build. Every group's identity travels
 * through `slugOf` twice over (the radio's `id`, and the `data-group` every mark/label/button/row
 * carries), and `#mw-filter-all` is the reserved id of the unfiltered option, so a study set with
 * groups named "All" and "all", or "Nord-Ost" and "Nord/Ost", would render a control that quietly
 * narrows to the wrong set. There is no correct silent behaviour here, so there is none.
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
      throw new Error(
        `the filter group ${JSON.stringify(group)} slugs to an empty string — rename it`,
      );
    if (seen.has(slug))
      throw new Error(
        `the filter groups ${JSON.stringify(seen.get(slug))} and ${JSON.stringify(group)} both slug to ${JSON.stringify(slug)} — one filter would narrow to both`,
      );
    seen.set(slug, group);
  }
}

/**
 * `groups`: this beat's own filter dimension (`geo-symbol.ts`'s `groupsOf`, the one place it is
 * computed — see that file's own header note on why it is shared rather than re-derived here).
 * Each group gets one `:has()` rule that hides every `.pt`/`.point-label`/table row NOT tagged with
 * it — pure CSS, so the filter (like the zoom toggle below it) works identically with the page's
 * own inline `<script>` absent entirely. `:has()` is the one modern-CSS assumption this genre now
 * makes (Chrome 105+/Safari 15.4+/Firefox 121+, all long-shipped in every evergreen browser this
 * self-contained HTML is built for) — accepted rather than hand-rolling a JS-only fallback for a
 * capability that only degrades to "the filter/zoom controls are inert, the unfiltered/unzoomed
 * view still renders complete" on anything older, which is exactly the guarantee this genre already
 * makes for JavaScript being off.
 */
function buildCss({ ground, accent, ink, muted, groups, frame }) {
  // The plate's own aspect, the one number both the stage's width bound and the viewport's
  // `aspect-ratio` are computed from, so the box can never be asked to be two shapes at once.
  const aspect = frame.width / frame.height;
  const filterRules = groups
    .map((g) => {
      const id = `mw-filter-${slugOf(g)}`;
      // The SLUG is what every mark, label, button and table row carries as `data-group`, and the
      // slug is what this selector quotes — because the two used to differ and one of this seed's
      // own three filters emptied the entire map. The raw group name was HTML-escaped into the
      // selector (`escapeAttr`), so "Central & Northern Europe" became `[data-group="Central &amp;
      // Northern Europe"]`: inside a CSS string `&amp;` is five literal characters, matching no
      // element, so `:not(...)` matched EVERY element and hid all thirteen points, all thirteen
      // circles and every table row. Nothing was red; the markup and the CSS each looked correct in
      // isolation. `slugOf` output is `[a-z0-9-]+` by construction, so there is no escaping
      // question left to get wrong, and `assertDistinctSlugs` above refuses the collisions that
      // one vocabulary makes possible.
      const attr = slugOf(g);
      return [
        `.map-web-page:has(#${id}:checked) .pt:not([data-group="${attr}"]) { display: none; }`,
        `.map-web-page:has(#${id}:checked) .point-label:not([data-group="${attr}"]) { display: none; }`,
        // The decorative SVG mark, too — otherwise a narrowed filter leaves every OTHER region's
        // circle sitting on the map with no label and no hit target, an ambiguous ghost rather
        // than a genuinely narrower map (caught by screenshotting the filtered state, not by
        // reading the markup).
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
   whatever is left. Nothing scrolls inside the visual, at any width — before this, the map's own
   aspect-locked height grew with the width, so a 1600px-wide window drew a 1568px-tall map and the
   claim ("Paris is the largest") sat 800px below the fold, unseen.
   'svh', not 'vh': on a phone with a retracting toolbar, 'vh' is the LARGE viewport, which is
   exactly the height the beat must not assume it has. The 'vh' line above it is the fallback for a
   browser without 'svh', and errs one toolbar too tall rather than clipping. */
.map-web {
  width: 100%;
  display: flex;
  flex-direction: column;
  height: calc(100vh - var(--page-pad) * 2);
  height: calc(100svh - var(--page-pad) * 2);
}
/* Only the stage gives up height. Measured, and not obvious: with 'min-height' here instead of
   'height', the stage's own height stays INDEFINITE for container-query purposes and every 'cqh'
   inside it resolves to zero — the map collapsed to its 2px border and nothing was red. A definite
   height is what makes the stage a real size container. */
.map-web > *:not(.mw-stage) { flex: 0 0 auto; }
.mw-title { font-size: 21px; font-weight: 700; margin: 0 0 4px; }
.mw-source { font-size: 13px; color: var(--muted); margin: 0 0 12px; }
/* THE FILTER, drawn as chips (map-web-discipline.md, "Filters"). Bare browser radios read as an
   unfinished form, not as an editorial control — and a 15px-tall label row is a poor pointer target
   besides. Every input below is still a real radio in a real fieldset: it is moved out of sight,
   never replaced, so Tab still reaches the group, Arrow keys still move within it, the native
   <label> association still makes the whole chip clickable, and none of it needs JavaScript. */
.mw-filter {
  border: 0;
  padding: 0;
  margin: 0 0 14px;
  min-width: 0;
}
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
   'display: none' and NOT 'visibility: hidden' — either would take the radio out of the tab
   order and out of the arrow-key group, which is the whole thing this treatment must not cost. */
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
   checked one" stops being visible at all. Rather than invent a substitute, put the native control
   back: the OS already draws a radio the reader recognises. */
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
.mw-zoom-toggle-label { display: inline-block; font-size: 13px; margin: 0 0 8px; cursor: pointer; }
/* The stage: the leftover height, and the container the map is measured against. 'container-type:
   size' is what lets the viewport below bound itself by the stage's HEIGHT as well as its width —
   CSS has no other way to say "as wide as you like, but never taller than the room left". */
.mw-stage {
  flex: 1 1 auto;
  container-type: size;
  min-height: 180px;
}
/* The viewport: the bake's own aspect, exactly, at every size — bounded by the stage's width AND
   its height, whichever binds first, and centred when it is the height. A plate stretched to fill
   a shape it was not baked for is a lie about distance and shape (geo-discipline.md), so it is not
   one of the outcomes here; a smaller, correct map is. The plain 'width: 100%' above the 'min()'
   is the fallback for a browser without container query units — it fills the width, exactly as this
   genre did before, rather than collapsing. */
.mw-viewport {
  position: relative;
  width: 100%;
  width: min(100cqw, calc(100cqh * ${aspect}));
  max-width: 100%;
  /* Left-aligned, not centred. When the WINDOW's height is what bounds the map, the leftover room
     is horizontal, and a centred map floats away from the title, the filter chips and the legend —
     which are all flush left, at full width. Flush left puts every edge of the beat on one line and
     collects the spare room as a margin. When width is what binds (the common case), the map fills
     it and this does nothing at all. */
  margin-inline: 0 auto;
  /* 'visible', not 'hidden'. The plate and its circles are already clipped to the frame by the
     SVG's own clipPath, so the only thing this would clip is a point LABEL — a name, which is
     data. A label's width is a fixed number of CSS pixels while the frame it is placed in is a
     percentage, so at the narrow end the two stop fitting together no matter how the flip margin
     is tuned: measured at 375px, 'Stockholm' and 'Warsaw' each lost 3-4px off their last letter.
     Letting them spill into the page's own side gutter keeps the word whole. Zoomed, the rule
     below takes over and this becomes 'auto' — a pannable box must clip. */
  overflow: visible;
  border: 1px solid var(--muted);
}
.mw-viewport[tabindex] { outline-offset: 2px; }
.mw-viewport[tabindex]:focus-visible { outline: 2px solid var(--ink); }
/* The two layers occupy the SAME box, the live one underneath. It is laid out from the first frame
   rather than revealed later, because a container with no size is a map with no size: MapLibre reads
   the box at construction, and a display:none container gives it 0x0 and a canvas nothing ever
   paints into. Invisible-but-laid-out, then, and the swap is one flip of the fallback's own
   hidden attribute. */
.mw-fallback, .mw-live-map, .mw-overlay { position: absolute; inset: 0; width: 100%; height: 100%; }
.mw-live-map { z-index: 0; }
.mw-fallback { z-index: 1; background: var(--ground); }
.mw-fallback[hidden] { display: none; }
/* The overlay is a SIBLING of both map layers and is never hidden with either: it carries the point
   names and every Tab stop, so hiding it with the fallback would take the whole keyboard path away
   at the moment the live map arrives. Found by looking at the live page, not by an assertion. */
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
   container's own width the way an SVG-embedded <text> inside a scaling viewBox would. */
.point-label {
  position: absolute;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--ink);
  background: var(--ground);
  padding: 1px 4px;
  border-radius: 2px;
  white-space: nowrap;
  pointer-events: none;
}
.point-label.subject { color: var(--accent); font-weight: 700; }
/* The interaction layer: a real <button>, fixed-CSS-pixel diameter — a legitimate touch/pointer
   target at every width, unlike an SVG hit-circle sized in frame units (see MapWebSeed.tsx's own
   HIT_TARGET_PX note). */
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
.pt:hover, .pt:focus, .pt.pt-active {
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
.mw-legend { margin: 14px 0 6px; }
.mw-legend-caption { font-size: 12.5px; font-weight: 600; color: var(--muted); margin: 0 0 8px; }
.mw-legend-marks { display: flex; align-items: flex-end; gap: 16px; flex-wrap: wrap; }
.mw-legend-item { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.mw-legend-swatch { display: block; border-radius: 50%; border: 1px solid var(--muted); }
.mw-legend-value { font-size: 12px; color: var(--muted); }
.mw-subject { font-size: 12px; font-weight: 700; color: var(--accent); margin: 10px 0 4px; }
.mw-caveat { font-size: 11.5px; color: var(--muted); margin: 0 0 16px; }
${filterRules}
#tooltip {
  position: fixed;
  max-width: 220px;
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
/* The accessible table (MapWebSeed.tsx's RegionTable), present only when the beat opted in: when it
   IS here it is a real, plainly visible table, never a screen-reader-only trick — see
   references/map-web-discipline.md, "The accessibility question", which also states what the
   default (off) costs a reader with no spatial access to the map. Styled plainly enough to read as
   a data table, not hidden or shrunk to decoration. */
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
.region-table tr.subject th, .region-table tr.subject td {
  color: var(--accent);
  font-weight: 700;
}
`.trim();
}

/** Bakes the plate if it is not already at `PLATE_DIR` — the same "bake once, reuse" shape
 *  `twin-map-beat/scripts/render-preview.mjs` uses for its own seed. */
async function ensurePlate(plateDir) {
  if (existsSync(join(plateDir, "geometry.json")) && existsSync(join(plateDir, "plate.png")))
    return;
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

/** The seed beat's own runner: bakes the plate if missing, reads the seed's own points, hands the
 *  seed component and `RegionTable` (imported above from this skill's own `assets/`) to the
 *  genre's generic `renderMapWeb`. */
async function render({ dataPath, plateDir, outDir, name = OUTPUT_NAME }) {
  await ensurePlate(plateDir);
  const { geometry, plate } = await loadPlate(plateDir);

  const points = JSON.parse(await readFile(dataPath, "utf8"));
  if (points.length < 2) throw new Error(`need at least two points, got ${points.length}`);

  // The bake's own points already carry `px`/`py`; the seed's data file carries `value`/`group`
  // — merge by key so `geometry.points` is the one shape both the map and the table read from.
  const byKey = new Map(points.map((p) => [p.key, p]));
  const merged = geometry.points.map((p) => ({ ...p, ...(byKey.get(p.key) ?? {}) }));

  const { outPath } = await renderMapWeb({
    component: MapWebSeed,
    table: RegionTable,
    props: {
      geometry: { ...geometry, points: merged },
      plate,
      title: SEED.title,
      source: SEED.source,
      basemapCredit: SEED.basemapCredit,
      legendCaption: SEED.legendCaption,
      caveat: SEED.caveat,
      alt: SEED.alt,
      ground: SEED.ground,
      accent: SEED.accent,
    },
    outDir,
    name,
    regionTable: SEED.regionTable,
    live: SEED.live,
    plan: SEED.live
      ? livePlan({
          geometry: { ...geometry, points: merged },
          subjectKey: SEED.subjectKey,
          accent: SEED.accent,
          muted: deriveFurniture(SEED.ground).muted,
          waterFill: SEED.waterFill,
        })
      : null,
  });
  return { outPath, points: merged.length };
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
  console.log(`map-web beat → ${outPath}  [${points} points]`);
}

export {
  render,
  renderMapWeb,
  ensurePlate,
  loadPlate,
  SEED,
  PLATE_SIZE,
  DEFAULT_PLATE_DIR,
  DEFAULT_DATA_PATH,
};
