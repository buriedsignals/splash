// The generic half of a hex grid VIDEO beat, taken from proof/video-hex-grid-europe-protection/
// render-directions-video.mjs with everything about ITS subject removed. The choreography is the worked example's and
// is not the model's to change: the title card; the live MapTiler map of Europe, its countries in one neutral, which
// give way to their own shapes and travel onto ONE HEXAGON EACH, the codes landing; the hexagons take their class BY
// COUNT and the largest is ringed with its figure; then they RE-CLASS BY RATE — the same countries, the other measure
// — and the new leader is ringed, the largest named again with its rank by rate; the credit. The timing contract, the
// states, the plan and the layout are the proof's; ./beat.mjs — the one file the model writes — gives the rows and
// the WORDS.
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
const COMPOSITION_BASE = "zone-video-hex-grid-spatial-binning-and-hex-cartogram"; // Root.tsx registers `${COMPOSITION_BASE}-${size}`
const r1 = (v) => Math.round(v * 10) / 10;

await refusing(HERE, async () => {
  const SIZE = videoExportSize();
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);

  const REQUIRED = ["eyebrow", "title", "rows", "countBreaks", "rateBreaks", "countUnit", "rateUnit", "countBorne", "rateBorne", "largestByCount", "largestByRate", "leaderLine", "source", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const field of ["countBorne", "rateBorne", "largestByCount", "largestByRate", "leaderLine", "check"]) if (typeof beat[field] !== "function") throw new Error(`beat.mjs: ${field} must be a function (see CONTRACT.md)`);
  for (const field of ["eyebrow", "countUnit", "rateUnit"]) if (typeof beat[field] !== "string") throw new Error(`beat.mjs: ${field} must be a string (see CONTRACT.md)`);
  if (beat.origin && typeof beat.originLabel !== "string") throw new Error("beat.mjs: originLabel must be a string when origin is given (the key's word for the hollow cell)");

  // ── the claim first, then what the gesture can show (./subject.mjs)
  const { readingOf, subjectOf } = await import("./subject.mjs");
  const { reading, helpers } = readingOf({ ...beat, rows: beat.rows.map((r) => ({ ...r, name: typeof r.name === "string" ? plain(r.name) : r.name })) });
  beat.check(helpers);
  const subject = subjectOf(reading, beat);
  const counts = Object.values(reading.people);
  const rates = Object.values(reading.rateOf);
  assertDrawsClaimColumn([...counts, ...rates], HERE);
  assertHeadlineNumbersDrawn([beat.title].flat()[0], [...counts, ...rates.map(r1), subject.largestRank], "cells");

  // ── the words, in the shape the proof's copyOf returned
  const words = (t) => plain(t).replace(/[  ]/g, NB);
  const nameOf = (iso) => subject.names[iso];
  const copy = {
    eyebrow: words(beat.eyebrow),
    title: [beat.title].flat().map(words),
    units: { count: words(beat.countUnit), rate: words(beat.rateUnit) },
    bornes: { count: subject.countBreaks.map((b) => words(beat.countBorne(b))), rate: subject.rateBreaks.map((b) => words(beat.rateBorne(b))) },
    largest: {
      count: words(beat.largestByCount(nameOf(subject.largest), subject.largestPeople)),
      rate: words(beat.largestByRate(nameOf(subject.largest), subject.largestRate, subject.largestRank)),
    },
    leader: words(beat.leaderLine(nameOf(subject.leader), subject.leaderRate)),
    origin: words(beat.originLabel ?? ""),
    source: [beat.source].flat().map(words).map((f) => f.replaceAll(" · ", `${NB}· `)),
  };
  if (!copy.largest.count.includes(nameOf(subject.largest)) || !copy.leader.includes(nameOf(subject.leader))) throw new Error("largestByCount, largestByRate and leaderLine must print the name they are given");
  if (!String(copy.largest.rate).includes(String(subject.largestRank))) throw new Error(`largestByRate(name, rate, ${subject.largestRank}) must print the rank it is given`);
  if (!copy.title.length || copy.title.some((t) => !t.trim())) throw new Error("title must hold at least one non-empty form (the takeaway first)");
  if (!copy.source.length || copy.source.some((t) => !/MapTiler/.test(t)))
    throw new Error("every form of source must carry the basemap's attribution « © MapTiler © OpenStreetMap » (the map is MapTiler's): add it to each form");

  const { buildDirection, loadBeat, textPerRegisterOf } = await import("./build.mjs");
  const { HexFrame } = await import("./HexFrame.tsx");
  const { HANDOVER, mapStateAt, WINDOWS } = await import("./scene.mjs");
  const { MEASURED_FRAMES } = await import("./measure.mjs");
  const { EVENT_ORDER, endOf } = await import("#shared/chart-video/timing.ts");
  const loaded = loadBeat(subject, copy);
  const { label: id, chosen } = pickDirection(HERE, textPerRegisterOf(copy, subject), subject.rateBreaks.length + 1);
  const out = SIZE === "landscape" ? id : `${id}-${SIZE}`;
  const hint = (error) => {
    const layout = /finds no|free corner|cannot hold|floor|band|key is|key column/.test(error.message);
    return new Error(layout ? `${error.message} — shorten the key's words (countUnit, rateUnit, the bornes, largestByCount, largestByRate, leaderLine, originLabel) or add a shorter source form (keeping MapTiler) last` : error.message);
  };

  let planOnly;
  try {
    planOnly = buildDirection(id, chosen, loaded, { measured: null });
  } catch (error) {
    throw hint(error);
  }
  const key = mapTilerKey(HERE);
  const measuredStates = Object.fromEntries(Object.entries(MEASURED_FRAMES).map(([name, frameOf]) => [name, mapStateAt(planOnly.props, frameOf(planOnly.props, HANDOVER[0]))]));
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
  console.log(`  ${Object.entries(report ?? {}).filter(([, v]) => typeof v !== "object").map(([k, v]) => `${k} ${typeof v === "number" ? +v.toFixed(2) : v}`).join(" · ")}`);
  console.log(`  ${subject.cells.length} cells · largest by count ${subject.largest} (${subject.largestRank}th by rate) · leader by rate ${subject.leader}`);

  const FrameNoMap = (p) => createElement(HexFrame, { ...p, liveMap: () => null });
  try {
    assertEventFramesReadable(FrameNoMap, props, SIZE, out);
  } catch (error) {
    throw new Error(`${error.message} — shorten the words that frame draws (the key's words, title forms, source forms)`);
  }

  // The proof's --look list: the last frame of every event, the map, the handover, the morph, the two class rounds.
  const T = props.timing;
  const mid = (event, [a, b]) => Math.round(T[event].start + (T[event].duration * (a + b)) / 2);
  const lookFrames = [
    ...EVENT_ORDER.map((event) => ({ name: event === "hold" ? "final" : `end-${event}`, frame: Math.min(endOf(T[event]), T.total) - 1 })),
    { name: "map", frame: Math.floor(T.reference.start + T.reference.duration * HANDOVER[0]) },
    { name: "handover", frame: mid("reference", HANDOVER) },
    ...[0.3, 0.7].map((t) => ({ name: `morph-${t}`, frame: Math.round(T.reference.start + T.reference.duration * (WINDOWS.reference.morph[0] + t * (WINDOWS.reference.morph[1] - WINDOWS.reference.morph[0]))) })),
    { name: "reveal-counting", frame: mid("reveal", WINDOWS.reveal.count) },
    { name: "subject-reclassing", frame: mid("subject", WINDOWS.subject.rate) },
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
