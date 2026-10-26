// The generic half of a heatmap-matrix VIDEO beat, taken from
// proof/video-heatmap-europe-electricity/render-directions-video.mjs with everything about ITS subject removed. The
// choreography is the worked example's and is not the model's to change: row after row each row's whole grows as one bar
// of 100 % across the grid over a dashed floor line, its measured columns in the accent, the others in a neutral, the rows
// past the floor counted; every bar splits, each segment folding into its column's cell and taking its class's colour, the
// heads, families, measure column, bracket and key coming in; the rows below the floor step back, the rows past it reorder
// by route and part into blocks, one bracket a route, named, and the ringed column of those rows outlined; then everything
// returns to rank order, the credit. The timing contract and the shots are the proof's (timing-contract.ts, states.mjs,
// scene.mjs); the layout is the proof's build.mjs. ./beat.mjs — the one file the model writes — gives the data and the WORDS.
//
// Usage:  bun <beat>/render-beat.mjs [--look-only]       (landscape only)
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { videoExportSize } from "#shared/chart-video/sizes.mjs";
import { EVENT_ORDER, endOf } from "#shared/chart-video/timing.ts";
import { skillScriptFrom } from "#shared/design-base/skill-script.mjs";
import { applyStoryboard, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { assertEventFramesReadable, numberFormat, pickDirection, plain, refusing, renderBeatVideo, storyLanguage } from "./video.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const NB = " ";
const COMPOSITION_BASE = "zone-video-heatmap-matrix"; // Root.tsx registers `${COMPOSITION_BASE}-${size}`

/** A word function of beat.mjs, called the way the frame calls it: a throw or a non-string names the field. */
const wordOf = (field, fn) => (...args) => {
  let out;
  try {
    out = fn(...args);
  } catch (error) {
    throw new Error(`beat.mjs: ${field}(${args.map((a) => JSON.stringify(a)).join(", ")}) threw: ${error.message}`);
  }
  if (typeof out !== "string" || !out.trim()) throw new Error(`beat.mjs: ${field}(${args.map((a) => JSON.stringify(a)).join(", ")}) must return a non-empty string, got ${JSON.stringify(out)}`);
  return plain(out);
};

await refusing(HERE, async () => {
  const SIZE = videoExportSize();
  // The proof's narrow-frame rungs merged ITS nine sources by name; for a story's columns there is no such rule yet.
  if (SIZE !== "landscape") throw new Error(`the heatmap video kit renders at landscape only (asked: ${SIZE}): render the video at landscape, or use the static or web format`);
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);

  const REQUIRED = ["eyebrow", "heads", "measured", "rows", "floor", "routes", "ring", "valueHead", "count", "title", "source", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const fn of ["count", "check"]) if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);
  for (const field of ["eyebrow", "valueHead"]) if (typeof beat[field] !== "string" || !beat[field].trim()) throw new Error(`beat.mjs: ${field} must be a non-empty string (see CONTRACT.md)`);
  for (const field of ["heads", "rows", "routes"]) if (!Array.isArray(beat[field])) throw new Error(`beat.mjs: ${field} must be an array (see CONTRACT.md)`);
  const keys = beat.rows.map((r) => String(r.key));
  if (new Set(keys).size !== keys.length) throw new Error("rows holds the same key twice: give each row ONE set of cells (filter data.json to one year)");
  // The claim first: a title the data no longer supports is the refusal to read, before any the gesture raises.
  beat.check();
  const { subjectOf } = await import("./subject.mjs");
  const subject = subjectOf({
    ...beat,
    heads: beat.heads.map((h) => ({ ...h, label: plain(h.label), family: plain(h.family) })),
    measured: [beat.measured].flat().map(plain),
    rows: beat.rows.map((r) => ({ ...r, key: plain(r.key), label: plain(r.label) })),
    routes: beat.routes.map((r) => ({ ...r, name: plain(r.name), keys: [r.keys].flat().map(plain) })),
  });

  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";
  const format = numberFormat({ lang, max: 100, decimals: 1, decimal: beat.decimal });
  const percent = (v) => `${v.toFixed(1).replace(".", format.decimal)}${NB}%`;
  const measures = subject.rows.map((r) => r.lowCarbon);
  if (new Set(measures.map(percent)).size < measures.length * 0.75) throw new Error("the measure column prints too many rows alike at one decimal: the rows are not told apart");
  assertDrawsClaimColumn(subject.rows.flatMap((r) => r.shares), HERE);
  // The title may state the count past the floor, the floor itself, or a row's measure — all drawn.
  assertHeadlineNumbersDrawn([beat.title].flat()[0], [subject.above, subject.floor, ...measures], "cells");

  // ── the words, in the shape the proof's build.mjs reads (`copyOf` there)
  const count = wordOf("count", beat.count);
  const breaks = subject.breaks;
  const copy = {
    eyebrow: plain(beat.eyebrow),
    title: [beat.title].flat().map(plain),
    count,
    floor: `${String(subject.floor).replace(".", format.decimal)}${NB}%`,
    share: percent,
    shareHead: plain(beat.valueHead),
    breaks: breaks.map((b, i) => (i === breaks.length - 1 ? `${b}${NB}%` : String(b))),
    routes: subject.routeNames,
    families: [...new Set(subject.columns.map((c) => c.family))],
    source: [beat.source].flat().map(plain),
    names: subject.rows.map((r) => r.label),
  };
  if (!copy.title.length || copy.title.some((t) => !t.trim())) throw new Error("title must hold at least one non-empty form (the takeaway first)");
  if (!copy.source.length || copy.source.some((t) => !t.trim())) throw new Error("source must hold at least one non-empty form");

  const { buildDirection, loadBeat, textPerRegisterOf } = await import("./build.mjs");
  const { HeatmapFrame } = await import("./HeatmapFrame.tsx");
  const { label, chosen } = pickDirection(HERE, textPerRegisterOf(copy, subject), beat.evidenceLevels ?? 2);
  let built;
  try {
    built = buildDirection(label, chosen, loadBeat(subject, copy));
  } catch (error) {
    const layout = /do not stand a word apart|runs off the frame|too short to carry|collide|the key is/.test(error.message);
    throw new Error(layout ? `${error.message} — shorten the head labels, family names, row labels, route names or count()'s words, add a shorter source form, or draw fewer rows or columns` : error.message);
  }
  const { props, report, direction } = built;
  console.log(`direction ${label}`);
  for (const d of direction.decisions ?? []) console.log(`  ${d.register.padEnd(8)} ${d.role.padEnd(15)} -> ${d.family}`);
  console.log(`  title form ${report.titleForm + 1} · source form ${report.sourceForm + 1} · cell ${report.cell} · ${report.headLines} head line(s) · ${subject.above} past the floor in ${subject.routeNames.length} routes`);

  try {
    assertEventFramesReadable(HeatmapFrame, props, SIZE, label);
  } catch (error) {
    throw new Error(`${error.message} — shorten the words that frame draws (row labels, heads, families, route names, title forms, source forms)`);
  }
  const { sceneAt } = await import("./scene.mjs");
  for (let frame = 0; frame < props.timing.total; frame += 1) {
    const s = sceneAt(props, frame);
    if (s.counting && !props.counter.texts[String(s.count)]) throw new Error(`the count shows ${s.count} at frame ${frame}, a text build.mjs did not measure (a kit bug)`);
  }
  if (sceneAt(props, endOf(props.timing.reference) - 1).count !== subject.above) throw new Error(`the count does not reach ${subject.above} by the end of the reference (a kit bug)`);

  const T = props.timing;
  const lookFrames = [
    { name: "first", frame: 0 },
    { name: "reference-growing", frame: Math.round(T.reference.start + T.reference.duration * 0.45) },
    { name: "reveal-splitting", frame: Math.round(T.reveal.start + T.reveal.duration * 0.4) },
    { name: "subject-parting", frame: Math.round(T.subject.start + T.subject.duration * 0.5) },
    ...EVENT_ORDER.map((event) => ({ name: event === "hold" ? "final" : `end-${event}`, frame: Math.min(endOf(T[event]), T.total) - 1 })),
  ].sort((a, b) => a.frame - b.frame);
  const { wantedOf } = await import(skillScriptFrom(HERE, "chart-video", "scripts", "video-faces.mjs"));
  await renderBeatVideo({
    Frame: HeatmapFrame,
    here: HERE,
    label,
    composition: `${COMPOSITION_BASE}-${SIZE}`,
    size: SIZE,
    props,
    wanted: wantedOf(props.registers),
    lookFrames,
    lookOnly: process.argv.includes("--look-only"),
  });
});
