// Beat 1 — the overall picture, rendered from the frozen source.
//
// Usage, from the Splash root:
//   bun stories/stress-p-transport-ridership/beats/1-overall-picture/render.mjs
//
// Every number the chart asserts — the ranking, the headline's "more than the other five put
// together", the combined total, the share, and every figure in the alt text — is COMPUTED here
// from `source/data.csv` and printed before the render. Nothing is typed.

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
  readPinnedSize,
  readPngSize,
  sizeFor,
} from "#shared/chart-beat/sizes.mjs";
import { assertTypeMayEnter } from "#shared/chart-beat/type-at-size.mjs";
import { readCities, fmt, SOURCE_LINE } from "../../ridership.ts";
import { RidershipColumns, TYPE } from "./RidershipColumns.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const STORY = join(HERE, "..", "..");

async function run() {
  const cities = readCities(await readFile(join(STORY, "source", "data.csv"), "utf8"));
  console.log(`read ${cities.length} city networks from source/data.csv`);

  const ranked = [...cities].sort((a, b) => b.trips - a.trips);
  const rows = ranked.map((c) => ({ city: c.city, value: c.trips }));
  console.table(ranked.map((c, i) => ({ rank: i + 1, city: c.city, "trips (m)": fmt.trips(c.trips) })));

  const subject = ranked[0].city;
  const subjectValue = ranked[0].trips;
  const total = cities.reduce((sum, c) => sum + c.trips, 0);

  // How many of the networks BELOW the subject can be added together before their sum passes the
  // subject's own total. A search, not an assertion: if the data moved so that the answer were
  // three, the headline would say three.
  let combined = 0;
  let beatenCount = 0;
  for (const row of ranked.slice(1)) {
    if (combined + row.trips > subjectValue) break;
    combined += row.trips;
    beatenCount += 1;
  }
  const beaten = ranked.slice(1, beatenCount + 1);
  if (beatenCount < 2)
    throw new Error("the headline comparison needs at least two networks to add together");
  const allOthers = beatenCount === cities.length - 1;
  console.log(
    `${subject} ${fmt.trips(subjectValue)} m > the next ${beatenCount} combined ` +
      `(${beaten.map((c) => c.city).join(" + ")} = ${fmt.trips(combined)} m)`,
  );
  console.log(
    `${subject} is ${fmt.share(subjectValue / total)} of the ${fmt.trips(total)} m these ` +
      `${cities.length} networks carry between them`,
  );

  const runnerUp = ranked[1];
  const ratio = subjectValue / runnerUp.trips;
  console.log(`${subject} is ${ratio.toFixed(2)}x ${runnerUp.city}`);
  console.log(framingMeasurement(rows.map((r) => r.value)));

  const spelled = ["zero", "one", "two", "three", "four", "five", "six", "seven"];
  const listOf = (names) =>
    names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;

  const title = allOthers
    ? `${subject} carries more trips than the other ${spelled[beatenCount]} city networks put together`
    : `${subject} carries more trips than the next ${spelled[beatenCount]} city networks put together`;
  const subtitle =
    `Public-transport trips in ${cities[0].year}, millions. These ${spelled[cities.length]} networks ` +
    `carried ${fmt.trips(total)} million between them; ${subject}'s ${fmt.trips(subjectValue)} million is ` +
    `${fmt.share(subjectValue / total)} of that. Trips, not passengers — one person making a return ` +
    `journey is counted twice.`;
  const callout = {
    value: combined,
    text: `more than ${listOf(beaten.map((c) => c.city))} added together (${fmt.trips(combined)} m)`,
  };
  const alt =
    `Column chart ranking ${spelled[cities.length]} Portuguese city public-transport networks by ` +
    `trips in ${cities[0].year}. ${subject} is far ahead at ${fmt.trips(subjectValue)} million, ` +
    `${ratio.toFixed(1)} times ${runnerUp.city}'s ${fmt.trips(runnerUp.trips)} million, and more than ` +
    `${listOf(beaten.map((c) => c.city))} added together (${fmt.trips(combined)} million). The ` +
    `remaining columns fall from ${fmt.trips(ranked[2].trips)} million (${ranked[2].city}) to ` +
    `${fmt.trips(ranked.at(-1).trips)} million (${ranked.at(-1).city}).`;
  console.log(`title:    ${title}`);
  console.log(`subtitle: ${subtitle}`);
  console.log(`callout:  ${callout.text}`);
  console.log(`alt:      ${alt}`);

  const { ground, accent, origin, source: paletteSource } = readPalette(HERE, { stopAt: STORY });
  console.log(`palette from ${paletteSource} — ground ${ground}, accent ${accent}, chosen by ${origin}`);
  const face = useTypeface(readTypeface(HERE, { stopAt: STORY }));
  console.log(`typeface ${face.family} (${face.origin}), from ${face.source}`);

  const size = await readPinnedSize(HERE, { readFile, dirname, join });
  const form = assertTypeMayEnter(TYPE, size, { what: "beat 1 — overall picture" });
  console.log(`pinned size: ${size} — ${form.verdict}: ${form.reason}`);

  const { width, height } = sizeFor(size);
  const { pngPath, svgPath } = await renderStill({
    element: createElement(RidershipColumns, {
      rows,
      title,
      subtitle,
      source: SOURCE_LINE,
      alt,
      ground,
      accent,
      subject,
      callout,
      size,
    }),
    width,
    height,
    // 1:1 — the frame IS the export size, so the PNG on disk measures what gate 2c pinned.
    scale: 1,
    outDir: join(HERE, "renders"),
    name: "overall-picture",
  });

  // THE DELIVERED FILE, MEASURED FROM ITS OWN BYTES.
  assertDeliveredSize(readPngSize(await readFile(pngPath)), size, { what: `${pngPath}` });
  const svg = await readFile(svgPath, "utf8");
  assertTypeFloor(svg, size, { what: "beat 1 — overall picture" });
  assertWithinStage(svg, size, { what: "beat 1 — overall picture" });
  assertDrawnInActiveTypeface(svg, { where: "beat 1 — overall picture" });
  console.log(`rendered -> ${pngPath} at ${width}x${height}, verified from the file — now open it.`);
}

run();
