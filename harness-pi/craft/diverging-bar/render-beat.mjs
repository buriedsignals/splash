// The generic half of a diverging-bar beat: art direction, treatments, render and refusals, taken
// from proof/static-diverging-bar-eu-per-capita/render-directions.mjs with everything about ITS
// subject removed. Everything about THIS story — data, the subject row, words, checks — lives in
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
import { DirectedDivergingBar } from "./DirectedDivergingBar.tsx";
import beat from "./beat.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "renders");
const SIZE = exportSizeFromArgv();
const FRAME = directedFrame(SIZE);
assertBeatMayEnter(HERE, SIZE, { what: basename(HERE) });

const REQUIRED = ["eyebrow", "rows", "subject", "subjectNote", "note", "format", "title", "limits", "source", "alt", "scope", "check"];
const missing = REQUIRED.filter((key) => beat[key] === undefined);
if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")} (see CONTRACT.md)`);
// The beat's own claim, checked against its own data BEFORE anything is drawn.
beat.check();

// The rows read top to bottom from the largest rise to the largest fall.
const rows = beat.rows
  .map((r) => {
    if (!Number.isFinite(r.change)) throw new Error(`row ${r.name} has no usable change: ${JSON.stringify(r)}`);
    return { name: String(r.name), change: r.change };
  })
  .sort((a, b) => b.change - a.change);
if (!rows.some((r) => r.name === String(beat.subject)))
  throw new Error(`subject "${beat.subject}" is not the name of a row`);
/** A DIVERGING BAR DIVERGES. Its zero rule and its two directions are the reading; a field that
 *  sits entirely on one side of zero is a ranking, and belongs to a bar chart. */
if (!(rows.some((r) => r.change > 0) && rows.some((r) => r.change < 0)))
  throw new Error(`every row is on the same side of zero; a diverging bar needs rows on both sides`);

const title = [beat.title].flat();
const limits = [beat.limits].flat().join(" ");
const facts = beatFacts(
  rows.map((r) => ({ key: r.name, label: r.name, value: r.change })),
  { subject: String(beat.subject), namedSeries: rows.map((r) => r.name), unitMark: beat.unitMark ?? null },
);
const offered = applicableTreatments(facts);
const textPerRegister = {
  display: title.join(" "),
  eyebrow: beat.eyebrow,
  body: `${limits} ${beat.source}`,
  axis: "0",
  annot: `${rows.map((r) => r.name).join(" ")} ${beat.subjectNote} ${beat.note}`,
  value: rows.map((r) => beat.format(r.change)).join(" "),
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
      element: createElement(DirectedDivergingBar, {
        frame: { width: FRAME.width, height: FRAME.height },
        rows,
        subject: String(beat.subject),
        subjectNote: beat.subjectNote,
        note: beat.note,
        format: beat.format,
        title,
        limits,
        source: beat.source,
        alt: beat.alt,
        eyebrow: beat.eyebrow,
        scope: beat.scope,
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
