// The generic half of a pictogram (unit grid) VIDEO beat, taken from
// proof/video-pictogram-europe-lowcarbon/render-directions-video.mjs with everything about ITS subject removed. The
// choreography is the worked example's and is not the model's to change: the title card; the 0–100 % axis, a square
// dropping onto the 5-point column of its share as a front sweeps across; the two cuts rising and the axis parting at
// them; each part's squares gathering into columns from its anchor (the left edge, the right edge, the middle), the j-th
// square of every block landing at one moment, each block's count climbing as its squares land — the middle stops first;
// then the parts close into the pictogram, magnified, the middle's count ringed, the credit. The timing contract and the
// shots are the proof's (timing-contract.ts, states.mjs, scene.mjs); the layout is the proof's build.mjs. ./beat.mjs —
// the one file the model writes — gives the data and the WORDS.
//
// Usage:  bun <beat>/render-beat.mjs [--size landscape|square|portrait] [--look-only]
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { videoExportSize } from "#shared/chart-video/sizes.mjs";
import { applyStoryboard, assertNumbers, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { assertEventFramesReadable, pickDirection, plain, refusing, renderBeatVideo } from "./video.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const NB = " ";
const COMPOSITION_BASE = "zone-video-pictogram-isotype"; // Root.tsx registers `${COMPOSITION_BASE}-${size}`

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

  const REQUIRED = ["eyebrow", "units", "cuts", "breaks", "percent", "count", "axisName", "title", "source", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const field of ["check", "percent", "count"]) if (typeof beat[field] !== "function") throw new Error(`beat.mjs: ${field} must be a function (see CONTRACT.md)`);
  for (const field of ["eyebrow", "axisName"]) if (typeof beat[field] !== "string") throw new Error(`beat.mjs: ${field} must be a string (see CONTRACT.md)`);
  if (!Array.isArray(beat.units)) throw new Error("beat.mjs: units must be an array of { key, label, value } (see CONTRACT.md)");
  assertNumbers(beat.units.map((u) => [u.key, u.value]), "units");

  const { subjectOf, assertGesture } = await import("./subject.mjs");
  const subject = subjectOf({ ...beat, units: beat.units.map((u) => ({ ...u, label: plain(u.label) })) });
  // The claim first: a title the data no longer supports is the refusal to read, before any the gesture raises.
  beat.check({ counts: subject.counts, total: subject.total, cuts: subject.cuts });
  assertGesture(subject);

  assertDrawsClaimColumn(subject.countries.map((c) => c.share), HERE);
  // The headline speaks in the blocks' counts, the total, or the cuts.
  assertHeadlineNumbersDrawn([beat.title].flat()[0], [...subject.counts, subject.total, ...subject.cuts], "blocks");

  // ── the words, in the shape the proof's build.mjs reads (`copyOf` there)
  const percent = (v) => wordOf("percent", beat.percent, v);
  const axisName = plain(beat.axisName).trim();
  const copy = {
    eyebrow: plain(beat.eyebrow),
    title: [beat.title].flat().map(plain),
    count: (n) => wordOf("count", beat.count, n),
    zero: percent(0),
    hundred: axisName ? [`${percent(100)}${NB}${axisName}`, percent(100)] : [percent(100)],
    cuts: subject.cuts.map(percent),
    source: [beat.source].flat().map(plain),
  };
  if (!copy.title.length || copy.title.some((t) => !t.trim())) throw new Error("title must hold at least one non-empty form (the takeaway first)");
  if (!copy.source.length || copy.source.some((t) => !t.trim())) throw new Error("source must hold at least one non-empty form");

  const { buildDirection, loadBeat, textPerRegisterOf } = await import("./build.mjs");
  const { PictogramFrame } = await import("./PictogramFrame.tsx");
  const { sceneAt } = await import("./scene.mjs");
  const { label, chosen } = pickDirection(HERE, textPerRegisterOf(copy, subject), beat.evidenceLevels ?? subject.breaks.length + 1);
  let built;
  try {
    built = buildDirection(label, chosen, loadBeat(subject, copy));
  } catch (error) {
    // The proof's layout refusals name the frame, not the beat: say what in beat.mjs moves them.
    const layout = /runs past|runs into|rises above|reaches down|no form|floor/.test(error.message);
    throw new Error(layout ? `${error.message} — shorten axisName, the count or percent words, or the source forms` : error.message);
  }
  const { props, report, direction } = built;
  console.log(`direction ${label}`);
  for (const d of direction.decisions ?? []) console.log(`  ${d.register.padEnd(8)} ${d.role.padEnd(15)} -> ${d.family}`);
  console.log(`  title form ${report.titleForm + 1} · source form ${report.sourceForm + 1} · cell ${report.cell}px, closed ${report.cellF}px · blocks ${report.rows} deep · tallest column ${report.tallest}`);
  // A square under this many pixels no longer reads as one thing counted.
  if (!(props.side >= 6)) throw new Error(`a square is ${props.side.toFixed(1)}px on the axis: ${subject.total} units stacked ${subject.tallest} high in one 5-point column do not fit the frame — draw fewer units`);

  try {
    assertEventFramesReadable(PictogramFrame, props, SIZE, label);
  } catch (error) {
    throw new Error(`${error.message} — shorten the words that frame draws (axisName, count words, title forms, source forms)`);
  }

  // What the proof's frame.test.ts held per direction, now for this data: every count text a block passes through was
  // measured, each count is its block's landed squares and ends on the block's size, and no two resting squares overlap.
  const T = props.timing;
  const last = (event) => T[event].start + T[event].duration - 1;
  const ofBlock = (b) => props.squares.filter((s) => s.block === b).length;
  for (let f = 0; f < T.total; f += 1) {
    const s = sceneAt(props, f);
    s.counters.forEach((c) => {
      if (!(c.key in props.layout.counters[c.block].words)) throw new Error(`block ${c.block}'s count shows ${c.key} at frame ${f}, a text build.mjs did not measure (a kit bug)`);
    });
  }
  const end = sceneAt(props, last("subject"));
  if (end.counters.some((c) => Number(c.key) !== ofBlock(c.block))) throw new Error("the counts do not end on the blocks' sizes (a kit bug)");
  const box = (q) => ({ x: q.x, y: q.y, w: q.side, h: q.side });
  const overlaps = (a, b) => a.x < b.x + b.w - 1e-6 && b.x < a.x + a.w - 1e-6 && a.y < b.y + b.h - 1e-6 && b.y < a.y + a.h - 1e-6;
  for (let f = T.reference.start; f < T.total; f += 2) {
    const resting = sceneAt(props, f).squares.filter((q) => q.resting && q.opacity > 0).map(box);
    for (let i = 0; i < resting.length; i++)
      for (let j = i + 1; j < resting.length; j++)
        if (overlaps(resting[i], resting[j])) throw new Error(`at frame ${f} two squares at rest overlap: for this data the blocks' columns collide — this video cannot tell it, offer the static format`);
  }

  // The proof's --look list: the last frame of every event, frame 0, and the middle of each gesture.
  const lookFrames = [
    { name: "first", frame: 0 },
    { name: "end-establish", frame: last("establish") },
    { name: "reference-sweep", frame: Math.round(T.reference.start + T.reference.duration * 0.6) },
    { name: "end-reference", frame: last("reference") },
    { name: "reveal-split", frame: Math.round(T.reveal.start + T.reveal.duration * 0.6) },
    { name: "end-reveal", frame: last("reveal") },
    { name: "subject-gather", frame: Math.round(T.subject.start + T.subject.duration * 0.4) },
    { name: "end-subject", frame: last("subject") },
    { name: "conclusion-close", frame: Math.round(T.conclusion.start + T.conclusion.duration * 0.3) },
    { name: "end-conclusion", frame: last("conclusion") },
    { name: "final", frame: T.total - 1 },
  ];
  const { wantedOf } = await import((await import("#shared/design-base/skill-script.mjs")).skillScriptFrom(HERE, "chart-video", "scripts", "video-faces.mjs"));
  await renderBeatVideo({
    Frame: PictogramFrame,
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
