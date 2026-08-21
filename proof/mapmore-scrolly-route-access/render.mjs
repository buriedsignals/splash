// The runner for the rebuilt route beat. A CONSUMER of `scrolly`: it imports the skill's own
// generic `renderScrolly`, hands it ONE picture on step 1's frame and empty wrappers after it, and
// inlines this beat's own driver beside it. Nothing under `skills/scrolly` is edited by it.
//
// The original — `splash-test-b-route-access`, delivered 2026-08-18 — is rebuilt rather than
// patched, because its three defects were all in HOW the picture was assembled, not in what it
// said. Its geography, its plate, its stops and its prose are carried over unchanged.

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement, Fragment } from "react";
import { renderScrolly } from "../../skills/scrolly/scripts/render-scrolly.mjs";
import { deriveFurniture } from "../../skills/scrolly/scripts/render-still.mjs";
import { createRequire } from "node:module";
import { RouteFrame } from "./RouteFrames.tsx";

const requireFrom = createRequire(import.meta.url);
const MAPLIBRE_JS = requireFrom.resolve("maplibre-gl/dist/maplibre-gl.js");
const MAPLIBRE_CSS = requireFrom.resolve("maplibre-gl/dist/maplibre-gl.css");

const HERE = dirname(fileURLToPath(import.meta.url));
/** Beside this beat, never in /tmp: the delivered file is the beat's own artefact, and a render that
 *  lands somewhere else is one nobody can review from the tree. An explicit argument still overrides
 *  at runtime. */
const OUT_DIR = join(HERE, "render");

const TITLE = "Five evening stops, five ways to make heat relief reachable";
const SOURCE =
  "Synthetic exercise — all programmes and measurements are fictional; five stops are not " +
  "representative and support no causal or whole-city performance claims. Temperature is context, " +
  "not a ranking. Credit: Splash Test Desk synthetic field exercise · Basemap © MapTiler © OpenStreetMap";

/** The prose the delivered file carried, one paragraph a step, unchanged. */
const PROSE = [
  [
    "Lisbon starts with longer evening hours.",
    "The fictional stop measured 2.1°C cooler than its nearby reference point.",
  ],
  [
    "Madrid adds a late public-transport connection.",
    "The fictional stop measured 3.4°C cooler; the number is context, not a city ranking.",
  ],
  [
    "Marseille adds multilingual stewards and a quiet room.",
    "The fictional stop measured 2.7°C cooler.",
  ],
  [
    "Milan connects a library, drinking water and a tram stop.",
    "The fictional stop measured 4.1°C cooler.",
  ],
  [
    "Athens completes the route with an outdoor night garden.",
    "Its fictional 5.0°C reading is the largest of these five stops, but the progression is about " +
      "access — not performance.",
  ],
];

async function render({ outDir = OUT_DIR } = {}) {
  const geometry = JSON.parse(await readFile(join(HERE, "route.json"), "utf8"));
  const palette = await readFile(join(HERE, "PALETTE.md"), "utf8");
  const ground = /ground:\s*"([^"]+)"/.exec(palette)[1];
  const accent = /accent:\s*"([^"]+)"/.exec(palette)[1];
  const furniture = deriveFurniture(ground);

  if (geometry.stops.length !== PROSE.length)
    throw new Error(
      `this beat's prose and its geography must describe the same stops: ${PROSE.length} ` +
        `paragraphs against ${geometry.stops.length} stops`,
    );
  // The reveal fractions are derived from the route, and the last one closes it. A geometry whose
  // final stop is not the end of the line would leave a tail nobody ever draws — the shape of the
  // defect this beat exists to have fixed.
  const last = geometry.stops[geometry.stops.length - 1].reachedAt;
  if (Math.abs(last - 1) > 1e-6)
    throw new Error(`the last stop must close the route, got ${last}`);

  const plateBuffer = await readFile(join(HERE, "plate", "plate.png"));
  const plate = `data:image/png;base64,${plateBuffer.toString("base64")}`;

  // ONE PICTURE, NOT FIVE. The visual rides step 1's frame — the one the scaffold marks `active` at
  // build time, so a reader without JavaScript meets the opening state — and the driver lifts it out
  // of the stack on boot and scrubs it. The first rebuild gave every step its own finished picture:
  // guard-clean, and a slideshow. Five pictures cannot draw a line under the reader's gesture.
  const driver = await readFile(join(HERE, "route-drive.mjs"), "utf8");
  const liveSource = await readFile(join(HERE, "live-map.mjs"), "utf8");
  const maplibreJs = await readFile(MAPLIBRE_JS, "utf8");
  const maplibreCss = await readFile(MAPLIBRE_CSS, "utf8");
  const camera = JSON.parse(await readFile(join(HERE, "plate", "camera.json"), "utf8"));
  // The key is a PLACEHOLDER in the committed file — this repository is public, and a key in a
  // delivered artefact is a key in the history. `deliver` substitutes at delivery.
  const livePlan = {
    styleUrl: `https://api.maptiler.com/maps/${camera.style}/style.json?key=__MAPTILER` + `_KEY__`,
    bake: { center: camera.center, zoom: camera.zoom, width: camera.size[0], height: camera.size[1] },
  };
  const boot =
    driver.replace(/^export /gm, "") +
    liveSource.replace(/^export /gm, "") +
    `\n;(function () {\n` +
    `  if (window.__routeAccessStarted) return;\n` +
    `  window.__routeAccessStarted = true;\n` +
    // The script sits INSIDE the graphic, which the scaffold emits before the prose column, so no
    // panel exists yet when this tag is parsed. Booting here would exit on the driver's own guard.
    `  function boot() {\n` +
    `    var root = document.querySelector('[data-visual="route-access"]');\n` +
    `    if (!root) return;\n` +
    `    initLiveMap(root, ${JSON.stringify(livePlan)});\n` +
    `    initRouteAccess(root, ${JSON.stringify({
      stops: geometry.stops.map((s) => s.reachedAt),
      // The samples the line is redrawn from, and the cumulative length that selects them. Both are
      // read off the stops themselves: this route's vertices ARE its stops, and `reachedAt` IS the
      // normalised length at each one — the same two numbers the badges are placed with, so the
      // line and the labels cannot hold two opinions of where the route is.
      route: geometry.stops.map((s) => [s.x, s.y]),
      cum: geometry.stops.map((s) => s.reachedAt),
      accent,
      muted: furniture.muted,
    })});\n` +
    `  }\n` +
    `  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);\n` +
    `  else boot();\n` +
    `})();\n`;

  const visual = createElement(RouteFrame, {
    geometry,
    plate,
    reveal: geometry.stops[0].reachedAt,
    ground,
    accent,
    ink: furniture.ink,
    muted: furniture.muted,
  });

  const steps = geometry.stops.map((stop, index) => ({
    id: stop.name.toLowerCase(),
    prose: PROSE[index],
    frame:
      index === 0
        ? createElement(
            Fragment,
            null,
            visual,
            // maplibre-gl INLINED rather than loaded from a CDN: a `<script src>` would trade
            // payload for a SECOND third-party host, and this file's whole request budget is one —
            // api.maptiler.com. The measured price of the ruling is stated in BRIEF.md.
            createElement("style", { dangerouslySetInnerHTML: { __html: maplibreCss } }),
            createElement("script", { dangerouslySetInnerHTML: { __html: maplibreJs } }),
            createElement("script", { dangerouslySetInnerHTML: { __html: boot } }),
          )
        : createElement("div"),
  }));

  const { outPath, panelContrast } = await renderScrolly({
    steps,
    title: TITLE,
    source: SOURCE,
    ground,
    // This beat's words are English throughout, handed to `renderScrolly` as a real input
    // — see `assertRecordedLanguage`. Recorded here, never detected from the prose.
    language: "en",
    outDir,
    name: "route-access.html",
  });
  console.log(
    `route-scrolly → ${outPath}  [${steps.length} steps, panel contrast ${panelContrast.toFixed(2)}:1]\n` +
      `  reveal ${geometry.stops.map((s) => `${(s.reachedAt * 100).toFixed(1)}%`).join(" -> ")} ` +
      `of a ${geometry.routeLength} unit route, one picture driven continuously`,
  );
  return { outPath };
}

if (import.meta.main) await render();

export { render };
