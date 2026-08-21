// Beat 3 — Aveiro's network, as far as the frozen data goes.
//
// Usage, from the Splash root:
//   bun stories/stress-p-transport-ridership/beats/3-aveiro-network/render.mjs
//
// Everything the chart asserts — the ranking, Aveiro's position in it, its trips figure and every
// number in the alt text — is COMPUTED from `source/data.csv` and printed before the render.

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
import { NetworkLollipop, TYPE } from "./NetworkLollipop.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const STORY = join(HERE, "..", "..");
const SUBJECT = "Aveiro";

const ORDINAL = ["", "first", "second", "third", "fourth", "fifth", "sixth", "seventh"];
const SPELLED = ["zero", "one", "two", "three", "four", "five", "six", "seven"];

async function run() {
  const cities = readCities(await readFile(join(STORY, "source", "data.csv"), "utf8"));
  const subject = cities.find((c) => c.city === SUBJECT);
  if (!subject)
    throw new Error(
      `the frozen data has no row for ${SUBJECT}, which slot 3 is about — it holds ` +
        cities.map((c) => c.city).join(", "),
    );

  // The refusal this beat exists inside, asserted rather than assumed: if a later freeze ever adds
  // route geometry, this throw is what tells the next session the map is now possible.
  const GEO_COLUMNS = ["lat", "lon", "latitude", "longitude", "geometry", "route", "wkt", "stops"];
  const header = (await readFile(join(STORY, "source", "data.csv"), "utf8"))
    .split(/\r?\n/)[0]
    .split(",")
    .map((c) => c.trim().toLowerCase());
  const geo = header.filter((c) => GEO_COLUMNS.includes(c));
  if (geo.length > 0)
    throw new Error(
      `source/data.csv now carries ${geo.join(", ")} — the Aveiro line can be drawn as a map, and ` +
        `this beat's standing refusal (BRIEF.md) is out of date. Reopen slot 3.`,
    );
  console.log("no geometry column in the frozen data — the line itself cannot be drawn; drawing its length");

  const byLength = [...cities].sort((a, b) => b.networkKm - a.networkKm);
  const rows = byLength.map((c) => ({ city: c.city, value: c.networkKm }));
  const rank = byLength.findIndex((c) => c.city === SUBJECT) + 1;
  const shorter = byLength.slice(rank);
  console.table(
    byLength.map((c, i) => ({ rank: i + 1, city: c.city, network: fmt.km(c.networkKm), "trips (m)": fmt.trips(c.trips) })),
  );
  console.log(
    `${SUBJECT} is ${ORDINAL[rank]} of ${SPELLED[cities.length]} by network length ` +
      `(${fmt.km(subject.networkKm)}), ahead of ${shorter.map((c) => `${c.city} ${fmt.km(c.networkKm)}`).join(", ") || "nothing"}`,
  );
  console.log(framingMeasurement(rows.map((r) => r.value)));

  const title = `${SUBJECT}'s network is ${fmt.km(subject.networkKm)} — the ${ORDINAL[cities.length - rank + 1]} shortest of the ${SPELLED[cities.length]}`;
  const subtitle =
    `Kilometres of public-transport network in ${subject.year}. This is the only column in the ` +
    `frozen table that describes the line itself: there is no route, no stops and no opening date ` +
    `in the data, so the new ${SUBJECT} line cannot be drawn — only measured against the five ` +
    `networks beside it.`;
  const subjectNote = `${SUBJECT}'s network carries ${fmt.tripsWithUnit(subject.trips)} trips a year`;
  const alt =
    `Horizontal lollipop chart of public-transport network length in ${subject.year} for ` +
    `${SPELLED[cities.length]} Portuguese cities, ranked longest first: ` +
    byLength.map((c) => `${c.city} ${fmt.km(c.networkKm)}`).join(", ") +
    `. ${SUBJECT} is highlighted at ${fmt.km(subject.networkKm)}, ${ORDINAL[rank]} of ` +
    `${SPELLED[cities.length]}, and carries ${fmt.tripsWithUnit(subject.trips)} trips a year.`;
  console.log(`title:    ${title}`);
  console.log(`subtitle: ${subtitle}`);
  console.log(`note:     ${subjectNote}`);
  console.log(`alt:      ${alt}`);

  const { ground, accent, origin, source: paletteSource } = readPalette(HERE, { stopAt: STORY });
  console.log(`palette from ${paletteSource} — ground ${ground}, accent ${accent}, chosen by ${origin}`);
  const face = useTypeface(readTypeface(HERE, { stopAt: STORY }));
  console.log(`typeface ${face.family} (${face.origin}), from ${face.source}`);

  const size = await readPinnedSize(HERE, { readFile, dirname, join });
  const form = assertTypeMayEnter(TYPE, size, { what: "beat 3 — Aveiro network" });
  console.log(`pinned size: ${size} — ${form.verdict}: ${form.reason}`);

  const { width, height } = sizeFor(size);
  const { pngPath, svgPath } = await renderStill({
    element: createElement(NetworkLollipop, {
      rows,
      title,
      subtitle,
      source: SOURCE_LINE,
      alt,
      ground,
      accent,
      subject: SUBJECT,
      subjectNote,
      size,
    }),
    width,
    height,
    scale: 1,
    outDir: join(HERE, "renders"),
    name: "aveiro-network",
  });

  assertDeliveredSize(readPngSize(await readFile(pngPath)), size, { what: `${pngPath}` });
  const svg = await readFile(svgPath, "utf8");
  assertTypeFloor(svg, size, { what: "beat 3 — Aveiro network" });
  assertWithinStage(svg, size, { what: "beat 3 — Aveiro network" });
  assertDrawnInActiveTypeface(svg, { where: "beat 3 — Aveiro network" });
  console.log(`rendered -> ${pngPath} at ${width}x${height}, verified from the file — now open it.`);
}

run();
