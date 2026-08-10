// THE RUNNER FOR THE MIXED SCROLLY — three media in one story, and the scroll drives both which one
// holds the screen and where the reader is INSIDE it.
//
// This file is a CONSUMER of `twin-scrolly`: it imports the skill's own generic `renderScrolly` (the
// media-agnostic scaffold above its CONFIG marker) and hands it steps. Nothing under
// `twin-scrolly/` is edited by it.
//
// THE ARC, and why each medium is here rather than the other two:
//
//   0-1  FOUR PHOTOGRAPHS from one summit, 1938 to 2009. Only a photograph can show that the floor
//        of a basin became a lake. No chart states that and no map does.
//   2-3  A MAP, live MapTiler, the camera flying from the whole park onto the cirque. Only a map can
//        say where this is and how big it is: the photograph has no scale and no location, and the
//        chart has no place at all. It also shows the ridge all four photographs were taken from,
//        which is what makes them comparable in the first place.
//   4-6  A CHART of the world's reference glaciers, 1956-2023, navigated: the run the photographs
//        cover lifted, then both axes closing on the last quarter-century. Only the chart can say
//        whether Grinnell is an anecdote, and only the chart can show a RATE — which is the thing
//        four photographs, however clear, cannot.
//
// Usage:
//   bun proof/scrolly-mixed-grinnell-ice/render.mjs [outDir]

import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement, Fragment } from "react";
import { deriveFurniture, readPalette } from "#shared/twin-chart-beat/render-still.mjs";
import { renderScrolly } from "../../skills/twin-scrolly/scripts/render-scrolly.mjs";
import { MixedFrame, SSR_FRAME, creditForState } from "./MixedFrame.tsx";
import {
  PROSE_LANE,
  REF_WORLD,
  assertNumericStates,
  mercatorY,
  normX,
  normY,
  resolveCamera,
  stateAt,
} from "./compose.mjs";
import { keyPlaceholder, warmPositions } from "./live-scroll-map.mjs";
import { RATE_WINDOW, deriveFacts, parseBalance, readGeography, readPhotographs, t1, t2 } from "./ice-data.ts";
import { creditFor } from "./ice-data.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const requireFrom = createRequire(import.meta.url);
const MAPLIBRE_JS = requireFrom.resolve("maplibre-gl/dist/maplibre-gl.js");
const MAPLIBRE_CSS = requireFrom.resolve("maplibre-gl/dist/maplibre-gl.css");

// The colours come from the answer recorded in PALETTE.md beside this beat — never a hex written
// here. `stopAt` is an input SEARCH BOUNDARY: a beat with no recorded answer throws instead of
// quietly inheriting a neighbour's.
const { ground, accent, origin: paletteOrigin, source: paletteSource } = readPalette(HERE, { stopAt: join(HERE, "..") });
const furniture = deriveFurniture(ground);

const argv = process.argv.slice(2);
const outDir = resolve(argv.find((a) => !a.startsWith("--")) ?? join(HERE, "render"));

/** The MapTiler style. A topographic style rather than the `dataviz` one the choropleth siblings
 *  use: this map's argument is TERRAIN — a cirque under a ridge, near the crest of the continent —
 *  and a flat administrative basemap would show a boundary and an empty rectangle. */
const MAP_STYLE = "topo-v2";

/** The frame the warm and the SSR are resolved against. Nothing is fixed to it — the driver
 *  re-resolves against the real box on its first painted frame — but the warm has to ask for tiles
 *  at SOME size, and a container 20% wider asks for the same tiles plus an edge. */
const WARM_FRAME = { width: 1600, height: 900 };

/** How many camera positions each leg of the map's own stretch contributes to the warm. Four means
 *  each leg is warmed at its start and at three interior positions — the zooms a reader passes
 *  through mid-flight, which is where a cold cache would show. */
const WARM_SAMPLES_PER_LEG = 4;

/** The steps the map is on screen for, as positions on the piece. Only these are warmed: warming a
 *  camera the reader never sees at a moment the map is transparent spends a newsroom's quota on
 *  nothing. */
const MAP_FROM = 1;
const MAP_TO = 4;

/**
 * The seven composition states the scroll drives between.
 *
 * ONE RECORD, three media. `photoOpacity` / `mapOpacity` / `chartOpacity` are fields of the same
 * state as `x0` and `mapLon`, so the handover from one medium to the next is not a mechanism — it is
 * the same interpolation, on three more numbers. That is the whole of the owner's *"la navigation se
 * fait au scroll, c'est une sorte de mix de tout"*: at any fractional position the entire composition
 * is defined, and there is nothing that can arrive half a step from its own sentence.
 *
 * Every number is derived from a frozen file. The paddings and the camera's own framing are the only
 * shape decisions, and they are written as multiples of the extent they pad.
 */
function buildStates(facts, geo, series) {
  const lo = Math.min(...series.map((r) => r.value));
  const hi = Math.max(...series.map((r) => r.value));
  const pad = (hi - lo) * 0.08;
  const full = { x0: facts.balanceFrom, x1: facts.balanceTo, y0: lo - pad, y1: hi + pad };

  const window = series.filter((r) => r.year >= facts.lateFrom);
  const wLo = Math.min(...window.map((r) => r.value));
  const wHi = Math.max(...window.map((r) => r.value));
  const wPad = (wHi - wLo) * 0.22;
  const late = { x0: facts.lateFrom, x1: facts.balanceTo, y0: wLo - wPad, y1: wHi + wPad };

  // The chart ARRIVES by closing in, so the state it holds while it is still invisible is a wider
  // version of the record rather than the record itself. Between step 3 and step 4 the reader
  // watches both axes travel INTO the picture as it fades up — the medium change and the navigation
  // inside the new medium are the same gesture.
  const approachChart = {
    x0: full.x0 - 14,
    x1: full.x1 + 5,
    y0: full.y0 - (full.y1 - full.y0) * 0.35,
    y1: full.y1 + (full.y1 - full.y0) * 0.35,
  };

  // ── the cameras ────────────────────────────────────────────────────────────────────────────
  const park = geo.park.bbox;
  const parkCamera = {
    mapLon: (park.west + park.east) / 2,
    mapMercY: (mercatorY(park.south) + mercatorY(park.north)) / 2,
    mapLogSpanLon: Math.log((park.east - park.west) * 1.12),
    mapLogSpanMerc: Math.log((mercatorY(park.north) - mercatorY(park.south)) * 1.12),
    mapFit: 0,
  };
  // The close camera has to hold BOTH marked places — the glacier and the ridge the photographs were
  // taken from — because the sentence over it names the distance between them.
  const west = Math.min(geo.glacier.bbox.west, geo.viewpoint.at[0]);
  const east = Math.max(geo.glacier.bbox.east, geo.viewpoint.at[0]);
  const south = Math.min(geo.glacier.bbox.south, geo.viewpoint.at[1]);
  const north = Math.max(geo.glacier.bbox.north, geo.viewpoint.at[1]);
  const cirqueCamera = {
    mapLon: (west + east) / 2,
    mapMercY: (mercatorY(south) + mercatorY(north)) / 2,
    mapLogSpanLon: Math.log((east - west) * 1.7),
    mapLogSpanMerc: Math.log((mercatorY(north) - mercatorY(south)) * 1.7),
    mapFit: 0.5,
  };
  const widen = (camera, factor, fit) => ({
    ...camera,
    mapLogSpanLon: camera.mapLogSpanLon + Math.log(factor),
    mapLogSpanMerc: camera.mapLogSpanMerc + Math.log(factor),
    mapFit: fit === undefined ? camera.mapFit : fit,
  });

  const last = facts.spanTo;
  return assertNumericStates([
    // 0 — the first photograph, alone.
    {
      photoAt: 0,
      photoOpacity: 1,
      ...widen(parkCamera, 5),
      mapOpacity: 0,
      markViewpoint: 0,
      markGlacier: 0,
      ...approachChart,
      hiFrom: last,
      hiTo: last,
      hiOpacity: 0,
      markA: 0,
      markB: 0,
      chartOpacity: 0,
    },
    // 1 — the sequence runs to the last photograph. The camera is already closing while the map is
    //     still transparent, so it does not START moving at the handover.
    {
      photoAt: 3,
      photoOpacity: 1,
      ...widen(parkCamera, 3.5),
      mapOpacity: 0,
      markViewpoint: 0,
      markGlacier: 0,
      ...approachChart,
      hiFrom: last,
      hiTo: last,
      hiOpacity: 0,
      markA: 0,
      markB: 0,
      chartOpacity: 0,
    },
    // 2 — the park, whole. The photograph has gone and the map has arrived on the same leg.
    {
      photoAt: 3,
      photoOpacity: 0,
      ...parkCamera,
      mapOpacity: 1,
      markViewpoint: 0,
      markGlacier: 1,
      ...approachChart,
      hiFrom: last,
      hiTo: last,
      hiOpacity: 0,
      markA: 0,
      markB: 0,
      chartOpacity: 0,
    },
    // 3 — onto the cirque; the ridge the photographs were taken from arrives with it.
    {
      photoAt: 3,
      photoOpacity: 0,
      ...cirqueCamera,
      mapOpacity: 1,
      markViewpoint: 1,
      markGlacier: 1,
      ...approachChart,
      hiFrom: last,
      hiTo: last,
      hiOpacity: 0,
      markA: 0,
      markB: 0,
      chartOpacity: 0,
    },
    // 4 — the record. The camera pulls BACK as it fades, so the map leaves in motion rather than
    //     switching off, and the chart's axes are already travelling in.
    {
      photoAt: 3,
      photoOpacity: 0,
      ...widen(cirqueCamera, 2.4, 0.25),
      mapOpacity: 0,
      markViewpoint: 0,
      markGlacier: 0,
      ...full,
      hiFrom: last,
      hiTo: last,
      hiOpacity: 0,
      markA: 0,
      markB: 0,
      chartOpacity: 1,
    },
    // 5 — the stretch the photographs cover, lifted. The accent DRAWS ITSELF backwards along the
    //     record from a run of zero length, and the mark arrives with it.
    {
      photoAt: 3,
      photoOpacity: 0,
      ...widen(cirqueCamera, 2.4, 0.25),
      mapOpacity: 0,
      markViewpoint: 0,
      markGlacier: 0,
      ...full,
      hiFrom: facts.spanFrom,
      hiTo: facts.spanTo,
      hiOpacity: 1,
      markA: 1,
      markB: 0,
      chartOpacity: 1,
    },
    // 6 — both axes close on the last quarter-century, and the highlighted run travels with them.
    {
      photoAt: 3,
      photoOpacity: 0,
      ...widen(cirqueCamera, 2.4, 0.25),
      mapOpacity: 0,
      markViewpoint: 0,
      markGlacier: 0,
      ...late,
      hiFrom: facts.lateFrom,
      hiTo: facts.balanceTo,
      hiOpacity: 1,
      markA: 0,
      markB: 1,
      chartOpacity: 1,
    },
  ]);
}

/** A ring list → one SVG path, written ONCE at the reference zoom relative to the overlay's own
 *  origin. Re-serialising a 2,081-point outline on every animation frame is what projecting per
 *  frame would cost; the camera moves it with a transform instead. */
function pathFor(rings, origin) {
  return rings
    .map(
      (ring) =>
        "M" +
        ring
          .map(
            ([lon, lat]) =>
              `${((normX(lon) - origin.nx) * REF_WORLD).toFixed(1)},${((normY(mercatorY(lat)) - origin.ny) * REF_WORLD).toFixed(1)}`,
          )
          .join("L") +
        "Z",
    )
    .join(" ");
}

function buildSteps(facts) {
  const gaps = facts.sequence.gaps;
  const gapList = gaps.slice(0, -1).join(", ") + ` and ${gaps[gaps.length - 1]}`;
  const years = facts.sequence.frames;
  return [
    {
      id: "ice-1938",
      prose: [
        `${facts.viewpointName}, ${facts.sequence.firstYear}. The camera is on the summit; below it the floor of the ` +
          `basin is ice, and there is no lake. ${years} photographs were made from this one place between ` +
          `${facts.sequence.firstYear} and ${facts.sequence.lastYear} — ${facts.sequence.spanYears} years.`,
      ],
    },
    {
      id: "ice-2009",
      prose: [
        `Scroll through them. The gaps are uneven — ${gapList} years — and by ${facts.sequence.lastYear} the floor of ` +
          `the basin is water with ice floating on it. The rail top left is where you are in the ${facts.sequence.spanYears} years.`,
      ],
    },
    {
      id: "where-park",
      prose: [
        `Where this is. ${facts.parkName}, on the crest of the continent, ${Math.round(facts.parkWidthKm)} kilometres ` +
          `across at its widest. The basin you have been looking at is one cirque inside it.`,
      ],
    },
    {
      id: "where-cirque",
      prose: [
        `Closer. ${facts.glacierName}'s own outline is ${t1(facts.glacierWidthKm)} km across — ` +
          `${t1(facts.glacierShareOfPark * 100)}% of the park's width — and the summit all ${years} photographs were ` +
          `taken from stands ${t1(facts.viewpointDistanceKm)} km away, on the ridge above it.`,
      ],
    },
    {
      id: "record",
      prose: [
        `Is one basin having a bad century? The world's reference glaciers answer that: cumulative mass balance, ` +
          `${facts.balanceFrom} to ${facts.balanceTo}, ${facts.observationsLastYear} glaciers measured in the last year. ` +
          `The average one is ${t1(Math.abs(facts.balanceTotal))} metres of water thinner than when the record opened.`,
      ],
    },
    {
      id: "photo-span",
      prose: [
        `The stretch the photographs cover, lifted: between ${facts.spanFrom} and ${facts.spanTo} — the second frame ` +
          `and the last — the reference glaciers lost ${t1(facts.spanLoss)} metres. The first photograph, ` +
          `${facts.sequence.firstYear}, is ${facts.balanceFrom - facts.sequence.firstYear} years older than the record.`,
      ],
    },
    {
      id: "rate",
      prose: [
        `Now both axes close on the last ${RATE_WINDOW} years. ${facts.lateFrom} to ${facts.balanceTo}: ` +
          `${t2(Math.abs(facts.lateRate))} metres per decade, against ${t2(Math.abs(facts.earlyRate))} over the ` +
          `record's first ${RATE_WINDOW}. ${t1(facts.rateRatio)} times faster — and a rate is the one thing ` +
          `${years} photographs, however clear, cannot show you.`,
      ],
    },
  ];
}

async function render() {
  const photographs = readPhotographs(await readFile(join(HERE, "photographs.csv"), "utf8"));
  const series = parseBalance(await readFile(join(HERE, "reference-glaciers.csv"), "utf8"));
  const geo = readGeography(await readFile(join(HERE, "geography.geojson"), "utf8"));
  const facts = deriveFacts(photographs, series, geo);

  // The three claims this beat's own steps rest on, asserted against the data rather than trusted.
  // If a re-freeze moved any of them the run stops here rather than shipping a sentence the picture
  // contradicts.
  if (!(facts.lateRate < facts.earlyRate))
    throw new Error("the last quarter-century is not losing faster than the first; step 7's comparison would be false");
  if (!(facts.glacierWidthKm < facts.parkWidthKm))
    throw new Error("the glacier's outline is not smaller than the park's; step 4's comparison would be false");
  if (!(facts.spanFrom > facts.sequence.firstYear))
    throw new Error(
      "the measured series starts at or before the first photograph; step 6 says the first photograph is older than the record",
    );

  const states = buildStates(facts, geo, series);
  const steps = buildSteps(facts);

  // ── the vector overlay: the beat's own drawn geography, written once at the reference zoom ────
  const overlayOrigin = { nx: normX(geo.park.bbox.west), ny: normY(mercatorY(geo.park.bbox.north)) };
  const shapes = [
    { key: "park", d: pathFor(geo.park.rings, overlayOrigin) },
    { key: "glacier", d: pathFor(geo.glacier.rings, overlayOrigin) },
  ];
  /** Screen widths, in delivered pixels. The driver divides them by the camera's own scale on every
   *  frame; a constant `stroke-width` under a CSS-transformed camera is a line whose weight changes
   *  by 35× across this beat's own flight. */
  const strokes = { park: 1.6, glacier: 3 };

  const marks = [
    { key: "viewpoint", at: geo.viewpoint.at, label: `${facts.viewpointName} — the camera` },
    { key: "glacier", at: geo.glacier.centre, label: `${facts.glacierName} · ${t1(facts.glacierWidthKm)} km across` },
  ];

  // ── the photographs, inlined ──────────────────────────────────────────────────────────────────
  const photos = await Promise.all(
    photographs.map(async (p) => ({
      year: p.year,
      src: `data:image/jpeg;base64,${(await readFile(join(HERE, p.deliveredFile))).toString("base64")}`,
    })),
  );
  const photoAspect = facts.sequence.box.width / facts.sequence.box.height;

  const marksChart = [
    { year: facts.spanTo, label: `${facts.spanTo}: −${t1(Math.abs(series.find((r) => r.year === facts.spanTo).value))} m` },
    { year: facts.balanceTo, label: `${facts.balanceTo}: −${t1(Math.abs(facts.balanceTotal))} m` },
  ];

  const credits = {
    photo: photographs.map((p) => creditFor(p)),
    map: `Outlines © OpenStreetMap · basemap © MapTiler`,
    chart: `Reference glaciers, cumulative mass balance · WGMS via US EPA`,
  };

  const config = {
    photoAspect,
    photoYears: photographs.map((p) => p.year),
    readings: series.map((r) => ({ year: r.year, value: r.value })),
    marksChart,
    origin: overlayOrigin,
    marks,
    credits,
    strokes,
    lift: 18,
  };

  const visual = createElement(MixedFrame, {
    photos,
    photoAspect,
    photoYears: config.photoYears,
    readings: config.readings,
    marksChart,
    chartUnit: `metres of water equivalent, cumulative since ${facts.balanceFrom}`,
    shapes,
    strokes,
    origin: overlayOrigin,
    marks,
    state: states[0],
    credit: creditForState(states[0], credits, photos.length),
    ground,
    ink: furniture.ink,
    muted: furniture.muted,
    accent,
  });

  // ── the live MapTiler layer (ruling R1, extended to the scrolly 2026-08-10) ────────────────────
  //
  // The style URL carries the PLACEHOLDER, never a key (R1b): this file is committed, the release is
  // open source, and a pushed key is scanned within minutes and survives in the history.
  // `twin-deliver` substitutes at delivery; `verify-live-tiles.mjs` beside this beat substitutes
  // into a copy outside the tree to prove the layer is real.
  const warmViews = warmPositions(MAP_FROM, MAP_TO, WARM_SAMPLES_PER_LEG).map((p) => {
    const camera = resolveCamera(stateAt(states, p, false), WARM_FRAME);
    return { center: camera.centre, zoom: camera.zoom };
  });
  const livePlan = {
    styleUrl: `https://api.maptiler.com/maps/${MAP_STYLE}/style.json?key=${keyPlaceholder()}`,
    center: warmViews[0].center,
    zoom: warmViews[0].zoom,
    warm: warmViews,
  };

  const composeSource = await readFile(join(HERE, "compose.mjs"), "utf8");
  const liveSource = await readFile(join(HERE, "live-scroll-map.mjs"), "utf8");
  const maplibreJs = await readFile(MAPLIBRE_JS, "utf8");
  const maplibreCss = await readFile(MAPLIBRE_CSS, "utf8");
  const boot =
    composeSource.replace(/^export /gm, "") +
    liveSource.replace(/^export /gm, "") +
    `\n;(function () {\n` +
    `  if (window.__mixedStarted) return;\n` +
    `  window.__mixedStarted = true;\n` +
    // The script sits inside the GRAPHIC, which the scaffold emits BEFORE the prose column, so no
    // panel exists yet when this tag is parsed. Booting here made the driver exit on its own guard,
    // silently, on the chart sibling of this beat.
    `  function boot() {\n` +
    `    var root = document.querySelector('[data-visual="mixed"]');\n` +
    `    if (!root) return;\n` +
    // The live layer is booted FIRST so its `follow` exists before the first paint, and it returns
    // null — leaving the beat's own drawn geography showing and the camera driving it alone —
    // whenever the page carries the placeholder, has no MapLibre, or has no container.
    `    var live = initLiveScrollMap(root, ${JSON.stringify(livePlan)}, {});\n` +
    `    initMixedScrolly(root, ${JSON.stringify(config)}, ${JSON.stringify(states)}, live ? live.follow : null);\n` +
    `  }\n` +
    `  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);\n` +
    `  else boot();\n` +
    `})();\n`;

  const stepsWithFrames = steps.map((step, i) => ({
    ...step,
    frame:
      i === 0
        ? createElement(
            Fragment,
            null,
            visual,
            // maplibre-gl INLINED rather than loaded from a CDN: a `<script src>` would trade payload
            // for a SECOND third-party host, and this file's whole request budget is one host —
            // api.maptiler.com. Measured cost of the ruling: ~803 KB of JS and ~65 KB of CSS on top
            // of the four photographs this page already carries.
            createElement("style", { dangerouslySetInnerHTML: { __html: maplibreCss } }),
            createElement("script", { dangerouslySetInnerHTML: { __html: maplibreJs } }),
            createElement("script", { dangerouslySetInnerHTML: { __html: boot } }),
          )
        : createElement("div"),
  }));

  // Short on purpose. Under the fixed-page model the header never scrolls away, so every word in it
  // costs graphic height at EVERY scroll position — measured at 375x812, where the first draft's
  // title wrapped to four lines and its source to eleven, and the two together took 330px of 812
  // before the picture started.
  const title =
    `${facts.glacierName}: ${facts.sequence.frames} photographs, one map, ` +
    `${facts.balanceTo - facts.balanceFrom + 1} years of measurement`;
  const source =
    `Photographs: ${facts.sequence.photographers.join(", ")} — Glacier National Park Archives and the U.S. Geological ` +
    `Survey, ${facts.sequence.firstYear}–${facts.sequence.lastYear}, public domain; every original's URL and sha256 in ` +
    `photographs.csv. Outlines: OpenStreetMap, ${geo.park.osm} and ${geo.glacier.osm}, ODbL; basemap © MapTiler. ` +
    `Record: mean cumulative mass balance of the world's reference glaciers, WGMS via the US EPA, ` +
    `${facts.balanceFrom}–${facts.balanceTo}. Colours: ${paletteSource.slice(paletteSource.lastIndexOf("/") + 1)}.`;

  const { outPath, panelContrast } = await renderScrolly({
    steps: stepsWithFrames,
    title,
    source,
    ground,
    outDir,
    name: "three-media-one-glacier.html",
    proseLane: PROSE_LANE,
  });

  const deepest = resolveCamera(stateAt(states, 3, false), WARM_FRAME);
  console.log(
    `mixed scrolly → ${outPath}\n` +
      `  ${states.length} steps · panel contrast ${panelContrast.toFixed(2)}:1 · SSR frame ${SSR_FRAME.width}x${SSR_FRAME.height}\n` +
      `  photographs ${facts.sequence.frames} (${facts.sequence.firstYear}-${facts.sequence.lastYear}, gaps ${facts.sequence.gaps.join("/")})\n` +
      `  park ${Math.round(facts.parkWidthKm)} km wide · glacier ${t1(facts.glacierWidthKm)} km (${t1(facts.glacierShareOfPark * 100)}%) · ` +
      `camera ${t1(facts.viewpointDistanceKm)} km from the ridge\n` +
      `  record ${facts.balanceFrom}-${facts.balanceTo} ${t1(facts.balanceTotal)} m · ${facts.spanFrom}-${facts.spanTo} ` +
      `${t1(facts.spanLoss)} m · rate ${t2(facts.lateRate)} vs ${t2(facts.earlyRate)} m/decade (${t1(facts.rateRatio)}x)\n` +
      `  live plan: ${MAP_STYLE}, ${warmViews.length} warmed cameras, zoom ${t2(warmViews[0].zoom)} → ${t2(deepest.zoom)}`,
  );
  return { outPath };
}

if (import.meta.main) await render();

export { render };
