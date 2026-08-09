// The runner for the map-scrolly beat: the reader scrolls, and the SAME baked Danube plate
// (`mapmore-flow-danube`'s own bake — one fixed camera, geo-discipline.md rule 2: "move within the
// plate," never re-bake per step) reveals a growing slice of the route and a growing set of
// crossed territories, four narrative steps at a time.
//
// This file is a CONSUMER of `twin-scrolly`: it imports the skill's own generic `renderScrolly`
// (the media-agnostic scaffold, above its CONFIG marker) and builds its own `steps` array from its
// own frame component (`MapFrame.tsx`) — exactly the shape `twin-scrolly/SKILL.md`'s own "How it
// works" describes for a real beat. Nothing under `twin-scrolly/` is edited by this file.
//
// Usage:
//   bun proof/mapmore-scrolly-danube/render.mjs [outDir]

import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { deriveFurniture } from "./render-still.mjs";
import { parseRouteCsv, territoriesCrossed, territoryColour } from "./geo-flow.ts";
import { MapFrame } from "./MapFrame.tsx";
import { renderScrolly } from "../../skills/twin-scrolly/scripts/render-scrolly.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

const SEED = {
  ground: "#FFFFFF",
  accent: "#E69F00",
  title: "Following the Danube: one river, nine countries, one continuous line",
  source:
    "River course: Natural Earth 1:10m Rivers + Lake Centerlines. Territory shapes: Natural Earth " +
    "1:50m Admin 0 Countries. Same bake as the sibling static flow-map beat (mapmore-flow-danube) — " +
    "one fixed camera, reused rather than re-baked per step.",
};

// Cumulative groups: each step's own territory KEYS are the group's own countries PLUS every
// earlier step's — the map only ever gains ground as the reader scrolls, never loses it, which is
// what "the map advances" has to mean for a route beat.
const STEP_GROUPS = [
  {
    id: "source",
    throughKey: "SVK", // reveal the route up to (and including) Slovakia's own first entry
    addKeys: ["DEU", "AUT", "SVK"],
    prose: [
      "The Danube rises in Germany's Black Forest and is already a working river by the time it " +
        "reaches Austria — this first stretch alone touches three countries before Vienna.",
    ],
  },
  {
    id: "plain",
    throughKey: "SRB",
    addKeys: ["HUN", "HRV", "SRB"],
    prose: [
      "East of Bratislava the river opens onto the Pannonian Plain, then squeezes through the Iron " +
        "Gate gorge on the Serbian-Romanian border — three more countries, several of them touched " +
        "only because the river itself IS the border here.",
    ],
  },
  {
    id: "border-run",
    throughKey: "BGR",
    addKeys: ["ROU", "BGR"],
    prose: [
      "For nearly 500 km the Danube forms the entire Romania-Bulgaria border in one uninterrupted " +
        "run, the longest single stretch of the whole journey.",
    ],
  },
  {
    id: "delta",
    throughKey: "UKR",
    addKeys: ["UKR"],
    prose: [
      "The river finally splits into its delta near the Ukrainian border and empties into the Black " +
        "Sea — the ninth and last country the Danube touches on its way there.",
    ],
  },
];

const argv = process.argv.slice(2);
const outDir = resolve(argv.find((a) => !a.startsWith("--")) ?? "/tmp/scrolly-twin/mapmore-danube");
const platePath = argv.includes("--plate")
  ? argv[argv.indexOf("--plate") + 1]
  : "/tmp/map-twin/mapmore-flow-900x420";

async function render() {
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

  const geometry = JSON.parse(await readFile(join(platePath, "geometry.json"), "utf8"));
  const plateBuffer = await readFile(join(platePath, "plate.png"));
  const plate = `data:image/png;base64,${plateBuffer.toString("base64")}`;

  const geomByKey = new Map(geometry.territories.map((t) => [t.key, t]));

  const furniture = deriveFurniture(SEED.ground);

  let revealedKeys = [];
  const steps = STEP_GROUPS.map((group) => {
    revealedKeys = [...revealedKeys, ...group.addKeys];
    const throughIndex = crossings.find((c) => c.key === group.throughKey).firstIndex;
    // Reveal the route up through the NEXT territory's own start (or the end, on the last step) so
    // the line visibly reaches the badge it is about to introduce, not stop just short of it.
    const groupIndexInOrder = order.indexOf(group.throughKey);
    const nextKey = order[groupIndexInOrder + 1];
    const cutoff = nextKey ? crossings.find((c) => c.key === nextKey).firstIndex : route.length - 1;
    const routeSoFar = geometry.route.slice(0, cutoff + 1);

    const crossingsSoFar = revealedKeys.map((key) => {
      const i = order.indexOf(key);
      const t = geomByKey.get(key);
      return { key, colour: territoryColour(i), order: i + 1, rings: t.rings, anchor: geometry.anchors[key] };
    });

    return {
      id: group.id,
      prose: group.prose,
      frame: createElement(MapFrame, {
        frame: geometry.frame,
        plate,
        crossings: crossingsSoFar,
        route: routeSoFar,
        accent: SEED.accent,
        ground: SEED.ground,
      }),
    };
  });

  const { outPath, panelContrast } = await renderScrolly({
    steps,
    title: SEED.title,
    source: SEED.source,
    ground: SEED.ground,
    outDir,
    name: "danube-scrolly.html",
  });
  console.log(
    `map-scrolly → ${outPath}  [${steps.length} steps, panel contrast ${panelContrast.toFixed(2)}:1, order ${order.join(" -> ")}]`,
  );
  return { outPath };
}

if (import.meta.main) await render();

export { render };
