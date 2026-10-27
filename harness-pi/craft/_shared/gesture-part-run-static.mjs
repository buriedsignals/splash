// The generic half of every Part-to-whole GESTURE still (treemap, marimekko-mosaic-plot, pie-and-donut): the per-type
// kits' runners with their fixed staging replaced by the beat's `gestures`. Guard order: importBeat → applyStoryboard →
// REQUIRED → the marks (partMarks: a negative part is the one shape refusal, no layout draws it truthfully) → check()
// and the shared guards → the gesture core with this family's hooks (validatePart, claim read from STORYBOARD.md) →
// the static scheduler (composePartStatic) → render → `look at:`. A gesture refusal prints REFUSED with the beat.mjs
// field and a value that works; with SPLASH_GESTURE_REPAIR=1 the refusal's fix is applied instead ("REPAIRED
// gestures: <field> → <fix>") and the list staged again, at most 12 times. Nothing here refuses the data's SHAPE
// (part count, which part leads, long names, zero parts): the plate folds what it has no room for into a remainder.
// Node-side (the kit's render-beat.mjs imports it flat from the beat folder).
import { existsSync, readFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { basename, join } from "node:path";
import { createElement } from "react";
import { renderStill } from "#shared/chart-beat/render-still.mjs";
import { readPalette } from "#shared/chart-beat/colour.mjs";
import { composeDirections, filedDirections, report as composeReport, resolveDirectionFamilies } from "#shared/design-base/index.mjs";
import { directionReachable, readRunDirection } from "#shared/design-base/run-direction.mjs";
import { assertBeatMayEnter, directedFrame, exportSizeFromArgv, nameAtSize } from "#shared/chart-beat/directed-size.mjs";
import { applyFix, GestureRefusal } from "./gesture-core.mjs";
import { partMarks, validatePart, SEP } from "./gesture-family-part.mjs";
import { composePartStatic } from "./gesture-part-static.mjs";
import { applyStoryboard, assertHeadlineNumbersDrawn, assertLegibleLabels, assertNoAggregates, errorText, importBeat, legibleFormat, rowFacts, runCheck } from "./guards.mjs";

/** The beat.mjs fields every part-to-whole gesture beat gives (CONTRACT.md). */
export const REQUIRED = ["eyebrow", "rows", "gestures", "format", "unit", "restLabel", "title", "limits", "source", "alt", "check"];

/** STORYBOARD.md's front matter, as the claim the gestures must serve. */
export function readClaim(here, fallbackTitle, unit) {
  const file = join(here, "..", "..", "STORYBOARD.md");
  const text = existsSync(file) ? readFileSync(file, "utf8").split("---")[1] ?? "" : "";
  const front = (key) => text.match(new RegExp(`^${key}:\\s*"?(.*?)"?\\s*$`, "m"))?.[1]?.replace(/\\"/g, '"');
  return {
    takeaway: front("takeaway") ?? fallbackTitle,
    subject: front("subject"),
    comparison: front("comparison"),
    entity: front("claimEntity"),
    versus: front("claimVersus"),
    facts: rowFacts(here),
    unit,
  };
}

/** The beat's marks and guards, shared by every format's runner: what the data says before any gesture is read. */
export function readPartBeat(beat, here, variant) {
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const fn of ["format", "check"]) if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);
  if (!Array.isArray(beat.gestures)) throw new Error("beat.mjs: gestures must be an array of { do, mark | marks, … } (see CONTRACT.md)");
  if (!String(beat.restLabel).trim()) throw new Error(`beat.mjs: restLabel is empty: give the words printed on the part that holds what the frame has no room for, e.g. "other countries"`);
  const marks = partMarks(variant, beat.rows);
  runCheck(beat);
  const names = variant === "marimekko-mosaic-plot" ? [...new Set(marks.flatMap((m) => [m.key, m.series]))] : marks.map((m) => m.name);
  assertNoAggregates(names, here);
  const format = (v) => String(beat.format(v));
  const whole = marks.reduce((s, m) => s + m.value, 0);
  const title = [beat.title].flat().map(String);
  // A part-to-whole headline states parts, sums of parts, the whole, or counts of parts.
  const keys = variant === "marimekko-mosaic-plot" ? [...new Set(marks.map((m) => m.key))].map((k) => marks.filter((m) => m.key === k).reduce((s, m) => s + m.value, 0)) : [];
  const series = variant === "marimekko-mosaic-plot" ? [...new Set(marks.map((m) => m.series))].map((k) => marks.filter((m) => m.series === k).reduce((s, m) => s + m.value, 0)) : [];
  return { marks, format, whole, title, headlineValues: [...marks.map((m) => m.value), ...keys, ...series, whole] };
}

/** Prints the refusal and exits, as every kit does. */
export function refuse(field, message, fix) {
  const value = fix && ("set" in fix ? fix.set.value : "add" in fix ? fix.add.gesture : undefined);
  const hint = "remove" in (fix ?? {}) ? " (drop that gesture)" : value !== undefined ? ` — a value that works: ${JSON.stringify(value)}` : "";
  console.log(`REFUSED — ${field}: ${message}${hint}`);
  process.exit(1);
}

/** Validate on this family, then a format's own scheduler (`schedule(valid, entities)`), with the repair loop. */
export function stagePart({ variant, beat, marks, claim, format, schedule, repair = process.env.SPLASH_GESTURE_REPAIR === "1" }) {
  let gestures = beat.gestures;
  for (let step = 0; ; step++) {
    try {
      const { valid, entities, gestures: accepted } = validatePart({ variant, gestures, marks, claim, format });
      return { valid, entities, gestures: accepted, scheduled: schedule(valid, entities) };
    } catch (error) {
      if (!(error instanceof GestureRefusal)) throw error;
      if (!repair || step >= 12) refuse(error.field, error.message.slice(error.field.length + 2), error.fix);
      console.log(`REPAIRED gestures: ${error.field} → ${JSON.stringify(error.fix)}`);
      gestures = applyFix(gestures, error.fix);
    }
  }
}

/** The static kit's whole run: `bun render-beat.mjs [--size …]` in the beat folder. */
export async function runPartStatic({ here, variant, Component }) {
  const beat = await importBeat(here).catch((error) => {
    console.log(`REFUSED — ${errorText(error)}`);
    process.exit(1);
  });
  try {
    applyStoryboard(beat, here);
  } catch (error) {
    console.log(`REFUSED — ${errorText(error)}`);
    process.exit(1);
  }
  const OUT = join(here, "renders");
  const SIZE = exportSizeFromArgv();
  const FRAME = directedFrame(SIZE);
  assertBeatMayEnter(here, SIZE, { what: basename(here) });
  let read;
  try {
    read = readPartBeat(beat, here, variant);
  } catch (error) {
    console.log(`REFUSED — ${errorText(error)}`);
    process.exit(1);
  }
  const { marks, title, headlineValues } = read;
  beat.format = legibleFormat(marks.map((m) => m.value), beat.format);
  const format = (v) => String(beat.format(v));
  const claim = readClaim(here, title[0], beat.unit);
  const { valid, scheduled: plate } = stagePart({ variant, beat, marks, claim, format: "static", schedule: (v) => composePartStatic({ variant, gestures: v, marks, format }) });
  const shown = [...plate.accent, ...plate.keep];
  assertLegibleLabels(marks.filter((m) => shown.includes(m.name)).map((m) => m.value), beat.format);
  // Counts the plate draws (how many parts each gesture acts on, how many parts in all) may be stated too.
  try {
    assertHeadlineNumbersDrawn(title[0], [...headlineValues, marks.length, ...valid.map((g) => g.marks.length)], "parts");
  } catch (error) {
    console.log(`REFUSED — ${errorText(error)}`);
    process.exit(1);
  }
  console.log(`  ${marks.length} parts · gestures: ${valid.map((g) => g.do).join(", ")} · accent: ${plate.accent.join(", ") || "—"}`);

  const limits = [beat.limits].flat().map(String);
  const notesText = [...plate.notes.map((n) => n.text), ...plate.brackets.map((b) => b.note ?? "")].join(" ");
  const textPerRegister = {
    display: title.join(" "),
    eyebrow: beat.eyebrow,
    body: `${limits.join(" ")} ${beat.source}`,
    axis: `${beat.unit} ${marks.map((m) => m.key ?? "").join(" ")} 0123456789`,
    annot: `${marks.map((m) => m.series ?? m.name).join(" ")} ${beat.restLabel} ${notesText} = + · % /`,
    value: `${marks.map((m) => format(m.value)).join(" ")} ${format(read.whole)}`,
  };
  const labelOf = (id) => id.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  let chosen;
  if (directionReachable(here)) {
    const run = readRunDirection(here);
    chosen = { label: labelOf(run.id), direction: run };
  } else {
    const composition = composeDirections({ newsroom: readPalette(here), filed: filedDirections(), beat: { evidenceLevels: beat.evidenceLevels ?? 2 }, textPerRegister });
    if (!composition.offered.length) {
      console.log(`REFUSED — no composed direction holds up for this beat:\n${composeReport(composition, {})}`);
      process.exit(1);
    }
    chosen = { label: labelOf(composition.offered[0].id), direction: composition.offered[0] };
  }
  const direction = resolveDirectionFamilies(chosen.direction, textPerRegister);
  const name = nameAtSize(chosen.label, SIZE);
  try {
    await renderStill({
      element: createElement(Component, {
        frame: { width: FRAME.width, height: FRAME.height },
        variant,
        marks,
        plate,
        format,
        unit: String(beat.unit),
        restLabel: String(beat.restLabel),
        title,
        limits,
        source: String(beat.source),
        alt: typeof beat.alt === "function" ? String(beat.alt(marks)) : String(beat.alt),
        eyebrow: String(beat.eyebrow),
        direction,
        onLadder: (note) => console.log(`  ${note}`),
      }),
      width: FRAME.width,
      height: FRAME.height,
      outDir: OUT,
      name,
      scale: FRAME.scale,
    });
    console.log(`rendered renders/${name}.png`);
    console.log(`look at: ${join(OUT, `${name}.png`)}`);
  } catch (error) {
    for (const ext of ["png", "svg"]) await rm(join(OUT, `${name}.${ext}`), { force: true });
    console.log(`REFUSED — ${errorText(error)}`);
    process.exit(1);
  }
}

export { SEP };
