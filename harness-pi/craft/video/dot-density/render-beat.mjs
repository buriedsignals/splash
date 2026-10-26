// The generic half of a dot density VIDEO beat, taken from proof/video-dot-density-europe-stations/
// render-directions-video.mjs with everything about ITS subject removed. The choreography is the worked example's and
// is not the model's to change: the title card; the live MapTiler map of Europe and the key; every site arriving as a
// dot, group after group — the most numerous first, the subject's group last — while the count of sites climbs; every
// group but the subject's steps back, the subject's dots are ringed, counted, and a bar shows their sliver of the
// sites; then every dot GROWS to an area proportional to its value while the bar carries the subject's share from the
// sites to the value and a second count climbs to it; the credit. The timing contract, the states, the plan and the
// layout are the proof's; ./beat.mjs — the one file the model writes — gives the dots and the WORDS.
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
const COMPOSITION_BASE = "zone-video-dot-density"; // Root.tsx registers `${COMPOSITION_BASE}-${size}`
const r1 = (v) => Math.round(v * 10) / 10;

await refusing(HERE, async () => {
  const SIZE = videoExportSize();
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);

  const REQUIRED = ["eyebrow", "title", "dots", "subject", "count", "subjectLine", "power", "dotLabel", "ringLabel", "figure", "source", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const field of ["count", "subjectLine", "power", "figure", "check"]) if (typeof beat[field] !== "function") throw new Error(`beat.mjs: ${field} must be a function (see CONTRACT.md)`);
  for (const field of ["eyebrow", "subject", "dotLabel", "ringLabel"]) if (typeof beat[field] !== "string") throw new Error(`beat.mjs: ${field} must be a string (see CONTRACT.md)`);

  // ── the claim first, then what the gesture can show (./subject.mjs)
  const { readingOf, subjectOf } = await import("./subject.mjs");
  const reading = readingOf(beat);
  beat.check(reading.helpers);
  const subject = subjectOf(reading, beat);
  assertDrawsClaimColumn(subject.stations.map((s) => s.mw), HERE);
  assertHeadlineNumbersDrawn([beat.title].flat()[0], [subject.nuclear, subject.total, r1(subject.shareSites), r1(subject.shareCapacity)], "dots");

  // ── the words, in the shape the proof's copyOf returned
  const words = (t) => plain(t).replace(/[  ]/g, NB);
  const shareCapacity = r1(subject.shareCapacity);
  const copy = {
    eyebrow: words(beat.eyebrow),
    title: [beat.title].flat().map(words),
    stations: (k) => words(beat.count(k)),
    nuclear: words(beat.subjectLine(subject.nuclear, subject.shareSites)),
    power: (p) => words(beat.power(p)),
    dot: words(beat.dotLabel),
    ring: words(beat.ringLabel),
    reference: words(beat.figure(subject.referenceValue)),
    source: [beat.source].flat().map(words).map((f) => f.replaceAll(" · ", `${NB}· `)),
    shareCapacity,
    total: subject.total,
  };
  if (!copy.stations(subject.total).replace(/\D/g, "").includes(String(subject.total))) throw new Error(`count(${subject.total}) returned ${JSON.stringify(copy.stations(subject.total))}: it must print the number it is given`);
  if (!copy.nuclear.includes(String(subject.nuclear))) throw new Error(`subjectLine(${subject.nuclear}, …) returned ${JSON.stringify(copy.nuclear)}: it must print the subject's count it is given`);
  if (!/\d/.test(copy.power(shareCapacity))) throw new Error(`power(${shareCapacity}) returned ${JSON.stringify(copy.power(shareCapacity))}: it must print the share it is given`);
  if (!copy.title.length || copy.title.some((t) => !t.trim())) throw new Error("title must hold at least one non-empty form (the takeaway first)");
  if (!copy.source.length || copy.source.some((t) => !/MapTiler/.test(t)))
    throw new Error("every form of source must carry the basemap's attribution « © MapTiler © OpenStreetMap » (the map is MapTiler's): add it to each form");

  const { buildDirection, loadBeat, textPerRegisterOf } = await import("./build.mjs");
  const { DotFrame } = await import("./DotFrame.tsx");
  const { mapStateAt, sceneAt, WINDOWS } = await import("./scene.mjs");
  const { MEASURED_FRAMES } = await import("./measure.mjs");
  const { EVENT_ORDER, endOf } = await import("#shared/chart-video/timing.ts");
  const loaded = loadBeat(subject, copy);
  const { label: id, chosen } = pickDirection(HERE, textPerRegisterOf(copy), beat.evidenceLevels ?? 2);
  const out = SIZE === "landscape" ? id : `${id}-${SIZE}`;
  const hint = (error) => {
    const layout = /finds no|open sea|ground band|floor|no form of the source|band is/.test(error.message);
    return new Error(layout ? `${error.message} — shorten count, subjectLine, power, dotLabel, ringLabel or figure's words, or add a shorter source form (keeping MapTiler) last` : error.message);
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
  console.log(`  title form ${report.titleForm + 1} · source « ${report.sourceText} » · ${report.dots} dots · ${report.layers} layers · ${subject.nuclear} in ${subject.SUBJECT} (${r1(subject.shareSites)} % of the sites, ${shareCapacity} % of the value) · count step ${subject.countStep}`);

  const FrameNoMap = (p) => createElement(DotFrame, { ...p, liveMap: () => null });
  try {
    assertEventFramesReadable(FrameNoMap, props, SIZE, out);
  } catch (error) {
    throw new Error(`${error.message} — shorten the words that frame draws (count, subjectLine, power, title forms, source forms)`);
  }
  // Every count the frame shows was measured in Bun (the proof's frame.test.ts, for this data).
  for (let frame = 0; frame < props.timing.total; frame += 1) {
    const s = sceneAt(props, frame);
    if (!(String(s.stations) in props.legend.stationTexts)) throw new Error(`the count shows ${s.stations} at frame ${frame}, a text build.mjs did not measure (a kit bug)`);
    if (!(String(s.power) in props.legend.powerTexts)) throw new Error(`the share shows ${s.power} at frame ${frame}, a text build.mjs did not measure (a kit bug)`);
  }

  // The proof's --look list: the last frame of every event, the dots arriving, the dots growing.
  const T = props.timing;
  const mid = (event, [a, b]) => Math.round(T[event].start + (T[event].duration * (a + b)) / 2);
  const lookFrames = [
    ...EVENT_ORDER.map((event) => ({ name: event === "hold" ? "final" : `end-${event}`, frame: Math.min(endOf(T[event]), T.total) - 1 })),
    { name: "reference-arriving", frame: mid("reference", WINDOWS.reference.arrive) },
    { name: "subject-growing", frame: mid("subject", WINDOWS.subject.weight) },
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
