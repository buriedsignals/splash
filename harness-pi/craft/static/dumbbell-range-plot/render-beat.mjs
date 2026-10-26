// The generic half of a dumbbell (range plot) beat: art direction, treatments, render and refusals,
// taken from proof/more-dumbbell-life-expectancy-gains/render-directions.mjs with everything about
// ITS subject removed. Everything about THIS story — data, the two states, words, checks — lives in
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
import { DirectedDumbbell } from "./DirectedDumbbell.tsx";
import beat from "./beat.mjs";
import { applyStoryboard, assertNumbers, assertHeadlineNumbersDrawn, assertDrawsClaimColumn, errorText } from "./guards.mjs";
applyStoryboard(beat, dirname(fileURLToPath(import.meta.url)));

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "renders");
const SIZE = exportSizeFromArgv();
const FRAME = directedFrame(SIZE);
assertBeatMayEnter(HERE, SIZE, { what: basename(HERE) });

const REQUIRED = ["eyebrow", "rows", "subject", "fromName", "toName", "unit", "format", "gainLabel", "title", "limits", "reading", "source", "alt", "check"];
const missing = REQUIRED.filter((key) => beat[key] === undefined);
if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);

if (!Array.isArray(beat.rows) || beat.rows.length < 2) throw new Error(`rows holds ${beat.rows?.length ?? 0} row(s); a dumbbell compares at least two`);
assertNumbers(beat.rows.flatMap((r) => [[`${r.key} ${beat.fromName}`, r.from], [`${r.key} ${beat.toName}`, r.to]]));
/** THE GAIN IS COMPUTED HERE, and the rows are ranked by it — the sheet's own device: "rows sorted by
 *  gap, descending, the ranking computed rather than typed". A gain typed in beat.mjs is ignored. */
const rows = beat.rows
  .map((r) => ({ key: String(r.key), label: String(r.label ?? r.key), from: r.from, to: r.to, gain: r.to - r.from }))
  .sort((a, b) => b.gain - a.gain);
const keys = new Set(rows.map((r) => r.key));
if (keys.size !== rows.length) throw new Error(`two rows share a key; give every row its own key (one row per entity, filtered to the two states)`);
if (!keys.has(String(beat.subject))) throw new Error(`subject "${beat.subject}" is not the key of a row; the keys are ${[...keys].join(", ")}`);
if (String(beat.fromName) === String(beat.toName)) throw new Error(`fromName and toName are both "${beat.fromName}": a dumbbell joins two different states`);
const keep = [beat.subject, ...(beat.keep ?? [])].map(String);
const unknown = keep.filter((k) => !keys.has(k));
if (unknown.length) throw new Error(`keep names rows that are not drawn: ${unknown.join(", ")}`);

// No distinct-labels guard on the gains: the worked example's own ten gains print as seven labels at
// one decimal (4,1 and 4,1 are honest rounding of two near-equal gains), and every row's two dots are
// drawn on a shared axis anyway. Only an unreadable scale is refused.
if (rows.every((r) => Math.abs(r.from) < 0.1 && Math.abs(r.to) < 0.1))
  throw new Error(`every value is below 0.1: draw the rate per 1,000, 10,000 or 100,000 (multiply the values) so the axis reads in whole numbers, and say the base in the unit or the standfirst`);
beat.check();
assertDrawsClaimColumn(rows.flatMap((r) => [r.from, r.to]), HERE);
assertHeadlineNumbersDrawn([beat.title].flat()[0], rows.flatMap((r) => [r.from, r.to, r.gain]), "dumbbells");

const title = [beat.title].flat();
const limits = [beat.limits].flat();
const reading = [beat.reading].flat();
const facts = beatFacts(
  rows.map((r) => ({ key: r.key, label: r.label, value: r.gain })),
  {
    subject: String(beat.subject),
    pairs: rows.map((r) => ({ key: r.key, from: r.from, to: r.to })),
    states: [String(beat.fromName), String(beat.toName)],
    namedSeries: rows.map((r) => r.label),
    declaredSequence: null,
  },
);
const offered = applicableTreatments(facts);
const textPerRegister = {
  display: title.join(" "),
  eyebrow: beat.eyebrow,
  body: `${limits.join(" ")} ${beat.source}`,
  axis: `${rows.flatMap((r) => [beat.format(r.from), beat.format(r.to)]).join(" ")} ${beat.unit}`,
  annot: `${rows.map((r) => r.label).join(" ")} ${beat.fromName} ${beat.toName} ${reading.join(" ")}`,
  value: rows.map((r) => beat.gainLabel(r)).join(" "),
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
      element: createElement(DirectedDumbbell, {
        frame: { width: FRAME.width, height: FRAME.height },
        rows,
        subject: String(beat.subject),
        fromName: String(beat.fromName),
        toName: String(beat.toName),
        unit: beat.unit,
        title,
        limits,
        reading,
        scope: beat.scope,
        keep,
        ...(beat.scopeAltLead ? { scopeAltLead: beat.scopeAltLead } : {}),
        source: beat.source,
        alt: beat.alt,
        eyebrow: beat.eyebrow,
        format: beat.format,
        gainLabel: beat.gainLabel,
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
