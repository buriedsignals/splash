// The runner for the ONE-MAP scrolly beat: a single choropleth of Europe, and four successive
// READINGS of it, the camera flown between them by the reader's scroll.
//
// This file is a CONSUMER of `scrolly`: it imports the skill's own generic `renderScrolly` and
// hands it steps. Nothing under `scrolly/` is edited by it.
//
// WHY THIS EARNS THE SCROLL, and why it is a different argument from the sibling
// `mapscrolly-quakes-three-ways`. That beat shows one subject through FOUR encodings and the
// comparison between them is its argument. This one is the classic form: **one map, and the steps
// navigate inside it.** The four readings are:
//
//   1. the continent, all 41 countries, one shade each;
//   2. the camera flies east into the darkest block on the map, and two of its countries are named;
//   3. the camera flies west into the corner where the second-highest figure in Europe is painted
//      on a shape 1.4% of the map's own width — a shape reading 1 physically cannot show you;
//   4. the camera pulls back, and the countries within a tonne of the median are lifted out.
//
// A SINGLE FRAME CANNOT HOLD THEM, and this beat can say so with a measurement rather than an
// opinion. Reading 3's subject is 27 of the plate's 2000 units across. At reading 1's camera that is
// a smudge a reader cannot resolve, let alone label; at reading 3's camera it is a shape with a name
// on it. Both readings are of the SAME map — nothing is redrawn, nothing is re-projected, no second
// picture is loaded. And putting reading 2's and reading 3's labels on reading 1's frame at once is
// the cluttered continental map with eight labels over four-pixel countries that this vehicle exists
// to avoid. Nor is it a video: reading 4 asks the reader to count a band of thirteen countries, and
// a cut takes that pace away from them.
//
// Usage:
//   bun proof/mapscrolly-one-map-europe-carbon/render.mjs [outDir]

import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement, Fragment } from "react";
import { deriveFurniture, readPalette } from "#shared/chart-beat/render-still.mjs";
import { renderScrolly } from "../../skills/scrolly/scripts/render-scrolly.mjs";
import { MapFrame } from "./MapFrame.tsx";
import {
  CO2_BREAKS,
  WATER_FILL,
  assertRampReads,
  binIndexLowerInclusive,
  dataRampEnd,
  en,
  sequentialRamp,
} from "./geo-choropleth.ts";
import {
  cameraFor,
  deriveFacts,
  join as joinValues,
  t1,
  wholePlate,
} from "./carbon-map.ts";
import { CONTENT_TOP, MAX_SCALE, PROSE_LANE, assertNumericStates, resolveCamera, stateAt } from "./map-drive.mjs";
import { keyPlaceholder, viewForCamera, warmPositions } from "./live-scroll-map.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
// Resolved through node's own module resolution, never by a relative path out of this beat —
// `no-cross-skill-imports.test.ts` reads path STRINGS, and `../../../node_modules/...` reads to it
// (correctly) as a specifier leaving the beat.
const requireFrom = createRequire(import.meta.url);
const MAPLIBRE_JS = requireFrom.resolve("maplibre-gl/dist/maplibre-gl.js");
const MAPLIBRE_CSS = requireFrom.resolve("maplibre-gl/dist/maplibre-gl.css");

/** The frame the WARM is computed against. The reader's frame is not known at build time (web is a
 *  range, R2), and the warm only has to fetch the right neighbourhood of tiles at the right zoom —
 *  a container 20% wider asks for the same tiles plus an edge, which the live map then fetches on
 *  its own. This is the widest shape the beat is verified at, so the warm errs wide. */
const WARM_FRAME = { width: 1600, height: 820 };
/** How many camera positions each leg of the path contributes to the warm. Three means each leg is
 *  warmed at its start and at two interior positions — the zooms a reader passes through mid-flight,
 *  which no authored state has. */
const WARM_SAMPLES_PER_LEG = 3;

// The colours come from the answer recorded in PALETTE.md beside this beat — never a hex written
// here. `stopAt` is an input SEARCH BOUNDARY, not an output path.
const { ground, accent, origin, source: paletteSource } = readPalette(HERE, {
  stopAt: join(HERE, ".."),
});
const furniture = deriveFurniture(ground);

const argv = process.argv.slice(2);
const outDir = resolve(argv.find((a) => !a.startsWith("--")) ?? join(HERE, "render"));

/** The two regions this beat's middle readings visit. A region is an editorial choice and is named
 *  here; WHICH country inside it is highest or lowest, and every figure, is computed. */
const CENTRAL = ["DEU", "POL", "CZE", "SVK", "AUT", "HUN"];
const LOW_COUNTRIES = ["LUX", "BEL", "NLD"];

/** The ramp's own ends, as a fraction of ground → ink. Stated in PALETTE.md with the measurement. */
const RAMP_FROM = 0.14;
const RAMP_TO = 0.92;

async function render() {
  const geometry = JSON.parse(await readFile(join(HERE, "plate", "geometry.json"), "utf8"));
  const csv = await readFile(join(HERE, "co2-per-capita-2023.csv"), "utf8");
  const countries = joinValues(geometry, csv);
  const facts = deriveFacts(countries);

  const byKey = new Map(countries.map((c) => [c.key, c]));
  const central = CENTRAL.map((k) => byKey.get(k));
  const low = LOW_COUNTRIES.map((k) => byKey.get(k));
  const centralHigh = [...central].sort((a, b) => b.value - a.value)[0];
  const centralLow = [...central].sort((a, b) => a.value - b.value)[0];
  const lowStar = [...low].sort((a, b) => b.value - a.value)[0];

  // The claims this beat's own steps rest on, asserted against the data rather than trusted.
  const rank = [...countries].sort((a, b) => b.value - a.value).indexOf(lowStar) + 1;
  if (rank !== 2)
    throw new Error(`reading 3 calls ${lowStar.name} the second-highest in the study set; it ranks ${rank}`);
  // Reading 3's whole argument is that its subject is SMALL on the plate. Asserted rather than
  // assumed: if a future bake or a different camera made Luxembourg wide, the sentence would still
  // read "1.3% of this map's width" with a number that no longer surprises anyone.
  const starWidth = lowStar.box.maxX - lowStar.box.minX;
  if (starWidth > geometry.frame.width * 0.03)
    throw new Error(
      `reading 3 rests on ${lowStar.name} being too small to resolve at the opening camera; it is now ` +
        `${((starWidth / geometry.frame.width) * 100).toFixed(1)}% of the plate's width`,
    );

  const plateWidth = geometry.frame.width;
  const rasterPerUnit = MAX_SCALE;
  // How wide reading 3's subject is as a fraction of the whole map — the figure the beat states, and
  // the reason the camera has to move at all.
  const starWidthShare = ((lowStar.box.maxX - lowStar.box.minX) / plateWidth) * 100;

  // THE SHADING IS THE DATA. Until this landed the ramp ran ground → furniture.ink — computed
  // between the background and the ink, so it never touched the recorded accent: a newsroom could
  // change its house colour and this map stayed grey, which is exactly what the paired render
  // showed (a grey Europe under two deliberately different palettes, 0 pixels moved).
  // `dataRampEnd` walks the accent toward the pole the ground is not; `assertRampReads` then
  // measures the finished classes — monotone, ≥0.02 apart, top class over the 3:1 mark floor.
  const ramp = assertRampReads(
    sequentialRamp(
      ground,
      dataRampEnd(accent, ground),
      CO2_BREAKS.length + 1,
      RAMP_FROM,
      RAMP_TO,
    ),
    ground,
    "the CO₂-per-person choropleth ramp",
  );
  const fillFor = (value) => ramp[binIndexLowerInclusive(value, CO2_BREAKS)];

  // ── The four cameras, DERIVED from the projected shapes of what each reading is about ─────────
  const whole = wholePlate(geometry);
  const centralCam = cameraFor(central, 1.35);
  const lowCam = cameraFor(low, 2.2);
  const asState = (camera, rest) =>
    ({ cx: camera.cx, cy: camera.cy, logSpanX: Math.log(camera.spanX), logSpanY: Math.log(camera.spanY), ...rest });

  const states = assertNumericStates([
    // 1 — the continent. Nothing lifted, nothing receded: the map before any reading is asked of it.
    asState(whole, { fit: 0, hiA: 0, hiB: 0, hiC: 0, dim: 0 }),
    // 2 — fly east. Everything recedes behind a veil of the ground; the six countries of the
    //     central block come back at full strength, two of them named.
    asState(centralCam, { fit: 1, hiA: 1, hiB: 0, hiC: 0, dim: 0.45 }),
    // 3 — fly west, to the shape reading 1 could not show.
    asState(lowCam, { fit: 1, hiA: 0, hiB: 1, hiC: 0, dim: 0.45 }),
    // 4 — pull back to the opening camera, and lift the band around the median out of it. The
    //     reader is looking at reading 1's frame again, with something in it they could not see.
    asState(whole, { fit: 0, hiA: 0, hiB: 0, hiC: 1, dim: 0.45 }),
  ]);

  const labels = [
    { key: centralHigh.key, text: `${centralHigh.name} ${en(centralHigh.value)}`, gate: "hiA", box: centralHigh.box, anchor: [(centralHigh.box.minX + centralHigh.box.maxX) / 2, (centralHigh.box.minY + centralHigh.box.maxY) / 2] },
    { key: centralLow.key, text: `${centralLow.name} ${en(centralLow.value)}`, gate: "hiA", box: centralLow.box, anchor: [(centralLow.box.minX + centralLow.box.maxX) / 2, (centralLow.box.minY + centralLow.box.maxY) / 2] },
    ...low.map((c) => ({
      key: c.key,
      text: `${c.name} ${en(c.value)}`,
      gate: "hiB",
      box: c.box,
      anchor: [(c.box.minX + c.box.maxX) / 2, (c.box.minY + c.box.maxY) / 2],
    })),
  ];

  const unit = "tonnes of CO₂ per person, 2023";
  // Short on purpose: it sits at the bottom of the DRAWING, above the prose lane, and at 375px a
  // credit that runs to a third line reaches down into the panel. Full provenance is in the header,
  // which under the fixed-page model never scrolls away.
  const credit = `Global Carbon Budget (2025) via Our World in Data · basemap © MapTiler © OpenStreetMap`;

  const visual = createElement(MapFrame, {
    plate: `data:image/png;base64,${(await readFile(join(HERE, "plate", "plate.png"))).toString("base64")}`,
    plateSize: geometry.frame,
    countries,
    fillFor,
    groups: { A: CENTRAL, B: LOW_COUNTRIES, C: facts.band.map((c) => c.key) },
    labels,
    legend: { breaks: CO2_BREAKS, unit, ramp },
    state: states[0],
    credit,
    ground,
    ink: furniture.ink,
    muted: furniture.muted,
    accent,
  });

  // ── The live MapTiler layer (ruling R1, extended to the scrolly 2026-08-10) ───────────────────
  //
  // The style URL carries the PLACEHOLDER, never a key (R1b): this file is committed, the release
  // is open source, and a pushed key is scanned within minutes and survives in the history.
  // `deliver` substitutes at delivery.
  //
  // The warm is the answer to the objection this beat used to keep the plate over: a reader
  // scrubbing fast meets tiles that have not arrived. The cameras are authored, so every one of
  // them — and the positions BETWEEN them, where the reader spends most of the piece — is walked
  // through the map before the live layer is revealed.
  const warmViews = warmPositions(states.length, WARM_SAMPLES_PER_LEG).map((p) =>
    viewForCamera(
      resolveCamera(stateAt(states, p, false), WARM_FRAME, CONTENT_TOP, MAX_SCALE),
      WARM_FRAME,
      geometry,
    ),
  );
  const livePlan = {
    styleUrl: `https://api.maptiler.com/maps/${geometry.style}/style.json?key=${keyPlaceholder()}`,
    waterFill: WATER_FILL,
    // The opening camera, so the map is constructed already pointing at reading 1 rather than at
    // null island for one frame.
    center: warmViews[0].center,
    zoom: warmViews[0].zoom,
    // Only the camera facts the live layer needs — the 41 shapes stay where they are, in the SVG
    // this beat already draws, and are never re-projected.
    geometry: {
      frame: geometry.frame,
      frameCorners: geometry.frameCorners,
      worldWidthPx: geometry.worldWidthPx,
    },
    warm: warmViews,
  };

  const driverSource = await readFile(join(HERE, "map-drive.mjs"), "utf8");
  const liveSource = await readFile(join(HERE, "live-scroll-map.mjs"), "utf8");
  const maplibreJs = await readFile(MAPLIBRE_JS, "utf8");
  const maplibreCss = await readFile(MAPLIBRE_CSS, "utf8");
  const boot =
    driverSource.replace(/^export /gm, "") +
    liveSource.replace(/^export /gm, "") +
    `\n;(function () {\n` +
    `  if (window.__oneMapStarted) return;\n` +
    `  window.__oneMapStarted = true;\n` +
    // The script sits inside the GRAPHIC, which the scaffold emits BEFORE the prose column, so no
    // panel exists yet when this tag is parsed. Booting here made the driver exit on its own
    // "fewer than two panels" guard, silently, on the chart sibling of this beat.
    `  function boot() {\n` +
    `    var root = document.querySelector('[data-visual="one-map"]');\n` +
    `    if (!root) return;\n` +
    // The live layer is booted FIRST so its `follow` exists before the first paint, and it returns
    // null — leaving the plate showing and the camera driving it alone — whenever the page carries
    // the placeholder, has no MapLibre, or has no container.
    `    var live = initLiveScrollMap(root, ${JSON.stringify(livePlan)}, {});\n` +
    `    initMapScrolly(root, ${JSON.stringify(states)}, ${JSON.stringify(labels)}, ` +
    `${JSON.stringify({ rasterPerUnit, lift: 16 })}, live ? live.follow : null);\n` +
    `  }\n` +
    `  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);\n` +
    `  else boot();\n` +
    `})();\n`;

  const steps = [
    {
      id: "continent",
      prose: [
        `${facts.count} European countries, one shade each: tonnes of CO₂ per person in 2023. The range runs ` +
          `from ${t1(facts.lowest.value)} in ${facts.lowest.name} to ${t1(facts.highest.value)} in ` +
          `${facts.highest.name} — a factor of ${t1(facts.ratio)}. The median is ${t1(facts.median)}.`,
      ],
    },
    {
      id: "east",
      prose: [
        `East first. The darkest block on the map is central Europe — and it is not one thing: ` +
          `${centralHigh.name} at ${t1(centralHigh.value)} sits next to ${centralLow.name} at ` +
          `${t1(centralLow.value)}, ${t1(centralHigh.value - centralLow.value)} tonnes apart across one border.`,
      ],
    },
    {
      id: "west",
      prose: [
        `Now west, to something the first frame could not show you. ${lowStar.name} emits ` +
          `${t1(lowStar.value)} tonnes a person — the second-highest figure here — and is painted on a ` +
          `shape ${t1(starWidthShare)}% of this map's width.`,
      ],
    },
    {
      id: "crowd",
      prose: [
        `Back out. ${facts.band.length} of the ${facts.count} sit within ${facts.bandWidth} tonne of the median: ` +
          `${t1(facts.bandShareOfPaint * 100)}% of the painted land, spanning ${t1(facts.bandSpread)} tonnes of a ` +
          `${t1(facts.fullSpread)}-tonne range. Most of this map is one colour doing very little work.`,
      ],
    },
  ];

  const stepsWithFrames = steps.map((step, i) => ({
    ...step,
    frame:
      i === 0
        ? createElement(
            Fragment,
            null,
            visual,
            // maplibre-gl INLINED rather than loaded from a CDN: a `<script src>` would trade
            // payload for a SECOND third-party host, and this file's whole request budget is one
            // host — api.maptiler.com. Measured cost of the ruling, stated rather than discovered:
            // ~803 KB of JS and ~65 KB of CSS on top of the plate this page already carries.
            createElement("style", { dangerouslySetInnerHTML: { __html: maplibreCss } }),
            createElement("script", { dangerouslySetInnerHTML: { __html: maplibreJs } }),
            createElement("script", { dangerouslySetInnerHTML: { __html: boot } }),
          )
        : createElement("div"),
  }));

  const title = `One map, four readings: CO₂ per person across ${facts.count} European countries, 2023`;
  // The header never scrolls away under the fixed-page model, so every word costs graphic height at
  // every scroll position — measured at 375x812, where a longer draft took 230px of 812.
  const source =
    `CO₂ per person (fossil fuels and industry): Global Carbon Budget (2025), processing by Our World in Data. ` +
    `Shapes: Natural Earth 1:50m. Basemap: LIVE MapTiler ${geometry.style} tiles, the camera flown by the ` +
    `scroll; the same basemap captured once at ${geometry.frame.width}×${geometry.frame.height} is frozen ` +
    `beside this beat and stays underneath as the fallback, so the map still reads with no network and no key. ` +
    `Colours: ${paletteSource.slice(paletteSource.lastIndexOf("/") + 1)}, chosen by the ${origin}.`;

  const { outPath, panelContrast } = await renderScrolly({
    steps: stepsWithFrames,
    title,
    source,
    ground,
    // This beat's words are English throughout, handed to `renderScrolly` as a real input
    // — see `assertRecordedLanguage`. Recorded here, never detected from the prose.
    language: "en",
    outDir,
    name: "one-map-four-readings.html",
    proseLane: PROSE_LANE,
  });

  // The resolution budget, at the widths this beat is verified at — the price of the baked plate,
  // printed rather than assumed. Under 1.0 the plate is being magnified past its own raster.
  const budget = [
    { name: "1600x900", width: 1600, height: 820 },
    { name: "1280x800", width: 1280, height: 706 },
    { name: "375x812", width: 375, height: 573 },
  ].map(({ name, width, height }) => {
    const worst = states
      .map((s) => {
        const contain = Math.min(width / Math.exp(s.logSpanX), height / Math.exp(s.logSpanY));
        const cover = Math.max(width / Math.exp(s.logSpanX), (height * CONTENT_TOP) / Math.exp(s.logSpanY));
        return Math.min(Math.exp(Math.log(contain) + (Math.log(cover) - Math.log(contain)) * s.fit), MAX_SCALE);
      })
      .reduce((a, b) => Math.max(a, b), 0);
    return `${name}: ${(rasterPerUnit / worst).toFixed(2)} raster px per delivered px at the deepest camera`;
  });

  console.log(
    `one-map scrolly → ${outPath}\n` +
      `  ${facts.count} countries, panel contrast ${panelContrast.toFixed(2)}:1, plate ${geometry.frame.width}u ` +
      `(${rasterPerUnit}x raster), zoom capped at ${MAX_SCALE}\n` +
      `  range ${t1(facts.lowest.value)} (${facts.lowest.name}) - ${t1(facts.highest.value)} (${facts.highest.name}), ` +
      `median ${t1(facts.median)}\n` +
      `  central: ${centralHigh.name} ${t1(centralHigh.value)} vs ${centralLow.name} ${t1(centralLow.value)}\n` +
      `  ${lowStar.name} ${t1(lowStar.value)} = rank ${rank}, ${t1(starWidthShare)}% of the map's width\n` +
      `  median band ${facts.band.length}/${facts.count}, ${t1(facts.bandShareOfPaint * 100)}% of painted land\n` +
      `  ${budget.join("\n  ")}`,
  );
  return { outPath };
}

if (import.meta.main) await render();

export { render };
