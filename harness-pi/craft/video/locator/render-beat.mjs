// The generic half of a locator VIDEO beat, taken from proof/video-locator-zaporizhzhia/render-directions-video.mjs
// with everything about ITS subject removed. The choreography is the worked example's and is not the model's to
// change: the title card; the live MapTiler map of Europe, the subject's country tinted and named and the subject
// ringed on the continent; the camera TRAVELLING there, the country's regions drawn as it closes in, and once it has
// settled the neighbours' names, the largest settlements (a dot and a name) and the waters; the ring closing on the
// subject, its name and its number counting up; the credit. The timing contract, the states, the plan and the layout
// are the proof's; ./beat.mjs — the one file the model writes — gives the place and the WORDS.
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
import { assertEventFramesReadable, pickDirection, plain, refusing } from "./video.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const NB = " ";
const COMPOSITION_BASE = "zone-video-locator"; // Root.tsx registers `${COMPOSITION_BASE}-${size}`

await refusing(HERE, async () => {
  const SIZE = videoExportSize();
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);

  const REQUIRED = ["eyebrow", "title", "subject", "country", "areas", "places", "valueText", "source", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const field of ["valueText", "check"]) if (typeof beat[field] !== "function") throw new Error(`beat.mjs: ${field} must be a function (see CONTRACT.md)`);
  for (const field of ["eyebrow", "country"]) if (typeof beat[field] !== "string") throw new Error(`beat.mjs: ${field} must be a string (see CONTRACT.md)`);

  // ── the claim first, on the map's own shapes; then what the gesture can show (./subject.mjs)
  const { mapOf, subjectOf } = await import("./subject.mjs");
  const map = mapOf(HERE);
  beat.check({ countryOf: map.countryOf, km: map.km, subject: beat.subject });
  const subject = subjectOf(beat, map);
  assertHeadlineNumbersDrawn([beat.title].flat()[0], [subject.biggest.mw], "subject's number");

  // ── the words, in the shape the proof's copyOf returned
  const label = String(beat.subject.label ?? beat.subject.name ?? "").trim();
  if (!label) throw new Error("subject.name (or subject.label) must be the word drawn beside the ring");
  const capacity = (v) => plain(beat.valueText(v)).replace(/[  ]/g, NB);
  const final = capacity(subject.biggest.mw);
  if (!/\d/.test(final)) throw new Error(`valueText(${subject.biggest.mw}) returned ${JSON.stringify(final)}: it must print the number it is given (it counts up)`);
  const copy = {
    eyebrow: plain(beat.eyebrow),
    title: [beat.title].flat().map(plain),
    countries: Object.fromEntries(Object.entries(beat.areas).map(([iso, name]) => [iso, plain(name)])),
    places: subject.places.map((p) => ({ ...p, label: plain(p.label) })),
    waters: subject.waters.map((w) => ({ forms: [plain(w.name)], lon: w.lon, lat: w.lat })),
    station: plain(label),
    capacity,
    value: subject.biggest.mw,
    source: [beat.source].flat().map(plain).map((f) => f.replaceAll(" · ", `${NB}· `)),
  };
  if (!copy.title.length || copy.title.some((t) => !t.trim())) throw new Error("title must hold at least one non-empty form (the takeaway first)");
  if (!copy.source.length || copy.source.some((t) => !/MapTiler/.test(t)))
    throw new Error("every form of source must carry the basemap's attribution « © MapTiler © OpenStreetMap » (the map is MapTiler's): add it to each form");

  const { buildDirection, loadBeat, textPerRegisterOf } = await import("./build.mjs");
  const { LocatorFrame } = await import("./LocatorFrame.tsx");
  const { mapStateAt, WINDOWS } = await import("./scene.mjs");
  const { MEASURED_FRAMES } = await import("./measure.mjs");
  const { EVENT_ORDER, endOf } = await import("#shared/chart-video/timing.ts");
  const loaded = loadBeat(subject, copy);
  const { label: id, chosen } = pickDirection(HERE, textPerRegisterOf(copy), beat.evidenceLevels ?? 2);
  const out = SIZE === "landscape" ? id : `${id}-${SIZE}`;
  const hint = (error) => {
    const layout = /no clear position|open sea|ground band|floor|no form of the source/.test(error.message);
    return new Error(layout ? `${error.message} — shorten the subject's name, valueText, the place or country names, or add a shorter source form (keeping MapTiler) last` : error.message);
  };

  // ── the live map, measured for THIS plan, then the layout placed on the measurement
  let planOnly;
  try {
    planOnly = buildDirection(id, chosen, loaded, { measured: null });
  } catch (error) {
    throw hint(error);
  }
  const key = mapTilerKey(HERE);
  const measuredStates = Object.fromEntries(Object.entries(MEASURED_FRAMES).map(([name, frameOf]) => [name, mapStateAt(planOnly.props, frameOf(planOnly.props))]));
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
  console.log(`  title form ${report.titleForm + 1} · source « ${report.sourceText} » · ${report.names} names · ${report.waters} waters · count step ${subject.countStep}`);
  const named = new Set(built.names.filter((x) => x.kind === "area").map((x) => x.key.replace("area:", "")));
  const dropped = Object.keys(copy.countries).filter((iso) => !named.has(iso));
  if (dropped.length) console.log(`  not named (no place inside its own country at this frame): ${dropped.join(", ")}`);

  const FrameNoMap = (p) => createElement(LocatorFrame, { ...p, liveMap: () => null });
  try {
    assertEventFramesReadable(FrameNoMap, props, SIZE, out);
  } catch (error) {
    throw new Error(`${error.message} — shorten the words that frame draws (the subject's name, valueText, title forms, source forms)`);
  }

  // The proof's --look list: the last frame of every event, the camera mid-travel, the number counting.
  const T = props.timing;
  const mid = (event, [a, b]) => Math.round(T[event].start + (T[event].duration * (a + b)) / 2);
  const lookFrames = [
    ...EVENT_ORDER.map((event) => ({ name: event === "hold" ? "final" : `end-${event}`, frame: Math.min(endOf(T[event]), T.total) - 1 })),
    { name: "reveal-camera", frame: mid("reveal", WINDOWS.reveal.zoom) },
    { name: "subject-counting", frame: mid("subject", WINDOWS.subject.subject) },
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
