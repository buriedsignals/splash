// The generic half of a treemap VIDEO beat, taken from proof/video-treemap-europe-capacity/render-directions-video.mjs
// with everything about ITS subject removed. The choreography is the worked example's and is not the model's to change:
// the whole as one block growing from the left, its total counting; seams cutting it into its cells, largest first, the
// words arriving; each cell's part rising to its share, a midline across each; the cells past the middle flooding with
// the accent, their count climbing, the others draining; the flooded cells sliding into the largest cell, keeping their
// areas, their sum named; then back to their places, the largest cell ringed, the credit. The timing contract and the
// shots are the proof's (timing-contract.ts, states.mjs, scene.mjs); the layout is the proof's build.mjs and layout.mjs.
// ./beat.mjs — the one file the model writes — gives the data and the WORDS.
//
// Usage:  bun <beat>/render-beat.mjs [--size landscape|square|portrait] [--look-only]
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { videoExportSize } from "#shared/chart-video/sizes.mjs";
import { EVENT_ORDER, endOf } from "#shared/chart-video/timing.ts";
import { applyStoryboard, assertNumbers, assertLegibleLabels, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { assertEventFramesReadable, pickDirection, plain, refusing, renderBeatVideo } from "./video.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const COMPOSITION_BASE = "zone-video-treemap"; // Root.tsx registers `${COMPOSITION_BASE}-${size}`
/** The whole's count climbs one text per step; past this many the beat's unit is too fine for a counter. */
const MAX_WHOLE_STEPS = 5000;

await refusing(HERE, async () => {
  const SIZE = videoExportSize();
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);

  const REQUIRED = ["eyebrow", "cells", "partName", "format", "wholeLabel", "countLabel", "title", "source", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const field of ["check", "format", "wholeLabel", "countLabel"]) if (typeof beat[field] !== "function") throw new Error(`beat.mjs: ${field} must be a function (see CONTRACT.md)`);
  for (const field of ["eyebrow", "partName"]) if (typeof beat[field] !== "string") throw new Error(`beat.mjs: ${field} must be a string (see CONTRACT.md)`);
  if (!Array.isArray(beat.cells)) throw new Error("beat.mjs: cells must be an array of { name, value, part }");
  assertNumbers(beat.cells.flatMap((c) => [[`${c.name}.value`, c.value], [`${c.name}.part`, c.part]]), "cells");
  const divisor = beat.wholeDivisor ?? 1;
  if (!(typeof divisor === "number" && divisor > 0)) throw new Error(`wholeDivisor is ${JSON.stringify(beat.wholeDivisor)}: a positive number (1000 to count MW in GW), or left out`);

  // The claim first: a title the data no longer supports is the refusal to read, before any the gesture raises.
  beat.check();
  const { subjectOf } = await import("./subject.mjs");
  const subject = subjectOf({ ...beat, cells: beat.cells.map((c) => ({ ...c, name: plain(c.name) })) });
  const steps = Math.round(subject.total / divisor);
  if (steps < 5 || steps > MAX_WHOLE_STEPS)
    throw new Error(`the whole (${+subject.total.toPrecision(4)}) counts up in ${steps} steps of wholeDivisor (${divisor}): set wholeDivisor so it counts in 5 to ${MAX_WHOLE_STEPS} whole steps (1000 to count MW in GW), and wholeLabel in that unit`);
  const values = subject.countries.map((c) => c.mw);
  const text = (field, v) => {
    const t = beat[field](v);
    if (typeof t !== "string" || !t.trim()) throw new Error(`beat.mjs: ${field}(${v}) must return a non-empty string`);
    return plain(t);
  };
  assertLegibleLabels(values, (v) => text("format", v));
  assertDrawsClaimColumn(values, HERE);
  assertHeadlineNumbersDrawn([beat.title].flat()[0], [...values, subject.tipped.length, subject.tippedMw, subject.total, steps], "cells");

  // ── the words, in the shape the proof's build.mjs reads (`copyOf` there)
  const forms = (v) => [v].flat().map((t) => plain(String(t)));
  const count = (k) => text("countLabel", k);
  const copy = {
    eyebrow: plain(beat.eyebrow),
    title: forms(beat.title),
    key: plain(beat.partName),
    format: (v) => text("format", v),
    count,
    tailThread: count,
    tailField: count,
    whole: (k) => text("wholeLabel", k),
    divisor,
    source: forms(beat.source),
  };
  for (const [field, list] of [["title", copy.title], ["source", copy.source]])
    if (!list.length || list.some((t) => !t.trim())) throw new Error(`${field} must hold at least one non-empty form, longest first`);
  if (copy.count(0) === copy.count(subject.tipped.length)) throw new Error("countLabel prints the same text for 0 and for the tipped count: print the number it is handed");
  if (copy.whole(0) === copy.whole(steps)) throw new Error("wholeLabel prints the same text for 0 and for the whole: print the number it is handed");

  const { buildDirection, loadBeat, textPerRegisterOf } = await import("./build.mjs");
  const { TreemapFrame } = await import("./TreemapFrame.tsx");
  const { WINDOWS } = await import("./scene.mjs");
  const { label, chosen } = pickDirection(HERE, textPerRegisterOf(copy, subject), beat.evidenceLevels ?? 4);
  let built;
  try {
    built = buildDirection(label, chosen, loadBeat(subject, copy));
  } catch (error) {
    const layout = /cell ladder|too small|would cover|wider than|floor/.test(error.message);
    throw new Error(layout ? `${error.message} — shorten format(), the names in cells, countLabel or the source forms` : error.message);
  }
  const { props, report, direction } = built;
  console.log(`direction ${label}`);
  for (const d of direction.decisions ?? []) console.log(`  ${d.register.padEnd(8)} ${d.role.padEnd(15)} -> ${d.family}`);
  console.log(`  title form ${report.titleForm + 1} · source form ${report.sourceForm + 1} · ${report.count} on their own, ${report.drawn} cells (${report.named} named) · ${subject.tipped.length} tipped, ${report.into} of ${subject.biggest.name}`);

  try {
    assertEventFramesReadable(TreemapFrame, props, SIZE, label);
  } catch (error) {
    throw new Error(`${error.message} — shorten the words that frame draws (names in cells, format(), title forms, source forms)`);
  }

  // The proof's --look list: the last frame of every event, frame 0, and the middle of each gesture.
  const T = props.timing;
  const mid = (event, [a, b]) => Math.round(T[event].start + (T[event].duration * (a + b)) / 2);
  const lookFrames = [
    { name: "first", frame: 0 },
    ...EVENT_ORDER.filter((e) => e !== "hold").map((event) => ({ name: `end-${event}`, frame: endOf(T[event]) - 1 })),
    { name: "reference-whole", frame: mid("reference", WINDOWS.reference.whole) },
    { name: "reveal-split", frame: mid("reveal", WINDOWS.reveal.split) },
    ...["fill", "flood", "gather"].map((f) => ({ name: `subject-${f}`, frame: mid("subject", WINDOWS.subject[f]) })),
    { name: "subject-filled", frame: Math.round(T.subject.start + T.subject.duration * WINDOWS.subject.fill[1]) },
    { name: "conclusion-back", frame: mid("conclusion", WINDOWS.conclusion.back) },
    { name: "final", frame: T.total - 1 },
  ].sort((a, b) => a.frame - b.frame);
  const { wantedOf } = await import((await import("#shared/design-base/skill-script.mjs")).skillScriptFrom(HERE, "chart-video", "scripts", "video-faces.mjs"));
  await renderBeatVideo({
    Frame: TreemapFrame,
    here: HERE,
    label: SIZE === "landscape" ? label : `${label}-${SIZE}`,
    composition: `${COMPOSITION_BASE}-${SIZE}`,
    size: SIZE,
    props,
    wanted: wantedOf(props.registers),
    lookFrames,
    lookOnly: process.argv.includes("--look-only"),
  });
});
