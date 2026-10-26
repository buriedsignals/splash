// The generic half of a stacked-bar VIDEO beat, taken from
// proof/video-stacked-bar-lowcarbon-growth/render-directions-video.mjs with everything about ITS subject removed. The
// choreography is the worked example's and is not the model's to change: the first-state levels growing from zero in
// their order, each number past its end; the part added stacking on each level, the gain counting; copies of the
// adder's level laid end to end along the incumbent's, « ×N » counting; every added part sliding off to zero, the levels
// stepping back; the rows re-sorting by gain; the added parts sliding back, the adder and the incumbent ringed, the
// credit. The timing contract and the shots are the proof's (timing-contract.ts, states.mjs, scene.mjs); the layout is
// the proof's build.mjs. ./beat.mjs — the one file the model writes — gives the data and the WORDS.
//
// Usage:  bun <beat>/render-beat.mjs [--size landscape|square|portrait] [--look-only]
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { videoExportSize } from "#shared/chart-video/sizes.mjs";
import { EVENT_ORDER, endOf } from "#shared/chart-video/timing.ts";
import { applyStoryboard, assertNumbers, assertLegibleLabels, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { assertEventFramesReadable, pickDirection, plain, refusing, renderBeatVideo } from "./video.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const COMPOSITION_BASE = "zone-video-stacked-bar"; // Root.tsx registers `${COMPOSITION_BASE}-${size}`

await refusing(HERE, async () => {
  const SIZE = videoExportSize();
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);

  const REQUIRED = ["eyebrow", "rows", "adder", "incumbent", "unit", "segments", "title", "source", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  if (typeof beat.check !== "function") throw new Error("beat.mjs: check must be a function (see CONTRACT.md)");
  for (const field of ["eyebrow", "unit"]) if (typeof beat[field] !== "string") throw new Error(`beat.mjs: ${field} must be a string (see CONTRACT.md)`);
  if (!beat.segments || typeof beat.segments.level !== "string" || typeof beat.segments.growth !== "string")
    throw new Error('beat.mjs: segments must be { level: "2000", growth: "added by 2024" } — two strings');
  if (!Array.isArray(beat.rows)) throw new Error("beat.mjs: rows must be an array of { name, level, growth }");
  assertNumbers(beat.rows.flatMap((r) => [[`${r.name}.level`, r.level], [`${r.name}.growth`, r.growth]]), "rows");

  // The claim first: a title the data no longer supports is the refusal to read, before any the gesture raises.
  beat.check();
  const { subjectOf } = await import("./subject.mjs");
  const subject = subjectOf({ ...beat, rows: beat.rows.map((r) => ({ ...r, name: plain(r.name) })), adder: plain(beat.adder), incumbent: plain(beat.incumbent) });
  const levels = subject.rows.map((r) => r.level);
  const growths = subject.rows.map((r) => r.growth);
  // Levels and gains print as whole numbers («412», «+119»): values under one unit, or that round alike, read as one.
  assertLegibleLabels(levels, (v) => String(Math.round(v)));
  assertLegibleLabels(growths, (v) => `+${Math.round(v)}`);
  assertDrawsClaimColumn([...levels, ...growths], HERE);
  assertHeadlineNumbersDrawn([beat.title].flat()[0], [...levels, ...growths, ...subject.rows.map((r) => r.total), subject.copies], "bars");

  // ── the words, in the shape the proof's build.mjs reads (`copyOf` there)
  const forms = (v) => [v].flat().map((t) => plain(String(t)));
  const copy = {
    eyebrow: plain(beat.eyebrow),
    title: forms(beat.title),
    unit: plain(beat.unit),
    key: [plain(beat.segments.level), plain(beat.segments.growth)],
    source: forms(beat.source),
  };
  for (const [field, list] of [["title", copy.title], ["source", copy.source]])
    if (!list.length || list.some((t) => !t.trim())) throw new Error(`${field} must hold at least one non-empty form, longest first`);

  const { buildDirection, loadBeat, textPerRegisterOf } = await import("./build.mjs");
  const { StackedBarFrame } = await import("./StackedBarFrame.tsx");
  const { WINDOWS } = await import("./scene.mjs");
  const { label, chosen } = pickDirection(HERE, textPerRegisterOf(copy, subject), beat.evidenceLevels ?? 4);
  let built;
  try {
    built = buildDirection(label, chosen, loadBeat(subject, copy));
  } catch (error) {
    const layout = /do not fit|runs out of the frame|too short to hold|floor/.test(error.message);
    throw new Error(layout ? `${error.message} — shorten the names in rows, the unit or the segments' words, or lower drawCount` : error.message);
  }
  const { props, report, direction } = built;
  console.log(`direction ${label}`);
  for (const d of direction.decisions ?? []) console.log(`  ${d.register.padEnd(8)} ${d.role.padEnd(15)} -> ${d.family}`);
  console.log(`  title form ${report.titleForm + 1} · source form ${report.sourceForm + 1} · ${report.copies} copies of ${subject.adder.name}'s level along ${subject.incumbent.name}'s · row pitch ${report.pitch}`);

  try {
    assertEventFramesReadable(StackedBarFrame, props, SIZE, label);
  } catch (error) {
    throw new Error(`${error.message} — shorten the words that frame draws (names in rows, unit, segments, title forms, source forms)`);
  }

  // The proof's --look list: the last frame of every event, frame 0, and the middle of each gesture.
  const T = props.timing;
  const mid = (event, [a, b]) => Math.round(T[event].start + (T[event].duration * (a + b)) / 2);
  const lookFrames = [
    { name: "first", frame: 0 },
    ...EVENT_ORDER.filter((e) => e !== "hold").map((event) => ({ name: `end-${event}`, frame: endOf(T[event]) - 1 })),
    { name: "reveal-grow", frame: mid("reveal", WINDOWS.reveal.grow) },
    { name: "subject-copies-laid", frame: Math.round(T.subject.start + T.subject.duration * WINDOWS.subject.detach[0]) },
    ...["copies", "detach", "reorder"].map((f) => ({ name: `subject-${f}`, frame: mid("subject", WINDOWS.subject[f]) })),
    { name: "conclusion-back", frame: mid("conclusion", WINDOWS.conclusion.back) },
    { name: "final", frame: T.total - 1 },
  ].sort((a, b) => a.frame - b.frame);
  const { wantedOf } = await import((await import("#shared/design-base/skill-script.mjs")).skillScriptFrom(HERE, "chart-video", "scripts", "video-faces.mjs"));
  await renderBeatVideo({
    Frame: StackedBarFrame,
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
