// The generic half of a diverging stacked bar (Likert) beat: art direction, treatments, render and
// refusals, taken from proof/static-diverging-stacked-electricity/render-directions.mjs with
// everything about ITS subject removed. Everything about THIS story — data, the sides, words,
// checks — lives in ./beat.mjs, the one file the model writes. Copied into the beat by the harness;
// never edited by the model.
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
import { DirectedDivergingStack } from "./DirectedDivergingStack.tsx";
import beat from "./beat.mjs";
import { applyStoryboard, assertNumbers, assertLegibleLabels, assertHeadlineNumbersDrawn } from "./guards.mjs";
applyStoryboard(beat, dirname(fileURLToPath(import.meta.url)));

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "renders");
const SIZE = exportSizeFromArgv();
const FRAME = directedFrame(SIZE);
assertBeatMayEnter(HERE, SIZE, { what: basename(HERE) });

const REQUIRED = ["eyebrow", "rows", "subject", "leftName", "rightName", "centreName", "unit", "format", "title", "limits", "reading", "source", "alt", "check"];
const missing = REQUIRED.filter((key) => beat[key] === undefined);
if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);

const rows = beat.rows;
if (!Array.isArray(rows) || rows.length < 2) throw new Error(`rows holds ${rows?.length ?? 0} row(s); a diverging stack compares at least two`);
for (const r of rows) {
  if (!r || typeof r.key !== "string" || typeof r.label !== "string" || !Array.isArray(r.left) || !Array.isArray(r.right) || !r.centre)
    throw new Error(`every row is { key, label, left: [levels], centre: level, right: [levels] }; got ${JSON.stringify(r).slice(0, 120)}`);
}
const levelsOf = (r) => [...r.left, r.centre, ...r.right];
assertNumbers(rows.flatMap((r) => levelsOf(r).map((l) => [`${r.key}/${l.key}`, l.value])));

/** THE RAMP IS ONE CLASSIFICATION. Every row carries the same levels in the same order, ordered
 *  OUTWARD from the centre, or the deepest step of a side means a different thing on each row. */
const shape = (r) => `${r.left.map((l) => l.key).join("|")} / ${r.centre.key} / ${r.right.map((l) => l.key).join("|")}`;
const odd = rows.find((r) => shape(r) !== shape(rows[0]));
if (odd) throw new Error(`row ${odd.key} carries levels ${shape(odd)}, but ${rows[0].key} carries ${shape(rows[0])}: every row must have the same left, centre and right levels, in the same order`);
if (!rows[0].left.length || !rows[0].right.length) throw new Error(`each side needs at least one level (left has ${rows[0].left.length}, right ${rows[0].right.length})`);

/** EACH ROW IS A WHOLE. A diverging stack draws one row as 100 %; a row whose levels do not add up
 *  to it is a partial mix, and its lean is wrong by whatever is missing. */
const negative = rows.flatMap((r) => levelsOf(r).filter((l) => l.value < 0).map((l) => `${r.key}/${l.key}=${l.value}`));
if (negative.length) throw new Error(`a share cannot be negative: ${negative.slice(0, 3).join(", ")}`);
for (const r of rows) {
  const sum = levelsOf(r).reduce((s, l) => s + l.value, 0);
  if (Math.abs(sum - 100) > 0.5)
    throw new Error(`row ${r.key}: its levels add up to ${sum.toFixed(2)}, not 100. Draw each level as a share of the row's own total (value / total * 100), and classify every column of the row into left, centre or right`);
}
if (!rows.some((r) => r.key === beat.subject))
  throw new Error(`subject "${beat.subject}" is not the key of a row; the keys are ${rows.map((r) => r.key).join(", ")}`);

const totals = rows.flatMap((r) => [r.left.reduce((s, l) => s + l.value, 0), r.centre.value, r.right.reduce((s, l) => s + l.value, 0)]);
assertLegibleLabels(totals, beat.format);
beat.check();
// The headline's figures are row totals or levels. (No claim-column guard: what is drawn is each
// level's SHARE of its row, computed by definition of the type, never a raw column.)
assertHeadlineNumbersDrawn([beat.title].flat()[0], [...totals, ...rows.flatMap((r) => levelsOf(r).map((l) => l.value))], "shares");

const title = [beat.title].flat();
const limits = [beat.limits].flat();
const reading = [beat.reading].flat();
const facts = beatFacts(
  rows.map((r) => ({ key: r.key, label: r.label, value: r.right.reduce((s, l) => s + l.value, 0) - r.left.reduce((s, l) => s + l.value, 0) })),
  {
    subject: beat.subject,
    sides: { left: rows[0].left.length, right: rows[0].right.length, centre: rows[0].centre.key },
    namedSeries: rows.map((r) => r.label),
    declaredSequence: beat.declaredSequence ?? `${beat.leftName} share`,
  },
);
const offered = applicableTreatments(facts);
const textPerRegister = {
  display: title.join(" "),
  eyebrow: beat.eyebrow,
  body: `${limits.join(" ")} ${beat.source}`,
  axis: `100 50 0 50 100 ${beat.unit}`,
  annot: `${rows.map((r) => r.label).join(" ")} ${reading.join(" ")} ${beat.leftName} ${beat.rightName} ${beat.centreName}`,
  value: rows.map((r) => `${beat.format(r.left.reduce((s, l) => s + l.value, 0))} ${beat.format(r.right.reduce((s, l) => s + l.value, 0))}`).join(" "),
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
      element: createElement(DirectedDivergingStack, {
        frame: { width: FRAME.width, height: FRAME.height },
        rows,
        subject: beat.subject,
        leftName: beat.leftName,
        rightName: beat.rightName,
        centreName: beat.centreName,
        unit: beat.unit,
        title,
        limits,
        reading,
        source: beat.source,
        onLadder: (l) => console.log(`  ${l}`),
        alt: beat.alt,
        eyebrow: beat.eyebrow,
        format: beat.format,
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
