// The generic half of a waterfall-bridge GESTURE video (Stack family, craft/gestures/GRAMMAR.md F2): the per-type kit's
// runner (video/waterfall-bridge/render-beat.mjs) with its fixed choreography replaced by the beat's `gestures`. Guard order:
// applyStoryboard → REQUIRED → the family model → the values and check() and the shared guards → the gesture core on
// the family's marks (validateStack, format "video", claim read from STORYBOARD.md) → the Stack video scheduler and
// the layout (./build.mjs, ./gesture-stack-video.mjs) → the type floor at every event's end and every word measured →
// the look stills, then the mp4. A gesture refusal prints REFUSED with the beat.mjs field and a value that works; with
// SPLASH_GESTURE_REPAIR=1 the refusal's fix is applied instead ("REPAIRED gestures: <field> → <fix>"), at most 12
// times. Nothing here refuses the data's SHAPE: the layout adapts to it. Copied into the beat by the harness; never
// edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs [--size landscape|square|portrait] [--look-only]
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { videoExportSize } from "#shared/chart-video/sizes.mjs";
import { seriesInks } from "#shared/chart-beat/render-still.mjs";
import { readPalette } from "#shared/chart-beat/colour.mjs";
import { applyStoryboard, assertHeadlineNumbersDrawn, assertNoAggregates, assertNumbers, importBeat, rowFacts, runCheck } from "./guards.mjs";
import { applyFix, GestureRefusal } from "./gesture-core.mjs";
import { stackFromBeat, validateStack } from "./gesture-family-stack.mjs";
import { front } from "./gesture-stack-beat.mjs";
import { assertEventFramesReadable, numberFormat, pickDirection, plain, refusing, renderBeatVideo, storyLanguage } from "./video.mjs";

const VARIANT = "waterfall-bridge";
const HERE = dirname(fileURLToPath(import.meta.url));
const NB = " ";
const COMPOSITION_BASE = "zone-video-stack-gestures"; // Root.tsx registers `${COMPOSITION_BASE}-${size}`
const REPAIR = process.env.SPLASH_GESTURE_REPAIR === "1";
const REQUIRED = {
  "stacked-bar": ["eyebrow", "rows", "parts", "gestures", "unit", "title", "source", "check"],
  "diverging-stacked-bar-likert": ["eyebrow", "rows", "left", "right", "gestures", "unit", "title", "source", "check"],
  "waterfall-bridge": ["eyebrow", "opening", "steps", "gestures", "unit", "title", "source", "check"],
}[VARIANT];

await refusing(HERE, async () => {
  const SIZE = videoExportSize();
  const beat = await importBeat(HERE);
  applyStoryboard(beat, HERE);
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  if (typeof beat.check !== "function") throw new Error("beat.mjs: check must be a function (see CONTRACT.md)");
  for (const field of ["eyebrow", "unit"]) if (typeof beat[field] !== "string") throw new Error(`beat.mjs: ${field} must be a string (see CONTRACT.md)`);
  if (!Array.isArray(beat.gestures)) throw new Error("beat.mjs: gestures must be an array of { do, mark | marks, … } (see CONTRACT.md)");

  // ── the family model, the values, and the claim first
  const plainBeat = VARIANT === "waterfall-bridge"
    ? { ...beat, opening: { ...beat.opening, name: plain(beat.opening?.name ?? "") }, steps: (beat.steps ?? []).map((s) => ({ ...s, name: plain(s.name) })), closing: beat.closing ? { ...beat.closing, name: plain(beat.closing.name) } : undefined }
    : { ...beat, rows: (beat.rows ?? []).map((r) => ({ ...r, name: plain(r.name) })) };
  const stack = stackFromBeat(plainBeat, VARIANT);
  const values = stack.marks.map((m) => m.value);
  assertNumbers(stack.marks.map((m) => [m.name, m.value]));
  if (new Set(stack.names).size !== stack.names.length) throw new Error("rows holds the same name twice: give each bar ONE row (filter data.json to one year / one series)");
  runCheck(beat);
  assertNoAggregates(stack.names, HERE);
  const title = plain([beat.title].flat()[0]);
  const wholes = stack.names.map((b) => stack.whole(b));
  assertHeadlineNumbersDrawn(title, [...values, ...wholes, ...(stack.closing ? [stack.closing.value, stack.closing.value - stack.opening.value] : [])], VARIANT === "waterfall-bridge" ? "steps" : "segments");
  stack.conservation();

  // ── the words
  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";
  const format = numberFormat({ lang, max: Math.max(...values.map(Math.abs), ...wholes.map(Math.abs)), decimals: beat.decimals, decimal: beat.decimal });
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

  // ── the gestures, checked against the marks and the claim, then scheduled and laid out
  const field = front(HERE);
  const claim = { takeaway: field("takeaway") ?? title, subject: field("subject"), comparison: field("comparison"), entity: field("claimEntity"), versus: field("claimVersus"), facts: rowFacts(HERE), unit: beat.unit };
  const { buildStackVideo, textPerRegisterOf } = await import("./build.mjs");
  const { label, chosen } = pickDirection(HERE, textPerRegisterOf(copy, stack, beat.gestures.filter((g) => g && typeof g === "object")), beat.evidenceLevels ?? 3);
  const palette = readPalette(HERE);
  const decrease = VARIANT === "waterfall-bridge" ? seriesInks({ ground: chosen.ground, accent: chosen.accent, accents: [chosen.accent, ...(palette.accents ?? []).slice(1)] }, 2)[1] : undefined;
  const stage = (gestures) => {
    const { gestures: valid, subject } = validateStack({ gestures, stack, format: "video", claim });
    return buildStackVideo({ id: label, chosen, stack, gestures: valid, subject, copy, size: SIZE, decrease });
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
  console.log(`direction ${label}`);
  for (const d of direction.decisions ?? []) console.log(`  ${d.register.padEnd(8)} ${d.role.padEnd(15)} -> ${d.family}`);
  console.log(`  ${report.mode} · ${report.drawn} of ${report.of} bars · pitch ${report.pitch} · title on ${report.titleLines} line(s)`);
  console.log(`  gestures: ${props.plan.map((p) => `${p.event} ${p.do}${p.marks.length ? ` ${p.marks.join(", ")}` : ""}`).join(" · ")}`);

  const { GestureStackFrame } = await import("./GestureStackFrame.tsx");
  const { sceneAt } = await import("./gesture-stack-video.mjs");
  try {
    assertEventFramesReadable(GestureStackFrame, props, SIZE, label);
  } catch (error) {
    throw new Error(`${error.message} — shorten the words that frame draws (names, notes, the title, source forms)`);
  }
  // Every figure a count or a bracket climbs through was measured in Bun.
  for (let frame = 0; frame < props.timing.total; frame += 1) {
    const scene = sceneAt(props, frame);
    for (const text of [...scene.brackets.map((b) => b.figure), ...scene.captions.map((c) => c.figure)].filter(Boolean))
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
    { name: `subject-${props.plan[1].do}`, frame: mid("subject") },
    { name: "end-subject", frame: end("subject") },
    { name: `conclusion-${props.plan[2].do}`, frame: mid("conclusion") },
    { name: "final", frame: T.total - 1 },
  ];
  const { wantedOf } = await import((await import("#shared/design-base/skill-script.mjs")).skillScriptFrom(HERE, "chart-video", "scripts", "video-faces.mjs"));
  await renderBeatVideo({
    Frame: GestureStackFrame,
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
