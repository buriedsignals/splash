// The generic half of a scatter beat: art direction, treatments, render and refusals, taken from
// proof/static-income-life-expectancy/render-directions.mjs with everything about ITS subject
// removed. Everything about THIS story — the points, the declared break, words, checks — lives in
// ./beat.mjs, the one file the model writes. Copied into the beat by the harness; never edited by
// the model.
//
// A scatter's argument is the SHAPE of the cloud, not any one point: no point is drawn in the
// accent. The accent goes to the declared break and its two bands, when the beat declares one.
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
import { DirectedScatter } from "./DirectedScatter.tsx";
import beat from "./beat.mjs";
import { applyStoryboard, assertNumbers, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
applyStoryboard(beat, dirname(fileURLToPath(import.meta.url)));

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "renders");
const SIZE = exportSizeFromArgv();
const FRAME = directedFrame(SIZE);
assertBeatMayEnter(HERE, SIZE, { what: basename(HERE) });

const REQUIRED = ["eyebrow", "points", "breakAt", "xName", "xQualifier", "yName", "yQualifier", "xLog", "xTick", "title", "limits", "source", "alt", "check"];
const missing = REQUIRED.filter((key) => beat[key] === undefined);
if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);

const points = beat.points;
assertNumbers(points.flatMap((p, i) => [[`points[${i}].x`, p.x], [`points[${i}].y`, p.y]]), "points");

// ── the type's own refusals ─────────────────────────────────────────────────
/** THIS KIT DRAWS NO SIZE CHANNEL. The worked example's directed component draws every point at one
 *  radius; a bubble's area would be a third quantity the plate claims and never encodes. */
const sized = points.filter((p) => p.size !== undefined || p.r !== undefined || p.radius !== undefined);
if (sized.length)
  throw new Error(
    `${sized.length} points carry a size (size / r / radius), but this kit draws every point at one radius: ` +
      `a bubble size would be a quantity the plate states and never draws. Remove the size field from points ` +
      `in beat.mjs, and if the takeaway is about that third quantity, say it in the standfirst or choose another type.`,
  );
if (points.length < 10)
  throw new Error(
    `beat.mjs gives ${points.length} points; a scatter's argument is the shape of a cloud, and under 10 points ` +
      `there is no cloud — draw a bar or a slope instead, or include all the rows data.json holds for both measures.`,
  );
if (beat.xLog) {
  const nonPositive = points.filter((p) => !(p.x > 0));
  if (nonPositive.length)
    throw new Error(
      `${nonPositive.length} points have x <= 0 (first: ${nonPositive[0].x}), which a logarithmic axis cannot place: ` +
        `filter them out of points in beat.mjs (and say so in the standfirst), or set xLog: false.`,
    );
}
/** The y scale rounds its ends to tens; a cloud spanning far less than that is a flat band. */
const ys = points.map((p) => p.y);
const yLo = Math.floor(Math.min(...ys) / 10) * 10;
const yHi = Math.ceil(Math.max(...ys) / 10) * 10;
if (Math.max(...ys) - Math.min(...ys) < 0.4 * (yHi - yLo))
  throw new Error(
    `the y values span ${Math.min(...ys)} to ${Math.max(...ys)}, but the y axis runs in tens (${yLo} to ${yHi}), ` +
      `so the cloud would be a flat band: rescale y in beat.mjs (multiply it, e.g. a share as a percentage) and say the unit in yQualifier.`,
  );

beat.check();

// ── the declared break ──────────────────────────────────────────────────────
const breakAt = beat.breakAt;
const facts = beatFacts(
  points.map((p, i) => ({ key: String(i), value: p.y })),
  {
    subject: beat.eyebrow,
    pairs: points.map(({ x, y }) => ({ x, y })),
    breakAt,
    qualifiedApparatus: [beat.xQualifier ? beat.xName : null, beat.yQualifier ? beat.yName : null].filter(Boolean),
  },
);
const spread = breakAt === null ? null : facts.spreadEachSideOfBreak;
if (breakAt !== null) {
  if (!Number.isFinite(breakAt)) throw new Error(`breakAt is ${JSON.stringify(breakAt)}: a number on the x axis, or null for no break`);
  if (!spread || spread.below.count < 3 || spread.above.count < 3)
    throw new Error(
      `breakAt ${breakAt} leaves ${spread?.below.count ?? 0} points below and ${spread?.above.count ?? 0} at or above it: ` +
        `a break compares two sides, each needs at least 3 points. Move breakAt in beat.mjs, or set it to null.`,
    );
  /** The two notes are drawn on each side of the break, so the numbers they state must be the
   *  spreads the plate measured — a note typed from an earlier table would contradict its own band. */
  for (const [side, note] of [["below", beat.belowNote], ["above", beat.aboveNote]]) {
    if (typeof note !== "string" || !note.trim())
      throw new Error(`breakAt is set, so beat.mjs must give ${side}Note: the sentence drawn on that side of the break`);
    const s = spread[side];
    const stated = (note.match(/\d+(?:[.,]\d+)?/g) ?? []).map((n) => Number(n.replace(",", ".")));
    if (!stated.some((n) => n === s.count))
      throw new Error(`${side}Note must state how many points lie ${side} the break (${s.count}); it says: ${note}`);
    if (!stated.some((n) => Math.abs(n - s.range) <= 0.5 || Math.abs(n - Math.round(s.range)) < 1e-9))
      throw new Error(`${side}Note must state the spread of y ${side} the break (${s.range.toFixed(1)}, max minus min), computed; it says: ${note}`);
  }
}

const titles = [beat.title].flat();
const limits = [beat.limits].flat();
const drawnNumbers = [...ys, ...(spread ? [spread.below.range, spread.above.range, spread.below.count, spread.above.count] : [])];
assertHeadlineNumbersDrawn(titles[0], drawnNumbers, "points");
/** The claim's column may be either axis; the plate draws both. */
try {
  assertDrawsClaimColumn(ys, HERE);
} catch (yError) {
  try {
    assertDrawsClaimColumn(points.map((p) => p.x), HERE);
  } catch {
    throw yError;
  }
}

const offered = applicableTreatments(facts);
const textPerRegister = {
  display: titles.join(" "),
  eyebrow: beat.eyebrow,
  body: `${limits.join(" ")} ${beat.source}`,
  axis: `${beat.xName} ${beat.xQualifier} ${beat.yName} ${beat.yQualifier} ${[...(beat.xTicks ?? []).map(beat.xTick), beat.xTick(Math.min(...points.map((p) => p.x)))].join(" ")} ${yLo} ${yHi}`,
  annot: spread ? `${beat.belowNote} ${beat.aboveNote}` : "",
  value: "",
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
/** THE TWO SIDES OF THE BREAK ARE ONE COMPARISON: a plate that prints one and drops the other states
 *  half a claim, so a dropped note refuses the render. */
let droppedNotes = [];
for (const { label: id, direction: chosenDirection } of chosen) {
  const direction = resolveDirectionFamilies(chosenDirection, textPerRegister);
  try {
    await renderStill({
      element: createElement(DirectedScatter, {
        frame: { width: FRAME.width, height: FRAME.height },
        pairs: points.map(({ x, y }) => ({ x, y })),
        breakAt: breakAt ?? 0,
        spread,
        xName: beat.xName,
        xQualifier: beat.xQualifier,
        yName: beat.yName,
        yQualifier: beat.yQualifier,
        xLog: beat.xLog,
        xTicks: beat.xTicks,
        xTick: beat.xTick,
        belowNote: beat.belowNote ?? "",
        aboveNote: beat.aboveNote ?? "",
        title: titles,
        limits,
        source: beat.source,
        alt: beat.alt,
        eyebrow: beat.eyebrow,
        direction,
        onDropped: (ids) => { droppedNotes = ids.filter((d) => ["below", "above", "break"].includes(d)); },
        treatments: offered.map((t) => t.id).filter((t) => spread || t !== "declared-break-with-the-spread-on-each-side"),
      }),
      width: FRAME.width,
      height: FRAME.height,
      outDir: OUT,
      name: nameAtSize(id, SIZE),
      scale: FRAME.scale,
    });
    if (droppedNotes.length)
      throw new Error(
        `the break's note(s) ${droppedNotes.join(", ")} could not be placed without covering points or leaving the frame, ` +
          `so the plate would state one side of the comparison only: shorten belowNote / aboveNote in beat.mjs, ` +
          `or (on a linear axis crowded on one side) set xLog: true, or move breakAt.`,
      );
    console.log(`rendered renders/${nameAtSize(id, SIZE)}.png`);
  } catch (error) {
    for (const ext of ["png", "svg"]) await rm(join(OUT, `${nameAtSize(id, SIZE)}.${ext}`), { force: true });
    refused.push({ id, why: error.message });
    console.log(`REFUSED — ${error.message}`);
  }
}
if (refused.length) process.exit(1);
