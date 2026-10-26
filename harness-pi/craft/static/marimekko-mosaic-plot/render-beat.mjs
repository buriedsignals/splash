// The generic half of a marimekko beat: arithmetic, art direction, treatments, render and
// refusals, taken from proof/static-marimekko-electricity-mix/render-directions.mjs with everything
// about ITS subject removed. Everything about THIS story — data, bands, words, checks — lives in
// ./beat.mjs, the one file the model writes. Copied into the beat by the harness; never edited by
// the model.
//
// A marimekko multiplies two scales, so a band's AREA is a quantity. The column totals, the shares
// and the tracked band's total are COMPUTED here from the band values beat.mjs gives, and handed to
// check(): beat.mjs never types a total that the bands could contradict.
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
import { DirectedMarimekko } from "./DirectedMarimekko.tsx";
import beat from "./beat.mjs";
import { applyStoryboard, assertNumbers, assertLegibleLabels, assertHeadlineNumbersDrawn, assertDrawsClaimColumn, errorText } from "./guards.mjs";
applyStoryboard(beat, dirname(fileURLToPath(import.meta.url)));

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "renders");
const SIZE = exportSizeFromArgv();
const FRAME = directedFrame(SIZE);
assertBeatMayEnter(HERE, SIZE, { what: basename(HERE) });

const REQUIRED = ["eyebrow", "columns", "bandOrder", "tracked", "unit", "widthName", "format", "title", "limits", "reading", "source", "alt", "check"];
const missing = REQUIRED.filter((key) => beat[key] === undefined);
if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);

// THE TYPE'S OWN REFUSALS — what this component cannot draw honestly.
const order = beat.bandOrder;
if (order.length < 2 || order.length > 10)
  throw new Error(`bandOrder holds ${order.length} bands; a marimekko stacks 2 to 10. Add the smallest bands of one family together (and name the merged band so)`);
if (new Set(order.map((b) => b.key)).size !== order.length) throw new Error(`two bands in bandOrder share a key`);
if (!order.some((b) => b.key === beat.tracked))
  throw new Error(`tracked ${JSON.stringify(beat.tracked)} is not the key of a band in bandOrder (${order.map((b) => b.key).join(", ")})`);
if (beat.columns.length < 2 || beat.columns.length > 8)
  throw new Error(`columns holds ${beat.columns.length} entities; a marimekko draws 2 to 8 columns. Group the smallest into one named column, or choose a stacked bar`);
for (const c of beat.columns) {
  const absent = order.filter((b) => !(b.key in c.values));
  if (absent.length) throw new Error(`column ${c.key} has no value for ${absent.map((b) => b.key).join(", ")}: every column carries every band (0 where there is none)`);
}
assertNumbers(beat.columns.flatMap((c) => order.map((b) => [`${c.key}.${b.key}`, c.values[b.key]])), "band values");
const negative = beat.columns.flatMap((c) => order.filter((b) => c.values[b.key] < 0).map((b) => `${c.key}.${b.key}`));
if (negative.length) throw new Error(`${negative.slice(0, 3).join(", ")} are negative: a band's area is a quantity and cannot be below zero`);

const columns = beat.columns
  .map((c) => {
    const bands = order.map((b) => ({ key: b.key, label: b.label, value: c.values[b.key] }));
    return { key: c.key, label: c.label, bands, total: bands.reduce((s, b) => s + b.value, 0) };
  })
  .sort((a, b) => b.total - a.total);
const empty = columns.filter((c) => !(c.total > 0));
if (empty.length) throw new Error(`${empty.map((c) => c.key).join(", ")} total 0: a column with no width cannot be drawn — leave it out and say so in limits`);
const grand = columns.reduce((s, c) => s + c.total, 0);
const smallest = columns[columns.length - 1];
if (smallest.total / grand < 0.03)
  throw new Error(`${smallest.label} is ${((smallest.total / grand) * 100).toFixed(1)} % of the whole, a sliver too narrow to encode its width: put the smallest columns together in one column named for all of them (say so in reading), or leave them out and say so in limits`);

const trackedTotal = columns.reduce((s, c) => s + c.bands.find((b) => b.key === beat.tracked).value, 0);
const holders = columns
  .map((c) => ({ key: c.key, label: c.label, value: c.bands.find((b) => b.key === beat.tracked).value }))
  .sort((a, b) => b.value - a.value);
const computed = { columns, grand, trackedTotal, trackedShare: trackedTotal / grand, holders };

assertLegibleLabels(columns.map((c) => c.total), beat.format);
beat.check(computed);
assertDrawsClaimColumn(holders.map((h) => h.value), HERE);
assertHeadlineNumbersDrawn(
  [beat.title].flat()[0],
  [...columns.map((c) => c.total), ...columns.flatMap((c) => c.bands.map((b) => b.value)), trackedTotal],
  "columns and bands",
);

/** R8 off landscape, as the worked example does it: the two narrowest columns share ONE column,
 *  named for both, their bands added. Nothing is dropped, and beat.mergeNote says so on the plate. */
let drawnColumns = columns;
let reading = [beat.reading].flat();
if (SIZE !== "landscape") {
  if (typeof beat.mergeNote !== "function")
    throw new Error(`at ${SIZE} the two narrowest columns share one column, and the plate must say so: add mergeNote(a, b) to beat.mjs, returning the sentence (with the two labels) that heads the reading line`);
  const [a, b] = columns.slice(-2);
  drawnColumns = [
    ...columns.slice(0, -2),
    { key: `${a.key}+${b.key}`, label: `${a.label.slice(0, 3)}. + ${b.label}`, bands: a.bands.map((band, i) => ({ ...band, value: band.value + b.bands[i].value })), total: a.total + b.total },
  ].sort((x, y) => y.total - x.total);
  const note = beat.mergeNote(a.label, b.label).trim();
  reading = [...reading.map((r) => `${note} ${r}`), note];
}

const families = Object.fromEntries(order.map((b, i) => [b.key, { family: b.family ?? "", order: i, total: order.length }]));
const facts = beatFacts(
  drawnColumns.map((c) => ({ key: c.key, label: c.label, value: c.total })),
  {
    subject: holders[0].key,
    widths: drawnColumns.map((c) => ({ key: c.key, value: c.total })),
    namedSeries: order.map((b) => b.label),
    declaredSequence: "family",
  },
);
const offered = applicableTreatments(facts);

const titles = [beat.title].flat();
const limits = [beat.limits].flat();
const percent = beat.percent ?? ((share) => (share >= 0.095 ? `${Math.round(share * 100)} %` : share >= 0.005 ? `${(share * 100).toFixed(1)} %` : ""));
const textPerRegister = {
  display: titles.join(" "),
  eyebrow: beat.eyebrow,
  body: `${limits.join(" ")} ${beat.source}`,
  axis: beat.unit,
  annot: `${drawnColumns.map((c) => c.label).join(" ")} ${order.map((b) => b.label).join(" ")} ${reading.join(" ")} ${beat.widthName}`,
  value: columns.map((c) => beat.format(c.total)).join(" "),
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

const alt = typeof beat.alt === "function" ? beat.alt(computed) : beat.alt;
const refused = [];
for (const { label: id, direction: chosenDirection } of chosen) {
  const direction = resolveDirectionFamilies(chosenDirection, textPerRegister);
  try {
    await renderStill({
      element: createElement(DirectedMarimekko, {
        frame: { width: FRAME.width, height: FRAME.height },
        columns: drawnColumns,
        onLadder: (note) => console.log(`  ${note}`),
        bandOrder: order.map((b) => b.key),
        families,
        tracked: beat.tracked,
        unit: beat.unit,
        widthName: beat.widthName,
        title: titles,
        limits,
        reading,
        source: beat.source,
        alt,
        eyebrow: beat.eyebrow,
        format: beat.format,
        percent,
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
    console.log(`REFUSED — ${errorText(error)}`);
  }
}
if (refused.length) process.exit(1);
