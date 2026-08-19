// The runner for the rebuilt route beat. A CONSUMER of `scrolly`: it imports the skill's own
// generic `renderScrolly`, hands it ONE picture on step 1's frame and empty wrappers after it, and
// inlines this beat's own driver beside it. Nothing under `skills/scrolly` is edited by it.
//
// The original — `splash-test-b-route-access`, delivered 2026-08-18 — is rebuilt rather than
// patched, because its three defects were all in HOW the picture was assembled, not in what it
// said. Its geography, its plate, its stops and its prose are carried over unchanged.

import { readFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement, Fragment } from "react";
import { renderScrolly } from "../../skills/scrolly/scripts/render-scrolly.mjs";
import { deriveFurniture } from "../../skills/scrolly/scripts/render-still.mjs";
import { RouteFrame } from "./RouteFrames.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));

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

async function render({ outDir = join(HERE, "render") } = {}) {
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
  const boot =
    driver.replace(/^export /gm, "") +
    `\n;(function () {\n` +
    `  if (window.__routeAccessStarted) return;\n` +
    `  window.__routeAccessStarted = true;\n` +
    // The script sits INSIDE the graphic, which the scaffold emits before the prose column, so no
    // panel exists yet when this tag is parsed. Booting here would exit on the driver's own guard.
    `  function boot() {\n` +
    `    var root = document.querySelector('[data-visual="route-access"]');\n` +
    `    if (!root) return;\n` +
    `    initRouteAccess(root, ${JSON.stringify({ stops: geometry.stops.map((s) => s.reachedAt), accent, muted: furniture.muted })});\n` +
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
            createElement("script", { dangerouslySetInnerHTML: { __html: boot } }),
          )
        : createElement("div"),
  }));

  await mkdir(outDir, { recursive: true });
  const { outPath, panelContrast } = await renderScrolly({
    steps,
    title: TITLE,
    source: SOURCE,
    ground,
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
