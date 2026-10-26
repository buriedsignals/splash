// The generic half of a histogram beat: binning, art direction, treatments, render and refusals,
// taken from proof/static-carbon-footprint-spread/render-directions.mjs with everything about ITS
// subject removed. Everything about THIS story — data, threshold, words, checks — lives in
// ./beat.mjs, the one file the model writes. Copied into the beat by the harness; never edited by
// the model.
//
// The bins are COUNTED HERE, not in beat.mjs: the beat gives the readings and the bin edges, and
// the counts, the open tail and the share on the threshold's side are arithmetic over the same array.
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
import { DirectedHistogram } from "./DirectedHistogram.tsx";
import beat from "./beat.mjs";
import { applyStoryboard, assertNumbers, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
applyStoryboard(beat, dirname(fileURLToPath(import.meta.url)));

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "renders");
const SIZE = exportSizeFromArgv();
const FRAME = directedFrame(SIZE);
assertBeatMayEnter(HERE, SIZE, { what: basename(HERE) });

const REQUIRED = ["eyebrow", "observations", "binWidth", "binCount", "unit", "threshold", "words", "title", "limits", "source", "alt", "check"];
const missing = REQUIRED.filter((key) => beat[key] === undefined);
if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")} (see CONTRACT.md)`);

assertNumbers(beat.observations.map((o) => [o.name, o.value]), "observations");
assertNumbers([["binWidth", beat.binWidth], ["binCount", beat.binCount], ["binStart", beat.binStart ?? 0], ["threshold", beat.threshold]], "bin settings");
const values = beat.observations.map((o) => o.value);
const start = beat.binStart ?? 0;
const { binWidth, binCount, threshold } = beat;

// THE TYPE'S OWN REFUSALS — what this component cannot draw honestly.
if (values.length < 20)
  throw new Error(`a histogram of ${values.length} readings is a handful of bars that look like a distribution: it needs at least 20 observations. With fewer, choose a dot strip or a ranked bar instead`);
if (!(binWidth > 0)) throw new Error(`binWidth must be a positive number, it is ${binWidth}`);
if (!Number.isInteger(binCount) || binCount < 4 || binCount > 20)
  throw new Error(`binCount must be a whole number from 4 to 20, it is ${binCount}: change binWidth so that about ${Math.round((Math.max(...values) - start) / binWidth)} bins cover the readings, capped at 20`);
const below = beat.observations.filter((o) => o.value < start);
if (below.length)
  throw new Error(`${below.length} observation(s) fall below the first bin edge ${start} (${below.slice(0, 3).map((o) => `${o.name}=${o.value}`).join(", ")}): set binStart at or under the smallest reading (${Math.min(...values)})`);
const edge = (i) => Math.round((start + i * binWidth) * 1e9) / 1e9;
const top = edge(binCount);
if (!(threshold > start && threshold < top))
  throw new Error(`threshold ${threshold} is outside the bins (${start} to ${top}): the line the share is counted against must fall inside the drawn axis — set threshold, binStart or binWidth`);

const bins = Array.from({ length: binCount }, (_, i) => {
  const lo = edge(i);
  const hi = edge(i + 1);
  const last = i === binCount - 1;
  // The tail is real and open: everything at or above the last edge falls in the last bin.
  return { lo, hi, open: last, count: values.filter((v) => (last ? v >= lo : v >= lo && v < hi)).length };
});
const counted = bins.reduce((s, b) => s + b.count, 0);
if (counted !== values.length) throw new Error(`the bins count ${counted} readings, not ${values.length}`);
const tail = bins[bins.length - 1];
if (tail.count / values.length > 0.25)
  throw new Error(`the open last bin (${tail.lo} and above) holds ${tail.count} of ${values.length} readings: the bins stop too early. Raise binCount or binWidth so the open tail holds a few outliers, not a quarter of the data`);
if (bins.filter((b) => b.count > 0).length < 3)
  throw new Error(`only ${bins.filter((b) => b.count > 0).length} bin(s) hold any reading: the bins are too wide for this spread. Lower binWidth (and raise binCount)`);
const formatEdge = beat.formatEdge ?? ((v) => String(v));
const names = bins.map((b) => (b.open ? `${formatEdge(b.lo)}+` : `${formatEdge(b.lo)}–${formatEdge(b.hi)}`));
if (new Set(names).size < names.length || names.some((n) => /\d\.\d{4,}/.test(n)))
  throw new Error(`the bin names print as ${names.slice(0, 4).join(", ")}…: pick a binWidth that gives round edges, or a formatEdge that prints them distinctly`);

const facts = beatFacts(
  bins.map((b) => ({ key: `${b.lo}`, label: `${b.lo}-${b.hi}`, value: b.count })),
  { subject: beat.subject ?? "all", bins, observations: values, threshold },
);
const offered = applicableTreatments(facts);
const share = facts.shareBelowThreshold;

beat.check({ bins, count: facts.countBelowThreshold, total: facts.observationCount, share });
assertDrawsClaimColumn(values, HERE);
// What the plate states in figures: the counted share (as a count, a total, in tenths and in per
// cent), the threshold, and every bar's count.
assertHeadlineNumbersDrawn(
  [beat.title].flat()[0],
  [facts.countBelowThreshold, facts.observationCount, threshold, Math.round(share * 10), Math.round(share * 100), ...bins.map((b) => b.count)],
  "bins and share",
);

const title = [beat.title].flat()[0];
const limits = [beat.limits].flat()[0];
const textPerRegister = {
  display: title,
  eyebrow: beat.eyebrow,
  body: `${limits} ${beat.source}`,
  axis: `${names.join(" ")} ${beat.unit}`,
  annot: `${facts.countBelowThreshold} ${beat.words.entity} ${beat.words.of} ${facts.observationCount} ${beat.words.below} ${formatEdge(threshold)} ${beat.unit}`,
  value: bins.map((b) => String(b.count)).join(" "),
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

const alt = typeof beat.alt === "function" ? beat.alt({ bins, count: facts.countBelowThreshold, total: facts.observationCount, share }) : beat.alt;
const refused = [];
for (const { label: id, direction: chosenDirection } of chosen) {
  const direction = resolveDirectionFamilies(chosenDirection, textPerRegister);
  try {
    await renderStill({
      element: createElement(DirectedHistogram, {
        frame: { width: FRAME.width, height: FRAME.height },
        bins,
        unit: beat.unit,
        threshold,
        thresholdCount: facts.countBelowThreshold,
        thresholdTotal: facts.observationCount,
        title,
        limits,
        source: beat.source,
        alt,
        eyebrow: beat.eyebrow,
        direction,
        treatments: offered.map((t) => t.id),
        words: beat.words,
        formatEdge,
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
