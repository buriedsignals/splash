// The runner for the map-scrolly beat: the reader scrolls, and the SAME Danube camera reveals a
// growing slice of the route and a growing set of crossed territories, four narrative steps at a
// time (geo-discipline.md rule 2: "move within the plate," never re-bake per step).
//
// This file is a CONSUMER of `scrolly`: it imports the skill's own generic `renderScrolly`
// (the media-agnostic scaffold, above its CONFIG marker) and builds its own `steps` array from its
// own frame component (`MapFrame.tsx`) — exactly the shape `scrolly/SKILL.md`'s own "How it
// works" describes for a real beat. Nothing under `scrolly/` is edited by this file.
//
// TWO CHANGES OF 2026-08-10, both the owner's, both recorded in `BRIEF.md` with the argument they
// overturned:
//
//   1. **The basemap is LIVE MapTiler** (ruling R1, extended to the scrolly). He drove this page:
//      *"je ne vois aucun canvas dans le DOM. Or il faut tout le temps utiliser MapTiler."* The
//      baked plate stays underneath as the FALLBACK, never instead of the tiles, and the camera is
//      warmed before the live layer is revealed. And: *"Pas de controls sur le scrolly, le scroll
//      pilote et la map doit prendre toute la largeur."*
//   2. **The reveal is continuous.** The scaffold used to be handed FOUR SSR'd pictures and swap
//      which one was painted; between two steps nothing happened at all. It is now handed ONE
//      picture, and the line's length and the territories' opacities are functions of the vehicle's
//      published `data-progress`. The four authored states are unchanged — they are what the
//      interpolation passes through at progress 0, 1, 2 and 3.
//
// Usage:
//   bun proof/mapmore-scrolly-danube/render.mjs [outDir]

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement, Fragment } from "react";
import { deriveFurniture } from "./render-still.mjs";
// `readPalette` comes from the SHARED copy through the `#shared/…` subpath alias — a beat is a
// story, not a skill, so it may reach out where a skill may not.
import { readPalette } from "#shared/chart-beat/render-still.mjs";
import {
  assertTerritoryFillsReadAsLand,
  parseRouteCsv,
  territoriesCrossed,
  territoryColour,
  nearestRouteIndex,
  classifyRoute,
  borderZoneKm,
  WATER_TINT,
} from "./geo-flow.ts";
import { MapFrame } from "./MapFrame.tsx";
import { MAX_SCALE, PROSE_LANE, containCamera } from "./route-drive.mjs";
import { keyPlaceholder, viewForCamera } from "./live-scroll-map.mjs";
import { renderScrolly } from "../../skills/scrolly/scripts/render-scrolly.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
// Resolved through node's own module resolution, never by a relative path out of this beat —
// `no-cross-skill-imports.test.ts` reads path STRINGS, and `../../../node_modules/...` reads to it
// (correctly) as a specifier leaving the beat.
const requireFrom = createRequire(import.meta.url);
const MAPLIBRE_JS = requireFrom.resolve("maplibre-gl/dist/maplibre-gl.js");
const MAPLIBRE_CSS = requireFrom.resolve("maplibre-gl/dist/maplibre-gl.css");

/** The frame the live map is CONSTRUCTED at, before the driver's first paint replaces it with the
 *  reader's own. The reader's frame is not knowable at build time (web is a range, R2); this is the
 *  widest shape this beat is verified at, so the map opens pointing at the right place rather than
 *  at null island for one frame. The WARM is computed in the browser from the real box — see
 *  `live-scroll-map.mjs`'s header for why this beat's warm cannot be a build-time list. */
const NOMINAL_FRAME = { width: 1600, height: 820 };

/** How long a territory takes to arrive, in route samples, capped so a country the river runs along
 *  for 250 samples does not spend a whole step fading in. Below the cap a territory finishes
 *  arriving exactly when the NEXT one starts, which is what makes every authored step's picture
 *  come out at exactly 0 or 1 opacity per territory. */
const ARRIVAL_SAMPLES = 60;

/** The polyline's own length, and its cumulative fraction at every sample — computed from the SAME
 *  1-decimal coordinates `MapFrame.tsx`'s `routePath` writes into the `d` attribute, so the dash
 *  that hides the unreached part and the path it hides cannot be two opinions of one length. */
function routeLengths(route) {
  const at = (p) => [Number(p[0].toFixed(1)), Number(p[1].toFixed(1))];
  const cumulative = [0];
  let total = 0;
  for (let i = 1; i < route.length; i++) {
    const a = at(route[i - 1]);
    const b = at(route[i]);
    total += Math.hypot(b[0] - a[0], b[1] - a[1]);
    cumulative.push(total);
  }
  return { total, cum: cumulative.map((v) => Number((v / total).toFixed(6))) };
}

// The palette is legal only once it is composited: a hue, its fill-opacity and the basemap's water
// tint live in three different places and can only disagree on the plate. Checked here, at render,
// so a fill that reads as sea stops the run instead of shipping (geo-discipline.md rule 7).
assertTerritoryFillsReadAsLand();

// Vienna's own coordinates — used only to find the nearest route sample, so the "how many
// countries before Vienna" claim below is answered from the route, not guessed.
const VIENNA = [16.3738, 48.2082];

// The colours are READ, not typed — see `PALETTE.md` beside this file, which also records why the
// route is one step deeper than the Okabe-Ito orange this beat used to name here.
const PALETTE = readPalette(HERE, { stopAt: join(HERE, "..") });
console.log(
  `palette from ${PALETTE.source} — ground ${PALETTE.ground}, accent ${PALETTE.accent}, ` +
    `chosen by ${PALETTE.origin}`,
);

const SEED = {
  ground: PALETTE.ground,
  accent: PALETTE.accent,
  // The Danube touches ten countries; Moldova's sub-1km frontage near Giurgiulesti does not
  // register at this map's resolution (same fact the sibling static/video flow-map beats state in
  // their own caveat), so only nine are ever drawn here. A bare "nine countries" repeated that
  // beat's own since-fixed wrong-count claim — see mapmore-flow-danube/mapgen-flowmap-video.
  title: "Following the Danube: one river, nine of its ten countries, one continuous line",
  // Kept SHORT on purpose. Under the fixed-page model the header never scrolls away, so every word
  // costs graphic height at every scroll position — measured at 375×812, where the first draft of
  // this line (which repeated the © attribution the credit chip already carries) wrapped to eight
  // lines and took 215px of 812 away from the map.
  source:
    "River course: Natural Earth 1:10m Rivers + Lake Centerlines. Territory shapes: Natural Earth " +
    "1:50m Admin 0 Countries. Basemap: LIVE MapTiler dataviz-light tiles, one fixed camera the " +
    "scroll never moves; the 900×420 capture frozen beside this beat stays underneath as the fallback.",
  // The basemap attribution again, ON the map — `attributionControl: false` takes MapLibre's own
  // credit off the canvas, so the obligation lands on this beat. Short on purpose: it sits at the
  // bottom of the drawing and a credit that runs to three lines on a phone climbs into the picture.
  credit: "Basemap © MapTiler © OpenStreetMap",
};

// Cumulative groups: each step's own territory KEYS are the group's own countries PLUS every
// earlier step's — the map only ever gains ground as the reader scrolls, never loses it, which is
// what "the map advances" has to mean for a route beat.
//
// `prose` is a function of the computed facts below (`viennaCountriesBefore`, `borderRunKm`) rather
// than a literal string — a render audit caught three defects in the old literal prose: (1) "three
// countries before Vienna" (actually two: Slovakia's own first entry comes after Vienna, not
// before); (2) the Iron Gate gorge named in the "plain" step's own prose sits at route index ~672,
// past that step's own reveal cutoff (639) — the graphic had not drawn that far yet when the text
// named it; (3) "nearly 500 km ... the longest single stretch of the whole journey" for the
// Romania-Bulgaria run — false, Germany's own opening run (538 km, before Austria) is longer, and
// the real border-zigzag span is closer to 440 km. The gorge mention now sits in "border-run"'s own
// prose instead, which reveals well past index 672, and the false superlative is dropped rather
// than replaced with an unverified one.
const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];

function buildStepGroups({ viennaCountriesBefore, borderRunKm }) {
  const viennaCountWord = NUMBER_WORDS[viennaCountriesBefore] ?? String(viennaCountriesBefore);
  return [
    {
      id: "source",
      throughKey: "SVK", // reveal the route up to (and including) Slovakia's own first entry
      addKeys: ["DEU", "AUT", "SVK"],
      prose: [
        `The Danube rises in Germany's Black Forest and is already a working river by the time it ` +
          `reaches Austria — this first stretch alone touches ${viennaCountWord} countries ` +
          `before Vienna.`,
      ],
    },
    {
      id: "plain",
      throughKey: "SRB",
      addKeys: ["HUN", "HRV", "SRB"],
      prose: [
        "East of Bratislava the river opens onto the Pannonian Plain — three more countries, " +
          "several of them touched only because the river itself IS the border here.",
      ],
    },
    // THE LAST TWO STEPS WERE ONE STEP'S WORTH OF RIVER AND THREE STEPS' WORTH OF STORY. Measured
    // on the delivered file: the four cutoffs were 371 / 639 / 898 / 910 of 910, so the closing step
    // — the one whose sentence carries the Iron Gate, the border run and the delta — had TWELVE
    // samples of 910 left to draw, 1.3% of the river, while the reader scrolled a full step. The
    // owner saw it before any instrument did: "à partir de ce step là la rivière ne grandit plus".
    // The cut moves to Bulgaria's own entry, which is where the sentence changes subject anyway:
    // the gorge belongs to the Serbian-Romanian border, the 440 km drift belongs to the
    // Romania-Bulgaria one. Shares become 41 / 29 / 9 / 21 instead of 41 / 29 / 28 / 1.3.
    {
      id: "border-run",
      throughKey: "ROU",
      addKeys: ["ROU"],
      prose: [
        "The river then squeezes through the Iron Gate gorge on the Serbian-Romanian border — the " +
          "narrowest passage of its whole course, and the point where it stops being a plains river.",
      ],
    },
    {
      id: "delta",
      throughKey: "UKR",
      addKeys: ["BGR", "UKR"],
      prose: [
        `Below the gorge it drifts back and forth across the Romania-Bulgaria border for close to ` +
          `${Math.round(borderRunKm / 10) * 10} km before the two countries' banks settle apart, then ` +
          `splits into its delta near the Ukrainian border and empties into the Black Sea — the ninth ` +
          `of the ten countries the Danube touches on its way there (Moldova's short frontage near ` +
          `Giurgiulești does not register at this map's resolution).`,
      ],
    },
  ];
}

const argv = process.argv.slice(2);
// The default writes BESIDE THE BEAT, not to /tmp. It used to default to
// `/tmp/scrolly-twin/mapmore-danube`, which meant running this script the obvious way — no
// arguments — produced a fresh artifact somewhere nobody looks and left the committed one
// untouched. Someone re-rendering after a fix would see a successful run, a printed path, and a
// stale file still in the repository. That is this project's most-repeated failure wearing yet
// another set of clothes: the presence of a file mistaken for the existence of a result.
const outDir = resolve(argv.find((a) => !a.startsWith("--")) ?? join(HERE, "render"));
// The plate is frozen BESIDE THE BEAT for the same reason, and it is this beat's OWN copy. It used
// to default to `/tmp/map-twin/mapmore-flow-900x420` — another beat's scratch directory — so the
// scrolly could only be rebuilt on a machine where `mapmore-flow-danube` had recently been baked,
// and nothing recorded which basemap the committed steps were drawn over.
const PLATE_SIZE = "900x420";
const platePath = argv.includes("--plate")
  ? argv[argv.indexOf("--plate") + 1]
  : join(HERE, "plate");

/** Bakes the plate ONLY when the frozen one is absent — a warm run never touches the network. */
function ensurePlate(plateDir) {
  if (existsSync(join(plateDir, "geometry.json")) && existsSync(join(plateDir, "plate.png"))) return;
  console.log(`no frozen plate at ${plateDir} — baking one there.`);
  const result = spawnSync(
    "bun",
    [join(HERE, "bake.mjs"), "--size", PLATE_SIZE, "--out", plateDir],
    { cwd: resolve(HERE, "../../.."), stdio: "inherit" },
  );
  if (result.status !== 0) throw new Error(`bake.mjs exited with ${result.status}`);
}

async function render() {
  ensurePlate(platePath);
  const route = parseRouteCsv(await readFile(join(HERE, "danube-route.csv"), "utf8"));
  const collection = JSON.parse(await readFile(join(HERE, "countries.geojson"), "utf8"));
  const territories = collection.features.map((f) => ({
    key: f.properties.ADM0_A3,
    name: f.properties.NAME_FR ?? f.properties.NAME,
    geometry: f.geometry,
  }));
  const crossings = territoriesCrossed(route, territories);
  const order = crossings.map((c) => c.key);
  const NAMES = {
    DEU: "Germany", AUT: "Austria", SVK: "Slovakia", HUN: "Hungary", HRV: "Croatia",
    SRB: "Serbia", ROU: "Romania", BGR: "Bulgaria", UKR: "Ukraine",
  };

  const viennaIdx = nearestRouteIndex(route, VIENNA);
  const viennaCountriesBefore = crossings.filter((c) => c.firstIndex <= viennaIdx).length;
  console.log(`Vienna: nearest route sample ${viennaIdx}, ${viennaCountriesBefore} countries touched by then`);

  const labels = classifyRoute(route, territories);
  const borderRunKm = borderZoneKm(route, labels, "ROU", "BGR");
  console.log(`Romania-Bulgaria border zigzag zone: ${borderRunKm.toFixed(1)} km`);

  const STEP_GROUPS = buildStepGroups({ viennaCountriesBefore, borderRunKm });

  const geometry = JSON.parse(await readFile(join(platePath, "geometry.json"), "utf8"));
  const plateBuffer = await readFile(join(platePath, "plate.png"));
  const plate = `data:image/png;base64,${plateBuffer.toString("base64")}`;

  const geomByKey = new Map(geometry.territories.map((t) => [t.key, t]));

  const furniture = deriveFurniture(SEED.ground);

  // ── THE FOUR AUTHORED STATES, AS A CONTINUOUS REVEAL ─────────────────────────────────────────
  //
  // A step's own cutoff is the NEXT territory's first index rather than its own, so the line
  // visibly REACHES the badge it is about to introduce instead of stopping just short of it — the
  // rule the step table in `BRIEF.md` records, unchanged. What changed is that these four numbers
  // are now the STOPS of an interpolation rather than four separate SSR'd pictures, and the
  // territory that a step introduces has its own arrival threshold at its own first index, so the
  // reveal passes exactly through each authored state at progress 0, 1, 2 and 3.
  const stops = STEP_GROUPS.map((group) => {
    const nextKey = order[order.indexOf(group.throughKey) + 1];
    return nextKey ? crossings.find((c) => c.key === nextKey).firstIndex : route.length - 1;
  });
  // The step table asserted rather than trusted: each step's own `addKeys` must be exactly the
  // territories whose arrival threshold falls in that step. A cutoff edited without its group is
  // the way this beat's committed pictures would silently stop matching its own brief.
  let expected = [];
  STEP_GROUPS.forEach((group, i) => {
    // Half-open, `[previous cutoff, this cutoff)`, because a step's cutoff IS the next territory's
    // own first index: at that index the next country's arrival has only just begun (opacity 0),
    // which is precisely why the authored picture there shows this step's territories and not the
    // following one's. The last step closes the interval, since nothing follows it.
    const from = i === 0 ? -1 : stops[i - 1];
    const last = i === STEP_GROUPS.length - 1;
    const arriving = crossings
      .filter((c) => c.firstIndex >= from && (last ? c.firstIndex <= stops[i] : c.firstIndex < stops[i]))
      .map((c) => c.key);
    expected = [...expected, ...group.addKeys];
    if (arriving.join(",") !== group.addKeys.join(","))
      throw new Error(
        `step "${group.id}" says it adds ${group.addKeys.join(", ")}, but the route reaches ` +
          `${arriving.join(", ") || "nothing"} between index ${from} and its own cutoff ${stops[i]}`,
      );
  });
  if (expected.join(",") !== order.join(","))
    throw new Error(`the steps between them add ${expected.join(", ")}, but the route crosses ${order.join(", ")}`);

  const { total: routeLength, cum } = routeLengths(geometry.route);

  const crossingsAll = order.map((key, i) => {
    const from = crossings[i].firstIndex;
    const next = i + 1 < crossings.length ? crossings[i + 1].firstIndex : route.length - 1;
    return {
      key,
      colour: territoryColour(i),
      order: i + 1,
      rings: geomByKey.get(key).rings,
      anchor: geometry.anchors[key],
      from,
      // Finishes arriving when the next country is reached, or after `ARRIVAL_SAMPLES`, whichever
      // is sooner — so a territory is never still fading in when the step after it starts.
      to: from + Math.min(next - from, ARRIVAL_SAMPLES),
    };
  });

  const visual = createElement(MapFrame, {
    frame: geometry.frame,
    plate,
    crossings: crossingsAll,
    route: geometry.route,
    routeLength,
    cum,
    stops,
    accent: SEED.accent,
    ground: SEED.ground,
    ink: furniture.ink,
    muted: furniture.muted,
    credit: SEED.credit,
  });

  // ── The live MapTiler layer (ruling R1, extended to the scrolly 2026-08-10) ──────────────────
  //
  // The style URL carries the PLACEHOLDER, never a key (R1b): this file is committed, the release
  // is open source, and a pushed key is scanned within minutes and survives in the history.
  // `deliver` substitutes at delivery.
  const nominalCamera = containCamera(NOMINAL_FRAME, geometry.frame, MAX_SCALE);
  const nominalView = viewForCamera(nominalCamera, NOMINAL_FRAME, geometry);
  const livePlan = {
    styleUrl: `https://api.maptiler.com/maps/${geometry.style}/style.json?key=${keyPlaceholder()}`,
    // geo-discipline rule 7, the same override `bake.mjs` applies to the plate: `dataviz-light`
    // paints water grey, which is indistinguishable from a no-data grey.
    waterFill: WATER_TINT,
    center: nominalView.center,
    zoom: nominalView.zoom,
    // The warm runs on the camera the DRIVER resolves against the reader's own box — see
    // `live-scroll-map.mjs`'s header. This flag is what `verify-live-tiles.mjs --no-warm` turns off
    // to measure the same page without the mitigation.
    warmEnabled: true,
    // Only the camera facts the live layer needs — the nine shapes and the route stay where they
    // are, in the SVG this beat already draws, and are never re-projected.
    geometry: {
      frame: geometry.frame,
      frameCorners: geometry.frameCorners,
      worldWidthPx: geometry.worldWidthPx,
    },
  };

  const driveConfig = {
    plate: geometry.frame,
    stops,
    routeLength,
    cum,
    territories: crossingsAll.map((c) => ({ key: c.key, from: c.from, to: c.to, anchor: c.anchor })),
  };

  const driverSource = await readFile(join(HERE, "route-drive.mjs"), "utf8");
  const liveSource = await readFile(join(HERE, "live-scroll-map.mjs"), "utf8");
  const maplibreJs = await readFile(MAPLIBRE_JS, "utf8");
  const maplibreCss = await readFile(MAPLIBRE_CSS, "utf8");
  const boot =
    driverSource.replace(/^export /gm, "") +
    liveSource.replace(/^export /gm, "") +
    `\n;(function () {\n` +
    `  if (window.__danubeStarted) return;\n` +
    `  window.__danubeStarted = true;\n` +
    // The script sits inside the GRAPHIC, which the scaffold emits BEFORE the prose column, so no
    // panel exists yet when this tag is parsed. Booting here made the driver exit on its own
    // "fewer than two panels" guard, silently, on a sibling beat.
    `  function boot() {\n` +
    `    var root = document.querySelector('[data-visual="danube-route"]');\n` +
    `    if (!root) return;\n` +
    // The live layer is booted FIRST so its `follow` exists before the first paint, and it returns
    // null — leaving the plate showing and the reveal driving alone — whenever the page carries the
    // placeholder, has no MapLibre, or has no container.
    `    var live = initLiveScrollMap(root, ${JSON.stringify(livePlan)}, {});\n` +
    `    initRouteScrolly(root, ${JSON.stringify(driveConfig)}, live ? live.follow : null);\n` +
    `  }\n` +
    `  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);\n` +
    `  else boot();\n` +
    `})();\n`;

  // ONE picture, not four. The visual and the scripts ride step 1's own wrapper — the one the
  // scaffold marks `.active` at build time, so a no-JavaScript reader still meets the opening
  // state — and `detachVisual` lifts it out of the stack on boot, where the step swap can never
  // fade it (or the live map inside it) away.
  const steps = STEP_GROUPS.map((group, i) => ({
    id: group.id,
    prose: group.prose,
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

  const { outPath, panelContrast } = await renderScrolly({
    steps,
    title: SEED.title,
    source: SEED.source,
    ground: SEED.ground,
    outDir,
    name: "danube-scrolly.html",
    proseLane: PROSE_LANE,
  });
  console.log(
    `map-scrolly → ${outPath}  [${steps.length} steps, panel contrast ${panelContrast.toFixed(2)}:1, order ${order.join(" -> ")}]\n` +
      `  reveal stops (route index) ${stops.join(" -> ")} of ${route.length - 1}, route ${routeLength.toFixed(0)} plate units\n` +
      `  live basemap ${geometry.style}, camera fixed at ${nominalView.center[0].toFixed(3)},` +
      `${nominalView.center[1].toFixed(3)} @ z${nominalView.zoom.toFixed(3)} in a ${NOMINAL_FRAME.width}x${NOMINAL_FRAME.height} frame ` +
      `(contain fit ${nominalCamera.scale.toFixed(3)}, ${(MAX_SCALE / nominalCamera.scale).toFixed(2)} raster px per delivered px)`,
  );
  return { outPath };
}

if (import.meta.main) await render();

export { render };
