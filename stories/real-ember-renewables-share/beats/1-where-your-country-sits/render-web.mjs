/**
 * THIS BEAT'S OWN RUNNER, filed beside the story rather than inside the skill — the shape
 * `chart-web/SKILL.md` states one takes. It reads this story's FROZEN `source/data.csv`, derives
 * the one slice this beat draws, and hands its own component and its own props to the format's
 * generic `renderWeb`. Nothing here edits a skill.
 *
 *   bun stories/real-ember-renewables-share/beats/1-where-your-country-sits/render-web.mjs
 *
 * Writes `renders/where-your-country-sits.html`, self-contained.
 *
 * TWO deliberate departures from the seed's runner, both the same ones the income-and-life-
 * expectancy beat records, and for the same reasons:
 *
 *   1. After `renderWeb` writes the page, the inlined interaction script is swapped for this
 *      directory's own `strip-interaction.mjs`. The skill's copy resolves a pointer by x alone,
 *      which is correct for a line and wrong for 211 marks sharing one value axis. `renderWeb` has
 *      no parameter for which script it inlines — by design, since nothing in that file may reach
 *      into a story — so the substitution happens here and throws if the shape it expects is gone.
 *   2. A small CSS block is appended after the skill's generic stylesheet. Every rule in it exists
 *      because this beat's marks are HTML elements over the geometry rather than SVG circles: the
 *      skill's own `.pt` rules toggle an SVG `fill`, which does nothing to a `<span>`, and its
 *      hover state dims a mark to `--muted`, which is the wrong direction for a beat whose marks
 *      are the argument.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { renderWeb } from "#shared/chart-web/scripts/render-web.mjs";
import { framingMeasurement } from "#shared/chart-web/scripts/render-still.mjs";
import { readPalette } from "../../../../skills/palette/scripts/palette.mjs";
import { parseStoryboard } from "../../../../skills/storyboard/scripts/storyboard.mjs";
import { RenewablesStripWeb, FRAME } from "./RenewablesStripWeb.tsx";
import { median, pct } from "./strip-geometry.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const STORY = resolve(HERE, "../..");
const OUT_DIR = join(HERE, "renders");
const OUTPUT_NAME = "where-your-country-sits.html";

/** The year this beat draws, and it is NOT the file's last. Stated here as a constant with its own
 *  reason so nobody re-points it without meeting the reason: 2025 carries 91 of the file's 214
 *  countries and 2024 carries 196, so a latest-year strip would drop more than half the world
 *  without saying so. `assertCoverage` below re-measures this every run against the frozen file
 *  rather than trusting this comment. */
const YEAR = 2023;
/** How much of the file's own country population a drawn year must carry before this beat will
 *  draw it. 0.95 is chosen against the measured series: 2022 and 2021 carry 213 of 214, 2023
 *  carries 211, 2024 carries 196 (0.916) and 2025 carries 91 (0.425). */
const MIN_COVERAGE = 0.95;
/** How far two bodies' figures for one subject may sit apart and still be called agreement: half a
 *  unit of the last digit this beat prints, so the caveat never calls a difference a disagreement
 *  when the graphic itself could not show it. */
const AGREEMENT_TOLERANCE = 0.05;

/**
 * THE AGGREGATE ROWS THIS FILE MIXES IN WITH ITS COUNTRIES, listed by their own code because a
 * name is not stable and a suffix is not a rule. Our World in Data publishes continents, income
 * groups and the world in the SAME entity column as the countries, so a naive "one dot per row of
 * 2023" strip would rank the World against Denmark and draw Africa twice.
 *
 * `OWID_KOS` is deliberately NOT here: it is Kosovo, a place, which has an OWID code only because
 * it has no ISO one. The prefix marks "not an ISO code", not "not a country".
 */
const AGGREGATE_CODES = new Set([
  "OWID_WRL",
  "OWID_AFR",
  "OWID_ASI",
  "OWID_EUR",
  "OWID_EU27",
  "OWID_HIC",
  "OWID_LIC",
  "OWID_LMC",
  "OWID_NAM",
  "OWID_OCE",
  "OWID_SAM",
  "OWID_UMC",
]);
const WORLD_CODE = "OWID_WRL";

/** The frozen file carries no quoted field and no comma inside a value — checked below rather than
 *  assumed, because a country name with a comma in it is exactly the kind of thing a re-export
 *  introduces silently. */
function rowsFromCsv(csv) {
  const lines = csv.replace(/^﻿/, "").trim().split(/\r\n|\r|\n/);
  const header = lines[0].split(",");
  const at = (name) => {
    const i = header.indexOf(name);
    if (i < 0) throw new Error(`the frozen table has no "${name}" column, it has: ${header.join(", ")}`);
    return i;
  };
  const [entityAt, codeAt, yearAt, shareAt] = [
    at("entity"),
    at("code"),
    at("year"),
    at("renewable_share_of_electricity__pct"),
  ];
  return lines.slice(1).map((line, n) => {
    const cells = line.split(",");
    if (cells.length !== header.length)
      throw new Error(
        `row ${n + 2} of the frozen table splits into ${cells.length} fields, not ${header.length} — ` +
          "this reader assumes no quoted field and no comma inside a value, and that assumption has broken",
      );
    return {
      country: cells[entityAt],
      code: cells[codeAt],
      year: Number(cells[yearAt]),
      share: Number(cells[shareAt]),
    };
  });
}

/** Every entity in the file that is a country or territory rather than an aggregate: it carries a
 *  code, and that code is not one of the aggregate codes above. The twenty entities with NO code at
 *  all are the regional series published under a reporting body's own name — `Europe (EI)`,
 *  `Europe (Ember)` and the rest — and they are excluded by the same rule. */
function isCountry(row) {
  return Boolean(row.code) && !AGGREGATE_CODES.has(row.code);
}

/**
 * THE DISAGREEMENT THE DESK ASKED ABOUT, MEASURED RATHER THAN ASSERTED. Several subjects in this
 * file are published under more than one reporting body — `Africa (EI)` beside `Africa (Ember)`,
 * and in three cases beside Our World in Data's own `Africa` as well. This finds every such subject
 * and returns the widest gap between any two of its series in any shared year, so the caveat
 * printed on the graphic carries a number this run actually measured.
 */
export function reportingBodyDisagreements(rows) {
  const bodies = new Map();
  for (const row of rows) {
    const match = /^(.*?)\s*\((EI|Ember)\)$/.exec(row.country);
    if (!match) continue;
    const [, subject, body] = match;
    if (!bodies.has(subject)) bodies.set(subject, new Map());
    const perBody = bodies.get(subject);
    if (!perBody.has(body)) perBody.set(body, new Map());
    perBody.get(body).set(row.year, row.share);
  }
  // Our World in Data's own aggregate for the same subject, where it publishes one, is a THIRD
  // series and is folded in under its own name.
  for (const [subject, perBody] of bodies) {
    const own = rows.filter((r) => r.country === subject);
    if (own.length > 0) perBody.set("Our World in Data", new Map(own.map((r) => [r.year, r.share])));
  }

  const found = [];
  for (const [subject, perBody] of bodies) {
    if (perBody.size < 2) continue;
    const series = [...perBody.entries()];
    let widest = { gap: 0, year: null };
    for (let i = 0; i < series.length; i += 1)
      for (let j = i + 1; j < series.length; j += 1)
        for (const [year, value] of series[i][1]) {
          const other = series[j][1].get(year);
          if (other === undefined) continue;
          const gap = Math.abs(value - other);
          if (gap > widest.gap) widest = { gap, year };
        }
    if (widest.year === null) continue;
    found.push({
      subject,
      bodies: series.map(([body, byYear]) => ({ body, at: byYear.get(YEAR) })),
      widestGap: widest.gap,
      widestYear: widest.year,
    });
  }
  return found.sort((a, b) => b.widestGap - a.widestGap);
}

/** The year's own coverage against the file's whole country population — re-measured every run, so
 *  a re-pointed `YEAR` meets the reason `YEAR` is what it is. */
function assertCoverage(rows) {
  const everyCountry = new Set(rows.filter(isCountry).map((r) => r.country));
  const thisYear = rows.filter((r) => r.year === YEAR && isCountry(r));
  const coverage = thisYear.length / everyCountry.size;
  if (coverage < MIN_COVERAGE)
    throw new Error(
      `${YEAR} carries ${thisYear.length} of the file's ${everyCountry.size} countries ` +
        `(${(coverage * 100).toFixed(1)}%), below the ${MIN_COVERAGE * 100}% this beat requires. A ` +
        "strip drawn from a partial year is a claim about the whole world made from part of it.",
    );
  return { drawn: thisYear.length, ofTotal: everyCountry.size, coverage };
}

export async function render({ outDir = OUT_DIR, name = OUTPUT_NAME } = {}) {
  const csv = await readFile(join(STORY, "source/data.csv"), "utf8");
  const rows = rowsFromCsv(csv);

  const coverage = assertCoverage(rows);
  // Sorted by value, so the DOM order the keyboard walks and the accessible table prints is the
  // order the eye reads the strip in: left to right, lowest share to highest.
  const data = rows
    .filter((r) => r.year === YEAR && isCountry(r))
    .map((r) => ({ country: r.country, code: r.code, share: r.share }))
    .sort((a, b) => a.share - b.share || a.country.localeCompare(b.country));

  const world = rows.find((r) => r.year === YEAR && r.code === WORLD_CODE);
  if (!world) throw new Error(`the frozen table carries no World row for ${YEAR}`);
  const middle = median(data.map((d) => d.share));

  const atCeiling = data.filter((d) => d.share === 100);
  const atFloor = data.filter((d) => d.share === 0);
  const below = data.filter((d) => d.share < world.share).length;

  const doubled = reportingBodyDisagreements(rows);
  // A subject published twice that AGREES is not a disagreement, and counting it as one would make
  // the caveat overstate its own finding. "Agrees" is decided at the precision this beat PRINTS at,
  // one decimal place: Oceania's two series are 0.00092 points apart at their widest, which is a
  // rounding artefact of two pipelines, not two bodies telling a newsroom different things.
  const disagreements = doubled.filter((d) => d.widestGap >= AGREEMENT_TOLERANCE);
  const agreeing = doubled.filter((d) => d.widestGap < AGREEMENT_TOLERANCE);
  const worst = disagreements[0];
  if (!worst)
    throw new Error(
      "this beat's caveat states that regional series in this file disagree, and this run found no " +
        "subject published under more than one body that does — the caveat and the data have parted company",
    );
  const worstReading = worst.bodies
    .filter((b) => b.at !== undefined)
    .map((b) => `${pct(b.at)} (${b.body})`)
    .join(", ");

  const { ground, accent, origin, source: paletteSource } = readPalette(HERE, { stopAt: STORY });
  const storyboard = parseStoryboard(await readFile(join(STORY, "STORYBOARD.md"), "utf8")).meta;

  const title = `Renewables were ${pct(world.share)} of the world's electricity in ${YEAR}. Almost no country was.`;
  // THREE SHORT LINES, not two long ones. The first draft carried the whole finding in two
  // paragraphs; on a 375px phone they filled two thirds of the screen and left the strip a 60px
  // smear. What a caveat owes the reader is the fact, not the workings — the workings are in the
  // brief and in the storyboard, where a desk reads them.
  const caveats = [
    `One dot per country or territory with a ${YEAR} figure: ${coverage.drawn} of the ${coverage.ofTotal} in this file. ` +
      `Height carries no meaning. ${below} sit below the world's own figure, which is weighted by how much electricity each country generates.`,
    `${disagreements.length} of the ${doubled.length} regional aggregates in this file are published by two or three bodies at once that disagree ` +
      `— ${worst.subject} reads ${worstReading} — so no region is drawn here.`,
    `${YEAR}, not the file's last year: 2025 carries 91 of the ${coverage.ofTotal} countries and 2024 carries 196.`,
  ];

  const alt =
    `A single horizontal strip of ${data.length} dots, one per country or territory, each placed by the share of its ` +
    `electricity that came from renewable sources in ${YEAR} on an axis running from 0% at the left to 100% at the right. ` +
    `A heavy vertical rule marks the world's own figure, ${pct(world.share)}; a lighter one marks the middle country, ` +
    `${pct(middle)}. The dots are spread across the entire axis rather than gathered near the world's figure: ` +
    `${atFloor.length} sit at exactly 0% (${atFloor.map((d) => d.country).join(", ")}) and ${atCeiling.length} at exactly ` +
    `100% (${atCeiling.map((d) => d.country).join(", ")}). ${below} of the ${data.length} sit below the world's figure. ` +
    "Every dot's own country and share is available on hover, on tap, and to a keyboard, and the table below this chart " +
    "prints all of them in the same order.";

  const source = storyboard.credit;
  if (!source) throw new Error("STORYBOARD.md records no credit — the source line is not this runner's to invent");

  // THE FRAMING, MEASURED BEFORE THE BUILD, not judged after it. `framing-serves-the-point` asks
  // whether the axis this beat draws serves the comparison or flatters it; on this beat the answer
  // is settled by the measure rather than by the data — a share of electricity runs 0-100 by
  // definition and the strip is drawn on that whole domain, so the spread below is a fact about the
  // population, not a framing decision anyone made.
  const framing = framingMeasurement(data.map((d) => d.share));
  console.log(
    `framing: ${data.length} values, min ${framing.min.toFixed(2)}, median ${framing.median.toFixed(2)}, ` +
      `max ${framing.max.toFixed(2)}, spread against extent ${(framing.spreadAgainstExtent * 100).toFixed(1)}% ` +
      "— drawn on the measure's own full 0-100 domain, never on the data's extent",
  );
  console.log(`palette from ${paletteSource} — ground ${ground}, accent ${accent}, chosen by ${origin}`);
  console.log(`drawing ${data.length} of ${coverage.ofTotal} countries for ${YEAR} (${(coverage.coverage * 100).toFixed(1)}%)`);
  console.log(`subjects published by more than one body: ${doubled.map((d) => `${d.subject} ${d.widestGap.toFixed(2)}pp`).join(" · ")}`);
  console.log(`alt: ${alt}`);

  await mkdir(outDir, { recursive: true });
  const { outPath } = await renderWeb({
    component: RenewablesStripWeb,
    props: {
      // The page's own language, from the story's own recorded answer — never detected from prose.
      language: storyboard.language,
      data,
      frame: FRAME,
      title,
      caveats,
      source,
      alt,
      worldShare: world.share,
      worldLabel: `World ${pct(world.share)}`,
      medianShare: middle,
      medianLabel: `median ${pct(middle)}`,
      floorLabel: `${atFloor.length} at 0%`,
      ceilingLabel: `${atCeiling.length} at 100%`,
      searchLabel: "Find a country",
      searchPlaceholder: "start typing a name",
      ground,
      accent,
    },
    outDir,
    name,
  });

  await patchForThisBeat(outPath);
  // `alt`, `source` and `caveats` travel back to the CALLER as strings. The delivery needs the alt
  // and there is nowhere else it is recorded: reading it back out of the rendered page returns it
  // HTML-ESCAPED (`world&#x27;s`), and the hand-over that prints it is Markdown, where the entity
  // reaches the journalist verbatim.
  return { outPath, dots: data.length, alt, source, caveats };
}

/** Strips the `export` keyword from each top-level declaration, the same one-line transform the
 *  skill's own `inlineable` applies to its script, so this beat's own module runs as a plain
 *  classic `<script>` — no `type="module"`, which keeps it working inside a CMS iframe or a
 *  sandboxed embed that restricts module scripts. */
function inlineable(moduleSource) {
  return moduleSource.replace(/^export /gm, "");
}

/**
 * Every rule here exists because this beat's marks are HTML elements laid over the geometry rather
 * than SVG circles — the fluid frame stretches its `viewBox`, and a stretched circle is an ellipse.
 * So: the dot is positioned, sized and rounded here; hover and focus BRIGHTEN it and draw a ring
 * around it, rather than swapping an SVG `fill` (which does nothing to a `<span>`) to `--muted`
 * (which is the wrong direction for a beat whose marks are the argument). The search box's own
 * chrome is here too, since the format's generic stylesheet only knows about a declared filter and
 * this beat declares none.
 */
const EXTRA_CSS = `
.pt {
  position: absolute;
  display: block;
  width: var(--dot-size);
  height: var(--dot-size);
  border-radius: 50%;
  background: var(--accent);
  transform: translate(-50%, -50%);
  fill: none;
}
.pt:hover, .pt:focus, .pt.pt-active, .pt.pt-held {
  fill: none;
  background: var(--ink);
  box-shadow: 0 0 0 2px var(--ground), 0 0 0 4px var(--ink);
  z-index: 2;
}
.pt:focus { outline: none; }
.pt:focus-visible { outline: 2px solid var(--ink); outline-offset: 3px; }

.note.rule-label {
  color: var(--ink);
  font-weight: 600;
}
/* Both rule labels run RIGHTWARDS from their own rule rather than being centred on it, and they
   sit in opposite margins. Centred, at 375px, "World 30.3%" and the "15 at 0%" count came within a
   few pixels of each other and "median 26.5%" ran straight through the count. */
.note.rule-label.world { transform: translate(2px, -100%) translateY(-4px); }
.note.rule-label.median { color: var(--muted); font-weight: 400; transform: translate(2px, 0) translateY(4px); }
.end-label {
  color: var(--muted);
  font-weight: var(--label-weight);
  font-size: var(--note-size);
}
.end-label.at-floor { left: 0; transform: translateY(-100%) translateY(-4px); }
.end-label.at-ceiling { right: 0; left: auto; transform: translateY(-100%) translateY(-4px); }

/* The outermost value labels are anchored at the frame's own edges: a centred "0%" would hang half
   of itself outside the plot, which is the clipping this format has shipped once before. */
.axis-label.x.first { transform: none; }
.axis-label.x.last { transform: translateX(-100%); }

.chart-find {
  flex: 0 0 auto;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 10px;
  margin: 12px 0 0;
  font-size: var(--filter-size);
  color: var(--muted);
}
.chart-find label { font-weight: 600; color: var(--ink); }
.chart-find input {
  font: inherit;
  color: var(--ink);
  background: var(--ground);
  border: 1px solid var(--muted);
  border-radius: 4px;
  padding: 5px 10px;
  min-width: 14em;
  min-height: 28px;
}
.chart-find input:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }
.chart-find .find-answer { margin: 0; color: var(--muted); }
`;

async function patchForThisBeat(outPath) {
  let html = await readFile(outPath, "utf8");

  const scriptBlockRe = /<script>\n[\s\S]*?\n<\/script>/;
  if (!scriptBlockRe.test(html))
    throw new Error(
      "expected exactly one inlined <script>...</script> block to replace with this beat's own interaction script",
    );
  const own = await readFile(join(HERE, "strip-interaction.mjs"), "utf8");
  html = html.replace(scriptBlockRe, `<script>\n${inlineable(own)}\n</script>`);

  if (!html.includes("</head>"))
    throw new Error("expected a </head> to append this beat's own CSS override before");
  html = html.replace("</head>", `<style>\n${EXTRA_CSS}\n</style>\n</head>`);

  await writeFile(outPath, html);
}

if (import.meta.main) {
  const argv = process.argv.slice(2);
  const positional = argv.find((a) => !a.startsWith("--"));
  const { outPath, dots } = await render({ outDir: resolve(positional ?? OUT_DIR) });
  console.log(`web beat → ${outPath}  [${dots} dots]`);
}
