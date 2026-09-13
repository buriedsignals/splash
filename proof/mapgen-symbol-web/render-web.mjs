// twin/proof/mapgen-symbol-web/render-web.mjs
//
// The WEB format of the proportional-symbol map: the same seventeen USGS events
// `proof/map-quake-symbol` ships as a still and as a video, turned into ONE self-contained HTML
// file — one fluid SVG carrying geometry only, one HTML overlay carrying every word and every
// control, the accessible table this beat opts into, one inlined interaction script, and no external
// request once the plate is inlined as a data URI.
//
// This is this beat's OWN copy of `map-web/scripts/render-web.mjs`'s machinery, adapted to this
// beat's component and its filter dimension. Nothing here imports out of a skill or across beats.
// `#shared/chart-beat/render-still.mjs` is the ONE module both `readPalette` and `deriveFurniture`
// come from: this beat used to carry a byte-identical COPY of that file beside itself and import
// `deriveFurniture` from the copy while importing `readPalette` from the canonical four lines
// later — two copies of one module in one file — and the copy imported a `./typefaces.mjs` sibling
// the Google-Fonts move added to the canonical and never copied into any beat, so
// `bun render-web.mjs` died with `Cannot find module './typefaces.mjs'` and this beat could not be
// rendered at all.
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
import { deriveFurniture, measureText, readPalette } from "#shared/chart-beat/render-still.mjs";
// THE TYPEFACE TRAVELS WITH THE PAGE, AS BYTES. This beat's CSS used to say
// `font-family: Helvetica, Arial, sans-serif` and load nothing: Helvetica is a licensed face that
// exists on the author's Mac and on no CI runner, no Android phone and no Linux desktop, so the
// delivered page was set in whatever each reader happened to have. The design base moved to Google
// Fonts (de112dff, b49a59b3) and the format's own `render-web.mjs` followed; this beat did not —
// `grep -c '@font-face'` on the committed page answered 0. `assertFontsEmbedded` now refuses a page
// that names a family it does not carry.
import {
  assertFontsEmbedded,
  displayableTextOf,
  dominantFontStack,
  embeddedWebFaces,
  fontFaceCss,
  fontRequestsInHtml,
} from "#shared/design-base/typefaces.mjs";
// THE DIRECTION, AND WHY A MAP BEAT NOW READS ONE. `rapport` sets its display register in a SERIF
// and its body in an italic serif; this page came out entirely in a hard-coded Helvetica stack, so
// one direction had two typographic voices depending on the format. `figureVars` emits
// `--title-family` and its siblings since the locator's pass (`shared/design-base/web.mjs`) and this
// beat's stylesheet simply did not read them. Nothing here names a family: each register comes off
// its own LADDER, chosen for the characters this beat actually sets.
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { figureVars, plainSpaces, webRegisters } from "#shared/design-base/web.mjs";
// THE TRUNK — the plan contract and the basemap's own two colours, reached through the `#shared/…`
// alias a beat is allowed to use. `plan.mjs`, `style.mjs` and `mount.mjs` are also INLINED into the
// delivered page (see `liveScript` below): the live layer runs the trunk's own source rather than
// the byte-identical copy of it this beat's `live-map.mjs` used to carry.
import { validateExpressions } from "#shared/map-beat/mount.mjs";
import { validateLivePlan } from "#shared/map-beat/plan.mjs";
import { assertNoDoubledBasemap } from "#shared/map-beat/style.mjs";
import {
  QuakeSymbolWeb,
  QuakeTable,
  SUBJECT_KEY,
  quakeDetail,
  MARK_STROKE_FRAME_UNITS,
  SUBJECT_FILL_OPACITY,
  MARK_FILL_OPACITY,
} from "./QuakeSymbolWeb.tsx";
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
  halfMagnitudeReferenceValues,
  MARK_MAX_RADIUS_FRACTION,
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

/**
 * THE LIVE LAYER IS THE TRUNK PLUS THIS BEAT'S OWN PAGE MECHANICS, in one classic script.
 *
 * `live-map.mjs` used to carry `cameraScale`, `groundRadiusExpression`, `planLayers`, its own mount
 * loop and a hand-written basemap sweep — one byte-identical copy per map × web beat, which is the
 * drift `references/map-plan.md` opens by naming. Those live in `shared/map-beat/` and are read FROM
 * THERE, resolved through the same subpath alias the imports above use.
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

// ===== CONFIG — this beat's own story =====
const BEAT = {
  source: "Source: USGS Earthquake Catalog (earthquake.usgs.gov), western Pacific",
  basemapCredit: "basemap © MapTiler, © OpenStreetMap",
  // The filed direction this beat is set in. A NAME, not a family: `directionFor` below resolves
  // each register down its own ladder against the characters this page actually sets, and refuses
  // rather than substitutes when no face on a ladder can set them.
  direction: "rapport",
};
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
export function livePlan({ geometry, subjectKey, accent, muted }) {
  const corners = geometry.frameCorners;
  if (!corners || !(geometry.degreesPerPixel > 0))
    throw new Error(
      "this plate predates the camera facts: re-bake it, or the live map has neither bounds to be " +
        "constrained to nor a ground scale to draw its marks at",
    );
  /** …AND WHAT IT WAS PAINTED IN. The plate used to record no tints and the live layer carried a
   *  hard-coded `#aac9e0` beside the bake's own hard-coded `#aac9e0`: two constants for one
   *  cartography, neither measured, both over the trunk's `BASEMAP_MAX`. */
  if (!geometry.tints?.water || !geometry.tints?.land)
    throw new Error(
      "this plate predates the MEASURED tints: re-bake it. Before `plateTints` reached this beat the " +
        "bake and the live layer each carried their own `#aac9e0`, which is 1.730:1 against a white " +
        "page — a basemap heavier than the circles drawn on it.",
    );
  const lons = geometry.points.map((p) => p.lon);
  const lats = geometry.points.map((p) => p.lat);
  const maxMag = Math.max(...geometry.points.map((p) => p.mag));
  // THE SAME radius scale the SVG draws from, through the SAME constant — `MARK_MAX_RADIUS_FRACTION`
  // now lives in `geo-symbol.ts` and the component, the bake and this file all import it. It used to
  // be a literal `0.045` here with a comment pointing at a second literal in the component, which is
  // exactly the "two numbers describing one circle" defect the live layer already paid for once.
  const radiusOf = radiusScale(maxMag, geometry.frame.width * MARK_MAX_RADIUS_FRACTION);
  const anchors = {};
  for (const point of geometry.points) anchors[point.key] = [point.lon, point.lat];
  const studyLonSpan = Math.max(...lons) - Math.min(...lons);
  return {
    styleUrl: `https://api.maptiler.com/maps/${geometry.style}/style.json?key=${KEY_PLACEHOLDER}`,
    styleName: geometry.style,
    // Recorded by the bake, carried here, painted by the trunk's one sweep — so the live map and the
    // plate under it are one cartography rather than two constants that agreed by habit.
    tints: geometry.tints,
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
              // THE OUTLINE, IN THE SAME FRAME UNITS AS THE RADIUS, and the SAME weight for every
              // mark — see `MARK_STROKE_FRAME_UNITS`'s own note for the measurement that forced
              // both halves of that. It was a flat `circle-stroke-width: 1`, an absolute pixel
              // length that does not follow the plate-to-drawn-size reduction the radius does.
              // `applyMarkScale` multiplies this by the mark scale, so the live outline and the
              // fallback's are one number at two sizes.
              sw: geometry.frame.width * MARK_STROKE_FRAME_UNITS,
            },
          })),
        },
        paint: {
          "circle-color": ["case", ["get", "subject"], accent, muted],
          "circle-opacity": ["case", ["get", "subject"], SUBJECT_FILL_OPACITY, MARK_FILL_OPACITY],
          "circle-stroke-color": ["case", ["get", "subject"], accent, muted],
          // A placeholder until the camera has actually been fitted — `applyMarkScale` on `load` is
          // what sets the real number, exactly as it does for `circle-radius`. Written as the
          // unscaled frame-unit value rather than as a constant, so even the one frame before the
          // fit is this beat's own outline rather than somebody's 1.
          "circle-stroke-width": ["get", "sw"],
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

/**
 * THE BEAT'S OWN DIRECTION, RESOLVED TO FACES THAT CAN SET ITS OWN WORDS.
 *
 * `resolveDirectionFamilies` walks each register's LADDER and takes the first family whose cmap
 * covers the text that register will actually set on this page — so the serif here is whatever
 * covers this title, these seventeen place names and this caveat, not something typed. A register
 * whose text no family on its ladder can set REFUSES rather than substitutes, which is the whole
 * reason the ladder exists.
 *
 * Every string passes through `plainSpaces` first: one U+202F or U+00A0 refuses every family and
 * takes the render down with a message naming a code point rather than a word.
 */
function directionFor(props) {
  const path = fileURLToPath(import.meta.resolve(`#shared/design-base/directions/${BEAT.direction}.md`));
  const filed = readDirection(path);
  // A direction records the ground it was measured against; `PALETTE.md` records the ground this
  // beat draws on. Two grounds are two furniture ladders, and `deriveFurniture` only ever sees one
  // of them — so they are compared rather than assumed to agree.
  if (filed.ground.toUpperCase() !== String(props.ground).toUpperCase())
    throw new Error(
      `direction "${BEAT.direction}" is filed on ground ${filed.ground} and this beat's PALETTE.md ` +
        `records ${props.ground}. A direction's registers are measured against its own ground; ` +
        `pick the direction that matches the recorded palette, or re-record the palette.`,
    );
  const points = props.geometry.points;
  const places = points.map((p) => p.place).join(" ");
  const details = points.map((p) => quakeDetail(p)).join(" ");
  const arcs = groupsOf(points).join(" ");
  const magnitudes = points.map((p) => `M${en(p.mag)}`).join(" ");
  const textPerRegister = {
    display: props.title,
    // The one tracked, uppercased run on this page: the filter fieldset's own legend.
    eyebrow: FILTER_LEGEND,
    body: `${props.caveat} ${props.source} ${props.basemapCredit} ${props.legendCaption} ${props.subjectNote}`,
    // The legend's reference values and the table's magnitude column — numbers read off a scale.
    axis: `${magnitudes} ${LEGEND_REFERENCE_TEXT(points)}`,
    annot: `${magnitudes} ${arcs}`,
    value: `${places} ${details} ${arcs}`,
  };
  for (const key of Object.keys(textPerRegister)) textPerRegister[key] = plainSpaces(textPerRegister[key]);
  return resolveDirectionFamilies(filed, textPerRegister);
}

/** The filter fieldset's own legend, in ONE place: the markup draws it and `directionFor` resolves
 *  the eyebrow register against it, so the face that sets it is chosen for the characters it sets. */
const FILTER_LEGEND = "Filter by arc";

/** Every string the legend's reference circles are labelled with, from the same function the
 *  component labels them with — so the register resolved against them is resolved against what the
 *  page prints, not against a guess at it. */
const LEGEND_REFERENCE_TEXT = (points) =>
  halfMagnitudeReferenceValues(Math.max(...points.map((p) => p.mag)))
    .map((v) => `M${en(v)}`)
    .join(" ");

async function renderMapWeb({ component, table, props, outDir, name, regionTable = false, live = false, plan = null }) {
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
    `direction ${direction.name} (${BEAT.direction}) — ` +
      direction.decisions.map((d) => `${d.register}:${d.family}`).join(", "),
  );
  const mapHtml = renderToStaticMarkup(createElement(component, { ...props, ...furniture, filterLegend: FILTER_LEGEND }));
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
      `<script>\n${await liveScript()}\n</script>`
    : "";

  const groups = groupsOf(props.geometry.points);
  assertDistinctSlugs(groups);

  // THE PAGE'S OWN FAMILY, READ OFF WHAT THE COMPONENTS ACTUALLY ASKED FOR rather than typed into
  // the stylesheet. `dominantFontStack` reads the markup; `embeddedWebFaces` fetches and SUBSETS
  // each face to the characters this page can display; `assertFontsEmbedded` refuses a page naming a
  // family it does not carry. The document is assembled twice from one template — once to be read
  // for its font requests and its displayable text, once to be written with the faces in it.
  const stack = dominantFontStack(mapHtml + tableHtml);
  /** HOW WIDE THE PROSE UNDER THE LEGEND MAY SET, measured rather than typed.
   *
   *  The reading column beside the map takes whatever the map's square aspect leaves, which at
   *  1920x1080 is over 800px. 800px of 11.5px type is about 145 characters a line, roughly twice any
   *  measure. `rapport.md` records its own reference's text column: **78 characters**. This measures
   *  78 characters OF THIS BEAT'S OWN CAVEAT, in the face and at the size the page actually sets it
   *  — the string's own width divided by its own length — so the cap follows the direction's face
   *  rather than a per-character constant somebody averaged once. */
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
    groups,
    frame: props.geometry.frame,
    fontStack: stack,
    vars,
    proseWidthPx,
    legendSwatches: legendSwatchRules(props.geometry),
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
 *  module is reached by, so the module can also sit as a plain classic `<script>` — no bundler, no
 *  `type="module"`.
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
/**
 * THE LEGEND'S CIRCLES ARE THE MAP'S CIRCLES, AT THE SIZE THE MAP DRAWS THEM — the rule, written
 * once here and read by CSS, and re-read by `live-map.mjs` when the camera is what sizes a mark.
 *
 * THE DEFECT. The legend's radius scale and the map's were the same FUNCTION (`radiusScale`, √value)
 * pointed at two different maxima: the map's largest circle is `MARK_MAX_RADIUS_FRACTION` of the
 * plate's frame, scaled with the container; the legend's was a flat `LEGEND_MAX_RADIUS_PX = 16`,
 * fixed in CSS pixels "because a legend is a fixed schematic scale". Measured on the committed page:
 * the M9.0 swatch is **31.8px across at every window**, while the map's M9.1 disc is **41.3px at
 * 1024x768, 53.4px at 1600x900 on the plate and 56.5px on the live layer** — a mismatch of 1.30x to
 * 1.78x that CHANGES WITH THE WINDOW. A size legend a reader cannot hold against the map is not a
 * legend; on a beat whose entire claim is a comparison of areas it is the one piece of furniture
 * that has to be a ruler.
 *
 * The RATIOS between the three reference circles were right the whole time, which is why nothing
 * looked broken and why the beat's own BRIEF could say "the three reference circles are visibly
 * almost the same size — that is the argument". It still is. What is fixed is the absolute size.
 *
 * The swatch is emitted as a fraction of `--map-w`, the map's own drawn width, which `buildCss`
 * defines once and both branches of the layout override. Nothing here is a second scale: the radius
 * comes from the beat's own `radiusScale` over its own `MARK_MAX_RADIUS_FRACTION`, in frame units,
 * divided by the frame — the same number `livePlan` puts on the circle layer's features.
 */
function legendSwatchRules(geometry) {
  const maxMag = Math.max(...geometry.points.map((p) => p.mag));
  const radiusOf = radiusScale(maxMag, geometry.frame.width * MARK_MAX_RADIUS_FRACTION);
  return halfMagnitudeReferenceValues(maxMag)
    .map((v) => {
      const fraction = (radiusOf(v) * 2) / geometry.frame.width;
      return (
        `.mw-legend-swatch[data-value="${v}"] { width: calc(var(--map-w) * ${fraction.toFixed(6)}); }`
      );
    })
    .join("\n");
}

function buildCss({ ground, accent, ink, muted, groups, frame, fontStack, vars, proseWidthPx, legendSwatches }) {
  if (!fontStack)
    throw new Error(
      "buildCss was given no font stack. The family a page is set in is a decision, and a default " +
        "here is how this beat came to ship set in a licensed Helvetica it never loaded.",
    );
  const aspect = frame.width / frame.height;
  /** The mark's fill opacity as the alpha byte of an 8-digit hex, because the swatch's fill and its
   *  outline are two different opacities and a CSS `opacity` on the box would fade both. Derived
   *  from the component's own constant, never typed a second time. */
  const markFillAlphaHex = Math.round(MARK_FILL_OPACITY * 255)
    .toString(16)
    .padStart(2, "0");
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
  /* The reading column's own floor, and the width the map's box subtracts. One number, two readers. */
  --reading-w: 300px;
  --body-gap: 20px;
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
/* Only the reading row gives up height. Measured, and not obvious: with 'min-height' here instead
   of 'height', the stage's height stays INDEFINITE for container-query purposes and every 'cqh'
   inside it resolves to zero — the map collapses to its border and nothing goes red. */
.map-web > *:not(.mw-body) { flex: 0 0 auto; }
/* THE MAP AND ITS READING, SIDE BY SIDE — and the reason is a measurement about this SUBJECT.
   The locator on this branch answered 'the map does not fill the page' by baking a landscape plate
   at the stage's own median aspect. That is right for a city, which has no aspect of its own. It is
   wrong here, for the same reason it was wrong for the choropleth: the Mercator extent of the
   seventeen epicentres this map draws measures 1.0601 to 1, so a landscape bake would add nothing
   but Pacific.
   Stacked, the legend, the subject note and the caveat sat BELOW the map and ate the very height
   that made the stage short: measured on the committed page, the fallback plate filled 38-46% of
   the stage's width at five of the six desktop shapes (1024x768 46%, 1280x800 40%, 1280x1200 72%,
   1440x900 42%, 1600x900 38%, 1920x1080 42%).
   And the LIVE camera paid for it twice over, which is this type's own version of the defect: the
   camera is fitted to the study set at runtime, so a 1568x593 stage fits 59 degrees of latitude into
   593px and then opens about 150 degrees of longitude across the width — half the live map at
   1600x900 was India and Central Asia, carrying no mark at all. Put the reading in that room
   instead and the stage comes back to the subject's own near-square shape. */
.mw-body {
  display: flex;
  flex: 1 1 auto;
  gap: var(--body-gap);
  min-height: 0;
  /* A SIZE CONTAINER, so the legend below can be sized against the MAP's own drawn width rather
     than against a constant. '--map-w' is that width, stated once: the map is bounded by the room
     the reading column leaves and by the row's height through the plate's aspect, whichever binds
     first, which is exactly what '.mw-stage' resolves to. */
  container-type: size;
  --map-w: min(calc(100cqw - var(--reading-w) - var(--body-gap)), calc(100cqh * ${aspect}));
}
/* FAMILY AND WEIGHT FROM THE DIRECTION'S DISPLAY REGISTER, size from this beat. The weight used to
   be a typed 700 that happened to equal this direction's; the family had no route here at all. */
.mw-title {
  font-size: 21px;
  font-family: var(--title-family);
  font-weight: var(--title-weight);
  margin: 0 0 4px;
}
/* The BODY register — including its slope. This direction files an italic body, and a direction
   whose prose is italic says so in every format or it is not one direction. */
.mw-source {
  font-size: 13px;
  font-family: var(--source-family);
  font-style: var(--subtitle-style);
  color: var(--muted);
  margin: 0 0 12px;
}
.mw-filter { border: 0; padding: 0; margin: 0 0 14px; min-width: 0; }
.mw-filter legend {
  padding: 0;
  margin: 0 0 6px;
  font-size: 11px;
  font-family: var(--eyebrow-family);
  font-weight: var(--eyebrow-weight);
  letter-spacing: var(--eyebrow-tracking);
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
   no other way to say "as wide as you like, never taller than the room left".
   It takes the row's HEIGHT and derives its width from the plate's own aspect, so the map is as
   large as the window allows and the row has no slack inside it to give away. 'flex: 0 1 auto' — it
   never grows past its aspect, and it yields first when the reading column reaches its floor. */
.mw-stage {
  flex: 0 1 auto;
  height: 100%;
  aspect-ratio: ${frame.width} / ${frame.height};
  container-type: size;
  min-height: 180px;
}
/* The reading column: everything that reads the map — the reference circles, the subject's own
   line and the caveat. It takes what the map's aspect leaves, down to the floor above; under that a
   row of three reference circles and their labels stops fitting on one line, which is the one
   comparison this legend exists to make. 'flex-shrink: 0' is the half that matters: with the
   default 1, a tall window hands the column a fraction of its floor. */
.mw-reading {
  flex: 1 0 var(--reading-w);
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}
/* …AND WHEN THE ROOM THE WINDOW LEAVES IS VERTICAL, THE READING GOES BACK UNDERNEATH.
   The row exists because a near-square map in a wide, short window leaves its room beside it. A
   window taller than it is wide leaves the room below, and forcing the row there costs the map more
   than the column gains. The condition is the window's own aspect, which is exactly the thing being
   reasoned about. '--map-w' is restated for the branch: stacked, the map takes the body's width
   unless the height left binds first. */
@media (max-aspect-ratio: 1 / 1) {
  .mw-body { flex-direction: column; --map-w: 100cqw; }
  .mw-stage { flex: 1 1 auto; height: auto; width: 100%; aspect-ratio: auto; }
  .mw-reading { flex: 0 0 auto; overflow-y: visible; }
  .mw-legend { margin-top: 14px; }
}
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
  font-family: var(--label-family);
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
.mw-legend { margin: 0 0 4px; }
.mw-legend-caption {
  font-size: 12.5px;
  font-family: var(--note-family);
  font-weight: 600;
  color: var(--muted);
  margin: 0 0 8px;
  max-width: ${proseWidthPx}px;
}
.mw-legend-marks { display: flex; align-items: flex-end; gap: 16px; flex-wrap: wrap; }
.mw-legend-item { display: flex; flex-direction: column; align-items: center; gap: 4px; }
/* THE SWATCH IS THE MAP'S OWN CIRCLE, AT THE MAP'S OWN SIZE — see 'legendSwatchRules'. The width is
   a fraction of '--map-w' (the map's drawn width) rather than a fixed pixel count, and the height
   comes from 'aspect-ratio', never from a second percentage: one number describes one circle.
   Live, 'live-map.mjs' sets both axes in pixels from the camera scale the marks are actually drawn
   at, because a live map's circles are sized by the camera and not by the container.
   FILL AND OUTLINE ARE THE MARK'S TOO. A hollow ring reads as a schematic swatch at 16px and as a
   DIFFERENT OBJECT beside a filled disc at 54px, which is the size these are now drawn at — so the
   fill is the same muted at the same opacity the map paints, and the outline is the same frame-unit
   weight, which makes it track the map's own stroke instead of staying a flat pixel. */
.mw-legend-swatch {
  display: block;
  aspect-ratio: 1;
  border-radius: 50%;
  background: ${muted}${markFillAlphaHex};
  border: max(1px, calc(var(--map-w) * ${MARK_STROKE_FRAME_UNITS})) solid var(--muted);
}
${legendSwatches}
.mw-legend-value { font-size: 12px; font-family: var(--axis-family); color: var(--muted); }
.mw-subject {
  font-size: 12px;
  font-family: var(--label-family);
  font-weight: 700;
  color: var(--accent);
  margin: 12px 0 4px;
  max-width: ${proseWidthPx}px;
}
.mw-caveat {
  font-size: 11.5px;
  font-family: var(--source-family);
  font-style: var(--subtitle-style);
  color: var(--muted);
  margin: 0 0 12px;
  max-width: ${proseWidthPx}px;
}
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

/** The trunk's three refusals, run over the plan this render is about to serialise into the page.
 *  Returns the plan so the call reads as one expression and there is no second variable for the
 *  checked plan and the written one to come apart in. */
function assertPlanIsRenderable(plan) {
  // `assertNoDoubledBasemap` THROWS rather than returning a list — it is a refusal, not a survey —
  // so it is called for its own error rather than spread into the complaints below.
  assertNoDoubledBasemap(plan);
  const complaints = [...validateLivePlan(plan), ...validateExpressions(plan)];
  if (complaints.length)
    throw new Error("this beat's live plan is not renderable:\n  - " + complaints.join("\n  - "));
  return plan;
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
    // THE PLAN IS CHECKED WHERE IT IS WRITTEN *AND* WHERE IT IS READ. `live-map.mjs` validates it
    // again in the reader's browser, and that is not redundancy: a plan that only fails there is a
    // defect that has already shipped. These three ask the questions MapLibre answers with silence —
    // a duplicate layer id, a missing camera fact, a pair property assembled from two expressions,
    // a layer that would draw a second basemap over the provider's.
    plan: assertPlanIsRenderable(livePlan({
      geometry: { ...geometry, points },
      subjectKey: SUBJECT_KEY,
      accent: palette.accent,
      muted: deriveFurniture(palette.ground).muted,
    })),
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

export { render, renderMapWeb, ensurePlate, loadPlate, BEAT, PLATE_SIZE, DEFAULT_PLATE_DIR, DEFAULT_DATA_PATH };
