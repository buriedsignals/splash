// twin/proof/weby-lollipop-co2-per-capita/render-web.mjs
//
// This beat's own WEB runner — the same shape `../co2-suisse/render-web.mjs` and
// `../web-income-life-expectancy/render-web.mjs` both keep: the story's own constants, its own CSV
// reader, its own component, handed to the genre's generic `renderWeb`. It lives here, beside the
// story, not inside `skills/chart-web/scripts/render-web.mjs` — that file's own header
// explains why: a skill directory that imports a story workspace does not build once copied, on its
// own, into a journalist's root.
//
// Reads `data.csv` fresh (does NOT import `../more-lollipop-co2-per-capita/render.mjs`'s parser — a
// beat never imports another beat's files), filters to 2024, verifies the 15-country entity set and
// that every one of them actually carries a 2024 reading, ranks descending, and confirms the claim
// (Switzerland 3rd-lowest) from the computed ranking rather than assuming it.
//
// After calling the skill's generic `renderWeb`, this file PATCHES the HTML it wrote — the same
// `patchForThisBeat` shape `web-income-life-expectancy/render-web.mjs` uses:
//   1. `<html lang="fr">` → `<html lang="en">` (this beat's words are English throughout).
//   2. The inlined `<script>` block is swapped for this directory's OWN `lollipop-interaction.mjs`
//      — a lollipop's per-row hit-rects need per-row wiring, not the skill's line-genre
//      nearest-by-x mechanic (see that file's own doc-comment for why).
//   3. A small CSS override is appended for `.row-hit`'s own hover/focus states — the skill's
//      generic stylesheet only styles `.pt`, which this beat's markup never uses.
//
// Usage:  bun proof/weby-lollipop-co2-per-capita/render-web.mjs [outDir] [--data <csv>]

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readPalette } from "#shared/chart-beat/render-still.mjs";
import { renderWeb } from "../../skills/chart-web/scripts/render-web.mjs";
import { LollipopCo2Web, FRAME } from "./LollipopCo2Web.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));

const EXPECTED_COUNTRIES = [
  "Austria",
  "Belgium",
  "Denmark",
  "France",
  "Germany",
  "Greece",
  "Italy",
  "Netherlands",
  "Norway",
  "Poland",
  "Portugal",
  "Spain",
  "Sweden",
  "Switzerland",
  "United Kingdom",
];

const SUBJECT = "Switzerland";
const YEAR = "2024";

const DEFAULT_DATA_PATH = join(HERE, "data.csv");
// And the OUTPUT defaults beside the beat too — where this beat's html is actually committed. It
// used to default to a scratch directory, so running this script the obvious way produced a fresh
// file nobody looks at, printed a path, exited zero, and left the committed one stale.
const DEFAULT_OUT_DIR = HERE;
const OUTPUT_NAME = "lollipop-co2-per-capita.html";

function ordinalSuffix(n) {
  const j = n % 10;
  const k = n % 100;
  if (j === 1 && k !== 11) return "st";
  if (j === 2 && k !== 12) return "nd";
  if (j === 3 && k !== 13) return "rd";
  return "th";
}

function parseCsv(text) {
  const [header, ...rows] = text.trim().split(/\r?\n/);
  const cols = header.split(",");
  return rows
    .filter((row) => row.length > 0)
    .map((row) => {
      const cells = row.split(",");
      const rec = {};
      cols.forEach((c, i) => (rec[c] = cells[i]));
      return rec;
    });
}

/** Reads `data.csv` fresh, filters to 2024, verifies the entity set and per-country 2024 coverage,
 *  and returns the ranked (descending) rows plus the claim's own numbers — computed here, not
 *  assumed. Exported so the render can be driven with a different data path if ever needed. */
export function rowsFrom2024(csv) {
  const rows = parseCsv(csv);

  // The OWID grapher CSV endpoint silently returns the ENTIRE global dataset with HTTP 200 unless
  // `&csvType=filtered` is present — verify the fetch actually filtered, by eye, rather than
  // trusting the URL parameter did what it looked like it did.
  const distinctCountries = [...new Set(rows.map((r) => r.Entity))].sort();
  const expectedSorted = [...EXPECTED_COUNTRIES].sort();
  if (JSON.stringify(distinctCountries) !== JSON.stringify(expectedSorted)) {
    throw new Error(
      `expected exactly the 15 requested countries, got ${distinctCountries.length}: ${distinctCountries.join(", ")}`,
    );
  }

  // 2024 is the year every one of these 15 countries actually carries in this dataset — verified
  // per-country, rather than assumed and silently backfilled with an earlier year for whichever
  // country happened to be missing it.
  const rows2024 = rows.filter((r) => r.Year === YEAR);
  const missing2024 = EXPECTED_COUNTRIES.filter((c) => !rows2024.some((r) => r.Entity === c));
  if (missing2024.length > 0) {
    throw new Error(`missing a ${YEAR} reading for: ${missing2024.join(", ")}`);
  }

  const data = rows2024.map((r) => ({
    country: r.Entity,
    value: Number(r["CO₂ emissions per capita"]),
  }));

  const sorted = [...data].sort((a, b) => b.value - a.value);
  const subjectRank = sorted.findIndex((d) => d.country === SUBJECT) + 1;
  const subjectRow = sorted[subjectRank - 1];
  const rankFromBottom = sorted.length - subjectRank + 1;
  const highest = sorted[0];

  return { sorted, subjectRow, subjectRank, rankFromBottom, highest };
}

/** Strips the `export` keyword from each top-level declaration — the same transform
 *  `chart-web/scripts/render-web.mjs`'s own `inlineable` applies to the skill's script, so
 *  this beat's `lollipop-interaction.mjs` (authored as an ES module for readability) can also run as
 *  a plain classic `<script>` — no `type="module"`, so it keeps working in a CMS iframe or
 *  sandboxed embed that restricts module scripts. */
function inlineable(moduleSource) {
  return moduleSource.replace(/^export /gm, "");
}

/** CSS appended after the skill's own generic stylesheet. Three things live here, none of which the
 *  generic sheet can know about:
 *
 *  1. THE THIRD GRID TRACK. The genre's `.chart-plot` is two columns (a measured y-gutter and the
 *     fluid plot). A lollipop prints a value label to the RIGHT of every dot, and the top row's dot
 *     sits at the plot's own right edge — so a fixed-pixel track is reserved beyond it
 *     (`--r-gutter`, measured in node from the widest label actually drawn) for those labels to
 *     overflow into. Without it the longest label runs off the frame at 375px, which is exactly the
 *     defect class this genre's own gotcha section says only a screenshot ever catches.
 *  2. `.value-label` and the `.cat` name column — the two type styles this beat adds. Both are
 *     FIXED CSS pixel sizes read from the figure's own custom properties, never anything that
 *     tracks the `viewBox`. `.value-label` carries a `--ground` chip so a gridline passing behind
 *     it stays behind it (the one box this genre allows, `web-discipline.md`).
 *  3. `.row-hit`'s hover/focus/active treatment — the skill's `.pt` rules never match this beat's
 *     markup: a translucent wash across the row's full hit-rect, so mouse and touch alike get a
 *     visible cue for where the "row" boundary is, not just the thin stem, plus a focus ring. */
const EXTRA_CSS = `
.chart-plot.lollipop { grid-template-columns: var(--y-gutter) 1fr var(--r-gutter); }
.chart-plot .y-axis .cat {
  font-size: var(--cat-size);
  font-weight: var(--cat-weight);
  color: var(--ink);
}
.chart-plot .overlay .dot {
  position: absolute;
  border-radius: 50%;
  transform: translate(-50%, -50%);
}
.chart-plot .overlay .value-label {
  position: absolute;
  transform: translateY(-50%) translateX(10px);
  font-size: var(--label-size);
  font-weight: var(--label-weight);
  color: var(--ink);
  background: var(--ground);
  padding: 1px 4px;
  border-radius: 2px;
  white-space: nowrap;
}
.row-hit { cursor: pointer; }
.row-hit:hover, .row-hit:focus, .row-active {
  fill: var(--muted);
  fill-opacity: 0.12;
  outline: none;
}
.row-hit:focus-visible {
  outline: 2px solid var(--ink);
  outline-offset: -2px;
}
`;

async function patchForThisBeat(outPath) {
  let html = await readFile(outPath, "utf8");

  const langMarker = '<html lang="fr">';
  if (!html.includes(langMarker))
    throw new Error(
      `expected renderWeb's own ${JSON.stringify(langMarker)} shell to patch to English — its HTML shape may have changed`,
    );
  html = html.replace(langMarker, '<html lang="en">');

  const scriptBlockRe = /<script>\n[\s\S]*?\n<\/script>/;
  if (!scriptBlockRe.test(html))
    throw new Error(
      "expected exactly one inlined <script>...</script> block to replace with this beat's own interaction script",
    );
  const ownScript = await readFile(join(HERE, "lollipop-interaction.mjs"), "utf8");
  html = html.replace(scriptBlockRe, `<script>\n${inlineable(ownScript)}\n</script>`);

  if (!html.includes("</head>"))
    throw new Error("expected a </head> to append this beat's own CSS override before");
  html = html.replace("</head>", `<style>\n${EXTRA_CSS}\n</style>\n</head>`);

  await writeFile(outPath, html);
}

export async function render({ dataPath, outDir, name = OUTPUT_NAME }) {
  const csv = await readFile(dataPath, "utf8");
  const { sorted, subjectRow, rankFromBottom, highest } = rowsFrom2024(csv);

  if (rankFromBottom !== 3)
    throw new Error(
      `expected Switzerland to be 3rd-lowest of 15, computed rank-from-bottom ${rankFromBottom} — the claim does not hold against the frozen data`,
    );

  const claim = `Switzerland's 2024 per-capita CO₂ emissions were the ${rankFromBottom}${ordinalSuffix(rankFromBottom)}-lowest of these 15 European countries, at ${subjectRow.value.toFixed(1)} tonnes — less than half of ${highest.country}'s ${highest.value.toFixed(1)} tonnes.`;

  // The two colours this beat is drawn in are recorded in `PALETTE.md` beside this file, never
  // typed here — a hex in this call is a colour the newsroom's own recorded answer can never reach.
  const { ground, accent, origin, source: paletteSource } = readPalette(HERE, {
    stopAt: join(HERE, ".."),
  });
  console.log(
    `palette from ${paletteSource} — ground ${ground}, accent ${accent}, chosen by ${origin}`,
  );

  const { outPath } = await renderWeb({
    component: LollipopCo2Web,
    props: {
      frame: FRAME,
      rows: sorted,
      title: claim,
      source: "Source: Global Carbon Budget 2025, via Our World in Data · 2024 data",
      alt: `Lollipop chart ranking 2024 per-capita CO2 emissions across 15 European countries, highest to lowest. ${highest.country} is highest at ${highest.value.toFixed(1)} tonnes per capita. Switzerland, highlighted, is ${rankFromBottom}${ordinalSuffix(rankFromBottom)}-lowest at ${subjectRow.value.toFixed(1)} tonnes. Every row prints its own rounded value; hovering, tapping or focusing a row reveals that row's reading to three decimals, which is what separates Switzerland from Sweden.`,
      ground,
      accent,
      subject: SUBJECT,
    },
    outDir,
    name,
  });

  await patchForThisBeat(outPath);

  return { outPath, rows: sorted.length, claim, subjectRow, highest, rankFromBottom };
}

if (import.meta.main) {
  const argv = process.argv.slice(2);
  const flag = (name, fallback) => {
    const at = argv.indexOf(name);
    return at >= 0 ? argv[at + 1] : fallback;
  };
  const positional = argv.find((a) => !a.startsWith("--"));
  const dataPath = resolve(flag("--data", DEFAULT_DATA_PATH));
  const outDir = resolve(positional ?? flag("--out", DEFAULT_OUT_DIR));

  const { outPath, rows, claim, subjectRow, highest, rankFromBottom } = await render({
    dataPath,
    outDir,
  });
  console.log(`web beat → ${outPath}  [${rows} rows]`);
  console.log(`claim: ${claim}`);
  console.log(
    `Switzerland exact: ${subjectRow.value} t · highest exact: ${highest.country} ${highest.value} t · rank-from-bottom: ${rankFromBottom}`,
  );
}
