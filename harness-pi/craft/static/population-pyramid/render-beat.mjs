// The generic half of a population-pyramid beat: art direction, treatments, render and refusals,
// taken from proof/static-swiss-age-pyramid/render-directions.mjs with everything about ITS subject
// removed. Everything about THIS story — bands, halves, words, checks — lives in ./beat.mjs, the one
// file the model writes. Copied into the beat by the harness; never edited by the model.
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
import { DirectedPyramid } from "./DirectedPyramid.tsx";
import beat from "./beat.mjs";
import { applyStoryboard, assertNumbers, assertOnePerX, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
applyStoryboard(beat, dirname(fileURLToPath(import.meta.url)));

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "renders");
const SIZE = exportSizeFromArgv();
const FRAME = directedFrame(SIZE);
assertBeatMayEnter(HERE, SIZE, { what: basename(HERE) });

const REQUIRED = ["eyebrow", "entity", "bands", "leftName", "rightName", "crossing", "crossingLabel", "title", "limits", "source", "alt", "check"];
const missing = REQUIRED.filter((key) => beat[key] === undefined);
if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")} (see CONTRACT.md)`);

const bands = beat.bands;
if (!Array.isArray(bands) || bands.length < 3)
  throw new Error(`bands must hold at least three { band, left, right } rows, youngest first; it holds ${Array.isArray(bands) ? bands.length : typeof bands}`);
assertNumbers(bands.flatMap((b) => [[`${b.band} left`, b.left], [`${b.band} right`, b.right]]), "bands");
assertOnePerX(bands, "band");
// THE PYRAMID'S OWN REFUSALS. A half is a count of people (or a share of them), never below zero:
// the left side is the other group, not a subtraction.
const negative = bands.filter((b) => b.left < 0 || b.right < 0);
if (negative.length)
  throw new Error(`band ${negative[0].band} holds a negative half (${negative[0].left}, ${negative[0].right}): a pyramid draws two counts mirrored about a spine, never a difference. Put each group's own count in left and right; a gain or loss is a diverging bar`);
beat.check();
assertDrawsClaimColumn(bands.flatMap((b) => [b.left, b.right]), HERE);
// The band names ("60-64") are not drawn values: they leave the headline before its figures are checked.
const headline = bands.reduce((t, b) => t.split(b.band).join(" "), String([beat.title].flat()[0]));
assertHeadlineNumbersDrawn(headline, bands.flatMap((b) => [b.left, b.right]), "halves");

// The crossing the plate draws is the FIRST band where the halves change places, labelled
// "<rightName> ahead from <band>". So the band the beat names must be that one, and the halves must
// not change places back further up, or the label states a "from here on" the data contradicts.
const leads = (b) => Math.sign(b.right - b.left);
const first = leads(bands[0]);
const at = bands.findIndex((b, i) => i > 0 && leads(b) !== 0 && leads(b) !== first);
const derived = at > 0 ? bands[at].band : null;
if (beat.crossing !== derived)
  throw new Error(
    derived === null
      ? `crossing is ${JSON.stringify(beat.crossing)}, but the two halves never change places in bands: set crossing: null, and do not claim a crossing in the title`
      : `crossing is ${JSON.stringify(beat.crossing)}, but the halves first change places at ${JSON.stringify(derived)} (bands run youngest first): set crossing to that band, computed from the data`,
  );
if (derived !== null) {
  const back = bands.slice(at + 1).find((b) => leads(b) !== 0 && leads(b) === first);
  if (back)
    throw new Error(`the halves change places at ${derived} and change back at ${back.band}: the plate's crossing label says "ahead from ${derived}" and would be false. Draw a narrower age range (filter bands) or set crossing: null and claim no crossing`);
}
// The axis ticks the component draws, printed by tickFormat, must read differently.
const tickFormat = beat.tickFormat ?? ((v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(Math.round(v))));
const most = Math.max(...bands.flatMap((b) => [b.left, b.right]));
const ticks = scaleLinear().domain([0, most]).nice(4).ticks(4).filter((t) => t > 0);
const tickLabels = ticks.map(tickFormat);
if (new Set(tickLabels).size < ticks.length)
  throw new Error(`the axis ticks ${ticks.join(", ")} print as ${tickLabels.join(", ")}: give beat.mjs a tickFormat(v) that prints them apart (shares need decimals, e.g. v.toFixed(1) + " %")`);

// The component reads { band, male, female }: male is the LEFT half, female the RIGHT.
const drawn = bands.map((b) => ({ band: b.band, male: b.left, female: b.right }));
const facts = beatFacts(
  bands.map((b) => ({ key: b.band, label: b.band, value: b.left + b.right })),
  {
    subject: beat.entity,
    namedSeries: [beat.leftName, beat.rightName],
    mirrored: bands.map((b) => ({ key: b.band, left: b.left, right: b.right })),
  },
);
const offered = applicableTreatments(facts);
const titles = [beat.title].flat();
const limits = [beat.limits].flat();
const textPerRegister = {
  display: titles.join(" "),
  eyebrow: beat.eyebrow,
  body: `${limits.join(" ")} ${beat.source}`,
  axis: tickLabels.join(" "),
  annot: `${beat.leftName} ${beat.rightName} ${bands.map((b) => b.band).join(" ")} ${derived ? beat.crossingLabel(beat.rightName, derived) : ""}`,
  value: bands.map((b) => String(b.left)).join(" "),
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
      element: createElement(DirectedPyramid, {
        frame: { width: FRAME.width, height: FRAME.height },
        bands: drawn,
        title: titles,
        limits,
        source: beat.source,
        alt: beat.alt,
        eyebrow: beat.eyebrow,
        leftName: beat.leftName,
        rightName: beat.rightName,
        crossingLabel: beat.crossingLabel,
        tickFormat,
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
