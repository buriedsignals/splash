// The generic half of a population-pyramid VIDEO beat, taken from
// proof/video-population-pyramid-swiss-age/render-directions-video.mjs with everything about ITS subject removed. The
// choreography is the worked example's and is not the model's to change: the title card; band after band from the
// foot, each pair of bars growing out of the spine; every left bar sliding across the spine onto the right one, the
// part both share turning neutral and leaving, the difference sliding to the spine on the side of the half that has
// it; the scale magnified around the spine (the ticks changing scale), a rule drawn at the crossing and the two
// differences either side of it printed; then the camera back, the shared part growing back — the whole pyramid, the
// rule kept — and the credit. The timing contract and the shots are the proof's (timing-contract.ts, states.mjs,
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
const NB = " ";
const COMPOSITION_BASE = "zone-video-population-pyramid"; // Root.tsx registers `${COMPOSITION_BASE}-${size}`

/** A word function of beat.mjs, called and held to a non-empty string — a throw or a non-string names the field. */
function wordOf(name, fn, arg) {
  let out;
  try {
    out = fn(arg);
  } catch (error) {
    throw new Error(`beat.mjs: ${name}(${JSON.stringify(arg)}) threw « ${error.message} » — fix ${name} (see CONTRACT.md)`);
  }
  if (typeof out !== "string" || !out.trim()) throw new Error(`beat.mjs: ${name}(${JSON.stringify(arg)}) returned ${JSON.stringify(out)}, not a non-empty string — fix ${name} (see CONTRACT.md)`);
  return plain(out);
}

await refusing(HERE, async () => {
  const SIZE = videoExportSize();
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);

  const REQUIRED = ["eyebrow", "bands", "leftName", "rightName", "crossing", "title", "source", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  if (typeof beat.check !== "function") throw new Error("beat.mjs: check must be a function (see CONTRACT.md)");
  for (const field of ["tickFormat", "format"]) if (beat[field] !== undefined && typeof beat[field] !== "function") throw new Error(`beat.mjs: ${field} must be a function (see CONTRACT.md)`);
  for (const field of ["eyebrow", "leftName", "rightName"]) if (typeof beat[field] !== "string") throw new Error(`beat.mjs: ${field} must be a string (see CONTRACT.md)`);
  if (!Array.isArray(beat.bands)) throw new Error("beat.mjs: bands must be an array of { band, left, right }, youngest first (see CONTRACT.md)");
  assertNumbers(beat.bands.flatMap((b) => [[`${b.band} left`, b.left], [`${b.band} right`, b.right]]), "bands");

  const { subjectOf, assertGesture } = await import("./subject.mjs");
  const subject = subjectOf({ ...beat, bands: beat.bands.map((b) => ({ ...b, band: plain(b.band) })) });
  // The claim first: a title the data no longer supports is the refusal to read, before any the gesture raises.
  beat.check();
  assertGesture(subject, beat);

  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";
  const counts = subject.bands.flatMap((b) => [b.male, b.female]);
  const differences = subject.bands.map((b) => Math.abs(b.female - b.male));
  const integers = counts.every(Number.isInteger);
  const format = numberFormat({ lang, max: Math.max(...counts), decimals: integers ? 0 : undefined });
  // The proof's figures: the differences grouped by thousands with a no-break space; its ticks: 100000 → « 100k ».
  const grouped = (v) => {
    const [whole, part] = v.toFixed(format.decimals).split(".");
    const g = whole.replace(/\B(?=(\d{3})+(?!\d))/g, format.group === "," ? "," : NB);
    return part ? `${g}${format.decimal}${part}` : g;
  };
  const tick = beat.tickFormat ? (v) => wordOf("tickFormat", beat.tickFormat, v) : (v) => (v >= 1000 ? `${String(+(v / 1000).toPrecision(6)).replace(".", format.decimal)}k` : String(+v.toPrecision(6)).replace(".", format.decimal));
  const value = beat.format ? (v) => wordOf("format", beat.format, v) : grouped;
  assertDrawsClaimColumn(counts, HERE);
  const at = subject.crossing;
  assertHeadlineNumbersDrawn([beat.title].flat()[0], [...counts, ...differences], "bars");

  // ── the words, in the shape the proof's build.mjs reads (`copyOf` there)
  const copy = {
    eyebrow: plain(beat.eyebrow),
    title: [beat.title].flat().map(plain),
    halves: [plain(beat.leftName), plain(beat.rightName)],
    tick,
    zoom: (by) => `×${by}`,
    value,
    source: [beat.source].flat().map(plain),
  };
  if (!copy.title.length || copy.title.some((t) => !t.trim())) throw new Error("title must hold at least one non-empty form (the takeaway first)");
  if (!copy.source.length || copy.source.some((t) => !t.trim())) throw new Error("source must hold at least one non-empty form");

  const { buildDirection, loadBeat, textPerRegisterOf } = await import("./build.mjs");
  const { PyramidFrame } = await import("./PyramidFrame.tsx");
  const { sceneAt } = await import("./scene.mjs");
  const { label, chosen } = pickDirection(HERE, textPerRegisterOf(copy, subject), beat.evidenceLevels ?? 3);
  let built;
  try {
    built = buildDirection(label, chosen, loadBeat(subject, copy));
  } catch (error) {
    // The proof's layout refusals name the frame, not the beat: say what in beat.mjs moves them.
    const layout = /runs out|does not hold|is not$|words touching|floor/.test(error.message);
    throw new Error(layout ? `${error.message} — shorten the band names, the halves' names, the tick or value words, or the source forms` : error.message);
  }
  const { props, report, direction } = built;
  console.log(`direction ${label}`);
  for (const d of direction.decisions ?? []) console.log(`  ${d.register.padEnd(8)} ${d.role.padEnd(15)} -> ${d.family}`);
  console.log(`  title form ${report.titleForm + 1} · source form ${report.sourceForm + 1} · band pitch ${report.pitch}px · every ${report.every} band named · zoom ×${report.zoomBy} · crossing ${subject.bands[at].band}`);

  try {
    assertEventFramesReadable(PyramidFrame, props, SIZE, label);
  } catch (error) {
    throw new Error(`${error.message} — shorten the words that frame draws (band names, halves' names, title forms, source forms)`);
  }
  // At the end of the reveal only the differences are left, each on its leader's side (what the proof's frame.test.ts held).
  const T = props.timing;
  const last = (event) => T[event].start + T[event].duration - 1;
  const revealed = sceneAt(props, last("reveal"));
  props.rows.forEach((r, i) => {
    const bars = revealed.rows[i].bars.filter((b) => b.opacity > 0 && b.w > 1e-9);
    const [b] = bars;
    const leftLeads = r.male > r.female;
    const ok = bars.length === 1 && Math.abs(b.w - Math.abs(r.female - r.male) * props.unit) < 1e-6 && b.fill === (leftLeads ? "men" : "women");
    if (!ok) throw new Error(`at the end of the reveal band ${r.band} does not show only its difference on its leader's side (a kit bug)`);
  });

  // The proof's --look list: the last frame of every event, frame 0, and the middle of each gesture.
  const lookFrames = [
    { name: "first", frame: 0 },
    { name: "end-establish", frame: last("establish") },
    { name: "reference-grow", frame: Math.round(T.reference.start + T.reference.duration * 0.6) },
    { name: "end-reference", frame: last("reference") },
    ...[0.25, 0.5, 0.8].map((t) => ({ name: `reveal-${t}`, frame: Math.round(T.reveal.start + T.reveal.duration * t) })),
    { name: "end-reveal", frame: last("reveal") },
    { name: "subject-camera", frame: Math.round(T.subject.start + T.subject.duration * 0.25) },
    { name: "end-subject", frame: last("subject") },
    { name: "conclusion-rebuild", frame: Math.round(T.conclusion.start + T.conclusion.duration * 0.6) },
    { name: "end-conclusion", frame: last("conclusion") },
    { name: "final", frame: T.total - 1 },
  ];
  const { wantedOf } = await import((await import("#shared/design-base/skill-script.mjs")).skillScriptFrom(HERE, "chart-video", "scripts", "video-faces.mjs"));
  await renderBeatVideo({
    Frame: PyramidFrame,
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
