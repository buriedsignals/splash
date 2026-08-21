// Beat 2 — the web beat's own runner, beside the story rather than inside the skill.
//
// Usage, from the Splash root:
//   bun stories/stress-p-transport-ridership/beats/2-trips-per-resident/render-web.mjs
//
// Every rank, every total, every population and every rate is COMPUTED from `source/data.csv` and
// printed before the render. The rate itself is computed in exactly one place for the whole story
// (`ridership.ts`'s `tripsPerResident`), so the three beats cannot disagree about it.

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readPalette, readTypeface, contrast } from "#shared/chart-beat/render-still.mjs";
import { renderWeb } from "#shared/chart-web/scripts/render-web.mjs";
import { readCities, tripsPerResident, fmt, SOURCE_LINE } from "../../ridership.ts";
import { RankSlopeWeb, FRAME } from "./RankSlopeWeb.tsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const STORY = join(HERE, "..", "..");
const SUBJECT = "Lisboa";
const OUTPUT_NAME = "trips-per-resident.html";

/** The story's own recorded language, read out of `STORYBOARD.md` rather than typed here.
 *  `renderWeb` refuses to build a page that does not declare one. */
async function recordedLanguage() {
  const text = await readFile(join(STORY, "STORYBOARD.md"), "utf8");
  const match = /^language:\s*"?([A-Za-z-]+)"?\s*$/m.exec(text);
  if (!match)
    throw new Error(
      `STORYBOARD.md records no \`language:\` field, and a delivered page declares the language ` +
        `it is written in. Close that field before rendering.`,
    );
  return match[1];
}

function rankedBy(cities, value) {
  const order = [...cities].sort((a, b) => value(b) - value(a));
  return new Map(order.map((c, i) => [c.city, i + 1]));
}

async function run() {
  const cities = readCities(await readFile(join(STORY, "source", "data.csv"), "utf8"));
  const byTotal = rankedBy(cities, (c) => c.trips);
  const byRate = rankedBy(cities, (c) => tripsPerResident(c));

  const rows = cities
    .map((c) => ({
      city: c.city,
      rankByTotal: byTotal.get(c.city),
      rankByRate: byRate.get(c.city),
      trips: c.trips,
      population: c.population,
      rate: tripsPerResident(c),
    }))
    .sort((a, b) => a.rankByTotal - b.rankByTotal);
  console.table(
    rows.map((r) => ({
      city: r.city,
      "rank by total": r.rankByTotal,
      "rank by rate": r.rankByRate,
      trips: fmt.tripsWithUnit(r.trips),
      residents: fmt.people(r.population),
      "per resident": fmt.rate(r.rate),
    })),
  );

  const movers = rows.filter((r) => r.rankByTotal !== r.rankByRate);
  if (movers.length === 0)
    throw new Error(
      "the two rankings are identical, so this beat has nothing to prove — reopen slot 2",
    );
  const topByRate = rows.find((r) => r.rankByRate === 1);
  const topByTotal = rows.find((r) => r.rankByTotal === 1);
  const lastByRate = rows.find((r) => r.rankByRate === rows.length);
  console.log(
    `${movers.length} of ${rows.length} cities change place; the top changes from ` +
      `${topByTotal.city} to ${topByRate.city}, and ${lastByRate.city} ends last by rate`,
  );

  const title = `Per resident, ${topByRate.city} — not ${topByTotal.city} — carries the most trips`;
  const subtitle =
    `The same ${rows.length} networks, ranked twice on the same ${cities[0].year} figures: by the ` +
    `total trips they carry, and by trips per resident. The axis is RANK, not a value — it says who ` +
    `moved, not by how much. Hover, tap or Tab to any line for that city's own total, population ` +
    `and rate.`;
  const alt =
    `Slope chart ranking ${rows.length} Portuguese city public-transport networks twice on their ` +
    `${cities[0].year} figures. Ranked by total trips: ` +
    rows.map((r) => `${r.city} ${fmt.tripsWithUnit(r.trips)}`).join(", ") +
    `. Ranked by trips per resident: ` +
    [...rows]
      .sort((a, b) => a.rankByRate - b.rankByRate)
      .map((r) => `${r.city} ${fmt.rate(r.rate)}`)
      .join(", ") +
    `. ${movers.length} of the ${rows.length} lines cross: ${topByRate.city} rises past ` +
    `${topByTotal.city} at the top, and ${lastByRate.city} falls to last.`;
  console.log(`title:    ${title}`);
  console.log(`alt:      ${alt}`);

  const { ground, accent, origin, source: paletteSource } = readPalette(HERE, { stopAt: STORY });
  console.log(`palette from ${paletteSource} — ground ${ground}, accent ${accent}, chosen by ${origin}`);
  // The subject's own end labels are set in the accent rather than in ink, so measure the accent
  // against the ground at the TEXT floor (4.5:1, SC 1.4.3) — the mark floor is not the one that
  // applies to a word. `lollipop.md`'s recorded failure is exactly an accent used as running text.
  const labelContrast = contrast(accent, ground);
  if (labelContrast < 4.5)
    throw new Error(
      `the subject's end labels are set in ${accent}, which measures ${labelContrast.toFixed(2)}:1 ` +
        `against ${ground} — under the 4.5:1 text floor. Set them in ink instead.`,
    );
  console.log(`subject end labels in ${accent}: ${labelContrast.toFixed(2)}:1 against the ground (text floor 4.5:1)`);
  // Read only so the story's recorded answer is honoured here too; this format's words are set by
  // the browser, so nothing is rasterised and `useTypeface` has nothing to put in force.
  const face = readTypeface(HERE, { stopAt: STORY });
  console.log(`typeface recorded as ${face.family} (${face.origin}) — a browser sets this page's words`);

  const language = await recordedLanguage();
  console.log(`language from STORYBOARD.md: ${language}`);

  const { outPath } = await renderWeb({
    component: RankSlopeWeb,
    props: {
      rows,
      title,
      subtitle,
      source: SOURCE_LINE,
      alt,
      language,
      leftColumnTitle: `by total trips, ${cities[0].year}`,
      rightColumnTitle: "by trips per resident",
      leftLabel: (r) => `${r.city}  ${fmt.tripsWithUnit(r.trips)}`,
      rightLabel: (r) => `${fmt.rate(r.rate)}  ${r.city}`,
      detailFor: (r) =>
        `${r.city} · ${fmt.tripsWithUnit(r.trips)} trips · ${fmt.people(r.population)} residents · ` +
        `${fmt.rate(r.rate)} trips per resident`,
      ground,
      accent,
      subject: SUBJECT,
      frame: FRAME,
    },
    outDir: join(HERE, "renders"),
    name: OUTPUT_NAME,
  });
  console.log(`web beat → ${outPath} [${rows.length} cities]`);
  console.log(`now DRIVE it: bun skills/chart-web/scripts/verify-web.mjs --file ${outPath} --shots --out <dir>`);
}

run();
