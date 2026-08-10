// The render ladder for THIS beat: still (rung 1) → video final frame (rung 2) → mp4 (rung 3).
// Runs the crossing-order claim check before drawing (same discipline as
// `proof/mapmore-flow-danube/render.mjs`), derives the furniture in node.
//
// Usage:
//   bun proof/mapgen-flowmap-video/render-map.mjs --still
//   bun proof/mapgen-flowmap-video/render-map.mjs --still --size square   # LOOKING, into sizes/
//   bun proof/mapgen-flowmap-video/render-map.mjs --final-frame
//   bun proof/mapgen-flowmap-video/render-map.mjs --video

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { deriveFurniture, renderStill } from "./render-still.mjs";
// `readPalette` comes from the SHARED copy through the `#shared/…` subpath alias — a beat is a
// story, not a skill, so it may reach out where a skill may not.
import { readPalette } from "#shared/chart-beat/render-still.mjs";
// The STATIC genre's size table — the same one every static beat reads, and deliberately not a
// fourth copy of it. A static map sits in the same ~900px article column a static chart does.
import {
  assertDeliveredSize,
  assertTypeFloor,
  assertWithinStage,
  readPinnedSize,
  readPngSize,
  sizeFor,
} from "#shared/chart-beat/sizes.mjs";
// The VIDEO genre reads its OWN table: a landscape video is watched on a phone turned sideways, so
// its floor is 30 where the static's is 26. Two genres, two reading distances, two answers — and
// the video's delivery is asserted against the video's own row, never against the static's, even
// where the two rows happen to carry the same two numbers today.
import {
  assertDeliveredSize as assertVideoSize,
  sizeFor as videoSizeFor,
} from "#shared/chart-video/sizes.mjs";
import { FlowMapStill } from "./FlowMapStill.tsx";
import {
  assertTerritoryFillsReadAsLand,
  parseRouteCsv,
  territoriesCrossed,
  territoryColour,
  cumulativeKm,
} from "./geo-flow.ts";

const HERE = dirname(fileURLToPath(import.meta.url));

// The palette is legal only once it is composited: a hue, its fill-opacity and the basemap's water
// tint live in three different places and can only disagree on the plate. Checked here, at render,
// so a fill that reads as sea stops the run instead of shipping (geo-discipline.md rule 7).
assertTerritoryFillsReadAsLand();
const PACKAGE_ROOT = resolve(HERE, "../..");
const ENTRY = join(HERE, "index.ts");
const BEAT_ID = "mapgen-flowmap-video";

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
    "country's edge, not through its interior. Order is each territory's first entry along the " +
    "route, not distance travelled inside it. Moldova's short Danube frontage near Giurgiulești " +
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
// missing. Before this the size was two literals in each component and two more below, compared
// against each other by `renderStill` — so they agreed by construction and the pin reached nothing.
const pinnedSize = await readPinnedSize(HERE, { readFile, dirname, join });
// `--size <name>` renders one of the OTHER two, into `sizes/`, so all three can be opened and
// compared. Deliberately NOT a way to change what this beat delivers.
const sizeFlag = argv.indexOf("--size");
const size = sizeFlag === -1 ? pinnedSize : argv[sizeFlag + 1];
const { width: FRAME_WIDTH, height: FRAME_HEIGHT } = sizeFor(size);
if (sizeFlag !== -1)
  console.log(`LOOKING at ${size}; the pinned size stays ${pinnedSize}`);
console.log(
  `pinned size: ${size} — still ${FRAME_WIDTH}x${FRAME_HEIGHT}, ` +
    `video ${videoSizeFor(size).width}x${videoSizeFor(size).height}`,
);

const outDir = flag(
  "--out",
  sizeFlag === -1 ? join(HERE, "render") : join(HERE, "sizes"),
);
const stem = sizeFlag === -1 ? "static" : `static-${size}`;
// The plate is frozen BESIDE THE BEAT, exactly as the csv is: `/tmp` cannot be committed, so a
// render reading its basemap from there leaves an mp4 nobody can reproduce or audit — and MapTiler
// restyles, so a re-bake months later is a different picture under the same route.
const platePath = flag("--plate", join(HERE, "plate"));
const routePath = flag("--route", join(HERE, "danube-route.csv"));
const countriesPath = flag("--countries", join(HERE, "countries.geojson"));
const wantStill = argv.includes("--still");
const wantFinalFrame = argv.includes("--final-frame");
const wantVideo = argv.includes("--video");

/** Bakes the plate ONLY when the frozen one is absent — a warm run never touches the network. */
function ensurePlate(plateDir) {
  if (existsSync(join(plateDir, "geometry.json")) && existsSync(join(plateDir, "plate.png"))) return;
  console.log(`no frozen plate at ${plateDir} — baking one there.`);
  const result = spawnSync("bun", [join(HERE, "bake-plate.mjs"), "--out", plateDir], {
    cwd: resolve(HERE, "../../.."),
    stdio: "inherit",
  });
  if (result.status !== 0) throw new Error(`bake-plate.mjs exited with ${result.status}`);
}

async function plateOf(dir) {
  ensurePlate(dir);
  const geometry = JSON.parse(await readFile(join(dir, "geometry.json"), "utf8"));
  const png = await readFile(join(dir, "plate.png"));
  return { geometry, plate: `data:image/png;base64,${png.toString("base64")}` };
}

// ── The claim check: the title states the crossing order verbatim — assert it against what the
// bake actually computed from the real route and the real shapes, not against what the title merely
// claims. `map-beat/references/types/flow-map.md`'s own "one thing that goes wrong." ──────────
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
      // A ladder rung that fires SILENTLY is a decision nobody took.
      onRemoval: (note) => console.log(`removal ladder — ${note}`),
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
  assertDeliveredSize(readPngSize(await readFile(pngPath)), size, {
    what: pngPath,
  });
  const svg = await readFile(svgPath, "utf8");
  assertTypeFloor(svg, size, { what: "mapgen-flowmap-video (still)" });
  assertWithinStage(svg, size, { what: "mapgen-flowmap-video (still)" });
  console.log(
    `still → ${pngPath} at ${FRAME_WIDTH}x${FRAME_HEIGHT}, verified from the file\nNow open it and look at it.`,
  );
}

// ── Rungs 2 and 3: the video ───────────────────────────────────────────────────────────────────
function remotion(args) {
  const binary = join(PACKAGE_ROOT, "node_modules/.bin/remotion");
  const started = Date.now();
  const result = spawnSync(binary, args, { cwd: PACKAGE_ROOT, stdio: "inherit" });
  if (result.status !== 0) throw new Error(`remotion ${args[0]} exited with ${result.status}`);
  return Math.round((Date.now() - started) / 1000);
}

/**
 * The DELIVERED mp4's own dimensions, read out of the container by `ffprobe`.
 *
 * The video analogue of `readPngSize`, and it exists for the same reason: the only reading the code
 * that wrote the file cannot make agree with itself. `Root.tsx` sizes the composition and the
 * component draws into it, both from the same table — so they agree by construction, and an encoder
 * that letterboxed, or a `--scale` left on a command line, would arrive in the newsroom unnoticed.
 */
function mp4Size(path) {
  const probe = spawnSync(
    "ffprobe",
    ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", path],
    { encoding: "utf8" },
  );
  if (probe.status !== 0) throw new Error(`ffprobe could not read ${path}: ${probe.stderr}`);
  const [width, height] = probe.stdout.trim().split(",").map(Number);
  if (!Number.isFinite(width) || !Number.isFinite(height))
    throw new Error(`ffprobe returned no dimensions for ${path}: ${probe.stdout}`);
  return { width, height };
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
    geometry: {
      frame: geometry.frame,
      // `mapStageBox` reads the longitude the camera actually showed off `frameCorners`, never the
      // bounds somebody typed — so the video's stage decision rests on the same record the still's
      // does, and neither is handed a number.
      frameCorners: geometry.frameCorners,
      route: geometry.route,
    },
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
    size,
  };

  // `remotion still` / `remotion render` select a beat by composition ID and nothing else, and
  // `Root.tsx` now registers one per row of the video table.
  const COMPOSITION = `${BEAT_ID}-${size}`;
  const propsPath = join(outDir, `video-props-${size}.json`);
  await writeFile(propsPath, JSON.stringify(props));

  // THE FINAL FRAME FIRST, and its size asserted, before an mp4 is spent. `--frame=-1` is the last
  // frame of the hold — the state the beat ends in, which is the one a reviewer reads.
  const framePath = join(outDir, `final-frame-${size}.png`);
  const stillSeconds = remotion([
    "still",
    ENTRY,
    COMPOSITION,
    framePath,
    "--frame=-1",
    `--props=${propsPath}`,
    "--timeout=180000",
  ]);
  assertVideoSize(readPngSize(await readFile(framePath)), size, {
    what: framePath,
  });
  console.log(
    `final frame (--frame=-1) → ${framePath}  [${stillSeconds}s], verified from the file`,
  );

  if (wantVideo) {
    const videoPath = join(outDir, `flowmap-${size}.mp4`);
    const videoSeconds = remotion([
      "render",
      ENTRY,
      COMPOSITION,
      videoPath,
      `--props=${propsPath}`,
      "--concurrency=1",
      "--timeout=180000",
    ]);
    // THE DELIVERED CONTAINER, MEASURED. Not the composition's arguments — the mp4 on disk.
    assertVideoSize(mp4Size(videoPath), size, { what: videoPath });
    console.log(
      `video → ${videoPath}  [${videoSeconds}s], verified from the container`,
    );
  }
}

if (!wantStill && !wantFinalFrame && !wantVideo)
  console.log("nothing asked for. Pass --still, --final-frame or --video.");
