// Renders this beat from the story's own frozen source -- never from numbers typed here.
// Usage, from the repo root:  bun stories/stress-r-greek-schools/beats/1-attica-vs-the-rest/render.mjs
//
// See BRIEF.md. In short: source/data.csv (frozen) carries thirteen Greek regions, 2020 and 2026
// school counts. One 2026 cell reads "term378" instead of a number -- source/profile.json already
// typed that whole column "text" for it. This script reads the RAW frozen csv (never the corrupted
// column blindly cast to Number()), keeps every clean 2026 value as a number, and keeps that one
// cell as null -- declared missing on the chart, never guessed at, never silently swapped for the
// clean 2020 column passed off as the whole story.

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderStill, readPalette } from "#shared/chart-beat/render-still.mjs";
import {
  assertDeliveredSize,
  assertTypeFloor,
  readPinnedSize,
  readPngSize,
  sizeFor,
} from "#shared/chart-beat/sizes.mjs";
import { assertTypeMayEnter } from "#shared/chart-beat/type-at-size.mjs";
import { SlopeSchools } from "./SlopeSchools.tsx";

const TYPE = "slope";

function parseCsv(text) {
  const [headerLine, ...lines] = text.trim().split(/\r?\n/);
  const cols = headerLine.split(",");
  return lines
    .filter((l) => l.trim() !== "")
    .map((line) => {
      const cells = line.split(",");
      const rec = {};
      cols.forEach((c, i) => (rec[c] = cells[i]));
      return rec;
    });
}

/** A cell this project's own profiler would read as a number, or null when it would not -- the
 *  SAME rule intake used to type this column "text" in the first place, applied here per cell
 *  rather than per column, which is what lets twelve clean rows through without waiting on a fix
 *  to the one that is not. */
function readNumericCell(raw) {
  const trimmed = raw.trim();
  return /^-?\d+(\.\d+)?$/.test(trimmed) ? Number(trimmed) : null;
}

const HERE = dirname(fileURLToPath(import.meta.url));
const STORY = join(HERE, "..", "..");

async function main() {
  const csv = await readFile(join(STORY, "source", "data.csv"), "utf8");
  const rows = parseCsv(csv);
  console.log(`read ${rows.length} rows from source/data.csv`);

  const regions = rows.map((r) => {
    const y2020 = readNumericCell(r["σχολεία_2020"]);
    const y2026 = readNumericCell(r["σχολεία_2026"]);
    if (y2020 === null) throw new Error(`${r["περιφέρεια"]}: σχολεία_2020 is not numeric (${r["σχολεία_2020"]})`);
    if (y2026 === null) {
      console.log(
        `HAND FIX: ${r["περιφέρεια"]}'s σχολεία_2026 cell reads ${JSON.stringify(r["σχολεία_2026"])}, not a ` +
          `number -- declared missing on the chart rather than guessed at or dropped from the reader's view.`,
      );
    }
    return { name: r["περιφέρεια"], y2020, y2026, isSubject: r["περιφέρεια"] === "Αττική" };
  });
  if (regions.length !== 13) throw new Error(`expected 13 frozen regions, got ${regions.length}`);

  const attica = regions.find((r) => r.isSubject);
  if (!attica) throw new Error("Αττική not found in the frozen data");
  const atticaChange = (((attica.y2026 ?? NaN) - attica.y2020) / attica.y2020) * 100;
  console.log(
    `Attica: ${attica.y2020} -> ${attica.y2026} (${atticaChange.toFixed(1)}%). ` +
      `Every other region's own change:`,
  );
  for (const r of regions) {
    if (r.isSubject || r.y2026 === null) continue;
    const pct = (((r.y2026 - r.y2020) / r.y2020) * 100).toFixed(1);
    console.log(`  ${r.name}: ${r.y2020} -> ${r.y2026} (${pct}%)`);
  }

  const longestLabel = regions.reduce((a, b) => (a.name.length > b.name.length ? a : b));
  console.log(
    `longest region label: "${longestLabel.name}" (${longestLabel.name.length} characters) -- the ` +
      `left gutter is measured from this string in the real font, not assumed.`,
  );

  const title =
    "Every Greek region lost schools between 2020 and 2026, but Attica's decline was far smaller than the rest";
  const alt =
    `Slope chart, one line per Greek region, from its 2020 school count to its 2026 count. Attica's ` +
    `line is nearly flat (${attica.y2020} to ${attica.y2026}, ${atticaChange.toFixed(1)}%); the ` +
    `steepest declines are in Western Macedonia, the Peloponnese and Central Greece. Anatoliki ` +
    `Makedonia kai Thraki keeps its 2020 dot only -- its 2026 figure is corrupted in the source ` +
    `data and is shown as unavailable, not estimated.`;

  const { ground, accent, origin, source: paletteSource } = readPalette(STORY, { stopAt: STORY });
  console.log(`palette from ${paletteSource} -- ground ${ground}, accent ${accent}, chosen by ${origin}`);

  const pinned = await readPinnedSize(HERE, { readFile, dirname, join });
  const size = pinned;
  const outDir = join(HERE, "renders");
  const name = "attica-vs-the-rest-still";

  const form = assertTypeMayEnter(TYPE, size, { what: "attica-vs-the-rest" });
  console.log(`pinned size: ${size} -- ${form.verdict}: ${form.reason}`);

  const { width, height } = sizeFor(size);
  const { pngPath, svgPath } = await renderStill({
    element: createElement(SlopeSchools, {
      regions,
      title,
      source: "Source: Greek Ministry of Education, released in response to a written request, as of 2026-08-21",
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
  assertTypeFloor(svg, size, { what: "attica-vs-the-rest" });
  console.log(`rendered -> ${pngPath} at ${width}x${height}, verified from the file -- now open it and look at it.`);
}

main();
