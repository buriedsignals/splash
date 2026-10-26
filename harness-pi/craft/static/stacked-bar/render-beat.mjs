// The generic half of a stacked-bar beat: art direction, treatments, render and refusals, taken from
// proof/static-stacked-bar-lowcarbon-growth/render-directions.mjs with everything about ITS subject
// removed. Everything about THIS story — data, claim, words, checks — lives in ./beat.mjs, the one
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
import { DirectedStackedBar } from "./DirectedStackedBar.tsx";
import beat from "./beat.mjs";
import { applyStoryboard, assertNumbers, assertLegibleLabels, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
applyStoryboard(beat, HERE);
const OUT = join(HERE, "renders");
const SIZE = exportSizeFromArgv();
const FRAME = directedFrame(SIZE);
assertBeatMayEnter(HERE, SIZE, { what: basename(HERE) });

const REQUIRED = ["eyebrow", "rows", "highlight", "segments", "unit", "format", "title", "limits", "reading", "source", "alt", "check"];
const missing = REQUIRED.filter((key) => beat[key] === undefined);
if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);

/** The most rows the worked example fits with every segment carrying its own number (16 missed). */
const MAX_ROWS = 12;

if (!Array.isArray(beat.rows) || !beat.rows.length) throw new Error("rows must be a non-empty array of { name, level, growth }");
assertNumbers(beat.rows.flatMap((r) => [[`${r.name} level`, r.level], [`${r.name} growth`, r.growth]]), "rows");
// A stack draws two segments that add up; a segment below zero cannot be stacked.
const negative = beat.rows.filter((r) => r.level < 0 || r.growth < 0);
if (negative.length)
  throw new Error(
    `${negative.length} row(s) have a negative segment (${negative.slice(0, 3).map((r) => `${r.name} ${r.level} + ${r.growth}`).join(", ")}), ` +
      `which a stack cannot draw. If some rows shrank, this is not a stacked bar — a waterfall or a diverging bar is the form; ` +
      `otherwise compute growth as the later value minus the earlier one.`,
  );
if (beat.rows.length > MAX_ROWS)
  throw new Error(
    `rows holds ${beat.rows.length} bars; a bar that prints its own numbers fits at most ${MAX_ROWS}. ` +
      `Keep the ${MAX_ROWS} the takeaway sorts by (with every name the title names among them), and say in limits how many others were left out.`,
  );
const names = new Set(beat.rows.map((r) => r.name));
if (names.size !== beat.rows.length) throw new Error("two rows share one name: one row per bar");
const highlight = [beat.highlight].flat();
if (!highlight.length) throw new Error("highlight must name at least one bar (the one the takeaway is about)");
const absent = highlight.filter((n) => !names.has(n));
if (absent.length) throw new Error(`highlight names ${absent.join(", ")}, which is not the name of any row; the rows are ${[...names].join(", ")}`);
if (typeof beat.segments?.level !== "string" || typeof beat.segments?.growth !== "string")
  throw new Error("segments must be { level: string, growth: string } — the two segment names printed in the key");

const rows = beat.rows.map((r) => ({
  key: r.name,
  label: r.name,
  level: r.level,
  growth: r.growth,
  total: r.level + r.growth,
  thread: highlight.includes(r.name),
}));
const totals = rows.map((r) => r.total);
assertLegibleLabels([...rows.map((r) => r.level), ...rows.map((r) => r.growth), ...totals], beat.format);
beat.check();
// The claim column is one of the three drawn measures: the totals, the levels, or the growths.
{
  const sets = [totals, rows.map((r) => r.level), rows.map((r) => r.growth)];
  let first;
  let held = false;
  for (const set of sets) {
    try {
      assertDrawsClaimColumn(set, HERE);
      held = true;
      break;
    } catch (error) {
      first ??= error;
    }
  }
  if (!held) throw first;
}
assertHeadlineNumbersDrawn([beat.title].flat()[0], [...rows.map((r) => r.level), ...rows.map((r) => r.growth), ...totals], "segments and totals");

const titles = [beat.title].flat();
const limits = [beat.limits].flat();
const reading = [beat.reading].flat();
const subject = highlight[0];
const facts = beatFacts(
  rows.map((d) => ({ key: d.key, label: d.label, value: d.total })),
  {
    subject,
    stack: { segments: 2, sharesATotal: true },
    bars: rows.length,
    pairs: rows.map((d) => ({ from: d.level, to: d.total })),
    declaredSequence: beat.order ?? beat.segments.growth,
  },
);
const offered = applicableTreatments(facts);
const textPerRegister = {
  display: titles.join(" "),
  eyebrow: beat.eyebrow,
  body: `${limits.join(" ")} ${beat.source}`,
  axis: beat.unit,
  annot: `${reading.join(" ")} ${beat.segments.level} ${beat.segments.growth} ${rows.map((d) => d.label).join(" ")} ${rows.map((d) => beat.format(d.level)).join(" ")}`,
  value: rows.map((d) => beat.format(d.total)).join(" "),
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
      element: createElement(DirectedStackedBar, {
        frame: { width: FRAME.width, height: FRAME.height },
        rows,
        segments: beat.segments,
        title: titles,
        limits,
        reading,
        source: beat.source,
        alt: typeof beat.alt === "function" ? beat.alt(rows) : beat.alt,
        eyebrow: beat.eyebrow,
        format: beat.format,
        unit: beat.unit,
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
