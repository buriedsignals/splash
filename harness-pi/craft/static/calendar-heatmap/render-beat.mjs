// The generic half of a calendar-heatmap beat: art direction, treatments, render and refusals, taken
// from proof/static-calendar-heatmap-geneva/render-directions.mjs with everything about ITS subject
// removed. Everything about THIS story — the days, the threshold, words, checks — lives in
// ./beat.mjs, the one file the model writes. The run and the bins are computed here
// (./calendar.mjs), never by the beat. Copied into the beat by the harness; never edited by the model.
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
import { DirectedCalendarHeatmap } from "./DirectedCalendarHeatmap.tsx";
import { toDays, longestRun, quantileBreaks, monthlyMeans } from "./calendar.mjs";
import beat from "./beat.mjs";
import { applyStoryboard, assertNumbers, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
applyStoryboard(beat, dirname(fileURLToPath(import.meta.url)));

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "renders");
const SIZE = exportSizeFromArgv();
const FRAME = directedFrame(SIZE);
assertBeatMayEnter(HERE, SIZE, { what: basename(HERE) });

const REQUIRED = ["eyebrow", "days", "threshold", "months", "monthsShort", "unit", "keyLabel", "missingLabel", "format", "title", "limits", "reading", "source", "alt", "check"];
const missing = REQUIRED.filter((key) => beat[key] === undefined);
if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);

// ── the days, refused before anything is drawn ──────────────────────────────
if (!Array.isArray(beat.days)) throw new Error(`days must be [{ date: "YYYY-MM-DD", value }]`);
assertNumbers(beat.days.map((d) => [d.date, d.value]), "days' values");
const { year, days } = toDays(beat.days);
for (const [field, list] of [["months", beat.months], ["monthsShort", beat.monthsShort]]) {
  if (!Array.isArray(list) || list.length !== 12) throw new Error(`${field} must hold the twelve month names in the story's language`);
  if (new Set(list).size !== 12) throw new Error(`${field} names two months alike (${list.join(", ")}): write each abbreviation out so no two rows share a name`);
}
if (!Number.isFinite(beat.threshold)) throw new Error(`threshold is ${JSON.stringify(beat.threshold)}: the value the run of days is counted from, as a number`);
const streak = longestRun(days, beat.threshold);
if (streak.length < 2)
  throw new Error(`the longest run at or above ${beat.threshold} is ${streak.length} day(s): the outlined run would be no run — choose the threshold the takeaway names, or another chart`);
const breaks = quantileBreaks(days, beat.breakDecimals ?? 0);
if (new Set(breaks).size !== breaks.length)
  throw new Error(`two bins share a break after rounding (${breaks.join(", ")}): set breakDecimals to 1 (or more) in beat.mjs`);
beat.check();
assertDrawsClaimColumn(days.map((d) => d.value), HERE);
// The headline states a run length or a threshold; the run length is what the plate outlines.
assertHeadlineNumbersDrawn([beat.title].flat()[0], [streak.length, beat.threshold, ...days.map((d) => d.value)], "days");

const titles = [beat.title].flat();
const limits = [beat.limits].flat();
const reading = [beat.reading].flat();
const means = monthlyMeans(days);
const warmest = means.reduce((a, b) => (b.mean > a.mean ? b : a));
const impossibleCells = Array.from({ length: 12 }, (_, m) => 31 - new Date(year, m + 1, 0).getDate()).reduce((a, b) => a + b, 0);
const facts = beatFacts(
  means.map((m) => ({ key: beat.months[m.month], label: beat.months[m.month], value: m.mean })),
  {
    subject: beat.months[warmest.month],
    cells: days.map((d) => ({ key: d.date, value: d.value })),
    impossibleCells,
    declaredSequence: "calendar",
  },
);
const offered = applicableTreatments(facts);
const textPerRegister = {
  display: titles.join(" "),
  eyebrow: beat.eyebrow,
  body: `${limits.join(" ")} ${beat.source}`,
  axis: `${beat.months.join(" ")} ${beat.monthsShort.join(" ")} 1 5 10 15 20 25 31 ${breaks.map(beat.format).join(" ")} ${beat.unit} ${beat.keyLabel} ${beat.missingLabel}`,
  annot: reading.join(" "),
  value: "",
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
      element: createElement(DirectedCalendarHeatmap, {
        frame: { width: FRAME.width, height: FRAME.height },
        days,
        months: beat.months,
        monthsShort: beat.monthsShort,
        breaks,
        streak: { from: streak.from, to: streak.to, length: streak.length, threshold: beat.threshold },
        unit: beat.unit,
        title: titles,
        limits,
        reading,
        source: beat.source,
        alt: typeof beat.alt === "function" ? beat.alt({ days, streak }) : beat.alt,
        eyebrow: beat.eyebrow,
        format: beat.format,
        direction,
        treatments: offered.map((t) => t.id),
        year,
        keyLabel: beat.keyLabel,
        missingLabel: beat.missingLabel,
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
