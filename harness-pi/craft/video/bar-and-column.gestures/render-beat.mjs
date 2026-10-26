// The generic half of a bar-and-column GESTURE video: the per-type kit's runner (video/bar-and-column/render-beat.mjs)
// with its fixed choreography replaced by the beat's `gestures`. Guard order: applyStoryboard → REQUIRED → the values
// → check() and the shared guards → the gesture core (validateGestures, format "video", claim read from
// STORYBOARD.md) → the video scheduler and the layout (./build.mjs, ./gesture-video.mjs) → the type floor at every
// event's end and every counted text measured → the look stills, then the mp4. A gesture refusal prints REFUSED with
// the beat.mjs field and a value that works; with SPLASH_GESTURE_REPAIR=1 the refusal's fix is applied instead
// ("REPAIRED gestures: <field> → <fix>") and the list staged again, at most 12 times. Nothing here refuses the data's
// SHAPE (row count, which row leads, sizes, zero or negative values): the layout adapts to it. Everything about THIS
// story lives in ./beat.mjs, the one file the model writes. Copied into the beat by the harness; never edited by the
// model.
//
// Usage:  bun <beat>/render-beat.mjs [--size landscape|square|portrait] [--look-only]
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { videoExportSize } from "#shared/chart-video/sizes.mjs";
import { applyStoryboard, assertDrawsClaimColumn, assertHeadlineNumbersDrawn, assertLegibleLabels, assertNumbers } from "./guards.mjs";
import { applyFix, GestureRefusal, validateGestures } from "./gesture-core.mjs";
import { valueText } from "./gesture-video.mjs";
import { assertEventFramesReadable, numberFormat, pickDirection, plain, refusing, renderBeatVideo, storyLanguage } from "./video.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const NB = " ";
const COMPOSITION_BASE = "zone-video-bar-and-column-gestures"; // Root.tsx registers `${COMPOSITION_BASE}-${size}`
const REPAIR = process.env.SPLASH_GESTURE_REPAIR === "1";

await refusing(HERE, async () => {
  const SIZE = videoExportSize();
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);

  const REQUIRED = ["eyebrow", "rows", "gestures", "unit", "title", "source", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  if (typeof beat.check !== "function") throw new Error("beat.mjs: check must be a function (see CONTRACT.md)");
  for (const field of ["eyebrow", "unit"]) if (typeof beat[field] !== "string") throw new Error(`beat.mjs: ${field} must be a string (see CONTRACT.md)`);
  if (!Array.isArray(beat.rows) || !beat.rows.length) throw new Error("beat.mjs: rows must be a non-empty array of { name, value }");
  if (!Array.isArray(beat.gestures)) throw new Error("beat.mjs: gestures must be an array of { do, mark | marks, … } (see CONTRACT.md)");

  // ── the values, and the claim first: a title the data no longer supports is the refusal to read, before any other
  assertNumbers(beat.rows.map((r) => [r.name, r.value]));
  const names = beat.rows.map((r) => String(r.name));
  if (new Set(names).size !== names.length) throw new Error("rows holds the same name twice: give each row ONE value (filter data.json to one year / one series)");
  beat.check();
  const rows = beat.rows.map((r) => ({ name: plain(r.name), value: r.value }));
  const values = rows.map((r) => r.value);
  assertDrawsClaimColumn(values, HERE);
  const title = plain([beat.title].flat()[0]);
  assertHeadlineNumbersDrawn(title, values, "bars");

  // ── the words
  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";
  const format = numberFormat({ lang, max: Math.max(...values.map(Math.abs)), decimals: beat.decimals, decimal: beat.decimal });
  const unitWord = plain(beat.unit).trim();
  const copy = {
    eyebrow: plain(beat.eyebrow),
    title,
    source: [beat.source].flat().map(plain),
    unit: (text) => (unitWord ? `${text}${NB}${unitWord}` : text),
    unitWord,
    format,
    scope: typeof beat.scope === "function" ? (shown, all) => plain(beat.scope(shown, all)) : (shown, all) => `${shown} / ${all}`,
  };
  if (!copy.title.trim()) throw new Error("title must be the journalist's takeaway, copied as written");
  if (!copy.source.length || copy.source.some((t) => !t.trim())) throw new Error("source must hold at least one non-empty form");

  // ── the gestures, checked against the rows and the claim the journalist confirmed, then scheduled and laid out
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
  };
  const { buildGestureVideo, textPerRegisterOf } = await import("./build.mjs");
  const { label, chosen } = pickDirection(HERE, textPerRegisterOf(copy, rows, beat.gestures.filter((g) => g && typeof g === "object")), beat.evidenceLevels ?? 2);
  const stage = (gestures) => {
    const { gestures: valid } = validateGestures({ gestures, rows, family: "length", format: "video", claim });
    return buildGestureVideo({ id: label, chosen, rows, gestures: valid, copy, size: SIZE });
  };
  let gestures = beat.gestures;
  let built;
  for (let step = 0; ; step++) {
    try {
      built = stage(gestures);
      break;
    } catch (error) {
      if (!(error instanceof GestureRefusal)) throw error;
      if (!REPAIR || step >= 12) {
        const { fix } = error;
        const value = fix && ("set" in fix ? fix.set.value : "add" in fix ? fix.add.gesture : undefined);
        const hint = "remove" in (fix ?? {}) ? " (drop that gesture)" : value !== undefined ? ` — a value that works: ${JSON.stringify(value)}` : "";
        throw new Error(`${error.message}${hint}`);
      }
      console.log(`REPAIRED gestures: ${error.field} → ${JSON.stringify(error.fix)}`);
      gestures = applyFix(gestures, error.fix);
    }
  }
  const { props, report, direction } = built;
  // Only the drawn bars carry a printed count: their labels must read apart (the remainder is stated, not printed).
  assertLegibleLabels(props.rows.map((r) => r.value), (v) => valueText(v, format));
  console.log(`direction ${label}`);
  for (const d of direction.decisions ?? []) console.log(`  ${d.register.padEnd(8)} ${d.role.padEnd(15)} -> ${d.family}`);
  console.log(`  names ${report.mode} · notes ${report.notesInCaption ? "on caption lines" : "on their rows"} · ${report.drawn} of ${report.of} rows · row pitch ${report.pitch} · bars ${report.span}px · title on ${report.titleLines} line(s)`);
  console.log(`  gestures: ${props.plan.map((p) => `${p.event} ${p.do}${p.marks.length ? ` ${p.marks.join(", ")}` : ""}`).join(" · ")}`);

  const { GestureBarFrame } = await import("./GestureBarFrame.tsx");
  const { sceneAt } = await import("./scene.mjs");
  try {
    assertEventFramesReadable(GestureBarFrame, props, SIZE, label);
  } catch (error) {
    throw new Error(`${error.message} — shorten the words that frame draws (names in rows, notes, the title, source forms)`);
  }
  // Every figure a count or a bracket climbs through was measured in Bun (the per-type kit's frame walk).
  for (let frame = 0; frame < props.timing.total; frame += 1) {
    const scene = sceneAt(props, frame);
    for (const text of [...scene.brackets.map((b) => b.figure), ...scene.captions.map((c) => c.figure)].filter(Boolean))
      if (!(text in props.countWidths)) throw new Error(`a figure shows ${JSON.stringify(text)} at frame ${frame}, a text build.mjs did not measure (a kit bug, not a beat.mjs one)`);
  }

  // The look list: frame 0, the end of every event, and the middle of each gesture.
  const T = props.timing;
  const end = (e) => T[e].start + T[e].duration - 1;
  const mid = (e) => Math.round(T[e].start + T[e].duration * 0.5);
  const lookFrames = [
    { name: "first", frame: 0 },
    { name: "end-establish", frame: end("establish") },
    { name: "end-reference", frame: end("reference") },
    { name: `reveal-${props.plan[0].do}`, frame: mid("reveal") },
    { name: "end-reveal", frame: end("reveal") },
    { name: `subject-${props.plan[1].do}`, frame: mid("subject") },
    { name: "end-subject", frame: end("subject") },
    { name: `conclusion-${props.plan[2].do}`, frame: mid("conclusion") },
    { name: "end-conclusion", frame: end("conclusion") },
    { name: "final", frame: T.total - 1 },
  ];
  const { wantedOf } = await import((await import("#shared/design-base/skill-script.mjs")).skillScriptFrom(HERE, "chart-video", "scripts", "video-faces.mjs"));
  await renderBeatVideo({
    Frame: GestureBarFrame,
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
