// The generic half of a marimekko VIDEO beat, taken from proof/video-marimekko-electricity-mix/render-directions-video.mjs
// with everything about ITS subject removed. The choreography is the worked example's and is not the model's to change:
// the title card; the whole as one block, its total under it, parting into the columns (widths kept, names over them,
// totals under them); column after column the bands growing up from the foot, the band names arriving; every band but
// the tracked one stepping back while each tracked cell drops out of its column and reshapes, area kept, into one strip
// under the plot — its height the tracked band's share, the largest holders named in their pieces, the share at the
// strip's end; then everything back, the named columns' tracked cells ringed, the credit. The timing contract and the
// shots are the proof's (timing-contract.ts, states.mjs, scene.mjs); the layout is the proof's build.mjs. ./beat.mjs —
// the one file the model writes — gives the data and the WORDS.
//
// Usage:  bun <beat>/render-beat.mjs [--size landscape|square|portrait] [--look-only]
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { videoExportSize } from "#shared/chart-video/sizes.mjs";
import { applyStoryboard, assertNumbers, assertLegibleLabels, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { assertEventFramesReadable, numberFormat, pickDirection, plain, refusing, renderBeatVideo, storyLanguage } from "./video.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const NB = "\u00A0";
const COMPOSITION_BASE = "zone-video-marimekko-mosaic-plot"; // Root.tsx registers `${COMPOSITION_BASE}-${size}`

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

  const REQUIRED = ["eyebrow", "columns", "bandOrder", "tracked", "unit", "when", "format", "title", "source", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const field of ["check", "format"]) if (typeof beat[field] !== "function") throw new Error(`beat.mjs: ${field} must be a function (see CONTRACT.md)`);
  for (const field of ["eyebrow", "unit"]) if (typeof beat[field] !== "string") throw new Error(`beat.mjs: ${field} must be a string (see CONTRACT.md)`);
  if (!Array.isArray(beat.columns) || !Array.isArray(beat.bandOrder)) throw new Error("beat.mjs: columns and bandOrder must be arrays (see CONTRACT.md)");
  assertNumbers(beat.columns.flatMap((c) => beat.bandOrder.map((b) => [`${c.key}.${b.key}`, c.values?.[b.key]])), "band values");

  const { subjectOf } = await import("./subject.mjs");
  const subject = subjectOf({ ...beat, columns: beat.columns.map((c) => ({ ...c, label: plain(c.label) })), bandOrder: beat.bandOrder.map((b) => ({ ...b, label: plain(b.label) })) });
  const holders = subject.holdersOut;
  // The claim first: a title the data no longer supports is the refusal to read, before any the gesture raises.
  beat.check({ columns: subject.columns.map((c) => ({ key: c.key, label: c.name, total: c.total, bands: c.bands })), grand: subject.grand, trackedTotal: subject.coal.total, trackedShare: subject.coal.share, holders });

  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";
  const format = numberFormat({ lang, max: subject.grand, decimals: 1, decimal: beat.decimal });
  const totals = subject.columns.map((c) => c.total);
  assertLegibleLabels(totals, (v) => wordOf("format", beat.format, v));
  assertDrawsClaimColumn(holders.map((h) => h.value), HERE);
  // The headline speaks in the tracked band's share (the strip's height), its total, or the holders' share of it.
  assertHeadlineNumbersDrawn([beat.title].flat()[0], [...totals, subject.grand, subject.coal.total, subject.coal.share * 100, subject.coal.topShare * 100, ...holders.map((h) => h.value)], "columns");

  // ── the words, in the shape the proof's build.mjs reads (`copyOf` there)
  const unitWord = plain(beat.unit).trim();
  const copy = {
    eyebrow: plain(beat.eyebrow),
    title: [beat.title].flat().map(plain),
    year: plain(beat.when),
    total: (v) => wordOf("format", beat.format, v),
    whole: unitWord ? `${wordOf("format", beat.format, subject.grand)}${NB}${unitWord}` : wordOf("format", beat.format, subject.grand),
    source: [beat.source].flat().map(plain),
    format,
  };
  if (!copy.title.length || copy.title.some((t) => !t.trim())) throw new Error("title must hold at least one non-empty form (the takeaway first)");
  if (!copy.source.length || copy.source.some((t) => !t.trim())) throw new Error("source must hold at least one non-empty form");
  if (!copy.year.trim()) throw new Error("when is empty: it is printed over the band names (the year, or the survey)");

  const { buildDirection, loadBeat, textPerRegisterOf } = await import("./build.mjs");
  const { MarimekkoFrame } = await import("./MarimekkoFrame.tsx");
  const { sceneAt, percentText } = await import("./scene.mjs");
  const { label, chosen } = pickDirection(HERE, textPerRegisterOf(copy, subject), beat.evidenceLevels ?? 3);
  let built;
  try {
    built = buildDirection(label, chosen, loadBeat(subject, copy));
  } catch (error) {
    // The proof's layout refusals name the frame, not the beat: say what in beat.mjs moves them.
    if (/narrowest column/.test(error.message)) throw new Error(`${error.message} — put the smallest columns together in one column named for all of them, or leave them out`);
    const layout = /does not hold|run into|no plot|cannot be drawn|floor/.test(error.message);
    throw new Error(layout ? `${error.message} — shorten the labels in columns and bandOrder, the unit or the source forms, lower named, or draw fewer columns` : error.message);
  }
  const { props, report, direction } = built;
  console.log(`direction ${label}`);
  for (const d of direction.decisions ?? []) console.log(`  ${d.register.padEnd(8)} ${d.role.padEnd(15)} -> ${d.family}`);
  console.log(`  title form ${report.titleForm + 1} · source form ${report.sourceForm + 1} · plot ${report.H}px · narrowest ${report.narrowest}px · key ${report.key} · names on ${report.nameLines} line(s) · totals on ${report.totalLines}`);

  try {
    assertEventFramesReadable(MarimekkoFrame, props, SIZE, label);
  } catch (error) {
    throw new Error(`${error.message} — shorten the words that frame draws (labels, unit, title forms, source forms)`);
  }

  // What the proof's frame.test.ts held per direction, now for this data.
  const T = props.timing;
  const last = (event) => T[event].start + T[event].duration - 1;
  const mid = (event, t) => Math.round(T[event].start + T[event].duration * t);
  const trackedOf = (c) => c.cells.find((cell) => cell.key === props.tracked);
  const settled = sceneAt(props, last("reveal"));
  for (const t of [0.25, 0.4, 0.55, 0.7]) {
    const s = sceneAt(props, mid("subject", t));
    s.columns.forEach((c, i) => {
      const was = trackedOf(settled.columns[i]);
      if (!(Math.abs(trackedOf(c).w * trackedOf(c).h - was.w * was.h) < 1e-3)) throw new Error(`a ${props.tracked} cell's area changes while it pours (a kit bug, not a beat.mjs one)`);
    });
  }
  const poured = sceneAt(props, last("subject")).columns.map(trackedOf);
  let cursor = props.plotLeft;
  for (const p of poured) {
    if (!(Math.abs(p.x - cursor) < 1e-6 && Math.abs(p.y - props.strip.top) < 1e-6)) throw new Error("the poured pieces do not tile the strip (a kit bug, not a beat.mjs one)");
    cursor = p.x + p.w;
  }
  if (!(Math.abs(cursor - props.plotLeft - props.room) < 1e-6)) throw new Error("the strip does not run the whole width (a kit bug, not a beat.mjs one)");
  if (props.strip.label.text !== applyCaseFree(percentText(subject.coal.share, format), props.strip.label.text)) throw new Error("the strip's share is not the tracked band's (a kit bug)");
  for (let t = 0.1; t <= 0.9; t += 0.02) {
    const pieces = sceneAt(props, mid("subject", t)).columns.map(trackedOf).filter((p) => p.w > 0.5).sort((a, b) => a.x - b.x);
    for (let j = 1; j < pieces.length; j++)
      if (pieces[j - 1].x + pieces[j - 1].w > pieces[j].x + 1e-6)
        throw new Error(`for this data two ${props.tracked} pieces collide while they pour (at ${Math.round(t * 100)} % of the subject shot): this video cannot tell it — offer the static format or another type`);
  }

  // The proof's --look list: the last frame of every event, frame 0, and the middle of each gesture.
  const lookFrames = [
    { name: "first", frame: 0 },
    { name: "end-establish", frame: last("establish") },
    { name: "reference-splitting", frame: mid("reference", 0.55) },
    { name: "end-reference", frame: last("reference") },
    { name: "reveal-filling", frame: mid("reveal", 0.5) },
    { name: "end-reveal", frame: last("reveal") },
    { name: "subject-pouring", frame: mid("subject", 0.4) },
    { name: "end-subject", frame: last("subject") },
    { name: "conclusion-returning", frame: mid("conclusion", 0.3) },
    { name: "end-conclusion", frame: last("conclusion") },
    { name: "final", frame: T.total - 1 },
  ];
  const { wantedOf } = await import((await import("#shared/design-base/skill-script.mjs")).skillScriptFrom(HERE, "chart-video", "scripts", "video-faces.mjs"));
  await renderBeatVideo({
    Frame: MarimekkoFrame,
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

/** The strip's word may be cased by the direction (applyCase): compare case-insensitively. */
function applyCaseFree(expected, drawn) {
  return expected.toLowerCase() === drawn.toLowerCase() ? drawn : expected;
}
