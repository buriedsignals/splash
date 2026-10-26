// The generic half of a beeswarm VIDEO beat, taken from proof/video-beeswarm-co2-per-person/render-directions-video.mjs
// with everything about ITS subject removed. The choreography is the worked example's and is not the model's to change:
// the title card; the axis, the weighted mean as a rule and ONE disc — every mark's size together — sitting on it; the
// disc bursting into its marks, largest first, each flying to its value and keeping its area while the count climbs;
// the tail beyond the threshold ringed and bracketed; the whole disc back as an outline in the empty top right and a copy
// of each tail member flying into it and merging — the tail's share of the whole; the copies flying back, the share
// travelling under the bracket, and the credit. The timing contract and the shots are the proof's (timing-contract.ts,
// states.mjs, scene.mjs); the layout is the proof's build.mjs. ./beat.mjs — the one file the model writes — gives the
// data and the WORDS.
//
// Usage:  bun <beat>/render-beat.mjs [--size landscape|square|portrait] [--look-only]
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { videoExportSize } from "#shared/chart-video/sizes.mjs";
import { applyStoryboard, assertNumbers, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { assertEventFramesReadable, numberFormat, pickDirection, plain, refusing, renderBeatVideo, storyLanguage } from "./video.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const NB = "\u00A0";
const COMPOSITION_BASE = "zone-video-beeswarm"; // Root.tsx registers `${COMPOSITION_BASE}-${size}`

/** A value's text in the story's number format `{ decimals, small, below, decimal, group }`. */
const valueText = (v, f) => {
  const [whole, part] = Math.abs(v).toFixed(Math.abs(v) >= f.below ? f.decimals : f.small).split(".");
  const grouped = f.group ? whole.replace(/\B(?=(\d{3})+(?!\d))/g, f.group) : whole;
  return `${v < 0 ? "-" : ""}${part ? `${grouped}${f.decimal}${part}` : grouped}`;
};
// Years are checked against the gesture below; the shared headline guard reads only years from 1900 as years.
const withoutYears = (text) => String(text).replace(/(?<!\d)(1[89]\d\d|20\d\d|2100)(?!\d)/g, "");
/** A word function's answer, or a refusal naming the field. */
const wordOf = (field, fn, arg) => {
  let text;
  try {
    text = fn(arg);
  } catch (error) {
    throw new Error(`beat.mjs: ${field}(${JSON.stringify(arg)}) threw « ${error.message} » — it must return a string (see CONTRACT.md)`);
  }
  if (typeof text !== "string" || !text.trim()) throw new Error(`beat.mjs: ${field}(${JSON.stringify(arg)}) returned ${JSON.stringify(text)} — it must return a non-empty string (see CONTRACT.md)`);
  return plain(text);
};

await refusing(HERE, async () => {
  const SIZE = videoExportSize();
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);

  const REQUIRED = ["eyebrow", "marks", "threshold", "wholeName", "markerLabel", "unit", "counted", "tailLabel", "title", "source", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  if (typeof beat.check !== "function") throw new Error("beat.mjs: check must be a function (see CONTRACT.md)");
  for (const field of ["eyebrow", "wholeName"]) if (typeof beat[field] !== "string") throw new Error(`beat.mjs: ${field} must be a string (see CONTRACT.md)`);
  for (const field of ["markerLabel", "counted", "tailLabel"])
    if (typeof beat[field] !== "function") throw new Error(`beat.mjs: ${field} must be a function returning words (see CONTRACT.md)`);
  const unitForms = [beat.unit].flat();
  if (!unitForms.length || unitForms.some((f) => typeof f !== "function")) throw new Error("beat.mjs: unit must be a function (t) => words, or up to three of them, longest first (see CONTRACT.md)");
  if (!Array.isArray(beat.marks)) throw new Error("beat.mjs: marks must be an array of { name, value, size }");

  // ── the swarm, and the tail behind the headline (./subject.mjs: the proof's derivation, its asserts as refusals)
  assertNumbers(beat.marks.map((m) => [m.name, m.value]));
  assertNumbers(beat.marks.map((m) => [m.name, m.size]), "sizes");
  // The claim first: a title the data no longer supports is the refusal to read, before any the gesture raises.
  beat.check();
  const { subjectOf } = await import("./subject.mjs");
  const subject = subjectOf(beat);
  const values = subject.countries.map((c) => c.tonnes);

  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";
  const format = numberFormat({ lang, max: Math.max(...values), decimals: beat.decimals, decimal: beat.decimal });
  const oneDecimal = { ...format, decimals: 1, small: 1, below: 0 };
  const shareFormat = subject.share >= 0.1 ? oneDecimal : { ...oneDecimal, decimals: 2, small: 2 };
  // No mark carries a value label (position is the value), so the legible-labels guard has nothing to hold; only the
  // mean and the share are printed.
  assertDrawsClaimColumn(values, HERE);
  // The title states the tail's count, the threshold and the share — figures the gesture draws.
  assertHeadlineNumbersDrawn(withoutYears([beat.title].flat()[0]), [...values, subject.high.length, subject.threshold, subject.share, subject.mean], "marks");

  // ── the words, in the shape the proof's build.mjs reads (`copyOf` there)
  const intFormat = { ...format, decimals: 0, small: 0 };
  const tickText = (t) => valueText(t, Number.isInteger(t) ? intFormat : format);
  const copy = {
    eyebrow: plain(beat.eyebrow),
    title: [beat.title].flat().map(plain),
    world: plain(beat.wholeName),
    mean: wordOf("markerLabel", beat.markerLabel, valueText(subject.mean, oneDecimal)),
    tick: tickText,
    unit: unitForms.map((f, i) => (t) => wordOf(`unit${unitForms.length > 1 ? `[${i}]` : ""}`, f, tickText(t))),
    counted: (count) => wordOf("counted", beat.counted, count),
    high: wordOf("tailLabel", beat.tailLabel, subject.high.length),
    share: `${valueText(subject.share, shareFormat)}${NB}%`,
    source: [beat.source].flat().map((f) => plain(f).replace(" · ", `${NB}· `)),
  };
  // Every form is asked once now: a form the layout reaches only at another size must not fail there first.
  for (const form of copy.unit) form(subject.ticks[0]);
  copy.counted(0);
  if (!copy.title.length || copy.title.some((t) => !t.trim())) throw new Error("title must hold at least one non-empty form (the takeaway first)");
  if (!copy.source.length || copy.source.some((t) => !t.trim())) throw new Error("source must hold at least one non-empty form");

  const { buildDirection, loadBeat, textPerRegisterOf } = await import("./build.mjs");
  const { BeeswarmFrame } = await import("./BeeswarmFrame.tsx");
  const { sceneAt, WINDOWS } = await import("./scene.mjs");
  const { label, chosen } = pickDirection(HERE, textPerRegisterOf(copy, subject), beat.evidenceLevels ?? 4);
  let built;
  try {
    built = buildDirection(label, chosen, loadBeat(subject, copy));
  } catch (error) {
    const layout = /run past|runs into|does not fit|no unit form|no filed radius|no credit|floor/.test(error.message);
    throw new Error(layout ? `${error.message} — shorten the callouts' labels, wholeName, markerLabel, counted or tailLabel, add a shorter unit form, or shorten the source forms` : error.message);
  }
  const { props, report, direction } = built;
  console.log(`direction ${label}`);
  for (const d of direction.decisions ?? []) console.log(`  ${d.register.padEnd(8)} ${d.role.padEnd(15)} -> ${d.family}`);
  console.log(`  title form ${report.titleForm + 1} · source form ${report.sourceForm + 1} · radius ${report.maxRadius} · names ${report.naming} · unit « ${report.unit} » · tail ${subject.high.length} = ${copy.share}`);

  try {
    assertEventFramesReadable(BeeswarmFrame, props, SIZE, label);
  } catch (error) {
    throw new Error(`${error.message} — shorten the words that frame draws (title forms, labels, source forms)`);
  }
  // Every count the frames can show was measured in Bun (the proof's frame.test.ts, for this data).
  for (let frame = 0; frame < props.timing.total; frame += 1) {
    const scene = sceneAt(props, frame);
    if (scene.counter > 0 && !props.counter[String(scene.counted)]) throw new Error(`the count shows ${scene.counted} at frame ${frame}, a text build.mjs did not measure (a kit bug, not a beat.mjs one)`);
  }

  // The proof's --look list: the last frame of every event, frame 0, and each gesture's middle.
  const T = props.timing;
  const { EVENT_ORDER, endOf } = await import("#shared/chart-video/timing.ts");
  const mid = (event, [a, b]) => Math.round(T[event].start + (T[event].duration * (a + b)) / 2);
  const lookFrames = [
    { name: "first", frame: 0 },
    ...EVENT_ORDER.filter((e) => e !== "hold").map((event) => ({ name: `end-${event}`, frame: endOf(T[event]) - 1 })),
    { name: "reveal-split", frame: mid("reveal", WINDOWS.reveal.split) },
    { name: "subject-ghost", frame: mid("subject", WINDOWS.subject.ghost) },
    { name: "subject-gather", frame: mid("subject", WINDOWS.subject.gather) },
    { name: "conclusion-settle", frame: mid("conclusion", WINDOWS.conclusion.settle) },
    { name: "final", frame: T.total - 1 },
  ];
  const { wantedOf } = await import((await import("#shared/design-base/skill-script.mjs")).skillScriptFrom(HERE, "chart-video", "scripts", "video-faces.mjs"));
  await renderBeatVideo({
    Frame: BeeswarmFrame,
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
