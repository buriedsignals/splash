// The generic half of a streamgraph VIDEO beat, taken from
// proof/video-streamgraph-swiss-electricity/render-directions-video.mjs with everything about ITS subject removed. The
// choreography is the worked example's and is not the model's to change: the stream drawn from the first year to the
// last; the giants (the bands that hold every rank above the race) closing to nothing, the small bands gathering on the
// same scale; the small stream magnified to the frame; the small bands turned into lines from zero; a cursor travelling
// the years, the tracked band's rank riding its line, the year it reaches the rank marked once passed; then the stream
// back and the credit. The timing contract and the shots are the proof's (timing-contract.ts, states.mjs, scene.mjs);
// the layout is the proof's build.mjs. ./beat.mjs — the one file the model writes — gives the data and the WORDS.
//
// Usage:  bun <beat>/render-beat.mjs [--size landscape|square|portrait] [--look-only]
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { videoExportSize } from "#shared/chart-video/sizes.mjs";
import { EVENT_ORDER, endOf } from "#shared/chart-video/timing.ts";
import { applyStoryboard, assertNumbers, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { assertEventFramesReadable, pickDirection, plain, refusing, renderBeatVideo } from "./video.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const COMPOSITION_BASE = "zone-video-streamgraph"; // Root.tsx registers `${COMPOSITION_BASE}-${size}`

await refusing(HERE, async () => {
  const SIZE = videoExportSize();
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);

  const REQUIRED = ["eyebrow", "keys", "labels", "tracked", "rank", "readings", "rankLabel", "title", "source", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const field of ["check", "rankLabel"]) if (typeof beat[field] !== "function") throw new Error(`beat.mjs: ${field} must be a function (see CONTRACT.md)`);
  if (typeof beat.eyebrow !== "string") throw new Error("beat.mjs: eyebrow must be a string (see CONTRACT.md)");
  if (!Array.isArray(beat.keys)) throw new Error("beat.mjs: keys must be an array of data.json column names");
  const unnamed = beat.keys.filter((k) => typeof beat.labels?.[k] !== "string" || !beat.labels[k].trim());
  if (unnamed.length) throw new Error(`labels has no name for ${unnamed.join(", ")}: give { key: name } for EVERY key, in the story's language`);
  if (!Array.isArray(beat.readings)) throw new Error("beat.mjs: readings must be an array of { year, <key>: value }");
  assertNumbers(beat.readings.flatMap((r) => [[`${r.year}.year`, r.year], ...beat.keys.map((k) => [`${r.year}.${k}`, r[k]])]), "readings");

  // The claim first: a title the data no longer supports is the refusal to read, before any the gesture raises.
  beat.check();
  const { subjectOf } = await import("./subject.mjs");
  const subject = subjectOf(beat);
  console.log(`${subject.tracked} reaches rank ${beat.rank} in ${subject.reachedAt}, past ${subject.rival}; set aside: ${subject.giants.join(", ")}`);
  const values = subject.readings.flatMap((r) => subject.keys.map((k) => r[k]));
  assertDrawsClaimColumn(values, HERE);
  // The title states the year and the rank — the mark and the rank the race draws.
  assertHeadlineNumbersDrawn([beat.title].flat()[0], [...new Set(subject.ranks.map((r) => r.rank)), subject.reachedAt], "bands");
  // The headline guard leaves years out; the race marks ONE year, so a year the title names inside the readings (other
  // than their first and last) must be that one.
  const [firstYear, lastYear] = [subject.readings[0].year, subject.readings.at(-1).year];
  const named = [...String([beat.title].flat()[0]).matchAll(/(?<!\d)(\d{4})(?!\d)/g)].map((m) => Number(m[1])).filter((y) => y > firstYear && y < lastYear);
  const wrong = named.filter((y) => y !== subject.reachedAt);
  if (wrong.length) throw new Error(`the title names ${wrong.join(", ")}, but ${subject.tracked} first reaches rank ${beat.rank} in ${subject.reachedAt} — the year the video marks: the readings are probably not the takeaway's, or check() does not test the year`);

  // ── the words, in the shape the proof's build.mjs reads (`copyOf` there)
  const forms = (v) => [v].flat().map((t) => plain(String(t)));
  const rankText = (count) => {
    const t = beat.rankLabel(count);
    if (typeof t !== "string" || !t.trim()) throw new Error(`beat.mjs: rankLabel(${count}) must return a non-empty string`);
    return plain(t);
  };
  const copy = {
    eyebrow: plain(beat.eyebrow),
    title: forms(beat.title),
    rank: rankText,
    names: Object.fromEntries(subject.giants.map((k) => [k, plain(beat.labels[k])])),
    rival: plain(beat.labels[subject.rival]),
    mark: String(subject.reachedAt),
    source: forms(beat.source),
  };
  for (const [field, list] of [["title", copy.title], ["source", copy.source]])
    if (!list.length || list.some((t) => !t.trim())) throw new Error(`${field} must hold at least one non-empty form, longest first`);
  const shown = [...new Set(subject.ranks.map((r) => r.rank))];
  if (shown.length > 1 && new Set(shown.map(rankText)).size !== shown.length) throw new Error(`rankLabel prints the same text for the ranks ${shown.join(", ")}: print the number it is handed`);

  const { buildDirection, loadBeat, textPerRegisterOf } = await import("./build.mjs");
  const { StreamFrame } = await import("./StreamFrame.tsx");
  const { WINDOWS } = await import("./scene.mjs");
  const { label, chosen } = pickDirection(HERE, textPerRegisterOf(copy, subject), beat.evidenceLevels ?? 3);
  let built;
  try {
    built = buildDirection(label, chosen, loadBeat(subject, copy));
  } catch (error) {
    const layout = /does not fit|would meet|thinned|floor/.test(error.message);
    throw new Error(layout ? `${error.message} — shorten the labels of the giants and the rival, rankLabel, or the source forms` : error.message);
  }
  const { props, report, direction } = built;
  console.log(`direction ${label}`);
  for (const d of direction.decisions ?? []) console.log(`  ${d.register.padEnd(8)} ${d.role.padEnd(15)} -> ${d.family}`);
  console.log(`  title form ${report.titleForm + 1} · source form ${report.sourceForm + 1} · marked ${report.reachedAt}`);

  try {
    assertEventFramesReadable(StreamFrame, props, SIZE, label);
  } catch (error) {
    throw new Error(`${error.message} — shorten the words that frame draws (labels, rankLabel, title forms, source forms)`);
  }

  // The proof's --look list: the last frame of every event, frame 0, and the middle of each gesture.
  const T = props.timing;
  const lookFrames = [
    { name: "first", frame: 0 },
    ...EVENT_ORDER.filter((e) => e !== "hold").map((event) => ({ name: `end-${event}`, frame: endOf(T[event]) - 1 })),
    { name: "reveal-flow-0.5", frame: Math.round(T.reveal.start + T.reveal.duration * (WINDOWS.reveal.flow[0] + 0.5 * (WINDOWS.reveal.flow[1] - WINDOWS.reveal.flow[0]))) },
    ...["aside", "magnify", "lines"].map((field) => ({ name: `subject-${field}`, frame: Math.round(T.subject.start + T.subject.duration * WINDOWS.subject[field][1]) })),
    ...[0.3, 0.7].map((t) => ({ name: `subject-race-${t}`, frame: Math.round(T.subject.start + T.subject.duration * (WINDOWS.subject.race[0] + t * (WINDOWS.subject.race[1] - WINDOWS.subject.race[0]))) })),
    { name: "conclusion-release", frame: Math.round(T.conclusion.start + T.conclusion.duration * 0.4) },
    { name: "final", frame: T.total - 1 },
  ].sort((a, b) => a.frame - b.frame);
  const { wantedOf } = await import((await import("#shared/design-base/skill-script.mjs")).skillScriptFrom(HERE, "chart-video", "scripts", "video-faces.mjs"));
  await renderBeatVideo({
    Frame: StreamFrame,
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
