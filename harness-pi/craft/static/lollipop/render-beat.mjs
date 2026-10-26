// The generic half of a lollipop beat: art direction, treatments, render and refusals, taken from
// proof/static-lollipop-co2-per-person/render-directions.mjs with everything about ITS subject
// removed. Everything about THIS story — data, pairs, words, checks — lives in ./beat.mjs, the one
// file the model writes. Copied into the beat by the harness; never edited by the model.
//
// Each pair is one entity at two states, each drawn as its own stem from ZERO: the levels are the
// first reading, the change the second. The change is COMPUTED here from the two values.
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
import { DirectedLollipops } from "./DirectedLollipops.tsx";
import beat from "./beat.mjs";
import { applyStoryboard, assertNumbers, assertLegibleLabels, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
applyStoryboard(beat, dirname(fileURLToPath(import.meta.url)));

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "renders");
const SIZE = exportSizeFromArgv();
const FRAME = directedFrame(SIZE);
assertBeatMayEnter(HERE, SIZE, { what: basename(HERE) });

const REQUIRED = ["eyebrow", "pairs", "subject", "from", "to", "unit", "rule", "format", "title", "limits", "reading", "source", "alt", "check"];
const missing = REQUIRED.filter((key) => beat[key] === undefined);
if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);

assertNumbers(beat.pairs.flatMap((p) => [[`${p.key} before`, p.before], [`${p.key} after`, p.after]]), "pairs");
const values = beat.pairs.flatMap((p) => [p.before, p.after]);
assertLegibleLabels(values, beat.format);

// THE TYPE'S OWN REFUSALS — what this component cannot draw honestly.
if (beat.pairs.length < 2 || beat.pairs.length > 8)
  throw new Error(`pairs holds ${beat.pairs.length} entities; a lollipop plate draws 2 to 8 pairs side by side. Keep the subject and the largest others, and say in rule how they were chosen`);
const keys = beat.pairs.map((p) => p.key);
if (new Set(keys).size !== keys.length) throw new Error(`two pairs share a key (${keys.join(", ")}): one pair per entity — filter data.json to one row per entity`);
if (!keys.includes(beat.subject)) throw new Error(`subject ${JSON.stringify(beat.subject)} is not the key of any pair (${keys.join(", ")})`);
const negative = beat.pairs.filter((p) => p.before < 0 || p.after < 0);
if (negative.length)
  throw new Error(`${negative.map((p) => p.key).join(", ")} hold a negative value: a lollipop stem is a height from zero. A change that crosses zero is a diverging bar, not a lollipop`);
const fromZero = beat.pairs.filter((p) => p.before === 0);
if (fromZero.length)
  throw new Error(`${fromZero.map((p) => p.key).join(", ")} start at 0, so their change in per cent is undefined: leave them out and say so in limits`);
if (String(beat.from) === String(beat.to)) throw new Error(`from and to are both ${beat.from}: the two states must differ`);

const pairs = beat.pairs.map((p) => ({ code: p.key, name: p.name, before: p.before, after: p.after, change: ((p.after - p.before) / p.before) * 100 }));
const subject = pairs.find((p) => p.code === beat.subject);

beat.check({ pairs, subject });
assertDrawsClaimColumn(values, HERE);
// A paired plate's headline speaks in levels, in growth (after / before) or in the ratio between the
// subject and another pair at one state: all three are read off the drawn heads.
const ratios = pairs.flatMap((p) => [
  p.after / p.before,
  p.before / subject.before, subject.before / p.before,
  p.after / subject.after, subject.after / p.after,
]).filter(Number.isFinite);
assertHeadlineNumbersDrawn([beat.title].flat()[0], [...values, ...ratios], "heads");

const facts = beatFacts(
  pairs.map((p) => ({ key: p.code, label: p.name, value: p.after })),
  {
    subject: subject.name,
    states: [String(beat.from), String(beat.to)],
    markers: pairs.map((p) => ({ key: p.code, label: p.name, value: p.before })),
    declaredSequence: beat.unit,
  },
);
const offered = applicableTreatments(facts);

const titles = [beat.title].flat();
const limits = [beat.limits].flat();
const reading = [beat.reading].flat();
const formatChange = beat.formatChange ?? ((v) => `${v > 0 ? "+" : "−"}${Math.abs(Math.round(v))} %`);
const textPerRegister = {
  display: titles.join(" "),
  eyebrow: beat.eyebrow,
  body: `${limits.join(" ")} ${beat.source}`,
  axis: `${beat.unit} ${beat.rule} ${beat.from} ${beat.to} 0 5 10 15 20 25`,
  annot: `${reading.join(" ")} ${pairs.map((p) => p.name).join(" ")}`,
  value: pairs.map((p) => `${beat.format(p.before)} ${beat.format(p.after)} ${formatChange(p.change)}`).join(" "),
};

const labelOf = (id) => id.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const newsroom = readPalette(HERE);
let chosen;
if (directionReachable(HERE)) {
  const run = readRunDirection(HERE);
  chosen = [{ label: labelOf(run.id), direction: run }];
} else {
  const composition = composeDirections({ newsroom, filed: filedDirections(), beat: { evidenceLevels: beat.evidenceLevels ?? 4 }, textPerRegister });
  if (!composition.offered.length) throw new Error(`no composed direction holds up for this beat:\n${composeReport(composition, {})}`);
  chosen = composition.offered.slice(0, 1).map((d) => ({ label: labelOf(d.id), direction: d }));
}

const alt = typeof beat.alt === "function" ? beat.alt({ pairs, subject }) : beat.alt;
const refused = [];
for (const { label: id, direction: chosenDirection } of chosen) {
  const direction = resolveDirectionFamilies(chosenDirection, textPerRegister);
  try {
    await renderStill({
      element: createElement(DirectedLollipops, {
        frame: { width: FRAME.width, height: FRAME.height },
        pairs,
        subject: beat.subject,
        from: beat.from,
        to: beat.to,
        unit: beat.unit,
        rule: beat.rule,
        title: titles,
        limits,
        reading,
        source: beat.source,
        alt,
        eyebrow: beat.eyebrow,
        direction,
        treatments: offered.map((t) => t.id),
        format: beat.format,
        formatChange,
        onLadder: (note) => console.log(`  ${note}`),
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
