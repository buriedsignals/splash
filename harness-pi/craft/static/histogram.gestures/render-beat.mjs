// The generic half of a Units-family GESTURE plate (craft/gestures/GRAMMAR.md F5), variant `histogram`: the per-type
// kit's runner with its fixed staging (the threshold callout, the thread blocks) replaced by the beat's `gestures`.
// Guard order: applyStoryboard → REQUIRED → the partition (built once, adapting to the data's shape and saying so)
// → check() on the counted groups and the shared guards → the gesture core with the family's hooks (validateGestures,
// claim read from STORYBOARD.md) → the static scheduler (composeUnitsStatic) → render. A gesture refusal prints
// REFUSED with the beat.mjs field and a value that works; with SPLASH_GESTURE_REPAIR=1 the refusal's fix is applied
// instead ("REPAIRED gestures: <field> → <fix>") and the list staged again, at most 12 times. Nothing here refuses
// the data's SHAPE (how many readings, a tail, a gap between blocks): the partition and the plate adapt to it.
// Everything about THIS story lives in ./beat.mjs, the one file the model writes. Copied into the beat by the
// harness; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs [--size landscape|square|portrait]
import { existsSync, readFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderStill } from "#shared/chart-beat/render-still.mjs";
import { readPalette } from "#shared/chart-beat/colour.mjs";
import { composeDirections, filedDirections, report as composeReport, resolveDirectionFamilies } from "#shared/design-base/index.mjs";
import { directionReachable, readRunDirection } from "#shared/design-base/run-direction.mjs";
import { assertBeatMayEnter, directedFrame, exportSizeFromArgv, nameAtSize } from "#shared/chart-beat/directed-size.mjs";
import { GestureUnitsStatic } from "./GestureUnitsStatic.tsx";
import { GestureRefusal } from "./gesture-core.mjs";
import { headlineFigures, partitionOf, refusalText, runUnitsCheck, stageUnits } from "./gesture-family-units.mjs";
import { composeUnitsStatic } from "./gesture-units-static.mjs";
import { applyStoryboard, assertDrawsClaimColumn, assertHeadlineNumbersDrawn, assertNumbers, errorText, importBeat, rowFacts } from "./guards.mjs";

const VARIANT = "histogram";
const PARTITION = VARIANT === "histogram" ? ["binWidth", "binCount"] : ["blocks"];

const HERE = dirname(fileURLToPath(import.meta.url));
const beat = await importBeat(HERE).catch((error) => {
  console.log(`REFUSED — ${errorText(error)}`);
  process.exit(1);
});
const refuse = (text) => {
  console.log(`REFUSED — ${text}`);
  process.exit(1);
};
try {
  applyStoryboard(beat, HERE);
} catch (error) {
  refuse(errorText(error));
}
const OUT = join(HERE, "renders");
const SIZE = exportSizeFromArgv();
const FRAME = directedFrame(SIZE);
assertBeatMayEnter(HERE, SIZE, { what: basename(HERE) });

const REQUIRED = ["eyebrow", "units", "gestures", "unit", "title", "limits", "source", "alt", "check", ...PARTITION];
if (beat.units === undefined && beat.observations !== undefined) beat.units = beat.observations;
const missing = REQUIRED.filter((key) => beat[key] === undefined);
if (missing.length) refuse(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
if (!Array.isArray(beat.units) || !beat.units.length) refuse("beat.mjs: units must be a non-empty array of { name, value }, one per counted thing");
if (!Array.isArray(beat.gestures)) refuse("beat.mjs: gestures must be an array of { do, mark | marks, … } (see CONTRACT.md)");

// ── the partition, built once, and the claim checked against the counted groups before anything is drawn
let partition;
try {
  assertNumbers(beat.units.map((u, i) => [u.name ?? u.label ?? i, Number(u.value)]), "units");
  partition = partitionOf(beat, VARIANT);
  for (const line of partition.adapted) console.log(`  adapted: ${line}`);
  runUnitsCheck(beat, partition);
  assertDrawsClaimColumn(partition.groups.flatMap((g) => g.units.map((u) => u.value)), HERE);
  assertHeadlineNumbersDrawn([beat.title].flat()[0], headlineFigures(partition), "groups");
} catch (error) {
  refuse(errorText(error));
}

const front = (() => {
  const file = join(HERE, "..", "..", "STORYBOARD.md");
  const text = existsSync(file) ? readFileSync(file, "utf8").split("---")[1] ?? "" : "";
  return (key) => text.match(new RegExp(`^${key}:\\s*"?(.*?)"?\\s*$`, "m"))?.[1]?.replace(/\\"/g, '"');
})();
const claim = {
  takeaway: front("takeaway") ?? [beat.title].flat()[0],
  subject: front("subject"),
  comparison: front("comparison"),
  entity: front("claimEntity"),
  versus: front("claimVersus"),
  facts: rowFacts(HERE),
};
const format = typeof beat.format === "function" ? (v) => String(beat.format(v)) : (v) => String(v);
let staged;
try {
  staged = stageUnits({
    gestures: beat.gestures,
    partition,
    claim,
    format: "static",
    repair: process.env.SPLASH_GESTURE_REPAIR === "1",
    schedule: (valid) => composeUnitsStatic({ gestures: valid, groups: partition.groups }),
  });
} catch (error) {
  if (!(error instanceof GestureRefusal)) refuse(errorText(error));
  refuse(refusalText(error));
}
for (const r of staged.repairs) console.log(`REPAIRED gestures: ${r.field} → ${JSON.stringify(r.fix)}`);
const plate = staged.scheduled;
console.log(`  ${partition.groups.length} groups, ${partition.total} units · gestures: ${staged.valid.map((g) => `${g.do}${g.marks.length ? ` ${g.marks.join(", ")}` : ""}`).join(" · ")}`);

const titles = [beat.title].flat();
const limits = [beat.limits].flat();
const textPerRegister = {
  display: titles.join(" "),
  eyebrow: beat.eyebrow,
  body: `${limits.join(" ")} ${beat.source}`,
  axis: `${partition.groups.map((g) => g.name).join(" ")} ${beat.unit} ${beat.unitIs ?? ""}`,
  annot: [...plate.notes.map((n) => n.text), ...plate.captions.map((c) => c.text), ...plate.brackets.map((b) => b.text), ...plate.references.map((r) => r.text ?? "")].join(" ") || beat.unit,
  value: partition.groups.map((g) => format(g.count)).join(" "),
};

const labelOf = (id) => id.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
let chosen;
if (directionReachable(HERE)) {
  const run = readRunDirection(HERE);
  chosen = { label: labelOf(run.id), direction: run };
} else {
  const composition = composeDirections({ newsroom: readPalette(HERE), filed: filedDirections(), beat: { evidenceLevels: beat.evidenceLevels ?? 2 }, textPerRegister });
  if (!composition.offered.length) refuse(`no composed direction holds up for this beat:\n${composeReport(composition, {})}`);
  chosen = { label: labelOf(composition.offered[0].id), direction: composition.offered[0] };
}
const direction = resolveDirectionFamilies(chosen.direction, textPerRegister);
const counts = Object.fromEntries(partition.groups.map((g) => [g.key, g.count]));
const alt = typeof beat.alt === "function" ? beat.alt({ groups: partition.groups, counts, total: partition.total }) : beat.alt;
const name = nameAtSize(chosen.label, SIZE);
try {
  await renderStill({
    element: createElement(GestureUnitsStatic, {
      variant: VARIANT,
      frame: { width: FRAME.width, height: FRAME.height },
      groups: partition.groups,
      plate,
      title: titles,
      limits,
      unit: beat.unit,
      unitIs: beat.unitIs,
      source: beat.source,
      alt,
      eyebrow: beat.eyebrow,
      direction,
      format,
    }),
    width: FRAME.width,
    height: FRAME.height,
    outDir: OUT,
    name,
    scale: FRAME.scale,
  });
  console.log(`rendered renders/${name}.png`);
  console.log(`look at: ${join(OUT, `${name}.png`)}`);
} catch (error) {
  for (const ext of ["png", "svg"]) await rm(join(OUT, `${name}.${ext}`), { force: true });
  refuse(errorText(error));
}
