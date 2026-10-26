// The generic half of a connected-scatter VIDEO beat, taken from proof/video-connected-scatter-lowcarbon/
// render-directions-video.mjs with everything about ITS subject removed. The choreography is the worked example's and is
// not the model's to change: the title card; the axes and the key, each entity's earlier x growing as a bar from zero at
// the height of its y, then collapsing into its earlier ring; the entities travelling one after another along their arcs
// to their later discs, the largest rise first, the count of those that rose climbing; the x axis closing onto the crowd
// near the origin, every entity in it named; the whole axis again, the entities whose x fell picked out one after another
// (largest loss first), the rest stepping back, the subject's arc split into its two moves with their values; every
// entity back, and the credit. The timing contract and the shots are the proof's (timing-contract.ts, states.mjs,
// scene.mjs); the layout is the proof's build.mjs. ./beat.mjs — the one file the model writes — gives the data and the
// WORDS.
//
// Usage:  bun <beat>/render-beat.mjs [--size landscape|square|portrait] [--look-only]
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { videoExportSize } from "#shared/chart-video/sizes.mjs";
import { applyStoryboard, assertNumbers, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { assertEventFramesReadable, numberFormat, pickDirection, plain, refusing, renderBeatVideo, storyLanguage } from "./video.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const NB = "\u00A0";
const COMPOSITION_BASE = "zone-video-connected-scatter"; // Root.tsx registers `${COMPOSITION_BASE}-${size}`

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

  const REQUIRED = ["eyebrow", "entities", "subject", "from", "to", "xName", "yName", "cleaner", "lighter", "moveUnit", "title", "source", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  if (typeof beat.check !== "function") throw new Error("beat.mjs: check must be a function (see CONTRACT.md)");
  for (const field of ["eyebrow", "from", "to", "xName", "moveUnit"]) if (typeof beat[field] !== "string") throw new Error(`beat.mjs: ${field} must be a string (see CONTRACT.md)`);
  if (![beat.yName].flat().every((f) => typeof f === "string" && f.trim())) throw new Error("beat.mjs: yName must be a string, or up to three strings, longest first (see CONTRACT.md)");
  for (const field of ["cleaner", "lighter"]) if (typeof beat[field] !== "function") throw new Error(`beat.mjs: ${field} must be a function returning words (see CONTRACT.md)`);
  for (const field of ["cleanerLines", "named"]) if (beat[field] !== undefined && typeof beat[field] !== "function") throw new Error(`beat.mjs: ${field}, when given, must be a function (see CONTRACT.md)`);
  if (!Array.isArray(beat.entities)) throw new Error("beat.mjs: entities must be an array of { name, label, code, from: { x, y }, to: { x, y } }");

  // ── the entities and their moves (./subject.mjs: the proof's derivation, its asserts as refusals)
  for (const at of ["from", "to"]) for (const axis of ["x", "y"]) assertNumbers(beat.entities.map((e) => [`${e.name} ${at}.${axis}`, e[at]?.[axis]]));
  // The claim first: a title the data no longer supports is the refusal to read, before any the gesture raises.
  beat.check();
  const { subjectOf } = await import("./subject.mjs");
  const subject = subjectOf(beat);
  const values = subject.entities.flatMap((e) => [e.from.weight, e.from.ownMix, e.to.weight, e.to.ownMix]);
  assertDrawsClaimColumn(values, HERE);
  assertHeadlineNumbersDrawn(withoutYears([beat.title].flat()[0]), [...values, subject.entities.length, subject.lighter.length, Math.abs(subject.moves.weight), Math.abs(subject.moves.ownMix)], "entities");
  const shown = new Set([...yearsIn(beat.from), ...yearsIn(beat.to)]);
  const foreign = yearsIn([beat.title].flat()[0]).filter((y) => !shown.has(y));
  if (foreign.length) throw new Error(`the title names ${foreign.join(", ")}, but the video's two states are « ${beat.from} » and « ${beat.to} »: compare the states the title names`);

  // ── the words, in the shape the proof's build.mjs reads (`copyOf` there)
  const count = subject.entities.length;
  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";
  const decimal = numberFormat({ lang, max: 100, decimal: beat.decimal }).decimal;
  const one = (v) => Math.abs(v).toFixed(1).replace(".", decimal);
  const unit = plain(beat.moveUnit).trim();
  const move = (v) => `${v < 0 ? "−" : "+"}${one(v)}${unit ? `${NB}${unit}` : ""}`;
  const cleaner = (k) => wordOf("cleaner", (x) => beat.cleaner(x, count), k);
  const split = (text) => {
    const words = text.split(" ");
    const at = Math.ceil(words.length / 2);
    return words.length > 1 ? [words.slice(0, at).join(" "), words.slice(at).join(" ")] : [text];
  };
  const cleanerLines = (k) => {
    if (!beat.cleanerLines) return split(cleaner(k));
    const lines = beat.cleanerLines(k, count);
    if (!(Array.isArray(lines) && lines.length >= 1 && lines.length <= 2 && lines.every((l) => typeof l === "string" && l.trim())))
      throw new Error(`beat.mjs: cleanerLines(${k}, ${count}) returned ${JSON.stringify(lines)} — it must return one or two non-empty strings`);
    return lines.map(plain);
  };
  const lighter = (k) => wordOf("lighter", beat.lighter, k);
  const copy = {
    eyebrow: plain(beat.eyebrow),
    title: [beat.title].flat().map(plain),
    yName: [beat.yName].flat().map(plain),
    xName: plain(beat.xName),
    cleaner,
    lighter,
    named: (k, all) => (beat.named ? wordOf("named", (x) => beat.named(x, all), k) : `${k}/${all}`),
    counters: [
      { cleaner: (k) => [cleaner(k)], lighter: (k) => [lighter(k)] },
      { cleaner: cleanerLines, lighter: (k) => [lighter(k)] },
    ],
    years: [plain(beat.from), plain(beat.to)],
    across: move(subject.moves.weight),
    up: move(subject.moves.ownMix),
    source: [beat.source].flat().map(plain),
  };
  // Every word function asked once now, on every count it can be handed.
  for (let k = 0; k <= count; k++) cleanerLines(k), copy.named(k, count);
  for (let k = 0; k <= subject.lighter.length; k++) lighter(k);
  if (!copy.title.length || copy.title.some((t) => !t.trim())) throw new Error("title must hold at least one non-empty form (the takeaway first)");
  if (!copy.source.length || copy.source.some((t) => !t.trim())) throw new Error("source must hold at least one non-empty form");

  const { buildDirection, loadBeat, textPerRegisterOf } = await import("./build.mjs");
  const { ConnectedScatterFrame } = await import("./ConnectedScatterFrame.tsx");
  const { sceneAt, WINDOWS } = await import("./scene.mjs");
  const { label, chosen } = pickDirection(HERE, textPerRegisterOf(copy, subject), beat.evidenceLevels ?? 4);
  let built;
  try {
    built = buildDirection(label, chosen, loadBeat(subject, copy));
  } catch (error) {
    const layout = /no seat|find no|finds no|do not fit|no y axis name|no credit|floor|nowhere/.test(error.message);
    throw new Error(layout ? `${error.message} — shorten the labels (or give shorter codes), xName, yName (add a shorter form), the counters or the source forms` : error.message);
  }
  const { props, report, direction } = built;
  console.log(`direction ${label}`);
  for (const d of direction.decisions ?? []) console.log(`  ${d.register.padEnd(8)} ${d.role.padEnd(15)} -> ${d.family}`);
  console.log(`  title form ${report.titleForm + 1} · source form ${report.sourceForm + 1} · counters on ${report.counterRows} line(s) · ${report.naming} · ${report.named} · lighter: ${subject.lighter.join(", ")}`);

  try {
    assertEventFramesReadable(ConnectedScatterFrame, props, SIZE, label);
  } catch (error) {
    throw new Error(`${error.message} — shorten the words that frame draws (labels, axis names, counters, source forms)`);
  }
  // Every count the frames can show was measured in Bun (the proof's frame.test.ts, for this data).
  for (let frame = 0; frame < props.timing.total; frame += 1) {
    const scene = sceneAt(props, frame);
    if (!props.panel.counterTexts.cleaner[String(scene.cleaner)]) throw new Error(`the count shows ${scene.cleaner} at frame ${frame}, a text build.mjs did not measure (a kit bug, not a beat.mjs one)`);
    if (!props.panel.counterTexts.lighter[String(scene.lighterCount)]) throw new Error(`the lighter count shows ${scene.lighterCount} at frame ${frame}, a text build.mjs did not measure (a kit bug, not a beat.mjs one)`);
  }

  // The proof's --look list: the last frame of every event, frame 0, the bars, the travel, the zoom and the picking.
  const T = props.timing;
  const { EVENT_ORDER, endOf } = await import("#shared/chart-video/timing.ts");
  const lookFrames = [
    { name: "first", frame: 0 },
    ...EVENT_ORDER.filter((e) => e !== "hold").map((event) => ({ name: `end-${event}`, frame: endOf(T[event]) - 1 })),
    ...[0.55, 0.8].map((t) => ({ name: `reference-bars-${t}`, frame: Math.round(T.reference.start + T.reference.duration * t) })),
    ...[0.3, 0.6].map((t) => ({ name: `reveal-travel-${t}`, frame: Math.round(T.reveal.start + T.reveal.duration * (WINDOWS.reveal.travel[0] + t * (WINDOWS.reveal.travel[1] - WINDOWS.reveal.travel[0]))) })),
    { name: "subject-zooming", frame: Math.round(T.subject.start + T.subject.duration * 0.2) },
    { name: "conclusion-picking", frame: Math.round(T.conclusion.start + T.conclusion.duration * 0.5) },
    { name: "final", frame: T.total - 1 },
  ];
  const { wantedOf } = await import((await import("#shared/design-base/skill-script.mjs")).skillScriptFrom(HERE, "chart-video", "scripts", "video-faces.mjs"));
  await renderBeatVideo({
    Frame: ConnectedScatterFrame,
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
