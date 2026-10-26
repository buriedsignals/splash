// The generic half of a connected-scatter beat: art direction, treatments, render and refusals, taken
// from proof/static-connected-scatter-lowcarbon/render-directions.mjs with everything about ITS
// subject removed. Everything about THIS story — the entities at two states, the axes' names, words,
// checks — lives in ./beat.mjs, the one file the model writes. Copied into the beat by the harness;
// never edited by the model.
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
import { DirectedConnectedScatter } from "./DirectedConnectedScatter.tsx";
import beat from "./beat.mjs";
import { applyStoryboard, assertNumbers, assertHeadlineNumbersDrawn, assertDrawsClaimColumn, errorText } from "./guards.mjs";
applyStoryboard(beat, dirname(fileURLToPath(import.meta.url)));

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "renders");
const SIZE = exportSizeFromArgv();
const FRAME = directedFrame(SIZE);
assertBeatMayEnter(HERE, SIZE, { what: basename(HERE) });

const REQUIRED = ["eyebrow", "entities", "subject", "from", "to", "xName", "yName", "title", "limits", "reading", "source", "alt", "check"];
const missing = REQUIRED.filter((key) => beat[key] === undefined);
if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);

// ── the entities, refused before anything is drawn ──────────────────────────
if (!Array.isArray(beat.entities) || beat.entities.length < 3 || beat.entities.length > 20)
  throw new Error(`entities holds ${beat.entities?.length ?? 0}: a connected scatter names every entity, which holds for 3 to 20 — keep the ones the takeaway is about`);
for (const e of beat.entities)
  for (const state of ["from", "to"])
    if (!e[state] || typeof e[state] !== "object") throw new Error(`${e.name} has no ${state} state: every entity is { name, label, from: { x, y }, to: { x, y } }`);
assertNumbers(beat.entities.flatMap((e) => [[`${e.name} from.x`, e.from.x], [`${e.name} from.y`, e.from.y], [`${e.name} to.x`, e.to.x], [`${e.name} to.y`, e.to.y]]), "states");
// Both axes start at zero (the worked example's are shares): a negative value has no seat.
const negative = beat.entities.filter((e) => [e.from.x, e.from.y, e.to.x, e.to.y].some((v) => v < 0));
if (negative.length)
  throw new Error(`entities hold negative values (${negative.slice(0, 3).map((e) => e.name).join(", ")}): both axes start at zero — draw measures that cannot be negative (shares, levels)`);
const names = new Set();
for (const e of beat.entities) {
  if (names.has(e.name)) throw new Error(`two entities are named ${JSON.stringify(e.name)}: one entity per name`);
  names.add(e.name);
}
if (!names.has(beat.subject)) throw new Error(`subject ${JSON.stringify(beat.subject)} is not an entity's name; the names are ${[...names].join(", ")}`);
if (String(beat.from) === String(beat.to)) throw new Error(`from and to are both ${JSON.stringify(beat.from)}: a connected scatter joins two different states`);
const still = beat.entities.filter((e) => e.from.x === e.to.x && e.from.y === e.to.y);
if (still.length === beat.entities.length) throw new Error(`no entity moves between ${beat.from} and ${beat.to}: the two states are the same reading — check which rows from and to read`);
const maxX = Math.max(...beat.entities.flatMap((e) => [e.from.x, e.to.x]));
const maxY = Math.max(...beat.entities.flatMap((e) => [e.from.y, e.to.y]));
const yTicks = beat.yTicks ?? scaleLinear().domain([0, maxY]).nice(4).ticks(4);
if (yTicks[yTicks.length - 1] < maxY)
  throw new Error(`yTicks end at ${yTicks[yTicks.length - 1]} but a value reaches ${maxY}: the y axis runs to the last tick — end yTicks at or above the largest y`);
const xTicks = beat.xTicks ?? scaleLinear().domain([0, maxX]).nice(4).ticks(4);
beat.check();
assertDrawsClaimColumn(beat.entities.flatMap((e) => [e.from.x, e.from.y, e.to.x, e.to.y]), HERE);
// A connected scatter's headline usually counts entities ("12 of 16 got lighter") or states a move.
assertHeadlineNumbersDrawn(
  [beat.title].flat()[0],
  [beat.entities.length, ...beat.entities.flatMap((e) => [e.from.x, e.from.y, e.to.x, e.to.y, e.to.x - e.from.x, e.to.y - e.from.y])],
  "points",
);

// The component reads { code, name, from: { weight, ownMix }, to }; the contract speaks { name, label, from: { x, y }, to }.
const state = (s) => ({ weight: s.x, ownMix: s.y, twh: 0 });
// `code` is the short form a name degrades to when the full one finds no seat; it is the mark's key.
const entities = beat.entities.map((e) => ({ code: e.code ?? e.name, name: e.label ?? e.name, from: state(e.from), to: state(e.to) }));
if (new Set(entities.map((e) => e.code)).size !== entities.length) throw new Error(`two entities share a code: give each a distinct code (or none)`);
const subjectCode = entities[beat.entities.findIndex((e) => e.name === beat.subject)].code;
const titles = [beat.title].flat();
const limits = [beat.limits].flat();
const reading = [beat.reading].flat().filter((r) => r !== "");
const subject = entities.find((e) => e.code === subjectCode);
const facts = beatFacts(
  entities.map((e) => ({ key: e.code, label: e.name, value: e.to.weight })),
  { subject: subject.name, states: [String(beat.from), String(beat.to)], continuousAxis: true, declaredSequence: beat.xName },
);
const offered = applicableTreatments(facts);
const textPerRegister = {
  display: titles.join(" "),
  eyebrow: beat.eyebrow,
  body: `${limits.join(" ")} ${beat.source}`,
  axis: `${beat.xName} ${beat.yName} ${[...xTicks, ...yTicks].join(" ")}`,
  annot: reading.join(" "),
  value: entities.map((e) => `${e.name} ${e.code}`).join(" "),
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

const refused = [];
for (const { label: id, direction: chosenDirection } of chosen) {
  const direction = resolveDirectionFamilies(chosenDirection, textPerRegister);
  try {
    await renderStill({
      element: createElement(DirectedConnectedScatter, {
        frame: { width: FRAME.width, height: FRAME.height },
        entities,
        subject: subjectCode,
        from: String(beat.from),
        to: String(beat.to),
        xName: beat.xName,
        yName: beat.yName,
        title: titles,
        limits,
        reading,
        source: beat.source,
        alt: typeof beat.alt === "function" ? beat.alt(entities) : beat.alt,
        eyebrow: beat.eyebrow,
        direction,
        treatments: offered.map((t) => t.id),
        xTicks,
        yTicks,
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
