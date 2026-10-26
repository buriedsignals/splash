// The generic half of an area VIDEO beat, taken from proof/video-area-swiss-co2/render-directions-video.mjs with
// everything about ITS subject removed. The choreography is the worked example's and is not the model's to change: the
// title card, the ticks and the years, the surface filled from zero year by year while the stock counts up, then the
// search for the half — the surface steps back to its tint, a rule sweeps back from the last year repainting the recent
// surface while the stock's gauge fills with the share it has passed, stopping at the year the running total reaches
// half — then each half levelled to its mean (the same surface, as a block) and named with its length, and the curve
// whole again with the credit. The timing contract and the shots are the proof's (timing-contract.ts, states.mjs,
// scene.mjs); the layout is the proof's build.mjs. ./beat.mjs — the one file the model writes — gives the data and the
// WORDS.
//
// Usage:  bun <beat>/render-beat.mjs [--size landscape|square|portrait] [--look-only]
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { videoExportSize } from "#shared/chart-video/sizes.mjs";
import { applyStoryboard, assertNumbers, assertLegibleLabels, assertOnePerX, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { assertEventFramesReadable, numberFormat, pickDirection, plain, refusing, renderBeatVideo, storyLanguage } from "./video.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const NB = " ";
const COMPOSITION_BASE = "zone-video-area-and-stacked-area"; // Root.tsx registers `${COMPOSITION_BASE}-${size}`

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

  const REQUIRED = ["eyebrow", "data", "valueUnit", "stock", "years", "title", "source", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  if (typeof beat.check !== "function") throw new Error("beat.mjs: check must be a function (see CONTRACT.md)");
  for (const field of ["eyebrow", "valueUnit"])
    if (typeof beat[field] !== "string") throw new Error(`beat.mjs: ${field} must be a string (see CONTRACT.md)`);
  const stockForms = [beat.stock].flat();
  if (!stockForms.length || stockForms.some((f) => typeof f !== "function")) throw new Error("beat.mjs: stock must be a function (n) => words, or two of them, longest first (see CONTRACT.md)");
  if (typeof beat.years !== "function") throw new Error("beat.mjs: years must be a function (n) => words, such as (n) => `${n} years` (see CONTRACT.md)");
  if (!Array.isArray(beat.data)) throw new Error("beat.mjs: data must be an array of { year, value }");

  // ── the series, and the midpoint behind the headline (./subject.mjs: the proof's derivation, its asserts as refusals)
  assertNumbers(beat.data.map((d) => [d.year, d.value]));
  assertOnePerX(beat.data);
  // The claim first: a title the data no longer supports is the refusal to read, before any the gesture raises.
  beat.check();
  const { subjectOf } = await import("./subject.mjs");
  const subject = subjectOf(beat);
  const values = subject.readings.map((r) => r.mt);
  const first = subject.readings[0].year;
  const last = subject.readings.at(-1).year;

  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";
  const format = numberFormat({ lang, max: Math.max(...values), decimals: beat.decimals, decimal: beat.decimal });
  // The stock is a sum of readings: printed whole once it passes 100, as the proof printed 3 158.
  const stockFormat = numberFormat({ lang, max: subject.total, decimals: beat.decimals, decimal: beat.decimal });
  assertLegibleLabels(values, (v) => valueText(v, format));
  assertDrawsClaimColumn(values, HERE);
  // The title may state the stock or a half's share — figures the gesture computes and draws.
  assertHeadlineNumbersDrawn(withoutYears([beat.title].flat()[0]), [...values, subject.total, subject.shareAfter, subject.shareBefore, subject.after, subject.before], "readings");
  // The rule lands on the midpoint and the halves are named with their years: a year the title names that is none of
  // them is one the video contradicts.
  const shown = new Set([first, last, subject.midpoint, subject.midpoint + 1]);
  const foreign = yearsIn([beat.title].flat()[0]).filter((y) => !shown.has(y));
  if (foreign.length)
    throw new Error(
      `the title names ${foreign.join(", ")}, but the running total reaches half the stock in ${subject.midpoint} (the rule stops there; the halves are ${first}–${subject.midpoint} and ${subject.midpoint + 1}–${last}) — the title's year must be the one the data gives; check() should test it`,
    );

  // ── the words, in the shape the proof's build.mjs reads (`copyOf` there)
  const unitWord = plain(beat.valueUnit).trim();
  const intFormat = { ...format, decimals: 0, small: 0 };
  const stockAt = (fn, i) => (mt) => wordOf(`stock${stockForms.length > 1 ? `[${i}]` : ""}`, fn, valueText(mt, stockFormat));
  const yearsWord = (count) => wordOf("years", beat.years, count).replace(/ /, NB);
  const split = (words) => {
    const at = words.indexOf(NB);
    return at > 0 ? [words.slice(0, at), words.slice(at + 1)] : [words];
  };
  const halfForms = [
    { before: [`${first}–${subject.midpoint}`, yearsWord(subject.before)], after: [`${subject.midpoint + 1}–${last}`, yearsWord(subject.after)] },
    { before: [yearsWord(subject.before)], after: [yearsWord(subject.after)] },
    { before: split(yearsWord(subject.before)), after: split(yearsWord(subject.after)) },
  ];
  const copy = {
    eyebrow: plain(beat.eyebrow),
    title: [beat.title].flat().map(plain),
    stock: stockAt(stockForms[0], 0),
    stockForms: stockForms.map(stockAt),
    before: halfForms[0].before,
    after: halfForms[0].after,
    halfForms,
    tick: (v, top) => {
      const text = valueText(v, Number.isInteger(v) ? intFormat : format);
      return top && unitWord ? `${text}${NB}${unitWord}` : text;
    },
    unitWord,
    source: [beat.source].flat().map((f) => plain(f).replace(" · ", `${NB}· `)),
  };
  // Every form is asked once now: a form the layout reaches only at another size must not fail there first.
  for (const form of copy.stockForms) form(subject.total);
  if (!copy.title.length || copy.title.some((t) => !t.trim())) throw new Error("title must hold at least one non-empty form (the takeaway first)");
  if (!copy.source.length || copy.source.some((t) => !t.trim())) throw new Error("source must hold at least one non-empty form");

  const { buildDirection, loadBeat, textPerRegisterOf } = await import("./build.mjs");
  const { AreaFrame } = await import("./AreaFrame.tsx");
  const { sceneAt, WINDOWS } = await import("./scene.mjs");
  const { label, chosen } = pickDirection(HERE, textPerRegisterOf(copy, subject), beat.evidenceLevels ?? 4);
  let built;
  try {
    built = buildDirection(label, chosen, loadBeat(subject, copy));
  } catch (error) {
    const layout = /run past|runs into|wider than|does not fit|no form|no rung|no credit|floor|sit on the curve/.test(error.message);
    throw new Error(layout ? `${error.message} — shorten the words in stock or years, add a shorter stock form, or shorten the source forms` : error.message);
  }
  const { props, report, direction } = built;
  console.log(`direction ${label}`);
  for (const d of direction.decisions ?? []) console.log(`  ${d.register.padEnd(8)} ${d.role.padEnd(15)} -> ${d.family}`);
  console.log(`  title form ${report.titleForm + 1} · source form ${report.sourceForm + 1} · name form ${report.nameForm + 1} · stock form ${report.stockForm + 1} · year form ${report.yearForm + 1} · half reached in ${subject.midpoint} (${subject.shareAfter.toFixed(1)} % after)`);

  try {
    assertEventFramesReadable(AreaFrame, props, SIZE, label);
  } catch (error) {
    throw new Error(`${error.message} — shorten the words that frame draws (title forms, stock, years, source forms)`);
  }
  // Every stock text and rule year the frames can show was measured in Bun (the proof's frame.test.ts, for this data).
  for (let frame = 0; frame < props.timing.total; frame += 1) {
    const scene = sceneAt(props, frame);
    if (scene.stockShown && !props.stock.texts[String(scene.year)]) throw new Error(`the stock shows ${scene.year} at frame ${frame}, a text build.mjs did not measure (a kit bug, not a beat.mjs one)`);
    if (scene.gauge > 0 && !props.ruleYears[String(scene.ruleYear)]) throw new Error(`the rule shows ${scene.ruleYear} at frame ${frame}, a year build.mjs did not measure (a kit bug, not a beat.mjs one)`);
  }

  // The proof's --look list: the last frame of every event, frame 0, two frames of the fill, and each gesture's middle.
  const T = props.timing;
  const { EVENT_ORDER, endOf } = await import("#shared/chart-video/timing.ts");
  const mid = (event, [a, b]) => Math.round(T[event].start + (T[event].duration * (a + b)) / 2);
  const lookFrames = [
    { name: "first", frame: 0 },
    ...EVENT_ORDER.filter((e) => e !== "hold").map((event) => ({ name: `end-${event}`, frame: endOf(T[event]) - 1 })),
    ...[0.35, 0.7].map((t) => ({ name: `reveal-fill-${t}`, frame: Math.round(T.reveal.start + T.reveal.duration * (WINDOWS.reveal.fill[0] + t * (WINDOWS.reveal.fill[1] - WINDOWS.reveal.fill[0]))) })),
    { name: "subject-sweep", frame: mid("subject", WINDOWS.subject.sweep) },
    { name: "subject-flatten", frame: mid("subject", WINDOWS.subject.flatten) },
    { name: "conclusion-unflatten", frame: mid("conclusion", WINDOWS.conclusion.flatten) },
    { name: "final", frame: T.total - 1 },
  ];
  const { wantedOf } = await import((await import("#shared/design-base/skill-script.mjs")).skillScriptFrom(HERE, "chart-video", "scripts", "video-faces.mjs"));
  await renderBeatVideo({
    Frame: AreaFrame,
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
