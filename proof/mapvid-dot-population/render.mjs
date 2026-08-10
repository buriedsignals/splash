// The render ladder for the dot-density VIDEO beat. Rung 1 is the video's LAST FRAME on its own
// (`--frame=-1`, seconds); rung 2 is the mp4 (minutes). In that order, always — a wrong end state
// is a wrong video, and finding out costs seconds at rung 1 instead of minutes at rung 2.
//
// EVERY NUMBER ON THE FRAME IS COMPUTED HERE, from the frozen population file and this beat's own
// plate: the ranking, HOW MANY countries it takes to pass half (never assumed to be five), their
// names, both shares, the dot value, the dot count, and the whole title and conclusion. The static
// sibling names its five in a constant and checks the constant; this beat has no such constant,
// because a video that reveals a ranking must not be told the ranking in advance.
//
// It runs the checks a render cannot make for itself:
//   · the JOIN is total in both directions — no shape without a population, no population without
//     a shape (`geo-dot.ts`'s own loud join);
//   · the CLAIM has two halves and both are asserted: the leading `k` countries pass half, and the
//     leading `k - 1` do NOT. "Just five" is only true if four is not enough.
//
// Usage:
//   bun proof/mapvid-dot-population/render.mjs --final-frame
//   bun proof/mapvid-dot-population/render.mjs --video

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
  chooseDotValue,
  joinPopulation,
  parsePopulationCsv,
  scatterInParts,
} from "./geo-dot.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(HERE, "../..");
const ENTRY = join(HERE, "index.ts");
const COMPOSITION = "mapvid-dot-population";

/** A light neutral land fill, `ratio` of the way from ground toward ink — this file's own copy of
 *  the mix the rasteriser applies internally, exactly as the static sibling carries one. */
function mixHex(ground, ink, ratio) {
  const ch = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const from = ch(ground);
  const to = ch(ink);
  return (
    "#" +
    from
      .map((v, i) =>
        Math.round(v + (to[i] - v) * ratio)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

/** The story's own constants — editorial, never numeric. Every quantity is derived below. */
const BEAT = {
  /** Kosovo is `KOS` in Natural Earth and `XKX` at the World Bank. Three sources, three codes. */
  alias: { KOS: "XKX" },
  titleFor: ({ named, countries }) =>
    `Half of this map's people live in ${named} of its ${countries} countries.`,
  source:
    "Source: World Bank Open Data, indicator SP.POP.TOTL (population, total), 2023",
  basemapCredit: "basemap © MapTiler, © OpenStreetMap",
  meterCaption: "Share of this map's population drawn",
  halfLabel: "half",
};

/** Ordinal words, index = the number. Only ever indexed by a COMPUTED count. */
const COUNTING = [
  "none",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
];

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv[at + 1] : fallback;
};

const dataPath = flag("--data", join(HERE, "population-europe-2023.csv"));
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

// ── The data and the join ──────────────────────────────────────────────────────────────────────
const rows = parsePopulationCsv(await readFile(dataPath, "utf8"));
const shapeKeys = geometry.shapes.map((shape) => shape.key);
const byKey = joinPopulation(shapeKeys, rows, BEAT.alias);
console.log(
  `joined ${shapeKeys.length} shapes to ${rows.length} population rows — no unmatched either way.`,
);

const totalPopulation = rows.reduce((sum, row) => sum + row.population, 0);

// ── The ranking, and HOW MANY it takes to pass half. Both derived; neither typed. ───────────────
const ranked = shapeKeys
  .map((key) => ({ key, row: byKey.get(key) }))
  .sort((a, b) => b.row.population - a.row.population);

let running = 0;
let named = 0;
for (const entry of ranked) {
  running += entry.row.population;
  named++;
  if (running / totalPopulation > 0.5) break;
}
const namedSum = ranked
  .slice(0, named)
  .reduce((sum, entry) => sum + entry.row.population, 0);
const shortSum = ranked
  .slice(0, named - 1)
  .reduce((sum, entry) => sum + entry.row.population, 0);
const namedShare = namedSum / totalPopulation;
const shortShare = shortSum / totalPopulation;

// Both halves of the claim. The second is the one that makes "just five" mean anything.
if (namedShare <= 0.5)
  throw new Error(
    `claim check failed: the leading ${named} countries hold ${(namedShare * 100).toFixed(2)}%, not more than half`,
  );
if (shortShare > 0.5)
  throw new Error(
    `claim check failed: the leading ${named - 1} countries already hold ${(shortShare * 100).toFixed(2)}% — ` +
      `${named} is not the smallest set that clears half, and the title would overstate the concentration`,
  );
if (named >= COUNTING.length)
  throw new Error(
    `${named} countries clear half, past the ${COUNTING.length - 1} this beat can spell — the sentence would have to change`,
  );
console.log(
  `claim: supported. The leading ${named} of ${ranked.length} countries hold ` +
    `${namedSum.toLocaleString("en-GB")} of ${totalPopulation.toLocaleString("en-GB")} ` +
    `(${(namedShare * 100).toFixed(2)}%); the leading ${named - 1} hold ${(shortShare * 100).toFixed(2)}%.`,
);
console.log(
  `order of arrival (largest first): ` +
    ranked
      .slice(0, named + 2)
      .map((entry) => `${entry.row.name} ${entry.row.population.toLocaleString("en-GB")}`)
      .join(" · ") +
    ` … ${ranked[ranked.length - 1].row.name} ${ranked[ranked.length - 1].row.population.toLocaleString("en-GB")}`,
);

// ── The dots: the same value and the same seeded scatter the static sibling draws ───────────────
const dotValue = chooseDotValue(totalPopulation, { targetDots: 3000, maxDots: 6000 });
const shapeByKey = new Map(geometry.shapes.map((shape) => [shape.key, shape]));
let totalDots = 0;
const countries = ranked.map(({ key, row }, index) => {
  const shape = shapeByKey.get(key);
  const count = Math.round(row.population / dotValue);
  const points = scatterInParts(shape.parts, count, key);
  totalDots += points.length;
  // The label anchor is the centroid of the country's OWN drawn dots, so it can only ever land
  // inside the cloud it names — never a polygon calculation that could put "France" in the sea.
  const anchor =
    index < named && points.length > 0
      ? [
          points.reduce((sum, point) => sum + point[0], 0) / points.length,
          points.reduce((sum, point) => sum + point[1], 0) / points.length,
        ]
      : null;
  return {
    key,
    name: row.name,
    population: row.population,
    share: row.population / totalPopulation,
    parts: shape.parts,
    points,
    anchor,
  };
});
console.log(
  `dot value: 1 dot = ${dotValue.toLocaleString("en-GB")} people → ` +
    `${totalDots.toLocaleString("en-GB")} dots drawn for ${totalPopulation.toLocaleString("en-GB")} people`,
);

// The meter and the map must be the same number. They are computed from the same `share` field, but
// a rounding that put them a percentage point apart would be invisible in a still and obvious in
// motion, so the shares are asserted to sum to one before a frame is drawn.
const shareSum = countries.reduce((sum, country) => sum + country.share, 0);
if (Math.abs(shareSum - 1) > 1e-9)
  throw new Error(`the country shares sum to ${shareSum}, not 1 — the meter would end short or over`);

// ── The words, every number in them interpolated from the measurements above ────────────────────
const namedNames = countries.slice(0, named).map((country) => country.name);
const title = BEAT.titleFor({ named, countries: countries.length });
const conclusion =
  `${namedNames.slice(0, -1).join(", ")} and ${namedNames[namedNames.length - 1]} hold ` +
  `${namedSum.toLocaleString("en-GB")} of ${totalPopulation.toLocaleString("en-GB")} people — ` +
  `${(namedShare * 100).toFixed(1)}%. The first ${COUNTING[named - 1]} hold ${(shortShare * 100).toFixed(1)}%.`;
const dotKey =
  `1 dot = ${dotValue.toLocaleString("en-GB")} people — ` +
  `${totalDots.toLocaleString("en-GB")} dots drawn for ${totalPopulation.toLocaleString("en-GB")} people`;
const caveat =
  `Each country gets the SAME slice of the clock, so time on screen is not population — the meter ` +
  `is. A dot's position inside its country is random, so a cluster edge is not a settlement, and a ` +
  `tighter fill means more people per square kilometre than a bigger population. Russia and seven ` +
  `micro-territories with no independent World Bank figure are excluded.`;
const alt =
  `Map of Europe filling with dots, one dot per ${dotValue.toLocaleString("en-GB")} people, ` +
  `${totalDots.toLocaleString("en-GB")} dots in all. Every one of the ${countries.length} countries ` +
  `is outlined and empty before the sequence starts, then they fill in largest first, each taking ` +
  `the same slice of time, while a bar under the map reads the share of the map's population drawn. ` +
  `The bar passes its half-way mark at the ${COUNTING[named]}th country of ${countries.length}: ` +
  `${namedNames.slice(0, -1).join(", ")} and ${namedNames[namedNames.length - 1]} together hold ` +
  `${namedSum.toLocaleString("en-GB")} of ${totalPopulation.toLocaleString("en-GB")} people, ` +
  `${(namedShare * 100).toFixed(1)}%, against ${(shortShare * 100).toFixed(1)}% for the first ` +
  `${COUNTING[named - 1]}. The remaining ${countries.length - named} countries take seven eighths of ` +
  `the sequence to add the rest, and the last to arrive, ` +
  `${countries[countries.length - 1].name}, holds ` +
  `${countries[countries.length - 1].population.toLocaleString("en-GB")} people.`;

const palette = readPalette(import.meta.dirname, { stopAt: HERE });
const furniture = deriveFurniture(palette.ground);
const landFill = mixHex(palette.ground, furniture.ink, 0.06);
console.log(
  `palette: ground ${palette.ground}, accent ${palette.accent} (chosen by ${palette.origin}, ${palette.source})`,
);

const props = {
  geometry: { frame: geometry.frame },
  plate,
  countries,
  namedCount: named,
  dotValue,
  totalDots,
  totalPopulation,
  landFill,
  title,
  source: BEAT.source,
  basemapCredit: BEAT.basemapCredit,
  dotKey,
  meterCaption: BEAT.meterCaption,
  halfLabel: BEAT.halfLabel,
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
  const videoPath = join(outDir, "dot-density.mp4");
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
