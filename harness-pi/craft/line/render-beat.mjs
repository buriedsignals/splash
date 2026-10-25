// The generic half of a line beat: art direction, treatments, render and refusals, taken from
// proof/co2-suisse/render-directions.mjs with everything about ITS subject removed. Everything
// about THIS story — data, reference level, words, checks — lives in ./beat.mjs, the one file the
// model writes. Copied into the beat by the harness; never edited by the model.
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
import { DirectedLine } from "./DirectedLine.tsx";
import beat from "./beat.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "renders");
const SIZE = exportSizeFromArgv();
const FRAME = directedFrame(SIZE);
assertBeatMayEnter(HERE, SIZE, { what: basename(HERE) });

const REQUIRED = ["eyebrow", "entity", "data", "unit", "format", "reference", "referenceLabel", "peakLabel", "title", "limits", "source", "alt", "check"];
const missing = REQUIRED.filter((key) => beat[key] === undefined);
if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")} (see CONTRACT.md)`);
beat.check();

// The component reads { year, mt }; the contract speaks { year, value }.
const data = beat.data.map((d) => ({ year: d.year, mt: d.value }));
const eras = beat.eras ?? [];
const facts = beatFacts(
  data.map((d) => ({ key: String(d.year), value: d.mt })),
  { namedSeries: [beat.entity], subject: beat.entity, reference: beat.reference, eras },
);
const offered = applicableTreatments(facts);
const last = data[data.length - 1];
const textPerRegister = {
  display: beat.title,
  eyebrow: beat.eyebrow,
  body: `${beat.limits} ${beat.source}`,
  axis: `${beat.unit} ${data.map((d) => d.year).join(" ")}`,
  annot: `${beat.referenceLabel} ${beat.peakLabel}`,
  value: `${last.year} · ${beat.format(last.mt)} ${beat.unit}`,
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
      element: createElement(DirectedLine, {
        frame: { width: FRAME.width, height: FRAME.height },
        data,
        title: beat.title,
        source: beat.source,
        alt: beat.alt,
        limits: beat.limits,
        eyebrow: beat.eyebrow,
        reference: beat.reference,
        referenceLabel: beat.referenceLabel,
        peakLabel: beat.peakLabel,
        unit: beat.unit,
        format: beat.format,
        direction,
        treatments: offered.map((t) => t.id),
        eras,
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
