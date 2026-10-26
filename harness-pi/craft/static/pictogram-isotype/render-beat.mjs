// The generic half of a pictogram (unit grid) beat: block assignment, art direction, treatments,
// render and refusals, taken from proof/static-pictogram-europe-lowcarbon/render-directions.mjs
// with everything about ITS subject removed. Everything about THIS story — data, blocks, words,
// checks — lives in ./beat.mjs, the one file the model writes. Copied into the beat by the harness;
// never edited by the model.
//
// One square is one REAL thing (a country, a school, a person), never a slice of a quantity. The
// squares are put in their blocks and the blocks COUNTED here, from the value ranges beat.mjs
// declares, and the counts are handed to check(): beat.mjs never types a count.
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
import { DirectedUnitGrid } from "./DirectedUnitGrid.tsx";
import beat from "./beat.mjs";
import { applyStoryboard, assertNumbers, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
applyStoryboard(beat, dirname(fileURLToPath(import.meta.url)));

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "renders");
const SIZE = exportSizeFromArgv();
const FRAME = directedFrame(SIZE);
assertBeatMayEnter(HERE, SIZE, { what: basename(HERE) });

const REQUIRED = ["eyebrow", "units", "blocks", "breaks", "formatBreak", "unitIs", "absent", "absentNote", "title", "limits", "reading", "source", "alt", "check"];
const missing = REQUIRED.filter((key) => beat[key] === undefined);
if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")} (see CONTRACT.md)`);

// THE TYPE'S OWN REFUSALS — what this component cannot draw honestly.
assertNumbers(beat.units.map((u) => [u.key, u.value]), "unit values");
if (beat.units.length < 10 || beat.units.length > 200)
  throw new Error(`units holds ${beat.units.length} things; a countable field is 10 to 200 squares. With fewer, draw a bar; with more, a square is no longer one thing a reader can count — choose a histogram`);
const keys = beat.units.map((u) => u.key);
if (new Set(keys).size !== keys.length) throw new Error(`two units share a key: one square per thing — filter data.json to one row per thing (one year)`);
if (beat.blocks.length < 1 || beat.blocks.length > 5) throw new Error(`blocks holds ${beat.blocks.length} groups; the grid draws 1 to 5`);
const lo = (b) => b.min ?? -Infinity;
const hi = (b) => b.max ?? Infinity;
const homes = beat.units.map((u) => ({ u, in: beat.blocks.filter((b) => u.value >= lo(b) && u.value < hi(b)) }));
const homeless = homes.filter((h) => h.in.length === 0);
if (homeless.length)
  throw new Error(`${homeless.length} unit(s) fall in no block (${homeless.slice(0, 3).map((h) => `${h.u.label}=${h.u.value}`).join(", ")}): the blocks' min/max ranges must cover every value (a block takes min <= value < max)`);
const doubled = homes.filter((h) => h.in.length > 1);
if (doubled.length)
  throw new Error(`${doubled[0].u.label} (${doubled[0].u.value}) falls in ${doubled[0].in.length} blocks: block ranges must not overlap (min <= value < max)`);
if (!beat.blocks.some((b) => b.thread)) throw new Error(`no block has thread: true — mark the block(s) the takeaway is about`);
const breaks = beat.breaks;
assertNumbers(breaks.map((b, i) => [`breaks[${i}]`, b]), "breaks");
if (breaks.length < 1 || breaks.length > 6 || breaks.some((b, i) => i && b <= breaks[i - 1]))
  throw new Error(`breaks must be 1 to 6 increasing numbers (the shade class edges); they are ${JSON.stringify(breaks)}`);
const absent = [beat.absent].flat();
if (absent.length && !String(beat.absentNote).includes(String(absent.length)))
  throw new Error(`${absent.length} thing(s) have no reading and are not drawn; absentNote must say so with that count, it says: "${beat.absentNote}"`);

const classOf = (v) => breaks.filter((b) => v >= b).length;
const blocks = beat.blocks.map((b) => {
  const members = beat.units.filter((u) => u.value >= lo(b) && u.value < hi(b)).sort((x, y) => y.value - x.value);
  return { name: b.name, count: members.length, thread: Boolean(b.thread), units: members.map((u) => ({ key: u.key, label: u.label, value: u.value, classIndex: classOf(u.value) })) };
});
const total = beat.units.length;
const counts = Object.fromEntries(beat.blocks.map((b, i) => [b.key ?? String(i), blocks[i].count]));

beat.check({ blocks, counts, total });
assertDrawsClaimColumn(beat.units.map((u) => u.value), HERE);
assertHeadlineNumbersDrawn([beat.title].flat()[0], [...blocks.map((b) => b.count), total, absent.length], "block counts");

const facts = beatFacts(
  beat.units.map((u) => ({ key: u.key, label: u.label, value: u.value })),
  {
    subject: blocks.find((b) => b.thread).units[0]?.key ?? beat.units[0].key,
    units: { count: total, thing: beat.unitThing ?? "unit" },
    cells: beat.units.map((u) => ({ key: u.key, value: u.value })),
    scaleClasses: breaks.length + 1,
    declaredSequence: beat.unitThing ?? "value",
  },
);
const offered = applicableTreatments(facts);

const titles = [beat.title].flat();
const limits = [beat.limits].flat();
const reading = [beat.reading].flat();
const format = beat.format ?? ((v) => String(v));
const breakLabels = breaks.map((b) => beat.formatBreak(b));
const textPerRegister = {
  display: titles.join(" "),
  eyebrow: beat.eyebrow,
  body: `${limits.join(" ")} ${beat.source}`,
  axis: `${breakLabels.join(" ")} ${beat.unitIs} ${beat.absentNote}`,
  annot: `${reading.join(" ")} ${blocks.map((b) => b.name).join(" ")}`,
  value: blocks.map((b) => format(b.count)).join(" "),
};

const labelOf = (id) => id.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const newsroom = readPalette(HERE);
let chosen;
if (directionReachable(HERE)) {
  const run = readRunDirection(HERE);
  chosen = [{ label: labelOf(run.id), direction: run }];
} else {
  const composition = composeDirections({ newsroom, filed: filedDirections(), beat: { evidenceLevels: beat.evidenceLevels ?? breaks.length + 1 }, textPerRegister });
  if (!composition.offered.length) throw new Error(`no composed direction holds up for this beat:\n${composeReport(composition, {})}`);
  chosen = composition.offered.slice(0, 1).map((d) => ({ label: labelOf(d.id), direction: d }));
}

const alt = typeof beat.alt === "function" ? beat.alt({ blocks, counts, total }) : beat.alt;
const refused = [];
for (const { label: id, direction: chosenDirection } of chosen) {
  const direction = resolveDirectionFamilies(chosenDirection, textPerRegister);
  try {
    await renderStill({
      element: createElement(DirectedUnitGrid, {
        frame: { width: FRAME.width, height: FRAME.height },
        blocks,
        breaks: breakLabels,
        unitIs: beat.unitIs,
        middleNote: beat.absentNote,
        title: titles,
        limits,
        reading,
        source: beat.source,
        alt,
        eyebrow: beat.eyebrow,
        format,
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
    console.log(`REFUSED — ${error.message}`);
  }
}
if (refused.length) process.exit(1);
