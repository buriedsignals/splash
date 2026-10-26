// The generic half of a small-multiples VIDEO beat, taken from
// proof/video-small-multiples-lowcarbon/render-directions-video.mjs with everything about ITS subject removed. The
// choreography is the worked example's and is not the model's to change: every first-state bar growing side by side in
// one row; the row cut into one panel each, in alphabetical order (which hides the pattern); panel after panel a copy of
// the first bar sliding out and rising to the second state, the gain counting; every added part dropping to the
// baseline; the panels re-sorting by their first value; the added parts climbing back, the largest and the smallest gain
// ringed, the credit. The timing contract and the shots are the proof's (timing-contract.ts, states.mjs, scene.mjs); the
// layout is the proof's build.mjs. ./beat.mjs — the one file the model writes — gives the data and the WORDS.
//
// Usage:  bun <beat>/render-beat.mjs [--size landscape|square|portrait] [--look-only]
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { videoExportSize } from "#shared/chart-video/sizes.mjs";
import { EVENT_ORDER, endOf } from "#shared/chart-video/timing.ts";
import { applyStoryboard, assertNumbers, assertLegibleLabels, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { assertEventFramesReadable, pickDirection, plain, refusing, renderBeatVideo, storyLanguage } from "./video.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const COMPOSITION_BASE = "zone-video-small-multiples"; // Root.tsx registers `${COMPOSITION_BASE}-${size}`

await refusing(HERE, async () => {
  const SIZE = videoExportSize();
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);

  const REQUIRED = ["eyebrow", "panels", "states", "ceiling", "unit", "title", "source", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  if (typeof beat.check !== "function") throw new Error("beat.mjs: check must be a function (see CONTRACT.md)");
  if (typeof beat.eyebrow !== "string") throw new Error("beat.mjs: eyebrow must be a string (see CONTRACT.md)");
  if (!beat.states || typeof beat.states.from !== "string" || typeof beat.states.to !== "string") throw new Error('beat.mjs: states must be { from: "2000", to: "2024" } — two strings');
  if (beat.foldNote !== undefined && typeof beat.foldNote !== "function") throw new Error("beat.mjs: foldNote must be a function (drawn, all) => text, or left out");
  if (!Array.isArray(beat.panels)) throw new Error("beat.mjs: panels must be an array of { name, from, to }");
  assertNumbers(beat.panels.flatMap((p) => [[`${p.name}.from`, p.from], [`${p.name}.to`, p.to]]), "panels");

  // The claim first: a title the data no longer supports is the refusal to read, before any the gesture raises.
  beat.check();
  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";
  const { subjectOf } = await import("./subject.mjs");
  const subject = subjectOf({ ...beat, panels: beat.panels.map((p) => ({ ...p, name: plain(p.name) })) }, lang);
  const { countText } = await import("./scene.mjs");
  const values = subject.rows.flatMap((r) => [r.from, r.to]);
  const gains = subject.rows.map((r) => r.delta);
  // Each panel's gain is counted in whole units («+74»): gains under one unit, or gains that round alike, read as one.
  assertLegibleLabels(gains, (v) => countText(Math.round(v)));
  assertDrawsClaimColumn(values, HERE);
  assertHeadlineNumbersDrawn([beat.title].flat()[0], [...values, ...gains.map(Math.round), subject.rows.length], "panels");

  // ── the words, in the shape the proof's build.mjs reads (`copyOf` there)
  const forms = (v) => [v].flat().map((t) => plain(String(t)));
  const copy = {
    eyebrow: plain(beat.eyebrow),
    title: forms(beat.title),
    unit: forms(beat.unit),
    key: [plain(beat.states.from), plain(beat.states.to)],
    source: forms(beat.source),
    // When the frame cannot hold every panel it draws fewer and says how many: the beat's foldNote, or the count.
    drawn: (drawn, total) => (beat.foldNote ? forms(beat.foldNote(drawn, total)) : [`${drawn}/${total}`]),
  };
  for (const [field, list] of [["title", copy.title], ["unit", copy.unit], ["source", copy.source]])
    if (!list.length || list.some((t) => !t.trim())) throw new Error(`${field} must hold at least one non-empty form, longest first`);

  const { buildDirection, loadBeat, textPerRegisterOf } = await import("./build.mjs");
  const { SmallMultiplesFrame } = await import("./SmallMultiplesFrame.tsx");
  const { WINDOWS } = await import("./scene.mjs");
  const { label, chosen } = pickDirection(HERE, textPerRegisterOf(copy, subject), beat.evidenceLevels ?? 4);
  let built;
  try {
    built = buildDirection(label, chosen, loadBeat(subject, copy));
  } catch (error) {
    const layout = /no number of panels|do not fit|floor|run past/.test(error.message);
    throw new Error(layout ? `${error.message} — shorten the panel names, the unit forms or the source forms, or draw fewer panels` : error.message);
  }
  const { props, report, direction } = built;
  console.log(`direction ${label}`);
  for (const d of direction.decisions ?? []) console.log(`  ${d.register.padEnd(8)} ${d.role.padEnd(15)} -> ${d.family}`);
  console.log(`  title form ${report.titleForm + 1} · source form ${report.sourceForm + 1} · unit form ${report.unitForm + 1} · panel ${report.panel} · ${report.drawn} of ${report.total} drawn · correlation ${subject.correlation.toFixed(2)} · rings ${subject.rings.join(", ")}`);

  try {
    assertEventFramesReadable(SmallMultiplesFrame, props, SIZE, label);
  } catch (error) {
    throw new Error(`${error.message} — shorten the words that frame draws (panel names, unit, title forms, source forms)`);
  }

  // The proof's --look list: the last frame of every event, frame 0, and the middle of each gesture.
  const T = props.timing;
  const mid = (event, [a, b]) => Math.round(T[event].start + (T[event].duration * (a + b)) / 2);
  const lookFrames = [
    { name: "first", frame: 0 },
    ...EVENT_ORDER.filter((e) => e !== "hold").map((event) => ({ name: `end-${event}`, frame: endOf(T[event]) - 1 })),
    { name: "reference-row", frame: mid("reference", [WINDOWS.reference.level[1], WINDOWS.reference.cut[0]]) },
    { name: "reference-cut", frame: mid("reference", WINDOWS.reference.cut) },
    { name: "reveal-grow", frame: mid("reveal", WINDOWS.reveal.grow) },
    ...["detach", "reorder"].map((f) => ({ name: `subject-${f}`, frame: mid("subject", WINDOWS.subject[f]) })),
    { name: "conclusion-back", frame: mid("conclusion", WINDOWS.conclusion.back) },
    { name: "final", frame: T.total - 1 },
  ].sort((a, b) => a.frame - b.frame);
  const { wantedOf } = await import((await import("#shared/design-base/skill-script.mjs")).skillScriptFrom(HERE, "chart-video", "scripts", "video-faces.mjs"));
  await renderBeatVideo({
    Frame: SmallMultiplesFrame,
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
