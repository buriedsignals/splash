// The render ladder for the locator VIDEO beat. Rung 1 is the video's LAST FRAME on its own
// (`--frame=-1`, seconds); rung 2 is the mp4 (minutes). In that order, always — a wrong end state
// is a wrong video, and finding out costs seconds at rung 1 instead of minutes at rung 2.
//
// EVERY NUMBER ON THE FRAME IS COMPUTED HERE, from the frozen CSV and this beat's own plate: each
// organisation's great-circle distance from the point the source's query was centred on, the order
// they are found in, how many fall inside the tight cluster, the size of the gap before the last
// one, its name, and how much of the search radius comes up empty after it. The static sibling
// names its outlier by deriving it; this beat derives the whole distribution.
//
// It runs the checks a render cannot make for itself:
//   · every organisation is INSIDE the search radius the source used — if one were outside, the
//     sweep would end with a marker never drawn and the count would be a lie;
//   · the GAP the conclusion is built on is real: the step from the second-farthest to the farthest
//     must be the largest step in the whole ranking, or "then a kilometre of nothing" is a sentence
//     about a different dataset.
//
// Usage:
//   bun proof/mapvid-locator-geneva/render.mjs --final-frame
//   bun proof/mapvid-locator-geneva/render.mjs --video

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  deriveFurniture,
  readPalette,
} from "../../skills/map-beat/scripts/render-still.mjs";
import {
  distanceKm,
  orgsFromCsv,
  separateOverlappingMarkers,
} from "./geo-locator.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(HERE, "../..");
const ENTRY = join(HERE, "index.ts");
const COMPOSITION = "mapvid-locator-geneva";

/** The story's own constants — editorial, never numeric. Every quantity is derived below. */
const BEAT = {
  centreLabel: "central Geneva",
  titleFor: ({ found, searchKm, lastKm }) =>
    `All ${found} of these international organisations sit inside ${lastKm} km of central Geneva — and a ${searchKm} km search finds no more.`,
  source:
    "Source: Wikidata (query.wikidata.org/sparql), organisations within 6 km of central Geneva",
  basemapCredit: "basemap © MapTiler, © OpenStreetMap",
  axisCaption: "Distance from central Geneva, kilometres — one tick per organisation",
  /** Markers closer than this on screen are nudged apart, exactly as the static sibling does. */
  minSeparationPx: 14,
};

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv[at + 1] : fallback;
};

const dataPath = flag("--data", join(HERE, "geneva-orgs.csv"));
const outDir = flag("--out", join(HERE, "render"));
// The plate is frozen BESIDE THE BEAT, exactly as the data is: `/tmp` cannot be committed, so a
// render reading its basemap from there leaves an mp4 nobody can reproduce or audit — and MapTiler
// restyles, so a re-bake months later is a different picture under the same marks.
const plateDir = flag("--plate", join(HERE, "plate"));
const wantFinalFrame = argv.includes("--final-frame");
const wantVideo = argv.includes("--video");

/** Bakes the plate ONLY when the frozen one is absent — a warm run never touches the network. */
function ensurePlate(dir) {
  if (existsSync(join(dir, "geometry.json")) && existsSync(join(dir, "plate.png")))
    return;
  console.log(`no frozen plate at ${dir} — baking one there.`);
  const result = spawnSync("bun", [join(HERE, "bake.mjs"), "--out", dir], {
    cwd: resolve(HERE, "../../.."),
    stdio: "inherit",
  });
  if (result.status !== 0) throw new Error(`bake.mjs exited with ${result.status}`);
}

ensurePlate(plateDir);
const geometry = JSON.parse(await readFile(join(plateDir, "geometry.json"), "utf8"));
const plateBytes = await readFile(join(plateDir, "plate.png"));
const plate = `data:image/png;base64,${plateBytes.toString("base64")}`;

// ── The data, and the one quantity this beat is about ──────────────────────────────────────────
const rows = orgsFromCsv(await readFile(dataPath, "utf8"));
const centre = geometry.centre.lonLat;
const searchKm = geometry.searchKm;

const byDistance = rows
  .map((row) => ({ ...row, km: distanceKm(centre, [row.lon, row.lat]) }))
  .sort((a, b) => a.km - b.km);

const outside = byDistance.filter((org) => org.km > searchKm);
if (outside.length > 0)
  throw new Error(
    `${outside.length} organisation(s) lie beyond the ${searchKm} km search this beat sweeps ` +
      `(${outside.map((o) => `${o.name} ${o.km.toFixed(2)}km`).join(", ")}) — the sweep would end with ` +
      `a marker it never drew, and the count on the frame would be wrong`,
  );

// The gap the conclusion rests on: the step to the farthest must be the largest step in the set.
const steps = byDistance
  .slice(1)
  .map((org, index) => ({ name: org.name, step: org.km - byDistance[index].km }));
const lastStep = steps[steps.length - 1];
const biggestStep = steps.reduce((a, b) => (b.step > a.step ? b : a));
if (biggestStep.name !== lastStep.name)
  throw new Error(
    `claim check failed: the biggest gap in the ranking is before ${biggestStep.name} ` +
      `(${biggestStep.step.toFixed(2)} km), not before the farthest, ${lastStep.name} ` +
      `(${lastStep.step.toFixed(2)} km) — the conclusion's "then a gap, then one more" would be about ` +
      `the wrong organisation`,
  );

const farthest = byDistance[byDistance.length - 1];
const runnerUp = byDistance[byDistance.length - 2];
const emptyTail = searchKm - farthest.km;
console.log(
  `distances from ${BEAT.centreLabel} (${centre[1]}, ${centre[0]}), nearest first:\n  ` +
    byDistance.map((org) => `${org.km.toFixed(2)} km  ${org.name}`).join("\n  "),
);
console.log(
  `claim: supported. ${byDistance.length - 1} of ${byDistance.length} lie inside ` +
    `${runnerUp.km.toFixed(1)} km; the largest gap in the whole ranking is the ` +
    `${lastStep.step.toFixed(2)} km before ${farthest.name} at ${farthest.km.toFixed(2)} km; ` +
    `the last ${emptyTail.toFixed(2)} km of the search find nothing.`,
);

// ── Drawn positions: the same overlap nudge the static sibling applies, for the same reason ─────
const pxByKey = new Map(geometry.points.map((point) => [point.key, point]));
const nudged = separateOverlappingMarkers(
  byDistance.map((org) => {
    const point = pxByKey.get(org.key);
    if (!point)
      throw new Error(`the plate has no projected point for ${org.name} (${org.key})`);
    return { key: org.key, cx: point.px, cy: point.py };
  }),
  BEAT.minSeparationPx,
);
const nudgedByKey = new Map(nudged.map((point) => [point.key, point]));
const moved = byDistance.filter((org) => {
  const before = pxByKey.get(org.key);
  const after = nudgedByKey.get(org.key);
  return Math.hypot(after.cx - before.px, after.cy - before.py) > 0.5;
});
console.log(
  `overlap nudge: ${moved.length} of ${byDistance.length} markers moved to clear ` +
    `${BEAT.minSeparationPx}px (${moved.map((o) => o.name).join(", ") || "none"})`,
);

// Priority for the label declutter: distance rank, with the organisation the conclusion NAMES
// promoted to the front. The static sibling's own `mustLabel` lesson, applied before the fact: a
// frame that names an organisation in words and drops its label is a frame a reader cannot follow.
const orgs = byDistance.map((org, index) => {
  const point = nudgedByKey.get(org.key);
  return {
    key: org.key,
    name: org.name,
    km: org.km,
    cx: point.cx,
    cy: point.cy,
    priority: org.key === farthest.key ? -1 : index,
  };
});

// ── The words, every number in them interpolated from the measurements above ────────────────────
const title = BEAT.titleFor({
  found: byDistance.length,
  searchKm,
  lastKm: farthest.km.toFixed(1),
});
const conclusion =
  `${byDistance.length - 1} of the ${byDistance.length} lie within ${runnerUp.km.toFixed(1)} km. ` +
  `Then ${lastStep.step.toFixed(1)} km of nothing, ${farthest.name} at ${farthest.km.toFixed(1)} km — ` +
  `and nothing at all in the last ${emptyTail.toFixed(1)} km.`;
const caveat =
  `The sweep is the source's own query: Wikidata was asked for international organisations within ` +
  `${searchKm} km of ${BEAT.centreLabel}, so the empty outer ring is a result and not a missing ` +
  `layer. Colour carries one thing here — reached by the search, or not yet — so the three ` +
  `categories the static sibling encodes are not on this frame. Every point is the organisation's ` +
  `own Wikidata coordinate, not an address, and ${moved.length} markers are nudged apart on screen ` +
  `to stay separately visible, so no marker may be read as a surveyed position.`;
const alt =
  `Map of central Geneva. A circle grows out from a marked point at ${BEAT.centreLabel} until it ` +
  `reaches ${searchKm} kilometres, the radius the source's own Wikidata query used, and each of ` +
  `${byDistance.length} international organisations appears as the circle passes it. A bar under ` +
  `the map carries the same 0-to-${searchKm} km scale with one tick per organisation, so the shape ` +
  `of the distribution is readable without the map: ${byDistance.length - 1} ticks are bunched ` +
  `between ${byDistance[0].km.toFixed(1)} and ${runnerUp.km.toFixed(1)} km, then there is a gap of ` +
  `${lastStep.step.toFixed(1)} km, then a single tick for ${farthest.name} at ` +
  `${farthest.km.toFixed(1)} km, and then ${emptyTail.toFixed(1)} km of bar with no tick at all. ` +
  `The nearest is ${byDistance[0].name} at ${byDistance[0].km.toFixed(1)} km. The four ` +
  `UN-system bodies in the set are not the four nearest: they rank ` +
  `${byDistance
    .map((org, index) => (org.category === "UN system" ? index + 1 : null))
    .filter((rank) => rank !== null)
    .join(", ")} of ${byDistance.length} by distance.`;

const palette = readPalette(import.meta.dirname, { stopAt: HERE });
const furniture = deriveFurniture(palette.ground);
console.log(
  `palette: ground ${palette.ground}, accent ${palette.accent} (chosen by ${palette.origin}, ${palette.source})`,
);

const props = {
  geometry: {
    frame: geometry.frame,
    centre: { px: geometry.centre.px },
    radiiKm: geometry.radiiKm,
    rings: geometry.rings,
    searchKm,
  },
  plate,
  orgs,
  farthestKey: farthest.key,
  title,
  source: BEAT.source,
  basemapCredit: BEAT.basemapCredit,
  axisCaption: BEAT.axisCaption,
  centreLabel: BEAT.centreLabel,
  conclusion,
  caveat,
  ground: palette.ground,
  accent: palette.accent,
  ...furniture,
  alt,
};

await mkdir(outDir, { recursive: true });
const propsPath = join(outDir, "video-props.json");
await writeFile(propsPath, JSON.stringify(props));

function remotion(args) {
  const binary = join(PACKAGE_ROOT, "node_modules/.bin/remotion");
  const started = Date.now();
  const result = spawnSync(binary, args, { cwd: PACKAGE_ROOT, stdio: "inherit" });
  if (result.status !== 0) throw new Error(`remotion ${args[0]} exited with ${result.status}`);
  return Math.round((Date.now() - started) / 1000);
}

if (wantFinalFrame || wantVideo) {
  const framePath = join(outDir, "final-frame.png");
  const seconds = remotion([
    "still",
    ENTRY,
    COMPOSITION,
    framePath,
    "--frame=-1",
    `--props=${propsPath}`,
    "--timeout=180000",
  ]);
  console.log(`final frame (--frame=-1) → ${framePath}  [${seconds}s]`);
}

if (wantVideo) {
  const videoPath = join(outDir, "locator.mp4");
  const seconds = remotion([
    "render",
    ENTRY,
    COMPOSITION,
    videoPath,
    `--props=${propsPath}`,
    "--concurrency=1",
    "--timeout=180000",
  ]);
  console.log(`video → ${videoPath}  [${seconds}s]\nNow extract frames from it and look at them.`);
}

if (!wantFinalFrame && !wantVideo)
  console.log("nothing asked for. Pass --final-frame or --video.");
