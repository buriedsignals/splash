// The generic half of a heatmap (matrix) beat: art direction, treatments, render and refusals, taken
// from proof/static-heatmap-europe-electricity/render-directions.mjs with everything about ITS subject
// removed. Everything about THIS story — data, the columns, the classes, words, checks — lives in
// ./beat.mjs, the one file the model writes. Copied into the beat by the harness; never edited by the
// model.
//
// Usage:  bun <beat>/render-beat.mjs [--size landscape|square|portrait]
import { rm } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderStill } from "#shared/chart-beat/render-still.mjs";
import { readPalette } from "#shared/chart-beat/colour.mjs";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { composeDirections, filedDirections, report as composeReport, resolveDirectionFamilies } from "#shared/design-base/index.mjs";
import { directionReachable, readRunDirection } from "#shared/design-base/run-direction.mjs";
import { assertBeatMayEnter, directedFrame, exportSizeFromArgv, nameAtSize } from "#shared/chart-beat/directed-size.mjs";
import { DirectedHeatmap } from "./DirectedHeatmap.tsx";
import beat from "./beat.mjs";
import { applyStoryboard, assertNumbers, assertLegibleLabels, assertHeadlineNumbersDrawn } from "./guards.mjs";
applyStoryboard(beat, dirname(fileURLToPath(import.meta.url)));

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "renders");
const SIZE = exportSizeFromArgv();
const FRAME = directedFrame(SIZE);
assertBeatMayEnter(HERE, SIZE, { what: basename(HERE) });

const REQUIRED = ["eyebrow", "heads", "rows", "breaks", "region", "valueHead", "unit", "format", "title", "limits", "reading", "source", "alt", "check"];
const missing = REQUIRED.filter((key) => beat[key] === undefined);
if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);

const heads = beat.heads;
if (!Array.isArray(heads) || heads.length < 2) throw new Error(`heads holds ${heads?.length ?? 0} column(s); a matrix crosses at least two`);
for (const h of heads)
  if (!h || typeof h.key !== "string" || typeof h.label !== "string" || typeof h.family !== "string")
    throw new Error(`every head is { key, label, short?, family }; got ${JSON.stringify(h).slice(0, 100)}`);

/** THE FAMILIES ARE CONTIGUOUS. A family's name is drawn once over its block of columns; a family
 *  split into two blocks would be named over one and silently missing over the other. */
const families = [];
for (const [i, h] of heads.entries()) {
  const last = families[families.length - 1];
  if (last && last.name === h.family) last.to = i;
  else {
    if (families.some((f) => f.name === h.family))
      throw new Error(`the family "${h.family}" appears in two separate blocks of heads: order heads so each family's columns sit side by side`);
    families.push({ name: h.family, short: beat.familyShort?.[h.family], from: i, to: i });
  }
}

const rows = beat.rows;
if (!Array.isArray(rows) || rows.length < 2) throw new Error(`rows holds ${rows?.length ?? 0} row(s); a matrix crosses at least two`);
for (const r of rows) {
  if (!r || typeof r.key !== "string" || typeof r.label !== "string" || !Array.isArray(r.cells))
    throw new Error(`every row is { key, label, value, cells: [one number per head] }; got ${JSON.stringify(r).slice(0, 100)}`);
  if (r.cells.length !== heads.length) throw new Error(`row ${r.key} has ${r.cells.length} cells for ${heads.length} heads: give one cell per head, in the heads' order`);
}
assertNumbers(rows.flatMap((r) => [[`${r.key} value`, r.value], ...r.cells.map((v, i) => [`${r.key}/${heads[i].key}`, v])]));
const keys = new Set(rows.map((r) => r.key));
if (keys.size !== rows.length) throw new Error(`two rows share a key; give every row its own key`);

/** THE SCALE IS STEPPED: breaks are the class edges, in the cells' own units, strictly rising. */
const { breaks } = beat;
if (!Array.isArray(breaks) || !breaks.length || breaks.some((b, i) => !Number.isFinite(b) || (i && b <= breaks[i - 1])))
  throw new Error(`breaks are the class edges, numbers strictly rising (e.g. [2, 5, 10, 20, 40]); got ${JSON.stringify(breaks)}`);
const cells = rows.flatMap((r) => r.cells);
const lo = Math.min(...cells), hi = Math.max(...cells);
if (breaks[breaks.length - 1] <= lo || breaks[0] > hi)
  throw new Error(`every cell falls in one class (cells run ${lo} to ${hi}, breaks ${breaks.join(", ")}): put the breaks inside the cells' range`);

/** THE REGION IS THE TOP BLOCK OF ROWS THE TAKEAWAY IS ABOUT, bracketed and named. */
const { region } = beat;
if (!region || !Number.isInteger(region.from) || !Number.isInteger(region.to) || region.from < 0 || region.to >= rows.length || region.from > region.to || typeof region.label !== "string")
  throw new Error(`region is { from, to, label }: the first and last row INDEX (0-based, from <= to < ${rows.length}) of the block the takeaway is about, and the words drawn beside its bracket; got ${JSON.stringify(region)}`);

assertLegibleLabels(rows.map((r) => r.value), beat.format);
beat.check();
// No claim-column guard: a matrix's cells come from many columns (or are shares of a row computed
// across them), so no single column holds what is drawn.
assertHeadlineNumbersDrawn([beat.title].flat()[0], [...rows.map((r) => r.value), ...cells, ...breaks, rows.length, region.to - region.from + 1], "cells");

const title = [beat.title].flat();
const limits = [beat.limits].flat();
const reading = [beat.reading].flat();
const facts = beatFacts(
  rows.map((r) => ({ key: r.key, label: r.label, value: r.value })),
  {
    subject: beat.subject ?? rows[region.from].key,
    cells: rows.flatMap((r) => r.cells.map((value, i) => ({ key: `${r.key}-${i}`, value }))),
    impossibleCells: 0,
    scaleClasses: breaks.length + 1,
    groups: heads.map((h) => h.family),
    declaredSequence: beat.declaredSequence ?? "row value",
  },
);
const offered = applicableTreatments(facts);
const textPerRegister = {
  display: title.join(" "),
  eyebrow: beat.eyebrow,
  body: `${limits.join(" ")} ${beat.source}`,
  axis: `${rows.map((r) => r.label).join(" ")} ${heads.map((h) => h.label).join(" ")} ${breaks.map(beat.format).join(" ")} ${beat.unit} ${beat.valueHead}`,
  annot: `${reading.join(" ")} ${families.map((f) => f.name).join(" ")} ${region.label}`,
  value: rows.map((r) => beat.format(r.value)).join(" "),
};

const labelOf = (id) => id.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const newsroom = readPalette(HERE);
let chosen;
if (directionReachable(HERE)) {
  const run = readRunDirection(HERE);
  chosen = [{ label: labelOf(run.id), direction: run }];
} else {
  const composition = composeDirections({ newsroom, filed: filedDirections(), beat: { evidenceLevels: beat.evidenceLevels ?? breaks.length + 1 }, textPerRegister });
  if (!composition.offered.length) throw new Error(`no composed direction holds up for this beat:\n${composeReport(composition, {})}`);
  chosen = composition.offered.slice(0, 1).map((d) => ({ label: labelOf(d.id), direction: d }));
}

const refused = [];
for (const { label: id, direction: chosenDirection } of chosen) {
  const direction = resolveDirectionFamilies(chosenDirection, textPerRegister);
  try {
    await renderStill({
      element: createElement(DirectedHeatmap, {
        frame: { width: FRAME.width, height: FRAME.height },
        // The component names the right-hand measure `lowCarbon` after its worked example.
        rows: rows.map((r) => ({ key: r.key, label: r.label, lowCarbon: r.value, shares: r.cells })),
        sources: heads.map((h) => ({ key: h.key, label: h.label, short: h.short, family: h.family })),
        families,
        breaks,
        region,
        shareHead: beat.valueHead,
        unit: beat.unit,
        title,
        limits,
        reading,
        source: beat.source,
        alt: beat.alt,
        eyebrow: beat.eyebrow,
        format: beat.format,
        direction,
        treatments: offered.map((t) => t.id),
        onLadder: (note) => console.log(`  ${note}`),
      }),
      width: FRAME.width,
      height: FRAME.height,
      outDir: OUT,
      name: nameAtSize(id, SIZE),
      scale: FRAME.scale,
    });
    console.log(`rendered renders/${nameAtSize(id, SIZE)}.png`);
  } catch (error) {
    for (const ext of ["png", "svg"]) await rm(join(OUT, `${nameAtSize(id, SIZE)}.${ext}`), { force: true });
    refused.push({ id, why: error.message });
    console.log(`REFUSED — ${error.message}`);
  }
}
if (refused.length) process.exit(1);
