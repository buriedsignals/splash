// The generic half of a treemap beat: art direction, treatments, render and refusals, taken from
// proof/static-treemap-europe-capacity/render-directions.mjs with everything about ITS subject
// removed. Everything about THIS story — data, thread, words, checks — lives in ./beat.mjs, the one
// file the model writes. Copied into the beat by the harness; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs [--size landscape|square|portrait]
import { existsSync, readFileSync } from "node:fs";
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
import { DirectedTreemap } from "./DirectedTreemap.tsx";
import beat from "./beat.mjs";
import { applyStoryboard, assertNumbers, assertLegibleLabels, assertHeadlineNumbersDrawn, assertDrawsClaimColumn, errorText } from "./guards.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
applyStoryboard(beat, HERE);
const OUT = join(HERE, "renders");
const SIZE = exportSizeFromArgv();
const FRAME = directedFrame(SIZE);
assertBeatMayEnter(HERE, SIZE, { what: basename(HERE) });

const REQUIRED = ["eyebrow", "cells", "format", "unit", "threadNote", "restLabel", "threadRestLabel", "title", "limits", "source", "alt", "check"];
const missing = REQUIRED.filter((key) => beat[key] === undefined);
if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
if (!Array.isArray(beat.cells) || !beat.cells.length) throw new Error("cells must be a non-empty array of { name, value, thread, count? }");

const cells = [...beat.cells].sort((a, b) => b.value - a.value);
assertNumbers(cells.map((c) => [c.name, c.value]), "cells");
// An area cannot be zero or negative: a cell of -3 has no rectangle.
const nonPositive = cells.filter((c) => !(c.value > 0));
if (nonPositive.length)
  throw new Error(`cells ${nonPositive.slice(0, 3).map((c) => `${c.name}=${c.value}`).join(", ")} are not positive: a treemap's area cannot be zero or negative — leave those rows out (say so in the standfirst) or choose another chart`);
const names = new Set();
for (const c of cells) {
  if (names.has(c.name)) throw new Error(`two cells are named ${JSON.stringify(c.name)}: add up the rows of one item into ONE cell`);
  names.add(c.name);
}
const thread = cells.filter((c) => c.thread === true);
if (!thread.length) throw new Error("no cell has thread: true — the accent marks the cells the takeaway is about; set thread on them");
if (thread.length === cells.length) throw new Error("every cell has thread: true — an accent on everything is no accent; set thread only on the cells the takeaway is about");
// The type's own refusal: the accent is a thread, never the maximum.
if (cells[0].thread)
  throw new Error(`the largest cell (${cells[0].name}) is in the accented thread: the colour would then read as a highlight on the maximum. A treemap's accent must mark a thread that does not include the largest cell — if the takeaway is about the largest item, use a bar chart instead`);
if (cells.length > 60) throw new Error(`${cells.length} cells: add the items up to at most 60 (the plate folds what does not fit into a remainder, but beyond that the items are not one picture)`);

assertLegibleLabels(cells.map((c) => c.value), beat.format);
beat.check();
// The claim-column guard applies only when each cell IS one row of data.json (no aggregation).
const table = existsSync(join(HERE, "data.json")) ? JSON.parse(readFileSync(join(HERE, "data.json"), "utf8")) : null;
if (table && table.rows.length === cells.length) assertDrawsClaimColumn(cells.map((c) => c.value), HERE);
const titles = [beat.title].flat();
const total = cells.reduce((s, c) => s + c.value, 0);
// The plate also prints the thread's count (threadNote) and the item count, so those may be stated.
assertHeadlineNumbersDrawn(titles[0], [...cells.map((c) => c.value), thread.reduce((s, c) => s + c.value, 0), thread.length, cells.length, total], "cells");

const limits = [beat.limits].flat();
const reading = beat.reading === undefined ? [] : [beat.reading].flat();
const basisOf = typeof beat.basis === "function" ? beat.basis : () => "";
const drawnCells = cells.map((c, i) => ({
  key: `${i}-${c.name}`,
  name: c.name,
  mw: c.value,
  sites: Number(c.count ?? 0),
  tipped: c.thread === true,
  value: beat.format(c.value),
  basis: basisOf(Number(c.count ?? 0)),
}));

const facts = beatFacts(
  cells.map((c) => ({ key: c.name, label: c.name, value: c.value })),
  {
    subject: thread[0].name,
    comparisonSet: thread.map((c) => c.name),
    units: { count: cells.length, thing: beat.unit },
    declaredSequence: beat.unit,
  },
);
const offered = applicableTreatments(facts);
const textPerRegister = {
  display: titles.join(" "),
  eyebrow: beat.eyebrow,
  body: `${limits.join(" ")} ${beat.source}`,
  axis: `${beat.unit} ${beat.threadNote} ${drawnCells.map((c) => c.basis).join(" ")} ${basisOf(cells.reduce((s, c) => s + Number(c.count ?? 0), 0))}`,
  annot: `${reading.join(" ")} ${drawnCells.map((c) => c.name).join(" ")} ${beat.restLabel} ${beat.threadRestLabel} 0123456789`,
  value: `${drawnCells.map((c) => c.value).join(" ")} ${beat.format(total)}`,
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
      element: createElement(DirectedTreemap, {
        frame: { width: FRAME.width, height: FRAME.height },
        cells: drawnCells,
        unit: beat.unit,
        threadNote: beat.threadNote,
        restLabel: beat.restLabel,
        threadRestLabel: beat.threadRestLabel,
        formatTotal: beat.format,
        basisOf,
        title: titles,
        limits,
        reading,
        source: beat.source,
        alt: typeof beat.alt === "function" ? beat.alt(cells) : beat.alt,
        eyebrow: beat.eyebrow,
        direction,
        treatments: offered.map((t) => t.id),
        onLadder: (note) => console.log(note),
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
    console.log(`REFUSED — ${errorText(error)}`);
  }
}
if (refused.length) process.exit(1);
