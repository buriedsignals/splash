// twin/proof/web-income-life-expectancy/render-web.mjs
//
// This beat's own WEB runner — the same shape `../co2-suisse/render-web.mjs` has: the story's own
// constants, its own CSV reader, its own component, handed to the genre's generic machinery. It
// lives here, beside the story, not inside `skills/chart-web/scripts/render-web.mjs`, for the
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
import { readPalette } from "#shared/chart-beat/render-still.mjs";
import { renderWeb } from "../../skills/chart-web/scripts/render-web.mjs";
import { IncomeLifeExpectancyWeb, FRAME } from "./IncomeLifeExpectancyWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));

/** Central African Republic's 2022 row — excluded per `BRIEF.md`'s data-quality flag: OWID's own
 *  published series shows life expectancy swinging 40.3 (2021) → 18.8 (2022) → 57.4 (2023), a
 *  three-year pattern this beat's own brief judges to be a modelling artifact, not a real one-year
 *  shock. Left undrawn and unlabelled, never picked as a named outlier. */
const EXCLUDED_CODE = "CAF";

/** The story's own constants — the journalist's words, from `BRIEF.md`. */
export const BEAT = {
  // The two colours this beat is drawn in are NOT here. They are recorded in `PALETTE.md` beside
  // this file and read back by `readPalette` in `render` below — a hex typed here is a colour the
  // newsroom's own recorded answer can never reach.
  title:
    "Among the world's richest economies, the United States has one of the lowest life expectancies — years behind income-peer Switzerland.",
  subtitle:
    "Cuba, at roughly an eighth of either country's income, comes within a few years of both.",
  // The source line is NOT here either, and for the same reason the alt is not. It used to read
  // "UN World Population Prospects (2024) & World Bank" — and the World Bank publishes NEITHER of
  // the two GDP figures the headline leans on. Checked against the World Bank's own API on
  // 2026-08-09: `NY.GDP.PCAP.PP.KD` returns `null` for Cuba in every year 2018–2022, and Taiwan
  // (also plotted, at $53,143) is not a World Bank reporting economy at all. The x axis in this
  // beat is OWID's Maddison Project Database column, as `owid-metadata.json` frozen beside this
  // script says in its own words. Crediting an institution that does not publish the figure is
  // this project's own worst class of claim — a reader who goes to check finds nothing there — so
  // the credit is now BUILT from that frozen metadata by `creditFrom` below.
  // The alt text is NOT here. It states how many countries were plotted, which year they are, and
  // the income and life expectancy of each of the three named points — every one of them a value
  // in `data.csv`, so every one of them is read out of it in `describeNamedPoints` below rather
  // than typed here where a re-export could move the points and leave the sentence behind.
};

/** The three points this beat names, and the only ones it labels. `IncomeLifeExpectancyWeb` throws
 *  if the plotted data does not contain exactly these three. */
const NAMED_CODES = ["CHE", "USA", "CUB"];

const DEFAULT_DATA_PATH = join(HERE, "data.csv");
// The provider's own metadata for the grapher `data.csv` came from, frozen beside it on 2026-08-09
// (`dateDownloaded` is inside the file). The credit is BUILT from this, never typed — see
// `creditFrom` below.
const DEFAULT_METADATA_PATH = join(HERE, "owid-metadata.json");
// And the OUTPUT defaults beside the beat too — where this beat's html is actually committed. It
// used to default to a scratch directory, so running this script the obvious way produced a fresh
// file nobody looks at, printed a path, exited zero, and left the committed one stale.
const DEFAULT_OUT_DIR = HERE;
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
  // The filter's own column. It is read here, beside the two the geometry needs, rather than
  // second-guessed later: `regionOf` below turns it into the beat's declaration, and nothing else
  // in this file knows what a region is.
  const regionAt = columns.indexOf("World region according to OWID");
  if ([entityAt, codeAt, lifeAt, gdpAt, regionAt].some((i) => i < 0))
    throw new Error(
      `csv is missing one of Entity / Code / Life expectancy at birth / GDP per capita / World region according to OWID, got: ${header}`,
    );

  return lines
    .map((row) => row.split(","))
    .filter((cells) => cells[codeAt] !== EXCLUDED_CODE)
    .map((cells) => ({
      country: cells[entityAt],
      code: cells[codeAt],
      gdp: Number(cells[gdpAt]),
      lifeExpectancy: Number(cells[lifeAt]),
      region: cells[regionAt],
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
 *  `chart-web/scripts/render-web.mjs`'s own `inlineable` applies to the skill's script, so this
 *  beat's own `scatter-interaction.mjs` (authored as an ES module for readability, and so
 *  `nearestPointIndex` can be imported and read directly) can also run as a plain classic
 *  `<script>` — no `type="module"`, so it keeps working in a CMS iframe or sandboxed embed that
 *  restricts module scripts, exactly like the skill's own copy. */
function inlineable(moduleSource) {
  return moduleSource.replace(/^export /gm, "");
}

/** CSS appended after the skill's own generic stylesheet. Every rule here exists because this
 *  beat's dots are HTML elements laid over the geometry rather than SVG circles inside it — the
 *  fluid frame stretches its `viewBox`, and a stretched circle is an ellipse
 *  (`IncomeLifeExpectancyWeb.tsx`'s own doc-comment carries the reasoning). So: the dot is
 *  positioned and rounded here, hover/focus draws a RING around it rather than swapping a fill the
 *  skill's own `.pt:hover { fill: ... }` rule cannot touch on an HTML element, and the named points
 *  keep their accent through every state — the scatter doctrine's rule that the accent stays
 *  reserved for the subject, interaction or not. The two axis titles and the three point labels are
 *  words, so they are typed at a fixed pixel size here too. */
const EXTRA_CSS = `
.pt {
  position: absolute;
  display: block;
  border-radius: 50%;
  transform: translate(-50%, -50%);
}
.pt.pt-active, .pt:focus {
  box-shadow: 0 0 0 2px var(--ground), 0 0 0 4px var(--ink);
}
.pt:focus-visible { outline: 2px solid var(--ink); outline-offset: 3px; }
.point-label {
  position: absolute;
  font-size: var(--label-size);
  font-weight: var(--label-weight);
  color: var(--ink);
  background: var(--ground);
  padding: 0 3px;
  border-radius: 2px;
  white-space: nowrap;
  transform: translateY(-50%);
}
.point-label.anchor-middle { transform: translate(-50%, -50%); }
.point-label.anchor-end { transform: translate(-100%, -50%); }
.axis-title {
  margin: 0;
  flex: 0 0 auto;
  font-size: var(--axis-title-size);
  color: var(--muted);
}
.y-axis-title { margin-bottom: 8px; }
.x-axis-title { text-align: center; margin-top: 2px; }
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

/**
 * Writes the alt text from the plotted rows: the count, the reference year the file itself carries,
 * and each named point's own income and life expectancy. The two comparisons the sentence makes —
 * the life-expectancy gap between the two rich peers, and Cuba's income as a fraction of the United
 * States' — are computed here too, and the eighth is ASSERTED because the word "eighth" cannot
 * carry an interpolation.
 */
/** The one year this beat plots, read off the frozen file — the alt states it and the credit dates
 *  itself by it, and neither may drift from the other. */
export function referenceYear(csv) {
  const years = [
    ...new Set(
      csv
        .trim()
        .split(/\r?\n/)
        .slice(1)
        .map((l) => l.split(",")[2]),
    ),
  ];
  if (years.length !== 1)
    throw new Error(`expected one reference year in data.csv, got ${years.join(", ")}`);
  return years[0];
}

export function describeNamedPoints(data, csv) {
  const year = referenceYear(csv);

  const at = (code) => {
    const row = data.find((r) => r.code === code);
    if (!row) throw new Error(`data.csv carries no row for ${code}, which this beat names`);
    return row;
  };
  const [rich, peer, poor] = NAMED_CODES.map(at);
  const usd = (v) => `$${(Math.round(v / 100) * 100).toLocaleString("en-US")}`;
  const years1 = (v) => v.toFixed(1);
  const gap = rich.lifeExpectancy - peer.lifeExpectancy;
  const incomeRatio = peer.gdp / poor.gdp;
  if (Math.round(incomeRatio) !== 8)
    throw new Error(
      `the alt and the subtitle say "roughly an eighth", but ${peer.country} (${peer.gdp}) / ${poor.country} (${poor.gdp}) = ${incomeRatio.toFixed(2)}`,
    );

  return (
    `Scatter plot of GDP per capita, log scale, against life expectancy at birth, for ${data.length} ` +
    `countries in ${year}. ${rich.country} (about ${usd(rich.gdp)} GDP per capita, ` +
    `${years1(rich.lifeExpectancy)} years) and the ${peer.country} (about ${usd(peer.gdp)}, ` +
    `${years1(peer.lifeExpectancy)} years) are highlighted: despite similar income, the ` +
    `${peer.country} trails ${rich.country} by about ${Math.round(gap)} years. ${poor.country} ` +
    `(about ${usd(poor.gdp)}, ${years1(poor.lifeExpectancy)} years) is also highlighted, nearly ` +
    `matching the ${peer.country}' life expectancy at roughly an eighth of its income. Most other ` +
    `countries form a rising cloud in which higher income tends to come with longer life ` +
    `expectancy, with these three points as the notable exceptions.`
  );
}

/**
 * The credit, built from the provider's OWN metadata for the two columns this chart draws — frozen
 * beside the beat as `owid-metadata.json`, exactly as `data.csv` is, so the sentence and the file
 * that justifies it travel together and a reader can check one against the other.
 *
 * Two columns, two different answers, and the reason this is not one hand-typed line:
 *
 *   - The X AXIS is OWID's `GDP per capita` column, whose own `citationShort` reads "Bolt and van
 *     Zanden – Maddison Project Database 2023". The World Bank appears nowhere in it, which is why
 *     the old credit could name an institution that publishes neither Cuba's $7,649 nor Taiwan's
 *     $53,143 — both plotted, and Cuba one of the three points the headline rests on.
 *   - The Y AXIS is a long-run splice of four producers, and crediting all four for a single-year
 *     2022 chart would be its own over-credit. OWID's own key description says which one supplies
 *     the modern era — "From 1950 onward, we use the [United Nations World Population Prospects
 *     (2024)]" — so the cut-over year is READ from that sentence and checked against the year the
 *     frozen data actually carries. If OWID ever re-splices, or this beat is re-pointed at a
 *     pre-1950 year, this throws instead of quietly crediting the wrong institution.
 */
export function creditFrom(metadata, year) {
  const column = (name) => {
    const found = metadata.columns?.[name];
    if (!found?.citationShort)
      throw new Error(
        `owid-metadata.json has no citationShort for "${name}" — re-freeze it from the grapher's ` +
          "own .metadata.json before shipping a credit built from it.",
      );
    return found;
  };

  const gdp = column("GDP per capita");
  // "Bolt and van Zanden – Maddison Project Database 2023 – with minor processing by …"
  const [gdpProducer, gdpDataset] = gdp.citationShort.split(" – ");
  if (!gdpProducer || !gdpDataset)
    throw new Error(`cannot read a producer and a dataset out of: ${gdp.citationShort}`);

  const life = column("Period life expectancy at birth");
  const era = String(life.descriptionKey).match(
    /From (\d{4}) onward, we use the \[([^\]]+)\]/,
  );
  if (!era)
    throw new Error(
      "the life-expectancy column no longer states which producer covers the modern era — read " +
        "its descriptionKey and credit the one that covers this beat's year by hand-checked name.",
    );
  const [, from, lifeProducer] = era;
  if (Number(year) < Number(from))
    throw new Error(
      `this beat plots ${year}, before the ${from} cut-over at which OWID switches to ` +
        `${lifeProducer} — the credit would name the wrong producer.`,
    );

  return `Source: ${lifeProducer} & ${gdpDataset} (${gdpProducer}), via Our World in Data · ${year} data`;
}

/**
 * THIS BEAT DECLARES A FILTER, AND HERE IS WHY IT PASSES THE TEST MOST BEATS DO NOT.
 *
 * The test (`chart-web/references/web-discipline.md`, "Filters"): a filter earns its place only
 * when the study set has a natural, ORTHOGONAL dimension a reader would plausibly want to isolate,
 * with enough groups and enough data per group that narrowing to one is a genuinely different
 * reading rather than a smaller version of the same one.
 *
 * This beat is 164 countries in one cloud, and OWID ships its own world-region column beside the two
 * numbers plotted. The regions are orthogonal to both axes — neither income nor life expectancy is
 * derived from where a country is — and the narrowed readings are genuinely different pictures: the
 * European cluster sits in the top right corner of the plot as a tight knot, Africa spreads across
 * the whole left half at a lower life expectancy, and the Americas straddle both. A reader who
 * narrows to one is not looking at a sparser version of the same cloud; they are looking at a
 * different shape, which is the whole test.
 *
 * The claim the title makes is measured on the WHOLE cloud, which is why the unfiltered option is
 * the default and the only state the beat renders in with no interaction: the filter lets a reader
 * explore PAST the claim, never into it. Every narrowed state prints its own count against the 164
 * (`filterNotes`), so a partial view can never be mistaken for the total the title states.
 */
export function regionFilter(rows) {
  const regions = [...new Set(rows.map((r) => r.region).filter(Boolean))].sort();
  return {
    label: "Filter by region",
    allLabel: "All regions",
    unit: "countries",
    options: regions.map((region) => ({
      label: region,
      keys: rows.filter((r) => r.region === region).map((r) => r.code),
    })),
  };
}

export async function render({ dataPath, outDir, name = OUTPUT_NAME }) {
  const csv = await readFile(dataPath, "utf8");
  const data = rowsFromCsv(csv);
  if (data.length < 8)
    throw new Error(`need enough points for a cloud shape to read, got ${data.length}`);

  const alt = describeNamedPoints(data, csv);
  console.log(`alt: ${alt}`);

  const metadata = JSON.parse(await readFile(DEFAULT_METADATA_PATH, "utf8"));
  const source = creditFrom(metadata, referenceYear(csv));
  console.log(`source: ${source}`);

  const { ground, accent, origin, source: paletteSource } = readPalette(HERE, {
    stopAt: join(HERE, ".."),
  });
  console.log(
    `palette from ${paletteSource} — ground ${ground}, accent ${accent}, chosen by ${origin}`,
  );

  const { outPath } = await renderWeb({
    component: IncomeLifeExpectancyWeb,
    props: {
      data,
      frame: FRAME,
      title: BEAT.title,
      subtitle: BEAT.subtitle,
      source,
      alt,
      ground,
      accent,
      filter: regionFilter(data),
      filterKeys: data.map((r) => r.code),
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
