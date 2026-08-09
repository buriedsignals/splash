// The render ladder for THIS beat: still (rung 1) → video final frame (rung 2) → mp4 (rung 3).
// Runs the crossing-order claim check before drawing (same discipline as
// `proof/mapmore-flow-danube/render.mjs`), derives the furniture in node.
//
// Usage:
//   bun proof/mapgen-flowmap-video/render-map.mjs --still
//   bun proof/mapgen-flowmap-video/render-map.mjs --final-frame
//   bun proof/mapgen-flowmap-video/render-map.mjs --video

import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { deriveFurniture, renderStill } from "./render-still.mjs";
import { FlowMapStill } from "./FlowMapStill.tsx";
import {
  parseRouteCsv,
  territoriesCrossed,
  territoryColour,
  cumulativeKm,
} from "./geo-flow.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(HERE, "../..");
const ENTRY = join(HERE, "index.ts");
const COMPOSITION = "flowmap-video";

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
    "country's edge, not through its interior. Order is each territory's first entry along the " +
    "route, not distance travelled inside it. Moldova's short Danube frontage near Giurgiulești " +
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
const platePath = flag("--plate", "/tmp/map-twin/mapgen-flowmap-video");
const routePath = flag("--route", join(HERE, "danube-route.csv"));
const countriesPath = flag("--countries", join(HERE, "countries.geojson"));
const wantStill = argv.includes("--still");
const wantFinalFrame = argv.includes("--final-frame");
const wantVideo = argv.includes("--video");

async function plateOf(dir) {
  const geometry = JSON.parse(await readFile(join(dir, "geometry.json"), "utf8"));
  const png = await readFile(join(dir, "plate.png"));
  return { geometry, plate: `data:image/png;base64,${png.toString("base64")}` };
}

// ── The claim check: the title states the crossing order verbatim — assert it against what the
// bake actually computed from the real route and the real shapes, not against what the title merely
// claims. `twin-map-beat/references/types/flow-map.md`'s own "one thing that goes wrong." ──────────
const routeLonLat = parseRouteCsv(await readFile(routePath, "utf8"));
const collection = JSON.parse(await readFile(countriesPath, "utf8"));
const territories = collection.features.map((f) => ({
  key: f.properties.ADM0_A3,
  name: f.properties.NAME_FR ?? f.properties.NAME,
  geometry: f.geometry,
}));
const crossingsComputed = territoriesCrossed(routeLonLat, territories);
const cumKm = cumulativeKm(routeLonLat);
const totalKm = cumKm[cumKm.length - 1];

const computedOrder = crossingsComputed.map((c) => c.key);
if (
  computedOrder.length !== EXPECTED_ORDER.length ||
  computedOrder.some((k, i) => k !== EXPECTED_ORDER[i])
)
  throw new Error(
    `claim check failed: the title states the order ${EXPECTED_ORDER.join(" -> ")}, ` +
      `but the bake computed ${computedOrder.join(" -> ")} from the real route and shapes.`,
  );
console.log(
  `claim: crossing order ${computedOrder.join(" -> ")} matches the title — supported. ` +
    `Total route length: ${totalKm.toFixed(1)} km.`,
);

const furniture = deriveFurniture(BEAT.ground);

await mkdir(outDir, { recursive: true });

// ── Rung 1: the still ──────────────────────────────────────────────────────────────────────────
if (wantStill) {
  const { geometry, plate } = await plateOf(platePath);

  if (
    geometry.crossings.length !== EXPECTED_ORDER.length ||
    geometry.crossings.some((k, i) => k !== EXPECTED_ORDER[i])
  )
    throw new Error(
      `baked geometry's crossing order ${geometry.crossings.join(" -> ")} does not match the ` +
        `pure-core computation ${computedOrder.join(" -> ")} — the bake and the render disagree.`,
    );

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
    width: 1080,
    height: 900,
    outDir,
    name: "static",
  });
  console.log(`still → ${pngPath}\nNow open it and look at it.`);
}

// ── Rungs 2 and 3: the video ───────────────────────────────────────────────────────────────────
function remotion(args) {
  const binary = join(PACKAGE_ROOT, "node_modules/.bin/remotion");
  const started = Date.now();
  const result = spawnSync(binary, args, { cwd: PACKAGE_ROOT, stdio: "inherit" });
  if (result.status !== 0) throw new Error(`remotion ${args[0]} exited with ${result.status}`);
  return Math.round((Date.now() - started) / 1000);
}

if (wantFinalFrame || wantVideo) {
  const { geometry, plate } = await plateOf(platePath);

  if (
    geometry.crossings.length !== EXPECTED_ORDER.length ||
    geometry.crossings.some((k, i) => k !== EXPECTED_ORDER[i])
  )
    throw new Error(
      `baked geometry's crossing order ${geometry.crossings.join(" -> ")} does not match the ` +
        `pure-core computation ${computedOrder.join(" -> ")} — the bake and the render disagree.`,
    );

  const crossings = geometry.crossings.map((key, i) => {
    const territory = geometry.territories.find((t) => t.key === key);
    if (!territory) throw new Error(`no baked territory for ${key}`);
    const computed = crossingsComputed.find((c) => c.key === key);
    if (!computed) throw new Error(`no pure-core crossing for ${key}`);
    return {
      key,
      name: NAMES[key] ?? key,
      colour: territoryColour(i),
      order: i + 1,
      fraction: cumKm[computed.firstIndex] / totalKm,
      rings: territory.rings,
      anchor: geometry.anchors[key],
    };
  });

  const props = {
    geometry: { frame: geometry.frame, route: geometry.route },
    crossings,
    cumKm,
    plate,
    title: BEAT.title,
    source: BEAT.source,
    basemapCredit: BEAT.basemapCredit,
    caveat: BEAT.caveat,
    ground: BEAT.ground,
    accent: BEAT.accent,
    ...furniture,
  };

  const propsPath = join(outDir, "video-props.json");
  await writeFile(propsPath, JSON.stringify(props));

  const framePath = join(outDir, "final-frame.png");
  const stillSeconds = remotion([
    "still",
    ENTRY,
    COMPOSITION,
    framePath,
    "--frame=-1",
    `--props=${propsPath}`,
    "--timeout=180000",
  ]);
  console.log(`final frame (--frame=-1) → ${framePath}  [${stillSeconds}s]`);

  if (wantVideo) {
    const videoPath = join(outDir, "flowmap.mp4");
    const videoSeconds = remotion([
      "render",
      ENTRY,
      COMPOSITION,
      videoPath,
      `--props=${propsPath}`,
      "--concurrency=1",
      "--timeout=180000",
    ]);
    console.log(`video → ${videoPath}  [${videoSeconds}s]`);
  }
}

if (!wantStill && !wantFinalFrame && !wantVideo)
  console.log("nothing asked for. Pass --still, --final-frame or --video.");
