// twin/proof/web-income-life-expectancy/render-web.mjs
//
// This beat's own WEB runner — the same shape `../co2-suisse/render-web.mjs` has: the story's own
// constants, its own CSV reader, its own component, handed to the genre's generic machinery. It
// lives here, beside the story, not inside `skills/twin-chart-web/scripts/render-web.mjs`, for the
// exact reason that file's own header explains: a skill directory that imports a story workspace
// does not build once copied, on its own, into a journalist's root.
//
// ONE deliberate departure from the CO₂ runner's shape: after calling the skill's generic
// `renderWeb`, this file PATCHES the HTML it wrote, in two ways —
//
//   1. `<html lang="fr">` → `<html lang="en">`. `renderWeb`'s own HTML shell hard-codes `lang="fr"`
//      (baked in for the CO₂ beat's French words, its only real caller so far). This beat's words
//      are English throughout (`BRIEF.md`); leaving the French tag would misdeclare the page's
//      language to assistive tech and translators for no reason connected to this story.
//   2. The inlined interaction script is swapped for this directory's OWN
//      `scatter-interaction.mjs`, and a small CSS override is appended. Both exist because a
//      scatter's "nearest point" is a genuinely different problem from a line's: the skill's own
//      `assets/interaction.mjs` resolves hover/tap by x-coordinate ALONE (correct for a line, where
//      x is unique per reading and y carries the value), which silently picks the wrong country the
//      moment two points share a similar GDP but differ in life expectancy — exactly the shape of
//      this dataset (Switzerland and the United States sit ~6px apart in x, ~50px apart in y). The
//      skill's `renderWeb` has no parameter to swap which interaction script it inlines (by design —
//      see its own header comment: nothing in that file may import a story's own files), so this
//      runner still calls it for what it DOES generalise (SSR both layouts, derive the furniture,
//      build the HTML shell, write the file) and then patches the one piece that doesn't. Both
//      substitutions fail loud if the shape they expect to find has changed, rather than silently
//      leaving the wrong script or the wrong language tag in place.
//
// Usage:  bun proof/web-income-life-expectancy/render-web.mjs [outDir] [--data <csv>]

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderWeb } from "../../skills/twin-chart-web/scripts/render-web.mjs";
import { IncomeLifeExpectancyWeb, LAYOUTS } from "./IncomeLifeExpectancyWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));

/** Central African Republic's 2022 row — excluded per `BRIEF.md`'s data-quality flag: OWID's own
 *  published series shows life expectancy swinging 40.3 (2021) → 18.8 (2022) → 57.4 (2023), a
 *  three-year pattern this beat's own brief judges to be a modelling artifact, not a real one-year
 *  shock. Left undrawn and unlabelled, never picked as a named outlier. */
const EXCLUDED_CODE = "CAF";

/** The story's own constants — the journalist's words, from `BRIEF.md`. */
export const BEAT = {
  ground: "#FFFFFF",
  accent: "#C1440E",
  title:
    "Among the world's richest economies, the United States has one of the lowest life expectancies — years behind income-peer Switzerland.",
  subtitle:
    "Cuba, at roughly an eighth of either country's income, comes within a few years of both.",
  source:
    "Source: UN World Population Prospects (2024) & World Bank, via Our World in Data · 2022 data",
  alt: "Scatter plot of GDP per capita, log scale, against life expectancy at birth, for 164 countries in 2022. Switzerland (about $63,300 GDP per capita, 83.2 years) and the United States (about $58,500, 78.0 years) are highlighted: despite similar income, the United States trails Switzerland by about five years. Cuba (about $7,600, 77.6 years) is also highlighted, nearly matching the United States' life expectancy at roughly an eighth of its income. Most other countries form a rising cloud in which higher income tends to come with longer life expectancy, with these three points as the notable exceptions.",
};

const DEFAULT_DATA_PATH = join(HERE, "data.csv");
const DEFAULT_OUT_DIR = "/tmp/web-twin";
const OUTPUT_NAME = "income-life-expectancy.html";

/**
 * Simple `split(",")` — not RFC4180-quoted, which is fine for this file's own columns: no country
 * name in this dataset carries a comma (`Cote d'Ivoire`'s apostrophe is not a delimiter). Excludes
 * Central African Republic's 2022 row (see `EXCLUDED_CODE` above) and any row missing a finite
 * GDP/life-expectancy reading.
 */
export function rowsFromCsv(csv) {
  const [header, ...lines] = csv.trim().split(/\r?\n/);
  const columns = header.split(",");
  const entityAt = columns.indexOf("Entity");
  const codeAt = columns.indexOf("Code");
  const lifeAt = columns.indexOf("Life expectancy at birth");
  const gdpAt = columns.indexOf("GDP per capita");
  if ([entityAt, codeAt, lifeAt, gdpAt].some((i) => i < 0))
    throw new Error(
      `csv is missing one of Entity / Code / Life expectancy at birth / GDP per capita, got: ${header}`,
    );

  return lines
    .map((row) => row.split(","))
    .filter((cells) => cells[codeAt] !== EXCLUDED_CODE)
    .map((cells) => ({
      country: cells[entityAt],
      code: cells[codeAt],
      gdp: Number(cells[gdpAt]),
      lifeExpectancy: Number(cells[lifeAt]),
    }))
    .filter(
      (r) =>
        r.country &&
        r.code &&
        Number.isFinite(r.gdp) &&
        r.gdp > 0 &&
        Number.isFinite(r.lifeExpectancy),
    )
    .sort((a, b) => a.country.localeCompare(b.country));
}

/** Strips the `export` keyword from each top-level declaration — the same one-line transform
 *  `twin-chart-web/scripts/render-web.mjs`'s own `inlineable` applies to the skill's script, so this
 *  beat's own `scatter-interaction.mjs` (authored as an ES module for readability, and so
 *  `nearestPointIndex` can be imported and read directly) can also run as a plain classic
 *  `<script>` — no `type="module"`, so it keeps working in a CMS iframe or sandboxed embed that
 *  restricts module scripts, exactly like the skill's own copy. */
function inlineable(moduleSource) {
  return moduleSource.replace(/^export /gm, "");
}

/** CSS appended after the skill's own generic stylesheet — see this file's header comment, item 2,
 *  for why a fill-swap-on-hover (the skill's own `.pt:hover { fill: var(--muted) }` rule) does
 *  nothing visible on a point that is already drawn in a real colour. `.pt-named` gets its own,
 *  higher-specificity rule so a named point's accent fill survives hover/focus/tap — the scatter
 *  doctrine's own rule that the accent stays reserved for the subject, interaction or not. */
const EXTRA_CSS = `
.pt { stroke: none; }
.pt:hover, .pt:focus, .pt-active {
  stroke: var(--ink);
  stroke-width: 1.5px;
}
.pt.pt-named:hover, .pt.pt-named:focus, .pt.pt-named.pt-active {
  fill: var(--accent);
  stroke: var(--ink);
  stroke-width: 2px;
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
  const ownScript = await readFile(join(HERE, "scatter-interaction.mjs"), "utf8");
  html = html.replace(scriptBlockRe, `<script>\n${inlineable(ownScript)}\n</script>`);

  if (!html.includes("</head>"))
    throw new Error("expected a </head> to append this beat's own CSS override before");
  html = html.replace("</head>", `<style>\n${EXTRA_CSS}\n</style>\n</head>`);

  await writeFile(outPath, html);
}

export async function render({ dataPath, outDir, name = OUTPUT_NAME }) {
  const csv = await readFile(dataPath, "utf8");
  const data = rowsFromCsv(csv);
  if (data.length < 8)
    throw new Error(`need enough points for a cloud shape to read, got ${data.length}`);

  const { outPath } = await renderWeb({
    component: IncomeLifeExpectancyWeb,
    layouts: LAYOUTS,
    props: {
      data,
      title: BEAT.title,
      subtitle: BEAT.subtitle,
      source: BEAT.source,
      alt: BEAT.alt,
      ground: BEAT.ground,
      accent: BEAT.accent,
    },
    outDir,
    name,
  });

  await patchForThisBeat(outPath);

  return { outPath, points: data.length };
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

  const { outPath, points } = await render({ dataPath, outDir });
  console.log(`web beat → ${outPath}  [${points} points]`);
}
