// The generic half of a bar-and-column VIDEO beat, taken from
// proof/video-bar-top-emitters-2024/render-directions-video.mjs with everything about ITS subject removed. The
// choreography is the worked example's and is not the model's to change: the whole the ranking is cut from as one bar,
// the drawn members falling out of it into their rows, the scale closing onto the leader, the members after it lining up
// under it short of its end, the last row sliding into the gap and fitting, then the whole ranking with the pile
// bracketed. The timing contract and the shots are the proof's (timing-contract.ts, states.mjs, scene.mjs); the layout
// is the proof's build.mjs. ./beat.mjs — the one file the model writes — gives the data and the WORDS.
//
// Usage:  bun <beat>/render-beat.mjs [--size landscape|square|portrait] [--look-only]
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { videoExportSize } from "#shared/chart-video/sizes.mjs";
import { applyStoryboard, assertNumbers, assertLegibleLabels, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { assertEventFramesReadable, numberFormat, pickDirection, plain, refusing, renderBeatVideo, storyLanguage } from "./video.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const NB = " ";
const COMPOSITION_BASE = "zone-video-bar-and-column"; // Root.tsx registers `${COMPOSITION_BASE}-${size}`

await refusing(HERE, async () => {
  const SIZE = videoExportSize();
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);

  const REQUIRED = ["eyebrow", "rows", "subject", "whole", "wholeName", "unit", "title", "source", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  if (typeof beat.check !== "function") throw new Error("beat.mjs: check must be a function (see CONTRACT.md)");
  for (const field of ["eyebrow", "wholeName", "unit"])
    if (typeof beat[field] !== "string") throw new Error(`beat.mjs: ${field} must be a string (see CONTRACT.md)`);
  if (!Array.isArray(beat.rows)) throw new Error("beat.mjs: rows must be an array of { name, value }");

  // ── the ranking, and the search behind the headline (./subject.mjs: the proof's derivation, its asserts as refusals)
  assertNumbers(beat.rows.map((r) => [r.name, r.value]));
  const names = beat.rows.map((r) => String(r.name));
  if (new Set(names).size !== names.length) throw new Error("rows holds the same name twice: give each row ONE value (filter data.json to one year / one series)");
  // The claim first: a title the data no longer supports is the refusal to read, before any the gesture raises.
  beat.check();
  const { subjectOf } = await import("./subject.mjs");
  const subject = subjectOf({ ...beat, rows: beat.rows.map((r) => ({ name: plain(r.name), value: r.value })), subject: plain(beat.subject) });
  const values = subject.top.map((r) => r.value);

  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";
  const format = numberFormat({ lang, max: Math.max(subject.world, ...values), decimals: beat.decimals, decimal: beat.decimal });
  const { valueText } = await import("./scene.mjs");
  assertLegibleLabels(values, (v) => valueText(v, format));
  assertDrawsClaimColumn(values, HERE);
  // The title may state the pile's count or its sum ("more than the next five together") — figures the gesture
  // computes and draws (the count of blocks, the bracketed sum), so they count as drawn beside the values.
  assertHeadlineNumbersDrawn([beat.title].flat()[0], [...values, subject.beaten, subject.combined], "bars");

  // ── the words, in the shape the proof's build.mjs reads (`copyOf` there)
  const unitWord = plain(beat.unit).trim();
  const copy = {
    eyebrow: plain(beat.eyebrow),
    title: [beat.title].flat().map(plain),
    world: plain(beat.wholeName),
    unit: (text) => (unitWord ? `${text}${NB}${unitWord}` : text),
    unitWord,
    source: [beat.source].flat().map(plain),
    format,
  };
  if (!copy.title.length || copy.title.some((t) => !t.trim())) throw new Error("title must hold at least one non-empty form (the takeaway first)");
  if (!copy.source.length || copy.source.some((t) => !t.trim())) throw new Error("source must hold at least one non-empty form");

  const { buildDirection, loadBeat, textPerRegisterOf } = await import("./build.mjs");
  const { BarFrame } = await import("./BarFrame.tsx");
  const { sceneAt } = await import("./scene.mjs");
  const { label, chosen } = pickDirection(HERE, textPerRegisterOf(copy, subject), beat.evidenceLevels ?? 2);
  let built;
  try {
    built = buildDirection(label, chosen, loadBeat(subject, copy));
  } catch (error) {
    // The proof's layout refusals name the frame, not the beat: say what in beat.mjs moves them.
    const layout = /run past the frame|too thin|no credit leaves|floor/.test(error.message);
    throw new Error(layout ? `${error.message} — shorten the names in rows, add a shorter source form, or lower drawCount` : error.message);
  }
  const { props, report, direction } = built;
  console.log(`direction ${label}`);
  for (const d of direction.decisions ?? []) console.log(`  ${d.register.padEnd(8)} ${d.role.padEnd(15)} -> ${d.family}`);
  console.log(`  title form ${report.titleForm + 1} · source form ${report.sourceForm + 1} · row pitch ${report.pitch} · pile of ${subject.beaten} on ${report.pileLines} line(s) · ${report.leaders} leaders`);

  try {
    assertEventFramesReadable(BarFrame, props, SIZE, label);
  } catch (error) {
    throw new Error(`${error.message} — shorten the words that frame draws (names in rows, title forms, source forms)`);
  }
  // Every text the pile's sum passes through was measured in Bun (the proof's frame.test.ts, for this data).
  for (let frame = 0; frame < props.timing.total; frame += 1) {
    const scene = sceneAt(props, frame);
    const text = copy.unit(valueText(scene.sum, format));
    if (scene.landed > 0 && !(text in props.countWidths)) throw new Error(`the pile's sum shows ${JSON.stringify(text)} at frame ${frame}, a text build.mjs did not measure (a kit bug, not a beat.mjs one)`);
  }

  // The proof's --look list: the last frame of every event, frame 0, and the middle of each gesture.
  const T = props.timing;
  const lookFrames = [
    { name: "first", frame: 0 },
    { name: "end-establish", frame: T.establish.start + T.establish.duration - 1 },
    { name: "reference-world", frame: Math.round(T.reference.start + T.reference.duration * 0.7) },
    { name: "end-reference", frame: T.reference.start + T.reference.duration - 1 },
    { name: "reveal-dropping", frame: Math.round(T.reveal.start + T.reveal.duration * 0.35) },
    { name: "reveal-camera", frame: Math.round(T.reveal.start + T.reveal.duration * 0.85) },
    { name: "end-reveal", frame: T.reveal.start + T.reveal.duration - 1 },
    { name: "subject-stack", frame: Math.round(T.subject.start + T.subject.duration * 0.6) },
    { name: "end-subject", frame: T.subject.start + T.subject.duration - 1 },
    { name: "conclusion-tenth", frame: Math.round(T.conclusion.start + T.conclusion.duration * 0.35) },
    { name: "end-conclusion", frame: T.conclusion.start + T.conclusion.duration - 1 },
    { name: "final", frame: T.total - 1 },
  ];
  const { wantedOf } = await import((await import("#shared/design-base/skill-script.mjs")).skillScriptFrom(HERE, "chart-video", "scripts", "video-faces.mjs"));
  await renderBeatVideo({
    Frame: BarFrame,
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
