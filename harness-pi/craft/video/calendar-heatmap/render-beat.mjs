// The generic half of a calendar-heatmap VIDEO beat, taken from proof/video-calendar-heatmap-geneva/
// render-directions-video.mjs with everything about ITS subject removed. The choreography is the worked example's and is
// not the model's to change: the title card; the year drawn as its daily values over a dashed threshold line, linear in
// days, the days at or over it in the accent and counted; every day falling from the curve into its calendar cell, one
// after another, taking its bin's colour, the months, day ticks and key coming in; the days under the threshold stepping
// back while an outline runs along the longest run at or above it, a day at a time, its length counting; the colours
// back, the run still outlined, and the credit. The timing contract and the shots are the proof's (timing-contract.ts,
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
const COMPOSITION_BASE = "zone-video-calendar-heatmap"; // Root.tsx registers `${COMPOSITION_BASE}-${size}`

/** A value's text in the story's number format `{ decimals, small, below, decimal, group }`. */
const valueText = (v, f) => {
  const [whole, part] = Math.abs(v).toFixed(Math.abs(v) >= f.below ? f.decimals : f.small).split(".");
  const grouped = f.group ? whole.replace(/\B(?=(\d{3})+(?!\d))/g, f.group) : whole;
  return `${v < 0 ? "-" : ""}${part ? `${grouped}${f.decimal}${part}` : grouped}`;
};
// Years are checked against the gesture below; the shared headline guard reads only years from 1900 as years.
const withoutYears = (text) => String(text).replace(/(?<!\d)(1[89]\d\d|20\d\d|2100)(?!\d)/g, "");
const yearsIn = (text) => [...String(text).matchAll(/(?<!\d)(1[89]\d\d|20\d\d|2100)(?!\d)/g)].map((m) => Number(m[1]));
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

  const REQUIRED = ["eyebrow", "days", "threshold", "months", "unit", "warm", "run", "title", "source", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  if (typeof beat.check !== "function") throw new Error("beat.mjs: check must be a function (see CONTRACT.md)");
  for (const field of ["eyebrow", "unit"]) if (typeof beat[field] !== "string") throw new Error(`beat.mjs: ${field} must be a string (see CONTRACT.md)`);
  for (const field of ["warm", "run"]) if (typeof beat[field] !== "function") throw new Error(`beat.mjs: ${field} must be a function (n) => words (see CONTRACT.md)`);
  if (!(Array.isArray(beat.months) && beat.months.length === 12 && beat.months.every((m) => typeof m === "string" && m.trim())))
    throw new Error("beat.mjs: months must be the twelve month names, in the story's language");
  if (!Array.isArray(beat.days)) throw new Error('beat.mjs: days must be an array of { date: "YYYY-MM-DD", value }');

  // ── the year, the bins and the run behind the headline (./subject.mjs: the proof's derivation, its asserts as refusals)
  assertNumbers(beat.days.map((d) => [d.date, d.value]));
  // The claim first: a title the data no longer supports is the refusal to read, before any the gesture raises.
  beat.check();
  const { subjectOf } = await import("./subject.mjs");
  const subject = subjectOf(beat);
  const values = subject.days.map((d) => d.value);
  assertDrawsClaimColumn(values, HERE);
  // The title states the run's length and the threshold, the counts the video draws (and the warm days).
  assertHeadlineNumbersDrawn(withoutYears([beat.title].flat()[0]), [...values, subject.streak.length, subject.warm, subject.threshold], "days");
  const foreign = yearsIn([beat.title].flat()[0]).filter((y) => y !== subject.year);
  if (foreign.length) throw new Error(`the title names ${foreign.join(", ")}, but the calendar is ${subject.year}: filter data.json to the year the title names`);

  // ── the words, in the shape the proof's build.mjs reads (`copyOf` there)
  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";
  const decimals = beat.breakDecimals ?? 0;
  const format = { ...numberFormat({ lang, max: 100, decimal: beat.decimal }), decimals, small: decimals, below: 0 };
  const unitWord = plain(beat.unit).trim();
  const withUnit = (text) => (unitWord ? `${text}${NB}${unitWord}` : text);
  const copy = {
    eyebrow: plain(beat.eyebrow),
    title: [beat.title].flat().map(plain),
    warm: (n) => wordOf("warm", beat.warm, n),
    run: (n) => wordOf("run", beat.run, n),
    threshold: withUnit(valueText(subject.threshold, { ...format, decimals: Number.isInteger(subject.threshold) ? 0 : 1, small: 1 })),
    breaks: subject.breaks.map((b, i) => (i === subject.breaks.length - 1 ? withUnit(valueText(b, format)) : valueText(b, format))),
    months: beat.months.map(plain),
    counts: { warm: subject.warm, run: subject.streak.length },
    source: [beat.source].flat().map(plain),
  };
  // Every count the two counters pass through, asked once now.
  for (let n = 0; n <= subject.warm; n++) copy.warm(n);
  for (let n = 0; n <= subject.streak.length; n++) copy.run(n);
  if (!copy.title.length || copy.title.some((t) => !t.trim())) throw new Error("title must hold at least one non-empty form (the takeaway first)");
  if (!copy.source.length || copy.source.some((t) => !t.trim())) throw new Error("source must hold at least one non-empty form");

  const { buildDirection, loadBeat, textPerRegisterOf } = await import("./build.mjs");
  const { CalendarFrame } = await import("./CalendarFrame.tsx");
  const { sceneAt } = await import("./scene.mjs");
  const { label, chosen } = pickDirection(HERE, textPerRegisterOf(copy, subject), beat.evidenceLevels ?? 2);
  let built;
  try {
    built = buildDirection(label, chosen, loadBeat(subject, copy));
  } catch (error) {
    const layout = /do not fit|neither band|too short|no credit|floor/.test(error.message);
    throw new Error(layout ? `${error.message} — shorten warm, run, the month names or the source forms` : error.message);
  }
  const { props, report, direction } = built;
  console.log(`direction ${label}`);
  for (const d of direction.decisions ?? []) console.log(`  ${d.register.padEnd(8)} ${d.role.padEnd(15)} -> ${d.family}`);
  console.log(`  title form ${report.titleForm + 1} · source form ${report.sourceForm + 1} · band ${report.band} · cell ${report.cell} · run ${subject.streak.length} (${subject.streak.from.date} – ${subject.streak.to.date}) · ${subject.warm} warm days`);

  try {
    assertEventFramesReadable(CalendarFrame, props, SIZE, label);
  } catch (error) {
    throw new Error(`${error.message} — shorten the words that frame draws (warm, run, months, source forms)`);
  }
  // Every count the frames can show was measured in Bun (the proof's frame.test.ts, for this data).
  for (let frame = 0; frame < props.timing.total; frame += 1) {
    const scene = sceneAt(props, frame);
    if (scene.counting && !props.counters.texts.warm[String(scene.warm)]) throw new Error(`the warm count shows ${scene.warm} at frame ${frame}, a text build.mjs did not measure (a kit bug, not a beat.mjs one)`);
    if (scene.running > 0 && !props.counters.texts.run[String(scene.run)]) throw new Error(`the run's count shows ${scene.run} at frame ${frame}, a text build.mjs did not measure (a kit bug, not a beat.mjs one)`);
  }

  // The proof's --look list: the last frame of every event, frame 0, the curve, the drop and the trace.
  const T = props.timing;
  const { EVENT_ORDER, endOf } = await import("#shared/chart-video/timing.ts");
  const lookFrames = [
    { name: "first", frame: 0 },
    ...EVENT_ORDER.filter((e) => e !== "hold").map((event) => ({ name: `end-${event}`, frame: endOf(T[event]) - 1 })),
    { name: "reference-curve", frame: Math.round(T.reference.start + T.reference.duration * 0.6) },
    { name: "reveal-drop", frame: Math.round(T.reveal.start + T.reveal.duration * 0.45) },
    { name: "subject-tracing", frame: Math.round(T.subject.start + T.subject.duration * 0.55) },
    { name: "final", frame: T.total - 1 },
  ];
  const { wantedOf } = await import((await import("#shared/design-base/skill-script.mjs")).skillScriptFrom(HERE, "chart-video", "scripts", "video-faces.mjs"));
  await renderBeatVideo({
    Frame: CalendarFrame,
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
