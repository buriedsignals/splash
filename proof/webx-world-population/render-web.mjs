// twin/proof/webx-world-population/render-web.mjs
//
// This beat's own WEB runner. `data.csv` is the frozen OWID export (copied from
// `proof/static-world-population/data.csv`, the already-verified static sibling) — 225 rows, World
// only, 1800-2023; re-verified here (entity, row count, span) rather than trusted on sight.
//
// The skill's own `assets/interaction.mjs` is reused nearly unchanged — an area's continuous x-axis
// is exactly the shape it was built for. `repair()` below patches TWO things into the emitted file
// after `renderWeb` writes it: the `lang` this beat's own English words need, and one anchored line
// of the interaction script, so that a tap survives the finger lifting (see `repair`'s own note).
//
// SECOND BUILD: migrated to the format's FLUID FRAME. `renderWeb` no longer takes a `layouts` array
// (the two-rung design was overturned — see `WorldPopulationWeb.tsx`'s own doc-comment); this
// runner hands it one component and one `frame`.
//
// Usage:  bun proof/webx-world-population/render-web.mjs [outDir] [--data <csv>]

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readPalette } from "#shared/chart-beat/render-still.mjs";
import { renderWeb } from "#shared/chart-web/scripts/render-web.mjs";
import { WorldPopulationWeb, FRAME } from "./WorldPopulationWeb.tsx";
// The beat's own formatters, taking their locale from the language the page declares — the same
// ones the component labels every reading with, so the prose and the axis cannot disagree.
import { billions, formatNumber } from "./population-geometry.ts";

/**
 * RFC 4180 row tokeniser, inlined here rather than imported — no cross-skill runtime import, and
 * a proof/story workspace is not a skill either. A naive comma split corrupts a quoted thousands
 * separator ("1,234.5") or a quoted name carrying its own comma ("Netherlands, the"); this walks
 * the text one character at a time instead. Returns one array of raw field strings per row
 * (header included), quotes stripped, doubled quotes un-escaped, and a lone CR or CRLF closing a
 * row the same way LF does.
 */
function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  let i = 0;
  while (i < text.length) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        quoted = false; i += 1; continue;
      }
      field += char; i += 1; continue;
    }
    if (char === '"') { quoted = true; i += 1; continue; }
    if (char === ",") { row.push(field); field = ""; i += 1; continue; }
    if (char === "\r") { row.push(field); rows.push(row); row = []; field = ""; i += (text[i + 1] === "\n") ? 2 : 1; continue; }
    if (char === "\n") { row.push(field); rows.push(row); row = []; field = ""; i += 1; continue; }
    field += char; i += 1;
  }
  if (field !== "" || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

const HERE = dirname(fileURLToPath(import.meta.url));

export const BEAT = {
  // The two colours this beat is drawn in are NOT here. They are recorded in `PALETTE.md` beside
  // this file and read back by `readPalette` in `render` below — a hex typed here is a colour the
  // newsroom's own recorded answer can never reach.
  source:
    "Source: HYDE (2023), Gapminder (2022) & UN World Population Prospects (2024), via Our World in Data · World, 1800–2023, extracted 8 August 2026",
};

const DEFAULT_DATA_PATH = join(HERE, "data.csv");
// And the OUTPUT defaults beside the beat too — where this beat's html is actually committed. It
// used to default to a scratch directory, so running this script the obvious way produced a fresh
// file nobody looks at, printed a path, exited zero, and left the committed one stale.
const DEFAULT_OUT_DIR = HERE;
const OUTPUT_NAME = "world-population.html";

export function readingsFromCsv(csv) {
  const [header, ...rows] = parseCsvRows(csv.trim());
  const columns = header;
  const entityAt = columns.indexOf("Entity");
  const yearAt = columns.indexOf("Year");
  const valueAt = columns.indexOf("Population");
  if (entityAt < 0 || yearAt < 0 || valueAt < 0)
    throw new Error(`csv has no Entity / Year / Population column, got: ${header}`);

  const records = rows.map((row) => row);
  const entities = [...new Set(records.map((r) => r[entityAt]))];
  if (entities.length !== 1 || entities[0] !== "World")
    throw new Error(`expected every row's Entity to read "World", got: ${entities.join(", ")}`);

  const readings = records
    .map((r) => ({ year: Number(r[yearAt]), population: Number(r[valueAt]) }))
    .sort((a, b) => a.year - b.year);
  if (readings.length !== 224)
    throw new Error(`expected 224 readings (1800-2023), got ${readings.length}`);
  return readings;
}

export async function render({ dataPath, outDir, name = OUTPUT_NAME }) {
  const csv = await readFile(dataPath, "utf8");
  const data = readingsFromCsv(csv);

  const first = data[0];
  const last = data[data.length - 1];
  const multiple = last.population / first.population;

  const crossingRow = data.find((d) => d.population >= 1e9);
  if (!crossingRow) throw new Error("population never reaches 1 billion — claim would be false");

  // The headline's own crossing year, found from the data — NOT assumed to be `last.year`. A
  // previous draft of this beat asserted "passed 8 billion in 2023" (the last row's own year)
  // without checking when the series actually first reached 8 billion; the frozen CSV shows that
  // happened in 2022 (8,021,407,196), a full year earlier — caught by a render audit re-checking
  // the claim against this exact file, not by looking at the chart. Computed here so the title can
  // never drift from the CSV again.
  const eightBillionRow = data.find((d) => d.population >= 8e9);
  if (!eightBillionRow) throw new Error("population never reaches 8 billion — claim would be false");

  const title = `World population passed 8 billion in ${eightBillionRow.year}`;
  const limits = `${last.year}: ${billions(last.population, 2)} billion — more than ${formatNumber(multiple)}x its ${first.year} level of about ${billions(first.population, 2)} billion.`;
  const alt = `Filled area chart of world population, ${first.year} to ${last.year}. Population rises from about ${billions(first.population, 2)} billion in ${first.year} to ${billions(last.population, 2)} billion in ${last.year} (the latest year in this data), first crossing 1 billion in ${crossingRow.year} and 8 billion in ${eightBillionRow.year}. Every one of the ${data.length} annual readings has its own exact value on hover, tap or keyboard focus.`;

  const { ground, accent, origin, source: paletteSource } = readPalette(HERE, {
    stopAt: join(HERE, ".."),
  });
  console.log(
    `palette from ${paletteSource} — ground ${ground}, accent ${accent}, chosen by ${origin}`,
  );

  // The language this beat's words are written in, handed to `renderWeb` as a real input
  // rather than patched into the shipped file afterwards — see `assertRecordedLanguage` in
  // `skills/chart-web/scripts/render-web.mjs`. Recorded here, never detected from the prose.
  const { outPath } = await renderWeb({
    component: WorldPopulationWeb,
    props: {
      language: "en",
      data,
      title,
      limits,
      source: BEAT.source,
      alt,
      ground,
      accent,
      crossing: { year: crossingRow.year, label: `passed 1 billion in ${crossingRow.year}` },
      frame: FRAME,
    },
    outDir,
    name,
  });

  await repair(outPath);

  return { outPath, readings: data.length, crossingYear: crossingRow.year };
}

// The format's own line, verbatim, and the guarded one that replaces it. A touch pointer is
// destroyed the instant the finger lifts, and Chrome then fires `pointerleave` up the whole chain
// for it — so an unguarded `pointerleave` handler wipes the tooltip the tap has just opened. This
// beat's alt text promises every one of its 224 readings "on hover, tap or keyboard focus", and the
// tap half was FALSE: measured on the committed artifact with a real CDP touch sequence
// (touchStart → 150ms → touchEnd → 500ms) at 390x844, the reading appeared and then vanished
// inside one gesture. Same defect, same remedy as
// `proof/weby-small-multiples-co2-per-capita/small-multiples-interaction.mjs` — clear on
// `pointerleave` for MOUSE AND PEN ONLY; a touch reader's tooltip is cleared instead by the
// document-level `pointerdown` the format already installs, so it holds until they tap elsewhere,
// which is what a tap-to-inspect control should do.
//
// Patched HERE, into the emitted HTML, rather than into the format's shared
// `chart-web/assets/interaction.mjs`, because that file is outside this beat's scope and is
// being edited concurrently. It is an ANCHORED replacement, not a vendored copy of the whole
// module: a copy would drift silently the moment the format's script changed, whereas this throws
// by name if the line it expects is no longer there.
const LEAVE_LINE = '    hitArea.addEventListener("pointerleave", clear);';
const LEAVE_GUARDED = `    hitArea.addEventListener("pointerleave", function (evt) {
      // Mouse and pen only — see this beat's render-web.mjs for the measurement.
      if (evt.pointerType === "touch") return;
      clear();
    });`;

async function repair(outPath) {
  let html = await readFile(outPath, "utf8");

  if (html.split(LEAVE_LINE).length !== 2)
    throw new Error(
      `expected exactly one ${JSON.stringify(LEAVE_LINE.trim())} in the inlined interaction script ` +
        "to guard against a touch pointer's own leave — the format's script may already guard it, in " +
        "which case delete this patch rather than widening it",
    );
  html = html.replace(LEAVE_LINE, LEAVE_GUARDED);

  await writeFile(outPath, html);
}

if (import.meta.main) {
  const argv = process.argv.slice(2);
  const flag = (name, fallback) => {
    const at = argv.indexOf(name);
    return at >= 0 ? argv[at + 1] : fallback;
  };
  const positional = argv.find((a) => !a.startsWith("--"));
  const dataPath = resolve(flag("--data", DEFAULT_DATA_PATH));
  const outDir = resolve(positional ?? flag("--out", DEFAULT_OUT_DIR));

  const { outPath, readings, crossingYear } = await render({ dataPath, outDir });
  console.log(`web beat → ${outPath}  [${readings} readings, crossed 1B in ${crossingYear}]`);
}
