// The generic half of a gantt VIDEO beat, taken from proof/video-gantt-top-ten-tenure/render-directions-video.mjs with
// everything about ITS subject removed. The choreography is the worked example's and is not the model's to change: the
// rows and their names; a year cursor sweeps the window from the first year to the last, each row's bar growing behind
// it while the row holds its place and stopping where it leaves, the count of the first year's rows that never left
// falling the moment one leaves, its name muted; the rows that never left are picked out, the others step back; then
// the others return, the whole chart, the credit on one line. The timing contract and the shots are the proof's
// (timing-contract.ts, states.mjs, scene.mjs); the layout is the proof's build.mjs. ./beat.mjs — the one file the model
// writes — gives the data and the WORDS.
//
// Usage:  bun <beat>/render-beat.mjs [--size landscape|square|portrait] [--look-only]
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { videoExportSize } from "#shared/chart-video/sizes.mjs";
import { EVENT_ORDER, endOf } from "#shared/chart-video/timing.ts";
import { skillScriptFrom } from "#shared/design-base/skill-script.mjs";
import { applyStoryboard, assertHeadlineNumbersDrawn } from "./guards.mjs";
import { assertEventFramesReadable, pickDirection, plain, refusing, renderBeatVideo } from "./video.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const COMPOSITION_BASE = "zone-video-gantt"; // Root.tsx registers `${COMPOSITION_BASE}-${size}`

/** A word function of beat.mjs, called the way the frame calls it: a throw or a non-string names the field. */
const wordOf = (field, fn) => (...args) => {
  let out;
  try {
    out = fn(...args);
  } catch (error) {
    throw new Error(`beat.mjs: ${field}(${args.map((a) => JSON.stringify(a)).join(", ")}) threw: ${error.message}`);
  }
  if (typeof out !== "string" || !out.trim()) throw new Error(`beat.mjs: ${field}(${args.map((a) => JSON.stringify(a)).join(", ")}) must return a non-empty string, got ${JSON.stringify(out)}`);
  return plain(out);
};

await refusing(HERE, async () => {
  const SIZE = videoExportSize();
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);

  const REQUIRED = ["eyebrow", "rows", "subjects", "first", "last", "count", "title", "source", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const fn of ["count", "check"]) if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);
  if (typeof beat.eyebrow !== "string" || !beat.eyebrow.trim()) throw new Error("beat.mjs: eyebrow must be a non-empty string (see CONTRACT.md)");
  if (!Array.isArray(beat.rows)) throw new Error("beat.mjs: rows must be an array of { key, label, runs: [{ from, to }] }");
  const keys = beat.rows.map((r) => String(r.key));
  if (new Set(keys).size !== keys.length) throw new Error("rows holds the same key twice: give each row ALL its runs in one row");
  // The claim first: a title the data no longer supports is the refusal to read, before any the gesture raises.
  beat.check();
  const { subjectOf } = await import("./subject.mjs");
  const subject = subjectOf({ ...beat, rows: beat.rows.map((r) => ({ ...r, key: plain(r.key), label: plain(r.label) })), subjects: [beat.subjects].flat().map(plain) });
  // The title may state how many never left, how many rows, or a run's length — the counts the video draws.
  assertHeadlineNumbersDrawn([beat.title].flat()[0], [subject.throughout, subject.rows.length, ...subject.neverLeft, ...subject.rows.map((r) => r.years)], "rows");

  const count = wordOf("count", beat.count);
  const copy = {
    eyebrow: plain(beat.eyebrow),
    title: [beat.title].flat().map(plain),
    count,
    source: [beat.source].flat().map(plain),
  };
  if (!copy.title.length || copy.title.some((t) => !t.trim())) throw new Error("title must hold at least one non-empty form (the takeaway first)");
  if (!copy.source.length || copy.source.some((t) => !t.trim())) throw new Error("source must hold at least one non-empty form");
  for (const n of new Set(subject.neverLeft)) count(n);

  const { buildDirection, loadBeat, textPerRegisterOf } = await import("./build.mjs");
  const { GanttFrame } = await import("./GanttFrame.tsx");
  const { label, chosen } = pickDirection(HERE, textPerRegisterOf(copy, subject), beat.evidenceLevels ?? 2);
  let built;
  try {
    built = buildDirection(label, chosen, loadBeat(subject, copy));
  } catch (error) {
    const layout = /shorter than its name|no year axis/.test(error.message);
    throw new Error(layout ? `${error.message} — shorten the labels of rows or draw fewer rows, or add a shorter source form` : error.message);
  }
  const { props, report, direction } = built;
  console.log(`direction ${label}`);
  for (const d of direction.decisions ?? []) console.log(`  ${d.register.padEnd(8)} ${d.role.padEnd(15)} -> ${d.family}`);
  console.log(`  title form ${report.titleForm + 1} · source form ${report.sourceForm + 1} · row ${report.pitch}px · names ${report.axisPx}px · ${report.ticks} year ticks · never left ${subject.neverLeft[0]} → ${subject.neverLeft.at(-1)}`);

  try {
    assertEventFramesReadable(GanttFrame, props, SIZE, label);
  } catch (error) {
    throw new Error(`${error.message} — shorten the words that frame draws (labels of rows, count(), title forms, source forms)`);
  }
  // Every count and year the sweep passes through was measured in Bun (the proof's frame.test.ts, for this data).
  const { sceneAt, WINDOWS } = await import("./scene.mjs");
  for (let frame = 0; frame < props.timing.total; frame += 1) {
    const s = sceneAt(props, frame);
    if (s.counting && !props.counts[String(s.neverLeft)]) throw new Error(`the count shows ${s.neverLeft} at frame ${frame}, a text build.mjs did not measure (a kit bug, not a beat.mjs one)`);
    if (s.cursor.shown && !props.yearTexts[String(s.cursor.year)]) throw new Error(`the cursor shows ${s.cursor.year} at frame ${frame}, a year build.mjs did not measure (a kit bug)`);
  }

  const T = props.timing;
  const lookFrames = [
    { name: "first", frame: 0 },
    ...[0.3, 0.6].map((t) => ({ name: `reveal-clock-${t}`, frame: Math.round(T.reveal.start + T.reveal.duration * (WINDOWS.reveal.clock[0] + t * (WINDOWS.reveal.clock[1] - WINDOWS.reveal.clock[0]))) })),
    ...EVENT_ORDER.map((event) => ({ name: event === "hold" ? "final" : `end-${event}`, frame: Math.min(endOf(T[event]), T.total) - 1 })),
  ].sort((a, b) => a.frame - b.frame);
  const { wantedOf } = await import(skillScriptFrom(HERE, "chart-video", "scripts", "video-faces.mjs"));
  await renderBeatVideo({
    Frame: GanttFrame,
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
