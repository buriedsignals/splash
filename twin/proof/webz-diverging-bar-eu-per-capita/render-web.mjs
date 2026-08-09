// twin/proof/webz-diverging-bar-eu-per-capita/render-web.mjs
//
// This beat's own WEB runner — the same shape `../weby-lollipop-co2-per-capita/render-web.mjs` and
// `../co2-suisse/render-web.mjs` keep: the story's own constants, its own CSV reader, its own
// component, handed to the genre's generic `renderWeb`. It lives here, beside the story, not inside
// `skills/twin-chart-web/scripts/render-web.mjs` — that file's own header explains why: a skill
// directory that imports a story workspace does not build once copied, on its own, into a
// journalist's root.
//
// EVERY CLAIM IS COMPUTED HERE, from the frozen `data.csv` beside this file: which country is the
// exception, that it is the ONLY one, how many rows sit on each side, the size of the rise, the two
// readings behind it, the mean of the falls and which fall is the largest and which the smallest.
// The headline says "the only", which is exactly the kind of claim that quietly stops being true
// with a data refresh — so it is ASSERTED, and this script throws rather than shipping a stale
// sentence over fresh numbers. Nothing in the rendered page is typed.
//
// After calling the skill's generic `renderWeb`, this file PATCHES the HTML it wrote — the same
// `patchForThisBeat` shape the lollipop beat uses:
//   1. `<html lang="fr">` → `<html lang="en">` (this beat's words are English throughout, and its
//      one formatter is `en`, formatting with `Intl.NumberFormat("en-US")`).
//   2. The inlined `<script>` block is swapped for this directory's OWN
//      `diverging-interaction.mjs` — per-row hit rects need per-row wiring, not the skill's line
//      genre nearest-by-x mechanic.
//   3. This beat's own CSS is appended: the four-column / three-row plot grid, the two value-label
//      sides, the subject band's chip colour, and `.row-hit`'s hover/focus states — none of which
//      the genre's generic stylesheet can know about.
//
// Usage:  bun proof/webz-diverging-bar-eu-per-capita/render-web.mjs [outDir] [--data <csv>]

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderWeb } from "../../skills/twin-chart-web/scripts/render-web.mjs";
import { readPalette } from "../../skills/twin-chart-web/scripts/render-still.mjs";
import { DivergingBarWeb, FRAME } from "./DivergingBarWeb.tsx";
import { en } from "./diverging-geometry.ts";

const HERE = dirname(fileURLToPath(import.meta.url));

const FROM = 1990;
const TO = 2024;
/** The universe the headline names. A membership list, not a data choice: the EU has 27 member
 *  states, and the frozen file was fetched for exactly those 27 ISO codes. */
const MEMBERS = 27;

const SOURCE =
  "Source: Global Carbon Budget (2025); population based on various sources (2024) – " +
  "with major processing by Our World in Data · fossil fuels and industry only";

const DEFAULT_DATA_PATH = join(HERE, "data.csv");
// The OUTPUT defaults beside the beat, where this beat's html is actually committed. A default
// pointing at a scratch directory produces a fresh file nobody looks at, prints a path, exits zero
// and leaves the committed one stale — the defect `render-output-lands-in-its-own-beat.test.ts`
// exists for.
const DEFAULT_OUT_DIR = HERE;
const OUTPUT_NAME = "diverging-bar-eu-per-capita.html";

/**
 * OWID's `co-emissions-per-capita` export, filtered at fetch time to the 27 EU member states.
 *
 * Returns one row per country — its reading in each of the two years and the signed change —
 * sorted from the largest rise to the largest fall. A country missing either year is DROPPED here
 * and the count assertion below then fails, because a headline that says "the only EU country"
 * cannot be made from a partial field.
 */
export function changesBetween(csv, from, to) {
  const [header, ...rows] = csv.trim().split(/\r?\n/);
  const columns = header.split(",");
  const entityAt = columns.indexOf("Entity");
  const yearAt = columns.indexOf("Year");
  const valueAt = columns.findIndex((c) => c.startsWith("CO"));
  if (entityAt < 0 || yearAt < 0 || valueAt < 0)
    throw new Error(
      `csv has no Entity / Year / CO₂ per capita column, got: ${header}`,
    );

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

/** Strips the `export` keyword from each top-level declaration — the same transform the genre's own
 *  `inlineable` applies to the skill's script, so this beat's `diverging-interaction.mjs`
 *  (authored as an ES module for readability) can also run as a plain classic `<script>`: no
 *  `type="module"`, so it keeps working in a CMS iframe or sandboxed embed that restricts module
 *  scripts. */
function inlineable(moduleSource) {
  return moduleSource.replace(/^export /gm, "");
}

/**
 * CSS appended after the skill's own generic stylesheet. Four things live here, none of which the
 * generic sheet can know about:
 *
 *  1. THE FOUR-COLUMN, THREE-ROW PLOT GRID. The genre's `.chart-plot` is two columns (a measured
 *     y-gutter and the fluid plot) and two rows (the plot and an x-axis strip). A diverging bar
 *     prints its value label just outside its bar's growing END — LEFT for a fall, RIGHT for a
 *     rise — and both extremes overflow the plot, so a fixed-pixel track is reserved on EACH side
 *     (`--l-gutter`, `--r-gutter`, both measured in node from the widest label actually drawn) with
 *     the country names in a third track OUTSIDE the left one. Without the left one the longest
 *     bar's label runs into the names, which is precisely the "Luxembo—20.48" this beat's video
 *     sibling shipped on its first render. A third grid ROW is reserved above the plot for the
 *     average rule's own label, which has to sit at the rule's own `%` and cannot land on a data row.
 *  2. `.value-label` and the `.cat` name column — the type styles this beat adds, all FIXED CSS
 *     pixel sizes read from the figure's own custom properties, never anything that tracks the
 *     `viewBox`. Each value label carries an opaque chip so a gridline, the zero line or the average
 *     rule passing behind it stays BEHIND it (the one box this genre allows). On this type that chip
 *     is not decoration: the video sibling's rule struck through four value labels and turned
 *     "−3.39" into what reads as "+3.39".
 *  3. `--subject-band` as the chip colour for the two labels that sit on the subject's own tinted
 *     row (`.on-band`). A `--ground` chip there punches a ragged hole through the band — found by
 *     looking at the static sibling's first render.
 *  4. `.row-hit`'s hover/focus/active treatment — the skill's `.pt` rules never match this beat's
 *     markup: a translucent wash across the row's full hit rect, so mouse and touch alike get a
 *     visible cue for where the row boundary is even when the bar itself is a sliver, plus a focus
 *     ring.
 */
const EXTRA_CSS = `
.chart-plot.diverging {
  grid-template-columns: var(--y-gutter) var(--l-gutter) 1fr var(--r-gutter);
  grid-template-rows: var(--note-row-h) 1fr var(--x-axis-h);
}
.chart-plot.diverging .note-row { grid-column: 3; grid-row: 1; position: relative; }
.chart-plot.diverging .y-axis { grid-column: 1; grid-row: 2; }
.chart-plot.diverging svg.chart { grid-column: 3; grid-row: 2; }
.chart-plot.diverging .overlay { grid-column: 3; grid-row: 2; }
.chart-plot.diverging .x-axis { grid-column: 3; grid-row: 3; }

.chart-plot .y-axis .cat {
  font-size: var(--cat-size);
  font-weight: var(--cat-weight);
  color: var(--ink);
}
.chart-plot .y-axis .cat.subject { font-weight: var(--cat-subject-weight); }

.chart-plot .note-row .average-label {
  position: absolute;
  bottom: 2px;
  transform: translateX(-50%);
  font-size: var(--note-size);
  font-weight: var(--note-weight);
  color: var(--ink);
  background: var(--ground);
  padding: 1px 4px;
  border-radius: 2px;
  white-space: nowrap;
}

.chart-plot .overlay .value-label {
  position: absolute;
  font-size: var(--label-size);
  font-weight: var(--label-weight);
  color: var(--ink);
  background: var(--ground);
  padding: 0 3px;
  border-radius: 2px;
  white-space: nowrap;
}
.chart-plot .overlay .value-label.negative { transform: translate(-100%, -50%) translateX(-6px); }
.chart-plot .overlay .value-label.positive { transform: translateY(-50%) translateX(6px); }
.chart-plot .overlay .subject-note {
  position: absolute;
  transform: translate(-100%, -50%) translateX(-18px);
  font-size: var(--note-size);
  font-weight: 400;
  color: var(--ink);
  padding: 0 3px;
  border-radius: 2px;
  white-space: nowrap;
}
.chart-plot .overlay .on-band { background: var(--subject-band); }

.chart-plot .x-axis .zero { color: var(--ink); font-weight: 600; }

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
  const ownScript = await readFile(join(HERE, "diverging-interaction.mjs"), "utf8");
  html = html.replace(scriptBlockRe, `<script>\n${inlineable(ownScript)}\n</script>`);

  if (!html.includes("</head>"))
    throw new Error("expected a </head> to append this beat's own CSS override before");
  html = html.replace("</head>", `<style>\n${EXTRA_CSS}\n</style>\n</head>`);

  await writeFile(outPath, html);
}

export async function render({ dataPath, outDir, name = OUTPUT_NAME }) {
  const csv = await readFile(dataPath, "utf8");
  const rows = changesBetween(csv, FROM, TO);

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
    throw new Error(
      `${MEMBERS - rose.length - fell.length} countries are exactly flat — the sentence does not fit`,
    );

  const subject = rose[0];
  const averageFall = fell.reduce((sum, r) => sum + r.change, 0) / fell.length;
  const largest = fell.reduce((a, b) => (b.change < a.change ? b : a));
  const smallest = fell.reduce((a, b) => (b.change > a.change ? b : a));

  // ONE OBJECT, not a run of `const`s, and the shape is load-bearing rather than tidy.
  // `claims-grounded-in-data.test.ts` reads a reader-facing string either as `prop:` inside an
  // object or as a `const` whose own name is a reader-facing prop — but its expression reader does
  // not treat `;` as a terminator, so a claim `const` declared immediately after another one is
  // swallowed by its predecessor's expression and never scanned. Measured on a copy of this tree:
  // with `title` and `caveat` as consecutive consts, mutating a figure inside `caveat` to a value
  // the frozen data cannot reproduce left the guard GREEN. Inside an object every entry ends at its
  // own comma, which the reader does terminate on, so all three are scanned — verified by the same
  // mutation going red afterwards.
  const words = {
    title: `${subject.country} is the only EU country emitting more CO₂ per person than in ${FROM}`,
    caveat:
      `${subject.country}'s rise is ${en(subject.change)} tonnes per person — the only one, and a small one: ` +
      `${subject.from.toFixed(2)} in ${FROM} against ${subject.to.toFixed(2)} in ${TO}. ` +
      `The other ${fell.length} all emit less, by ${Math.abs(averageFall).toFixed(2)} tonnes on average. ` +
      `Hover, tap or tab to a row for its two readings.`,
    alt:
      `A diverging bar chart of the change in CO₂ emissions per person between ${FROM} and ${TO} for all ` +
      `${MEMBERS} EU member states, sorted from the largest rise to the largest fall. Exactly one bar ` +
      `points right of the zero line: ${subject.country}, at ${en(subject.change)} tonnes per person, ` +
      `drawn in the accent colour on a highlighted row. The other ${fell.length} point left, from ` +
      `${smallest.country} at ${en(smallest.change)} down to ${largest.country} at ${en(largest.change)}. ` +
      `A dashed rule marks the average of those falls, ${en(averageFall)}. Every row is reachable by ` +
      `keyboard and reports its ${FROM} and ${TO} readings unrounded.`,
  };
  const subjectNote = `the only rise since ${FROM}`;
  const averageFallLabel = `Average of the ${fell.length} falls: ${en(averageFall)}`;

  const {
    ground,
    accent,
    origin,
    source: paletteSource,
  } = readPalette(HERE, { stopAt: join(HERE, "..") });

  const { outPath } = await renderWeb({
    component: DivergingBarWeb,
    props: {
      frame: FRAME,
      rows,
      ...words,
      source: SOURCE,
      ground,
      accent,
      subject: subject.country,
      subjectNote,
      averageFall,
      averageFallLabel,
      fromYear: FROM,
      toYear: TO,
    },
    outDir,
    name,
  });

  await patchForThisBeat(outPath);

  return {
    outPath,
    rows,
    subject,
    averageFall,
    largest,
    smallest,
    fellCount: fell.length,
    palette: { ground, accent, origin, source: paletteSource },
    words,
  };
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

  const result = await render({ dataPath, outDir });
  console.table(
    result.rows.map((r, i) => ({
      row: i + 1,
      country: r.country,
      [FROM]: r.from.toFixed(2),
      [TO]: r.to.toFixed(2),
      change: en(r.change),
    })),
  );
  console.log(
    `rose 1 (${result.subject.country} ${result.subject.change}) · fell ${result.fellCount} · ` +
      `mean of the falls ${result.averageFall.toFixed(4)} · largest ${result.largest.country} ` +
      `${result.largest.change.toFixed(4)} · smallest ${result.smallest.country} ${result.smallest.change.toFixed(4)}`,
  );
  console.log(
    `palette from ${result.palette.source} — ground ${result.palette.ground}, accent ${result.palette.accent}, chosen by ${result.palette.origin}`,
  );
  console.log(`title:  ${result.words.title}`);
  console.log(`caveat: ${result.words.caveat}`);
  console.log(`alt:    ${result.words.alt}`);
  console.log(`web beat → ${result.outPath}  [${result.rows.length} rows]`);
}
