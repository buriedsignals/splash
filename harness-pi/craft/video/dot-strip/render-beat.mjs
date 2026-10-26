// The generic half of a dot-strip VIDEO beat, taken from proof/video-dot-strip-lowcarbon-spread/render-directions-video.mjs
// with everything about ITS subject removed. The choreography is the worked example's and is not the model's to change:
// two rails on one 0–100 scale, every mark's chip pinned on the first; floor first, a copy of each chip travels to its seat
// on the second, its leader drawn behind it; the others step back, the floor's and the ceiling's rises written beside
// their leaders; the first span traces from the floor to the ceiling, a copy slides down onto the second rail pinned to the
// ceiling, keeping its length, and the part past the floor's new pin turns, the closure written over it; then it folds
// away and the whole chart stands, the credit on one line. The timing contract and the shots are the proof's
// (timing-contract.ts, states.mjs, scene.mjs); the layout is the proof's build.mjs. ./beat.mjs — the one file the model
// writes — gives the data and the WORDS.
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
const COMPOSITION_BASE = "zone-video-dot-strip"; // Root.tsx registers `${COMPOSITION_BASE}-${size}`

/** An argument as a refusal prints it: four significant digits, no float noise. */
const argText = (args) => args.map((a) => (typeof a === "number" ? String(+a.toPrecision(4)) : JSON.stringify(a))).join(", ");
/** A word function of beat.mjs, called the way the frame calls it: a throw or a non-string names the field. */
const formsOf = (field, fn) => (...args) => {
  let out;
  try {
    out = fn(...args);
  } catch (error) {
    throw new Error(`beat.mjs: ${field}(${argText(args)}) threw: ${error.message}`);
  }
  const list = [out].flat();
  if (!list.length || list.some((t) => typeof t !== "string" || !t.trim()))
    throw new Error(`beat.mjs: ${field}(${argText(args)}) must return a non-empty string or an array of them, got ${JSON.stringify(out)}`);
  return list.map(plain);
};

await refusing(HERE, async () => {
  const SIZE = videoExportSize();
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);

  const REQUIRED = ["eyebrow", "marks", "subject", "from", "to", "scope", "title", "source", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const fn of ["scope", "check"]) if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);
  for (const field of ["eyebrow", "subject", "from", "to"])
    if (typeof beat[field] !== "string" || !beat[field].trim()) throw new Error(`beat.mjs: ${field} must be a non-empty string (see CONTRACT.md)`);
  if (!Array.isArray(beat.marks)) throw new Error("beat.mjs: marks must be an array of { code, before, after }");
  assertNumbers(beat.marks.flatMap((m) => [[`${m.code}.before`, m.before], [`${m.code}.after`, m.after]]));
  const codes = beat.marks.map((m) => String(m.code));
  if (new Set(codes).size !== codes.length) throw new Error("marks holds the same code twice: give each mark ONE pair of readings");
  // The claim first: a title the data no longer supports is the refusal to read, before any the gesture raises.
  beat.check();

  // The three figures are printed in the story's number format (the proof: one decimal, a French comma).
  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";
  const format = numberFormat({ lang, max: 100, decimals: beat.decimals ?? 1, decimal: beat.decimal });
  const fixed = (v) => {
    const [whole, part] = Math.abs(v).toFixed(format.decimals).split(".");
    return part ? `${whole}${format.decimal}${part}` : whole;
  };
  const round = (v) => Math.round(v * 10 ** format.decimals) / 10 ** format.decimals;
  const { subjectOf } = await import("./subject.mjs");
  const subject = subjectOf({ ...beat, marks: beat.marks.map((m) => ({ code: plain(m.code), before: m.before, after: m.after })), subject: plain(beat.subject) }, round);
  const values = subject.marks.flatMap((m) => [m.before, m.after]);
  assertLegibleLabels([subject.floorRise, subject.ceilRise, subject.closed], fixed);
  assertDrawsClaimColumn(values, HERE);
  // The title may state the two rises or the closure — the figures the video writes.
  assertHeadlineNumbersDrawn([beat.title].flat()[0], [subject.floorRise, subject.ceilRise, subject.closed, ...values], "marks");

  // ── the words, in the shape the proof's build.mjs reads (`copyOf` there)
  const source = [beat.source].flat().map(plain);
  const scope = formsOf("scope", beat.scope);
  const copy = {
    eyebrow: plain(beat.eyebrow),
    title: [beat.title].flat().map(plain),
    years: [plain(beat.from), plain(beat.to)],
    tick: (t) => (t === 100 ? `100${NB}%` : String(t)),
    rise: (v) => `${v < 0 ? "−" : "+"}${fixed(v)}`,
    closed: (v) => `−${fixed(v)}`,
    source,
    // THE CREDIT'S FORMS, AND WHAT THE PLATE SAYS WHEN THE FIELD HAS BEEN THINNED (the proof's `credit`): with the whole
    // field the source forms alone; thinned, beat.mjs's `scope` sentence before each source form, longest first.
    credit: (count, total) => {
      if (count >= total) return source;
      return scope(count, total)
        .flatMap((s) => source.map((f) => `${s} · ${f}`))
        .sort((a, b) => b.length - a.length);
    },
  };
  if (!copy.title.length || copy.title.some((t) => !t.trim())) throw new Error("title must hold at least one non-empty form (the takeaway first)");
  if (!source.length || source.some((t) => !t.trim())) throw new Error("source must hold at least one non-empty form");
  // Every count the ladder may thin to is worded before anything is drawn, so a scope() that breaks says so by name.
  for (let count = subject.marks.length - 1; count >= 8; count--) copy.credit(count, subject.marks.length);

  const { buildDirection, loadBeat, textPerRegisterOf } = await import("./build.mjs");
  const { DotStripFrame } = await import("./DotStripFrame.tsx");
  const { label, chosen } = pickDirection(HERE, textPerRegisterOf(copy, subject), beat.evidenceLevels ?? 2);
  let built;
  try {
    built = buildDirection(label, chosen, loadBeat(subject, copy));
  } catch (error) {
    const layout = /no rung of the field ladder|finds no|runs into|corridor/.test(error.message);
    throw new Error(layout ? `${error.message} — shorten the codes, from / to, scope()'s words, or add a shorter source form` : error.message);
  }
  const { props, report, direction } = built;
  console.log(`direction ${label}`);
  for (const d of direction.decisions ?? []) console.log(`  ${d.register.padEnd(8)} ${d.role.padEnd(15)} -> ${d.family}`);
  console.log(`  title form ${report.titleForm + 1} · source form ${report.sourceForm + 1} · chip rows ${report.rows} · corridor ${report.corridor}px · ${report.drawn} of ${report.field} marks${report.labelUpper ? "" : " · upper scale unlabelled"}`);

  try {
    assertEventFramesReadable(DotStripFrame, props, SIZE, label);
  } catch (error) {
    throw new Error(`${error.message} — shorten the words that frame draws (codes, title forms, source forms)`);
  }

  const { WINDOWS } = await import("./scene.mjs");
  const T = props.timing;
  const mid = (event, [a, b]) => Math.round(T[event].start + (T[event].duration * (a + b)) / 2);
  const lookFrames = [
    { name: "first", frame: 0 },
    { name: "reveal-travel", frame: Math.round(T.reveal.start + T.reveal.duration * 0.5) },
    { name: "subject-span", frame: mid("subject", WINDOWS.subject.span) },
    { name: "subject-drop", frame: mid("subject", WINDOWS.subject.drop) },
    { name: "conclusion-settle", frame: mid("conclusion", WINDOWS.conclusion.settle) },
    ...EVENT_ORDER.map((event) => ({ name: event === "hold" ? "final" : `end-${event}`, frame: Math.min(endOf(T[event]), T.total) - 1 })),
  ].sort((a, b) => a.frame - b.frame);
  const { wantedOf } = await import(skillScriptFrom(HERE, "chart-video", "scripts", "video-faces.mjs"));
  await renderBeatVideo({
    Frame: DotStripFrame,
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
