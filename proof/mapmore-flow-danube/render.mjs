// The render ladder for the flow-map (route) beat. Static genre only.
//
// Usage:
//   bun proof/mapmore-flow-danube/render.mjs --still
//   bun proof/mapmore-flow-danube/render.mjs --still --size square    # LOOKING, into sizes/

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { deriveFurniture, renderStill } from "./render-still.mjs";
// `readPalette` comes from the SHARED copy through the `#shared/…` subpath alias — a beat is a
// story, not a skill, so it may reach out where a skill may not.
import { readPalette } from "#shared/chart-beat/render-still.mjs";
// The STATIC genre's size table — the same one every static chart beat reads, and deliberately not
// a fourth copy of it. `minTypePx` is "12 CSS px at the distance this output is read", and a static
// map sits in the same ~900px article column a static chart does.
import {
  assertDeliveredSize,
  assertTypeFloor,
  assertWithinStage,
  readPinnedSize,
  readPngSize,
  sizeFor,
} from "#shared/chart-beat/sizes.mjs";
import { FlowMapStill } from "./FlowMapStill.tsx";
import { assertTerritoryFillsReadAsLand, territoryColour } from "./geo-flow.ts";

const HERE = dirname(fileURLToPath(import.meta.url));

// The palette is legal only once it is composited: a hue, its fill-opacity and the basemap's water
// tint live in three different places and can only disagree on the plate. Checked here, at render,
// so a fill that reads as sea stops the run instead of shipping (geo-discipline.md rule 7).
assertTerritoryFillsReadAsLand();

// The colours are READ, not typed — see `PALETTE.md` beside this file.
const PALETTE = readPalette(HERE, { stopAt: join(HERE, "..") });
console.log(
  `palette from ${PALETTE.source} — ground ${PALETTE.ground}, accent ${PALETTE.accent}, ` +
    `chosen by ${PALETTE.origin}`,
);

const BEAT = {
  ground: PALETTE.ground,
  // Held back from the territory cycle for the route itself — see PALETTE.md for the value and
  // for why it is one step deeper than the Okabe–Ito orange this beat used to name here.
  accent: PALETTE.accent,
  title:
    "From the Black Forest to the Black Sea: the Danube touches ten countries — nine of them " +
    "shown here, in crossing order — Germany, Austria, Slovakia, Hungary, Croatia, Serbia, " +
    "Romania, Bulgaria, Ukraine.",
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
    "southwestern Germany to the Black Sea delta near the Ukrainian border. Nine of the ten " +
    "countries the river touches are filled in distinct colours and numbered in the order the " +
    "route first reaches them: 1 Germany, 2 Austria, 3 Slovakia, 4 Hungary, 5 Croatia, 6 Serbia, " +
    "7 Romania, 8 Bulgaria, 9 Ukraine. The tenth, Moldova, has too short a frontage to register " +
    "at this map's resolution and is not shown.",
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

// THE JOURNALIST'S DECISION, READ RATHER THAN RETYPED. Gate 2c pins a size; this beat records it in
// its own `BRIEF.md` front matter; `readPinnedSize` throws naming every path it looked at if it is
// missing. Before this the size was two literals in the component and two more below, compared
// against each other by `renderStill` — so they agreed by construction and the pin reached nothing.
const pinnedSize = await readPinnedSize(HERE, { readFile, dirname, join });
// `--size <name>` renders one of the OTHER two, into `sizes/`, so all three can be opened and
// compared. Deliberately NOT a way to change what this beat delivers: the delivered file keeps the
// beat's own name and the pinned size, and an override says so on stdout and writes elsewhere.
const sizeFlag = argv.indexOf("--size");
const size = sizeFlag === -1 ? pinnedSize : argv[sizeFlag + 1];
const { width: FRAME_WIDTH, height: FRAME_HEIGHT } = sizeFor(size);

const outDir = flag(
  "--out",
  sizeFlag === -1 ? join(HERE, "render") : join(HERE, "sizes"),
);
const stem = sizeFlag === -1 ? "static" : `static-${size}`;
if (sizeFlag !== -1)
  console.log(`LOOKING at ${size}; the pinned size stays ${pinnedSize} -> ${outDir}`);
console.log(`pinned size: ${size} (${FRAME_WIDTH}x${FRAME_HEIGHT})`);
// The plate is frozen BESIDE THE BEAT, exactly as the csv is: `/tmp` cannot be committed, so a
// render reading its basemap from there leaves an artifact nobody can reproduce or audit — and
// MapTiler restyles, so a re-bake months later is a different picture under the same marks.
const PLATE_SIZE = "900x420";
const stillPlate = flag("--still-plate", join(HERE, "plate"));
const wantStill = argv.includes("--still");

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

async function plateOf(dir) {
  const geometry = JSON.parse(await readFile(join(dir, "geometry.json"), "utf8"));
  const png = await readFile(join(dir, "plate.png"));
  return { geometry, plate: `data:image/png;base64,${png.toString("base64")}` };
}

// NO `mkdir` HERE. `renderStill` creates its own `outDir` after the element has rendered, so a run
// that REFUSES a size leaves no directory behind — a `sizes/` that exists and is empty reads as a
// looking arm somebody deleted the output of, rather than as a size this beat will not draw.

if (wantStill) {
  ensurePlate(stillPlate);
  const { geometry, plate } = await plateOf(stillPlate);

  // The claim check: the title states the crossing order verbatim — assert it against what the
  // bake actually computed from the real route and the real shapes, not against what the title
  // merely claims. `map-beat/references/types/flow-map.md`'s own "one thing that goes wrong."
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

  const { pngPath, svgPath } = await renderStill({
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
      size,
    }),
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    // 1:1 — the frame IS the export size, so the PNG on disk measures what gate 2c pinned. The
    // default 2 belongs to the frames that have not moved to the table yet.
    scale: 1,
    outDir,
    name: stem,
  });

  // THE DELIVERED FILE, MEASURED FROM ITS OWN BYTES. Not the element, not the arguments — the PNG
  // on disk. It is the one reading the code that wrote it cannot make agree with itself.
  assertDeliveredSize(readPngSize(await readFile(pngPath)), size, { what: pngPath });
  const svg = await readFile(svgPath, "utf8");
  assertTypeFloor(svg, size, { what: "mapmore-flow-danube" });
  assertWithinStage(svg, size, { what: "mapmore-flow-danube" });
  console.log(
    `still → ${pngPath} at ${FRAME_WIDTH}x${FRAME_HEIGHT}, verified from the file\nNow open it and look at it.`,
  );
} else console.log("nothing asked for. Pass --still.");
