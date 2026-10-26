// The generic half of a scatter VIDEO beat, taken from
// proof/video-scatter-income-life-expectancy/render-directions-video.mjs with everything about ITS subject removed. The
// choreography is the worked example's and is not the model's to change: every point stacked in one column at its own y,
// unfolding along x in x order while a count climbs; the declared break ruled; the cloud folding against it into two
// columns, each measured by a bar over its y span; copies of the short bar stacking onto the long one — the ratio counted;
// then the whole cloud back, the bars kept, the credit. The timing contract and the shots are the proof's
// (timing-contract.ts, states.mjs, scene.mjs); the layout is the proof's build.mjs. ./beat.mjs — the one file the model
// writes — gives the data and the WORDS.
//
// Usage:  bun <beat>/render-beat.mjs [--size landscape|square|portrait] [--look-only]
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { videoExportSize } from "#shared/chart-video/sizes.mjs";
import { EVENT_ORDER, endOf } from "#shared/chart-video/timing.ts";
import { applyStoryboard, assertNumbers, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { assertEventFramesReadable, pickDirection, plain, refusing, renderBeatVideo } from "./video.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const COMPOSITION_BASE = "zone-video-scatter-and-bubble"; // Root.tsx registers `${COMPOSITION_BASE}-${size}`

await refusing(HERE, async () => {
  const SIZE = videoExportSize();
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);

  const REQUIRED = ["eyebrow", "points", "breakAt", "xLog", "xName", "yName", "xTick", "thresholdLabel", "countLabel", "spanLabel", "timesLabel", "title", "source", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const field of ["check", "xTick", "thresholdLabel", "countLabel", "spanLabel", "timesLabel"])
    if (typeof beat[field] !== "function") throw new Error(`beat.mjs: ${field} must be a function (see CONTRACT.md)`);
  if (beat.yTick !== undefined && typeof beat.yTick !== "function") throw new Error("beat.mjs: yTick must be a function, or left out");
  for (const field of ["eyebrow", "xName"]) if (typeof beat[field] !== "string") throw new Error(`beat.mjs: ${field} must be a string (see CONTRACT.md)`);
  if (!Array.isArray(beat.points)) throw new Error("beat.mjs: points must be an array of { x, y }");
  assertNumbers(beat.points.flatMap((p, i) => [[`points[${i}].x`, p.x], [`points[${i}].y`, p.y]]), "points");

  // The claim first: a title the data no longer supports is the refusal to read, before any the gesture raises.
  beat.check();
  const { subjectOf } = await import("./subject.mjs");
  const subject = subjectOf(beat);
  const { below, above, times, countries } = subject;
  console.log(`break at ${subject.breakAt}: ${below.count} below spanning ${+below.range.toPrecision(4)}, ${above.count} at or above spanning ${+above.range.toPrecision(4)} — ratio ${subject.ratio.toFixed(3)}, ${times} copies`);

  const ys = countries.map((c) => c.age);
  assertDrawsClaimColumn(ys, HERE);
  // The title may state the break's ratio, the counts each side and the spans — figures the gesture computes and draws.
  assertHeadlineNumbersDrawn([beat.title].flat()[0], [...ys, below.range, above.range, below.count, above.count, countries.length, times, subject.breakAt], "points");

  // ── the words, in the shape the proof's build.mjs reads (`copyOf` there), each label fed the number the kit computed
  const text = (field, v) => {
    const t = beat[field](v);
    if (typeof t !== "string" || !t.trim()) throw new Error(`beat.mjs: ${field}(${v}) must return a non-empty string`);
    return plain(t);
  };
  const copy = {
    eyebrow: plain(beat.eyebrow),
    title: [beat.title].flat().map(plain),
    yName: [beat.yName].flat().map(plain),
    xName: plain(beat.xName),
    tick: (v) => text("xTick", v),
    yTick: (v) => (beat.yTick ? text("yTick", v) : String(v)),
    breakAt: text("thresholdLabel", subject.breakAt),
    counted: (count) => text("countLabel", count),
    span: (v) => text("spanLabel", v),
    times: text("timesLabel", times),
    source: [beat.source].flat().map(plain),
  };
  if (!copy.title.length || copy.title.some((t) => !t.trim())) throw new Error("title must hold at least one non-empty form (the takeaway first)");
  if (!copy.source.length || copy.source.some((t) => !t.trim())) throw new Error("source must hold at least one non-empty form");
  if (!copy.yName.length || copy.yName.some((t) => !t.trim())) throw new Error("yName must hold at least one non-empty form, longest first");
  // A label that ignores the number it is handed draws a figure the kit did not compute.
  if (copy.span(below.range) === copy.span(above.range)) throw new Error(`spanLabel prints ${JSON.stringify(copy.span(below.range))} for both spans (${+below.range.toPrecision(4)} and ${+above.range.toPrecision(4)}): print the number it is handed`);
  if (copy.counted(0) === copy.counted(countries.length)) throw new Error("countLabel prints the same text for 0 and for every point: print the number it is handed");
  if (!copy.times.includes(String(times))) throw new Error(`timesLabel(${times}) prints ${JSON.stringify(copy.times)}: print the number it is handed (the copies stacked)`);

  const { buildDirection, loadBeat, textPerRegisterOf } = await import("./build.mjs");
  const { ScatterFrame } = await import("./ScatterFrame.tsx");
  const { sceneAt, WINDOWS } = await import("./scene.mjs");
  const { label, chosen } = pickDirection(HERE, textPerRegisterOf(copy, subject), beat.evidenceLevels ?? 4);
  let built;
  try {
    built = buildDirection(label, chosen, loadBeat(subject, copy));
  } catch (error) {
    // The proof's layout refusals name the frame, not the beat: say what in beat.mjs moves them.
    const layout = /folded column|sits on a dot|rises above|runs past|run into|runs into|clears|side by side|floor/.test(error.message);
    throw new Error(layout ? `${error.message} — shorten the words (thresholdLabel, countLabel, spanLabel, yName, xName, source forms), or move breakAt so fewer points crowd one side` : error.message);
  }
  const { props, report, direction } = built;
  console.log(`direction ${label}`);
  for (const d of direction.decisions ?? []) console.log(`  ${d.register.padEnd(8)} ${d.role.padEnd(15)} -> ${d.family}`);
  console.log(`  title form ${report.titleForm + 1} · source form ${report.sourceForm + 1} · dot ${report.radius.toFixed(1)}px in a ${report.plotHeight}px plot · « ${report.yName} »`);

  try {
    assertEventFramesReadable(ScatterFrame, props, SIZE, label);
  } catch (error) {
    throw new Error(`${error.message} — shorten the words that frame draws (title forms, source forms, the labels)`);
  }
  // Every count the climb shows was measured in Bun.
  for (let frame = 0; frame < props.timing.total; frame += 1) {
    const scene = sceneAt(props, frame);
    if (scene.counter > 0 && !props.counter[String(scene.counted)]) throw new Error(`the count shows ${scene.counted} at frame ${frame}, a text build.mjs did not measure (a kit bug, not a beat.mjs one)`);
  }

  // The proof's --look list: the last frame of every event, frame 0, and the middle of each gesture.
  const T = props.timing;
  const mid = (event, [a, b]) => Math.round(T[event].start + (T[event].duration * (a + b)) / 2);
  const lookFrames = [
    { name: "first", frame: 0 },
    ...EVENT_ORDER.filter((e) => e !== "hold").map((event) => ({ name: `end-${event}`, frame: endOf(T[event]) - 1 })),
    { name: "reveal-split", frame: mid("reveal", WINDOWS.reveal.split) },
    { name: "subject-fold", frame: mid("subject", WINDOWS.subject.fold) },
    { name: "subject-stack", frame: mid("subject", WINDOWS.subject.stack) },
    { name: "conclusion-unfold", frame: mid("conclusion", WINDOWS.conclusion.unfold) },
    { name: "final", frame: T.total - 1 },
  ].sort((a, b) => a.frame - b.frame);
  const { wantedOf } = await import((await import("#shared/design-base/skill-script.mjs")).skillScriptFrom(HERE, "chart-video", "scripts", "video-faces.mjs"));
  await renderBeatVideo({
    Frame: ScatterFrame,
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
