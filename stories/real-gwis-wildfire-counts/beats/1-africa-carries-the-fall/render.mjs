// Renders this beat from its own data.json, which build-data.mjs derives from the story's frozen
// source/data.csv with the partition check in it. Usage, from the repo root:
//   bun stories/real-gwis-wildfire-counts/beats/1-africa-carries-the-fall/render.mjs
//   bun .../render.mjs --size square      (a look, not the pinned size)
//
// See BRIEF.md. The two facts this script verifies against the frozen numbers before drawing:
// the six bands sum to the file's own World row in every year kept, and the year the takeaway
// calls the peak really is the maximum of those totals.

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
import { TYPE, WildfiresByContinent, formatCount } from "./WildfiresByContinent.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const STORY = join(HERE, "..", "..");

async function main() {
  const data = JSON.parse(await readFile(join(HERE, "data.json"), "utf8"));
  const { years, series, world, lastCompleteYear, excludedYear, aggregatesNotDrawn } = data;
  console.log(
    `read ${series.length} bands x ${years.length} years (${years[0]}-${years[years.length - 1]}) ` +
      `from data.json; ${excludedYear} excluded, aggregates not drawn: ${aggregatesNotDrawn.join(", ")}`,
  );

  // THE PARTITION, RE-VERIFIED HERE. build-data.mjs already threw on it; this is the render's own
  // reading of the file it is about to draw, because a stacked area CLAIMS its bands are the whole.
  const totals = years.map((_, i) => series.reduce((sum, s) => sum + s.values[i], 0));
  totals.forEach((total, i) => {
    if (total !== world[i])
      throw new Error(
        `the six bands sum to ${total} in ${years[i]} and the frozen World row says ${world[i]} — ` +
          `refusing to draw them as a part-to-whole`,
      );
  });
  console.log("partition check: the six continents equal the file's own World row in all 14 years");

  const peakIndex = totals.indexOf(Math.max(...totals));
  const peakYear = years[peakIndex];
  const endTotal = totals[totals.length - 1];
  const fall = ((totals[peakIndex] - endTotal) / totals[peakIndex]) * 100;
  if (peakYear !== 2015)
    throw new Error(`the takeaway names 2015 as the peak and the frozen totals peak in ${peakYear} — refusing to render`);
  console.log(
    `peak ${formatCount(totals[peakIndex])} in ${peakYear} -> ${formatCount(endTotal)} in ${lastCompleteYear}: ` +
      `down ${fall.toFixed(1)}%`,
  );

  const africa = series[0];
  const share = (africa.values[africa.values.length - 1] / endTotal) * 100;
  console.log(`subject: Africa is ${share.toFixed(1)}% of the ${lastCompleteYear} total`);

  // Two numbers, printed, before the geometry is chosen — static-discipline, "framing-serves-the-point".
  const framing = framingMeasurement(totals);
  console.log(
    `framing: the roof's own spread is ${(framing.spreadAgainstExtent * 100).toFixed(1)}% of its 0-` +
      `${formatCount(framing.max)} extent; the tallest year is ${framing.largestAgainstMedian.toFixed(2)}x ` +
      `the median year — see BRIEF.md, "framing-serves-the-point"`,
  );

  const palette = readPalette(STORY, { stopAt: STORY });
  console.log(`palette from ${palette.source} — ground ${palette.ground}, accent ${palette.accent}, chosen by ${palette.origin}`);
  const typeface = useTypeface(readTypeface(STORY, { stopAt: STORY }));
  console.log(`typeface from ${typeface.source} — ${typeface.family} (${typeface.origin})`);

  const flag = process.argv.indexOf("--size");
  const size = flag === -1 ? "landscape" : process.argv[flag + 1];
  const outDir = flag === -1 ? join(HERE, "renders") : join(HERE, "sizes");
  const name = flag === -1 ? "africa-carries-the-fall-still" : `africa-carries-the-fall-${size}`;
  if (flag !== -1) console.log(`LOOKING at ${size}; the pinned size stays landscape -> ${outDir}`);

  const form = assertTypeMayEnter(TYPE, size, { what: "africa-carries-the-fall" });
  console.log(`pinned size: ${size} — ${form.verdict}: ${form.reason}`);

  // THE TITLE TRACKS THE TAKEAWAY, CLAUSE FOR CLAUSE. An earlier pass read "and Africa carries
  // most of the fall" — true (Africa is 54.3% of the drop from the peak) and NOT what the
  // journalist confirmed, which is exactly the drifting-title failure the takeaway exists to make
  // detectable. The 54.3% is recorded in BRIEF.md, where a supporting measurement belongs.
  const title =
    `The world's wildfire count has fallen by nearly half since ${peakYear}, and two thirds of what ` +
    `is left is in Africa`;
  // The period is stated because the x axis's own derived ticks land on even years and stop at 2024,
  // so nothing on the frame otherwise says the series runs to 2025. An irregular extra tick would
  // break the regular grid a reader locates an un-ticked point against (static-discipline, "Axis density").
  const note =
    `Fire events recorded per year, by continent, ${years[0]} to ${lastCompleteYear}. ${excludedYear} is ` +
    `left out: that year is incomplete, last updated 21 August ${excludedYear}.`;
  const alt =
    `Stacked area chart of recorded wildfire events by continent, ${years[0]} to ${lastCompleteYear}. ` +
    `The whole stack rises to ${formatCount(totals[peakIndex])} fires in ${peakYear} and then falls to ` +
    `${formatCount(endTotal)} in ${lastCompleteYear}, a drop of ${fall.toFixed(0)} per cent. Africa is the ` +
    `bottom band throughout and the largest: ${formatCount(africa.values[0])} in ${years[0]} and ` +
    `${formatCount(africa.values[africa.values.length - 1])} in ${lastCompleteYear}, ${share.toFixed(0)} per cent of that ` +
    `year's total. Above it, in stacking order: ` +
    series
      .slice(1)
      .map((s) => `${s.name} ${formatCount(s.values[s.values.length - 1])}`)
      .join(", ") +
    `. ${excludedYear} is not drawn because the year is incomplete.`;

  const { width, height } = sizeFor(size);
  const { pngPath, svgPath } = await renderStill({
    element: createElement(WildfiresByContinent, {
      years,
      bands: series,
      title,
      note,
      source: "Source: Global Wildfire Information System (2026), with minor processing by Our World in Data — as of 21 August 2026",
      alt,
      ground: palette.ground,
      accent: palette.accent,
      subject: "Africa",
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
  assertDrawnInActiveTypeface(svg, { where: "africa-carries-the-fall" });
  assertTypeFloor(svg, size, { what: "africa-carries-the-fall" });
  assertWithinStage(svg, size, { what: "africa-carries-the-fall" });
  console.log(`rendered -> ${pngPath} at ${width}x${height}, verified from the file — now open it and look at it.`);
}

main();
