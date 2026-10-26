// The generic half of a diverging-stacked-bar VIDEO beat, taken from
// proof/video-diverging-stacked-electricity/render-directions-video.mjs with everything about ITS subject removed. The
// choreography is the worked example's and is not the model's to change: every row's whole 100 % bar grows from one left
// edge, row after row; each bar slides, every length kept, until its centre level sits astride the anchor (the lean
// appears) and the two sides' totals land at its ends; the other rows step back, the subject's bar parts — its centre up,
// its two sides down — and the left side then the right slide end to end from the centre's left edge and stop short of
// its end, their sum printed there; then the bar closes, the others return, the subject's centre ringed, the credit.
// The timing contract and the shots are the proof's (timing-contract.ts, states.mjs, scene.mjs); the layout is the
// proof's build.mjs. ./beat.mjs — the one file the model writes — gives the data and the WORDS.
//
// Usage:  bun <beat>/render-beat.mjs [--size landscape|square|portrait] [--look-only]
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { videoExportSize } from "#shared/chart-video/sizes.mjs";
import { EVENT_ORDER, endOf } from "#shared/chart-video/timing.ts";
import { skillScriptFrom } from "#shared/design-base/skill-script.mjs";
import { applyStoryboard, assertNumbers, assertLegibleLabels, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { assertEventFramesReadable, pickDirection, plain, refusing, renderBeatVideo } from "./video.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const NB = " ";
const COMPOSITION_BASE = "zone-video-diverging-stacked-bar-likert"; // Root.tsx registers `${COMPOSITION_BASE}-${size}`

/** An argument as a refusal prints it: four significant digits, no float noise. */
const argText = (args) => args.map((a) => (typeof a === "number" ? String(+a.toPrecision(4)) : JSON.stringify(a))).join(", ");
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

  const REQUIRED = ["eyebrow", "rows", "subject", "leftName", "centreName", "rightName", "yearLabel", "unit", "format", "title", "source", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const fn of ["format", "check"]) if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);
  for (const field of ["eyebrow", "leftName", "centreName", "rightName", "yearLabel", "unit"])
    if (typeof beat[field] !== "string" || !beat[field].trim()) throw new Error(`beat.mjs: ${field} must be a non-empty string (see CONTRACT.md)`);
  if (!Array.isArray(beat.rows)) throw new Error("beat.mjs: rows must be an array of { key, label, left, centre, right }");
  for (const r of beat.rows)
    if (!(Array.isArray(r.left) && Array.isArray(r.right) && r.centre && typeof r.centre === "object"))
      throw new Error(`beat.mjs: row ${JSON.stringify(r.key)} needs left and right (arrays of { key, label, value }) and centre ({ key, label, value })`);
  assertNumbers(beat.rows.flatMap((r) => [...r.left, r.centre, ...r.right].map((l) => [`${r.key}.${l.key}`, l.value])));
  const keys = beat.rows.map((r) => String(r.key));
  if (new Set(keys).size !== keys.length) throw new Error("rows holds the same key twice: give each row ONE mix (filter data.json to one year)");
  // The claim first: a title the data no longer supports is the refusal to read, before any the gesture raises.
  beat.check();
  const { subjectOf } = await import("./subject.mjs");
  const subject = subjectOf({
    ...beat,
    rows: beat.rows.map((r) => ({ ...r, key: plain(r.key), label: plain(r.label), left: r.left.map((l) => ({ ...l, label: plain(l.label) })), right: r.right.map((l) => ({ ...l, label: plain(l.label) })) })),
    subject: plain(beat.subject),
  });

  const share = wordOf("format", beat.format);
  const totals = subject.rows.flatMap((r) => [r.fossil, r.centre, r.renewable]);
  assertLegibleLabels(totals, share);
  assertDrawsClaimColumn(subject.rows.flatMap((r) => [...r.left, ...r.right].map((l) => l.share).concat(r.centre)), HERE);
  const me = subject.rows.find((r) => r.key === subject.subject);
  // The title may state a total, the centre, or the sides' sum — all drawn.
  assertHeadlineNumbersDrawn([beat.title].flat()[0], [...totals, me.fossil + me.renewable], "bars");

  // ── the words, in the shape the proof's build.mjs reads (`copyOf` there)
  const copy = {
    eyebrow: plain(beat.eyebrow),
    title: [beat.title].flat().map(plain),
    year: plain(beat.yearLabel),
    hundred: `100${NB}${plain(beat.unit).trim()}`,
    sides: { left: plain(beat.leftName), centre: plain(beat.centreName), right: plain(beat.rightName) },
    source: [beat.source].flat().map(plain),
    share,
  };
  if (!copy.title.length || copy.title.some((t) => !t.trim())) throw new Error("title must hold at least one non-empty form (the takeaway first)");
  if (!copy.source.length || copy.source.some((t) => !t.trim())) throw new Error("source must hold at least one non-empty form");

  const { buildDirection, loadBeat, textPerRegisterOf } = await import("./build.mjs");
  const { DivergingStackFrame } = await import("./DivergingStackFrame.tsx");
  const { label, chosen } = pickDirection(HERE, textPerRegisterOf(copy, subject), beat.evidenceLevels ?? 2);
  let built;
  try {
    built = buildDirection(label, chosen, loadBeat(subject, copy));
  } catch (error) {
    const layout = /does not hold|runs into|runs outside|no arrangement|shorter than its words|run into the next/.test(error.message);
    throw new Error(layout ? `${error.message} — shorten the labels of rows, leftName / centreName / rightName or yearLabel, add a shorter source form, or draw fewer rows` : error.message);
  }
  const { props, report, direction } = built;
  console.log(`direction ${label}`);
  for (const d of direction.decisions ?? []) console.log(`  ${d.register.padEnd(8)} ${d.role.padEnd(15)} -> ${d.family}`);
  console.log(`  title form ${report.titleForm + 1} · source form ${report.sourceForm + 1} · row ${report.pitch}px · ${report.unit}px a point`);

  try {
    assertEventFramesReadable(DivergingStackFrame, props, SIZE, label);
  } catch (error) {
    throw new Error(`${error.message} — shorten the words that frame draws (labels of rows, side names, title forms, source forms)`);
  }

  const T = props.timing;
  const lookFrames = [
    { name: "first", frame: 0 },
    { name: "reference-growing", frame: Math.round(T.reference.start + T.reference.duration * 0.6) },
    { name: "reveal-sliding", frame: Math.round(T.reveal.start + T.reveal.duration * 0.5) },
    { name: "subject-parting", frame: Math.round(T.subject.start + T.subject.duration * 0.3) },
    { name: "subject-carrying", frame: Math.round(T.subject.start + T.subject.duration * 0.62) },
    ...EVENT_ORDER.map((event) => ({ name: event === "hold" ? "final" : `end-${event}`, frame: Math.min(endOf(T[event]), T.total) - 1 })),
  ].sort((a, b) => a.frame - b.frame);
  const { wantedOf } = await import(skillScriptFrom(HERE, "chart-video", "scripts", "video-faces.mjs"));
  await renderBeatVideo({
    Frame: DivergingStackFrame,
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
