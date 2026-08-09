// twin/proof/webx-carbon-footprint/render-web.mjs
//
// This beat's own WEB runner. `data.csv` is the frozen OWID export (copied from
// `proof/static-carbon-footprint-spread/data.csv`, the already-verified static sibling) — 213
// countries, 2023; re-verified here (row count) rather than trusted on sight. Bins: 4 tonnes wide,
// 10 bins, 0-40 — the same edges `references/types/histogram.md`'s own "about ten roughly-round
// bins" default and the static sibling's own verified render use.
//
// Usage:  bun proof/webx-carbon-footprint/render-web.mjs [outDir] [--data <csv>]

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderWeb } from "../../skills/twin-chart-web/scripts/render-web.mjs";
import { makeBins } from "./histogram-geometry";
import { HistogramWeb, LAYOUTS } from "./HistogramWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));

export const BEAT = {
  ground: "#FFFFFF",
  accent: "#0B7A75",
  source:
    "Source: Global Carbon Budget (2025), via Our World in Data · co-emissions-per-capita, 2023 data, extracted 8 August 2026",
};

const DEFAULT_DATA_PATH = join(HERE, "data.csv");
const DEFAULT_OUT_DIR = "/tmp/webx-carbon-footprint";
const OUTPUT_NAME = "carbon-footprint.html";
const BIN_LO = 0;
const BIN_HI = 40;
const BIN_WIDTH = 4;

export function rowsFromCsv(csv) {
  const [header, ...rows] = csv.trim().split(/\r?\n/);
  const columns = header.split(",");
  const entityAt = columns.indexOf("Entity");
  const valueAt = columns.findIndex((c) => c.startsWith("CO2"));
  if (entityAt < 0 || valueAt < 0)
    throw new Error(`csv has no Entity / CO2 emissions column, got: ${header}`);

  const records = rows
    .map((row) => row.split(","))
    .map((cells) => ({ entity: cells[entityAt], value: Number(cells[valueAt]) }))
    .filter((r) => r.entity && Number.isFinite(r.value));
  if (records.length !== 213)
    throw new Error(`expected 213 countries with a value, got ${records.length}`);
  return records;
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export async function render({ dataPath, outDir, name = OUTPUT_NAME }) {
  const csv = await readFile(dataPath, "utf8");
  const rows = rowsFromCsv(csv);

  // The last bin is deliberately open-ended on the right (`makeBins` clamps any value at or past
  // the ceiling into the final bin) — the same rule the static sibling's own `render.mjs` states
  // explicitly (`i === BIN_COUNT - 1 ? v >= lo : v >= lo && v < hi`), because Qatar's 2023 reading
  // (40.13 t/capita) sits fractionally past the nominal 40t ceiling. What's checked instead is that
  // every country landed in exactly one bin — the same total-accounting check the static sibling
  // runs.
  const bins = makeBins(rows, { lo: BIN_LO, hi: BIN_HI, width: BIN_WIDTH });
  const binned = bins.reduce((sum, b) => sum + b.count, 0);
  if (binned !== rows.length)
    throw new Error(`bins account for ${binned} countries, expected ${rows.length} — a value fell outside the bin range`);

  const underFour = rows.filter((r) => r.value < 4).length;
  const share = (underFour / rows.length) * 100;
  const med = median(rows.map((r) => r.value));

  const TEN_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
  const tenths = Math.round(share / 10);
  const tenthsWord = TEN_WORDS[tenths];
  const title = `${tenthsWord[0].toUpperCase()}${tenthsWord.slice(1)} in ten countries emit under 4 tonnes of CO2 per person`;
  const subtitle = `${underFour} of ${rows.length} countries (${share.toFixed(0)}%) emitted under 4 tonnes of CO2 per person in 2023; the distribution is heavily right-skewed, with a handful of oil and gas producers stretching the tail out to ${BIN_HI} tonnes. Median: ${med.toFixed(1)} t/capita.`;
  const alt = `Histogram of CO2 emissions per capita for ${rows.length} countries in 2023, binned in ${BIN_WIDTH}-tonne intervals from ${BIN_LO} to ${BIN_HI}. ${underFour} countries (${share.toFixed(0)}%) sit under 4 tonnes; the distribution is right-skewed, with a handful of oil and gas producers stretching the tail out to ${BIN_HI} tonnes. A dashed line marks the median at ${med.toFixed(1)} tonnes. Every bin's exact count AND the full list of countries in it is available on hover, tap or keyboard focus.`;
  const medianLabel = `Median: ${med.toFixed(1)} t`;

  const { outPath } = await renderWeb({
    component: HistogramWeb,
    layouts: LAYOUTS,
    props: {
      bins,
      title,
      subtitle,
      source: BEAT.source,
      alt,
      ground: BEAT.ground,
      accent: BEAT.accent,
      median: med,
      medianLabel,
    },
    outDir,
    name,
  });

  await repair(outPath);

  return { outPath, bins: bins.length, countries: rows.length, median: med };
}

async function repair(outPath) {
  let html = await readFile(outPath, "utf8");
  html = html.replace('<html lang="fr">', '<html lang="en">');

  const interactionSource = await readFile(join(HERE, "histogram-interaction.mjs"), "utf8");
  const ownScript = `<script>\n${interactionSource}\n</script>\n`;
  if (!html.includes("</body>")) throw new Error("renderWeb output has no </body> to repair");
  html = html.replace("</body>", `${ownScript}</body>`);

  // This beat's tooltip carries a full country list, sometimes well over a hundred names — the
  // skill's default 220px/no-scroll tooltip would either overflow the viewport or silently clip.
  // Widened and made internally scrollable rather than truncating what a reader can ask for.
  const ownCss = `
.bin-hit { cursor: pointer; }
.bin-hit:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }
#tooltip { max-width: 320px; max-height: 220px; overflow-y: auto; }
`;
  if (!html.includes("</style>")) throw new Error("renderWeb output has no </style> to repair");
  html = html.replace("</style>", `${ownCss}</style>`);

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

  const { outPath, bins, countries, median: med } = await render({ dataPath, outDir });
  console.log(`web beat → ${outPath}  [${bins} bins, ${countries} countries, median ${med.toFixed(1)}t]`);
}
