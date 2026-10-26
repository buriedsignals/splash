// The generic half of a dot-strip beat: art direction, treatments, render and refusals, taken from
// proof/static-dot-strip-lowcarbon-spread/render-directions.mjs with everything about ITS subject
// removed. Everything about THIS story — data, the two states, words, checks — lives in ./beat.mjs,
// the one file the model writes. Copied into the beat by the harness; never edited by the model.
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
import { DirectedDotStrips } from "./DirectedDotStrips.tsx";
import beat from "./beat.mjs";
import { applyStoryboard, assertNumbers, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
applyStoryboard(beat, dirname(fileURLToPath(import.meta.url)));

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "renders");
const SIZE = exportSizeFromArgv();
const FRAME = directedFrame(SIZE);
assertBeatMayEnter(HERE, SIZE, { what: basename(HERE) });

const REQUIRED = ["eyebrow", "marks", "subject", "from", "to", "unit", "scaleNote", "title", "limits", "reading", "source", "alt", "check"];
const missing = REQUIRED.filter((key) => beat[key] === undefined);
if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);

const marks = beat.marks;
if (!Array.isArray(marks) || marks.length < 3) throw new Error(`marks holds ${marks?.length ?? 0} unit(s); a strip shows the shape of a field, which takes at least three`);
assertNumbers(marks.flatMap((m) => [[`${m.code} ${beat.from}`, m.before], [`${m.code} ${beat.to}`, m.after]]));

/** THE CHIP IS THE CODE. Each unit is pinned as a chip carrying its `code`; a chip wider than a few
 *  letters stacks the field into rows the plate cannot hold, and two equal codes are one chip. */
const long = marks.filter((m) => typeof m.code !== "string" || !m.code.trim() || m.code.length > 4);
if (long.length) throw new Error(`each mark's code is printed on its chip and must be 1 to 4 characters (e.g. an ISO code "POL"); these are not: ${long.slice(0, 3).map((m) => JSON.stringify(m.code)).join(", ")}`);
const codes = new Set(marks.map((m) => m.code));
if (codes.size !== marks.length) throw new Error(`two marks share a code; every unit needs its own code`);
if (!codes.has(beat.subject)) throw new Error(`subject "${beat.subject}" is not the code of a mark; the codes are ${[...codes].join(", ")}`);

/** ONE SCALE, 0 TO 100, FOR BOTH STRIPS. The component pins that axis (a share in percent, a score
 *  out of 100); a value outside it would be drawn off the rail. */
const off = marks.flatMap((m) => [m.before, m.after].filter((v) => v < 0 || v > 100).map((v) => `${m.code}=${v}`));
if (off.length) throw new Error(`the strips are drawn on a 0 to 100 scale and these values fall outside it: ${off.slice(0, 3).join(", ")}. Draw a share in percent (value / total * 100) or a score out of 100`);
if (String(beat.from) === String(beat.to)) throw new Error(`from and to are both "${beat.from}": a strip pair needs two different states`);

beat.check();
const drawn = marks.flatMap((m) => [m.before, m.after]);
assertDrawsClaimColumn(drawn, HERE);
// The headline of a strip speaks of the field's shape — a floor, a ceiling, a gap — so its figures
// may be levels or changes: both are offered to the guard.
const extremes = [Math.min(...marks.map((m) => m.before)), Math.max(...marks.map((m) => m.before)), Math.min(...marks.map((m) => m.after)), Math.max(...marks.map((m) => m.after))];
const shape = [extremes[2] - extremes[0], extremes[3] - extremes[1], extremes[1] - extremes[0], extremes[3] - extremes[2], (extremes[1] - extremes[0]) - (extremes[3] - extremes[2])];
assertHeadlineNumbersDrawn([beat.title].flat()[0], [...drawn, ...marks.map((m) => m.after - m.before), ...shape], "marks");

const title = [beat.title].flat();
const limits = [beat.limits].flat();
const reading = [beat.reading].flat();
const subjectMark = marks.find((m) => m.code === beat.subject);
const facts = beatFacts(
  marks.map((m) => ({ key: m.code, label: m.name ?? m.code, value: m.after })),
  {
    subject: subjectMark.name ?? subjectMark.code,
    states: [String(beat.from), String(beat.to)],
    observations: marks.map((m) => ({ key: m.code, value: m.after })),
    continuousAxis: true,
    declaredSequence: beat.declaredSequence ?? "value",
  },
);
const offered = applicableTreatments(facts);
const textPerRegister = {
  display: title.join(" "),
  eyebrow: beat.eyebrow,
  body: `${limits.join(" ")} ${beat.source}`,
  axis: `${beat.unit} ${beat.scaleNote} ${beat.from} ${beat.to} 0 20 40 60 80 100`,
  annot: `${reading.join(" ")} ${marks.map((m) => m.code).join(" ")}`,
  value: marks.map((m) => `+${Math.round(m.after - m.before)}`).join(" "),
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
      element: createElement(DirectedDotStrips, {
        frame: { width: FRAME.width, height: FRAME.height },
        marks: marks.map((m) => ({ code: m.code, name: m.name ?? m.code, before: m.before, after: m.after })),
        subject: beat.subject,
        from: String(beat.from),
        to: String(beat.to),
        unit: beat.unit,
        scaleNote: beat.scaleNote,
        title,
        limits,
        reading,
        source: beat.source,
        alt: beat.alt,
        eyebrow: beat.eyebrow,
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
