// twin/proof/mapgen-hexgrid-web/render-web.mjs
//
// This beat's own WEB runner, and this beat's OWN physical copy of the web genre's machinery
// (`renderHexGridWeb`, modelled on `twin-map-web/scripts/render-web.mjs`'s own `renderMapWeb`) —
// nothing in this file imports out of a skill or another `proof/` beat. Binning happens AFTER the
// bake, from the baked points' own pixel coordinates, the same order
// `proof/map-quake-density/render.mjs` follows for its own static genre
// (`twin-map-beat/references/types/hex-grid.md`'s own cell-size rule: check the rendered cell
// count, never the config value alone).
//
// RULING R1 (2026-08-10), retrofitted here: the beat this writes is a LIVE MapTiler map with
// MapTiler's own zoom and pan, constrained to the subject's area, over the SAME baked plate it
// already shipped — which stays as the fallback layer (`live-map.mjs`, a byte-identical copy of
// `twin-map-web/assets/live-map.mjs`, including its own line-1 path comment: a beat duplicates a
// helper, it does not fork it). What travels from here into the page is the PLAN — `livePlan`
// below — because that file may not know what a beat draws.
//
// Usage:  bun proof/mapgen-hexgrid-web/render-web.mjs [outDir] [--data <csv>]

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
import { readPalette } from "#shared/twin-chart-beat/render-still.mjs";
import {
  HexGridWeb,
  DensityTable,
  HEX_DRAW_SHRINK,
  cellDetail,
  cellEdge,
  cellFill,
  rankedCells,
} from "./HexGridWeb.tsx";
import {
  cellMembers,
  chooseHexSize,
  countBreaks,
  dominantRegions,
  hexCorners,
  quakePointsFromCsv,
  assertRampReads,
  dataRampEnd,
  sequentialRamp,
  pixelToLonLat,
} from "./geo-hex.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
// Resolved through node's own module resolution, never by a relative path out of this beat.
// `no-cross-skill-imports.test.ts` reads path STRINGS, not just import statements, and a literal
// `../../node_modules/...` reads to it — correctly — as a specifier leaving the beat. A package
// name is the honest way to say "this comes from a dependency", and it is what a copy-pasted beat
// with its own `bun install` would resolve too.
const requireFrom = createRequire(import.meta.url);
const MAPLIBRE_JS = requireFrom.resolve("maplibre-gl/dist/maplibre-gl.js");
const MAPLIBRE_CSS = requireFrom.resolve("maplibre-gl/dist/maplibre-gl.css");

// The colours are READ, not typed — see `PALETTE.md` beside this file. The cell shading is this
// map's data, so the accent reaches the ramp and not only the densest cell's ring.
const PALETTE = readPalette(HERE, { stopAt: join(HERE, "..") });
console.log(
  `palette from ${PALETTE.source} — ground ${PALETTE.ground}, accent ${PALETTE.accent}, ` +
    `chosen by ${PALETTE.origin}`,
);

// ===== CONFIG — this beat's own words =====
const BEAT = {
  ground: PALETTE.ground,
  accent: PALETTE.accent,
  aggregateMode: "count",
  title:
    "2024's earthquakes clustered along tectonic plate boundaries — the Pacific “Ring of Fire” most densely, not spread evenly across the globe.",
  source: "Source: USGS Earthquake Catalog (earthquake.usgs.gov), magnitude 4.0+, worldwide, 2024",
  basemapCredit: "basemap © MapTiler, © OpenStreetMap",
  legendCaption: "Earthquakes per cell (count, not energy or magnitude)",
  // The water colour `bake-plate.mjs` paints into the plate (geo-discipline rule 7). The live
  // style is given the SAME override on `style.load`, or the swap on `map.on("load")` would repaint
  // every ocean and be visible as a flash of different cartography.
  waterFill: "#aac9e0",
  // Ruling R1: map × web is a LIVE MapTiler map. Set this false for a beat that must stay
  // request-free (an offline archive, a CMS whose Content-Security-Policy refuses
  // api.maptiler.com) — the page then ships as the fallback layer alone, which is exactly what
  // this beat was before the ruling, and what the audit measured it still being.
  live: true,
};
// The plate's own pixel size. `bake-plate.mjs` bakes ONE plate at exactly this size; the fluid SVG
// scales it uniformly, never distorting it (`map-web-discipline.md`, "The plate strategy"). It used
// to be "the desktop layout's own map size" — there is no desktop layout any more (see
// `HexGridWeb.tsx`'s own header on B5.1), only one render that fits whatever window it is opened in.
const PLATE_WIDTH = 836;
const PLATE_HEIGHT = 520;
// FROZEN BESIDE THE BEAT, for the same reason its csv is: a basemap living in `/tmp` cannot be
// committed, so the delivered html could not be reproduced or audited — and MapTiler restyles, so
// a re-bake months later is a different picture under the same hex cells. `ensurePlate` below
// bakes only when this folder is empty.
const DEFAULT_PLATE_DIR = join(HERE, "plate");
const DEFAULT_DATA_PATH = join(HERE, "quakes-density.csv");
// And the OUTPUT defaults beside the beat too — where `hex-grid.html` is actually committed. It
// used to default to `/tmp/mapgen-hexgrid-web-render`, so running this script the obvious way
// produced a fresh file nobody looks at, printed a path, exited zero, and left the committed one
// stale: the presence of a file mistaken for the existence of a result.
const DEFAULT_OUT_DIR = HERE;
const OUTPUT_NAME = "hex-grid.html";
// ===========================================

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

/** A longitude folded back into [-180, 180). Applied to the ANCHORS only, never to a polygon ring
 *  — see `livePlan`'s own note on the antimeridian. */
function wrapLongitude(lon) {
  return ((((lon + 180) % 360) + 360) % 360) - 180;
}

/**
 * The plan the live layer reads out of the page: the style URL with its placeholder, the reader's
 * leash, and the bins as GeoJSON. Every camera number comes from the bake's own `geometry.json` —
 * `frameCorners` is the extent the camera ACTUALLY showed, which is not the bounds it was asked
 * for.
 *
 * A HEX BIN IS A SCREEN-SPACE SHAPE BEING DRAWN AS A GEOGRAPHIC POLYGON, and that is stated rather
 * than hidden. `geo-hex.ts` bins in the PLATE's pixel space (`binHex`/`hexCorners`), so every
 * corner is unprojected back to lon/lat with `pixelToLonLat` — the same projection, and the same
 * recorded `frameCorners`, the beat already uses to say where its densest cell is. The consequence:
 * a cell's GROUND area was fixed at bake time, so at a very different zoom it is a polygon whose
 * footprint is the bake's, not a re-binning of the data at that zoom. That is the honest reading of
 * a baked hex grid and it is exactly what the plate underneath shows.
 *
 * THE ANTIMERIDIAN. This plate spans 359.8° of longitude, and a cell whose CENTRE sits hard against
 * the west edge has corners at pixel x < 0 — longitudes below −180. Those are emitted RAW, not
 * folded: the ring's coordinates stay continuous with the frame's own linear pixel→longitude
 * mapping, so the polygon is a small hexagon just west of the seam, which is where it belongs. A
 * ring whose corners were each folded independently would run from −179.9 to +174 and wrap the
 * whole world the wrong way. The ANCHORS are folded, because an anchor is a point, and
 * `map.project()` of an unfolded −190° lands a hit target off the left edge of a canvas whose
 * visible copy of that cell is on the right.
 */
export function livePlan({
  geometry,
  cells,
  hexSize,
  breaks,
  ramp,
  subjectKey,
  accent,
  ground,
  waterFill,
}) {
  const corners = geometry.frameCorners;
  if (!corners || !(geometry.degreesPerPixel > 0))
    throw new Error(
      "this plate predates the camera facts: re-bake it, or the live map has neither bounds to be " +
        "constrained to nor a ground scale to draw its bins at",
    );

  const frame = geometry.frame;
  const drawnSize = hexSize * HEX_DRAW_SHRINK;
  const ranked = rankedCells(cells);
  const total = ranked.length;

  const anchors = {};
  const features = [];
  let west = Infinity;
  let east = -Infinity;
  let south = Infinity;
  let north = -Infinity;
  for (let i = 0; i < ranked.length; i++) {
    const cell = ranked[i];
    const ring = hexCorners(cell.cx, cell.cy, drawnSize).map(([x, y]) => {
      const { lon, lat } = pixelToLonLat(x, y, corners, frame);
      // Four decimals is ~11 m at the equator. The tightest camera this beat's own leash allows
      // draws about 0.03° per pixel, so this rounding is three orders of magnitude below one
      // drawn pixel — and it keeps 156 hexagons of plan under 30 KB instead of over 80.
      return [Number(lon.toFixed(4)), Number(lat.toFixed(4))];
    });
    for (const [lon, lat] of ring) {
      if (lon < west) west = lon;
      if (lon > east) east = lon;
      if (lat < south) south = lat;
      if (lat > north) north = lat;
    }
    ring.push(ring[0]);
    const centre = pixelToLonLat(cell.cx, cell.cy, corners, frame);
    anchors[cell.key] = [
      Number(wrapLongitude(centre.lon).toFixed(4)),
      Number(centre.lat.toFixed(4)),
    ];
    const edge = cellEdge(cell, subjectKey, accent, ground);
    features.push({
      type: "Feature",
      geometry: { type: "Polygon", coordinates: [ring] },
      properties: {
        key: cell.key,
        // The tooltip reads `data-detail` off the matching `.pt` when there is one — every cell has
        // one here — and falls back to the feature's own `detail`. Both are `cellDetail`, the one
        // implementation, so there is no second formatting of the same three numbers.
        name: `Cell ranked ${i + 1}`,
        detail: cellDetail(cell, i + 1, total, breaks),
        color: cellFill(cell, breaks, ramp),
        edgeColor: edge.color,
        edgeWidth: edge.width,
      },
    });
  }

  // The subject's own area: the bins' own footprint, clamped to the extent the plate actually
  // showed. The clamp is what keeps the leash from asking for ground west of the seam that the
  // plate cut away — the raw minimum above is below −180 for exactly the edge cells described in
  // this function's own note.
  const studyBounds = {
    west: Math.max(west, corners.west),
    east: Math.min(east, corners.east),
    south: Math.max(south, corners.south),
    north: Math.min(north, corners.north),
  };
  const studyLonSpan = Math.abs(studyBounds.east - studyBounds.west);
  const frameLonSpan = Math.abs(corners.east - corners.west);

  // THE LEASH, and this beat is the case the seed's own derivation cannot answer.
  //
  // The seed derives its floor as `maxZoomForStudySet(zoom, frameLonSpan, studyLonSpan) − zoom` =
  // `log2(frameLonSpan / studyLonSpan)`: the headroom the plate's own frame had over its study set.
  // Here the study set IS the frame — a planet, 359.8° against 359.8° — so that derivation yields
  // ZERO, and a leash of zero is the one outcome ruling R1 exists to forbid. Measured on the
  // delivered page, `leash()`'s own runtime derivation is not much better: at 1600 × 900 the camera
  // fits the world height-first and `log2(visible/study)` gives about 1.1 zoom levels, at 375 × 812
  // rather less.
  //
  // So the floor comes from the beat's own INNER scale instead, which is the hex cell: a cell is
  // `hexSize` plate pixels across, worth `hexSize × degreesPerPixel` of longitude at the bake's own
  // camera. A reader must be able to bring one cell — the unit this beat's whole claim is counted in
  // — up to half the frame's width, so the cell and the ring of cells around it are on screen
  // together and the reader sees a cell IN CONTEXT rather than a wall of one colour. That is
  // `log2(studyLonSpan / (2 × cellLonSpan))`, and the only editorial number in it is the 2.
  const cellLonSpan = hexSize * geometry.degreesPerPixel;
  const frameHeadroom = Math.max(0, Math.log2(frameLonSpan / Math.max(studyLonSpan, 1e-6)));
  const cellHeadroom = Math.max(0, Math.log2(studyLonSpan / Math.max(2 * cellLonSpan, 1e-6)));

  return {
    styleUrl: `https://api.maptiler.com/maps/${geometry.style}/style.json?key=${KEY_PLACEHOLDER}`,
    waterFill,
    frame,
    // The bake's own ground-per-pixel. Nothing in this beat is sized from it — a bin is a polygon
    // and reprojects itself — but `live-map.mjs`'s `cameraScale` throws without it, deliberately:
    // a plate that predates the camera facts cannot be trusted to place anything.
    degreesPerPixel: geometry.degreesPerPixel,
    metresPerPixel: geometry.metresPerPixel,
    bakeZoom: geometry.zoom,
    studyBounds,
    minZoomHeadroom: Math.max(frameHeadroom, cellHeadroom),
    // Where each `.pt` hit target follows the camera to. Keyed exactly as the markup's own
    // `data-key`. No `.point-label` in this beat — a hex cell has no name to print.
    anchors,
    layers: [
      {
        id: "mw-bins",
        type: "fill",
        data: { type: "FeatureCollection", features },
        // The colour each cell's OWN hexagon is painted on the plate, carried per feature rather
        // than re-binned here (`HexGridWeb.tsx`'s `cellFill` is the one place a count becomes a
        // colour). No `radius` — a fill is geographic and reprojects on its own.
        paint: { "fill-color": ["get", "color"] },
        // A pointer gets the bin's own count anywhere inside the hexagon, which is what B6.14a
        // asked for and what a hit target sitting at the cell's centre could never give.
        hover: true,
      },
      {
        id: "mw-bin-edges",
        type: "line",
        data: { type: "FeatureCollection", features },
        // The same edges the SVG draws: the accent on the subject cell, a ground-coloured hairline
        // between every other pair of neighbours. Screen-sized in both layers, because a stroke is
        // a drawing convention rather than a measurement of ground.
        paint: {
          "line-color": ["get", "edgeColor"],
          "line-width": ["get", "edgeWidth"],
        },
        // The edges are the fill's own outline: a second tooltip on the same cell, fired from a
        // one-pixel line, would only ever fight the fill's.
        hover: false,
      },
    ],
  };
}

/**
 * SSRs the map component ONCE — the fluid SVG plus its HTML overlay IS the one responsive render
 * (see `HexGridWeb.tsx`'s own header on B5.1 and the two-rung `layouts` API this replaced) — SSRs
 * the accessible table once beside it, wraps both in one self-contained HTML file and writes it to
 * disk.
 */
/** What the collapsed disclosure's own summary calls its rows (B5.2). A beat's word, not a
 *  genre's — `discloseTable` refuses to invent one. */
const TABLE_ROW_NOUN = "cells";

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

async function renderHexGridWeb({ component, table, props, outDir, name, live = false, plan = null }) {
  const furniture = deriveFurniture(props.ground);
  const mapHtml = renderToStaticMarkup(
    createElement(component, { ...props, ...furniture }),
  );
  const tableHtml = discloseTable(
    renderToStaticMarkup(
      createElement(table, {
        cells: props.cells,
        breaks: props.breaks,
        subjectKey: props.subjectKey,
        whereOf: props.whereOf,
        ...furniture,
      }),
    ),
    TABLE_ROW_NOUN,
  );

  const interactionSource = await readFile(join(HERE, "interaction.mjs"), "utf8");
  const inlineScript = inlineable(interactionSource);

  // maplibre-gl inlined rather than loaded from a CDN. A `<script src>` would trade 803 KB of
  // payload for a SECOND third-party host; inlining keeps the count at one — api.maptiler.com —
  // which is the honest reading of R1. The price is stated rather than discovered: this page runs
  // 436 KB as a picture and roughly 1.3 MB as a live map, most of the difference being the library.
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

/** Strips the `export` keyword from each top-level declaration — see `interaction.mjs`'s own
 *  header note for why. */
function inlineable(moduleSource) {
  return moduleSource.replace(/^export /gm, "");
}

function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** `#rrggbb` as an `rgba()` string at the given alpha — the hover wash below has to be a colour
 *  with alpha in it rather than an `opacity` on the button, or the focus ring drawn on the same
 *  element would be faded with it. */
function washOf(hex, alpha) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function buildCss({ ground, accent, ink, muted, frame }) {
  // The plate's own aspect, the one number both the stage's width bound and the viewport's
  // `aspect-ratio` are computed from, so the box can never be asked to be two shapes at once.
  const aspect = frame.width / frame.height;
  return `
:root {
  --ground: ${ground};
  --accent: ${accent};
  --ink: ${ink};
  --muted: ${muted};
  --ink-wash: ${washOf(ink, 0.28)};
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
/* FIT THE WINDOW (map-web-discipline.md, "Fit the window"), and this beat was the tree's worst
   offender: 5127px of page in a 900px window, its widest visual using 56% of the width, because it
   drew two fixed-pixel SVG posters (900 and 360) and swapped them with a media query. The beat is
   now a column exactly one window tall: every piece of furniture takes the height it needs, and
   .mw-stage is handed whatever is left. Nothing scrolls inside the visual, at any width. The
   accessible table below this column is a separate matter and is stated in HexGridWeb.tsx.
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
   inside it resolves to zero — the map collapses to its 2px border and nothing is red. A definite
   height is what makes the stage a real size container. */
.map-web > *:not(.mw-stage) { flex: 0 0 auto; }
.mw-title { font-size: 19px; font-weight: 700; line-height: 1.3; margin: 0 0 6px; }
.mw-source { font-size: 12.5px; color: var(--muted); line-height: 1.35; margin: 0 0 12px; }
/* The stage: the leftover height, and the container the map is measured against. 'container-type:
   size' is what lets the viewport below bound itself by the stage's HEIGHT as well as its width —
   CSS has no other way to say "as wide as you like, but never taller than the room left". */
.mw-stage {
  flex: 1 1 auto;
  container-type: size;
  min-height: 180px;
}
/* The viewport: the bake's own aspect, exactly, at every size — bounded by the stage's width AND
   its height, whichever binds first. A plate stretched to fill a shape it was not baked for is a
   lie about distance and shape (geo-discipline.md), so it is not one of the outcomes here; a
   smaller, correct map is. The plain 'width: 100%' above the 'min()' is the fallback for a browser
   without container query units — it fills the width, exactly as this genre did before, rather
   than collapsing. Flush LEFT when the height is what binds, so the map's edge lines up with the
   title, the legend and the caveat rather than floating away from them. */
.mw-viewport {
  position: relative;
  width: 100%;
  width: min(100cqw, calc(100cqh * ${aspect}));
  max-width: 100%;
  margin-inline: 0 auto;
  /* 'hidden', unlike the point-symbol genre's own 'visible'. That genre lets a point LABEL spill
     into the page's gutter because a label is a name, and a name is data. This beat draws no
     labels at all — the only thing that could spill here is half a hit target's hover wash, over
     ground the plate has already cut away. */
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
   stop and every per-cell reading, so hiding it with the fallback would take the whole keyboard
   path away at the moment the live map arrives. Found by looking at the live page, not by an
   assertion. */
.mw-overlay { z-index: 2; pointer-events: none; }
.mw-overlay .pt { pointer-events: auto; }
/* Live, the canvas is what a pointer talks to: queryRenderedFeatures makes the hit area the
   RENDERED BIN at every size and every zoom — a pointer gets a cell's count anywhere inside the
   hexagon, which is what B6.14a and B6.18a asked for. The buttons stay in the DOM, still
   Tab-reachable and still carrying their own aria-label — only their pointer-events go. */
html.mw-live .mw-overlay .pt { pointer-events: none; }
/* B5.1, and the conflict that dissolves with the ruling. The viewport keeps the PLATE's aspect,
   because scaling a raster non-uniformly is a lie about distance and shape. A LIVE map has no plate
   aspect to preserve — the canvas IS the container and the camera fills it — so live, the map takes
   the whole stage. The fallback keeps its aspect-ratio, unchanged, because it is still a plate.

   THE LIVE CAMERA ON THIS BEAT IS WRONG AND THE FIX IS NOT IN THIS FILE. Measured 2026-08-10 by
   tracing every camera call on the delivered page (see BRIEF.md, "The live camera crops the
   claim"): leash() ends with map.setMaxBounds(map.getBounds()), and when the fitted camera leaves
   horizontal slack — the world drawn narrower than the canvas, which a 359.8°-wide study set forces
   whenever 48px of fit padding is applied — getBounds() returns more than 360° of longitude.
   MapLibre's own getConstrained then CLAMPS that range to [0, worldSize] and scales the camera up.
   At 1600 x 900 that is one call taking zoom 0.960 to 2.417, and the delivered map opens on 206° of
   longitude and 20°S–59°N under a title claiming the globe.

   Narrowing the live box to the plate's own aspect was tried and MEASURED WORSE, not better —
   canvas 1151 x 715, delivered zoom 3.849, 56° of longitude — so it was reverted and the seed's
   rule stands. The reason there is no beat-local fix: avoiding the trigger needs the fitted world
   to be at least as wide as the canvas, which for a 359.8° study set requires either cropping the
   longitude that IS the claim or a canvas at least 0.6233 x width + 96 px tall — 1072px at this
   width, inside a 900px window. */
html.mw-live .mw-viewport { overflow: hidden; width: 100%; height: 100%; aspect-ratio: auto !important; }
.maplibregl-canvas-container canvas { outline: none; }
svg.map { display: block; width: 100%; height: 100%; }
/* THE HIT TARGET: one HTML <button> per non-empty cell, clipped to that cell's OWN hexagon.
   'clip-path' clips hit testing as well as painting, and that is the whole reason it is here: a
   pointy-top hexagon's bounding box is 2·size tall against a 1.5·size row pitch, so a quarter of
   every box lies over the row above or below, and un-clipped boxes would answer for each other's
   cells near the seams. Live, the canvas answers instead (the rule above drops these buttons'
   pointer-events) and this clip governs the fallback alone. */
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
  clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
}
/* A hex cell's own fill already carries the data encoding, unlike a symbol map's invisible hit
   circle, so hover cannot swap the fill without erasing that encoding. It DARKENS the cell instead,
   at the cell's own shape, with the ink laid over it at 0.28 alpha. This replaces the stroke
   highlight the SVG paths used to carry, which cannot survive the clip above — an outline is
   clipped away with everything else outside the hexagon. */
.pt:hover, .pt.pt-active { background: var(--ink-wash); }
/* Focus RELEASES the clip so a ring can be drawn at all: 'outline' is clipped exactly like a
   border, and a focus indicator a clip-path eats is no focus indicator. The hit SHAPE changing
   under focus costs nothing — focus here is keyboard-driven, and a keyboard reader is not pointing
   at pixels. */
.pt:focus-visible {
  clip-path: none;
  outline: 2px solid var(--ink);
  outline-offset: 1px;
  background: var(--ink-wash);
}
/* Live, a button's own box is still the size the FALLBACK gave it — a percentage of a box whose
   aspect the rule above has released — so it no longer matches the hexagon MapLibre paints:
   measured at 1600 x 900, about 1.8x too wide. A wash at the wrong size would mark the right cell
   with the wrong shape, so live the wash goes and the tooltip is the answer: it is exact, it
   carries the rank, the count and the class, and it fires anywhere inside the real bin. The focus
   RING stays — a keyboard reader needs to know where they are, and a ring a little larger than its
   cell still says which cell. */
html.mw-live .mw-overlay .pt:hover, html.mw-live .mw-overlay .pt.pt-active { background: transparent; }
/* The legend: HTML, fixed CSS pixel sizes, so it reads the same however big the map is drawn — and
   so its caption WRAPS as prose. It was an SVG <text> on a single unbreakable line, and at 375 CSS
   px it ran to x=414.6 inside a 359-wide frame with 'overflow: hidden': the words "mode: count"
   were not cramped, they were GONE, and the caption is the one place this type is required to state
   its aggregate mode (references/types/hex-grid.md). */
.mw-legend { margin: 12px 0 8px; }
.mw-legend-caption { font-size: 12px; font-weight: 600; color: var(--muted); line-height: 1.35; margin: 0 0 8px; }
.mw-legend-marks { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.mw-legend-item { display: flex; align-items: center; gap: 5px; }
.mw-legend-swatch { display: block; width: 16px; height: 16px; border: 0.5px solid var(--muted); }
.mw-legend-value { font-size: 11px; color: var(--muted); }
.mw-caveat { font-size: 11px; color: var(--muted); line-height: 1.4; margin: 0; }
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
/* NARROW TYPE, and it is not a second layout. The two-rung version this replaced shipped a whole
   second SSR'd SVG poster at 360px; what is left of it is these font sizes, which are
   NARROW_LAYOUT's own numbers, applied by a media query to the one render. Without them this beat's
   own furniture — a 138-character title, a 90-character source line and a four-sentence caveat —
   takes 515px of a 635px budget at 375 x 667 and pushes the stage under its 180px floor. Measured,
   both ways. */
@media (max-width: 520px) {
  .mw-title { font-size: 15px; }
  .mw-source { font-size: 10.5px; }
  .mw-legend-caption { font-size: 10.5px; }
  .mw-legend-value { font-size: 9.5px; }
  .mw-legend-swatch { width: 12px; height: 12px; }
  .mw-legend-marks { gap: 9px; }
  .mw-caveat { font-size: 10px; }
}
/* The accessible table (HexGridWeb.tsx's DensityTable): a real, always-visible table, not a
   screen-reader-only trick — see the type's own accessibility adaptation in HexGridWeb.tsx's
   header. Deliberately long (one row per non-empty cell) and never truncated. */
.density-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  margin-top: 24px;
}
.density-table caption {
  text-align: left;
  font-size: 12.5px;
  color: var(--muted);
  margin-bottom: 8px;
}
.density-table th, .density-table td {
  text-align: left;
  padding: 5px 16px 5px 0;
  border-bottom: 1px solid var(--muted);
}
.density-table tr.subject th, .density-table tr.subject td {
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
  if (existsSync(join(plateDir, "geometry.json")) && existsSync(join(plateDir, "plate.png")))
    return;
  await mkdir(plateDir, { recursive: true });
  const result = spawnSync(
    "bun",
    [
      join(HERE, "bake-plate.mjs"),
      "--width",
      String(PLATE_WIDTH),
      "--height",
      String(PLATE_HEIGHT),
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

/** This beat's own runner: bakes the plate if missing, reads the CSV, bins hex cells from the
 *  BAKED (projected) points — bake first, bin second — computes class breaks, the densest/median
 *  ratio the claim rests on, and hands everything to `renderHexGridWeb`. */
async function render({ dataPath, plateDir, outDir, name = OUTPUT_NAME }) {
  const csv = await readFile(dataPath, "utf8");
  const csvRows = csv.trim().split(/\r?\n/).length - 1; // minus header
  const points = quakePointsFromCsv(csv);
  console.log(`data: ${csvRows} csv data rows, ${points.length} parsed as valid points`);
  if (points.length < 8) throw new Error(`need enough points for a density surface, got ${points.length}`);

  await ensurePlate(plateDir);
  const { geometry, plate } = await loadPlate(plateDir);
  console.log(
    `plate: ${geometry.frame.width}x${geometry.frame.height}, gated by ${geometry.gatedBy}, ` +
      `${geometry.points.length}/${points.length} points on-frame`,
  );

  const { size: hexSize, cells } = chooseHexSize(geometry.points, geometry.frame, {
    targetCells: 220,
    maxCells: 400,
  });
  console.log(
    `hex grid: size ${hexSize.toFixed(1)}px, ${cells.length} nonempty cells (of a possible many more empty ones, dropped)`,
  );

  const breaks = countBreaks(cells.map((c) => c.count));
  console.log(`class breaks (count): ${breaks.join(", ")}`);

  const subject = cells.reduce((max, c) => (c.count > max.count ? c : max), cells[0]);
  const sortedCounts = [...cells.map((c) => c.count)].sort((a, b) => a - b);
  const median = sortedCounts[Math.floor(cells.length / 2)];
  const ratio = subject.count / median;

  // The claim check: the subject really must be the max, and the distribution really must be
  // uneven (top cell far above the median) — both measured, not assumed.
  if (!cells.every((c) => c.count <= subject.count))
    throw new Error("subject is not actually the densest cell");
  console.log(
    `densest cell: ${subject.count} events at pixel (${subject.cx.toFixed(0)}, ${subject.cy.toFixed(0)})`,
  );
  console.log(
    `claim: densest cell (${subject.count}) is ${ratio.toFixed(1)}x the median nonempty cell (${median}) — supported.`,
  );

  // Where the subject cell actually IS, in the real world — a render audit caught the alt text
  // naming "Indonesia, the Philippines and Japan" while the true densest cell (same 1374-event
  // count the alt text already quoted correctly) sits in the South Pacific near Tonga, ~169.6°W
  // 21°S; the Indonesia/Philippines cell is real but is the SECOND-densest (1371, three fewer),
  // not the subject. `frameCorners` (measured at bake time via `map.unproject`, not the nominal
  // `bounds` fitBounds was asked for — see bake-plate.mjs) makes this derivable instead of a
  // hand-typed place name that can silently point at the wrong cell.
  if (!geometry.frameCorners)
    throw new Error("plate geometry has no frameCorners — re-bake with the current bake-plate.mjs");
  const cellCentre = pixelToLonLat(subject.cx, subject.cy, geometry.frameCorners, geometry.frame);
  console.log(`densest cell's centre: ${cellCentre.lon.toFixed(1)}, ${cellCentre.lat.toFixed(1)}`);

  // ── And the NAME beside that coordinate, read out of the events themselves ──────────────────
  // The coordinate was already derived; the place name next to it was not, and the two disagreed:
  // the alt said "(the Tonga-Kermadec trench)" while this cell's own member events average 19.9°S,
  // 176.8°W and are catalogued by USGS as "Fiji region" and "south of the Fiji Islands" — roughly
  // 700 km west of the trench that was typed. Every cell now carries the regions ITS OWN events
  // are filed under, which is also what gives the accessible table the WHERE column it lacked.
  if (geometry.points.some((p) => p.i === undefined))
    throw new Error(
      "this plate predates the corrected bake (points carry no source index). Delete " +
        `${plateDir} and re-run, or bake directly with bake-plate.mjs.`,
    );
  const members = cellMembers(geometry.points, hexSize);
  const regionsOfCell = new Map(
    cells.map((cell) => [
      cell.key,
      dominantRegions(
        (members.get(cell.key) ?? []).map((i) => points[i].place),
        2,
      ),
    ]),
  );
  const whereOf = (key) =>
    (regionsOfCell.get(key) ?? []).map((r) => r.label).join(", ") || "—";
  const subjectWhere = whereOf(subject.key);

  // The coordinate the alt quotes is the MEAN POSITION OF THE CELL'S OWN EVENTS, not the cell's
  // geometric centre. The two differ here by ~700 km, because this cell sits hard against the
  // frame's west edge and half of its hexagon covers ocean the frame has already cut away — the
  // centre of an edge cell is not where its data is. Longitude is averaged CIRCULARLY: this
  // cluster straddles the antimeridian, and a plain mean of +179 and −179 is 0°, in Africa.
  const subjectMembers = (members.get(subject.key) ?? []).map((i) => points[i]);
  const meanLat =
    subjectMembers.reduce((sum, p) => sum + p.lat, 0) / subjectMembers.length;
  const meanLon =
    (Math.atan2(
      subjectMembers.reduce((sum, p) => sum + Math.sin((p.lon * Math.PI) / 180), 0),
      subjectMembers.reduce((sum, p) => sum + Math.cos((p.lon * Math.PI) / 180), 0),
    ) *
      180) /
    Math.PI;
  const subjectLatLabel = `${Math.abs(meanLat).toFixed(0)}°${meanLat < 0 ? "S" : "N"}`;
  const subjectLonLabel = `${Math.abs(meanLon).toFixed(0)}°${meanLon < 0 ? "W" : "E"}`;
  console.log(
    `densest cell's ${subjectMembers.length} events average ${meanLon.toFixed(1)}, ${meanLat.toFixed(1)} ` +
      `(the cell's own centre is ${cellCentre.lon.toFixed(1)}, ${cellCentre.lat.toFixed(1)})`,
  );
  console.log(
    `densest cell's own events are catalogued as: ` +
      regionsOfCell
        .get(subject.key)
        .map((r) => `${r.label} ${(r.share * 100).toFixed(0)}%`)
        .join(" · "),
  );

  const furniture = deriveFurniture(BEAT.ground);
  // THE SHADING IS THE DATA. Until 2026-08-10 this ramp ran ground -> furniture.ink — computed
  // between the background and the ink, so it never touched the recorded accent, and a newsroom
  // could change its house colour while this map stayed grey (`AUDIT-W2-palette-credits.md` H3).
  // `dataRampEnd` walks the accent toward the pole the ground is not; `assertRampReads` then
  // measures the finished classes: monotone, separated, top class above the 3:1 mark floor.
  const ramp = assertRampReads(
    sequentialRamp(
      BEAT.ground,
      dataRampEnd(BEAT.accent, BEAT.ground),
      breaks.length + 1,
      0.14,
      0.82,
    ),
    BEAT.ground,
    "the hex-density ramp",
  );

  // ── What this plate actually holds, and what it therefore leaves out ────────────────────────────
  // "The map holds 60°S–78°N" was typed. The corners MapLibre settled on are −64.478 / 79.847, so
  // the sentence was 4.5° short at the south and 1.8° short at the north — and it said nothing at
  // all about the events that fall outside the frame, under a source line reading "worldwide". Both
  // now come off the plate's own `frameCorners` and off the difference between the rows parsed and
  // the points the bake kept, the same way the sibling static beat `proof/map-quake-density` does
  // it. The number a reader checks and the number the picture drew are the same number.
  const { north, south } = geometry.frameCorners;
  const latRange =
    `${Math.abs(south).toFixed(0)}°${south < 0 ? "S" : "N"}–` +
    `${Math.abs(north).toFixed(0)}°${north < 0 ? "S" : "N"}`;
  const dropped = points.length - geometry.points.length;
  console.log(
    `plate ${geometry.frame.width}×${geometry.frame.height} holds ${latRange}; ` +
      `${dropped} of ${points.length} events fall outside it`,
  );

  const legendCaption = `${BEAT.legendCaption} — aggregate mode: ${BEAT.aggregateMode}`;
  const caveat =
    `This grid shades cells by COUNT of magnitude 4.0+ earthquakes, not by total energy released — a cell packed ` +
    `with many small quakes can outrank one with fewer, larger ones. Cell size (${hexSize.toFixed(0)}px) is chosen from ` +
    `point density and grows until the ${cells.length}-cell grid clears a fixed cap. The densest cell holds ` +
    `${ratio.toFixed(1)}× the median non-empty cell's count. The map holds ${latRange} (Mercator distorts ` +
    // The locale is NAMED, not inherited from whichever machine runs the render: this page declares
    // `lang="en"`, and a beat's numbers take their locale from the beat's own declared language.
    `the poles beyond usefulness at this scale), and ${dropped.toLocaleString("en-US")} of the ` +
    `${points.length.toLocaleString("en-US")} catalogued events fall outside it. The cells are binned once, at ` +
    `the camera this plate was baked at: zooming in enlarges them, it does not re-bin the data.`;
  const alt =
    `World map binned into a hexagonal grid, ${cells.length} non-empty cells. Cells are shaded by how many ` +
    `magnitude 4-or-greater earthquakes occurred there in 2024, from pale for a handful up to a dark cell in ` +
    `the South Pacific: its ${subject.count.toLocaleString()} events average ${subjectLatLabel}, ` +
    `${subjectLonLabel} and are catalogued as ${subjectWhere}. That cell is the single densest, ` +
    `${ratio.toFixed(1)}× the median non-empty cell, and is the one outlined in the accent colour.`;

  const plan = BEAT.live
    ? livePlan({
        geometry,
        cells,
        hexSize,
        breaks,
        ramp,
        subjectKey: subject.key,
        accent: BEAT.accent,
        ground: BEAT.ground,
        waterFill: BEAT.waterFill,
      })
    : null;
  if (plan) {
    const span = (a, b) => Math.abs(b - a).toFixed(2);
    console.log(
      `live plan: ${plan.layers.length} layers, ${plan.layers[0].data.features.length} bins, ` +
        `study ${plan.studyBounds.west.toFixed(2)}..${plan.studyBounds.east.toFixed(2)} lon ` +
        `(${span(plan.studyBounds.west, plan.studyBounds.east)}°), ` +
        `${plan.studyBounds.south.toFixed(2)}..${plan.studyBounds.north.toFixed(2)} lat`,
    );
    console.log(
      `leash: bake zoom ${plan.bakeZoom}, one cell is ${(hexSize * geometry.degreesPerPixel).toFixed(2)}° wide, ` +
        `minZoomHeadroom ${plan.minZoomHeadroom.toFixed(3)} zoom levels ` +
        `(frame-over-study derivation gives ${Math.max(0, Math.log2(Math.abs(geometry.frameCorners.east - geometry.frameCorners.west) / Math.abs(plan.studyBounds.east - plan.studyBounds.west))).toFixed(3)})`,
    );
  }

  const { outPath } = await renderHexGridWeb({
    component: HexGridWeb,
    table: DensityTable,
    props: {
      geometry,
      plate,
      cells,
      hexSize,
      breaks,
      ramp,
      subjectKey: subject.key,
      whereOf,
      title: BEAT.title,
      source: BEAT.source,
      basemapCredit: BEAT.basemapCredit,
      legendCaption,
      caveat,
      alt,
      ground: BEAT.ground,
      accent: BEAT.accent,
    },
    outDir,
    name,
    live: BEAT.live,
    plan,
  });
  return { outPath, cells: cells.length, ratio, points: points.length, csvRows };
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

  const { outPath, cells, ratio, points, csvRows } = await render({ dataPath, plateDir, outDir });
  console.log(
    `map-web hex-grid beat → ${outPath}  [${points} points from ${csvRows} csv rows, ${cells} nonempty cells, ${ratio.toFixed(1)}x densest/median]`,
  );
}

export {
  render,
  renderHexGridWeb,
  ensurePlate,
  loadPlate,
  BEAT,
  PLATE_WIDTH,
  PLATE_HEIGHT,
  DEFAULT_PLATE_DIR,
  DEFAULT_DATA_PATH,
};
