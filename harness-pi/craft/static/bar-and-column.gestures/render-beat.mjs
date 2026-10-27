// The generic half of a bar-and-column GESTURE beat: the per-type kit's runner
// (static/bar-and-column/render-beat.mjs) with its fixed staging replaced by the beat's `gestures`.
// Guard order: applyStoryboard → REQUIRED → check() and the shared guards → the gesture core
// (validateGestures, claim read from STORYBOARD.md) → the static scheduler (composeStatic) → each drawn
// gesture judged by its treatment → render. A gesture refusal prints REFUSED with the beat.mjs field
// and a value that works; with SPLASH_GESTURE_REPAIR=1 the refusal's fix is applied instead
// ("REPAIRED gestures: <field> → <fix>") and the list staged again, at most 12 times. Nothing here
// refuses the data's SHAPE (row count, which row leads, sizes): the plate adapts to it. Everything about THIS story lives in ./beat.mjs, the one file the model
// writes. Copied into the beat by the harness; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs [--size landscape|square|portrait]
import { existsSync, readFileSync } from "node:fs";
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
import { GestureColumns } from "./DirectedGestureColumns.tsx";
import { applyFix, GestureRefusal, validateGestures } from "./gesture-core.mjs";
import { composeStatic } from "./gesture-static.mjs";
import { applyStoryboard, assertNumbers, assertLegibleLabels, assertOnePerX, assertHeadlineNumbersDrawn, assertDrawsClaimColumn, assertNoAggregates, errorText, importBeat, rowFacts } from "./guards.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const beat = await importBeat(HERE).catch((error) => {
  console.log(`REFUSED — ${errorText(error)}`);
  process.exit(1);
});
applyStoryboard(beat, HERE);
const OUT = join(HERE, "renders");
const SIZE = exportSizeFromArgv();
const FRAME = directedFrame(SIZE);
assertBeatMayEnter(HERE, SIZE, { what: basename(HERE) });

const REQUIRED = ["eyebrow", "rows", "gestures", "format", "title", "limits", "source", "alt", "check"];
const missing = REQUIRED.filter((key) => beat[key] === undefined);
if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
// The beat's own claim, checked against its own data BEFORE anything is drawn: a number that
// drifted from the data refuses the render rather than shipping a stale headline.
assertNumbers(beat.rows.map((r) => [r.name, r.value]));
assertLegibleLabels(beat.rows.map((r) => r.value), beat.format);
beat.check();
assertDrawsClaimColumn(beat.rows.map((r) => r.value), dirname(fileURLToPath(import.meta.url)));
assertNoAggregates(beat.rows.map((r) => r.name), dirname(fileURLToPath(import.meta.url)));
assertHeadlineNumbersDrawn([beat.title].flat()[0], beat.rows.map((r) => r.value), "bars");

// The gestures, checked against the rows the plate draws and the claim the journalist confirmed, then
// composed onto one plate. A refusal names the field to change and a value that works.
const front = (() => {
  const file = join(HERE, "..", "..", "STORYBOARD.md");
  const text = existsSync(file) ? readFileSync(file, "utf8").split("---")[1] ?? "" : "";
  return (key) => text.match(new RegExp(`^${key}:\\s*"?(.*?)"?\\s*$`, "m"))?.[1]?.replace(/\\"/g, '"');
})();
const refuse = (field, message, fix) => {
  const value = fix && ("set" in fix ? fix.set.value : "add" in fix ? fix.add.gesture : undefined);
  const hint = "remove" in (fix ?? {}) ? " (drop that gesture)" : value !== undefined ? ` — a value that works: ${JSON.stringify(value)}` : "";
  console.log(`REFUSED — ${field}: ${message}${hint}`);
  process.exit(1);
};
const claim = {
  takeaway: front("takeaway") ?? [beat.title].flat()[0],
  subject: front("subject"),
  comparison: front("comparison"),
  entity: front("claimEntity"),
  versus: front("claimVersus"),
  facts: rowFacts(HERE),
};
const key = (name) => ({ key: name });
const factsOf = (order, plate, extra = {}) =>
  beatFacts(
    order.map((r) => ({ key: r.name, label: r.name, value: r.value })),
    {
      subject: plate.accent[0] ?? null,
      bars: order.length,
      namedSeries: order.map((r) => r.name),
      declaredSequence: null,
      ...extra,
      comparisonSet: (extra.comparisonSet ?? []).map(key),
    },
  );
/** Validate, compose onto one plate, and judge each drawn gesture by its treatment on the plate's own rows. */
function stage(gestures) {
  const { gestures: valid } = validateGestures({ gestures, rows: beat.rows, family: "length", format: "static", claim });
  const plate = composeStatic({ gestures: valid, rows: beat.rows, format: beat.format });
  const order = plate.order.map((name) => beat.rows.find((r) => r.name === name));
  for (const t of plate.treatments) {
    if (applicableTreatments(factsOf(order, plate, t.facts)).some((a) => a.id === t.id)) continue;
    // A bracket over rows a reorder has scattered is two gestures disagreeing: refused. Every other
    // predicate that fails here reads the data's shape (how many marks), which never refuses the plate.
    if (t.do === "bracket")
      throw new GestureRefusal(`gestures[${t.index}]`, `the bracket's rows no longer sit together in the order drawn (${order.map((r) => r.name).join(", ")}): drop it, or drop the reorder`, { remove: t.index });
    console.log(`  drawn although ${t.id} does not hold at this plate's shape: gestures[${t.index}] (${t.do})`);
  }
  // A note on one row that only repeats the value printed on it is drawn once: a 12B "name" on Sul with note "233"
  // printed 233 twice over the column.
  const printed = (n) => n.marks?.length === 1 && String(n.text).trim() === beat.format(beat.rows.find((r) => r.name === n.marks[0])?.value);
  plate.notes = plate.notes.filter((n) => !printed(n));
  return { plate, order };
}
const REPAIR = process.env.SPLASH_GESTURE_REPAIR === "1";
let gestures = beat.gestures;
let staged;
let drawn;
for (let step = 0; ; step++) {
  try {
    ({ plate: staged, order: drawn } = stage(gestures));
    break;
  } catch (error) {
    if (!(error instanceof GestureRefusal)) throw error;
    if (!REPAIR || step >= 12) refuse(error.field, error.message.slice(error.field.length + 2), error.fix);
    console.log(`REPAIRED gestures: ${error.field} → ${JSON.stringify(error.fix)}`);
    gestures = applyFix(gestures, error.fix);
  }
}
const offered = applicableTreatments(factsOf(drawn, staged));
const titles = [beat.title].flat();
const limits = [beat.limits].flat();
const textPerRegister = {
  display: titles.join(" "),
  eyebrow: beat.eyebrow,
  body: `${limits.join(" ")} ${beat.source}`,
  axis: "0",
  annot: [...beat.rows.map((r) => r.name), ...staged.notes.map((n) => n.text), ...staged.brackets.map((b) => b.note ?? ""), ...staged.references.map((r) => r.note ?? "")].join(" "),
  value: beat.rows.map((r) => beat.format(r.value)).join(" "),
};

const labelOf = (id) => id.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const newsroom = readPalette(HERE);
let chosen;
if (directionReachable(HERE)) {
  const run = readRunDirection(HERE);
  chosen = [{ label: labelOf(run.id), direction: run }];
} else {
  const composition = composeDirections({ newsroom, filed: filedDirections(), beat: { evidenceLevels: beat.evidenceLevels ?? 2 }, textPerRegister });
  if (!composition.offered.length) throw new Error(`no composed direction holds up for this beat:\n${composeReport(composition, {})}`);
  chosen = composition.offered.slice(0, 1).map((d) => ({ label: labelOf(d.id), direction: d }));
}

const refused = [];
for (const { label: id, direction: chosenDirection } of chosen) {
  const direction = resolveDirectionFamilies(chosenDirection, textPerRegister);
  try {
    await renderStill({
      element: createElement(GestureColumns, {
        frame: { width: FRAME.width, height: FRAME.height },
        rows: drawn,
        plate: staged,
        format: beat.format,
        title: titles,
        limits,
        // Rows the ladder leaves out are always said on the plate: the beat's own sentence, or "6 / 10".
        scope: beat.scope ?? ((shown, all) => `${shown} / ${all}`),
        source: beat.source,
        alt: beat.alt,
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
    console.log(`REFUSED — ${errorText(error)}`);
  }
}
if (refused.length) process.exit(1);


