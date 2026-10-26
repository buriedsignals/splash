// The generic half of a flow map VIDEO beat, taken from proof/video-flow-map-ukraine-protection/
// render-directions-video.mjs with everything about ITS subject removed. The choreography is the worked example's and
// is not the model's to change: the title card; the live MapTiler map, the origin's node and the key's width scale;
// the bands DRAWING OUT of the origin to every destination, largest first, each as wide as its flow, while the count
// of people climbs; every band but the two largest steps back while their share counts up; the others come back and
// the credit lands. The timing contract, the states, the plan and the layout are the proof's; ./beat.mjs — the one
// file the model writes — gives the flows and the WORDS.
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
const COMPOSITION_BASE = "zone-video-flow-map-route-and-origin-destination"; // Root.tsx registers `${COMPOSITION_BASE}-${size}`
const r1 = (v) => Math.round(v * 10) / 10;

await refusing(HERE, async () => {
  const SIZE = videoExportSize();
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);

  const REQUIRED = ["eyebrow", "title", "origin", "originName", "flows", "count", "share", "host", "figure", "source", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const field of ["count", "share", "host", "figure", "check"]) if (typeof beat[field] !== "function") throw new Error(`beat.mjs: ${field} must be a function (see CONTRACT.md)`);
  for (const field of ["eyebrow", "origin", "originName"]) if (typeof beat[field] !== "string") throw new Error(`beat.mjs: ${field} must be a string (see CONTRACT.md)`);

  // ── the claim first, then what the gesture can show (./subject.mjs)
  const { readingOf, subjectOf } = await import("./subject.mjs");
  const reading = readingOf({ ...beat, flows: beat.flows.map((f) => ({ ...f, name: typeof f.name === "string" ? plain(f.name) : f.name })) }, HERE);
  beat.check(reading.helpers);
  const subject = subjectOf(reading, beat);
  assertDrawsClaimColumn(subject.ranked.map((f) => f.people), HERE);
  assertHeadlineNumbersDrawn([beat.title].flat()[0], [subject.total, r1(subject.topTwoShare), ...subject.ranked.map((f) => f.people)], "bands");

  // ── the words, in the shape the proof's copyOf returned
  const words = (t) => plain(t).replace(/[  ]/g, NB);
  const [first, second] = subject.topTwo.map((code) => subject.names[code]);
  const topTwoShare = r1(subject.topTwoShare);
  const copy = {
    eyebrow: words(beat.eyebrow),
    title: [beat.title].flat().map(words),
    people: (p) => words(beat.count(p)),
    share: (s) => words(beat.share(s, first, second)),
    scale: subject.scaleValues.map((v) => ({ people: v, text: words(beat.figure(v)) })),
    origin: words(beat.originName),
    host: (code, people) => words(beat.host(subject.names[code], people)),
    source: [beat.source].flat().map(words).map((f) => f.replace(" · ", `${NB}· `)),
    topTwoShare,
  };
  if (!/\d/.test(copy.people(subject.total))) throw new Error(`count(${subject.total}) returned ${JSON.stringify(copy.people(subject.total))}: it must print the number it is given`);
  if (!/\d/.test(copy.share(topTwoShare))) throw new Error(`share(${topTwoShare}, …) returned ${JSON.stringify(copy.share(topTwoShare))}: it must print the share it is given`);
  if (!copy.title.length || copy.title.some((t) => !t.trim())) throw new Error("title must hold at least one non-empty form (the takeaway first)");
  if (!copy.source.length || copy.source.some((t) => !/MapTiler/.test(t)))
    throw new Error("every form of source must carry the basemap's attribution « © MapTiler © OpenStreetMap » (the map is MapTiler's): add it to each form");

  const { buildDirection, loadBeat, textPerRegisterOf } = await import("./build.mjs");
  const { FlowFrame } = await import("./FlowFrame.tsx");
  const { mapStateAt, WINDOWS } = await import("./scene.mjs");
  const { MEASURED_FRAMES } = await import("./measure.mjs");
  const { EVENT_ORDER, endOf } = await import("#shared/chart-video/timing.ts");
  const loaded = loadBeat(subject, copy);
  if (!loaded.seats[subject.ORIGIN]) throw new Error(`the origin ${subject.ORIGIN} has no ground inside the map's window (25°W–45°E, 34°N–72°N): this kit draws flows out of a European country`);
  const { label: id, chosen } = pickDirection(HERE, textPerRegisterOf(copy, subject), beat.evidenceLevels ?? 2);
  const out = SIZE === "landscape" ? id : `${id}-${SIZE}`;
  const hint = (error) => {
    const layout = /finds no|open sea|ground band|floor|no form of the source|no seat inside|wider than|narrower than/.test(error.message);
    return new Error(layout ? `${error.message} — shorten count, share, host or figure's words, or add a shorter source form (keeping MapTiler) last; a destination outside Europe's window cannot be drawn` : error.message);
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
  console.log(`  ${Object.entries(report ?? {}).filter(([, v]) => typeof v !== "object").map(([k, v]) => `${k} ${typeof v === "number" ? +v.toFixed(2) : v}`).join(" · ")}`);
  console.log(`  ${subject.ranked.length} destinations · ${subject.total} in all · the two largest ${first} + ${second}: ${topTwoShare} %`);

  const FrameNoMap = (p) => createElement(FlowFrame, { ...p, liveMap: () => null });
  try {
    assertEventFramesReadable(FrameNoMap, props, SIZE, out);
  } catch (error) {
    throw new Error(`${error.message} — shorten the words that frame draws (count, share, title forms, source forms)`);
  }

  // The proof's --look list: the last frame of every event, and the two largest bands halfway out of the node.
  const T = props.timing;
  const lookFrames = [
    ...EVENT_ORDER.map((event) => ({ name: event === "hold" ? "final" : `end-${event}`, frame: Math.min(endOf(T[event]), T.total) - 1 })),
    { name: "reveal-tracing", frame: Math.round(T.reveal.start + T.reveal.duration * (WINDOWS.reveal.trace[0] + 0.045 * (WINDOWS.reveal.trace[1] - WINDOWS.reveal.trace[0]))) },
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
