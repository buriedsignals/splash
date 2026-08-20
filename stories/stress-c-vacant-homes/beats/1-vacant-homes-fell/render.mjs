// Renders this beat from the story's own frozen source — never from numbers typed here.
// Usage, from the repo root:  bun stories/stress-c-vacant-homes/beats/1-vacant-homes-fell/render.mjs
//
// See BRIEF.md for the full reasoning. In short: `source/article.md` (frozen, never edited) says
// the vacancy share "has risen steadily" and is "the highest on record"; `source/data.csv` (also
// frozen) falls every year, 8.4 -> 8.1 -> 7.6 -> 7.2. This script verifies the direction
// mechanically against the frozen rows before drawing anything, and the title it renders is the
// data's own finding, not the journalist's contradicted one.

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
import { TYPE, VacantHomesColumns, formatValue } from "./VacantHomesColumns.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const STORY = join(HERE, "..", "..");

function parseCsv(text) {
  const [header, ...rows] = text.trim().split(/\r?\n/);
  const cols = header.split(",");
  return rows
    .filter((row) => row.length > 0)
    .map((row) => {
      const cells = row.split(",");
      const rec = {};
      cols.forEach((c, i) => (rec[c] = cells[i]));
      return rec;
    });
}

async function main() {
  const csv = await readFile(join(STORY, "source", "data.csv"), "utf8");
  const rows = parseCsv(csv);
  console.log(`read ${rows.length} rows from source/data.csv`);

  const readings = rows
    .map((r) => ({ year: Number(r.year), value: Number(r.vacant_homes_pct) }))
    .sort((a, b) => a.year - b.year);
  if (readings.length !== 4)
    throw new Error(`expected 4 frozen readings (2019-2022), got ${readings.length}`);

  // THE DIRECTION, VERIFIED, NOT ASSUMED — this is the whole point of this beat. The article
  // claims the series rises; this throws if the frozen data does not fall every year, so a
  // rejected takeaway is never replaced by an equally untested assertion in the other direction.
  for (let i = 1; i < readings.length; i++) {
    if (!(readings[i].value < readings[i - 1].value)) {
      throw new Error(
        `expected a strictly falling series but ${readings[i].year}=${readings[i].value} is not ` +
          `below ${readings[i - 1].year}=${readings[i - 1].value} — the corrected takeaway this ` +
          `beat draws would itself be false; refusing to render`,
      );
    }
  }
  console.log("direction check: every year is lower than the year before it (falls monotonically)");

  const first = readings[0];
  const last = readings[readings.length - 1];
  const delta = last.value - first.value;
  console.log(
    `${first.year}: ${first.value}% -> ${last.year}: ${last.value}% (change ${delta.toFixed(1)} pts)`,
  );

  const title = `The share of vacant homes fell every year from ${first.year} to ${last.year}, from ${formatValue(first.value)} to ${formatValue(last.value)}.`;
  const alt =
    `Column chart of the share of vacant homes, ${first.year} to ${last.year}. Four columns fall ` +
    `every year: ${readings.map((r) => `${formatValue(r.value)} in ${r.year}`).join(", then ")}. ` +
    `A ${Math.abs(delta).toFixed(1)} point drop from ${first.year} to ${last.year}. The story's own ` +
    `article claims the opposite ("has risen steadily", "the highest on record"); that claim is ` +
    `contradicted by this same frozen data and is not repeated here.`;
  console.log(`title: ${title}`);

  const { ground, accent, origin, source: paletteSource } = readPalette(STORY, {
    stopAt: STORY,
  });
  console.log(`palette from ${paletteSource} — ground ${ground}, accent ${accent}, chosen by ${origin}`);

  const pinned = await readPinnedSize(HERE, { readFile, dirname, join });
  const flag = process.argv.indexOf("--size");
  const size = flag === -1 ? pinned : process.argv[flag + 1];
  const outDir = flag === -1 ? join(HERE, "renders") : join(HERE, "sizes");
  const name = flag === -1 ? "vacant-homes-fell-still" : `vacant-homes-fell-${size}`;
  if (flag !== -1) console.log(`LOOKING at ${size}; the pinned size stays ${pinned} -> ${outDir}`);

  const form = assertTypeMayEnter(TYPE, size, { what: "vacant-homes-fell" });
  console.log(`pinned size: ${size} — ${form.verdict}: ${form.reason}`);

  const { width, height } = sizeFor(size);
  const { pngPath, svgPath } = await renderStill({
    element: createElement(VacantHomesColumns, {
      readings,
      title,
      source: "Source: story intake, source/data.csv (frozen) — stress test fixture",
      alt,
      ground,
      accent,
      size,
    }),
    width,
    height,
    // 1:1 — the frame IS the export size, so the PNG on disk measures what gate 2c pinned.
    scale: 1,
    outDir,
    name,
  });

  // THE DELIVERED FILE, MEASURED FROM ITS OWN BYTES.
  assertDeliveredSize(readPngSize(await readFile(pngPath)), size, { what: `${pngPath}` });
  const svg = await readFile(svgPath, "utf8");
  assertTypeFloor(svg, size, { what: "vacant-homes-fell" });
  assertWithinStage(svg, size, { what: "vacant-homes-fell" });
  console.log(`rendered -> ${pngPath} at ${width}x${height}, verified from the file — now open it and look at it.`);
}

main();
