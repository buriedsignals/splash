// The generic half of a parallel-coordinates VIDEO beat, taken from
// proof/video-parallel-coordinates-electricity-mix/render-directions-video.mjs with everything about ITS subject removed.
// The choreography is the worked example's and is not the model's to change: the title card; one line's whole grows
// along the foot as one bar (« 100 % »), splits into its parts, each part stands on its rail keeping its length and the
// line joins the tops; the other lines are drawn across the rails, largest first on the first claim axis, each named;
// the gap between the two claim rails opens across the frame, a floor rises on the first and the lines under it step
// back while the count falls, then a floor rises on the second and the count falls again; the lines left take the
// accent; the rails close back, every line returns, the credit. The timing contract and the shots are the proof's
// (timing-contract.ts, states.mjs, scene.mjs); the layout is the proof's build.mjs. ./beat.mjs — the one file the model
// writes — gives the data and the WORDS.
//
// Usage:  bun <beat>/render-beat.mjs [--size landscape|square|portrait] [--look-only]
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { videoExportSize } from "#shared/chart-video/sizes.mjs";
import { applyStoryboard, assertNumbers, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { assertEventFramesReadable, pickDirection, plain, refusing, renderBeatVideo } from "./video.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const COMPOSITION_BASE = "zone-video-parallel-coordinates"; // Root.tsx registers `${COMPOSITION_BASE}-${size}`

/** A word function of beat.mjs, called and held to a non-empty string — a throw or a non-string names the field. */
function wordOf(name, fn, arg) {
  let out;
  try {
    out = fn(arg);
  } catch (error) {
    throw new Error(`beat.mjs: ${name}(${JSON.stringify(arg)}) threw « ${error.message} » — fix ${name} (see CONTRACT.md)`);
  }
  if (typeof out !== "string" || !out.trim()) throw new Error(`beat.mjs: ${name}(${JSON.stringify(arg)}) returned ${JSON.stringify(out)}, not a non-empty string — fix ${name} (see CONTRACT.md)`);
  return plain(out);
}

await refusing(HERE, async () => {
  const SIZE = videoExportSize();
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);

  const REQUIRED = ["eyebrow", "axes", "lines", "thread", "claimAxes", "floors", "percent", "count", "title", "source", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const field of ["check", "percent", "count"]) if (typeof beat[field] !== "function") throw new Error(`beat.mjs: ${field} must be a function (see CONTRACT.md)`);
  if (typeof beat.eyebrow !== "string") throw new Error("beat.mjs: eyebrow must be a string (see CONTRACT.md)");
  if (!Array.isArray(beat.axes) || !Array.isArray(beat.lines)) throw new Error("beat.mjs: axes and lines must be arrays (see CONTRACT.md)");
  if (beat.short !== undefined && (typeof beat.short !== "object" || Object.values(beat.short).some((s) => typeof s !== "string")))
    throw new Error("beat.mjs: short must be an object { line key: short name } (see CONTRACT.md)");
  assertNumbers(beat.lines.flatMap((l) => beat.axes.map((a) => [`${l.key}.${a.key}`, l.values?.[a.key]])), "line values");

  const { subjectOf, assertGesture } = await import("./subject.mjs");
  const subject = subjectOf({ ...beat, axes: beat.axes.map((a) => ({ ...a, name: plain(a.name) })), lines: beat.lines.map((l) => ({ ...l, name: plain(l.name) })) });
  // The claim first: a title the data no longer supports is the refusal to read, before any the gesture raises.
  beat.check({ lines: beat.lines, r: subject.r, both: subject.both.map((l) => l.code) });
  assertGesture(subject);

  const values = subject.lines.flatMap((l) => l.values);
  assertDrawsClaimColumn(subject.lines.map((l) => l.values[0]), HERE);
  // The headline speaks in counts (the lines left, the lines in all, each floor's group) and in the floors themselves.
  assertHeadlineNumbersDrawn(
    [beat.title].flat()[0],
    [...values, ...subject.floors, subject.both.length, subject.lines.length, subject.nuclearHeavy.length, subject.windHeavy.length],
    "lines",
  );

  // ── the words, in the shape the proof's build.mjs reads (`copyOf` there)
  const copy = {
    eyebrow: plain(beat.eyebrow),
    title: [beat.title].flat().map(plain),
    short: Object.fromEntries(Object.entries(beat.short ?? {}).map(([k, v]) => [String(k), plain(v)])),
    whole: wordOf("percent", beat.percent, 100),
    percent: (v) => wordOf("percent", beat.percent, v),
    count: (n) => wordOf("count", beat.count, n),
    source: [beat.source].flat().map(plain),
  };
  if (!copy.title.length || copy.title.some((t) => !t.trim())) throw new Error("title must hold at least one non-empty form (the takeaway first)");
  if (!copy.source.length || copy.source.some((t) => !t.trim())) throw new Error("source must hold at least one non-empty form");

  const { buildDirection, loadBeat, textPerRegisterOf } = await import("./build.mjs");
  const { ParallelFrame } = await import("./ParallelFrame.tsx");
  const { sceneAt, WINDOWS } = await import("./scene.mjs");
  const { label, chosen } = pickDirection(HERE, textPerRegisterOf(copy, subject), beat.evidenceLevels ?? 4);
  let built;
  try {
    built = buildDirection(label, chosen, loadBeat(subject, copy));
  } catch (error) {
    // The proof's layout refusals name the frame, not the beat: say what in beat.mjs moves them.
    const layout = /finds no seat|close-up names need|hangs off|run off the frame|touches|floor/.test(error.message);
    throw new Error(layout ? `${error.message} — give the long names a short form in short, shorten the axis names, or draw fewer lines` : error.message);
  }
  const { props, report, direction } = built;
  console.log(`direction ${label}`);
  for (const d of direction.decisions ?? []) console.log(`  ${d.register.padEnd(8)} ${d.role.padEnd(15)} -> ${d.family}`);
  console.log(`  title form ${report.titleForm + 1} · source form ${report.sourceForm + 1} · scale ${report.scale}px a point · seats on rails ${report.seated} · ${report.short} short name(s)`);

  try {
    assertEventFramesReadable(ParallelFrame, props, SIZE, label);
  } catch (error) {
    throw new Error(`${error.message} — shorten the words that frame draws (names, axis names, title forms, source forms)`);
  }

  // What the proof's frame.test.ts held per direction, now for this data: the count is the lines at or above both
  // floors at every frame of the sweeps, every count and floor text was measured, and the sweep ends on the thread.
  const T = props.timing;
  const last = (event) => T[event].start + T[event].duration - 1;
  for (let f = T.subject.start; f < T.subject.start + T.subject.duration; f += 1) {
    const s = sceneAt(props, f);
    const [nf, wf] = s.floors.map((fl) => fl.value);
    const want = props.lines.filter((l) => l.values[0] >= nf - 1e-9 && l.values[1] >= wf - 1e-9).length;
    if (s.count !== want) throw new Error(`at frame ${f} the count shows ${s.count}, not the ${want} lines at or above both floors (a kit bug)`);
    if (!(String(s.count) in props.counter.texts)) throw new Error(`the count shows ${s.count} at frame ${f}, a text build.mjs did not measure (a kit bug)`);
    s.floors.forEach((fl, i) => {
      if (!(fl.label in props.floors[i].texts)) throw new Error(`a floor shows ${fl.label} at frame ${f}, a text build.mjs did not measure (a kit bug)`);
    });
  }
  const end = sceneAt(props, last("subject"));
  const lit = props.lines.filter((_, i) => end.lines[i].accent === 1).map((l) => l.code).sort();
  if (lit.join() !== subject.both.map((l) => l.code).sort().join()) throw new Error("the sweep does not end on the thread in the accent (a kit bug)");

  // The proof's --look list: the last frame of every event, frame 0, and the middle of each gesture.
  const mid = (event, [a, b]) => Math.round(T[event].start + (T[event].duration * (a + b)) / 2);
  const lookFrames = [
    { name: "first", frame: 0 },
    { name: "end-establish", frame: last("establish") },
    { name: "reference-stand", frame: mid("reference", WINDOWS.reference.stand) },
    { name: "end-reference", frame: last("reference") },
    { name: "reveal-draw", frame: mid("reveal", WINDOWS.reveal.draw) },
    { name: "end-reveal", frame: last("reveal") },
    { name: "subject-zoom", frame: mid("subject", WINDOWS.subject.zoom) },
    { name: "subject-nuclear", frame: mid("subject", WINDOWS.subject.nuclear) },
    { name: "subject-wind", frame: mid("subject", WINDOWS.subject.wind) },
    { name: "end-subject", frame: last("subject") },
    { name: "conclusion-back", frame: mid("conclusion", WINDOWS.conclusion.back) },
    { name: "end-conclusion", frame: last("conclusion") },
    { name: "final", frame: T.total - 1 },
  ];
  const { wantedOf } = await import((await import("#shared/design-base/skill-script.mjs")).skillScriptFrom(HERE, "chart-video", "scripts", "video-faces.mjs"));
  await renderBeatVideo({
    Frame: ParallelFrame,
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
