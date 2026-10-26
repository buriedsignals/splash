// The generic half of a choropleth VIDEO beat, taken from proof/video-choropleth-europe-lowcarbon/
// render-directions-video.mjs with everything about ITS subject removed. The choreography is the worked example's and
// is not the model's to change: the title card; the live MapTiler map of Europe, the classes arriving lowest first with
// the count and the key; the FLOOR RISING — a cursor travelling the key borne by borne while each class it passes steps
// back to bare land and the count steps down — until only the top class stands, named; the camera closing in on the
// subject, ringed, its share and its neighbours' counting up on gauges with the floor notched; the pull back to the
// whole map, the credit on the sea. The timing contract, the states, the plan and the layout are the proof's;
// ./beat.mjs — the one file the model writes — gives the data and the WORDS.
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
import { applyStoryboard, assertDrawsClaimColumn, assertHeadlineNumbersDrawn, assertLegibleLabels } from "./guards.mjs";
import { mapTilerKey, measureMap, renderMapVideo } from "./map-video.mjs";
import { assertEventFramesReadable, pickDirection, plain, refusing, storyLanguage } from "./video.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const NB = " ";
const COMPOSITION_BASE = "zone-video-choropleth"; // Root.tsx registers `${COMPOSITION_BASE}-${size}`
/** Two names the map prints may touch by this much at landscape (the proof's own FRANCE / SUISSE, 8 px). */
const NAME_OVERLAP_PX = 10;

await refusing(HERE, async () => {
  const SIZE = videoExportSize();
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);

  const REQUIRED = ["eyebrow", "title", "rows", "breaks", "subject", "unit", "count", "missingLabel", "noData", "source", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const field of ["count", "noData", "check"]) if (typeof beat[field] !== "function") throw new Error(`beat.mjs: ${field} must be a function (see CONTRACT.md)`);
  for (const field of ["eyebrow", "unit", "missingLabel", "subject"]) if (typeof beat[field] !== "string") throw new Error(`beat.mjs: ${field} must be a string (see CONTRACT.md)`);
  if (beat.waters !== undefined && (typeof beat.waters !== "object" || Object.keys(beat.waters).some((k) => !["northSea", "mediterranean", "baltic"].includes(k))))
    throw new Error("beat.mjs: waters is optional, an object whose keys are among northSea, mediterranean, baltic (the sea names the map prints)");

  // ── the reading, the claim, then what the gesture can show (./subject.mjs)
  const { readingOf, subjectOf } = await import("./subject.mjs");
  const { reading, helpers } = readingOf({ ...beat, rows: beat.rows.map((r) => ({ ...r, name: typeof r.name === "string" ? plain(r.name) : r.name })) }, HERE);
  // The claim first: a title the data no longer supports is the refusal to read, before any the gesture raises.
  beat.check(helpers);
  const subject = subjectOf(reading, beat);

  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";
  const unit = plain(beat.unit).trim();
  const withUnit = (text) => (unit ? `${text}${NB}${unit}` : text);
  const numberText = (v) => (Number.isInteger(v) ? String(v) : v.toLocaleString(lang, { maximumFractionDigits: 2 }));
  const closeValues = [subject.ODD_ONE, ...subject.neighbours].map((iso) => subject.value.get(iso).value);
  assertLegibleLabels(closeValues, (v) => String(Math.round(v)));
  assertDrawsClaimColumn([...subject.value.values()].map((v) => v.value), HERE);
  const counts = [subject.value.size, ...subject.BREAKS.map((b) => [...subject.value.values()].filter((v) => v.value >= b).length)];
  assertHeadlineNumbersDrawn([beat.title].flat()[0], [...subject.value.values()].map((v) => v.value).concat(counts, subject.BREAKS, closeValues.map(Math.round)), "countries");

  // ── the words, in the shape build.mjs's copyOf reads
  const words = {
    eyebrow: plain(beat.eyebrow),
    title: [beat.title].flat().map(plain),
    count: (k) => {
      const text = plain(beat.count(k));
      if (!text.includes(String(k))) throw new Error(`count(${k}) returned ${JSON.stringify(text)}: it must print the number it is given`);
      return text;
    },
    valueText: (v) => withUnit(String(Math.round(v))),
    breakText: (b) => withUnit(numberText(b)),
    missingLabel: plain(beat.missingLabel),
    source: [beat.source].flat().map(plain),
    noData: (name) => plain(beat.noData(name)),
    waters: Object.fromEntries(Object.entries(beat.waters ?? {}).map(([k, t]) => [k, plain(t)])),
    upper: (text) => plain(text).toLocaleUpperCase(lang),
  };
  if (!words.title.length || words.title.some((t) => !t.trim())) throw new Error("title must hold at least one non-empty form (the takeaway first)");
  if (!words.source.length || words.source.some((t) => !/MapTiler/.test(t)))
    throw new Error("every form of source must carry the basemap's attribution « © MapTiler © OpenStreetMap » (the map is MapTiler's): add it to each form");
  for (const u of subject.unmeasured) if (!words.noData(u.name).includes(u.name)) throw new Error(`noData(${JSON.stringify(u.name)}) must print the name it is given`);

  const { buildDirection, copyOf, loadBeat, textPerRegisterOf } = await import("./build.mjs");
  const { ChoroplethFrame } = await import("./ChoroplethFrame.tsx");
  const { mapStateAt } = await import("./scene.mjs");
  const { MEASURED_FRAMES } = await import("./measure.mjs");
  const { COUNT_UP, WINDOWS } = await import("./scene.mjs");
  const { EVENT_ORDER, endOf } = await import("#shared/chart-video/timing.ts");
  const copy = copyOf(subject, words);
  const loaded = loadBeat(subject, copy);
  const { label: id, chosen } = pickDirection(HERE, textPerRegisterOf(copy), subject.BREAKS.length + 1);
  const label = SIZE === "landscape" ? id : `${id}-${SIZE}`;
  const hint = (error) => {
    const layout = /open sea|seats the|close-up's names|any rung|ink reaches|ladder|run past|floor|holds .*px of content|ground band/.test(error.message);
    return new Error(
      layout
        ? `${error.message} — shorten the words the map has to place (the subject's and its neighbours' names, noData, the title forms) or add a shorter source form (keeping MapTiler) last`
        : error.message,
    );
  };

  // ── the live map, measured for THIS plan, then the layout placed on the measurement
  let planOnly;
  try {
    planOnly = buildDirection(id, chosen, loaded, { measured: null });
  } catch (error) {
    throw hint(error);
  }
  const key = mapTilerKey(HERE);
  const { CHOROPLETH_VIDEO_TIMING: timing } = await import("./timing-contract.ts");
  const measuredStates = Object.fromEntries(Object.entries(MEASURED_FRAMES).map(([name, frameOf]) => [name, mapStateAt({ cameras: planOnly.props.cameras, states: loaded.states, timing }, frameOf(timing))]));
  await measureMap({ here: HERE, label: id, plan: planOnly.props.mapPlan, states: measuredStates, seats: loaded.mapSeats, size: { name: SIZE, ...sizeFor(SIZE) }, key });
  let built;
  try {
    built = buildDirection(id, chosen, loaded);
  } catch (error) {
    throw hint(error);
  }
  const { props, report, direction } = built;
  console.log(`direction ${id}`);
  for (const d of direction.decisions ?? []) console.log(`  ${d.register.padEnd(8)} ${d.role.padEnd(15)} -> ${d.family}`);
  console.log(`  title form ${report.titleForm + 1} at ${report.titleSize}px · source « ${report.sourceText} » · k ${report.k.toFixed(3)} · close-up ${(props.cameras.closeUp.camZoom - props.cameras.whole.camZoom).toFixed(2)} levels in`);

  // THE NAMES THE MAP PRINTS (the top class) must not print through one another: the proof walks a ladder only for
  // France at the narrow frames; at landscape it seats each on its country and checks nothing.
  if (SIZE === "landscape") {
    const { DRAWN_WIDER, haloOf, widthOf } = await import("./layout.mjs");
    const r = props.registers.feature;
    const whole = props.cameras.whole;
    const px = 512 * 2 ** whole.camZoom;
    const wx = (lon) => (lon + 180) / 360;
    const wy = (lat) => (1 - Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) / Math.PI) / 2;
    const layer = props.mapPlan.layers.find((l) => l.id === "top-names");
    const boxes = layer.data.features.map((f) => {
      const width = widthOf(f.properties.text, r) * (1 + DRAWN_WIDER);
      const height = r.lead + haloOf(r, report.k);
      const [lon, lat] = f.geometry.coordinates;
      return { text: f.properties.text, x: (wx(lon) - whole.camX) * px + props.stage.width / 2 - width / 2, y: (wy(lat) - whole.camY) * px + props.stage.height / 2 - height / 2, width, height };
    });
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const [a, b] = [boxes[i], boxes[j]];
        const ox = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
        const oy = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
        if (ox > NAME_OVERLAP_PX && oy > NAME_OVERLAP_PX)
          throw new Error(
            `the map prints the top class's names on their countries, and « ${a.text} » runs ${ox.toFixed(0)}px into « ${b.text} »: shorten one of these names in rows, or raise the last break so fewer countries are named`,
          );
      }
  }

  const FrameNoMap = (p) => createElement(ChoroplethFrame, { ...p, liveMap: () => null });
  try {
    assertEventFramesReadable(FrameNoMap, props, SIZE, label);
  } catch (error) {
    throw new Error(`${error.message} — shorten the words that frame draws (names, title forms, source forms)`);
  }

  // The proof's --look list: the last frame of every event, the floor mid-climb, the shares counting, the camera moving.
  const T = props.timing;
  const mid = (event, [a, b]) => Math.round(T[event].start + (T[event].duration * (a + b)) / 2);
  const lookFrames = [
    ...EVENT_ORDER.map((event) => ({ name: event === "hold" ? "final" : `end-${event}`, frame: Math.min(endOf(T[event]), T.total) - 1 })),
    { name: "mid-reveal-filter", frame: mid("reveal", WINDOWS.reveal.filter) },
    { name: "subject-counting", frame: Math.round(T.subject.start + (T.subject.duration * (COUNT_UP.neighbour[1] + COUNT_UP.neighbour[2])) / 2) },
    { name: "mid-subject-camera", frame: mid("subject", WINDOWS.subject.zoom) },
  ].sort((a, b) => a.frame - b.frame);
  const { wantedOf } = await import(skillScriptFrom(HERE, "map-beat", "scripts", "video-faces.mjs"));
  await renderMapVideo({
    here: HERE,
    label,
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
