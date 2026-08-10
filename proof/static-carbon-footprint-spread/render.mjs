// twin/proof/static-carbon-footprint-spread/render.mjs
//
// Reads the frozen CSV (213 countries, 2023 CO2 emissions per capita), bins it into 4-tonne-wide
// bins, and renders the histogram. Usage: bun render.mjs

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
import { CarbonFootprintHistogram } from "./CarbonFootprintHistogram.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN_WIDTH = 4;
const BIN_COUNT = 10;

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

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

async function main() {
  const csv = await readFile(join(HERE, "data.csv"), "utf8");
  const rows = parseCsv(csv);
  console.log(`read ${rows.length} rows from data.csv`);
  if (rows.length !== 213) throw new Error(`expected 213 countries, got ${rows.length}`);

  const values = rows.map((r) => Number(r["CO2 emissions per capita"]));

  const bins = [];
  for (let i = 0; i < BIN_COUNT; i++) {
    const lo = i * BIN_WIDTH;
    const hi = lo + BIN_WIDTH;
    const count = values.filter((v) => (i === BIN_COUNT - 1 ? v >= lo : v >= lo && v < hi)).length;
    bins.push({ lo, hi, count });
  }
  console.table(bins.map((b) => ({ range: `${b.lo}-${b.hi}`, count: b.count })));
  const total = bins.reduce((s, b) => s + b.count, 0);
  if (total !== values.length) throw new Error(`bins account for ${total} countries, expected ${values.length} — a value fell outside the bin range`);

  const med = median(values);
  const under4 = values.filter((v) => v < 4).length;
  console.log(`median: ${med.toFixed(2)} t/capita, ${under4}/${values.length} countries under 4 t/capita (${((under4 / values.length) * 100).toFixed(0)}%)`);
  const max = Math.max(...values);
  console.log(`max: ${max.toFixed(1)} t/capita, ${(max / med).toFixed(1)}x the median`);

  // The tail is not monotonically decreasing (a render audit caught the alt text claiming it was:
  // the 24-28 bin holds 3 countries, more than the 20-24 bin's 2, and the 36-40 bin holds 1 country
  // against two empty bins below it) — so the description names the actual top occupied bin and its
  // country/countries, derived from `bins`/`rows`, instead of asserting a shape the data doesn't have.
  const topBin = [...bins].reverse().find((b) => b.count > 0);
  const topBinCountries = rows
    .filter((r) => Number(r["CO2 emissions per capita"]) >= topBin.lo)
    .map((r) => r.Entity);

  const { ground, accent, origin, source: paletteSource } = readPalette(HERE, {
    stopAt: join(HERE, ".."),
  });
  console.log(`palette from ${paletteSource} — ground ${ground}, accent ${accent}, chosen by ${origin}`);

  // THE JOURNALIST'S DECISION, READ RATHER THAN RETYPED. Gate 2c pins a size; this beat records it
  // in its own `BRIEF.md` front matter; `readPinnedSize` throws naming every path it looked at if
  // it is missing. Before this, the size was two literals below, and `renderStill` compared them
  // against each other — so `size: portrait` on the slot produced an 1800x1120 PNG in silence.
  const pinned = await readPinnedSize(HERE, { readFile, dirname, join });
  // `--size <name>` renders one of the OTHER two, into `sizes/`, so all three can be opened and
  // compared. It is deliberately not a way to change what this beat DELIVERS: the delivered file
  // keeps the beat's own name and the pinned size, and an override says so on stdout and writes
  // somewhere else. A flag that quietly redirected the deliverable would be the defect this whole
  // seam exists to close, wearing a command-line argument.
  const flag = process.argv.indexOf("--size");
  const size = flag === -1 ? pinned : process.argv[flag + 1];
  const outDir = flag === -1 ? HERE : join(HERE, "sizes");
  const name =
    flag === -1
      ? "static-carbon-footprint-spread-still"
      : `static-carbon-footprint-spread-${size}`;
  if (flag !== -1)
    console.log(`LOOKING at ${size}; the pinned size stays ${pinned} -> ${outDir}`);
  // …and whether this TYPE may enter that size at all. A histogram's x is a continuum, so it has no
  // twin form to transpose into; what it has is a measured aspect range, and outside that range it
  // stops being a distribution (`proof/portrait-aspect-probe/PORTRAIT-VERDICT.md`: 2.35:1 -> 0.54:1
  // turned a right-skewed shape into one column beside nine slivers, with every counter green).
  const form = assertTypeMayEnter("histogram", size, { what: "static-carbon-footprint-spread" });
  console.log(`pinned size: ${size} — ${form.verdict}: ${form.reason}`);

  const { width, height } = sizeFor(size);
  const { pngPath, svgPath } = await renderStill({
    element: createElement(CarbonFootprintHistogram, {
      bins,
      title: "Six in ten countries emit under 4 tonnes of CO2 per person a year",
      limits: "Per-country distribution for 2023 — each of the 213 countries counts equally here, not weighted by population. A few oil and gas producers sit far out on the right.",
      source: "Source: Global Carbon Budget (2025), via Our World in Data · 2023 data, extracted 8 August 2026",
      // The last bin is OPEN in the code above (`v >= lo`, no upper test), so it must be described
      // as open. It read "the 36-40 tonne bin", which placed its single member — at
      // 40.127865 t, ABOVE 40 — in a range that excludes it. The value is interpolated from the
      // data rather than written out, because a hand-typed correction is the same defect with a
      // better number.
      alt: `Histogram of CO2 emissions per capita across ${values.length} countries in 2023, in ${BIN_WIDTH}-tonne bins from 0 to ${topBin.lo} and above. The distribution is heavily right-skewed: ${bins[0].count} countries sit in the 0-${BIN_WIDTH} tonne bin, more than any other bin; the rest thin out into a long tail, topped by ${topBinCountries.join(" and ")} alone above ${topBin.lo} tonnes, at ${Math.max(...values).toFixed(1)} tonnes. A dashed median line sits at ${med.toFixed(1)} tonnes.`,
      ground,
      // The recorded accent is read and deliberately NOT passed. This beat's one annotation is the
      // median rule, and it runs through the tallest bar, where the recorded accent measured
      // 1.20:1 — see the component's own props comment and `references/types/histogram.md`'s
      // amendment. The rule's ink is derived from the marks it crosses instead, which on this
      // ground and these bars is near-black. PALETTE.md beside this file says the same thing in
      // prose, so a newsroom changing its colour is told where that colour does and does not land.
      median: med,
      medianLabel: `Median: ${med.toFixed(1)} t`,
      size,
    }),
    width,
    height,
    // 1:1 — the frame IS the export size, so the PNG on disk measures what gate 2c pinned. The
    // default 2 belongs to the frames that have not moved to the table yet.
    scale: 1,
    outDir,
    name,
  });

  // THE DELIVERED FILE, MEASURED FROM ITS OWN BYTES. Not the element, not the arguments — the PNG
  // on disk. It is the one reading the code that wrote it cannot make agree with itself, and it is
  // what catches a rasteriser scaling the frame (this corpus shipped 1800x1120 for a "900x560"
  // beat) or a producer honouring width and dropping height.
  assertDeliveredSize(readPngSize(await readFile(pngPath)), size, {
    what: `${pngPath}`,
  });
  const svg = await readFile(svgPath, "utf8");
  assertTypeFloor(svg, size, { what: "static-carbon-footprint-spread" });
  assertWithinStage(svg, size, { what: "static-carbon-footprint-spread" });
  console.log(`rendered -> ${pngPath} at ${width}x${height}, verified from the file`);
}

main();
