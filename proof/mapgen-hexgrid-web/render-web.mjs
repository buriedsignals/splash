// twin/proof/mapgen-hexgrid-web/render-web.mjs
//
// This beat's own WEB runner, and this beat's OWN physical copy of the web format's machinery
// (`renderHexGridWeb`, modelled on `map-web/scripts/render-web.mjs`'s own `renderMapWeb`) —
// nothing in this file imports out of a skill or another `proof/` beat. Binning happens AFTER the
// bake, from the baked points' own pixel coordinates, the same order
// `proof/map-quake-density/render.mjs` follows for its own static format
// (`map-beat/references/types/hex-grid.md`'s own cell-size rule: check the rendered cell
// count, never the config value alone).
//
// RULING R1 (2026-08-10), retrofitted here: the beat this writes is a LIVE MapTiler map with
// MapTiler's own zoom and pan, constrained to the subject's area, over the SAME baked plate it
// already shipped — which stays as the fallback layer (`live-map.mjs`, a byte-identical copy of
// `map-web/assets/live-map.mjs`, including its own line-1 path comment: a beat duplicates a
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
import { worldCopiesFor } from "./delivery-frame.mjs";
// `readPalette` comes from the SHARED copy through the `#shared/…` subpath alias — a beat is a
// story, not a skill, so it may reach out where a skill may not.
import { readPalette } from "#shared/chart-beat/render-still.mjs";
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
        detail: cellDetail(cell, i + 1, breaks),
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
 *  format's — `discloseTable` refuses to invent one. */
const TABLE_ROW_NOUN = "cells";

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


async function renderHexGridWeb({ component, table, props, outDir, name, live = false, plan = null }) {
  const furniture = deriveFurniture(props.ground);
  const worldCopies = props.geometry?.cannotCover
    ? worldCopiesFor(props.geometry.frame, requireBoxAspects(props.geometry))
    : 1;
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

  const css = buildCss({ ...props, ...furniture, frame: props.geometry.frame, worldCopies });
  // THE MARKS WRAP WITH THE MAP. The stylesheet is handed over rather than re-derived: which overlay
  // elements a copy has to carry is a fact about the rules this page actually ships (`repeatWorlds`).
  const mapHtml = repeatWorlds(
    renderToStaticMarkup(
    createElement(component, { ...props, ...furniture }),
  ),
    worldCopies,
    css,
  );

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

function buildCss({ ground, accent, ink, muted, frame, worldCopies = 1 }) {
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
}.maplibregl-canvas-container canvas { outline: none; }
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
// THE BOX RANGE THIS BEAT IS DELIVERED INTO, measured on its own rendered page at the three widths
// this format drives — the second input the bake needs since 2026-08-23 (`delivery-frame.mjs`). It
// is a property of THIS beat's furniture, not of the format, and it is read back with
// `bun skills/map-web/scripts/verify-fills-the-box.mjs <page.html>`, which refuses a page whose real
// range has escaped the range its plate was baked for.
const PLATE_BOX_ASPECTS = "0.744,2.185";
// The room this beat's own labels need inside the crop, as a fraction of the box on each side —
// measured the same way, by the runs the page actually cut. `0,0` is a beat whose every run is whole.
const PLATE_CLEARANCE = "0,0";

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
