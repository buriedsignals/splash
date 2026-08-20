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
import { TYPE, VacantHomesColumns, formatValue } from "./VacantHomesColumns.tsx";

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
const STORY = join(HERE, "..", "..");

function parseCsv(text) {
  const [header, ...rows] = parseCsvRows(text.trim());
  const cols = header;
  return rows
    .filter((row) => row.some((cell) => cell.trim() !== ""))
    .map((row) => {
      const cells = row;
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

  // FINDING 8: two numbers, printed, before the geometry is chosen — never a refusal. See
  // chart-beat/references/static-discipline.md, "framing-serves-the-point".
  const framing = framingMeasurement(readings.map((r) => r.value));
  console.log(
    `framing: the takeaway's own spread is ${(framing.spreadAgainstExtent * 100).toFixed(1)}% of ` +
      `the plot's own 0-${formatValue(framing.max)} extent; the largest reading is ` +
      `${framing.largestAgainstMedian.toFixed(2)}x the group's median (${formatValue(framing.median)}) — ` +
      `see BRIEF.md, "The framing", for the treatment kept and why`,
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
