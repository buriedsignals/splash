// The generic half of a parallel-coordinates beat: scales, art direction, treatments, render and
// refusals, taken from proof/static-parallel-coordinates-electricity-mix/render-directions.mjs with
// everything about ITS subject removed. Everything about THIS story — data, axis order, thread,
// words, checks — lives in ./beat.mjs, the one file the model writes. Copied into the beat by the
// harness; never edited by the model.
//
// Only ADJACENT axes show a relationship, so the two axes the claim is about must be neighbours,
// and the correlation between them is MEASURED here and handed to check().
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
import { DirectedParallelCoordinates } from "./DirectedParallelCoordinates.tsx";
import beat from "./beat.mjs";
import { applyStoryboard, assertNumbers, assertHeadlineNumbersDrawn, assertDrawsClaimColumn, errorText } from "./guards.mjs";
applyStoryboard(beat, dirname(fileURLToPath(import.meta.url)));

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "renders");
const SIZE = exportSizeFromArgv();
const FRAME = directedFrame(SIZE);
assertBeatMayEnter(HERE, SIZE, { what: basename(HERE) });

const REQUIRED = ["eyebrow", "axes", "lines", "thread", "claimAxes", "unit", "threadNote", "title", "limits", "reading", "source", "alt", "check"];
const missing = REQUIRED.filter((key) => beat[key] === undefined);
if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);

// THE TYPE'S OWN REFUSALS — what this component cannot draw honestly.
const axisKeys = beat.axes.map((a) => a.key);
if (beat.axes.length < 3 || beat.axes.length > 9)
  throw new Error(`axes holds ${beat.axes.length} axes; parallel coordinates need 3 to 9. With two measures, draw a scatter or a slope instead`);
if (new Set(axisKeys).size !== axisKeys.length) throw new Error(`two axes share a key (${axisKeys.join(", ")})`);
if (beat.lines.length < 3 || beat.lines.length > 30)
  throw new Error(`lines holds ${beat.lines.length} entities; this plate names every line and can carry 3 to 30. Keep the thread and the largest others, and say in limits how many of how many are drawn`);
const lineKeys = beat.lines.map((l) => l.key);
if (new Set(lineKeys).size !== lineKeys.length) throw new Error(`two lines share a key: one line per entity — filter data.json to one row per entity (one year)`);
for (const l of beat.lines) {
  const absent = axisKeys.filter((k) => !(k in l.values));
  if (absent.length) throw new Error(`line ${l.key} has no value for ${absent.join(", ")}: every line crosses every axis`);
}
assertNumbers(beat.lines.flatMap((l) => axisKeys.map((k) => [`${l.key}.${k}`, l.values[k]])), "line values");
const negative = beat.lines.flatMap((l) => axisKeys.filter((k) => l.values[k] < 0).map((k) => `${l.key}.${k}`));
if (negative.length) throw new Error(`${negative.slice(0, 3).join(", ")} are negative: every axis here runs from 0 up`);
const thread = [beat.thread].flat();
if (thread.length < 1 || thread.length > 3)
  throw new Error(`thread names ${thread.length} lines; the accent carries 1 to 3 — the lines the takeaway is about`);
const unknown = thread.filter((k) => !lineKeys.includes(k));
if (unknown.length) throw new Error(`thread names ${unknown.join(", ")}, which are not keys of lines (${lineKeys.slice(0, 6).join(", ")}…)`);
const [ca, cb] = beat.claimAxes;
const ia = axisKeys.indexOf(ca);
const ib = axisKeys.indexOf(cb);
if (ia < 0 || ib < 0) throw new Error(`claimAxes ${JSON.stringify(beat.claimAxes)} must be two keys of axes (${axisKeys.join(", ")})`);
if (Math.abs(ia - ib) !== 1)
  throw new Error(`claimAxes ${ca} and ${cb} are not neighbours (positions ${ia + 1} and ${ib + 1}): only adjacent axes show a relationship — reorder axes so they sit side by side, first if you can`);

// The correlation between the two claim axes, across every line drawn.
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const xs = beat.lines.map((l) => l.values[ca]);
const ys = beat.lines.map((l) => l.values[cb]);
const [mx, my] = [mean(xs), mean(ys)];
const den = Math.sqrt(xs.reduce((s, x) => s + (x - mx) ** 2, 0) * ys.reduce((s, y) => s + (y - my) ** 2, 0));
const r = den ? xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) / den : 0;

beat.check({ lines: beat.lines, r });
// The claim column, when the journalist named one, is one of the two axes the claim relates.
const claimErrors = [];
for (const k of [ca, cb]) {
  try {
    assertDrawsClaimColumn(beat.lines.map((l) => l.values[k]), HERE);
    claimErrors.length = 0;
    break;
  } catch (error) {
    claimErrors.push(error.message);
  }
}
if (claimErrors.length === 2) throw new Error(claimErrors[0]);
const allValues = beat.lines.flatMap((l) => axisKeys.map((k) => l.values[k]));
assertHeadlineNumbersDrawn([beat.title].flat()[0], [...allValues, thread.length, beat.lines.length], "lines");

/** EACH AXIS KEEPS ITS OWN SCALE, fitted to its own column and rounded outward to a readable top. */
const stepFor = (top) => beat.ceilingStep ?? (top > 10 ? 10 : [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5].find((s) => s >= top / 5) ?? 10);
const axes = beat.axes.map((a, i) => {
  const top = Math.max(...beat.lines.map((l) => l.values[a.key]));
  const step = stepFor(top);
  return { name: a.name, ceiling: Math.max(step, Math.round(Math.ceil(top / step) * step * 1e9) / 1e9), index: i };
});
const lines = beat.lines.map((l) => ({ code: l.key, name: l.name, values: axisKeys.map((k) => l.values[k]), thread: thread.includes(l.key) }));
const subject = lines.find((l) => l.code === thread[0]);

const facts = beatFacts(
  lines.map((l) => ({ key: l.code, label: l.name, value: l.values[0] })),
  {
    subject: subject.name,
    comparisonSet: thread,
    namedSeries: beat.axes.map((a) => a.name),
    declaredSequence: beat.unit,
  },
);
const offered = applicableTreatments(facts);

const titles = [beat.title].flat();
const limits = [beat.limits].flat();
const reading = [beat.reading].flat();
const formatCeiling = beat.formatCeiling ?? ((v) => `${v} %`);
const textPerRegister = {
  display: titles.join(" "),
  eyebrow: beat.eyebrow,
  body: `${limits.join(" ")} ${beat.source}`,
  axis: `${beat.unit} ${beat.threadNote} ${axes.map((a) => `${a.name} ${formatCeiling(a.ceiling)}`).join(" ")} 0`,
  annot: `${reading.join(" ")} ${lines.map((l) => l.name).join(" ")}`,
  value: lines.map((l) => String(l.values[0])).join(" "),
};

const labelOf = (id) => id.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const newsroom = readPalette(HERE);
let chosen;
if (directionReachable(HERE)) {
  const run = readRunDirection(HERE);
  chosen = [{ label: labelOf(run.id), direction: run }];
} else {
  const composition = composeDirections({ newsroom, filed: filedDirections(), beat: { evidenceLevels: beat.evidenceLevels ?? 4 }, textPerRegister });
  if (!composition.offered.length) throw new Error(`no composed direction holds up for this beat:\n${composeReport(composition, {})}`);
  chosen = composition.offered.slice(0, 1).map((d) => ({ label: labelOf(d.id), direction: d }));
}

const alt = typeof beat.alt === "function" ? beat.alt({ lines: beat.lines, r }) : beat.alt;
const refused = [];
for (const { label: id, direction: chosenDirection } of chosen) {
  const direction = resolveDirectionFamilies(chosenDirection, textPerRegister);
  let unnamed = null;
  try {
    await renderStill({
      element: createElement(DirectedParallelCoordinates, {
        frame: { width: FRAME.width, height: FRAME.height },
        axes,
        lines,
        unit: beat.unit,
        threadNote: beat.threadNote,
        title: titles,
        limits,
        reading,
        source: beat.source,
        alt,
        eyebrow: beat.eyebrow,
        direction,
        treatments: offered.map((t) => t.id),
        formatCeiling,
        onLadder: (note) => {
          console.log(`  ${note}`);
          unnamed = Number(note.match(/(\d+) unnamed/)?.[1] ?? 0);
        },
      }),
      width: FRAME.width,
      height: FRAME.height,
      outDir: OUT,
      name: nameAtSize(id, SIZE),
      scale: FRAME.scale,
    });
    console.log(`rendered renders/${nameAtSize(id, SIZE)}.png`);
    if (unnamed) console.log(`  note: ${unnamed} line(s) could not be named on the plate (thread lines are seated first; look at the PNG to see which names are missing)`);
  } catch (error) {
    for (const ext of ["png", "svg"]) await rm(join(OUT, `${nameAtSize(id, SIZE)}.${ext}`), { force: true });
    refused.push({ id, why: error.message });
    console.log(`REFUSED — ${errorText(error)}`);
  }
}
if (refused.length) process.exit(1);
