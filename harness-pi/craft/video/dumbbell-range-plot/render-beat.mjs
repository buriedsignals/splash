// The generic half of a dumbbell VIDEO beat, taken from proof/video-dumbbell-life-expectancy-gains/render-directions-video.mjs
// with everything about ITS subject removed. The choreography is the worked example's and is not the model's to change:
// the rows ranked by their first level, every first dot on one value scale; row by row each dot travels to the second
// reading, the gain drawn behind it, the rises counted; the rows glide into the order of their gains; one after another a
// copy of each gain slides onto one start line (the subject's first reading), keeping its length, its gain written as it
// lands; the subject's row is ringed; the copies slide back, the credit on one line. The timing contract and the shots are
// the proof's (timing-contract.ts, states.mjs, scene.mjs); the layout is the proof's build.mjs. ./beat.mjs — the one file
// the model writes — gives the data and the WORDS.
//
// Usage:  bun <beat>/render-beat.mjs [--size landscape|square|portrait] [--look-only]
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { videoExportSize } from "#shared/chart-video/sizes.mjs";
import { EVENT_ORDER, endOf } from "#shared/chart-video/timing.ts";
import { skillScriptFrom } from "#shared/design-base/skill-script.mjs";
import { applyStoryboard, assertNumbers, assertLegibleLabels, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { assertEventFramesReadable, numberFormat, pickDirection, plain, refusing, renderBeatVideo, storyLanguage } from "./video.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const NB = " ";
const COMPOSITION_BASE = "zone-video-dumbbell-range-plot"; // Root.tsx registers `${COMPOSITION_BASE}-${size}`

/** An argument as a refusal prints it: four significant digits, no float noise. */
const argText = (args) => args.map((a) => (typeof a === "number" ? String(+a.toPrecision(4)) : a && typeof a === "object" ? JSON.stringify(a.key ?? a) : JSON.stringify(a))).join(", ");
/** A word function of beat.mjs, called the way the frame calls it: a throw or a non-string names the field. */
const wordOf = (field, fn) => (...args) => {
  let out;
  try {
    out = fn(...args);
  } catch (error) {
    throw new Error(`beat.mjs: ${field}(${argText(args)}) threw: ${error.message}`);
  }
  if (typeof out !== "string" || !out.trim()) throw new Error(`beat.mjs: ${field}(${argText(args)}) must return a non-empty string, got ${JSON.stringify(out)}`);
  return plain(out);
};

await refusing(HERE, async () => {
  const SIZE = videoExportSize();
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);

  const REQUIRED = ["eyebrow", "rows", "subject", "fromName", "toName", "unit", "gainLabel", "count", "title", "source", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const fn of ["gainLabel", "count", "check"]) if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);
  for (const field of ["eyebrow", "subject", "fromName", "toName", "unit"])
    if (typeof beat[field] !== "string" || !beat[field].trim()) throw new Error(`beat.mjs: ${field} must be a non-empty string (see CONTRACT.md)`);
  if (!Array.isArray(beat.rows)) throw new Error("beat.mjs: rows must be an array of { key, label, from, to }");
  assertNumbers(beat.rows.flatMap((r) => [[`${r.key}.from`, r.from], [`${r.key}.to`, r.to]]));
  const keys = beat.rows.map((r) => String(r.key));
  if (new Set(keys).size !== keys.length) throw new Error("rows holds the same key twice: give each row ONE pair of readings");
  // The claim first: a title the data no longer supports is the refusal to read, before any the gesture raises.
  beat.check();
  const { subjectOf } = await import("./subject.mjs");
  const subject = subjectOf({ ...beat, rows: beat.rows.map((r) => ({ key: plain(r.key), label: plain(r.label), from: r.from, to: r.to })), subject: plain(beat.subject) });

  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";
  const format = numberFormat({ lang, max: 100, decimals: 0 });
  const gain = wordOf("gainLabel", beat.gainLabel);
  const count = wordOf("count", beat.count);
  const unit = plain(beat.unit).trim();
  // The readings must not be a rate under 0.1 (the guard's first test). Gains that tie at the printed precision are
  // honest rounding here — the worked example prints +3,3 three times — so the distinct-labels test runs on the readings.
  assertLegibleLabels(subject.rows.flatMap((r) => [r.from, r.to]), String);
  for (const r of subject.rows) gain(r);
  assertDrawsClaimColumn(subject.rows.flatMap((r) => [r.from, r.to]), HERE);
  // The title may state the gains or a reading — all drawn.
  assertHeadlineNumbersDrawn([beat.title].flat()[0], [...subject.rows.map((r) => r.gain), ...subject.rows.flatMap((r) => [r.from, r.to])], "dumbbells");

  // ── the words, in the shape the proof's build.mjs reads (`copyOf` there)
  const copy = {
    eyebrow: plain(beat.eyebrow),
    title: [beat.title].flat().map(plain),
    years: [plain(beat.fromName), plain(beat.toName)],
    gain: (r) => gain(r),
    tick: (t, last) => {
      const text = String(t).replace(".", format.decimal);
      return last && unit ? `${text}${NB}${unit}` : text;
    },
    rose: (n) => count(n),
    source: [beat.source].flat().map(plain),
  };
  if (!copy.title.length || copy.title.some((t) => !t.trim())) throw new Error("title must hold at least one non-empty form (the takeaway first)");
  if (!copy.source.length || copy.source.some((t) => !t.trim())) throw new Error("source must hold at least one non-empty form");

  const { buildDirection, loadBeat, textPerRegisterOf } = await import("./build.mjs");
  const { DumbbellFrame } = await import("./DumbbellFrame.tsx");
  const { label, chosen } = pickDirection(HERE, textPerRegisterOf(copy, subject), beat.evidenceLevels ?? 2);
  let built;
  try {
    built = buildDirection(label, chosen, loadBeat(subject, copy));
  } catch (error) {
    const layout = /rows want|runs off the frame|no thinning/.test(error.message);
    throw new Error(layout ? `${error.message} — shorten the labels of rows, count()'s words or fromName / toName, add a shorter source form, or draw fewer rows` : error.message);
  }
  const { props, report, direction } = built;
  console.log(`direction ${label}`);
  for (const d of direction.decisions ?? []) console.log(`  ${d.register.padEnd(8)} ${d.role.padEnd(15)} -> ${d.family}`);
  console.log(`  title form ${report.titleForm + 1} · source form ${report.sourceForm + 1} · row ${report.pitch}px · ticks ${report.ticks} · head ${report.head}`);

  try {
    assertEventFramesReadable(DumbbellFrame, props, SIZE, label);
  } catch (error) {
    throw new Error(`${error.message} — shorten the words that frame draws (labels of rows, title forms, source forms)`);
  }

  const { WINDOWS } = await import("./scene.mjs");
  const T = props.timing;
  const mid = (event, [a, b]) => Math.round(T[event].start + (T[event].duration * (a + b)) / 2);
  const lookFrames = [
    { name: "first", frame: 0 },
    { name: "reveal-travel", frame: Math.round(T.reveal.start + T.reveal.duration * 0.5) },
    { name: "subject-reorder", frame: mid("subject", WINDOWS.subject.reorder) },
    { name: "subject-detach", frame: mid("subject", WINDOWS.subject.detach) },
    { name: "conclusion-settle", frame: mid("conclusion", WINDOWS.conclusion.settle) },
    ...EVENT_ORDER.map((event) => ({ name: event === "hold" ? "final" : `end-${event}`, frame: Math.min(endOf(T[event]), T.total) - 1 })),
  ].sort((a, b) => a.frame - b.frame);
  const { wantedOf } = await import(skillScriptFrom(HERE, "chart-video", "scripts", "video-faces.mjs"));
  await renderBeatVideo({
    Frame: DumbbellFrame,
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
