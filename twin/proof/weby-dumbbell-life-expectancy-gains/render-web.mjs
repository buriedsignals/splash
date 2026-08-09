// twin/proof/weby-dumbbell-life-expectancy-gains/render-web.mjs
//
// This beat's own WEB runner — the same shape `../web-income-life-expectancy/render-web.mjs` and
// `../co2-suisse/render-web.mjs` both have: the story's own constants, its own CSV reader, its
// own component, handed to the genre's generic `renderWeb`. It lives here, beside the story, not
// inside `skills/twin-chart-web/scripts/render-web.mjs` — that file's own header explains why: a
// skill directory that imports a story workspace does not build once copied, on its own, into a
// journalist's root.
//
// Reads `data.csv` fresh (does NOT import the STATIC sibling's `render.mjs` parser — a beat never
// imports another beat's files), filters to Year 2000 and Year 2023 in code, computes each
// country's gap, verifies the entity set and every gap's sign, sorts by gap descending, then
// calls the skill's generic `renderWeb` and PATCHES the output HTML exactly the way
// `web-income-life-expectancy/render-web.mjs`'s own `patchForThisBeat` does:
//
//   1. `<html lang="fr">` → `<html lang="en">` — `renderWeb`'s own HTML shell hard-codes
//      `lang="fr"` (baked in for the CO₂ beat's French words, its first real caller). This beat's
//      words are English throughout; leaving the French tag would misdeclare the page's language.
//   2. The inlined interaction script is swapped for this directory's OWN
//      `dumbbell-interaction.mjs`, and a small CSS override is appended, for the reason that
//      file's own header explains: this beat's hit-test is per-row, not nearest-by-x or
//      nearest-by-2D-distance, so neither of the two existing interaction scripts applies.
//
// Both substitutions fail loud if the shape they expect to find has changed, rather than silently
// leaving the wrong script or the wrong language tag in place.
//
// Usage:  bun proof/weby-dumbbell-life-expectancy-gains/render-web.mjs [outDir]

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderWeb } from "../../skills/twin-chart-web/scripts/render-web.mjs";
import {
  DumbbellLifeExpectancyGainsWeb,
  FRAME,
} from "./DumbbellLifeExpectancyGainsWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));

const EXPECTED_COUNTRIES = [
  "France",
  "Germany",
  "Italy",
  "Japan",
  "Netherlands",
  "Poland",
  "Spain",
  "Switzerland",
  "United Kingdom",
  "United States",
];

const DEFAULT_DATA_PATH = join(HERE, "data.csv");
// And the OUTPUT defaults beside the beat too — where this beat's html is actually committed. It
// used to default to a scratch directory, so running this script the obvious way produced a fresh
// file nobody looks at, printed a path, exited zero, and left the committed one stale.
const DEFAULT_OUT_DIR = HERE;
const OUTPUT_NAME = "dumbbell-life-expectancy-gains.html";

function parseCsv(text) {
  const [header, ...rows] = text.trim().split(/\r?\n/);
  const cols = header.split(",");
  return rows.map((row) => {
    const cells = row.split(",");
    const rec = {};
    cols.forEach((c, i) => (rec[c] = cells[i]));
    return rec;
  });
}

/**
 * Reads `data.csv` fresh, filters to Year 2000 and Year 2023 in code, computes each country's
 * gap, and verifies every check the STATIC sibling's own `render.mjs` makes — the entity set is
 * exactly these ten countries, exactly 20 rows survive the year filter, and every gap is
 * positive — before any claim gets written that says so. Exported so this beat's own tests can
 * exercise it without going through `renderWeb`.
 */
export function rowsFromCsv(csv) {
  const rows = parseCsv(csv);

  // The OWID grapher CSV endpoint silently returns the ENTIRE global dataset with HTTP 200 unless
  // csvType=filtered is on the URL — verify by eye rather than trust the parameter worked, the
  // same check the static sibling makes.
  const distinctEntities = [...new Set(rows.map((r) => r.Entity))].sort();
  const expectedSorted = [...EXPECTED_COUNTRIES].sort();
  if (JSON.stringify(distinctEntities) !== JSON.stringify(expectedSorted)) {
    throw new Error(
      `expected exactly these 10 countries: ${expectedSorted.join(", ")} — got: ${distinctEntities.join(", ")}`,
    );
  }

  // Filtering to 2000 and 2023 happens HERE, in code, not by hand-editing the CSV.
  const filtered = rows.filter((r) => r.Year === "2000" || r.Year === "2023");
  if (filtered.length !== 20) {
    throw new Error(`expected 20 rows (10 countries x 2 years), got ${filtered.length}`);
  }

  const byCountry = new Map();
  for (const r of filtered) {
    const entry = byCountry.get(r.Entity) ?? {};
    entry[r.Year] = Number(r["Life expectancy"]);
    byCountry.set(r.Entity, entry);
  }

  const dataRows = EXPECTED_COUNTRIES.map((country) => {
    const entry = byCountry.get(country);
    if (!entry || entry["2000"] === undefined || entry["2023"] === undefined) {
      throw new Error(`missing 2000 or 2023 reading for ${country}`);
    }
    const y2000 = entry["2000"];
    const y2023 = entry["2023"];
    const gap = y2023 - y2000;
    return { country, y2000, y2023, gap };
  });

  // Every one of the 10 countries must genuinely have risen — checked here, not assumed, before
  // any claim gets written that says so.
  const nonPositive = dataRows.filter((r) => r.gap <= 0);
  if (nonPositive.length > 0) {
    throw new Error(
      `expected every country to have gained life expectancy, but these did not: ${nonPositive
        .map((r) => `${r.country} (${r.gap.toFixed(2)})`)
        .join(", ")}`,
    );
  }

  // Sort by gap size, descending — the type's own rule (`references/types/dumbbell.md`) — so the
  // rendered rows put the biggest difference at the top, and this order is also what
  // `dumbbell-interaction.mjs`'s ArrowDown/ArrowUp keyboard mapping relies on: DOM order top to
  // bottom matches visual order top to bottom.
  return [...dataRows].sort((a, b) => b.gap - a.gap);
}

/** Strips the `export` keyword from each top-level declaration — the same one-line transform
 *  `twin-chart-web/scripts/render-web.mjs`'s own `inlineable` applies to the skill's script, so
 *  this beat's own `dumbbell-interaction.mjs` (authored as an ES module for readability) can also
 *  run as a plain classic `<script>` — no `type="module"`, so it keeps working in a CMS iframe or
 *  sandboxed embed that restricts module scripts, exactly like the skill's own copy. */
function inlineable(moduleSource) {
  return moduleSource.replace(/^export /gm, "");
}

/** CSS appended after the skill's own generic stylesheet. Four things live here, none of which the
 *  generic sheet can know about:
 *
 *  1. THE FOUR GRID TRACKS. The genre's `.chart-plot` is two columns (a measured y-gutter and the
 *     fluid plot). A dumbbell row carries three fixed-pixel strings around a fluid plot — the
 *     country name, and a value printed OUTSIDE each of the two dots — so three fixed tracks are
 *     reserved: the names in the first, and empty room either side of the plot (`--lv-gutter`,
 *     `--rv-gutter`, measured in node) for the value labels to overflow into. The `<svg>`, the
 *     overlay and the x-axis row all move to the third track together, so they stay in register.
 *  2. `.chart-legend` — a real flex row of two swatch+word keys, `flex: 0 0 auto` like every other
 *     word in the figure's column, so the window-fit rule never squeezes it (the plot absorbs the
 *     shortfall instead).
 *  3. `.dot`, `.value-label` and the `.cat` name column — the type and mark styles this beat adds,
 *     all FIXED CSS pixel sizes read from the figure's own custom properties, never anything that
 *     tracks the `viewBox`. The value labels carry a `--ground` chip so a gridline passing behind
 *     one stays behind it (the one box this genre allows, `web-discipline.md`).
 *  4. `.hit-row`'s hover/focus treatment — the skill's `.pt` rules never match this beat's markup:
 *     a faint wash over the active row's whole band, never a colour that could be mistaken for
 *     either dot's own hue, plus a visible keyboard-focus outline. */
const EXTRA_CSS = `
.chart-plot.dumbbell {
  grid-template-columns: var(--cat-gutter) var(--lv-gutter) 1fr var(--rv-gutter);
}
.chart-plot.dumbbell svg.chart,
.chart-plot.dumbbell .overlay,
.chart-plot.dumbbell .x-axis { grid-column: 3; }
.chart-legend {
  flex: 0 0 auto;
  display: flex;
  flex-wrap: wrap;
  gap: 4px 18px;
  margin: 10px 0 6px;
  font-size: var(--legend-size);
  font-weight: var(--legend-weight);
  color: var(--ink);
}
.chart-legend .legend-key { display: inline-flex; align-items: center; gap: 6px; }
.chart-legend .legend-swatch {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  display: inline-block;
}
.chart-plot .y-axis .cat {
  right: auto;
  left: 0;
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
  font-size: var(--label-size);
  font-weight: var(--label-weight);
  color: var(--ink);
  background: var(--ground);
  padding: 1px 4px;
  border-radius: 2px;
  white-space: nowrap;
}
.chart-plot .overlay .value-label.left {
  transform: translate(-100%, -50%) translateX(-10px);
}
.chart-plot .overlay .value-label.right {
  transform: translateY(-50%) translateX(10px);
}
.hit-row { cursor: pointer; }
.hit-row:hover, .hit-row:focus, .hit-row-active {
  fill: rgba(0, 0, 0, 0.05);
  outline: none;
}
.hit-row:focus-visible {
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
  const ownScript = await readFile(join(HERE, "dumbbell-interaction.mjs"), "utf8");
  html = html.replace(scriptBlockRe, `<script>\n${inlineable(ownScript)}\n</script>`);

  if (!html.includes("</head>"))
    throw new Error("expected a </head> to append this beat's own CSS override before");
  html = html.replace("</head>", `<style>\n${EXTRA_CSS}\n</style>\n</head>`);

  await writeFile(outPath, html);
}

export async function render({ dataPath, outDir, name = OUTPUT_NAME }) {
  const csv = await readFile(dataPath, "utf8");
  const sorted = rowsFromCsv(csv);

  const most = sorted[0];
  const least = sorted[sorted.length - 1];
  console.log(
    `most gained: ${most.country} (+${most.gap.toFixed(1)} years) — least gained: ${least.country} (+${least.gap.toFixed(1)} years)`,
  );

  const title =
    `Every one of these ten countries added years of life expectancy between 2000 and 2023 — ` +
    `${most.country} gained the most, +${most.gap.toFixed(1)} years; ${least.country} gained the least, +${least.gap.toFixed(1)} years`;

  const alt =
    `Dumbbell chart of life expectancy at birth in 2000 (blue) and 2023 (vermillion) for ten ` +
    `countries, sorted by the size of the gain, largest first. Every country's 2023 dot sits to ` +
    `the right of its 2000 dot. ${most.country} rose from ${most.y2000.toFixed(1)} to ` +
    `${most.y2023.toFixed(1)} years, the largest gain (+${most.gap.toFixed(1)}); ${least.country} ` +
    `rose from ${least.y2000.toFixed(1)} to ${least.y2023.toFixed(1)} years, the smallest gain ` +
    `(+${least.gap.toFixed(1)}). Every row's own exact gap is available on hover, tap or keyboard ` +
    `focus.`;

  const { outPath } = await renderWeb({
    component: DumbbellLifeExpectancyGainsWeb,
    props: {
      frame: FRAME,
      rows: sorted,
      title,
      source:
        "Source: UN, World Population Prospects (2024), via Our World in Data · 2000 and 2023, extracted 8 August 2026",
      alt,
      ground: "#FFFFFF",
      // Nominal only. This beat carries no single semantic accent — the two series' own fixed hues
      // do that job — but `renderWeb`'s shared CSS shell always writes `--accent` from this prop,
      // and omitting it wrote the literal token `undefined` into the stylesheet. Nothing in this
      // beat's markup or CSS reads it.
      accent: "#0B7A75",
    },
    outDir,
    name,
  });

  await patchForThisBeat(outPath);

  return { outPath, rows: sorted.length, most, least };
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

  const { outPath, rows } = await render({ dataPath, outDir });
  console.log(`web beat → ${outPath}  [${rows} rows]`);
}
