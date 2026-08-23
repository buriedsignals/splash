// twin/skills/map-web/scripts/render-web.mjs
//
// The map format's own third rung, the same role `chart-web/scripts/render-web.mjs` plays for
// charts: rung one and two of a map beat are the still and the video
// (`map-beat/scripts/render-map.mjs`); this turns the SAME baked plate into one self-contained
// HTML file — one fluid SVG (geometry only) plus its full HTML overlay (furniture, controls), the
// accessible region table this format carries by default (`regionTable`, opt-OUT per beat), one inlined
// interaction script, no external request once the plate is inlined as a data URI. The beat it
// writes fits the reader's window: see `buildCss`'s own "FIT THE WINDOW" note.
//
// It runs in node, which is why it derives the furniture colours: `deriveFurniture` lives beside a
// native rasteriser in this skill's OWN `./render-still.mjs` (a byte-identical copy of
// `chart-beat`'s — a skill never imports another skill, so nothing under a skill may import
// out of it; `splash/test/no-cross-skill-imports.test.ts` fails loud on any specifier that
// does).
//
// `renderMapWeb` below is the format's own machinery and knows nothing of any one story: it takes
// the component, the accessible-table component and the props to call the first with, as
// arguments — never reaches for one story's own constants by name. Everything under it (the
// CONFIG block, `ensurePlate`, `render`, the CLI block) is the runner for THIS SKILL'S OWN SEED —
// `assets/MapWebSeed.tsx`, drawn from `assets/sample-data/regions.json` — the same "the skill's
// script hosts its own worked values behind a labelled seam" shape `chart-web`'s own
// `render-web.mjs` uses.
//
// Usage:  bun skills/map-web/scripts/render-web.mjs [outDir] [--data <json>]

import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { deriveFurniture, readPalette } from "./render-still.mjs";
import {
  READING_WIDTHS,
  plateIsBoundByHeight,
  drawnRegionsOf,
  drawnWidthAt,
  marksStrandedWithNoChannel,
  strandedRefusal,
  strandedVerdict,
} from "./detect-stranded-marks.mjs";
import { worldCopiesFor } from "./delivery-frame.mjs";
import { MapWebSeed, RegionTable } from "../assets/MapWebSeed.tsx";
import { groupsOf, markLayers, maxZoomForStudySet, radiusScale, slugOf } from "../assets/geo-symbol.ts";

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
// `inlineable`, `escapeHtml`, `assertDistinctSlugs`, `buildCss` — is this format's own mechanics and
// is left alone.
// The colours are the one part of `SEED` that is not words: READ back from this skill's own
// `PALETTE.md`, exactly as a beat reads its story's answer.
const SEED_PALETTE = readPalette(join(HERE, "..", "assets"), { stopAt: join(HERE, "..") });
const SEED = {
  ground: SEED_PALETTE.ground,
  accent: SEED_PALETTE.accent,
  title: "A sample of major European metro-area populations",
  source: "Sample data — not a real measurement",
  // The seed's own words are English throughout — see `assertRecordedLanguage`, below.
  language: "en",
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
  // The accessible region table: ON by default, the same way `chart-web`'s own accessible table is
  // baked into every page unconditionally — `same-facts-without-the-picture` in the catalogue says
  // this format CARRIES the capability, and a capability that ships off unless a beat's author
  // remembers to turn it on is not carried, it is hoped for. What leaving it off costs a reader with
  // no spatial access to the map is stated plainly in references/map-web-discipline.md, "The
  // accessibility question" — read it before setting this false in a beat of your own.
  regionTable: true,
  // What the collapsed disclosure's own summary calls its rows (B5.2). It is a beat's word, not a
  // format's: "metro areas" here, "countries" on a choropleth, "cells" on a hex grid. `discloseTable`
  // refuses to invent one.
  tableRowNoun: "metro areas",
};
// Baked generously so the plate stays at or near native resolution across the tested width range
// (375–1600px, minus the page's own 16px body padding on each side) rather than a narrow max-width
// that would leave gutters beside a full-bleed beat — see references/map-web-discipline.md, "Full
// width, genuinely", for the exact numbers this trades off.
const PLATE_SIZE = 1000;
// THE RANGE OF BOX SHAPES THIS BEAT IS DELIVERED INTO, MEASURED ON ITS OWN RENDERED PAGE — the
// second input the bake now needs (`delivery-frame.mjs`). It is a property of THIS beat's furniture,
// not of the format: the box is `.mw-stage`, the window minus this page's own title, source line,
// legend, caveat and table, so a beat with a longer caveat delivers into a shallower box. Read back
// with `bun skills/map-web/scripts/verify-fills-the-box.mjs <page.html>`, which also refuses a page
// whose real range has escaped the range its plate was baked for.
//
// The seed's own readings, `.mw-stage` width/height at the three widths this format drives:
//   1600x900  1568x585  2.680     1280x800  1248x485  2.573     375x812  343x420  0.817
const PLATE_BOX_ASPECTS = "0.817,2.680";
// The room this seed's own labels need inside the crop, as a fraction of the box on each side —
// measured by the runs the page actually cut: at 375x812 the whole plate is not visible, and
// "Athens" ran 25.4px past the frame. `verify-fills-the-box.mjs` prints this number.
const PLATE_CLEARANCE = "0.074,0";
// The seed's own frozen plate keeps preview, interaction and installation checks offline. Story
// beats pass their own plate directory and still bake through `bake-plate.mjs` when it is absent.
const DEFAULT_PLATE_DIR = join(HERE, "..", "assets", "sample-data", "plate");
const DEFAULT_DATA_PATH = join(HERE, "../assets/sample-data/regions.json");
// The seed's own rendered beat lands in this skill's `output-proof/`, beside the preview it already
// ships, and is COMMITTED — carrying the placeholder, never a key (R1b).
//
// It used to default to `/tmp/map-web-twin`, and that is the defect this line closes rather than a
// tidying: with no live page anywhere in the repository, the one guard that drives the live layer
// (`test/live-map.test.ts`) was gated on `/tmp/mw-live/population.html` — a path NO script in this
// tree produces. It existed on one machine because somebody rendered it by hand. On a fresh clone
// the guard printed "live map not driven" and passed, so the whole live layer could be deleted in
// silence. A guard has to point at a file the repository itself makes.
const DEFAULT_OUT_DIR = join(HERE, "..", "output-proof");
const OUTPUT_NAME = "population.html";
// =========================================

/**
 * SSRs the map component ONCE (no per-layout duplication — the fluid SVG plus its HTML overlay IS
 * the one responsive render, see `MapWebSeed.tsx`'s own header note), SSRs `table` when — and only
 * when — the beat asked for it, wraps the result in one self-contained HTML file and writes it to
 * disk. Generic across every map-web beat: it does not know a story's own point count or its own
 * filter groups.
 *
 * `regionTable` (default TRUE) is the accessible region table's own switch. It ships ON by
 * default — `same-facts-without-the-picture` in the catalogue says this format CARRIES the
 * capability, and a default that ships it off is a capability a beat's author has to remember to
 * turn on, which is the exact failure this mechanism exists to abolish. `references/
 * map-web-discipline.md`'s "The accessibility question" states in full what a reader with no
 * spatial access to the map loses when a beat opts OUT — a beat making that choice should have
 * read it.
 */
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
 * The plan the live layer reads out of the page: the style URL with its placeholder, the reader's
 * leash, and the marks as GeoJSON. Every camera number comes from the bake's own `geometry.json`
 * — `frameCorners` is the extent the camera ACTUALLY showed, which is not the bounds it was asked
 * for, and it has only been recorded since 2026-08-10. This function is why that task came first.
 */
/** The sea this beat's plate was baked with, out of the plate's own record.
 *
 *  A plate baked before that record existed has no `water`, and this REFUSES rather than falling
 *  back to a literal: a live layer painting a sea the fallback plate does not carry is the defect
 *  this reading exists to close, and a silent default is how it came back the first time. Re-bake. */
export function waterFillOf(geometry) {
  const fill = geometry?.water?.fill;
  if (typeof fill !== "string" || !/^#[0-9a-fA-F]{6}$/.test(fill))
    throw new Error(
      "this plate's geometry.json records no water fill, so the live layer has no sea to paint that " +
        "the fallback plate underneath it also carries. Re-bake with bake-plate.mjs, which derives " +
        "the tint from this beat's own PALETTE.md and writes it into the plate's own record.",
    );
  return fill;
}

export function livePlan({ geometry, subjectKey, accent, muted, waterFill }) {
  const corners = geometry.frameCorners;
  if (!corners || !(geometry.degreesPerPixel > 0))
    throw new Error(
      "this plate predates the camera facts: re-bake it, or the live map has neither bounds to be " +
        "constrained to nor a ground scale to draw its marks at",
    );
  const lons = geometry.points.map((p) => p.lon);
  const lats = geometry.points.map((p) => p.lat);
  const studyLonSpan = Math.max(...lons) - Math.min(...lons);
  const maxValue = Math.max(...geometry.points.map((p) => p.value));
  const marks = markLayers(geometry.points, {
    maxValue,
    maxRadiusFrameUnits: (geometry.studySet?.width ?? geometry.frame.width) * 0.062,
    subjectKey,
    accent,
    muted,
  });
  const anchors = {};
  for (const point of geometry.points) anchors[point.key] = [point.lon, point.lat];
  return {
    styleUrl: `https://api.maptiler.com/maps/${geometry.style}/style.json?key=${KEY_PLACEHOLDER}`,
    waterFill,
    frame: geometry.frame,
    // The bake's own ground-per-pixel. The live map derives every mark's drawn radius from the
    // RATIO of this to its own, so a symbol covers the same piece of the world it covered on the
    // plate whatever shape the reader's container is. Recorded by the bake only since the camera
    // facts landed — before that there was nothing here to derive from, which is how the first live
    // draft came to size its marks against the plate's box instead.
    degreesPerPixel: geometry.degreesPerPixel,
    metresPerPixel: geometry.metresPerPixel,
    // The camera the plate was baked at. A layer whose marks stand for a fixed piece of GROUND
    // (dot density) interpolates its radius from this; a proportional symbol does not use it.
    bakeZoom: geometry.zoom,
    studyBounds: {
      west: Math.min(...lons),
      east: Math.max(...lons),
      south: Math.min(...lats),
      north: Math.max(...lats),
    },
    // HOW FAR IN THE READER MAY GO, AT MINIMUM, whatever the container's shape does to the fit.
    //
    // `leash()` bounds a reader at the zoom where the study set stops filling the frame, which is
    // right for someone looking at the whole claim and useless for someone trying to pull two
    // overlapping marks apart. Measured on `proof/mapgen-symbol-web` before this floor existed:
    // 1.58 zoom levels at 1600x900 and **0.33 at 768x1024** — a factor of 1.26, which is not a map
    // you can move through, and moving through the map is the whole of ruling R1.
    //
    // TWO derivations, and the larger wins, because they answer two different readers:
    //  - the headroom this plate's own frame held over its study set — how much room the beat was
    //    designed with;
    //  - the zoom at which the closest OVERLAPPING pair of marks separates — how much room this
    //    beat's own data demands before a reader can tell two marks apart.
    // Both are read off the beat's own frozen data. Neither is picked.
    minZoomHeadroom: Math.max(
      0,
      maxZoomForStudySet(geometry.zoom, Math.abs(corners.east - corners.west), studyLonSpan) -
        geometry.zoom,
      separationHeadroom(geometry.points, radiusScale(maxValue, (geometry.studySet?.width ?? geometry.frame.width) * 0.062)),
    ),
    // Where each `.pt` hit target and `.point-label` follows the camera to. Keyed exactly as the
    // markup's own `data-key`, so the live label and the fallback label are one placement seen at
    // two sizes rather than two placements that can drift.
    anchors,
    layers: [
      {
        id: "mw-marks",
        type: "circle",
        data: marks.source,
        paint: marks.paint,
        // A circle encodes a VALUE, so it is sized from the camera once at the fit and then held —
        // growing it with zoom would make the same number mean two things at two zooms.
        radius: "camera",
        // The live half of the filter, present only when there IS a filter. `setFilter` on a
        // property no feature carries would narrow the live layer to nothing the moment a control
        // that does not exist was operated; a beat with no dimension declares none.
        ...(groupsOf(geometry.points).length > 1 ? { filterProperty: "group" } : {}),
        hover: true,
      },
    ],
  };
}

/**
 * The zoom headroom a reader needs before the two closest marks stop overlapping, in the plate's own
 * frame units — read off the SAME radii the layer is drawn with, never a second sizing.
 *
 * A camera-scaled circle holds its screen size as the reader zooms (a circle encodes a value, not a
 * ground area), so each doubling of zoom doubles the distance between two centres while the radii
 * stay put: the pair separates once `distance x 2**h >= rA + rB`.
 *
 * Returns 0 when nothing overlaps, which is the honest answer rather than a floor of last resort: a
 * study set drawn without collisions needs no extra leash, and `leash()`'s own frame-filling rule
 * then governs alone. This seed is that case — thirteen metros spread across a continent — so the
 * function is here as the canonical shape a beat copies, not as a number this seed needs.
 */
export function separationHeadroom(points, radiusOf) {
  // MEASURED IN THE PLATE'S OWN PIXELS, on both sides of the ratio. The first draft of this compared
  // a radius in frame units against a distance in DEGREES and reported 5.04 zoom levels for a study
  // set whose marks do not overlap at all — a unit mismatch that produced a plausible-looking
  // number, which is the worst kind. `px`/`py` are what the bake projected and what the SVG draws
  // the circles at, so they are the one space where the two quantities are comparable.
  let worst = 0;
  for (let i = 0; i < points.length; i++)
    for (let j = i + 1; j < points.length; j++) {
      const gap = Math.hypot(points[i].px - points[j].px, points[i].py - points[j].py);
      const touching = radiusOf(points[i].value) + radiusOf(points[j].value);
      if (gap <= 0 || gap >= touching) continue;
      worst = Math.max(worst, Math.log2(touching / gap));
    }
  return Math.round(Math.max(0, worst) * 1000) / 1000;
}

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
 *
 * MORE THAN ONE TABLE MAY SIT BEHIND ONE DISCLOSURE — `stress-ab-emigration-flows` discloses its
 * eight routes and its five destinations together, two readings of the same eight numbers. The
 * count therefore reads every `<tbody>` in the fragment and nothing outside one. It used to slice
 * from the FIRST `<tbody>` to the end of the string and match every `<tr>` left, so a second
 * table's own HEADER row counted as a row of values and 8 + 5 was labelled 14. The summary is the
 * one number a reader has before they open anything.
 */
export function discloseTable(tableHtml, rowNoun) {
  if (!tableHtml) return "";
  if (typeof rowNoun !== "string" || rowNoun.trim() === "")
    throw new Error(
      "this beat renders a value table but named no `tableRowNoun`: the disclosure summary has to " +
        "say what it holds (\"41 countries\", \"156 cells\"), and nothing here can invent that word",
    );
  const bodies = tableHtml.match(/<tbody\b[\s\S]*?<\/tbody>/gi) ?? [];
  const rows = bodies.reduce((n, body) => n + (body.match(/<tr[\s>]/g) ?? []).length, 0);
  if (rows === 0)
    throw new Error(
      "the value table rendered no <tbody> rows: refusing to label a disclosure with a count " +
        "nobody can check",
    );
  const noun = (tableHtml.match(/<table\b/gi) ?? []).length > 1 ? "Tables" : "Table";
  return (
    `<details class="mw-table-disclosure">` +
    `<summary>${escapeHtml(`${noun} of values — ${rows} ${rowNoun}`)}</summary>\n` +
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
  for (const element of inner.matchAll(/<(image|path)\b[^>]*>/g)) {
    const tag = element[0];
    const id = /\bid="([^"]+)"/.exec(tag)?.[1];
    if (!id) continue;
    const key = /\bdata-key="([^"]+)"/.exec(tag)?.[1];
    const className = /\bclass="([^"]+)"/.exec(tag)?.[1];
    uses.push(
      `<use href="#${id}"${className ? ` class="${className}"` : ""}${key ? ` data-key="${key}"` : ""}/>`,
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
 *  A repeat's marks carry `data-copy-detail` rather than `data-detail`. Same string, deliberately a
 *  different name: `data-detail` is the attribute this format's censuses count a mark by
 *  (`tableCarriesTheMarks`, `keyboardReachesEveryMark`, `announcedMarksOf`), and a copy is the same
 *  mark seen twice, not a second mark. `interaction.mjs` reads either. */
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
        .replace(/\bdata-detail="/g, 'data-copy-detail="')
        .replace(/\s(?:aria-label|title)="[^"]*"/g, "")
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


async function renderMapWeb({ component, table, props, outDir, name, regionTable = true, tableRowNoun = null, live = false, plan = null }) {
  // A FRAME IS A SHAPE, and a beat that hands over half of one is told so here rather than shipping
  // a strip. Both the viewport's width and its height are computed from these two numbers.
  const declaredFrame = props?.geometry?.frame;
  if (!declaredFrame || !(declaredFrame.width > 0) || !(declaredFrame.height > 0))
    throw new Error(
      "geometry.frame must carry a positive width and height — the plate's own, in its own pixels; " +
        `this beat handed over ${JSON.stringify(declaredFrame ?? null)}`,
    );
  const language = assertRecordedLanguage(props.language);
  const furniture = deriveFurniture(props.ground);
  // HOW MANY WORLDS THIS PAGE PAINTS, derived from the camera and from the range of box shapes this
  // beat is delivered into — the same function the bake refuses against, so the plate and the page
  // can never disagree about how many copies there are.
  const worldCopies = props.geometry?.cannotCover
    ? worldCopiesFor(props.geometry.frame, requireBoxAspects(props.geometry))
    : 1;
  const tableHtml = regionTable
    ? discloseTable(
        renderToStaticMarkup(
          createElement(table, { points: props.geometry.points, ...furniture }),
        ),
        tableRowNoun,
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

  const css = buildCss({ ...props, ...furniture, groups, frame: props.geometry.frame, worldCopies });
  // THE MARKS WRAP WITH THE MAP. The stylesheet is handed over rather than re-derived: which overlay
  // elements a copy has to carry is a fact about the rules this page actually ships (`repeatWorlds`).
  const mapHtml = repeatWorlds(
    renderToStaticMarkup(createElement(component, { ...props, ...furniture })),
    worldCopies,
    css,
  );

  const html = `<!doctype html>
<html lang="${language}">
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

  // ── THE MARKS THIS CAMERA DRAWS SMALLER THAN A PIXEL, SAID BEFORE THE FILE IS WRITTEN ────────
  //
  // A limit this format cannot remove, so it is stated where the producer reads it — this project's
  // own rule for exactly that case, and the same shape the colliding-target verdict already takes.
  // Measured on the committed 241-region world beat, driven live with a real key: at 1600x900 the
  // map draws 896px for 360° of longitude, one pixel is about 26 km, and Monaco is about a
  // thirteenth of one. 90 of its 241 marks have no pixel a pointer can be sent to, and 149 at
  // 375x667. No hit target creates one — see `detect-stranded-marks.mjs`'s own header.
  //
  // AND IT REFUSES, which the colliding verdict does not, because the two cases are not the same.
  // A covered button still has a keyboard path and a row. A sub-pixel mark has ONLY those two, so a
  // beat that strands one and then drops one of them has drawn a fact no reader can reach by any
  // means. That page is not written.
  const drawn = drawnRegionsOf(html);
  // DECLARED, never dropped: a mark whose drawn geometry this reading cannot place is a mark nothing
  // below measured, and a silence reported as a pass is the shape this project keeps finding.
  if (drawn && drawn.unplaceable.length > 0)
    console.log(
      `no pointer path: ${drawn.unplaceable.length} mark(s) draw their geometry under an SVG ` +
        `transform (${drawn.unplaceable.join(", ")}) — this reading works in frame units and cannot ` +
        `place them, so nothing below counted them either way`,
    );
  if (drawn && drawn.shapes.length > 0) {
    for (const width of READING_WIDTHS)
      console.log(strandedVerdict(width, marksStrandedWithNoChannel(html, drawnWidthAt(width, drawn.frame, plateIsBoundByHeight(html)))));
    const refusal = strandedRefusal(html);
    if (refusal) throw new Error(refusal);
  }

  await mkdir(outDir, { recursive: true });
  const outPath = join(outDir, name);
  await writeFile(outPath, html);
  // THE WRAP IS SAID OUT LOUD ON THE VERDICT A PRODUCER READS, and it says the two things a
  // producer has to know that the layout alone does not show: how many worlds are painted, and that
  // the keyboard and the table were deliberately NOT multiplied with them. A repeat nobody can point
  // at is the defect this ruling came with its own engineering consequence to prevent, so the
  // sentence names the driver that counts the pointers rather than claiming the count itself.
  const limit =
    worldCopies > 1
      ? `this beat fills its container by WRAPPING: ${props.geometry.cannotCover.why}. ` +
        `The page paints ${worldCopies} copies of the ${props.geometry.frame.width}x${props.geometry.frame.height} plate ` +
        `side by side, each carrying its own marks and its own hit targets; the middle copy is the ` +
        `only one in the accessibility tree, so the Tab order and the accessible table are unchanged ` +
        `at one reading per mark. Count what answers a pointer on each copy with ` +
        `scripts/verify-wraps-the-world.mjs.`
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
 * own inline `<script>` absent entirely. `:has()` is the one modern-CSS assumption this format now
 * makes (Chrome 105+/Safari 15.4+/Firefox 121+, all long-shipped in every evergreen browser this
 * self-contained HTML is built for) — accepted rather than hand-rolling a JS-only fallback for a
 * capability that only degrades to "the filter/zoom controls are inert, the unfiltered/unzoomed
 * view still renders complete" on anything older, which is exactly the guarantee this format already
 * makes for JavaScript being off.
 */
function buildCss({ ground, accent, ink, muted, groups, frame, worldCopies = 1 }) {
  // The plate's own aspect, the one number both the stage's width bound and the viewport's
  // `aspect-ratio` are computed from, so the box can never be asked to be two shapes at once.
  const aspect = frame.width / frame.height;
  // ONE FILTER OR NONE OF ONE. A single group narrows nothing — the seed already refuses to draw a
  // control for it — so the rules and the chip styling are emitted on the same condition the control
  // is, and `groupAttrOf` puts the attribute on the same condition again. They used to be three
  // independent decisions: measured on `stories/stress-ab-emigration-flows`, the delivered page
  // carried four `[data-group=…]` hiding rules and a `data-group` on every table row with no
  // `<fieldset>` anywhere to work them, and the rules quoted the slug while the rows carried the raw
  // name. `splash/test/filters-are-declared-or-absent.test.ts` is the census that reads this back.
  const hasFilter = groups.length > 1;
  const filterRules = (hasFilter ? groups : [])
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
        // EVERY drawn element the filter's own vocabulary tags, not only the circle. This read
        // `svg.map circle[data-group]` until 2026-08-23, and `stories/r8-map-web-japan-bear-casualties`
        // draws LEADER LINES tagged with the same attribute: driven at 1280x900, six of its Chubu
        // leaders still had a client rect after the filter narrowed the map to another region — a
        // line pointing at a prefecture that is no longer drawn. Measured across the whole delivered
        // population, `circle` and `line` are the only tags that carry the attribute inside the map
        // svg, so widening the selector to the attribute changes nothing else and cannot leave the
        // next element kind behind.
        // The decorative SVG mark, too — otherwise a narrowed filter leaves every OTHER region's
        // circle sitting on the map with no label and no hit target, an ambiguous ghost rather
        // than a genuinely narrower map (caught by screenshotting the filtered state, not by
        // reading the markup).
        `.map-web-page:has(#${id}:checked) svg.map [data-group]:not([data-group="${attr}"]) { display: none; }`,
        `.map-web-page:has(#${id}:checked) .region-table tbody tr:not([data-group="${attr}"]) { display: none; }`,
      ].join("\n");
    })
    .join("\n");

  // The chip stylesheet travels with the control, not with the format: a page that draws no
  // fieldset has no chips to style, and twenty-eight lines of dead CSS in every delivered file is
  // the defect `filter.ts`'s own header records for `chart-web` ("21 of 21 pages ship 12 lines of
  // `.chart-filter` CSS and NOT ONE contains a `<fieldset>`").
  const filterStyling = hasFilter
    ? `/* THE FILTER, drawn as chips (map-web-discipline.md, "Filters"). Bare browser radios read as an
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
`
    : "";

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
${filterStyling}/* The stage: the leftover height, and the container the map is measured against. 'container-type:
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
.mw-viewport[tabindex] { outline-offset: 2px; }
.mw-viewport[tabindex]:focus-visible { outline: 2px solid var(--ink); }
/* The three layers occupy the SAME box, the live one underneath. It is laid out from the first frame
   rather than revealed later, because a container with no size is a map with no size: MapLibre reads
   the box at construction, and a display:none container gives it 0x0 and a canvas nothing ever
   paints into. Invisible-but-laid-out, then, and the swap is one flip of the fallback's own
   hidden attribute. */
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
  worldCopies > 1
    ? `/* THE WORLD REPEATS, AND THE MARKS REPEAT WITH IT (the owner, 2026-08-23: *that is the normal
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
}
/* LIVE, THE COPIES ARE MAPLIBRE'S OWN. A live canvas paints world copies itself and hit-tests every
   one of them through queryRenderedFeatures, so the DOM copies would be a second, staler set of
   marks over the top of them. They go; the overlay drops back onto the viewport, 'live-map.mjs'
   re-projects the ONE remaining set into the live camera, and the pointer is the canvas's job. */
html.mw-live .mw-fallback, html.mw-live .mw-overlay { display: block; }
html.mw-live [data-world="repeat"] { display: none; }
html.mw-live .mw-world { position: static; }
`
    : ""
}}.maplibregl-canvas-container canvas { outline: none; }
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
   HIT_TARGET_PX note).
   ONE SIZE, AND THE SECOND AXIS COMES FROM 'aspect-ratio', NEVER FROM A SECOND PERCENTAGE (B6.20).
   A percentage WIDTH resolves against the container's width and a percentage HEIGHT against its
   height, so the same fraction is two different numbers the moment the overlay stops being the
   plate's own square box — which is exactly what the live swap did. Measured on the committed
   symbol beat at 1600x900 (container 1566x591): the M9.1 button was 140.9 x 53.2 px, a wide flat
   grey ellipse painted behind a 60 px disc. 'aspect-ratio' is what makes the painted halo a circle
   in SCREEN pixels at every container shape, in the live layer and in the fallback alike. */
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

/** Bakes the plate if it is not already at `PLATE_DIR` — the same "bake once, reuse" shape
 *  `map-beat/scripts/render-preview.mjs` uses for its own seed. */
async function ensurePlate(plateDir) {
  if (existsSync(join(plateDir, "geometry.json")) && existsSync(join(plateDir, "plate.png")))
    return;
  await mkdir(plateDir, { recursive: true });
  const result = spawnSync(
    "bun",
    [
      join(HERE, "bake-plate.mjs"),
      "--size",
      String(PLATE_SIZE),
      "--box-aspects",
      PLATE_BOX_ASPECTS,
      "--clearance",
      PLATE_CLEARANCE,
      "--out",
      plateDir,
    ],
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
 *  format's generic `renderMapWeb`. */
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
      language: SEED.language,
    },
    outDir,
    name,
    regionTable: SEED.regionTable,
    tableRowNoun: SEED.tableRowNoun,
    live: SEED.live,
    plan: SEED.live
      ? livePlan({
          geometry: { ...geometry, points: merged },
          subjectKey: SEED.subjectKey,
          accent: SEED.accent,
          muted: deriveFurniture(SEED.ground).muted,
          // THE SEA THE PLATE WAS ACTUALLY PAINTED WITH, off the plate's own record — never a
          // constant in this file. It WAS a constant, and the cost was measured on the beat that
          // found it: `SEED.waterFill` was read only by the live layer, so the fallback plate and
          // the live map painted two different seas and nothing compared the pair. A reader with
          // JavaScript off saw one ocean and a reader with it on saw another. `bake-plate.mjs`
          // derives the tint from this beat's own ground and ink and writes it into `geometry.json`;
          // this reads it back, so there is one sea and it is the one on disk.
          waterFill: waterFillOf(geometry),
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
  assertRecordedLanguage,
};
