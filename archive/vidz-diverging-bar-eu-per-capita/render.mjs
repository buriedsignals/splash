// twin/proof/vidz-diverging-bar-eu-per-capita/render.mjs
//
// This story's own render script — the render ladder's second rung (read the frozen CSV, derive
// every claim from it, render the final frame FIRST, then the mp4).
//
// EVERY CLAIM IS COMPUTED HERE: which country is the exception, that it is the ONLY one, the count
// of countries on each side, the size of its rise, the mean of the falls, and which fall is the
// largest. The headline says "the only", which is the kind of claim that quietly stops being true
// with a data refresh — so it is asserted, and the render throws rather than shipping it stale.
//
// Usage:  bun proof/vidz-diverging-bar-eu-per-capita/render.mjs [--still-only] [--data <csv>] [--out <dir>]

import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  deriveFurniture,
  readPalette,
} from "../../skills/chart-video/scripts/render-still.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(HERE, "../..");
const ENTRY = join(HERE, "index.ts");
const COMPOSITION = "vidz-diverging-bar-eu-per-capita";

const FROM = 1990;
const TO = 2024;
/** The universe the headline names. It is a membership list, not a data choice: the EU has 27
 *  member states, and the frozen file was fetched for exactly those 27 ISO codes. */
const MEMBERS = 27;

const BEAT = {
  axisTitle: `Change in CO₂ emissions per person, ${FROM} to ${TO}, tonnes`,
  source:
    "Source: Global Carbon Budget (2025); population based on various sources (2024) – " +
    "with major processing by Our World in Data · fossil fuels and industry only",
};

/**
 * OWID's `co-emissions-per-capita` export, filtered at fetch time to the 27 EU member states.
 *
 * Returns one row per country: its reading in each of the two years and the signed change. A country
 * missing either year is dropped — and the count assertion below then fails, because a headline that
 * says "the only EU country" cannot be made from a partial field.
 */
export function changesBetween(csv, from, to) {
  const [header, ...rows] = csv.trim().split(/\r?\n/);
  const columns = header.split(",");
  const entityAt = columns.indexOf("Entity");
  const yearAt = columns.indexOf("Year");
  const valueAt = columns.findIndex((c) => c.startsWith("CO"));
  if (entityAt < 0 || yearAt < 0 || valueAt < 0)
    throw new Error(`csv has no Entity / Year / CO₂ per capita column, got: ${header}`);

  const byCountry = new Map();
  for (const row of rows) {
    const cells = row.split(",");
    const year = Number(cells[yearAt]);
    if (year !== from && year !== to) continue;
    const value = Number(cells[valueAt]);
    if (!Number.isFinite(value)) continue;
    if (!byCountry.has(cells[entityAt])) byCountry.set(cells[entityAt], {});
    byCountry.get(cells[entityAt])[year] = value;
  }

  return [...byCountry.entries()]
    .filter(([, years]) => years[from] !== undefined && years[to] !== undefined)
    .map(([country, years]) => ({
      country,
      from: years[from],
      to: years[to],
      change: years[to] - years[from],
    }))
    .sort((a, b) => b.change - a.change);
}

function remotion(args) {
  const binary = join(PACKAGE_ROOT, "node_modules/.bin/remotion");
  const started = Date.now();
  const result = spawnSync(binary, args, { cwd: PACKAGE_ROOT, stdio: "inherit" });
  if (result.status !== 0)
    throw new Error(`remotion ${args[0]} exited with ${result.status}`);
  return Math.round((Date.now() - started) / 1000);
}

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const at = argv.indexOf(name);
  return at >= 0 ? argv[at + 1] : fallback;
};

// Frozen beside the beat, never re-fetched and never read from /tmp.
const dataPath = flag("--data", join(HERE, "data.csv"));
const outDir = flag("--out", HERE);
const stillOnly = argv.includes("--still-only");

await mkdir(outDir, { recursive: true });

const rows = changesBetween(await readFile(dataPath, "utf8"), FROM, TO);
if (rows.length !== MEMBERS)
  throw new Error(
    `expected all ${MEMBERS} EU member states with a reading in both ${FROM} and ${TO}, got ${rows.length} — ` +
      `"the only EU country" cannot be claimed from a partial field`,
  );

const rose = rows.filter((r) => r.change > 0);
const fell = rows.filter((r) => r.change < 0);
if (rose.length !== 1)
  throw new Error(
    `the headline says one country rose; the data says ${rose.length} (${rose.map((r) => r.country).join(", ")})`,
  );
if (fell.length !== MEMBERS - 1)
  throw new Error(`${MEMBERS - rose.length - fell.length} countries are exactly flat — the sentence does not fit`);

const subject = rose[0];
const averageFall = fell.reduce((sum, r) => sum + r.change, 0) / fell.length;
const largest = fell.reduce((a, b) => (b.change < a.change ? b : a));

const title = `${subject.country} is the only EU country emitting more CO₂ per person than in ${FROM}`;
/** U+2212, not a hyphen — the same minus the value labels are drawn with. */
const signed = (v, d = 2) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(d)}`;

const caveat =
  `${subject.country}'s rise is ${signed(subject.change)} tonnes per person — the only one, and a small one: ` +
  `${subject.from.toFixed(2)} in ${FROM} against ${subject.to.toFixed(2)} in ${TO}. ` +
  `The other ${fell.length} member states all emit less per person than they did.`;
const averageFallLabel = `Average of the ${fell.length} falls: ${signed(averageFall)}`;
const conclusion =
  `The other ${fell.length} cut theirs by ${Math.abs(averageFall).toFixed(2)} tonnes per person on ` +
  `average — ${largest.country} by ${Math.abs(largest.change).toFixed(2)}, the largest fall in the EU.`;
const alt =
  `A diverging bar chart of the change in CO₂ emissions per person between ${FROM} and ${TO} for all ` +
  `${MEMBERS} EU member states, sorted from the largest rise to the largest fall. Exactly one bar ` +
  `points right of the zero line: ${subject.country}, at ${signed(subject.change)} tonnes per ` +
  `person, drawn in the accent colour and ringed. The other ${fell.length} point left, from ` +
  `${rows[1].country} at ${signed(rows[1].change)} down to ${largest.country} at ` +
  `${signed(largest.change)}. A dashed rule marks their average, ${signed(averageFall)}.`;

console.log(
  `rows ${rows.length}: rose ${rose.length} (${rose.map((r) => `${r.country} ${r.change.toFixed(2)}`).join(", ")}), fell ${fell.length}`,
);
console.log(`average fall ${averageFall.toFixed(4)} · largest ${largest.country} ${largest.change.toFixed(4)}`);
console.log(`title: ${title}`);
console.log(`conclusion: ${conclusion}`);

const { ground, accent, origin, source: paletteSource } = readPalette(HERE, {
  stopAt: resolve(HERE, ".."),
});
console.log(`palette read from ${paletteSource} — ground ${ground}, accent ${accent}, chosen by ${origin}`);

const props = {
  data: rows.map(({ country, change }) => ({ country, change })),
  title,
  source: BEAT.source,
  caveat,
  axisTitle: BEAT.axisTitle,
  subjectCountry: subject.country,
  averageFall,
  averageFallLabel,
  conclusion,
  ground,
  accent,
  ...deriveFurniture(ground),
};
const propsPath = join(outDir, "diverging-props.json");
await writeFile(propsPath, JSON.stringify(props, null, 2));
await writeFile(join(outDir, "ALT.txt"), `${alt}\n`);

// Rung 2a: the last frame, on its own.
const stillPath = join(outDir, "diverging-final-frame.png");
const stillSeconds = remotion([
  "still",
  ENTRY,
  COMPOSITION,
  stillPath,
  "--frame=-1",
  `--props=${propsPath}`,
  "--timeout=120000",
]);
console.log(`still (--frame=-1) → ${stillPath}  [${stillSeconds}s]`);

if (stillOnly) process.exit(0);

// Rung 2b: the mp4.
const videoPath = join(outDir, "diverging.mp4");
const videoSeconds = remotion([
  "render",
  ENTRY,
  COMPOSITION,
  videoPath,
  `--props=${propsPath}`,
  "--concurrency=1",
  "--timeout=120000",
]);
console.log(`video → ${videoPath}  [${videoSeconds}s]`);
