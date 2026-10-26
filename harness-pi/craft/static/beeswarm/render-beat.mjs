// The generic half of a beeswarm beat: art direction, treatments, render and refusals, taken from
// proof/static-beeswarm-co2-per-person/render-directions.mjs with everything about ITS subject
// removed. Everything about THIS story — the marks, the marker, the callouts, words, checks — lives
// in ./beat.mjs, the one file the model writes. Copied into the beat by the harness; never edited by
// the model.
//
// Usage:  bun <beat>/render-beat.mjs [--size landscape|square|portrait]
import { rm } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { scaleLinear } from "d3-scale";
import { renderStill } from "#shared/chart-beat/render-still.mjs";
import { readPalette } from "#shared/chart-beat/colour.mjs";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { composeDirections, filedDirections, report as composeReport, resolveDirectionFamilies } from "#shared/design-base/index.mjs";
import { directionReachable, readRunDirection } from "#shared/design-base/run-direction.mjs";
import { assertBeatMayEnter, directedFrame, exportSizeFromArgv, nameAtSize } from "#shared/chart-beat/directed-size.mjs";
import { DirectedBeeswarm } from "./DirectedBeeswarm.tsx";
import beat from "./beat.mjs";
import { applyStoryboard, assertNumbers, assertDrawsClaimColumn } from "./guards.mjs";
applyStoryboard(beat, dirname(fileURLToPath(import.meta.url)));

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "renders");
const SIZE = exportSizeFromArgv();
const FRAME = directedFrame(SIZE);
assertBeatMayEnter(HERE, SIZE, { what: basename(HERE) });

const REQUIRED = ["eyebrow", "marks", "marker", "markerLabel", "callouts", "axisName", "title", "limits", "reading", "source", "alt", "check"];
const missing = REQUIRED.filter((key) => beat[key] === undefined);
if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);

// ── the marks, refused before anything is drawn ─────────────────────────────
if (!Array.isArray(beat.marks) || beat.marks.length < 10)
  throw new Error(`marks holds ${beat.marks?.length ?? 0} units: a beeswarm needs one mark per unit of the population (ten or more) — with fewer, draw a dot strip or a bar chart`);
assertNumbers(beat.marks.map((m) => [m.name, m.value]), "marks' values");
assertNumbers(beat.marks.map((m) => [m.name, m.size]), "marks' sizes");
// The axis starts at zero and the circle's AREA is its size: a negative value has no seat on this
// axis, and a zero or negative size has no area.
const negative = beat.marks.filter((m) => m.value < 0);
if (negative.length)
  throw new Error(`marks hold negative values (${negative.slice(0, 3).map((m) => `${m.name}=${m.value}`).join(", ")}): this swarm's axis starts at zero — draw a measure that cannot be negative, or use a diverging chart`);
const sizeless = beat.marks.filter((m) => !(m.size > 0));
if (sizeless.length)
  throw new Error(`marks hold sizes that are not positive (${sizeless.slice(0, 3).map((m) => `${m.name}=${m.size}`).join(", ")}): size is the circle's area (e.g. population); leave out the rows the data cannot give and say so in the standfirst`);
const names = new Set();
for (const m of beat.marks) {
  if (names.has(m.name)) throw new Error(`two marks are named ${JSON.stringify(m.name)}: one mark per unit — filter data.json's rows to one per unit (one year, one group)`);
  names.add(m.name);
}
if (!Number.isFinite(beat.marker)) throw new Error(`marker is ${JSON.stringify(beat.marker)}: compute the reference value (e.g. a weighted mean) from data.json`);
const top = Math.max(...beat.marks.map((m) => m.value));
if (beat.marker < 0 || beat.marker > top)
  throw new Error(`marker ${beat.marker} sits outside the drawn values (0 to ${top}): the rule is drawn inside the field`);
if (!Array.isArray(beat.callouts) || beat.callouts.length < 1 || beat.callouts.length > 3)
  throw new Error(`callouts holds ${beat.callouts?.length ?? 0} cards: name one to three marks — the ones the eye lands on (the largest, the farthest, the subject)`);
for (const c of beat.callouts) {
  if (!names.has(c.name)) throw new Error(`callout ${JSON.stringify(c.name)} names no mark: its name must be one of the marks' names`);
  if (!Array.isArray(c.lines)) throw new Error(`callout ${JSON.stringify(c.name)} has no lines: give it [] or one or two computed facts`);
}
beat.check();
assertDrawsClaimColumn(beat.marks.map((m) => m.value), HERE);
// assertHeadlineNumbersDrawn is NOT called: a swarm's headline states counts, thresholds and shares
// of the population (aggregates), never one mark's value, so the guard would refuse a true title.

// The axis ticks: the beat's own, or round steps up to the largest value.
const ticks = beat.ticks ?? scaleLinear().domain([0, top]).nice(5).ticks(5);
const tickFormat = beat.tickFormat ?? String;

// The component reads { code, entity, tonnes, people }; the contract speaks { name, value, size }.
const marks = beat.marks.map((m) => ({ code: m.name, entity: m.name, tonnes: m.value, people: m.size }));
const callouts = beat.callouts.map((c) => ({ code: c.name, name: c.label ?? c.name, lines: c.lines }));
const titles = [beat.title].flat();
const limits = [beat.limits].flat();
const reading = [beat.reading].flat().filter((r) => r !== "");
const biggest = beat.marks.reduce((a, b) => (b.size > a.size ? b : a));

const facts = beatFacts(
  beat.marks.map((m) => ({ key: m.name, label: m.name, value: m.value })),
  {
    subject: biggest.name,
    continuousAxis: true,
    markers: [{ key: "marker", label: beat.markerLabel, value: beat.marker }],
    observations: beat.marks.map((m) => ({ key: m.name, value: m.value })),
    declaredSequence: beat.axisName,
  },
);
const offered = applicableTreatments(facts);
const textPerRegister = {
  display: titles.join(" "),
  eyebrow: beat.eyebrow,
  body: `${limits.join(" ")} ${beat.source}`,
  axis: `${beat.axisName} ${ticks.map(tickFormat).join(" ")} ${beat.markerLabel}`,
  annot: `${reading.join(" ")} ${callouts.map((c) => `${c.name} ${c.lines.join(" ")}`).join(" ")}`,
  value: callouts.map((c) => c.name).join(" "),
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

const refused = [];
for (const { label: id, direction: chosenDirection } of chosen) {
  const direction = resolveDirectionFamilies(chosenDirection, textPerRegister);
  try {
    await renderStill({
      element: createElement(DirectedBeeswarm, {
        frame: { width: FRAME.width, height: FRAME.height },
        marks,
        callouts,
        mean: beat.marker,
        markerLabel: beat.markerLabel,
        axisName: beat.axisName,
        title: titles,
        limits,
        reading: reading.length ? reading : [""],
        source: beat.source,
        alt: typeof beat.alt === "function" ? beat.alt(marks) : beat.alt,
        eyebrow: beat.eyebrow,
        direction,
        treatments: offered.map((t) => t.id),
        ticks,
        tickFormat,
        onLadder: (note) => console.log(`  ${note}`),
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
