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
  drawnRegionsOf,
  drawnWidthAt,
  marksStrandedWithNoChannel,
  strandedRefusal,
  strandedVerdict,
} from "./detect-stranded-marks.mjs";
import { BearCasualtiesWeb, RegionTable } from "./BearCasualtiesWeb.tsx";
import { groupsOf, markLayers, maxZoomForStudySet, radiusScale, slugOf } from "./geo-symbol.ts";

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
const SEED_PALETTE = readPalette(HERE, { stopAt: HERE });
const SEED = {
  ground: SEED_PALETTE.ground,
  accent: SEED_PALETTE.accent,
  title: "Japan's record bear year was a Tohoku year",
  source:
    "Ministry of the Environment, Japan — 「Ｒ０７年度におけるクマの人身被害件数［速報値］」, " +
    "retrieved 23 August 2026",
  // STORYBOARD.md records `language: en`. The prefecture names are Natural Earth's romanisations;
  // the ministry's own Japanese names travel in `bear-casualties-fy2025.json` beside them.
  language: "en",
  basemapCredit: "basemap © MapTiler, © OpenStreetMap",
  legendCaption: "People hurt by bears, fiscal 2025",
  caveat:
    "Preliminary figures (速報値); the ministry says they may still change. Casualties include the " +
    "13 deaths and the two must not be added. Seventeen prefectures reported zero and draw no " +
    "circle. Eight — Fukuoka, Saga, Nagasaki, Kumamoto, Oita, Miyazaki, Kagoshima and Okinawa — " +
    "are absent from the ministry's table entirely and are not drawn: absent is not zero. No " +
    "population figure is published beside these counts, so nothing here is a rate.",
  alt:
    "A map of Japan with one circle per prefecture, sized by the number of people hurt by bears in " +
    "fiscal 2025. The circles cluster along the northern spine of Honshu: Akita draws by far the " +
    "largest, with Iwate beside it on the Pacific coast and Fukushima, Yamagata, Niigata and Aomori " +
    "around them. Western and southern Japan is almost bare.",
  live: true,
  subjectKey: "jp-05",
  // Rule 7 of the cartographic rules, on this beat's dark ground: a blue a reader reads as sea and
  // not as a value. Sits below the first class of anything drawn on top of it.
  waterFill: "#376084",
  regionTable: true,
  tableRowNoun: "prefectures",
};
// Baked generously so the plate stays at or near native resolution across the tested width range
// (375–1600px, minus the page's own 16px body padding on each side) rather than a narrow max-width
// that would leave gutters beside a full-bleed beat — see references/map-web-discipline.md, "Full
// width, genuinely", for the exact numbers this trades off.
const PLATE_SIZE = 1000;
// The seed's own frozen plate keeps preview, interaction and installation checks offline. Story
// beats pass their own plate directory and still bake through `bake-plate.mjs` when it is absent.
const DEFAULT_PLATE_DIR = join(HERE, "plate");
const DEFAULT_DATA_PATH = join(HERE, "bear-casualties-fy2025.json");
// The seed's own rendered beat lands in this skill's `output-proof/`, beside the preview it already
// ships, and is COMMITTED — carrying the placeholder, never a key (R1b).
//
// It used to default to `/tmp/map-web-twin`, and that is the defect this line closes rather than a
// tidying: with no live page anywhere in the repository, the one guard that drives the live layer
// (`test/live-map.test.ts`) was gated on `/tmp/mw-live/population.html` — a path NO script in this
// tree produces. It existed on one machine because somebody rendered it by hand. On a fresh clone
// the guard printed "live map not driven" and passed, so the whole live layer could be deleted in
// silence. A guard has to point at a file the repository itself makes.
const DEFAULT_OUT_DIR = join(HERE, "renders");
const OUTPUT_NAME = "bear-casualties-by-prefecture.html";
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
    maxRadiusFrameUnits: geometry.frame.width * 0.062,
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
      separationHeadroom(geometry.points, radiusScale(maxValue, geometry.frame.width * 0.062)),
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
    // THE DISCLOSURE STAYS CLOSED, AND THAT IS NOT THIS BEAT'S CALL TO MAKE.
    // Ruling B5.2 (2026-08-10) is the owner's, in their own words, and it is "and for all": the
    // value table is collapsed on every map page without exception. This beat shipped it OPEN for
    // one render, on the argument below, and `the-value-table-is-collapsed.test.ts` refused it —
    // correctly. The argument is recorded in NOTES-FOR-MAINTAINER.md as a question for the owner,
    // not acted on here: 17 of this beat's 39 marks have a value of zero and therefore a radius of
    // zero, so no pointer reaches them and the table is their only COMPLETE reading — which is the
    // state `marksStrandedWithNoChannel` exists for. Note also that `MapWebSeed.tsx`'s own
    // docstring for `RegionTable`, the file a beat is told to copy, still says the table is
    // "rendered plainly and visibly (never behind a disclosure widget, never screen-reader-only
    // CSS)" — the opposite of the ruling.
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
  const mapHtml = renderToStaticMarkup(createElement(component, { ...props, ...furniture }));
  const tableHtml = regionTable
    ? discloseTable(
        renderToStaticMarkup(
          createElement(table, { points: props.geometry.points, ...furniture }),
        ),
        tableRowNoun,
      )
    : "";

  const interactionSource = await readFile(join(HERE, "interaction.mjs"), "utf8");
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
      `<script>\n${inlineable(await readFile(join(HERE, "live-map.mjs"), "utf8"))}\n</script>`
    : "";

  const groups = groupsOf(props.geometry.points);
  assertDistinctSlugs(groups);

  const html = `<!doctype html>
<html lang="${language}">
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
      console.log(strandedVerdict(width, marksStrandedWithNoChannel(html, drawnWidthAt(width, drawn.frame))));
    const refusal = strandedRefusal(html);
    if (refusal) throw new Error(refusal);
  }

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
 * own inline `<script>` absent entirely. `:has()` is the one modern-CSS assumption this format now
 * makes (Chrome 105+/Safari 15.4+/Firefox 121+, all long-shipped in every evergreen browser this
 * self-contained HTML is built for) — accepted rather than hand-rolling a JS-only fallback for a
 * capability that only degrades to "the filter/zoom controls are inert, the unfiltered/unzoomed
 * view still renders complete" on anything older, which is exactly the guarantee this format already
 * makes for JavaScript being off.
 */
function buildCss({ ground, accent, ink, muted, groups, frame }) {
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
        // The decorative SVG mark, too — otherwise a narrowed filter leaves every OTHER region's
        // circle sitting on the map with no label and no hit target, an ambiguous ghost rather
        // than a genuinely narrower map (caught by screenshotting the filtered state, not by
        // reading the markup).
        `.map-web-page:has(#${id}:checked) svg.map circle[data-group]:not([data-group="${attr}"]) { display: none; }`,
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
/* The viewport: the bake's own aspect, exactly, at every size — bounded by the stage's width AND
   its height, whichever binds first, and centred when it is the height. A plate stretched to fill
   a shape it was not baked for is a lie about distance and shape (geo-discipline.md), so it is not
   one of the outcomes here; a smaller, correct map is. The plain 'width: 100%' above the 'min()'
   is the fallback for a browser without container query units — it fills the width, exactly as this
   format did before, rather than collapsing. */
.mw-viewport {
  position: relative;
  container-type: size;
  container-name: mwmap;
  width: 100%;
  width: min(100cqw, calc(100cqh * ${aspect}));
  max-width: 100%;
  /* CENTRED (finding 3, round-two stress — this was flush-left before, and the reasoning for that
     turned out not to hold: the title, the filter chips and the legend are never the map's own
     width to align an edge WITH — every one of them already spans the full stage at 100%, so a
     flush-left map's "aligned edge" was aligned with nothing narrower than itself. When the
     WINDOW's height is what bounds the map (a plate whose own aspect is close to square, on a wide
     desktop window), the leftover room is horizontal, and dumping the whole of it on one side reads
     exactly the way it measured: a choropleth in the left half of a 1440x900 window, empty ground
     filling the right half outright — not a smaller map, a broken one. Centred, the same leftover
     room splits evenly and reads as a deliberately framed, smaller map, which is what it is: this
     format never stretches a plate to fill a shape it was not baked for (geo-discipline.md — that
     is a lie about distance and shape), so a plate whose own true aspect is squarer than the
     window it opens in is SMALLER by design, and centring is how a smaller graphic sits in the
     space it was given without looking like a layout failure. */
  margin-inline: auto;
  /* 'visible', not 'hidden'. The plate and its circles are already clipped to the frame by the
     SVG's own clipPath, so the only thing this would clip is a point LABEL — a name, which is
     data. A label's width is a fixed number of CSS pixels while the frame it is placed in is a
     percentage, so at the narrow end the two stop fitting together no matter how the flip margin
     is tuned: measured at 375px, 'Stockholm' and 'Warsaw' each lost 3-4px off their last letter.
     Letting them spill into the page's own side gutter keeps the word whole. Zoomed, the rule
     below takes over and this becomes 'auto' — a pannable box must clip. */
  overflow: visible;
  border: 1px solid var(--muted);
  /* THE HEIGHT, AND IT BELONGS TO THE FORMAT. It used to come from an inline 'aspect-ratio' written
     inside MapWebSeed.tsx — the one file a beat is told to REPLACE with its own component — so a
     beat that wrote its own and did not carry that style got a box with no height. Measured in
     round six on stress-ab-emigration-flows: a 451x2 px map, found by driving the page and by
     nobody's test. It is emitted here now, from the same frame the width above is computed from,
     so the box can never be asked to be two shapes at once.
     '!important' for the one reason it is ever right here: an inline style on the component's own
     element outranks any stylesheet rule, and that outranking IS the defect. The live rule below
     still wins — a live canvas has no plate aspect to keep — on selector specificity, as before. */
  aspect-ratio: ${frame.width} / ${frame.height} !important;
}
/* A LABEL THE MAP BOX IS TOO SMALL TO HOLD IS NOT DRAWN — a CONTAINER query, not a viewport one,
   because the box's own width is what decides this and it is a function of the window's leftover
   HEIGHT, not of its width. Measured on this beat, 2026-08-23: the map box is 582px wide at a
   768x1024 window and 386px at 1024x768, so the wider WINDOW gives the narrower MAP. Overlapping
   label pairs at the four verified sizes, before this rule: 0 at 1600x900 (box 520px), 6 at
   1024x768 (box 386px), 0 at 768x1024 (box 582px), 17 at 375x667 (box 165px), with 4 labels also
   drawn outside the map's own edges at 375. Build-time de-collision cannot reach any of it: the
   labels are POSITIONED as a percentage of the plate's frame and SIZED at a fixed 11.5px, so their
   height in frame units changes with every container width and no single placement is right at all
   of them. The subject keeps its name at every size — it is the one the title is about. */
@container mwmap (max-width: 460px) {
  .point-label:not(.subject) { display: none; }
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
    component: BearCasualtiesWeb,
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
  assertRecordedLanguage,
};
