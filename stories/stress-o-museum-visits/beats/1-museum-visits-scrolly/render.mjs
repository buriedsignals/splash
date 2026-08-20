// The runner for the museum-visits scrolly beat: one column chart, five steps, the reader walking
// through 2022-2025 one year at a time and ending on the 2026 disclosure.
//
// FRICTION RECORDED, NOT WORKED AROUND: `scrolly/SKILL.md`'s own doctrine says "if every step
// would show the same chart, do not reach for this skill — animate the beat instead," and this
// beat's five steps ARE five reveal-states of one chart — the shape the skill names as its own
// anti-pattern (see its worked example `proof/scrolly-chart-eu-carbon/render.mjs`, which earns the
// vehicle by drawing four DIFFERENT chart types of one column instead). The frozen source for this
// story is a single five-row time series with no second medium to assemble (no photo, no map, no
// second dataset) — there is nothing else to carry. Built anyway, because the task assigned this
// vehicle for this story; the mismatch is reported rather than solved by silently reaching for
// chart-web or chart-video instead.
//
// Usage: bun stories/stress-o-museum-visits/beats/1-museum-visits-scrolly/render.mjs [outDir]

import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { deriveFurniture, readPalette, framingMeasurement } from "#shared/chart-beat/render-still.mjs";
import { deriveFacts, parseReadings } from "./museum-data.ts";
import { ChartFrame } from "./ChartFrame.tsx";
import { renderScrolly } from "../../../../skills/scrolly/scripts/render-scrolly.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

const { ground, accent, origin, source: paletteSource } = readPalette(HERE, {
  stopAt: join(HERE, "..", "..", ".."),
});
const furniture = deriveFurniture(ground);

const argv = process.argv.slice(2);
const outDir = resolve(argv.find((a) => !a.startsWith("--")) ?? join(HERE, "render"));

function buildSteps(facts) {
  const shared = { ground, ink: furniture.ink, muted: furniture.muted, grid: furniture.grid, accent, facts };
  const y = (n) => n.toLocaleString("en-US");

  return [
    {
      id: "step-1",
      prose: [
        `In ${facts.first.period}, the museum recorded ${y(facts.first.visits)} visits — the first full year in this run of official counts.`,
      ],
      frame: createElement(ChartFrame, { ...shared, revealedCount: 1, showPartialNote: false }),
    },
    {
      id: "step-2",
      prose: [
        `${facts.complete[1].period}: ${y(facts.complete[1].visits)} visits, up from the year before. Visits grew every year in this run.`,
      ],
      frame: createElement(ChartFrame, { ...shared, revealedCount: 2, showPartialNote: false }),
    },
    {
      id: "step-3",
      prose: [
        `${facts.complete[2].period}: ${y(facts.complete[2].visits)} visits — still rising, the third straight full year of growth.`,
      ],
      frame: createElement(ChartFrame, { ...shared, revealedCount: 3, showPartialNote: false }),
    },
    {
      id: "step-4",
      prose: [
        `${facts.last.period}: ${y(facts.last.visits)} visits. From ${facts.first.period} to ${facts.last.period}, visits rose every year, a gain of ${facts.growthPct.toFixed(1)}%.`,
      ],
      frame: createElement(ChartFrame, { ...shared, revealedCount: 4, showPartialNote: false }),
    },
    {
      id: "step-5",
      prose: [
        `The ministry's only ${facts.partial.period.slice(0, 4)} figure so far: ${y(facts.partial.visits)} visits, covering January-March. That is ${facts.partial.period} — three months, not a fifth full year — and it is not shown as a bar beside the four above, because it is not one.`,
      ],
      frame: createElement(ChartFrame, { ...shared, revealedCount: 4, showPartialNote: true }),
    },
  ];
}

async function render() {
  const readings = parseReadings(await readFile(join(HERE, "data.csv"), "utf8"));
  console.log(`read ${readings.length} rows from data.csv`);
  const facts = deriveFacts(readings);
  console.log(
    `${facts.complete.length} complete years: ${facts.complete.map((r) => `${r.period}=${r.visits}`).join(", ")}`,
  );
  console.log(`partial reading (last row): ${facts.partial.period} = ${facts.partial.visits}, complete=no`);
  console.log(
    `${facts.first.period} -> ${facts.last.period}: ${facts.first.visits.toLocaleString("en-US")} -> ` +
      `${facts.last.visits.toLocaleString("en-US")}, +${facts.growthPct.toFixed(1)}%`,
  );

  // `framing-serves-the-point`, read on the four complete years only — the partial reading is
  // never plotted, so it is never part of this reading either. See BRIEF.md.
  const framing = framingMeasurement(facts.complete.map((r) => r.visits));
  console.log(
    `framing: spreadAgainstExtent=${framing.spreadAgainstExtent.toFixed(3)} ` +
      `largestAgainstMedian=${framing.largestAgainstMedian.toFixed(3)} ` +
      `(read on the four complete years only — this says nothing about whether the 2026 ` +
      `partial reading is comparable to them, which is a different question)`,
  );

  const steps = buildSteps(facts);
  const title = `Museum visits rose every year — then a partial reading arrived`;
  const source =
    `National Museum, official visit counts, ${facts.first.period}-${facts.last.period} (complete years) plus ` +
    `the ${facts.partial.period} reading (partial, Jan-Mar only). Colours recorded in ${paletteSource.slice(paletteSource.lastIndexOf("/") + 1)} by the ${origin}.`;

  const { outPath, panelContrast } = await renderScrolly({
    steps,
    title,
    source,
    ground,
    language: "en",
    outDir,
    name: "museum-visits-scrolly.html",
  });

  console.log(
    `scrolly -> ${outPath} [${steps.length} steps, panel contrast ${panelContrast.toFixed(2)}:1, ` +
      `${facts.first.period}-${facts.last.period} +${facts.growthPct.toFixed(1)}%, partial ${facts.partial.period}=${facts.partial.visits}]`,
  );
  return { outPath };
}

if (import.meta.main) await render();
export { render };
