// The runner for the CHART scrolly beat: one column of numbers — CO₂ per person for the 27 EU
// member states, 1990 to 2024 — drawn FOUR different ways as the reader scrolls, because the
// answer changes with the chart.
//
// This file is a CONSUMER of `twin-scrolly`: it imports the skill's own generic `renderScrolly`
// (the media-agnostic scaffold above its CONFIG marker) and builds its own `steps` array from its
// own frame components (`ChartFrames.tsx`). Nothing under `twin-scrolly/` is edited by it.
//
// WHY THIS EARNS THE SCROLL, stated here because the vehicle's own SKILL.md refuses the shape this
// beat could easily have been: "if every step would show the same chart, do not reach for this
// skill — animate the beat instead." Every step here shows a DIFFERENT chart — a line, a ranked
// bar, a slope, a dot strip — of the same frozen column. The comparison between the four IS the
// argument, and it is an argument no single frame can hold: a still carries one encoding, and a
// video would take the pace of the comparison away from the reader who has to make it.
//
// Usage:
//   bun proof/scrolly-chart-eu-carbon/render.mjs [outDir]

import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import {
  deriveFurniture,
  readPalette,
} from "#shared/twin-chart-beat/render-still.mjs";
import { deriveFacts, parseReadings, bySeries, t, t2 } from "./carbon-data.ts";
import {
  LineFrame,
  RankedBarFrame,
  SlopeFrame,
  DotStripFrame,
} from "./ChartFrames.tsx";
import { renderScrolly } from "../../skills/twin-scrolly/scripts/render-scrolly.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

// The colours come from the answer recorded in PALETTE.md beside this beat — never a hex written
// here. `stopAt` is an input SEARCH BOUNDARY, not an output path: it stops the walk at proof/ so a
// beat with no recorded answer throws instead of quietly inheriting a neighbour's.
const { ground, accent, origin, source: paletteSource } = readPalette(HERE, {
  stopAt: join(HERE, ".."),
});
const furniture = deriveFurniture(ground);

const argv = process.argv.slice(2);
// The default writes BESIDE THE BEAT. A default of `/tmp` is how a render prints a path, exits
// zero, and leaves the committed artifact stale.
const outDir = resolve(argv.find((a) => !a.startsWith("--")) ?? join(HERE, "render"));

/** English ordinal, for the one place the prose states a rank. */
function ordinal(n) {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}

/**
 * The four steps. Each `prose` is a FUNCTION of the derived facts — never a string with numbers
 * typed into it. Every figure a reader meets here was computed from `eu-co2-per-capita.csv` a few
 * lines above, and if the file changes the sentence changes with it.
 */
function buildSteps(facts, series) {
  const n = facts.countries.length;
  const first = facts.years[0];
  const last = facts.years[facts.years.length - 1];
  const rank = facts.biggestFallRankLast;
  const stillTop =
    rank === 1
      ? `still the highest of the ${n}`
      : `${ordinal(rank)} of ${n} even so`;

  const shared = {
    ground,
    ink: furniture.ink,
    muted: furniture.muted,
    grid: furniture.grid,
    accent,
  };

  return [
    {
      id: "direction",
      prose: [
        `Between ${first} and ${last}, ${facts.fell} of the European Union's ${n} member states cut the carbon dioxide they emit per person. Drawn as lines, that is all you can see: the median of the ${n} falls from ${t(facts.medianFirst)} tonnes to ${t(facts.medianLast)}.`,
      ],
      frame: createElement(LineFrame, { ...shared, facts, series }),
    },
    {
      id: "level",
      prose: [
        `Falling is not the same as low, and a line chart cannot tell you who is who. Sorted, ${last} reads differently: ${facts.highestLast.country} emits ${t(facts.highestLast.value)} tonnes per person, ${facts.lowestLast.country} ${t(facts.lowestLast.value)} — a factor of ${t(facts.ratioLast)} between the top and the bottom of the same union.`,
      ],
      frame: createElement(RankedBarFrame, { ...shared, facts }),
    },
    {
      id: "change",
      prose: [
        `Join the two ends and a third answer appears: the largest cut in the union belongs to the country still at the top. ${facts.biggestFall.country} shed ${t(-facts.biggestFall.change)} tonnes per person and is ${stillTop}. ${facts.riser.country} is the one member state emitting more than in ${first}, by ${t2(facts.riser.change)}.`,
      ],
      frame: createElement(SlopeFrame, { ...shared, facts }),
    },
    {
      id: "spread",
      prose: [
        `Take the names away and the ranking turns into a crowd: ${facts.withinTwoOfMedian} of the ${n} sit within two tonnes of the median and ${facts.withinOneOfMedian} within one. Four charts, one column of numbers — and which question you asked decided what you saw.`,
      ],
      frame: createElement(DotStripFrame, { ...shared, facts }),
    },
  ];
}

async function render() {
  const readings = parseReadings(
    await readFile(join(HERE, "eu-co2-per-capita.csv"), "utf8"),
  );
  const series = bySeries(readings);
  const facts = deriveFacts(readings);

  const n = facts.countries.length;
  // "the same 27 countries" is a claim the file has to support, and the EU has had 27 members only
  // since 2020: a re-export carrying 28 rows would quietly turn this beat's own headline false.
  if (n !== 27)
    throw new Error(
      `this beat's title counts the EU's member states; the frozen file now holds ${n}`,
    );

  const steps = buildSteps(facts, series);

  // The header carries the beat's whole argument before any step's reveal — and it is also what
  // the sticky graphic has to scroll PAST before it pins. A fitted chart in the first step is
  // partly behind the prose panel for exactly that band, so this title and this credit are kept
  // short on purpose: at 375px, trimming them took the band from 262px to the figure recorded in
  // BRIEF.md. Every word that stays is load-bearing.
  const title = `The same ${n} countries, four charts, four different answers`;
  const source =
    `CO₂ per person (fossil fuels and industry): Global Carbon Budget (2025) and population data from various ` +
    `sources, with major processing by Our World in Data — indicator co-emissions-per-capita. All ${n} EU ` +
    `member states, ${facts.years[0]}–${facts.years[facts.years.length - 1]}. Four charts, one frozen column of numbers. ` +
    `Colours recorded in ${paletteSource.slice(paletteSource.lastIndexOf("/") + 1)} by the ${origin}.`;

  const { outPath, panelContrast } = await renderScrolly({
    steps,
    title,
    source,
    ground,
    outDir,
    name: "eu-carbon-four-charts.html",
  });

  console.log(
    `chart-scrolly → ${outPath}  [${steps.length} steps, ${n} countries, ` +
      `panel contrast ${panelContrast.toFixed(2)}:1, median ${t(facts.medianFirst)} → ${t(facts.medianLast)}, ` +
      `top/bottom ratio ${t(facts.ratioLast)}]`,
  );
  return { outPath };
}

if (import.meta.main) await render();

export { render };
