// The generic half of a tile-cartogram beat: the grid, the join, the classes, art direction, render
// and refusals, taken from proof/static-cartogram-europe-lowcarbon/render-directions.mjs with
// everything about ITS subject removed. Everything about THIS story — the join column, the values,
// the breaks, words, checks — lives in ./beat.mjs, the one file the model writes. Copied into the
// beat by the harness; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs [--size landscape|square|portrait]
import { readFileSync } from "node:fs";
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
import { DirectedTileCartogram } from "./DirectedTileCartogram.tsx";
import { placeTiles, classOf } from "./tile-grid.mjs";
import beat from "./beat.mjs";
import { applyStoryboard, assertNumbers, assertLegibleLabels, assertDrawsClaimColumn, errorText } from "./guards.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
applyStoryboard(beat, HERE);
const OUT = join(HERE, "renders");
const SIZE = exportSizeFromArgv();
const FRAME = directedFrame(SIZE);
assertBeatMayEnter(HERE, SIZE, { what: basename(HERE) });

const REQUIRED = ["eyebrow", "keyColumn", "values", "breaks", "format", "unit", "missingLabel", "title", "limits", "reading", "source", "alt", "check"];
const missing = REQUIRED.filter((key) => beat[key] === undefined);
if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
if (!Array.isArray(beat.values) || !beat.values.every((v) => v && typeof v.code === "string" && "value" in v))
  throw new Error(`values must be an array of { code, value } (value null where the source does not report the country)`);

// ── THE JOIN, LOUD, BOTH WAYS ───────────────────────────────────────────────
// A key that does not match draws as a blank tile nobody notices: every code drawn must be a key of
// data.json's join column, and every key of that column must be drawn (or the row filtered out of
// data.json's reading in beat.mjs on purpose — then it is not in the column's kept rows either).
const table = JSON.parse(readFileSync(join(HERE, "data.json"), "utf8"));
const keyAt = table.columns.findIndex((c) => c.name === beat.keyColumn);
if (keyAt < 0)
  throw new Error(`keyColumn ${JSON.stringify(beat.keyColumn)} is not a column of data.json; its columns are ${table.columns.map((c) => c.name).join(", ")}`);
const keys = new Set(table.rows.map((r) => String(r[keyAt])));
const notInData = beat.values.map((v) => v.code).filter((c) => !keys.has(c));
if (notInData.length)
  throw new Error(`values names ${notInData.join(", ")}, which data.json's ${beat.keyColumn} column does not hold: read the codes from that column, never type them`);
const drawnCodes = new Set(beat.values.map((v) => v.code));
const unjoined = [...keys].filter((k) => !drawnCodes.has(k) && !(beat.excluded ?? []).includes(k));
if (unjoined.length)
  throw new Error(
    `data.json's ${beat.keyColumn} holds ${unjoined.slice(0, 8).join(", ")}${unjoined.length > 8 ? "…" : ""}, which values does not draw. ` +
      `Give every row a value (null if the source does not report it), or list the codes you leave out on purpose in excluded and say why in the limits`,
  );
const { tiles: placed, cols, rows } = placeTiles(beat.values);

// ── THE NUMBERS AND THE CLASSES ─────────────────────────────────────────────
const reported = beat.values.filter((v) => v.value !== null);
assertNumbers(reported.map((v) => [v.code, v.value]));
const breaks = beat.breaks;
if (!Array.isArray(breaks) || breaks.length < 2 || breaks.length > 6)
  throw new Error(`breaks must be 2 to 6 ascending numbers (3 to 7 classes); got ${JSON.stringify(breaks)}`);
assertNumbers(breaks.map((b, i) => [`break ${i + 1}`, b]), "breaks");
if (breaks.some((b, i) => i && b <= breaks[i - 1])) throw new Error(`breaks must ascend strictly: ${breaks.join(", ")}`);
const lo = Math.min(...reported.map((v) => v.value));
const hi = Math.max(...reported.map((v) => v.value));
if (breaks[0] <= lo || breaks[breaks.length - 1] > hi)
  throw new Error(`breaks ${breaks.join(", ")} must fall inside the data's range (${lo} to ${hi}), or a class is drawn that no country is in`);
const klass = classOf(breaks);
const counts = Array.from({ length: breaks.length + 1 }, (_, i) => reported.filter((v) => klass(v.value) === i).length);
if (counts.some((n) => n === 0))
  throw new Error(`class ${counts.findIndex((n) => n === 0) + 1} of ${counts.length} holds no country with breaks ${breaks.join(", ")}: move the breaks so every class is used`);
assertLegibleLabels(breaks, beat.format);
beat.check();
assertDrawsClaimColumn(reported.map((v) => v.value), HERE);

const labels = beat.labels ?? {};
const tiles = placed.map((p) => ({ ...p, short: labels[p.iso] ?? p.iso, classIndex: klass(p.value) }));
const titles = [beat.title].flat();
const limits = [beat.limits].flat();
const reading = [beat.reading].flat();
const unreported = beat.values.filter((v) => v.value === null).length;
const facts = beatFacts(
  reported.map((v) => ({ key: v.code, label: v.code, value: v.value })),
  {
    subject: beat.subject ?? reported[0].code,
    cells: tiles.map((t) => ({ key: t.iso, value: t.value ?? 0 })),
    impossibleCells: unreported,
    scaleClasses: breaks.length + 1,
    units: { count: tiles.length, thing: "countries" },
    geography: { areas: tiles.length, settlements: 0, waters: 0, basemap: false },
    declaredSequence: beat.unit,
  },
);
const offered = applicableTreatments(facts);
const breakLabels = breaks.map((b) => beat.format(b));
const textPerRegister = {
  display: titles.join(" "),
  eyebrow: beat.eyebrow,
  body: `${limits.join(" ")} ${beat.source}`,
  axis: `${tiles.map((t) => t.short).join(" ")} ${breakLabels.join(" ")} ${beat.unit} ${beat.missingLabel}`,
  annot: reading.join(" "),
  value: breakLabels.join(" "),
};

const labelOf = (id) => id.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const newsroom = readPalette(HERE);
let chosen;
if (directionReachable(HERE)) {
  const run = readRunDirection(HERE);
  chosen = [{ label: labelOf(run.id), direction: run }];
} else {
  const composition = composeDirections({ newsroom, filed: filedDirections(), beat: { evidenceLevels: breaks.length + 1 }, textPerRegister });
  if (!composition.offered.length) throw new Error(`no composed direction holds up for this beat:\n${composeReport(composition, {})}`);
  chosen = composition.offered.slice(0, 1).map((d) => ({ label: labelOf(d.id), direction: d }));
}

const refused = [];
for (const { label: id, direction: chosenDirection } of chosen) {
  const direction = resolveDirectionFamilies(chosenDirection, textPerRegister);
  try {
    await renderStill({
      element: createElement(DirectedTileCartogram, {
        frame: { width: FRAME.width, height: FRAME.height },
        tiles,
        cols,
        rows,
        breaks: breakLabels,
        missingLabel: beat.missingLabel,
        unit: beat.unit,
        title: titles,
        limits,
        reading,
        source: beat.source,
        alt: typeof beat.alt === "function" ? beat.alt(tiles) : beat.alt,
        eyebrow: beat.eyebrow,
        direction,
        treatments: offered.map((t) => t.id),
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
    console.log(`REFUSED — ${errorText(error)}`);
  }
}
if (refused.length) process.exit(1);
