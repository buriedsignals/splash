// The generic half of a small-multiples beat: art direction, treatments, render and refusals, taken
// from proof/static-small-multiples-lowcarbon/render-directions.mjs with everything about ITS subject
// removed. Everything about THIS story — panels, ceiling, words, checks — lives in ./beat.mjs, the one
// file the model writes. Copied into the beat by the harness; never edited by the model.
//
// The component carries the type's own refusals: too many panels for the frame, a panel name wider
// than its panel, and the between-panel gap that must be at least twice the gaps inside one panel.
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
import { DirectedSmallMultiples } from "./DirectedSmallMultiples.tsx";
import beat from "./beat.mjs";
import { applyStoryboard, assertNumbers, assertLegibleLabels, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
applyStoryboard(beat, dirname(fileURLToPath(import.meta.url)));

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "renders");
const SIZE = exportSizeFromArgv();
const FRAME = directedFrame(SIZE);
assertBeatMayEnter(HERE, SIZE, { what: basename(HERE) });

const REQUIRED = ["eyebrow", "panels", "states", "ceiling", "thread", "format", "formatDelta", "unit", "title", "limits", "reading", "source", "alt", "check"];
const missing = REQUIRED.filter((key) => beat[key] === undefined);
if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);

assertNumbers(beat.panels.flatMap((p) => [[`${p.name} from`, p.from], [`${p.name} to`, p.to]]));
assertNumbers([["ceiling", beat.ceiling]], "ceiling");

// THE TYPE'S OWN REFUSALS, each naming what to change in beat.mjs.
if (beat.panels.length < 2)
  throw new Error(`small multiples need at least two panels; panels holds ${beat.panels.length}. Use a bar or a line for one series`);
const names = beat.panels.map((p) => p.name);
const doubled = names.filter((n, i) => names.indexOf(n) !== i);
if (doubled.length)
  throw new Error(`two panels are both named ${doubled[0]}: each panel is one entity — filter data.json's rows so each name appears once`);
const largest = Math.max(...beat.panels.flatMap((p) => [p.from, p.to]));
const smallest = Math.min(...beat.panels.flatMap((p) => [p.from, p.to]));
if (smallest < 0)
  throw new Error(`a panel holds a negative value (${smallest}): the panels draw columns from zero; draw a diverging bar instead`);
if (!(beat.ceiling >= largest))
  throw new Error(`ceiling is ${beat.ceiling} but a panel reaches ${largest}: the one shared scale must hold every value — compute ceiling from the data (e.g. the next round 25 above the largest)`);
if (beat.ceiling > largest * 3)
  throw new Error(`ceiling is ${beat.ceiling} but the largest value is ${largest}: the shared scale would flatten every panel — compute ceiling from the data`);
const unknown = [beat.thread].flat().filter((n) => !names.includes(n));
if (unknown.length)
  throw new Error(`thread names ${unknown.join(", ")}, which is not a panel name; panel names are ${names.join(", ")}`);
for (const key of ["title", "limits", "reading"])
  if (![beat[key]].flat().length) throw new Error(`${key} must hold at least one form`);

const panels = beat.panels.map((p) => ({
  key: p.name,
  label: p.name,
  from: p.from,
  to: p.to,
  delta: p.to - p.from,
  thread: [beat.thread].flat().includes(p.name),
}));

assertLegibleLabels(panels.map((p) => p.delta), beat.formatDelta);
beat.check();
assertDrawsClaimColumn(panels.flatMap((p) => [p.from, p.to]), HERE);
assertHeadlineNumbersDrawn([beat.title].flat()[0], panels.flatMap((p) => [p.from, p.to, p.delta, Math.abs(p.delta)]), "panels");

const titles = [beat.title].flat();
const limits = [beat.limits].flat();
const reading = [beat.reading].flat();
const subject = panels.find((p) => p.thread) ?? panels[0];
const facts = beatFacts(
  panels.map((p) => ({ key: p.key, label: p.label, value: p.to })),
  {
    subject: subject.key,
    panels: { count: panels.length, sharedScale: true },
    pairs: panels.map((p) => ({ from: p.from, to: p.to })),
    scaleCeiling: beat.ceiling,
    declaredSequence: beat.sequence ?? `${beat.states.from} to ${beat.states.to}`,
  },
);
const offered = applicableTreatments(facts);
const textPerRegister = {
  display: titles.join(" "),
  eyebrow: beat.eyebrow,
  body: `${limits.join(" ")} ${beat.source}`,
  axis: beat.unit,
  annot: `${reading.join(" ")} ${beat.states.from} ${beat.states.to} ${panels.map((p) => p.label).join(" ")}`,
  value: panels.map((p) => beat.formatDelta(p.delta)).join(" "),
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
      element: createElement(DirectedSmallMultiples, {
        frame: { width: FRAME.width, height: FRAME.height },
        panels,
        states: beat.states,
        ceiling: beat.ceiling,
        title: titles,
        limits,
        reading,
        source: beat.source,
        alt: beat.alt,
        eyebrow: beat.eyebrow,
        format: beat.format,
        formatDelta: beat.formatDelta,
        unit: beat.unit,
        direction,
        treatments: offered.map((t) => t.id),
        onLadder: (note) => console.log(`  ${note}`),
        ...(beat.foldNote ? { foldNote: beat.foldNote } : {}),
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
