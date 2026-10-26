// The generic half of a histogram VIDEO beat, taken from
// proof/video-histogram-carbon-footprint-spread/render-directions-video.mjs with everything about ITS subject removed. The
// choreography is the worked example's and is not the model's to change: the zero line and the bin names; a tick per
// reading swept along the axis; every tick widens into one cell and stacks into its bin, the bins rising at one pace; the
// threshold's cut rises in the accent with the first bin's count over it; the tail's bins rise and slide, keeping their
// lengths, onto the second bin, its count climbing; seams cut both columns into tenths of the whole; then the seams close,
// the tail's bins slide back, the credit. The timing contract and the shots are the proof's (timing-contract.ts,
// states.mjs, scene.mjs); the layout is the proof's build.mjs. ./beat.mjs — the one file the model writes — gives the data
// and the WORDS.
//
// Usage:  bun <beat>/render-beat.mjs [--size landscape|square|portrait] [--look-only]
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { videoExportSize } from "#shared/chart-video/sizes.mjs";
import { EVENT_ORDER, endOf } from "#shared/chart-video/timing.ts";
import { skillScriptFrom } from "#shared/design-base/skill-script.mjs";
import { applyStoryboard, assertNumbers, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { assertEventFramesReadable, numberFormat, pickDirection, plain, refusing, renderBeatVideo, storyLanguage } from "./video.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const COMPOSITION_BASE = "zone-video-histogram"; // Root.tsx registers `${COMPOSITION_BASE}-${size}`

await refusing(HERE, async () => {
  const SIZE = videoExportSize();
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);

  const REQUIRED = ["eyebrow", "observations", "binWidth", "binCount", "threshold", "title", "source", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  if (typeof beat.check !== "function") throw new Error("beat.mjs: check must be a function (see CONTRACT.md)");
  if (typeof beat.eyebrow !== "string" || !beat.eyebrow.trim()) throw new Error("beat.mjs: eyebrow must be a non-empty string (see CONTRACT.md)");
  if (!Array.isArray(beat.observations)) throw new Error("beat.mjs: observations must be an array of { name, value }");
  assertNumbers(beat.observations.map((o) => [o.name, o.value]), "observations");

  const { subjectOf } = await import("./subject.mjs");
  const subject = subjectOf({ ...beat, observations: beat.observations.map((o) => ({ name: plain(o.name), value: o.value })) });
  // The claim first: check() is handed what the video counts — a title the data no longer supports refuses before the gesture.
  beat.check({ share: subject.under / subject.total, under: subject.under, total: subject.total, bins: subject.bins.map((b) => b.count) });

  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";
  const { decimal } = numberFormat({ lang, max: 100, decimals: 1, decimal: beat.decimal });
  const edge = (v) => String(v).replace(".", decimal);
  assertDrawsClaimColumn(subject.countries.map((c) => c.value), HERE);
  // The title may state the share in tenths (« 6 in 10 »: the seams cut the whole into ten), the count under the cut, the
  // total or the threshold — all drawn or ruled.
  assertHeadlineNumbersDrawn([beat.title].flat()[0], [subject.share, 10, subject.under, subject.total, beat.threshold, ...subject.bins.map((b) => b.count)], "bins");

  // ── the words, in the shape the proof's build.mjs reads (`copyOf` there)
  const copy = {
    eyebrow: plain(beat.eyebrow),
    title: [beat.title].flat().map(plain),
    binName: (b) => (b.open ? `${edge(b.lo)}+` : `${edge(b.lo)}–${edge(b.hi)}`),
    /** The same bin named by its lower edge — the ordinary histogram axis, half the range's width. */
    binEdge: (b) => (b.open ? `${edge(b.lo)}+` : `${edge(b.lo)}`),
    source: [beat.source].flat().map(plain),
  };
  if (!copy.title.length || copy.title.some((t) => !t.trim())) throw new Error("title must hold at least one non-empty form (the takeaway first)");
  if (!copy.source.length || copy.source.some((t) => !t.trim())) throw new Error("source must hold at least one non-empty form");

  const { buildDirection, loadBeat, textPerRegisterOf } = await import("./build.mjs");
  const { HistogramFrame } = await import("./HistogramFrame.tsx");
  const { label, chosen } = pickDirection(HERE, textPerRegisterOf(copy, subject), beat.evidenceLevels ?? 2);
  let built;
  try {
    built = buildDirection(label, chosen, loadBeat(subject, copy));
  } catch (error) {
    const tenths = /tenths/.test(error.message);
    const slide = /would slide through/.test(error.message);
    const layout = /runs into|rises above|no naming|over a .*bar|does not hold over/.test(error.message);
    throw new Error(
      tenths
        ? `${error.message}: the video cuts the readings under the cut and the rest into tenths of the whole, and at this count they do not round to ten tenths — this argument does not hold for this data`
        : slide
          ? `${error.message}: a tail bin taller than the column it slides across — this argument does not hold for this data (try a wider binWidth)`
          : layout
            ? `${error.message} — shorten the source, or change binWidth / binCount so fewer, wider bins are named`
            : error.message,
    );
  }
  const { props, report, direction } = built;
  console.log(`direction ${label}`);
  for (const d of direction.decisions ?? []) console.log(`  ${d.register.padEnd(8)} ${d.role.padEnd(15)} -> ${d.family}`);
  console.log(`  title form ${report.titleForm + 1} · source form ${report.sourceForm + 1} · ${report.unit}px a reading · bin ${report.binBand}px · names ${report.naming} · ${subject.under} of ${subject.total} under the cut, ${subject.share} in 10`);

  try {
    assertEventFramesReadable(HistogramFrame, props, SIZE, label);
  } catch (error) {
    throw new Error(`${error.message} — shorten the words that frame draws (title forms, source forms)`);
  }
  const { sceneAt } = await import("./scene.mjs");
  for (let frame = 0; frame < props.timing.total; frame += 1) {
    const s = sceneAt(props, frame);
    if (s.tail.opacity > 0 && !props.tailCounts[s.tail.key]) throw new Error(`the column's count shows ${s.tail.key} at frame ${frame}, a text build.mjs did not measure (a kit bug)`);
  }

  const T = props.timing;
  const lookFrames = [
    { name: "first", frame: 0 },
    { name: "reference-rug", frame: Math.round(T.reference.start + T.reference.duration * 0.6) },
    { name: "reveal-falling", frame: Math.round(T.reveal.start + T.reveal.duration * 0.3) },
    { name: "subject-stacking", frame: Math.round(T.subject.start + T.subject.duration * 0.45) },
    { name: "subject-tenths", frame: Math.round(T.subject.start + T.subject.duration * 0.9) },
    { name: "conclusion-return", frame: Math.round(T.conclusion.start + T.conclusion.duration * 0.55) },
    ...EVENT_ORDER.map((event) => ({ name: event === "hold" ? "final" : `end-${event}`, frame: Math.min(endOf(T[event]), T.total) - 1 })),
  ].sort((a, b) => a.frame - b.frame);
  const { wantedOf } = await import(skillScriptFrom(HERE, "chart-video", "scripts", "video-faces.mjs"));
  await renderBeatVideo({
    Frame: HistogramFrame,
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
