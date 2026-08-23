// Renders this beat from its own data.json, which build-data.mjs derives from the story's frozen
// source/data.csv with the total-row identity and both column breaks checked in it. From the repo
// root:
//   bun stories/r8-chart-static-german-road-deaths-by-mode/beats/1-pedelec-catches-the-bicycle/render.mjs
//   bun .../render.mjs --size square      (a look, not the pinned size)
//
// See BRIEF.md. The facts this script re-verifies against the frozen numbers before drawing:
// the pedelec series really does rise and the bicycle series really does fall over the window
// drawn, the takeaway's own 214 and 36 are the values it will print, and both series start in the
// year the chart says they start.

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import {
  renderStill,
  readPalette,
  readTypeface,
  useTypeface,
  assertDrawnInActiveTypeface,
  framingMeasurement,
} from "#shared/chart-beat/render-still.mjs";
import {
  assertDeliveredSize,
  assertTypeFloor,
  assertWithinStage,
  readPngSize,
  sizeFor,
} from "#shared/chart-beat/sizes.mjs";
import { assertTypeMayEnter } from "#shared/chart-beat/type-at-size.mjs";
import { TYPE, PedelecCatchesTheBicycle } from "./PedelecCatchesTheBicycle.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const STORY = join(HERE, "..", "..");

async function main() {
  const { years, pedelec, bicycle, allRoadDeaths, seriesBeginsIn, row } = JSON.parse(
    await readFile(join(HERE, "data.json"), "utf8"),
  );
  const first = years[0];
  const last = years[years.length - 1];
  console.log(`read ${years.length} years (${first}-${last}) x 2 series from data.json, row "${row}"`);

  if (first !== seriesBeginsIn)
    throw new Error(`the chart says both series begin in ${seriesBeginsIn} and the data starts at ${first}`);

  const pedelecEnd = pedelec[pedelec.length - 1];
  const bicycleEnd = bicycle[bicycle.length - 1];
  // The takeaway's own two pedelec numbers, re-read from the file rather than repeated from memory.
  const pedelec2015 = pedelec[years.indexOf(2015)];
  if (pedelecEnd !== 214 || pedelec2015 !== 36)
    throw new Error(
      `the confirmed takeaway names 214 pedelec deaths in 2025 and 36 in 2015; the frozen table ` +
        `gives ${pedelecEnd} and ${pedelec2015} — refusing to render a title that no longer matches`,
    );
  if (!(pedelecEnd > pedelec[0]) || !(bicycleEnd < bicycle[0]))
    throw new Error(
      `this beat claims the pedelec series rises and the bicycle series falls between ${first} and ` +
        `${last}; the frozen table gives pedelec ${pedelec[0]}->${pedelecEnd} and bicycle ` +
        `${bicycle[0]}->${bicycleEnd}`,
    );
  if (!(pedelecEnd < bicycleEnd))
    throw new Error(
      `this beat says the pedelec series has ALMOST caught the bicycle series, not overtaken it; ` +
        `the frozen table gives ${pedelecEnd} against ${bicycleEnd}`,
    );

  const gapNow = bicycleEnd - pedelecEnd;
  const gapThen = bicycle[0] - pedelec[0];
  const cyclistsNow = pedelecEnd + bicycleEnd;
  const shareNow = (cyclistsNow / allRoadDeaths[allRoadDeaths.length - 1]) * 100;
  console.log(
    `gap between the two series: ${gapThen} deaths in ${first} -> ${gapNow} in ${last}; ` +
      `cyclists killed in ${last} = ${cyclistsNow} of ${allRoadDeaths[allRoadDeaths.length - 1]} road ` +
      `deaths = ${shareNow.toFixed(1)}% (the April press release said 16.4% on preliminary figures)`,
  );

  // Two numbers, printed, before the geometry is chosen — static-discipline, "framing-serves-the-point".
  const framing = framingMeasurement([...pedelec, ...bicycle]);
  console.log(
    `framing: the two series' own spread is ${(framing.spreadAgainstExtent * 100).toFixed(1)}% of ` +
      `their 0-${framing.max} extent; the largest reading is ${framing.largestAgainstMedian.toFixed(2)}x ` +
      `the median reading — see BRIEF.md, "framing-serves-the-point"`,
  );

  const palette = readPalette(STORY, { stopAt: STORY });
  console.log(`palette from ${palette.source} — ground ${palette.ground}, accent ${palette.accent}, chosen by ${palette.origin}`);
  const typeface = useTypeface(readTypeface(STORY, { stopAt: STORY }));
  console.log(`typeface from ${typeface.source} — ${typeface.family} (${typeface.origin})`);

  const flag = process.argv.indexOf("--size");
  const size = flag === -1 ? "landscape" : process.argv[flag + 1];
  const outDir = flag === -1 ? join(HERE, "renders") : join(HERE, "sizes");
  const name = flag === -1 ? "pedelec-catches-the-bicycle-still" : `pedelec-catches-the-bicycle-${size}`;
  if (flag !== -1) console.log(`LOOKING at ${size}; the pinned size stays landscape -> ${outDir}`);

  const form = assertTypeMayEnter(TYPE, size, { what: "pedelec-catches-the-bicycle" });
  console.log(`pinned size: ${size} — ${form.verdict}: ${form.reason}`);

  // THE TITLE TRACKS THE TAKEAWAY, CLAUSE FOR CLAUSE — "the rise since 2015 comes entirely from
  // pedelecs: 214 pedelec riders were killed in 2025 against 36 in 2015". The numbers in it are the
  // ones asserted from the file above, never typed twice.
  const title =
    `Germany's rise in cyclist deaths is all pedelecs: ${pedelec2015} riders killed in 2015, ` +
    `${pedelecEnd} in ${last}`;
  // The series break is stated on the frame, because nothing else on it says why the axis starts in
  // 2014 rather than in 1979, where the published table starts.
  const note =
    `People killed in German road traffic, by what they were riding, ${first} to ${last}. The ` +
    `statistic counts pedelecs separately only from ${seriesBeginsIn}; before that every bicycle ` +
    `was one column, so no series here reaches further back. Deaths, not risk: the road-accident ` +
    `statistic records no distance ridden.`;
  const alt =
    `Line chart of people killed in German road traffic while riding a bicycle, ${first} to ${last}, ` +
    `on one shared scale from 0 to ${framing.max > 350 ? 400 : framing.max} deaths. The pedelec line ` +
    `rises from ${pedelec[0]} deaths in ${first} and ${pedelec2015} in 2015 to ${pedelecEnd} in ` +
    `${last}. The line for bicycles without a motor falls from ${bicycle[0]} in ${first} to ` +
    `${bicycleEnd} in ${last}. The two lines start ${gapThen} deaths apart and end ${gapNow} apart, ` +
    `without crossing.`;

  const { width, height } = sizeFor(size);
  const { pngPath, svgPath } = await renderStill({
    element: createElement(PedelecCatchesTheBicycle, {
      years,
      pedelec,
      bicycle,
      title,
      note,
      source:
        "Source: Statistisches Bundesamt (Destatis), Verkehrsunfälle Zeitreihen, table 46241-11 — as of 7 July 2026",
      alt,
      ground: palette.ground,
      accent: palette.accent,
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
  assertDrawnInActiveTypeface(svg, { where: "pedelec-catches-the-bicycle" });
  assertTypeFloor(svg, size, { what: "pedelec-catches-the-bicycle" });
  assertWithinStage(svg, size, { what: "pedelec-catches-the-bicycle" });
  console.log(`rendered -> ${pngPath} at ${width}x${height}, verified from the file — now open it and look at it.`);
}

main();
