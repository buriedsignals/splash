// The generic half of a PAIRED gesture video (lollipop, grouped-bar, bullet, diverging-bar, population-pyramid — the
// type is ./composition.ts's VARIANT): the per-type kit's runner with its fixed choreography replaced by the beat's
// `gestures`. Guard order: applyStoryboard → REQUIRED → the values → check() and the shared guards → the gesture core
// (validateGestures through the paired adapter's `stagePaired`, format "video", claim read from STORYBOARD.md) → the
// paired video scheduler and the layout (./build.mjs, ./gesture-paired-video.mjs) → the type floor at every event's
// end and every climbing figure measured → the look stills, then the mp4. A gesture refusal prints REFUSED with the
// beat.mjs field and a value that works; with SPLASH_GESTURE_REPAIR=1 the refusal's fix is applied instead
// ("REPAIRED gestures: <field> → <fix>") and the list staged again, at most 12 times. Nothing here refuses the data's
// SHAPE (key count, gaps, negative values, long names): the layout adapts to it. Everything about THIS story lives in
// ./beat.mjs, the one file the model writes. Copied into the beat by the harness; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs [--size landscape|square|portrait] [--look-only]
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { videoExportSize } from "#shared/chart-video/sizes.mjs";
import { applyStoryboard, assertDrawsClaimColumn, assertHeadlineNumbersDrawn, assertNoAggregates, importBeat, rowFacts, runCheck } from "./guards.mjs";
import { GestureRefusal, validateGestures } from "./gesture-core.mjs";
import { marksOf, stagePaired } from "./gesture-family-paired.mjs";
import { sceneAt } from "./gesture-paired-video.mjs";
import { COMPOSITION_BASE, VARIANT } from "./composition.ts";
import { assertEventFramesReadable, numberFormat, pickDirection, plain, refusing, renderBeatVideo, storyLanguage } from "./video.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPAIR = process.env.SPLASH_GESTURE_REPAIR === "1";

await refusing(HERE, async () => {
  const SIZE = videoExportSize();
  const beat = await importBeat(HERE);
  applyStoryboard(beat, HERE);

  const REQUIRED = ["eyebrow", "series", "rows", "gestures", "unit", "title", "source", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  if (typeof beat.check !== "function") throw new Error("beat.mjs: check must be a function (see CONTRACT.md)");
  for (const field of ["eyebrow", "unit"]) if (typeof beat[field] !== "string") throw new Error(`beat.mjs: ${field} must be a string (see CONTRACT.md)`);
  if (!Array.isArray(beat.gestures)) throw new Error("beat.mjs: gestures must be an array of { do, mark | marks, … } (see CONTRACT.md)");

  // ── the values, and the claim first
  const rows = (beat.rows ?? []).map((r) => ({ ...r, name: plain(r?.name) }));
  const series = [beat.series].flat().map((s) => plain(s));
  const { keys, marks } = marksOf({ rows, series, variant: VARIANT });
  runCheck(beat);
  const values = marks.map((m) => m.value);
  assertDrawsClaimColumn(values, HERE);
  assertNoAggregates(keys.map((k) => k.name), HERE);
  const title = plain([beat.title].flat()[0]);
  // A paired takeaway states a key's change or ratio as often as a value: the shared guard is held on the values and
  // the changes the plate prints.
  const full = keys.filter((k) => k.values.length === 2 && k.values.every((v) => v !== null && v !== 0));
  const changes = full.flatMap((k) => [k.values[1] - k.values[0], k.values[1] / k.values[0]]);
  // ratios between two keys of one series ("1,7 fois plus" the American against the Chinese, both in 2023)
  const ratios = series.flatMap((_, j) => marks.filter((m) => m.j === j && m.value).flatMap((a) => marks.filter((b) => b.j === j && b !== a && b.value).map((b) => a.value / b.value)));
  assertHeadlineNumbersDrawn(title, [...values, ...changes, ...ratios], "marks");

  // ── the words
  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";
  const format = numberFormat({ lang, max: Math.max(...values.map(Math.abs)), decimals: beat.decimals, decimal: beat.decimal });
  const copy = {
    eyebrow: plain(beat.eyebrow),
    title,
    source: [beat.source].flat().map(plain),
    unitWord: plain(beat.unit).trim(),
    format,
    series,
    colon: /^fr\b/i.test(lang) ? " : " : ": ",
    scope: typeof beat.scope === "function" ? (shown, all) => plain(beat.scope(shown, all)) : (shown, all) => `${shown} / ${all}`,
  };
  if (!copy.title.trim()) throw new Error("title must be the journalist's takeaway, copied as written");
  if (!copy.source.length || copy.source.some((t) => !t.trim())) throw new Error("source must hold at least one non-empty form");
  const ceiling = VARIANT === "bullet" ? (beat.ceiling ?? (/%/.test(copy.unitWord) ? 100 : undefined)) : undefined;

  // ── the gestures, checked against the marks and the claim the journalist confirmed, then scheduled and laid out
  const front = (() => {
    const file = join(HERE, "..", "..", "STORYBOARD.md");
    const text = existsSync(file) ? readFileSync(file, "utf8").split("---")[1] ?? "" : "";
    return (key) => text.match(new RegExp(`^${key}:\\s*"?(.*?)"?\\s*$`, "m"))?.[1]?.replace(/\\"/g, '"');
  })();
  const claim = {
    takeaway: front("takeaway") ?? title,
    subject: front("subject"),
    comparison: front("comparison"),
    entity: front("claimEntity"),
    versus: front("claimVersus"),
    facts: rowFacts(HERE),
    unit: beat.unit,
  };
  const { buildPairedVideo, textPerRegisterOf } = await import("./build.mjs");
  const { label, chosen } = pickDirection(HERE, textPerRegisterOf(copy, keys, beat.gestures.filter((g) => g && typeof g === "object")), beat.evidenceLevels ?? 2);
  let staged;
  try {
    staged = stagePaired({
      gestures: beat.gestures,
      variant: VARIANT,
      rows,
      series,
      format: "video",
      claim,
      ceiling,
      validateGestures,
      repair: REPAIR,
      then: ({ gestures: valid, keys: k, marks: m, series: s, claim: c }) =>
        buildPairedVideo({ id: label, variant: VARIANT, chosen, keys: k, marks: m, series: s, gestures: valid, claim: c, copy, size: SIZE, ceiling }),
    });
  } catch (error) {
    if (!(error instanceof GestureRefusal)) throw error;
    const { fix } = error;
    const value = fix && ("set" in fix ? fix.set.value : "add" in fix ? fix.add.gesture : undefined);
    const hint = "remove" in (fix ?? {}) ? " (drop that gesture)" : value !== undefined ? ` — a value that works: ${JSON.stringify(value)}` : "";
    throw new Error(`${error.message}${hint}`);
  }
  for (const r of staged.repairs) console.log(`REPAIRED gestures: ${r.field} → ${JSON.stringify(r.fix)}`);
  const { props, report, direction } = staged.staged;
  console.log(`direction ${label} · ${VARIANT}`);
  console.log(`  ${report.drawn} of ${report.of} keys · row pitch ${report.pitch} · plot ${report.span}px · title on ${report.titleLines} line(s) · ${report.captions} caption(s)`);
  console.log(`  gestures: ${props.plan.map((p) => `${p.event} ${p.do}${p.marks.length ? ` ${p.marks.join(", ")}` : ""}`).join(" · ")}`);

  const { GesturePairedFrame } = await import("./GesturePairedFrame.tsx");
  try {
    assertEventFramesReadable(GesturePairedFrame, props, SIZE, label);
  } catch (error) {
    throw new Error(`${error.message} — shorten the words that frame draws (names, notes, the title, source forms)`);
  }
  for (let frame = 0; frame < props.timing.total; frame += 1) {
    const scene = sceneAt(props, frame);
    for (const text of scene.brackets.map((b) => b.figure).filter(Boolean))
      if (!(text in props.countWidths)) throw new Error(`a figure shows ${JSON.stringify(text)} at frame ${frame}, a text build.mjs did not measure (a kit bug, not a beat.mjs one)`);
  }

  const T = props.timing;
  const end = (e) => T[e].start + T[e].duration - 1;
  const mid = (e) => Math.round(T[e].start + T[e].duration * 0.5);
  const lookFrames = [
    { name: "end-establish", frame: end("establish") },
    { name: "end-reference", frame: end("reference") },
    { name: `reveal-${props.plan[0].do}`, frame: mid("reveal") },
    { name: "end-reveal", frame: end("reveal") },
    { name: "end-subject", frame: end("subject") },
    { name: `conclusion-${props.plan[2].do}`, frame: mid("conclusion") },
    { name: "final", frame: T.total - 1 },
  ];
  const { wantedOf } = await import((await import("#shared/design-base/skill-script.mjs")).skillScriptFrom(HERE, "chart-video", "scripts", "video-faces.mjs"));
  await renderBeatVideo({
    Frame: GesturePairedFrame,
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
