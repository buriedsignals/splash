// The generic half of a radar beat: art direction, treatments, render and refusals, taken from
// proof/static-radar-electricity-mix/render-directions.mjs with everything about ITS subject
// removed. Everything about THIS story — data, spokes, words, checks — lives in ./beat.mjs, the one
// file the model writes. Copied into the beat by the harness; never edited by the model.
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
import { DirectedRadar } from "./DirectedRadar.tsx";
import beat from "./beat.mjs";
import { applyStoryboard, assertNumbers, assertLegibleLabels, assertHeadlineNumbersDrawn, errorText } from "./guards.mjs";
applyStoryboard(beat, dirname(fileURLToPath(import.meta.url)));

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "renders");
const SIZE = exportSizeFromArgv();
const FRAME = directedFrame(SIZE);
assertBeatMayEnter(HERE, SIZE, { what: basename(HERE) });

const REQUIRED = ["eyebrow", "items", "subject", "spokes", "format", "title", "limits", "reading", "source", "alt", "check"];
const missing = REQUIRED.filter((key) => beat[key] === undefined);
if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);

const { items, subject, spokes } = beat;

// ── what this component can draw honestly ─────────────────────────────────
if (!Array.isArray(items) || items.length !== 2)
  throw new Error(
    `items holds ${Array.isArray(items) ? items.length : "no list of"} item(s): this radar draws exactly TWO polygons, ` +
      `the subject in the accent and one other in muted ink — a third would share the muted ink and be ` +
      `indistinguishable. Keep the subject and the ONE item the takeaway compares it to; for more items, ` +
      `the right form is small multiples (one radar per item).`,
  );
if (!items.includes(subject))
  throw new Error(`subject is ${JSON.stringify(subject)}, which is not one of items (${items.join(", ")}): set subject to the item the takeaway is about, spelled as in items`);
if (!Array.isArray(spokes) || spokes.length < 3)
  throw new Error(`spokes holds ${spokes?.length ?? 0} spoke(s): a radar needs at least three to close a polygon. With two variables the form is a scatter plot`);
if (spokes.length > 10)
  throw new Error(`spokes holds ${spokes.length} spokes: the wheel was measured with nine, and past ten the spoke labels crowd each other. Merge the smallest categories into one spoke ("Other …") and say so in the standfirst`);
for (const s of spokes) {
  for (const key of ["key", "label", "family", "shares"])
    if (s[key] === undefined) throw new Error(`a spoke is missing ${key}: every spoke is { key, label, family, shares } (see CONTRACT.md)`);
  if (!Array.isArray(s.shares) || s.shares.length !== items.length)
    throw new Error(`spoke ${s.label} has ${s.shares?.length ?? 0} share(s); it needs one per item, in the order of items (${items.join(", ")})`);
}
assertNumbers(spokes.flatMap((s) => s.shares.map((v, i) => [`${s.label}/${items[i]}`, v])), "spoke shares");
const negative = spokes.flatMap((s) => s.shares.map((v, i) => [s.label, items[i], v])).filter(([, , v]) => v < 0);
if (negative.length)
  throw new Error(`a radius cannot be negative, and ${negative[0][0]} for ${negative[0][1]} is ${negative[0][2]}: a radar draws parts of a whole; a signed change is a diverging bar`);
const labels = spokes.map((s) => s.label);
const doubled = labels.filter((l, i) => labels.indexOf(l) !== i);
if (doubled.length) throw new Error(`two spokes are labelled ${doubled[0]}: give every spoke its own label`);

/** ONE DENOMINATOR FOR EVERY SPOKE — what makes nine axes on one radial scale legitimate. Each item's
 *  shares are parts of THAT item's own whole, so they add up to 100. */
items.forEach((item, i) => {
  const total = spokes.reduce((sum, s) => sum + s.shares[i], 0);
  if (Math.abs(total - 100) > 0.5)
    throw new Error(
      `${item}'s shares add up to ${total.toFixed(2)}, not 100: every spoke must be a share (in %) of the SAME whole — ` +
        `that item's own total across all the spokes. Compute each share as value / (sum of that item's spoke values) * 100, ` +
        `and include every category in the spokes (merge small ones into an "other" spoke). Different units on different spokes are a parallel-coordinates chart, not a radar.`,
    );
});

/** THE SPOKE ORDER IS AN EDITORIAL DECISION: spokes run family by family clockwise from twelve, so a
 *  family split around the wheel is an order nobody chose. */
const runs = spokes.map((s) => s.family).filter((f, i, all) => i === 0 || all[i - 1] !== f);
const scattered = runs.filter((f, i) => runs.indexOf(f) !== i);
if (scattered.length)
  throw new Error(`the family ${JSON.stringify(scattered[0])} appears in two places around the wheel: order spokes so each family's spokes are adjacent (clockwise from twelve), and say that order in the reading line`);

const allShares = spokes.flatMap((s) => s.shares);
assertLegibleLabels(allShares, beat.format);
beat.check();
// `assertDrawsClaimColumn` is not called: a radar draws shares COMPUTED from the columns, never a
// column's raw values, so the guard would refuse every honest radar.
assertHeadlineNumbersDrawn([beat.title].flat()[0], allShares, "shares");

/** The ceiling is the next round ring above the largest share — a number a reader can hold. */
const largest = Math.max(...allShares);
const ceiling = Math.ceil(largest / 10) * 10;
const rings = [ceiling / 4, ceiling / 2, (ceiling * 3) / 4, ceiling];
const ceilingLabel = `${beat.format(ceiling)} %`;

const title = [beat.title].flat();
const limits = [beat.limits].flat();
const reading = [typeof beat.reading === "function" ? beat.reading(ceilingLabel) : beat.reading].flat();
const alt = typeof beat.alt === "function" ? beat.alt(ceilingLabel) : beat.alt;

const facts = beatFacts(
  spokes.map((s) => ({ key: s.key, label: s.label, value: Math.max(...s.shares) })),
  {
    subject,
    spokes: spokes.map((s) => ({ key: s.key })),
    namedSeries: items,
    declaredSequence: "family",
  },
);
const offered = applicableTreatments(facts);
const textPerRegister = {
  display: title.join(" "),
  eyebrow: beat.eyebrow,
  body: `${limits.join(" ")} ${beat.source}`,
  axis: ceilingLabel,
  annot: `${labels.join(" ")} ${reading.join(" ")} ${items.join(" ")}`,
  value: spokes.map((s) => s.shares.map(beat.format).join(" · ")).join(" "),
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
      element: createElement(DirectedRadar, {
        frame: { width: FRAME.width, height: FRAME.height },
        spokes,
        items,
        subject,
        ceiling,
        ceilingLabel,
        rings,
        title,
        limits,
        reading,
        source: beat.source,
        alt,
        eyebrow: beat.eyebrow,
        format: beat.format,
        direction,
        treatments: offered.map((t) => t.id),
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
