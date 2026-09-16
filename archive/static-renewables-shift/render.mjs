// twin/proof/static-renewables-shift/render.mjs
//
// Reads the frozen CSV (6 countries, 2015 and 2024 electricity generation by source, TWh),
// computes each country's renewables share of its own total in both years, and hands the pairs to
// RenewablesShiftSlope. Usage: bun render.mjs

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderStill, readPalette } from "#shared/chart-beat/render-still.mjs";
import {
  assertDeliveredSize,
  assertTypeFloor,
  assertWithinStage,
  readPinnedSize,
  readPngSize,
  sizeFor,
} from "#shared/chart-beat/sizes.mjs";
import { assertTypeMayEnter } from "#shared/chart-beat/type-at-size.mjs";
import {
  TYPE,
  RenewablesShiftSlope,
  rungsFor,
} from "./RenewablesShiftSlope.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));

const RENEWABLE_COLUMNS = ["Other renewables", "Bioenergy", "Solar", "Wind", "Hydropower"];
const ALL_COLUMNS = [...RENEWABLE_COLUMNS, "Nuclear", "Gas", "Oil", "Coal"];

function parseCsv(text) {
  const [header, ...rows] = text.trim().split(/\r?\n/);
  const cols = header.split(",");
  return rows.map((row) => {
    const cells = row.split(",");
    const rec = {};
    cols.forEach((c, i) => (rec[c] = cells[i]));
    return rec;
  });
}

function renewableShare(row) {
  const total = ALL_COLUMNS.reduce((sum, c) => sum + Number(row[c]), 0);
  const renewables = RENEWABLE_COLUMNS.reduce((sum, c) => sum + Number(row[c]), 0);
  return (renewables / total) * 100;
}

async function main() {
  const csv = await readFile(join(HERE, "data.csv"), "utf8");
  const rows = parseCsv(csv);
  console.log(`read ${rows.length} rows from data.csv`);
  if (rows.length !== 12) throw new Error(`expected 12 rows (6 countries x 2 years), got ${rows.length}`);

  const byCountry = new Map();
  for (const r of rows) {
    if (!byCountry.has(r.Entity)) byCountry.set(r.Entity, {});
    byCountry.get(r.Entity)[r.Year] = renewableShare(r);
  }

  const series = [...byCountry.entries()]
    .map(([name, years]) => ({ name, start: years["2015"], end: years["2024"] }))
    .sort((a, b) => b.end - a.end);

  console.table(series.map((s) => ({ country: s.name, "2015": s.start.toFixed(1), "2024": s.end.toFixed(1), "change (pp)": (s.end - s.start).toFixed(1) })));

  const byClimb = [...series].sort((a, b) => b.end - b.start - (a.end - a.start));
  const biggestMover = byClimb[0];
  const flattest = byClimb[byClimb.length - 1];
  console.log(`biggest riser: ${biggestMover.name} (+${(biggestMover.end - biggestMover.start).toFixed(1)}pp)`);
  console.log(`flattest: ${flattest.name} (+${(flattest.end - flattest.start).toFixed(1)}pp)`);

  // Every figure the alt text states is read off `series` — the same array the chart plots. The
  // hand-typed version said Sweden and Switzerland stayed "in the mid-60s"; Sweden ends at 69.4%,
  // so the sentence disagreed with the label drawn beside it. Naming each country's own endpoints
  // makes that impossible: change a row in data.csv and the sentence moves with the chart.
  const START_YEAR = "2015";
  const END_YEAR = "2024";
  const pct = (v) => `${Math.round(v)}%`;
  const rest = series.filter((s) => s !== biggestMover && s !== flattest);
  const alt =
    `Slope chart of ${series.length} countries' renewable share of electricity generation, ` +
    `${START_YEAR} versus ${END_YEAR}. ` +
    `${biggestMover.name} rises from ${pct(biggestMover.start)} to ${pct(biggestMover.end)}, the ` +
    `steepest climb at ${(biggestMover.end - biggestMover.start).toFixed(0)} percentage points. ` +
    `${flattest.name} moves least, from ${pct(flattest.start)} to ${pct(flattest.end)}, already near ` +
    `the top of the scale. The others: ` +
    rest.map((s) => `${s.name} ${pct(s.start)} to ${pct(s.end)}`).join(", ") +
    `.`;
  console.log(`alt: ${alt}`);

  // The title's two remaining words-as-claims, pinned against the data rather than trusted:
  // "nearly doubled" (a ratio just under two) and "nine years" (the span the axis labels state).
  const ratio = biggestMover.end / biggestMover.start;
  console.log(`${biggestMover.name} ${START_YEAR}->${END_YEAR} ratio: ${ratio.toFixed(2)}x`);
  if (ratio < 1.8 || ratio >= 2) throw new Error(`"nearly doubled" needs a ratio in [1.8, 2), got ${ratio.toFixed(2)}`);
  if (Number(END_YEAR) - Number(START_YEAR) !== 9) throw new Error(`"nine years" needs a nine-year span, got ${Number(END_YEAR) - Number(START_YEAR)}`);

  const { ground, accent, origin, source: paletteSource } = readPalette(HERE, {
    stopAt: join(HERE, ".."),
  });
  console.log(`palette from ${paletteSource} — ground ${ground}, accent ${accent}, chosen by ${origin}`);
  // THE JOURNALIST'S DECISION, READ RATHER THAN RETYPED. Gate 2c pins a size; this beat records it
  // in its own `BRIEF.md` front matter; `readPinnedSize` throws naming every path it looked at if
  // it is missing. Before this the size was two literals below and `renderStill` compared them
  // against each other, so they agreed by construction and the delivered PNG was a size nobody
  // chose.
  const pinned = await readPinnedSize(HERE, { readFile, dirname, join });
  // `--size <name>` renders one of the OTHER two into `sizes/`, so all three can be opened and
  // compared. It is deliberately not a way to change what this beat DELIVERS.
  const flag = process.argv.indexOf("--size");
  const size = flag === -1 ? pinned : process.argv[flag + 1];
  const outDir = flag === -1 ? HERE : join(HERE, "sizes");
  const name = flag === -1 ? "static-renewables-shift-still" : `static-renewables-shift-${size}`;
  if (flag !== -1)
    console.log(`LOOKING at ${size}; the pinned size stays ${pinned} -> ${outDir}`);
  // …and whether this TYPE may enter that size at all.
  const form = assertTypeMayEnter(TYPE, size, { what: "static-renewables-shift" });
  console.log(`pinned size: ${size} — ${form.verdict}: ${form.reason}`);
  const rungs = rungsFor(size);
  console.log(
    rungs.length
      ? `removal ladder at ${size}: ${rungs.join("; ")}`
      : `removal ladder at ${size}: no rung fires`,
  );

  const { width, height } = sizeFor(size);
  const { pngPath, svgPath } = await renderStill({
    element: createElement(RenewablesShiftSlope, {
      series,
      title: `${biggestMover.name}'s renewable electricity share nearly doubled in nine years`,
      limits: `Share of each country's own total generation. ${flattest.name} was already near-total renewable in ${START_YEAR}, so it had almost no room left to climb.`,
      source: "Source: Ember, Energy Institute — Statistical Review of World Energy (2025), via Our World in Data · extracted 8 August 2026",
      alt,
      ground,
      accent,
      highlighted: biggestMover.name,
      startLabel: START_YEAR,
      endLabel: END_YEAR,
      unit: "%",
      size,
    }),
    width,
    height,
    // 1:1 — the frame IS the export size, so the PNG on disk measures what gate 2c pinned.
    scale: 1,
    outDir,
    name,
  });
  // THE DELIVERED FILE, MEASURED FROM ITS OWN BYTES. Not the element, not the arguments — the PNG
  // on disk. It is the one reading the code that wrote it cannot make agree with itself.
  assertDeliveredSize(readPngSize(await readFile(pngPath)), size, {
    what: `${pngPath}`,
  });
  const svg = await readFile(svgPath, "utf8");
  console.log(`ladder in the artifact: ${/data-ladder="([^"]*)"/.exec(svg)?.[1] ?? "(absent)"}`);
  assertTypeFloor(svg, size, { what: "static-renewables-shift" });
  assertWithinStage(svg, size, { what: "static-renewables-shift" });
  console.log(`rendered -> ${pngPath} at ${width}x${height}, verified from the file — now open it and look at it.`);
}

main();
