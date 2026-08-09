// twin/proof/web-co2-decline-slope/render-web.mjs
//
// This beat's own WEB runner — the same shape `proof/co2-suisse/render-web.mjs` has: the story's
// own constants, its own data reader, its own component, handed to the genre's generic machinery.
// It lives here, beside the story, never inside the skill (`twin-chart-web/SKILL.md`, "Why
// `render-web.mjs` does not import a story's layouts" gives the reasoning this file also follows).
//
// One departure from the co2-suisse runner's own shape: after the skill's generic `renderWeb` has
// written the self-contained HTML file (SVGs, CSS, the shared `assets/interaction.mjs` inlined),
// this runner reads that file back and appends a SECOND inlined `<script>` — this beat's own
// `slope-interaction.mjs` — because the shared script's nearest-point-by-X hit area cannot
// discriminate between the ten same-column points a slope chart draws (see
// `slope-interaction.mjs`'s own header note for the full reasoning). The shared script still runs
// first and still does real work (keyboard focus/blur/arrow-key wiring on every `.pt`); this one
// only adds direct mouse/touch hover per point. Nothing about the skill's own `renderWeb` is
// modified — it is a story reading its own output back, not the skill reaching into a story.
//
// Usage:  bun proof/web-co2-decline-slope/render-web.mjs [outDir] [--data <csv>]

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderWeb } from "../../skills/twin-chart-web/scripts/render-web.mjs";
import { SlopeWeb, FRAME } from "./SlopeWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));

/** The ten countries this beat draws, in the order `BRIEF.md`'s own verified table states them —
 *  Germany first, the subject; the rest follow. Frozen list, not derived from the CSV's own
 *  contents, so a stray extra entity in a re-fetched file can never silently grow or shrink this
 *  beat's own ten. */
const COUNTRIES = [
  "Germany",
  "United Kingdom",
  "Sweden",
  "Switzerland",
  "France",
  "Poland",
  "Italy",
  "Austria",
  "Norway",
  "Spain",
];

/** The story's own constants — the journalist's words, from `BRIEF.md`. */
export const BEAT = {
  countries: COUNTRIES,
  highlighted: "Germany",
  ground: "#FFFFFF",
  accent: "#0B7A75",
  title:
    "Germany cut per-capita CO₂ emissions further than any other Western European country's since 1990",
  limits:
    "Tonnes of CO₂ per capita, territorial emissions. All ten countries fell between 1990 and 2024 — Germany's fall was the largest, ahead of the United Kingdom's widely discussed decarbonisation.",
  source:
    "Source: Global Carbon Budget (2025), via Our World in Data · 1990 & 2024 data",
  alt: "A slope chart comparing per-capita CO2 emissions in 1990 and 2024 across ten Western European countries. All ten fell. Germany fell furthest, from 13.23 to 6.77 tonnes per capita, a drop of 6.46 — more than the United Kingdom's fall from 10.49 to 4.53, a drop of 5.97. The other eight also fell, each by between 1.27 and 3.12 tonnes: Sweden 6.71 to 3.59, Switzerland 6.58 to 3.59, France 6.93 to 3.97, Poland 9.89 to 7.08, Italy 7.68 to 5.09, Austria 8.10 to 6.18, Norway 8.25 to 6.67, Spain 5.87 to 4.60.",
  periodLabels: { p1990: "1990", p2024: "2024" },
};

const DEFAULT_DATA_PATH = join(HERE, "data.csv");
const DEFAULT_OUT_DIR = "/tmp/web-twin";
const OUTPUT_NAME = "co2-decline-slope.html";

/**
 * The frozen OWID multi-country series, filtered at render time to exactly the 1990 and 2024 rows
 * for this beat's own ten countries (`BRIEF.md`: "the beat draws only the 1990 and 2024 rows per
 * country — filter at render time"). Simple `split(",")` — not RFC4180-quoted, which is fine here:
 * no entity name in this dataset carries a comma.
 */
export function countriesFromCsv(csv, { countries }) {
  const [header, ...rows] = csv.trim().split(/\r?\n/);
  const columns = header.split(",");
  const entityAt = columns.indexOf("Entity");
  const yearAt = columns.indexOf("Year");
  const valueAt = columns.findIndex((c) => c.startsWith("CO"));
  if (entityAt < 0 || yearAt < 0 || valueAt < 0)
    throw new Error(
      `csv has no Entity / Year / CO₂ emissions column, got: ${header}`,
    );

  const wanted = new Set(countries);
  const byEntity = new Map();
  for (const row of rows) {
    const cells = row.split(",");
    const entity = cells[entityAt];
    if (!wanted.has(entity)) continue;
    const year = Number(cells[yearAt]);
    if (year !== 1990 && year !== 2024) continue;
    const value = Number(cells[valueAt]);
    if (!Number.isFinite(value)) continue;
    const rec = byEntity.get(entity) ?? {};
    if (year === 1990) rec.v1990 = value;
    else rec.v2024 = value;
    byEntity.set(entity, rec);
  }

  return countries.map((name) => {
    const rec = byEntity.get(name);
    if (!rec || rec.v1990 === undefined || rec.v2024 === undefined)
      throw new Error(`missing 1990/2024 reading for ${name} in data.csv`);
    return { name, v1990: rec.v1990, v2024: rec.v2024 };
  });
}

/** Strips `export` the same way the skill's own `renderWeb` does for `assets/interaction.mjs` — so
 *  this beat's own script also runs as a plain classic `<script>`, no bundler, no module scope. */
function inlineable(moduleSource) {
  return moduleSource.replace(/^export /gm, "");
}

/** This beat's own rules, appended after the genre's shared stylesheet — the shared sheet is
 *  generic and stays that way; what a slopegraph needs on top of it lives here, beside the story.
 *
 *   1. A THIRD GRID COLUMN. The genre's grid is `[y-gutter] [plot]`; a slopegraph labels BOTH ends,
 *      so it is `[left labels] [plot] [right labels]`. Both label tracks are a fixed pixel width
 *      measured from the real strings (`SlopeWeb.tsx`'s `gutterPx`), so the plot — and only the
 *      plot — absorbs a wider or a narrower container.
 *   2. A MEASURED `min-height`. Ten label blocks down each side need a real number of CSS pixels,
 *      and that number does not shrink with the container; `--min-plot-h` is derived in the
 *      component from the label block it actually draws. Below it the rows would collide at any
 *      width. A window too short for that is given a scrollbar rather than a collision, the same
 *      trade the genre's own `PLOT_FLOOR_PX` makes.
 *   3. THE HIT BANDS ARE RECTS, so the shared `.pt:hover { fill: var(--muted) }` rule would paint
 *      an opaque block across the chart. Overridden here — higher specificity, no `!important` —
 *      to a soft tint that shows which endpoint answered without hiding anything behind it. */
const OWN_CSS = `
.chart-plot.slope-plot {
  grid-template-columns: var(--y-gutter) 1fr var(--r-gutter);
  min-height: var(--min-plot-h);
}
.chart-plot.slope-plot .r-axis { grid-column: 3; grid-row: 1; position: relative; }
.slope-label {
  position: absolute;
  display: flex;
  flex-direction: column;
  font-size: var(--label-size);
  line-height: var(--label-lead);
  color: var(--ink);
  transform: translateY(-50%);
  white-space: nowrap;
}
.slope-label.left { right: 10px; align-items: flex-end; text-align: right; }
.slope-label.right { left: 10px; align-items: flex-start; text-align: left; }
.period-label {
  position: absolute;
  top: 0;
  transform: translate(-50%, -100%) translateY(-8px);
  font-size: var(--period-size);
  font-weight: var(--period-weight);
  color: var(--ink);
  white-space: nowrap;
}
svg.chart rect.pt { fill: transparent; cursor: pointer; }
svg.chart rect.pt:hover, svg.chart rect.pt:focus, svg.chart rect.pt.pt-active {
  fill: var(--muted);
  fill-opacity: 0.14;
  outline: none;
}
svg.chart rect.pt:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }
`;

export async function render({ dataPath, outDir, name = OUTPUT_NAME }) {
  const csv = await readFile(dataPath, "utf8");
  const data = countriesFromCsv(csv, { countries: BEAT.countries });
  if (data.length < 2)
    throw new Error(`need at least two categories, got ${data.length}`);

  const { outPath } = await renderWeb({
    component: SlopeWeb,
    props: {
      data,
      frame: FRAME,
      title: BEAT.title,
      limits: BEAT.limits,
      source: BEAT.source,
      alt: BEAT.alt,
      ground: BEAT.ground,
      accent: BEAT.accent,
      highlighted: BEAT.highlighted,
      periodLabels: BEAT.periodLabels,
    },
    outDir,
    name,
  });

  // Append this beat's own interaction script — see this file's own header note and
  // `slope-interaction.mjs`'s for why the shared script's hit-area cannot drive this chart type
  // alone. The shared script's own `</script>` tag is left exactly as `renderWeb` wrote it; this
  // just adds a second `<script>` before `</body>`, the same "inlined verbatim" shape.
  const ownScriptSource = await readFile(
    join(HERE, "slope-interaction.mjs"),
    "utf8",
  );
  let html = await readFile(outPath, "utf8");
  const withOwnScript = html.replace(
    "</body>",
    `<script>\n${inlineable(ownScriptSource)}\n</script>\n</body>`,
  );
  if (withOwnScript === html)
    throw new Error(`could not find </body> to inject slope-interaction.mjs into ${outPath}`);
  html = withOwnScript;

  // This beat's words are English throughout (`BEAT` above, from `BRIEF.md`), and `renderWeb`'s own
  // shell hard-codes `lang="fr"` — the language every web beat built against it before this one was
  // written in. A screen reader takes its pronunciation from that attribute, not from the words, so
  // shipping the French tag over English prose is a defect, not a detail. A per-story repair, not a
  // change to the skill: `renderWeb` takes no `lang` parameter to set correctly instead.
  const langMarker = '<html lang="fr">';
  if (!html.includes(langMarker))
    throw new Error(
      `expected renderWeb's own ${JSON.stringify(langMarker)} shell to repair to English — its HTML shape may have changed`,
    );
  html = html.replace(langMarker, '<html lang="en">');

  if (!html.includes("</style>"))
    throw new Error("renderWeb output has no </style> to append this beat's own rules to");
  html = html.replace("</style>", `${OWN_CSS}</style>`);

  await writeFile(outPath, html);

  return { outPath, countries: data.length };
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

  const { outPath, countries } = await render({ dataPath, outDir });
  console.log(`web beat → ${outPath}  [${countries} countries]`);
}
