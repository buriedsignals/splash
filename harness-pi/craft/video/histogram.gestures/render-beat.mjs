// The generic half of a Units-family GESTURE video (craft/gestures/GRAMMAR.md F5), variant `histogram`. Guard order:
// applyStoryboard → REQUIRED → the partition (built once, adapting to the data's shape and saying so) → check() on
// the counted groups and the shared guards → the gesture core with the family's hooks (format "video", claim read
// from STORYBOARD.md) → the units video scheduler and the layout (./build.mjs, ./gesture-units-video.mjs) → the type
// floor at every event's end and every climbing figure measured → the look stills, then the mp4. A gesture refusal
// prints REFUSED with the beat.mjs field and a value that works; with SPLASH_GESTURE_REPAIR=1 the refusal's fix is
// applied instead ("REPAIRED gestures: <field> → <fix>"), at most 12 times. Nothing here refuses the data's SHAPE.
// Everything about THIS story lives in ./beat.mjs. Copied into the beat by the harness; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs [--size landscape|square|portrait] [--look-only]
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { videoExportSize } from "#shared/chart-video/sizes.mjs";
import { applyStoryboard, assertDrawsClaimColumn, assertHeadlineNumbersDrawn, assertNumbers, importBeat, rowFacts } from "./guards.mjs";
import { GestureRefusal } from "./gesture-core.mjs";
import { headlineFigures, partitionOf, refusalText, runUnitsCheck, stageUnits } from "./gesture-family-units.mjs";
import { numberFormat, pickDirection, plain, refusing, renderBeatVideo, storyLanguage, assertEventFramesReadable } from "./video.mjs";

const VARIANT = "histogram";
const PARTITION = VARIANT === "histogram" ? ["binWidth", "binCount"] : ["blocks"];
const HERE = dirname(fileURLToPath(import.meta.url));
const COMPOSITION_BASE = "zone-video-histogram-gestures"; // Root.tsx registers `${COMPOSITION_BASE}-${size}`
const REPAIR = process.env.SPLASH_GESTURE_REPAIR === "1";

await refusing(HERE, async () => {
  const SIZE = videoExportSize();
  const beat = await importBeat(HERE);
  applyStoryboard(beat, HERE);
  if (beat.units === undefined && beat.observations !== undefined) beat.units = beat.observations;
  const REQUIRED = ["eyebrow", "units", "gestures", "title", "source", "check", ...PARTITION];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  if (typeof beat.check !== "function") throw new Error("beat.mjs: check must be a function (see CONTRACT.md)");
  if (!Array.isArray(beat.units) || !beat.units.length) throw new Error("beat.mjs: units must be a non-empty array of { name, value }, one per counted thing");
  if (!Array.isArray(beat.gestures)) throw new Error("beat.mjs: gestures must be an array of { do, mark | marks, … } (see CONTRACT.md)");

  // ── the partition, and the claim first
  assertNumbers(beat.units.map((u, i) => [u.name ?? u.label ?? i, Number(u.value)]), "units");
  const partition = partitionOf(beat, VARIANT);
  for (const line of partition.adapted) console.log(`  adapted: ${line}`);
  runUnitsCheck(beat, partition);
  assertDrawsClaimColumn(partition.groups.flatMap((g) => g.units.map((u) => u.value)), HERE);
  const title = plain([beat.title].flat()[0]);
  assertHeadlineNumbersDrawn(title, headlineFigures(partition), "groups");
  const groups = partition.groups.map((g) => ({ ...g, name: plain(g.name) }));
  const plainPartition = { ...partition, groups };

  // ── the words: a count is a whole number of things
  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";
  const format = numberFormat({ lang, max: partition.total, decimals: 0 });
  const copy = { eyebrow: plain(beat.eyebrow), title, source: [beat.source].flat().map(plain), unit: plain([beat.unit, beat.unitIs].filter(Boolean).join(" · ")), format };
  if (!copy.title.trim()) throw new Error("title must be the journalist's takeaway, copied as written");
  if (!copy.source.length || copy.source.some((t) => !t.trim())) throw new Error("source must hold at least one non-empty form");

  // ── the gestures, checked against the groups and the claim, then scheduled and laid out
  const front = (() => {
    const file = join(HERE, "..", "..", "STORYBOARD.md");
    const text = existsSync(file) ? readFileSync(file, "utf8").split("---")[1] ?? "" : "";
    return (key) => text.match(new RegExp(`^${key}:\\s*"?(.*?)"?\\s*$`, "m"))?.[1]?.replace(/\\"/g, '"');
  })();
  const claim = { takeaway: front("takeaway") ?? title, subject: front("subject"), comparison: front("comparison"), entity: front("claimEntity"), versus: front("claimVersus"), facts: rowFacts(HERE) };
  const { buildUnitsVideo, textPerRegisterOf } = await import("./build.mjs");
  const { label, chosen } = pickDirection(HERE, textPerRegisterOf(copy, groups, beat.gestures.filter((g) => g && typeof g === "object")), beat.evidenceLevels ?? 2);
  let staged;
  try {
    staged = stageUnits({
      gestures: beat.gestures,
      partition: plainPartition,
      claim,
      format: "video",
      repair: REPAIR,
      schedule: (valid) => buildUnitsVideo({ id: label, chosen, variant: VARIANT, groups, gestures: valid, copy, size: SIZE }),
    });
  } catch (error) {
    if (!(error instanceof GestureRefusal)) throw error;
    throw new Error(refusalText(error));
  }
  for (const r of staged.repairs) console.log(`REPAIRED gestures: ${r.field} → ${JSON.stringify(r.fix)}`);
  const { props, report, direction } = staged.scheduled;
  console.log(`direction ${label}`);
  for (const d of direction.decisions ?? []) console.log(`  ${d.register.padEnd(8)} ${d.role.padEnd(15)} -> ${d.family}`);
  console.log(`  ${report.groups} groups · row pitch ${report.pitch} · cell ${report.cell} · ${report.captions} caption line(s) · title on ${report.titleLines} line(s)`);
  console.log(`  gestures: ${props.plan.map((p) => `${p.event} ${p.do}${p.marks.length ? ` ${p.marks.join(", ")}` : ""}`).join(" · ")}`);

  const { GestureUnitsFrame } = await import("./GestureUnitsFrame.tsx");
  const { sceneUnitsAt } = await import("./gesture-units-video.mjs");
  try {
    assertEventFramesReadable(GestureUnitsFrame, props, SIZE, label);
  } catch (error) {
    throw new Error(`${error.message} — shorten the words that frame draws (group names, notes, the title, source forms)`);
  }
  for (let frame = 0; frame < props.timing.total; frame += 1) {
    const scene = sceneUnitsAt(props, frame);
    for (const text of [...scene.brackets.map((b) => b.figure), ...scene.captions.map((c) => c.figure)].filter(Boolean))
      if (!(text in props.countWidths)) throw new Error(`a figure shows ${JSON.stringify(text)} at frame ${frame}, a text build.mjs did not measure (a kit bug, not a beat.mjs one)`);
  }

  const T = props.timing;
  const end = (e) => T[e].start + T[e].duration - 1;
  const mid = (e) => Math.round(T[e].start + T[e].duration * 0.5);
  const lookFrames = [
    { name: "first", frame: 0 },
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
    Frame: GestureUnitsFrame,
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
