// The render ladder for the locator beat. Static genre only — no video.
//
// Usage:
//   bun proof/map-geneva-locator/render.mjs --still
//   bun proof/map-geneva-locator/render.mjs --still --size square    # LOOKING, into sizes/

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { deriveFurniture, renderStill } from "./render-still.mjs";
// `readPalette` and `seriesInks` come from the SHARED copy through the `#shared/…` subpath alias —
// a beat is a story, not a skill, so it may reach out where a skill may not. This beat's own
// `render-still.mjs` is the rasteriser it renders through and carries neither.
import { readPalette, seriesInks } from "#shared/chart-beat/render-still.mjs";
// The STATIC genre's size table — the same one every static chart beat reads, and deliberately not
// a fourth copy of it. `minTypePx` is "12 CSS px at the distance this output is read", and a static
// map sits in the same ~900px article column a static chart does; a map-only table would be the
// same three rows carrying the same three floors, with a fourth place for them to drift.
import {
  assertDeliveredSize,
  assertTypeFloor,
  assertWithinStage,
  readPinnedSize,
  readPngSize,
  sizeFor,
} from "#shared/chart-beat/sizes.mjs";
import { LocatorStill } from "./LocatorStill.tsx";
import { orgsFromCsv } from "./geo-locator.ts";

const HERE = dirname(fileURLToPath(import.meta.url));

// The colours are READ, not typed. Three categories on a plate that carries no other encoding
// means the marker colour IS this map's data, so all three come out of the recorded answer.
const PALETTE = readPalette(HERE, { stopAt: join(HERE, "..") });
const CATEGORIES = [
  "UN system",
  "Other intergovernmental",
  "Other international body",
];
const CATEGORY_COLOUR = Object.fromEntries(
  CATEGORIES.map((category, index) => [
    category,
    seriesInks(PALETTE, CATEGORIES.length)[index],
  ]),
);
console.log(
  `palette from ${PALETTE.source} — ground ${PALETTE.ground}, chosen by ${PALETTE.origin}; ` +
    CATEGORIES.map((c) => `${c} ${CATEGORY_COLOUR[c]}`).join(", "),
);

const BEAT = {
  ground: PALETTE.ground,
  title: "Geneva's international quarter: eleven organisations, three tiers of the system.",
  source: "Source: Wikidata (query.wikidata.org/sparql), organisations within 6 km of central Geneva",
  basemapCredit: "basemap © MapTiler, © OpenStreetMap",
  legendCaption: "Category",
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

const dataPath = flag("--data", join(HERE, "geneva-orgs.csv"));
const outDir = flag(
  "--out",
  sizeFlag === -1 ? join(HERE, "render") : join(HERE, "sizes"),
);
const stem = sizeFlag === -1 ? "static" : `static-${size}`;
if (sizeFlag !== -1)
  console.log(
    `LOOKING at ${size}; the pinned size stays ${pinnedSize} -> ${outDir}`,
  );
console.log(`pinned size: ${size} (${FRAME_WIDTH}x${FRAME_HEIGHT})`);
// The plate is frozen BESIDE THE BEAT, exactly as the data is: `/tmp` cannot be committed, so a
// render reading its basemap from there leaves an artifact nobody can reproduce or audit — and
// MapTiler restyles, so a re-bake months later is a different picture under the same marks.
const stillPlate = flag("--still-plate", join(HERE, "plate"));
const wantStill = argv.includes("--still");

const orgs = orgsFromCsv(await readFile(dataPath, "utf8"));
console.log(`data: ${orgs.length} organisations`);
for (const category of new Set(orgs.map((o) => o.category)))
  console.log(`  ${category}: ${orgs.filter((o) => o.category === category).length}`);

// ── Which markers stand apart is MEASURED, and then made visible ─────────────────────────────────
// Two corrections live in this block, and both were words the picture beside them refuted.
//
// First: the caveat and the alt singled out the World Economic Forum by name while the declutter
// had dropped its label, so the words pointed at a marker the picture never named. That was fixed
// by deriving the marker instead of typing it — but it was derived as "whichever sits furthest
// EAST", which is a direction, not a separation, and the sentence it produced ("the one marker
// outside the cluster") was false in the delivered render: the International Civil Defence
// Organisation sits alone in the southern third of the frame, and by distance to its own nearest
// neighbour it is the MOST isolated marker on this map (3.32 km, against the WEF's 3.25).
//
// Second, and the reason the alt called the orange tier "nearby": that tier CONTAINS the ICDO.
// A category is not a place, and no adjective about distance is safe to attach to one.
//
// So separation is now derived for every marker, without a typed threshold: take each marker's
// distance to its nearest neighbour, sort them, and split at the single LARGEST gap in that sorted
// list — one-dimensional natural breaks. Here that gap is 2.29 km wide (0.96 → 3.25), five times
// the next largest, and it puts exactly two markers on the far side. Both are then PROMOTED to the
// top of the label priority and passed as `mustLabel`, so the render throws rather than name in
// words a marker the picture leaves anonymous.
const EARTH_KM = 6371;
const RAD = Math.PI / 180;
function greatCircleKm(aLat, aLon, bLat, bLon) {
  const dLat = (bLat - aLat) * RAD;
  const dLon = (bLon - aLon) * RAD;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aLat * RAD) * Math.cos(bLat * RAD) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.sqrt(h));
}

const COMPASS = [
  "north",
  "north-east",
  "east",
  "south-east",
  "south",
  "south-west",
  "west",
  "north-west",
];
/** The 8-point compass direction of `to` seen from `from` — read off the bearing, never typed. */
function headingFrom(from, to) {
  const bearing =
    (Math.atan2((to.lon - from.lon) * Math.cos(from.lat * RAD), to.lat - from.lat) /
      RAD +
      360) %
    360;
  return COMPASS[Math.round(bearing / 45) % 8];
}

const nearest = orgs.map((o) => ({
  org: o,
  km: Math.min(
    ...orgs.filter((x) => x.key !== o.key).map((x) => greatCircleKm(o.lat, o.lon, x.lat, x.lon)),
  ),
}));
const byNearest = [...nearest].sort((a, b) => a.km - b.km);
let splitAt = byNearest.length;
let widestGap = -Infinity;
for (let i = 1; i < byNearest.length; i++) {
  const gap = byNearest[i].km - byNearest[i - 1].km;
  if (gap > widestGap) {
    widestGap = gap;
    splitAt = i;
  }
}
const clustered = byNearest.slice(0, splitAt).map((x) => x.org);
const apartRows = byNearest.slice(splitAt);
if (apartRows.length === 0 || clustered.length === 0)
  throw new Error("the nearest-neighbour split produced an empty side — check the coordinates.");

const centre = {
  lat: clustered.reduce((sum, o) => sum + o.lat, 0) / clustered.length,
  lon: clustered.reduce((sum, o) => sum + o.lon, 0) / clustered.length,
};
const clusterRadiusKm = Math.max(
  ...clustered.map((o) => greatCircleKm(centre.lat, centre.lon, o.lat, o.lon)),
);
// Which organisation the cluster is centred ON, rather than a landmark typed from memory.
const anchor = clustered
  .map((o) => ({ o, km: greatCircleKm(centre.lat, centre.lon, o.lat, o.lon) }))
  .sort((a, b) => a.km - b.km)[0].o;
// Measured FROM THE ANCHOR, because that is what the alt says: a radius around the centroid is not
// a radius around the organisation the sentence names, and the two differ here.
const anchorRadiusKm = Math.max(
  ...clustered.map((o) => greatCircleKm(anchor.lat, anchor.lon, o.lat, o.lon)),
);
const apart = apartRows.map(({ org, km }) => ({
  org,
  nearestKm: km,
  km: greatCircleKm(centre.lat, centre.lon, org.lat, org.lon),
  heading: headingFrom(centre, org),
}));
// East first, so the words run left-to-right across the frame the reader is looking at.
apart.sort((a, b) => b.org.lon - a.org.lon);

console.log(
  `separation: widest gap in nearest-neighbour distance is ${widestGap.toFixed(2)} km — ` +
    `${clustered.length} clustered (within ${clusterRadiusKm.toFixed(1)} km of their centre, ` +
    `anchored on ${anchor.name}), ${apart.length} apart:`,
);
for (const a of apart)
  console.log(
    `  ${a.org.name} — ${a.km.toFixed(2)} km ${a.heading} of the cluster centre, ` +
      `nearest neighbour ${a.nearestKm.toFixed(2)} km, promoted from label priority ${a.org.priority} to first.`,
  );

const categoryCount = (name) => orgs.filter((o) => o.category === name).length;
/** "the World Economic Forum 4.2 km east" … joined with "and" for the last one. */
const apartPhrase = (withCategory) => {
  const parts = apart.map(
    (a) =>
      `the ${a.org.name}${withCategory ? ` (${a.org.category.toLowerCase()})` : ""} ` +
      `${a.km.toFixed(1)} km ${a.heading}`,
  );
  return parts.length === 1
    ? parts[0]
    : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
};

// Number agreement follows the count, which follows the data — a mutation that moved one outlier
// back into the cluster printed "1 stand apart … both labelled" until this was derived too.
const lone = apart.length === 1;
const labelledClause = lone
  ? "labelled on the map"
  : apart.length === 2
    ? "both labelled on the map"
    : "all labelled on the map";

const caveat =
  "A locator marks position only — marker size does not encode a value. Coordinates are the " +
  `organisation's own Wikidata point, not a street address. ${clustered.length} of the ` +
  `${orgs.length} sit within ${clusterRadiusKm.toFixed(1)} km of their common centre; ` +
  `${apart.length} ${lone ? "stands" : "stand"} apart from that cluster: ${apartPhrase(false)}, ` +
  `${labelledClause}.`;
const alt =
  `Map of central Geneva. ${orgs.length} markers show international organisations headquartered in ` +
  `the city, coloured by category: ${categoryCount("UN system")} UN system agencies in blue, ` +
  `${categoryCount("Other intergovernmental")} other intergovernmental bodies in orange and ` +
  `${categoryCount("Other international body")} other international bodies in green. Colour is not ` +
  `position: ${clustered.length} of the markers, from all three categories, sit together within ` +
  `${anchorRadiusKm.toFixed(1)} km of the ${anchor.name}, while ${apart.length} ` +
  `${lone ? "stands" : "stand"} alone in the frame and ${lone ? "is" : "are"} labelled beside ` +
  `${lone ? "its own point" : "their own points"} — ${apartPhrase(true)} of that cluster.`;

const furniture = deriveFurniture(BEAT.ground);

/** Bakes the plate ONLY when the frozen one is absent — a warm run never touches the network. */
function ensurePlate(plateDir) {
  if (existsSync(join(plateDir, "geometry.json")) && existsSync(join(plateDir, "plate.png"))) return;
  console.log(`no frozen plate at ${plateDir} — baking one there.`);
  const result = spawnSync("bun", [join(HERE, "bake.mjs"), "--size", "496", "--out", plateDir], {
    cwd: resolve(HERE, "../../.."),
    stdio: "inherit",
  });
  if (result.status !== 0) throw new Error(`bake.mjs exited with ${result.status}`);
}

async function plateOf(dir) {
  ensurePlate(dir);
  const geometry = JSON.parse(await readFile(join(dir, "geometry.json"), "utf8"));
  const png = await readFile(join(dir, "plate.png"));
  return { geometry, plate: `data:image/png;base64,${png.toString("base64")}` };
}

await mkdir(outDir, { recursive: true });

if (wantStill) {
  const { geometry, plate } = await plateOf(stillPlate);
  // The promotion travels on the geometry the component actually draws, so the declutter and the
  // drawing agree — the baked priority is left untouched on disk.
  const apartKeys = new Set(apart.map((a) => a.org.key));
  const promoted = {
    ...geometry,
    points: geometry.points.map((p) =>
      apartKeys.has(p.key) ? { ...p, priority: -1 } : p,
    ),
  };
  const { pngPath, svgPath } = await renderStill({
    element: createElement(LocatorStill, {
      title: BEAT.title,
      source: BEAT.source,
      basemapCredit: BEAT.basemapCredit,
      legendCaption: BEAT.legendCaption,
      caveat,
      alt,
      ground: BEAT.ground,
      categoryColour: CATEGORY_COLOUR,
      ...furniture,
      geometry: promoted,
      plate,
      mustLabel: [...apartKeys],
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
  assertDeliveredSize(readPngSize(await readFile(pngPath)), size, {
    what: pngPath,
  });
  const svg = await readFile(svgPath, "utf8");
  assertTypeFloor(svg, size, { what: "map-geneva-locator" });
  assertWithinStage(svg, size, { what: "map-geneva-locator" });
  console.log(
    `still → ${pngPath} at ${FRAME_WIDTH}x${FRAME_HEIGHT}, verified from the file\nNow open it and look at it.`,
  );
} else console.log("nothing asked for. Pass --still.");
