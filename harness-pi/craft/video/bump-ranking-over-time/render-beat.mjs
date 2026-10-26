// The generic half of a bump VIDEO beat, taken from proof/video-bump-emitter-rank/render-directions-video.mjs with
// everything about ITS subject removed. The choreography is the worked example's and is not the model's to change: the
// title card; the rank rows, the years and the first year's names; the camera closing in on the subject's tip and
// tracking it while every line advances from the first year to the last (linear in years), each line named at its tip,
// every pass ringed as the clock reaches it; the camera pulling back to the whole chart, every line but the subject and
// the ones it passed stepping back; the whole chart again, and the credit. The timing contract and the shots are the
// proof's (timing-contract.ts, states.mjs, scene.mjs); the layout is the proof's build.mjs. ./beat.mjs — the one file
// the model writes — gives the data and the WORDS.
//
// Usage:  bun <beat>/render-beat.mjs [--size landscape|square|portrait] [--look-only]
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { videoExportSize } from "#shared/chart-video/sizes.mjs";
import { applyStoryboard, assertNumbers, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { assertEventFramesReadable, pickDirection, plain, refusing, renderBeatVideo } from "./video.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const NB = "\u00A0";
const COMPOSITION_BASE = "zone-video-bump-ranking-over-time"; // Root.tsx registers `${COMPOSITION_BASE}-${size}`

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

  const REQUIRED = ["eyebrow", "values", "subject", "tip", "title", "source", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  if (typeof beat.check !== "function") throw new Error("beat.mjs: check must be a function (see CONTRACT.md)");
  if (typeof beat.eyebrow !== "string") throw new Error("beat.mjs: eyebrow must be a string (see CONTRACT.md)");
  if (typeof beat.tip !== "function") throw new Error("beat.mjs: tip must be a function (rank) => words, such as (rank) => `India · ${rank}th` (see CONTRACT.md)");
  if (beat.end !== undefined && typeof beat.end !== "function") throw new Error("beat.mjs: end, when given, must be a function (rank, entity) => words (see CONTRACT.md)");
  if (!Array.isArray(beat.values)) throw new Error("beat.mjs: values must be an array of { entity, year, value }");

  // ── the ranking, and the passes behind the headline (./subject.mjs: the proof's derivation, its asserts as refusals)
  assertNumbers(beat.values.map((r) => [`${r.entity} ${r.year}`, r.value]));
  assertNumbers(beat.values.map((r) => [r.entity, r.year]), "years");
  // The claim first: a title the data no longer supports is the refusal to read, before any the gesture raises.
  beat.check();
  const { subjectOf } = await import("./subject.mjs");
  const subject = subjectOf(beat);
  const ranked = beat.values.filter((r) => subject.tracks.some((t) => t.entity === String(r.entity))).map((r) => r.value);
  assertDrawsClaimColumn(ranked, HERE);
  // A bump draws ranks, not values: the title's figures are ranks (8th, 3rd) or the measure, both checked by check().
  assertHeadlineNumbersDrawn(withoutYears([beat.title].flat()[0]), [...ranked, subject.from, subject.to], "values");
  const shown = new Set([subject.years[0], subject.years.at(-1)]);
  const foreign = yearsIn([beat.title].flat()[0]).filter((y) => !shown.has(y));
  if (foreign.length) throw new Error(`the title names ${foreign.join(", ")}, but the clock runs from ${subject.years[0]} to ${subject.years.at(-1)}: filter data.json's years to the ones the title compares`);

  // ── the words, in the shape the proof's build.mjs reads (`copyOf` there)
  const endOf = beat.end ?? ((rank, entity) => `${rank} ${entity}`);
  const copy = {
    eyebrow: plain(beat.eyebrow),
    title: [beat.title].flat().map(plain),
    end: (rank, entity) => wordOf("end", (r) => endOf(r, entity), rank),
    tip: (rank) => wordOf("tip", beat.tip, rank),
    name: (entity) => plain(entity),
    source: [beat.source].flat().map((f) => plain(f).replace(" · ", `${NB}· `)),
  };
  // Every word function asked once now, on every rank it can be handed.
  for (let r = 1; r <= subject.slots; r++) copy.tip(r);
  for (const t of subject.tracks) copy.end(subject.slots, t.entity);
  if (!copy.title.length || copy.title.some((t) => !t.trim())) throw new Error("title must hold at least one non-empty form (the takeaway first)");
  if (!copy.source.length || copy.source.some((t) => !t.trim())) throw new Error("source must hold at least one non-empty form");

  const { buildDirection, loadBeat, textPerRegisterOf } = await import("./build.mjs");
  const { BumpFrame } = await import("./BumpFrame.tsx");
  const { sceneAt, WINDOWS } = await import("./scene.mjs");
  const { label, chosen } = pickDirection(HERE, textPerRegisterOf(copy, subject), beat.evidenceLevels ?? 3);
  let built;
  try {
    built = buildDirection(label, chosen, loadBeat(subject, copy));
  } catch (error) {
    const layout = /run past|no credit|floor|fit/.test(error.message);
    throw new Error(layout ? `${error.message} — shorten the entities' names (map them to shorter ones in values) or the source forms` : error.message);
  }
  const { props, report, direction } = built;
  console.log(`direction ${label}`);
  for (const d of direction.decisions ?? []) console.log(`  ${d.register.padEnd(8)} ${d.role.padEnd(15)} -> ${d.family}`);
  console.log(`  title form ${report.titleForm + 1} · source form ${report.sourceForm + 1} · ${report.tracks} tracks · ${report.passes} passes · ${subject.subject} ${subject.from} → ${subject.to}, still beside it: ${[...new Set(subject.stillIn.map((p) => p.entity))].join(", ") || "none"}`);

  try {
    assertEventFramesReadable(BumpFrame, props, SIZE, label);
  } catch (error) {
    throw new Error(`${error.message} — shorten the words that frame draws (names, tip, source forms)`);
  }
  // Every rank and year the tip and the corner can show was measured in Bun (the proof's frame.test.ts, for this data).
  for (let frame = 0; frame < props.timing.total; frame += 1) {
    const scene = sceneAt(props, frame);
    const rank = props.tipRanks[scene.tipIndex];
    if (scene.tipShown > 0 && !props.tipTexts[String(rank)]) throw new Error(`the tip shows rank ${rank} at frame ${frame}, a text build.mjs did not measure (a kit bug, not a beat.mjs one)`);
    if (!props.yearTexts[String(props.firstYear + scene.tipIndex)]) throw new Error(`the corner shows ${props.firstYear + scene.tipIndex} at frame ${frame}, a year build.mjs did not measure (a kit bug, not a beat.mjs one)`);
  }

  // The proof's --look list: the last frame of every event, frame 0, and two frames of the clock.
  const T = props.timing;
  const { EVENT_ORDER, endOf: eventEnd } = await import("#shared/chart-video/timing.ts");
  const lookFrames = [
    { name: "first", frame: 0 },
    ...EVENT_ORDER.filter((e) => e !== "hold").map((event) => ({ name: `end-${event}`, frame: eventEnd(T[event]) - 1 })),
    ...[0.3, 0.6].map((t) => ({ name: `reveal-clock-${t}`, frame: Math.round(T.reveal.start + T.reveal.duration * (WINDOWS.reveal.clock[0] + t * (WINDOWS.reveal.clock[1] - WINDOWS.reveal.clock[0]))) })),
    { name: "final", frame: T.total - 1 },
  ];
  const { wantedOf } = await import((await import("#shared/design-base/skill-script.mjs")).skillScriptFrom(HERE, "chart-video", "scripts", "video-faces.mjs"));
  await renderBeatVideo({
    Frame: BumpFrame,
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
