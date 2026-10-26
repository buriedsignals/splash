// The generic half of a bump (ranking-over-time) beat: art direction, treatments, render and
// refusals, taken from proof/static-bump-emitter-rank/render-directions.mjs with everything about
// ITS subject removed. Everything about THIS story — the values, the subject, words, checks — lives
// in ./beat.mjs, the one file the model writes. The ranks are computed here (./ranks.mjs), never by
// the beat. Copied into the beat by the harness; never edited by the model.
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
import { DirectedBump } from "./DirectedBump.tsx";
import { rankTracks } from "./ranks.mjs";
import beat from "./beat.mjs";
import { applyStoryboard, assertNumbers, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
applyStoryboard(beat, dirname(fileURLToPath(import.meta.url)));

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "renders");
const SIZE = exportSizeFromArgv();
const FRAME = directedFrame(SIZE);
assertBeatMayEnter(HERE, SIZE, { what: basename(HERE) });

const REQUIRED = ["eyebrow", "values", "slots", "subject", "title", "limits", "source", "alt", "check"];
const missing = REQUIRED.filter((key) => beat[key] === undefined);
if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")} (see CONTRACT.md)`);

// ── the values, refused before anything is drawn ────────────────────────────
if (!Array.isArray(beat.values) || !beat.values.length) throw new Error(`values is empty: give one { entity, year, value } per entity per year`);
assertNumbers(beat.values.map((v) => [`${v.entity} ${v.year}`, v.value]), "values");
assertNumbers(beat.values.map((v) => [v.entity, v.year]), "years");
if (!Number.isInteger(beat.slots) || beat.slots < 3 || beat.slots > 15)
  throw new Error(`slots is ${JSON.stringify(beat.slots)}: draw the top 3 to 15 ranks (10 in the worked example) — more ranks than that cannot each carry a name`);
const { years, membership, tracks, everIn, rankOf } = rankTracks(beat.values, beat.slots);
if (years.length < 2) throw new Error(`values cover ${years.length} year: a ranking over time needs two years or more`);
const short = membership.filter((m) => m.members.length < beat.slots);
if (short.length)
  throw new Error(`${short[0].key} has only ${short[0].members.length} entities for ${beat.slots} ranks: lower slots, or keep only the years every entity is reported`);
if (!everIn.includes(beat.subject))
  throw new Error(`subject ${JSON.stringify(beat.subject)} never enters the top ${beat.slots}: the subject must be an entity that holds a drawn rank (check its spelling against values)`);
beat.check();
// The values ranked are data.json's; the headline's figures are ranks.
assertDrawsClaimColumn(beat.values.map((v) => v.value), HERE);
assertHeadlineNumbersDrawn([beat.title].flat()[0], tracks.flatMap((t) => t.points.map((p) => p.rank)), "ranks");

const titles = [beat.title].flat();
const limits = [beat.limits].flat();
const facts = beatFacts(
  tracks.map((t) => ({ key: t.entity, label: t.entity, value: t.points.length })),
  { subject: beat.subject, namedSeries: everIn, membership },
);
const offered = applicableTreatments(facts);
const textPerRegister = {
  display: titles.join(" "),
  eyebrow: beat.eyebrow,
  body: `${limits.join(" ")} ${beat.source}`,
  axis: years.filter((y) => y % 5 === 0).join(" "),
  annot: everIn.join(" "),
  value: everIn.map((e) => `1 ${e}`).join(" "),
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
      element: createElement(DirectedBump, {
        frame: { width: FRAME.width, height: FRAME.height },
        tracks,
        years,
        slots: beat.slots,
        subject: beat.subject,
        title: titles,
        limits,
        source: beat.source,
        alt: typeof beat.alt === "function" ? beat.alt({ tracks, rankOf }) : beat.alt,
        eyebrow: beat.eyebrow,
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
