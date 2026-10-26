// The generic half of a tile cartogram VIDEO beat, taken from proof/video-cartogram-europe-lowcarbon/
// render-directions-video.mjs with everything about ITS subject removed. The choreography is the worked example's and is
// not the model's to change: the title card; the live MapTiler map of Europe, its countries taking their class one class
// after another while the key arrives, and beside them THE BALANCE — a 0–100 % beam on which every country is a column
// at its share, its height its territory; every country but the widest steps back, the widest is named with its share,
// and the balance's pivot is set under the area-weighted mean; then the map gives way to its own shapes, which travel
// onto one equal tile each while the balance's weights become one each and a live pivot slides to the mean by country;
// the codes land on the tiles; the credit. The timing contract, the states, the plan and the layout are the proof's;
// ./beat.mjs — the one file the model writes — gives the rows and the WORDS.
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
import { assertEventFramesReadable, numberFormat, pickDirection, plain, refusing, storyLanguage } from "./video.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const NB = " ";
const COMPOSITION_BASE = "zone-video-cartogram-area-distortion-and-tile-cartogram"; // Root.tsx registers `${COMPOSITION_BASE}-${size}`

await refusing(HERE, async () => {
  const SIZE = videoExportSize();
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);

  const REQUIRED = ["eyebrow", "title", "rows", "breaks", "means", "missingLabel", "source", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  if (typeof beat.check !== "function") throw new Error("beat.mjs: check must be a function (see CONTRACT.md)");
  for (const field of ["eyebrow", "missingLabel"]) if (typeof beat[field] !== "string") throw new Error(`beat.mjs: ${field} must be a string (see CONTRACT.md)`);
  for (const which of ["area", "country"])
    if (typeof beat.means?.[which] !== "string" || !beat.means[which].includes("{n}"))
      throw new Error(`beat.mjs: means.${which} must be a short label holding {n}, where the mean is printed ("by area {n} %")`);

  // ── the claim first, then the layout's own refusals (build.mjs)
  const { GRID, NARROW_GRID, readingOf } = await import("./subject.mjs");
  const grid = SIZE === "landscape" ? GRID : NARROW_GRID;
  const { reading: subject, helpers } = readingOf({ ...beat, rows: beat.rows.map((r) => ({ ...r, name: typeof r.name === "string" ? plain(r.name) : r.name })) }, HERE, grid);
  beat.check(helpers);
  const values = [...subject.share.values()].filter((v) => v !== null);
  assertDrawsClaimColumn(values, HERE);
  const r1 = (v) => Math.round(v * 10) / 10;
  assertHeadlineNumbersDrawn([beat.title].flat()[0], [r1(subject.byCountry), r1(subject.byArea), ...values], "tiles");

  // ── the words, in the shape the proof's copyOf returned
  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";
  const { decimal } = numberFormat({ lang, max: 100, decimal: beat.decimal });
  const upper = (t) => plain(t).toLocaleUpperCase(lang);
  const numberText = (v) => (Number.isInteger(v) ? String(v) : String(v).replace(".", decimal));
  const widestName = subject.nameOf(subject.widest);
  const copy = {
    eyebrow: plain(beat.eyebrow),
    title: [beat.title].flat().map(plain),
    means: { area: plain(beat.means.area), country: plain(beat.means.country) },
    breaks: subject.BREAKS.map((b) => `${numberText(b)}${NB}%`),
    missingLabel: plain(beat.missingLabel),
    /** The widest country's name on the map, in two forms: with its share, then alone (the narrow frames). */
    widestName: [`${widestName} · ${Math.round(subject.share.get(subject.widest))}${NB}%`, widestName].map(upper),
    source: [beat.source].flat().map(plain).map((f) => f.replaceAll(" · ", `${NB}· `)),
    codes: subject.placed.map((p) => p.iso),
    decimal,
  };
  if (!copy.title.length || copy.title.some((t) => !t.trim())) throw new Error("title must hold at least one non-empty form (the takeaway first)");
  if (!copy.source.length || copy.source.some((t) => !/MapTiler/.test(t)))
    throw new Error("every form of source must carry the basemap's attribution « © MapTiler © OpenStreetMap » (the map is MapTiler's): add it to each form");

  const { buildDirection, loadBeat, textPerRegisterOf } = await import("./build.mjs");
  const { CartogramFrame } = await import("./CartogramFrame.tsx");
  const { HANDOVER, mapStateAt, WINDOWS } = await import("./scene.mjs");
  const { MEASURED_FRAMES } = await import("./measure.mjs");
  const { EVENT_ORDER, endOf } = await import("#shared/chart-video/timing.ts");
  const loaded = loadBeat(subject, copy);
  const { label: id, chosen } = pickDirection(HERE, textPerRegisterOf(copy), subject.BREAKS.length + 1);
  const out = SIZE === "landscape" ? id : `${id}-${SIZE}`;
  const hint = (error) => {
    const layout = /finds no place|free corner|cannot hold its code|balance has|leaves the balance|floor|wholly inside/.test(error.message);
    return new Error(layout ? `${error.message} — shorten the source forms, means, missingLabel or the widest country's name in rows` : error.message);
  };

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
  console.log(`  title form ${report.titleForm + 1} · source form ${report.sourceForm + 1} · ${props.countries.length} tiles · codes at ${report.codeSize}px · by country ${r1(subject.byCountry)} · by area ${r1(subject.byArea)} · widest ${subject.widest}`);

  const FrameNoMap = (p) => createElement(CartogramFrame, { ...p, liveMap: () => null });
  try {
    assertEventFramesReadable(FrameNoMap, props, SIZE, out);
  } catch (error) {
    throw new Error(`${error.message} — shorten the words that frame draws (means, title forms, source forms)`);
  }
  // Every text the live mean passes through was measured in Bun (the proof's frame.test.ts, for this data).
  const { sceneAt } = await import("./scene.mjs");
  for (let frame = 0; frame < props.timing.total; frame += 1) {
    const live = sceneAt(props, frame).pivots.live;
    if (live.opacity > 0 && !(live.text in props.beam.liveTexts)) throw new Error(`the live mean shows ${JSON.stringify(live.text)} at frame ${frame}, a text build.mjs did not measure (a kit bug)`);
  }

  // The proof's --look list: the last frame of every event, the classes arriving, the handover, the morph.
  const T = props.timing;
  const mid = (event, [a, b]) => Math.round(T[event].start + (T[event].duration * (a + b)) / 2);
  const lookFrames = [
    ...EVENT_ORDER.map((event) => ({ name: event === "hold" ? "final" : `end-${event}`, frame: Math.min(endOf(T[event]), T.total) - 1 })),
    { name: "mid-reference", frame: mid("reference", WINDOWS.reference.classes) },
    { name: "handover", frame: mid("subject", HANDOVER) },
    ...[0.1, 0.3, 0.55, 0.8].map((t) => ({ name: `morph-${t}`, frame: Math.round(T.subject.start + T.subject.duration * (WINDOWS.subject.morph[0] + t * (WINDOWS.subject.morph[1] - WINDOWS.subject.morph[0]))) })),
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
