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

function parseCsv(text) {
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const cells = line.split(",");
    return Object.fromEntries(headers.map((header, index) => [header, cells[index]]));
  });
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
