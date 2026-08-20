// twin/proof/weby-boxplot-france-co2-decades/render-web.mjs
//
// This beat's own WEB runner — the same shape `../web-income-life-expectancy/render-web.mjs` and
// `../co2-suisse/render-web.mjs` both have: the story's own constants, its own CSV reader, its own
// component, handed to the format's generic machinery. It lives here, beside the story, not inside
// `skills/chart-web/scripts/render-web.mjs` — a skill directory that imports a story workspace
// does not build once copied, on its own, into a journalist's root.
//
// Same deliberate departure `web-income-life-expectancy/render-web.mjs` documents: after calling
// the skill's generic `renderWeb`, this file PATCHES the HTML it wrote —
//
//   1. `<html lang="fr">` → `<html lang="en">` (this beat's words are English throughout).
//   2. The inlined interaction script is swapped for this directory's OWN
//      `boxplot-interaction.mjs` — the skill's own `assets/interaction.mjs` resolves hover/tap by
//      nearest-x, which has no meaning on this beat's categorical decade axis (see
//      `DecadeBoxplotWeb.tsx`'s own doc-comment). A small CSS override for the `.cat` hit
//      rectangles is appended.
//
// Both substitutions fail loud if the shape they expect to find has changed, rather than silently
// leaving the wrong script or the wrong language tag in place.
//
// Usage:  bun proof/weby-boxplot-france-co2-decades/render-web.mjs [outDir] [--data <csv>]

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readPalette } from "#shared/chart-beat/render-still.mjs";
import { renderWeb } from "../../skills/chart-web/scripts/render-web.mjs";
import { summarizeDecade } from "./boxplot-geometry.ts";
import { DecadeBoxplotWeb, FRAME } from "./DecadeBoxplotWeb.tsx";

/**
 * RFC 4180 row tokeniser, inlined here rather than imported — no cross-skill runtime import, and
 * a proof/story workspace is not a skill either. A naive comma split corrupts a quoted thousands
 * separator ("1,234.5") or a quoted name carrying its own comma ("Netherlands, the"); this walks
 * the text one character at a time instead. Returns one array of raw field strings per row
 * (header included), quotes stripped, doubled quotes un-escaped, and a lone CR or CRLF closing a
 * row the same way LF does.
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

const DEFAULT_DATA_PATH = join(HERE, "data.csv");
// And the OUTPUT defaults beside the beat too — where this beat's html is actually committed. It
// used to default to a scratch directory, so running this script the obvious way produced a fresh
// file nobody looks at, printed a path, exited zero, and left the committed one stale.
const DEFAULT_OUT_DIR = HERE;
const OUTPUT_NAME = "boxplot-france-co2-decades.html";

/** Simple `split(",")` — this file's own columns carry no commas (matches the static beat's own
 *  `render.mjs`, which reads the identical file). Not RFC4180-quoted; fine for this data. */
function parseCsv(text) {
  const [header, ...rows] = parseCsvRows(text.trim());
  const cols = header;
  return rows.map((row) => {
    const cells = row;
    const rec = {};
    cols.forEach((c, i) => (rec[c] = cells[i]));
    return rec;
  });
}

/**
 * Reads the frozen CSV, verifies it against the same checks the static beat's own `render.mjs`
 * makes (independent re-implementation, not imported — a beat never imports another beat's files),
 * buckets into decades keeping each reading's own year (needed for the outlier tooltip text this
 * format adds — see `boxplot-geometry.ts`'s own doc-comment), and verifies the claim on the real
 * computed medians before handing anything to the renderer.
 */
export async function loadDecades(dataPath) {
  const csv = await readFile(dataPath, "utf8");
  const rows = parseCsv(csv);
  console.log(`read ${rows.length} raw rows from data.csv (full series, all years)`);

  // The OWID grapher CSV endpoint silently returns the entire global dataset with HTTP 200 unless
  // `csvType=filtered` is on the URL (`intake/references/ourworldindata-csv-filter-trap.md`).
  // The fetch URL already carries it; this is the second, independent check on the data itself.
  const entities = new Set(rows.map((r) => r.Entity));
  if (entities.size !== 1 || !entities.has("France"))
    throw new Error(
      `expected the Entity column to contain only "France", got: ${[...entities].join(", ")}`,
    );

  const readings = rows
    .map((r) => ({ year: Number(r.Year), value: Number(r["CO₂ emissions per capita"]) }))
    .filter((r) => r.year >= 1950);
  console.log(`${readings.length} readings from 1950 onward (France has annual coverage 1950-2024)`);
  if (readings.length !== 75)
    throw new Error(`expected 75 annual readings (1950-2024 inclusive), got ${readings.length}`);

  // Sanity check the readings themselves before trusting them: France's per-capita CO2 should climb
  // from under 5 in the 1950s to a peak above 10 around 1973, then decline toward roughly 4 by the
  // 2020s.
  const first = readings[0];
  const last = readings[readings.length - 1];
  const peakYear = readings.reduce((a, b) => (b.value > a.value ? b : a));
  console.log(
    `${first.year}: ${first.value.toFixed(2)}  |  peak year ${peakYear.year}: ${peakYear.value.toFixed(2)}  |  ${last.year}: ${last.value.toFixed(2)}`,
  );
  if (first.value >= 5 || peakYear.value <= 10 || last.value >= 5) {
    throw new Error(
      "readings do not match the expected physical shape (starts under 5, peaks above 10, ends near 4) — stop and inspect before drawing",
    );
  }

  // Bucket into decades, keeping each reading's own year. 2020s is a partial decade (2020-2024, 5
  // readings) — every other decade is a full 10.
  const byDecade = new Map();
  for (const r of readings) {
    const decade = Math.floor(r.year / 10) * 10;
    const label = `${decade}s`;
    if (!byDecade.has(label)) byDecade.set(label, []);
    byDecade.get(label).push(r);
  }
  const decades = [...byDecade.entries()].map(([label, readings]) => ({
    label,
    readings,
  }));
  console.log(
    `${decades.length} decades: ${decades.map((d) => `${d.label} (n=${d.readings.length})`).join(", ")}`,
  );

  // Compute the actual five-number summary per decade — the claim is verified against these
  // numbers, not asserted from memory.
  const summaries = decades.map((d) => summarizeDecade(d.label, d.readings));
  console.table(
    summaries.map((s) => ({
      decade: s.label,
      n: s.n,
      q1: s.q1.toFixed(2),
      median: s.median.toFixed(2),
      q3: s.q3.toFixed(2),
      whiskerLo: s.whiskerLo.toFixed(2),
      whiskerHi: s.whiskerHi.toFixed(2),
      outliers: s.outliers.map((o) => `${o.value.toFixed(2)} (${o.year})`).join(", ") || "-",
    })),
  );

  const peakDecade = summaries.reduce((a, b) => (b.median > a.median ? b : a));
  console.log(
    `peak decade by median: ${peakDecade.label} (${peakDecade.median.toFixed(2)} t CO₂ per capita)`,
  );

  // Verify the claim is monotonically true from the peak decade onward, on the real computed
  // medians — not assumed.
  const peakIndex = summaries.findIndex((s) => s.label === peakDecade.label);
  for (let i = peakIndex + 1; i < summaries.length; i++) {
    if (summaries[i].median >= summaries[i - 1].median) {
      throw new Error(
        `claim does not hold: ${summaries[i].label} median (${summaries[i].median.toFixed(2)}) is not lower than ${summaries[i - 1].label}'s (${summaries[i - 1].median.toFixed(2)})`,
      );
    }
  }
  console.log("confirmed: median falls in every decade after the peak, through the 2020s");

  const outlierCount = summaries.reduce((sum, s) => sum + s.outliers.length, 0);
  console.log(`${outlierCount} Tukey outlier(s) across all decades`);

  return { decades, summaries, peakDecade, outlierCount };
}

/** Strips the `export` keyword from each top-level declaration — same one-line transform
 *  `chart-web/scripts/render-web.mjs`'s own `inlineable` applies, so this beat's own
 *  `boxplot-interaction.mjs` (authored as an ES module for readability and its own direct
 *  importability) can also run as a plain classic `<script>` — no `type="module"`. */
function inlineable(moduleSource) {
  return moduleSource.replace(/^export /gm, "");
}

/** CSS appended after the skill's own generic stylesheet. `.pt`/`.hit-area` (the skill's own rules)
 *  target class names this beat does not use at all — nothing here collides with or silently
 *  depends on them; `.cat` is this beat's own name for its per-decade hit rectangle, styled fresh. */
const EXTRA_CSS = `
.chart-plot.boxplot { grid-template-columns: var(--y-gutter) 1fr var(--r-gutter); }
.chart-plot .x-axis .cat-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1.25;
  font-size: var(--cat-size);
  font-weight: var(--cat-weight);
  color: var(--ink);
}
.chart-plot .x-axis .cat-label .n {
  font-size: var(--n-size);
  font-weight: 400;
  color: var(--muted);
}
.chart-plot .overlay .outlier-dot {
  position: absolute;
  border-radius: 50%;
  transform: translate(-50%, -50%);
}
.chart-plot .overlay .outlier-label {
  position: absolute;
  transform: translateY(-50%) translateX(9px);
  font-size: var(--label-size);
  font-weight: var(--label-weight);
  color: var(--ink);
  background: var(--ground);
  padding: 1px 3px;
  border-radius: 2px;
  white-space: nowrap;
}
.cat { cursor: pointer; fill: transparent; outline: none; }
.cat:hover, .cat:focus, .cat-active {
  fill: var(--muted);
  fill-opacity: 0.14;
}
.cat:focus-visible {
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
  const ownScript = await readFile(join(HERE, "boxplot-interaction.mjs"), "utf8");
  html = html.replace(scriptBlockRe, `<script>\n${inlineable(ownScript)}\n</script>`);

  if (!html.includes("</head>"))
    throw new Error("expected a </head> to append this beat's own CSS override before");
  html = html.replace("</head>", `<style>\n${EXTRA_CSS}\n</style>\n</head>`);

  await writeFile(outPath, html);
}

export async function render({ dataPath, outDir, name = OUTPUT_NAME }) {
  const { decades, summaries, peakDecade, outlierCount } = await loadDecades(dataPath);

  const decadeFrom = summaries[0].label;
  const decadeTo = summaries[summaries.length - 1].label;
  const lastSummary = summaries[summaries.length - 1];

  const title = `France's per-capita CO₂ emissions peaked in the ${peakDecade.label} and have fallen in every decade since`;
  const source =
    "Source: Global Carbon Budget 2025, via Our World in Data · France, 1950–2024, extracted 8 August 2026";
  const alt = `Box plot of France's annual per-capita CO2 emissions by decade, ${decadeFrom} to ${decadeTo}, in tonnes per capita. The median rises from ${summaries[0].median.toFixed(2)} in the ${summaries[0].label} to a peak of ${peakDecade.median.toFixed(2)} in the ${peakDecade.label}, then falls every decade after that to ${lastSummary.median.toFixed(2)} in the ${lastSummary.label} (n=${lastSummary.n}, a partial decade covering 2020-2024 only; every other decade shown is a full n=10). ${outlierCount === 0 ? "No decade produced a Tukey outlier." : summaries.filter((s) => s.outliers.length > 0).map((s) => `${s.label} has ${s.outliers.length} outlier reading${s.outliers.length > 1 ? "s" : ""} beyond the whisker: ${s.outliers.map((o) => `${o.value.toFixed(1)} (${o.year})`).join(", ")}.`).join(" ")} Every decade's own full five-number summary, Tukey fence and outlier list is available in exact figures via hover or keyboard focus on its own box — the static frame only ever prints the decade, its n, and (for three or fewer outliers) each outlier's own value.`;

  // The two colours this beat is drawn in are recorded in `PALETTE.md` beside this file, never
  // typed here — a hex in this call is a colour the newsroom's own recorded answer can never reach.
  const { ground, accent, origin, source: paletteSource } = readPalette(HERE, {
    stopAt: join(HERE, ".."),
  });
  console.log(
    `palette from ${paletteSource} — ground ${ground}, accent ${accent}, chosen by ${origin}`,
  );

  const { outPath } = await renderWeb({
    component: DecadeBoxplotWeb,
    props: {
      frame: FRAME,
      decades,
      title,
      source,
      alt,
      ground,
      accent,
    },
    outDir,
    name,
  });

  await patchForThisBeat(outPath);

  return { outPath, decades: decades.length, peakDecade: peakDecade.label, outlierCount };
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

  const { outPath, decades, peakDecade, outlierCount } = await render({ dataPath, outDir });
  console.log(
    `web beat → ${outPath}  [${decades} decades, peak ${peakDecade}, ${outlierCount} outlier(s)]`,
  );
}
