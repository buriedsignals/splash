// twin/proof/webx-life-expectancy/render-web.mjs
//
// This beat's own WEB runner — same shape as `proof/web-co2-ranking/render-web.mjs`: the story's
// own constants, its own CSV reader, its own component, handed to the format's generic `renderWeb`.
// `data.csv` is the frozen OWID export (copied from `proof/more-line-swiss-life-expectancy/data.csv`,
// the beat's already-verified static sibling) — 148 rows, Switzerland only, 1876-2023; re-verified
// here (entity, row count, span) rather than trusted on sight.
//
// The skill's own `assets/interaction.mjs` is reused nearly unchanged — a line is exactly the shape
// it was built for (one continuous axis, hover/tap/keyboard resolve by nearest x). `repair()` below
// patches TWO things into the emitted file after `renderWeb` writes it: the `lang` this beat's own
// words need (English throughout), and one anchored line of the interaction script, so that a tap
// survives the finger lifting (see `repair`'s own note).
//
// SECOND BUILD: migrated to the format's FLUID FRAME. `renderWeb` no longer takes a `layouts` array
// (the two-rung design was overturned — see `LifeExpectancyWeb.tsx`'s own doc-comment); this runner
// hands it one component and one `frame`.
//
// Usage:  bun proof/webx-life-expectancy/render-web.mjs [outDir] [--data <csv>]

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readPalette } from "#shared/chart-beat/render-still.mjs";
import { renderWeb } from "../../skills/chart-web/scripts/render-web.mjs";
import { LifeExpectancyWeb, FRAME } from "./LifeExpectancyWeb.tsx";
// The beat's own number formatter, taking its locale from the language the page declares — the
// same one the component labels every reading with, so the prose and the axis can never disagree.
import { formatNumber } from "./life-geometry.ts";

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
  subject: "Switzerland",
  // The two colours this beat is drawn in are NOT here. They are recorded in `PALETTE.md` beside
  // this file and read back by `readPalette` in `render` below — a hex typed here is a colour the
  // newsroom's own recorded answer can never reach.
  source:
    "Source: UN, World Population Prospects (2024), via Our World in Data · Switzerland, 1950–2023, extracted 8 August 2026",
};

const DEFAULT_DATA_PATH = join(HERE, "data.csv");
// And the OUTPUT defaults beside the beat too — where this beat's html is actually committed. It
// used to default to a scratch directory, so running this script the obvious way produced a fresh
// file nobody looks at, printed a path, exited zero, and left the committed one stale.
const DEFAULT_OUT_DIR = HERE;
const OUTPUT_NAME = "life-expectancy.html";

/** Parses the frozen CSV, verifies the entity/row-count/span it expects, and filters to the
 *  1950-2023 span the beat's own claim is about — the same checks
 *  `proof/more-line-swiss-life-expectancy/render.mjs` runs on this exact file. */
export function readingsFromCsv(csv) {
  const [header, ...rows] = parseCsvRows(csv.trim());
  const columns = header;
  const entityAt = columns.indexOf("Entity");
  const yearAt = columns.indexOf("Year");
  const valueAt = columns.indexOf("Life expectancy");
  if (entityAt < 0 || yearAt < 0 || valueAt < 0)
    throw new Error(`csv has no Entity / Year / Life expectancy column, got: ${header}`);

  const records = rows.map((row) => row);
  const entities = [...new Set(records.map((r) => r[entityAt]))];
  if (entities.length !== 1 || entities[0] !== "Switzerland")
    throw new Error(`expected every row's Entity to read "Switzerland", got: ${entities.join(", ")}`);

  const readings = records
    .map((r) => ({ year: Number(r[yearAt]), value: Number(r[valueAt]) }))
    .filter((r) => r.year >= 1950)
    .sort((a, b) => a.year - b.year);
  if (readings.length !== 74)
    throw new Error(`expected 74 readings (1950-2023), got ${readings.length}`);
  const first = readings[0];
  const last = readings[readings.length - 1];
  if (first.year !== 1950 || last.year !== 2023)
    throw new Error(`expected span 1950-2023, got ${first.year}-${last.year}`);
  return readings;
}

export async function render({ dataPath, outDir, name = OUTPUT_NAME }) {
  const csv = await readFile(dataPath, "utf8");
  const readings = readingsFromCsv(csv);

  const first = readings[0];
  const last = readings[readings.length - 1];
  const delta = last.value - first.value;
  const crossing = readings.find((r) => r.value >= 80);
  if (!crossing) throw new Error("readings never reach 80 — claim would be false");

  const title = `Life expectancy in Switzerland rose ${formatNumber(delta)} years between ${first.year} and ${last.year}`;
  // Descriptive, not a claim: every value in it is read back off the frozen CSV the parser above
  // already asserted (entity, row count, span), so it cannot drift from the file.
  const caveat = `Life expectancy at birth in ${BEAT.subject}, ${first.year}–${last.year}. Annual readings.`;
  const alt = `Line chart of life expectancy at birth in Switzerland, ${first.year} to ${last.year}. The line rises from ${formatNumber(first.value)} years in ${first.year} to ${formatNumber(last.value)} years in ${last.year}, a gain of ${formatNumber(delta)} years, first crossing 80 years in ${crossing.year}. Every one of the ${readings.length} annual readings, including two real dips around 2020 and 2022, has its own exact value on hover, tap or keyboard focus.`;

  const { ground, accent, origin, source: paletteSource } = readPalette(HERE, {
    stopAt: join(HERE, ".."),
  });
  console.log(
    `palette from ${paletteSource} — ground ${ground}, accent ${accent}, chosen by ${origin}`,
  );

  const { outPath } = await renderWeb({
    component: LifeExpectancyWeb,
    props: {
      data: readings,
      title,
      caveat,
      source: BEAT.source,
      alt,
      subject: BEAT.subject,
      ground,
      accent,
      referenceYear: first.year,
      crossingYear: crossing.year,
      frame: FRAME,
    },
    outDir,
    name,
  });

  await repair(outPath);

  return { outPath, readings: readings.length, delta, crossingYear: crossing.year };
}

// The format's own line, verbatim, and the guarded one that replaces it. A touch pointer is
// destroyed the instant the finger lifts, and Chrome then fires `pointerleave` up the whole chain
// for it — so an unguarded `pointerleave` handler wipes the tooltip the tap has just opened. This
// beat's alt text promises every one of its 74 readings "on hover, tap or keyboard focus", and the
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

  const langMarker = '<html lang="fr">';
  if (!html.includes(langMarker))
    throw new Error(
      `expected renderWeb's own ${JSON.stringify(langMarker)} shell to patch to English — its HTML shape may have changed`,
    );
  html = html.replace(langMarker, '<html lang="en">');

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

  const { outPath, readings, delta, crossingYear } = await render({ dataPath, outDir });
  console.log(
    `web beat → ${outPath}  [${readings} readings, +${formatNumber(delta)} years, crossed 80 in ${crossingYear}]`,
  );
}
