// The generic half of a line VIDEO beat, taken from proof/video-line-swiss-co2/render-directions-video.mjs with
// everything about ITS subject removed. The choreography is the worked example's and is not the model's to change: the
// title card, the ticks and the years, the line traced from the first year to the last (linear in years, the peak marked
// once passed), the last reading ringed, a level line shot back from it — the year counting down at its head — landing
// where the rising line last passed through that reading before the peak, ringed, then the credit. The timing contract
// and the shots are the proof's (timing-contract.ts, states.mjs, scene.mjs); the layout is the proof's build.mjs.
// ./beat.mjs — the one file the model writes — gives the data and the WORDS.
//
// Usage:  bun <beat>/render-beat.mjs [--size landscape|square|portrait] [--look-only]
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { videoExportSize } from "#shared/chart-video/sizes.mjs";
import { applyStoryboard, assertNumbers, assertLegibleLabels, assertOnePerX, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { assertEventFramesReadable, numberFormat, pickDirection, plain, refusing, renderBeatVideo, storyLanguage } from "./video.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const NB = "\u00A0";
const COMPOSITION_BASE = "zone-video-line"; // Root.tsx registers `${COMPOSITION_BASE}-${size}`

/** A value's text in the story's number format `{ decimals, small, below, decimal, group }` (the proof's `fr`). */
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

  const REQUIRED = ["eyebrow", "data", "unit", "peakLabel", "title", "source", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  if (typeof beat.check !== "function") throw new Error("beat.mjs: check must be a function (see CONTRACT.md)");
  for (const field of ["eyebrow", "unit", "peakLabel"])
    if (typeof beat[field] !== "string") throw new Error(`beat.mjs: ${field} must be a string (see CONTRACT.md)`);
  if (!Array.isArray(beat.data)) throw new Error("beat.mjs: data must be an array of { year, value }");

  // ── the series, and the landing behind the headline (./subject.mjs: the proof's derivation, its asserts as refusals)
  assertNumbers(beat.data.map((d) => [d.year, d.value]));
  assertOnePerX(beat.data);
  // The claim first: a title the data no longer supports is the refusal to read, before any the gesture raises.
  beat.check();
  const { subjectOf } = await import("./subject.mjs");
  const subject = subjectOf(beat);
  const values = subject.data.map((d) => d.mt);

  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";
  const format = numberFormat({ lang, max: Math.max(...values.map(Math.abs)), decimals: beat.decimals, decimal: beat.decimal });
  assertLegibleLabels(values, (v) => valueText(v, format));
  assertDrawsClaimColumn(values, HERE);
  assertHeadlineNumbersDrawn(withoutYears([beat.title].flat()[0]), values, "readings");
  // The gesture prints years — the first, the peak's, the last, the landing's. A year the title names that is none of
  // them is a year the video contradicts (the rewind lands on its own year, whatever the title says).
  const shown = new Set([subject.data[0].year, subject.peak.year, subject.end.year, subject.landingYear]);
  const foreign = yearsIn([beat.title].flat()[0]).filter((y) => !shown.has(y));
  if (foreign.length)
    throw new Error(
      `the title names ${foreign.join(", ")}, but the video's rewind lands on ${subject.landingYear} (the last year before the ${subject.peak.year} peak where the rising line passed through ${subject.end.year}'s reading) — the title's year must be the one the data gives; check() should test it`,
    );
  const peakYears = yearsIn(beat.peakLabel);
  if (peakYears.some((y) => y !== subject.peak.year)) throw new Error(`peakLabel names ${peakYears.join(", ")}, but the series peaks in ${subject.peak.year}: compute the year in peakLabel`);

  // ── the words, in the shape the proof's build.mjs reads (`copyOf` there)
  const unitWord = plain(beat.unit).trim();
  const withUnit = (text) => (unitWord ? `${text}${NB}${unitWord}` : text);
  const intFormat = { ...format, decimals: 0, small: 0 };
  const copy = {
    eyebrow: plain(beat.eyebrow),
    title: [beat.title].flat().map(plain),
    tip: (d) => withUnit(`${d.year} · ${valueText(d.mt, format)}`),
    peak: plain(beat.peakLabel),
    tick: (v, top) => {
      const text = valueText(v, Number.isInteger(v) ? intFormat : format);
      return top ? withUnit(text) : text;
    },
    source: [beat.source].flat().map((f) => plain(f).replace(" · ", `${NB}· `)),
  };
  if (!copy.title.length || copy.title.some((t) => !t.trim())) throw new Error("title must hold at least one non-empty form (the takeaway first)");
  if (!copy.source.length || copy.source.some((t) => !t.trim())) throw new Error("source must hold at least one non-empty form");

  const { buildDirection, loadBeat, textPerRegisterOf } = await import("./build.mjs");
  const { LineFrame } = await import("./LineFrame.tsx");
  const { sceneAt } = await import("./scene.mjs");
  const { label, chosen } = pickDirection(HERE, textPerRegisterOf(copy, subject), beat.evidenceLevels ?? 3);
  let built;
  try {
    built = buildDirection(label, chosen, loadBeat(subject, copy));
  } catch (error) {
    const layout = /run past|too thin|no credit|floor|fit/.test(error.message);
    throw new Error(layout ? `${error.message} — shorten the title forms, the peakLabel or the source forms` : error.message);
  }
  const { props, report, direction } = built;
  console.log(`direction ${label}`);
  for (const d of direction.decisions ?? []) console.log(`  ${d.register.padEnd(8)} ${d.role.padEnd(15)} -> ${d.family}`);
  console.log(`  title form ${report.titleForm + 1} · source form ${report.sourceForm + 1} · peak ${subject.peak.year} · lands on ${subject.landingYear}`);

  try {
    assertEventFramesReadable(LineFrame, props, SIZE, label);
  } catch (error) {
    throw new Error(`${error.message} — shorten the words that frame draws (title forms, peakLabel, source forms)`);
  }
  // Every year and tip the frames can show was measured in Bun (the proof's frame.test.ts, for this data).
  for (let frame = 0; frame < props.timing.total; frame += 1) {
    const scene = sceneAt(props, frame);
    if (!props.tipTexts[String(scene.tip.year)]) throw new Error(`the tip shows ${scene.tip.year} at frame ${frame}, a text build.mjs did not measure (a kit bug, not a beat.mjs one)`);
    if (scene.rewind.t > 0 && !props.yearTexts[String(scene.rewind.year)]) throw new Error(`the rewind shows ${scene.rewind.year} at frame ${frame}, a year build.mjs did not measure (a kit bug, not a beat.mjs one)`);
  }

  // The proof's --look list: the last frame of every event, frame 0, and two frames of the trace.
  const T = props.timing;
  const { EVENT_ORDER, endOf } = await import("#shared/chart-video/timing.ts");
  const { WINDOWS } = await import("./scene.mjs");
  const lookFrames = [
    { name: "first", frame: 0 },
    ...EVENT_ORDER.filter((e) => e !== "hold").map((event) => ({ name: `end-${event}`, frame: endOf(T[event]) - 1 })),
    ...[0.35, 0.7].map((t) => ({ name: `reveal-trace-${t}`, frame: Math.round(T.reveal.start + T.reveal.duration * (WINDOWS.reveal.trace[0] + t * (WINDOWS.reveal.trace[1] - WINDOWS.reveal.trace[0]))) })),
    { name: "subject-rewind", frame: Math.round(T.subject.start + T.subject.duration * 0.5) },
    { name: "final", frame: T.total - 1 },
  ];
  const { wantedOf } = await import((await import("#shared/design-base/skill-script.mjs")).skillScriptFrom(HERE, "chart-video", "scripts", "video-faces.mjs"));
  await renderBeatVideo({
    Frame: LineFrame,
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
