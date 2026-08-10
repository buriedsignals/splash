// The runner for the MAP scrolly beat: one year of earthquakes, one baked camera, FOUR different
// maps — raw dots, hexagons by count, proportional symbols for the largest events, and the same
// hexagons by their strongest event.
//
// This file is a CONSUMER of `twin-scrolly`: it imports the skill's own generic `renderScrolly`
// (the media-agnostic scaffold above its CONFIG marker) and builds its own `steps` array from its
// own frame components (`MapFrames.tsx`). Nothing under `twin-scrolly/` is edited by it.
//
// WHY THIS EARNS THE SCROLL. The vehicle's own rule is that a scrolly earns its keep by carrying
// media a single beat cannot assemble, and refuses "the same picture, stepped". Every step here is
// a DIFFERENT MAP of one dataset — a different encoding, a different question, a different answer —
// over one fixed camera that never moves, so the reader's eye stays on the same world while what is
// drawn on it changes. `mapmore-scrolly-danube`, the only map scrolly this project had, steps ONE
// encoding through a growing subset; this one steps four encodings through the same complete set.
//
// Usage:
//   bun proof/mapscrolly-quakes-three-ways/render.mjs [outDir]

import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement, Fragment } from "react";
import {
  deriveFurniture,
  readPalette,
} from "#shared/twin-chart-beat/render-still.mjs";
import {
  parseCsv,
  quakePointsFromCsv,
  sequentialRamp,
} from "./geo-hex.ts";
import {
  deriveQuakeFacts,
  cellLonLat,
  ordinal,
} from "./quake-encodings.ts";
import {
  DotFrame,
  HexCountFrame,
  SymbolFrame,
  HexStrengthFrame,
} from "./MapFrames.tsx";
import { renderScrolly } from "../../skills/twin-scrolly/scripts/render-scrolly.mjs";
import { WATER_FILL, keyPlaceholder } from "./live-scroll-map.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
// Resolved through node's own module resolution, never by a relative path out of this beat —
// `no-cross-skill-imports.test.ts` reads path STRINGS, and `../../../node_modules/...` reads to it
// (correctly) as a specifier leaving the beat.
const requireFrom = createRequire(import.meta.url);
const MAPLIBRE_JS = requireFrom.resolve("maplibre-gl/dist/maplibre-gl.js");
const MAPLIBRE_CSS = requireFrom.resolve("maplibre-gl/dist/maplibre-gl.css");

/**
 * WHETHER THE WORLD REPEATS BEYOND THE PLATE'S OWN EDGES. It is `true` — MapLibre's own default —
 * and both halves of that answer were DRIVEN rather than reasoned. The full account, with the two
 * measurements, is in `live-scroll-map.mjs`'s `syncWorldRepeats`; in one paragraph:
 *
 * The plate is the whole world, so the contain fit leaves about 150px of slack down each side of a
 * 1600px frame. Turning the repeat OFF looked like the tidy answer and is a trap: MapLibre will not
 * show anything past the world's edge, so it silently CONSTRAINS the camera — the live layer asked
 * for zoom 1.340 and got 1.644, putting the tiles 150px out of register with 14,057 marks that a
 * settled screenshot reads as fine. Leaving the repeat ON and leaving the marks alone is the other
 * trap: the bands fill with a second, EMPTY Japan, Kamchatka, Australia and Americas beside a
 * paragraph counting every event on them.
 *
 * So the repeat stays on and `syncWorldRepeats` draws the marks once per visible world copy, which
 * is what MapLibre already does for its own data layers. What fills the frame edge to edge is the
 * live map; what fills it with LAND is the world, as many times as it fits; and every copy carries
 * the same dots.
 */
const RENDER_WORLD_COPIES = true;

// The colours come from the answer recorded in PALETTE.md beside this beat — never a hex here.
const {
  ground,
  accent,
  origin,
  source: paletteSource,
} = readPalette(HERE, { stopAt: join(HERE, "..") });
const furniture = deriveFurniture(ground);

const argv = process.argv.slice(2);
const outDir = resolve(
  argv.find((a) => !a.startsWith("--")) ?? join(HERE, "render"),
);

/** The one magnitude the symbol step draws down to. A knob, stated in the brief. */
const BIG_THRESHOLD = 6.5;
/** The largest circle the symbol step draws, in PLATE pixels (the plate is 836 wide). */
const MAX_SYMBOL_RADIUS = 26;
/**
 * The ends of both hex ramps, as a fraction of ground → ink. The sibling hex beat measured 0.14 for
 * a page-sized figure; a scrolly frame is the whole viewport and its lowest class has to stay
 * readable as a CELL against a basemap it now covers edge to edge, so the low end is lifted and the
 * high end pushed. Looked at, not reasoned: at 0.14/0.82 the lightest half of the field washed the
 * coastlines out without reading as data.
 */
const RAMP_ENDS = { from: 0.22, to: 0.94 };

// The page `renderScrolly` writes declares `lang="en"`, so the grouping separator is the English
// one — and it comes from `Intl`, never from a hand-rolled regex.
const group = new Intl.NumberFormat("en-US").format;
const one = (v) => v.toFixed(1);

function legendLabels(breaks, maxValue, fmt) {
  return [...breaks.map(fmt), fmt(maxValue)];
}

async function render() {
  const csv = await readFile(join(HERE, "quakes-density.csv"), "utf8");
  const quakes = quakePointsFromCsv(csv);

  // The catalogue's own year, read off the timestamps rather than taken from the file's name.
  const rows = parseCsv(csv);
  const timeColumn = rows[0].indexOf("time");
  if (timeColumn < 0)
    throw new Error("quakes-density.csv has no `time` column to read the year from");
  const years = [
    ...new Set(rows.slice(1).map((r) => r[timeColumn]?.slice(0, 4)).filter(Boolean)),
  ];
  if (years.length !== 1)
    throw new Error(
      `this beat says "one year of earthquakes"; the catalogue spans ${years.sort().join(", ")}`,
    );
  const year = years[0];

  const geometry = JSON.parse(
    await readFile(join(HERE, "plate", "geometry.json"), "utf8"),
  );
  const plateBuffer = await readFile(join(HERE, "plate", "plate.png"));
  const plate = `data:image/png;base64,${plateBuffer.toString("base64")}`;

  const points = geometry.points.map((p) => ({ px: p.px, py: p.py, i: p.i }));
  const facts = deriveQuakeFacts({
    quakes,
    points,
    frame: geometry.frame,
    corners: geometry.frameCorners,
    bigThreshold: BIG_THRESHOLD,
  });

  // One ramp language for BOTH hex frames, on purpose: same cells, same shading grammar, different
  // variable — which is what makes the change between step 2 and step 4 legible as a change in the
  // DATA rather than a change in the chart. Ground → ink, the one legitimate gradient on a map;
  // the accent is kept for the rings the prose names.
  const countRamp = sequentialRamp(
    ground,
    furniture.ink,
    facts.countBreaks.length + 1,
    RAMP_ENDS.from,
    RAMP_ENDS.to,
  );
  const magRamp = sequentialRamp(
    ground,
    furniture.ink,
    facts.magBreaks.length + 1,
    RAMP_ENDS.from,
    RAMP_ENDS.to,
  );

  const shared = { ground, ink: furniture.ink, muted: furniture.muted, accent };
  const busiest = facts.busiest.cell;
  const strongestCell = facts.strongest.cell;

  // ── The live MapTiler layer (ruling R1, extended to the scrolly 2026-08-10) ───────────────────
  //
  // The style URL carries the PLACEHOLDER, never a key (R1b): this file is committed, the release
  // is open source, and a pushed key is scanned within minutes and survives in the history.
  // `twin-deliver` substitutes at delivery.
  //
  // The camera is NOT in this plan, and that is the difference from the carbon beat's own. There
  // the four cameras are authored, so they are resolved in node and shipped. Here there is one
  // camera and it is the contain fit of the plate into the box the READER's viewport gives the
  // graphic — a number that does not exist until the page is open. `live-scroll-map.mjs` computes
  // it in the browser from the three plate facts below, and recomputes it on resize.
  const livePlan = {
    styleUrl: `https://api.maptiler.com/maps/${geometry.style}/style.json?key=${keyPlaceholder()}`,
    waterFill: WATER_FILL,
    // The newsroom's own ground, painted outside the world by the live style's background layer —
    // the same letterbox the fallback plate draws. See `RENDER_WORLD_COPIES` above.
    ground,
    renderWorldCopies: RENDER_WORLD_COPIES,
    // The WARM, as a switch rather than a list: with a fixed camera there is exactly one position
    // to warm, and it is only knowable in the browser. `verify-live-tiles.mjs --no-warm` flips this
    // one boolean to measure the same page without the mitigation, which is the only way its
    // number means anything.
    warm: true,
    // Only the camera facts the live layer needs — the 14,057 dots, the 156 hexagons and the 28
    // circles stay where they are, in the SVG this beat already draws, and are never re-projected.
    geometry: {
      frame: geometry.frame,
      frameCorners: geometry.frameCorners,
      worldWidthPx: geometry.worldWidthPx,
    },
  };

  const liveSource = await readFile(join(HERE, "live-scroll-map.mjs"), "utf8");
  const maplibreJs = await readFile(MAPLIBRE_JS, "utf8");
  const maplibreCss = await readFile(MAPLIBRE_CSS, "utf8");
  const boot =
    liveSource.replace(/^export /gm, "") +
    `\n;(function () {\n` +
    `  if (window.__quakesLiveStarted) return;\n` +
    `  window.__quakesLiveStarted = true;\n` +
    // The script sits inside the GRAPHIC, which the scaffold emits before the prose column, so the
    // stack it has to reach into may not be parsed yet when this tag runs.
    `  function boot() {\n` +
    // `.scrolly-graphic` is the vehicle's own box, and the live map belongs to the GRAPHIC rather
    // than to any one step: the four `.step-frame` wrappers this beat fills are faded against each
    // other by the scaffold, and a map inside one of them would blink out with it.
    `    var graphic = document.querySelector(".scrolly-graphic");\n` +
    `    if (!graphic) return;\n` +
    `    var live = initLiveQuakeMap(graphic, ${JSON.stringify(livePlan)}, {});\n` +
    `    if (!live) return;\n` +
    // A resize changes the contain fit, which changes the camera. Debounced, because a drag of a
    // window edge fires this dozens of times a second and each one is a jumpTo plus a tile round.
    `    var pending = null;\n` +
    `    window.addEventListener("resize", function () {\n` +
    `      if (pending) window.clearTimeout(pending);\n` +
    `      pending = window.setTimeout(function () { live.point(); }, 120);\n` +
    `    });\n` +
    `  }\n` +
    `  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);\n` +
    `  else boot();\n` +
    `})();\n`;

  const steps = [
    {
      id: "events",
      prose: [
        `Every earthquake of magnitude ${one(facts.minMag)} and above the USGS catalogued in ${year}: ${group(facts.onFrame)} of them, one dot each. Nobody drew the plate boundaries — the dots did. What dots cannot do is let you count: on the busiest rims, hundreds sit on top of one another.`,
      ],
      frame: createElement(
        Fragment,
        null,
        createElement(DotFrame, {
          ...shared,
          plate,
          frame: geometry.frame,
          points,
          // The first frame carries the live plumbing for all four: the container, the one
          // stylesheet, and the boot below. There is ONE map on this page and it sits under the
          // whole stack.
          live: true,
        }),
        // maplibre-gl INLINED rather than loaded from a CDN: a `<script src>` would trade payload
        // for a SECOND third-party host, and this file's whole request budget is one host —
        // api.maptiler.com. Measured cost of the ruling, stated rather than discovered: ~803 KB of
        // JS and ~65 KB of CSS on top of the plate this page already carries.
        createElement("style", { dangerouslySetInnerHTML: { __html: maplibreCss } }),
        createElement("script", { dangerouslySetInnerHTML: { __html: maplibreJs } }),
        createElement("script", { dangerouslySetInnerHTML: { __html: boot } }),
      ),
    },
    {
      id: "bins",
      prose: [
        `Binned into ${facts.cells.length} equal hexagons, the pile-up becomes countable — and it is more concentrated than the dots let you guess: ${facts.cellsHoldingHalf} of the ${facts.cells.length} cells hold half of all ${group(facts.onFrame)} events. The busiest, ringed, holds ${group(busiest.count)}, off ${facts.busiest.regions}.`,
      ],
      frame: createElement(HexCountFrame, {
        ...shared,
        plate,
        frame: geometry.frame,
        facts,
        ramp: countRamp,
        legendLabels: legendLabels(facts.countBreaks, busiest.count, group),
        ringed: [busiest],
      }),
    },
    {
      id: "biggest",
      prose: [
        `How many is not how strong. Only ${facts.bigEvents.length} of the year's earthquakes reached magnitude ${one(BIG_THRESHOLD)}, and sized by the energy that implies they pick out different coasts. The largest, magnitude ${one(facts.maxMag)}: the ${facts.strongestEvent.place}.`,
      ],
      frame: createElement(SymbolFrame, {
        ...shared,
        plate,
        frame: geometry.frame,
        facts,
        maxRadius: MAX_SYMBOL_RADIUS,
      }),
    },
    {
      id: "strength",
      prose: [
        `Shade the same ${facts.cells.length} hexagons by their strongest event instead of their count and the ring moves: the cell holding that magnitude ${one(facts.maxMag)}, off ${facts.strongest.regions}, is only the ${ordinal(facts.strongest.rankByCount)} busiest of the year — ${group(strongestCell.count)} events against the leader's ${group(busiest.count)}.`,
      ],
      frame: createElement(HexStrengthFrame, {
        ...shared,
        plate,
        frame: geometry.frame,
        facts,
        ramp: magRamp,
        legendLabels: legendLabels(facts.magBreaks, facts.maxMag, one),
        // ONE ring per frame, and this is the beat's own scroll affordance: between step 2 and
        // step 4 the ring JUMPS, on a camera that never moves, from the cell with the most events
        // to the cell with the strongest one. Ringing both here would leave the paragraph's own
        // word "ring" ambiguous — which is the defect this project logged against a sibling hex
        // beat, a highlighted hexagon with nothing said about it.
        ringed: [strongestCell],
      }),
    },
  ];

  const title = `The same ${group(facts.onFrame)} earthquakes, four maps, four different answers`;
  const source =
    `Earthquakes of magnitude ${one(facts.minMag)} and above, worldwide, ${year}: USGS Earthquake Catalog ` +
    // Kept SHORT on purpose: the header never scrolls away under the fixed-page model, so every
    // word costs graphic height at every scroll position — measured at 375×812, where a longer
    // draft of this line took 250px of 812.
    `(earthquake.usgs.gov). Basemap: live MapTiler ${geometry.style} tiles, with the ` +
    `${geometry.frame.width}×${geometry.frame.height} capture frozen beside this beat as the no-network ` +
    `fallback. © MapTiler © OpenStreetMap contributors. ` +
    `${group(facts.offFrame)} of the ${group(facts.catalogued)} catalogued events fall poleward of this frame ` +
    `(${Math.abs(Math.round(facts.latRange.south))}°S–${Math.round(facts.latRange.north)}°N) and are not drawn. ` +
    `Colours recorded in ${paletteSource.slice(paletteSource.lastIndexOf("/") + 1)} by the ${origin}.`;

  const { outPath, panelContrast } = await renderScrolly({
    steps,
    title,
    source,
    ground,
    outDir,
    name: "quakes-four-maps.html",
  });

  const busiestAt = cellLonLat(busiest, geometry.frameCorners, geometry.frame);
  const strongestAt = cellLonLat(
    strongestCell,
    geometry.frameCorners,
    geometry.frame,
  );
  console.log(
    `map-scrolly → ${outPath}  [${steps.length} steps, ${group(facts.onFrame)}/${group(facts.catalogued)} on frame, ` +
      `${facts.cells.length} cells at size ${facts.hexSize.toFixed(2)}, panel contrast ${panelContrast.toFixed(2)}:1]\n` +
      `  busiest ${group(busiest.count)} (${facts.busiest.regions}) at ${busiestAt.lat.toFixed(1)}, ${busiestAt.lon.toFixed(1)} — margin over second ${facts.busiest.marginOverSecond}\n` +
      `  strongest M${one(facts.maxMag)} (${facts.strongest.regions}) at ${strongestAt.lat.toFixed(1)}, ${strongestAt.lon.toFixed(1)} — rank by count ${facts.strongest.rankByCount}, ${group(strongestCell.count)} events\n` +
      `  count breaks ${facts.countBreaks.join(", ")} · magnitude breaks ${facts.magBreaks.map(one).join(", ")} · ${facts.bigEvents.length} events at M${one(BIG_THRESHOLD)}+\n` +
      `  live basemap: ${livePlan.styleUrl.replace(keyPlaceholder(), "<key>")}, world copies ${RENDER_WORLD_COPIES}, ` +
      `camera = the contain fit of the ${geometry.frame.width}×${geometry.frame.height} plate, computed in the browser`,
  );
  return { outPath };
}

if (import.meta.main) await render();

export { render };
