// twin/proof/mapgen-locator-web/render-web.mjs
//
// The web genre, applied to a LOCATOR beat. Turns the SAME baked plate `bake-plate.mjs` produces
// into one self-contained HTML file — ONE fluid SVG (geometry only) plus its HTML overlay
// (furniture, labels, hit targets), the always-rendered table of all eleven organisations, one
// inlined interaction script, and — since ruling R1 (2026-08-10) — a LIVE MapTiler map layered
// under all of it.
//
// This is this beat's OWN copy of `map-web/scripts/render-web.mjs`'s machinery, adapted to this
// beat's own component (`LocatorWeb`) and table (`OrgTable`) — nothing here imports out of
// `map-web` or across beats (a beat's own render script is its own, the same rule
// `geo-locator.ts`'s own header states for the pure core).
//
// THE TWO-RUNG `layouts` API IS GONE (B5.1). This script used to SSR one whole SVG frame per
// `WebLayout` — a 860 px "desktop" and a 360 px "narrow", both shipped, a media query choosing one —
// with every word of furniture drawn as SVG `<text>` inside each. Measured on the delivered file at
// 1600x900 it produced a 910 px page in a 900 px window, and 1226 px in a 375x667 one. There is now
// one render and one stylesheet that bounds the whole beat to the reader's own window; see
// `buildCss`'s own "FIT THE WINDOW" note.
//
// Usage:  bun proof/mapgen-locator-web/render-web.mjs [outDir] [--data <csv>]

import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { deriveFurniture, measureText } from "./render-still.mjs";
import {
  HIT_TARGET_PX,
  LABEL_FONT,
  LABEL_PAD_X,
  LABEL_PAD_Y,
  LocatorCaveat,
  LocatorWeb,
  MARKER_RADIUS_PX,
  MARKER_STROKE_PX,
  OrgTable,
  pointDetail,
} from "./LocatorWeb.tsx";
import {
  CATEGORY_ORDER,
  orgsFromCsv,
  readingOrder,
  slugOf,
} from "./geo-locator.ts";
// `readPalette` and `seriesInks` come from the SHARED copy through the `#shared/…` subpath alias —
// a beat is a story, not a skill, so it may reach out where a skill may not.
import { readPalette, seriesInks } from "#shared/chart-beat/render-still.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
// Resolved through node's own module resolution, never by a relative path out of this beat.
// `no-cross-skill-imports.test.ts` reads path STRINGS, not just import statements, and a literal
// `../../node_modules/...` reads to it — correctly — as a specifier leaving the beat. A package name
// is the honest way to say "this comes from a dependency", and it is what a copy-pasted beat with
// its own `bun install` would resolve too.
const requireFrom = createRequire(import.meta.url);
const MAPLIBRE_JS = requireFrom.resolve("maplibre-gl/dist/maplibre-gl.js");
const MAPLIBRE_CSS = requireFrom.resolve("maplibre-gl/dist/maplibre-gl.css");

// The colours are READ, not typed — see `PALETTE.md` beside this file. A locator draws no value
// channel, so category colour is this map's ENTIRE data encoding; all three come out of the
// recorded answer, in the order `CATEGORY_ORDER` lists them.
const PALETTE = readPalette(HERE, { stopAt: join(HERE, "..") });
const CATEGORY_COLOUR = Object.fromEntries(
  seriesInks(PALETTE, CATEGORY_ORDER.length).map((ink, index) => [
    CATEGORY_ORDER[index],
    ink,
  ]),
);
console.log(
  `palette from ${PALETTE.source} — ground ${PALETTE.ground}, chosen by ${PALETTE.origin}; ` +
    CATEGORY_ORDER.map((c) => `${c} ${CATEGORY_COLOUR[c]}`).join(", "),
);

// ===== CONFIG — edit for your story =====
const BEAT = {
  ground: PALETTE.ground,
  title: "Eleven international organisations headquartered in and around Geneva",
  source:
    "Source: Wikidata (query.wikidata.org/sparql), organisations within 6 km of central Geneva",
  basemapCredit: "basemap © MapTiler, © OpenStreetMap",
  legendCaption: "Category",
  // Ruling R1: map × web is a LIVE MapTiler map. Set this false for a beat that must stay
  // request-free (an offline archive, a CMS with a Content-Security-Policy that refuses
  // api.maptiler.com) — the page then ships as the fallback layer alone, which is exactly what this
  // beat was before the ruling.
  live: true,
  // Rule 7 of `geo-discipline.md`, and the same value `bake-plate.mjs` paints the plate's water
  // with: if the live map and its own fallback disagree about the colour of water, the swap is
  // visible and the beat is broken.
  waterFill: "#aac9e0",
  // The caveat and the alt are NOT here. Both used to be typed, and both were false of the picture
  // beside them: the alt called the orange tier "nearby" when the International Civil Defence
  // Organisation — an orange marker — is by nearest-neighbour distance the most isolated marker on
  // this map, and both sentences named the World Economic Forum as the eastern outlier while the
  // declutter had dropped its label in BOTH layouts. They are now built in `describeSeparation`
  // below, from the coordinates, and the marker keys they name are passed as `mustLabel` so the
  // render throws rather than ship words the reader cannot check against the frame.
};
const PLATE_SIZE = 420; // the bake's own frame — see bake-plate.mjs's own header
// FROZEN BESIDE THE BEAT, for the same reason its csv is: a basemap living in `/tmp` cannot be
// committed, so the delivered html could not be reproduced or audited — and MapTiler restyles, so
// a re-bake months later is a different picture under the same markers. `ensurePlate` below bakes
// only when this folder is empty.
const DEFAULT_PLATE_DIR = join(HERE, "plate");
const DEFAULT_DATA_PATH = join(HERE, "geneva-orgs.csv");
// And the OUTPUT defaults beside the beat too — where `locator.html` is actually committed. It
// used to default to `/tmp/map-web-locator-twin`, so running this script the obvious way produced
// a fresh file nobody looks at, printed a path, exited zero, and left the committed one stale.
const DEFAULT_OUT_DIR = HERE;
const OUTPUT_NAME = "locator.html";
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
 * HOW FAR IN A READER MUST BE ABLE TO GO, derived from this beat's own coordinates — and this beat
 * is the reason the floor exists at all.
 *
 * `live-map.mjs`'s own `leash()` derives its headroom from "how much room the study set has left in
 * the frame", which is right for a reader looking at the whole claim and useless for the reader this
 * beat has. `AUDIT-W5-W6-map.md` §4.2: this page draws 3 labels for 11 organisations because the
 * closest pair — the International Labour Organization and the International Social Security
 * Association — is **13.3 m apart**, which at the bake's own 25.18 m per pixel is **0.53 px**. No
 * label rule separates two names that share a pixel; only a camera can. A reader who cannot pull
 * that pair apart has exactly the map the still already gave them, which is the one outcome ruling
 * R1 exists to forbid.
 *
 * So the floor is the zoom at which the closest pair's two PAINTED discs stop overlapping. A locator
 * marker is a pin (`radius: "fixed"` — it keeps its screen size as the reader zooms), so each
 * doubling of zoom doubles the distance between two centres while the discs stay put: the pair
 * separates once `separationAtBake × 2**h > 2r + stroke`. Every number in it is read off this beat's
 * own frozen coordinates, the bake's own recorded `metresPerPixel`, and the same two constants the
 * marker is actually drawn with — nothing is picked.
 *
 * It is a FLOOR added to the zoom the camera FITTED to at runtime, and the runtime fit is at or
 * above the bake's own zoom in every container this beat ships (the study set is a smaller box than
 * the plate's frame), so the delivered leash reaches further in than this number promises rather
 * than less far. Measured on the delivered page, not assumed — see this task's own report.
 */
export function separationHeadroom(points, metresPerPixel) {
  if (points.length < 2) return 0;
  let closestKm = Infinity;
  for (let i = 0; i < points.length; i++)
    for (let j = i + 1; j < points.length; j++)
      closestKm = Math.min(
        closestKm,
        greatCircleKm(points[i].lat, points[i].lon, points[j].lat, points[j].lon),
      );
  if (!(metresPerPixel > 0))
    throw new Error(
      "this plate records no metresPerPixel: re-bake it, or the leash has no ground scale to derive a separation from",
    );
  const separationAtBakePx = (closestKm * 1000) / metresPerPixel;
  const paintedDiameterPx = MARKER_RADIUS_PX * 2 + MARKER_STROKE_PX;
  return Math.max(
    0,
    Math.round(Math.log2(paintedDiameterPx / separationAtBakePx) * 1000) / 1000,
  );
}

/**
 * The plan the live layer reads out of the page: the style URL with its placeholder, the reader's
 * leash, and the markers as GeoJSON. Every camera number comes from the bake's own `geometry.json`
 * — `frameCorners` is the extent the camera ACTUALLY showed, which is not the bounds it was asked
 * for, and it has only been recorded since 2026-08-10.
 */
export function livePlan({ geometry, ground, waterFill }) {
  const corners = geometry.frameCorners;
  if (!corners || !(geometry.degreesPerPixel > 0))
    throw new Error(
      "this plate predates the camera facts: re-bake it, or the live map has neither bounds to be " +
        "constrained to nor a ground scale to draw its marks at",
    );
  const lons = geometry.points.map((p) => p.lon);
  const lats = geometry.points.map((p) => p.lat);
  // Where each `.pt` hit target and `.point-label` follows the camera to — EVERY ONE of the eleven,
  // keyed exactly as the markup's own `data-key`. This is the honest fix for "3 labels for 11
  // organisations": the picture cannot show eleven names at once, but a reader who zooms separates
  // them, and a name only follows its own marker if it has an anchor here.
  const anchors = {};
  for (const point of geometry.points) anchors[point.key] = [point.lon, point.lat];
  return {
    styleUrl: `https://api.maptiler.com/maps/${geometry.style}/style.json?key=${KEY_PLACEHOLDER}`,
    waterFill,
    frame: geometry.frame,
    // The bake's own ground-per-pixel. `live-map.mjs` derives the scale it places labels and hit
    // targets at from the RATIO of this to the live camera's own.
    degreesPerPixel: geometry.degreesPerPixel,
    metresPerPixel: geometry.metresPerPixel,
    // The camera the plate was baked at. Only a ground-area mark (dot density) interpolates its
    // radius from this; a pin does not.
    bakeZoom: geometry.zoom,
    // Constrained to the SUBJECT's area — the eleven organisations' own footprint, not the plate's
    // square box. The box the plate was baked in is not the box the reader's container has, and
    // handing MapLibre the plate's corners as a leash raised its minimum zoom until the claim
    // itself was cropped (the seed paid that once, in six of thirteen points).
    studyBounds: {
      west: Math.min(...lons),
      east: Math.max(...lons),
      south: Math.min(...lats),
      north: Math.max(...lats),
    },
    minZoomHeadroom: separationHeadroom(geometry.points, geometry.metresPerPixel),
    anchors,
    layers: [
      {
        id: "mw-marks",
        type: "circle",
        // Same order the fallback SVG draws in, so the two layers stack their markers identically.
        data: {
          type: "FeatureCollection",
          features: readingOrder(geometry.points).map((point) => ({
            type: "Feature",
            geometry: { type: "Point", coordinates: [point.lon, point.lat] },
            properties: {
              key: point.key,
              name: point.name,
              // The tooltip string, already formatted — `live-map.mjs` prefers the matching
              // `.pt[data-key]`'s own `data-detail`, and this is the same sentence from the same
              // function, so a beat cannot end up with two phrasings of one fact.
              detail: pointDetail(point),
              group: slugOf(point.category),
              // The mark's own colour travels on the feature rather than as a `match` expression
              // over category names, so the live circle and the SVG circle read the SAME
              // `CATEGORY_COLOUR` entry.
              fill: CATEGORY_COLOUR[point.category] ?? null,
              r: MARKER_RADIUS_PX,
            },
          })),
        },
        paint: {
          "circle-color": ["get", "fill"],
          "circle-stroke-color": ground,
          "circle-stroke-width": MARKER_STROKE_PX,
        },
        // A PIN, not a measurement: the same screen size at every zoom, exactly as the plate draws
        // it. A locator has no magnitude, so there is nothing for a camera-derived radius to encode.
        radius: "fixed",
        filterProperty: "group",
        hover: true,
      },
    ],
  };
}

/**
 * SSRs the map component ONCE — the fluid SVG plus its HTML overlay IS the one responsive render —
 * SSRs the table once beside it, wraps both in one self-contained HTML file and writes it to disk.
 */
/** What the collapsed disclosure's own summary calls its rows (B5.2). A beat's word, not a
 *  genre's — `discloseTable` refuses to invent one. */
const TABLE_ROW_NOUN = "organisations";

/**
 * RULING B5.2 (2026-08-10, the owner): *"Pour toutes les cartes on n'affiche pas le tableau de
 * valeurs qui se trouve en dessous, ou alors cache-les dans un accordéon, et pour tous."* The value
 * table is COLLAPSED by default on every map page, without exception.
 *
 * He offered two ways out and this genre takes the second, and the REASON matters more than the
 * choice — without it a later reader meets a collapsed table and "fixes" it back open. The table is
 * the map's own accessible alternative (`references/map-web-discipline.md`, "The accessibility
 * question"): a map is a spatial medium, a screen-reader user has no spatial access to it, and the
 * ordered list of readings is the only honest answer this genre found. Deleting it would trade a
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

async function renderMapWeb({
  component,
  caveat,
  table,
  props,
  outDir,
  name,
  live = false,
  plan = null,
}) {
  const furniture = deriveFurniture(props.ground);
  const mapHtml = renderToStaticMarkup(
    createElement(component, { ...props, ...furniture, measure: measureText }),
  );
  const caveatHtml = renderToStaticMarkup(
    createElement(caveat, { caveat: props.caveat }),
  );
  const tableHtml = discloseTable(
    renderToStaticMarkup(
      createElement(table, { points: props.geometry.points, ...furniture }),
    ),
    TABLE_ROW_NOUN,
  );

  const interactionSource = await readFile(join(HERE, "interaction.mjs"), "utf8");
  const inlineScript = inlineable(interactionSource);

  // maplibre-gl inlined rather than loaded from a CDN. A `<script src>` would trade ~800 KB of
  // payload for a SECOND third-party host; inlining keeps the count at one — api.maptiler.com —
  // which is the honest reading of R1. Keeping the fallback AND adding the library roughly doubles
  // the file, and that is the price of the ruling, stated rather than discovered.
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
${buildCss({ ...props, ...furniture })}
</style>
</head>
<body>
<div class="map-web-page">
${mapHtml}
<div class="mw-reading">
${caveatHtml}
${tableHtml}
</div>
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
 * Fails loud when two categories slug to the same string, or when one of them slugs to `all` — both
 * would silently break the filter rather than break the build. Every category's identity travels
 * through `slugOf` three times over (the radio's `id`, the `data-group` every marker/label/button/
 * row carries, and the `group` property `setFilter` reads), and `#mw-filter-all` is the reserved id
 * of the unfiltered option, so a study set with categories "All" and "all" would render a control
 * that quietly narrows to the wrong set. There is no correct silent behaviour here, so there is none.
 */
function assertDistinctSlugs(categories) {
  const seen = new Map();
  for (const category of categories) {
    const slug = slugOf(category);
    if (slug === "all")
      throw new Error(
        `the category ${JSON.stringify(category)} slugs to "all", the reserved id of the unfiltered option — rename it`,
      );
    if (!slug)
      throw new Error(
        `the category ${JSON.stringify(category)} slugs to an empty string — rename it`,
      );
    if (seen.has(slug))
      throw new Error(
        `the categories ${JSON.stringify(seen.get(slug))} and ${JSON.stringify(category)} both slug to ${JSON.stringify(slug)} — one filter would narrow to both`,
      );
    seen.set(slug, category);
  }
}

/**
 * The whole stylesheet, and the two things it is responsible for that nothing else can be.
 *
 * ONE: THE THREE LAYERS SHARE ONE BOX. `#mw-live-map`, `#mw-fallback` and `.mw-overlay` are all
 * absolutely positioned on the same inset, in that z-order, and the overlay is a SIBLING of the
 * other two rather than a child of either.
 *
 * TWO: THE BEAT FITS THE READER'S WINDOW (B5.1). Measured on the file this replaces, at 1600x900:
 * a 910 px page in a 900 px window; at 375x667, 1226 px in a 667 px one. The column below is exactly
 * one window tall, every piece of furniture takes the height it needs, `.mw-stage` is handed
 * whatever is left, and the eleven-row table gets a bounded pane of its own that scrolls when the
 * window is too short for it. The table itself is untouched — whether it should become something
 * more compact is B5.2 and it is the owner's decision, not this stylesheet's.
 */
function buildCss({ ground, ink, muted }) {
  assertDistinctSlugs(CATEGORY_ORDER);
  const filterRules = CATEGORY_ORDER.map((category) => {
    // The SLUG is what every marker, label, button and table row carries as `data-group`, and the
    // slug is what this selector quotes — the two used to differ in this genre's own seed, where an
    // HTML-escaped `&amp;` inside a CSS string matched no element, `:not(...)` therefore matched
    // every element, and one filter emptied the whole map. `slugOf` output is `[a-z0-9-]+` by
    // construction, so there is no escaping question left to get wrong.
    const id = `mw-filter-${slugOf(category)}`;
    const attr = slugOf(category);
    return [
      `.map-web-page:has(#${id}:checked) .pt:not([data-group="${attr}"]) { display: none; }`,
      `.map-web-page:has(#${id}:checked) .point-label:not([data-group="${attr}"]) { display: none; }`,
      // The decorative SVG marker too — otherwise a narrowed filter leaves every OTHER category's
      // marker sitting on the plate with no label and no hit target, an ambiguous ghost rather than
      // a genuinely narrower map.
      `.map-web-page:has(#${id}:checked) svg.map circle[data-group]:not([data-group="${attr}"]) { display: none; }`,
      `.map-web-page:has(#${id}:checked) .org-table tbody tr:not([data-group="${attr}"]) { display: none; }`,
    ].join("\n");
  }).join("\n");

  const allSwatch = CATEGORY_ORDER.map(
    (category, i) =>
      `${CATEGORY_COLOUR[category]} ${Math.round((i / CATEGORY_ORDER.length) * 100)}% ${Math.round(((i + 1) / CATEGORY_ORDER.length) * 100)}%`,
  ).join(", ");

  return `
:root {
  --ground: ${ground};
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
/* FIT THE WINDOW (B5.1). The whole beat is one window tall and never scrolls: the map column takes
   what is left after its own furniture, and the reading pane holding the eleven-row table is bounded
   and scrolls inside itself when the window is short. 'svh', not 'vh': on a phone with a retracting
   toolbar 'vh' is the LARGE viewport, which is exactly the height the beat must not assume it has.
   The 'vh' line above it is the fallback for a browser without 'svh', and errs one toolbar too tall
   rather than clipping. */
.map-web-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
  height: calc(100vh - var(--page-pad) * 2);
  height: calc(100svh - var(--page-pad) * 2);
  overflow: hidden;
}
.map-web {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
}
/* Only the stage gives up height. Measured, and not obvious: with 'min-height' instead of 'height'
   on a size container, its height stays INDEFINITE for container-query purposes and every 'cqh'
   inside resolves to zero — the map collapses to its own border and nothing is red. */
.map-web > *:not(.mw-stage) { flex: 0 0 auto; }
/* The reading pane: the caveat and the eleven-row table, bounded and SCROLLED rather than clipped.
   Both are the accessibility answer this type owes a reader with no spatial access to the map, so
   neither is ever hidden, behind a disclosure widget, or shortened — they are given a pane whose
   size the window decides. On a narrow window the cap is what keeps a map on the screen at all:
   this beat's own caveat is 155 px of prose at 375 px wide and its table is another 520, against a
   667 px window. A pane that scrolls is not the visual scrolling; the map never does. */
.mw-reading {
  flex: 0 1 auto;
  min-height: 0;
  max-height: 34svh;
  overflow: auto;
}
/* THE TABLE STAYS BELOW THE BEAT, AT EVERY WIDTH, and that is a decision this stylesheet is not
   allowed to take. A first draft made wide windows two columns — the map beside its table — because
   a square plate bounded by the leftover HEIGHT is a small map on a big screen. It was reverted on
   sight: whether the accessible table is rendered, and where, is B5.2, which is the owner's call and
   not an agent's. Measured, it also cost the thing it was meant to buy — the LIVE map is not square
   (the rule below drops the plate's aspect once the camera arrives, because a camera fills its
   container), so the side column took 26% of the window's width away from a map that would otherwise
   have used 98% of it. */
/* The two lines of furniture the window has least room for. Both are clamped rather than fixed, and
   that is a fit-the-window number rather than a taste one: at a fixed 21 px this beat's own title
   takes THREE lines of a 375 px window (72 px) and its source another three (45 px), which is 18% of
   the window spent before the map has any. The clamp gives back 29 px there and is inert at every
   width over ~640 px, where the fixed size was already right. */
.mw-title {
  font-size: clamp(16px, 1.4vw + 11.5px, 21px);
  font-weight: 700;
  margin: 0 0 4px;
}
.mw-source {
  font-size: clamp(11px, 0.5vw + 9.5px, 13px);
  color: var(--muted);
  margin: 0 0 12px;
}
/* THE LEGEND AND THE FILTER, drawn as one row of chips (see LocatorWeb.tsx's own note on why they
   are one control). Bare browser radios read as an unfinished form, not as an editorial control, and
   a 15px-tall label row is a poor pointer target besides. Every input below is still a real radio in
   a real fieldset: it is moved out of sight, never replaced, so Tab still reaches the group, Arrow
   keys still move within it, the native <label> association still makes the whole chip clickable,
   and none of it needs JavaScript. */
.mw-filter {
  border: 0;
  padding: 0;
  margin: 0 0 12px;
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
/* Narrow windows get a smaller chip, never a clipped one. A first draft kept the row on ONE line and
   scrolled it sideways, which is a standard phone control and reads in a screenshot as a category
   name cut off by the window edge — so it went. These chips WRAP: this beat's own longest category
   takes a row of its own at 375px and the row count is the price, paid out of the reading pane's own
   cap below rather than out of the map. */
@media (max-width: 560px) {
  .mw-chip {
    min-height: 27px;
    padding: 3px 9px;
    font-size: 11.5px;
  }
  .mw-chip-swatch { width: 9px; height: 9px; margin-right: 5px; }
  .mw-filter-options { gap: 4px; }
  .mw-filter { margin-bottom: 8px; }
  /* The pane gives up more of a short window than it does of a tall one, because at 375 the map is
     what is left after it and 34% would leave a strip. */
  .mw-reading { max-height: 30svh; }
}
.mw-chip {
  position: relative;
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 5px 12px;
  border: 1px solid var(--muted);
  border-radius: 999px;
  font-size: 13px;
  line-height: 1.2;
  color: var(--ink);
  background: var(--ground);
  cursor: pointer;
  white-space: nowrap;
}
/* The chip's own colour key — this is the legend, so it is drawn unconditionally and reads with
   JavaScript off, with ':has()' unsupported, and inside the filter it belongs to. */
.mw-chip-swatch {
  display: inline-block;
  width: 11px;
  height: 11px;
  margin-right: 7px;
  border-radius: 50%;
  border: 1px solid var(--muted);
  flex: 0 0 auto;
}
.mw-chip-swatch-all { background: linear-gradient(90deg, ${allSwatch}); }
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
/* The stage: the leftover height, and the container the map is measured against. 'container-type:
   size' is what lets the viewport below bound itself by the stage's HEIGHT as well as its width —
   CSS has no other way to say "as wide as you like, but never taller than the room left". */
.mw-stage {
  flex: 1 1 auto;
  container-type: size;
  min-height: 150px;
}
/* The viewport: the bake's own square aspect, exactly, at every size — bounded by the stage's width
   AND its height, whichever binds first. A plate stretched to fill a shape it was not baked for is a
   lie about distance and shape (geo-discipline.md), so it is not one of the outcomes here; a
   smaller, correct map is. The plain 'width: 100%' above the 'min()' is the fallback for a browser
   without container query units. */
.mw-viewport {
  position: relative;
  width: 100%;
  width: min(100cqw, 100cqh);
  max-width: 100%;
  /* Left-aligned, not centred: when the window's HEIGHT is what bounds the map, the leftover room is
     horizontal, and a centred map floats away from the title, the chips and the caveat, which are
     all flush left. */
  margin-inline: 0 auto;
  /* 'visible', not 'hidden'. The markers are already clipped to the frame by the SVG's own clipPath,
     so the only thing this would clip is a point NAME — which is data. Live, the rule below takes
     over and this becomes 'hidden', because a pannable box must clip. */
  overflow: visible;
  border: 1px solid var(--muted);
}
/* The two map layers occupy the SAME box, the live one underneath. It is laid out from the first
   frame rather than revealed later, because a container with no size is a map with no size: MapLibre
   reads the box at construction, and a display:none container gives it 0x0 and a canvas nothing ever
   paints into. Invisible-but-laid-out, then, and the swap is one flip of the fallback's own hidden
   attribute. */
.mw-fallback, .mw-live-map, .mw-overlay { position: absolute; inset: 0; width: 100%; height: 100%; }
.mw-live-map { z-index: 0; }
.mw-fallback { z-index: 1; background: var(--ground); }
.mw-fallback[hidden] { display: none; }
/* The overlay is a SIBLING of both map layers and is never hidden with either: it carries the point
   names and every Tab stop, so hiding it with the fallback would take the whole keyboard path away
   at the moment the live map arrives. Found by looking at the live page, not by an assertion. */
.mw-overlay { z-index: 2; pointer-events: none; }
.mw-overlay .pt { pointer-events: auto; }
/* Live, the canvas is what a pointer talks to: queryRenderedFeatures makes the hit area the RENDERED
   MARK at every size and every zoom. The buttons stay in the DOM, still Tab-reachable and still
   carrying their own aria-label — only their pointer-events go. */
html.mw-live .mw-overlay .pt { pointer-events: none; }
/* B5.1, and the conflict that dissolves with the ruling. The viewport keeps the PLATE's aspect,
   because scaling a raster non-uniformly is a lie about distance and shape. A LIVE map has no plate
   aspect to preserve — the canvas IS the container and the camera fills it — so live, the map takes
   the whole stage. The fallback keeps its aspect-ratio, unchanged, because it is still a plate. */
html.mw-live .mw-viewport { overflow: hidden; width: 100%; height: 100%; aspect-ratio: auto !important; }
.maplibregl-canvas-container canvas { outline: none; }
svg.map { display: block; width: 100%; height: 100%; }
/* Furniture, in HTML: font-size is a fixed CSS number on every rule below, so it never tracks the
   container's own width the way an SVG-embedded <text> inside a scaling viewBox would. The three
   numbers here — size, weight, padding — are the ones LocatorWeb.tsx MEASURES the label at when it
   decides which names have room, so they are read from that component rather than typed twice. */
.point-label {
  position: absolute;
  font-size: ${LABEL_FONT.fontSize}px;
  font-weight: ${LABEL_FONT.fontWeight};
  color: var(--ink);
  background: var(--ground);
  padding: ${LABEL_PAD_Y}px ${LABEL_PAD_X}px;
  border-radius: 2px;
  white-space: nowrap;
  pointer-events: none;
}
/* Set at build time by the deterministic declutter, and re-decided live by interaction.mjs against
   the boxes the browser actually measured, so a name with no room at the fitted view appears the
   moment the reader zooms its neighbour away. */
.point-label[hidden] { display: none; }
/* The interaction layer: a real <button>, a fixed CSS-pixel diameter derived from the marker itself
   (LocatorWeb.tsx's HIT_TARGET_PX) — a legitimate touch/pointer target at every width, which a
   12px pin is not. */
/* ONE SIZE, AND THE SECOND AXIS COMES FROM 'aspect-ratio', NEVER FROM A SECOND PERCENTAGE (B6.20).
   A percentage WIDTH resolves against the container's width and a percentage HEIGHT against its
   height, so the same fraction is two different numbers the moment the overlay stops being the
   plate's own square box — which is exactly what the live swap did. Measured on the committed
   symbol beat at 1600x900 (container 1566x591): the M9.1 button was 140.9 x 53.2 px, a wide flat
   grey ellipse painted behind a 60 px disc. 'aspect-ratio' is what makes the painted highlight a
   circle in SCREEN pixels at every container shape, in the live layer and in the fallback alike. */
.pt {
  position: absolute;
  width: ${HIT_TARGET_PX}px;
  aspect-ratio: 1;
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
.mw-caveat { font-size: 11.5px; line-height: 1.35; color: var(--muted); margin: 0 0 14px; }
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
/* The accessible table (LocatorWeb.tsx's OrgTable): a real, always-visible table, not a
   screen-reader-only trick. Styled plainly enough to read as a data table, not hidden or shrunk to
   decoration. */
.org-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}
.org-table caption {
  text-align: left;
  font-size: 12.5px;
  color: var(--muted);
  margin-bottom: 8px;
}
.org-table th, .org-table td {
  text-align: left;
  padding: 5px 16px 5px 0;
  border-bottom: 1px solid var(--muted);
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

// ── Which markers stand apart, measured rather than described ────────────────────────────────────
// A category is not a place: "other intergovernmental bodies in orange nearby" attached a distance
// claim to a COLOUR, and that tier contains this map's most isolated marker. Separation is derived
// here for every marker without a typed threshold — each marker's distance to its nearest
// neighbour, sorted, split at the single LARGEST gap in that sorted list (one-dimensional natural
// breaks). On this data the gap is 2.29 km wide (0.96 → 3.25), five times the next largest, and it
// puts exactly two markers on the far side.
const EARTH_KM = 6371;
const RAD = Math.PI / 180;
function greatCircleKm(aLat, aLon, bLat, bLon) {
  const dLat = (bLat - aLat) * RAD;
  const dLon = (bLon - aLon) * RAD;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aLat * RAD) * Math.cos(bLat * RAD) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.sqrt(h));
}

const COMPASS = [
  "north",
  "north-east",
  "east",
  "south-east",
  "south",
  "south-west",
  "west",
  "north-west",
];
/** The 8-point compass direction of `to` seen from `from` — read off the bearing, never typed. */
function headingFrom(from, to) {
  const bearing =
    (Math.atan2((to.lon - from.lon) * Math.cos(from.lat * RAD), to.lat - from.lat) / RAD + 360) %
    360;
  return COMPASS[Math.round(bearing / 45) % 8];
}

/**
 * The whole geometry of the words: the cluster, the organisation it is centred on, the markers that
 * stand outside it and how far and in which direction each one sits. Returns the caveat and the alt
 * built from those measurements, plus the keys the picture must therefore label.
 */
export function describeSeparation(orgs) {
  const nearest = orgs.map((o) => ({
    org: o,
    km: Math.min(
      ...orgs.filter((x) => x.key !== o.key).map((x) => greatCircleKm(o.lat, o.lon, x.lat, x.lon)),
    ),
  }));
  const byNearest = [...nearest].sort((a, b) => a.km - b.km);
  let splitAt = byNearest.length;
  let widestGap = -Infinity;
  for (let i = 1; i < byNearest.length; i++) {
    const gap = byNearest[i].km - byNearest[i - 1].km;
    if (gap > widestGap) {
      widestGap = gap;
      splitAt = i;
    }
  }
  const clustered = byNearest.slice(0, splitAt).map((x) => x.org);
  const apartRows = byNearest.slice(splitAt);
  if (apartRows.length === 0 || clustered.length === 0)
    throw new Error("the nearest-neighbour split produced an empty side — check the coordinates.");

  const centre = {
    lat: clustered.reduce((sum, o) => sum + o.lat, 0) / clustered.length,
    lon: clustered.reduce((sum, o) => sum + o.lon, 0) / clustered.length,
  };
  const clusterRadiusKm = Math.max(
    ...clustered.map((o) => greatCircleKm(centre.lat, centre.lon, o.lat, o.lon)),
  );
  // Which organisation the cluster is centred ON, rather than a landmark typed from memory …
  const anchor = clustered
    .map((o) => ({ o, km: greatCircleKm(centre.lat, centre.lon, o.lat, o.lon) }))
    .sort((a, b) => a.km - b.km)[0].o;
  // … and the spread measured FROM THAT ANCHOR, because a radius around the centroid is not a
  // radius around the organisation the sentence names.
  const anchorRadiusKm = Math.max(
    ...clustered.map((o) => greatCircleKm(anchor.lat, anchor.lon, o.lat, o.lon)),
  );

  const apart = apartRows
    .map(({ org, km }) => ({
      org,
      nearestKm: km,
      km: greatCircleKm(centre.lat, centre.lon, org.lat, org.lon),
      heading: headingFrom(centre, org),
    }))
    // East first, so the words run left-to-right across the frame the reader is looking at.
    .sort((a, b) => b.org.lon - a.org.lon);

  const categoryCount = (name) => orgs.filter((o) => o.category === name).length;
  const apartPhrase = (withCategory) => {
    const parts = apart.map(
      (a) =>
        `the ${a.org.name}${withCategory ? ` (${a.org.category.toLowerCase()})` : ""} ` +
        `${a.km.toFixed(1)} km ${a.heading}`,
    );
    return parts.length === 1
      ? parts[0]
      : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
  };

  // Number agreement follows the count, which follows the data — a mutation that moved one outlier
  // back into the cluster printed "1 stand apart … both labelled" until this was derived too.
  const lone = apart.length === 1;
  const labelledClause = lone
    ? "labelled on the map"
    : apart.length === 2
      ? "both labelled on the map"
      : "all labelled on the map";

  // The closest pair, in the words as well as in the leash — a reader who sees ten markers where
  // the title says eleven should be told why, and told what to do about it.
  const closest = closestPair(orgs);

  const caveat =
    "A locator marks position only — marker size does not encode a value. Coordinates are each " +
    `organisation's own Wikidata point, not a street address. ${clustered.length} of the ` +
    `${orgs.length} sit within ${clusterRadiusKm.toFixed(1)} km of their common centre; ` +
    `${apart.length} ${lone ? "stands" : "stand"} apart from that cluster: ${apartPhrase(false)}, ` +
    `${labelledClause}. The ${closest.a.name} and the ${closest.b.name} are ` +
    `${Math.round(closest.km * 1000)} m apart, so at the opening view they share one marker's ` +
    "worth of space: zoom in to separate them, and to read the names the frame has no room for.";
  const alt =
    `Map of central Geneva. ${orgs.length} markers, all the same size, show international ` +
    `organisations headquartered in the city, coloured by category: ${categoryCount("UN system")} ` +
    `UN system agencies in blue, ${categoryCount("Other intergovernmental")} other ` +
    `intergovernmental bodies in orange and ${categoryCount("Other international body")} other ` +
    `international bodies in green. Colour is not position: ${clustered.length} of the markers, ` +
    `from all three categories, sit together within ${anchorRadiusKm.toFixed(1)} km of the ` +
    `${anchor.name}, while ${apart.length} ${lone ? "stands" : "stand"} alone in the frame and ` +
    `${lone ? "is" : "are"} labelled beside ${lone ? "its own point" : "their own points"} — ` +
    `${apartPhrase(true)} of that cluster. Every organisation is named in the table below the map.`;

  return {
    caveat,
    alt,
    apart,
    clustered,
    anchor,
    widestGap,
    closest,
    clusterRadiusKm,
    anchorRadiusKm,
    mustLabel: apart.map((a) => a.org.key),
  };
}

/** The two organisations that sit closest together — the pair the opening view cannot separate, and
 *  the pair `separationHeadroom` derives the reader's own zoom range from. */
export function closestPair(orgs) {
  let best = null;
  for (let i = 0; i < orgs.length; i++)
    for (let j = i + 1; j < orgs.length; j++) {
      const km = greatCircleKm(orgs[i].lat, orgs[i].lon, orgs[j].lat, orgs[j].lon);
      if (!best || km < best.km) best = { a: orgs[i], b: orgs[j], km };
    }
  if (!best) throw new Error("a closest pair needs at least two organisations");
  return best;
}

/** Bakes the plate if it is not already at `plateDir`. */
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

/** This beat's own runner: bakes the plate if missing, reads the eleven orgs from the frozen csv,
 *  hands `LocatorWeb` and `OrgTable` to the genre's `renderMapWeb`. */
async function render({ dataPath, plateDir, outDir, name = OUTPUT_NAME }) {
  await ensurePlate(plateDir);
  const { geometry, plate } = await loadPlate(plateDir);

  const orgs = orgsFromCsv(await readFile(dataPath, "utf8"));
  if (orgs.length < 1) throw new Error(`need at least one organisation, got ${orgs.length}`);

  // The bake's own points already carry `px`/`py` keyed by `key`; `orgsFromCsv` is the source of
  // truth for name/category/priority — merge by key so `geometry.points` is the one shape both
  // the map and the table read from.
  const pxOf = new Map(geometry.points.map((p) => [p.key, { px: p.px, py: p.py }]));
  const merged = orgs.map((o) => {
    const proj = pxOf.get(o.key);
    if (!proj) throw new Error(`bake has no projected point for ${o.key} (${o.name})`);
    return { ...o, ...proj };
  });
  if (merged.length !== orgs.length)
    throw new Error(`merge dropped rows: ${orgs.length} orgs, ${merged.length} merged`);

  const separation = describeSeparation(orgs);
  console.log(
    `separation: widest gap in nearest-neighbour distance is ${separation.widestGap.toFixed(2)} km — ` +
      `${separation.clustered.length} clustered (within ${separation.clusterRadiusKm.toFixed(1)} km ` +
      `of their centre, anchored on ${separation.anchor.name}), ${separation.apart.length} apart:`,
  );
  for (const a of separation.apart)
    console.log(
      `  ${a.org.name} — ${a.km.toFixed(2)} km ${a.heading} of the cluster centre, ` +
        `nearest neighbour ${a.nearestKm.toFixed(2)} km, promoted to the front of the label priority.`,
    );

  // A beat that names an organisation in its furniture has declared it important, and the type's
  // own doctrine says a declared priority is the correct lever for importance. The promotion
  // travels on the geometry the component draws; the baked priorities on disk are left alone.
  const apartKeys = new Set(separation.mustLabel);
  const points = merged.map((p) => (apartKeys.has(p.key) ? { ...p, priority: -1 } : p));

  const plan = BEAT.live
    ? livePlan({
        geometry: { ...geometry, points },
        ground: BEAT.ground,
        waterFill: BEAT.waterFill,
      })
    : null;
  if (plan)
    console.log(
      `leash: the closest pair (${separation.closest.a.name} / ${separation.closest.b.name}) is ` +
        `${Math.round(separation.closest.km * 1000)} m apart — ` +
        `${((separation.closest.km * 1000) / geometry.metresPerPixel).toFixed(2)} px at the bake's own ` +
        `${geometry.metresPerPixel.toFixed(2)} m/px — so the reader gets at least ` +
        `${plan.minZoomHeadroom} zoom levels of headroom above whatever the camera fits to ` +
        `(bake zoom ${geometry.zoom}).`,
    );

  const { outPath } = await renderMapWeb({
    component: LocatorWeb,
    caveat: LocatorCaveat,
    table: OrgTable,
    props: {
      geometry: { ...geometry, points },
      plate,
      mustLabel: separation.mustLabel,
      title: BEAT.title,
      source: BEAT.source,
      basemapCredit: BEAT.basemapCredit,
      legendCaption: BEAT.legendCaption,
      caveat: separation.caveat,
      alt: separation.alt,
      ground: BEAT.ground,
      categoryColour: CATEGORY_COLOUR,
    },
    outDir,
    name,
    live: BEAT.live,
    plan,
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
  console.log(`locator-web beat → ${outPath}  [${points} points]`);
}

export {
  render,
  renderMapWeb,
  ensurePlate,
  loadPlate,
  BEAT,
  PLATE_SIZE,
  DEFAULT_PLATE_DIR,
  DEFAULT_DATA_PATH,
};
