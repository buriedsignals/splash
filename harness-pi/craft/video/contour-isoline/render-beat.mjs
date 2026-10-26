// The generic half of a contour / isoline VIDEO beat, taken from proof/video-contour-europe-distance/
// render-directions-video.mjs with everything about ITS subject removed. The choreography is the worked example's and
// is not the model's to change: the title card; the live MapTiler map of Europe and the key; then a SWEEP inland from
// every coast — the tinted front crossing the land, each isoline drawn as the front passes it, the count climbing
// (« N % within K km ») and its curve tracing — stopping at the median line, set in the accent; then the sweep runs on
// to the farthest point, which is ringed and numbered; the tint lifts and the credit lands. The field is the proof's
// (distance to the sea, measured on a 6 km grid in Lambert equal-area over the study area); ./beat.mjs — the one file
// the model writes — gives the study area and the WORDS.
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
import { applyStoryboard, assertHeadlineNumbersDrawn } from "./guards.mjs";
import { mapTilerKey, measureMap, renderMapVideo } from "./map-video.mjs";
import { assertEventFramesReadable, pickDirection, plain, refusing, storyLanguage } from "./video.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const NB = " ";
const COMPOSITION_BASE = "zone-video-contour-isoline"; // Root.tsx registers `${COMPOSITION_BASE}-${size}`

await refusing(HERE, async () => {
  const SIZE = videoExportSize();
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);

  const REQUIRED = ["eyebrow", "title", "study", "count", "outsideLabel", "source", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  if (typeof beat.check !== "function") throw new Error("beat.mjs: check must be a function (see CONTRACT.md)");
  for (const field of ["eyebrow", "count", "outsideLabel"]) if (typeof beat[field] !== "string") throw new Error(`beat.mjs: ${field} must be a string (see CONTRACT.md)`);
  if (!beat.count.includes("{p}") || !beat.count.includes("{km}")) throw new Error('beat.mjs: count must hold {p} (the percent) and {km} (the distance): "{p} % within {km} km"');

  // ── the field, the claim, then what the sweep can draw (./subject.mjs)
  const { readingOf, subjectOf } = await import("./subject.mjs");
  const reading = readingOf(beat, HERE);
  beat.check(reading.helpers);
  const subject = subjectOf(reading);
  const { field } = subject;
  assertHeadlineNumbersDrawn([beat.title].flat()[0], [Math.round(field.median), Math.round(field.deepest), ...subject.LEVELS, 50, 100], "lines");

  // ── the words, in the shape the proof's copyOf returned
  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";
  const n0 = (v) => Math.round(v).toLocaleString(lang).replace(/[   ]/g, NB);
  const copy = {
    eyebrow: plain(beat.eyebrow),
    title: [beat.title].flat().map(plain),
    count: plain(beat.count),
    outside: plain(beat.outsideLabel),
    levels: subject.LEVELS.map((level) => ({ level, label: `${level}${NB}km` })),
    summit: `${n0(field.deepest)}${NB}km`,
    source: [beat.source].flat().map(plain).map((f) => f.replaceAll(" · ", `${NB}· `)),
    medianLevel: subject.MEDIAN,
  };
  if (!copy.title.length || copy.title.some((t) => !t.trim())) throw new Error("title must hold at least one non-empty form (the takeaway first)");
  if (!copy.source.length || copy.source.some((t) => !/MapTiler/.test(t)))
    throw new Error("every form of source must carry the basemap's attribution « © MapTiler © OpenStreetMap » (the map is MapTiler's): add it to each form");

  const { buildDirection, loadBeat, textPerRegisterOf } = await import("./build.mjs");
  const { ContourFrame } = await import("./ContourFrame.tsx");
  const { mapStateAt, WINDOWS } = await import("./scene.mjs");
  const { MEASURED_FRAMES } = await import("./measure.mjs");
  const { EVENT_ORDER, endOf } = await import("#shared/chart-video/timing.ts");
  const loaded = loadBeat(subject, copy);
  const { label: id, chosen } = pickDirection(HERE, textPerRegisterOf(copy), beat.evidenceLevels ?? 2);
  const out = SIZE === "landscape" ? id : `${id}-${SIZE}`;
  const hint = (error) => {
    const layout = /finds no|open sea|ground band|floor|no form of the source|runs outside the margins|no seat where/.test(error.message);
    return new Error(layout ? `${error.message} — shorten count, outsideLabel or the title forms, or add a shorter source form (keeping MapTiler) last` : error.message);
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
  console.log(`  ${report ? Object.entries(report).filter(([, v]) => typeof v !== "object").map(([k, v]) => `${k} ${typeof v === "number" ? +v.toFixed(2) : v}`).join(" · ") : ""}`);
  console.log(`  median ${subject.MEDIAN} km · farthest ${Math.round(field.deepest)} km in ${field.deepestIso} · lines ${subject.LEVELS.join(", ")} km`);

  const FrameNoMap = (p) => createElement(ContourFrame, { ...p, liveMap: () => null });
  try {
    assertEventFramesReadable(FrameNoMap, props, SIZE, out);
  } catch (error) {
    throw new Error(`${error.message} — shorten the words that frame draws (count, outsideLabel, title forms, source forms)`);
  }

  // The proof's --look list: the last frame of every event, the sweep mid-way to the median and to the farthest point.
  const T = props.timing;
  const along = (event, t) => Math.round(T[event].start + T[event].duration * (WINDOWS[event].level[0] + t * (WINDOWS[event].level[1] - WINDOWS[event].level[0])));
  const lookFrames = [
    ...EVENT_ORDER.map((event) => ({ name: event === "hold" ? "final" : `end-${event}`, frame: Math.min(endOf(T[event]), T.total) - 1 })),
    ...[0.35, 0.7].map((t) => ({ name: `reveal-sweep-${t}`, frame: along("reveal", t) })),
    ...[0.3, 0.7].map((t) => ({ name: `subject-sweep-${t}`, frame: along("subject", t) })),
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
