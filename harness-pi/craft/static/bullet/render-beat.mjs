// The generic half of a bullet beat: art direction, treatments, render and refusals, taken from
// proof/static-bullet-low-carbon-share/render-directions.mjs with everything about ITS subject
// removed. Everything about THIS story — the rows, the two states, words, checks — lives in
// ./beat.mjs, the one file the model writes. Copied into the beat by the harness; never edited by
// the model.
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
import { DirectedBullet } from "./DirectedBullet.tsx";
import beat from "./beat.mjs";
import { applyStoryboard, assertNumbers, assertLegibleLabels, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
applyStoryboard(beat, dirname(fileURLToPath(import.meta.url)));

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "renders");
const SIZE = exportSizeFromArgv();
const FRAME = directedFrame(SIZE);
assertBeatMayEnter(HERE, SIZE, { what: basename(HERE) });

const REQUIRED = ["eyebrow", "rows", "subject", "ceiling", "markerName", "measureName", "unit", "format", "verdict", "title", "limits", "reading", "source", "alt", "check"];
const missing = REQUIRED.filter((key) => beat[key] === undefined);
if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);

// ── the rows, refused before anything is drawn ──────────────────────────────
if (!Array.isArray(beat.rows) || beat.rows.length < 2 || beat.rows.length > 12)
  throw new Error(`rows holds ${beat.rows?.length ?? 0} rows: a bullet chart compares two to twelve rows — keep the ones the takeaway is about`);
assertNumbers(beat.rows.map((r) => [r.name, r.marker]), "rows' markers");
assertNumbers(beat.rows.map((r) => [r.name, r.measure]), "rows' measures");
if (!(Number.isFinite(beat.ceiling) && beat.ceiling > 0))
  throw new Error(`ceiling is ${JSON.stringify(beat.ceiling)}: the track's end, e.g. 100 for a share in %`);
// The track runs from zero to the ceiling: a bar past either end is drawn off its own scale.
const off = beat.rows.filter((r) => [r.marker, r.measure].some((v) => v < 0 || v > beat.ceiling));
if (off.length)
  throw new Error(`rows fall outside 0–${beat.ceiling} (${off.slice(0, 3).map((r) => `${r.name}: ${r.marker} → ${r.measure}`).join(", ")}): a bullet's track runs from zero to the ceiling — draw a share or a bounded measure, or raise ceiling to the measure's real maximum`);
const names = new Set();
for (const r of beat.rows) {
  if (names.has(r.name)) throw new Error(`two rows are named ${JSON.stringify(r.name)}: one row per entity — filter data.json to one row per entity and year`);
  names.add(r.name);
}
if (!names.has(beat.subject)) throw new Error(`subject ${JSON.stringify(beat.subject)} is not a row's name; the names are ${[...names].join(", ")}`);
if (beat.markerName === beat.measureName) throw new Error(`markerName and measureName are both ${JSON.stringify(beat.markerName)}: name the two states (e.g. two years)`);
assertLegibleLabels(beat.rows.map((r) => r.measure), beat.format);
beat.check();
assertDrawsClaimColumn(beat.rows.flatMap((r) => [r.marker, r.measure]), HERE);
// The plate prints each row's change (the verdict); the headline's figures are among the states or the changes.
assertHeadlineNumbersDrawn(
  [beat.title].flat()[0],
  beat.rows.flatMap((r) => [r.marker, r.measure, r.measure - r.marker]),
  "bullets",
);

// The component reads { key, label, marker, measure }; the contract speaks { name, label, marker, measure }.
const rows = beat.rows.map((r) => ({ key: r.name, label: r.label ?? r.name, marker: r.marker, measure: r.measure }));
const titles = [beat.title].flat();
const limits = [beat.limits].flat();
const reading = [beat.reading].flat();
const facts = beatFacts(
  rows.map((r) => ({ key: r.key, label: r.label, value: r.measure })),
  {
    subject: beat.subject,
    markers: rows.map((r) => ({ key: r.key, value: r.marker })),
    scaleCeiling: beat.ceiling,
    namedSeries: rows.map((r) => r.label),
    declaredSequence: "change",
  },
);
const offered = applicableTreatments(facts);
const textPerRegister = {
  display: titles.join(" "),
  eyebrow: beat.eyebrow,
  body: `${limits.join(" ")} ${beat.source}`,
  axis: `0 ${beat.format(beat.ceiling / 2)} ${beat.format(beat.ceiling)} ${beat.unit}`,
  annot: `${rows.map((r) => r.label).join(" ")} ${reading.join(" ")} ${beat.markerName} ${beat.measureName}`,
  value: rows.map((r) => beat.verdict(r)).join(" "),
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
      element: createElement(DirectedBullet, {
        frame: { width: FRAME.width, height: FRAME.height },
        rows,
        subject: beat.subject,
        ceiling: beat.ceiling,
        markerName: beat.markerName,
        measureName: beat.measureName,
        unit: beat.unit,
        title: titles,
        limits,
        reading,
        source: beat.source,
        alt: typeof beat.alt === "function" ? beat.alt(rows) : beat.alt,
        eyebrow: beat.eyebrow,
        format: beat.format,
        verdict: beat.verdict,
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
