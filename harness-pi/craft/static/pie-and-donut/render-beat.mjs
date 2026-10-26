// The generic half of a donut beat: shares, art direction, treatments, render and refusals, taken
// from proof/static-donut-world-co2-share/render-directions.mjs with everything about ITS subject
// removed. Everything about THIS story — data, rings, words, checks — lives in ./beat.mjs, the one
// file the model writes. Copied into the beat by the harness; never edited by the model.
//
// One ring per entity; one full turn is 100 % of ONE whole, the same on every ring; two concentric
// arcs give the entity's share at two states, and its absolute value at both is printed under the
// ring (a shrinking share can be a growing number when the whole grows). The shares are COMPUTED
// here from the absolute values and the wholes beat.mjs gives.
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
import { DirectedDonuts } from "./DirectedDonuts.tsx";
import beat from "./beat.mjs";
import { applyStoryboard, assertNumbers, assertLegibleLabels, assertHeadlineNumbersDrawn, assertDrawsClaimColumn, errorText } from "./guards.mjs";
applyStoryboard(beat, dirname(fileURLToPath(import.meta.url)));

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "renders");
const SIZE = exportSizeFromArgv();
const FRAME = directedFrame(SIZE);
assertBeatMayEnter(HERE, SIZE, { what: basename(HERE) });

const REQUIRED = ["eyebrow", "rings", "wholeBefore", "wholeAfter", "subject", "from", "to", "unit", "wholeNote", "formatShare", "formatAbsolute", "title", "limits", "reading", "source", "alt", "check"];
const missing = REQUIRED.filter((key) => beat[key] === undefined);
if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);

// THE TYPE'S OWN REFUSALS — what this component cannot draw honestly.
assertNumbers(beat.rings.flatMap((r) => [[`${r.key} before`, r.before], [`${r.key} after`, r.after]]), "ring values");
assertNumbers([["wholeBefore", beat.wholeBefore], ["wholeAfter", beat.wholeAfter]], "wholes");
if (beat.rings.length < 2 || beat.rings.length > 8)
  throw new Error(`rings holds ${beat.rings.length} entities; the plate draws 2 to 8 rings side by side. Keep the subject and the largest others, and say in limits how they were chosen`);
const keys = beat.rings.map((r) => r.key);
if (new Set(keys).size !== keys.length) throw new Error(`two rings share a key: one ring per entity`);
if (!keys.includes(beat.subject)) throw new Error(`subject ${JSON.stringify(beat.subject)} is not the key of any ring (${keys.join(", ")})`);
if (!(beat.wholeBefore > 0 && beat.wholeAfter > 0)) throw new Error(`wholeBefore and wholeAfter must be positive totals: one turn is 100 % of that whole`);
const negative = beat.rings.filter((r) => r.before < 0 || r.after < 0);
if (negative.length) throw new Error(`${negative.map((r) => r.key).join(", ")} hold a negative value: an arc is a part of a whole and cannot be below zero — choose a diverging bar`);
for (const [state, whole, pick] of [["before", beat.wholeBefore, (r) => r.before], ["after", beat.wholeAfter, (r) => r.after]]) {
  const sum = beat.rings.reduce((s, r) => s + pick(r), 0);
  if (sum > whole * (1 + 1e-9))
    throw new Error(`the rings' ${state} values add up to ${sum}, more than the whole (${whole}): the whole must be the total of ALL parts (every row of the partition, not only the rings drawn), and the rings must be parts of it, not overlapping groups`);
}
if (String(beat.from) === String(beat.to)) throw new Error(`from and to are both ${beat.from}: the two states must differ`);

const rings = beat.rings.map((r) => ({
  code: r.key,
  name: r.name,
  shareBefore: (r.before / beat.wholeBefore) * 100,
  shareAfter: (r.after / beat.wholeAfter) * 100,
  gtBefore: r.before,
  gtAfter: r.after,
}));
const wholeGrowth = (beat.wholeAfter / beat.wholeBefore - 1) * 100;
const computed = { rings, wholeGrowth };
assertLegibleLabels(rings.map((r) => r.shareAfter), (v) => beat.formatShare(v));

beat.check(computed);
assertDrawsClaimColumn(beat.rings.flatMap((r) => [r.before, r.after]), HERE);
assertHeadlineNumbersDrawn(
  [beat.title].flat()[0],
  [...rings.flatMap((r) => [r.shareBefore, r.shareAfter, r.gtBefore, r.gtAfter]), beat.wholeBefore, beat.wholeAfter],
  "rings",
);

const subject = rings.find((r) => r.code === beat.subject);
const facts = beatFacts(
  rings.map((r) => ({ key: r.code, label: r.name, value: r.shareAfter })),
  {
    subject: subject.name,
    states: [String(beat.from), String(beat.to)],
    markers: rings.map((r) => ({ key: r.code, label: r.name, value: r.shareBefore })),
    panels: { count: rings.length, sharedScale: true },
    declaredSequence: beat.unit,
  },
);
const offered = applicableTreatments(facts);

const titles = [beat.title].flat();
const limits = [beat.limits].flat();
const reading = [beat.reading].flat();
const textPerRegister = {
  display: titles.join(" "),
  eyebrow: beat.eyebrow,
  body: `${limits.join(" ")} ${beat.source}`,
  axis: `${beat.unit} ${beat.wholeNote} ${beat.from} ${beat.to} ${rings.map((r) => `${beat.formatAbsolute(r.gtBefore)} ${beat.formatAbsolute(r.gtAfter)}`).join(" ")}`,
  annot: `${reading.join(" ")} ${rings.map((r) => r.name).join(" ")}`,
  value: rings.map((r) => beat.formatShare(r.shareAfter)).join(" "),
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

const alt = typeof beat.alt === "function" ? beat.alt(computed) : beat.alt;
const refused = [];
for (const { label: id, direction: chosenDirection } of chosen) {
  const direction = resolveDirectionFamilies(chosenDirection, textPerRegister);
  try {
    await renderStill({
      element: createElement(DirectedDonuts, {
        frame: { width: FRAME.width, height: FRAME.height },
        rings,
        subject: beat.subject,
        from: beat.from,
        to: beat.to,
        unit: beat.unit,
        worldNote: beat.wholeNote,
        title: titles,
        limits,
        reading,
        source: beat.source,
        alt,
        eyebrow: beat.eyebrow,
        direction,
        treatments: offered.map((t) => t.id),
        formatShare: beat.formatShare,
        formatAbsolute: beat.formatAbsolute,
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
    console.log(`REFUSED — ${errorText(error)}`);
  }
}
if (refused.length) process.exit(1);
