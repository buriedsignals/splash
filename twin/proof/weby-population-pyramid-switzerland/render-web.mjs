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
//      files), so this runner still calls it for what it DOES generalise (SSR the one fluid frame,
//      derive the furniture, build the HTML shell, write the file) and then patches the one piece
//      that doesn't. Both substitutions fail loud if the shape they expect to find has changed.
//
// Usage:  bun proof/weby-population-pyramid-switzerland/render-web.mjs [outDir] [--data <csv>]

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderWeb } from "../../skills/twin-chart-web/scripts/render-web.mjs";
import { FRAME, SwissAgePyramidWeb } from "./SwissAgePyramidWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));

const DEFAULT_DATA_PATH = join(HERE, "data.csv");
// And the OUTPUT defaults beside the beat too — where this beat's html is actually committed. It
// used to default to a scratch directory, so running this script the obvious way produced a fresh
// file nobody looks at, printed a path, exited zero, and left the committed one stale.
const DEFAULT_OUT_DIR = HERE;
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
/* The peak annotation hangs from the plot's own top-left corner, where nothing is ever drawn — see
   SwissAgePyramidWeb.tsx's leader-path comment for why it cannot sit on the row it points at. */
.chart-plot.pyramid .overlay .note.peak-label {
  transform: none;
}
/* THE MIRROR'S OWN GRID — three tracks, and the middle one is the whole reason this beat needed a
   layout of its own. The age labels sit in a reserved gutter down the CENTRE, and in a fluid frame
   that gutter cannot be measured in SVG user units: the label is fixed-pixel HTML while the viewBox
   stretches, so a user-unit gutter is ~50px on a laptop and ~20px on a phone while the label stays
   24px wide either way. It is a real CSS track instead (--band-gutter, measured in node), with one
   independent <svg> either side of it. Both flanking tracks are 1fr, so the mirror stays true. */
.chart-plot.pyramid {
  grid-template-columns: 1fr var(--band-gutter) 1fr;
  grid-template-rows: minmax(0, 1fr) var(--x-axis-h);
}
.chart-plot.pyramid svg.half {
  grid-row: 1;
  width: 100%;
  height: 100%;
  display: block;
}
.chart-plot.pyramid svg.half.left { grid-column: 1; }
.chart-plot.pyramid svg.half.right { grid-column: 3; }
.chart-plot.pyramid .overlay.left { grid-column: 1; grid-row: 1; }
.chart-plot.pyramid .band-labels {
  grid-column: 2;
  grid-row: 1;
  position: relative;
}
.chart-plot.pyramid .band-labels .band-label {
  position: absolute;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: var(--band-size);
  color: var(--muted);
  white-space: nowrap;
}
.chart-plot.pyramid .x-axis { grid-row: 2; }
.chart-plot.pyramid .x-axis.left { grid-column: 1; }
.chart-plot.pyramid .x-axis.right { grid-column: 3; }
/* The hit rows span BOTH halves and the gutter between them — which is exactly why they are HTML
   and not SVG rects: no rect can span two <svg> elements. They tile the plot edge to edge, so
   there is nothing to resolve by "nearest". */
.chart-plot.pyramid .hit-rows {
  grid-column: 1 / -1;
  grid-row: 1;
  position: relative;
}
.chart-plot.pyramid .row-hit {
  position: absolute;
  left: 0;
  right: 0;
  cursor: pointer;
}
.chart-plot.pyramid .row-hit:hover,
.chart-plot.pyramid .row-hit:focus,
.chart-plot.pyramid .row-hit.row-active {
  /* A FRAME, not a fill — the rule this beat has kept since its first build, and the reason is one
     line up: these rows sit ON TOP of both halves and the age label between them, so a translucent
     fill paints over the bars and the label it is meant to point at. An inset box-shadow outlines
     the active row without covering a pixel of it, and costs no layout. */
  box-shadow: inset 0 0 0 1.5px var(--ink);
  outline: none;
}
.chart-plot.pyramid .row-hit:focus-visible {
  outline: 2px solid var(--ink);
  outline-offset: -2px;
}
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
.chart-legend .legend-swatch { width: 12px; height: 12px; display: inline-block; }
/* The alt text, readable by a screen reader and out of the layout — absolutely positioned, so it
   never claims one of the grid's own cells. */
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
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

  // The reference year was typed into the alt text while data.csv said nothing about which year it
  // holds — nothing in this beat could have contradicted it. It is a column now (every row is a
  // 2023 reading, same as the static twin's), read here and stated only from what the file says.
  const years = [...new Set(rows.map((r) => r.year))];
  if (years.length !== 1)
    throw new Error(`expected every row to carry one reference year, got ${years.join(", ")}`);
  const YEAR = years[0];

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
  const youngestSharePct = Math.round((youngest.total / peak.total) * 100);

  // "Well under half" and "the mid-60s" were both hand-typed in this beat too (same mistake as its
  // static twin, `static-swiss-age-pyramid/render.mjs`) — a render audit caught the first as false
  // (0-4 is ~65% of the peak band's width, not under half) and the second as imprecise (the real
  // female>male crossover is the 60-64 band). Both now come from `withTotal`, not retyped.
  let crossover = withTotal[withTotal.length - 1];
  for (let i = withTotal.length - 1; i >= 0; i--) {
    if (withTotal[i].female <= withTotal[i].male) break;
    crossover = withTotal[i];
  }
  console.log(`female > male from ${crossover.ageBand} upward`);

  const { outPath } = await renderWeb({
    component: SwissAgePyramidWeb,
    props: {
      frame: FRAME,
      bands,
      title: `Switzerland's population bulges at ages ${peak.ageBand}, not among the youngest`,
      limits:
        "Age bands run in their natural sequence, oldest at top — sorting by population size would destroy the shape this chart exists to show. Hover, tap or focus any band for its exact figures.",
      source:
        "Source: UN, World Population Prospects (2024), via Our World in Data · 2023 data, extracted 8 August 2026",
      alt: `Population pyramid of Switzerland by age and sex, ${YEAR}. The widest band is ${peak.ageBand} at ${peak.total.toLocaleString()} people, not the youngest band: 0-4 year-olds total ${youngest.total.toLocaleString()}, about ${youngestSharePct}% of the peak band's width. Women outnumber men in every band from ${crossover.ageBand} upward. Every band's exact figures for both sexes are reachable by hover, tap or keyboard focus.`,
      ground: "#FFFFFF",
      accent: NOMINAL_ACCENT,
      peakBand: peak.ageBand,
      // "the widest band", not "55-59: the widest band (669,962)". The band is already named in
      // the gutter the leader line points out of, and the exact total is already in that band's own
      // tooltip and in the alt text — while the long form measured 230px against a 143px half-frame
      // at 375px and printed straight across the age labels for two whole rows. Seen in the render,
      // not reasoned about. This also restores what the component's own doc-comment always claimed
      // the annotation did: name the band, stay silent on its figure.
      peakLabel: "the widest band",
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
