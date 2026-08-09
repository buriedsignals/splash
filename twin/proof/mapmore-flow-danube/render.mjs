// The render ladder for the flow-map (route) beat. Static genre only.
//
// Usage:
//   bun proof/mapmore-flow-danube/render.mjs --still

import { mkdir, readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { deriveFurniture, renderStill } from "./render-still.mjs";
import { FlowMapStill } from "./FlowMapStill.tsx";
import { territoryColour } from "./geo-flow.ts";

const HERE = dirname(fileURLToPath(import.meta.url));

const BEAT = {
  ground: "#FFFFFF",
  accent: "#E69F00", // Okabe-Ito orange — held back from the territory cycle for the route itself.
  title:
    "From the Black Forest to the Black Sea: the Danube touches nine countries, in this order — " +
    "Germany, Austria, Slovakia, Hungary, Croatia, Serbia, Romania, Bulgaria, Ukraine.",
  source:
    "Source: river course — Natural Earth 1:10m Rivers + Lake Centerlines (“Danube” and " +
    "“Donau” features, merged into one ordered path); territory shapes — Natural Earth " +
    "1:50m Admin 0 Countries.",
  basemapCredit: "basemap © MapTiler, © OpenStreetMap",
  caveat:
    "For long stretches (Slovakia–Hungary near Bratislava, Croatia–Serbia, Serbia–Romania, " +
    "Romania–Bulgaria) the river IS the border, so “crossed” means the route runs along that " +
    "country's edge, not through its interior. Order is each territory's first entry along the route, " +
    "not distance travelled inside it. Moldova's short Danube frontage near Giurgiulești " +
    "(under 1 km) does not register at this map's resolution and is not shown.",
  alt:
    "Map of central and southeastern Europe. A single orange line traces the Danube from " +
    "southwestern Germany to the Black Sea delta near the Ukrainian border. Nine countries along " +
    "its path are filled in distinct colours and numbered in the order the route first reaches " +
    "them: 1 Germany, 2 Austria, 3 Slovakia, 4 Hungary, 5 Croatia, 6 Serbia, 7 Romania, 8 Bulgaria, " +
    "9 Ukraine.",
};

const EXPECTED_ORDER = ["DEU", "AUT", "SVK", "HUN", "HRV", "SRB", "ROU", "BGR", "UKR"];
const NAMES = {
  DEU: "Germany",
  AUT: "Austria",
  SVK: "Slovakia",
  HUN: "Hungary",
  HRV: "Croatia",
  SRB: "Serbia",
  ROU: "Romania",
  BGR: "Bulgaria",
  UKR: "Ukraine",
};

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv[at + 1] : fallback;
};

const outDir = flag("--out", join(HERE, "render"));
const stillPlate = flag("--still-plate", "/tmp/map-twin/mapmore-flow-900x420");
const wantStill = argv.includes("--still");

async function plateOf(dir) {
  const geometry = JSON.parse(await readFile(join(dir, "geometry.json"), "utf8"));
  const png = await readFile(join(dir, "plate.png"));
  return { geometry, plate: `data:image/png;base64,${png.toString("base64")}` };
}

await mkdir(outDir, { recursive: true });

if (wantStill) {
  const { geometry, plate } = await plateOf(stillPlate);

  // The claim check: the title states the crossing order verbatim — assert it against what the
  // bake actually computed from the real route and the real shapes, not against what the title
  // merely claims. `twin-map-beat/references/types/flow-map.md`'s own "one thing that goes wrong."
  if (geometry.crossings.length !== EXPECTED_ORDER.length || geometry.crossings.some((k, i) => k !== EXPECTED_ORDER[i]))
    throw new Error(
      `claim check failed: the title states the order ${EXPECTED_ORDER.join(" -> ")}, ` +
        `but the bake computed ${geometry.crossings.join(" -> ")} from the real route and shapes.`,
    );
  console.log(`claim: crossing order ${geometry.crossings.join(" -> ")} matches the title — supported.`);

  const crossings = geometry.crossings.map((key, i) => {
    const territory = geometry.territories.find((t) => t.key === key);
    if (!territory) throw new Error(`no baked territory for ${key}`);
    return {
      key,
      name: NAMES[key] ?? key,
      colour: territoryColour(i),
      order: i + 1,
      rings: territory.rings,
      anchor: geometry.anchors[key],
    };
  });

  const furniture = deriveFurniture(BEAT.ground);

  const { pngPath } = await renderStill({
    element: createElement(FlowMapStill, {
      geometry,
      plate,
      crossings,
      route: geometry.route,
      accent: BEAT.accent,
      title: BEAT.title,
      source: BEAT.source,
      basemapCredit: BEAT.basemapCredit,
      caveat: BEAT.caveat,
      alt: BEAT.alt,
      ground: BEAT.ground,
      ...furniture,
    }),
    width: 960,
    height: 780,
    outDir,
    name: "static",
  });
  console.log(`still → ${pngPath}\nNow open it and look at it.`);
} else console.log("nothing asked for. Pass --still.");
