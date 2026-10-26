// The generic half of a grouped-bar beat: art direction, treatments, render and refusals, taken from
// proof/static-wind-vs-solar/render-directions.mjs with everything about ITS subject removed.
// Everything about THIS story — data, the two series, words, checks — lives in ./beat.mjs, the one
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
import { DirectedGroupedBar } from "./DirectedGroupedBar.tsx";
import beat from "./beat.mjs";
import { applyStoryboard, assertNumbers, assertLegibleLabels, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
applyStoryboard(beat, dirname(fileURLToPath(import.meta.url)));

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "renders");
const SIZE = exportSizeFromArgv();
const FRAME = directedFrame(SIZE);
assertBeatMayEnter(HERE, SIZE, { what: basename(HERE) });

const REQUIRED = ["eyebrow", "groups", "firstName", "secondName", "subject", "callout", "format", "title", "limits", "source", "alt", "check"];
const missing = REQUIRED.filter((key) => beat[key] === undefined);
if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")} (see CONTRACT.md)`);

const groups = beat.groups;
if (!Array.isArray(groups) || groups.length < 2) throw new Error(`groups holds ${groups?.length ?? 0} group(s); a grouped bar compares at least two`);
assertNumbers(groups.flatMap((g) => [[`${g.name} ${beat.firstName}`, g.first], [`${g.name} ${beat.secondName}`, g.second]]));
/** TWO SERIES, EACH A LENGTH FROM ZERO. The component draws exactly two bars per group from a zero
 *  baseline; a negative value would be a bar growing the wrong way from a floor that is not drawn. */
const negative = groups.flatMap((g) => [g.first, g.second].filter((v) => v < 0).map((v) => `${g.name}=${v}`));
if (negative.length) throw new Error(`a grouped bar draws lengths from zero, and these values are negative: ${negative.slice(0, 3).join(", ")}. A change that can fall below zero belongs to a diverging bar`);
const names = new Set(groups.map((g) => g.name));
if (names.size !== groups.length) throw new Error(`two groups share a name; one group per category, filtered to one period`);
if (!names.has(beat.subject)) throw new Error(`subject "${beat.subject}" is not the name of a group; the names are ${[...names].join(", ")}`);
if (beat.firstName === beat.secondName) throw new Error(`firstName and secondName are both "${beat.firstName}": the two series need two names`);

const values = groups.flatMap((g) => [g.first, g.second]);
assertLegibleLabels(values, beat.format);
beat.check();
assertDrawsClaimColumn(values, HERE);
// The headline of a grouped bar often counts the groups where one series leads: those counts are
// offered to the guard with the drawn values.
const leads = groups.filter((g) => g.first > g.second).length;
assertHeadlineNumbersDrawn([beat.title].flat()[0], [...values, groups.length, leads, groups.length - leads], "bars");

const title = [beat.title].flat()[0];
const limits = [beat.limits].flat()[0];
const facts = beatFacts(
  groups.flatMap((g) => [
    { key: `${g.name}-1`, value: g.first },
    { key: `${g.name}-2`, value: g.second },
  ]),
  {
    subject: beat.subject,
    namedSeries: [beat.firstName, beat.secondName],
    groups: groups.map((g) => ({ key: g.name, bars: 2 })),
    declaredSequence: beat.declaredSequence ?? null,
  },
);
const offered = applicableTreatments(facts);
const textPerRegister = {
  display: title,
  eyebrow: beat.eyebrow,
  body: `${limits} ${beat.source}`,
  axis: "0 10 20 30",
  annot: `${beat.firstName} ${beat.secondName} ${groups.map((g) => g.name).join(" ")} ${beat.callout}`,
  value: values.map((v) => beat.format(v)).join(" "),
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
      element: createElement(DirectedGroupedBar, {
        frame: { width: FRAME.width, height: FRAME.height },
        groups: groups.map((g) => ({ name: g.name, first: g.first, second: g.second })),
        firstName: beat.firstName,
        secondName: beat.secondName,
        subject: beat.subject,
        callout: beat.callout,
        title,
        limits,
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
