// The generic half of a box-plot beat: art direction, treatments, render and refusals, taken from
// proof/more-boxplot-france-co2-decades/render-directions.mjs with everything about ITS subject
// removed. Everything about THIS story — the groups, the subject, words, checks — lives in
// ./beat.mjs, the one file the model writes. The five-number summaries are NOT the beat's: they are
// computed here by `summarizeDecade` (quartiles, the 1.5 × IQR Tukey fence, fence-clipped whiskers),
// one place for the rule this form is only ever as honest as. Copied into the beat by the harness;
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
import { summarizeDecade } from "./DecadeBoxplot.tsx";
import { DirectedBoxplot } from "./DirectedBoxplot.tsx";
import beat from "./beat.mjs";
import { applyStoryboard, assertNumbers, assertLegibleLabels, assertDrawsClaimColumn, errorText } from "./guards.mjs";
applyStoryboard(beat, dirname(fileURLToPath(import.meta.url)));

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "renders");
const SIZE = exportSizeFromArgv();
const FRAME = directedFrame(SIZE);
assertBeatMayEnter(HERE, SIZE, { what: basename(HERE) });

const REQUIRED = ["eyebrow", "groups", "subject", "unit", "whiskerRule", "format", "title", "limits", "source", "alt", "check"];
const missing = REQUIRED.filter((key) => beat[key] === undefined);
if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);

// ── the groups, refused before anything is drawn ────────────────────────────
if (!Array.isArray(beat.groups) || beat.groups.length < 2 || beat.groups.length > 12)
  throw new Error(`groups holds ${beat.groups?.length ?? 0} groups: a box plot compares two to twelve distributions — merge groups (decades rather than years) or split the beat`);
const labels = new Set();
for (const g of beat.groups) {
  if (typeof g.label !== "string" || !g.label) throw new Error(`a group has no label: every group is { label, values }`);
  if (labels.has(g.label)) throw new Error(`two groups are labelled ${JSON.stringify(g.label)}: one group per label`);
  labels.add(g.label);
  if (!Array.isArray(g.values)) throw new Error(`group ${g.label} has no values array`);
  assertNumbers(g.values.map((v, i) => [`${g.label}[${i}]`, v]), `group ${g.label}'s values`);
  // A box drawn from three readings states quartiles nobody can estimate from three readings.
  if (g.values.length < 4)
    throw new Error(`group ${g.label} has ${g.values.length} readings: a box needs four or more to have quartiles — merge it with its neighbour or draw a dot plot`);
}
if (!labels.has(beat.subject)) throw new Error(`subject ${JSON.stringify(beat.subject)} is not a group label; the labels are ${[...labels].join(", ")}`);
if (!/1[.,]5/.test(beat.whiskerRule))
  throw new Error(`whiskerRule says ${JSON.stringify(beat.whiskerRule)}, but the whiskers are drawn to 1.5 × IQR: write that rule in the story's language ("1.5 × IQR", "1,5 × IQR")`);

const summaries = beat.groups.map((g) => ({ ...summarizeDecade(g.label, g.values), values: g.values }));
const medians = summaries.map((s) => s.median);
assertLegibleLabels(medians, beat.format);
beat.check();
assertDrawsClaimColumn(beat.groups.flatMap((g) => g.values), HERE);
// assertHeadlineNumbersDrawn is NOT called: a box plot's headline names a group or a period ("peaked
// in the 1970s"), not a mark's value, and the guard reads the 2 of "CO2" as a stated figure inside a
// per-person range (measured on the worked example's own title, which it refused).

const facts = beatFacts(
  summaries.map((s) => ({ key: s.label, label: s.label, value: s.median })),
  {
    subject: beat.subject,
    summaries: summaries.map((s) => ({ key: s.label, n: s.n })),
    observations: beat.groups.flatMap((g) => g.values),
    declaredSequence: beat.sequence ?? "group",
    unitMark: null,
  },
);
const offered = applicableTreatments(facts);
const titles = [beat.title].flat();
const limits = [beat.limits].flat();
const subject = summaries.find((s) => s.label === beat.subject);
const last = summaries[summaries.length - 1];
const textPerRegister = {
  display: titles.join(" "),
  eyebrow: beat.eyebrow,
  body: `${limits.join(" ")} ${beat.source}`,
  axis: `${medians.map((m) => beat.format(m)).join(" ")} ${beat.unit}`,
  annot: `${summaries.map((s) => `${s.label} · n=${s.n}`).join(" ")} ${beat.reading ?? ""} ${beat.whiskerRule}`,
  value: `${beat.format(subject.median)} ${beat.format(last.median)}`,
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
      element: createElement(DirectedBoxplot, {
        frame: { width: FRAME.width, height: FRAME.height },
        summaries,
        subject: beat.subject,
        unit: beat.unit,
        whiskerRule: beat.whiskerRule,
        title: titles,
        limits,
        source: beat.source,
        alt: typeof beat.alt === "function" ? beat.alt(summaries) : beat.alt,
        eyebrow: beat.eyebrow,
        format: beat.format,
        direction,
        treatments: offered.map((t) => t.id),
        readingLine: beat.reading,
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
