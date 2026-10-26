// The generic half of a slope VIDEO beat, taken from proof/video-slope-europe-lowcarbon/render-directions-video.mjs with
// everything about ITS subject removed. The choreography is the worked example's and is not the model's to change: two
// rails and every left value; the lines travelling to the right rail one after another, the largest rise first, the
// rises counted; the held line taking the accent; every line that started under it tested in turn, the lowest finish
// first, each stepping back if it ends under it, the one that ends above taking the accent and its crossing ringed; then
// the whole chart and the credit. The timing contract and the shots are the proof's (timing-contract.ts, states.mjs,
// scene.mjs); the layout is the proof's build.mjs. ./beat.mjs — the one file the model writes — gives the data and the
// WORDS.
//
// Usage:  bun <beat>/render-beat.mjs [--size landscape|square|portrait] [--look-only]
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { videoExportSize } from "#shared/chart-video/sizes.mjs";
import { EVENT_ORDER, endOf } from "#shared/chart-video/timing.ts";
import { applyStoryboard, assertNumbers, assertLegibleLabels, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { assertEventFramesReadable, pickDirection, plain, refusing, renderBeatVideo } from "./video.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const COMPOSITION_BASE = "zone-video-slope-slopegraph"; // Root.tsx registers `${COMPOSITION_BASE}-${size}`

await refusing(HERE, async () => {
  const SIZE = videoExportSize();
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);

  const REQUIRED = ["eyebrow", "lines", "rails", "held", "subject", "format", "riseLabel", "passLabel", "title", "source", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const field of ["check", "format", "riseLabel", "passLabel"]) if (typeof beat[field] !== "function") throw new Error(`beat.mjs: ${field} must be a function (see CONTRACT.md)`);
  if (typeof beat.eyebrow !== "string") throw new Error("beat.mjs: eyebrow must be a string (see CONTRACT.md)");
  if (!beat.rails || typeof beat.rails.left !== "string" || typeof beat.rails.right !== "string") throw new Error('beat.mjs: rails must be { left: "2000", right: "2024" } — two strings');
  if (!Array.isArray(beat.lines)) throw new Error("beat.mjs: lines must be an array of { key, label, from, to }");
  assertNumbers(beat.lines.flatMap((d) => [[`${d.label}.from`, d.from], [`${d.label}.to`, d.to]]), "lines");

  // The claim first: a title the data no longer supports is the refusal to read, before any the gesture raises.
  beat.check();
  const { subjectOf } = await import("./subject.mjs");
  const subject = subjectOf({ ...beat, lines: beat.lines.map((d) => ({ ...d, label: plain(d.label) })) });
  const values = subject.lines.flatMap((d) => [d.from, d.to]);
  const format = (v) => {
    const t = beat.format(v);
    if (typeof t !== "string" || !t.trim()) throw new Error(`beat.mjs: format(${v}) must return a non-empty string`);
    return plain(t);
  };
  assertLegibleLabels(values, format);
  assertDrawsClaimColumn(values, HERE);
  // The title may state how many lines rose and how many passed: figures the counters draw.
  assertHeadlineNumbersDrawn([beat.title].flat()[0], [...values, subject.lines.length, 1], "lines");

  // ── the words, in the shape the proof's build.mjs reads (`copyOf` there)
  const label = (field, count) => {
    const t = beat[field](count);
    if (typeof t !== "string" || !t.trim()) throw new Error(`beat.mjs: ${field}(${count}) must return a non-empty string`);
    return plain(t);
  };
  const copy = {
    eyebrow: plain(beat.eyebrow),
    title: [beat.title].flat().map(plain),
    left: (d) => `${d.label} ${format(d.from)}`,
    // The pair is named on the right too: two accent lines ending close together are otherwise told apart by nothing.
    right: (d, pair) => (pair ? `${format(d.to)} ${d.label}` : format(d.to)),
    rails: [plain(beat.rails.left), plain(beat.rails.right)],
    rose: (count) => label("riseLabel", count),
    passed: (count) => label("passLabel", count),
    source: [beat.source].flat().map(plain),
  };
  if (!copy.title.length || copy.title.some((t) => !t.trim())) throw new Error("title must hold at least one non-empty form (the takeaway first)");
  if (!copy.source.length || copy.source.some((t) => !t.trim())) throw new Error("source must hold at least one non-empty form");
  if (copy.rose(0) === copy.rose(subject.lines.length)) throw new Error("riseLabel prints the same text for 0 and for every line: print the number it is handed");
  if (copy.passed(0) === copy.passed(1)) throw new Error("passLabel prints the same text for 0 and 1: print the number it is handed");

  const { buildDirection, loadBeat, textPerRegisterOf } = await import("./build.mjs");
  const { SlopeFrame } = await import("./SlopeFrame.tsx");
  const { label: dirLabel, chosen } = pickDirection(HERE, textPerRegisterOf(copy, subject), beat.evidenceLevels ?? 4);
  let built;
  try {
    built = buildDirection(dirLabel, chosen, loadBeat(subject, copy));
  } catch (error) {
    const layout = /end labels need|floor|run past|does not fit/.test(error.message);
    throw new Error(layout ? `${error.message} — draw fewer lines, shorten the labels or format(), or add a shorter source form` : error.message);
  }
  const { props, report, direction } = built;
  console.log(`direction ${dirLabel}`);
  for (const d of direction.decisions ?? []) console.log(`  ${d.register.padEnd(8)} ${d.role.padEnd(15)} -> ${d.family}`);
  console.log(`  title form ${report.titleForm + 1} · source form ${report.sourceForm + 1} · labels pushed up to ${report.pushed}px · ${subject.climber.label} passes ${subject.held.label}`);

  try {
    assertEventFramesReadable(SlopeFrame, props, SIZE, dirLabel);
  } catch (error) {
    throw new Error(`${error.message} — shorten the words that frame draws (labels, title forms, source forms)`);
  }

  // The proof's --look list: the last frame of every event, frame 0, and the middle of each gesture.
  const T = props.timing;
  const lookFrames = [
    { name: "first", frame: 0 },
    ...EVENT_ORDER.filter((e) => e !== "hold").map((event) => ({ name: `end-${event}`, frame: endOf(T[event]) - 1 })),
    { name: "reveal-travel", frame: Math.round(T.reveal.start + T.reveal.duration * 0.5) },
    ...[0.4, 0.8].map((t) => ({ name: `subject-check-${t}`, frame: Math.round(T.subject.start + T.subject.duration * t) })),
    { name: "final", frame: T.total - 1 },
  ].sort((a, b) => a.frame - b.frame);
  const { wantedOf } = await import((await import("#shared/design-base/skill-script.mjs")).skillScriptFrom(HERE, "chart-video", "scripts", "video-faces.mjs"));
  await renderBeatVideo({
    Frame: SlopeFrame,
    here: HERE,
    label: SIZE === "landscape" ? dirLabel : `${dirLabel}-${SIZE}`,
    composition: `${COMPOSITION_BASE}-${SIZE}`,
    size: SIZE,
    props,
    wanted: wantedOf(props.registers),
    lookFrames,
    lookOnly: process.argv.includes("--look-only"),
  });
});
