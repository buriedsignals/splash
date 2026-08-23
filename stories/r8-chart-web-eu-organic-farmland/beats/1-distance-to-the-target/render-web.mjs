/**
 * THIS BEAT'S OWN RUNNER, filed beside the story rather than inside the skill — the shape
 * `chart-web/SKILL.md` states one takes. It reads this story's FROZEN `source/data.csv`, derives
 * the one slice this beat draws, and hands its own component and its own props to the format's
 * generic `renderWeb`. Nothing here edits a skill.
 *
 *   bun stories/r8-chart-web-eu-organic-farmland/beats/1-distance-to-the-target/render-web.mjs
 *
 * Writes `renders/distance-to-the-target.html`, self-contained.
 *
 * TWO deliberate departures from the seed's runner, both the ones the dot-strip beat records and
 * for the same reasons:
 *
 *   1. After `renderWeb` writes the page, the inlined interaction script is swapped for this
 *      directory's own `lollipop-interaction.mjs`. The skill's copy resolves a pointer by x alone,
 *      which is correct for a line and exactly wrong for a ranking whose rows differ only in y.
 *      `renderWeb` has no parameter for which script it inlines — by design, since nothing in that
 *      file may reach into a story — so the substitution happens here and throws if the shape it
 *      expects is gone.
 *   2. A small CSS block is appended after the skill's generic stylesheet. Every rule in it exists
 *      because this beat's dots and its value labels are HTML elements over the geometry rather
 *      than SVG circles: the skill's own `.pt` rules toggle an SVG `fill`, which does nothing to a
 *      `<span>`, and its hover state dims a mark to `--muted`, which is the wrong direction for a
 *      beat whose marks are the argument.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { renderWeb } from "#shared/chart-web/scripts/render-web.mjs";
import { framingMeasurement } from "#shared/chart-web/scripts/render-still.mjs";
import { readPalette } from "../../../../skills/palette/scripts/palette.mjs";
import { parseStoryboard } from "../../../../skills/storyboard/scripts/storyboard.mjs";
import { OrganicLollipopWeb, FRAME } from "./OrganicLollipopWeb.tsx";
import { pct, points } from "./organic-geometry.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const STORY = resolve(HERE, "../..");
const OUT_DIR = join(HERE, "renders");
const OUTPUT_NAME = "distance-to-the-target.html";

/** The population this beat draws, by the code the frozen table uses. The twenty-seven EU member
 *  states and nothing else — NOT because the other eleven entities in the table are uninteresting,
 *  but because the claim is about a target the European Union set for itself, and a ranking that
 *  mixed Switzerland and Türkiye into it would be answering a different question.
 *
 *  `EU` and `EU27_2020` are deliberately absent, and they are the reason this list is written out
 *  rather than derived from "everything in the geo column": both are AGGREGATES of the rows around
 *  them, they sit in the middle of the alphabetical order between ES and FI, and nothing in the
 *  frozen profile marks them as anything other than a thirty-seventh and thirty-eighth country. */
const MEMBER_STATES = [
  "AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "EL", "ES", "FI", "FR", "HR",
  "HU", "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PL", "PT", "RO", "SE", "SI", "SK",
];

/** The aggregates this beat refuses to rank, asserted against the frozen file rather than assumed:
 *  if a re-download drops one of them, the caveat that names it stops being true. */
const AGGREGATE_CODES = ["EU", "EU27_2020"];

/** The Farm to Fork target the article quotes, in percent. A constant with its own name because it
 *  is a POLICY number, not a reading: it is in no column of the frozen table, and `groundTakeaway`
 *  said so explicitly when the takeaway was grounded. */
const TARGET = 25;

/** The comparison year every row's hover detail is measured against. 2015 is chosen because every
 *  one of the twenty-seven has a reading for it — asserted below, per country, rather than assumed. */
const EARLIER_YEAR = 2015;

/** Eurostat's own observation flags, in Eurostat's own words. A flag this table carries and this
 *  table does not explain is a footnote marker a reader cannot resolve, so an unknown code is
 *  refused rather than printed raw. */
const FLAG_MEANINGS = {
  b: "break in time series",
  d: "definition differs",
  e: "estimated",
  p: "provisional",
  be: "break in time series, estimated",
  bp: "break in time series, provisional",
  ep: "estimated, provisional",
  u: "low reliability",
};

/**
 * A real RFC 4180 reader, because this file needs one: the frozen table's own `geo` label for the
 * European Union is `"European Union (EU6-1958, EU9-1973, ...)"` — a quoted field with six commas
 * inside it — and a `.split(",")` reader would shear that row into pieces and misalign every column
 * after it. The dot-strip beat one story over asserts its file has no quoted field; this one has,
 * so it parses properly instead.
 */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else quoted = false;
      } else cell += c;
      continue;
    }
    if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n") {
      row.push(cell);
      cell = "";
      rows.push(row);
      row = [];
    } else if (c !== "\r") cell += c;
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

/** Every reading in the frozen table, as `{code, name, year, value, flag}`. The column names are
 *  looked up rather than counted: this download carries twenty-one columns, eleven of them code and
 *  label pairs, and an index typed by hand is an index that breaks on the next export. */
export function readingsFrom(csv) {
  const rows = parseCsv(csv).filter((r) => r.length > 1);
  const header = rows[0];
  const at = (name) => {
    const i = header.indexOf(name);
    if (i < 0) throw new Error(`the frozen table has no "${name}" column, it has: ${header.join(", ")}`);
    return i;
  };
  const [codeAt, nameAt, yearAt, valueAt, flagAt] = [
    at("geo"),
    at("Geopolitical entity (reporting)"),
    at("TIME_PERIOD"),
    at("OBS_VALUE"),
    at("OBS_FLAG"),
  ];
  return rows.slice(1).map((cells, n) => {
    if (cells.length !== header.length)
      throw new Error(
        `row ${n + 2} of the frozen table splits into ${cells.length} fields, not ${header.length}`,
      );
    const value = cells[valueAt].trim();
    if (value === "") throw new Error(`row ${n + 2} carries no observation value`);
    return {
      code: cells[codeAt].trim(),
      name: cells[nameAt].trim(),
      year: Number(cells[yearAt].trim()),
      value: Number(value),
      flag: cells[flagAt].trim(),
    };
  });
}

/** The flag, said in words, or the empty string. An unrecognised code THROWS: printing `x` at a
 *  reader is worse than not printing it, and silently dropping it hides a caveat Eurostat attached
 *  to that exact number. */
export function flagInWords(flag) {
  if (flag === "") return "";
  const said = FLAG_MEANINGS[flag];
  if (!said)
    throw new Error(
      `the frozen table carries the observation flag ${JSON.stringify(flag)}, which this beat has no ` +
        "words for — read Eurostat's own flag list and add it, rather than printing a letter nobody can resolve",
    );
  return said;
}

export async function render({ outDir = OUT_DIR, name = OUTPUT_NAME } = {}) {
  const csv = await readFile(join(STORY, "source/data.csv"), "utf8");
  const all = readingsFrom(csv);

  // THE AGGREGATES, NAMED AND EXCLUDED — the honesty move this beat's recorded reference asks for.
  // Asserted present, so the caveat that says they were left out cannot outlive the fact.
  for (const code of AGGREGATE_CODES) {
    if (!all.some((r) => r.code === code))
      throw new Error(
        `this beat's caveat states that the European aggregates are excluded from the ranking, and ` +
          `${code} is not in the frozen table at all — the caveat and the data have parted company`,
      );
  }
  const euSeries = all.filter((r) => r.code === "EU27_2020").sort((a, b) => a.year - b.year);
  const euLast = euSeries[euSeries.length - 1];

  const byCode = new Map();
  for (const r of all) {
    if (!MEMBER_STATES.includes(r.code)) continue;
    if (!byCode.has(r.code)) byCode.set(r.code, []);
    byCode.get(r.code).push(r);
  }
  const missing = MEMBER_STATES.filter((c) => !byCode.has(c));
  if (missing.length > 0)
    throw new Error(`the frozen table carries no reading at all for ${missing.join(", ")}`);

  // THE NEWEST YEAR IN THE TABLE, measured rather than typed — the whole argument of this beat is
  // that not every country reaches it, so a hard-coded year would be the one number that could
  // silently stop being true.
  const newestYear = Math.max(...all.map((r) => r.year));

  const data = [];
  for (const code of MEMBER_STATES) {
    const series = byCode.get(code).slice().sort((a, b) => a.year - b.year);
    const latest = series[series.length - 1];
    const earlier = series.find((r) => r.year === EARLIER_YEAR);
    if (!earlier)
      throw new Error(
        `${latest.name} has no ${EARLIER_YEAR} reading, and every hover detail on this chart is a ` +
          `comparison against ${EARLIER_YEAR} — choose a year the whole population carries, or say ` +
          "on the frame that some rows have no comparison",
      );
    data.push({
      code,
      name: latest.name,
      share: latest.value,
      year: latest.year,
      flag: latest.flag,
      earlierShare: earlier.value,
      earlierYear: EARLIER_YEAR,
      readings: series.length,
    });
  }

  const current = data.filter((d) => d.year === newestYear);
  const stale = data.filter((d) => d.year !== newestYear).sort((a, b) => b.share - a.share);
  const leader = current.slice().sort((a, b) => b.share - a.share)[0];
  const overTarget = current.filter((d) => d.share >= TARGET);
  const everOverTarget = data.filter((d) => d.share >= TARGET);

  // THE TITLE IS A CLAIM, AND IT IS RE-MEASURED HERE EVERY RUN. If a country reporting for the
  // newest year ever does reach the target, this beat stops rather than shipping a headline the
  // marks underneath it contradict.
  if (overTarget.length > 0)
    throw new Error(
      `this beat's title states that no country reporting for ${newestYear} has reached ${TARGET} %, ` +
        `and ${overTarget.map((d) => `${d.name} (${d.share})`).join(", ")} has — rewrite the takeaway`,
    );

  const { ground, accent, origin, source: paletteSource } = readPalette(HERE, { stopAt: STORY });
  const storyboard = parseStoryboard(await readFile(join(STORY, "STORYBOARD.md"), "utf8")).meta;

  const title = `No EU country reporting for ${newestYear} has reached the ${TARGET} % organic-farmland target`;

  // THREE SHORT LINES, not two long ones — what a caveat owes the reader is the fact, not the
  // workings. The workings are in the brief and in the storyboard, where a desk reads them.
  const caveats = [
    `Land converted or under conversion to organic farming, as a share of utilised agricultural ` +
      `area. Each row is that country's own most recent published figure.`,
    `${stale.map((d) => `${d.name} has published none since ${d.year}`).join(", ")} — shown apart, ` +
      `not ranked.` +
      (everOverTarget.length > 0
        ? ` ${everOverTarget.map((d) => `${d.name} was over the line in ${d.year}`).join(", ")}.`
        : ""),
    `No EU average is drawn: this table's own aggregate stops at ${euLast.year}, at ${pct(euLast.value)}.`,
  ];

  /** The one string a reader gets back for a row — on hover, on tap, on keyboard focus, and in the
   *  accessible table, which reads this exact attribute back off the markup. Every reading the
   *  frame had to leave out is here and only here: the year, Eurostat's own flag, the comparison
   *  and how long the country has been reporting. The number itself is NOT here alone — it is drawn
   *  on the frame too, because gating a stated value behind an ask is the thing this format refuses. */
  const detailFor = (row) => {
    const flag = flagInWords(row.flag);
    const parts = [
      `${row.name} · ${pct(row.share)} in ${row.year}`,
      `${pct(row.earlierShare)} in ${row.earlierYear} · ${points(row.share - row.earlierShare)}`,
      `${row.readings} annual figures published`,
    ];
    if (row.year !== newestYear) parts.splice(1, 0, `its last published year — nothing since`);
    if (flag) parts.push(`Eurostat: ${flag}`);
    return parts.join(" · ");
  };

  /** What is written beside each dot on the frame: the value, and — only where it is not the
   *  newest year — that row's own year, because a ranking whose rows are from different years and
   *  does not say so is the defect this whole beat is about. */
  const labelFor = (row) => (row.year === newestYear ? pct(row.share) : `${pct(row.share)} (${row.year})`);

  const alt =
    `A horizontal lollipop chart. One row per European Union member state, each drawn as a stem from ` +
    `zero to that country's organic share of its utilised agricultural area, with a dot at the end. ` +
    `A vertical rule at ${TARGET} % marks the target the EU set for 2030. The top block holds the ` +
    `${current.length} member states that published a figure for ${newestYear}, ranked from ` +
    `${leader.name} at ${pct(leader.share)} down to ` +
    `${current.slice().sort((a, b) => a.share - b.share)[0].name} at ` +
    `${pct(current.slice().sort((a, b) => a.share - b.share)[0].share)}; not one of their stems reaches ` +
    `the rule. Below a dividing line sit the ${stale.length} member states with no figure for ` +
    `${newestYear}: ${stale.map((d) => `${d.name}, ${pct(d.share)} in ${d.year}`).join(", ")}. ` +
    `${everOverTarget.length > 0 ? `${everOverTarget[0].name}'s stem is the only one on the chart that crosses the rule. ` : ""}` +
    `Every row's own year, Eurostat flag and change since ${EARLIER_YEAR} are available on hover, on ` +
    `tap and to a keyboard, and the table below this chart prints all of them in the same order.`;

  const source = storyboard.credit;
  if (!source) throw new Error("STORYBOARD.md records no credit — the source line is not this runner's to invent");

  // THE FRAMING, MEASURED BEFORE THE BUILD, not judged after it. `framing-serves-the-point` asks
  // whether the axis this beat draws serves the comparison or flatters it. Here the answer is
  // settled by the CLAIM rather than by the data: every stem is read against a target of 25, so the
  // axis runs from zero to a fixed 28 whatever the marks do, and a reader can see the gap.
  const framing = framingMeasurement(data.map((d) => d.share));
  console.log(
    `framing: ${data.length} values, min ${framing.min.toFixed(2)}, median ${framing.median.toFixed(2)}, ` +
      `max ${framing.max.toFixed(2)}, spread against extent ${(framing.spreadAgainstExtent * 100).toFixed(1)}% ` +
      `— drawn on a fixed 0-${FRAME.domainMax} domain so the ${TARGET} % rule cannot move`,
  );
  console.log(`palette from ${paletteSource} — ground ${ground}, accent ${accent}, chosen by ${origin}`);
  console.log(
    `${current.length} member states reporting for ${newestYear}, ${stale.length} not ` +
      `(${stale.map((d) => `${d.code} ${d.year}`).join(", ")}); leader ${leader.name} ${pct(leader.share)}`,
  );
  console.log(`alt: ${alt}`);

  await mkdir(outDir, { recursive: true });
  const { outPath } = await renderWeb({
    component: OrganicLollipopWeb,
    props: {
      // The page's own language, from the story's own recorded answer — never detected from prose.
      language: storyboard.language,
      data,
      frame: FRAME,
      title,
      caveats,
      source,
      alt,
      target: TARGET,
      targetLabel: `EU target for 2030 — ${TARGET} %`,
      dividerLabel: `No figure published for ${newestYear}`,
      newestYear,
      earlierYear: EARLIER_YEAR,
      detailFor,
      labelFor,
      ground,
      accent,
    },
    outDir,
    name,
  });

  await patchForThisBeat(outPath);
  return { outPath, rows: data.length, alt, source, caveats, title };
}

/** Strips the `export` keyword from each top-level declaration, the same one-line transform the
 *  skill's own `inlineable` applies to its script, so this beat's own module runs as a plain
 *  classic `<script>` — no `type="module"`, which keeps it working inside a CMS iframe or a
 *  sandboxed embed that restricts module scripts. */
function inlineable(moduleSource) {
  return moduleSource.replace(/^export /gm, "");
}

/**
 * Every rule here exists because this beat's dots and its value labels are HTML elements laid over
 * the geometry rather than SVG shapes — the fluid frame stretches its `viewBox`, and a stretched
 * circle is an ellipse. So: the dot is positioned, sized and rounded here; hover and focus BRIGHTEN
 * it and draw a ring around it, rather than swapping an SVG `fill` (which does nothing to a
 * `<span>`) to `--muted` (which is the wrong direction for a beat whose marks are the argument).
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
/* A ROW WHOSE FIGURE IS NOT FROM THE NEWEST YEAR IS DRAWN HOLLOW, NOT DIMMED. It was dimmed in the
   first build, and the format's own driven check refused it: the view a reader lands on must dim
   nothing, because in this format a dimmed mark is a filtered-out mark. A hollow dot is the same
   accent at full strength, says "not filled in yet" without a second hue, and keeps the mark at the
   contrast the palette measured. */
.pt.is-stale { background: var(--ground); box-shadow: inset 0 0 0 2px var(--accent); }
.pt:hover, .pt:focus, .pt.pt-active {
  fill: none;
  background: var(--ink);
  box-shadow: 0 0 0 2px var(--ground), 0 0 0 4px var(--ink);
  z-index: 3;
}
.pt:focus { outline: none; }
.pt:focus-visible { outline: 2px solid var(--ink); outline-offset: 3px; }

/* THE LABEL COLUMN. Two right-aligned columns in the gutter — the country's own name, then its own
   value against the axis — so no word is ever drawn over a stem and nothing can be clipped off the
   right edge of a narrow frame. Both carry the row's code, so lighting a dot lights the whole row:
   on a wide screen the gutter is a long way from the mark, and a highlight that stops at the dot
   leaves a reader hunting for their own place in the list. */
.axis-label.y.country {
  right: calc(10px + var(--value-col));
  transform: translateY(-50%);
  font-size: var(--label-size);
  font-weight: var(--label-weight);
  white-space: nowrap;
}
.axis-label.y.value {
  right: 10px;
  transform: translateY(-50%);
  font-size: var(--label-size);
  font-weight: 400;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.axis-label.y.row-active { color: var(--ink); text-decoration: underline; }

.note.target-label {
  transform: translate(-8px, 0) translateX(-100%);
  color: var(--ink);
  font-weight: 600;
  white-space: nowrap;
}
.note.divider-label {
  transform: translateY(-100%) translateY(-7px);
  color: var(--muted);
  white-space: nowrap;
}

/* THE NARROW FRAME'S OWN AXIS. Below 640px the plot rectangle is under 200px wide and six tick
   labels at this format's fixed type size cannot stand side by side — measured at 375x812, where
   the first build printed "0 % 5 %10 %15 %20 %25 %" as one run. Every gridline stays; every other
   NUMBER steps aside, and the one number the whole chart is read against is named in full by the
   target rule's own label. */
@media (max-width: 640px) {
  .axis-label.x.minor { display: none; }
}
`;

async function patchForThisBeat(outPath) {
  let html = await readFile(outPath, "utf8");

  const scriptBlockRe = /<script>\n[\s\S]*?\n<\/script>/;
  if (!scriptBlockRe.test(html))
    throw new Error(
      "expected exactly one inlined <script>...</script> block to replace with this beat's own interaction script",
    );
  const own = await readFile(join(HERE, "lollipop-interaction.mjs"), "utf8");
  html = html.replace(scriptBlockRe, `<script>\n${inlineable(own)}\n</script>`);

  if (!html.includes("</head>"))
    throw new Error("expected a </head> to append this beat's own CSS override before");
  html = html.replace("</head>", `<style>\n${EXTRA_CSS}\n</style>\n</head>`);

  await writeFile(outPath, html);
}

if (import.meta.main) {
  const argv = process.argv.slice(2);
  const positional = argv.find((a) => !a.startsWith("--"));
  const { outPath, rows } = await render({ outDir: resolve(positional ?? OUT_DIR) });
  console.log(`web beat → ${outPath}  [${rows} rows]`);
}
