// stories/stress-e-electricity-mix/beats/electricity-mix-shares/render.mjs
//
// This beat's own render script — the render ladder's second rung (read the frozen CSV, derive
// every claim from it, render the final frame FIRST, then the mp4).
//
// THE TRAP THIS SCRIPT ANSWERS (see BRIEF.md, "The trap, and the decision"): the article claims
// six shares "make up the whole of national supply." They do not — the six sum to 95.2, not 100,
// and Imports is genuinely negative (-4.1). Both facts are asserted here and printed, not buried:
// the render throws if the sum ever drifted to exactly 100 (this beat's whole reason for existing
// would be gone) or if Imports were ever non-negative (the subject event names it specifically).
//
// Usage:  bun render.mjs [--still-only] [--data <csv>] [--out <dir>]

import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  deriveFurniture,
  readPalette,
} from "../../../../skills/chart-video/scripts/render-still.mjs";

/**
 * RFC 4180 row tokeniser, inlined here rather than imported — no cross-skill runtime import, and
 * a story workspace is not a skill either. A naive comma split would corrupt a quoted field; this
 * data has none, but the tokeniser is kept for parity with every other beat's own reader.
 */
function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  let i = 0;
  while (i < text.length) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        quoted = false; i += 1; continue;
      }
      field += char; i += 1; continue;
    }
    if (char === '"') { quoted = true; i += 1; continue; }
    if (char === ",") { row.push(field); field = ""; i += 1; continue; }
    if (char === "\r") { row.push(field); rows.push(row); row = []; field = ""; i += (text[i + 1] === "\n") ? 2 : 1; continue; }
    if (char === "\n") { row.push(field); rows.push(row); row = []; field = ""; i += 1; continue; }
    field += char; i += 1;
  }
  if (field !== "" || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(HERE, "../../../..");
const ENTRY = join(HERE, "index.ts");
const COMPOSITION = "electricity-mix-shares";

/**
 * Reads `source,share_pct` rows and returns them sorted descending by share — render.mjs's own
 * job, per the component's own doc-comment (it never sorts). Asserts the two facts this beat's
 * whole argument rests on: the sum is genuinely short of 100, and there is genuinely a negative
 * row. Both come straight off the frozen data, not typed by hand.
 */
export function sharesFromCsv(csv) {
  const [header, ...rows] = parseCsvRows(csv.trim());
  const sourceAt = header.indexOf("source");
  const shareAt = header.indexOf("share_pct");
  if (sourceAt < 0 || shareAt < 0)
    throw new Error(`csv has no source / share_pct column, got: ${header}`);

  return rows
    .filter((cells) => cells.length > 1 || cells[0] !== "")
    .map((cells) => ({
      source: cells[sourceAt],
      share: Number(cells[shareAt]),
    }))
    .filter((r) => r.source && Number.isFinite(r.share))
    .sort((a, b) => b.share - a.share);
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

const dataPath = flag("--data", join(HERE, "data.csv"));
const outDir = flag("--out", HERE);
const stillOnly = argv.includes("--still-only");

await mkdir(outDir, { recursive: true });

const rows = sharesFromCsv(await readFile(dataPath, "utf8"));
if (rows.length !== 6)
  throw new Error(`expected 6 reported sources, got ${rows.length}`);

const total = Math.round(rows.reduce((sum, r) => sum + r.share, 0) * 10) / 10;
if (Math.abs(total - 100) < 0.05)
  throw new Error(
    `the six shares now sum to ${total} — this beat exists specifically because they did not; ` +
      `re-check whether the diverging-bar treatment is still the right one before rendering`,
  );

const negative = rows.filter((r) => r.share < 0);
if (negative.length !== 1)
  throw new Error(
    `expected exactly one negative share (Imports); found ${negative.length} ` +
      `(${negative.map((r) => r.source).join(", ")})`,
  );
const subject = negative[0];
if (subject.source !== "Imports")
  throw new Error(`expected the negative row to be Imports, got ${subject.source}`);

const positive = rows.filter((r) => r.share > 0);
const hydro = rows.find((r) => r.source === "Hydro");
const nuclear = rows.find((r) => r.source === "Nuclear");
if (!hydro || !nuclear)
  throw new Error("expected Hydro and Nuclear rows — the title names both");
const hydroNuclear = Math.round((hydro.share + nuclear.share) * 10) / 10;

const shortfall = Math.round((100 - total) * 10) / 10;

const title = `Hydro and nuclear supply seven in ten units of the country's electricity`;
const caveat =
  `The article states these six shares "make up the whole of national supply." They do not: ` +
  `they sum to ${total}%, ${shortfall} points short of 100. Imports are counted as a negative ` +
  `share (${subject.share}%) because the country exported more electricity than it bought.`;
const axisTitle = "Reported share of national electricity supply, %";
const conclusion =
  `The six reported shares sum to ${total}%, not 100% — ${shortfall} percentage points of ` +
  `national supply this dataset does not account for.`;
const alt =
  `A diverging bar chart of six sources' reported share of national electricity supply, sorted ` +
  `from the largest to the smallest, each bar growing from a zero line. Five bars point right: ` +
  positive.map((r) => `${r.source} at ${r.share}%`).join(", ") +
  `. One bar points left — Imports, at ${subject.share}%, ringed as the subject — because the ` +
  `country exported more than it bought. A conclusion line states that the six shares sum to ` +
  `${total}%, not the 100% the article claims.`;

console.log(`rows ${rows.length}: ${rows.map((r) => `${r.source} ${r.share}`).join(", ")}`);
console.log(`sum ${total} (article claims 100, shortfall ${shortfall} points)`);
console.log(`Hydro + Nuclear = ${hydroNuclear} (~seven in ten)`);
console.log(`subject: ${subject.source} at ${subject.share}%`);
console.log(`title: ${title}`);
console.log(`conclusion: ${conclusion}`);

const { ground, accent, origin, source: paletteSource } = readPalette(HERE, {
  stopAt: resolve(HERE, "../.."),
});
console.log(`palette read from ${paletteSource} — ground ${ground}, accent ${accent}, chosen by ${origin}`);

const BEAT_SOURCE =
  "Source: national electricity registry, as reported in the frozen dataset for this story · " +
  "shares as published, not rescaled to sum to 100";

const props = {
  data: rows.map(({ source, share }) => ({ source, share })),
  title,
  source: BEAT_SOURCE,
  caveat,
  axisTitle,
  subjectSource: subject.source,
  conclusion,
  ground,
  accent,
  ...deriveFurniture(ground),
};
const propsPath = join(outDir, "electricity-props.json");
await writeFile(propsPath, JSON.stringify(props, null, 2));
await writeFile(join(outDir, "ALT.txt"), `${alt}\n`);

// Rung 2a: the last frame, on its own.
const stillPath = join(outDir, "electricity-mix-final-frame.png");
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
const videoPath = join(outDir, "electricity-mix.mp4");
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
