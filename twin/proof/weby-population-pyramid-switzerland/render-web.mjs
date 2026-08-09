// twin/proof/weby-population-pyramid-switzerland/render-web.mjs
//
// This beat's own WEB runner — the same shape `../web-income-life-expectancy/render-web.mjs` and
// `../co2-suisse/render-web.mjs` both have: the story's own constants, its own CSV reader, its own
// component, handed to the genre's generic `renderWeb`. It lives here, beside the story, not inside
// `skills/twin-chart-web/scripts/render-web.mjs`, for the exact reason that file's own header
// explains: a skill directory that imports a story workspace does not build once copied, on its
// own, into a journalist's root.
//
// Same deliberate departure the income/life-expectancy runner takes, and for the same reason: after
// calling the skill's generic `renderWeb`, this file PATCHES the HTML it wrote —
//
//   1. `<html lang="fr">` → `<html lang="en">`. This beat's words are English throughout
//      (`BRIEF.md`); leaving the French tag would misdeclare the page's language to assistive tech
//      for no reason connected to this story.
//   2. The inlined interaction script is swapped for this directory's OWN `pyramid-interaction.mjs`,
//      and a small CSS override is appended. Both exist because this genre's own generic
//      `assets/interaction.mjs` resolves hover/tap by nearest-X over one shared `.hit-area`
//      overlay — wrong here, where the interactive unit is a whole ROW (both sexes at once), not a
//      single point, and the 21 rows already tile the plot exactly (see
//      `pyramid-interaction.mjs`'s own header comment for why that needs neither nearest-x nor
//      nearest-2D resolution at all). The skill's `renderWeb` has no parameter to swap which
//      interaction script it inlines (by design — nothing in that file may import a story's own
//      files), so this runner still calls it for what it DOES generalise (SSR both layouts, derive
//      the furniture, build the HTML shell, write the file) and then patches the one piece that
//      doesn't. Both substitutions fail loud if the shape they expect to find has changed.
//
// Usage:  bun proof/weby-population-pyramid-switzerland/render-web.mjs [outDir] [--data <csv>]

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderWeb } from "../../skills/twin-chart-web/scripts/render-web.mjs";
import { LAYOUTS, SwissAgePyramidWeb } from "./SwissAgePyramidWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));

const DEFAULT_DATA_PATH = join(HERE, "data.csv");
const DEFAULT_OUT_DIR = "/tmp/web-twin";
const OUTPUT_NAME = "population-pyramid-switzerland.html";

/** Nominal accent — this beat carries no single semantic accent (the two sexes' own fixed hues,
 *  `SwissAgePyramidWeb.tsx`'s own `COLOURS`, carry the highlight), but `renderWeb`'s shared CSS
 *  shell always emits a `--accent` custom property from `props.accent`. Supplying a real, defined
 *  colour here (rather than leaving it `undefined`) keeps that shared shell's own CSS valid; no rule
 *  this beat writes ever reads `var(--accent)`. */
const NOMINAL_ACCENT = "#0072B2";

/** Simple `split(",")` — sufficient for these three plain-integer columns; no field in this file
 *  carries a comma. Same shape `static-swiss-age-pyramid/render.mjs`'s own `parseCsv` uses. */
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

/** Strips the `export` keyword from each top-level declaration so `pyramid-interaction.mjs`
 *  (authored as an ES module for readability) can also run as a plain classic `<script>` — the same
 *  one-line transform `render-web.mjs`'s own `inlineable` applies to the skill's script, and
 *  `web-income-life-expectancy/render-web.mjs` applies to its own. */
function inlineable(moduleSource) {
  return moduleSource.replace(/^export /gm, "");
}

/** CSS appended after the skill's own generic stylesheet — the skill's generic `.pt`/`.hit-area`
 *  rules never match anything this beat draws (this beat's class is `.row-hit`, not `.pt`), so
 *  every rule this genre needs for its own interactive element is stated here, not inherited. Fill
 *  stays transparent always — see `SwissAgePyramidWeb.tsx`'s own doc-comment: a hover fill would
 *  paint OVER the bars and the band label the row-hit rect sits on top of (needed there for full
 *  pointer coverage). A stroke outline framing the whole row highlights it without hiding anything
 *  underneath. */
const EXTRA_CSS = `
.row-hit { cursor: pointer; }
.row-hit:hover, .row-hit:focus, .row-hit.row-active {
  stroke: var(--ink);
  stroke-width: 1.5px;
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
  const ownScript = await readFile(join(HERE, "pyramid-interaction.mjs"), "utf8");
  html = html.replace(scriptBlockRe, `<script>\n${inlineable(ownScript)}\n</script>`);

  if (!html.includes("</head>"))
    throw new Error("expected a </head> to append this beat's own CSS override before");
  html = html.replace("</head>", `<style>\n${EXTRA_CSS}\n</style>\n</head>`);

  await writeFile(outPath, html);
}

export async function render({ dataPath, outDir, name = OUTPUT_NAME }) {
  const csv = await readFile(dataPath, "utf8");
  const rows = parseCsv(csv);
  console.log(`read ${rows.length} rows from data.csv`);
  if (rows.length < 3)
    throw new Error(`need at least three age bands, got ${rows.length}`);

  const bands = rows.map((r) => ({
    ageBand: r.age_band,
    male: Number(r.male),
    female: Number(r.female),
  }));

  // Find the true peak band by total (male + female) — checked here, not guessed, so the callout
  // and the tooltip both name the band the data actually supports.
  const withTotal = bands.map((b) => ({ ...b, total: b.male + b.female }));
  const peak = withTotal.reduce((a, b) => (b.total > a.total ? b : a));
  console.table(
    withTotal.map((b) => ({ band: b.ageBand, male: b.male, female: b.female, total: b.total })),
  );
  console.log(`peak band: ${peak.ageBand} (${peak.total.toLocaleString()})`);
  const youngest = withTotal[0];
  console.log(
    `youngest band (0-4): ${youngest.total.toLocaleString()} — ${
      youngest.total < peak.total ? "smaller" : "larger"
    } than the peak`,
  );
  const totalPop = withTotal.reduce((s, b) => s + b.total, 0);
  console.log(`sum of bands: ${totalPop.toLocaleString()}`);

  const { outPath } = await renderWeb({
    component: SwissAgePyramidWeb,
    layouts: LAYOUTS,
    props: {
      bands,
      title: `Switzerland's population bulges at ages ${peak.ageBand}, not among the youngest`,
      limits:
        "Age bands run in their natural sequence, oldest at top — sorting by population size would destroy the shape this chart exists to show. Hover, tap or focus any band for its exact figures.",
      source:
        "Source: UN, World Population Prospects (2024), via Our World in Data · 2023 data, extracted 8 August 2026",
      alt: `Population pyramid of Switzerland by age and sex, 2023. The widest band is ${peak.ageBand} at ${peak.total.toLocaleString()} people, not the youngest band: 0-4 year-olds total ${youngest.total.toLocaleString()}, well under half the peak band's width. Women outnumber men in every band from the mid-60s upward. Every band's exact figures for both sexes are reachable by hover, tap or keyboard focus.`,
      ground: "#FFFFFF",
      accent: NOMINAL_ACCENT,
      peakBand: peak.ageBand,
      peakLabel: `${peak.ageBand}: the widest band (${peak.total.toLocaleString()})`,
    },
    outDir,
    name,
  });

  await patchForThisBeat(outPath);

  return { outPath, bands: bands.length, peakBand: peak.ageBand, peakTotal: peak.total };
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

  const { outPath, bands, peakBand, peakTotal } = await render({ dataPath, outDir });
  console.log(
    `web beat → ${outPath}  [${bands} age bands, peak ${peakBand} = ${peakTotal.toLocaleString()}]`,
  );
}
