// The generic half of a streamgraph beat: art direction, treatments, render and refusals, taken from
// proof/static-streamgraph-swiss-electricity/render-directions.mjs with everything about ITS subject
// removed. Everything about THIS story — data, layers, the tracked band, words, checks — lives in
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
import { DirectedStreamgraph } from "./DirectedStreamgraph.tsx";
import beat from "./beat.mjs";
import { applyStoryboard, assertNumbers, assertLegibleLabels, assertOnePerX, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
applyStoryboard(beat, dirname(fileURLToPath(import.meta.url)));

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "renders");
const SIZE = exportSizeFromArgv();
const FRAME = directedFrame(SIZE);
assertBeatMayEnter(HERE, SIZE, { what: basename(HERE) });

const REQUIRED = ["eyebrow", "keys", "labels", "tracked", "readings", "excluded", "unit", "format", "title", "limits", "reading", "source", "alt", "check"];
const missing = REQUIRED.filter((key) => beat[key] === undefined);
if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")} (see CONTRACT.md)`);

const { keys, labels, tracked, readings } = beat;
if (!Array.isArray(keys) || keys.length < 2) throw new Error(`keys must list at least two layers; beat.mjs gives ${JSON.stringify(keys)}`);
if (!keys.includes(tracked)) throw new Error(`tracked "${tracked}" is not one of keys (${keys.join(", ")})`);
const unlabelled = keys.filter((k) => typeof labels[k] !== "string" || !labels[k].trim());
if (unlabelled.length)
  throw new Error(`labels has no name for ${unlabelled.join(", ")}: every band is named inside itself, in the story's language — never a column name`);
if (!Array.isArray(readings) || readings.length < 3) throw new Error(`readings must hold one { year, ...layers } per year, at least three; got ${readings?.length}`);

// Every cell a number, one reading per year, years in order with none skipped: a stream interpolates
// straight across a missing year and draws a value nothing in the data holds.
assertNumbers(readings.flatMap((r) => [["year", r.year], ...keys.map((k) => [`${k} ${r.year}`, r[k]])]), "readings");
assertOnePerX(readings);
const sorted = [...readings].sort((a, b) => a.year - b.year);
const gaps = sorted.slice(1).filter((r, i) => r.year !== sorted[i].year + 1).map((r) => r.year);
if (gaps.length) throw new Error(`readings skip years before ${gaps.join(", ")}: give every year from the first to the last, or start after the gap`);
const negative = readings.flatMap((r) => keys.filter((k) => r[k] < 0).map((k) => `${k} ${r.year}=${r[k]}`));
if (negative.length) throw new Error(`a stream stacks quantities that cannot be negative; these are: ${negative.slice(0, 3).join(", ")}. Draw a different form (a line, or a diverging bar)`);

// THE PARTIAL PERIOD. An incomplete last year on a stream reads as a collapse (the worked example's
// 2025: 65 against 78 TWh). Each excluded year is out of the readings AND said on the plate; a last
// drawn year whose total falls by more than a sixth is refused as probably partial.
const totalOf = (r) => keys.reduce((s, k) => s + r[k], 0);
for (const { year, why } of beat.excluded) {
  if (readings.some((r) => r.year === year)) throw new Error(`excluded year ${year} is still in readings: filter it out`);
  const said = [beat.source, ...[beat.limits].flat()].join(" ");
  if (!said.includes(String(year))) throw new Error(`excluded year ${year} (${why}) must be said on the plate: name it in source or limits`);
}
const [prev, last] = sorted.slice(-2);
if (totalOf(last) < totalOf(prev) * 5 / 6 && !beat.lastYearComplete)
  throw new Error(
    `the total falls from ${beat.format(totalOf(prev))} in ${prev.year} to ${beat.format(totalOf(last))} in ${last.year}: ` +
      `the last year is probably partial. Drop it from readings and add it to excluded (and say so in source), ` +
      `or set lastYearComplete: true if the source confirms the year is complete`,
  );

// THE RANK HELD. When the claim is that the tracked band reached a rank, it is computed year by year:
// the year it first reaches it, and every year since.
if (beat.rank !== undefined) {
  if (!Number.isInteger(beat.rank) || beat.rank < 1) throw new Error(`rank must be a whole number ≥ 1, got ${beat.rank}`);
  const rankIn = (r) => keys.map((k) => ({ k, v: r[k] })).sort((a, b) => b.v - a.v).findIndex((e) => e.k === tracked) + 1;
  const ranks = sorted.map((r) => ({ year: r.year, rank: rankIn(r) }));
  const reached = ranks.find((r) => r.rank <= beat.rank);
  if (!reached) throw new Error(`${labels[tracked]} never reaches rank ${beat.rank} in these readings`);
  const lost = ranks.filter((r) => r.year >= reached.year && r.rank > beat.rank);
  if (lost.length)
    throw new Error(`${labels[tracked]} reaches rank ${beat.rank} in ${reached.year} but does not hold it: ${lost.map((r) => `${r.year} rank ${r.rank}`).join(", ")}`);
  if (beat.reachedIn !== undefined && beat.reachedIn !== reached.year)
    throw new Error(`reachedIn is ${beat.reachedIn}, but ${labels[tracked]} first reaches rank ${beat.rank} in ${reached.year}: compute it`);
}

beat.check();

const trackedValues = sorted.map((r) => r[tracked]);
assertLegibleLabels([sorted[0][tracked], last[tracked], totalOf(sorted[0]), totalOf(last)], beat.format);
assertDrawsClaimColumn(trackedValues, HERE);
const titles = [beat.title].flat();
assertHeadlineNumbersDrawn(titles[0], [...trackedValues, ...sorted.map(totalOf)], "bands");

// A string, or forms longest first: landscape takes the first, the smaller frames the last.
const pick = (v) => (SIZE === "landscape" ? [v].flat()[0] : [v].flat().at(-1));
const title = pick(beat.title);
const limits = pick(beat.limits);
const reading = pick(beat.reading);

const facts = beatFacts(
  keys.map((k) => ({ key: k, label: labels[k], value: last[k] })),
  {
    subject: tracked,
    layers: keys.map((k) => ({ key: k, peak: Math.max(...sorted.map((r) => r[k])) })),
    freeBaseline: true,
    namedSeries: keys.map((k) => labels[k]),
    declaredSequence: "inside-out",
  },
);
const offered = applicableTreatments(facts);
const first = sorted[0];
const totalWord = beat.totalWord ?? "Total";
const textPerRegister = {
  display: title,
  eyebrow: beat.eyebrow,
  body: `${limits} ${beat.source}`,
  axis: `${first.year} ${last.year}`,
  annot: `${keys.map((k) => labels[k]).join(" ")} ${reading} ${totalWord}`,
  value: `${beat.format(first[tracked])} ${beat.format(last[tracked])} ${beat.unit}`,
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
      element: createElement(DirectedStreamgraph, {
        frame: { width: FRAME.width, height: FRAME.height },
        readings: sorted,
        keys,
        labels,
        tracked,
        unit: beat.unit,
        title,
        limits,
        reading,
        source: beat.source,
        alt: typeof beat.alt === "function" ? beat.alt(sorted) : beat.alt,
        eyebrow: beat.eyebrow,
        format: beat.format,
        totalWord,
        colon: beat.colon ?? " : ",
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
