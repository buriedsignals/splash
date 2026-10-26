// The generic half of a diverging-bar VIDEO beat, taken from
// proof/video-diverging-bar-eu-per-capita/render-directions-video.mjs with everything about ITS subject removed. The
// choreography is the worked example's and is not the model's to change: every row's first level grows from zero, row
// after row; every level goes to its second reading, the largest fall first, the part lost left pale and the falls
// counted; the level bars go and every part lost slides across the zero line, becoming the change; the camera closes onto
// the zero line until the one rise becomes a length; then it pulls back to the whole chart, the rise ringed, the credit.
// The timing contract and the shots are the proof's (timing-contract.ts, states.mjs, scene.mjs); the layout is the
// proof's build.mjs. ./beat.mjs — the one file the model writes — gives the data and the WORDS.
//
// Usage:  bun <beat>/render-beat.mjs [--size landscape|square|portrait] [--look-only]
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { videoExportSize } from "#shared/chart-video/sizes.mjs";
import { skillScriptFrom } from "#shared/design-base/skill-script.mjs";
import { applyStoryboard, assertNumbers, assertLegibleLabels, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { assertEventFramesReadable, numberFormat, pickDirection, plain, refusing, renderBeatVideo, storyLanguage } from "./video.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const COMPOSITION_BASE = "zone-video-diverging-bar"; // Root.tsx registers `${COMPOSITION_BASE}-${size}`

/** An argument as a refusal prints it: four significant digits, no float noise. */
const argText = (args) => args.map((a) => (typeof a === "number" ? String(+a.toPrecision(4)) : JSON.stringify(a))).join(", ");
/** A word function of beat.mjs, called the way the frame calls it: a throw or a non-string names the field. */
const wordOf = (field, fn, { forms = false } = {}) => (...args) => {
  let out;
  try {
    out = fn(...args);
  } catch (error) {
    throw new Error(`beat.mjs: ${field}(${argText(args)}) threw: ${error.message}`);
  }
  const list = forms ? [out].flat() : [out];
  if (!list.length || list.some((t) => typeof t !== "string" || !t.trim()))
    throw new Error(`beat.mjs: ${field}(${argText(args)}) must return ${forms ? "a non-empty string or an array of them" : "a non-empty string"}, got ${JSON.stringify(out)}`);
  return forms ? list.map(plain) : plain(out);
};

await refusing(HERE, async () => {
  const SIZE = videoExportSize();
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);

  const REQUIRED = ["eyebrow", "rows", "subject", "fromLabel", "unit", "count", "scope", "title", "source", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const fn of ["count", "scope", "check"]) if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);
  for (const field of ["eyebrow", "subject", "fromLabel", "unit"])
    if (typeof beat[field] !== "string" || !beat[field].trim()) throw new Error(`beat.mjs: ${field} must be a non-empty string (see CONTRACT.md)`);
  if (!Array.isArray(beat.rows)) throw new Error("beat.mjs: rows must be an array of { name, from, to }");

  assertNumbers(beat.rows.flatMap((r) => [[`${r.name}.from`, r.from], [`${r.name}.to`, r.to]]));
  const names = beat.rows.map((r) => String(r.name));
  if (new Set(names).size !== names.length) throw new Error("rows holds the same name twice: give each row ONE pair of readings (filter data.json to one series)");
  // The claim first: a title the data no longer supports is the refusal to read, before any the gesture raises.
  beat.check();
  const { subjectOf } = await import("./subject.mjs");
  const subject = subjectOf({ ...beat, rows: beat.rows.map((r) => ({ name: plain(r.name), from: r.from, to: r.to })), subject: plain(beat.subject) });
  const changes = subject.rows.map((r) => r.change);

  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";
  const format = numberFormat({ lang, max: Math.max(...changes.map(Math.abs)), decimals: beat.decimals ?? 2, decimal: beat.decimal });
  const { changeText, sceneAt } = await import("./scene.mjs");
  assertLegibleLabels(changes, (v) => changeText(v, format));
  assertDrawsClaimColumn(subject.rows.flatMap((r) => [r.from, r.to]), HERE);
  // The title may state the count of falls, a change or a reading — all drawn (the counter, the changes, the levels).
  assertHeadlineNumbersDrawn([beat.title].flat()[0], [...changes.map(Math.abs), ...subject.rows.flatMap((r) => [r.from, r.to]), subject.falls], "bars");

  // ── the words, in the shape the proof's build.mjs reads (`copyOf` there)
  const count = wordOf("count", beat.count);
  const scope = wordOf("scope", beat.scope, { forms: true });
  const copy = {
    eyebrow: plain(beat.eyebrow),
    title: [beat.title].flat().map(plain),
    year: plain(beat.fromLabel),
    count: (n, of = null) => (of === null ? count(n) : count(n, of)),
    scope,
    unit: plain(beat.unit),
    zoom: (by) => `×${by}`,
    source: [beat.source].flat().map(plain),
    format,
  };
  if (!copy.title.length || copy.title.some((t) => !t.trim())) throw new Error("title must hold at least one non-empty form (the takeaway first)");
  if (!copy.source.length || copy.source.some((t) => !t.trim())) throw new Error("source must hold at least one non-empty form");

  const { buildDirection, loadBeat, textPerRegisterOf } = await import("./build.mjs");
  const { DivergingBarFrame } = await import("./DivergingBarFrame.tsx");
  const { label, chosen } = pickDirection(HERE, textPerRegisterOf(copy, subject), beat.evidenceLevels ?? 2);
  let built;
  try {
    built = buildDirection(label, chosen, loadBeat(subject, copy));
  } catch (error) {
    // The proof's layout refusals name the frame, not the beat: say what in beat.mjs moves them.
    const layout = /no count of rows|no form of R8|the band leaves|the unit is|a line of this frame/.test(error.message);
    throw new Error(layout ? `${error.message} — shorten the names in rows, the unit, count()'s or scope()'s words, or add a shorter source form` : error.message);
  }
  const { props, report, direction } = built;
  console.log(`direction ${label}`);
  for (const d of direction.decisions ?? []) console.log(`  ${d.register.padEnd(8)} ${d.role.padEnd(15)} -> ${d.family}`);
  console.log(`  title form ${report.titleForm + 1} · source form ${report.sourceForm + 1} · row ${report.pitch}px · zoom ×${report.zoomBy}${report.reduced ? ` · ${report.drawn} of ${report.members} rows drawn, said in scope form ${report.scopeForm + 1}` : ""}`);

  try {
    assertEventFramesReadable(DivergingBarFrame, props, SIZE, label);
  } catch (error) {
    throw new Error(`${error.message} — shorten the words that frame draws (names in rows, title forms, count(), source forms)`);
  }
  // Every count the counter passes through was measured in Bun (the proof's frame.test.ts, for this data).
  for (let frame = 0; frame < props.timing.total; frame += 1) {
    const scene = sceneAt(props, frame);
    if (scene.landed > 0 && !props.counts[String(scene.landed)]) throw new Error(`the counter shows ${scene.landed} falls at frame ${frame}, a text build.mjs did not measure (a kit bug, not a beat.mjs one)`);
  }
  // The camera's shot argues a rise TOO SMALL TO SEE on the whole scale: one already readable there makes the zoom say
  // something false about it (the proof's +0,03 t is 0.6px; it closes ×200).
  const T = props.timing;
  const risen = props.rows.find((r) => r.change > 0);
  if (!(risen.change * props.unit < props.barH / 2))
    throw new Error(`${risen.key}'s rise is ${(risen.change * props.unit).toFixed(0)}px on the whole scale, already as readable as the falls: this video closes the camera onto a rise too small to see, which this data does not have — use the static or web format, or another type`);
  // At the camera's closest the one rise is a length, inside its column (the proof's frame.test.ts).
  const close = sceneAt(props, T.subject.start + T.subject.duration - 1);
  const riseAt = props.rows.findIndex((r) => r.change > 0);
  const rise = close.rows[riseAt].part;
  if (!(rise.w > props.barH && rise.x + rise.w < props.columns[props.rows[riseAt].column].end))
    throw new Error(`at ×${props.zoomBy} the rise is ${rise.w.toFixed(0)}px against a ${props.barH.toFixed(0)}px bar: the zoom does not make it a readable length inside its column (a kit bug, not a beat.mjs one)`);

  // The proof's --look list: the last frame of every event, frame 0, and the middle of each gesture.
  const lookFrames = [
    { name: "first", frame: 0 },
    { name: "end-establish", frame: T.establish.start + T.establish.duration - 1 },
    { name: "reference-levels", frame: Math.round(T.reference.start + T.reference.duration * 0.7) },
    { name: "end-reference", frame: T.reference.start + T.reference.duration - 1 },
    { name: "reveal-shrinking", frame: Math.round(T.reveal.start + T.reveal.duration * 0.5) },
    { name: "end-reveal", frame: T.reveal.start + T.reveal.duration - 1 },
    { name: "subject-flipping", frame: Math.round(T.subject.start + T.subject.duration * 0.18) },
    { name: "subject-zooming", frame: Math.round(T.subject.start + T.subject.duration * 0.62) },
    { name: "end-subject", frame: T.subject.start + T.subject.duration - 1 },
    { name: "end-conclusion", frame: T.conclusion.start + T.conclusion.duration - 1 },
    { name: "final", frame: T.total - 1 },
  ];
  const { wantedOf } = await import(skillScriptFrom(HERE, "chart-video", "scripts", "video-faces.mjs"));
  await renderBeatVideo({
    Frame: DivergingBarFrame,
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
