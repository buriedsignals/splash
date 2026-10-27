// The paired family's STATIC runner: the whole render-beat flow every paired static kit shares, so each kit's
// render-beat.mjs is two lines naming its variant. Guard order, as the bar gesture kit's: importBeat → applyStoryboard →
// REQUIRED → the values → check() and the shared guards → the gesture core (validateGestures through stagePaired:
// family "paired", the claim read from STORYBOARD.md and resolved over keys and series, the family's hooks) → the
// static scheduler (composePairedStatic) → render → `look at:`. A gesture refusal prints REFUSED with the beat.mjs
// field and a value that works; with SPLASH_GESTURE_REPAIR=1 the refusal's fix is applied instead ("REPAIRED
// gestures: <field> → <fix>") and the list staged again, at most 12 times. Nothing here refuses the data's SHAPE (row
// count, gaps, negatives, long names): the plate adapts. Node-only (the components and schedulers are browser-safe).
import { existsSync, readFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { basename, join } from "node:path";
import { createElement } from "react";
import { renderStill } from "#shared/chart-beat/render-still.mjs";
import { readPalette } from "#shared/chart-beat/colour.mjs";
import { composeDirections, filedDirections, report as composeReport, resolveDirectionFamilies } from "#shared/design-base/index.mjs";
import { directionReachable, readRunDirection } from "#shared/design-base/run-direction.mjs";
import { assertBeatMayEnter, directedFrame, exportSizeFromArgv, nameAtSize } from "#shared/chart-beat/directed-size.mjs";
import { GestureRefusal, validateGestures } from "./gesture-core.mjs";
import { marksOf, pairedReadings, stagePaired } from "./gesture-family-paired.mjs";
import { composePairedStatic } from "./gesture-paired-static.mjs";
import { GesturePairedStatic } from "./GesturePairedStatic.tsx";
import { applyStoryboard, assertDrawsClaimColumn, assertHeadlineNumbersDrawn, assertLegibleLabels, assertNoAggregates, assertNumbers, errorText, importBeat, legibleFormat, rowFacts, runCheck } from "./guards.mjs";

/** The storyboard's front matter, field by field (the bar kits' reader). */
export function frontOf(here) {
  const file = join(here, "..", "..", "STORYBOARD.md");
  const text = existsSync(file) ? readFileSync(file, "utf8").split("---")[1] ?? "" : "";
  return (key) => text.match(new RegExp(`^${key}:\\s*"?(.*?)"?\\s*$`, "m"))?.[1]?.replace(/\\"/g, '"');
}

/** REFUSED — field: message — a value that works: … (the bar kits' wording). */
export function refusalText(error) {
  const { fix } = error;
  const value = fix && ("set" in fix ? fix.set.value : "add" in fix ? fix.add.gesture : undefined);
  const hint = "remove" in (fix ?? {}) ? " (drop that gesture)" : value !== undefined ? ` — a value that works: ${JSON.stringify(value)}` : "";
  return `${error.message}${hint}`;
}

/** The bullet's track end: the beat's `ceiling`, else 100 for a percentage, else none (the largest value). */
export const ceilingOf = (beat) => (Number.isFinite(Number(beat.ceiling)) ? Number(beat.ceiling) : /%|percent|pour ?cent|procent/i.test(String(beat.unit ?? "")) ? 100 : undefined);

export async function runPairedStatic({ here, variant }) {
  const beat = await importBeat(here).catch((error) => {
    console.log(`REFUSED — ${errorText(error)}`);
    process.exit(1);
  });
  try {
    applyStoryboard(beat, here);
    const REQUIRED = ["eyebrow", "series", "rows", "gestures", "format", "title", "limits", "source", "alt", "check"];
    const missing = REQUIRED.filter((key) => beat[key] === undefined);
    if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
    if (typeof beat.format !== "function" || typeof beat.check !== "function") throw new Error("beat.mjs: format and check must be functions (see CONTRACT.md)");
    // The marks, from the beat's rows: the family's own shape check (two values per row, one name per row).
    const { keys, marks } = marksOf({ rows: beat.rows, series: beat.series, variant });
    assertNumbers(marks.map((m) => [m.name, m.value]));
    beat.format = legibleFormat(marks.map((m) => m.value), beat.format);
    assertLegibleLabels(marks.map((m) => m.value), beat.format);
    runCheck(beat);
    assertDrawsClaimColumn(marks.map((m) => m.value), here);
    assertNoAggregates(keys.map((k) => k.name), here);
    // A paired headline may state a change or a ratio the marks do not hold as values: the guard reads the marks
    // and every pair's change, so a takeaway's "+17,3 points" is drawn when the pair draws it.
    assertHeadlineNumbersDrawn([beat.title].flat()[0], [...marks.map((m) => m.value), ...pairedReadings(keys)], "marks");

    const front = frontOf(here);
    const claim = {
      takeaway: front("takeaway") ?? [beat.title].flat()[0],
      subject: front("subject"),
      comparison: front("comparison"),
      entity: front("claimEntity"),
      versus: front("claimVersus"),
      facts: rowFacts(here),
      unit: beat.unit,
    };
    const ceiling = ceilingOf(beat);
    let staged;
    try {
      staged = stagePaired({
        gestures: beat.gestures,
        variant,
        rows: beat.rows,
        series: beat.series,
        format: "static",
        claim,
        ceiling,
        validateGestures,
        repair: process.env.SPLASH_GESTURE_REPAIR === "1",
        then: (o) => composePairedStatic({ gestures: o.gestures, keys: o.keys, marks: o.marks, series: o.series, variant, format: beat.format, claim: o.claim }),
      });
    } catch (error) {
      if (error instanceof GestureRefusal) {
        console.log(`REFUSED — ${refusalText(error)}`);
        process.exit(1);
      }
      throw error;
    }
    for (const r of staged.repairs) console.log(`REPAIRED gestures: ${r.field} → ${JSON.stringify(r.fix)}`);
    const plate = staged.staged;
    console.log(`  ${variant}: ${keys.length} rows · gestures ${staged.list.map((g) => g.do).join(", ")} · accent ${plate.accent.join(", ") || "—"}`);

    const SIZE = exportSizeFromArgv();
    const FRAME = directedFrame(SIZE);
    assertBeatMayEnter(here, SIZE, { what: basename(here) });
    const titles = [beat.title].flat();
    const limits = [beat.limits].flat();
    const textPerRegister = {
      display: titles.join(" "),
      eyebrow: beat.eyebrow,
      body: `${limits.join(" ")} ${beat.source}`,
      axis: [...keys.map((k) => k.name), ...staged.series].join(" "),
      annot: [...plate.notes.map((n) => n.text), ...plate.brackets.map((b) => b.note ?? ""), ...plate.references.map((r) => r.note ?? "")].join(" "),
      value: marks.map((m) => beat.format(m.value)).join(" "),
    };
    const labelOf = (id) => id.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    let chosen;
    if (directionReachable(here)) {
      const run = readRunDirection(here);
      chosen = { label: labelOf(run.id), direction: run };
    } else {
      const composition = composeDirections({ newsroom: readPalette(here), filed: filedDirections(), beat: { evidenceLevels: beat.evidenceLevels ?? 2 }, textPerRegister });
      if (!composition.offered.length) throw new Error(`no composed direction holds up for this beat:\n${composeReport(composition, {})}`);
      chosen = { label: labelOf(composition.offered[0].id), direction: composition.offered[0] };
    }
    const direction = resolveDirectionFamilies(chosen.direction, textPerRegister);
    const OUT = join(here, "renders");
    const name = nameAtSize(chosen.label, SIZE);
    try {
      await renderStill({
        element: createElement(GesturePairedStatic, {
          variant,
          keys,
          marks: staged.marks,
          series: staged.series,
          plate,
          format: beat.format,
          title: titles,
          limits,
          source: beat.source,
          alt: beat.alt,
          eyebrow: beat.eyebrow,
          unit: beat.unit,
          ceiling,
          scope: beat.scope,
          direction,
          frame: { width: FRAME.width, height: FRAME.height },
        }),
        width: FRAME.width,
        height: FRAME.height,
        outDir: OUT,
        name,
        scale: FRAME.scale,
      });
    } catch (error) {
      for (const ext of ["png", "svg"]) await rm(join(OUT, `${name}.${ext}`), { force: true });
      throw error;
    }
    console.log(`rendered renders/${name}.png`);
    console.log(`look at: ${join(OUT, `${name}.png`)}`);
  } catch (error) {
    console.log(`REFUSED — ${errorText(error)}`);
    process.exit(1);
  }
}
