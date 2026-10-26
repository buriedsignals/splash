// The generic half of a box-plot VIDEO beat, taken from proof/video-box-plot-france-co2-decades/
// render-directions-video.mjs with everything about ITS subject removed. The choreography is the worked example's and is
// not the model's to change: the title card; the value axis and the decades named under their slots, the annual readings
// appearing in order, each at its year inside its decade; decade after decade the readings gathering into one column, the
// median drawn through it, the box opening to the quartiles, the whiskers, the years past them ringed, the box lifting
// out beside its readings; then one median walking the decades, sliding to each next box and climbing or dropping onto
// its median — the highest decade lit in the accent with its median printed, the last decade's printed — and the credit.
// The timing contract and the shots are the proof's (timing-contract.ts, states.mjs, scene.mjs); the layout is the
// proof's build.mjs. ./beat.mjs — the one file the model writes — gives the data and the WORDS.
//
// Usage:  bun <beat>/render-beat.mjs [--size landscape|square|portrait] [--look-only]
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { videoExportSize } from "#shared/chart-video/sizes.mjs";
import { applyStoryboard, assertNumbers, assertLegibleLabels, assertOnePerX, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { assertEventFramesReadable, numberFormat, pickDirection, plain, refusing, renderBeatVideo, storyLanguage } from "./video.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const NB = "\u00A0";
const COMPOSITION_BASE = "zone-video-box-plot"; // Root.tsx registers `${COMPOSITION_BASE}-${size}`

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

  const REQUIRED = ["eyebrow", "data", "unit", "title", "source", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  if (typeof beat.check !== "function") throw new Error("beat.mjs: check must be a function (see CONTRACT.md)");
  for (const field of ["eyebrow", "unit"]) if (typeof beat[field] !== "string") throw new Error(`beat.mjs: ${field} must be a string (see CONTRACT.md)`);
  if (!Array.isArray(beat.data)) throw new Error("beat.mjs: data must be an array of { year, value }");

  // ── the readings and their decades (./subject.mjs: the proof's derivation, its asserts as refusals)
  assertNumbers(beat.data.map((d) => [d.year, d.value]));
  assertOnePerX(beat.data);
  // The claim first: a title the data no longer supports is the refusal to read, before any the gesture raises.
  beat.check();
  const { subjectOf } = await import("./subject.mjs");
  const subject = subjectOf(beat);
  const values = subject.readings.map((r) => r.value);
  const medians = subject.decades.map((d) => d.median);
  const peak = subject.decades[subject.peak];

  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";
  const format = numberFormat({ lang, max: Math.max(...values.map(Math.abs)), decimals: beat.decimals, decimal: beat.decimal });
  // The printed figures are two medians (the peak's and the last decade's): they must read apart.
  assertLegibleLabels(medians, (v) => valueText(v, format));
  assertDrawsClaimColumn(values, HERE);
  assertHeadlineNumbersDrawn(withoutYears([beat.title].flat()[0]), [...values, ...medians], "readings");
  // The walk lights the decade whose median is highest: a year the title names that is not its start (or the series'
  // first or last year) is a decade the video contradicts.
  const shown = new Set([peak.start, subject.readings[0].year, subject.lastYear]);
  const foreign = yearsIn([beat.title].flat()[0]).filter((y) => !shown.has(y));
  if (foreign.length)
    throw new Error(`the title names ${foreign.join(", ")}, but the decade with the highest median is the ${peak.start}s (${valueText(peak.median, format)}) — the video lights that one; the title's decade must be the one the data gives, and check() should test it`);

  // ── the words, in the shape the proof's build.mjs reads (`copyOf` there)
  const unitWord = plain(beat.unit).trim();
  const intFormat = { ...format, decimals: 0, small: 0 };
  const yy = String(subject.lastYear).slice(2);
  const two = (start) => String(start % 100).padStart(2, "0");
  const decadeForms = [
    (d, i, all) => (i < all.length - 1 ? `${d.start}s` : `${d.start}–${yy}`),
    (d, i, all) => (i < all.length - 1 ? `${two(d.start)}s` : `${two(d.start)}–${yy}`),
    (d, i, all) => (i < all.length - 1 ? two(d.start) : `${two(d.start)}–${yy}`),
  ];
  const copy = {
    eyebrow: plain(beat.eyebrow),
    title: [beat.title].flat().map(plain),
    decade: decadeForms[0],
    decadeForms,
    tick: (v, top) => {
      const text = valueText(v, Number.isInteger(v) ? intFormat : format);
      return top && unitWord ? `${text}${NB}${unitWord}` : text;
    },
    value: (v) => valueText(v, format),
    source: [beat.source].flat().map((f) => plain(f).replace(" · ", `${NB}· `)),
  };
  if (!copy.title.length || copy.title.some((t) => !t.trim())) throw new Error("title must hold at least one non-empty form (the takeaway first)");
  if (!copy.source.length || copy.source.some((t) => !t.trim())) throw new Error("source must hold at least one non-empty form");

  const { buildDirection, loadBeat, textPerRegisterOf } = await import("./build.mjs");
  const { BoxplotFrame } = await import("./BoxplotFrame.tsx");
  const { label, chosen } = pickDirection(HERE, textPerRegisterOf(copy, subject), beat.evidenceLevels ?? 3);
  let built;
  try {
    built = buildDirection(label, chosen, loadBeat(subject, copy));
  } catch (error) {
    const layout = /runs into|run past|leaves|no form|no seat|no credit|floor|wider than/.test(error.message);
    throw new Error(layout ? `${error.message} — fewer decades (filter data.json's years), or shorter source forms` : error.message);
  }
  const { props, report, direction } = built;
  console.log(`direction ${label}`);
  for (const d of direction.decisions ?? []) console.log(`  ${d.register.padEnd(8)} ${d.role.padEnd(15)} -> ${d.family}`);
  console.log(`  title form ${report.titleForm + 1} · source form ${report.sourceForm + 1} · name form ${report.nameForm + 1} · medians ${report.valueSeats.join(" / ")} · ${subject.decades.length} decades, peak ${peak.label}`);

  try {
    assertEventFramesReadable(BoxplotFrame, props, SIZE, label);
  } catch (error) {
    throw new Error(`${error.message} — shorten the words that frame draws (title forms, source forms)`);
  }

  // The proof's --look list: the last frame of every event, frame 0, the readings arriving, three of the reveal, the walk
  // and the release.
  const T = props.timing;
  const { EVENT_ORDER, endOf } = await import("#shared/chart-video/timing.ts");
  const lookFrames = [
    { name: "first", frame: 0 },
    ...EVENT_ORDER.filter((e) => e !== "hold").map((event) => ({ name: `end-${event}`, frame: endOf(T[event]) - 1 })),
    { name: "reference-readings", frame: Math.round(T.reference.start + T.reference.duration * 0.6) },
    ...[0.2, 0.5, 0.8].map((t) => ({ name: `reveal-${t}`, frame: Math.round(T.reveal.start + T.reveal.duration * t) })),
    { name: "subject-walk", frame: Math.round(T.subject.start + T.subject.duration * 0.4) },
    { name: "conclusion-release", frame: Math.round(T.conclusion.start + T.conclusion.duration * 0.3) },
    { name: "final", frame: T.total - 1 },
  ];
  const { wantedOf } = await import((await import("#shared/design-base/skill-script.mjs")).skillScriptFrom(HERE, "chart-video", "scripts", "video-faces.mjs"));
  await renderBeatVideo({
    Frame: BoxplotFrame,
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
