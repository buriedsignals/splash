// The generic half of a lollipop VIDEO beat, taken from proof/video-lollipop-co2-per-person/render-directions-video.mjs
// with everything about ITS subject removed. The choreography is the worked example's and is not the model's to change:
// the title card; every pair's first-state stem rising, counting; the others stepping back while copies of the
// subject's stem stack end to end beside the OTHER's stem up to its head (« ×7,5 »); every stem travelling to the second
// state, a tint left behind, the copies growing and fewer fitting (« ×1,7 »); then the whole chart, the subject's head
// ringed, the credit. The timing contract and the shots are the proof's (timing-contract.ts, states.mjs, scene.mjs); the
// layout is the proof's build.mjs. ./beat.mjs — the one file the model writes — gives the data and the WORDS.
//
// Usage:  bun <beat>/render-beat.mjs [--size landscape|square|portrait] [--look-only]
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { videoExportSize } from "#shared/chart-video/sizes.mjs";
import { applyStoryboard, assertNumbers, assertLegibleLabels, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { assertEventFramesReadable, numberFormat, pickDirection, plain, refusing, renderBeatVideo, storyLanguage } from "./video.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const COMPOSITION_BASE = "zone-video-lollipop"; // Root.tsx registers `${COMPOSITION_BASE}-${size}`

await refusing(HERE, async () => {
  const SIZE = videoExportSize();
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);

  const REQUIRED = ["eyebrow", "pairs", "subject", "other", "from", "to", "unit", "title", "source", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  if (typeof beat.check !== "function") throw new Error("beat.mjs: check must be a function (see CONTRACT.md)");
  for (const field of ["eyebrow", "unit"]) if (typeof beat[field] !== "string") throw new Error(`beat.mjs: ${field} must be a string (see CONTRACT.md)`);
  if (!Array.isArray(beat.pairs)) throw new Error("beat.mjs: pairs must be an array of { key, name, before, after }");
  if (String(beat.from) === String(beat.to)) throw new Error(`from and to are both ${beat.from}: the two states must differ`);

  assertNumbers(beat.pairs.flatMap((p) => [[`${p.key} before`, p.before], [`${p.key} after`, p.after]]), "pairs");
  // The claim first: a title the data no longer supports is the refusal to read, before any the gesture raises.
  beat.check();
  const { subjectOf } = await import("./subject.mjs");
  const subject = subjectOf({ ...beat, pairs: beat.pairs.map((p) => ({ ...p, name: plain(p.name) })) });
  const values = subject.pairs.flatMap((p) => [p.before, p.after]);

  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";
  const max = Math.max(...values);
  // The worked example prints every head with one decimal; a story counted past 100 prints whole numbers.
  const format = numberFormat({ lang, max, decimals: beat.decimals ?? (max < 100 ? 1 : 0), decimal: beat.decimal });
  const { valueText, ratioText } = await import("./scene.mjs");
  assertLegibleLabels(values, (v) => valueText(v, format));
  assertDrawsClaimColumn(values, HERE);
  // A paired video's headline speaks in levels, in growth (after / before) or in the ratio the stack draws.
  const ratios = subject.pairs.flatMap((p) => [p.after / p.before, subject.ratio.before, subject.ratio.after]).filter(Number.isFinite);
  assertHeadlineNumbersDrawn([beat.title].flat()[0], [...values, ...ratios], "heads");

  // ── the words, in the shape the proof's build.mjs reads (`copyOf` there)
  const copy = {
    eyebrow: plain(beat.eyebrow),
    title: [beat.title].flat().map(plain),
    unit: plain(beat.unit),
    ratio: (text) => `×${text}`,
    dates: [plain(beat.from), plain(beat.to)],
    source: [beat.source].flat().map(plain),
    format,
  };
  if (!copy.title.length || copy.title.some((t) => !t.trim())) throw new Error("title must hold at least one non-empty form (the takeaway first)");
  if (!copy.source.length || copy.source.some((t) => !t.trim())) throw new Error("source must hold at least one non-empty form");
  if (!copy.unit.trim()) throw new Error("unit is empty: the video says the measure and its unit once, above the stems");

  const { buildDirection, loadBeat, textPerRegisterOf } = await import("./build.mjs");
  const { LollipopFrame } = await import("./LollipopFrame.tsx");
  const { sceneAt } = await import("./scene.mjs");
  const { label, chosen } = pickDirection(HERE, textPerRegisterOf(copy, subject), beat.evidenceLevels ?? 4);
  let built;
  try {
    built = buildDirection(label, chosen, loadBeat(subject, copy));
  } catch (error) {
    // The proof's layout refusals name the frame, not the beat: say what in beat.mjs moves them.
    const layout = /does not fit|does not hold|no number of columns|no credit|floor/.test(error.message);
    throw new Error(layout ? `${error.message} — shorten the names in pairs, add a shorter source form, or draw fewer pairs` : error.message);
  }
  const { props, report, direction } = built;
  console.log(`direction ${label}`);
  for (const d of direction.decisions ?? []) console.log(`  ${d.register.padEnd(8)} ${d.role.padEnd(15)} -> ${d.family}`);
  console.log(`  title form ${report.titleForm + 1} · source form ${report.sourceForm + 1} · pair ${report.apart}px apart · ${report.columns} column(s) × ${report.rows} row(s) · ${props.copies} copies`);

  try {
    assertEventFramesReadable(LollipopFrame, props, SIZE, label);
  } catch (error) {
    throw new Error(`${error.message} — shorten the words that frame draws (names in pairs, unit, title forms, source forms)`);
  }
  // What the proof's frame.test.ts held per direction, now for this data: every value and ratio a frame shows was
  // measured in Bun, and at the end of the reveal and of the subject the stack stands exactly at the other's head.
  for (let frame = 0; frame < props.timing.total; frame += 1) {
    const scene = sceneAt(props, frame);
    for (const p of scene.pairs)
      for (const v of [p.present, p.past]) {
        const text = valueText(v, format);
        if (!(text in props.valueWidths)) throw new Error(`a head shows ${JSON.stringify(text)} at frame ${frame}, a text build.mjs did not measure (a kit bug, not a beat.mjs one)`);
      }
    if (scene.ratioShown > 0 && !(ratioText(scene.ratio, format) in props.ratioWidths)) throw new Error(`the stack shows ×${ratioText(scene.ratio, format)} at frame ${frame}, a text build.mjs did not measure (a kit bug)`);
  }
  const T = props.timing;
  const at = (code) => props.pairs.findIndex((p) => p.code === code);
  for (const [event, value] of [["reveal", "before"], ["subject", "after"]]) {
    const s = sceneAt(props, T[event].start + T[event].duration - 1);
    const cn = props.pairs[at(props.subject)][value];
    const us = props.pairs[at(props.other)][value];
    const top = Math.max(...s.copies.filter((c) => c.h > 0).map((c) => c.low + c.h));
    if (!(Math.abs(top - Math.min(us, props.copies * cn) * props.unit) < 1e-6) || !(s.ratioShown === 1) || ratioText(s.ratio, format) !== ratioText(us / cn, format))
      throw new Error(`at the end of ${event} the stack does not stand at ${props.other}'s head (a kit bug, not a beat.mjs one)`);
  }

  // The proof's --look list: the last frame of every event, frame 0, and the middle of each gesture.
  const lookFrames = [
    { name: "first", frame: 0 },
    { name: "end-establish", frame: T.establish.start + T.establish.duration - 1 },
    { name: "end-reference", frame: T.reference.start + T.reference.duration - 1 },
    { name: "reveal-stacking", frame: Math.round(T.reveal.start + T.reveal.duration * 0.55) },
    { name: "end-reveal", frame: T.reveal.start + T.reveal.duration - 1 },
    { name: "subject-travelling", frame: Math.round(T.subject.start + T.subject.duration * 0.45) },
    { name: "end-subject", frame: T.subject.start + T.subject.duration - 1 },
    { name: "end-conclusion", frame: T.conclusion.start + T.conclusion.duration - 1 },
    { name: "final", frame: T.total - 1 },
  ];
  const { wantedOf } = await import((await import("#shared/design-base/skill-script.mjs")).skillScriptFrom(HERE, "chart-video", "scripts", "video-faces.mjs"));
  await renderBeatVideo({
    Frame: LollipopFrame,
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
