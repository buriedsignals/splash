// The generic half of a sankey beat: art direction, treatments, render and refusals, taken from
// proof/static-sankey-electricity-sources/render-directions.mjs with everything about ITS subject
// removed. Everything about THIS story — nodes, flows, the tracked flow, words, checks — lives in
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
import { DirectedSankey } from "./DirectedSankey.tsx";
import beat from "./beat.mjs";
import { applyStoryboard, assertNumbers, assertLegibleLabels, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
applyStoryboard(beat, dirname(fileURLToPath(import.meta.url)));

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "renders");
const SIZE = exportSizeFromArgv();
const FRAME = directedFrame(SIZE);
assertBeatMayEnter(HERE, SIZE, { what: basename(HERE) });

const REQUIRED = ["eyebrow", "sources", "targets", "flows", "tracked", "unit", "format", "title", "limits", "reading", "source", "alt", "check"];
const missing = REQUIRED.filter((key) => beat[key] === undefined);
if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")} (see CONTRACT.md)`);

// ── THE FLOWS, CHECKED BEFORE ANY TOTAL IS TRUSTED ─────────────────────────────
assertNumbers(beat.flows.map((f) => [`${f.from}→${f.to}`, f.value]), "flows");
const sourceKeys = new Set(beat.sources.map((n) => String(n.key)));
const targetKeys = new Set(beat.targets.map((n) => String(n.key)));
const shared = [...sourceKeys].filter((k) => targetKeys.has(k));
if (shared.length)
  throw new Error(`${shared.join(", ")} is the key of a source AND a target: give each node a distinct key (e.g. prefix the targets), the label can stay the same`);
for (const f of beat.flows) {
  if (!sourceKeys.has(String(f.from))) throw new Error(`a flow starts at "${f.from}", which is not the key of any node in sources (${[...sourceKeys].join(", ")})`);
  if (!targetKeys.has(String(f.to))) throw new Error(`a flow ends at "${f.to}", which is not the key of any node in targets (${[...targetKeys].join(", ")})`);
}
/** A SANKEY CANNOT DRAW A NEGATIVE FLOW: a ribbon has a width, not a sign. */
const negative = beat.flows.filter((f) => f.value < 0);
if (negative.length)
  throw new Error(`${negative.length} flow(s) are negative (${negative.slice(0, 3).map((f) => `${f.from}→${f.to} ${f.value}`).join(", ")}): a sankey draws widths, not signs — draw a net change as a diverging bar instead, or leave those flows out and say so in the standfirst`);
/** ONE RIBBON PER PAIR: two values for one pair are two rows of data.json (two years, two scenarios). */
const pairs = new Map();
for (const f of beat.flows) {
  const k = `${f.from}→${f.to}`;
  if (pairs.has(k)) throw new Error(`two flows go from ${f.from} to ${f.to}: filter data.json's rows to ONE year / one series so each pair has one value`);
  pairs.set(k, f.value);
}

// ── CONSERVATION, ON BOTH RAILS ─────────────────────────────────────────────────
// The form's promise is that what enters a node leaves it. A node's printed total is the sum of its
// own ribbons; a total given in beat.mjs that differs is refused rather than drawn beside them.
const sumOf = (side, key) => beat.flows.filter((f) => String(f[side]) === key).reduce((s, f) => s + f.value, 0);
const close = (a, b) => Math.abs(a - b) <= Math.max(1e-6, Math.abs(b) * 1e-6);
const railOf = (nodes, side, rail) =>
  nodes.map((n) => {
    const key = String(n.key);
    const total = sumOf(side, key);
    if (n.total !== undefined && !close(Number(n.total), total))
      throw new Error(`conservation fails on the ${rail} rail: ${n.label ?? key} is given total ${n.total}, but its flows add up to ${total}. Compute each node's total from its flows (or leave total out)`);
    if (!(total > 0)) throw new Error(`${n.label ?? key} on the ${rail} rail has no flow: drop it from ${rail}`);
    return { key, label: String(n.label ?? key), total };
  });
const sources = railOf(beat.sources, "from", "sources");
const targets = railOf(beat.targets, "to", "targets");
const grand = beat.flows.reduce((s, f) => s + f.value, 0);
const outOfSources = sources.reduce((s, n) => s + n.total, 0);
const intoTargets = targets.reduce((s, n) => s + n.total, 0);
if (!close(outOfSources, grand) || !close(intoTargets, grand))
  throw new Error(`conservation fails: ${outOfSources} out of the sources, ${intoTargets} into the targets, ${grand} in the flows`);

const tracked = { from: String(beat.tracked.from), to: String(beat.tracked.to) };
const trackedValue = pairs.get(`${tracked.from}→${tracked.to}`);
if (!(trackedValue > 0))
  throw new Error(`tracked is ${tracked.from}→${tracked.to}, but no flow with a value goes between those keys: name the flow the takeaway is about by its source key and target key`);

assertLegibleLabels([...sources, ...targets].map((n) => n.total), beat.format);
beat.check();
assertDrawsClaimColumn([trackedValue], HERE);
assertHeadlineNumbersDrawn(
  [beat.title].flat()[0],
  [...sources.map((n) => n.total), ...targets.map((n) => n.total), ...beat.flows.map((f) => f.value)],
  "nodes and flows",
);

const title = [beat.title].flat();
const limits = [beat.limits].flat();
const reading = [beat.reading].flat();
const facts = beatFacts(
  sources.map((n) => ({ key: n.key, label: n.label, value: n.total })),
  {
    subject: tracked.from,
    flows: beat.flows.map((f) => ({ from: String(f.from), to: String(f.to), value: f.value })),
    namedSeries: targets.map((n) => n.label),
    declaredSequence: beat.declaredSequence ?? null,
  },
);
const offered = applicableTreatments(facts);
const textPerRegister = {
  display: title.join(" "),
  eyebrow: beat.eyebrow,
  body: `${limits.join(" ")} ${beat.source}`,
  axis: beat.unit,
  annot: `${[...sources, ...targets].map((n) => `${n.label} ${beat.format(n.total)}`).join(" ")} ${reading.join(" ")}`,
  value: sources.map((n) => beat.format(n.total)).join(" "),
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
      element: createElement(DirectedSankey, {
        frame: { width: FRAME.width, height: FRAME.height },
        sources,
        targets,
        flows: beat.flows.map((f) => ({ from: String(f.from), to: String(f.to), value: f.value })),
        tracked,
        unit: beat.unit,
        title,
        limits,
        reading,
        source: beat.source,
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
