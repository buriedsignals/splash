// The generic half of a sankey VIDEO beat, taken from proof/video-sankey-electricity-sources/render-directions-video.mjs
// with everything about ITS subject removed. The choreography is the worked example's and is not the model's to change:
// the title card; one bar growing down the left rail, its total counting; gaps cutting it into the sources, the ribbons
// pouring to the right rail source after source, each target's node filling as its ribbons land; every ribbon but the
// tracked source's stepping back, the tracked ribbon filling with the accent, a copy of the tracked source's bar
// travelling to the tracked target's node and landing beside it, its matching part level with the tracked band, the
// share (« 84 % ») beside it; then the copy home, the ribbons back, the share on the accent ribbon, the credit. The
// timing contract and the shots are the proof's (timing-contract.ts, states.mjs, scene.mjs); the layout is the proof's
// build.mjs. ./beat.mjs — the one file the model writes — gives the data and the WORDS.
//
// Usage:  bun <beat>/render-beat.mjs [--size landscape|square|portrait] [--look-only]
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { videoExportSize } from "#shared/chart-video/sizes.mjs";
import { applyStoryboard, assertNumbers, assertLegibleLabels, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { assertEventFramesReadable, pickDirection, plain, refusing, renderBeatVideo, storyLanguage } from "./video.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const NB = " ";
const COMPOSITION_BASE = "zone-video-sankey"; // Root.tsx registers `${COMPOSITION_BASE}-${size}`

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

  const REQUIRED = ["eyebrow", "sources", "targets", "flows", "tracked", "unit", "format", "title", "source", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const field of ["check", "format"]) if (typeof beat[field] !== "function") throw new Error(`beat.mjs: ${field} must be a function (see CONTRACT.md)`);
  for (const field of ["formatWhole", "percent"]) if (beat[field] !== undefined && typeof beat[field] !== "function") throw new Error(`beat.mjs: ${field} must be a function (see CONTRACT.md)`);
  for (const field of ["eyebrow", "unit"]) if (typeof beat[field] !== "string") throw new Error(`beat.mjs: ${field} must be a string (see CONTRACT.md)`);
  if (!Array.isArray(beat.flows)) throw new Error("beat.mjs: flows must be an array of { from, to, value } (see CONTRACT.md)");
  assertNumbers(beat.flows.map((f) => [`${f.from} → ${f.to}`, f.value]), "flows");

  const { subjectOf, assertGesture } = await import("./subject.mjs");
  const subject = subjectOf({
    ...beat,
    sources: beat.sources.map((s) => ({ ...s, label: plain(s.label) })),
    targets: beat.targets.map((t) => ({ ...t, label: plain(t.label) })),
  });
  // The claim first: a title the data no longer supports is the refusal to read, before any the gesture raises.
  beat.check();
  assertGesture(subject);

  const totals = [...subject.sources, ...subject.countries].map((n) => n.total);
  assertLegibleLabels(totals, (v) => wordOf("format", beat.format, v));
  assertDrawsClaimColumn(subject.flows.map((f) => f.value), HERE);
  assertHeadlineNumbersDrawn([beat.title].flat()[0], [...totals, subject.holderFlow.value, subject.grand, subject.share * 100], "nodes");

  // ── the words, in the shape the proof's build.mjs reads (`copyOf` there)
  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";
  const comma = /^(fr|de|es|it|pt|nl|pl|sv|da|fi|nb|no|ru|cs)\b/i.test(lang);
  const unitWord = plain(beat.unit).trim();
  const grouped = (v) => String(v).replace(/\B(?=(\d{3})+(?!\d))/g, comma ? NB : ",");
  const wholeNumber = beat.formatWhole ? (v) => wordOf("formatWhole", beat.formatWhole, v) : grouped;
  const NARROW = SIZE !== "landscape";
  const copy = {
    eyebrow: plain(beat.eyebrow),
    title: [beat.title].flat().map(plain),
    share: Math.round(subject.share * 100),
    format: (v) => wordOf("format", beat.format, v),
    whole: (v) => (unitWord ? `${wholeNumber(v)}${NB}${unitWord}` : wholeNumber(v)),
    percent: beat.percent ? (v) => wordOf("percent", beat.percent, v) : (v) => `${v}${comma ? NB : ""}%`,
    narrowRail: beat.narrowRail,
    source: [NARROW && beat.narrowSource ? beat.narrowSource : beat.source].flat().map(plain),
  };
  if (!copy.title.length || copy.title.some((t) => !t.trim())) throw new Error("title must hold at least one non-empty form (the takeaway first)");
  if (!copy.source.length || copy.source.some((t) => !t.trim())) throw new Error("source must hold at least one non-empty form");
  if (NARROW && (!Array.isArray(beat.narrowRail) || !beat.narrowSource))
    throw new Error(`a ${SIZE} frame cannot label every source: give narrowRail (the sources grouped, the tracked source's group FIRST) and narrowSource (the credit forms saying the sources are grouped)`);

  const { buildDirection, loadBeat, textPerRegisterOf } = await import("./build.mjs");
  const { SankeyFrame } = await import("./SankeyFrame.tsx");
  const { sceneAt, WINDOWS } = await import("./scene.mjs");
  const { label, chosen } = pickDirection(HERE, textPerRegisterOf(copy, subject), beat.evidenceLevels ?? 3);
  let built;
  try {
    built = buildDirection(label, chosen, loadBeat(subject, copy));
  } catch (error) {
    // The proof's layout refusals name the frame, not the beat: say what in beat.mjs moves them.
    const layout = /no place inside|label columns|wrong order|floor/.test(error.message);
    throw new Error(layout ? `${error.message} — shorten the node labels, format / percent, or the source forms, or draw fewer nodes (group the smallest into one, computed)` : error.message);
  }
  const { props, report, direction } = built;
  console.log(`direction ${label}`);
  for (const d of direction.decisions ?? []) console.log(`  ${d.register.padEnd(8)} ${d.role.padEnd(15)} -> ${d.family}`);
  console.log(`  title form ${report.titleForm + 1} · source form ${report.sourceForm + 1} · scale ${report.scale}px a unit · share ${report.share} %`);
  // The copy keeps the source bar's whole height where it lands; past the frame's foot the overhang is not seen.
  if (!(props.copy.to.y + props.copy.to.h <= props.frame.height))
    throw new Error(`the copy of ${subject.biggest.key}'s bar, laid against ${subject.holder.key}'s band, runs ${(props.copy.to.y + props.copy.to.h - props.frame.height).toFixed(0)}px past the frame's foot: move ${subject.biggest.key} higher in sources`);

  try {
    assertEventFramesReadable(SankeyFrame, props, SIZE, label);
  } catch (error) {
    throw new Error(`${error.message} — shorten the words that frame draws (node labels, title forms, source forms)`);
  }

  // What the proof's frame.test.ts held per direction, now for this data: every counter text was measured, and the copy
  // keeps the source bar's height and lands with its matching part level with the tracked band.
  const T = props.timing;
  const last = (event) => T[event].start + T[event].duration - 1;
  for (let f = 0; f < T.total; f += 1) {
    const s = sceneAt(props, f);
    const text = props.countTexts[String(s.whole.count)];
    if (!(text in props.counts)) throw new Error(`the whole's counter shows ${s.whole.count} at frame ${f}, a text build.mjs did not measure (a kit bug)`);
  }
  const nuclear = props.sources.find((s) => s.key === props.subjectKey);
  const tracked = props.flows.find((f) => f.tracked);
  const landed = sceneAt(props, last("subject")).copy;
  const ok =
    landed && Math.abs(landed.rect.h - nuclear.h) < 1e-6 && Math.abs(props.copy.to.y - tracked.by) < 1e-6 && Math.abs(props.copy.part / nuclear.h - subject.share) < 1e-9;
  if (!ok) throw new Error("the copy does not land level with the tracked band at its source's height (a kit bug)");

  // The proof's --look list: the last frame of every event, frame 0, and the middle of each gesture.
  const mid = (event, [a, b]) => Math.round(T[event].start + (T[event].duration * (a + b)) / 2);
  const lookFrames = [
    { name: "first", frame: 0 },
    { name: "end-establish", frame: last("establish") },
    { name: "reference-whole", frame: mid("reference", WINDOWS.reference.whole) },
    { name: "end-reference", frame: last("reference") },
    { name: "reveal-pour", frame: mid("reveal", WINDOWS.reveal.pour) },
    { name: "end-reveal", frame: last("reveal") },
    { name: "subject-trace", frame: mid("subject", WINDOWS.subject.trace) },
    { name: "subject-slide", frame: mid("subject", WINDOWS.subject.slide) },
    { name: "end-subject", frame: last("subject") },
    { name: "conclusion-back", frame: mid("conclusion", WINDOWS.conclusion.back) },
    { name: "end-conclusion", frame: last("conclusion") },
    { name: "final", frame: T.total - 1 },
  ];
  const { wantedOf } = await import((await import("#shared/design-base/skill-script.mjs")).skillScriptFrom(HERE, "chart-video", "scripts", "video-faces.mjs"));
  await renderBeatVideo({
    Frame: SankeyFrame,
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
