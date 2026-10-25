// The generic half of a slope beat: art direction, treatments, render and refusals, taken from
// proof/static-slope-europe-lowcarbon/render-directions.mjs with everything about ITS subject
// removed. Everything about THIS story — data, the lines drawn, the thread, words, checks — lives in
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
import { DirectedSlope } from "./DirectedSlope.tsx";
import beat from "./beat.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "renders");
const SIZE = exportSizeFromArgv();
const FRAME = directedFrame(SIZE);
assertBeatMayEnter(HERE, SIZE, { what: basename(HERE) });

const REQUIRED = ["eyebrow", "lines", "rails", "subject", "format", "formatDelta", "title", "limits", "reading", "source", "alt", "check"];
const missing = REQUIRED.filter((key) => beat[key] === undefined);
if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")} (see CONTRACT.md)`);
// The beat's own claim, checked against its own data BEFORE anything is drawn.
beat.check();

// THE LINES THE PLATE DRAWS. The delta is derived here rather than trusted, and the plate reads top
// to bottom by the right rail.
const lines = beat.lines
  .map((d) => {
    if (!Number.isFinite(d.from) || !Number.isFinite(d.to))
      throw new Error(`line ${d.key ?? d.label} has no usable from/to: ${JSON.stringify(d)}`);
    return { key: String(d.key ?? d.label), label: String(d.label ?? d.key), from: d.from, to: d.to, delta: d.to - d.from, thread: Boolean(d.thread) };
  })
  .sort((a, b) => b.to - a.to);
if (lines.length < 2) throw new Error(`a slope draws at least two lines; beat.mjs gives ${lines.length}`);
/** THE THREAD IS THE ARGUMENT. `accent-marks-the-thread` — the accent goes to the line or pair the
 *  title is about, never to the largest value; a plate with no thread has nothing to point at, and a
 *  plate where most lines are the thread has no accent left. */
const threads = lines.filter((d) => d.thread);
if (!threads.length) throw new Error(`no line has thread: true; the accent must mark the line(s) the title is about`);
if (threads.length > 2) throw new Error(`${threads.length} lines are the thread; the accent marks one line or one pair`);
if (!lines.some((d) => d.key === String(beat.subject)))
  throw new Error(`subject "${beat.subject}" is not the key of a drawn line`);
/** ONE PRECISION THAT RESOLVES THE CLAIM. If two thread lines print the same number on a rail, the
 *  difference the title names is invisible in the plate's own value register. */
if (threads.length === 2 && beat.format(threads[0].to) === beat.format(threads[1].to))
  throw new Error(
    `the plate prints ${beat.format(threads[0].to)} for both ${threads[0].label} and ${threads[1].label}; ` +
      `give format() enough decimals to tell them apart`,
  );

const title = [beat.title].flat();
const limits = [beat.limits].flat();
const reading = [beat.reading].flat();
const facts = beatFacts(
  lines.map((d) => ({ key: d.key, label: d.label, value: d.to })),
  {
    subject: String(beat.subject),
    namedSeries: lines.map((d) => d.key),
    rails: { left: String(beat.rails.left), right: String(beat.rails.right), sameMeasure: true },
    pairs: lines.map((d) => ({ from: d.from, to: d.to })),
    declaredSequence: `${beat.rails.right} value`,
  },
);
const offered = applicableTreatments(facts);
const textPerRegister = {
  display: title.join(" "),
  eyebrow: beat.eyebrow,
  body: `${limits.join(" ")} ${beat.source}`,
  axis: `${beat.rails.left} ${beat.rails.right}`,
  annot: `${reading.join(" ")} ${lines.map((d) => d.label).join(" ")} ${lines.map((d) => beat.formatDelta(d.delta)).join(" ")}`,
  value: lines.flatMap((d) => [beat.format(d.from), beat.format(d.to)]).join(" "),
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
      element: createElement(DirectedSlope, {
        frame: { width: FRAME.width, height: FRAME.height },
        lines,
        rails: { left: String(beat.rails.left), right: String(beat.rails.right) },
        title,
        limits,
        reading,
        source: beat.source,
        alt: typeof beat.alt === "function" ? beat.alt(lines) : beat.alt,
        eyebrow: beat.eyebrow,
        format: beat.format,
        formatDelta: beat.formatDelta,
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
