// The generic half of a waterfall (bridge) VIDEO beat, taken from
// proof/video-waterfall-germany-electricity-bridge/render-directions-video.mjs with everything about ITS subject removed.
// The choreography is the worked example's and is not the model's to change: the opening total growing from zero and a
// copy sliding across to the closing slot; seams cutting both into their three members, the names beside the opening;
// the copy's members going to their closing lengths, its total counting; the names riding to their slots and, in the
// order the bridge walks them, each gained or lost part lighting up and sliding onto the running total; the seams
// closing, the net change bracketed between the totals, the credit. The timing contract and the shots are the proof's
// (timing-contract.ts, states.mjs, scene.mjs); the layout is the proof's build.mjs. ./beat.mjs — the one file the model
// writes — gives the data and the WORDS.
//
// Usage:  bun <beat>/render-beat.mjs [--size landscape|square|portrait] [--look-only]
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { videoExportSize } from "#shared/chart-video/sizes.mjs";
import { EVENT_ORDER, endOf } from "#shared/chart-video/timing.ts";
import { applyStoryboard, assertNumbers, assertLegibleLabels, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { assertEventFramesReadable, numberFormat, pickDirection, plain, refusing, renderBeatVideo, storyLanguage } from "./video.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const NB = " ";
const COMPOSITION_BASE = "zone-video-waterfall-bridge"; // Root.tsx registers `${COMPOSITION_BASE}-${size}`

await refusing(HERE, async () => {
  const SIZE = videoExportSize();
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);

  const REQUIRED = ["eyebrow", "members", "states", "unit", "title", "source", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  if (typeof beat.check !== "function") throw new Error("beat.mjs: check must be a function (see CONTRACT.md)");
  for (const field of ["eyebrow", "unit"]) if (typeof beat[field] !== "string") throw new Error(`beat.mjs: ${field} must be a string (see CONTRACT.md)`);
  if (!beat.states || typeof beat.states.from !== "string" || typeof beat.states.to !== "string") throw new Error('beat.mjs: states must be { from: "2015", to: "2024" } — two strings');
  if (!Array.isArray(beat.members)) throw new Error("beat.mjs: members must be an array of { name, from, to }");
  assertNumbers(beat.members.flatMap((m) => [[`${m.name}.from`, m.from], [`${m.name}.to`, m.to]]), "members");

  // The claim first: a title the data no longer supports is the refusal to read, before any the gesture raises.
  beat.check();
  const { subjectOf } = await import("./subject.mjs");
  const subject = subjectOf({ ...beat, members: beat.members.map((m) => ({ ...m, name: plain(m.name) })) });
  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";
  const { decimal } = numberFormat({ lang, max: 1, decimal: beat.decimal });
  const { valueText } = await import("./build.mjs");
  const changes = subject.members.map((m) => m.change);
  const values = subject.members.flatMap((m) => [m.from, m.to]);
  // Every value prints to the tenth: changes that print alike read as one.
  assertLegibleLabels(changes, (v) => valueText(v, true, decimal));
  assertDrawsClaimColumn(values, HERE);
  assertHeadlineNumbersDrawn([beat.title].flat()[0], [...changes.map(Math.abs), subject.opening, subject.closing, Math.abs(subject.net)], "steps");

  // ── the words, in the shape the proof's build.mjs reads (`copyOf` there)
  const forms = (v) => [v].flat().map((t) => plain(String(t)));
  const unitWord = plain(beat.unit).trim();
  const copy = {
    eyebrow: plain(beat.eyebrow),
    title: forms(beat.title),
    years: [plain(beat.states.from), plain(beat.states.to)],
    bracket: (v) => (unitWord ? `${valueText(v, false, decimal)}${NB}${unitWord}` : valueText(v, false, decimal)),
    decimal,
    source: forms(beat.source),
  };
  for (const [field, list] of [["title", copy.title], ["source", copy.source]])
    if (!list.length || list.some((t) => !t.trim())) throw new Error(`${field} must hold at least one non-empty form, longest first`);

  const { buildDirection, loadBeat, textPerRegisterOf } = await import("./build.mjs");
  const { WaterfallFrame } = await import("./WaterfallFrame.tsx");
  const { label, chosen } = pickDirection(HERE, textPerRegisterOf(copy, subject), beat.evidenceLevels ?? 3);
  let built;
  try {
    built = buildDirection(label, chosen, loadBeat(subject, copy));
  } catch (error) {
    const layout = /does not hold|runs into|runs off|rises above|taller than|floor/.test(error.message);
    throw new Error(layout ? `${error.message} — shorten the member names, the states' words or the source forms (a member too thin in the opening total to carry its name needs a shorter name, or the columns grouped differently)` : error.message);
  }
  const { props, report, direction } = built;
  console.log(`direction ${label}`);
  for (const d of direction.decisions ?? []) console.log(`  ${d.register.padEnd(8)} ${d.role.padEnd(15)} -> ${d.family}`);
  console.log(`  title form ${report.titleForm + 1} · source form ${report.sourceForm + 1} · ${+subject.opening.toPrecision(5)} → ${+subject.closing.toPrecision(5)} (net ${+subject.net.toPrecision(4)}) · slot ${report.slotW}px`);

  try {
    assertEventFramesReadable(WaterfallFrame, props, SIZE, label);
  } catch (error) {
    throw new Error(`${error.message} — shorten the words that frame draws (member names, title forms, source forms)`);
  }

  // The proof's --look list: the last frame of every event, frame 0, and the middle of each gesture.
  const T = props.timing;
  const lookFrames = [
    { name: "first", frame: 0 },
    ...EVENT_ORDER.filter((e) => e !== "hold").map((event) => ({ name: `end-${event}`, frame: endOf(T[event]) - 1 })),
    { name: "reference-carry", frame: Math.round(T.reference.start + T.reference.duration * 0.78) },
    { name: "reveal-morphing", frame: Math.round(T.reveal.start + T.reveal.duration * 0.6) },
    { name: "subject-sliding", frame: Math.round(T.subject.start + T.subject.duration * 0.45) },
    { name: "subject-landing", frame: Math.round(T.subject.start + T.subject.duration * 0.75) },
    { name: "conclusion-bracket", frame: Math.round(T.conclusion.start + T.conclusion.duration * 0.4) },
    { name: "final", frame: T.total - 1 },
  ].sort((a, b) => a.frame - b.frame);
  const { wantedOf } = await import((await import("#shared/design-base/skill-script.mjs")).skillScriptFrom(HERE, "chart-video", "scripts", "video-faces.mjs"));
  await renderBeatVideo({
    Frame: WaterfallFrame,
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
