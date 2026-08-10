// twin/proof/more-dumbbell-life-expectancy-gains/render.mjs
//
// Reads the frozen CSV (life expectancy, ten countries, Our World in Data), filters to 2000 and
// 2023 IN CODE, computes each country's gap, verifies every gap is positive, and renders the
// dumbbell. Usage: bun render.mjs

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import {
  renderStill,
  readPalette,
  seriesInks,
} from "#shared/twin-chart-beat/render-still.mjs";
import {
  assertDeliveredSize,
  assertTypeFloor,
  assertWithinStage,
  readPinnedSize,
  readPngSize,
  sizeFor,
} from "#shared/twin-chart-beat/sizes.mjs";
import { assertTypeMayEnter } from "#shared/twin-chart-beat/type-at-size.mjs";
import { DumbbellLifeExpectancyGains } from "./DumbbellLifeExpectancyGains.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const EXPECTED_COUNTRIES = [
  "France",
  "Germany",
  "Italy",
  "Japan",
  "Netherlands",
  "Poland",
  "Spain",
  "Switzerland",
  "United Kingdom",
  "United States",
];

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

async function main() {
  const csv = await readFile(join(HERE, "data.csv"), "utf8");
  const rows = parseCsv(csv);
  console.log(`read ${rows.length} rows from data.csv`);

  // The OWID grapher CSV endpoint silently returns the ENTIRE global dataset with HTTP 200
  // unless csvType=filtered is on the URL (twin-intake's ourworldindata-csv-filter-trap.md).
  // Verify by eye rather than trust the parameter worked: count the distinct entities.
  const distinctEntities = [...new Set(rows.map((r) => r.Entity))].sort();
  console.log(`distinct entities (${distinctEntities.length}): ${distinctEntities.join(", ")}`);
  const expectedSorted = [...EXPECTED_COUNTRIES].sort();
  if (JSON.stringify(distinctEntities) !== JSON.stringify(expectedSorted)) {
    throw new Error(
      `expected exactly these 10 countries: ${expectedSorted.join(", ")} — got: ${distinctEntities.join(", ")}`,
    );
  }

  // Filtering to 2000 and 2023 happens HERE, in code, not by hand-editing the CSV.
  const filtered = rows.filter((r) => r.Year === "2000" || r.Year === "2023");
  console.log(`${filtered.length} rows after filtering to Year 2000 or 2023 (expect 20)`);
  if (filtered.length !== 20) {
    throw new Error(`expected 20 rows (10 countries x 2 years), got ${filtered.length}`);
  }

  const byCountry = new Map();
  for (const r of filtered) {
    const entry = byCountry.get(r.Entity) ?? {};
    entry[r.Year] = Number(r["Life expectancy"]);
    byCountry.set(r.Entity, entry);
  }

  const dataRows = EXPECTED_COUNTRIES.map((country) => {
    const entry = byCountry.get(country);
    if (!entry || entry["2000"] === undefined || entry["2023"] === undefined) {
      throw new Error(`missing 2000 or 2023 reading for ${country}`);
    }
    const y2000 = entry["2000"];
    const y2023 = entry["2023"];
    const gap = y2023 - y2000;
    return { country, y2000, y2023, gap };
  });

  console.table(
    dataRows.map((r) => ({
      country: r.country,
      "2000": r.y2000,
      "2023": r.y2023,
      gap: r.gap.toFixed(2),
    })),
  );

  // Every one of the 10 countries must genuinely have risen — checked here, not assumed, before
  // any claim gets written that says so.
  const nonPositive = dataRows.filter((r) => r.gap <= 0);
  if (nonPositive.length > 0) {
    throw new Error(
      `expected every country to have gained life expectancy, but these did not: ${nonPositive
        .map((r) => `${r.country} (${r.gap.toFixed(2)})`)
        .join(", ")}`,
    );
  }

  // Sort by gap size, descending — the type's own rule (`references/types/dumbbell.md`) — so the
  // rendered rows put the biggest difference at the top, and this is also the order the claim's
  // "gained the most / gained the least" reads off of.
  const sorted = [...dataRows].sort((a, b) => b.gap - a.gap);
  const most = sorted[0];
  const least = sorted[sorted.length - 1];
  console.log(
    `most gained: ${most.country} (+${most.gap.toFixed(1)} years) — least gained: ${least.country} (+${least.gap.toFixed(1)} years)`,
  );

  const title =
    `Every one of these ten countries added years of life expectancy between 2000 and 2023 — ` +
    `${most.country} gained the most, +${most.gap.toFixed(1)} years; ${least.country} gained the least, +${least.gap.toFixed(1)} years`;

  const alt =
    `Dumbbell chart of life expectancy at birth in 2000 (blue) and 2023 (vermillion) for ten ` +
    `countries, sorted by the size of the gain, largest first. Every country's 2023 dot sits to ` +
    `the right of its 2000 dot. ${most.country} rose from ${most.y2000.toFixed(1)} to ` +
    `${most.y2023.toFixed(1)} years, the largest gain (+${most.gap.toFixed(1)}); ${least.country} ` +
    `rose from ${least.y2000.toFixed(1)} to ${least.y2023.toFixed(1)} years, the smallest gain ` +
    `(+${least.gap.toFixed(1)}).`;

  const palette = readPalette(HERE, { stopAt: join(HERE, "..") });
  const { ground, accent, origin, source: paletteSource } = palette;
  console.log(`palette from ${paletteSource} — ground ${ground}, accent ${accent}, chosen by ${origin}`);
  // One ink per year: the recorded accents in the order they were recorded, earlier year first.
  const [startInk, endInk] = seriesInks(palette, 2);
  console.log(`dot inks — 2000 ${startInk}, 2023 ${endInk}`);

  // THE JOURNALIST'S DECISION, READ RATHER THAN RETYPED. Gate 2c pins a size; this beat records it
  // in its own `BRIEF.md` front matter; `readPinnedSize` throws naming every path it looked at if
  // it is missing.
  const pinned = await readPinnedSize(HERE, { readFile, dirname, join });
  // `--size <name>` renders one of the OTHER two, into `sizes/`, so all three can be opened and
  // compared. It is deliberately not a way to change what this beat DELIVERS.
  const flag = process.argv.indexOf("--size");
  const size = flag === -1 ? pinned : process.argv[flag + 1];
  const outDir = flag === -1 ? HERE : join(HERE, "sizes");
  const name =
    flag === -1
      ? "more-dumbbell-life-expectancy-gains-still"
      : `more-dumbbell-life-expectancy-gains-${size}`;
  if (flag !== -1)
    console.log(`LOOKING at ${size}; the pinned size stays ${pinned} -> ${outDir}`);
  // …and whether this TYPE may enter that size at all. A dumbbell's category axis is nominal, so it
  // is a band-scale type with a twin form — and this beat is already drawn in it, rows down the
  // frame with every country name horizontal on one line. Rung R0 costs it nothing and no aspect
  // clamp applies; what a tall frame costs it is rows, which the component refuses.
  const form = assertTypeMayEnter("dumbbell", size, {
    what: "more-dumbbell-life-expectancy-gains",
  });
  console.log(`pinned size: ${size} — ${form.verdict}: ${form.reason}`);

  const { width, height } = sizeFor(size);
  const { pngPath, svgPath } = await renderStill({
    element: createElement(DumbbellLifeExpectancyGains, {
      rows: sorted,
      title,
      source:
        "Source: UN, World Population Prospects (2024), via Our World in Data · 2000 and 2023, extracted 8 August 2026",
      alt,
      ground,
      startInk,
      endInk,
      size,
    }),
    width,
    height,
    // 1:1 — the frame IS the export size, so the PNG on disk measures what gate 2c pinned.
    scale: 1,
    outDir,
    name,
  });

  // THE DELIVERED FILE, MEASURED FROM ITS OWN BYTES. Not the element, not the arguments.
  assertDeliveredSize(readPngSize(await readFile(pngPath)), size, {
    what: `${pngPath}`,
  });
  const svg = await readFile(svgPath, "utf8");
  assertTypeFloor(svg, size, { what: "more-dumbbell-life-expectancy-gains" });
  assertWithinStage(svg, size, { what: "more-dumbbell-life-expectancy-gains" });
  console.log(`rendered -> ${pngPath} at ${width}x${height}, verified from the file`);
}

main();
