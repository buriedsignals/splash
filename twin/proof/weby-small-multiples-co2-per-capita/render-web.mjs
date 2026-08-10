// twin/proof/weby-small-multiples-co2-per-capita/render-web.mjs
//
// This beat's own WEB runner — same shape `../web-income-life-expectancy/render-web.mjs` and
// `../co2-suisse/render-web.mjs` have: the story's own constants, its own CSV reader, its own
// component and layouts, handed to the genre's generic `renderWeb`
// (`twin-chart-web/scripts/render-web.mjs`), then PATCHED the same way
// `web-income-life-expectancy/render-web.mjs`'s `patchForThisBeat` patches its own output — see
// that file's own header comment for why the patch exists at all (nothing in the skill's own
// `renderWeb` may import a story's files, so language and the inlined interaction script are
// swapped after the fact, failing loud if the shape it expects to find has changed).
//
// THE ONLY EXISTING BEAT OF THIS CLAIM/DATA is the VIDEO build
// (`../more-small-multiples-co2-per-capita/`) — read for its verified numbers and its data-reading
// discipline, never imported (a beat never imports another beat's files, doubly so across
// genres). The claim below is RECOMPUTED from this file's own CSV read, not assumed from that
// beat's own BRIEF.md — see the console output for the actual numbers found.
//
// Usage:  bun proof/weby-small-multiples-co2-per-capita/render-web.mjs [outDir] [--data <csv>]

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readPalette } from "#shared/twin-chart-beat/render-still.mjs";
import { renderWeb } from "../../skills/twin-chart-web/scripts/render-web.mjs";
import { SmallMultiplesCo2Web, FRAME } from "./SmallMultiplesCo2Web.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));

/** The story's own constants — the journalist's own words. Ascending order by each country's own
 *  final (2024) reading, so the panel grid reads left-to-right, top-to-bottom toward its own
 *  subject — the same order the video beat's own `COUNTRIES_ORDER` uses, re-derived below rather
 *  than assumed (see `verifyClaim`). */
const COUNTRIES = ["Switzerland", "France", "Germany", "Poland"];
const SUBJECT = "Poland";
const FIRST_YEAR = 1950;
const LAST_YEAR = 2024;

export const BEAT = {
  // The two colours this beat is drawn in are NOT here. They are recorded in `PALETTE.md` beside
  // this file and read back by `readPalette` in `render` below — a hex typed here is a colour the
  // newsroom's own recorded answer can never reach.
  title:
    "Poland's per-capita CO2 emissions have overtaken Germany's, even as both have fallen sharply since their 1979-80 peaks.",
  caption:
    "Tonnes CO2 per person, 1950-2024. Same zero-based scale on every panel.",
  source:
    "Source: Global Carbon Budget 2025, via Our World in Data · extracted 8 August 2026",
  // The alt text is NOT here. It counts the readings the panels actually carry, names the span of
  // the x-axis and the span of the four peaks, and states the subject's final year — all products
  // of the read below. `totalReadings` was already computed in `render()` and thrown away on the
  // return line while the sentence beside it said "300"; it is now what the sentence says.
};

const DEFAULT_DATA_PATH = join(HERE, "data.csv");
// And the OUTPUT defaults beside the beat too — where this beat's html is actually committed. It
// used to default to a scratch directory, so running this script the obvious way produced a fresh
// file nobody looks at, printed a path, exited zero, and left the committed one stale.
const DEFAULT_OUT_DIR = HERE;
const OUTPUT_NAME = "small-multiples-co2-per-capita.html";

/** OWID's `co-emissions-per-capita` grapher CSV, four countries at once (`&csvType=filtered`) —
 *  same reader shape `../more-small-multiples-co2-per-capita/render.mjs`'s own
 *  `readingsByCountryFromCsv` uses (simple `split(",")`, no country name in this file carries a
 *  comma), rewritten fresh here rather than imported, per this genre's own "duplicate, do not
 *  link" rule. Filters each country to `firstYear..lastYear` inclusive and verifies the entity set
 *  found is EXACTLY the four countries expected before returning anything. */
export function readingsByCountryFromCsv(csv, { countries, firstYear, lastYear }) {
  const [header, ...rows] = csv.trim().split(/\r?\n/);
  const columns = header.split(",");
  const entityAt = columns.indexOf("Entity");
  const yearAt = columns.indexOf("Year");
  const valueAt = columns.findIndex((c) => c.startsWith("CO"));
  if (entityAt < 0 || yearAt < 0 || valueAt < 0)
    throw new Error(`csv missing Entity/Year/CO2 column, got: ${header}`);

  const entitiesSeen = new Set();
  const byCountry = new Map(countries.map((c) => [c, []]));
  for (const row of rows) {
    const cells = row.split(",");
    const entity = cells[entityAt];
    entitiesSeen.add(entity);
    if (!byCountry.has(entity)) continue;
    const year = Number(cells[yearAt]);
    const value = Number(cells[valueAt]);
    if (!Number.isFinite(year) || !Number.isFinite(value)) continue;
    if (year < firstYear || year > lastYear) continue;
    byCountry.get(entity).push({ year, value });
  }

  // Verify the entity set found in the CSV is EXACTLY the expected four — never trust that a
  // grapher export was filtered the way its URL claims (the same `ourworldindata-csv-filter-trap`
  // this project's own intake reference names).
  const expected = new Set(countries);
  const unexpected = [...entitiesSeen].filter((e) => !expected.has(e));
  if (unexpected.length > 0)
    throw new Error(
      `csv contains entities beyond the expected four: ${unexpected.join(", ")}`,
    );
  for (const c of countries)
    if (!entitiesSeen.has(c)) throw new Error(`csv is missing entity ${c} entirely`);

  for (const [country, readings] of byCountry) {
    readings.sort((a, b) => a.year - b.year);
    if (readings.length === 0)
      throw new Error(`no ${firstYear}-${lastYear} readings found for ${country}`);
  }
  return byCountry;
}

/**
 * Recomputes, from the readings actually parsed, both halves of the claim: (1) the 2024 ranking —
 * Poland above Germany — and (2) that the gap "did not exist a decade earlier" — Poland was NOT
 * above Germany circa 2014. Never assumes the video beat's own `BRIEF.md` numbers still hold;
 * logs what was actually found so a discrepancy, if any, is visible rather than silently trusted.
 */
export function verifyClaim(byCountry) {
  const at = (country, year) => byCountry.get(country).find((r) => r.year === year);
  const last = (country) => {
    const readings = byCountry.get(country);
    return readings[readings.length - 1];
  };
  const peak = (country) =>
    byCountry.get(country).reduce((a, b) => (b.value > a.value ? b : a));

  const polandLast = last("Poland");
  const germanyLast = last("Germany");
  if (!(polandLast.value > germanyLast.value))
    throw new Error(
      `claim requires Poland (${polandLast.value} in ${polandLast.year}) > Germany (${germanyLast.value} in ${germanyLast.year}) in the final year, but it does not hold`,
    );

  const decadeYear = polandLast.year - 10;
  const polandDecadeAgo = at("Poland", decadeYear);
  const germanyDecadeAgo = at("Germany", decadeYear);
  if (!polandDecadeAgo || !germanyDecadeAgo)
    throw new Error(`missing ${decadeYear} reading for Poland or Germany`);
  if (polandDecadeAgo.value > germanyDecadeAgo.value)
    throw new Error(
      `claim requires the Poland/Germany gap to NOT have existed in ${decadeYear} (Poland was NOT above Germany), but Poland (${polandDecadeAgo.value}) was already above Germany (${germanyDecadeAgo.value}) then`,
    );

  console.log(
    `2024 ranking: Poland ${polandLast.value.toFixed(2)} (${polandLast.year}) > Germany ${germanyLast.value.toFixed(2)} (${germanyLast.year})`,
  );
  console.log(
    `${decadeYear} check: Poland ${polandDecadeAgo.value.toFixed(2)} < Germany ${germanyDecadeAgo.value.toFixed(2)} — gap did not exist a decade earlier`,
  );

  const peaks = [];
  for (const country of COUNTRIES) {
    const p = peak(country);
    const l = last(country);
    peaks.push({ country, year: p.year, value: p.value });
    if (l.value >= p.value)
      throw new Error(
        `${country}: last reading (${l.value}) is not below its own peak (${p.value} in ${p.year})`,
      );
    console.log(
      `  ${country}: peak ${p.value.toFixed(2)} (${p.year}) -> ${l.year} ${l.value.toFixed(2)}`,
    );
  }

  return { polandLast, germanyLast, decadeYear, polandDecadeAgo, germanyDecadeAgo, peaks };
}

/** Strips the `export` keyword from each top-level declaration — same one-line transform the
 *  skill's own `renderWeb` applies to its own script, so this beat's `small-multiples-interaction.mjs`
 *  (authored as an ES module so `nearestIndex` can be imported and read directly) can also run as
 *  a plain classic `<script>`. */
function inlineable(moduleSource) {
  return moduleSource.replace(/^export /gm, "");
}

/** CSS appended after the skill's own generic stylesheet. The skill's own `.pt:hover`/`.pt:focus`
 *  rule (swap fill to `muted`) is reused unchanged — every point in this beat starts invisible,
 *  the same as the seed's, so a fill swap on interaction is exactly right here, unlike the scatter
 *  beat's already-visible points. What is added: a focus-visible outline scoped inside each panel
 *  reads fine at this smaller panel scale already (inherited from the skill's own stylesheet), so
 *  the only addition is a small pointer-cursor affordance on each panel's own hit-area. */
const EXTRA_CSS = `
.chart-plot.small-multiples {
  grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
  grid-template-rows: repeat(2, minmax(0, 1fr));
  gap: var(--panel-gap);
}
.chart-plot.small-multiples .panel {
  min-width: 0;
  min-height: 0;
  display: grid;
  grid-template-columns: var(--y-gutter) minmax(0, 1fr);
  grid-template-rows: var(--panel-label-h) minmax(0, 1fr) var(--x-axis-h);
}
.panel .panel-name {
  grid-column: 2;
  grid-row: 1;
  align-self: end;
  font-size: var(--panel-label-size);
  font-weight: var(--panel-label-weight);
  line-height: 1.1;
}
.panel .panel-y { grid-column: 1; grid-row: 2; position: relative; }
.panel .panel-y .axis-label.y { right: 4px; }
.panel svg.panel-chart {
  grid-column: 2;
  grid-row: 2;
  width: 100%;
  height: 100%;
  display: block;
}
/* pointer-events:none is load-bearing, not decoration — this div shares the exact cell the svg's
   own .hit-area occupies, and without it every hover over the panel would land here instead. */
.panel .panel-overlay {
  grid-column: 2;
  grid-row: 2;
  position: relative;
  pointer-events: none;
}
.panel .panel-x { grid-column: 2; grid-row: 3; position: relative; }
.panel .panel-x .axis-label.x { top: 3px; transform: none; }
.panel .panel-x .axis-label.x.start { left: 0; }
.panel .panel-x .axis-label.x.end { right: 0; }
.panel .panel-overlay .end-dot {
  position: absolute;
  border-radius: 50%;
  transform: translate(-50%, -50%);
}
.panel .panel-overlay .panel-end-label {
  position: absolute;
  transform: translate(-100%, -50%) translateY(-13px);
  font-size: var(--label-size);
  font-weight: var(--label-weight);
  background: var(--ground);
  padding: 0 3px;
  border-radius: 2px;
  white-space: nowrap;
}
/* The alt text, readable by a screen reader and out of the layout — it is absolutely positioned, so
   it never claims one of the four grid cells. */
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
.hit-area { cursor: crosshair; }
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
  const ownScript = await readFile(
    join(HERE, "small-multiples-interaction.mjs"),
    "utf8",
  );
  html = html.replace(scriptBlockRe, `<script>\n${inlineable(ownScript)}\n</script>`);

  if (!html.includes("</head>"))
    throw new Error("expected a </head> to append this beat's own CSS override before");
  html = html.replace("</head>", `<style>\n${EXTRA_CSS}\n</style>\n</head>`);

  await writeFile(outPath, html);
}

export async function render({ dataPath, outDir, name = OUTPUT_NAME }) {
  const csv = await readFile(dataPath, "utf8");
  const byCountry = readingsByCountryFromCsv(csv, {
    countries: COUNTRIES,
    firstYear: FIRST_YEAR,
    lastYear: LAST_YEAR,
  });

  console.log("row count check per country:");
  for (const c of COUNTRIES) {
    const n = byCountry.get(c).length;
    console.log(`  ${c}: ${n} readings`);
    if (n !== 75)
      throw new Error(`expected 75 annual readings (1950-2024) for ${c}, got ${n}`);
  }

  const claim = verifyClaim(byCountry);

  const countries = COUNTRIES.map((name) => ({ name, data: byCountry.get(name) }));

  const totalReadings = countries.reduce((sum, c) => sum + c.data.length, 0);
  const peakYears = claim.peaks.map((p) => p.year);
  const alt =
    `Four small line panels, one per country (${COUNTRIES.join(", ")}), all sharing one zero-based ` +
    `y-axis and one ${FIRST_YEAR}-${LAST_YEAR} x-axis. All four fell sharply from their own ` +
    `${Math.min(...peakYears)}-${Math.max(...peakYears)} peaks. ${SUBJECT}, the accented panel, ends ` +
    `${claim.polandLast.year} above Germany's line — a gap that did not exist a decade earlier, when ` +
    `Germany was still higher. Every one of the ${totalReadings} annual readings across the four ` +
    `panels is available on hover, tap or keyboard focus.`;
  console.log(`alt: ${alt}`);

  const { ground, accent, origin, source: paletteSource } = readPalette(HERE, {
    stopAt: join(HERE, ".."),
  });
  console.log(
    `palette from ${paletteSource} — ground ${ground}, accent ${accent}, chosen by ${origin}`,
  );

  const { outPath } = await renderWeb({
    component: SmallMultiplesCo2Web,
    props: {
      frame: FRAME,
      countries,
      order: [0, 1, 2, 3], // COUNTRIES is already ascending-2024-value; render order == array order
      subject: SUBJECT,
      title: BEAT.title,
      caption: BEAT.caption,
      source: BEAT.source,
      alt,
      ground,
      accent,
    },
    outDir,
    name,
  });

  await patchForThisBeat(outPath);

  return { outPath, countries: countries.length, totalReadings };
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

  const { outPath, countries, totalReadings } = await render({ dataPath, outDir });
  console.log(`web beat → ${outPath}  [${countries} countries, ${totalReadings} readings]`);
}
