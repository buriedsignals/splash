// The generic half of a waterfall (bridge) beat: art direction, treatments, render and refusals,
// taken from proof/static-germany-electricity-bridge/render-directions.mjs with everything about ITS
// subject removed. Everything about THIS story — data, steps, words, checks — lives in ./beat.mjs,
// the one file the model writes. Copied into the beat by the harness; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs [--size landscape|square|portrait]
import { rm } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { scaleLinear } from "d3-scale";
import { renderStill } from "#shared/chart-beat/render-still.mjs";
import { readPalette } from "#shared/chart-beat/colour.mjs";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { composeDirections, filedDirections, report as composeReport, resolveDirectionFamilies } from "#shared/design-base/index.mjs";
import { directionReachable, readRunDirection } from "#shared/design-base/run-direction.mjs";
import { assertBeatMayEnter, directedFrame, exportSizeFromArgv, nameAtSize } from "#shared/chart-beat/directed-size.mjs";
import { DirectedWaterfall } from "./DirectedWaterfall.tsx";
import beat from "./beat.mjs";
import { applyStoryboard, assertNumbers, assertLegibleLabels, assertHeadlineNumbersDrawn, errorText } from "./guards.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
applyStoryboard(beat, HERE);
const OUT = join(HERE, "renders");
const SIZE = exportSizeFromArgv();
const FRAME = directedFrame(SIZE);
assertBeatMayEnter(HERE, SIZE, { what: basename(HERE) });

const REQUIRED = ["eyebrow", "subject", "steps", "format", "unit", "title", "limits", "source", "alt", "check"];
const missing = REQUIRED.filter((key) => beat[key] === undefined);
if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
const steps = beat.steps;
if (!Array.isArray(steps) || steps.length < 3)
  throw new Error("steps must hold at least an opening total, one step and a closing total: [{ label, value, kind }]");
if (steps.length > 12) throw new Error(`${steps.length} steps: group the smallest into one step so the bridge holds at most 12 bars`);
assertNumbers(steps.map((s) => [s.label, s.value]), "steps");
const KINDS = ["total", "increase", "decrease"];
for (const s of steps) {
  if (!KINDS.includes(s.kind)) throw new Error(`step ${JSON.stringify(s.label)} has kind ${JSON.stringify(s.kind)}: use "total", "increase" or "decrease"`);
  if (s.kind === "increase" && s.value < 0) throw new Error(`step ${JSON.stringify(s.label)} is an "increase" with a negative value (${s.value}): a fall is kind "decrease", value negative`);
  if (s.kind === "decrease" && s.value > 0) throw new Error(`step ${JSON.stringify(s.label)} is a "decrease" with a positive value (${s.value}): give a decrease its negative value`);
}
if (steps[0].kind !== "total" || steps[steps.length - 1].kind !== "total")
  throw new Error(`a bridge's first and last bars are totals (kind "total"): the opening level and the closing level. Got "${steps[0].kind}" first and "${steps[steps.length - 1].kind}" last`);
if (steps.filter((s) => s.kind !== "total").length < 1) throw new Error("a bridge needs at least one step between its totals");

// THE BRIDGE IS REPLAYED BEFORE IT IS DRAWN. Each bar shows only its own delta, so a reader cannot
// catch a bad running total by looking: every total must equal where the steps before it landed.
let running = steps[0].value;
const tolerance = (v) => Math.max(0.05, Math.abs(v) * 0.001);
for (const s of steps.slice(1)) {
  if (s.kind === "total") {
    if (Math.abs(running - s.value) > tolerance(s.value))
      throw new Error(`the bridge does not replay: the steps before "${s.label}" land at ${running}, but that total says ${s.value}. Compute every step as (later minus earlier) from the same columns as the totals, so opening + steps = closing`);
    running = s.value;
  } else running += s.value;
  if (running < 0) throw new Error(`the running level goes below zero after "${s.label}" (${running}): this bridge draws from a zero baseline and cannot show a negative level`);
}
if (steps[0].value <= 0) throw new Error(`the opening total is ${steps[0].value}: a bridge's totals are levels above zero`);

// The axis gutter holds three characters; a wider tick would run off the plate's left edge.
const top = Math.max(...(() => {
  let r = 0;
  return steps.flatMap((s) => {
    const from = s.kind === "total" ? 0 : r;
    const to = s.kind === "total" ? s.value : r + s.value;
    r = to;
    return [from, to];
  });
})());
const tickFormat = typeof beat.tickFormat === "function" ? beat.tickFormat : String;
const ticks = scaleLinear().domain([0, top]).nice(5).ticks(5);
const wide = ticks.map((t) => tickFormat(t)).filter((t) => t.length > 3);
if (wide.length)
  throw new Error(`the axis would print ${wide.slice(-1)[0]}, wider than the three characters its gutter holds: draw the values in a larger unit (thousands, millions, billions) and say it in unit and standfirst`);

const values = steps.map((s) => s.value);
assertLegibleLabels(values.map(Math.abs), beat.format);
beat.check();
const opening = steps[0].value;
const closing = steps[steps.length - 1].value;
const title = [beat.title].flat()[0];
const limits = [beat.limits].flat()[0];
// The plate also states the net change between the two outer totals.
assertHeadlineNumbersDrawn(title, [...values, closing - opening, Math.abs(closing - opening)], "bars");

const facts = beatFacts(
  steps.map((s) => ({ key: s.label, label: s.label, value: s.value })),
  { subject: beat.subject, namedSeries: [beat.subject], levels: steps.filter((s) => s.kind === "total").map((s) => s.value) },
);
const offered = applicableTreatments(facts);
const textPerRegister = {
  display: title,
  eyebrow: beat.eyebrow,
  body: `${limits} ${beat.source}`,
  axis: `${ticks.map((t) => tickFormat(t)).join(" ")} 0123456789`,
  annot: steps.map((s) => s.label).join(" "),
  value: `${steps.map((s) => `${s.value > 0 ? "+" : "−"}${beat.format(Math.abs(s.value))}`).join(" ")} ${beat.format(Math.abs(closing - opening))} ${beat.unit}`,
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
      element: createElement(DirectedWaterfall, {
        frame: { width: FRAME.width, height: FRAME.height },
        steps: steps.map(({ label, value, kind }) => ({ label, value, kind })),
        title,
        limits,
        source: beat.source,
        alt: beat.alt,
        eyebrow: beat.eyebrow,
        direction,
        treatments: offered.map((t) => t.id),
        format: beat.format,
        unit: beat.unit,
        tickFormat,
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
