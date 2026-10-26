// The generic half of a gantt beat: art direction, treatments, render and refusals, taken from
// proof/static-gantt-top-ten-tenure/render-directions.mjs with everything about ITS subject removed.
// Everything about THIS story — data, the spans, words, checks — lives in ./beat.mjs, the one file
// the model writes. Copied into the beat by the harness; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs [--size landscape|square|portrait]
import { rm } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderStill } from "#shared/chart-beat/render-still.mjs";
import { readPalette } from "#shared/chart-beat/colour.mjs";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { composeDirections, filedDirections, report as composeReport, resolveDirectionFamilies } from "#shared/design-base/index.mjs";
import { directionReachable, readRunDirection } from "#shared/design-base/run-direction.mjs";
import { assertBeatMayEnter, directedFrame, exportSizeFromArgv, nameAtSize } from "#shared/chart-beat/directed-size.mjs";
import { DirectedGantt } from "./DirectedGantt.tsx";
import beat from "./beat.mjs";
import { applyStoryboard, assertNumbers } from "./guards.mjs";
applyStoryboard(beat, dirname(fileURLToPath(import.meta.url)));

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "renders");
const SIZE = exportSizeFromArgv();
const FRAME = directedFrame(SIZE);
assertBeatMayEnter(HERE, SIZE, { what: basename(HERE) });

const REQUIRED = ["eyebrow", "rows", "subjects", "first", "last", "spanLabel", "title", "limits", "reading", "source", "alt", "check"];
const missing = REQUIRED.filter((key) => beat[key] === undefined);
if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")} (see CONTRACT.md)`);

const { first, last } = beat;
if (!Number.isInteger(first) || !Number.isInteger(last) || !(last > first))
  throw new Error(`first and last are the axis's whole years (integers, last > first); got ${first} and ${last}`);
if (!Array.isArray(beat.rows) || beat.rows.length < 2) throw new Error(`rows holds ${beat.rows?.length ?? 0} row(s); a gantt lays out at least two`);
assertNumbers(beat.rows.flatMap((r) => (r.runs ?? []).flatMap((run) => [[`${r.key} from`, run.from], [`${r.key} to`, run.to]])), "runs");

/** A SPAN IS WHOLE YEARS ON THE AXIS, IN ORDER, NEVER OVERLAPPING ITS OWN ROW. A row drawn in two
 *  pieces is a row with a gap, and the gap is a finding — so the runs say where it is. */
for (const r of beat.rows) {
  if (typeof r.key !== "string" || !Array.isArray(r.runs) || !r.runs.length)
    throw new Error(`every row is { key, label, runs: [{ from, to, open }] } with at least one run; got ${JSON.stringify(r).slice(0, 120)}`);
  let prevTo = -Infinity;
  for (const run of r.runs) {
    if (!Number.isInteger(run.from) || !Number.isInteger(run.to)) throw new Error(`row ${r.key}: a run's from and to are whole years; got ${run.from}–${run.to}`);
    if (run.to < run.from) throw new Error(`row ${r.key}: a run ends (${run.to}) before it starts (${run.from})`);
    if (run.from < first || run.to > last) throw new Error(`row ${r.key}: the run ${run.from}–${run.to} falls outside the axis ${first}–${last}; widen first/last or clip the run and say so`);
    if (run.from <= prevTo + 1) throw new Error(`row ${r.key}: runs must be in order with a gap between them (${prevTo} then ${run.from}); merge touching runs into one`);
    if (run.to === last && typeof run.open !== "boolean")
      throw new Error(`row ${r.key}: the run ${run.from}–${run.to} reaches the last year; say open: true if it is still running, open: false if it ended in ${last}`);
    if (run.open && run.to !== last) throw new Error(`row ${r.key}: only a run that reaches ${last} can be open`);
    prevTo = run.to;
  }
}
const keys = new Set(beat.rows.map((r) => r.key));
if (keys.size !== beat.rows.length) throw new Error(`two rows share a key; give every row its own key`);
const subjects = [beat.subjects].flat().map(String);
const stray = subjects.filter((s) => !keys.has(s));
if (!subjects.length || stray.length) throw new Error(`subjects must name rows by key (${stray.join(", ") || "none given"}); the keys are ${[...keys].join(", ")}`);

/** The component draws a row in the accent when it is one of the takeaway's subjects. */
const rows = beat.rows.map((r) => {
  const runs = r.runs.map((run) => ({ from: run.from, to: run.to, open: run.open === true }));
  return { key: r.key, label: String(r.label ?? r.key), runs, years: runs.reduce((s, run) => s + run.to - run.from + 1, 0), throughout: subjects.includes(r.key) };
});

beat.check();
// No headline-figures guard here: a gantt's headline counts rows and names the rule that made them
// ("never left the top 10"), figures the spans do not encode — the worked example's own takeaway
// is refused by it. `check()` is where the count is held to the data.

const title = [beat.title].flat()[0];
const limits = [beat.limits].flat();
const reading = [beat.reading].flat();
const facts = beatFacts(
  rows.map((r) => ({ key: r.key, label: r.label, value: r.years })),
  {
    subject: subjects[0],
    spans: rows.flatMap((r) => r.runs.map((run) => ({ key: r.key, from: run.from, to: run.open ? null : run.to }))),
    namedSeries: rows.map((r) => r.label),
    declaredSequence: beat.declaredSequence ?? "entry",
  },
);
const offered = applicableTreatments(facts);
const textPerRegister = {
  display: title,
  eyebrow: beat.eyebrow,
  body: `${limits.join(" ")} ${beat.source}`,
  axis: `${first} ${last}`,
  annot: `${rows.map((r) => `${r.label} ${beat.spanLabel(r)}`).join(" ")} ${reading.join(" ")}`,
  value: rows.map((r) => beat.spanLabel(r)).join(" "),
};

const labelOf = (id) => id.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const newsroom = readPalette(HERE);
let chosen;
if (directionReachable(HERE)) {
  const run = readRunDirection(HERE);
  chosen = [{ label: labelOf(run.id), direction: run }];
} else {
  const composition = composeDirections({ newsroom, filed: filedDirections(), beat: { evidenceLevels: beat.evidenceLevels ?? 3 }, textPerRegister });
  if (!composition.offered.length) throw new Error(`no composed direction holds up for this beat:\n${composeReport(composition, {})}`);
  chosen = composition.offered.slice(0, 1).map((d) => ({ label: labelOf(d.id), direction: d }));
}

const refused = [];
for (const { label: id, direction: chosenDirection } of chosen) {
  const direction = resolveDirectionFamilies(chosenDirection, textPerRegister);
  try {
    await renderStill({
      element: createElement(DirectedGantt, {
        frame: { width: FRAME.width, height: FRAME.height },
        rows,
        first,
        last,
        title,
        limits,
        reading,
        source: beat.source,
        alt: beat.alt,
        eyebrow: beat.eyebrow,
        spanLabel: beat.spanLabel,
        direction,
        treatments: offered.map((t) => t.id),
      }),
      width: FRAME.width,
      height: FRAME.height,
      outDir: OUT,
      name: nameAtSize(id, SIZE),
      scale: FRAME.scale,
    });
    console.log(`rendered renders/${nameAtSize(id, SIZE)}.png`);
  } catch (error) {
    for (const ext of ["png", "svg"]) await rm(join(OUT, `${nameAtSize(id, SIZE)}.${ext}`), { force: true });
    refused.push({ id, why: error.message });
    console.log(`REFUSED — ${error.message}`);
  }
}
if (refused.length) process.exit(1);
