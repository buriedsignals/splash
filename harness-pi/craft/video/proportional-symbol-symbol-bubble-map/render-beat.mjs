// The generic half of a proportional symbol VIDEO beat, taken from
// proof/video-proportional-symbol-europe-capacity/render-directions-video.mjs with everything about ITS subject removed.
// The choreography is the worked example's and is not the model's to change: the title card; the live MapTiler map of
// Europe and the key's two named circles; the largest sites arriving ONE BY ONE, largest first, each a circle whose
// area is its value, while the count climbs — how many, and what share of the whole they carry; then every other site
// at once as a faint point, with its count and share; the credit. The timing contract, the states, the plan and the
// layout are the proof's; ./beat.mjs — the one file the model writes — gives the sites and the WORDS.
//
// The live map is measured once per plan (map-video.mjs `measureMap` → measured.json beside the beat) and rendered
// through the local key proxy (`renderMapVideo`); the key never leaves this process.
//
// Usage:  bun <beat>/render-beat.mjs [--size landscape|square|portrait] [--look-only]
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { sizeFor, videoExportSize } from "#shared/chart-video/sizes.mjs";
import { skillScriptFrom } from "#shared/design-base/skill-script.mjs";
import { applyStoryboard, assertDrawsClaimColumn, assertHeadlineNumbersDrawn } from "./guards.mjs";
import { mapTilerKey, measureMap, renderMapVideo } from "./map-video.mjs";
import { assertEventFramesReadable, pickDirection, plain, refusing } from "./video.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const NB = " ";
const COMPOSITION_BASE = "zone-video-proportional-symbol-symbol-bubble-map"; // Root.tsx registers `${COMPOSITION_BASE}-${size}`
const r1 = (v) => Math.round(v * 10) / 10;

await refusing(HERE, async () => {
  const SIZE = videoExportSize();
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);

  const REQUIRED = ["eyebrow", "title", "symbols", "count", "rest", "figure", "source", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const field of ["count", "rest", "figure", "check"]) if (typeof beat[field] !== "function") throw new Error(`beat.mjs: ${field} must be a function (see CONTRACT.md)`);
  if (typeof beat.eyebrow !== "string") throw new Error("beat.mjs: eyebrow must be a string (see CONTRACT.md)");

  // ── the claim first, then what the gesture can show (./subject.mjs)
  const { readingOf, subjectOf } = await import("./subject.mjs");
  const reading = readingOf(beat);
  beat.check(reading.helpers);
  const subject = subjectOf(reading, beat);
  const TOP = subject.TOP;
  assertDrawsClaimColumn(subject.stations.map((s) => s.mw), HERE);
  assertHeadlineNumbersDrawn([beat.title].flat()[0], [TOP, subject.total - TOP, r1(subject.shareTop), r1(100 - subject.shareTop), ...subject.ranked.slice(0, TOP).map((s) => s.mw)], "circles");

  // ── the words, in the shape the proof's copyOf returned
  const words = (t) => plain(t).replace(/[  ]/g, NB);
  /** The top count after `k` circles: whole percents while it climbs, one decimal at the last (the proof's rule). */
  const shareAfter = (k) => (k === TOP ? r1(subject.cumulative[k - 1]) : k === 0 ? 0 : Math.round(subject.cumulative[k - 1]));
  const top = (k) => words(beat.count(k, shareAfter(k), k === TOP));
  const restShare = r1(100 - subject.shareTop);
  const copy = {
    eyebrow: words(beat.eyebrow),
    title: [beat.title].flat().map(words),
    top,
    rest: words(beat.rest(subject.total - TOP, restShare)),
    key: subject.keyValues.map((v) => words(beat.figure(v))),
    source: [beat.source].flat().map(words).map((f) => f.replaceAll(" · ", `${NB}· `)),
    TOP,
  };
  for (const [k, text] of [[TOP, top(TOP)], [0, top(0)]]) if (!text.includes(String(k))) throw new Error(`count(${k}, …) returned ${JSON.stringify(text)}: it must print the number of circles it is given`);
  if (!/\d/.test(copy.rest)) throw new Error(`rest(…) returned ${JSON.stringify(copy.rest)}: it must print the count and the share it is given`);
  if (!copy.title.length || copy.title.some((t) => !t.trim())) throw new Error("title must hold at least one non-empty form (the takeaway first)");
  if (!copy.source.length || copy.source.some((t) => !/MapTiler/.test(t)))
    throw new Error("every form of source must carry the basemap's attribution « © MapTiler © OpenStreetMap » (the map is MapTiler's): add it to each form");

  const { buildDirection, loadBeat, textPerRegisterOf } = await import("./build.mjs");
  const { SymbolFrame } = await import("./SymbolFrame.tsx");
  const { mapStateAt, WINDOWS } = await import("./scene.mjs");
  const { MEASURED_FRAMES } = await import("./measure.mjs");
  const { EVENT_ORDER, endOf } = await import("#shared/chart-video/timing.ts");
  const loaded = loadBeat(subject, copy);
  const { label: id, chosen } = pickDirection(HERE, textPerRegisterOf(copy), beat.evidenceLevels ?? 2);
  const out = SIZE === "landscape" ? id : `${id}-${SIZE}`;
  const hint = (error) => {
    const layout = /finds no place|open sea|ground band|floor|no form of the source|holds .*px of content/.test(error.message);
    return new Error(layout ? `${error.message} — shorten count, rest or figure's words, or add a shorter source form (keeping MapTiler) last` : error.message);
  };

  let planOnly;
  try {
    planOnly = buildDirection(id, chosen, loaded, { measured: null });
  } catch (error) {
    throw hint(error);
  }
  const key = mapTilerKey(HERE);
  const measuredStates = Object.fromEntries(Object.entries(MEASURED_FRAMES).map(([name, frameOf]) => [name, mapStateAt(planOnly.props, frameOf(planOnly.props.timing))]));
  const measured = await measureMap({ here: HERE, label: id, plan: planOnly.props.mapPlan, states: measuredStates, seats: loaded.mapSeats, size: { name: SIZE, ...sizeFor(SIZE) }, key });
  let built;
  try {
    built = buildDirection(id, chosen, loaded, { measured: measured[SIZE] });
  } catch (error) {
    throw hint(error);
  }
  const { props, report, direction } = built;
  console.log(`direction ${id}`);
  for (const d of direction.decisions ?? []) console.log(`  ${d.register.padEnd(8)} ${d.role.padEnd(15)} -> ${d.family}`);
  console.log(`  title form ${report.titleForm + 1} · source « ${report.sourceText} » · ${TOP} circles carry ${r1(subject.shareTop)} % · key ${subject.keyValues.join(" / ")} · ${report.layers} layers`);

  const FrameNoMap = (p) => createElement(SymbolFrame, { ...p, liveMap: () => null });
  try {
    assertEventFramesReadable(FrameNoMap, props, SIZE, out);
  } catch (error) {
    throw new Error(`${error.message} — shorten the words that frame draws (count, rest, figure, title forms, source forms)`);
  }
  // Every count the climbing row shows was measured in Bun (the proof's frame.test.ts, for this data).
  for (let frame = 0; frame < props.timing.total; frame += 1) {
    const { arrived } = (await import("./scene.mjs")).sceneAt(props, frame);
    if (!(String(arrived) in props.legend.topTexts)) throw new Error(`the count shows ${arrived} circles at frame ${frame}, a text build.mjs did not measure (a kit bug)`);
  }

  // The proof's --look list: the last frame of every event, and the circles mid-arrival.
  const T = props.timing;
  const mid = (event, [a, b]) => Math.round(T[event].start + (T[event].duration * (a + b)) / 2);
  const lookFrames = [
    ...EVENT_ORDER.map((event) => ({ name: event === "hold" ? "final" : `end-${event}`, frame: Math.min(endOf(T[event]), T.total) - 1 })),
    { name: "reveal-arriving", frame: mid("reveal", WINDOWS.reveal.top) },
  ].sort((a, b) => a.frame - b.frame);
  const { wantedOf } = await import(skillScriptFrom(HERE, "map-beat", "scripts", "video-faces.mjs"));
  await renderMapVideo({
    here: HERE,
    label: out,
    composition: `${COMPOSITION_BASE}-${SIZE}`,
    size: { name: SIZE, ...sizeFor(SIZE) },
    props,
    wanted: wantedOf(props.registers),
    lookFrames,
    lookOnly: process.argv.includes("--look-only"),
    key,
    Frame: FrameNoMap,
  });
});
