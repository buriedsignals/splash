// The generic half of a hex-cartogram beat (one hexagon per named unit): the designed layout checked
// both ways against the data, the stepped classes, the treatments and the render, taken from
// proof/static-hex-grid-europe-protection/render-directions.mjs with everything about ITS subject
// removed. Everything about THIS story — which column holds the unit's code, which the value (and
// the optional denominator), the subject, the words and the checks — lives in ./beat.mjs, the one
// file the model writes. Copied into the beat by the harness; never edited by the model.
//
// This kit draws the hex CARTOGRAM reading of the type (the worked example's), not the binning of
// scattered events into arbitrary cells: one hexagon per unit, no basemap — the form gives up
// position, and the refusal of a basemap is the worked example's own.
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
import { DirectedHexGrid } from "./DirectedHexGrid.tsx";
import beat from "./beat.mjs";
import { applyStoryboard, assertNumbers, assertDrawsClaimColumn } from "./guards.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
applyStoryboard(beat, HERE);
const OUT = join(HERE, "renders");
const SIZE = exportSizeFromArgv();
const FRAME = directedFrame(SIZE);
assertBeatMayEnter(HERE, SIZE, { what: basename(HERE) });

const REQUIRED = ["eyebrow", "key", "value", "subject", "unit", "format", "title", "limits", "reading", "source", "alt", "check"];
const missing = REQUIRED.filter((k) => beat[k] === undefined);
if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
const forms = (v) => [v].flat();

/** THE WORKED EXAMPLE'S LAYOUT, DESIGNED NOT DERIVED: Europe and Ukraine, odd rows offset by half a
 *  cell so every neighbour is an edge neighbour. ISO 3166-1 alpha-3 codes. A beat on other units
 *  passes its own `grid` in the same shape. */
const EUROPE_GRID = [
  ".   ISL .   .   NOR SWE FIN .",
  ".   .   IRL DNK .   EST LVA .",
  ".   .   NLD DEU POL LTU UKR .",
  ".   BEL LUX CHE CZE SVK HUN ROU",
  "PRT ESP FRA LIE AUT SVN HRV BGR",
  ".   .   MLT ITA .   GRC CYP .",
];
const GRID = beat.grid ?? EUROPE_GRID;
if (!Array.isArray(GRID) || !GRID.every((r) => typeof r === "string"))
  throw new Error(`beat.grid must be an array of strings, one per row, codes separated by spaces and "." for an empty cell`);

// ── the readings, by the columns the beat names ─────────────────────────────
const table = JSON.parse(readFileSync(join(HERE, "data.json"), "utf8"));
const at = (name, field) => {
  const i = (table.columns ?? []).findIndex((c) => c.name === name);
  if (i < 0)
    throw new Error(`beat.mjs's ${field} names the column ${JSON.stringify(name)}, which data.json does not have; its columns are ${table.columns.map((c) => c.name).join(", ")}`);
  return i;
};
const num = (raw) => (typeof raw === "number" ? raw : Number(String(raw).replace(/\s/g, "").replace(",", ".")));
const [KEY, VALUE] = [at(beat.key, "key"), at(beat.value, "value")];
const PER = beat.per ? at(beat.per, "per") : -1;
const BASE = beat.per ? beat.perBase : 1;
if (beat.per && !(Number.isFinite(BASE) && BASE > 0))
  throw new Error(`beat.per divides by ${beat.per}; perBase must say per how many (1000, 100000…)`);
const filters = Object.entries(beat.where ?? {}).map(([column, v]) => [at(column, "where"), String(v)]);
const rows = table.rows.filter((r) => filters.every(([i, v]) => String(r[i]) === v));
if (!rows.length) throw new Error(`no row of data.json matches where ${JSON.stringify(beat.where)}`);

const reading = new Map();
for (const r of rows) {
  const code = String(r[KEY]).trim();
  if (reading.has(code))
    throw new Error(`data.json gives two rows for ${code}: filter to one with where, so each unit has one value`);
  const v = num(r[VALUE]);
  const d = PER >= 0 ? num(r[PER]) : 1;
  if (PER >= 0 && !(d > 0)) throw new Error(`${code} has no usable ${beat.per} (${JSON.stringify(r[PER])}) to divide by`);
  reading.set(code, PER >= 0 ? (v / d) * BASE : v);
}
assertNumbers([...reading], PER >= 0 ? `${beat.value} per ${beat.per}` : beat.value);
if (PER < 0) assertDrawsClaimColumn([...reading.values()], HERE);

/** THE GRID IS CHECKED BOTH WAYS: every reading has a cell, and every cell has a reading — or is
 *  DECLARED as kept without a fill (`unmeasured`, with a note saying why) or as outside the study
 *  (`drop`, removed from the layout). A hand-drawn layout is the one thing a reader cannot check
 *  against the source, so nothing about it is left implicit. */
const drop = new Set(beat.drop ?? []);
const unmeasured = new Set(beat.unmeasured ?? []);
const cells = [];
GRID.forEach((row, r) =>
  row.trim().split(/\s+/).forEach((code, c) => {
    if (code === "." || drop.has(code)) return;
    cells.push({ code, row: r, col: c });
  }),
);
const laidOut = new Set(cells.map((c) => c.code));
const noCell = [...reading.keys()].filter((code) => !laidOut.has(code));
if (noCell.length)
  throw new Error(`data.json reports ${noCell.join(", ")}, which the layout has no cell for: check that key names the column of ISO3 codes the grid uses, filter those rows out with where (and say so in limits), or pass a grid that places them`);
const noReading = cells.filter((c) => !reading.has(c.code) && !unmeasured.has(c.code)).map((c) => c.code);
if (noReading.length)
  throw new Error(`the layout places ${noReading.join(", ")}, which data.json does not report: list each in unmeasured (kept on the map, no fill, explained by unmeasuredNote) or in drop (outside the study, removed)`);
const measuredAnyway = [...unmeasured].filter((code) => reading.has(code));
if (measuredAnyway.length)
  throw new Error(`unmeasured lists ${measuredAnyway.join(", ")}, which data.json does report: a unit with a reading is drawn in its class`);
if (unmeasured.size && !forms(beat.unmeasuredNote ?? []).filter(Boolean).length)
  throw new Error(`a cell with no fill needs a line saying why: give unmeasuredNote (forms, longest first)`);
if (!reading.has(beat.subject))
  throw new Error(`the subject ${JSON.stringify(beat.subject)} has no reading in data.json`);

beat.check();

// ── the classes ─────────────────────────────────────────────────────────────
const values = [...reading.values()];
const niceUp = (v) => {
  if (v === 0) return 0;
  const e = 10 ** (Math.floor(Math.log10(Math.abs(v))) - 1);
  return Math.round(v / e) * e;
};
const sorted = [...values].sort((a, b) => a - b);
const BREAKS =
  beat.breaks ??
  [0.2, 0.4, 0.6, 0.8]
    .map((q) => niceUp(sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))]))
    .filter((b, i, all) => all.indexOf(b) === i);
assertNumbers(BREAKS.map((b, i) => [`breaks[${i}]`, b]), "breaks");
if (!BREAKS.every((b, i) => i === 0 || b > BREAKS[i - 1])) throw new Error(`breaks must ascend strictly: ${BREAKS.join(", ")}`);
if (BREAKS.length < 2 || BREAKS.length > 6) throw new Error(`breaks makes ${BREAKS.length + 1} classes; a stepped scale wants 3 to 7`);
const classOf = (v) => BREAKS.filter((b) => v >= b).length;
const used = new Set(values.map(classOf));
if (used.size < 2) throw new Error(`every unit falls in one class with breaks ${BREAKS.join(", ")}: the map would say nothing — move the breaks inside the values' range (${sorted[0]} to ${sorted[sorted.length - 1]})`);

const tiles = cells.map((c) => {
  const v = reading.has(c.code) ? reading.get(c.code) : null;
  return { ...c, name: c.code, rate: v, classIndex: v === null ? null : classOf(v), isSubject: c.code === beat.subject };
});
const ranked = [...reading].sort((a, b) => b[1] - a[1]);
console.log(`${reading.size} units · top ${ranked.slice(0, 3).map(([k, v]) => `${k} ${v.toFixed(2)}`).join(", ")} · breaks ${BREAKS.join(", ")}`);

const facts = beatFacts(
  [...reading].map(([k, v]) => ({ key: k, label: k, value: v })),
  {
    subject: beat.subject,
    cells: tiles.map((t) => ({ key: t.code, value: t.rate ?? 0 })),
    impossibleCells: unmeasured.size,
    scaleClasses: BREAKS.length + 1,
    units: { count: reading.size, thing: "units" },
    geography: { areas: tiles.length, settlements: 0, waters: 0, basemap: false },
    declaredSequence: beat.unit,
  },
);
const offered = applicableTreatments(facts);

const plain = (s) => String(s).replace(/[   ]/g, " ");
const breakLabels = BREAKS.map((b) => plain(beat.format(b)));
if (new Set(breakLabels).size < breakLabels.length)
  throw new Error(`format() prints the breaks ${BREAKS.join(", ")} as ${breakLabels.join(", ")}: show enough decimals that each break reads differently`);
const unmeasuredNote = unmeasured.size ? forms(beat.unmeasuredNote) : [""];
const textPerRegister = {
  display: forms(beat.title).join(" "),
  eyebrow: beat.eyebrow,
  body: `${forms(beat.limits).join(" ")} ${beat.source}`,
  axis: `${beat.unit} ${unmeasuredNote.join(" ")} ${breakLabels.join(" ")} ${tiles.map((t) => t.code).join(" ")}`,
  annot: forms(beat.reading).join(" "),
  value: values.map((v) => plain(beat.format(v))).join(" "),
};

const labelOf = (id) => id.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
let chosen;
if (directionReachable(HERE)) {
  const run = readRunDirection(HERE);
  chosen = [{ label: labelOf(run.id), direction: run }];
} else {
  const composition = composeDirections({ newsroom: readPalette(HERE), filed: filedDirections(), beat: { evidenceLevels: 4 }, textPerRegister });
  if (!composition.offered.length) throw new Error(`no composed direction holds up for this beat:\n${composeReport(composition, {})}`);
  chosen = composition.offered.slice(0, 1).map((d) => ({ label: labelOf(d.id), direction: d }));
}

const refused = [];
for (const { label: id, direction: picked } of chosen) {
  const direction = resolveDirectionFamilies(picked, textPerRegister);
  try {
    await renderStill({
      element: createElement(DirectedHexGrid, {
        frame: { width: FRAME.width, height: FRAME.height },
        tiles,
        columns: Math.max(...GRID.map((r) => r.trim().split(/\s+/).length)),
        rows: GRID.length,
        breaks: breakLabels,
        unit: beat.unit,
        originNote: unmeasuredNote,
        originCode: [...unmeasured][0] ?? "",
        title: forms(beat.title),
        limits: forms(beat.limits),
        reading: forms(beat.reading),
        source: beat.source,
        alt: beat.alt,
        eyebrow: beat.eyebrow,
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
