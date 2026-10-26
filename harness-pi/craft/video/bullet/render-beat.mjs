// The generic half of a bullet VIDEO beat, taken from proof/video-bullet-low-carbon-share/render-directions-video.mjs
// with everything about ITS subject removed. The choreography is the worked example's and is not the model's to change:
// the title card; the rows in their earlier order, each one bar for a whole to 100 % — the earlier share in the pale
// tint, the rest in a neutral; the frontier moving to the later state row after row, the part gained filling in, each
// gain counting; the rows re-sorting by gain, one climbing at a time; the threshold line dropped and the row that gained
// most ringed as the only one still under it; the credit. The timing contract and the shots are the proof's
// (timing-contract.ts, states.mjs, scene.mjs); the layout is the proof's build.mjs. ./beat.mjs — the one file the model
// writes — gives the data and the WORDS.
//
// Usage:  bun <beat>/render-beat.mjs [--size landscape|square|portrait] [--look-only]
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { videoExportSize } from "#shared/chart-video/sizes.mjs";
import { applyStoryboard, assertNumbers, assertLegibleLabels, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { assertEventFramesReadable, numberFormat, pickDirection, plain, refusing, renderBeatVideo, storyLanguage } from "./video.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const NB = "\u00A0";
const COMPOSITION_BASE = "zone-video-bullet"; // Root.tsx registers `${COMPOSITION_BASE}-${size}`

/** A value's text in the story's number format `{ decimals, small, below, decimal, group }`. */
const valueText = (v, f) => {
  const [whole, part] = Math.abs(v).toFixed(Math.abs(v) >= f.below ? f.decimals : f.small).split(".");
  const grouped = f.group ? whole.replace(/\B(?=(\d{3})+(?!\d))/g, f.group) : whole;
  return `${v < 0 ? "-" : ""}${part ? `${grouped}${f.decimal}${part}` : grouped}`;
};
// Years are checked against the gesture below; the shared headline guard reads only years from 1900 as years.
const withoutYears = (text) => String(text).replace(/(?<!\d)(1[89]\d\d|20\d\d|2100)(?!\d)/g, "");
const yearsIn = (text) => [...String(text).matchAll(/(?<!\d)(1[89]\d\d|20\d\d|2100)(?!\d)/g)].map((m) => Number(m[1]));
await refusing(HERE, async () => {
  const SIZE = videoExportSize();
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);

  const REQUIRED = ["eyebrow", "rows", "markerName", "measureName", "restName", "axisName", "gainUnit", "title", "source", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  if (typeof beat.check !== "function") throw new Error("beat.mjs: check must be a function (see CONTRACT.md)");
  for (const field of ["eyebrow", "markerName", "measureName", "restName", "axisName", "gainUnit"])
    if (typeof beat[field] !== "string") throw new Error(`beat.mjs: ${field} must be a string (see CONTRACT.md)`);
  if (!Array.isArray(beat.rows)) throw new Error("beat.mjs: rows must be an array of { name, label, marker, measure }");

  // ── the rows, the gains and the insertion (./subject.mjs: the proof's derivation, its asserts as refusals)
  assertNumbers(beat.rows.map((r) => [r.name, r.marker]), "markers");
  assertNumbers(beat.rows.map((r) => [r.name, r.measure]), "measures");
  // The claim first: a title the data no longer supports is the refusal to read, before any the gesture raises.
  beat.check();
  const { subjectOf } = await import("./subject.mjs");
  const subject = subjectOf(beat);
  const gains = subject.countries.map((c) => c.after - c.before);

  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";
  const decimal = numberFormat({ lang, max: 100, decimal: beat.decimal }).decimal;
  const { gainText } = await import("./scene.mjs");
  // The gains are the printed values (one decimal): they must read apart.
  assertLegibleLabels(gains, (v) => gainText(v, decimal));
  assertDrawsClaimColumn(subject.countries.flatMap((c) => [c.before, c.after]), HERE);
  assertHeadlineNumbersDrawn(withoutYears([beat.title].flat()[0]), [...gains, ...subject.countries.flatMap((c) => [c.before, c.after]), subject.threshold], "rows");
  // The key names the two states: a year the title names that is neither is a state the video does not draw.
  const shown = new Set([...yearsIn(beat.markerName), ...yearsIn(beat.measureName)]);
  const foreign = yearsIn([beat.title].flat()[0]).filter((y) => !shown.has(y));
  if (foreign.length) throw new Error(`the title names ${foreign.join(", ")}, but the video's two states are « ${beat.markerName} » and « ${beat.measureName} »: compare the states the title names`);

  // ── the words, in the shape the proof's build.mjs reads (`copyOf` there)
  const gainUnit = plain(beat.gainUnit).trim();
  const threshold = String(+subject.threshold.toFixed(1)).replace(".", decimal);
  const copy = {
    eyebrow: plain(beat.eyebrow),
    title: [beat.title].flat().map(plain),
    gain: (text) => (gainUnit ? `${text}${NB}${gainUnit}` : text),
    gainUnit,
    decimal,
    dates: [plain(beat.markerName), plain(beat.measureName), plain(beat.restName)],
    unit: plain(beat.axisName),
    ticks: ["0", threshold, `100${NB}%`],
    source: [beat.source].flat().map(plain),
  };
  if (!copy.title.length || copy.title.some((t) => !t.trim())) throw new Error("title must hold at least one non-empty form (the takeaway first)");
  if (!copy.source.length || copy.source.some((t) => !t.trim())) throw new Error("source must hold at least one non-empty form");

  const { buildDirection, loadBeat, textPerRegisterOf } = await import("./build.mjs");
  const { BulletFrame } = await import("./BulletFrame.tsx");
  const { sceneAt } = await import("./scene.mjs");
  const { label, chosen } = pickDirection(HERE, textPerRegisterOf(copy, subject), beat.evidenceLevels ?? 3);
  let built;
  try {
    built = buildDirection(label, chosen, loadBeat(subject, copy));
  } catch (error) {
    const layout = /do not fit|neither header|run past|no credit|floor/.test(error.message);
    throw new Error(layout ? `${error.message} — shorten axisName, the key's names (markerName, measureName, restName), the rows' labels or the source forms` : error.message);
  }
  const { props, report, direction } = built;
  console.log(`direction ${label}`);
  for (const d of direction.decisions ?? []) console.log(`  ${d.register.padEnd(8)} ${d.role.padEnd(15)} -> ${d.family}`);
  console.log(`  title form ${report.titleForm + 1} · source form ${report.sourceForm + 1} · header ${report.header} · ${report.steps} insertion step(s) · gained most ${subject.moved.key}`);

  try {
    assertEventFramesReadable(BulletFrame, props, SIZE, label);
  } catch (error) {
    throw new Error(`${error.message} — shorten the words that frame draws (title forms, labels, source forms)`);
  }
  // Every gain the count passes through was measured in Bun (the proof's frame.test.ts, for this data).
  for (let frame = 0; frame < props.timing.total; frame += 1) {
    const scene = sceneAt(props, frame);
    for (const s of scene.rows) {
      const text = copy.gain(gainText(s.gain, decimal));
      if (s.shown && !(text in props.gainWidths)) throw new Error(`a gain shows ${JSON.stringify(text)} at frame ${frame}, a text build.mjs did not measure (a kit bug, not a beat.mjs one)`);
    }
  }

  // The proof's --look list: the last frame of every event, frame 0, the frontier moving and two frames of the reorder.
  const T = props.timing;
  const { EVENT_ORDER, endOf } = await import("#shared/chart-video/timing.ts");
  const lookFrames = [
    { name: "first", frame: 0 },
    ...EVENT_ORDER.filter((e) => e !== "hold").map((event) => ({ name: `end-${event}`, frame: endOf(T[event]) - 1 })),
    { name: "reveal-after", frame: Math.round(T.reveal.start + T.reveal.duration * 0.75) },
    ...[0.2, 0.45].map((t) => ({ name: `subject-reorder-${t}`, frame: Math.round(T.subject.start + T.subject.duration * t) })),
    { name: "final", frame: T.total - 1 },
  ];
  const { wantedOf } = await import((await import("#shared/design-base/skill-script.mjs")).skillScriptFrom(HERE, "chart-video", "scripts", "video-faces.mjs"));
  await renderBeatVideo({
    Frame: BulletFrame,
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
