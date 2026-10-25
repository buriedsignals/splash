// The generic half of a bar-and-column beat: art direction, treatments, render and refusals, taken
// from proof/static-bar-top-emitters-2024/render-directions.mjs with everything about ITS subject
// removed. Everything about THIS story — data, claim, words, checks — lives in ./beat.mjs, the one
// file the model writes. Copied into the beat by the harness; never edited by the model.
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
import { DirectedColumns } from "./DirectedColumns.tsx";
import beat from "./beat.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "renders");
const SIZE = exportSizeFromArgv();
const FRAME = directedFrame(SIZE);
assertBeatMayEnter(HERE, SIZE, { what: basename(HERE) });

const REQUIRED = ["eyebrow", "rows", "subject", "comparison", "comparisonSum", "comparisonNote", "format", "title", "limits", "source", "alt", "check"];
const missing = REQUIRED.filter((key) => beat[key] === undefined);
if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")} (see CONTRACT.md)`);
// The beat's own claim, checked against its own data BEFORE anything is drawn: a number that
// drifted from the data refuses the render rather than shipping a stale headline.
beat.check();

const facts = beatFacts(
  beat.rows.map((r) => ({ key: r.name, label: r.name, value: r.value })),
  {
    subject: beat.subject,
    bars: beat.rows.length,
    comparisonSet: beat.comparison.map((name) => ({ key: name })),
    namedSeries: beat.rows.map((r) => r.name),
    declaredSequence: null,
  },
);
const offered = applicableTreatments(facts);
const titles = [beat.title].flat();
const limits = [beat.limits].flat();
const textPerRegister = {
  display: titles.join(" "),
  eyebrow: beat.eyebrow,
  body: `${limits.join(" ")} ${beat.source}`,
  axis: "0",
  annot: `${beat.rows.map((r) => r.name).join(" ")} ${beat.comparisonNote}`,
  value: beat.rows.map((r) => beat.format(r.value)).join(" "),
};

const labelOf = (id) => id.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const newsroom = readPalette(HERE);
let chosen;
if (directionReachable(HERE)) {
  const run = readRunDirection(HERE);
  chosen = [{ label: labelOf(run.id), direction: run }];
} else {
  const composition = composeDirections({ newsroom, filed: filedDirections(), beat: { evidenceLevels: beat.evidenceLevels ?? 2 }, textPerRegister });
  if (!composition.offered.length) throw new Error(`no composed direction holds up for this beat:\n${composeReport(composition, {})}`);
  chosen = composition.offered.slice(0, 1).map((d) => ({ label: labelOf(d.id), direction: d }));
}

const refused = [];
for (const { label: id, direction: chosenDirection } of chosen) {
  const direction = resolveDirectionFamilies(chosenDirection, textPerRegister);
  try {
    await renderStill({
      element: createElement(DirectedColumns, {
        frame: { width: FRAME.width, height: FRAME.height },
        rows: beat.rows,
        subject: beat.subject,
        comparison: beat.comparison,
        comparisonSum: beat.comparisonSum,
        comparisonNote: beat.comparisonNote,
        format: beat.format,
        title: titles,
        limits,
        scope: beat.scope,
        keep: beat.keep ?? [beat.subject, ...beat.comparison],
        source: beat.source,
        alt: beat.alt,
        eyebrow: beat.eyebrow,
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
