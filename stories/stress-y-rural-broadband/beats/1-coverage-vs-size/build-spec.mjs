// Builds this beat's `spec.json` from the frozen `source/data.csv`.
//
// It reads the CSV rather than `source/profile.json` on purpose. Two of the profiler's five column
// verdicts are unusable for this story:
//
//   * `municipality` is typed as a NEGATIVE MEASURE with `unit: "Commune"`, `min: -186`, `max: -1`.
//     It is a column of names. Nothing numeric may be derived from it.
//   * `broadband_pct` is typed `text`, because 10 of its 186 values carry a "%" suffix and 6 are
//     blank. It is the only measure this beat is about, so the cleaning happens here: strip the
//     suffix, keep a blank as a real gap rather than a zero.
//
// Rows are never dropped. All 186 travel to the provider, the six unanswered ones carrying an empty
// value, so the number of rows uploaded and the number of rows surveyed are the same number.

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readPalette } from "../../../../skills/palette/scripts/palette.mjs";

const beatDir = dirname(fileURLToPath(import.meta.url));
const storyDir = join(beatDir, "..", "..");

const SERIES_LABEL = "Broadband coverage (%)";
const CEILING = 100;

/** RFC 4180 rows, tokenised once. Never `.split(",")`: a quoted cell may legally hold a comma or a
 *  newline, and a hand split cuts it in half without ever saying so. The project walks for that
 *  pair of shapes (`skills/splash/test/csv-hand-split.test.ts`, catalogue guard `csv-split-by-hand`)
 *  because the pattern beat shipped it once. Inlined, not imported: a story workspace is not a
 *  skill, and this file has to stay readable on its own. */
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

function parseCsv(text) {
  const [headers, ...rows] = parseCsvRows(text.trim());
  return rows
    .filter((cells) => cells.some((c) => c.trim() !== ""))
    .map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""])));
}

/** A percentage the profiler refused to type: "53.7 %" and "62.3" are the same reading, "" is a gap. */
function coverage(raw) {
  const cleaned = String(raw ?? "").replace("%", "").trim();
  if (cleaned === "") return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

// Read, never typed: the accent is the recorded answer in this beat's own PALETTE.md.
const palette = readPalette(beatDir, { stopAt: storyDir });

const rows = parseCsv(await readFile(join(storyDir, "source", "data.csv"), "utf8"));

const data = rows.map((row) => ({
  households: Number(row.households),
  [SERIES_LABEL]: coverage(row.broadband_pct),
}));

const impossible = rows
  .map((row) => ({ name: row.municipality, households: Number(row.households), value: coverage(row.broadband_pct) }))
  .filter((row) => row.value !== null && row.value > CEILING);

const blanks = data.filter((row) => row[SERIES_LABEL] === null).length;

const spec = {
  takeaway:
    "Broadband coverage does not follow a municipality's size: the smallest towns are no worse served than the largest",
  limits:
    `All ${data.length} municipalities surveyed in June 2025, one dot each. ` +
    `${blanks} returned no figure and are plotted as gaps. ` +
    (impossible.length === 1
      ? `${impossible[0].name} returned ${impossible[0].value} per cent, which no percentage can be; the agency has not explained it, and the reading is shown rather than removed.`
      : "") ,
  // `unattributed` is the storyboard's recorded answer for "the journalist named no source", and
  // `creditLine` in `storyboard/scripts/storyboard.mjs` renders it "Source: not stated". No
  // producer in this tree maps the sentinel, and `buildChartPayload` interpolates `spec.credit`
  // raw into `describe["source-name"]` — so this beat writes the rendered half of that pair by
  // hand. Datawrapper prints its own "Source:" label in front of it.
  credit: "not stated",
  effectiveDate: "2025-06-30",
  language: "en",
  color: palette.accent,
  chartType: "d3-scatter-plot",
  format: "static",
  seriesLabel: SERIES_LABEL,
  rangeAnnotations: [
    { value: CEILING, label: "100% — every household covered", axis: "y", strokeType: "dashed", strokeWidth: 2 },
  ],
  textAnnotations: impossible.map((row) => ({
    x: row.households,
    y: row.value,
    text: `${row.name}: ${row.value}% — above the ceiling, unexplained`,
    align: "mr",
    dx: -8,
  })),
  data,
};

await writeFile(join(beatDir, "spec.json"), `${JSON.stringify(spec, null, 2)}\n`);
console.log(
  `rows=${data.length} blanks=${blanks} above-ceiling=${impossible.map((r) => `${r.name}@${r.value}`).join(",") || "none"}`,
);
