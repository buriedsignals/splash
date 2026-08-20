// stories/stress-j-partial-year-permits/beats/1-permits-rose-then-partial/render.mjs
//
// Reads the frozen CSV (annual building permits, 2020-2026) and renders the honest version of
// this story: the six complete years as one line, 2026 disclosed as a text-only note because it
// covers 3 of 12 months and has no honest y-coordinate on an axis built from full-year totals.
// See BRIEF.md, "The decision, taken explicitly."
//
// Usage, from the splash root: bun stories/stress-j-partial-year-permits/beats/1-permits-rose-then-partial/render.mjs

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderStill, readPalette, framingMeasurement } from "#shared/chart-beat/render-still.mjs";
import {
  assertDeliveredSize,
  assertTypeFloor,
  assertWithinStage,
  readPinnedSize,
  readPngSize,
  sizeFor,
} from "#shared/chart-beat/sizes.mjs";
import { assertTypeMayEnter } from "#shared/chart-beat/type-at-size.mjs";
import { PermitsRoseThenPartial } from "./PermitsRoseThenPartial.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));

function parseCsv(text) {
  const [header, ...rows] = text.trim().split(/\r?\n/).map((r) => r.split(","));
  return rows
    .filter((r) => r.some((c) => c.trim() !== ""))
    .map((r) => Object.fromEntries(header.map((h, i) => [h, r[i]])));
}

async function main() {
  const csv = await readFile(join(HERE, "data.csv"), "utf8");
  const rows = parseCsv(csv).map((r) => ({
    year: Number(r.year),
    value: Number(r.permits_issued),
    monthsCovered: Number(r.months_covered),
  }));
  console.log(`read ${rows.length} rows from data.csv`);

  const complete = rows.filter((r) => r.monthsCovered === 12);
  const partials = rows.filter((r) => r.monthsCovered !== 12);
  console.log(
    `${complete.length} complete years (months_covered = 12): ${complete.map((r) => r.year).join(", ")}`,
  );
  console.log(
    `${partials.length} partial reading(s) (months_covered != 12): ` +
      partials.map((r) => `${r.year} (${r.monthsCovered} months, ${r.value.toLocaleString("en-US")} permits)`).join(", "),
  );
  if (partials.length !== 1)
    throw new Error(`this beat is written for exactly one partial reading, found ${partials.length}`);
  const partial = partials[0];

  // `framing-serves-the-point`: read BEFORE the treatment is picked, on the values that are
  // actually about to share one y-axis — the six complete years, never the partial reading,
  // which this beat does not plot at all. Printed, never a refusal.
  const framing = framingMeasurement(complete.map((r) => r.value));
  console.log(
    `framing: spreadAgainstExtent=${framing.spreadAgainstExtent.toFixed(3)} ` +
      `largestAgainstMedian=${framing.largestAgainstMedian.toFixed(3)} ` +
      `(read on the six complete years only — this says nothing about whether 2026 is ` +
      `comparable to them, which is a different question and not one this reading answers)`,
  );

  const first = complete[0];
  const last = complete[complete.length - 1];
  const growthPct = ((last.value - first.value) / first.value) * 100;
  console.log(
    `${first.year}-${last.year}: ${first.value.toLocaleString("en-US")} -> ` +
      `${last.value.toLocaleString("en-US")} permits, +${growthPct.toFixed(1)}%`,
  );

  const title = `Building permits rose every year from ${first.year} to ${last.year}`;
  const subtitle =
    `Permits issued by the city registry. All values above are full-year totals; the ${partial.year} ` +
    `reading (right) covers only ${partial.monthsCovered} of 12 months and is not one.`;
  const alt =
    `Line chart of building permits issued each year from ${first.year} (${first.value.toLocaleString("en-US")}) ` +
    `to ${last.year} (${last.value.toLocaleString("en-US")}), rising every year, a gain of ${growthPct.toFixed(1)}%. ` +
    `A text note beside the line reports ${partial.year}: ${partial.value.toLocaleString("en-US")} permits, ` +
    `covering January-March only (${partial.monthsCovered} of 12 months) — not plotted, because it is not ` +
    `a comparable annual figure.`;
  console.log(`title:    ${title}`);
  console.log(`subtitle: ${subtitle}`);
  console.log(`alt:      ${alt}`);

  const { ground, accent, origin, source: paletteSource } = readPalette(HERE, {
    stopAt: join(HERE, "..", "..", ".."),
  });
  console.log(`palette from ${paletteSource} — ground ${ground}, accent ${accent}, chosen by ${origin}`);

  const pinned = await readPinnedSize(HERE, { readFile, dirname, join });
  const flag = process.argv.indexOf("--size");
  const size = flag === -1 ? pinned : process.argv[flag + 1];
  const outDir = flag === -1 ? join(HERE, "renders") : join(HERE, "renders", "sizes");
  const name = flag === -1 ? "permits-rose-then-partial-still" : `permits-rose-then-partial-${size}`;
  if (flag !== -1) console.log(`LOOKING at ${size}; the pinned size stays ${pinned} -> ${outDir}`);

  const form = assertTypeMayEnter("line", size, { what: "1-permits-rose-then-partial" });
  console.log(`pinned size: ${size} — ${form.verdict}: ${form.reason}`);

  const { width, height } = sizeFor(size);
  const { pngPath, svgPath } = await renderStill({
    element: createElement(PermitsRoseThenPartial, {
      complete,
      partial,
      title,
      subtitle,
      source: "City permits registry, frozen source/data.csv — 2026 reading as filed at the CSV freeze",
      alt,
      ground,
      accent,
      size,
    }),
    width,
    height,
    scale: 1,
    outDir,
    name,
  });

  assertDeliveredSize(readPngSize(await readFile(pngPath)), size, { what: `${pngPath}` });
  const svg = await readFile(svgPath, "utf8");
  assertTypeFloor(svg, size, { what: "1-permits-rose-then-partial" });
  assertWithinStage(svg, size, { what: "1-permits-rose-then-partial" });
  console.log(`rendered -> ${pngPath} at ${width}x${height}, verified from the file — now open it and look at it.`);
}

main();
